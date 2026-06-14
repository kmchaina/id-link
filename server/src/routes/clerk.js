const express = require('express');
const { z } = require('zod');
const db = require('../db');
const { encrypt, hashIdNumber, maskIdNumber, maskName } = require('../utils/crypto');
const { requireAuth } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');

const router = express.Router();

router.use(requireAuth(['clerk', 'admin']));

const DOC_TYPES = ['NIDA', 'VOTER', 'LICENCE', 'PASSPORT', 'OTHER'];

// -------------------------------------------------------------------
// POST /api/clerk/documents — log a found document
// -------------------------------------------------------------------
router.post('/documents', async (req, res) => {
  const Schema = z.object({
    doc_type: z.enum(DOC_TYPES),
    full_name: z.string().min(2).max(200),
    id_number: z.string().min(5).max(30),
    dob: z.string().optional(),
    region_found: z.string().min(2).max(100),
    photo_url: z.string().url().optional(),
    ocr_confidence: z.number().min(0).max(100).optional(),
    finder_phone: z.string().min(10).max(20).optional(),
  });

  const parsed = Schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });

  const { doc_type, full_name, id_number, dob, region_found, photo_url, ocr_confidence, finder_phone } = parsed.data;

  try {
    const id_number_enc  = encrypt(id_number);
    const id_number_hash = hashIdNumber(id_number);
    const id_number_masked = maskIdNumber(id_number);
    const name_initial   = maskName(full_name);
    const dob_enc        = dob ? encrypt(dob) : null;

    const existing = await db.query(
      `SELECT id, status FROM found_documents WHERE id_number_hash = $1 AND status NOT IN ('COLLECTED','EXPIRED')`,
      [id_number_hash]
    );
    if (existing.rows.length) {
      return res.status(409).json({
        error: 'This ID number is already in the system',
        existing_id: existing.rows[0].id,
        status: existing.rows[0].status,
      });
    }

    const result = await db.query(
      `INSERT INTO found_documents
         (doc_type, full_name, name_initial, id_number_enc, id_number_hash, id_number_masked,
          dob_enc, region_found, branch_id, photo_url, ocr_confidence, logged_by, finder_phone)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
      [doc_type, full_name, name_initial, id_number_enc, id_number_hash, id_number_masked,
       dob_enc, region_found, req.staff.branch_id, photo_url ?? null, ocr_confidence ?? null,
       req.staff.id, finder_phone ?? null]
    );
    const docId = result.rows[0].id;

    // Check if any alert subscriptions match this ID
    const alerts = await db.query(
      `SELECT phone FROM alert_subscriptions WHERE id_number_hash = $1 AND notified_at IS NULL`,
      [id_number_hash]
    );
    // Import sendSMS lazily to avoid circular dep
    if (alerts.rows.length) {
      const { sendSMS } = require('../utils/sms');
      for (const sub of alerts.rows) {
        await sendSMS(sub.phone, `ID-Link Alert: A document matching your subscribed ID (${id_number_masked}) has been found at ${region_found}. Visit id-link.go.tz to claim it.`);
        await db.query(`UPDATE alert_subscriptions SET notified_at = NOW() WHERE phone = $1 AND id_number_hash = $2`, [sub.phone, id_number_hash]);
      }
    }

    // Schedule finder reward if finder_phone provided
    if (finder_phone) {
      await db.query(
        `INSERT INTO finder_rewards (document_id, phone) VALUES ($1, $2)`,
        [docId, finder_phone]
      );
    }

    await auditLog(req.staff.id, req.staff.phone, 'DOCUMENT_LOGGED', 'found_documents', docId, { doc_type, region_found });

    res.status(201).json({ id: docId, id_number_masked, name_initial });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// -------------------------------------------------------------------
// GET /api/clerk/documents — list documents at own branch
// -------------------------------------------------------------------
router.get('/documents', async (req, res) => {
  const { status, page = '1' } = req.query;
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limit = 20;
  const offset = (pageNum - 1) * limit;

  const conditions = ['d.branch_id = $1'];
  const params = [req.staff.branch_id];

  if (status) { params.push(status.toUpperCase()); conditions.push(`d.status = $${params.length}`); }

  const where = 'WHERE ' + conditions.join(' AND ');

  try {
    const countRes = await db.query(`SELECT COUNT(*) FROM found_documents d ${where}`, params);
    const total = parseInt(countRes.rows[0].count);

    params.push(limit, offset);
    const { rows } = await db.query(
      `SELECT d.id, d.doc_type, d.name_initial, d.id_number_masked, d.region_found,
              d.status, d.created_at, d.collected_at,
              s.full_name AS logged_by_name
       FROM found_documents d
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
// PATCH /api/clerk/documents/:id/status — update status
// -------------------------------------------------------------------
router.patch('/documents/:id/status', async (req, res) => {
  const ALLOWED_TRANSITIONS = {
    LOGGED:      ['VERIFIED', 'TRANSFERRED'],
    VERIFIED:    ['CLAIMED', 'TRANSFERRED'],
    CLAIMED:     ['COLLECTED', 'VERIFIED'],
    COLLECTED:   [],
    TRANSFERRED: ['VERIFIED'],
    EXPIRED:     [],
  };

  const Schema = z.object({
    status: z.enum(['LOGGED', 'VERIFIED', 'CLAIMED', 'COLLECTED', 'TRANSFERRED', 'EXPIRED']),
    notes: z.string().optional(),
  });
  const parsed = Schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid status' });

  try {
    const docRes = await db.query(
      `SELECT id, status, branch_id FROM found_documents WHERE id = $1`,
      [req.params.id]
    );
    const doc = docRes.rows[0];
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    if (doc.branch_id !== req.staff.branch_id && req.staff.role !== 'admin') {
      return res.status(403).json({ error: 'Document belongs to a different branch' });
    }

    const allowed = ALLOWED_TRANSITIONS[doc.status] ?? [];
    if (!allowed.includes(parsed.data.status)) {
      return res.status(400).json({ error: `Cannot transition from ${doc.status} to ${parsed.data.status}` });
    }

    const extra = parsed.data.status === 'COLLECTED'
      ? ', collected_at = NOW(), purge_after = NOW() + INTERVAL \'6 months\''
      : '';

    await db.query(
      `UPDATE found_documents SET status = $1${extra} WHERE id = $2`,
      [parsed.data.status, doc.id]
    );

    // Pay finder reward when document is collected
    if (parsed.data.status === 'COLLECTED') {
      await db.query(
        `UPDATE finder_rewards SET paid_at = NOW() WHERE document_id = $1 AND paid_at IS NULL`,
        [doc.id]
      );
    }

    await auditLog(req.staff.id, req.staff.phone, `STATUS_${parsed.data.status}`, 'found_documents', doc.id);

    res.json({ id: doc.id, status: parsed.data.status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// -------------------------------------------------------------------
// POST /api/clerk/ocr — extract data from photo (stub → Google Vision)
// -------------------------------------------------------------------
router.post('/ocr', async (req, res) => {
  const { photo_url } = req.body;
  if (!photo_url) return res.status(400).json({ error: 'photo_url required' });

  // TODO: call Google Vision API
  // const vision = new ImageAnnotatorClient({ apiKey: process.env.GOOGLE_VISION_API_KEY });
  // const [result] = await vision.textDetection(photo_url);

  // Stub response for development — clerk corrects in UI
  res.json({
    extracted: { full_name: '', id_number: '', dob: '', doc_type: 'NIDA' },
    confidence: 0,
    raw_text: '[OCR not yet integrated — please fill fields manually]',
  });
});

// -------------------------------------------------------------------
// POST /api/clerk/claims/:id/collect — clerk verifies QR and marks collected
// -------------------------------------------------------------------
router.post('/claims/:id/collect', async (req, res) => {
  const { qr_token } = req.body;
  if (!qr_token) return res.status(400).json({ error: 'QR token required' });

  try {
    const { rows } = await db.query(`SELECT * FROM claims WHERE id = $1`, [req.params.id]);
    const claim = rows[0];
    if (!claim) return res.status(404).json({ error: 'Claim not found' });
    if (claim.status !== 'PAID') return res.status(400).json({ error: 'Claim is not in PAID status' });
    if (claim.token_qr !== qr_token) return res.status(400).json({ error: 'Invalid QR token' });
    if (new Date(claim.token_expires_at) < new Date()) return res.status(400).json({ error: 'QR token has expired' });

    await db.query(`UPDATE claims SET status = 'COLLECTED' WHERE id = $1`, [claim.id]);
    await db.query(
      `UPDATE found_documents SET status = 'COLLECTED', collected_at = NOW(), purge_after = NOW() + INTERVAL '6 months' WHERE id = $1`,
      [claim.document_id]
    );

    await auditLog(req.staff.id, req.staff.phone, 'DOCUMENT_COLLECTED', 'found_documents', claim.document_id);
    res.json({ message: 'Document marked as collected' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
