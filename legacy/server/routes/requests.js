const express = require('express');
const path = require('path');
const PDFDocument = require('pdfkit');
const db = require('../db/database');
const { authMiddleware, agentOnly, superAdminOnly, adminOnly, rootAdminOnly } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const { notifyStatusChange, notifyRequestSubmitted } = require('../services/email');
const { createNotification } = require('./notifications');

const router = express.Router();

function generateReference() {
  const year = new Date().getFullYear();
  db.prepare(`
    INSERT INTO request_counters (year, value) VALUES (?, 1)
    ON CONFLICT(year) DO UPDATE SET value = value + 1
  `).run(year);
  const { value } = db.prepare('SELECT value FROM request_counters WHERE year = ?').get(year);
  return `CLV-${year}-${String(value).padStart(4, '0')}`;
}

function slaDeadline() {
  const d = new Date();
  d.setHours(d.getHours() + 48);
  return d.toISOString();
}

function canAgentAccessRequest(user, request) {
  if (user.role === 'super_admin' || user.role === 'root_admin') return true;
  return request.assigned_agent_id === user.id || request.assigned_to === user.id;
}

// Create request
router.post('/', authMiddleware, upload.array('files'), (req, res) => {
  const { document_catalogue_id, payment_reference, full_name, date_of_birth, national_id_number, phone, address } = req.body;

  if (!document_catalogue_id) {
    return res.status(400).json({ error: true, message: 'document_catalogue_id is required.' });
  }
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: true, message: 'At least one document is required.' });
  }

  const doc = db.prepare('SELECT * FROM document_catalogue WHERE id = ? AND is_active = 1').get(document_catalogue_id);
  if (!doc) return res.status(404).json({ error: true, message: 'Document type not found.' });

  // Auto-assign via routing rules, with workload balancing
  const rule = db.prepare('SELECT * FROM request_routing_rules WHERE document_catalogue_id = ?').get(document_catalogue_id);
  let assignedAgentId = null;

  if (rule?.assigned_agent_id) {
    const agent = db.prepare("SELECT id, is_active FROM users WHERE id = ?").get(rule.assigned_agent_id);
    const load = db.prepare(
      "SELECT COUNT(*) as c FROM requests WHERE assigned_agent_id = ? AND status NOT IN ('Livré','Delivered','Rejeté','Cancelled')"
    ).get(rule.assigned_agent_id);
    // Use assigned agent if active and not overloaded (< 15 active requests)
    if (agent?.is_active && load.c < 15) assignedAgentId = rule.assigned_agent_id;
  }

  // Fall back to least-loaded active agent
  if (!assignedAgentId) {
    const leastLoaded = db.prepare(`
      SELECT u.id, COUNT(r.id) as load FROM users u
      LEFT JOIN requests r ON r.assigned_agent_id = u.id AND r.status NOT IN ('Livré','Delivered','Rejeté','Cancelled')
      WHERE u.role IN ('agent','admin') AND u.is_active = 1
      GROUP BY u.id ORDER BY load ASC LIMIT 1
    `).get();
    assignedAgentId = leastLoaded?.id || null;
  }

  // Final fallback: super_admin
  if (!assignedAgentId) {
    const sa = db.prepare("SELECT id FROM users WHERE role IN ('super_admin','root_admin') LIMIT 1").get();
    assignedAgentId = sa?.id || null;
  }

  // Fall back to the user's registered name if full_name not provided
  const clientUser = db.prepare('SELECT name FROM users WHERE id = ?').get(req.user.id);
  const effectiveFullName = full_name || clientUser?.name || 'Non renseigné';

  const reference_number = generateReference();
  const result = db.prepare(`
    INSERT INTO requests (reference_number, user_id, assigned_agent_id, document_type, document_catalogue_id,
      full_name, date_of_birth, national_id_number, phone, address, payment_status, payment_reference, sla_deadline)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(reference_number, req.user.id, assignedAgentId, doc.label, document_catalogue_id,
    effectiveFullName, date_of_birth || null, national_id_number || null, phone || null, address || null,
    payment_reference ? 'paid' : 'unpaid', payment_reference || null, slaDeadline());

  const requestId = result.lastInsertRowid;
  const insertFile = db.prepare(
    'INSERT INTO request_files (request_id, file_type, original_name, stored_name, mime_type, size) VALUES (?, ?, ?, ?, ?, ?)'
  );
  for (const file of req.files) {
    insertFile.run(requestId, 'client_upload', file.originalname, file.filename, file.mimetype, file.size);
  }

  // Notifications + email
  createNotification(req.user.id, requestId, 'Demande soumise', `Votre demande ${reference_number} a été soumise. Délai de traitement: 48h.`);
  if (assignedAgentId) {
    createNotification(assignedAgentId, requestId, 'Nouvelle assignation', `Une nouvelle demande ${reference_number} vous a été assignée.`);
  }
  const client = db.prepare('SELECT email, name FROM users WHERE id = ?').get(req.user.id);
  if (client) notifyRequestSubmitted(client.email, client.name, reference_number);

  res.status(201).json({ reference_number, id: requestId });
});

// Export as CSV (super_admin)
router.get('/export', authMiddleware, superAdminOnly, (req, res) => {
  const rows = db.prepare(`
    SELECT r.reference_number, u.name as client_name, u.email as client_email,
           r.document_type, r.status, r.priority, r.sla_deadline,
           r.payment_status, r.payment_reference,
           a.name as assigned_to, r.created_at
    FROM requests r
    JOIN users u ON r.user_id = u.id
    LEFT JOIN users a ON r.assigned_agent_id = a.id
    ORDER BY r.created_at DESC
  `).all();

  const headers = ['Reference','Client','Email','Document','Status','Priority','SLA','Payment','Payment Ref','Assigned To','Submitted'];
  const escape = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [headers.join(','), ...rows.map(r => [
    r.reference_number, r.client_name, r.client_email, r.document_type,
    r.status, r.priority||'Normal', r.sla_deadline||'', r.payment_status,
    r.payment_reference||'', r.assigned_to||'', r.created_at,
  ].map(escape).join(','))].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="requests-${Date.now()}.csv"`);
  res.send(csv);
});

