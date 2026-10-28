import { render } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient } from "../services/queryClient";

// Fresh client per test: no shared cache, no retries, no garbage-collection timers.
export function createTestQueryClient() {
  return createQueryClient({ queries: { retry: false, gcTime: Infinity } });
}

export function renderWithQuery(ui, { queryClient = createTestQueryClient(), ...options } = {}) {
  const Wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, ...render(ui, { wrapper: Wrapper, ...options }) };
}
