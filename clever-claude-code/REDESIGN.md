# CLEVER — REDESIGN Instructions pour Claude Code
## ⚠️ NE PAS RECOMMENCER À ZÉRO — MODIFIER L'EXISTANT

---

## CONTEXTE

Une version de CLEVER existe déjà. Elle a la logique métier, les routes API, la base de données.
**Le problème : les interfaces ne correspondent pas à la vision produit.**

Ta mission : **redesigner uniquement les interfaces** (composants UI, pages, layouts)
sans toucher à :
- La logique API (routes, controllers)
- Le schéma Prisma / base de données
- Les workers (OCR, Bull queue)
- L'authentification
- L'intégration QuickBooks

---

## RÈGLE ABSOLUE

```
AVANT de modifier un fichier :
1. Lis le fichier existant
2. Identifie ce qui fonctionne (logique, hooks, appels API)
3. Garde la logique, remplace uniquement le JSX/CSS/layout
4. Ne supprime JAMAIS un import ou une fonction sans vérifier qu'il est inutilisé
```

---

## STACK UI À UTILISER

```
- Tailwind CSS (classes utilitaires uniquement)
- Composants Radix UI / shadcn si déjà installés, sinon HTML natif + Tailwind
- Icônes : Tabler Icons (lucide-react si déjà installé)
- Pas de nouvelle librairie UI sans demander d'abord
- Fonts : système par défaut
- Pas de gradients, pas d'ombres lourdes — design flat et propre
```

---

## DESIGN SYSTEM À APPLIQUER PARTOUT

```css
/* Couleurs sémantiques — utiliser les variables CSS existantes si présentes */
/* Sinon utiliser ces classes Tailwind */

Succès / Conforme / Approuvé  → green-600 bg-green-50 border-green-200
Attention / En cours / Warn   → amber-600 bg-amber-50 border-amber-200
Urgent / Rejeté / Danger      → red-600 bg-red-50 border-red-200
Info / En traitement          → blue-600 bg-blue-50 border-blue-200
Neutre / Secondaire           → gray-500 bg-gray-50 border-gray-200

/* Cartes */
border border-gray-200 rounded-xl bg-white p-4

/* Badges */
inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full

/* Boutons */
Primary   : bg-blue-600 text-white hover:bg-blue-700 rounded-lg px-4 py-2 text-sm font-medium
Secondary : border border-gray-200 bg-transparent hover:bg-gray-50 rounded-lg px-4 py-2 text-sm
Danger    : bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 rounded-lg px-4 py-2 text-sm
Success   : bg-green-50 text-green-600 border border-green-200 hover:bg-green-100 rounded-lg px-4 py-2 text-sm

/* Métriques */
bg-gray-50 rounded-lg p-3 — label text-xs text-gray-500, valeur text-xl font-semibold

/* Inputs */
w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500
```

---

## LES 8 INTERFACES À REDESIGNER

### 1. VALIDATION FORM (priorité maximale — centerpiece démo)

**Fichier à trouver** : chercher dans le projet un composant avec "validation", "document", "approve" dans le nom ou le contenu.

**Layout cible : 2 colonnes**
```
┌─────────────────────────────────────────────────────────────────┐
│  [Traitement document]  [Badge: En attente validation]           │
│  Tabs: [OCR + Classification] [Analyse fiscale] [Audit trail]   │
├──────────────────────────┬──────────────────────────────────────┤
│  COLONNE GAUCHE (fixe)   │  COLONNE DROITE (onglets)           │
│                          │                                      │
│  Aperçu document         │  ONGLET 1 — OCR + Classification     │
│  (rectangle grisé avec   │  • Champs éditables (vendor, amount, │
│   icône + nom fichier)   │    date, TVA, description)           │
│                          │  • Catégorie détectée (dropdown)     │
│  Score confiance IA      │  • MAPPING SYSCOHADA ÉDITABLE :      │
│  [████████░░] 91%        │    Débit [6064 input] Carburants     │
│                          │    TVA   [4451 input] Récupérable    │
│  Catégorie détectée      │    Crédit[4011 input] Fournisseurs   │
│  [Facture fournisseur ▾] │    → autocomplétion plan comptable   │
│                          │  • Chips base légale (CGI / SYSCO)   │
│  Assigné à               │                                      │
│  [Avatar] Stagiaire X    │  ONGLET 2 — Analyse fiscale          │
│  [Modifier]              │  • Obligations fiscales identifiées  │
│                          │  • Alertes échéances (avec dates)    │
│                          │  • Verdict conformité (CONFORME ✓)   │
│                          │  • Base légale citée sur chaque item │
│                          │                                      │
│                          │  ONGLET 3 — Audit trail              │
│                          │  • Timeline: Cerveau → Trainee →     │
│                          │    Employee (horodatée)              │
├──────────────────────────┴──────────────────────────────────────┤
│  [Rejeter]              [Modifier et approuver] [Approuver →QBO]│
└─────────────────────────────────────────────────────────────────┘
```

