# CLEVER — Instructions Claude Code (Root)
## Comprehensive Ledger Efficiency & Validation Engine Ecosystem for Reconciliations
### Cabinet THECLEVEREST Consulting (TCCS) — Yaoundé, Cameroun

---

## 1. VISION PRODUIT

CLEVER est une plateforme de gestion d'entreprise augmentée par l'IA, spécialisée SYSCOHADA, couvrant 9 domaines :
1. Comptabilité (SYSCOHADA + QuickBooks)
2. Fiscalité (CGI + DGI + OHADA)
3. Fournisseurs & contrats
4. Trésorerie & cash flow prévisionnel
5. Paie & RH (CNPS)
6. Conformité légale OHADA
7. Projets & facturation
8. Tableaux de bord dirigeant (KPIs)
9. Classification IA des documents

**Canal d'upload actuel** : portail web uniquement (WhatsApp prévu phase 2).
**Moat technique** : SYSCOHADA + CGI (CM/CI/GA) + DGI.cm + 9 Actes Uniformes OHADA.

---

## 2. STACK TECHNIQUE

```
Frontend  : Next.js 14 App Router + Tailwind CSS
Backend   : Node.js + Express (API REST + SSE)
ORM       : Prisma
DB        : PostgreSQL + pgvector (RAG juridique)
Queue     : Redis + Bull (jobs OCR async)
IA        : Anthropic API — claude-haiku-4-5 (OCR + fiscal)
Intég.    : QuickBooks Online (OAuth Intuit)
Infra     : 1 VPS + 1 domaine + Docker + Nginx
```

---

## 3. LES 6 RÔLES UTILISATEURS (RBAC)

| Rôle | Accès par défaut | Permissions déléguées possibles |
|---|---|---|
| `MANAGER_N2` | Accès total, audit, objectifs, permissions | — |
| `HR` | Paie, RH, NDF, évaluation stagiaires | — |
| `EMPLOYEE` | Validation docs, dossiers clients, messagerie | `CAN_ASSIGN_TRAINEE`, `CAN_EXPORT_DATA`, `CAN_VIEW_ALL_CLIENTS` |
| `TRAINEE` | Brouillon uniquement, tâches assignées auto | Aucune par défaut |
| `CLIENT_INDIVIDUAL` | Dashboard Fiscalité + Comptabilité perso | — |
| `CLIENT_COMPANY` | Portail entreprise (5 sections) | Multi-utilisateurs |

**Règle Trainee** :
- Toute action crée une entrée `status: DRAFT`, `created_by_role: TRAINEE`
- Aucun push vers QBO sans approbation EMPLOYEE
- Tâches répétitives assignées automatiquement (OCR confiance < 0.70, rapprochements bancaires, NDF récurrentes)

**Règle permissions déléguées** :
- Le MANAGER octroie des capacités nommées individuellement (`CAN_ASSIGN_TRAINEE`, etc.)
- Stockées dans table `UserPermission` liée à chaque utilisateur
- Ne changent pas le rôle, étendent le périmètre

---

## 4. PIPELINE DOCUMENTAIRE (Couche 2)

### Flux complet
```
1. Client uploade fichier → POST /api/documents (multipart/form-data)
2. Validation type (PDF/JPG/PNG, max 10Mo)
3. Job poussé dans Redis/Bull queue
4. Worker → Anthropic API (Claude Haiku) → OCR + Classification + Analyse fiscale
5. Retour JSON structuré → DB (status: DRAFT si Trainee, PENDING_VALIDATION sinon)
6. SSE notifie la file de validation en temps réel
7. EMPLOYEE approuve / modifie / rejette (motif obligatoire si rejet)
8. À l'approbation → push QBO + entrée audit trail immuable
```

### JSON retourné par le cerveau
```json
{
  "vendor": "TOTAL Cameroun SA",
  "amount": 37985,
  "currency": "XAF",
  "date": "2024-06-10",
  "description": "Carburant véhicule",
  "categorie": "FACTURE_FOURNISSEUR",
  "syscohada_debit": "6064",
  "syscohada_credit": "4011",
  "syscohada_tva": "4451",
  "tva_amount": 7312,
  "tva_rate": 0.1925,
  "confidence": 0.91,
  "needs_review": false,
  "obligations_fiscales": {
    "tva_deductible": 7312,
    "retenue_source": null,
    "base_legale": "CGI Cameroun Art.149 al.1 — taux normal 19,25%"
  },
  "alertes_echeances": [
    {
      "type": "declaration_tva",
      "echeance": "2024-07-15",
      "description": "TVA de juin à déclarer avant le 15 du mois suivant",
      "base_legale": "CGI Cameroun Art.155"
    }
  ],
  "verdict_conformite": {
    "statut": "CONFORME",
    "observations": ["Mentions légales présentes", "Taux TVA correct"],
    "anomalies": [],
    "base_legale_verifiee": "CGI Cameroun Art.239"
  }
}
```

