const { db } = require("../config/firebaseAdmin");
const { chatComplete } = require("../lib/openrouterClient");
const {
  createErrorResponse,
  ERROR_CODES,
  logError,
} = require("../utils/errorHandler");
const { sanitizeString, sanitizeTextInput } = require("../utils/validation");

const BRIEF_CACHE_COLLECTION = "cultureIntelligenceBriefs";
const BRIEF_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const BRIEF_CACHE_VERSION =
  process.env.CULTURE_BRIEF_CACHE_VERSION || "1"; // bump to invalidate stale docs

function normalizeSlug(value) {
  if (!value || typeof value !== "string") return "";
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeLanguage(language) {
  const { value } = sanitizeString(language || "en", {
    maxLength: 10,
    label: "language",
  });
  return value || "en";
}

function buildBriefCacheKey(destination, culture, language) {
  const destKey = normalizeSlug(destination) || "unknown";
  const cultureKey = normalizeSlug(culture || destination) || destKey;
  const langKey = normalizeLanguage(language);
  return `v${BRIEF_CACHE_VERSION}-${destKey}-${cultureKey}-${langKey}`;
}

async function getBriefFromCache(cacheKey, { includeStale = false } = {}) {
  try {
    const doc = await db.collection(BRIEF_CACHE_COLLECTION).doc(cacheKey).get();
    if (!doc.exists) return null;

    const data = doc.data();
    if (!data || !data.value || !data.timestamp) return null;

    const ageMs = Date.now() - data.timestamp;
    const expired = ageMs > BRIEF_CACHE_TTL_MS;
    const versionMismatch =
      data.cacheVersion && data.cacheVersion !== BRIEF_CACHE_VERSION;

    const value = data.value;

    if (expired || versionMismatch) {
      if (includeStale && value) {
        return {
          value,
          stale: true,
          reason: expired ? "expired" : "version-mismatch",
        };
      }
      return null;
    }

    if (includeStale) {
      return { value, stale: false };
    }

    return value;
  } catch (err) {
    logError(err, { operation: "cultureIntelligence.getBriefFromCache" });
    return null;
  }
}

async function saveBriefToCache(cacheKey, payload) {
  try {
    await db.collection(BRIEF_CACHE_COLLECTION).doc(cacheKey).set({
      value: payload,
      timestamp: Date.now(),
      destination: payload.destination,
      culture: payload.culture,
      language: payload.language,
      generatedAt: payload.generatedAt,
      cacheVersion: BRIEF_CACHE_VERSION,
    });
  } catch (err) {
    logError(err, { operation: "cultureIntelligence.saveBriefToCache" });
  }
}

function validateBriefCategories(categories) {
  const required = ["greetings", "dining", "dress_code", "gestures", "taboos"];
  for (const key of required) {
    const value = categories?.[key];
    if (!Array.isArray(value) || value.length < 3) {
      throw new Error(
        `Culture brief missing category "${key}" or has fewer than 3 items`
      );
    }
  }
}

// Provide a safety-first fallback when the culture brief model is unavailable.
function buildFallbackBrief({ destination, culture, language }) {
  const place = destination || culture || "your destination";
  const now = new Date().toISOString();

  return {
    destination: destination || culture || "Unknown destination",
    culture: culture || destination || "local",
    language: language || "en",
    categories: {
      greetings: [
        `Lead with a polite hello and a smile; mirror the formality locals use in ${place}.`,
        "Use names or honorifics only after they are offered; avoid pet names with strangers.",
        "If unsure whether to shake hands, bow, or wave, let the other person set the tone.",
      ],
      dining: [
        "Wait to be seated and follow the host's cues before eating or drinking.",
        "Keep voices moderate at the table; silence phones and step away for calls.",
        "Use serving utensils for shared dishes when available and avoid reaching across others.",
        "Ask before taking photos of staff or other guests, and follow any house rules.",
      ],
      dress_code: [
        "Smart-casual clothing and clean shoes are welcomed in most settings.",
        "Carry a light layer or scarf to cover shoulders or knees in sacred or formal sites.",
        "Choose comfortable closed-toe shoes for walking and public transit.",
      ],
      gestures: [
        "Use an open hand to point or beckon; avoid sudden or aggressive gestures.",
        "Respect personal space in queues and on transit; let people exit before boarding.",
        "Offer or receive items with care and avoid touching strangers unless invited.",
      ],
      taboos: [
        "Avoid loud debates about politics, religion, or history until you know the audience.",
        "Ask permission before photographing people, homes, or places of worship.",
        "Follow posted rules on smoking, alcohol, quiet hours, and protected areas.",
      ],
      safety_basics: [
        "Keep valuables zipped and front-facing in crowds; use hotel safes for passports when possible.",
        "Use licensed taxis or reputable ride-hail options and agree on fares before departing.",
        "Save local emergency numbers and a nearby embassy or consulate address.",
      ],
    },
    generatedAt: now,
    fallback: true,
    fallbackReason: "model_unavailable",
    notice:
      "Served a safety-first fallback while the culture brief service is unavailable.",
    cacheStatus: "fallback",
  };
}

/**
 * Build system prompt for culture brief generation.
 */
function buildBriefSystemPrompt(language) {
  return [
    "You are the VoxTrail Culture Intelligence engine.",
    "You generate concise, practical, safe, and respectful cultural guidance for travelers.",
    "You MUST avoid stereotypes, over-generalizations, or discriminatory language.",
    "If unsure, clearly state uncertainty and prefer neutral, inclusive advice.",
    "Output STRICT JSON only. No Markdown, no commentary, no backticks.",
    "Top-level JSON shape:",
    "{",
    '  "destination": string,',
    '  "culture": string,',
    '  "language": string,',
    '  "categories": {',
    '    "greetings": string[],',
    '    "dining": string[],',
    '    "dress_code": string[],',
    '    "gestures": string[],',
    '    "taboos": string[],',
    '    "safety_basics"?: string[]',
    "  },",
    '  "generatedAt": string',
    "}",
    "Each listed category (except optional safety_basics) MUST contain 3-5 short bullet-style strings.",
    `Where possible, localize bullet text to the requested language code "${language}".`,
  ].join(" ");
}

/**
 * Extract and parse JSON from a model response that may contain extra text.
 */
function safeParseJsonResponse(raw, { onErrorContext }) {
  if (!raw || typeof raw !== "string") {
    throw new Error("Empty response from culture model");
  }

  try {
    return JSON.parse(raw);
  } catch (err) {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (inner) {
        logError(inner, {
          ...onErrorContext,
          note: "Failed to parse extracted JSON fragment for culture service",
        });
      }
    }
    throw err;
  }
}

