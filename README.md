# CLEVER — Local MVP

**CLEVER** (Comprehensive Ledger Efficiency & Validation Engine Ecosystem for Reconciliations) — an AI-driven accounting & fiscal-optimisation SaaS for **THECLEVEREST Consulting**, a francophone-African accounting firm.

This repository is the **locally-testable MVP**: every tier and module is navigable, the core foundations are real, and the heavy/external integrations are clearly-labelled **demo** placeholders. It runs with **no Docker, no Postgres, no Redis** — just Node + SQLite.

It is a **single full-stack Next.js app**: the UI and the API (App Router Route Handlers under `app/api/**`) live in one process on one port (**3000**), with no separate backend server and no CORS.

> The full product vision lives in `Project Description.txt`; the engineering spec it implements is in `…/Instructions/clever/`. The previous Vite prototype was archived under `legacy/`.

---

## Stack

| Layer | Technology |
|------|------------|
| App | **Next.js 16** (App Router) · TypeScript · Tailwind · Zustand · React Query · Lucide · sonner |
| API | **Next.js Route Handlers** (`app/api/**`) · Zod · JWT (httpOnly cookies) · SSE — same process, no CORS |
| Database | **Prisma** + **SQLite** (local) — swap to Postgres for the server-backed phase |
| Core IP | `@clever/fiscal-engine` — SYSCOHADA mapping + TVA/IRPP/IS (real, unit-tested) |
| Integrations | `@clever/intuit-client` — QuickBooks wrappers (**mock**) |
| Theme | Dark mode, blue accents (`#0f172a` / `#3b82f6` / `#1e293b`), Inter, **French** UI |

### Monorepo layout
```
apps/web-client/         # Full-stack Next.js 16 app (UI + /api Route Handlers), port 3000
  src/app/api/**         #   API endpoints (was the Express server)
  src/server/**          #   server-only: prisma, jwt, auth/rbac, subscription, events(SSE), mock OCR
  prisma/                #   schema + migrations + seed (SQLite dev.db)
packages/fiscal-engine/  # SYSCOHADA + TVA/IRPP/IS + QBO bridge (real, tested)
packages/intuit-client/  # QuickBooks Online wrappers (mock transport)
legacy/                  # Archived previous prototype
```

---

## Running locally

Requires Node ≥ 20.

```bash
# 1. Install (workspaces)
npm install

# 2. Set up the database (SQLite) + seed demo data
npm run db:migrate      # creates apps/web-client/prisma/dev.db
npm run db:seed         # demo users, clients, SYSCOHADA plan, pending docs

# 3. Run the app (UI + API in one process)
npm run dev             # http://localhost:3000
```

Then open **http://localhost:3000**.

Build for production: `npm run build && npm run start`.
Reset the DB anytime: `npm run db:reset`.

### Demo accounts

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Manager (N+2) | manager@clever.cm | `Manager@1234` |
| Ressources Humaines | hr@clever.cm | `Hr@1234` |
| Collaborateur | employee@clever.cm | `Employee@1234` |
| Stagiaire | trainee@clever.cm | `Trainee@1234` |
| Client — Particulier | particulier@clever.cm | `Client@1234` |
| Client — Entreprise | entreprise@clever.cm | `Client@1234` |

The login page has one-click buttons for each.

---

## The demo flow (centerpiece)

1. Log in as **Manager** or **Collaborateur** → staff portal.
2. Click **« Simuler réception WhatsApp »** (dashboard or queue) — a receipt with **mock OCR** lands in the validation queue (the live counter ticks up via SSE).
3. Open the document → the **ValidationForm**: receipt preview on the left, editable extracted fields + a searchable **SYSCOHADA** dropdown on the right, with a confidence badge.
4. **Approuver** (or *Modifier et approuver*) → the record is **pushed to QuickBooks (mock)**, status becomes `Enregistré (QBO)`, and an entry is written to the **audit log**.
5. As a **Stagiaire**, the same form is **draft-only** (can correct, cannot validate).
6. As a **Client**, upload documents; the **Déclarant Solo** tier is capped at **30/month** → returns HTTP **402** with an upgrade prompt. Try the **tax simulator** (IRPP for individuals, TVA + IS for companies).

---

## What's real vs. démo

**Real (working logic):**
- 6-role RBAC (`MANAGER_N2 / HR / EMPLOYEE / TRAINEE / CLIENT_INDIVIDUAL / CLIENT_COMPANY`), enforced server-side via `requireRoles`
- JWT auth (15-min access + 7-day refresh, httpOnly cookies)
- SYSCOHADA fiscal engine (Class 1–9 mapping + fuzzy matcher) and TVA/IRPP/IS estimators — **unit-tested** (`npm test`)
- Document → validation → approval workflow (ValidationForm: needs-review banner, class-grouped SYSCOHADA dropdown, Ctrl+Enter, auto-advance), audit log, role-scoped data access
- Subscription-tier enforcement (30-doc/month cap → 402)
- Client document upload, dashboards, tax simulator
- Manager god-view dashboard (critical alerts, 30-day trend, activity feed, tier split)
- DB-backed secure chat (client ↔ assigned staff, polled every 10s)
- Guided client onboarding wizard (`/app/clients/new`, MANAGER only)

**Démo / placeholder (labelled "démo" in the UI):**
- WhatsApp ingestion → a **« Simuler réception »** button (no Meta webhook)
- Claude OCR → **mock extraction** (SYSCOHADA code still derived from the real engine)
- QuickBooks OAuth + push → **mock client** returning sample payloads
- Onboarding welcome WhatsApp message → **displayed text** (no Meta send)

**Not built yet** (per the spec's "don't build yet" list): Telegram, predictive cash-flow, fraud detection, multi-currency, BSN generator, performance matrix, full payroll — shown only as disabled **« bientôt »** nav items.

---

## Tests

```bash
npm test     # fiscal-engine: SYSCOHADA matcher + tax calculations (Vitest)
```

---

## Passer en version « server-backed » (next phase)

The local MVP is structured so the production path is incremental:

1. **Database** — change `apps/web-client/prisma/schema.prisma` `provider` to `postgresql`, point `DATABASE_URL` at Postgres, re-run migrations. The models are already Postgres-compatible.
2. **Queues** — replace the in-process event bus (`src/server/events.ts`) and inline OCR with **Redis + Bull** workers (`ocr-worker`, `qbo-push-worker`). With multiple app instances behind a load balancer, the SSE bus must move to Redis pub/sub.
3. **Real OCR** — swap `src/server/mockOcr.ts` for a Claude (`claude-haiku-4-5`) call using the receipt-extraction prompt; keep the same return shape.
4. **QuickBooks** — implement real OAuth2 + REST transport inside `@clever/intuit-client` behind the existing interface; supply `QBO_*` env vars.
5. **WhatsApp** — add the Meta webhook Route Handler (`app/api/webhook/whatsapp/route.ts`) with `X-Hub-Signature-256` validation feeding the same queue.
6. **Infra** — add Docker Compose + Nginx (see `…/Instructions/clever/infrastructure/CLAUDE.md`), TLS via Let's Encrypt.

---

## Environment

Local defaults work out of the box. To customise, edit `apps/web-client/.env` (DATABASE_URL, JWT secrets, upload limits). All external-service variables (`ANTHROPIC_API_KEY`, `WHATSAPP_*`, `QBO_*`, `REDIS_URL`) are **optional** for the local MVP and only needed in the server-backed phase.
