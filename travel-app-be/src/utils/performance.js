const positiveLimit = (value, fallback) =>
  Number.isSafeInteger(Number(value)) && Number(value) > 0 ? Number(value) : fallback;
const MAX_SAMPLES_PER_ROUTE = positiveLimit(process.env.PERF_SAMPLES_MAX, 200);
const MAX_ROUTES = positiveLimit(process.env.PERF_ROUTES_MAX, 256);

const timings = new Map(); // routeKey -> { samples: number[] }

function recordTiming(routeKey, durationMs) {
  if (!routeKey || !Number.isFinite(durationMs)) return;
  const bucket = timings.get(routeKey) || { samples: [] };
  // Refresh insertion order so the least recently used route is evicted first.
  timings.delete(routeKey);
  bucket.samples.push(durationMs);
  if (bucket.samples.length > MAX_SAMPLES_PER_ROUTE) {
    // drop oldest to bound memory
    bucket.samples.shift();
  }
  timings.set(routeKey, bucket);
  if (timings.size > MAX_ROUTES) timings.delete(timings.keys().next().value);
}

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.min(
    sorted.length - 1,
    Math.floor((p / 100) * sorted.length)
  );
  return sorted[idx];
}

function summarize(samples) {
  if (!samples.length) {
    return {
      count: 0,
      minMs: 0,
      maxMs: 0,
      avgMs: 0,
      p50Ms: 0,
      p95Ms: 0,
      p99Ms: 0,
    };
  }
  const sorted = [...samples].sort((a, b) => a - b);
  const count = sorted.length;
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  return {
    count,
    minMs: sorted[0],
    maxMs: sorted[sorted.length - 1],
    avgMs: sum / count,
    p50Ms: percentile(sorted, 50),
    p95Ms: percentile(sorted, 95),
    p99Ms: percentile(sorted, 99),
  };
}

function getPerformanceSnapshot() {
  return Array.from(timings.entries()).map(([route, { samples }]) => ({
    route,
    ...summarize(samples),
  }));
}

module.exports = {
  recordTiming,
  getPerformanceSnapshot,
};
