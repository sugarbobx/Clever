const express = require('express');
const db = require('../../db/database');
const { authMiddleware, superAdminOnly } = require('../../middleware/authMiddleware');

const router = express.Router();

router.get('/', authMiddleware, superAdminOnly, (req, res) => {
  // Revenue this month
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const revenueThisMonth = db.prepare(
    "SELECT COALESCE(SUM(dc.price_xaf), 0) as total FROM requests r LEFT JOIN document_catalogue dc ON r.document_catalogue_id = dc.id WHERE r.payment_status = 'paid' AND r.created_at >= ?"
  ).get(monthStart);
  const requestsThisMonth = db.prepare("SELECT COUNT(*) as count FROM requests WHERE created_at >= ?").get(monthStart);

  // Delivery rate
  const totalDelivered = db.prepare("SELECT COUNT(*) as count FROM requests WHERE status IN ('Delivered','Livré')").get();
  const totalAll = db.prepare("SELECT COUNT(*) as count FROM requests").get();
  const deliveryRate = totalAll.count > 0 ? Math.round((totalDelivered.count / totalAll.count) * 100) : 0;

  // Most requested document
  const topDoc = db.prepare(
    "SELECT document_type, COUNT(*) as count FROM requests GROUP BY document_type ORDER BY count DESC LIMIT 1"
  ).get();

  // Revenue by month (last 6 months)
  const monthlyRevenue = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    const nextD = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const end = `${nextD.getFullYear()}-${String(nextD.getMonth() + 1).padStart(2, '0')}-01`;
    const row = db.prepare(
      "SELECT COALESCE(SUM(dc.price_xaf), 0) as revenue FROM requests r LEFT JOIN document_catalogue dc ON r.document_catalogue_id = dc.id WHERE r.payment_status = 'paid' AND r.created_at >= ? AND r.created_at < ?"
    ).get(start, end);
    monthlyRevenue.push({ month: start.slice(0, 7), revenue: row.revenue });
  }

  // Requests by document type
  const byDocType = db.prepare(
    "SELECT document_type, COUNT(*) as count FROM requests GROUP BY document_type ORDER BY count DESC LIMIT 8"
  ).all();

  // Top 5 clients
  const topClients = db.prepare(`
    SELECT u.name, u.email, COUNT(r.id) as request_count, COALESCE(SUM(dc.price_xaf),0) as total_revenue
    FROM requests r JOIN users u ON r.user_id = u.id
    LEFT JOIN document_catalogue dc ON r.document_catalogue_id = dc.id
    WHERE r.payment_status = 'paid'
    GROUP BY r.user_id ORDER BY total_revenue DESC LIMIT 5
  `).all();

  res.json({
    revenueThisMonth: revenueThisMonth.total,
    requestsThisMonth: requestsThisMonth.count,
    deliveryRate,
    topDocument: topDoc?.document_type || '—',
    monthlyRevenue,
    byDocType,
    topClients,
  });
});

module.exports = router;
