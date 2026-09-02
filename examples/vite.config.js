import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

export default {
  root: HERE,
  // GitHub Pages supplies its repository subpath during the production build.
  // Local development and ordinary production builds remain rooted at `/`.
  base: process.env.VITE_BASE_PATH ?? "/",
  server: {
    port: 5173,
    host: "127.0.0.1",
    // Allow serving the fixtures we glob from `../test/fixtures/`.
    fs: { allow: [resolve(HERE, "..")] },
  },
};
