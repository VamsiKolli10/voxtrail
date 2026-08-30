const { db, FieldValue } = require("../config/firebaseAdmin");
const {
  sanitizeString,
  validateLangCode,
  ensureOwner,
} = require("../utils/validation");
const {
  createErrorResponse,
  ERROR_CODES,
  logError,
} = require("../utils/errorHandler");

const fdb = () => db;
const SAVED_PHRASE_LIMIT = Number(process.env.SAVED_PHRASE_LIMIT || 200);

const detail = (e) =>
  [
    e?.message,
    e?.code != null ? `code=${e.code}` : "",
    e?.details ? `details=${e.details}` : "",
  ]
    .filter(Boolean)
    .join(" | ");

exports.listSaved = async (req, res) => {
  try {
    const ownership = ensureOwner(req, req.user?.uid);
    if (ownership.error) {
      return res
        .status(ownership.error === "Unauthorized" ? 401 : 403)
        .json(
          createErrorResponse(
            ownership.error === "Unauthorized" ? 401 : 403,
            ownership.error === "Unauthorized"
              ? ERROR_CODES.UNAUTHORIZED
              : ERROR_CODES.FORBIDDEN,
            ownership.error
          )
        );
    }

    const snap = await fdb()
      .collection("users")
      .doc(ownership.value)
      .collection("saved_phrases")
      .orderBy("createdAt", "desc")
      .limit(SAVED_PHRASE_LIMIT)
      .get();
    res.json({ items: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
  } catch (e) {
    const msg = detail(e);
    if ((e && e.code === 5) || /NOT_FOUND/i.test(msg))
      return res.json({ items: [] });
    logError(e, { endpoint: "/api/saved-phrases" });
    res
      .status(500)
      .json(
        createErrorResponse(
          500,
          ERROR_CODES.DB_ERROR,
          "Failed to list saved phrases",
          { detail: msg }
        )
      );
  }
};

function buildPhrasePayload(body = {}) {
  const requiredFields = [
    ["phrase", 160],
    ["meaning", 280],
    ["usageExample", 360],
  ];

  const sanitized = {};
  for (const [field, max] of requiredFields) {
    const result = sanitizeString(body[field], {
      maxLength: max,
      label: field,
      allowEmpty: false,
    });
    if (result.error) return { error: result.error };
    sanitized[field] = result.value;
  }

  const transliteration = sanitizeString(body.transliteration, {
    maxLength: 160,
    label: "transliteration",
    allowEmpty: true,
  }).value;

  const topic = sanitizeString(body.topic, {
    maxLength: 120,
    label: "topic",
    allowEmpty: true,
  }).value;

  const sourceLang =
    body.sourceLang && body.sourceLang.trim()
      ? validateLangCode(body.sourceLang, { label: "sourceLang" })
      : { value: "" };
  if (sourceLang.error) return { error: sourceLang.error };

  const targetLang = validateLangCode(body.targetLang, {
    label: "targetLang",
  });
  if (targetLang.error) return { error: targetLang.error };

  return {
    value: {
      phrase: sanitized.phrase,
      transliteration,
      meaning: sanitized.meaning,
      usageExample: sanitized.usageExample,
      topic,
      sourceLang: sourceLang.value,
      targetLang: targetLang.value,
    },
  };
}

exports.addSaved = async (req, res) => {
  try {
    const ownership = ensureOwner(req, req.user?.uid);
    if (ownership.error) {
      return res
        .status(ownership.error === "Unauthorized" ? 401 : 403)
        .json(
          createErrorResponse(
            ownership.error === "Unauthorized" ? 401 : 403,
            ownership.error === "Unauthorized"
              ? ERROR_CODES.UNAUTHORIZED
              : ERROR_CODES.FORBIDDEN,
            ownership.error
          )
        );
    }

    const payload = buildPhrasePayload(req.body || {});
    if (payload.error) {
      return res
        .status(400)
        .json(
          createErrorResponse(400, ERROR_CODES.VALIDATION_ERROR, payload.error)
        );
    }

    const docRef = await fdb()
      .collection("users")
      .doc(ownership.value)
      .collection("saved_phrases")
      .add({
        ...payload.value,
        createdAt: FieldValue.serverTimestamp(),
      });
    res.status(201).json({ id: docRef.id });
  } catch (e) {
    logError(e, { endpoint: "/api/saved-phrases" });
    res
      .status(500)
      .json(
        createErrorResponse(
          500,
          ERROR_CODES.DB_ERROR,
          "Failed to save phrase",
          { detail: detail(e) }
        )
      );
  }
};

exports.removeSaved = async (req, res) => {
  try {
    const ownership = ensureOwner(req, req.user?.uid);
    if (ownership.error) {
      return res
        .status(ownership.error === "Unauthorized" ? 401 : 403)
        .json(
          createErrorResponse(
            ownership.error === "Unauthorized" ? 401 : 403,
            ownership.error === "Unauthorized"
              ? ERROR_CODES.UNAUTHORIZED
              : ERROR_CODES.FORBIDDEN,
            ownership.error
          )
        );
    }

    const ref = fdb()
      .collection("users")
      .doc(ownership.value)
      .collection("saved_phrases")
      .doc(req.params.id);
    const snap = await ref.get();
    if (!snap.exists)
      return res
        .status(404)
        .json(createErrorResponse(404, ERROR_CODES.NOT_FOUND, "Not found"));
    await ref.delete();
    res.json({ ok: true });
  } catch (e) {
    logError(e, { endpoint: "/api/saved-phrases/:id" });
    res
      .status(500)
      .json(
        createErrorResponse(
          500,
          ERROR_CODES.DB_ERROR,
          "Failed to delete saved phrase",
          { detail: detail(e) }
        )
      );
  }
};