// List requests
router.get('/', authMiddleware, (req, res) => {
  const isSuperAdmin = req.user.role === 'super_admin' || req.user.role === 'root_admin';
  const isAgent = req.user.role === 'agent' || req.user.role === 'admin';

  let rows;
  if (isSuperAdmin) {
    rows = db.prepare(`
      SELECT r.*, u.name as client_name, u.email as client_email, u.account_type as client_account_type,
             a.name as assigned_agent_name
      FROM requests r JOIN users u ON r.user_id = u.id
      LEFT JOIN users a ON r.assigned_agent_id = a.id
      ORDER BY r.created_at DESC
    `).all();
  } else if (isAgent) {
    const tab = req.query.tab; // 'assigned' | 'unassigned'
    if (tab === 'unassigned') {
      rows = db.prepare(`
        SELECT r.*, u.name as client_name, u.account_type as client_account_type
        FROM requests r JOIN users u ON r.user_id = u.id
        WHERE r.assigned_agent_id IS NULL AND r.status NOT IN ('Delivered','Livré','Cancelled','Rejeté')
        ORDER BY r.created_at ASC
      `).all();
    } else {
      rows = db.prepare(`
        SELECT r.*, u.name as client_name, u.email as client_email, u.account_type as client_account_type
        FROM requests r JOIN users u ON r.user_id = u.id
        WHERE r.assigned_agent_id = ?
        ORDER BY r.created_at DESC
      `).all(req.user.id);
    }
  } else {
    rows = db.prepare(`
      SELECT r.*, a.name as assigned_agent_name
      FROM requests r LEFT JOIN users a ON r.assigned_agent_id = a.id
      WHERE r.user_id = ?
      ORDER BY r.created_at DESC
    `).all(req.user.id);
  }
  res.json(rows);
});

