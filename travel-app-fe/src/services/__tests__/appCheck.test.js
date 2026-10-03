import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../firebase", () => ({ firebaseApp: { name: "test-app" } }));

const sdk = vi.hoisted(() => ({
  initializeAppCheck: vi.fn(() => ({ id: "app-check" })),
  ReCaptchaV3Provider: vi.fn(),
  getToken: vi.fn(async () => ({ token: "app-check-token" })),
}));
vi.mock("firebase/app-check", () => sdk);

describe("getAppCheckToken (ADR-002)", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    (await import("../appCheck")).__resetAppCheckForTests();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("is a no-op without a site key", async () => {
    vi.stubEnv("VITE_APPCHECK_RECAPTCHA_SITE_KEY", "");
    const { getAppCheckToken } = await import("../appCheck");
    expect(await getAppCheckToken()).toBeNull();
    expect(sdk.initializeAppCheck).not.toHaveBeenCalled();
  });

  it("initializes once and returns tokens when configured", async () => {
    vi.stubEnv("VITE_APPCHECK_RECAPTCHA_SITE_KEY", "site-key");
    const { getAppCheckToken } = await import("../appCheck");
    expect(await getAppCheckToken()).toBe("app-check-token");
    expect(await getAppCheckToken()).toBe("app-check-token");
    expect(sdk.initializeAppCheck).toHaveBeenCalledTimes(1);
    expect(sdk.ReCaptchaV3Provider).toHaveBeenCalledWith("site-key");
  });

  it("never throws when the token can't be fetched", async () => {
    vi.stubEnv("VITE_APPCHECK_RECAPTCHA_SITE_KEY", "site-key");
    sdk.getToken.mockRejectedValueOnce(new Error("network"));
    const { getAppCheckToken } = await import("../appCheck");
    expect(await getAppCheckToken()).toBeNull();
  });
});
