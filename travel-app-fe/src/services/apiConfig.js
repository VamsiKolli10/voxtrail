export function normalizeApiBaseUrl(value = "http://localhost:8000/api") {
  const base = value.trim().replace(/\/+$/, "");
  return base.endsWith("/api") ? base : `${base}/api`;
}

// Provider photo paths already include /api; keep the signed query untouched.
export function resolveApiAssetUrl(value, base = import.meta.env.VITE_API_URL) {
  if (!value || /^https?:\/\//i.test(value)) return value;
  const root = normalizeApiBaseUrl(base).replace(/\/api$/, "");
  return `${root}/${value.replace(/^\/+/, "")}`;
}
