require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const authRoutes      = require('./routes/auth');
const requestRoutes   = require('./routes/requests');
const fileRoutes      = require('./routes/files');
const employeeRoutes  = require('./routes/employees');
const notesRoutes     = require('./routes/notes');
const notifRoutes     = require('./routes/notifications');
const messagesRoutes  = require('./routes/messages');
const documentsRoutes = require('./routes/documents');
const catalogueRoutes = require('./routes/catalogue');
const adminCatalogue  = require('./routes/admin/catalogue');
const adminRouting    = require('./routes/admin/routing');
const adminTeam       = require('./routes/admin/team');
const adminAnalytics  = require('./routes/admin/analytics');

require('./db/database');
require('./db/seed');
const { startSlaCron } = require('./services/slaCron');

const app = express();

app.use(cors({ origin: /^http:\/\/localhost/, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: true, message: 'Trop de tentatives. Réessayez dans 15 minutes.' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// All auth + profile + company-profile endpoints live under /api/auth
app.use('/api/auth',             authRoutes);
app.use('/api/requests',         requestRoutes);
app.use('/api/files',            fileRoutes);
app.use('/api/employees',        employeeRoutes);
app.use('/api/requests/:requestId/notes', notesRoutes);
app.use('/api/notifications',    notifRoutes);
app.use('/api/requests/:requestId/messages', messagesRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/catalogue',        catalogueRoutes);
app.use('/api/admin/catalogue',  adminCatalogue);
app.use('/api/admin/routing',    adminRouting);
app.use('/api/admin/team',       adminTeam);
app.use('/api/admin/analytics',  adminAnalytics);

app.use((req, res) => res.status(404).json({ error: true, message: 'Route not found.' }));

app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: true, message: 'File exceeds 5MB limit.' });
  if (err.message?.includes('Only PDF')) return res.status(400).json({ error: true, message: err.message });
  console.error(err);
  res.status(500).json({ error: true, message: 'Internal server error.' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Clever server running on http://localhost:${PORT}`);
  startSlaCron();
});
