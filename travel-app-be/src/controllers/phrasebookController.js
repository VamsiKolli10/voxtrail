const { chatComplete } = require("../lib/openrouterClient");
const {
  createErrorResponse,
  ERROR_CODES,
  logError,
  isAiNotConfigured,
  aiNotConfiguredResponse,
} = require("../utils/errorHandler");
const { enforceQuota } = require("../utils/quota");
const { trackExternalCall } = require("../utils/monitoring");
const { getCached, setCached, getCacheStats } = require("../utils/cache");

const phrasebookLimit = Number(
  process.env.PHRASEBOOK_MAX_REQUESTS_PER_HOUR || 25
);
const phrasebookWindow = Number(
  process.env.PHRASEBOOK_WINDOW_MS || 60 * 60 * 1000
);
const PHRASEBOOK_CACHE_TTL_MS = Number(
  process.env.PHRASEBOOK_CACHE_TTL_MS || 15 * 60 * 1000
);
const RAW_SNIPPET_LIMIT = 1200;

function sanitizeStr(s) {
  return typeof s === "string" ? s.trim() : "";
}

function clamp(n, lo, hi) {
  const v = Number.parseInt(n ?? 10, 10);
  return Math.min(Math.max(v, lo), hi);
}

function safeParseJson(raw) {
  if (!raw) return null;
  if (typeof raw === "object") return raw;
  if (typeof raw !== "string") return null;

  const trimmed = raw.trim();
  const candidates = [];
  const push = (value) => {
    if (value && !candidates.includes(value)) {
      candidates.push(value);
    }
  };

  // Extract fenced code block (```json ... ```)
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) push(fenced[1].trim());

  // Slice from first to last brace to drop extra chatter
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    push(trimmed.slice(firstBrace, lastBrace + 1));
  }

  // Raw as-is
  push(trimmed);

  // If payload was double-encoded or heavily escaped, unescape once
  if (/\\["[{]/.test(trimmed)) {
    const unescaped = trimmed
      .replace(/\\n/g, " ")
      .replace(/\\t/g, " ")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\");
    push(unescaped);
    if (
      (unescaped.startsWith('"') && unescaped.endsWith('"')) ||
      (unescaped.startsWith("'") && unescaped.endsWith("'"))
    ) {
      push(unescaped.slice(1, -1));
    }
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      // Occasionally the model returns a stringified JSON string
      if (typeof parsed === "string") {
        try {
          return JSON.parse(parsed);
        } catch {
          // fall through
        }
      }
      return parsed;
    } catch {
      // try the next candidate
    }
  }
  return null;
}

function extractPhrases(payload) {
  if (!payload) return [];
  if (Array.isArray(payload.phrases)) return payload.phrases;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload)) return payload;
  return [];
}

function getPhrasebookCacheKey({ topic, sourceLang, targetLang, count }) {
  return [
    topic.toLowerCase(),
    sourceLang.toLowerCase(),
    targetLang.toLowerCase(),
    count,
  ].join("::");
}

