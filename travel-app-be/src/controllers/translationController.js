const fs = require("fs");
const path = require("path");
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

const translatorCache = new Map();
const MAX_TEXT_LENGTH = Number(process.env.MAX_TRANSLATION_CHARS || 500);
const DEFAULT_WARM_PAIRS = (
  process.env.FUNCTIONS_EMULATOR === "true"
    ? ""
    : process.env.TRANSLATION_WARM_PAIRS || ""
)
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);
const TRANSLATION_CACHE_TTL_MS = Number(
  process.env.TRANSLATION_CACHE_TTL_MS || 10 * 60 * 1000
);
const TRANSLATION_INFERENCE_TIMEOUT_MS = Number(
  process.env.TRANSLATION_INFERENCE_TIMEOUT_MS || 20000
);
const TRANSLATION_FALLBACK_ENABLED =
  String(process.env.TRANSLATION_FALLBACK_ENABLED || "true").toLowerCase() !==
  "false";
const CAN_USE_FALLBACK =
  TRANSLATION_FALLBACK_ENABLED && Boolean(process.env.OPENROUTER_API_KEY);

const LANG_LABELS = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
};
// Determine cache directory - Firebase Functions require /tmp, other environments can use custom path
// Firebase Functions v1 sets FUNCTION_TARGET, v2 sets K_SERVICE, also check for GCP_PROJECT
const isFirebaseFunction = !!(
  process.env.FUNCTION_TARGET ||
  process.env.K_SERVICE ||
  process.env.GCP_PROJECT ||
  process.env.GCLOUD_PROJECT ||
  // Check if we're in a Cloud Functions environment by checking for typical paths
  process.cwd().includes("/user_code") ||
  process.env.HOME === "/tmp"
);
const getCacheDir = () => {
  // For Firebase Functions, always force /tmp (only writable directory)
  if (isFirebaseFunction) {
    const fromEnv = process.env.TRANSFORMERS_CACHE;
    if (fromEnv && fromEnv.startsWith("/tmp")) {
      return fromEnv;
    }
    return path.join("/tmp", "transformers");
  }
  // If explicitly set, use that (highest priority) in non-functions environments
  if (process.env.TRANSFORMERS_CACHE) {
    return process.env.TRANSFORMERS_CACHE;
  }
  // For other environments, try TMPDIR or default to /tmp
  return path.join(process.env.TMPDIR || "/tmp", "transformers");
};

const DEFAULT_MODEL_CACHE = getCacheDir();

function ensureModelCacheDir() {
  try {
    // Ensure parent directories exist
    fs.mkdirSync(DEFAULT_MODEL_CACHE, { recursive: true });

    // Verify write permissions by creating a test file
    const testFile = path.join(DEFAULT_MODEL_CACHE, ".write-test");
    try {
      fs.writeFileSync(testFile, "test");
      fs.unlinkSync(testFile);
    } catch (writeErr) {
      throw new Error(
        `Cache directory ${DEFAULT_MODEL_CACHE} is not writable: ${writeErr.message}`
      );
    }

    // Set environment variables for transformers library
    process.env.TRANSFORMERS_CACHE = DEFAULT_MODEL_CACHE;
    process.env.HF_HOME = DEFAULT_MODEL_CACHE;
    process.env.HF_HUB_CACHE = path.join(DEFAULT_MODEL_CACHE, "hub");

    console.log(
      `✅ Translation cache directory initialized: ${DEFAULT_MODEL_CACHE}`
    );
  } catch (err) {
    // Log error but don't throw - allow the app to start
    // Model loading will fail later with a clearer error message
    logError(err, {
      endpoint: "translation:cache:init",
      cache: DEFAULT_MODEL_CACHE,
      isFirebaseFunction: !!isFirebaseFunction,
      tmpdir: process.env.TMPDIR,
    });
    console.error(
      `⚠️  Failed to initialize translation cache directory: ${err.message}. ` +
        `Translation models may fail to load. Cache dir: ${DEFAULT_MODEL_CACHE}`
    );
  }
}
ensureModelCacheDir();

