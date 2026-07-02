# Restaurant Reservation Management System

A full-stack reservation system: customers book tables in fixed time slots,
admins manage every reservation.

- **Backend**: Node.js + Express + MongoDB (Mongoose) + JWT — deploys to **Render**
- **Frontend**: React + Vite + React Router — deploys to **Vercel**

## 🔗 Live demo & test accounts

- **Live app:** https://restuaarent-reservation-system.vercel.app
- **API:** https://restuaarent-reservation-system.onrender.com

Log in from the app's **Log in** page — the app routes you to the correct view
based on your role (no separate admin URL). Both accounts below are pre-seeded:

| Role | Email | Password |
|------|-------|----------|
| **Admin** | `admin@example.com` | `admin1234` |
| **Customer** | `customer@example.com` | `customer1234` |

You can also click **Register** to create your own customer account.

> ⏳ The backend runs on Render's free tier and sleeps after ~15 min idle, so the
> **first** login may take 30–50 seconds to wake up. Subsequent requests are fast.

```
.
├── src/                 Express backend (routes / controllers / models / middleware / config)
├── scripts/seed.js      Seeds 6 tables + one admin user
├── test/                Smoke test + REST client file
├── client/              React + Vite frontend
├── render.yaml          Optional Render Blueprint for the backend
└── README.md            You are here
```

---

## Setup instructions

### Local

**Prerequisites:** Node.js 18+, and a MongoDB instance (local `mongod` or a
MongoDB Atlas connection string).

**1. Backend**
```bash
# from the repo root
npm install
cp .env.example .env        # then edit .env
npm run seed                # inserts 6 tables + admin user
npm run dev                 # http://localhost:5000  (npm start for prod mode)
```

Backend `.env`:
```
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/restaurant_reservations
JWT_SECRET=some_long_random_string
JWT_EXPIRES_IN=7d
CORS_ORIGIN=                # leave empty locally (allows all origins)
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PASSWORD=admin1234
```

**2. Frontend**
```bash
cd client
npm install
cp .env.example .env        # VITE_API_URL=http://localhost:5000
npm run dev                 # http://localhost:5173
```

**3. Try it**
- Register a customer → book a table → view/cancel under *My Reservations*.
- Log in as the seeded admin (`admin@example.com` / `admin1234`) → filter,
  edit, and cancel any reservation.

**Quick backend smoke test** (server running + seeded, uses Git Bash):
```bash
bash test/smoke-test.sh
```

### Deploy

You create the Atlas cluster, Render service, and Vercel project. Do them in
this order — the backend must exist before you can point the frontend at it,
and the frontend URL must exist before you can lock down CORS.

