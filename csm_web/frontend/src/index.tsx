// Global styles (imported before any components to allow for overrides)
import "./css/base/styles.scss";
import "./css/fontawesome-styles.scss";

import App from "./components/App";
import React from "react";
import { BrowserRouter as Router } from "react-router-dom";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

// react-query setup
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 5 minute stale time
      staleTime: 1000 * 60 * 5
    }
  }
});

const root = createRoot(document.getElementById("app") as HTMLElement);
root.render(
  <React.StrictMode>
    <Router>
      <QueryClientProvider client={queryClient}>
        <App />
        <ReactQueryDevtools />
      </QueryClientProvider>
    </Router>
  </React.StrictMode>
);
