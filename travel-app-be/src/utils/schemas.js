const { z } = require("zod");
const { LANGUAGE_CODE_PATTERN, DEFAULT_TEXT_MAX } = require("./validation");

const queryNumber = (value) => {
  if (value === undefined) return undefined;
  if (typeof value !== "number" && (typeof value !== "string" || !value.trim())) return NaN;
  return Number(value);
};

const queryBoolean = z.preprocess((value) => {
  if (value === "true") return true;
  if (value === "false") return false;
  return value;
}, z.boolean().optional());

const langCodeSchema = z
  .string({
    required_error: "Language is required",
  })
  .regex(LANGUAGE_CODE_PATTERN, {
    message:
      "Language must match pattern xx or xx-XX (dash/underscore, any case)",
  });

const limitedString = (label, max = 120) =>
  z
    .string({
      required_error: `${label} is required`,
    })
    .trim()
    .min(1, `${label} cannot be empty`)
    .max(max, `${label} must be <= ${max} characters`);

const optionalNonEmptyString = (label, max = 120) =>
  z.preprocess((value) => {
    if (value === undefined || value === null) return undefined;
    const trimmed = String(value).trim();
    return trimmed.length ? trimmed : undefined;
  }, limitedString(label, max).optional());

const translationSchema = z.object({
  text: z
    .string({
      required_error: "text is required",
    })
    .trim()
    .min(1, "text cannot be empty")
    .max(DEFAULT_TEXT_MAX, `text must be <= ${DEFAULT_TEXT_MAX} characters`),
  langPair: z
    .string({
      required_error: "langPair is required",
    })
    .regex(/^[a-z]{2}-[a-z]{2}$/i, "langPair must be in format source-target"),
});

const phrasebookSchema = z
  .object({
    topic: limitedString("topic", 160),
    sourceLang: z.union([langCodeSchema, limitedString("sourceLang", 64)]),
    targetLang: z.union([langCodeSchema, limitedString("targetLang", 64)]),
    count: z.number().int().min(1).max(25).optional(),
  })
  .refine(
    (data) => data.sourceLang.toLowerCase() !== data.targetLang.toLowerCase(),
    {
      path: ["targetLang"],
      message: "sourceLang and targetLang must differ",
    }
  );

const itineraryQuerySchema = z
  .object({
    placeId: z
      .string()
      .trim()
      .max(200, "placeId must be <= 200 characters")
      .optional(),
    dest: optionalNonEmptyString("dest", 200),
    lat: z
      .preprocess(
        queryNumber,
        z.number().gte(-90, "lat must be >= -90").lte(90, "lat must be <= 90")
      )
      .optional(),
    lng: z
      .preprocess(
        queryNumber,
        z
          .number()
          .gte(-180, "lng must be >= -180")
          .lte(180, "lng must be <= 180")
      )
      .optional(),
    distance: z
      .preprocess(
        queryNumber,
        z.number().positive().max(500, "distance must be <= 500km")
      )
      .optional(),
    rating: z
      .preprocess(
        queryNumber,
        z.number().min(0).max(5)
      )
      .optional(),
    adults: z
      .preprocess(
        queryNumber,
        z.number().int().min(1).max(12)
      )
      .optional(),
    lang: langCodeSchema.optional(),
    page: z
      .preprocess(
        (value) => value === undefined ? 1 : queryNumber(value),
        z.number().int().min(1).max(200)
      ),
    days: z
      .preprocess(
        queryNumber,
        z
          .number()
          .int()
          .min(1, "days must be >= 1")
          .max(30, "days must be <= 30")
      )
      .optional(),
    budget: limitedString("budget", 32).optional(),
    pace: limitedString("pace", 32).optional(),
    season: limitedString("season", 32).optional(),
    interests: z.preprocess((value) => {
      if (value === undefined || value === null) return undefined;
      const trimmed = String(value).trim();
      return trimmed.length ? trimmed : undefined;
    }, limitedString("interests", 256).optional()),
    checkInDate: limitedString("checkInDate", 40).optional(),
    checkOutDate: limitedString("checkOutDate", 40).optional(),
    amenities: limitedString("amenities", 200).optional(),
    type: limitedString("type", 200).optional(),
  })
  .refine(
    (value) =>
      Boolean(value.placeId) ||
      Boolean(value.dest) ||
      (typeof value.lat === "number" && typeof value.lng === "number"),
    {
      message: "Provide placeId, dest, or lat/lng",
      path: ["placeId"],
    }
  );

const userWriteSchema = z
  .object({
    uid: limitedString("uid", 128).optional(),
    email: z.string().email(),
    name: limitedString("name", 120).optional(),
    roles: z
      .array(z.enum(["user", "admin"]))
      .max(5)
      .optional(),
    settings: z
      .object({
        language: langCodeSchema.optional(),
        notifications: z.boolean().optional(),
        theme: limitedString("theme", 40).optional(),
      })
      .optional(),
  })
  .strict();

