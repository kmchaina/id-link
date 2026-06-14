const express = require('express');
const request = require('supertest');

// Bypass all rate limiters so test order doesn't cause 429s
jest.mock('express-rate-limit', () => () => (_req, _res, next) => next());
jest.mock('../../db', () => ({ query: jest.fn() }));
jest.mock('../../middleware/audit', () => ({ auditLog: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../../utils/sms',  () => ({ sendSMS: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../../utils/qr',   () => ({
  generateCollectionToken: jest.fn().mockResolvedValue({
    payload:   'IDLINK:doc-id:claim-id:TESTSECRET',
    qrDataUrl: 'data:image/png;base64,fakeqr',
    expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
  }),
}));

const db = require('../../db');
const { hashIdNumber } = require('../../utils/crypto');

// Reset db.query mock queue between tests so leftover mockResolvedValueOnce
// calls from one test don't bleed into the next.
beforeEach(() => db.query.mockReset());

const publicRoutes = require('../../routes/public');

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/', publicRoutes);
  return app;
}

const TEST_ID      = '19901231-12345-00001-7';
const TEST_ID_HASH = hashIdNumber(TEST_ID);
const DOC_ID       = '550e8400-e29b-41d4-a716-446655440000';

const DOC_ROW = {
  id: DOC_ID, doc_type: 'NIDA', name_initial: 'Juma H.',
  id_number_masked: '1990****001', id_number_hash: TEST_ID_HASH,
  region_found: 'Arusha', branch_name: 'Arusha Main PO',
  status: 'LOGGED', created_at: new Date().toISOString(),
};

const CLAIM_ROW = {
  id: 'claim-uuid-001', document_id: DOC_ID,
  claimant_phone: '+255700111222', delivery_requested: false,
  otp_code: '654321',
  otp_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  status: 'OTP_SENT',
};

// ── GET /search ────────────────────────────────────────────────────
describe('GET /search', () => {
  it('returns paginated results with total count', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ count: '2' }] })
      .mockResolvedValueOnce({ rows: [DOC_ROW, { ...DOC_ROW, id: 'other-id' }] });

    const res = await request(makeApp()).get('/search?q=Juma');

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.results).toHaveLength(2);
    expect(res.body.pages).toBe(1);
  });

  it('returns empty results when nothing matches', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ count: '0' }] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(makeApp()).get('/search?q=doesnotexist');

    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(0);
    expect(res.body.total).toBe(0);
  });

  it('accepts region and type filters without error', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ count: '1' }] })
      .mockResolvedValueOnce({ rows: [DOC_ROW] });

    const res = await request(makeApp()).get('/search?region=Arusha&type=NIDA');
    expect(res.status).toBe(200);
  });
});

// ── GET /regions ───────────────────────────────────────────────────
describe('GET /regions', () => {
  it('returns a flat list of region strings', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ region: 'Arusha' }, { region: 'Dar es Salaam' }] });

    const res = await request(makeApp()).get('/regions');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(['Arusha', 'Dar es Salaam']);
  });
});

// ── POST /claims ───────────────────────────────────────────────────
describe('POST /claims', () => {
  it('creates a claim when ID number matches document hash', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [DOC_ROW] })           // SELECT doc
      .mockResolvedValueOnce({ rows: [] })                   // SELECT existing claims
      .mockResolvedValueOnce({ rows: [{ id: 'claim-001' }] }); // INSERT claim

    const res = await request(makeApp())
      .post('/claims')
      .send({ document_id: DOC_ID, id_number: TEST_ID, phone: '+255700111222' });

    expect(res.status).toBe(201);
    expect(res.body.claim_id).toBe('claim-001');
    expect(res.body.message).toMatch(/otp sent/i);
  });

  it('returns 400 when provided ID number does not match stored hash', async () => {
    db.query.mockResolvedValueOnce({ rows: [DOC_ROW] }); // SELECT doc (returns real hash)

    const res = await request(makeApp())
      .post('/claims')
      .send({ document_id: DOC_ID, id_number: 'WRONG-ID-NUMBER', phone: '+255700111222' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/does not match/i);
  });

  it('returns 404 when document_id does not exist', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(makeApp())
      .post('/claims')
      .send({ document_id: '00000000-0000-0000-0000-000000000000', id_number: TEST_ID, phone: '+255700111222' });

    expect(res.status).toBe(404);
  });

  it('returns 409 when document is already COLLECTED', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ ...DOC_ROW, status: 'COLLECTED' }] });

    const res = await request(makeApp())
      .post('/claims')
      .send({ document_id: DOC_ID, id_number: TEST_ID, phone: '+255700111222' });

    expect(res.status).toBe(409);
  });

  it('returns 400 when phone is missing', async () => {
    const res = await request(makeApp())
      .post('/claims')
      .send({ document_id: DOC_ID, id_number: TEST_ID });

    expect(res.status).toBe(400);
  });

  it('returns 400 when document_id is not a UUID', async () => {
    const res = await request(makeApp())
      .post('/claims')
      .send({ document_id: 'not-a-uuid', id_number: TEST_ID, phone: '+255700111222' });

    expect(res.status).toBe(400);
  });
});

