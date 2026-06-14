const express = require('express');
const request = require('supertest');
const jwt     = require('jsonwebtoken');

jest.mock('../../db', () => ({ query: jest.fn() }));
jest.mock('../../middleware/audit', () => ({ auditLog: jest.fn().mockResolvedValue(undefined) }));
jest.mock('bcrypt', () => ({ compare: jest.fn(), hash: jest.fn() }));

const db     = require('../../db');
const bcrypt = require('bcrypt');

// Import AFTER mocks are in place
const authRoutes = require('../../routes/auth');

const STAFF_ROW = {
  id: 1, branch_id: 1, phone: '+255700000001', full_name: 'Test Admin',
  password_hash: '$mocked$', role: 'admin',
  branch_name: 'Arusha Main PO', branch_region: 'Arusha',
};

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/', authRoutes);
  return app;
}

function bearerToken(role = 'clerk') {
  return `Bearer ${jwt.sign({ id: 1, phone: STAFF_ROW.phone, role, branch_id: 1 }, process.env.JWT_SECRET)}`;
}

// ── POST /login ────────────────────────────────────────────────────
describe('POST /login', () => {
  it('returns a JWT and staff info on valid credentials', async () => {
    db.query.mockResolvedValueOnce({ rows: [STAFF_ROW] });
    bcrypt.compare.mockResolvedValueOnce(true);

    const res = await request(makeApp())
      .post('/login')
      .send({ phone: '+255700000001', password: 'Admin@1234' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(typeof res.body.token).toBe('string');
    expect(res.body.staff.role).toBe('admin');
    expect(res.body.staff.full_name).toBe('Test Admin');
  });

  it('returns 401 when phone is not found', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(makeApp())
      .post('/login')
      .send({ phone: '+255999999999', password: 'Admin@1234' });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid credentials/i);
  });

  it('returns 401 when password is wrong', async () => {
    db.query.mockResolvedValueOnce({ rows: [STAFF_ROW] });
    bcrypt.compare.mockResolvedValueOnce(false);

    const res = await request(makeApp())
      .post('/login')
      .send({ phone: '+255700000001', password: 'WrongPassword1' });

    expect(res.status).toBe(401);
  });

  it('returns 400 when password is missing', async () => {
    const res = await request(makeApp())
      .post('/login')
      .send({ phone: '+255700000001' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when phone is too short', async () => {
    const res = await request(makeApp())
      .post('/login')
      .send({ phone: '123', password: 'Admin@1234' });

    expect(res.status).toBe(400);
  });
});

// ── PATCH /change-password ─────────────────────────────────────────
describe('PATCH /change-password', () => {
  it('returns 401 when no Authorization header is sent', async () => {
    const res = await request(makeApp())
      .patch('/change-password')
      .send({ current_password: 'Admin@1234', new_password: 'NewPass456' });

    expect(res.status).toBe(401);
  });

  it('changes password with correct current password', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ password_hash: '$mocked$' }] }); // SELECT
    db.query.mockResolvedValueOnce({ rows: [] });                               // UPDATE
    bcrypt.compare.mockResolvedValueOnce(true);
    bcrypt.hash.mockResolvedValueOnce('$newHash$');

    const res = await request(makeApp())
      .patch('/change-password')
      .set('Authorization', bearerToken('clerk'))
      .send({ current_password: 'Admin@1234', new_password: 'NewPass456' });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/updated/i);
  });

  it('returns 401 when current password is incorrect', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ password_hash: '$mocked$' }] });
    bcrypt.compare.mockResolvedValueOnce(false);

    const res = await request(makeApp())
      .patch('/change-password')
      .set('Authorization', bearerToken())
      .send({ current_password: 'WrongPass1', new_password: 'NewPass456' });

    expect(res.status).toBe(401);
  });

  it('returns 400 when new password has no uppercase letter', async () => {
    const res = await request(makeApp())
      .patch('/change-password')
      .set('Authorization', bearerToken())
      .send({ current_password: 'Admin@1234', new_password: 'weakpass1' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when new password has no digit', async () => {
    const res = await request(makeApp())
      .patch('/change-password')
      .set('Authorization', bearerToken())
      .send({ current_password: 'Admin@1234', new_password: 'NoDigitHere' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when new password is too short', async () => {
    const res = await request(makeApp())
      .patch('/change-password')
      .set('Authorization', bearerToken())
      .send({ current_password: 'Admin@1234', new_password: 'Ab1' });

    expect(res.status).toBe(400);
  });
});
