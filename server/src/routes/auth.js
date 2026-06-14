const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const db = require('../db');
const { auditLog } = require('../middleware/audit');

const router = express.Router();

const LoginSchema = z.object({
  phone: z.string().min(10).max(20),
  password: z.string().min(6),
});

router.post('/login', async (req, res) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Phone and password required' });

  const { phone, password } = parsed.data;

  try {
    const { rows } = await db.query(
      `SELECT s.*, b.name AS branch_name, b.region AS branch_region
       FROM staff s JOIN branches b ON s.branch_id = b.id
       WHERE s.phone = $1 AND s.active = TRUE`,
      [phone]
    );
    const staff = rows[0];
    if (!staff) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, staff.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: staff.id, phone: staff.phone, role: staff.role, branch_id: staff.branch_id, branch_name: staff.branch_name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    await auditLog(staff.id, staff.phone, 'LOGIN', 'staff', String(staff.id));

    res.json({
      token,
      staff: { id: staff.id, full_name: staff.full_name, role: staff.role, branch_name: staff.branch_name, branch_region: staff.branch_region },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// -------------------------------------------------------------------
// PATCH /api/auth/change-password (requires valid JWT)
// -------------------------------------------------------------------
const { requireAuth } = require('../middleware/auth');

router.patch('/change-password', requireAuth(['clerk', 'admin']), async (req, res) => {
  const Schema = z.object({
    current_password: z.string().min(6),
    new_password: z.string().min(8).regex(/[A-Z]/, 'Must contain uppercase').regex(/\d/, 'Must contain a number'),
  });
  const parsed = Schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'New password must be 8+ chars with an uppercase letter and a number', details: parsed.error.flatten() });

  try {
    const { rows } = await db.query(`SELECT password_hash FROM staff WHERE id = $1`, [req.staff.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Staff not found' });

    const match = await bcrypt.compare(parsed.data.current_password, rows[0].password_hash);
    if (!match) return res.status(401).json({ error: 'Current password is incorrect' });

    const newHash = await bcrypt.hash(parsed.data.new_password, 12);
    await db.query(`UPDATE staff SET password_hash = $1 WHERE id = $2`, [newHash, req.staff.id]);
    await auditLog(req.staff.id, req.staff.phone, 'PASSWORD_CHANGED', 'staff', String(req.staff.id));

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
