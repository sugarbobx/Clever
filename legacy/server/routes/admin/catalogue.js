const express = require('express');
const db = require('../../db/database');
const { authMiddleware, superAdminOnly } = require('../../middleware/authMiddleware');

const router = express.Router();

router.get('/', authMiddleware, superAdminOnly, (req, res) => {
  const rows = db.prepare('SELECT * FROM document_catalogue ORDER BY available_for, id').all();
  res.json(rows);
});

router.post('/', authMiddleware, superAdminOnly, (req, res) => {
  const { code, label, description, available_for, price_xaf, required_uploads } = req.body;
  if (!code || !label || !available_for || !price_xaf) {
    return res.status(400).json({ error: true, message: 'code, label, available_for, price_xaf are required.' });
  }
  const result = db.prepare(
    'INSERT INTO document_catalogue (code, label, description, available_for, price_xaf, required_uploads) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(code, label, description || null, available_for, parseInt(price_xaf), JSON.stringify(required_uploads || []));
  res.status(201).json(db.prepare('SELECT * FROM document_catalogue WHERE id = ?').get(result.lastInsertRowid));
});

router.patch('/:id', authMiddleware, superAdminOnly, (req, res) => {
  const { label, description, available_for, price_xaf, required_uploads } = req.body;
  const doc = db.prepare('SELECT id FROM document_catalogue WHERE id = ?').get(req.params.id);
  if (!doc) return res.status(404).json({ error: true, message: 'Document not found.' });
  db.prepare(`
    UPDATE document_catalogue SET label=?, description=?, available_for=?, price_xaf=?, required_uploads=?
    WHERE id=?
  `).run(label, description||null, available_for, parseInt(price_xaf), JSON.stringify(required_uploads||[]), req.params.id);
  res.json(db.prepare('SELECT * FROM document_catalogue WHERE id = ?').get(req.params.id));
});

router.patch('/:id/toggle', authMiddleware, superAdminOnly, (req, res) => {
  const doc = db.prepare('SELECT id, is_active FROM document_catalogue WHERE id = ?').get(req.params.id);
  if (!doc) return res.status(404).json({ error: true, message: 'Document not found.' });
  db.prepare('UPDATE document_catalogue SET is_active = ? WHERE id = ?').run(doc.is_active ? 0 : 1, doc.id);
  res.json({ is_active: !doc.is_active });
});

module.exports = router;
