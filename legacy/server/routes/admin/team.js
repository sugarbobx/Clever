const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../../db/database');
const { authMiddleware, superAdminOnly } = require('../../middleware/authMiddleware');

const router = express.Router();

router.get('/', authMiddleware, superAdminOnly, (req, res) => {
  const agents = db.prepare(`
    SELECT u.id, u.name, u.email, u.is_active, u.created_at,
      (SELECT COUNT(*) FROM requests r WHERE r.assigned_agent_id = u.id AND r.status NOT IN ('Delivered','Livré','Cancelled','Rejeté')) as active_requests,
      (SELECT COUNT(*) FROM requests r WHERE r.assigned_agent_id = u.id AND r.status IN ('Delivered','Livré')) as delivered_requests
    FROM users u WHERE u.role IN ('agent','admin') ORDER BY u.name
  `).all();
  res.json(agents);
});

router.post('/create-agent', authMiddleware, superAdminOnly, (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: true, message: 'Name, email, and password are required.' });
  }
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: true, message: 'An account with this email already exists.' });
  const password_hash = bcrypt.hashSync(password, 10);
  const result = db.prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)').run(name, email, password_hash, 'agent');
  res.status(201).json(db.prepare('SELECT id, name, email, role, is_active, created_at FROM users WHERE id = ?').get(result.lastInsertRowid));
});

router.patch('/:id/deactivate', authMiddleware, superAdminOnly, (req, res) => {
  const agent = db.prepare("SELECT id, is_active FROM users WHERE id = ? AND role IN ('agent','admin')").get(req.params.id);
  if (!agent) return res.status(404).json({ error: true, message: 'Agent not found.' });
  const newState = agent.is_active ? 0 : 1;
  db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(newState, agent.id);
  if (!newState) {
    db.prepare('UPDATE requests SET assigned_agent_id = NULL WHERE assigned_agent_id = ? AND status = ?').run(agent.id, 'Pending');
  }
  res.json({ is_active: !!newState });
});

module.exports = router;
