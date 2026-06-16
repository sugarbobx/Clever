const express = require('express');
const db = require('../db/database');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/confirm', authMiddleware, (req, res) => {
  const { request_id, payment_reference } = req.body;

  if (!request_id || !payment_reference) {
    return res.status(400).json({ error: true, message: 'request_id and payment_reference are required.' });
  }

  const request = db.prepare('SELECT id, user_id FROM requests WHERE id = ?').get(request_id);
  if (!request) {
    return res.status(404).json({ error: true, message: 'Request not found.' });
  }
  if (request.user_id !== req.user.id) {
    return res.status(403).json({ error: true, message: 'Access denied.' });
  }

  db.prepare('UPDATE requests SET payment_status = ?, payment_reference = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run('paid', payment_reference, request_id);

  res.json({ message: 'Payment confirmed.' });
});

module.exports = router;
