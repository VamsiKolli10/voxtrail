const axios = require("axios");

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const FALLBACK_MODEL = "gpt-4o-mini";

function buildModelChain() {
  const chain = [];

  // Preferred: comma-separated chain
  const configuredChain = (process.env.OPENROUTER_MODEL_CHAIN || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  chain.push(...configuredChain);

  // Legacy: single primary model
  const legacyPrimary = (process.env.OPENROUTER_MODEL || "").trim();
  if (legacyPrimary && !chain.includes(legacyPrimary)) {
    chain.unshift(legacyPrimary);
  }

  // Preserve the legacy fallback. This model can incur provider charges.
  if (!chain.includes(FALLBACK_MODEL)) {
    chain.push(FALLBACK_MODEL);
  }

  return chain;
}

const MODEL_CHAIN = buildModelChain();
// Treat model unavailability/permission errors as retryable so we fall back
const RETRYABLE_STATUS = new Set([403, 404, 429, 500, 502, 503, 504]);

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

module.exports = { chatComplete };
