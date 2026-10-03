const { z } = require("zod");

const toNumber = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  const num = Number(value);
  return Number.isNaN(num) ? undefined : num;
};

const envSchema = z
  .object({
    NODE_ENV: z.string().optional(),
    CORS_ALLOWED_ORIGINS: z.string().optional(),
    FB_ADMIN_CREDENTIALS: z.string().optional(),
    FIREBASE_ADMIN_CREDENTIALS: z.string().optional(),
    GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),
    GCLOUD_PROJECT: z.string().optional(),
    GCP_PROJECT: z.string().optional(),
    K_SERVICE: z.string().optional(),
    FUNCTION_TARGET: z.string().optional(),
    OPENROUTER_API_KEY: z.string().optional(),
    OPENROUTER_MODEL: z.string().optional(),
    OPENROUTER_MODEL_CHAIN: z.string().optional(),
    OPENROUTER_ALLOW_FREE_MODELS: z.string().optional(),
    TRANSLATION_PROVIDER: z.enum(["google", "openrouter"]).optional(),
    TRANSLATION_FALLBACK: z.enum(["openrouter", "none"]).optional(),
    GOOGLE_PLACES_API_KEY: z.string().optional(),
    RATE_LIMIT_WINDOW_MS: z
      .preprocess(toNumber, z.number().int().positive().optional()),
    RATE_LIMIT_MAX: z
      .preprocess(toNumber, z.number().int().positive().optional()),
    RATE_LIMIT_ANONYMOUS_MAX: z
      .preprocess(toNumber, z.number().int().positive().optional()),
    APP_CHECK_ENFORCE: z
      .preprocess((v) => (v === undefined || v === "" ? undefined : String(v).toLowerCase() === "true"), z.boolean().optional()),
    REQUEST_BODY_LIMIT: z.string().optional(),
    READINESS_TIMEOUT_MS: z
      .preprocess(toNumber, z.number().int().positive().max(10_000).optional()),
    MAX_TRANSLATION_CHARS: z
      .preprocess(toNumber, z.number().int().positive().optional()),
  })
  .refine(
    (value) =>
      Boolean(
        value.FB_ADMIN_CREDENTIALS ||
          value.FIREBASE_ADMIN_CREDENTIALS ||
          value.GOOGLE_APPLICATION_CREDENTIALS ||
          value.K_SERVICE ||
          value.FUNCTION_TARGET ||
          value.GCLOUD_PROJECT ||
          value.GCP_PROJECT
      ),
    {
      message:
        "Firebase Admin credentials or a managed Google Cloud runtime are required",
      path: ["FB_ADMIN_CREDENTIALS"],
    }
  );

const parsed = envSchema.parse(process.env);

const normalizeList = (raw = "") =>
  String(raw)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

const env = {
  ...parsed,
  CORS_ALLOWED_ORIGIN_LIST: normalizeList(parsed.CORS_ALLOWED_ORIGINS),
};

module.exports = env;