// Get single request
router.get('/:id', authMiddleware, (req, res) => {
  const request = db.prepare(`
    SELECT r.*, u.name as client_name, u.email as client_email, u.phone as client_phone,
           u.account_type as client_account_type,
           a.name as assigned_agent_name, a.email as assigned_agent_email,
           dc.label as catalogue_label, dc.description as catalogue_description,
           dc.required_uploads, dc.price_xaf
    FROM requests r
    JOIN users u ON r.user_id = u.id
    LEFT JOIN users a ON r.assigned_agent_id = a.id
    LEFT JOIN document_catalogue dc ON r.document_catalogue_id = dc.id
    WHERE r.id = ?
  `).get(req.params.id);

  if (!request) return res.status(404).json({ error: true, message: 'Request not found.' });

  if (req.user.role === 'client' && request.user_id !== req.user.id) {
    return res.status(403).json({ error: true, message: 'Access denied.' });
  }
  const isAgent = req.user.role === 'agent' || req.user.role === 'admin';
  if (isAgent && !canAgentAccessRequest(req.user, request)) {
    return res.status(403).json({ error: true, message: 'Access denied.' });
  }

  const files = db.prepare('SELECT * FROM request_files WHERE request_id = ?').all(req.params.id);
  const logs = db.prepare(`
    SELECT rl.*, u.name as changed_by_name FROM request_logs rl
    JOIN users u ON rl.changed_by = u.id
    WHERE rl.request_id = ? ORDER BY rl.created_at DESC
  `).all(req.params.id);

  // Company profile for A2 clients
  let company = null;
  if (request.client_account_type === 'entreprise') {
    company = db.prepare('SELECT * FROM company_profiles WHERE user_id = ?').get(request.user_id);
  }

  res.json({ ...request, files, logs, company });
});

// Update status
router.patch('/:id/status', authMiddleware, agentOnly, (req, res) => {
  const { status } = req.body;
  const allowed = ['Pending', 'En cours', 'Livré', 'Rejeté', 'In Progress', 'Delivered', 'Cancelled'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: true, message: 'Invalid status value.' });
  }
  const request = db.prepare('SELECT * FROM requests WHERE id = ?').get(req.params.id);
  if (!request) return res.status(404).json({ error: true, message: 'Request not found.' });
  if (!canAgentAccessRequest(req.user, request)) {
    return res.status(403).json({ error: true, message: 'Access denied.' });
  }

  const oldStatus = request.status;
  db.prepare('UPDATE requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, req.params.id);
  db.prepare('INSERT INTO request_logs (request_id, changed_by, old_status, new_status) VALUES (?, ?, ?, ?)')
    .run(req.params.id, req.user.id, oldStatus, status);

  createNotification(request.user_id, request.id, 'Statut mis à jour', `Votre demande ${request.reference_number} est maintenant: ${status}.`);
  const clientUser = db.prepare('SELECT email, name FROM users WHERE id = ?').get(request.user_id);
  if (clientUser) notifyStatusChange(clientUser.email, clientUser.name, request.reference_number, status);
  res.json({ message: 'Status updated.' });
});

