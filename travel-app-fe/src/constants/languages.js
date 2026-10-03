// Languages offered for translation. The API supports every pair of these
// (Cloud Translation with an OpenRouter fallback, ADR-003); keep in sync with
// travel-app-be/src/config/translationLanguages.js.
const LANGUAGE_DEFINITIONS = [
  { code: "en", label: "English", supportsTranslation: true },
  { code: "es", label: "Spanish", supportsTranslation: true },
  { code: "fr", label: "French", supportsTranslation: true },
  { code: "de", label: "German", supportsTranslation: true },
  { code: "it", label: "Italian", supportsTranslation: true },
  { code: "pt", label: "Portuguese", supportsTranslation: true },
  { code: "hi", label: "Hindi", supportsTranslation: true },
  { code: "zh", label: "Chinese", supportsTranslation: true },
  { code: "ja", label: "Japanese", supportsTranslation: true },
  { code: "ko", label: "Korean", supportsTranslation: true },
  { code: "ar", label: "Arabic", supportsTranslation: true },
  { code: "ru", label: "Russian", supportsTranslation: true },
  { code: "tr", label: "Turkish", supportsTranslation: true },
  { code: "th", label: "Thai", supportsTranslation: true },
  { code: "id", label: "Indonesian", supportsTranslation: true },
];

export const TRANSLATION_LANGUAGES = LANGUAGE_DEFINITIONS.filter(
  (lang) => lang.supportsTranslation
);

export const COMMON_LANGUAGE_LABELS = LANGUAGE_DEFINITIONS.map(
  (lang) => lang.label
);

export const LANGUAGE_CODE_TO_LABEL = LANGUAGE_DEFINITIONS.reduce(
  (acc, lang) => {
    acc[lang.code.toLowerCase()] = lang.label;
    return acc;
  },
  {}
);

export const LANGUAGE_LABEL_TO_CODE = LANGUAGE_DEFINITIONS.reduce(
  (acc, lang) => {
    acc[lang.label.toLowerCase()] = lang.code;
    return acc;
  },
  {}
);

export function getLanguageLabel(code) {
  if (!code) return "";
  const normalized = String(code).trim().toLowerCase();
  return (
    LANGUAGE_CODE_TO_LABEL[normalized] ||
    LANGUAGE_CODE_TO_LABEL[code] ||
    code.toUpperCase()
  );
}

export function resolveLanguageCode(label) {
  if (!label) return "";
  const normalized = String(label).trim();
  const lookup = LANGUAGE_LABEL_TO_CODE[normalized.toLowerCase()];
  if (lookup) return lookup;

  const lowered = normalized.toLowerCase();
  if (/^[a-z]{2,3}$/.test(lowered)) {
    return lowered;
  }
  return "";
}
