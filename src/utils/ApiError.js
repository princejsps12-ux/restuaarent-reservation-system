/**
 * Error with an attached HTTP status code. Throw these from controllers/services
 * and let the centralized error handler turn them into responses.
 */
class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'ApiError';
  }
}

module.exports = ApiError;