const staysSearchSchema = z
  .object({
    dest: optionalNonEmptyString("dest", 200),
    lat: z
      .preprocess(
        queryNumber,
        z.number().gte(-90).lte(90)
      )
      .optional(),
    lng: z
      .preprocess(
        queryNumber,
        z.number().gte(-180).lte(180)
      )
      .optional(),
    distance: z
      .preprocess(
        queryNumber,
        z.number().positive().max(500)
      )
      .optional(),
    rating: z
      .preprocess(
        queryNumber,
        z.number().min(0).max(5)
      )
      .optional(),
    type: limitedString("type", 100).optional(),
    amenities: limitedString("amenities", 200).optional(),
    page: z
      .preprocess(
        (value) => value === undefined ? 1 : queryNumber(value),
        z.number().int().min(1).max(200)
      ),
    pageSize: z
      .preprocess(
        queryNumber,
        z.number().int().min(1).max(50)
      )
      .optional(),
    lang: limitedString("lang", 12).optional(),
    checkInDate: limitedString("checkInDate", 40).optional(),
    checkOutDate: limitedString("checkOutDate", 40).optional(),
    adults: z
      .preprocess(
        queryNumber,
        z.number().int().min(1).max(12)
      )
      .optional(),
  })
  .refine(
    (value) =>
      Boolean(value.dest) ||
      (typeof value.lat === "number" && typeof value.lng === "number"),
    {
      message: "Provide dest or lat/lng",
      path: ["dest"],
    }
  );

const poiSearchSchema = z
  .object({
    dest: optionalNonEmptyString("dest", 200),
    lat: z
      .preprocess(
        queryNumber,
        z.number().gte(-90).lte(90)
      )
      .optional(),
    lng: z
      .preprocess(
        queryNumber,
        z.number().gte(-180).lte(180)
      )
      .optional(),
    distance: z
      .preprocess(
        queryNumber,
        z.number().positive().max(200)
      )
      .optional(),
    category: z
      .preprocess((value) => {
        if (value === undefined || value === null) return undefined;
        const trimmed = String(value).trim();
        return trimmed.length ? trimmed : undefined; // treat empty query param as not provided
      }, limitedString("category", 120).optional()),
    kidFriendly: queryBoolean,
    accessibility: queryBoolean,
    openNow: queryBoolean,
    timeNeeded: limitedString("timeNeeded", 32).optional(),
    cost: limitedString("cost", 32).optional(),
    lang: limitedString("lang", 12).optional(),
    page: z
      .preprocess(
        (value) => value === undefined ? 1 : queryNumber(value),
        z.number().int().min(1).max(200)
      ),
  })
  .refine(
    (value) =>
      Boolean(value.dest) ||
      (typeof value.lat === "number" && typeof value.lng === "number"),
    {
      message: "Provide dest or lat/lng",
      path: ["dest"],
    }
  );

const savedPhraseSchema = z.object({
  phrase: limitedString("phrase", 160),
  transliteration: z
    .string()
    .trim()
    .max(160, "transliteration must be <= 160 characters")
    .optional()
    .or(z.literal("")),
  meaning: limitedString("meaning", 280),
  usageExample: limitedString("usageExample", 360),
  topic: limitedString("topic", 120).optional(),
  sourceLang: langCodeSchema.optional(),
  targetLang: langCodeSchema,
});

const cultureQuestionSchema = z.object({
  question: limitedString("question", 500),
  destination: limitedString("destination", 200).optional(),
  language: langCodeSchema.optional(),
});

const cultureContextualSchema = z.object({
  contextType: z.enum(["translation", "phrasebook", "poi", "stay"], {
    errorMap: () => ({
      message:
        'contextType must be one of "translation", "phrasebook", "poi", "stay"',
    }),
  }),
  destination: limitedString("destination", 200).optional(),
  language: langCodeSchema.optional(),
  text: limitedString("text", 500).optional(),
  sourceLang: langCodeSchema.optional(),
  targetLang: langCodeSchema.optional(),
  topic: limitedString("topic", 200).optional(),
  phrases: z.array(limitedString("phrase", 200)).max(10).optional(),
  poi: z.any().optional(),
  stay: z.any().optional(),
  metadata: z.record(z.any()).optional(),
});

module.exports = {
  translationSchema,
  phrasebookSchema,
  itineraryQuerySchema,
  userWriteSchema,
  staysSearchSchema,
  poiSearchSchema,
  savedPhraseSchema,
  cultureQuestionSchema,
  cultureContextualSchema,
};
