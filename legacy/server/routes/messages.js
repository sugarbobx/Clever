const express = require('express');
const db = require('../db/database');
const { authMiddleware } = require('../middleware/authMiddleware');
const { createNotification } = require('./notifications');

const router = express.Router({ mergeParams: true });

function canAccess(user, request) {
  if (user.role === 'client') return request.user_id === user.id;
  if (user.role === 'super_admin' || user.role === 'root_admin') return true;
  return request.assigned_agent_id === user.id || request.assigned_to === user.id;
}

router.get('/', authMiddleware, (req, res) => {
  const request = db.prepare('SELECT * FROM requests WHERE id = ?').get(req.params.requestId);
  if (!request) return res.status(404).json({ error: true, message: 'Request not found.' });
  if (!canAccess(req.user, request)) return res.status(403).json({ error: true, message: 'Access denied.' });

  const messages = db.prepare(`
    SELECT rn.id, rn.content, rn.created_at, rn.author_id,
           u.name as author_name, u.role as author_role
    FROM request_notes rn
    JOIN users u ON rn.author_id = u.id
    WHERE rn.request_id = ? AND rn.visibility = 'client'
    ORDER BY rn.created_at ASC
  `).all(req.params.requestId);
  res.json(messages);
});

router.post('/', authMiddleware, (req, res) => {
  const { content } = req.body;
  if (!content?.trim()) {
    return res.status(400).json({ error: true, message: 'Message content is required.' });
  }

  const request = db.prepare('SELECT * FROM requests WHERE id = ?').get(req.params.requestId);
  if (!request) return res.status(404).json({ error: true, message: 'Request not found.' });
  if (!canAccess(req.user, request)) return res.status(403).json({ error: true, message: 'Access denied.' });

  const sanitized = String(content).replace(/<[^>]*>/g, '').trim().slice(0, 2000);
  const result = db.prepare(
    "INSERT INTO request_notes (request_id, author_id, content, visibility) VALUES (?, ?, ?, 'client')"
  ).run(req.params.requestId, req.user.id, sanitized);

  const msg = db.prepare(`
    SELECT rn.id, rn.content, rn.created_at, rn.author_id,
           u.name as author_name, u.role as author_role
    FROM request_notes rn JOIN users u ON rn.author_id = u.id
    WHERE rn.id = ?
  `).get(result.lastInsertRowid);

  const isClient = req.user.role === 'client';
  if (isClient && request.assigned_agent_id) {
    createNotification(
      request.assigned_agent_id, request.id,
      'Nouveau message client',
      `Nouveau message sur la demande ${request.reference_number}.`
    );
  } else if (!isClient) {
    createNotification(
      request.user_id, request.id,
      'Message de votre agent',
      `Vous avez reçu un message sur votre demande ${request.reference_number}.`
    );
  }

  res.status(201).json(msg);
});

module.exports = router;
