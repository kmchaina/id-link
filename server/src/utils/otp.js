const crypto = require('crypto');

function generateOTP() {
  // crypto.randomInt is unbiased and cryptographically secure
  return String(crypto.randomInt(100000, 999999));
}

function otpExpiresAt() {
  return new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
}

module.exports = { generateOTP, otpExpiresAt };
