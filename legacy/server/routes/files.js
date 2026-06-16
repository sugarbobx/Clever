const express = require('express');
const path = require('path');
const fs = require('fs');
const db = require('../db/database');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/:id', authMiddleware, (req, res) => {
  const file = db.prepare('SELECT * FROM request_files WHERE id = ?').get(req.params.id);
  if (!file) {
    return res.status(404).json({ error: true, message: 'File not found.' });
  }

  const request = db.prepare('SELECT user_id FROM requests WHERE id = ?').get(file.request_id);
  if (!request) {
    return res.status(404).json({ error: true, message: 'Associated request not found.' });
  }

  const isStaff = ['agent', 'admin', 'super_admin', 'root_admin'].includes(req.user.role);
  if (!isStaff && request.user_id !== req.user.id) {
    return res.status(403).json({ error: true, message: 'Access denied.' });
  }

  const filePath = path.join(__dirname, '..', 'uploads', file.stored_name);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: true, message: 'File no longer exists on server.' });
  }

  res.setHeader('Content-Disposition', `attachment; filename="${file.original_name}"`);
  res.setHeader('Content-Type', file.mime_type);
  fs.createReadStream(filePath).pipe(res);
});

module.exports = router;
