# CLEVER Web Client — Instructions Claude Code

## Stack Frontend
- Next.js 14 App Router
- Tailwind CSS
- TypeScript
- Composants : Radix UI / shadcn
- State : Zustand
- Fetch : SWR

---

## STRUCTURE APP ROUTER

```
app/
├── (auth)/
│   ├── login/page.tsx
│   └── onboarding/page.tsx          ← 4 étapes : profil, situation, objectifs, récap
│
├── (staff)/                         ← MANAGER_N2 | HR | EMPLOYEE | TRAINEE
│   ├── layout.tsx                   ← sidebar avec nav par rôle
│   ├── dashboard/page.tsx           ← redirection selon rôle
│   ├── manager/
│   │   ├── page.tsx                 ← Dashboard Manager (portefeuille, MRR, alertes)
│   │   ├── clients/page.tsx
│   │   ├── queue/page.tsx           ← file globale
│   │   ├── team/page.tsx            ← équipe + permissions
│   │   └── objectives/page.tsx      ← création + suivi objectifs
│   ├── employee/
│   │   ├── page.tsx                 ← Dashboard Employee
│   │   ├── queue/page.tsx           ← file personnelle
│   │   ├── clients/page.tsx
│   │   └── objectives/page.tsx      ← objectifs + tracking
│   └── trainee/
│       └── page.tsx                 ← tâches, brouillons, progression
│
├── (client)/                        ← CLIENT_INDIVIDUAL | CLIENT_COMPANY
│   ├── layout.tsx                   ← header + switcher dashboard
│   ├── fiscal/page.tsx              ← Dashboard Fiscalité
│   ├── comptabilite/page.tsx        ← Dashboard Comptabilité
│   └── entreprise/
│       └── page.tsx                 ← Portail Entreprise (5 sections)
│
└── api/                             ← API Routes Next.js (proxy vers Express si besoin)
```

---

## NAVIGATION PAR RÔLE

```typescript
// lib/navigation.ts
export const navByRole = {
  MANAGER_N2: [
    { label: 'Vue d\'ensemble', href: '/manager', icon: 'layout-dashboard' },
    { label: 'Clients', href: '/manager/clients', icon: 'users' },
    { label: 'File de validation', href: '/manager/queue', icon: 'list-check' },
    { label: 'Équipe', href: '/manager/team', icon: 'users-group' },
    { label: 'Objectifs', href: '/manager/objectives', icon: 'target' },
  ],
  EMPLOYEE: [
    { label: 'Ma file', href: '/employee', icon: 'list-check' },
    { label: 'Mes clients', href: '/employee/clients', icon: 'folder' },
    { label: 'Objectifs', href: '/employee/objectives', icon: 'target' },
  ],
  TRAINEE: [
    { label: 'Mes tâches', href: '/trainee', icon: 'clipboard-list' },
  ],
  CLIENT_INDIVIDUAL: [
    { label: 'Fiscalité', href: '/fiscal', icon: 'receipt-tax' },
    { label: 'Comptabilité', href: '/comptabilite', icon: 'calculator' },
  ],
  CLIENT_COMPANY: [
    { label: 'Mon espace', href: '/entreprise', icon: 'building' },
  ],
}
```

---

## COMPOSANT CLÉ : ValidationForm (démo centerpiece)

```typescript
// components/validation/ValidationForm.tsx
// Layout : 2 colonnes — image gauche | champs droite
// Onglets droite : OCR + Classification | Analyse fiscale | Audit trail
// Mapping SYSCOHADA : champs éditables avec autocomplétion plan comptable
// Rejet : modale avec motifs obligatoires (min 1) + note optionnelle
// Approuver : bouton primary → push QBO
// Modifier + approuver : corrections + push QBO
// Audit trail : timeline horodatée (Cerveau → Trainee? → Employee)
```

### Props ValidationForm
```typescript
interface ValidationFormProps {
  documentId: string
  document: Document
  onApprove: (modifications?: Partial<Document>) => Promise<void>
  onReject: (reasons: string[], note?: string) => Promise<void>
  userRole: Role
  userPermissions: string[]
}
```

### Autocomplétion SYSCOHADA
```typescript
// Les comptes sont indexés par préfixe 2 chiffres
// Tape "60" → suggestions : 601, 604, 6064, 6065, 6068...
// Chaque suggestion affiche : code + libellé
// Sélection → update syscohadaDebit/Credit/Tva + log dans audit
const SYSCOHADA_INDEX: Record<string, {code: string, libelle: string}[]> = {
  '60': [
    { code: '601', libelle: 'Achats de marchandises' },
    { code: '604', libelle: 'Achats de prestations' },
    { code: '6064', libelle: 'Carburants et lubrifiants' },
    { code: '6065', libelle: 'Fournitures d\'entretien' },
    { code: '6068', libelle: 'Autres matières et fournitures' },
  ],
  // ... toutes les classes
}
```

