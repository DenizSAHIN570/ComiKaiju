/// <reference types="@sveltejs/kit" />
import { build, files, version } from "$service-worker";

// Create a unique cache name for this deployment
const CACHE_NAME = `cache-${version}`;

const ASSETS = [
  ...build, // the app itself
  ...files, // everything in `static`
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
    const url = new URL(event.request.url);
    const cache = await caches.open(CACHE_NAME);

    // Try to serve from cache first
    const response = await cache.match(event.request);

    if (response) {
      return response;
    }

    // Fallback to network
    try {
      const networkResponse = await fetch(event.request);

      if (networkResponse.status === 200) {
        cache.put(event.request, networkResponse.clone());
      }

      return networkResponse;
    } catch (err) {
      // If network fails and no cache, we are truly offline and don't have the resource
      throw err;
    }
  }

  event.respondWith(respond());
});
