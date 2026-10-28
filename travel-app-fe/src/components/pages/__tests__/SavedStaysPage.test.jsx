import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { renderWithQuery as render } from "../../../test/renderWithQuery";
import SavedStaysPage from "../SavedStaysPage";
import SaveStayButton from "../../stays/SaveStayButton";
import {
  listSavedStays,
  saveStay,
  removeSavedStay,
} from "../../../services/savedStays";
import { queryKeys } from "../../../services/queryKeys";

const session = vi.hoisted(() => ({ user: { uid: "owner-a" }, online: true }));
vi.mock("../../../contexts/AuthContext.jsx", () => ({
  useAuth: () => ({ user: session.user }),
}));
vi.mock("../../../hooks/useConnectivity", () => ({
  default: () => ({ isOnline: session.online }),
}));
vi.mock("../../../services/savedStays", () => ({
  listSavedStays: vi.fn(),
  saveStay: vi.fn(),
  removeSavedStay: vi.fn(),
}));
let server;
const fixture = () => (
  <MemoryRouter>
    <SaveStayButton placeId="place-1" stayName="Hotel One" />
    <SaveStayButton placeId="place-1" stayName="Hotel One" />
    <SavedStaysPage />
  </MemoryRouter>
);
const savedItem = {
  placeId: "place-1",
  nickname: "Near the station",
  notes: "Ask about early check-in",
  createdAt: "2026-10-07T10:00:00.000Z",
};

beforeEach(() => {
  vi.resetAllMocks();
  session.user = { uid: "owner-a" };
  session.online = true;
  server = [];
  listSavedStays.mockImplementation(async () => [...server]);
  saveStay.mockImplementation(async (item) => {
    server = [{ ...savedItem, ...item }];
    return { placeId: item.placeId };
  });
  removeSavedStay.mockImplementation(async () => {
    server = [];
  });
});

