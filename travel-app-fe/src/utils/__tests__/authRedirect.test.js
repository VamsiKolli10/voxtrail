import { expect, it } from "vitest";
import { authRedirect } from "../authRedirect";

it.each([undefined, "//other.test", "/\\other.test", "/\n/other.test", "/login", { pathname: 42 }])("rejects invalid return locations: %j", (from) => {
  expect(authRedirect(from)).toBe("/home");
});
it("preserves the destination query and fragment", () => {
  expect(authRedirect({ pathname: "/saved-stays", search: "?lang=fr", hash: "#notes" })).toBe("/saved-stays?lang=fr#notes");
});
