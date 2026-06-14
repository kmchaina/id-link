const express = require('express');
const request = require('supertest');
const jwt     = require('jsonwebtoken');

jest.mock('../../db', () => ({ query: jest.fn() }));
jest.mock('../../middleware/audit', () => ({ auditLog: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../../utils/sms', () => ({ sendSMS: jest.fn().mockResolvedValue(undefined) }));

const db = require('../../db');
const clerkRoutes = require('../../routes/clerk');

const DOC_ID = '550e8400-e29b-41d4-a716-446655440000';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/', clerkRoutes);
  return app;
}

function token(role = 'clerk', branch_id = 1) {
  return `Bearer ${jwt.sign(
    { id: 2, phone: '+255700000002', role, branch_id, branch_name: 'Test Branch' },
    process.env.JWT_SECRET
  )}`;
}

const VALID_DOC = {
  doc_type: 'NIDA',
  full_name: 'Juma Hassan Mbeki',
  id_number: '19901231-12345-00001-7',
  region_found: 'Arusha',
};

// ── POST /documents ────────────────────────────────────────────────
describe('POST /documents', () => {
  it('logs a new found document and returns masked data', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [] })                   // no duplicate
      .mockResolvedValueOnce({ rows: [{ id: DOC_ID }] })    // INSERT
      .mockResolvedValueOnce({ rows: [] });                   // SELECT alerts

    const res = await request(makeApp())
      .post('/documents')
      .set('Authorization', token())
      .send(VALID_DOC);

    expect(res.status).toBe(201);
    expect(res.body.id).toBe(DOC_ID);
    expect(res.body.name_initial).toBe('Juma H.');
    expect(res.body.id_number_masked).toMatch(/\*/);
  });

  it('also creates a finder_reward row when finder_phone is provided', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [] })                   // no duplicate
      .mockResolvedValueOnce({ rows: [{ id: DOC_ID }] })    // INSERT doc
      .mockResolvedValueOnce({ rows: [] })                   // SELECT alerts
      .mockResolvedValueOnce({ rows: [] });                   // INSERT finder_reward

    const res = await request(makeApp())
      .post('/documents')
      .set('Authorization', token())
      .send({ ...VALID_DOC, finder_phone: '+255700333444' });

    expect(res.status).toBe(201);
    // 4th db.query call should have been the finder_reward INSERT
    expect(db.query).toHaveBeenCalledTimes(4);
  });

  it('returns 409 when the same ID number is already in the system', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: DOC_ID, status: 'LOGGED' }] });

    const res = await request(makeApp())
      .post('/documents')
      .set('Authorization', token())
      .send(VALID_DOC);

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already in the system/i);
  });

  it('returns 401 when no Authorization header is sent', async () => {
    const res = await request(makeApp()).post('/documents').send(VALID_DOC);
    expect(res.status).toBe(401);
  });

  it('returns 400 for an invalid doc_type', async () => {
    const res = await request(makeApp())
      .post('/documents')
      .set('Authorization', token())
      .send({ ...VALID_DOC, doc_type: 'UNKNOWN' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when full_name is missing', async () => {
    const res = await request(makeApp())
      .post('/documents')
      .set('Authorization', token())
      .send({ doc_type: 'NIDA', id_number: '123', region_found: 'Arusha' });

    expect(res.status).toBe(400);
  });
});

// ── GET /documents ─────────────────────────────────────────────────
describe('GET /documents', () => {
  it('returns paginated documents for the clerk branch', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ count: '1' }] })
      .mockResolvedValueOnce({ rows: [{ id: DOC_ID, doc_type: 'NIDA', status: 'LOGGED', name_initial: 'Juma H.' }] });

    const res = await request(makeApp())
      .get('/documents')
      .set('Authorization', token());

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.documents).toHaveLength(1);
  });

  it('accepts a status filter without error', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ count: '0' }] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(makeApp())
      .get('/documents?status=VERIFIED')
      .set('Authorization', token());

    expect(res.status).toBe(200);
  });
});

// ── PATCH /documents/:id/status ────────────────────────────────────
describe('PATCH /documents/:id/status', () => {
  it('transitions LOGGED → VERIFIED successfully', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: DOC_ID, status: 'LOGGED', branch_id: 1 }] })
      .mockResolvedValueOnce({ rows: [] }); // UPDATE

    const res = await request(makeApp())
      .patch(`/documents/${DOC_ID}/status`)
      .set('Authorization', token())
      .send({ status: 'VERIFIED' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('VERIFIED');
  });

  it('transitions VERIFIED → CLAIMED successfully', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: DOC_ID, status: 'VERIFIED', branch_id: 1 }] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(makeApp())
      .patch(`/documents/${DOC_ID}/status`)
      .set('Authorization', token())
      .send({ status: 'CLAIMED' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('CLAIMED');
  });

  it('rejects the invalid transition LOGGED → COLLECTED', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: DOC_ID, status: 'LOGGED', branch_id: 1 }] });

    const res = await request(makeApp())
      .patch(`/documents/${DOC_ID}/status`)
      .set('Authorization', token())
      .send({ status: 'COLLECTED' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/cannot transition/i);
  });

  it('returns 403 when document belongs to a different branch', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: DOC_ID, status: 'LOGGED', branch_id: 99 }] });

    const res = await request(makeApp())
      .patch(`/documents/${DOC_ID}/status`)
      .set('Authorization', token('clerk', 1)) // clerk in branch 1, doc in branch 99
      .send({ status: 'VERIFIED' });

    expect(res.status).toBe(403);
  });

  it('returns 404 when document does not exist', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(makeApp())
      .patch(`/documents/${DOC_ID}/status`)
      .set('Authorization', token())
      .send({ status: 'VERIFIED' });

    expect(res.status).toBe(404);
  });

  it('allows admin to update documents across branches', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: DOC_ID, status: 'LOGGED', branch_id: 99 }] }) // different branch
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(makeApp())
      .patch(`/documents/${DOC_ID}/status`)
      .set('Authorization', token('admin', 1)) // admin in branch 1
      .send({ status: 'VERIFIED' });

    expect(res.status).toBe(200);
  });
});

// ── POST /claims/:id/collect ────────────────────────────────────────
describe('POST /claims/:id/collect', () => {
  it('marks claim and document as COLLECTED when token matches', async () => {
    const qrPayload = 'IDLINK:doc-id:claim-id:TESTSECRET';
    const claimRow = {
      id: 'claim-uuid', document_id: DOC_ID, status: 'PAID',
      token_qr: qrPayload,
      token_expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    };
    db.query
      .mockResolvedValueOnce({ rows: [claimRow] }) // SELECT claim
      .mockResolvedValueOnce({ rows: [] })          // UPDATE claims
      .mockResolvedValueOnce({ rows: [] });          // UPDATE found_documents

    const res = await request(makeApp())
      .post('/claims/claim-uuid/collect')
      .set('Authorization', token())
      .send({ qr_token: qrPayload });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/collected/i);
  });

  it('returns 400 when QR token does not match', async () => {
    const claimRow = {
      id: 'claim-uuid', document_id: DOC_ID, status: 'PAID',
      token_qr: 'IDLINK:doc:claim:CORRECT',
      token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
    };
    db.query.mockResolvedValueOnce({ rows: [claimRow] });

    const res = await request(makeApp())
      .post('/claims/claim-uuid/collect')
      .set('Authorization', token())
      .send({ qr_token: 'IDLINK:doc:claim:WRONG' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid qr token/i);
  });
});
