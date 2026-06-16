const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db/database');
const { authMiddleware, rootAdminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authMiddleware, rootAdminOnly, (req, res) => {
  const employees = db.prepare(`
    SELECT u.id, u.name, u.email, u.phone, u.role, u.is_active, u.created_at,
           COUNT(r.id) as active_requests
    FROM users u
    LEFT JOIN requests r ON r.assigned_to = u.id AND r.status NOT IN ('Delivered', 'Cancelled')
    WHERE u.role = 'admin'
    GROUP BY u.id
    ORDER BY u.name ASC
  `).all();
  res.json(employees);
});

router.post('/', authMiddleware, rootAdminOnly, (req, res) => {
  const { name, email, phone, password, role } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: true, message: 'Name, email, and password are required.' });
  }
  if (role && !['admin', 'root_admin'].includes(role)) {
    return res.status(400).json({ error: true, message: 'Invalid role.' });
  }
  const existing = db.prepare('SELECT id, role FROM users WHERE email = ?').get(email);
  if (existing) {
    const msg = existing.role === 'client'
      ? 'This email belongs to an existing client account. Use a different email.'
      : 'An employee account with this email already exists.';
    return res.status(409).json({ error: true, message: msg });
  }
  const password_hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(
    'INSERT INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)'
  ).run(name, email, phone || null, password_hash, role || 'admin');

  const employee = db.prepare(
    'SELECT id, name, email, phone, role, is_active, created_at FROM users WHERE id = ?'
  ).get(result.lastInsertRowid);
  res.status(201).json(employee);
});

router.patch('/:id/toggle', authMiddleware, rootAdminOnly, (req, res) => {
  const employee = db.prepare('SELECT id, is_active FROM users WHERE id = ? AND role IN (\'admin\',\'root_admin\')').get(req.params.id);
  if (!employee) return res.status(404).json({ error: true, message: 'Employee not found.' });
  if (employee.id === req.user.id) {
    return res.status(400).json({ error: true, message: 'You cannot deactivate your own account.' });
  }
  const newActive = employee.is_active ? 0 : 1;
  db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(newActive, req.params.id);
  res.json({ is_active: newActive });
});

router.delete('/:id', authMiddleware, rootAdminOnly, (req, res) => {
  const employee = db.prepare("SELECT id FROM users WHERE id = ? AND role = 'admin'").get(req.params.id);
  if (!employee) return res.status(404).json({ error: true, message: 'Employee not found.' });
  if (employee.id === req.user.id) {
    return res.status(400).json({ error: true, message: 'You cannot delete your own account.' });
  }
  db.prepare('UPDATE requests SET assigned_to = NULL WHERE assigned_to = ?').run(req.params.id);
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ message: 'Employee deleted.' });
});

router.patch('/:id/password', authMiddleware, rootAdminOnly, (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 8) {
    return res.status(400).json({ error: true, message: 'Password must be at least 8 characters.' });
  }
  const employee = db.prepare('SELECT id FROM users WHERE id = ? AND role IN (\'admin\',\'root_admin\')').get(req.params.id);
  if (!employee) return res.status(404).json({ error: true, message: 'Employee not found.' });

  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(password, 10), req.params.id);
  res.json({ message: 'Password reset successfully.' });
});

module.exports = router;
