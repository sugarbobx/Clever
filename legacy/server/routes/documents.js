const express = require('express');
const db = require('../db/database');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/documents — all delivered files belonging to the current client
router.get('/', authMiddleware, (req, res) => {
  if (req.user.role !== 'client') {
    return res.status(403).json({ error: true, message: 'Client access only.' });
  }

  const rows = db.prepare(`
    SELECT
      rf.id          AS file_id,
      rf.original_name,
      rf.mime_type,
      rf.size,
      rf.uploaded_at AS delivered_at,
      r.id           AS request_id,
      r.reference_number,
      r.document_type
    FROM request_files rf
    JOIN requests r ON rf.request_id = r.id
    WHERE r.user_id = ?
      AND rf.file_type = 'deliverable'
      AND r.status IN ('Livré', 'Delivered')
    ORDER BY rf.uploaded_at DESC
  `).all(req.user.id);

  res.json(rows);
});

module.exports = router;
