const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const db = new DatabaseSync(path.join(__dirname, 'clever.db'));

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'client',
    account_type TEXT DEFAULT 'particulier',
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS company_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id),
    business_name TEXT NOT NULL,
    legal_form TEXT NOT NULL,
    rccm_number TEXT,
    niu_entreprise TEXT,
    sector TEXT,
    tax_regime TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS document_catalogue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    label TEXT NOT NULL,
    description TEXT,
    available_for TEXT NOT NULL DEFAULT 'both',
    price_xaf INTEGER NOT NULL DEFAULT 15000,
    required_uploads TEXT DEFAULT '[]',
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS request_routing_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_catalogue_id INTEGER NOT NULL REFERENCES document_catalogue(id),
    assigned_agent_id INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    request_id INTEGER REFERENCES requests(id),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reference_number TEXT UNIQUE NOT NULL,
    user_id INTEGER NOT NULL,
    assigned_to INTEGER,
    assigned_agent_id INTEGER,
    document_type TEXT NOT NULL,
    document_catalogue_id INTEGER,
    full_name TEXT NOT NULL,
    date_of_birth TEXT,
    national_id_number TEXT,
    phone TEXT,
    address TEXT,
    status TEXT DEFAULT 'Pending',
    payment_status TEXT DEFAULT 'unpaid',
    payment_reference TEXT,
    sla_deadline DATETIME,
    priority TEXT DEFAULT 'Normal',
    due_date TEXT,
    agent_note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id),
    FOREIGN KEY (assigned_agent_id) REFERENCES users(id),
    FOREIGN KEY (document_catalogue_id) REFERENCES document_catalogue(id)
  );

  CREATE TABLE IF NOT EXISTS request_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id INTEGER NOT NULL,
    file_type TEXT NOT NULL,
    original_name TEXT NOT NULL,
    stored_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES requests(id)
  );

  CREATE TABLE IF NOT EXISTS routing_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_type TEXT UNIQUE NOT NULL,
    assigned_to INTEGER NOT NULL,
    created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assigned_to) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS request_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id INTEGER NOT NULL,
    author_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES requests(id),
    FOREIGN KEY (author_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS request_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id INTEGER NOT NULL,
    changed_by INTEGER NOT NULL,
    old_status TEXT,
    new_status TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES requests(id),
    FOREIGN KEY (changed_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS request_counters (
    year INTEGER PRIMARY KEY,
    value INTEGER DEFAULT 0
  );
`);

// Migrations — safely add columns to existing tables
const usersInfo = db.prepare('PRAGMA table_info(users)').all();
if (!usersInfo.find(c => c.name === 'totp_secret')) {
  db.exec('ALTER TABLE users ADD COLUMN totp_secret TEXT');
}
if (!usersInfo.find(c => c.name === 'totp_enabled')) {
  db.exec('ALTER TABLE users ADD COLUMN totp_enabled INTEGER DEFAULT 0');
}
if (!usersInfo.find(c => c.name === 'is_active')) {
  db.exec('ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1');
}
if (!usersInfo.find(c => c.name === 'account_type')) {
  db.exec("ALTER TABLE users ADD COLUMN account_type TEXT DEFAULT 'particulier'");
}

const requestsInfo = db.prepare('PRAGMA table_info(requests)').all();
if (!requestsInfo.find(c => c.name === 'assigned_to')) {
  db.exec('ALTER TABLE requests ADD COLUMN assigned_to INTEGER REFERENCES users(id)');
}
if (!requestsInfo.find(c => c.name === 'assigned_agent_id')) {
  db.exec('ALTER TABLE requests ADD COLUMN assigned_agent_id INTEGER REFERENCES users(id)');
}
if (!requestsInfo.find(c => c.name === 'document_catalogue_id')) {
  db.exec('ALTER TABLE requests ADD COLUMN document_catalogue_id INTEGER REFERENCES document_catalogue(id)');
}
if (!requestsInfo.find(c => c.name === 'sla_deadline')) {
  db.exec('ALTER TABLE requests ADD COLUMN sla_deadline DATETIME');
}
if (!requestsInfo.find(c => c.name === 'priority')) {
  db.exec("ALTER TABLE requests ADD COLUMN priority TEXT DEFAULT 'Normal'");
}
if (!requestsInfo.find(c => c.name === 'due_date')) {
  db.exec('ALTER TABLE requests ADD COLUMN due_date TEXT');
}
if (!requestsInfo.find(c => c.name === 'agent_note')) {
  db.exec('ALTER TABLE requests ADD COLUMN agent_note TEXT');
}
if (!requestsInfo.find(c => c.name === 'date_of_birth')) {
  db.exec('ALTER TABLE requests ADD COLUMN date_of_birth TEXT');
}
if (!requestsInfo.find(c => c.name === 'national_id_number')) {
  db.exec('ALTER TABLE requests ADD COLUMN national_id_number TEXT');
}
if (!requestsInfo.find(c => c.name === 'sla_notified')) {
  db.exec('ALTER TABLE requests ADD COLUMN sla_notified INTEGER DEFAULT 0');
}

const notesInfo = db.prepare('PRAGMA table_info(request_notes)').all();
if (!notesInfo.find(c => c.name === 'visibility')) {
  db.exec("ALTER TABLE request_notes ADD COLUMN visibility TEXT DEFAULT 'internal'");
}

module.exports = db;
