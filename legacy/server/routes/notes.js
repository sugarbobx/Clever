const express = require('express');
const db = require('../db/database');
const { authMiddleware, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router({ mergeParams: true });

router.get('/', authMiddleware, adminOnly, (req, res) => {
  const notes = db.prepare(`
    SELECT rn.*, u.name as author_name
    FROM request_notes rn
    JOIN users u ON rn.author_id = u.id
    WHERE rn.request_id = ?
    ORDER BY rn.created_at DESC
  `).all(req.params.requestId);
  res.json(notes);
});

router.post('/', authMiddleware, adminOnly, (req, res) => {
  const { content } = req.body;
  if (!content?.trim()) {
    return res.status(400).json({ error: true, message: 'Note content is required.' });
  }
  const result = db.prepare(
    'INSERT INTO request_notes (request_id, author_id, content) VALUES (?, ?, ?)'
  ).run(req.params.requestId, req.user.id, content.trim());

  const note = db.prepare(`
    SELECT rn.*, u.name as author_name
    FROM request_notes rn JOIN users u ON rn.author_id = u.id
    WHERE rn.id = ?
  `).get(result.lastInsertRowid);
  res.status(201).json(note);
});

module.exports = router;
