const ApiError = require('../utils/ApiError');

// 404 handler for unmatched routes.
function notFound(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

/* eslint-disable no-unused-vars */
// Centralized error handler. Must keep 4 args so Express treats it as an error handler.
function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';

  // Mongoose validation errors -> 400
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map((e) => e.message).join(', ');
  }

  // Invalid ObjectId in a path param -> 404
  if (err.name === 'CastError') {
    statusCode = 404;
    message = 'Resource not found';
  }

  // Duplicate key (e.g. the active-reservation unique index) -> 409
  if (err.code === 11000) {
    statusCode = 409;
    message = 'Resource already exists';
  }

  if (statusCode >= 500) {
    console.error(err);
  }

  res.status(statusCode).json({ error: message });
}

module.exports = { notFound, errorHandler };
