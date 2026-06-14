const express = require('express');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const db = require('../db');
const { hashIdNumber } = require('../utils/crypto');
const { generateOTP, otpExpiresAt } = require('../utils/otp');
const { generateCollectionToken } = require('../utils/qr');
const { sendSMS } = require('../utils/sms');
const { auditLog } = require('../middleware/audit');

const router = express.Router();

const claimLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { error: 'Too many requests, please try again later' } });
const otpLimiter  = rateLimit({ windowMs: 5  * 60 * 1000, max: 3,  message: { error: 'Too many OTP requests' } });

// -------------------------------------------------------------------
// GET /api/search?q=&region=&type=&page=
// Public masked search
// -------------------------------------------------------------------
router.get('/search', async (req, res) => {
  const { q = '', region = '', type = '', page = '1' } = req.query;
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limit = 12;
  const offset = (pageNum - 1) * limit;

  const conditions = [`d.status NOT IN ('COLLECTED','EXPIRED')`];
  const params = [];

  if (q.trim()) {
    params.push(q.trim());
    conditions.push(`(d.full_name ILIKE '%' || $${params.length} || '%' OR d.name_initial ILIKE '%' || $${params.length} || '%')`);
  }
  if (region.trim()) {
    params.push(region.trim());
    conditions.push(`d.region_found ILIKE $${params.length}`);
  }
  if (type.trim()) {
    params.push(type.trim().toUpperCase());
    conditions.push(`d.doc_type = $${params.length}`);
  }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  try {
    const countRes = await db.query(
      `SELECT COUNT(*) FROM found_documents d ${where}`,
      params
    );
    const total = parseInt(countRes.rows[0].count);

    params.push(limit, offset);
    const { rows } = await db.query(
      `SELECT d.id, d.doc_type, d.name_initial, d.id_number_masked,
              d.region_found, b.name AS branch_name, d.status, d.created_at
       FROM found_documents d
       JOIN branches b ON d.branch_id = b.id
       ${where}
       ORDER BY d.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({ results: rows, total, page: pageNum, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Search failed' });
  }
});

// -------------------------------------------------------------------
// GET /api/regions — list of regions for filter dropdown
// -------------------------------------------------------------------
router.get('/regions', async (_req, res) => {
  try {
    const { rows } = await db.query(`SELECT DISTINCT region FROM branches ORDER BY region`);
    res.json(rows.map(r => r.region));
  } catch {
    res.status(500).json({ error: 'Failed to load regions' });
  }
});

// -------------------------------------------------------------------
// POST /api/claims — initiate a claim (verify ID number matches)
// -------------------------------------------------------------------
router.post('/claims', claimLimiter, async (req, res) => {
  const Schema = z.object({
    document_id: z.string().uuid(),
    id_number: z.string().min(5).max(30),
    phone: z.string().min(10).max(20),
    delivery_requested: z.boolean().optional().default(false),
  });
  const parsed = Schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });

  const { document_id, id_number, phone, delivery_requested } = parsed.data;

  try {
    const docRes = await db.query(
      `SELECT id, status, id_number_hash FROM found_documents WHERE id = $1`,
      [document_id]
    );
    const doc = docRes.rows[0];
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    if (['COLLECTED', 'EXPIRED'].includes(doc.status)) {
      return res.status(409).json({ error: 'This document has already been collected or is no longer available' });
    }

    const providedHash = hashIdNumber(id_number);
    if (providedHash !== doc.id_number_hash) {
      await auditLog(null, phone, 'CLAIM_ID_MISMATCH', 'found_documents', document_id);
      return res.status(400).json({ error: 'ID number does not match our records' });
    }

    // Check for existing active claim on this document
    const existingClaim = await db.query(
      `SELECT id, status FROM claims WHERE document_id = $1 AND status NOT IN ('EXPIRED') ORDER BY created_at DESC LIMIT 1`,
      [document_id]
    );
    if (existingClaim.rows[0]?.status === 'PAID' || existingClaim.rows[0]?.status === 'COLLECTED') {
      return res.status(409).json({ error: 'A claim is already active for this document' });
    }

    const otp = generateOTP();
    const expiresAt = otpExpiresAt();

    const claimRes = await db.query(
      `INSERT INTO claims (document_id, claimant_phone, delivery_requested, otp_code, otp_expires_at, status)
       VALUES ($1, $2, $3, $4, $5, 'OTP_SENT') RETURNING id`,
      [document_id, phone, delivery_requested, otp, expiresAt]
    );
    const claimId = claimRes.rows[0].id;

    await sendSMS(phone, `ID-Link: Your verification code is ${otp}. Valid for 10 minutes. Do not share this code.`);
    await auditLog(null, phone, 'CLAIM_INITIATED', 'claims', claimId);

    res.status(201).json({ claim_id: claimId, message: 'OTP sent to your phone' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// -------------------------------------------------------------------
// POST /api/claims/:id/verify-otp
// -------------------------------------------------------------------
router.post('/claims/:id/verify-otp', otpLimiter, async (req, res) => {
  const Schema = z.object({ otp: z.string().length(6) });
  const parsed = Schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'OTP must be 6 digits' });

  try {
    const { rows } = await db.query(
      `SELECT * FROM claims WHERE id = $1`,
      [req.params.id]
    );
    const claim = rows[0];
    if (!claim) return res.status(404).json({ error: 'Claim not found' });
    if (claim.status === 'OTP_VERIFIED' || claim.status === 'PAID') {
      return res.json({ message: 'Already verified' });
    }
    if (claim.otp_code !== parsed.data.otp) {
      return res.status(400).json({ error: 'Incorrect OTP' });
    }
    if (new Date(claim.otp_expires_at) < new Date()) {
      return res.status(400).json({ error: 'OTP has expired. Please start a new claim.' });
    }

    await db.query(
      `UPDATE claims SET status = 'OTP_VERIFIED', otp_verified_at = NOW() WHERE id = $1`,
      [claim.id]
    );

    const amount = claim.delivery_requested ? 25000 : 10000;
    res.json({ claim_id: claim.id, amount_tzs: amount, delivery_requested: claim.delivery_requested });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// -------------------------------------------------------------------
// POST /api/claims/:id/pay — simulate / initiate payment
// -------------------------------------------------------------------
router.post('/claims/:id/pay', async (req, res) => {
  const Schema = z.object({ gateway_ref: z.string().optional() });
  const parsed = Schema.safeParse(req.body);

  try {
    const { rows } = await db.query(`SELECT * FROM claims WHERE id = $1`, [req.params.id]);
    const claim = rows[0];
    if (!claim) return res.status(404).json({ error: 'Claim not found' });
    if (claim.status !== 'OTP_VERIFIED') {
      return res.status(400).json({ error: 'OTP must be verified before payment' });
    }

    const amount = claim.delivery_requested ? 25000 : 10000;
    const paymentRes = await db.query(
      `INSERT INTO payments (claim_id, type, amount_tzs, gateway_ref, status, completed_at)
       VALUES ($1, $2, $3, $4, 'SUCCESS', NOW()) RETURNING id`,
      [claim.id, claim.delivery_requested ? 'DELIVERY' : 'RECOVERY', amount, parsed.data?.gateway_ref ?? 'SIMULATED']
    );
    const paymentId = paymentRes.rows[0].id;

    const { payload, qrDataUrl, expiresAt } = await generateCollectionToken(claim.document_id, claim.id);

    await db.query(
      `UPDATE claims SET status = 'PAID', token_qr = $1, token_expires_at = $2 WHERE id = $3`,
      [payload, expiresAt, claim.id]
    );
    await db.query(
      `UPDATE found_documents SET status = 'CLAIMED' WHERE id = $1 AND status NOT IN ('COLLECTED')`,
      [claim.document_id]
    );

    // Notify any alert subscribers
    const docRes = await db.query(`SELECT id_number_hash FROM found_documents WHERE id = $1`, [claim.document_id]);
    if (docRes.rows[0]) {
      const subscribers = await db.query(
        `SELECT phone FROM alert_subscriptions WHERE id_number_hash = $1 AND notified_at IS NULL`,
        [docRes.rows[0].id_number_hash]
      );
      for (const sub of subscribers.rows) {
        await sendSMS(sub.phone, `ID-Link: A document matching your alert has been claimed. Visit your nearest Post Office.`);
        await db.query(`UPDATE alert_subscriptions SET notified_at = NOW() WHERE phone = $1`, [sub.phone]);
      }
    }

    await sendSMS(claim.claimant_phone, `ID-Link: Payment confirmed! Bring this SMS + your face to collect your document. Token: ${payload.split(':').pop()}`);
    await auditLog(null, claim.claimant_phone, 'PAYMENT_SUCCESS', 'claims', claim.id, { amount, payment_id: paymentId });

    res.json({ qr: qrDataUrl, token: payload, expires_at: expiresAt, amount_tzs: amount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// -------------------------------------------------------------------
// POST /api/alerts — subscribe to alerts
// -------------------------------------------------------------------
router.post('/alerts', async (req, res) => {
  const Schema = z.object({
    phone: z.string().min(10).max(20),
    id_number: z.string().min(5).max(30),
  });
  const parsed = Schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Phone and ID number required' });

  const { phone, id_number } = parsed.data;
  const id_number_hash = hashIdNumber(id_number);

  try {
    const existing = await db.query(
      `SELECT id FROM alert_subscriptions WHERE phone = $1 AND id_number_hash = $2`,
      [phone, id_number_hash]
    );
    if (existing.rows.length) return res.status(409).json({ error: 'Alert already exists for this phone and ID number' });

    const paymentRes = await db.query(
      `INSERT INTO payments (type, amount_tzs, status, completed_at) VALUES ('ALERT', 5000, 'SUCCESS', NOW()) RETURNING id`
    );

    await db.query(
      `INSERT INTO alert_subscriptions (phone, id_number_hash, payment_id) VALUES ($1, $2, $3)`,
      [phone, id_number_hash, paymentRes.rows[0].id]
    );

    await sendSMS(phone, `ID-Link: Alert registered. We will notify you on this number if a document matching ID ${id_number.slice(0, 4)}**** is found.`);
    res.status(201).json({ message: 'Alert subscription created' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// -------------------------------------------------------------------
// POST /api/claims/:id/resend-otp
// -------------------------------------------------------------------
router.post('/claims/:id/resend-otp', otpLimiter, async (req, res) => {
  try {
    const { rows } = await db.query(`SELECT * FROM claims WHERE id = $1`, [req.params.id]);
    const claim = rows[0];
    if (!claim) return res.status(404).json({ error: 'Claim not found' });
    if (claim.status === 'OTP_VERIFIED' || claim.status === 'PAID') {
      return res.status(400).json({ error: 'OTP already verified — no resend needed' });
    }

    const otp = generateOTP();
    const expiresAt = otpExpiresAt();

    await db.query(
      `UPDATE claims SET otp_code = $1, otp_expires_at = $2, status = 'OTP_SENT' WHERE id = $3`,
      [otp, expiresAt, claim.id]
    );

    await sendSMS(claim.claimant_phone, `ID-Link: Your new verification code is ${otp}. Valid for 10 minutes.`);
    res.json({ message: 'New OTP sent' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