### Catégories documentaires
`FACTURE_FOURNISSEUR` | `FACTURE_CLIENT` | `NDF` | `RELEVE_BANCAIRE` | `BULLETIN_PAIE` | `DECLARATION_FISCALE` | `CONTRAT` | `RECU_CAISSE` | `JUSTIFICATIF_DOUANE`

### Règle de rejet
- L'EMPLOYEE doit sélectionner ≥ 1 motif parmi : `Document illisible`, `Montant incohérent`, `Date manquante`, `TVA incorrecte`, `Document incomplet`, `Doublon détecté`, `Fournisseur non reconnu`, `Hors périmètre client`
- Une note complémentaire optionnelle peut être ajoutée
- Sans motif → rejet bloqué côté client

---

## 5. LE CERVEAU — ARCHITECTURE RAG HYBRIDE

### Couche 1 — Prompt système (zéro latence)
Règles encodées directement, mises à jour une fois/an :
- SYSCOHADA classes 1–9 (50 comptes critiques)
- Taux fiscaux : TVA CM 19,25% / CI 18% / GA 18% | IS CM 30% / CI 25% / GA 30%
- Séparation stricte 4431 (TVA collectée) vs 4451 (TVA déductible)
- Comptes 10x → validation MANAGER_N2 obligatoire
- Comptes 47x (transitoires) → flag "à solder 30j"
- Barèmes IRPP CM / CI / GA
- CNPS CM : patronal 11,2% / salarial 4,2%

### Couche 2 — RAG vectoriel (pgvector)
3 corpus ingérés, versionnés par année :
- **CGI** : Cameroun (actuel + N-1 à N-5), Côte d'Ivoire, Gabon
- **OHADA** : Traité + 9 Actes Uniformes (AUSCGIE, AUDCG, AUVE, AUS, AUDPC, AUPSRVE, AUPSCAP, AURVE, AUDPCC) + jurisprudence CCJA
- **SYSCOHADA étendu** : notes explicatives, circulaires DGI, guide 2017 révisé

### Logique de retrieval temporel
Si `document.date = 2021` → filtrer `legal_chunks WHERE annee <= 2021`
→ Jamais appliquer un taux 2024 à un document 2021

### 3 sorties simultanées
1. `obligations_fiscales` — TVA due, retenues, IS, base légale
2. `alertes_echeances` — dates limites, type déclaration, article de loi
3. `verdict_conformite` — CONFORME / ANOMALIE / INCOMPLET + articles violés

---

## 6. SCHÉMA PRISMA (tables principales)

