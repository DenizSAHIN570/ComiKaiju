import adapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),

  kit: {
    // SvelteKit auto-registers src/service-worker.ts on every origin, including the
    // dev server, where its cache-first strategy pins stale CSS/JS across reloads.
    // +layout.svelte registers it explicitly for production only.
    serviceWorker: { register: false },
    adapter: adapter({
      pages: "build",
      assets: "build",
      fallback: undefined,
      precompress: false,
      strict: true,
    }),
  },
};

export default config;