/**
 * GET /api/culture/brief
 */
async function getBrief(req, res) {
  try {
    const {
      destination: rawDestination,
      culture: rawCulture,
      language: rawLang,
      refresh: refreshParam,
      forceRefresh: forceRefreshParam,
    } = req.query || {};

    const { value: destination } = sanitizeString(rawDestination, {
      label: "destination",
    });
    if (!destination) {
      return res
        .status(400)
        .json(
          createErrorResponse(
            400,
            ERROR_CODES.VALIDATION_ERROR,
            "destination is required"
          )
        );
    }

    const { value: cultureInput } = sanitizeString(rawCulture || "", {
      label: "culture",
      allowEmpty: true,
    });
    const culture = cultureInput || destination;
    const language = normalizeLanguage(rawLang || "en");

    const refreshFlag = String(
      forceRefreshParam ?? refreshParam ?? ""
    ).toLowerCase();
    const bypassCache = ["1", "true", "refresh", "force"].includes(
      refreshFlag
    );

    const cacheKey = buildBriefCacheKey(destination, culture, language);
    const cacheResult = await getBriefFromCache(cacheKey, { includeStale: true });
    const freshCache = cacheResult && cacheResult.stale === false ? cacheResult.value : null;
    const staleCache = cacheResult && cacheResult.stale === true ? cacheResult.value : null;

    if (!bypassCache && freshCache) {
      return res.status(200).json(freshCache);
    }

    const system = buildBriefSystemPrompt(language);
    const userPayload = {
      destination,
      culture,
      language,
      categories: [
        "greetings",
        "dining",
        "dress_code",
        "gestures",
        "taboos",
        "safety_basics",
      ],
      tipsPerCategory: 5,
    };

    let raw;
    try {
      raw = await chatComplete({
        system,
        user: JSON.stringify(userPayload),
        temperature: 0.35,
        response_format: "json_object",
      });
    } catch (providerError) {
      logError(providerError, {
        endpoint: "/api/culture/brief",
        destination,
        culture,
        language,
        cacheKey,
      });

      if (staleCache) {
        return res.status(200).json({
          ...staleCache,
          cacheStatus: "stale",
          cacheVersion: BRIEF_CACHE_VERSION,
          fallback: "cache",
        });
      }

      const fallbackBrief = buildFallbackBrief({
        destination,
        culture,
        language,
      });

      return res.status(200).json(fallbackBrief);
    }

    let parsed;
    try {
      parsed = safeParseJsonResponse(raw, {
        onErrorContext: {
          endpoint: "/api/culture/brief",
          destination,
          culture,
          language,
        },
      });
    } catch (err) {
      logError(err, {
        endpoint: "/api/culture/brief",
        raw,
      });
      return res
        .status(502)
        .json(
          createErrorResponse(
            502,
            ERROR_CODES.EXTERNAL_SERVICE_ERROR,
            "Failed to parse culture brief from model"
          )
        );
    }

    const normalized = {
      destination: parsed.destination || destination,
      culture: parsed.culture || culture,
      language: parsed.language || language,
      categories: {
        greetings: parsed.categories?.greetings || parsed.greetings || [],
        dining: parsed.categories?.dining || parsed.dining || [],
        dress_code: parsed.categories?.dress_code || parsed.dress_code || [],
        gestures: parsed.categories?.gestures || parsed.gestures || [],
        taboos: parsed.categories?.taboos || parsed.taboos || [],
        safety_basics:
          parsed.categories?.safety_basics || parsed.safety_basics || undefined,
      },
      generatedAt: parsed.generatedAt || new Date().toISOString(),
    };

    try {
      validateBriefCategories(normalized.categories);
    } catch (validationErr) {
      logError(validationErr, {
        endpoint: "/api/culture/brief",
        note: "Model response failed brief category validation",
      });
      return res
        .status(502)
        .json(
          createErrorResponse(
            502,
            ERROR_CODES.EXTERNAL_SERVICE_ERROR,
            "Invalid culture brief format from model"
          )
        );
    }

    saveBriefToCache(cacheKey, normalized);

    return res.status(200).json(normalized);
  } catch (error) {
    logError(error, {
      endpoint: "/api/culture/brief",
      query: req.query,
    });
    return res
      .status(500)
      .json(
        createErrorResponse(
          500,
          ERROR_CODES.INTERNAL_ERROR,
          "Failed to generate culture brief"
        )
      );
  }
}