```prisma
model User {
  id          String   @id @default(cuid())
  email       String   @unique
  role        Role
  name        String
  pays        String   @default("CM")
  tier        Tier?
  permissions UserPermission[]
  documents   Document[]
  objectives  Objective[]
  createdAt   DateTime @default(now())
}

model UserPermission {
  id         String @id @default(cuid())
  userId     String
  user       User   @relation(fields: [userId], references: [id])
  capability String // CAN_ASSIGN_TRAINEE | CAN_EXPORT_DATA | CAN_VIEW_ALL_CLIENTS
  grantedBy  String // MANAGER userId
}

model Document {
  id               String        @id @default(cuid())
  clientId         String
  canal            Canal         @default(PORTAL)
  status           DocStatus     @default(DRAFT)
  categorie        DocCategorie?
  filePath         String
  ocrResult        Json?
  syscohadaDebit   String?
  syscohadaCredit  String?
  syscohadaTva     String?
  confidence       Float?
  needsReview      Boolean       @default(false)
  rejectReasons    String[]
  rejectNote       String?
  assignedTo       String?
  validatedBy      String?
  validatedAt      DateTime?
  qboSyncStatus    QBOStatus     @default(PENDING)
  auditTrail       AuditEntry[]
  createdAt        DateTime      @default(now())
}

model AuditEntry {
  id         String   @id @default(cuid())
  documentId String
  document   Document @relation(fields: [documentId], references: [id])
  actorId    String
  actorRole  Role
  action     String
  before     Json?
  after      Json?
  createdAt  DateTime @default(now())
}

model LegalChunk {
  id        String   @id @default(cuid())
  corpus    Corpus
  pays      String?
  source    String
  annee     Int
  article   String?
  matiere   String
  contenu   String
  embedding Unsupported("vector(1536)")
  createdAt DateTime @default(now())

  @@index([corpus, pays, annee])
  @@index([matiere])
}

model Objective {
  id           String        @id @default(cuid())
  title        String
  description  String?
  frequence    ObjFrequence
  priorite     ObjPriorite   @default(MOYENNE)
  assignedTo   String
  createdBy    String
  clientId     String?
  echeance     DateTime
  status       ObjStatus     @default(EN_COURS)
  progress     Int           @default(0)
  subObjectives SubObjective[]
  activityLog  ObjActivity[]
  createdAt    DateTime      @default(now())
}

model SubObjective {
  id          String     @id @default(cuid())
  objectiveId String
  objective   Objective  @relation(fields: [objectiveId], references: [id])
  title       String
  assignedTo  String
  status      ObjStatus  @default(EN_ATTENTE)
  completedAt DateTime?
  order       Int
}

model ObjActivity {
  id          String    @id @default(cuid())
  objectiveId String
  objective   Objective @relation(fields: [objectiveId], references: [id])
  actorId     String
  action      String
  createdAt   DateTime  @default(now())
}

enum Role { MANAGER_N2 HR EMPLOYEE TRAINEE CLIENT_INDIVIDUAL CLIENT_COMPANY }
enum Tier { DECLARANT_SOLO COMPTABLE_PRO GRAND_COMPTE }
enum Canal { PORTAL WHATSAPP MANUAL }
enum DocStatus { DRAFT PENDING_VALIDATION APPROVED REJECTED }
enum DocCategorie { FACTURE_FOURNISSEUR FACTURE_CLIENT NDF RELEVE_BANCAIRE BULLETIN_PAIE DECLARATION_FISCALE CONTRAT RECU_CAISSE JUSTIFICATIF_DOUANE }
enum QBOStatus { PENDING SYNCED FAILED }
enum Corpus { CGI OHADA SYSCOHADA }
enum ObjFrequence { JOURNALIER HEBDOMADAIRE MENSUEL ANNUEL }
enum ObjPriorite { HAUTE MOYENNE BASSE }
enum ObjStatus { EN_ATTENTE EN_COURS COMPLETE BLOQUE }
```

---

## 7. LES 18 ROUTES API (ordre de build)

### Phase 1 — Auth & Users
```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/users/me
PATCH  /api/users/:id/permissions
```

### Phase 2 — Documents & Pipeline
```
POST   /api/documents              (upload + queue job)
GET    /api/documents              (file de validation, filtres rôle)
GET    /api/documents/:id
PATCH  /api/documents/:id/approve  (+ push QBO)
PATCH  /api/documents/:id/reject   (motif obligatoire)
GET    /api/documents/:id/audit
```

### Phase 3 — Objectifs
```
POST   /api/objectives             (Manager uniquement)
GET    /api/objectives             (filtré par rôle + fréquence)
GET    /api/objectives/:id         (avec sous-objectifs + activité)
PATCH  /api/objectives/:id/sub/:subId  (marquer sous-objectif)
```

### Phase 4 — RAG & Legal
```
GET    /api/legal/search           (retrieval chunks)
POST   /api/legal/ingest           (ingestion corpus, admin only)
```

### Phase 5 — QuickBooks & Dashboard
```
GET    /api/qbo/connect
GET    /api/qbo/callback
GET    /api/dashboard/:role        (données agrégées par rôle)
```

---

## 8. DASHBOARDS — RÉCAPITULATIF

| Dashboard | Rôle | Sections clés |
|---|---|---|
| **Manager TCCS** | MANAGER_N2 | Portefeuille clients, file globale, revenus par tier, équipe, objectifs, alertes |
| **Employee** | EMPLOYEE | File perso, dossiers clients, brouillons stagiaires, messagerie, **objectifs + tracking** |
| **Stagiaire** | TRAINEE | Tâches assignées auto, brouillons, corrections reçues, limites de rôle, progression |
| **Fiscalité individuel** | CLIENT_INDIVIDUAL | IRPP simulateur, revenus, déclarations, objectifs patrimoniaux, alertes, TCCS chat |
| **Comptabilité individuel** | CLIENT_INDIVIDUAL | Revenus/charges, transactions, trésorerie, documents, état SYSCOHADA |
| **Entreprise** | CLIENT_COMPANY | Vue d'ensemble, documents, état financier, services TCCS, conformité OHADA |

