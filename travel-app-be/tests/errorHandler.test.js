const { expressErrorHandler, createErrorResponse } = require("../src/utils/errorHandler");

test("controller database/provider diagnostics are excluded from server failures", () => {
  expect(createErrorResponse(502, "EXTERNAL_SERVICE_ERROR", "Provider failed", { detail: "private provider payload" }))
    .toEqual({ status: "error", error: { code: "EXTERNAL_SERVICE_ERROR", message: "Provider failed" } });
  expect(createErrorResponse(400, "VALIDATION_ERROR", "Invalid input", { field: "text" }).error.details)
    .toEqual({ field: "text" });
});

test("internal failures do not expose secrets in public responses", () => {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  expressErrorHandler(new Error("private database configuration"), { originalUrl: "/test", method: "GET" }, res, jest.fn());
  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.json).toHaveBeenCalledWith({ status: "error", error: { code: "INTERNAL_ERROR", message: "Internal Server Error" } });
});

test("provider response bodies are excluded from public errors", () => {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const error = Object.assign(new Error("provider error"), { response: { status: 400, data: { secret: "private" } } });
  expressErrorHandler(error, { originalUrl: "/test", method: "GET" }, res, jest.fn());
  expect(res.json.mock.calls[0][0].error).toEqual({ code: "EXTERNAL_SERVICE_ERROR", message: "External service error" });
});
