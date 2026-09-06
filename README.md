# CRM System (Django + DRF) — Full Architecture

This is the Django/Django REST Framework counterpart to the FastAPI version:
same domain model, same business rules, same layered architecture — expressed
in Django idioms (ORM instead of SQLAlchemy, DRF serializers instead of
Pydantic, ViewSets instead of explicit route handlers).

Everything in this build was verified against a **real** PostgreSQL 16 +
Redis + Celery stack during development — not just imported, but actually
run: migrations applied, a live server hit with real HTTP requests (login,
create a deal, move it through stages, attempt to edit a closed deal,
verify a second tenant gets a 404), and a Celery worker consumed and
executed the async notification task. The included automated test suite
(`tests/test_deal_business_rules.py`) passes in full against a live test
database.

## Why this architecture?

```
Request → View (ViewSet) → Service (business logic) → ORM QuerySet → Database
                                    ↓
                         Serializer (DRF) for input/output validation
```

| Layer | Responsibility | Example |
|---|---|---|
| `views/` | HTTP only: parse request, delegate to Service, return response | `views/deal.py` |
| `services.py` | Business rules, transactions, orchestration | "A closed deal cannot be edited" |
| Django ORM | Tenant-scoped querysets | `Deal.objects.filter(organization_id=...)` |
| `models/` | Database table structure | `Deal`, `Contact`, `Stage` |
| `serializers/` | API input/output validation | `DealCreateSerializer`, `DealSerializer` |

Simple CRUD (Contact, Company) uses DRF's `ModelViewSet` directly with a
tenant-scoped `get_queryset()` — no service layer needed since there's no
business logic beyond "belongs to this org." `Deal` uses a plain `ViewSet`
backed by an explicit `DealService`, because deals have real business rules
(closed-deal lock, stage-transition validation) that deserve a layer of
their own, separate from HTTP concerns.

## Key architectural decisions

**1. Row-level multi-tenancy**
Every domain model inherits from `TenantModel` (`apps/core/models.py`),
which adds an `organization` FK. Every viewset's `get_queryset()` filters
by `request.user.organization_id` — this is the single most important line
in each viewset. Verified live: a second tenant querying another org's
deal by ID gets a `404`, and their list endpoint returns `[]`.

**2. Soft delete**
`TenantModel` also adds `is_deleted` / `deleted_at`. The default manager
(`objects`) hides soft-deleted rows automatically; `all_objects` is the
escape hatch for admin/reporting. Customer data is never actually deleted.

**3. Pipeline stage history (`DealStageHistory`)**
An append-only model logging every stage transition — verified live by
moving a deal through Lead → Qualified → Won and confirming the pipeline
board's aggregate counts updated correctly at each step.

**4. Celery for async work**
`@shared_task` in `apps/crm/tasks.py`, bootstrapped via `config/__init__.py`
importing the configured Celery app (the standard Django+Celery pattern —
skipping this import is a common bug where tasks bind to Celery's default
app instead of your configured broker). Verified live: the worker log shows
`notify_deal_stage_changed` actually executing after each stage move.

**5. JWT with embedded org/role claims**
A custom `TenantTokenObtainPairSerializer` (`apps/organizations/auth.py`)
adds `org`, `role`, and `email` claims to the token so every request can be
authorized without an extra database query. Confirmed live by decoding a
real issued token.

**6. RBAC**
`apps/core/permissions.py` provides `HasRole.roles(...)` for viewset-level
checks; the `Deal` viewset does an inline role check on `destroy()` since
it's the only action that needs it.

## Project structure

```
config/            settings, urls, wsgi/asgi, celery bootstrap
apps/
  organizations/    Organization + custom User model, JWT auth
  core/             abstract base models, permissions, pagination, middleware
  crm/
    models/         Company, Contact, Pipeline, Stage, Deal, Activity
    serializers/    DRF serializers per model
    views/          ViewSets
    services.py     DealService — business logic
    tasks.py        Celery tasks
    admin.py        Django admin registration
tests/              automated test suite
```

## Data model (core entities)

```
Organization (the company that owns the CRM)
  └── User (salesperson/team member, role-based)
  └── Company (customer's company)
        └── Contact (person associated with the company)
              └── Deal (sales opportunity)
                    └── Stage (position in a Pipeline)
                    └── Activity (call/meeting/task)
```

