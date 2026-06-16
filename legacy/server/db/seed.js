const bcrypt = require('bcryptjs');
const db = require('./database');

function seed() {
  const superHash  = bcrypt.hashSync('SuperAdmin@1234', 10);
  const agentHash  = bcrypt.hashSync('Agent@1234',      10);
  const clientHash = bcrypt.hashSync('Client@1234',     10);

  // Core accounts (V2 roles)
  db.prepare('INSERT OR IGNORE INTO users (name, email, password_hash, role, account_type) VALUES (?, ?, ?, ?, ?)').run('Super Admin', 'superadmin@thecleverest.com', superHash, 'super_admin', 'particulier');
  db.prepare('INSERT OR IGNORE INTO users (name, email, password_hash, role, account_type) VALUES (?, ?, ?, ?, ?)').run('Agent TCC', 'agent@thecleverest.com', agentHash, 'agent', 'particulier');
  db.prepare('INSERT OR IGNORE INTO users (name, email, password_hash, role, account_type) VALUES (?, ?, ?, ?, ?)').run('Test Particulier', 'particulier@test.com', clientHash, 'client', 'particulier');
  db.prepare('INSERT OR IGNORE INTO users (name, email, password_hash, role, account_type) VALUES (?, ?, ?, ?, ?)').run('Test Entreprise', 'entreprise@test.com', clientHash, 'client', 'entreprise');

  const entrepriseUser = db.prepare("SELECT id FROM users WHERE email = 'entreprise@test.com'").get();
  if (entrepriseUser) {
    db.prepare('INSERT OR IGNORE INTO company_profiles (user_id, business_name, legal_form, rccm_number, sector, tax_regime) VALUES (?, ?, ?, ?, ?, ?)').run(entrepriseUser.id, 'Test Corp SARL', 'SARL', 'RC/YAO/2024/B/1234', 'Commerce', 'Réel Simplifié');
  }

  // Seed document catalogue (INSERT OR IGNORE by code)
  const docs = [
    // A1 — Particulier
    { code: 'NIU_PARTICULIER', label: 'NIU — Immatriculation Fiscale (Particulier)', description: "Obtention de votre Numéro d'Identifiant Unique fiscal.", available_for: 'A1', price_xaf: 15000, required_uploads: JSON.stringify(['CNI recto', 'CNI verso', 'Justificatif de domicile']) },
    { code: 'ACF_PARTICULIER', label: 'Attestation de Conformité Fiscale (Particulier)', description: 'Attestation prouvant votre conformité fiscale personnelle.', available_for: 'A1', price_xaf: 20000, required_uploads: JSON.stringify(['CNI', 'NIU', 'Quittances de paiement']) },
    { code: 'IRPP', label: 'Déclaration IRPP', description: "Déclaration de l'Impôt sur le Revenu des Personnes Physiques.", available_for: 'A1', price_xaf: 25000, required_uploads: JSON.stringify(['CNI', 'NIU', 'Justificatifs de revenus']) },
    // A2 — Entreprise
    { code: 'NIU_ENTREPRISE', label: 'NIU — Immatriculation Fiscale (Entreprise)', description: "Obtention du NIU pour votre structure.", available_for: 'A2', price_xaf: 25000, required_uploads: JSON.stringify(['RCCM', 'Statuts de la société', 'CNI du gérant', 'Justificatif de siège social']) },
    { code: 'ACF_ENTREPRISE', label: 'Attestation de Conformité Fiscale (Entreprise)', description: 'Attestation de conformité fiscale pour votre entreprise.', available_for: 'A2', price_xaf: 35000, required_uploads: JSON.stringify(['NIU entreprise', 'Quittances TVA', 'Quittances IS', 'DSF signée']) },
    { code: 'TVA', label: 'Déclaration TVA Mensuelle', description: 'Déclaration mensuelle de la Taxe sur la Valeur Ajoutée.', available_for: 'A2', price_xaf: 30000, required_uploads: JSON.stringify(['NIU', 'Livre de ventes', "Livre d'achats", 'Relevé bancaire du mois']) },
    { code: 'IS_ACOMPTE', label: 'Acompte IS (Impôt sur les Sociétés)', description: "Versement d'acompte de l'impôt sur les sociétés.", available_for: 'A2', price_xaf: 30000, required_uploads: JSON.stringify(['NIU', 'CA du trimestre', 'Quittances précédentes']) },
    { code: 'DSF', label: 'Déclaration Statistique et Fiscale (DSF)', description: 'Déclaration annuelle obligatoire pour toutes les entreprises.', available_for: 'A2', price_xaf: 75000, required_uploads: JSON.stringify(['NIU', 'Bilan comptable', 'Compte de résultat', 'TAFIRE', 'Grand livre', 'Balance des comptes', 'DSF année précédente']) },
    { code: 'PATENTE', label: 'Contribution des Patentes', description: 'Paiement de la taxe professionnelle annuelle.', available_for: 'A2', price_xaf: 20000, required_uploads: JSON.stringify(['NIU', 'RCCM', "CA de l'exercice"]) },
    { code: 'RS', label: 'Retenues à la Source (RS)', description: 'Déclaration et paiement des retenues à la source sur salaires.', available_for: 'A2', price_xaf: 20000, required_uploads: JSON.stringify(['NIU', 'Livre de paie ou contrats', 'Relevé des paiements']) },
  ];

  const insertDoc = db.prepare('INSERT OR IGNORE INTO document_catalogue (code, label, description, available_for, price_xaf, required_uploads) VALUES (?, ?, ?, ?, ?, ?)');
  for (const d of docs) {
    insertDoc.run(d.code, d.label, d.description, d.available_for, d.price_xaf, d.required_uploads);
  }

  console.log('Seed complete.');
}

seed();
