const STORAGE_KEY = "recentActivity";
const MAX_ITEMS = 15;

function safeParse(json, fallback = []) {
  try {
    return JSON.parse(json) || fallback;
  } catch (_e) {
    return fallback;
  }
}

export function readRecentActivity(limit = MAX_ITEMS) {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? safeParse(raw, []) : [];
    const list = Array.isArray(parsed) ? parsed : [];
    return list.slice(0, limit);
  } catch (_e) {
    return [];
  }
}

function persistRecentActivity(items) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
  window.dispatchEvent(new CustomEvent("recent-activity-updated"));
}

export function logRecentActivity(entry = {}) {
  if (typeof window === "undefined") return;
  try {
    const items = readRecentActivity(MAX_ITEMS);
    const timestamp = entry.timestamp || Date.now();
    const record = {
      id: entry.id || `${timestamp}-${Math.random().toString(36).slice(2, 7)}`,
      type: entry.type || "activity",
      title: entry.title || "Recent activity",
      description: entry.description || "",
      meta: entry.meta || {},
      timestamp,
    };
    const next = [record, ...items].slice(0, MAX_ITEMS);
    persistRecentActivity(next);
  } catch (_e) {
    // Recent activity is an enhancement and must never break the primary flow.
  }
}

export function clearRecentActivity() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("recent-activity-updated"));
}
