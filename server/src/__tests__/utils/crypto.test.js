const { encrypt, decrypt, hashIdNumber, maskIdNumber, maskName } = require('../../utils/crypto');

describe('encrypt / decrypt', () => {
  it('roundtrips any plaintext', () => {
    const plain = '19901231-12345-00001-7';
    expect(decrypt(encrypt(plain))).toBe(plain);
  });

  it('produces different ciphertexts each time (unique IVs)', () => {
    const plain = 'same-input';
    expect(encrypt(plain)).not.toBe(encrypt(plain));
  });

  it('throws on a tampered auth tag', () => {
    const enc = encrypt('hello');
    const [iv, tag, body] = enc.split('.');
    const badTag = Buffer.from(Buffer.from(tag, 'base64').map(b => b ^ 0xff)).toString('base64');
    expect(() => decrypt([iv, badTag, body].join('.'))).toThrow();
  });

  it('throws on malformed ciphertext (wrong number of parts)', () => {
    expect(() => decrypt('only.two')).toThrow('Invalid ciphertext format');
  });
});

describe('hashIdNumber', () => {
  it('returns a 64-character lowercase hex string', () => {
    expect(hashIdNumber('ABC123')).toMatch(/^[a-f0-9]{64}$/);
  });

  it('is deterministic — same input always yields same hash', () => {
    const id = '19901231-12345-00001-7';
    expect(hashIdNumber(id)).toBe(hashIdNumber(id));
  });

  it('normalises to uppercase before hashing (case-insensitive)', () => {
    expect(hashIdNumber('abcdef')).toBe(hashIdNumber('ABCDEF'));
  });

  it('strips leading/trailing whitespace before hashing', () => {
    expect(hashIdNumber('  99X  ')).toBe(hashIdNumber('99X'));
  });

  it('produces distinct hashes for distinct IDs', () => {
    expect(hashIdNumber('ID-0001')).not.toBe(hashIdNumber('ID-0002'));
  });
});

describe('maskIdNumber', () => {
  it('shows first 4 and last 3 characters', () => {
    const result = maskIdNumber('12345678901234567890');
    expect(result.startsWith('1234')).toBe(true);
    expect(result.endsWith('890')).toBe(true);
  });

  it('masks the middle with asterisks', () => {
    const result = maskIdNumber('ABCDE12345XYZ');
    expect(result).toMatch(/^ABCD\*+XYZ$/);
  });

  it('masks everything for very short IDs', () => {
    expect(maskIdNumber('AB')).toBe('**');
  });

  it('preserves length (same total characters)', () => {
    const id = '1234567890ABC';
    expect(maskIdNumber(id)).toHaveLength(id.length);
  });
});

describe('maskName', () => {
  it('returns first name + initial of second name', () => {
    expect(maskName('Juma Hassan Mbeki')).toBe('Juma H.');
  });

  it('handles a two-word name', () => {
    expect(maskName('Ali Baba')).toBe('Ali B.');
  });

  it('returns the single word unchanged', () => {
    expect(maskName('Madonna')).toBe('Madonna');
  });

  it('trims and collapses extra spaces', () => {
    expect(maskName('  Juma   Hassan  ')).toBe('Juma H.');
  });
});
