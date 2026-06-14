const db = require('../db');

const SIX_HOURS = 6 * 60 * 60 * 1000;

async function runPurge() {
  try {
    // Hard-delete collected/expired documents whose 6-month retention window has closed
    const result = await db.query(
      `DELETE FROM found_documents
       WHERE purge_after IS NOT NULL AND purge_after < NOW()
       RETURNING id`
    );
    if (result.rowCount > 0) {
      console.log(`[Purge] Deleted ${result.rowCount} expired document records (PDPA 6-month retention)`);
      await db.query(
        `INSERT INTO audit_log (action, entity, details) VALUES ($1, $2, $3)`,
        ['PURGE_RUN', 'found_documents', JSON.stringify({ deleted: result.rowCount })]
      );
    }

    // Expire claims that have never been completed after 24 hours
    const expiredClaims = await db.query(
      `UPDATE claims SET status = 'EXPIRED'
       WHERE status IN ('PENDING','OTP_SENT')
         AND created_at < NOW() - INTERVAL '24 hours'
       RETURNING id`
    );
    if (expiredClaims.rowCount > 0) {
      console.log(`[Purge] Expired ${expiredClaims.rowCount} stale claims`);
    }
  } catch (err) {
    console.error('[Purge] Job failed:', err.message);
  }
}

function startPurgeJob() {
  // Run once at startup, then every 6 hours
  runPurge();
  setInterval(runPurge, SIX_HOURS);
  console.log('[Purge] PDPA data purge job scheduled (every 6 hours)');
}

module.exports = { startPurgeJob };
