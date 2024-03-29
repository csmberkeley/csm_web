import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

export const testQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false
    }
  }
});

/**
 * Wrap an element with a query client provider, so that react-query functions correctly.
 */
export const testQueryClientWrapper = ({ children }: { children: React.ReactElement }) => (
  <QueryClientProvider client={testQueryClient}>{children}</QueryClientProvider>
);
