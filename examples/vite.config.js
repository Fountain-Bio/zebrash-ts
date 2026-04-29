import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

export default {
  root: HERE,
  server: {
    port: 5173,
    host: "127.0.0.1",
    // Allow serving the fixtures we glob from `../test/fixtures/`.
    fs: { allow: [resolve(HERE, "..")] },
  },
};
