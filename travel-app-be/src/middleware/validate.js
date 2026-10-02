const { ZodError } = require("zod");
const { createErrorResponse, ERROR_CODES } = require("../utils/errorHandler");

function formatZodErrors(error) {
  const issues = Array.isArray(error.issues)
    ? error.issues
    : Array.isArray(error.errors)
    ? error.errors
    : [];

  if (!issues.length) {
    return [error.message || "Invalid request payload"];
  }

  return issues.map((issue) => {
    const path = Array.isArray(issue.path)
      ? issue.path.join(".")
      : String(issue.path || "");
    return path ? `${path}: ${issue.message}` : issue.message;
  });
}

function buildValidator(schema, target = "body") {
  return (req, res, next) => {
    try {
      const payload =
        target === "query"
          ? req.query
          : target === "params"
          ? req.params
          : req.body;
      const parsed = schema.parse(payload ?? {});

      if (target === "query") {
        // Express 5 exposes query through a getter; assignment silently drops
        // coercions, defaults and stripped fields. Shadow it for downstream code.
        Object.defineProperty(req, "query", {
          value: parsed, writable: true, configurable: true, enumerable: true,
        });
      } else if (target === "params") {
        req.params = parsed;
      } else {
        req.body = parsed;
      }

      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json(
            createErrorResponse(
              400,
              ERROR_CODES.VALIDATION_ERROR,
              "Invalid request payload",
              { issues: formatZodErrors(error) }
            )
          );
      }
      return next(error);
    }
  };
}

const validateBody = (schema) => buildValidator(schema, "body");
const validateQuery = (schema) => buildValidator(schema, "query");
const validateParams = (schema) => buildValidator(schema, "params");

module.exports = { validateBody, validateQuery, validateParams };
