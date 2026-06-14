const crypto = require('crypto');

const ALGO = 'aes-256-gcm';

function getKey() {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
  return Buffer.from(hex, 'hex');
}

function encrypt(plaintext) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map(b => b.toString('base64')).join('.');
}

function decrypt(ciphertext) {
  const parts = ciphertext.split('.');
  if (parts.length !== 3) throw new Error('Invalid ciphertext format');
  const [iv, tag, enc] = parts.map(b => Buffer.from(b, 'base64'));
  const decipher = crypto.createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}

function hashIdNumber(idNumber) {
  const key = process.env.HMAC_KEY;
  if (!key) throw new Error('HMAC_KEY not set');
  return crypto.createHmac('sha256', key).update(idNumber.trim().toUpperCase()).digest('hex');
}

function maskIdNumber(idNumber) {
  const clean = idNumber.trim();
  if (clean.length <= 7) return clean.replace(/./g, '*');
  return clean.slice(0, 4) + '*'.repeat(clean.length - 7) + clean.slice(-3);
}

function maskName(fullName) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1][0]}.`;
}

module.exports = { encrypt, decrypt, hashIdNumber, maskIdNumber, maskName };
