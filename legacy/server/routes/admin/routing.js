const express = require('express');
const db = require('../../db/database');
const { authMiddleware, superAdminOnly } = require('../../middleware/authMiddleware');

const router = express.Router();

router.get('/', authMiddleware, superAdminOnly, (req, res) => {
  const docs = db.prepare('SELECT * FROM document_catalogue WHERE is_active = 1 ORDER BY available_for, id').all();
  const rules = db.prepare(`
    SELECT r.*, u.name as agent_name, u.email as agent_email
    FROM request_routing_rules r LEFT JOIN users u ON r.assigned_agent_id = u.id
  `).all();
  const ruleMap = {};
  rules.forEach(r => { ruleMap[r.document_catalogue_id] = r; });
  res.json(docs.map(d => ({ ...d, rule: ruleMap[d.id] || null })));
});

router.patch('/:document_catalogue_id', authMiddleware, superAdminOnly, (req, res) => {
  const { assigned_agent_id } = req.body;
  const docId = parseInt(req.params.document_catalogue_id);
  const existing = db.prepare('SELECT id FROM request_routing_rules WHERE document_catalogue_id = ?').get(docId);
  if (existing) {
    db.prepare('UPDATE request_routing_rules SET assigned_agent_id = ?, updated_at = CURRENT_TIMESTAMP WHERE document_catalogue_id = ?')
      .run(assigned_agent_id || null, docId);
  } else {
    db.prepare('INSERT INTO request_routing_rules (document_catalogue_id, assigned_agent_id) VALUES (?, ?)')
      .run(docId, assigned_agent_id || null);
  }
  res.json({ message: 'Routing rule saved.' });
});

module.exports = router;
