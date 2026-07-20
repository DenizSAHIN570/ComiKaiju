/// <reference types="@sveltejs/kit" />
import { build, files, prerendered, version } from "$service-worker";

// Create a unique cache name for this deployment
const CACHE_NAME = `cache-${version}`;

const ASSETS = [
  ...build, // the app itself
  ...files, // everything in `static`
  ...prerendered, // the prerendered HTML pages (/, /library, /reader, /settings)
];

self.addEventListener("install", (event: any) => {
  // Create a new cache and add all files to it
  async function addFilesToCache() {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(ASSETS);
  }

  event.waitUntil(addFilesToCache());
  (self as any).skipWaiting();
});

self.addEventListener("activate", (event: any) => {
  // Remove previous cached data from disk
  async function deleteOldCaches() {
    for (const key of await caches.keys()) {
      if (key !== CACHE_NAME) await caches.delete(key);
    }
  }

  event.waitUntil(deleteOldCaches());
  (self as any).clients.claim();
});

self.addEventListener("fetch", (event: any) => {
  // ignore POST requests etc
  if (event.request.method !== "GET") return;

  async function respond() {
    const cache = await caches.open(CACHE_NAME);

    // Try to serve from cache first
    const response = await cache.match(event.request);

    if (response) {
      return response;
    }

    // Fallback to network.
    try {
      const networkResponse = await fetch(event.request);

      if (networkResponse.status === 200) {
        cache.put(event.request, networkResponse.clone());
      }

      return networkResponse;
    } catch (err) {
      // Offline with nothing cached for this exact request. A navigation to a
      // route we haven't stored still has to boot the app, so fall back to the
      // cached app shell; the client router takes it from there.
      if (event.request.mode === "navigate") {
        const shell = await cache.match("/");
        if (shell) return shell;
      }

      throw err;
    }
  }

  event.respondWith(respond());
});
