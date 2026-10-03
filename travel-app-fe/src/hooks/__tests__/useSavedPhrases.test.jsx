import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "../../test/renderWithQuery";
import useSavedPhrases from "../useSavedPhrases";
import { listSavedPhrases, addSavedPhrase } from "../../services/savedPhrases";
import { cacheSavedPhrases, readSavedPhrases } from "../../services/offlineCache";

vi.mock("../../services/savedPhrases", () => ({
  listSavedPhrases: vi.fn(),
  addSavedPhrase: vi.fn(),
  removeSavedPhrase: vi.fn(),
}));
vi.mock("../../services/offlineCache", () => ({
  cacheSavedPhrases: vi.fn(),
  readSavedPhrases: vi.fn(),
}));
let connectivity = { isOnline: true };
vi.mock("../useConnectivity", () => ({ __esModule: true, default: () => connectivity }));

function setup() {
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const view = renderHook(() => useSavedPhrases("u1"), { wrapper });
  return { queryClient, ...view };
}

describe("useSavedPhrases (ADR-005)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    connectivity = { isOnline: true };
    cacheSavedPhrases.mockResolvedValue(true);
    readSavedPhrases.mockResolvedValue([]);
  });

  it("loads from the API and refreshes the offline snapshot", async () => {
    listSavedPhrases.mockResolvedValue([{ id: "1", phrase: "Hola" }]);
    const { result } = setup();
    await waitFor(() => expect(result.current.saved).toHaveLength(1));
    expect(result.current.usingOffline).toBe(false);
    expect(cacheSavedPhrases).toHaveBeenCalledWith([{ id: "1", phrase: "Hola" }], "u1");
  });

  it("uses the snapshot when offline", async () => {
    connectivity = { isOnline: false };
    readSavedPhrases.mockResolvedValue([{ id: "1", phrase: "Merci" }]);
    const { result } = setup();
    await waitFor(() => expect(result.current.saved).toHaveLength(1));
    expect(result.current.usingOffline).toBe(true);
    expect(listSavedPhrases).not.toHaveBeenCalled();
  });

  it("falls back to the snapshot when the API fails", async () => {
    listSavedPhrases.mockRejectedValue(new Error("Network Error"));
    readSavedPhrases.mockResolvedValue([{ id: "1", phrase: "Danke" }]);
    const { result } = setup();
    await waitFor(() => expect(result.current.saved[0]?.phrase).toBe("Danke"));
    expect(result.current.usingOffline).toBe(true);
  });

  it("refetches the list after saving a phrase", async () => {
    listSavedPhrases.mockResolvedValueOnce([]);
    listSavedPhrases.mockResolvedValueOnce([{ id: "new", phrase: "Ciao" }]);
    addSavedPhrase.mockResolvedValue("new");
    const { result } = setup();
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(() => result.current.savePhrase({ phrase: "Ciao" }));
    await waitFor(() => expect(result.current.saved[0]?.phrase).toBe("Ciao"));
    expect(listSavedPhrases).toHaveBeenCalledTimes(2);
  });
});