**Comportement rejet** :
- Clic "Rejeter" → modale (pas de navigation)
- Modale contient : chips motifs (Document illisible / Montant incohérent / Date manquante / TVA incorrecte / Document incomplet / Doublon / Fournisseur non reconnu / Hors périmètre)
- Sélection min 1 motif obligatoire — bouton confirmer bloqué sinon
- Champ texte optionnel pour note complémentaire
- Après rejet → afficher état "Document rejeté" avec récapitulatif motifs

**Comportement SYSCOHADA éditable** :
- Chaque code (débit, TVA, crédit) est un `<input>` avec `font-mono`
- On tape les 2 premiers chiffres → dropdown suggestions (code + libellé)
- Si code modifié → badge "modifié" visible + entrée dans audit trail
- Au chargement : afficher les codes suggérés par l'IA + leurs libellés

---

### 2. DASHBOARD MANAGER TCCS

**Fichier à trouver** : page/composant avec "manager", "admin", "dashboard" dans le nom.

**Layout cible : 3 colonnes + métriques en haut**

```
┌──────────────────────────────────────────────────────────┐
│  THECLEVEREST Consulting  [7 alertes ⚠]  [+ Nouveau client]│
├──────┬──────┬──────┬──────┬──────────────────────────────┤
│ 47   │ 3,84M│  23  │  5   │  94%                         │
│Clients│ MRR │Queue │Limite│ Conformité                   │
├──────────────────┬──────────────────┬────────────────────┤
│ PORTEFEUILLE     │ FILE VALIDATION  │ ÉQUIPE             │
│ Tabs:            │ Tabs:            │ Tabs:              │
│ Entreprises      │ Urgents(6)       │ Performance        │
│ Particuliers     │ Normal           │ Permissions        │
│ Alertes(3)       │ Review IA(4)     │                    │
│                  │                  │                    │
│ [liste clients   │ [liste docs avec │ [liste membres     │
│  avec badges     │  priorité +      │  avec barres       │
│  conformité]     │  client + statut]│  de perf]          │
├──────────────────┴──────────────────┤                    │
│ REVENUS PAR TIER                    │                    │
│ Grand Compte  ████████████ 2,39M    │ ALERTES DIRIGEANT  │
│ Comptable Pro █████░░░░░░ 1,26M     │ [3 alertes         │
│ Déclarant     █░░░░░░░░░░  279K     │  colorées]         │
└─────────────────────────────────────┴────────────────────┘
```

**Onglets clés à implémenter** :
- Portefeuille → Entreprises / Particuliers / Alertes (3 états différents)
- File → Urgents / Normal / Review IA (scores de confiance visibles)
- Équipe → Performance (barres) / Permissions (éditable par employee)

---

### 3. DASHBOARD EMPLOYEE

**Layout cible : métriques + 2 colonnes**

```
┌────────────────────────────────────────────────────────┐
│  Marie-Louise Owono · Employee  [Perf 98%] [7 en attente]│
├──────┬──────┬──────┬──────────────────────────────────┤
│  7   │ 142  │  18  │  4 tâches stagiaires              │
│Queue │Validés│Clients│ en attente                      │
├─────────────────────────┬──────────────────────────────┤
│ MA FILE DE VALIDATION   │ MES DOSSIERS CLIENTS          │
│ Tabs:                   │ [liste clients + statut]      │
│ À valider               │                               │
│ Stagiaires(4)           │ MESSAGES CLIENTS              │
│ Validés                 │ [derniers messages]           │
│                         │                               │
│ [liste docs avec        │ MES OBJECTIFS ← NOUVEAU       │
│  score confiance        │ Tabs: Journalier/Hebdo/       │
│  badge priorité         │       Mensuel/Annuel          │
│  nom client]            │                               │
│                         │ [liste objectifs cliquables   │
│                         │  → tracking panel s'ouvre]    │
└─────────────────────────┴──────────────────────────────┘
```

