const express = require('express');
const request = require('supertest');
const jwt     = require('jsonwebtoken');

jest.mock('../../db', () => ({ query: jest.fn() }));
jest.mock('../../middleware/audit', () => ({ auditLog: jest.fn().mockResolvedValue(undefined) }));
jest.mock('bcrypt', () => ({ hash: jest.fn().mockResolvedValue('$hashed$'), compare: jest.fn() }));

const db = require('../../db');
const adminRoutes = require('../../routes/admin');

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/', adminRoutes);
  return app;
}

function adminToken() {
  return `Bearer ${jwt.sign({ id: 1, phone: '+255700000001', role: 'admin', branch_id: 1 }, process.env.JWT_SECRET)}`;
}
function clerkToken() {
  return `Bearer ${jwt.sign({ id: 2, phone: '+255700000002', role: 'clerk', branch_id: 1 }, process.env.JWT_SECRET)}`;
}

// ── GET /stats ─────────────────────────────────────────────────────
describe('GET /stats', () => {
  it('returns full dashboard stats for an admin', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ total: '12' }] })
      .mockResolvedValueOnce({ rows: [{ status: 'LOGGED', count: '5' }, { status: 'COLLECTED', count: '7' }] })
      .mockResolvedValueOnce({ rows: [{ doc_type: 'NIDA', count: '10' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ total: '120000', count: '12' }] });

    const res = await request(makeApp()).get('/stats').set('Authorization', adminToken());

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(12);
    expect(res.body.by_status).toHaveLength(2);
    expect(res.body.revenue.total_tzs).toBe(120000);
    expect(res.body.revenue.transactions).toBe(12);
  });

  it('returns 403 when a clerk tries to access admin stats', async () => {
    const res = await request(makeApp()).get('/stats').set('Authorization', clerkToken());
    expect(res.status).toBe(403);
  });

  it('returns 401 without any token', async () => {
    const res = await request(makeApp()).get('/stats');
    expect(res.status).toBe(401);
  });
});

// ── GET /documents ─────────────────────────────────────────────────
describe('GET /documents (admin)', () => {
  it('returns paginated documents across all branches', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ count: '3' }] })
      .mockResolvedValueOnce({ rows: [
        { id: 'doc-1', doc_type: 'NIDA', status: 'LOGGED', branch_name: 'Arusha PO' },
        { id: 'doc-2', doc_type: 'VOTER', status: 'COLLECTED', branch_name: 'Moshi PO' },
      ]});

    const res = await request(makeApp()).get('/documents').set('Authorization', adminToken());

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(3);
    expect(res.body.documents).toHaveLength(2);
  });

  it('accepts status and branch filters', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ count: '1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'doc-1', status: 'VERIFIED' }] });

    const res = await request(makeApp())
      .get('/documents?status=VERIFIED&branch=1')
      .set('Authorization', adminToken());

    expect(res.status).toBe(200);
  });
});

// ── GET /staff ─────────────────────────────────────────────────────
describe('GET /staff', () => {
  it('returns all staff members with branch info', async () => {
    db.query.mockResolvedValueOnce({ rows: [
      { id: 1, full_name: 'Admin User', phone: '+255700000001', role: 'admin', active: true, branch_name: 'Arusha PO' },
      { id: 2, full_name: 'Clerk User', phone: '+255700000002', role: 'clerk', active: true, branch_name: 'Arusha PO' },
    ]});

    const res = await request(makeApp()).get('/staff').set('Authorization', adminToken());

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].role).toBe('admin');
    expect(res.body[1].role).toBe('clerk');
  });

  it('returns 403 for a clerk', async () => {
    const res = await request(makeApp()).get('/staff').set('Authorization', clerkToken());
    expect(res.status).toBe(403);
  });
});

// ── POST /staff ────────────────────────────────────────────────────
describe('POST /staff', () => {
  it('creates a new staff member and returns their record', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 5, full_name: 'New Clerk', phone: '+255700000099', role: 'clerk' }] });

    const res = await request(makeApp())
      .post('/staff')
      .set('Authorization', adminToken())
      .send({ branch_id: 1, full_name: 'New Clerk', phone: '+255700000099', password: 'NewPass123', role: 'clerk' });

    expect(res.status).toBe(201);
    expect(res.body.full_name).toBe('New Clerk');
    expect(res.body).not.toHaveProperty('password_hash');
  });

  it('returns 409 when phone number is already taken', async () => {
    const pgUniqueError = Object.assign(new Error('duplicate'), { code: '23505' });
    db.query.mockRejectedValueOnce(pgUniqueError);

    const res = await request(makeApp())
      .post('/staff')
      .set('Authorization', adminToken())
      .send({ branch_id: 1, full_name: 'Dupe', phone: '+255700000001', password: 'NewPass123', role: 'clerk' });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already registered/i);
  });

  it('returns 400 when password is too short', async () => {
    const res = await request(makeApp())
      .post('/staff')
      .set('Authorization', adminToken())
      .send({ branch_id: 1, full_name: 'Short', phone: '+255700000099', password: 'short' });

    expect(res.status).toBe(400);
  });
});

// ── GET /branches ──────────────────────────────────────────────────
describe('GET /branches', () => {
  it('returns all active branches with document counts', async () => {
    db.query.mockResolvedValueOnce({ rows: [
      { id: 1, name: 'Arusha Main PO', region: 'Arusha', active_docs: '3' },
      { id: 2, name: 'Dar PO',         region: 'Dar es Salaam', active_docs: '0' },
    ]});

    const res = await request(makeApp()).get('/branches').set('Authorization', adminToken());

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].name).toBe('Arusha Main PO');
  });
});

// ── POST /branches ─────────────────────────────────────────────────
describe('POST /branches', () => {
  it('creates a new branch', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 6, name: 'Mbeya PO', region: 'Mbeya' }] });

    const res = await request(makeApp())
      .post('/branches')
      .set('Authorization', adminToken())
      .send({ name: 'Mbeya PO', region: 'Mbeya' });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Mbeya PO');
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(makeApp())
      .post('/branches')
      .set('Authorization', adminToken())
      .send({ region: 'Mbeya' });

    expect(res.status).toBe(400);
  });
});

// ── GET /audit ─────────────────────────────────────────────────────
describe('GET /audit', () => {
  it('returns audit log entries', async () => {
    db.query.mockResolvedValueOnce({ rows: [
      { id: 1, action: 'LOGIN', actor_phone: '+255700000001', at: new Date().toISOString() },
    ]});

    const res = await request(makeApp()).get('/audit').set('Authorization', adminToken());

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].action).toBe('LOGIN');
  });
});
