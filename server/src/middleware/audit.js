const db = require('../db');

async function auditLog(actorId, actorPhone, action, entity, entityId, details = {}) {
  try {
    await db.query(
      `INSERT INTO audit_log (actor_id, actor_phone, action, entity, entity_id, details)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [actorId ?? null, actorPhone ?? null, action, entity ?? null, entityId ?? null, JSON.stringify(details)]
    );
  } catch (err) {
    console.error('Audit log failed:', err.message);
  }
}

module.exports = { auditLog };