## Running locally

There are two ways to run this — pick one. Mixing them (e.g. running
`manage.py runserver` outside Docker while `.env` still has Docker's
hostnames) is the #1 cause of `could not translate host name "db"` /
`"redis"` errors.

### Path 1 — Docker (recommended, no local Postgres/Redis install needed)

```bash
cp .env.example .env
docker compose up --build

# In a new terminal:
docker compose exec api python manage.py migrate
docker compose exec api python manage.py createsuperuser
```

Leave `.env` as-is — `POSTGRES_HOST=db` and the `redis://redis:...` URLs
are correct here, because Docker's internal network resolves those
service names automatically.

### Path 2 — Local Python venv (no Docker)

You need PostgreSQL and Redis actually running on your machine first
(e.g. `brew install postgresql@16 redis && brew services start postgresql@16 redis`
on macOS). Then:

```bash
cp .env.example .env
```

**Edit `.env`** and change every Docker service name to `localhost`:
```
POSTGRES_HOST=localhost
CELERY_BROKER_URL=redis://localhost:6379/1
CELERY_RESULT_BACKEND=redis://localhost:6379/2
```

Then:
```bash
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

The API comes up at `http://localhost:8000/`. Django admin is at `/admin/`.
There's no `/register` endpoint — create your first user via
`createsuperuser` or the admin panel, then log in at `/api/v1/auth/login`.

## API endpoints

| Endpoint | Method | Notes |
|---|---|---|
| `/api/v1/auth/login` | POST | Returns `access` + `refresh` JWT |
| `/api/v1/auth/refresh` | POST | Rotates refresh token |
| `/api/v1/deals/` | GET, POST | List/create (tenant-scoped) |
| `/api/v1/deals/{id}/` | GET, PATCH, DELETE | DELETE is soft, RBAC-gated |
| `/api/v1/deals/{id}/move-stage/` | POST | `{"stage_id": "..."}` |
| `/api/v1/deals/pipeline/{id}/board/` | GET | Kanban summary per stage |
| `/api/v1/contacts/` | GET, POST, PATCH, DELETE | Full CRUD |
| `/api/v1/companies/` | GET, POST, PATCH, DELETE | Full CRUD |

## Running tests

```bash
python manage.py test
```

Covers: cross-tenant read isolation, cross-tenant list isolation, the
closed-deal edit lock, the closed-deal stage-move lock, and the
won-stage-closes-the-deal rule.

## What's still needed for real production use

Same scope boundary as the FastAPI version — this is the architectural
core, not a finished product:

- [ ] Full CRUD endpoints for `Activity`, `Pipeline`/`Stage` management
- [ ] Refresh token blacklist app (`rest_framework_simplejwt.token_blacklist`) wired in for real logout
- [ ] Rate limiting (DRF throttle classes)
- [ ] Full-text search (Postgres `SearchVector` or Elasticsearch)
- [ ] Full audit log (django-simple-history or custom)
- [ ] Webhooks for external integrations
- [ ] Import/export (CSV/Excel)
- [ ] Analytics/reporting beyond the basic pipeline board
- [ ] `django.contrib.postgres` `ArrayField`/`JSONField` GIN indexes for the `tags` and `custom_fields` columns at scale
- [ ] Observability: Sentry, structured logging, Prometheus metrics

## Differences from the FastAPI version worth knowing

- **Sync, not async.** Django's ORM here is synchronous (standard `psycopg2`,
  not `asyncpg`). Django does support async views/ORM, but mixing that with
  DRF and Celery adds complexity that isn't worth it unless you have a
  specific throughput requirement — this mirrors what most production
  Django+DRF stacks actually run.
- **Django admin comes free.** `apps/crm/admin.py` and
  `apps/organizations/admin.py` give you a working data-browsing UI with
  zero extra code — something the FastAPI version doesn't have an
  equivalent for.
- **Migrations are auto-generated** (`python manage.py makemigrations`)
  rather than hand-written Alembic scripts, which is faster for iteration
  but means less control over the exact SQL — a common Django/SQLAlchemy
  trade-off.
