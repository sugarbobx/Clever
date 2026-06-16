# CLEVER API — Instructions Claude Code

## Stack API
- Node.js + Express
- Prisma ORM → PostgreSQL + pgvector
- Redis + Bull (queue OCR)
- Anthropic SDK (claude-haiku-4-5)
- QuickBooks Online SDK (node-quickbooks)

---

## PROMPT SYSTÈME COMPLET (buildSystemPrompt)

```typescript
export function buildSystemPrompt(legalChunks: LegalChunk[], pays: string, anneeDoc: number) {
  const chunksFormatted = legalChunks
    .map(c => `[${c.source} — ${c.article ?? ''}]\n${c.contenu}`)
    .join('\n\n---\n\n')

  return `Tu es le moteur comptable et fiscal de CLEVER, SaaS pour cabinets comptables en Afrique francophone (zone OHADA). Tu réponds UNIQUEMENT en JSON valide, sans markdown, sans texte autour.

## RÈGLES SYSCOHADA (mémorisées)
Classe 1 — Ressources durables : 101 Capital | 111 Réserves légales | 131 Résultat exercice | 162 Emprunts bancaires LT
Classe 2 — Actifs immobilisés : 211 Terrains | 221 Bâtiments | 232 Transport | 234 Matériel info | 261 Titres participation | 281-284 Amortissements
Classe 3 — Stocks : 31 Marchandises | 32 Matières premières | 35 Produits finis | 391 Dépréciations
Classe 4 — Tiers :
  401/4011 Fournisseurs | 411/4111 Clients | 421 Personnel | 431 CNPS
  4431 TVA COLLECTÉE (PASSIF) ← NE JAMAIS CONFONDRE AVEC
  4451 TVA DÉDUCTIBLE (ACTIF)
  447 État impôts divers | 462 Cessions actifs
Classe 5 — Trésorerie : 521 Banque | 531 Caisse | 532 Petite caisse | 571 Virements internes
Classe 6 — Charges (usage le plus fréquent) :
  601 Achats marchandises | 604 Prestations | 6064 Carburant | 6065 Entretien
  6068 Autres fournitures | 6132 Loyers | 6141 Réparations | 6224 Commissions
  6226 Honoraires | 6251 Voyages | 6252 Réceptions | 631 Impôts directs
  641 Salaires bruts | 644 Charges patronales CNPS | 661 Intérêts emprunts | 681 Dotations amortissements
Classe 7 — Produits : 701 Ventes | 706 Services | 707 Produits accessoires | 761 Dividendes | 771 Gains change
Classe 8 — HAO : 81 VNC cessions | 82 Produits cessions | 892 IS
Classe 9 — Analytique : 92 Centres coût | 95 Marges

## TAUX FISCAUX MÉMORISÉS (pays: ${pays}, année doc: ${anneeDoc})
TVA    : CM 19,25% | CI 18% | GA 18%
IS     : CM 30%    | CI 25% | GA 30%
IRPP   : CM barème 10%-35% | CI 0%-36% | GA 5%-35%
CNPS CM : patronal 11,2% | salarial 4,2% (plafond 750 000 XAF/mois)

## RÈGLES TRANSVERSALES
- Toujours proposer DÉBIT + CRÉDIT + TVA (écriture complète)
- 4431 et 4451 ne sont JAMAIS sur le même compte — erreur grave
- Comptes 47x (transitoires) → note "à solder sous 30 jours"
- Comptes 10x → requiresManagerApproval: true
- confidence < 0.70 → needs_review: true obligatoire
- Chaque assertion fiscale → citer l'article de loi exact
- Si document date ${anneeDoc} → appliquer les règles de ${anneeDoc}, pas celles d'aujourd'hui

## CONTEXTE JURIDIQUE RAG (articles pertinents récupérés)
${chunksFormatted || 'Aucun chunk RAG — utiliser uniquement les règles mémorisées ci-dessus'}

