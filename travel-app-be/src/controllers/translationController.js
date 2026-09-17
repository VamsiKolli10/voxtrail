const { sanitizeTextInput, normalizeLangPair } = require("../utils/validation");
const {
  createErrorResponse,
  ERROR_CODES,
  logError,
} = require("../utils/errorHandler");
const { getCached, setCached } = require("../utils/cache");
const { chatComplete } = require("../lib/openrouterClient");

const SUPPORTED_PAIRS = new Set([
  "en-es",
  "en-fr",
  "en-de",
  "es-en",
  "es-fr",
  "es-de",
  "fr-en",
  "fr-es",
  "fr-de",
  "de-en",
  "de-es",
  "de-fr",
]);

const MAX_TEXT_LENGTH = Number(process.env.MAX_TRANSLATION_CHARS || 500);
const TRANSLATION_CACHE_TTL_MS = Number(
  process.env.TRANSLATION_CACHE_TTL_MS || 10 * 60 * 1000
);
// Historically this bounded local model inference before falling back to
// OpenRouter. OpenRouter is now the only translation path, so this simply
// bounds how long we wait on the provider before treating it as a failure.
const TRANSLATION_REQUEST_TIMEOUT_MS = Number(
  process.env.TRANSLATION_INFERENCE_TIMEOUT_MS || 20000
);
const CAN_TRANSLATE = Boolean(process.env.OPENROUTER_API_KEY);

const LANG_LABELS = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
};

function getTranslationCacheKey(text, langPair) {
  return `${langPair}::${text}`;
}

function getLangLabel(code = "") {
  const normalized = String(code || "").toLowerCase();
  return LANG_LABELS[normalized] || normalized || "unknown";
}

async function withTimeout(promise, timeoutMs, label) {
  let timeoutHandle = null;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutHandle = setTimeout(
      () => reject(new Error(`${label} timed out after ${timeoutMs}ms`)),
      timeoutMs
    );
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

// Translation runs entirely through OpenRouter. A prior version of this
// service also ran a local Hugging Face/Xenova translation model inside the
// Cloud Function, but that fought the serverless execution model: loading a
// model into memory added ~29s to every cold start and consumed far more of
// the Functions free tier (billed by memory x duration) than a fast,
// stateless API call does. See ADR-EVAL-1 for the full reasoning -- for a
// low-traffic, cost-sensitive deployment a lightweight proxy call is both
// simpler and cheaper than keeping a model warm.
async function translateViaOpenRouter(text, langPair) {
  const [source, target] = (langPair || "").split("-");
  const system = `You are a precise translation engine. Translate strictly from ${getLangLabel(
    source
  )} to ${getLangLabel(
    target
  )}. Return only the translated text with no quotes, no preamble, and preserve punctuation.`;
  const user = `Text to translate:\n"""${text}"""`;

  const raw = await withTimeout(
    chatComplete({ system, user, temperature: 0 }),
    TRANSLATION_REQUEST_TIMEOUT_MS,
    "Translation request"
  );

  const cleaned = (raw || "").trim().replace(/^["'\s]+|["'\s]+$/g, "") || "";

  if (!cleaned) {
    throw new Error("Translation returned an empty result");
  }

  return cleaned;
}

exports.translateText = async (req, res) => {
  const rawText = req.body?.text;
  const rawLangPair = req.body?.langPair;

  try {
    if (!CAN_TRANSLATE) {
      return res.status(503).json(
        createErrorResponse(
          503,
          ERROR_CODES.SERVICE_UNAVAILABLE,
          "Translation is not configured: OPENROUTER_API_KEY is missing"
        )
      );
    }

    const cleanText = sanitizeTextInput(rawText, {
      maxLength: MAX_TEXT_LENGTH,
      label: "text",
    });
    if (cleanText.error) {
      return res
        .status(400)
        .json(
          createErrorResponse(400, ERROR_CODES.VALIDATION_ERROR, cleanText.error)
        );
    }

    const normalizedPair = normalizeLangPair(rawLangPair, SUPPORTED_PAIRS);
    if (normalizedPair.error) {
      return res
        .status(400)
        .json(
          createErrorResponse(
            400,
            ERROR_CODES.VALIDATION_ERROR,
            normalizedPair.error
          )
        );
    }

    const cacheKey = getTranslationCacheKey(
      cleanText.value,
      normalizedPair.value
    );
    const cached = getCached("translation", cacheKey);
    if (cached) {
      return res.json({ translation: cached, provider: "cache" });
    }

    const translation = await translateViaOpenRouter(
      cleanText.value,
      normalizedPair.value
    );

    setCached("translation", cacheKey, translation, TRANSLATION_CACHE_TTL_MS);
    res.json({ translation, provider: "openrouter" });
  } catch (err) {
    const errorContext = {
      endpoint: "/api/translate",
      textLength: rawText?.length || 0,
      langPair: rawLangPair || "unknown",
      nodeEnv: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    };
    logError(err, errorContext);

    if (err.message?.includes("timed out")) {
      return res.status(503).json(
        createErrorResponse(
          503,
          "SERVICE_TIMEOUT",
          "Translation service is slow - please try again"
        )
      );
    }

    if (
      err.message?.includes("network") ||
      err.message?.includes("Network") ||
      err.message?.includes("ENOTFOUND") ||
      err.message?.includes("ECONNREFUSED")
    ) {
      return res.status(502).json(
        createErrorResponse(
          502,
          "NETWORK_ERROR",
          "Translation provider is unreachable - please check your connection"
        )
      );
    }

    res.status(500).json(
      createErrorResponse(
        500,
        ERROR_CODES.EXTERNAL_SERVICE_ERROR,
        "Translation failed",
        process.env.NODE_ENV === "development"
          ? { originalError: err.message, stack: err.stack }
          : undefined
      )
    );
  }
};

// Health check endpoint for translation service
exports.healthCheck = async (req, res) => {
  const health = {
    status: CAN_TRANSLATE ? "healthy" : "unhealthy",
    service: "translation",
    provider: "openrouter",
    timestamp: new Date().toISOString(),
  };

  if (!CAN_TRANSLATE) {
    health.error = {
      code: "NOT_CONFIGURED",
      message: "OPENROUTER_API_KEY is missing",
    };
  }

  const statusCode = health.status === "healthy" ? 200 : 503;
  res.status(statusCode).json(health);
};
