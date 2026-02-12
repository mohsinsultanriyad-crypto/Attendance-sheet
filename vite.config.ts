import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  // Only load env that starts with VITE_
  const env = loadEnv(mode, process.cwd(), "VITE_");

  return {
    plugins: [react()],

    // IMPORTANT: keep base default for Render root hosting
    // base: "/",

    server: {
      port: 3000,
      host: true,
    },

    resolve: {
      alias: {
        // Use @ as src alias (standard)
        "@": path.resolve(__dirname, "src"),
      },
    },

    define: {
      // If your code references process.env.GEMINI_API_KEY, keep it from VITE_ var
      // But NOTE: putting API keys in frontend is NOT secure.
      "process.env.GEMINI_API_KEY": JSON.stringify(env.VITE_GEMINI_API_KEY || ""),
      "process.env.API_KEY": JSON.stringify(env.VITE_GEMINI_API_KEY || ""),
    },
  };
});