**Section Objectifs** (nouvelle section à ajouter) :
- 4 onglets fréquence : Journalier / Hebdomadaire / Mensuel / Annuel
- Chaque objectif : titre + badge priorité + client + progress bar + nb sous-objectifs
- Clic → panneau tracking s'ouvre à droite (ou drawer)
- Tracking : liste sous-objectifs cochables + timeline activité + bouton contacter manager
- Les sous-objectifs cochés déclenchent PATCH /api/objectives/:id/sub/:subId

---

### 4. DASHBOARD TRAINEE

**Layout cible : métriques + 2 colonnes**

```
┌────────────────────────────────────────────────────────┐
│  Ange Ndoumbe · Stagiaire  [Perf 91%] [9 tâches]       │
├──────┬──────┬──────┬──────────────────────────────────┤
│  4   │  3   │  38  │  91%                              │
│Tâches│Brou- │Validés│ Précision                        │
│auj.  │illons│/mois │                                   │
├─────────────────────────┬──────────────────────────────┤
│ MES TÂCHES ASSIGNÉES    │ MES LIMITES DE RÔLE           │
│ Tabs:                   │                               │
│ Aujourd'hui             │ ✅ CE QUE JE PEUX FAIRE       │
│ Mes brouillons          │ bg-blue-50 border-blue-200    │
│ Corrigés                │ • Corriger les champs OCR     │
│                         │ • Proposer une catégorie      │
│ [liste tâches avec      │ • Soumettre un brouillon      │
│  chip client +          │ • Rapprochement bancaire      │
│  bouton Traiter]        │                               │
│                         │ ❌ NÉCESSITE UN EMPLOYEE      │
│                         │ bg-red-50 border-red-200      │
│                         │ • Approuver → QuickBooks      │
│                         │ • Modifier compte SYSCOHADA   │
│                         │ • Contacter un client         │
│                         │ • Rejeter un document         │
│                         │                               │
│                         │ MA PROGRESSION                │
│                         │ [métriques précision +        │
│                         │  corrections + vitesse]       │
└─────────────────────────┴──────────────────────────────┘
```

---

### 5. DASHBOARD FISCALITÉ (Client Individuel)

**Layout cible : switcher en haut + métriques + 2 colonnes**

```
┌────────────────────────────────────────────────────────┐
│  Bonjour, [Prénom]  [Conformité 100% ✓] [Préparer DRPP]│
│  [Fiscalité] [Comptabilité]  ← switcher                │
├──────┬──────┬──────┬──────────────────────────────────┤
│ 4,23M│ 312K │ 100% │  12j                              │
│Rev.  │IRPP  │Conf. │ Prochaine échéance                │
├─────────────────────────┬──────────────────────────────┤
│ SIMULATION IRPP 2024    │ ALERTES INTELLIGENTES         │
│ Tabs:                   │ [alertes rouge/orange/bleu    │
│ Calcul IRPP             │  avec boutons d'action]       │
│ Mes revenus             │                               │
│ Déclarations            │ ACCOMPAGNEMENT TCCS           │
│                         │ [comptable assigné +          │
│ ONGLET IRPP :           │  statut en ligne +            │
│ • tableau tranches      │  derniers messages chat +     │
│   progressives          │  dossiers en cours]           │
│ • base légale CGI       │                               │
│ • total estimé          │ OBJECTIFS & PATRIMOINE        │
│ • boutons DRPP/Optim    │ [3 objectifs avec barres      │
│                         │  de progression + statut]     │
│ ONGLET REVENUS :        │                               │
│ • sources avec icônes   │                               │
│ • à déclarer / retenu   │                               │
│                         │                               │
│ ONGLET DÉCLARATIONS :   │                               │
│ • historique + statuts  │                               │
└─────────────────────────┴──────────────────────────────┘
```

---

### 6. DASHBOARD COMPTABILITÉ (Client Individuel)

**Layout cible : 2 colonnes après métriques**

