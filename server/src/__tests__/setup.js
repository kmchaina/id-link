// Set all env vars before any module is loaded
process.env.NODE_ENV        = 'test';
process.env.ENCRYPTION_KEY  = 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'; // 64 hex chars
process.env.HMAC_KEY        = 'test-hmac-key-for-jest-do-not-use-in-production';
process.env.JWT_SECRET      = 'test-jwt-secret-for-jest';
process.env.JWT_EXPIRES_IN  = '1h';
process.env.DATABASE_URL    = 'postgres://test:test@localhost/test_not_used';
