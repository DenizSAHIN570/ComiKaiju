<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { comicStorage } from "$lib/storage/comicStorage";
  import { logger } from "$lib/services/logger";

  // Real covers come from Open Library. `?default=false` makes a missing cover
  // return 404 (instead of a 1px blank served as 200), so failures are real
  // errors we can fall back on. CORS is open (access-control-allow-origin: *),
  // so we can fetch the bytes and cache them in IndexedDB.
  const ISBNS = [
    "9781401263409", // Batman: The Killing Joke
    "9781401238964", // Watchmen
    "9781302911140", // Infinity Gauntlet
    "9780785190219", // Civil War
    "9781607066019", // Saga, Vol. 1
    "9781401223175", // V for Vendetta
    "9781302928185", // Spider-Man: Miles Morales
    "9781401235420", // Batman: The Court of Owls
  ];
  const coverUrl = (isbn: string) =>
    `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`;
  const cacheKey = (isbn: string) => `hero-cover-${isbn}`;

  const TILE_COUNT = 24;
  const ROWS = 3;

  // Resolved real-cover object URLs, one slot per ISBN; null = unavailable
  // (missing cover, offline, or fetch failed) and that slot renders its SVG.
  let covers = $state<(string | null)[]>(ISBNS.map(() => null));
  let objectUrls: string[] = [];

  // Deterministic crude "comic cover" SVG per tile, echoing CoverArt's palette,
  // as a data URI so it can be a plain CSS background. Used as the base layer
  // and as the offline/fallback art.
  function svgCover(i: number): string {
    const hue = (i * 47 + 7) % 360;
    const bg = `hsl(${hue} 45% 18%)`;
    const band = `hsl(${hue} 60% 42%)`;
    const line = `hsl(${hue} 40% 30%)`;
    const num = String((i % 40) + 1).padStart(3, "0");
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300' viewBox='0 0 200 300'>
      <rect width='200' height='300' fill='${bg}'/>
      <rect x='0' y='96' width='200' height='96' fill='${band}'/>
      <rect x='16' y='232' width='168' height='6' fill='${line}'/>
      <rect x='16' y='250' width='120' height='6' fill='${line}'/>
      <text x='16' y='30' font-family='monospace' font-size='13' fill='hsl(${hue} 30% 88%)'>#${num}</text>
    </svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }

  // Tiles are tied to ISBN slots round-robin; each ISBN recurs ~3x across the
  // wall. A slot shows its real cover once resolved, otherwise its SVG.
  const tiles = Array.from({ length: TILE_COUNT }, (_, i) => ({
    i,
    isbnIndex: i % ISBNS.length,
    svg: svgCover(i),
  }));
  const rows = Array.from({ length: ROWS }, (_, r) =>
    tiles.filter((_, i) => i % ROWS === r),
  );

  async function resolveCover(isbn: string, slot: number) {
    try {
      let blob = await comicStorage.getSetting<Blob>(cacheKey(isbn));
      if (!blob) {
        if (!navigator.onLine) return; // offline, nothing cached → keep SVG
        const res = await fetch(coverUrl(isbn), { mode: "cors" });
        if (!res.ok) return; // 404 for a missing cover → keep SVG
        blob = await res.blob();
        if (blob.size < 1000) return; // guard against any stray blank
        await comicStorage.saveSetting(cacheKey(isbn), blob);
      }
      const url = URL.createObjectURL(blob);
      objectUrls.push(url);
      covers[slot] = url;
    } catch (e) {
      logger.warn("HeroCoverWall", `Cover unavailable for ${isbn}`, e);
    }
  }

  onMount(() => {
    void comicStorage
      .init()
      .then(() => Promise.all(ISBNS.map((isbn, slot) => resolveCover(isbn, slot))));
  });

  onDestroy(() => {
    for (const url of objectUrls) URL.revokeObjectURL(url);
  });
</script>

<div class="wall" aria-hidden="true">
  {#each rows as row, r (r)}
    <div class="row" style="--dur:{38 + r * 9}s">
      <!-- Sequence rendered twice for a seamless -50% translate loop. -->
      {#each [...row, ...row] as tile, k (r + "-" + k)}
        {@const real = covers[tile.isbnIndex]}
        <div class="tile" style="background-image:{tile.svg}">
          {#if real}
            <div class="real" style="background-image:url('{real}')"></div>
          {/if}
        </div>
      {/each}
    </div>
  {/each}
</div>

<style>
  .wall {
    position: absolute;
    inset: 0;
    z-index: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 14px;
    overflow: hidden;
    filter: blur(4px);
    /* Dim so it reads as ambient texture, not foreground. */
    opacity: 0.55;
    pointer-events: none;
  }

  .row {
    display: flex;
    gap: 14px;
    flex: none;
    width: max-content;
    animation: drift var(--dur) linear infinite;
    will-change: transform;
  }

  /* Odd rows drift the opposite direction for parallax. */
  .row:nth-child(even) {
    animation-direction: reverse;
  }

  .tile {
    flex: none;
    width: 132px;
    height: 198px;
    background-size: cover;
    background-position: center;
    position: relative;
  }

  .real {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center;
    animation: fade-in 0.6s ease both;
  }

  @keyframes drift {
    from {
      transform: translateX(0);
    }
    to {
      transform: translateX(-50%);
    }
  }

  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .row {
      animation: none;
    }
    .real {
      animation: none;
    }
  }
</style>
