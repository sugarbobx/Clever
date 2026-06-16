const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const db = require('../db/database');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', (req, res) => {
  const { name, email, phone, password, account_type, company } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: true, message: 'Name, email, and password are required.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: true, message: 'Password must be at least 8 characters.' });
  }
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: true, message: 'An account with this email already exists.' });
  }
  const type = account_type === 'entreprise' ? 'entreprise' : 'particulier';
  const password_hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(
    'INSERT INTO users (name, email, phone, password_hash, role, account_type) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(name, email, phone || null, password_hash, 'client', type);

  if (type === 'entreprise' && company) {
    db.prepare(`
      INSERT INTO company_profiles (user_id, business_name, legal_form, rccm_number, niu_entreprise, sector, tax_regime)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(result.lastInsertRowid, company.business_name || '', company.legal_form || 'Autre',
      company.rccm_number || null, company.niu_entreprise || null,
      company.sector || null, company.tax_regime || null);
  }

  res.status(201).json({ message: 'Account created successfully.' });
});

router.post('/login', (req, res) => {
  const { email, password, totp_code } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: true, message: 'Email and password are required.' });
  }
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: true, message: 'Invalid email or password.' });
  }
  if (!user.is_active) {
    return res.status(403).json({ error: true, message: 'Your account has been deactivated. Contact the administrator.' });
  }

  // 2FA check — if enabled and no code provided, signal client to ask for it
  if (user.totp_enabled) {
    if (!totp_code) {
      return res.json({ two_factor_required: true });
    }
    const valid = speakeasy.totp.verify({
      secret: user.totp_secret, encoding: 'base32', token: totp_code, window: 1,
    });
    if (!valid) {
      return res.status(401).json({ error: true, message: 'Code 2FA invalide.' });
    }
  }

  // TODO: Replace single long-lived token with access token (15min) + refresh token (7d) pattern:
  //   const accessToken  = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
  //   const refreshToken = jwt.sign({ id: user.id }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
  //   res.cookie('refresh_token', refreshToken, { httpOnly: true, secure: true, sameSite: 'strict' });
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, account_type: user.account_type || 'particulier' },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
  res.json({ token, role: user.role, name: user.name, account_type: user.account_type || 'particulier' });
});

router.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare(
    'SELECT id, name, email, phone, role, account_type, totp_enabled, created_at FROM users WHERE id = ?'
  ).get(req.user.id);
  res.json(user);
});

router.patch('/me', authMiddleware, (req, res) => {
  const { name, phone } = req.body;
  if (!name) return res.status(400).json({ error: true, message: 'Name is required.' });
  db.prepare('UPDATE users SET name = ?, phone = ? WHERE id = ?').run(name, phone || null, req.user.id);
  res.json({ message: 'Profile updated.' });
});

router.patch('/profile', authMiddleware, (req, res) => {
  const { name, phone } = req.body;
  if (!name) return res.status(400).json({ error: true, message: 'Name is required.' });
  db.prepare('UPDATE users SET name = ?, phone = ? WHERE id = ?').run(name, phone || null, req.user.id);
  res.json({ message: 'Profile updated.' });
});

router.post('/change-password', authMiddleware, (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) {
    return res.status(400).json({ error: true, message: 'Current and new password are required.' });
  }
  if (new_password.length < 8) {
    return res.status(400).json({ error: true, message: 'New password must be at least 8 characters.' });
  }
  const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(current_password, user.password_hash)) {
    return res.status(401).json({ error: true, message: 'Current password is incorrect.' });
  }
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(new_password, 10), req.user.id);
  res.json({ message: 'Password changed successfully.' });
});

router.patch('/password', authMiddleware, (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) return res.status(400).json({ error: true, message: 'Current and new password are required.' });
  if (new_password.length < 8) return res.status(400).json({ error: true, message: 'New password must be at least 8 characters.' });
  const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(current_password, user.password_hash)) return res.status(401).json({ error: true, message: 'Current password is incorrect.' });
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(new_password, 10), req.user.id);
  res.json({ message: 'Password changed successfully.' });
});

// --- TOTP 2FA ---

// GET /api/auth/2fa/setup — generate secret + QR code (stores secret, not yet enabled)
router.get('/2fa/setup', authMiddleware, async (req, res) => {
  const secret = speakeasy.generateSecret({
    name: `Clever (${req.user.email})`,
    issuer: 'TheCleverest',
    length: 20,
  });
  db.prepare('UPDATE users SET totp_secret = ? WHERE id = ?').run(secret.base32, req.user.id);
  const qr = await qrcode.toDataURL(secret.otpauth_url);
  res.json({ secret: secret.base32, qr_code: qr });
});

// POST /api/auth/2fa/enable — verify code then activate
router.post('/2fa/enable', authMiddleware, (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: true, message: 'Code requis.' });
  const user = db.prepare('SELECT totp_secret FROM users WHERE id = ?').get(req.user.id);
  if (!user?.totp_secret) return res.status(400).json({ error: true, message: 'Lancez d\'abord la configuration.' });
  const valid = speakeasy.totp.verify({ secret: user.totp_secret, encoding: 'base32', token: code, window: 1 });
  if (!valid) return res.status(400).json({ error: true, message: 'Code invalide. Réessayez.' });
  db.prepare('UPDATE users SET totp_enabled = 1 WHERE id = ?').run(req.user.id);
  res.json({ message: '2FA activé avec succès.' });
});

// DELETE /api/auth/2fa/disable — disable 2FA
router.delete('/2fa/disable', authMiddleware, (req, res) => {
  db.prepare('UPDATE users SET totp_secret = NULL, totp_enabled = 0 WHERE id = ?').run(req.user.id);
  res.json({ message: '2FA désactivé.' });
});

// --- Company profile ---

router.get('/company-profile', authMiddleware, (req, res) => {
  const profile = db.prepare('SELECT * FROM company_profiles WHERE user_id = ?').get(req.user.id);
  if (!profile) return res.status(404).json({ error: true, message: 'No company profile found.' });
  res.json(profile);
});

router.patch('/company-profile', authMiddleware, (req, res) => {
  const { business_name, legal_form, rccm_number, niu_entreprise, sector, tax_regime } = req.body;
  if (!business_name || !legal_form) {
    return res.status(400).json({ error: true, message: 'Business name and legal form are required.' });
  }
  const existing = db.prepare('SELECT id FROM company_profiles WHERE user_id = ?').get(req.user.id);
  if (existing) {
    db.prepare(`UPDATE company_profiles SET business_name=?, legal_form=?, rccm_number=?, niu_entreprise=?, sector=?, tax_regime=? WHERE user_id=?`)
      .run(business_name, legal_form, rccm_number||null, niu_entreprise||null, sector||null, tax_regime||null, req.user.id);
  } else {
    db.prepare(`INSERT INTO company_profiles (user_id, business_name, legal_form, rccm_number, niu_entreprise, sector, tax_regime) VALUES (?,?,?,?,?,?,?)`)
      .run(req.user.id, business_name, legal_form, rccm_number||null, niu_entreprise||null, sector||null, tax_regime||null);
  }
  res.json({ message: 'Company profile updated.' });
});

module.exports = router;
