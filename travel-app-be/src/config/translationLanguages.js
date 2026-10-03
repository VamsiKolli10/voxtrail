// Languages offered by /api/translate. Every pair of distinct codes is
// supported: Cloud Translation (ADR-003) handles all of them, and so does
// the OpenRouter fallback. Keep in sync with travel-app-fe/src/constants/languages.js.
const TRANSLATION_LANGUAGES = Object.freeze({
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  hi: "Hindi",
  zh: "Chinese (Simplified)",
  ja: "Japanese",
  ko: "Korean",
  ar: "Arabic",
  ru: "Russian",
  tr: "Turkish",
  th: "Thai",
  id: "Indonesian",
});

const CODES = Object.keys(TRANSLATION_LANGUAGES);

const SUPPORTED_PAIRS = new Set(
  CODES.flatMap((source) =>
    CODES.filter((target) => target !== source).map(
      (target) => `${source}-${target}`
    )
  )
);

module.exports = { TRANSLATION_LANGUAGES, SUPPORTED_PAIRS };
