export function normalizeApiBaseUrl(value = "http://localhost:8000/api") {
  const base = value.trim().replace(/\/+$/, "");
  return base.endsWith("/api") ? base : `${base}/api`;
}