## FORMAT DE SORTIE OBLIGATOIRE
Réponds UNIQUEMENT avec ce JSON, sans aucun texte avant ou après :
{
  "vendor": string | null,
  "amount": number | null,
  "currency": "XAF" | "EUR" | "USD" | string,
  "date": "YYYY-MM-DD" | null,
  "description": string,
  "categorie": "FACTURE_FOURNISSEUR" | "FACTURE_CLIENT" | "NDF" | "RELEVE_BANCAIRE" | "BULLETIN_PAIE" | "DECLARATION_FISCALE" | "CONTRAT" | "RECU_CAISSE" | "JUSTIFICATIF_DOUANE",
  "syscohada_debit": string,
  "syscohada_credit": string,
  "syscohada_tva": string | null,
  "tva_amount": number | null,
  "tva_rate": number | null,
  "confidence": number,
  "needs_review": boolean,
  "obligations_fiscales": {
    "tva_deductible": number | null,
    "tva_collectee": number | null,
    "retenue_source": number | null,
    "base_legale": string
  },
  "alertes_echeances": [
    { "type": string, "echeance": "YYYY-MM-DD", "description": string, "base_legale": string }
  ],
  "verdict_conformite": {
    "statut": "CONFORME" | "ANOMALIE" | "INCOMPLET",
    "observations": string[],
    "anomalies": string[],
    "base_legale_verifiee": string
  }
}`
}
```

---

## ROUTES API DÉTAILLÉES

### POST /api/documents
```
Body     : multipart/form-data { file, clientId, description? }
Auth     : EMPLOYEE | CLIENT_INDIVIDUAL | CLIENT_COMPANY
Process  :
  1. Valider type (PDF/JPG/PNG) + taille (max 10Mo)
  2. Sauvegarder fichier → /uploads/{cuid}.{ext}
  3. Créer Document en DB (status: DRAFT si TRAINEE, PENDING_VALIDATION sinon)
  4. Pousser job Bull { documentId, filePath, pays, anneeDoc }
  5. Retourner { documentId, status: "queued" }
SSE      : émettre "document:queued" aux employees concernés
```

### PATCH /api/documents/:id/approve
```
Auth     : EMPLOYEE (+ CAN_APPROVE si délégué)
Body     : { syscohadaDebit?, syscohadaCredit?, syscohadaTva?, note? }
Process  :
  1. Vérifier document existe + status PENDING_VALIDATION
  2. Si champs SYSCOHADA modifiés → logger dans AuditEntry (before/after)
  3. Push vers QuickBooks (POST /v3/company/{realmId}/purchase ou invoice)
  4. Update status: APPROVED + qboSyncStatus: SYNCED
  5. Créer AuditEntry { action: "APPROVED", actorId, actorRole }
  6. SSE → notifier client
```

### PATCH /api/documents/:id/reject
```
Auth     : EMPLOYEE
Body     : { reasons: string[], note?: string }  ← reasons obligatoire min 1
Validation : if reasons.length === 0 → 400 "Motif de rejet obligatoire"
Process  :
  1. Update status: REJECTED + rejectReasons + rejectNote
  2. Créer AuditEntry { action: "REJECTED", reasons }
  3. Notifier client + Trainee si applicable
```

### POST /api/objectives
```
Auth     : MANAGER_N2
Body     : {
  title, description?, frequence, priorite, assignedTo,
  clientId?, echeance,
  subObjectives: [{ title, assignedTo, order }]
}
Process  :
  1. Créer Objective en DB
  2. Créer SubObjective[] avec ordre
  3. Créer ObjActivity { action: "CREATED", actorId }
  4. Notifier l'employee assigné (SSE + notification)
```

### PATCH /api/objectives/:id/sub/:subId
```
Auth     : EMPLOYEE | TRAINEE (uniquement ses sous-objectifs)
Body     : { status: "COMPLETE" | "BLOQUE" }
Process  :
  1. Vérifier que acteur est bien assigné à ce sous-objectif
  2. Update SubObjective.status + completedAt si COMPLETE
  3. Recalculer Objective.progress = complétés / total * 100
  4. Créer ObjActivity
  5. Si progress = 100 → Objective.status = COMPLETE → notifier Manager
```