async function getTranslator(langPair) {
  if (!SUPPORTED_PAIRS.has(langPair)) {
    throw new Error(`Unsupported langPair: ${langPair}`);
  }

  if (!translatorCache.has(langPair)) {
    const loader = (async () => {
      let timeoutHandle = null;
      let modelPromise = null;

      try {
        console.log(`🔄 Loading translation model for ${langPair}...`);
        const { pipeline } = await import("@huggingface/transformers");

        // Create model loading promise
        modelPromise = pipeline("translation", `Xenova/opus-mt-${langPair}`);

        // Add timeout for model loading (increased to 90s for production)
        const timeoutMs = Number(
          process.env.TRANSLATION_MODEL_TIMEOUT_MS || 90000
        );
        const timeoutPromise = new Promise((_, reject) => {
          timeoutHandle = setTimeout(
            () => reject(new Error("Model loading timeout")),
            timeoutMs
          );
        });

        const model = await Promise.race([modelPromise, timeoutPromise]);

        // Clear timeout if model loaded successfully
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
          timeoutHandle = null;
        }

        console.log(`✅ Successfully loaded model for ${langPair}`);
        return model;
      } catch (error) {
        // Clean up timeout
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
          timeoutHandle = null;
        }

        console.error(
          `❌ Failed to load model for ${langPair}:`,
          error.message
        );

        // Remove the cached promise so a transient failure does not brick the route
        translatorCache.delete(langPair);

        // Provide helpful error context
        if (
          error.message?.includes("network") ||
          error.message?.includes("fetch") ||
          error.message?.includes("ENOTFOUND") ||
          error.message?.includes("ECONNREFUSED")
        ) {
          throw new Error(
            `Model download failed: ${error.message}. This may be due to network restrictions in the production environment. Ensure the cache directory (${DEFAULT_MODEL_CACHE}) is writable.`
          );
        } else if (
          error.message?.includes("timeout") ||
          error.message?.includes("Timeout")
        ) {
          throw new Error(
            `Model loading timeout: The translation model took too long to load (${timeoutMs}ms). This may happen on cold starts in serverless environments. Consider warming up models or increasing FUNCTION_TIMEOUT.`
          );
        } else if (
          error.message?.includes("EACCES") ||
          error.message?.includes("permission denied") ||
          error.message?.includes("not writable")
        ) {
          throw new Error(
            `Cache directory permission error: ${error.message}. The cache directory ${DEFAULT_MODEL_CACHE} must be writable. In Firebase Functions, use /tmp.`
          );
        } else {
          throw new Error(`Model loading error: ${error.message}`);
        }
      }
    })();

    translatorCache.set(langPair, loader);
  }

  return translatorCache.get(langPair);
}

// Best-effort warmup for configured pairs on startup
async function warmDefaultPairs() {
  if (!DEFAULT_WARM_PAIRS.length) return;
  await Promise.allSettled(
    DEFAULT_WARM_PAIRS.map((pair) =>
      SUPPORTED_PAIRS.has(pair) ? getTranslator(pair) : null
    )
  );
}
warmDefaultPairs().catch((e) =>
  logError(e, { endpoint: "translation:warmup:init" })
);

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
      () =>
        reject(new Error(`${label} timed out after ${timeoutMs}ms`)),
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