---

## 9. SYSTÈME D'OBJECTIFS

### Logique Manager
- Crée objectifs : Journalier / Hebdomadaire / Mensuel / Annuel
- Assigne à EMPLOYEE ou TRAINEE (un objectif peut avoir des sous-objectifs assignés à des membres différents)
- Définit sous-objectifs ordonnés avec assignation individuelle
- Suit la progression en temps réel (% complété, bloqués, en retard)
- Peut réassigner ou relancer un objectif bloqué

### Logique Employee
- Voit ses objectifs par fréquence (4 onglets)
- Clic sur objectif → tracking détaillé avec sous-objectifs cochables
- Timeline d'activité horodatée sur chaque objectif
- Peut contacter le Manager si bloqué

### Logique Trainee
- Voit uniquement les sous-objectifs qui lui sont assignés
- Ne voit pas l'objectif parent complet
- Soumet ses sous-objectifs en "brouillon" → l'EMPLOYEE valide

---

## 10. ONBOARDING CLIENT

### Étape 1 — Profil
Choix : Particulier ou Entreprise

### Étape 2 — Situation
- Nom, pays fiscal (CM/CI/GA/autre OHADA)
- Sources de revenus (chips multi-select)
- NIU (si vide → lien "Créer son NIU gratuitement avec TCCS" → collecte CNI + adresse + activité → soumission DGI par TCCS → NIU pré-rempli à réception)

### Étape 3 — Objectifs personnels
Chips multi-select : Conformité fiscale / Suivi comptable / Achat immobilier / Activité indépendante / Épargne & patrimoine / Contrôle fiscal
→ Chaque objectif coché active les blocs correspondants dans les dashboards

### Étape 4 — Récapitulatif
Affiche la configuration, confirme le comptable TCCS assigné, active l'espace

---

## 11. TIERS TARIFAIRES

| Tier | Prix/mois | Limite | Cible |
|---|---|---|---|
| Déclarant Solo | 19 900 XAF | 30 docs/mois | Particuliers, micro-entrepreneurs |
| Comptable Pro | 59 900 XAF | Illimité | PME, freelances actifs |
| Grand Compte | 199 000 XAF | Illimité + multi-users + support dédié + commissariat aux comptes option | Entreprises, cabinets |

---

## 12. SERVICES TCCS PAR TIER

### Inclus dans tous les tiers
- Tenue comptable SYSCOHADA
- Déclarations fiscales (TVA, IS, DSF)
- Paie & CNPS mensuel
- Conformité OHADA (RCCM, statuts, registres)
- Chat sécurisé avec comptable assigné
- Alertes intelligentes 30j avant échéances

### Grand Compte uniquement
- Commissariat aux comptes (option)
- Évaluation d'entreprise
- Business plan & prévisionnel
- Assistance contrôle fiscal DGI
- Modification statutaire OHADA
- Dossier de financement bancaire

---

## 13. RÈGLES DE SÉCURITÉ

- JWT + refresh tokens
- Signature X-Hub-Signature-256 sur webhooks Meta (prévu phase 2)
- Row Level Security : chaque requête filtrée par `clientId` du token
- Audit trail immuable : aucune ligne ne peut être supprimée, uniquement ajoutée
- Comptes 10x : flag `requiresManagerApproval: true` en DB
- Tokens QBO chiffrés en base, refresh automatique
- NIU et données fiscales : chiffrement AES-256 au repos

---

## 14. DÉFINITION OF DONE (par feature)

Une feature est "done" quand :
1. Route API testée (happy path + error cases)
2. Schéma Prisma migré
3. UI composant rendu correctement côté client
4. RBAC vérifié (le bon rôle voit la bonne chose)
5. Audit trail écrit sur toute action de validation
6. Mapping SYSCOHADA vérifié par le prompt système
7. Base légale citée dans chaque assertion fiscale

---

## 15. DEMO INVESTISSEUR (3 minutes)

**0:00** — Uploader une vraie facture depuis le portail → le pipeline se déclenche en direct
**0:30** — ValidationForm affiche OCR + catégorie + comptes SYSCOHADA + analyse fiscale DGI
**1:00** — Employee approuve → push QBO confirmé + audit trail visible
**1:30** — Dashboard Fiscalité client : IRPP simulé, alerte TVA, verdict conformité avec articles CGI
**2:00** — Dashboard Manager : portefeuille multi-clients, MRR par tier, objectifs équipe
**2:30** — Portail client entreprise : conformité OHADA 92%, PV AG manquant, calendrier légal
