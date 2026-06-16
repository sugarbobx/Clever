const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db/database');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

// In-memory SSE clients map: userId -> Set<Response>
const sseClients = new Map();

function pushToUser(userId) {
  const conns = sseClients.get(userId);
  if (!conns?.size) return;
  try {
    const row = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0').get(userId);
    const payload = `data: ${JSON.stringify({ count: row.count })}\n\n`;
    conns.forEach(res => { try { res.write(payload); } catch {} });
  } catch {}
}

function createNotification(userId, requestId, title, message) {
  try {
    db.prepare('INSERT INTO notifications (user_id, request_id, title, message) VALUES (?, ?, ?, ?)')
      .run(userId, requestId || null, title, message);
    pushToUser(userId);
  } catch { /* non-critical */ }
}

// GET /api/notifications/stream — SSE (auth via query ?token=)
router.get('/stream', (req, res) => {
  let userId;
  try {
    const decoded = jwt.verify(req.query.token, process.env.JWT_SECRET);
    userId = decoded.id;
  } catch {
    return res.status(401).end();
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  if (!sseClients.has(userId)) sseClients.set(userId, new Set());
  sseClients.get(userId).add(res);

  // Send initial unread count immediately
  pushToUser(userId);

  // Keep-alive ping every 25s to prevent proxy timeout
  const ping = setInterval(() => { try { res.write(':ping\n\n'); } catch {} }, 25000);

  req.on('close', () => {
    clearInterval(ping);
    sseClients.get(userId)?.delete(res);
    if (sseClients.get(userId)?.size === 0) sseClients.delete(userId);
  });
});

// GET /api/notifications
router.get('/', authMiddleware, (req, res) => {
  const rows = db.prepare(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20'
  ).all(req.user.id);
  res.json(rows);
});

// GET /api/notifications/unread-count
router.get('/unread-count', authMiddleware, (req, res) => {
  const row = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0').get(req.user.id);
  res.json({ count: row.count });
});

// PATCH /api/notifications/read-all
router.patch('/read-all', authMiddleware, (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user.id);
  pushToUser(req.user.id);
  res.json({ message: 'All marked as read.' });
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', authMiddleware, (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  pushToUser(req.user.id);
  res.json({ message: 'Marked as read.' });
});

module.exports = router;
module.exports.createNotification = createNotification;
module.exports.pushToUser = pushToUser;
