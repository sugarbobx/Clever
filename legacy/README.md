# Clever — Client Portal

**TheCleverest Consulting S.A.R.L** · Yaoundé, Cameroun

A full-stack bilingual (French / English) client portal for requesting and receiving official fiscal documents (NIU, RCCM, etc.). Built with React 18 + Vite on the front end and Node.js + Express + SQLite on the back end.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS v4, React Router v6, Axios |
| Backend | Node.js v24, Express, JWT (24 h), Multer |
| Database | SQLite via `node:sqlite` (built-in, no native compilation) |
| PDF generation | PDFKit |
| Email | Resend (falls back to `console.log` if no API key) |
| Charts | Recharts |

---

## Running the project

```bash
# Terminal 1 — API server (port 5000)
cd server
node server.js

# Terminal 2 — Dev server (port 5173)
cd client
npm run dev
```

Seed data is loaded automatically on server start.

### Default accounts

| Role | Email | Password |
|------|-------|----------|
| Super Admin | superadmin@thecleverest.com | SuperAdmin@1234 |
| Agent | agent@thecleverest.com | Agent@1234 |
| Client (particulier) | particulier@test.com | Client@1234 |
| Client (entreprise) | entreprise@test.com | Client@1234 |

---

## Features

### Client portal (`/dashboard`)

- **Bilingual UI** — toggle between French and English via the navbar button; preference saved to `localStorage`
- **Account types** — *Particulier* (A1, individual) and *Entreprise* (A2, company) with different dashboard layouts
- **New request modal** — 3-step flow: choose document → upload supporting files (drag & drop, PDF/JPG/PNG, max 5 MB) → mock mobile-money payment (MTN / Orange)
- **Request list** (`/requests`) — paginated, searchable, filterable by status; shows assigned agent name; clear button; smart back-navigation
- **Request detail** (`/requests/:id`) — live SLA countdown, progress tracker, document download, invoice PDF download (paid requests), cancel (pending only), resubmit shortcut, activity log, direct messaging with assigned agent
- **My Documents** (`/documents`) — central page listing all delivered files across all requests; one-click download
- **Notifications** (`/notifications`) — grouped by Today / Yesterday / This week / Older; mark-all-read
- **Profile** (`/profile`) — edit name & phone; recent requests with CTA when empty
- **Company profile** (`/company`) — business name, legal form, RCCM, NIU, sector, tax regime (entreprise only)
- **Security** (`/security`) — password change with strength meter (enforces uppercase + digit), 2FA setup via TOTP (QR code + manual key)
- **Onboarding banner** — shown once on first login; dismissible

### Agent portal (`/agent`)

- **Processing queue** — two tabs: *My Assignments* / *Unassigned*; search/filter; filtered tab count badges; refresh button; shows request age on unassigned rows
- **Request management** (`/agent/requests/:id`) — client info, company info, submitted documents, SLA countdown, status update (warns before marking Livré without a deliverable), internal note, deliverable upload (auto-changes status → Livré), activity log, client messaging panel, priority badge
- **Tab memory** — navigating back from a request returns to the correct tab (assigned / unassigned)

### Super Admin / Root Admin portal (`/admin`)

- **Dashboard** — KPI cards (revenue, requests, delivery rate, top document) + quick-access links
- **All requests** (`/admin/requests`) — full list with multi-filter (status, agent, text search), bulk status update, CSV export, pagination
- **Request management** (`/admin/requests/:id`) — manage status, reassign agent, internal note, deliverable upload, full client & company info
- **Document catalogue** (`/admin/catalogue`) — add / edit / activate / deactivate service types; code, label, description, price, required uploads, account-type availability (A1 / A2 / both)
- **Routing rules** (`/admin/routing`) — auto-assign documents to agents by type; live workload indicator
- **Team management** (`/admin/team`) — add agents, activate / deactivate; workload display
- **Analytics** (`/admin/analytics`) — monthly revenue bar chart, document-type pie chart, top-clients table (Recharts)
- **CSV export** — download all requests as a spreadsheet