async function generatePhrases(req, res) {
  try {
    const topic = sanitizeStr(req.body?.topic);
    const sourceLang = sanitizeStr(req.body?.sourceLang);
    const targetLang = sanitizeStr(req.body?.targetLang);
    const n = clamp(req.body?.count, 5, 25);

    if (!topic || !sourceLang || !targetLang) {
      return res
        .status(400)
        .json(
          createErrorResponse(
            400,
            ERROR_CODES.VALIDATION_ERROR,
            "Missing required fields",
            { missing: ["topic", "sourceLang", "targetLang"] }
          )
        );
    }

    if (sourceLang.toLowerCase() === targetLang.toLowerCase()) {
      return res
        .status(400)
        .json(
          createErrorResponse(
            400,
            ERROR_CODES.VALIDATION_ERROR,
            "sourceLang and targetLang must be different"
          )
        );
    }

    const system = [
      "You generate compact travel phrasebooks as STRICT JSON.",
      "Output ONLY valid JSON (no markdown or extra text).",
      "Return phrases in the TARGET language.",
      "Include 'transliteration' ONLY when target language typically needs romanization (e.g., scripts like Arabic, Devanagari, Kanji/Kana, Hangul, Cyrillic).",
      "When transliteration is not useful, return an empty string for that field.",
      "Also include a 'sourceTranslation' which is the phrase translated into the SOURCE language (not a definition).",
      "Use safe, polite, travel-relevant language. Keep phrases short and practical.",
    ].join(" ");

    const user = JSON.stringify({
      instruction: "Create a phrase list for travelers.",
      topic,
      sourceLang,
      targetLang,
      count: n,
      format: {
        type: "object",
        properties: {
          topic: { type: "string" },
          sourceLang: { type: "string" },
          targetLang: { type: "string" },
          phrases: {
            type: "array",
            items: {
              type: "object",
              properties: {
                targetPhrase: {
                  type: "string",
                  description: "The phrase in the TARGET language.",
                },
                transliteration: {
                  type: "string",
                  description:
                    "Romanization if helpful; otherwise empty string.",
                },
                sourceTranslation: {
                  type: "string",
                  description:
                    "The phrase translated into the SOURCE language.",
                },
                usageExample: {
                  type: "string",
                  description:
                    "Short example using the target phrase in context (in target language).",
                },
              },
              required: ["targetPhrase", "sourceTranslation", "usageExample"],
            },
          },
        },
        required: ["topic", "sourceLang", "targetLang", "phrases"],
      },
    });

    const quotaResult = enforceQuota({
      identifier: req.user?.uid || req.ip,
      key: "phrasebook:generate",
      limit: phrasebookLimit,
      windowMs: phrasebookWindow,
    });
    if (!quotaResult.allowed) {
      return res
        .status(429)
        .json(
          createErrorResponse(
            429,
            ERROR_CODES.RATE_LIMIT_EXCEEDED,
            "Phrasebook generation quota exceeded",
            { resetAt: quotaResult.resetAt }
          )
        );
    }

    const cacheKey = getPhrasebookCacheKey({
      topic,
      sourceLang,
      targetLang,
      count: n,
    });
    const cached = getCached("phrasebook", cacheKey);
    if (cached) {
      return res.status(200).json({ ...cached, provider: "cache" });
    }

    const raw = await chatComplete({
      system,
      user,
      temperature: 0.4,
      response_format: "json_object",
      max_tokens: 1500,
    });
    trackExternalCall({
      service: "openrouter-phrasebook",
      userId: req.user?.uid || req.ip,
      metadata: { topic, sourceLang, targetLang },
    });

    const payload = safeParseJson(raw);
    const phraseList = extractPhrases(payload);

    if (!payload || !phraseList.length) {
      const rawSnippet =
        typeof raw === "string" ? raw.slice(0, RAW_SNIPPET_LIMIT) : raw;
      logError(new Error("Unexpected phrasebook payload"), {
        endpoint: "/api/phrasebook/generate",
        rawSnippet,
      });
      return res
        .status(502)
        .json(
          createErrorResponse(
            502,
            ERROR_CODES.EXTERNAL_SERVICE_ERROR,
            "Upstream returned an unexpected format",
            { raw: rawSnippet }
          )
        );
    }

    const normalized = {
      topic: payload.topic || topic,
      sourceLang: payload.sourceLang || sourceLang,
      targetLang: payload.targetLang || targetLang,
      phrases: phraseList
        .map((p) => {
          const phrase =
            sanitizeStr(p.targetPhrase) ||
            sanitizeStr(p.phrase) ||
            sanitizeStr(p.target);
          const transliteration =
            sanitizeStr(p.transliteration) ||
            sanitizeStr(p.romanization) ||
            sanitizeStr(p.pronunciation);
          const meaning =
            sanitizeStr(p.sourceTranslation) ||
            sanitizeStr(p.translation) ||
            sanitizeStr(p.meaning);
          const usageExample =
            sanitizeStr(p.usageExample) ||
            sanitizeStr(p.example) ||
            sanitizeStr(p.exampleSentence) ||
            sanitizeStr(p.context);
          return { phrase, transliteration, meaning, usageExample };
        })
        .filter((p) => p.phrase && p.meaning && p.usageExample)
        .slice(0, n),
    };

    if (!normalized.phrases.length) {
      const rawSnippet =
        typeof raw === "string" ? raw.slice(0, RAW_SNIPPET_LIMIT) : raw;
      logError(new Error("No valid phrases after normalization"), {
        endpoint: "/api/phrasebook/generate",
        rawSnippet,
      });
      return res
        .status(502)
        .json(
          createErrorResponse(
            502,
            ERROR_CODES.EXTERNAL_SERVICE_ERROR,
            "Upstream returned phrases we could not use",
            { raw: rawSnippet }
          )
        );
    }

    setCached("phrasebook", cacheKey, normalized, PHRASEBOOK_CACHE_TTL_MS);
    return res.status(200).json({
      ...normalized,
      cache: { provider: "memory", stats: getCacheStats() },
    });
  } catch (err) {
    logError(err, { endpoint: "/api/phrasebook/generate" });
    if (isAiNotConfigured(err)) {
      return res.status(503).json(aiNotConfiguredResponse());
    }
    return res
      .status(500)
      .json(
        createErrorResponse(
          500,
          ERROR_CODES.EXTERNAL_SERVICE_ERROR,
          "Failed to generate phrases",
          { detail: err?.message || "unknown" }
        )
      );
  }
}

module.exports = { generatePhrases };
