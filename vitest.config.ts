import path from "node:path";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vitest/config";

// Frontend tests remain hermetic through HTTP stubs and local component mocks.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  plugins: [react()],
  test: {
    name: "frontend",
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./src/vitest.setup.ts"],
    passWithNoTests: true,
    restoreMocks: true,
  },
});
