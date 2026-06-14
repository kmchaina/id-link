-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- BRANCHES
-- ============================================================
CREATE TABLE branches (
  id        SERIAL PRIMARY KEY,
  name      VARCHAR(200) NOT NULL,
  region    VARCHAR(100) NOT NULL,
  district  VARCHAR(100),
  contact_phone VARCHAR(20),
  active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- STAFF
-- ============================================================
CREATE TABLE staff (
  id            SERIAL PRIMARY KEY,
  branch_id     INTEGER REFERENCES branches(id),
  full_name     VARCHAR(200) NOT NULL,
  phone         VARCHAR(20) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          VARCHAR(20) NOT NULL DEFAULT 'clerk', -- clerk | admin
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- FOUND DOCUMENTS
-- ============================================================
CREATE TABLE found_documents (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_type         VARCHAR(20) NOT NULL,          -- NIDA | VOTER | LICENCE | PASSPORT | OTHER
  full_name        VARCHAR(200) NOT NULL,
  name_initial     VARCHAR(50) NOT NULL,          -- "Juma H." — shown publicly
  id_number_enc    TEXT NOT NULL,                 -- AES-256-GCM encrypted
  id_number_hash   TEXT NOT NULL,                 -- HMAC-SHA256 for claim matching
  id_number_masked VARCHAR(50) NOT NULL,          -- "1990********001"
  dob_enc          TEXT,                          -- AES-256-GCM encrypted, internal only
  region_found     VARCHAR(100) NOT NULL,
  branch_id        INTEGER NOT NULL REFERENCES branches(id),
  photo_url        TEXT,
  ocr_confidence   NUMERIC(5,2),
  status           VARCHAR(20) NOT NULL DEFAULT 'LOGGED',
  logged_by        INTEGER REFERENCES staff(id),
  finder_phone     VARCHAR(20),
  finder_reward_paid BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  collected_at     TIMESTAMPTZ,
  purge_after      TIMESTAMPTZ,

  CONSTRAINT doc_status CHECK (status IN ('LOGGED','VERIFIED','CLAIMED','COLLECTED','TRANSFERRED','EXPIRED'))
);

CREATE INDEX idx_docs_name_trgm   ON found_documents USING gin(full_name gin_trgm_ops);
CREATE INDEX idx_docs_name_fts    ON found_documents USING gin(to_tsvector('simple', full_name));
CREATE INDEX idx_docs_region      ON found_documents(region_found);
CREATE INDEX idx_docs_status      ON found_documents(status);
CREATE INDEX idx_docs_hash        ON found_documents(id_number_hash);
CREATE INDEX idx_docs_purge       ON found_documents(purge_after) WHERE purge_after IS NOT NULL;

-- ============================================================
-- CLAIMS
-- ============================================================
CREATE TABLE claims (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id     UUID NOT NULL REFERENCES found_documents(id),
  claimant_phone  VARCHAR(20) NOT NULL,
  delivery_requested BOOLEAN NOT NULL DEFAULT FALSE,
  otp_code        VARCHAR(6),
  otp_expires_at  TIMESTAMPTZ,
  otp_verified_at TIMESTAMPTZ,
  token_qr        TEXT,
  token_expires_at TIMESTAMPTZ,
  status          VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT claim_status CHECK (status IN ('PENDING','OTP_SENT','OTP_VERIFIED','PAID','COLLECTED','EXPIRED'))
);

-- ============================================================
-- PAYMENTS
-- ============================================================
CREATE TABLE payments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id     UUID REFERENCES claims(id),
  type         VARCHAR(20) NOT NULL,    -- RECOVERY | DELIVERY | ALERT
  amount_tzs   INTEGER NOT NULL,
  gateway_ref  TEXT,
  status       VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  CONSTRAINT payment_status CHECK (status IN ('PENDING','SUCCESS','FAILED'))
);

-- ============================================================
-- ALERT SUBSCRIPTIONS
-- ============================================================
CREATE TABLE alert_subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone           VARCHAR(20) NOT NULL,
  id_number_hash  TEXT NOT NULL,
  payment_id      UUID REFERENCES payments(id),
  notified_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alerts_hash ON alert_subscriptions(id_number_hash);

-- ============================================================
-- FINDER REWARDS
-- ============================================================
CREATE TABLE finder_rewards (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id  UUID REFERENCES found_documents(id),
  phone        VARCHAR(20) NOT NULL,
  amount_tzs   INTEGER NOT NULL DEFAULT 2000,
  paid_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- AUDIT LOG (PDPA accountability)
-- ============================================================
CREATE TABLE audit_log (
  id          BIGSERIAL PRIMARY KEY,
  actor_id    INTEGER,
  actor_phone VARCHAR(20),
  action      VARCHAR(100) NOT NULL,
  entity      VARCHAR(50),
  entity_id   TEXT,
  details     JSONB,
  at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_at ON audit_log(at);
