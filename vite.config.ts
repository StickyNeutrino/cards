import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { reactRouter } from "@react-router/dev/vite";
import tsconfigPaths from "vite-tsconfig-paths";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [!process.env.VITEST &&  reactRouter(), react(), tsconfigPaths()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./test/setup.ts",
    server: {
      deps: {
        inline: [/react-router/],
      },
    },
    include: ["test/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
  },
} as any);
