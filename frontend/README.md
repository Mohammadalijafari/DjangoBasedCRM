# Ledger — CRM Frontend (React 19 + Vite)

A React 19 + Vite frontend for the [Django/DRF CRM backend](../crm-django),
built around a deliberate visual identity — a sales register, not a generic
SaaS dashboard — and verified end-to-end with a real browser (Playwright)
against a live Django + PostgreSQL + Redis + Celery stack.

## Design: "Ledger, not dashboard"

The subject is an internal sales tool reps and managers live in all day —
it needs density, speed, and trustworthiness, not marketing flash. The
design leans into an accounting-ledger metaphor rather than the generic
SaaS-card-kit look:

| Token | Value | Use |
|---|---|---|
| `--paper` | `#f6f4ee` | App background |
| `--ink` | `#1b2b22` | Body text (green-black, not pure black) |
| `--forest` | `#2f6f4e` | Primary actions, active nav |
| `--brass` | `#b8763a` | Pending/attention accents |
| `--brick` | `#a23b3b` | Destructive actions |
| `--line` | `#dad5c7` | Hairline borders (used instead of card shadows) |

Typefaces: **Fraunces** (display/headings — ledger character) + **IBM Plex
Sans** (UI/body — dense data, clean tabular figures for money). Deal
amounts are right-aligned with `font-variant-numeric: tabular-nums`, like
an account book. Kanban cards are index cards with hairline borders, not
uniform rounded shadow-cards. Status reads via a colored total, not badge
pills scattered everywhere.

## What's actually built

- **Login** — JWT auth against `/api/v1/auth/login`, session persisted in
  `localStorage`, automatic access-token refresh on `401` via an axios
  interceptor (concurrent requests share one refresh call, not one each).
- **Deals** — kanban board grouped by pipeline stage, native HTML5
  drag-and-drop to move a deal between stages (calls
  `POST /deals/{id}/move-stage/`), optimistic UI update via React Query
  with rollback on error, create/edit/delete in a side drawer. Closed
  deals are visibly locked (matches the backend's "closed deal cannot be
  edited" rule) and are not draggable.
- **Contacts** / **Companies** — searchable, paginated tables (real DRF
  pagination — see note below) with create/edit/delete drawers.
- **Protected routing** — `react-router` v7 with a route guard that
  redirects to `/login` and remembers where you were headed.

## A bug this build caught (and fixed) in the backend

While wiring up the kanban board, the pipeline list came back empty even
though the API returned `200`. The cause: Django REST Framework's default
`PageNumberPagination` wraps **every** `ModelViewSet` list response in
`{count, next, previous, results: [...]}` — but the hand-written
`DealViewSet.list()` in the backend returns a raw array (it never calls
DRF's pagination helper), so the two endpoints were inconsistent.

Fixed on both sides, for the right reasons rather than papering over it:
- **Pipelines** are small, bounded reference data — the frontend always
  wants the complete list, so pagination is disabled on that viewset
  (`pagination_class = None`) rather than the frontend faking "fetch all
  pages."
- **Contacts/Companies** are genuinely large tables where pagination is
  the right behavior — so the frontend properly unwraps `.results` and
  has real Previous/Next controls (see `src/pages/Contacts.tsx`), and
  dropdowns that need the "whole list" (e.g. picking a company on a deal)
  request a larger `page_size` explicitly rather than assuming no limit.

This was caught by actually running both apps together and clicking
through the UI with Playwright — not by inspecting the code — which is
exactly the kind of cross-service mismatch that's invisible until you run
the real integration.

## Verified end-to-end (not just "it builds")

Run live against a real Django + PostgreSQL + Redis + Celery stack, using
Playwright with an actual Chromium browser:

1. Load `/login`, log in with real credentials → redirected to `/deals`
2. Kanban board renders real stages (Lead/Qualified/Won) and real deals
3. Opening a **closed** deal shows the lock banner and disables editing
   (this deal was closed by the backend's own test suite in an earlier
   session — the frontend correctly reflects backend-owned state)
4. Created a new deal, **dragged it** from Lead → Qualified via native
   HTML5 drag-and-drop → backend confirmed the move, column totals updated
5. Created a new contact and a new company through the drawers → both
   appeared in their tables immediately (real `POST` + refetch, not mocked)
6. Reloaded the page → session persisted (JWT in `localStorage` survives
   a refresh)
7. Signed out → redirected to `/login`, protected routes now inaccessible

`npm run build` also passes clean: `tsc -b && vite build` with zero
TypeScript errors, producing a 336 KB (107 KB gzipped) bundle.

## Project structure

```
src/
  api/          axios client (JWT + refresh), typed resource functions
  auth/         AuthContext, ProtectedRoute
  components/   AppShell (sidebar/topbar), Drawer, shared ui primitives
  pages/        Login, Deals (+ DealDrawer), Contacts (+ ContactDrawer),
                Companies (+ CompanyDrawer)
  types/        TypeScript interfaces matching the DRF serializers
```

State/data approach: **TanStack Query** owns all server state (caching,
refetch, optimistic updates) — there's no separate global store, because
almost everything in this app *is* server state. Local component state
(`useState`) is used only for form fields and UI toggles (which drawer is
open, current search text).

## Running locally

Point at an already-running backend (see the Django project's README for
how to start it):

```bash
npm install
cp .env.example .env   # defaults to http://localhost:8000/api/v1
npm run dev
```

Opens at `http://localhost:5173`.

### With Docker

```bash
docker compose up --build
```

Serves the production build via Nginx at `http://localhost:5173`. Set
`VITE_API_URL` before building if your backend isn't at the default:

```bash
VITE_API_URL=https://api.yourcrm.com/api/v1 docker compose up --build
```

Note: Vite bakes `VITE_*` env vars in at **build time**, not runtime — if
you need the same built image to work against different backend URLs per
environment, that requires either building per-environment or switching
to a runtime-injected config (e.g., a small `config.json` fetched on
load). Not implemented here; flagging it as a real constraint rather than
leaving it implicit.

## What's still needed for real production use

- [ ] Activities (calls/meetings/tasks) UI — the backend model exists, no
      frontend screen yet
- [ ] Pipeline/Stage management UI — currently admin-only (Django admin)
- [ ] Refresh-token expiry handling beyond the first refresh (if the
      refresh token itself expires mid-session, the user is bounced to
      `/login` with no "your session expired" messaging)
- [ ] Toast/notification system for success states (currently the drawer
      just closes — no confirmation toast)
- [ ] Accessibility pass beyond the basics already in place (visible
      focus rings, `role="dialog"` + `aria-modal` on drawers) — full
      keyboard navigation through the kanban board's drag-and-drop isn't
      implemented (HTML5 DnD is mouse-only by nature; a keyboard
      alternative like "select deal, then pick a stage from a menu" would
      be needed for full accessibility)
- [ ] Runtime-configurable API URL (see Docker note above) for true
      build-once-deploy-everywhere
- [ ] Automated frontend test suite (the Playwright script used for
      verification during development, `e2e_test.js`, is a manual dev
      tool — not wired into CI as a proper test suite with assertions)
