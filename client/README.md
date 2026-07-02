# Restaurant Reservation — Frontend (React + Vite)

Simple, functional UI for the reservation backend.

## Setup

```bash
cd client
npm install
cp .env.example .env      # optional — defaults to http://localhost:5000
npm run dev               # http://localhost:5173
```

`VITE_API_URL` points at the backend. If unset, the app falls back to
`http://localhost:5000`.

Make sure the backend is running and seeded first (see the root README).

## What's included

- **Auth**: register + login pages. JWT stored in `localStorage`
  (`rrs_token`), attached as `Authorization: Bearer …` on every API call.
- **Role-aware routing**: after login, customers land on **Book**, admins on
  the **Admin Dashboard**. Routes are guarded by role.
- **Customer**
  - *Book*: pick date / time slot / guests → find available tables
    (`GET /api/tables/available`) → confirm (`POST /api/reservations`).
  - *My Reservations*: list own bookings, cancel active ones.
- **Admin** (visually distinct, purple accents)
  - Table of all reservations, filter by date.
  - Cancel or inline-edit (date / slot / guests / status) any reservation.
- **Errors**: backend messages (409 "already booked", 400 capacity/past-date)
  are shown inline. Loading states on every async action.

## Structure

```
src/
  api/client.js         fetch wrapper (base URL + JWT + error parsing)
  context/AuthContext.jsx
  components/           Navbar, ProtectedRoute
  pages/                Login, Register, BookReservation, MyReservations, AdminDashboard
  config.js             fixed time slots (mirror of backend)
  styles.css
```