#### Step 1 — MongoDB Atlas
1. Create a free (M0) cluster.
2. **Database Access** → add a database user (username + password).
3. **Network Access** → add IP `0.0.0.0/0` (allow from anywhere — Render's
   egress IPs aren't fixed on the free plan).
4. **Connect → Drivers** → copy the connection string. It looks like
   `mongodb+srv://<user>:<password>@cluster0.xxxx.mongodb.net/?retryWrites=true&w=majority`.
   Insert your password and add a database name before the `?`, e.g.
   `...mongodb.net/restaurant_reservations?retryWrites=true...`.

#### Step 2 — Backend on Render
1. Push this repo to GitHub.
2. Render → **New → Web Service** → connect the repo.
   - **Root Directory**: *(leave blank — backend is at the repo root)*
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/health`
   *(Or use the included `render.yaml` via New → Blueprint instead.)*
3. Set **Environment Variables** on Render:

   | Key | Value |
   |-----|-------|
   | `MONGO_URI` | your Atlas connection string from Step 1 |
   | `JWT_SECRET` | a long random string |
   | `JWT_EXPIRES_IN` | `7d` |
   | `CORS_ORIGIN` | *(fill in after Step 3 — your Vercel URL)* |

   > Do **not** set `PORT` yourself — Render injects it and the app reads
   > `process.env.PORT` automatically.
4. Deploy. Note the service URL, e.g. `https://restaurant-reservation-api.onrender.com`.
5. **Seed the production DB once.** The easiest way: open the Render service's
   **Shell** tab and run `npm run seed` (it reads the same `MONGO_URI`).
   Alternatively run it locally with `MONGO_URI` pointed at Atlas.
6. Verify: visit `https://<your-render-url>/health` → `{"status":"ok"}`.

#### Step 3 — Frontend on Vercel
1. Vercel → **Add New → Project** → import the same repo.
   - **Root Directory**: `client`
   - **Framework Preset**: Vite (auto-detected)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `dist` (default)
2. Set **Environment Variable** on Vercel:

   | Key | Value |
   |-----|-------|
   | `VITE_API_URL` | your Render backend URL, e.g. `https://restaurant-reservation-api.onrender.com` |

   > Vite inlines `VITE_*` vars at **build time**, so after changing it you
   > must **redeploy** for it to take effect.
3. Deploy. Note the frontend URL, e.g. `https://your-app.vercel.app`.
   The included `client/vercel.json` rewrites all routes to `index.html` so
   client-side routing (e.g. refreshing `/book`) works.

#### Step 4 — Close the CORS loop
1. Back on **Render**, set `CORS_ORIGIN` to your exact Vercel origin
   (no trailing slash), e.g. `https://your-app.vercel.app`.
   - Multiple origins? Comma-separate them:
     `https://your-app.vercel.app,https://your-app-git-main.vercel.app`.
2. Render redeploys. The backend now accepts requests only from that origin
   (requests with no `Origin` header — curl, health checks — are still allowed).

---

## Assumptions made

- **Time slots are fixed** at `18:00, 19:00, 20:00, 21:00`. A reservation
  occupies a whole slot; there is no configurable duration or opening-hours
  model.
- **One reservation = one whole table.** No shared/combined tables or partial
  seating; a party simply needs a table whose capacity ≥ guest count.
- **Dates are calendar days** stored as `YYYY-MM-DD` strings interpreted in the
  **server's local timezone**. "Not in the past" is evaluated against the
  server clock, not the user's.
- **Roles are assigned server-side.** Registration always creates a `customer`;
  the only admin is the one created by the seed script (or promoted directly in
  the DB). The client cannot self-register as admin.
- **Seed is authoritative for tables.** `npm run seed` wipes and recreates the
  6 tables each run (capacities 2, 2, 4, 4, 6, 8) and upserts the admin.
- **JWT in `localStorage`** is an acceptable trade-off for this scope (simple,
  no refresh-token flow). See *Known limitations*.
- **Atlas network access is open (`0.0.0.0/0`)** because Render's free plan has
  no static egress IP to allowlist.

---

## Reservation & availability logic

### Fixed time slots
Both the backend (`src/config/constants.js`) and frontend (`client/src/config.js`)
define the same list: `['18:00','19:00','20:00','21:00']`. A reservation is
uniquely scoped by the tuple **{ table, date, timeSlot }**.

### Creating a reservation
`POST /api/reservations` validates in this exact order, each returning its own
status code (see `src/controllers/reservationController.js`):

1. `date` is not in the past → **400**
2. `guests > 0` → **400**
3. `timeSlot` is one of the fixed slots → **400**
4. the chosen table exists (**404**) and its `capacity >= guests` → **400**
5. no existing **active** reservation for the same `{table, date, timeSlot}` → **409**

### The unique partial index (race-condition guard)
Step 5's `findOne` check has a time-of-check/time-of-use gap: two concurrent
requests could both pass it and then both insert. To make the "one active
booking per slot" rule atomic at the database level, the Reservation model
declares:

```js
reservationSchema.index(
  { table: 1, date: 1, timeSlot: 1 },
  { unique: true, partialFilterExpression: { status: 'active' } }
);
```

- The index is **partial** — it only applies to documents where
  `status: 'active'`. That means a slot can hold **one** active reservation,
  but any number of *cancelled* ones (so a cancelled booking never blocks a
  rebooking of the same slot).
- If two requests race, MongoDB lets only one insert succeed; the other throws
  a **duplicate-key error (code 11000)**.

### 409 handling
Duplicate-key errors are caught in two places and converted to a clean
**409 Conflict** with a human-readable message
(`"That table is already booked for this date and time slot"`):
- the `try/catch` around `Reservation.create` / `.save()` in the controller, and
- the centralized error handler (`src/middleware/errorHandler.js`), which maps
  any `err.code === 11000` to 409 as a backstop.

The admin update path (`PATCH /api/reservations/:id`) re-runs the same capacity
and active-conflict checks before saving, so an admin can't edit a reservation
into a double-booking.

### Availability
`GET /api/tables/available?date=&timeSlot=&guests=` returns bookable tables:
it collects the table IDs already taken by an **active** reservation in that
`{date, timeSlot}`, then returns every table **not** in that set whose
`capacity >= guests`. This is what powers the customer booking screen.

---

## Role-based access (User vs Admin)

Two roles live on the `User` model: `customer` (default) and `admin`.

- **Authentication** — `src/middleware/auth.js` verifies the `Bearer` JWT,
  loads the user, and attaches it to `req.user`. Missing/invalid/expired tokens
  → **401**.
- **Authorization** — `requireRole('admin')` runs after `auth` and returns
  **403** if `req.user.role` isn't `admin`.

| Capability | Customer | Admin |
|-----------|:--------:|:-----:|
| Register / log in | ✅ | ✅ |
| Create a reservation (`POST /api/reservations`) | ✅ | ✅ |
| See **own** reservations (`GET /api/reservations/me`) | ✅ | ✅ |
| Cancel a reservation (`PATCH /:id/cancel`) | own only | any |
| See **all** reservations (`GET /api/reservations?date=`) | ❌ 403 | ✅ |
| Update any reservation (`PATCH /api/reservations/:id`) | ❌ 403 | ✅ |
| Manage tables (list/create/update/delete) | ❌ 403 | ✅ |

- Cancel is a shared route: the controller allows it if the caller is the
  **owner** of the reservation *or* an admin; otherwise **403**.
- On the frontend, `ProtectedRoute` enforces the same split — customers land on
  `/book`, admins on `/admin`, and each is redirected away from the other's
  pages. This is UX only; the backend is the real authority.
- Roles are never accepted from the registration request body, so a user cannot
  make themselves an admin through the API.

---

## Known limitations

- **JWT in `localStorage`** is readable by any JS on the page, so it's
  vulnerable to XSS token theft. There is no refresh-token rotation or
  server-side revocation — a leaked token is valid until it expires.
- **Timezone is the server's.** "Past date" and calendar-day boundaries use the
  server clock, which can differ from the user's. A slot near midnight in
  another timezone may behave unexpectedly.
- **No pagination.** The admin "all reservations" endpoint returns everything;
  it won't scale to large datasets.
- **No rate limiting / lockout** on auth endpoints — brute-forcing login isn't
  throttled.
- **Seeding wipes tables.** `npm run seed` deletes and recreates all tables, so
  re-running it against a live DB is destructive to table records (reservations
  reference table IDs that would change).
- **No automated test suite** beyond the shell smoke test — no unit/integration
  tests in CI.
- **No email/verification, password reset, or account management.**
- **Free-tier cold starts.** Render's free web service sleeps when idle, so the
  first request after inactivity is slow (and can make the initial login feel
  laggy).
- **CORS credentials.** Auth uses a Bearer header (not cookies), so credentialed
  CORS isn't configured; switching to cookie auth would need `credentials: true`
  and matching frontend config.

---

## Areas for improvement with more time

- **Tests**: Jest + Supertest for the controllers (especially the conflict/409
  path and RBAC), and React Testing Library for the booking flow; wire into CI.
- **Refresh tokens + httpOnly cookies** to remove tokens from `localStorage`,
  plus logout/revocation.
- **Timezone correctness**: store an explicit restaurant timezone and compute
  "past" and day boundaries against it.
- **Richer availability model**: configurable opening hours, per-slot durations,
  combinable tables, and buffers between sittings.
- **Admin UX**: pagination, search by customer, sorting, and a create-on-behalf
  flow; surface capacity conflicts inline.
- **Validation layer**: schema validation (e.g. Zod/Joi) on all request bodies
  for consistent 400s and less hand-rolled checking.
- **Observability**: structured logging, request IDs, and error tracking
  (e.g. Sentry).
- **Rate limiting** on `/api/auth/*` and general hardening (helmet, input
  sanitization).
- **CI/CD**: lint + test + build gates on PRs; preview deployments.
- **Dockerize** backend and frontend for reproducible environments.

---

## API reference (quick)

All bodies are JSON; authenticated routes need `Authorization: Bearer <token>`.

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/api/auth/register` | none | `{ name, email, password }` → `{ user, token }` |
| POST | `/api/auth/login` | none | `{ email, password }` → `{ user, token }` |
| POST | `/api/reservations` | customer/admin | `{ table, date, timeSlot, guests }` |
| GET | `/api/reservations/me` | customer/admin | own reservations |
| PATCH | `/api/reservations/:id/cancel` | owner/admin | set status `cancelled` |
| GET | `/api/tables/available?date=&timeSlot=&guests=` | any user | bookable tables |
| GET | `/api/reservations?date=` | admin | all reservations, optional date filter |
| PATCH | `/api/reservations/:id` | admin | update any reservation |
| GET | `/api/tables` | admin | list all tables |
| POST | `/api/tables` | admin | create a table `{ number, capacity }` |
| PATCH | `/api/tables/:id` | admin | update a table |
| DELETE | `/api/tables/:id` | admin | delete a table (blocked if it has active reservations) |

**Status codes:** `201` created · `400` validation · `401` no/bad token ·
`403` wrong role · `404` not found · `409` conflict.
