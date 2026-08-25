import path from "node:path";
import react from "@vitejs/plugin-react";
import federation from "@originjs/vite-plugin-federation";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^use-sync-external-store\/shim\/with-selector(\.js)?$/,
        replacement: path.resolve(
          __dirname,
          "src/shims/use-sync-external-store-with-selector-shim.ts",
        ),
      },
      {
        find: /^use-sync-external-store\/shim(\/index\.js|\/index)?$/,
        replacement: path.resolve(
          __dirname,
          "src/shims/use-sync-external-store-shim.ts",
        ),
      },
      {
        find: /^use-sync-external-store(\/index\.js|\/index)?$/,
        replacement: path.resolve(
          __dirname,
          "src/shims/use-sync-external-store-shim.ts",
        ),
      },
    ],
  },
  plugins: [
    react(),
    federation({
      name: "com_paca_omniboard",
      filename: "remoteEntry.js",
      exposes: {
        "./ProjectOmniboardPage": "./src/ProjectOmniboardPage.tsx",
        "./AdminOmniboardPage": "./src/AdminOmniboardPage.tsx",
        "./OmniboardIntegrationView": "./src/OmniboardIntegrationView.tsx",
      },
      shared: {
        react: { requiredVersion: "^19.0.0" },
        "react-dom": { requiredVersion: "^19.0.0" },
        "@tanstack/react-query": { requiredVersion: "^5.0.0" },
      },
    }),
  ],
  build: {
    target: "esnext",
    minify: false,
    cssCodeSplit: false,
  },
});
