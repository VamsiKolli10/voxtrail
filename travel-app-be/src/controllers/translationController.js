const { sanitizeTextInput, normalizeLangPair } = require("../utils/validation");
const {
  createErrorResponse,
  ERROR_CODES,
  logError,
} = require("../utils/errorHandler");
const { getCached, setCached } = require("../utils/cache");
const {
  chatComplete,
  AiNotConfiguredError,
} = require("../lib/openrouterClient");
const { translateWithGoogle } = require("../lib/googleTranslate");
const {
  TRANSLATION_LANGUAGES,
  SUPPORTED_PAIRS,
} = require("../config/translationLanguages");

const MAX_TEXT_LENGTH = Number(process.env.MAX_TRANSLATION_CHARS || 500);
const TRANSLATION_CACHE_TTL_MS = Number(
  process.env.TRANSLATION_CACHE_TTL_MS || 10 * 60 * 1000
);
// Upper bound on one provider call before it counts as a failure.
const TRANSLATION_REQUEST_TIMEOUT_MS = Number(
  process.env.TRANSLATION_INFERENCE_TIMEOUT_MS || 20000
);
const GOOGLE_TRANSLATE_TIMEOUT_MS = Number(
  process.env.GOOGLE_TRANSLATE_TIMEOUT_MS || 8000
);

// Provider selection (ADR-003). Read per request so config changes apply
// without a code change and tests can switch providers.
//   TRANSLATION_PROVIDER = google (default) | openrouter
//   TRANSLATION_FALLBACK = openrouter (default) | none
function getProviderPlan() {
  const primary =
    (process.env.TRANSLATION_PROVIDER || "google").toLowerCase() ===
    "openrouter"
      ? "openrouter"
      : "google";
  const fallbackSetting = (
    process.env.TRANSLATION_FALLBACK || "openrouter"
  ).toLowerCase();
  const hasOpenRouter = Boolean(process.env.OPENROUTER_API_KEY);
  const chain = [primary];
  if (
    primary === "google" &&
    fallbackSetting === "openrouter" &&
    hasOpenRouter
  ) {
    chain.push("openrouter");
  }
  return chain.filter((p) => p !== "openrouter" || hasOpenRouter);
}

function getTranslationCacheKey(text, langPair) {
  return `${langPair}::${text}`;
}

function getLangLabel(code = "") {
  const normalized = String(code || "").toLowerCase();
  return TRANSLATION_LANGUAGES[normalized] || normalized || "unknown";
}

async function withTimeout(operation, timeoutMs, label) {
  let timeoutHandle = null;
  const controller = new AbortController();
  const timeoutPromise = new Promise((_, reject) => {
    timeoutHandle = setTimeout(
      () => {
        reject(new Error(`${label} timed out after ${timeoutMs}ms`));
        controller.abort();
      },
      timeoutMs
    );
  });

  try {
    return await Promise.race([operation(controller.signal), timeoutPromise]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

// Translation goes through hosted APIs, never an in-function model:
// docs/adr/000-translation-via-hosted-api.md explains why a local model was
// removed (cold starts and memory cost). Cloud Translation is the primary
// provider; OpenRouter is the fallback (docs/adr/003-ai-provider-strategy.md).
async function translateViaOpenRouter(text, langPair) {
  const [source, target] = (langPair || "").split("-");
  const system = `You are a precise translation engine. Translate strictly from ${getLangLabel(
    source
  )} to ${getLangLabel(
    target
  )}. Return only the translated text with no quotes, no preamble, and preserve punctuation.`;
  const user = `Text to translate:\n"""${text}"""`;

  const raw = await withTimeout(
    (signal) =>
      chatComplete({ system, user, temperature: 0, max_tokens: 400, signal }),
    TRANSLATION_REQUEST_TIMEOUT_MS,
    "Translation request"
  );

  const cleaned = (raw || "").trim().replace(/^["'\s]+|["'\s]+$/g, "") || "";

  if (!cleaned) {
    throw new Error("Translation returned an empty result");
  }

  return cleaned;
}

async function translateViaGoogle(text, langPair) {
  const [source, target] = langPair.split("-");
  return withTimeout(
    (signal) => translateWithGoogle({ text, source, target, signal }),
    Math.min(GOOGLE_TRANSLATE_TIMEOUT_MS, TRANSLATION_REQUEST_TIMEOUT_MS),
    "Translation request"
  );
}

const PROVIDERS = {
  google: translateViaGoogle,
  openrouter: translateViaOpenRouter,
};

async function translateWithFallback(text, langPair) {
  const plan = getProviderPlan();
  let lastError;
  for (const [index, provider] of plan.entries()) {
    try {
      const translation = await PROVIDERS[provider](text, langPair);
      return { translation, provider };
    } catch (err) {
      lastError = err;
      if (index < plan.length - 1) {
        logError(err, {
          endpoint: "/api/translate",
          provider,
          fallback: plan[index + 1],
        });
      }
    }
  }
  throw lastError;
}

exports.translateText = async (req, res) => {
  const rawText = req.body?.text;
  const rawLangPair = req.body?.langPair;

  try {
    if (getProviderPlan().length === 0) {
      return res.status(503).json(
        createErrorResponse(
          503,
          ERROR_CODES.SERVICE_UNAVAILABLE,
          "Translation is not configured: TRANSLATION_PROVIDER=openrouter needs OPENROUTER_API_KEY"
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

    const { translation, provider } = await translateWithFallback(
      cleanText.value,
      normalizedPair.value
    );

    setCached("translation", cacheKey, translation, TRANSLATION_CACHE_TTL_MS);
    res.json({ translation, provider });
  } catch (err) {
    const errorContext = {
      endpoint: "/api/translate",
      textLength: rawText?.length || 0,
      langPair: rawLangPair || "unknown",
      nodeEnv: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    };
    logError(err, errorContext);

    if (err instanceof AiNotConfiguredError) {
      return res.status(503).json(
        createErrorResponse(
          503,
          ERROR_CODES.SERVICE_UNAVAILABLE,
          "Translation is temporarily unavailable"
        )
      );
    }

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
  const providers = getProviderPlan();
  const health = {
    status: providers.length ? "healthy" : "unhealthy",
    service: "translation",
    provider: providers[0] || null,
    fallback: providers[1] || null,
    timestamp: new Date().toISOString(),
  };

  if (!providers.length) {
    health.error = {
      code: "NOT_CONFIGURED",
      message: "TRANSLATION_PROVIDER=openrouter needs OPENROUTER_API_KEY",
    };
  }

  const statusCode = health.status === "healthy" ? 200 : 503;
  res.status(statusCode).json(health);
};

exports.SUPPORTED_PAIRS = SUPPORTED_PAIRS;
