const express = require('express');
const db = require('../db/database');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/catalogue — filtered by account_type (A1/A2/both)
router.get('/', authMiddleware, (req, res) => {
  const { account_type } = req.query;
  let filter = 'A1'; // default particulier
  if (account_type === 'A2' || account_type === 'entreprise') filter = 'A2';

  const rows = db.prepare(
    "SELECT * FROM document_catalogue WHERE (available_for = ? OR available_for = 'both') AND is_active = 1 ORDER BY id ASC"
  ).all(filter);
  res.json(rows);
});

module.exports = router;