```
┌────────────────────────────────────────────────────────┐
│  Comptabilité — [Prénom]  [QBO sync ✓] [Uploader]      │
├──────┬──────┬──────┬──────────────────────────────────┤
│ 4,23M│ 1,87M│ 2,36M│  4 docs en attente               │
│Rev.  │Charg.│Résult│                                   │
├─────────────────────────┬──────────────────────────────┤
│ REVENUS & CHARGES       │ DOCUMENTS & VALIDATION TCCS  │
│ Tabs:                   │ Tabs:                        │
│ Aperçu                  │ En attente(4)                │
│ Charges détail          │ Validés                      │
│ Transactions            │ Uploader                     │
│                         │                               │
│ APERÇU:                 │ [liste docs avec score        │
│ • barres rev/charges    │  confiance + statut]         │
│ • répartition charges   │                               │
│   par catégorie SYSCO   │ ÉTAT COMPTABLE SYSCOHADA     │
│                         │ [comptes avec codes mono +    │
│ TRÉSORERIE              │  montants + résultat S1 +    │
│ • solde banque          │  boutons bilan/résultat]     │
│ • projection 90j        │                               │
│ • encaissements/déc.    │                               │
└─────────────────────────┴──────────────────────────────┘
```

---

### 7. PORTAIL CLIENT ENTREPRISE

**Layout cible : header + pills navigation + sections**

```
┌────────────────────────────────────────────────────────┐
│  [Logo TC] SARL TechConsult CM  [QBO sync] [Uploader]  │
│  [Vue d'ensemble][Mes documents][État financier]        │
│  [Services TCCS][Conformité OHADA]                     │
├────────────────────────────────────────────────────────┤
│  SECTION ACTIVE (change selon pill sélectionnée)        │
│                                                         │
│  VUE D'ENSEMBLE : métriques + activité récente +        │
│    chat comptable + dossiers en cours + alertes         │
│                                                         │
│  MES DOCUMENTS : upload zone + tabs En attente /        │
│    Validés / Rejetés (motifs visibles sur rejetés)      │
│                                                         │
│  ÉTAT FINANCIER : comptes SYSCOHADA + trésorerie        │
│    multi-banques + flux J+30                            │
│                                                         │
│  SERVICES TCCS : liste services inclus (tier) +         │
│    liste services demandables (clic → demande)          │
│                                                         │
│  CONFORMITÉ OHADA : score % + checklist RCCM/statuts/  │
│    PV AG/registres + calendrier obligations légales     │
└────────────────────────────────────────────────────────┘
```

---

### 8. ONBOARDING (4 étapes)

**Layout cible : stepper en haut + carte centrale**

```
┌────────────────────────────────────────────────────────┐
│  Bienvenue sur CLEVER · 4 étapes · moins de 3 minutes  │
│                                                         │
│  ●━━━━●━━━━○━━━━○   (stepper : fait / actif / idle)    │
│                                                         │
├────────────────────────────────────────────────────────┤
│                                                         │
│  ÉTAPE 1 : Vous êtes...                                │
│  [Particulier card] [Entreprise card] ← sélectionnable │
│                                                         │
│  ÉTAPE 2 : Votre situation                             │
│  Nom | Pays fiscal (CM/CI/GA/Autre OHADA)              │
│  Sources revenus : [Salaire][Freelance][Foncier]...     │
│  NIU : [input]                                         │
│  → Si vide : "Pas de NIU ? Créez-le gratuitement →"   │
│     Modal : CNI + adresse + activité → soumis DGI TCCS │
│                                                         │
│  ÉTAPE 3 : Vos objectifs                               │
│  [chips multi-select avec icônes]                      │
│  Conformité fiscale / Suivi comptable / Immobilier...  │
│                                                         │
│  ÉTAPE 4 : Votre espace est prêt                       │
│  [récap dynamique + comptable assigné + CTA dashboard] │
│                                                         │
│               [← Retour]  Étape X/4  [Continuer →]    │
└────────────────────────────────────────────────────────┘
```

---

## MODULE OBJECTIFS MANAGER (à ajouter dans le dashboard Manager)

**Page /manager/objectives — 3 vues via onglets**

