const cron = require('node-cron');
const db = require('../db/database');
const { createNotification } = require('../routes/notifications');
const { notifySlaAlert } = require('./email');

function runSlaCheck() {
  const overdue = db.prepare(`
    SELECT r.id, r.reference_number, r.assigned_agent_id,
           u.name as agent_name, u.email as agent_email
    FROM requests r
    LEFT JOIN users u ON r.assigned_agent_id = u.id
    WHERE r.sla_deadline < DATETIME('now')
      AND r.status NOT IN ('Livré','Delivered','Rejeté','Cancelled')
      AND r.sla_notified = 0
  `).all();

  for (const req of overdue) {
    if (req.assigned_agent_id) {
      createNotification(
        req.assigned_agent_id, req.id,
        'SLA dépassé',
        `La demande ${req.reference_number} a dépassé son délai de traitement.`
      );
      if (req.agent_email) {
        notifySlaAlert(req.agent_email, req.agent_name, req.reference_number).catch(() => {});
      }
    }
  }

  if (overdue.length > 0) {
    const ids = overdue.map(r => r.id);
    db.prepare(`UPDATE requests SET sla_notified = 1 WHERE id IN (${ids.map(() => '?').join(',')})`).run(...ids);
    console.log(`[CRON] SLA check: ${overdue.length} demande(s) en retard notifiée(s).`);
  }
}

function startSlaCron() {
  // Run daily at 08:00
  cron.schedule('0 8 * * *', runSlaCheck);
  console.log('[CRON] SLA breach checker scheduled (daily 08:00).');
}

module.exports = { startSlaCron };
