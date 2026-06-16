# CLEVER — Claude Code Skills

## Contexte requis
Toujours lire CLAUDE.md + api/CLAUDE.md + web/CLAUDE.md avant d'exécuter un skill.

## Skills disponibles

### build:auth
Créer l'authentification complète :
- POST /api/auth/register (hash bcrypt, créer User en DB, JWT + refresh)
- POST /api/auth/login (vérifier hash, retourner tokens)
- Middleware verifyToken (extraire userId + role + permissions du JWT)
- Middleware checkRole(...roles) (vérifier le rôle autorisé)
- Middleware checkPermission(capability) (vérifier UserPermission)

### build:upload
Créer le pipeline d'upload documentaire :
- POST /api/documents avec multer (PDF/JPG/PNG, max 10Mo)
- Validation type MIME + taille
- Création Document en DB (status DRAFT si TRAINEE, PENDING_VALIDATION sinon)
- Push job Bull { documentId, filePath, pays, anneeDoc }
- SSE emit "document:queued"

### build:ocr-worker
Créer le worker OCR complet :
- Lire le fichier uploadé en base64
- Détecter le media_type
- Appeler retrieveLegalContext (RAG)
- Appeler claude-haiku-4-5 avec buildSystemPrompt complet
- Parser le JSON retourné
- Update Document en DB (ocrResult, categorie, syscohada*, confidence, needsReview)
- SSE emit "document:processed"

### build:validation-form
Créer le composant ValidationForm :
- Layout 2 colonnes (image gauche | champs droite)
- Onglet 1 : OCR + Classification (champs éditables, SYSCOHADA avec autocomplétion)
- Onglet 2 : Analyse fiscale (obligations, alertes, verdict + base légale)
- Onglet 3 : Audit trail (timeline horodatée)
- Modale rejet : chips motifs obligatoires (min 1) + note optionnelle
- Boutons : Rejeter | Modifier et approuver | Approuver → QuickBooks
- Badge confiance vert/orange/rouge selon score
- Toute modification SYSCOHADA loggée dans audit trail

### build:objectives
Créer le système d'objectifs complet :
- Routes : POST /api/objectives, GET /api/objectives, PATCH /api/objectives/:id/sub/:subId
- Dashboard Manager : Vue d'ensemble + formulaire création (titre, fréquence, assigné, client, échéance, priorité, sous-objectifs)
- Les sous-objectifs sont assignables individuellement (différent de l'objectif parent)
- Dashboard Employee : 4 onglets fréquence, clic objectif → tracking panneau droit
- Tracking : sous-objectifs cochables, timeline activité, barre progression
- Trainee : voit uniquement ses sous-objectifs assignés, pas l'objectif parent complet
- Recalcul automatique progress% à chaque sous-objectif complété
- Notification Manager si progress = 100%

### build:onboarding
Créer le flow d'onboarding 4 étapes :
- Étape 1 : SelectProfile (Particulier | Entreprise)
- Étape 2 : SituationForm (nom, pays, sources revenus chips, NIU)
  - Si NIU vide → lien "Créer mon NIU gratuitement"
  - Modal NIU : collecter CNI + adresse + activité → POST /api/niu/request
  - Réponse : confirmation "TCCS soumettra à la DGI sous 48h"
- Étape 3 : ObjectivesSelector (chips, min 1)
- Étape 4 : Summary dynamique + comptable TCCS assigné
- POST /api/users/onboarding → redirect dashboard approprié

### build:rag
Créer l'infrastructure RAG juridique :
- Extension pgvector sur PostgreSQL
- Migration Prisma table LegalChunk (embedding vector(1536))
- Fonction generateEmbedding (Anthropic Embeddings API)
- Fonction retrieveLegalContext avec filtres pays + annee
- Script d'ingestion : PDF → chunks ~500 tokens → embeddings → pgvector
- Indexation : [corpus, pays, annee] + [matiere]

### build:qbo
Créer l'intégration QuickBooks Online :
- GET /api/qbo/connect → redirect OAuth Intuit
- GET /api/qbo/callback → stocker tokens chiffrés en DB
- Fonction pushToQBO(document) → POST /v3/company/{realmId}/purchase (ou invoice selon categorie)
- Refresh automatique si token expiré
- Gestion erreurs + retry (3 tentatives)
- Update qboSyncStatus en DB

### demo:setup
Créer les données de démo pour la démo investisseur :
- 2 clients entreprises (SARL TechConsult CM, Cabinet Ntanga)
- 3 clients particuliers (Jean-Paul Mbarga, Cécile Ateba, Marc Biyong)
- 2 employees (Marie-Louise Owono, Paul Kamga)
- 2 stagiaires (Ange Ndoumbe, Thierry Samba)
- 5 documents à différents stades (PENDING, APPROVED, REJECTED)
- 3 objectifs actifs avec sous-objectifs (DSF TRADEX, TVA Cabinet Ntanga, NDF Mbarga)
- Données fiscales réalistes (revenus, IRPP, TVA)