### GET /api/dashboard/:role
```
Auth     : token valide, role vérifié
Params   : ?clientId pour CLIENT roles
Returns par rôle :
  MANAGER_N2 :
    { clients: [], mrr: {}, queue: [], team: [], objectives: [], alerts: [] }
  EMPLOYEE :
    { myQueue: [], myClients: [], traineesDrafts: [], myObjectives: [], messages: [] }
  TRAINEE :
    { myTasks: [], myDrafts: [], corrections: [], progress: {} }
  CLIENT_INDIVIDUAL :
    { fiscal: {irpp, revenus, declarations}, patrimoine: [], alertes: [], tccs: {} }
  CLIENT_COMPANY :
    { overview: {}, documents: [], finance: {}, services: [], conformite: {} }
```

---

## VARIABLES D'ENVIRONNEMENT

```env
# Base
DATABASE_URL=postgresql://user:pass@localhost:5432/clever
REDIS_URL=redis://localhost:6379
JWT_SECRET=
JWT_REFRESH_SECRET=
PORT=4000

# Anthropic
ANTHROPIC_API_KEY=

# QuickBooks
QBO_CLIENT_ID=
QBO_CLIENT_SECRET=
QBO_REDIRECT_URI=https://yourdomain.com/api/qbo/callback
QBO_ENVIRONMENT=sandbox

# Uploads
UPLOAD_DIR=/var/uploads/clever
MAX_FILE_SIZE_MB=10

# SSE
SSE_HEARTBEAT_MS=30000
```

---

## WORKER OCR (Bull job)

```typescript
// workers/ocr.worker.ts
ocrQueue.process(async (job) => {
  const { documentId, filePath, pays, anneeDoc } = job.data

  // 1. Lire le fichier et le convertir en base64
  const fileBase64 = readFileAsBase64(filePath)
  const mediaType = detectMediaType(filePath)

  // 2. Récupérer les chunks RAG pertinents
  const queryText = `document comptable ${pays} ${anneeDoc}`
  const chunks = await retrieveLegalContext({ queryText, pays, anneeDoc })

  // 3. Appeler Claude Haiku avec image + prompt système
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1500,
    system: buildSystemPrompt(chunks, pays, anneeDoc),
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: fileBase64 } },
        { type: 'text', text: 'Analyse ce document comptable et retourne le JSON demandé.' }
      ]
    }]
  })

  // 4. Parser le JSON retourné
  const text = response.content[0].text
  const result = JSON.parse(text)

  // 5. Mettre à jour le document en DB
  await prisma.document.update({
    where: { id: documentId },
    data: {
      ocrResult: result,
      categorie: result.categorie,
      syscohadaDebit: result.syscohada_debit,
      syscohadaCredit: result.syscohada_credit,
      syscohadaTva: result.syscohada_tva,
      confidence: result.confidence,
      needsReview: result.needs_review,
      status: result.needs_review ? 'DRAFT' : 'PENDING_VALIDATION'
    }
  })

  // 6. Émettre SSE
  sseEmitter.emit('document:processed', { documentId, confidence: result.confidence })
})
```

---

## RETRIEVAL RAG

```typescript
// rag/retrieval.ts
export async function retrieveLegalContext({ queryText, pays, anneeDoc }) {
  // Générer embedding de la requête (via API ou local)
  const embedding = await generateEmbedding(queryText)

  // Requête pgvector avec filtres temporels
  const chunks = await prisma.$queryRaw`
    SELECT id, corpus, source, article, matiere, contenu,
           1 - (embedding <=> ${embedding}::vector) AS similarity
    FROM "LegalChunk"
    WHERE (pays = ${pays} OR pays IS NULL)
      AND annee <= ${anneeDoc}
    ORDER BY embedding <=> ${embedding}::vector
    LIMIT 5
  `

  return chunks.filter(c => c.similarity > 0.75)
}
```