describe("Saved stays workflow", () => {
  it("saves once, synchronizes bookmarks, survives remount, edits and removes", async () => {
    const first = render(fixture());
    const bookmarks = await screen.findAllByRole("button", {
      name: "Save stay: Hotel One",
    });
    await waitFor(() => expect(bookmarks[0]).toBeEnabled());
    fireEvent.click(bookmarks[0]);
    const dialog = screen.getByRole("dialog", { name: "Save stay" });
    expect(within(dialog).getByLabelText(/Nickname/)).toHaveValue("");
    expect(
      within(dialog).getByRole("button", { name: "Save stay" }),
    ).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText(/Nickname/), {
      target: { value: " Near the station " },
    });
    fireEvent.change(within(dialog).getByLabelText(/Notes/), {
      target: { value: savedItem.notes },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save stay" }));
    await screen.findByRole("heading", { name: savedItem.nickname });
    expect(saveStay).toHaveBeenCalledWith({
      placeId: "place-1",
      nickname: savedItem.nickname,
      notes: savedItem.notes,
    });
    await waitFor(() =>
      screen
        .getAllByRole("button", { name: "Remove saved stay: Hotel One" })
        .forEach((button) =>
          expect(button).toHaveAttribute("aria-pressed", "true"),
        ),
    );
    first.unmount();

    render(fixture()); // a new query client loads the server's saved state
    await screen.findByRole("heading", { name: savedItem.nickname });
    expect(
      screen.getByRole("link", { name: "Open stay details" }),
    ).toHaveAttribute("href", "/stays/place-1");
    fireEvent.click(
      screen.getByRole("button", { name: `Edit ${savedItem.nickname}` }),
    );
    fireEvent.change(screen.getByLabelText(/Nickname/), {
      target: { value: "First choice" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await screen.findByRole("heading", { name: "First choice" });
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Remove First choice" }),
      ).toBeEnabled(),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Remove First choice" }),
    );
    await screen.findByText("Your shortlist starts here");
    expect(removeSavedStay).toHaveBeenCalledWith("place-1");
    await waitFor(() =>
      screen
        .getAllByRole("button", { name: "Save stay: Hotel One" })
        .forEach((button) =>
          expect(button).toHaveAttribute("aria-pressed", "false"),
        ),
    );
  });

  it("retains entered notes and the dialog when a save fails, then retries", async () => {
    saveStay.mockRejectedValueOnce({
      response: { data: { error: { message: "Your shortlist is full." } } },
    });
    render(fixture());
    await waitFor(() =>
      expect(
        screen.getAllByRole("button", { name: "Save stay: Hotel One" })[0],
      ).toBeEnabled(),
    );
    fireEvent.click(
      screen.getAllByRole("button", { name: "Save stay: Hotel One" })[0],
    );
    fireEvent.change(screen.getByLabelText(/Nickname/), {
      target: { value: "Backup" },
    });
    fireEvent.change(screen.getByLabelText(/Notes/), {
      target: { value: "My notes" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Save stay", exact: true }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Your shortlist is full.",
    );
    expect(screen.getByLabelText(/Notes/)).toHaveValue("My notes");
    fireEvent.click(
      screen.getByRole("button", { name: "Save stay", exact: true }),
    );
    await screen.findByRole("heading", { name: "Backup" });
    expect(saveStay).toHaveBeenCalledTimes(2);
  });

  it("shows save errors immediately even while the invalidated list is pending", async () => {
    saveStay.mockRejectedValueOnce({ response: { data: { error: { message: "Save failed" } } } });
    render(fixture());
    await screen.findByText("Your shortlist starts here");
    let finishRefetch;
    listSavedStays.mockImplementation(() => new Promise((resolve) => { finishRefetch = resolve; }));
    fireEvent.click(screen.getAllByRole("button", { name: "Save stay: Hotel One" })[0]);
    fireEvent.change(screen.getByLabelText(/Nickname/), { target: { value: "Backup" } });
    fireEvent.click(screen.getByRole("button", { name: "Save stay", exact: true }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Save failed");
    expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled();
    expect(screen.getByLabelText(/Nickname/)).toBeEnabled();
    await act(async () => finishRefetch([]));
  });

  it("offers a retry when loading fails and never treats failure as an empty list", async () => {
    listSavedStays.mockRejectedValueOnce(new Error("Network error"));
    render(fixture());
    await screen.findByText(/Could not load saved stays/);
    expect(
      screen.queryByText("Your shortlist starts here"),
    ).not.toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "Save stay: Hotel One" })[0],
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await screen.findByText("Your shortlist starts here");
    await waitFor(() =>
      expect(
        screen.getAllByRole("button", { name: "Save stay: Hotel One" })[0],
      ).toBeEnabled(),
    );
  });

  it("keeps loaded notes visible offline and disables changes", async () => {
    server = [savedItem];
    const view = render(fixture());
    await screen.findByText(savedItem.notes);
    session.online = false;
    view.rerender(fixture());
    expect(screen.getByText(/Connect to load or change/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: `Edit ${savedItem.nickname}` }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: `Remove ${savedItem.nickname}` }),
    ).toBeDisabled();
    expect(screen.getByText(savedItem.notes)).toBeInTheDocument();
  });

  it("never shows the previous account's shortlist on an account change", async () => {
    server = [savedItem];
    const view = render(fixture());
    await screen.findByRole("heading", { name: savedItem.nickname });
    fireEvent.click(
      screen.getByRole("button", { name: `Edit ${savedItem.nickname}` }),
    );
    expect(screen.getByLabelText(/Notes/)).toHaveValue(savedItem.notes);
    session.user = { uid: "owner-b" };
    server = [];
    view.rerender(fixture());
    expect(
      screen.queryByRole("heading", { name: savedItem.nickname }),
    ).not.toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    await screen.findByText("Your shortlist starts here");
  });

  it("prevents duplicate writes and keeps a stay when removal fails", async () => {
    server = [savedItem];
    let reject;
    removeSavedStay.mockImplementation(
      () =>
        new Promise((_resolve, fail) => {
          reject = fail;
        }),
    );
    render(fixture());
    await screen.findByRole("heading", { name: savedItem.nickname });
    fireEvent.click(
      screen.getByRole("button", { name: `Remove ${savedItem.nickname}` }),
    );
    await waitFor(() =>
      screen
        .getAllByRole("button", { name: "Remove saved stay: Hotel One" })
        .forEach((button) => expect(button).toBeDisabled()),
    );
    await act(async () => reject(new Error("Network error")));
    expect(
      screen.getByRole("heading", { name: savedItem.nickname }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: `Remove ${savedItem.nickname}` }),
      ).toBeEnabled(),
    );
    expect(removeSavedStay).toHaveBeenCalledTimes(1);
  });

  it("cancels a stale background read before saving", async () => {
    const view = render(fixture());
    await screen.findByText("Your shortlist starts here");
    let signal;
    listSavedStays.mockImplementationOnce((options) => {
      signal = options.signal;
      return new Promise(() => {});
    });
    act(() => {
      void view.queryClient.invalidateQueries({
        queryKey: queryKeys.savedStays.list(session.user.uid),
      });
    });
    await waitFor(() => expect(signal).toBeDefined());
    fireEvent.click(
      screen.getAllByRole("button", { name: "Save stay: Hotel One" })[0],
    );
    fireEvent.change(screen.getByLabelText(/Nickname/), {
      target: { value: "Fresh choice" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Save stay", exact: true }),
    );
    await screen.findByRole("heading", { name: "Fresh choice" });
    expect(signal.aborted).toBe(true);
  });
});