// ── POST /claims/:id/verify-otp ────────────────────────────────────
describe('POST /claims/:id/verify-otp', () => {
  it('verifies the correct OTP and returns claim info', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [CLAIM_ROW] })  // SELECT claim
      .mockResolvedValueOnce({ rows: [] });            // UPDATE

    const res = await request(makeApp())
      .post('/claims/claim-uuid-001/verify-otp')
      .send({ otp: '654321' });

    expect(res.status).toBe(200);
    expect(res.body.claim_id).toBe(CLAIM_ROW.id);
    expect(res.body.amount_tzs).toBe(10000);
  });

  it('returns 400 for an incorrect OTP', async () => {
    db.query.mockResolvedValueOnce({ rows: [CLAIM_ROW] });

    const res = await request(makeApp())
      .post('/claims/claim-uuid-001/verify-otp')
      .send({ otp: '000000' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/incorrect/i);
  });

  it('returns 400 when the OTP has expired', async () => {
    const expiredClaim = { ...CLAIM_ROW, otp_expires_at: new Date(Date.now() - 60_000).toISOString() };
    db.query.mockResolvedValueOnce({ rows: [expiredClaim] });

    const res = await request(makeApp())
      .post('/claims/claim-uuid-001/verify-otp')
      .send({ otp: '654321' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/expired/i);
  });

  it('returns 400 when OTP is not 6 digits', async () => {
    const res = await request(makeApp())
      .post('/claims/claim-uuid-001/verify-otp')
      .send({ otp: '12345' });

    expect(res.status).toBe(400);
  });

  it('returns 404 when claim does not exist', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(makeApp())
      .post('/claims/nonexistent/verify-otp')
      .send({ otp: '654321' });

    expect(res.status).toBe(404);
  });

  it('returns 200 immediately when claim is already OTP_VERIFIED', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ ...CLAIM_ROW, status: 'OTP_VERIFIED' }] });

    const res = await request(makeApp())
      .post('/claims/claim-uuid-001/verify-otp')
      .send({ otp: '654321' });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/already verified/i);
  });

  it('charges 25,000 TZS when delivery was requested', async () => {
    const deliveryClaim = { ...CLAIM_ROW, delivery_requested: true };
    db.query
      .mockResolvedValueOnce({ rows: [deliveryClaim] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(makeApp())
      .post('/claims/claim-uuid-001/verify-otp')
      .send({ otp: '654321' });

    expect(res.status).toBe(200);
    expect(res.body.amount_tzs).toBe(25000);
  });
});

// ── POST /claims/:id/pay ───────────────────────────────────────────
describe('POST /claims/:id/pay', () => {
  it('processes payment and returns QR code + token', async () => {
    const verifiedClaim = { ...CLAIM_ROW, status: 'OTP_VERIFIED' };
    db.query
      .mockResolvedValueOnce({ rows: [verifiedClaim] })         // SELECT claim
      .mockResolvedValueOnce({ rows: [{ id: 'pay-001' }] })     // INSERT payment
      .mockResolvedValueOnce({ rows: [] })                       // UPDATE claims
      .mockResolvedValueOnce({ rows: [] })                       // UPDATE found_documents
      .mockResolvedValueOnce({ rows: [{ id_number_hash: TEST_ID_HASH }] }) // SELECT doc hash
      .mockResolvedValueOnce({ rows: [] });                      // SELECT alert subs

    const res = await request(makeApp()).post('/claims/claim-uuid-001/pay');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('qr', 'data:image/png;base64,fakeqr');
    expect(res.body).toHaveProperty('token', 'IDLINK:doc-id:claim-id:TESTSECRET');
    expect(res.body).toHaveProperty('amount_tzs', 10000);
  });

  it('returns 400 when claim is not in OTP_VERIFIED state', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ ...CLAIM_ROW, status: 'OTP_SENT' }] });

    const res = await request(makeApp()).post('/claims/claim-uuid-001/pay');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/otp must be verified/i);
  });

  it('returns 404 when claim does not exist', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(makeApp()).post('/claims/nonexistent/pay');

    expect(res.status).toBe(404);
  });
});

// ── POST /claims/:id/resend-otp ────────────────────────────────────
describe('POST /claims/:id/resend-otp', () => {
  it('sends a new OTP and returns success', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [CLAIM_ROW] }) // SELECT claim
      .mockResolvedValueOnce({ rows: [] });           // UPDATE

    const res = await request(makeApp()).post('/claims/claim-uuid-001/resend-otp');

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/sent/i);
  });

  it('returns 400 when claim is already verified', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ ...CLAIM_ROW, status: 'OTP_VERIFIED' }] });

    const res = await request(makeApp()).post('/claims/claim-uuid-001/resend-otp');

    expect(res.status).toBe(400);
  });
});

// ── POST /alerts ───────────────────────────────────────────────────
describe('POST /alerts', () => {
  it('creates an alert subscription', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [] })             // no existing subscription
      .mockResolvedValueOnce({ rows: [{ id: 'p1' }] }) // INSERT payment
      .mockResolvedValueOnce({ rows: [] });              // INSERT subscription

    const res = await request(makeApp())
      .post('/alerts')
      .send({ phone: '+255700111222', id_number: TEST_ID });

    expect(res.status).toBe(201);
  });

  it('returns 409 when the same phone+ID combo is already subscribed', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 'existing' }] });

    const res = await request(makeApp())
      .post('/alerts')
      .send({ phone: '+255700111222', id_number: TEST_ID });

    expect(res.status).toBe(409);
  });

  it('returns 400 when phone is missing', async () => {
    const res = await request(makeApp())
      .post('/alerts')
      .send({ id_number: TEST_ID });

    expect(res.status).toBe(400);
  });
});
