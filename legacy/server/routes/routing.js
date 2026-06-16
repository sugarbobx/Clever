const express = require('express');
const db = require('../db/database');
const { authMiddleware, rootAdminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authMiddleware, rootAdminOnly, (req, res) => {
  const rules = db.prepare(`
    SELECT rr.*, u.name as employee_name, u.email as employee_email
    FROM routing_rules rr
    JOIN users u ON rr.assigned_to = u.id
    ORDER BY rr.document_type
  `).all();
  res.json(rules);
});

// Upsert — one rule per document_type
router.put('/', authMiddleware, rootAdminOnly, (req, res) => {
  const { document_type, assigned_to } = req.body;
  if (!document_type || !assigned_to) {
    return res.status(400).json({ error: true, message: 'document_type and assigned_to are required.' });
  }
  const employee = db.prepare("SELECT id FROM users WHERE id = ? AND role IN ('admin','root_admin') AND is_active = 1").get(assigned_to);
  if (!employee) return res.status(404).json({ error: true, message: 'Active employee not found.' });

  db.prepare('DELETE FROM routing_rules WHERE document_type = ?').run(document_type);
  db.prepare('INSERT INTO routing_rules (document_type, assigned_to, created_by) VALUES (?, ?, ?)').run(document_type, assigned_to, req.user.id);
  res.json({ message: 'Routing rule saved.' });
});

router.delete('/:id', authMiddleware, rootAdminOnly, (req, res) => {
  db.prepare('DELETE FROM routing_rules WHERE id = ?').run(req.params.id);
  res.json({ message: 'Routing rule deleted.' });
});

module.exports = router;
