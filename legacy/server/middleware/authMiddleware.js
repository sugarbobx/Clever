const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: true, message: 'Authentication required.' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.id, email: payload.email, role: payload.role, account_type: payload.account_type };
    next();
  } catch {
    return res.status(401).json({ error: true, message: 'Invalid or expired token.' });
  }
}

// agent OR super_admin (also accepts legacy 'admin' and 'root_admin')
function agentOnly(req, res, next) {
  const allowed = ['agent', 'super_admin', 'admin', 'root_admin'];
  if (!allowed.includes(req.user?.role)) {
    return res.status(403).json({ error: true, message: 'Access denied.' });
  }
  next();
}

// super_admin only (also accepts legacy 'root_admin')
function superAdminOnly(req, res, next) {
  if (req.user?.role !== 'super_admin' && req.user?.role !== 'root_admin') {
    return res.status(403).json({ error: true, message: 'Access denied. Super admin only.' });
  }
  next();
}

// Legacy aliases
const adminOnly = agentOnly;
const rootAdminOnly = superAdminOnly;

module.exports = { authMiddleware, agentOnly, superAdminOnly, adminOnly, rootAdminOnly };
