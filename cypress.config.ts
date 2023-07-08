import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    projectId: "ar111y",
    baseUrl: "http://localhost:8000"
  },
  experimentalWebKitSupport: true
});
