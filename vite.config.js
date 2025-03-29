import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "wasm-mime",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url.endsWith(".wasm")) {
            res.setHeader("Content-Type", "application/wasm");
          }
          // Set the headers on every response.
          res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
          res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
          next();
        });
      },
    },
  ],
  server: {
    allowedHosts: true,
    server: {
      headers: {
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Embedder-Policy": "require-corp",
      },
    },
    assetsInclude: ["**/*.wasm"],
  },
  build: {
    target: "esnext",
    minify: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
        },
      },
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      target: "esnext",
    },
  },
});