async function translateWithOpenRouter(text, langPair) {
  if (!CAN_USE_FALLBACK) {
    throw new Error("Translation fallback is disabled or misconfigured");
  }

  const [source, target] = (langPair || "").split("-");
  const system = `You are a precise translation engine. Translate strictly from ${getLangLabel(
    source
  )} to ${getLangLabel(
    target
  )}. Return only the translated text with no quotes, no preamble, and preserve punctuation.`;
  const user = `Text to translate:\n"""${text}"""`;

  const raw = await chatComplete({
    system,
    user,
    temperature: 0,
  });

  const cleaned =
    (raw || "")
      .trim()
      .replace(/^["'\s]+|["'\s]+$/g, "") || "";

  if (!cleaned) {
    throw new Error("Fallback translation returned an empty result");
  }

  return cleaned;
}

exports.translateText = async (req, res) => {
  const rawText = req.body?.text;
  const rawLangPair = req.body?.langPair;
  let translation = null;
  let provider = "local";
  let primaryError = null;
  let fallbackError = null;

  try {
    const cleanText = sanitizeTextInput(rawText, {
      maxLength: MAX_TEXT_LENGTH,
      label: "text",
    });
    if (cleanText.error) {
      return res
        .status(400)
        .json(
          createErrorResponse(
            400,
            ERROR_CODES.VALIDATION_ERROR,
            cleanText.error
          )
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

    try {
      const translatorPromise = getTranslator(normalizedPair.value);
      let translator;
      try {
        translator = await translatorPromise;
      } catch (err) {
        translatorCache.delete(normalizedPair.value);
        throw err;
      }

      const result = await withTimeout(
        translator(cleanText.value),
        TRANSLATION_INFERENCE_TIMEOUT_MS,
        "Translation inference"
      );
      translation = result[0]?.translation_text || "";
    } catch (err) {
      primaryError = err;
      translatorCache.delete(normalizedPair.value);

      if (CAN_USE_FALLBACK) {
        try {
          translation = await translateWithOpenRouter(
            cleanText.value,
            normalizedPair.value
          );
          provider = "openrouter";
          console.warn(
            `⚠️  Fell back to OpenRouter translation for ${normalizedPair.value}`
          );
        } catch (fallbackErr) {
          fallbackError = fallbackErr;
          logError(fallbackErr, {
            endpoint: "/api/translate",
            stage: "fallback",
            langPair: normalizedPair.value,
          });
        }
      }

      if (!translation) {
        throw primaryError;
      }
    }

    if (!translation) {
      throw new Error("Translation produced an empty result");
    }

    setCached("translation", cacheKey, translation, TRANSLATION_CACHE_TTL_MS);
    res.json({ translation, provider });
  } catch (err) {
    // Enhanced error logging for production debugging
    const errorContext = {
      endpoint: "/api/translate",
      textLength: rawText?.length || 0,
      langPair: rawLangPair || "unknown",
      providerAttempted: provider,
      fallbackEnabled: CAN_USE_FALLBACK,
      primaryError: primaryError?.message,
      fallbackError: fallbackError?.message,
      nodeEnv: process.env.NODE_ENV,
      memoryUsage: process.memoryUsage(),
      timestamp: new Date().toISOString(),
    };

    logError(err, errorContext);

    // Provide more specific error messages for common issues
    let userMessage = "Translation failed";
    let errorCode = ERROR_CODES.EXTERNAL_SERVICE_ERROR;

    if (
      err.message?.includes("model") ||
      err.message?.includes("transformers")
    ) {
      userMessage =
        "Translation model unavailable - please try again in a moment";
      errorCode = "MODEL_UNAVAILABLE";
    } else if (
      err.message?.includes("timeout") ||
      err.message?.includes("Timeout") ||
      err.code === "ETIMEDOUT"
    ) {
      userMessage = "Translation service is slow - please try again";
      errorCode = "SERVICE_TIMEOUT";
      // Return 503 for timeout scenarios (service unavailable)
      return res.status(503).json(
        createErrorResponse(
          503,
          errorCode,
          userMessage,
          process.env.NODE_ENV === "development"
            ? {
                originalError: err.message,
                stack: err.stack,
              }
            : undefined
        )
      );
    } else if (
      err.message?.includes("network") ||
      err.message?.includes("Network") ||
      err.message?.includes("ENOTFOUND") ||
      err.message?.includes("ECONNREFUSED")
    ) {
      userMessage = "Network error - please check your connection";
      errorCode = "NETWORK_ERROR";
    } else if (
      err.message?.includes("EACCES") ||
      err.message?.includes("permission denied") ||
      err.message?.includes("not writable") ||
      err.message?.includes("Cache directory")
    ) {
      userMessage =
        "Translation service configuration error - please contact support";
      errorCode = "CONFIGURATION_ERROR";
    }

    res.status(500).json(
      createErrorResponse(
        500,
        errorCode,
        userMessage,
        process.env.NODE_ENV === "development"
          ? {
              originalError: err.message,
              stack: err.stack,
            }
          : undefined
      )
    );
  }
};

exports.warmup = async (req, res) => {
  try {
    const pairs = (req.query.pairs || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const warmed = [];
    const failed = [];

    for (const p of pairs) {
      if (SUPPORTED_PAIRS.has(p)) {
        try {
          await getTranslator(p);
          warmed.push(p);
          console.log(`✅ Warmed up model: ${p}`);
        } catch (error) {
          failed.push({ pair: p, error: error.message });
          console.log(`❌ Failed to warm up model ${p}:`, error.message);
        }
      }
    }

    res.json({
      warmed,
      failed,
      totalRequested: pairs.length,
      totalWarmed: warmed.length,
    });
  } catch (err) {
    logError(err, { endpoint: "/api/translate/warmup" });
    res
      .status(500)
      .json(
        createErrorResponse(
          500,
          ERROR_CODES.EXTERNAL_SERVICE_ERROR,
          "Warmup failed"
        )
      );
  }
};

// Health check endpoint for translation service
exports.healthCheck = async (req, res) => {
  try {
    const health = {
      status: "healthy",
      service: "translation",
      timestamp: new Date().toISOString(),
      models: {
        loaded: Array.from(translatorCache.keys()),
        total: translatorCache.size,
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        memoryUsage: process.memoryUsage(),
        cacheDir: process.env.TRANSFORMERS_CACHE || "default",
      },
    };

    // Test a simple model if none are loaded
    if (translatorCache.size === 0) {
      try {
        await getTranslator("en-es");
        health.models.loaded = ["en-es"];
        health.models.total = 1;
        health.warning = "No models were pre-loaded, tested en-es on-demand";
      } catch (error) {
        health.status = "unhealthy";
        health.error = {
          code: "NO_MODELS_AVAILABLE",
          message: error.message,
        };
      }
    }

    const statusCode = health.status === "healthy" ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (err) {
    logError(err, { endpoint: "/api/translate/health" });
    res.status(503).json({
      status: "unhealthy",
      service: "translation",
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
};
