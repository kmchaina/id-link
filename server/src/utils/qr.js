const crypto = require('crypto');
const QRCode = require('qrcode');

const TOKEN_TTL_DAYS = 7;

async function generateCollectionToken(documentId, claimId) {
  const secret = crypto.randomBytes(16).toString('hex').toUpperCase();
  const payload = `IDLINK:${documentId}:${claimId}:${secret}`;
  const qrDataUrl = await QRCode.toDataURL(payload, { width: 280, margin: 2, color: { dark: '#065f46' } });
  const expiresAt = new Date(Date.now() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  return { payload, qrDataUrl, expiresAt };
}

module.exports = { generateCollectionToken };
