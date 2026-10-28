// Query-key factories. Keys start with a resource name so a whole resource
// can be invalidated with its prefix, e.g. queryKeys.savedPhrases.all.
const clean = (params) =>
  Object.fromEntries(
    Object.entries(params || {}).filter(
      ([, value]) => value !== undefined && value !== null && value !== ""
    )
  );

export const queryKeys = {
  profile: () => ["profile"],
  poi: {
    all: ["poi"],
    search: (params) => ["poi", "search", clean(params)],
    detail: (id, lang = "en") => ["poi", "detail", id, lang],
    reviews: (id, lang = "en") => ["poi", "reviews", id, lang],
  },
  stays: {
    all: ["stays"],
    search: (params) => ["stays", "search", clean(params)],
    detail: (id, lang = "en") => ["stays", "detail", id, lang],
    reviews: (id, lang = "en") => ["stays", "reviews", id, lang],
  },
  savedPhrases: {
    all: ["savedPhrases"],
    list: (uid) => ["savedPhrases", "list", uid || null],
  },
  savedStays: {
    all: ["savedStays"],
    list: (uid) => ["savedStays", "list", uid || null],
  },
};
