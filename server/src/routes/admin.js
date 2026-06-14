const express = require('express');
const bcrypt = require('bcrypt');
const { z } = require('zod');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');

const router = express.Router();

router.use(requireAuth(['admin']));

// -------------------------------------------------------------------
// GET /api/admin/stats
// -------------------------------------------------------------------
router.get('/stats', async (_req, res) => {
  try {
    const [total, byStatus, byType, recentActivity, revenue] = await Promise.all([
      db.query(`SELECT COUNT(*) AS total FROM found_documents`),
      db.query(`SELECT status, COUNT(*) AS count FROM found_documents GROUP BY status ORDER BY count DESC`),
      db.query(`SELECT doc_type, COUNT(*) AS count FROM found_documents GROUP BY doc_type ORDER BY count DESC`),
      db.query(
        `SELECT d.id, d.doc_type, d.name_initial, d.region_found, d.status, d.created_at, b.name AS branch
         FROM found_documents d JOIN branches b ON d.branch_id = b.id
         ORDER BY d.created_at DESC LIMIT 10`
      ),
      db.query(`SELECT COALESCE(SUM(amount_tzs),0) AS total, COUNT(*) AS count FROM payments WHERE status = 'SUCCESS'`),
    ]);

    res.json({
      total: parseInt(total.rows[0].total),
      by_status: byStatus.rows,
      by_type: byType.rows,
      recent_activity: recentActivity.rows,
      revenue: { total_tzs: parseInt(revenue.rows[0].total), transactions: parseInt(revenue.rows[0].count) },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// -------------------------------------------------------------------
// GET /api/admin/documents — all documents with full filters
// -------------------------------------------------------------------
router.get('/documents', async (req, res) => {
  const { branch, status, type, q, page = '1' } = req.query;
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limit = 25;
  const offset = (pageNum - 1) * limit;

  const conditions = [];
  const params = [];

  if (branch)  { params.push(branch);            conditions.push(`d.branch_id = $${params.length}`); }
  if (status)  { params.push(status.toUpperCase()); conditions.push(`d.status = $${params.length}`); }
  if (type)    { params.push(type.toUpperCase());  conditions.push(`d.doc_type = $${params.length}`); }
  if (q)       { params.push(q);                  conditions.push(`d.full_name ILIKE '%' || $${params.length} || '%'`); }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  try {
    const countRes = await db.query(`SELECT COUNT(*) FROM found_documents d ${where}`, params);
    const total = parseInt(countRes.rows[0].count);

    params.push(limit, offset);
    const { rows } = await db.query(
      `SELECT d.id, d.doc_type, d.name_initial, d.id_number_masked, d.region_found,
              d.status, d.created_at, d.collected_at,
              b.name AS branch_name, b.region AS branch_region,
              s.full_name AS logged_by_name
       FROM found_documents d
       JOIN branches b ON d.branch_id = b.id
       LEFT JOIN staff s ON d.logged_by = s.id
       ${where}
       ORDER BY d.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({ documents: rows, total, page: pageNum, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// -------------------------------------------------------------------
// GET /api/admin/branches
// -------------------------------------------------------------------
router.get('/branches', async (_req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT b.*, COUNT(d.id) FILTER (WHERE d.status NOT IN ('COLLECTED','EXPIRED')) AS active_docs
       FROM branches b
       LEFT JOIN found_documents d ON d.branch_id = b.id
       WHERE b.active = TRUE
       GROUP BY b.id ORDER BY b.region, b.name`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// -------------------------------------------------------------------
// POST /api/admin/branches
// -------------------------------------------------------------------
router.post('/branches', async (req, res) => {
  const Schema = z.object({
    name: z.string().min(3),
    region: z.string().min(2),
    district: z.string().optional(),
    contact_phone: z.string().optional(),
  });
  const parsed = Schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Validation failed' });

  try {
    const { rows } = await db.query(
      `INSERT INTO branches (name, region, district, contact_phone) VALUES ($1,$2,$3,$4) RETURNING *`,
      [parsed.data.name, parsed.data.region, parsed.data.district ?? null, parsed.data.contact_phone ?? null]
    );
    await auditLog(req.staff.id, req.staff.phone, 'BRANCH_CREATED', 'branches', String(rows[0].id));
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// -------------------------------------------------------------------
// GET /api/admin/staff
// -------------------------------------------------------------------
router.get('/staff', async (_req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT s.id, s.full_name, s.phone, s.role, s.active, s.created_at,
              b.name AS branch_name, b.region AS branch_region
       FROM staff s
       JOIN branches b ON s.branch_id = b.id
       ORDER BY b.region, b.name, s.full_name`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// -------------------------------------------------------------------
// POST /api/admin/staff
// -------------------------------------------------------------------
router.post('/staff', async (req, res) => {
  const Schema = z.object({
    branch_id: z.number().int().positive(),
    full_name: z.string().min(2),
    phone: z.string().min(10).max(20),
    password: z.string().min(8),
    role: z.enum(['clerk', 'admin']).default('clerk'),
  });
  const parsed = Schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });

  try {
    const password_hash = await bcrypt.hash(parsed.data.password, 12);
    const { rows } = await db.query(
      `INSERT INTO staff (branch_id, full_name, phone, password_hash, role) VALUES ($1,$2,$3,$4,$5) RETURNING id, full_name, phone, role`,
      [parsed.data.branch_id, parsed.data.full_name, parsed.data.phone, password_hash, parsed.data.role]
    );
    await auditLog(req.staff.id, req.staff.phone, 'STAFF_CREATED', 'staff', String(rows[0].id));
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Phone number already registered' });
    res.status(500).json({ error: 'Server error' });
  }
});

// -------------------------------------------------------------------
// GET /api/admin/audit?page=
// -------------------------------------------------------------------
router.get('/audit', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = 50;
  const offset = (page - 1) * limit;
  try {
    const { rows } = await db.query(
      `SELECT * FROM audit_log ORDER BY at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
