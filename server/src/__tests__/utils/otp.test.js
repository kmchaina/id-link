const { generateOTP, otpExpiresAt } = require('../../utils/otp');

describe('generateOTP', () => {
  it('returns a string of exactly 6 characters', () => {
    expect(generateOTP()).toHaveLength(6);
  });

  it('contains only digit characters', () => {
    expect(generateOTP()).toMatch(/^\d{6}$/);
  });

  it('is within the valid 6-digit range', () => {
    const n = parseInt(generateOTP(), 10);
    expect(n).toBeGreaterThanOrEqual(100000);
    expect(n).toBeLessThanOrEqual(999999);
  });

  it('produces different codes across multiple calls', () => {
    const codes = new Set(Array.from({ length: 20 }, generateOTP));
    // With 900,000 possible codes, 20 draws should almost certainly not all be identical
    expect(codes.size).toBeGreaterThan(1);
  });
});

describe('otpExpiresAt', () => {
  it('returns a Date', () => {
    expect(otpExpiresAt()).toBeInstanceOf(Date);
  });

  it('is approximately 10 minutes in the future', () => {
    const before = Date.now();
    const exp = otpExpiresAt().getTime();
    const after = Date.now();
    expect(exp).toBeGreaterThanOrEqual(before + 9.9 * 60 * 1000);
    expect(exp).toBeLessThanOrEqual(after + 10.1 * 60 * 1000);
  });
});