### Root (V1) portal (`/root`)

Legacy portal accessible to `root_admin`; same data via `/admin/*` API. Pages: dashboard, request list, employee list, routing rules, profile.

---

## Architecture

### Auto-assignment

On request creation, the system tries (in order):

1. Routing rule for the document type → if agent is active and has < 15 open requests
2. Least-loaded active agent (round-robin by workload)
3. Super admin as final fallback

### Notifications

In-app notifications for: request submitted, status changed, document delivered, SLA breached, agent assigned, message received. Delivered via server-side SSE polling every 30 s in `NotificationBell`.

### SLA

Every request gets a 48 h deadline. A cron job runs daily at 08:00, notifies assigned agents (in-app + email) for overdue requests, and marks them `sla_notified = 1` to prevent daily re-spam.

### Security

- JWT authentication (24 h expiry)
- Rate limiting on `/auth/login` and `/auth/register` (20 req / 15 min)
- TOTP 2FA (optional, per user)
- Input sanitisation on all text fields (HTML tag stripping)
- Role-based access control: `client`, `agent`, `super_admin`, `root_admin`

---

## Project structure

```
Clever/
├── server/
│   ├── db/
│   │   ├── database.js      # Schema + migrations
│   │   └── seed.js          # Demo data
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   └── uploadMiddleware.js
│   ├── routes/
│   │   ├── auth.js          # Login, register, profile, 2FA
│   │   ├── requests.js      # CRUD + status + deliverables + invoice PDF
│   │   ├── notifications.js
│   │   ├── catalogue.js     # Public catalogue endpoint
│   │   ├── documents.js     # Client delivered-documents endpoint
│   │   ├── messages.js      # Client–agent messaging
│   │   ├── files.js         # Secure file download
│   │   └── admin/
│   │       ├── analytics.js
│   │       ├── catalogue.js
│   │       ├── routing.js
│   │       └── team.js
│   ├── services/
│   │   ├── email.js         # Resend / console fallback
│   │   └── slaCron.js       # Daily SLA breach checker
│   └── server.js
│
├── client/
│   └── src/
│       ├── i18n/
│       │   └── translations.js   # All FR + EN strings
│       ├── context/
│       │   ├── AuthContext.jsx
│       │   ├── LanguageContext.jsx
│       │   └── ToastContext.jsx
│       ├── components/
│       │   ├── Navbar.jsx        # FR/EN toggle, role-aware links
│       │   ├── AccountMenu.jsx
│       │   ├── NotificationBell.jsx
│       │   ├── MessagePanel.jsx
│       │   ├── NewRequestModal.jsx
│       │   ├── StatusBadge.jsx
│       │   └── Skeleton.jsx
│       └── pages/
│           ├── Dashboard.jsx
│           ├── RequestList.jsx
│           ├── RequestDetail.jsx
│           ├── MyDocumentsPage.jsx
│           ├── ProfilePage.jsx
│           ├── CompanyProfilePage.jsx
│           ├── SecurityPage.jsx
│           ├── NotificationsPage.jsx
│           ├── agent/
│           │   ├── AgentDashboard.jsx
│           │   └── AgentManageRequest.jsx
│           ├── admin/
│           │   ├── AdminDashboard.jsx
│           │   ├── AdminRequestList.jsx
│           │   ├── AdminManageRequest.jsx
│           │   ├── CatalogueManager.jsx
│           │   ├── RoutingRules.jsx
│           │   ├── TeamManager.jsx
│           │   └── Analytics.jsx
│           └── root/
│               ├── RootDashboard.jsx
│               ├── RootRequestList.jsx
│               ├── EmployeeList.jsx
│               ├── RoutingRules.jsx
│               └── RootProfile.jsx

---

## Colours

| Token | Hex | Usage |
|-------|-----|-------|
| Primary | `#1A3C34` | Navbar, buttons, headings |
| Dark | `#122B25` | Button hover |
| Accent | `#C9A03A` | Gold highlights, CTAs |
| Background | `#F7F6F2` | Page background |
| Text | `#1C1C1C` | Body text |
