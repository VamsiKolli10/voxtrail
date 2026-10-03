const axios = require("axios");

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
// Model selection is configuration only (docs/adr/003-ai-provider-strategy.md):
//   OPENROUTER_MODEL_CHAIN="vendor/model-a,vendor/model-b"  (ordered fallbacks)
//   OPENROUTER_MODEL="vendor/model"                         (legacy primary)
// There is no built-in fallback: the old implicit "gpt-4o-mini" was not a
// valid OpenRouter ID (they are vendor-prefixed), so it always 404'd.
// Free (":free") variants share a small account-wide daily allowance and can
// lose all endpoints without notice; production skips them unless
// OPENROUTER_ALLOW_FREE_MODELS=true.
const isProduction = () =>
  !["test", "development"].includes(process.env.NODE_ENV);

const warned = new Set();
function warnOnce(message) {
  if (warned.has(message)) return;
  warned.add(message);
  console.warn(`[OpenRouter] ${message}`);
}

function getModelChain() {
  const configured = (process.env.OPENROUTER_MODEL_CHAIN || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const legacyPrimary = (process.env.OPENROUTER_MODEL || "").trim();
  if (legacyPrimary) {
    // OPENROUTER_MODEL is the primary; the chain supplies fallbacks.
    const index = configured.indexOf(legacyPrimary);
    if (index !== -1) configured.splice(index, 1);
    configured.unshift(legacyPrimary);
  }

  const allowFree =
    !isProduction() || process.env.OPENROUTER_ALLOW_FREE_MODELS === "true";

  return configured.filter((model) => {
    if (!model.includes("/")) {
      warnOnce(
        `Ignoring model "${model}": OpenRouter IDs are vendor-prefixed (e.g. "openai/${model}").`
      );
      return false;
    }
    if (model.endsWith(":free") && !allowFree) {
      warnOnce(
        `Ignoring free model "${model}" in production (shared daily cap). Set OPENROUTER_ALLOW_FREE_MODELS=true to override.`
      );
      return false;
    }
    return true;
  });
}

// Auth/permission errors (401/403) and bad requests won't succeed on another
// model, so they stop the chain. Unavailable/removed models and transient
// provider errors fall through to the next model.
const RETRYABLE_STATUS = new Set([404, 408, 429, 500, 502, 503, 504]);
const DEFAULT_MAX_TOKENS = Number(process.env.OPENROUTER_MAX_TOKENS || 1500);

class AiNotConfiguredError extends Error {
  constructor() {
    super(
      "No usable AI model configured. Set OPENROUTER_MODEL_CHAIN to vendor-prefixed model IDs."
    );
    this.name = "AiNotConfiguredError";
    this.code = "AI_NOT_CONFIGURED";
  }
}

/**
 * Enhanced error logging with more details
 */
function logOpenRouterError(error, model, attempt) {
  const status = error?.response?.status;
  const message =
    error?.response?.data?.error?.message || error?.message || "Unknown error";
  const details = {
    model,
    attempt,
    status,
    message,
    timestamp: new Date().toISOString(),
    url: OPENROUTER_API_URL,
  };

  console.error(
    `[OpenRouter Error] ${model} (attempt ${attempt}): ${status} - ${message}`
  );

  // Log additional response details if available
  if (error?.response?.data) {
    console.error(
      `[OpenRouter Response]`,
      JSON.stringify(error.response.data, null, 2)
    );
  }

  return details;
}

/**
 * chatComplete
 * - Enhanced with better error handling and diagnostics
 * - Ensures response_format is provider-compatible:
 *   - "json_object" (string) -> { type: "json_object" } (object)
 *   - anything else -> omit (safer across providers)
 */
async function chatComplete({
  system,
  user,
  temperature = 0.4,
  response_format = undefined,
  max_tokens = DEFAULT_MAX_TOKENS,
  signal,
}) {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("Missing OPENROUTER_API_KEY in environment");
  }

  const headers = {
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    "Content-Type": "application/json",
    // Optional but recommended by OpenRouter:
    "HTTP-Referer": "https://voxtrail.local",
    "X-Title": "VoxTrail",
  };

  // Build request body
  const baseBody = {
    temperature,
    max_tokens,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  };

  // ✅ Provider-safe response_format handling
  if (response_format === "json_object") {
    baseBody.response_format = { type: "json_object" };
    // Some providers (like Azure) require the word "json" in the user message
    // when using json_object response format
    if (typeof baseBody.messages[1]?.content === "string") {
      baseBody.messages[1].content += " Respond in JSON format.";
    }
  } else if (typeof response_format === "object" && response_format !== null) {
    // Allow passing an object directly if you ever need to
    baseBody.response_format = response_format;
  }
  // else: omit response_format entirely

  const MODEL_CHAIN = getModelChain();
  if (MODEL_CHAIN.length === 0) {
    throw new AiNotConfiguredError();
  }

  let lastError;
  let attempt = 0;

  console.log(
    `[OpenRouter] Starting request with ${MODEL_CHAIN.length} models in chain`
  );

  for (const model of MODEL_CHAIN) {
    attempt++;
    const body = { ...baseBody, model };

    console.log(
      `[OpenRouter] Attempt ${attempt}/${MODEL_CHAIN.length}: Trying model ${model}`
    );

    try {
      const { data } = await axios.post(OPENROUTER_API_URL, body, {
        headers,
        timeout: Number(process.env.OPENROUTER_TIMEOUT_MS || 30000),
        maxContentLength: 256 * 1024,
        maxBodyLength: 256 * 1024,
        signal,
      });

      const text = data?.choices?.[0]?.message?.content || "";
      console.log(`[OpenRouter] Success with model ${model}`);
      return text;
    } catch (err) {
      // Preserve context for the eventual throw
      lastError = err;
      if (signal?.aborted) throw err;
      const status = err?.response?.status;
      const retryable = !err.response || RETRYABLE_STATUS.has(status);

      // Log the error with details
      logOpenRouterError(err, model, attempt);

      if (!retryable) {
        console.error(
          `[OpenRouter] Non-retryable error with ${model}, stopping retries`
        );
        throw err;
      }

      // Log retry attempt
      if (attempt < MODEL_CHAIN.length) {
        console.log(`[OpenRouter] Retrying with next model in chain...`);
      }

      // otherwise try the next model in the chain
    }
  }

  console.error(`[OpenRouter] All models failed, throwing last error`);
  throw (
    lastError ||
    new Error("OpenRouter request failed - all models in chain returned errors")
  );
}

module.exports = {
  chatComplete,
  getModelChain,
  AiNotConfiguredError,
  RETRYABLE_STATUS,
};