/**
 * POST /api/culture/qa
 */
async function askQuestion(req, res) {
  try {
    const { destination, culture, language, question, history } =
      req.body || {};

    const { value: destVal, error: destErr } = sanitizeString(destination, {
      label: "destination",
    });
    if (destErr) {
      return res
        .status(400)
        .json(createErrorResponse(400, ERROR_CODES.VALIDATION_ERROR, destErr));
    }

    const { value: questionVal, error: questionErr } = sanitizeTextInput(
      question,
      { label: "question" }
    );
    if (questionErr) {
      return res
        .status(400)
        .json(
          createErrorResponse(400, ERROR_CODES.VALIDATION_ERROR, questionErr)
        );
    }

    const { value: cultureVal } = sanitizeString(culture || "", {
      label: "culture",
      allowEmpty: true,
    });
    const lang = normalizeLanguage(language || "en");

    const safeHistory = Array.isArray(history)
      ? history.slice(-6).map((turn, idx) => ({
          q: String(turn.q || turn.question || "").slice(0, 500),
          a: String(turn.a || turn.answer || "").slice(0, 800),
          idx,
        }))
      : [];

    const system = [
      "You are the VoxTrail Culture Intelligence Coach.",
      "Your role is to provide factual, practical, and respectful cultural guidance.",
      "Avoid stereotypes, over-generalizations, or any discriminatory framing.",
      "Clarify uncertainty. Emphasize legality, safety, and respect for local norms.",
      "If asked for harmful, illegal, or abusive advice, refuse and redirect to safe conduct.",
      "Output STRICT JSON only with this shape:",
      '{ "answer": string, "highlights": string[] }',
      'The "highlights" array should contain 2-5 concise bullet points of the key takeaways.',
      `Write the answer primarily in the requested language "${lang}" when feasible.`,
    ].join(" ");

    const userPayload = {
      destination: destVal,
      culture: cultureVal || destVal,
      language: lang,
      question: questionVal,
      history: safeHistory,
    };

    const raw = await chatComplete({
      system,
      user: JSON.stringify(userPayload),
      temperature: 0.4,
      response_format: "json_object",
    });

    let parsed;
    try {
      parsed = safeParseJsonResponse(raw, {
        onErrorContext: {
          endpoint: "/api/culture/qa",
          destination: destVal,
        },
      });
    } catch (err) {
      logError(err, {
        endpoint: "/api/culture/qa",
        raw,
      });
      return res
        .status(502)
        .json(
          createErrorResponse(
            502,
            ERROR_CODES.EXTERNAL_SERVICE_ERROR,
            "Failed to parse culture Q&A response from model"
          )
        );
    }

    const answer = typeof parsed.answer === "string" ? parsed.answer : "";
    const highlights = Array.isArray(parsed.highlights)
      ? parsed.highlights.filter((h) => typeof h === "string").slice(0, 8)
      : [];

    if (!answer) {
      return res
        .status(502)
        .json(
          createErrorResponse(
            502,
            ERROR_CODES.EXTERNAL_SERVICE_ERROR,
            "Culture Q&A response missing answer"
          )
        );
    }

    return res.status(200).json({
      answer,
      highlights,
    });
  } catch (error) {
    logError(error, {
      endpoint: "/api/culture/qa",
      body: req.body,
    });
    return res
      .status(500)
      .json(
        createErrorResponse(
          500,
          ERROR_CODES.INTERNAL_ERROR,
          "Failed to process culture question"
        )
      );
  }
}