// Agent self-assign
router.patch('/:id/assign-me', authMiddleware, agentOnly, (req, res) => {
  const request = db.prepare('SELECT * FROM requests WHERE id = ?').get(req.params.id);
  if (!request) return res.status(404).json({ error: true, message: 'Request not found.' });
  if (request.assigned_agent_id) {
    return res.status(400).json({ error: true, message: 'Request is already assigned.' });
  }
  db.prepare('UPDATE requests SET assigned_agent_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.user.id, req.params.id);
  createNotification(request.user_id, request.id, 'Demande prise en charge', `Votre demande ${request.reference_number} a été prise en charge par un agent.`);
  res.json({ message: 'Request assigned to you.' });
});

// Reassign (super_admin)
router.patch('/:id/assign', authMiddleware, superAdminOnly, (req, res) => {
  const { agent_id } = req.body;
  db.prepare('UPDATE requests SET assigned_agent_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(agent_id || null, req.params.id);
  res.json({ message: 'Request reassigned.' });
});

// Agent note
router.patch('/:id/agent-note', authMiddleware, agentOnly, (req, res) => {
  const { note } = req.body;
  const request = db.prepare('SELECT * FROM requests WHERE id = ?').get(req.params.id);
  if (!request) return res.status(404).json({ error: true, message: 'Request not found.' });
  if (!canAgentAccessRequest(req.user, request)) return res.status(403).json({ error: true, message: 'Access denied.' });
  // Strip HTML tags to prevent stored XSS
  const sanitized = note ? String(note).replace(/<[^>]*>/g, '').trim() : null;
  db.prepare('UPDATE requests SET agent_note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(sanitized, req.params.id);
  res.json({ message: 'Note saved.' });
});

// Cancel (client only, Pending only)
router.patch('/:id/cancel', authMiddleware, (req, res) => {
  const request = db.prepare('SELECT * FROM requests WHERE id = ?').get(req.params.id);
  if (!request) return res.status(404).json({ error: true, message: 'Request not found.' });
  if (request.user_id !== req.user.id) return res.status(403).json({ error: true, message: 'Access denied.' });
  if (request.status !== 'Pending' && request.status !== 'En attente') {
    return res.status(400).json({ error: true, message: 'Only pending requests can be cancelled.' });
  }
  db.prepare('UPDATE requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('Cancelled', req.params.id);
  db.prepare('INSERT INTO request_logs (request_id, changed_by, old_status, new_status) VALUES (?, ?, ?, ?)')
    .run(req.params.id, req.user.id, 'Pending', 'Cancelled');
  res.json({ message: 'Request cancelled.' });
});

// Set priority
router.patch('/:id/priority', authMiddleware, agentOnly, (req, res) => {
  const { priority } = req.body;
  if (!['Normal', 'Urgent'].includes(priority)) {
    return res.status(400).json({ error: true, message: 'Priority must be Normal or Urgent.' });
  }
  db.prepare('UPDATE requests SET priority = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(priority, req.params.id);
  res.json({ priority });
});

// Upload deliverable
router.post('/:id/deliverable', authMiddleware, agentOnly, upload.single('deliverable'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: true, message: 'A file is required.' });
  const request = db.prepare('SELECT * FROM requests WHERE id = ?').get(req.params.id);
  if (!request) return res.status(404).json({ error: true, message: 'Request not found.' });
  if (!canAgentAccessRequest(req.user, request)) return res.status(403).json({ error: true, message: 'Access denied.' });

  db.prepare('INSERT INTO request_files (request_id, file_type, original_name, stored_name, mime_type, size) VALUES (?,?,?,?,?,?)')
    .run(req.params.id, 'deliverable', req.file.originalname, req.file.filename, req.file.mimetype, req.file.size);

  const oldStatus = request.status;
  db.prepare('UPDATE requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('Livré', req.params.id);
  db.prepare('INSERT INTO request_logs (request_id, changed_by, old_status, new_status) VALUES (?, ?, ?, ?)')
    .run(req.params.id, req.user.id, oldStatus, 'Livré');

  createNotification(request.user_id, request.id, 'Document prêt', `Votre document ${request.reference_number} est prêt. Téléchargez-le maintenant.`);
  res.json({ message: 'Deliverable uploaded.' });
});

// Bulk status update (super_admin)
router.patch('/bulk-status', authMiddleware, superAdminOnly, (req, res) => {
  const { ids, status } = req.body;
  const allowed = ['Pending', 'En cours', 'Livré', 'Rejeté', 'Cancelled'];
  if (!allowed.includes(status) || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: true, message: 'Invalid request.' });
  }
  const stmt = db.prepare('UPDATE requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
  for (const id of ids) stmt.run(status, id);
  res.json({ updated: ids.length });
});

// Generate PDF invoice
router.get('/:id/invoice', authMiddleware, (req, res) => {
  const request = db.prepare(`
    SELECT r.*, u.name as client_name, u.email as client_email, u.phone as client_phone,
           dc.price_xaf, dc.label as service_label
    FROM requests r
    JOIN users u ON r.user_id = u.id
    LEFT JOIN document_catalogue dc ON r.document_catalogue_id = dc.id
    WHERE r.id = ?
  `).get(req.params.id);

  if (!request) return res.status(404).json({ error: true, message: 'Request not found.' });
  if (req.user.role === 'client' && request.user_id !== req.user.id) {
    return res.status(403).json({ error: true, message: 'Access denied.' });
  }
  if (request.payment_status !== 'paid') {
    return res.status(400).json({ error: true, message: 'No paid invoice for this request.' });
  }

  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="facture-${request.reference_number}.pdf"`);
  doc.pipe(res);

  const GREEN = '#1A3C34';
  const GOLD = '#C9A03A';
  const GRAY = '#666666';

  // Header band
  doc.rect(0, 0, doc.page.width, 100).fill(GREEN);
  doc.fillColor('white').fontSize(22).font('Helvetica-Bold')
    .text('THE CLEVEREST S.A.R.L', 50, 30);
  doc.fontSize(10).font('Helvetica')
    .text('Consulting Fiscal & Comptable · Yaoundé, Cameroun', 50, 58);
  doc.fontSize(14).font('Helvetica-Bold')
    .text('FACTURE', doc.page.width - 130, 38, { width: 80, align: 'right' });

  doc.fillColor(GREEN).fontSize(13).font('Helvetica-Bold')
    .text('Détails de la facture', 50, 125);
  doc.moveTo(50, 143).lineTo(doc.page.width - 50, 143).strokeColor(GOLD).lineWidth(1.5).stroke();

  doc.fillColor('#333').fontSize(10).font('Helvetica');
  const info = [
    ['Référence', request.reference_number],
    ['Date', new Date(request.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })],
    ['Réf. paiement', request.payment_reference || '—'],
  ];
  let y = 155;
  info.forEach(([label, value]) => {
    doc.fillColor(GRAY).text(label, 50, y).fillColor('#111').text(value, 200, y);
    y += 20;
  });

  y += 15;
  doc.fillColor(GREEN).fontSize(13).font('Helvetica-Bold').text('Client', 50, y);
  doc.moveTo(50, y + 18).lineTo(doc.page.width - 50, y + 18).strokeColor(GOLD).lineWidth(1.5).stroke();
  y += 30;
  doc.fillColor('#333').fontSize(10).font('Helvetica');
  [['Nom', request.client_name], ['Email', request.client_email], ['Téléphone', request.client_phone || '—']].forEach(([l, v]) => {
    doc.fillColor(GRAY).text(l, 50, y).fillColor('#111').text(v || '—', 200, y);
    y += 20;
  });

  y += 20;
  doc.rect(50, y, doc.page.width - 100, 36).fill('#F7F6F2');
  doc.fillColor(GREEN).fontSize(10).font('Helvetica-Bold')
    .text('Service', 60, y + 12)
    .text('Montant (XAF)', doc.page.width - 200, y + 12, { width: 140, align: 'right' });
  y += 36;
  doc.rect(50, y, doc.page.width - 100, 36).fill('white').stroke('#E5E7EB');
  doc.fillColor('#111').fontSize(10).font('Helvetica')
    .text(request.service_label || request.document_type, 60, y + 12)
    .font('Helvetica-Bold')
    .text((request.price_xaf || 0).toLocaleString('fr-FR'), doc.page.width - 200, y + 12, { width: 140, align: 'right' });

  y += 50;
  doc.rect(doc.page.width - 200, y, 150, 36).fill(GREEN);
  doc.fillColor('white').fontSize(11).font('Helvetica-Bold')
    .text('TOTAL PAYÉ', doc.page.width - 195, y + 11)
    .text(`${(request.price_xaf || 0).toLocaleString('fr-FR')} XAF`, doc.page.width - 195, y + 11, { width: 130, align: 'right' });

  doc.fillColor(GRAY).fontSize(8).font('Helvetica')
    .text('Merci de votre confiance. Pour toute question : contact@thecleverest.com', 50, doc.page.height - 60, { align: 'center', width: doc.page.width - 100 });

  doc.end();
});

module.exports = router;
