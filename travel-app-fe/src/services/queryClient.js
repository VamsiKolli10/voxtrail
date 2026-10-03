// Server state lives in TanStack Query (docs/adr/005-frontend-server-state.md).
import { QueryClient } from "@tanstack/react-query";

export function isClientError(error) {
  const status = error?.response?.status;
  return typeof status === "number" && status >= 400 && status < 500;
}

export function createQueryClient(overrides = {}) {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Most results are billed provider calls (Places, AI); a minute of
        // freshness lets back/forward navigation reuse them.
        staleTime: 60 * 1000,
        gcTime: 10 * 60 * 1000,
        // Don't re-bill provider calls just because the tab regained focus.
        refetchOnWindowFocus: false,
        // Retry flaky networks and 5xx twice; a 4xx won't fix itself.
        retry: (failureCount, error) =>
          !isClientError(error) && failureCount < 2,
        ...overrides.queries,
      },
      mutations: {
        // Writes such as "save phrase" aren't idempotent: a retry after a
        // lost response could save twice, so mutations don't retry.
        retry: false,
        ...overrides.mutations,
      },
    },
  });
}

export const queryClient = createQueryClient();
