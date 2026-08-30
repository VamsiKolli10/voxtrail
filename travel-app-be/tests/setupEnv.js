const fakeServiceAccount = {
  project_id: "demo-project",
  client_email: "demo@demo.iam.gserviceaccount.com",
  private_key:
    "-----BEGIN PRIVATE KEY-----\\nFAKEKEY\\n-----END PRIVATE KEY-----\\n",
};

process.env.REQUEST_SIGNING_SECRET =
  process.env.REQUEST_SIGNING_SECRET || "test-signing-secret";
process.env.FB_ADMIN_CREDENTIALS =
  process.env.FB_ADMIN_CREDENTIALS ||
  process.env.FIREBASE_ADMIN_CREDENTIALS ||
  Buffer.from(JSON.stringify(fakeServiceAccount)).toString("base64");
process.env.CORS_ALLOWED_ORIGINS =
  process.env.CORS_ALLOWED_ORIGINS || "http://localhost:5173";

const mockAuth = {
  verifyIdToken: jest.fn(async (token) => {
    if (token === "valid-admin-token") {
      return {
        uid: "admin-user",
        admin: true,
        roles: ["admin"],
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
    }
    if (token === "valid-user-token") {
      return {
        uid: "user-123",
        admin: false,
        roles: ["user"],
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
    }
    const error = new Error("Invalid token");
    error.code = "auth/invalid-token";
    throw error;
  }),
};

const mockSavedPhrasesCollection = {
  orderBy: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  get: jest.fn().mockResolvedValue({
    docs: [
      {
        id: "saved-1",
        data: () => ({
          original: "hello",
          translation: "hola",
          langPair: "en-es",
        }),
      },
    ],
  }),
  add: jest.fn().mockImplementation(async (data) => {
    if (data.original === "error") {
      const error = new Error("Firestore write failed");
      error.code = "firestore/write-failed";
      throw error;
    }
    return { id: "saved-1" };
  }),
  doc: jest.fn((id) => ({
    id,
    get: jest.fn().mockResolvedValue({
      exists: id === "valid-id",
      data: () =>
        id === "valid-id"
          ? {
              original: "test",
              translation: "prueba",
            }
          : null,
    }),
    delete: jest.fn().mockResolvedValue(),
  })),
};

const cultureBriefsStore = {};
const mockCultureBriefsCollection = {
  doc: jest.fn((id) => ({
    id,
    get: jest.fn(async () => {
      const data = cultureBriefsStore[id];
      return { exists: !!data, data: () => data };
    }),
    set: jest.fn(async (data) => {
      cultureBriefsStore[id] = data;
    }),
  })),
};

const mockUserDoc = {
  collection: jest.fn(() => mockSavedPhrasesCollection),
  get: jest.fn().mockResolvedValue({ exists: true, data: () => ({}) }),
  delete: jest.fn().mockResolvedValue(),
};

const mockUsersCollection = {
  limit: jest.fn().mockReturnThis(),
  get: jest.fn().mockResolvedValue({ docs: [] }),
  add: jest.fn().mockResolvedValue({ id: "user-1" }),
  doc: jest.fn(() => mockUserDoc),
};

const mockFirestore = jest.fn(() => ({
  listCollections: jest.fn().mockResolvedValue([]),
  collection: jest.fn((name) => {
    if (name === "_health") {
      return {
        doc: jest.fn(() => ({
          get: jest.fn().mockResolvedValue({ exists: false }),
        })),
      };
    }
    if (name === "users") return mockUsersCollection;
    if (name === "saved_phrases") return mockSavedPhrasesCollection;
    if (name === "cultureIntelligenceBriefs")
      return mockCultureBriefsCollection;
    throw new Error(`Unmocked collection: ${name}`);
  }),
}));
mockFirestore.FieldValue = {
  serverTimestamp: jest.fn(() => new Date()),
};
mockFirestore.__cultureBriefsStore = cultureBriefsStore;

jest.mock("firebase-admin", () => ({
  apps: [],
  credential: {
    cert: (value) => value,
  },
  initializeApp: jest.fn(),
  firestore: mockFirestore,
  auth: () => mockAuth,
}));

// Quiet noisy console output during test runs unless explicitly enabled
const quietLogs =
  process.env.NODE_ENV === "test" && process.env.VERBOSE_TEST_LOGS !== "true";
if (quietLogs) {
  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
  jest.spyOn(console, "log").mockImplementation(() => {});
}