---

## COMPOSANT CLÉ : ObjectiveTracker

```typescript
// components/objectives/ObjectiveTracker.tsx
// Affiche un objectif avec ses sous-objectifs
// Chaque sous-objectif est cochable (EMPLOYEE uniquement, ou TRAINEE pour les siens)
// Timeline d'activité horodatée
// Barre de progression globale calculée automatiquement
// Bouton "Contacter manager" si bloqué

interface ObjectiveTrackerProps {
  objective: Objective & { subObjectives: SubObjective[], activityLog: ObjActivity[] }
  currentUserId: string
  currentUserRole: Role
  onSubComplete: (subId: string) => Promise<void>
  onContactManager: () => void
}
```

---

## COMPOSANT CLÉ : Onboarding

```typescript
// app/(auth)/onboarding/page.tsx
// 4 étapes avec navigation (Continuer / Retour)
// Étape 1 : SelectProfile (Particulier | Entreprise)
// Étape 2 : SituationForm (nom, pays, sources revenus, NIU)
//   → Si NIU vide : lien "Créer mon NIU gratuitement"
//     → Modal : collecte CNI + adresse + activité → POST /api/niu/request
//     → Confirmation : "TCCS soumettra votre demande à la DGI sous 48h"
// Étape 3 : ObjectivesSelector (chips multi-select, min 1 requis)
// Étape 4 : Summary (récap dynamique + comptable TCCS assigné auto)
// Submit → POST /api/users/onboarding → redirect dashboard

const NIU_CREATION_FIELDS = ['numeroCNI', 'nom', 'prenom', 'dateNaissance', 'adresse', 'activite', 'telephone']
```

---

## SSE (Server-Sent Events)

```typescript
// hooks/useSSE.ts
// Connexion persistante au endpoint /api/sse
// Events écoutés :
//   - document:queued       → afficher "En traitement..."
//   - document:processed    → refresh file de validation
//   - document:approved     → notifier client
//   - document:rejected     → notifier expéditeur
//   - objective:assigned    → notifier employee
//   - objective:completed   → notifier manager
//   - limit:warning         → alerte 95% limite tier

export function useSSE(userId: string) {
  useEffect(() => {
    const es = new EventSource(`/api/sse?userId=${userId}`)
    es.onmessage = (e) => {
      const { type, payload } = JSON.parse(e.data)
      // dispatch vers store Zustand
    }
    return () => es.close()
  }, [userId])
}
```

---

## DASHBOARD FISCAL — IRPP SIMULATEUR

```typescript
// Calcul IRPP Cameroun (barème progressif CGI CM Art.25)
// Tranches 2024 :
// 0 — 500 000 XAF      : exonéré (0%)
// 500 001 — 1 500 000  : 15%
// 1 500 001 — 3 000 000: 25%
// 3 000 001 — 5 000 000: 35%
// > 5 000 000           : 35% (taux marginal)
// Abattements : Art.27 CGI — frais professionnels 30% du revenu salarial (plafond)

export function calculateIRPP(revenus: RevenusDeclarables, pays: string): IRPPResult {
  // Différent par pays — CM / CI / GA ont chacun leur barème
  // CLEVER affiche toujours la base légale (article + année)
}
```

---

## PORTAIL ENTREPRISE — 5 SECTIONS

```typescript
// app/(client)/entreprise/page.tsx
// Navigation via pills horizontales :
const ENTERPRISE_SECTIONS = [
  { id: 'overview',    label: 'Vue d\'ensemble', icon: 'layout-dashboard' },
  { id: 'docs',        label: 'Mes documents',   icon: 'files' },
  { id: 'finance',     label: 'État financier',  icon: 'chart-bar' },
  { id: 'services',    label: 'Services TCCS',   icon: 'building' },
  { id: 'conformite',  label: 'Conformité OHADA', icon: 'shield-check' },
]
// Section conformite : score global + checklist OHADA + calendrier obligations légales
// Calendrier : RCCM, statuts, PV AG, dépôt comptes, DSF, CNPS, TVA, IS acomptes
```

---

## VARIABLES D'ENVIRONNEMENT FRONTEND

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_APP_NAME=CLEVER
NEXT_PUBLIC_APP_ENV=development
```

---

## CONVENTIONS DE CODE

- Tous les textes UI en français
- Montants toujours affichés avec `toLocaleString('fr-FR')` + " XAF"
- Dates : format `DD/MM/YYYY` côté UI, `YYYY-MM-DD` côté API
- Couleurs sémantiques : vert=conforme/approuvé, orange=attention, rouge=urgent/rejeté, bleu=info/en cours
- Chaque champ de compte SYSCOHADA affiche toujours : code (mono) + libellé (regular)
- Base légale toujours visible quand une règle fiscale est appliquée
