// Error codes
const ERROR_CODES = {
  // Generic errors
  INTERNAL_ERROR: "INTERNAL_ERROR",
  NOT_FOUND: "NOT_FOUND",
  BAD_REQUEST: "BAD_REQUEST",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  METHOD_NOT_ALLOWED: "METHOD_NOT_ALLOWED",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",

  // Database errors
  DB_ERROR: "DB_ERROR",
  DB_NOT_FOUND: "DB_NOT_FOUND",

  // Validation errors
  VALIDATION_ERROR: "VALIDATION_ERROR",

  // External service errors
  EXTERNAL_SERVICE_ERROR: "EXTERNAL_SERVICE_ERROR",
  EXTERNAL_SERVICE_TIMEOUT: "EXTERNAL_SERVICE_TIMEOUT",

  // CORS errors
  CORS_ERROR: "CORS_ERROR",

  // Custom application errors
  // Add as needed for specific application errors
  CUSTOM_ERROR: "CUSTOM_ERROR",
};

// Standardized error response format
const createErrorResponse = (status, code, message, details = null) => {
  const response = {
    status: "error",
    error: {
      code,
      message,
    },
  };
  if (details && (status < 500 || process.env.NODE_ENV === "development")) {
    response.error.details = details;
  }
  return response;
};

// Error logging with context
const logError = (error, context = {}) => {
  const errorContext = {
    message: error.message,
    stack: error.stack,
    ...context,
  };
  console.error("Error occurred:", errorContext);
};

// Middleware for Express error handling
const expressErrorHandler = (err, req, res, next) => {
  let status = err.status || err.statusCode || 500;
  let code = ERROR_CODES.INTERNAL_ERROR;
  let message = "Internal Server Error";
  let details = null;

  // Handle CORS errors
  if (err.message === "Not allowed by CORS") {
    status = 403;
    code = ERROR_CODES.CORS_ERROR;
    message = "CORS: Origin not allowed";
  }

  // Handle specific error types
  if (err.name === "ValidationError") {
    status = 400;
    code = ERROR_CODES.VALIDATION_ERROR;
    message = "Validation Error";
    details = err.details;
  } else if (err.name === "CastError") {
    status = 400;
    code = ERROR_CODES.BAD_REQUEST;
    message = "Invalid ID format";
  } else if (err.name === "MongoError" || err.name === "MongoServerError") {
    status = 500;
    code = ERROR_CODES.DB_ERROR;
    message = "Database error";
  } else if (err.name === "JsonWebTokenError") {
    status = 401;
    code = ERROR_CODES.UNAUTHORIZED;
    message = "Invalid token";
  } else if (err.name === "TokenExpiredError") {
    status = 401;
    code = ERROR_CODES.UNAUTHORIZED;
    message = "Token expired";
  } else if (err.response && err.response.status) {
    // Handle Axios errors
    status = err.response.status;
    code = ERROR_CODES.EXTERNAL_SERVICE_ERROR;
    message = "External service error";
    details = err.response.data;
  } else if (err.status || err.statusCode) {
    // Use provided status code
    status = err.status || err.statusCode;
    message = err.message;
  } else if (err.message) {
    // Use error message
    message = err.message;
  }

  // Log error with context
  logError(err, { url: req.originalUrl, method: req.method });

  // Provider bodies and internal exception messages can contain credentials,
  // prompts or database details. Keep them in diagnostics, not public responses.
  if (process.env.NODE_ENV !== "development") {
    if (status >= 500) message = "Internal Server Error";
    if (err.response || status >= 500) details = null;
  }

  // Send error response
  res.status(status).json(createErrorResponse(status, code, message, details));
};

module.exports = {
  ERROR_CODES,
  createErrorResponse,
  logError,
  expressErrorHandler,
};