```
VUE D'ENSEMBLE :
  4 compteurs colorés (Journalier rouge / Hebdo orange / Mensuel bleu / Annuel vert)
  Liste objectifs actifs avec : titre + assigné + client + progress bar + badge
  Alertes : objectifs bloqués ou en retard + bouton réassigner

CRÉER / MODIFIER :
  Colonne gauche : formulaire
    - Titre (input)
    - Description (textarea optionnel)
    - Fréquence (chips : Journalier / Hebdomadaire / Mensuel / Annuel)
    - Assigner à (select membres équipe)
    - Client concerné (select clients)
    - Date d'échéance (date picker)
    - Priorité (3 boutons : Haute / Moyenne / Basse)
  Colonne droite : sous-objectifs
    - Liste des sous-objectifs ajoutés (drag pour réordonner si possible)
    - Input + select assignation individuelle + bouton Ajouter
    - Aperçu dynamique (se met à jour en temps réel)
    - Bouton "Créer et assigner" → POST /api/objectives

SUIVI ÉQUIPE :
  4 métriques (créés / complétés / en cours / en retard)
  Barres de performance par membre (comparatif)
```

---

## COMPOSANTS PARTAGÉS À CRÉER / METTRE À JOUR

### Badge de confiance IA
```jsx
// Vert si >= 0.85, Orange si 0.70-0.84, Rouge si < 0.70
<ConfidenceBadge score={0.91} />
// Rendu : pill colorée avec pourcentage
```

### Base légale chip
```jsx
// Toujours visible quand une règle fiscale est citée
<LegalBasisChip source="CGI CM Art.149" />
// Rendu : pill grise avec icône balance
```

### Score conformité OHADA
```jsx
// Barre de progression + items checklist
<OHADAComplianceScore score={92} items={[...]} />
```

### Mapping SYSCOHADA éditable
```jsx
// 3 lignes : débit / TVA / crédit
// Chaque ligne : input code (mono) + libellé auto
// Autocomplétion sur 2+ caractères
<SYSCOHADAMapper
  debit={doc.syscohadaDebit}
  tva={doc.syscohadaTva}
  credit={doc.syscohadaCredit}
  onChange={(field, code, libelle) => ...}
/>
```

---

## ORDRE D'EXÉCUTION RECOMMANDÉ

```
1. ValidationForm       ← priorité absolue (démo centerpiece)
2. Dashboard Manager    ← vue interne la plus complexe
3. Dashboard Employee   ← ajouter section Objectifs
4. Dashboard Trainee    ← ajouter limites de rôle + progression
5. Onboarding          ← ajouter étape NIU
6. Dashboard Fiscal     ← client individuel
7. Dashboard Compta     ← client individuel
8. Portail Entreprise   ← 5 sections
9. Objectives Manager   ← module création + suivi
```

---

## CE QUE CLAUDE CODE DOIT FAIRE POUR CHAQUE FICHIER

```
1. Trouver le fichier existant (grep sur mots-clés)
2. Lire le fichier complet
3. Identifier et CONSERVER :
   - Les appels API existants (fetch, axios, SWR hooks)
   - Les handlers (onApprove, onReject, onChange...)
   - Les types TypeScript
   - Les imports de contexte/store
4. Remplacer uniquement :
   - Le JSX (structure HTML)
   - Les classes CSS
   - La mise en page (layout, colonnes, tabs)
5. Ajouter les nouveaux éléments :
   - Onglets manquants
   - Section Objectifs dans Employee
   - Mapping SYSCOHADA éditable dans ValidationForm
   - Modale rejet avec motifs
   - Module NIU dans Onboarding
6. Tester visuellement que le composant se rend
```

---

## LANGUE ET CONTENU

- Tout le texte UI en **français**
- Montants : `toLocaleString('fr-FR')` + " XAF"
- Dates : `DD/MM/YYYY` côté affichage
- Comptes SYSCOHADA : toujours `code (font-mono) + libellé`
- Base légale : toujours visible quand règle fiscale appliquée
- Pays par défaut : Cameroun (CM)

---

## RAPPEL VISION

CLEVER n'est pas un outil d'upload. C'est un cabinet comptable complet mis en SaaS.
Chaque interface doit refléter la profondeur du produit :
- Le cerveau cite des articles de loi, pas juste des comptes
- Le Manager pilote une équipe et un portefeuille, pas juste une liste
- Le client voit sa conformité OHADA, pas juste ses documents
- L'Employee track ses objectifs, pas juste sa file de travail
