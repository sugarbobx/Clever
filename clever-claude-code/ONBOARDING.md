# CLEVER — Premier message de session Claude Code

Colle ce message exactement au début de chaque session Claude Code :

---

```
Je travaille sur CLEVER, un SaaS comptable et fiscal pour cabinets en Afrique francophone (OHADA).

Lis d'abord ces fichiers dans l'ordre :
1. ./CLAUDE.md (vision, rôles, pipeline, schéma Prisma, routes, dashboards, objectifs)
2. ./api/CLAUDE.md (prompt système complet, routes détaillées, worker OCR, RAG)
3. ./web/CLAUDE.md (App Router, composants clés, navigation par rôle)

Ensuite, dis-moi ce que tu as compris du projet en 5 points, puis attends ma prochaine instruction.
```

---

## Raccourcis de session (.claude/skills.md)

Une fois le contexte chargé, utilise ces commandes courtes :

| Commande | Action |
|---|---|
| `build:auth` | Créer les routes /api/auth/register et /api/auth/login avec JWT |
| `build:upload` | Créer POST /api/documents avec multer + Bull queue |
| `build:ocr-worker` | Créer le worker OCR avec prompt système complet |
| `build:validation-form` | Créer le composant ValidationForm (2 colonnes, 3 onglets, SYSCOHADA éditable, modale rejet) |
| `build:dashboard:manager` | Créer le dashboard Manager (portefeuille, MRR, file globale, équipe, objectifs) |
| `build:dashboard:employee` | Créer le dashboard Employee avec section objectifs + tracking |
| `build:dashboard:fiscal` | Créer le dashboard Fiscalité client individuel |
| `build:dashboard:entreprise` | Créer le portail client entreprise (5 sections) |
| `build:objectives` | Créer le système d'objectifs complet (Manager + Employee + Trainee) |
| `build:rag` | Créer la table LegalChunk, la fonction de retrieval et le script d'ingestion |
| `build:onboarding` | Créer le flow d'onboarding 4 étapes avec création NIU |
| `build:qbo` | Créer l'intégration QuickBooks OAuth + push écritures |
| `demo:setup` | Créer les données de demo (clients fictifs, documents, objectifs) pour la démo investisseur |

---

## Ordre de build recommandé

```
Phase 1 — Fondations
  build:auth → build:upload → build:ocr-worker

Phase 2 — ValidationForm (démo centerpiece)
  build:validation-form

Phase 3 — Dashboards staff
  build:dashboard:manager → build:dashboard:employee → build:objectives

Phase 4 — Dashboards clients
  build:onboarding → build:dashboard:fiscal → build:dashboard:entreprise

Phase 5 — Intelligence juridique
  build:rag

Phase 6 — Intégrations
  build:qbo

Phase 7 — Démo
  demo:setup
```

---

## Checklist démo investisseur

Avant la démo, vérifier :
- [ ] Upload d'une vraie facture PDF → OCR < 30 secondes
- [ ] ValidationForm affiche SYSCOHADA + analyse fiscale DGI + base légale
- [ ] Approbation → confirmation QBO sync visible
- [ ] Dashboard Manager : MRR réel + file de validation active
- [ ] Dashboard Fiscalité : IRPP calculé avec tranches progressives
- [ ] Portail Entreprise : score conformité OHADA + PV AG manquant
- [ ] Objectifs : Manager crée → Employee voit + track + coche sous-objectifs
- [ ] Onboarding : client sans NIU → création NIU via TCCS
