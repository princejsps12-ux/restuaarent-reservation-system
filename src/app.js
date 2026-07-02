const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const reservationRoutes = require('./routes/reservationRoutes');
const tableRoutes = require('./routes/tableRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

// CORS: in production, restrict to the deployed frontend origin(s).
// CORS_ORIGIN is a comma-separated list (e.g. "https://your-app.vercel.app").
// If unset, all origins are allowed — convenient for local dev only.
// Trailing slashes are stripped so "https://x.app" and "https://x.app/" both match.
const normalizeOrigin = (o) => o.trim().replace(/\/+$/, '');

const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map(normalizeOrigin)
  .filter(Boolean);

const corsOptions =
  allowedOrigins.length > 0
    ? {
        origin(origin, callback) {
          // Allow non-browser clients (curl, health checks) with no Origin header.
          if (!origin || allowedOrigins.includes(normalizeOrigin(origin))) {
            return callback(null, true);
          }
          return callback(new Error(`Origin ${origin} not allowed by CORS`));
        },
      }
    : {}; // no CORS_ORIGIN set -> allow all (dev default)

app.use(cors(corsOptions));
app.use(express.json());

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/tables', tableRoutes);

// 404 + centralized error handling (must come last)
app.use(notFound);
app.use(errorHandler);

module.exports = app;