/**
 * POST /api/culture/contextual
 */
async function getContextualTips(req, res) {
  try {
    const {
      contextType,
      destination,
      language,
      text,
      sourceLang,
      targetLang,
      topic,
      phrases,
      poi,
      stay,
      metadata,
    } = req.body || {};

    const { value: ctxTypeVal } = sanitizeString(contextType || "", {
      label: "contextType",
    });

    if (!["translation", "phrasebook", "poi", "stay"].includes(ctxTypeVal)) {
      return res
        .status(400)
        .json(
          createErrorResponse(
            400,
            ERROR_CODES.VALIDATION_ERROR,
            'contextType must be one of "translation", "phrasebook", "poi", "stay"'
          )
        );
    }

    const { value: destVal } = sanitizeString(destination || "", {
      label: "destination",
      allowEmpty: true,
    });
    const lang = normalizeLanguage(language || "en");

    const microContext = {
      contextType: ctxTypeVal,
      destination: destVal || undefined,
      language: lang,
      translation:
        ctxTypeVal === "translation"
          ? {
              text: text || undefined,
              sourceLang: sourceLang || undefined,
              targetLang: targetLang || undefined,
            }
          : undefined,
      phrasebook:
        ctxTypeVal === "phrasebook"
          ? {
              topic: topic || undefined,
              phrases: Array.isArray(phrases)
                ? phrases.slice(0, 10)
                : undefined,
            }
          : undefined,
      poi: ctxTypeVal === "poi" ? poi || metadata || undefined : undefined,
      stay: ctxTypeVal === "stay" ? stay || metadata || undefined : undefined,
    };

    const system = [
      "You are the VoxTrail Culture Intelligence micro-advisor.",
      "Task: provide 1-3 concise cultural micro-tips relevant to the given context.",
      "Tips must be practical, respectful, and avoid stereotypes.",
      "Prefer guidance on tone, politeness, forms of address, modesty, religious or sacred spaces, photography rules, and safety-respect intersections.",
      "Never output harmful, illegal, or bigoted guidance.",
      "Output STRICT JSON only with shape:",
      '{ "tips": string[], "severity"?: "info" | "important" }',
      'If risk of serious offense or safety concerns is high, set severity to "important"; otherwise default to "info".',
    ].join(" ");

    const raw = await chatComplete({
      system,
      user: JSON.stringify(microContext),
      temperature: 0.35,
      response_format: "json_object",
    });

    let parsed;
    try {
      parsed = safeParseJsonResponse(raw, {
        onErrorContext: {
          endpoint: "/api/culture/contextual",
          contextType: ctxTypeVal,
        },
      });
    } catch (err) {
      logError(err, {
        endpoint: "/api/culture/contextual",
        raw,
      });
      return res
        .status(502)
        .json(
          createErrorResponse(
            502,
            ERROR_CODES.EXTERNAL_SERVICE_ERROR,
            "Failed to parse contextual culture tips"
          )
        );
    }

    let tips = [];
    if (Array.isArray(parsed.tips)) {
      tips = parsed.tips.filter((t) => typeof t === "string").slice(0, 3);
    }
    if (!tips.length && typeof parsed.tip === "string") {
      tips = [parsed.tip];
    }

    const severity = parsed.severity === "important" ? "important" : "info";

    if (!tips.length) {
      return res
        .status(502)
        .json(
          createErrorResponse(
            502,
            ERROR_CODES.EXTERNAL_SERVICE_ERROR,
            "Contextual culture tips missing tips"
          )
        );
    }

    return res.status(200).json({ tips, severity });
  } catch (error) {
    logError(error, {
      endpoint: "/api/culture/contextual",
      body: req.body,
    });
    return res
      .status(500)
      .json(
        createErrorResponse(
          500,
          ERROR_CODES.INTERNAL_ERROR,
          "Failed to generate contextual culture tips"
        )
      );
  }
}

module.exports = {
  getBrief,
  askQuestion,
  getContextualTips,
  // export helpers if legacy controllers need them
  _internal: {
    normalizeSlug,
    buildBriefCacheKey,
    validateBriefCategories,
    safeParseJsonResponse,
  },
};
