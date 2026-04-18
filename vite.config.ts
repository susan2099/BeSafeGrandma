import { defineConfig } from "npm:vite@^5";
import react from "npm:@vitejs/plugin-react@^4";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Forward /scribe-token from the Vite dev server → the Deno token server
      // so the browser never has to deal with CORS
      "/scribe-token": "http://localhost:3001",
    },
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-dom/client"],
  },
});
