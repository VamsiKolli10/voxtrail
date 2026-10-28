export function authRedirect(from, fallback = "/home") {
  const path = typeof from === "string" ? from : from?.pathname;
  if (typeof path !== "string" || !path.startsWith("/") || path.startsWith("//") ||
      path.includes("\\") || [...path].some((char) => char.charCodeAt(0) <= 32)) return fallback;
  if (["/login", "/register"].includes(path.split(/[?#]/)[0])) return fallback;
  return typeof from === "string" ? path : `${path}${from.search || ""}${from.hash || ""}`;
}
