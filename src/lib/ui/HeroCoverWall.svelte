<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { comicStorage } from "$lib/storage/comicStorage";
  import { logger } from "$lib/services/logger";

  // Real covers come from Open Library. `?default=false` makes a missing cover
  // return 404 (instead of a 1px blank served as 200), so failures are real
  // errors we can fall back on. CORS is open (access-control-allow-origin: *),
  // so we can fetch the bytes and cache them in IndexedDB.
  //
  // NOTE: Open Library's ISBN->cover data is unreliable. Every ISBN below was
  // verified on 2026-07-20 to return a genuine comic/manga cover, but the cover
  // Open Library serves is often NOT the book the ISBN nominally names — the
  // comment after each is the title Open Library ACTUALLY returns. That is fine:
  // this is a blurred decorative wall, so what matters is "looks like a comic".
  // ISBNs that returned a blank or a non-comic (e.g. a novel/game guide) were
  // dropped during verification.
  const ISBNS = [
    "9780785115601", // Uncanny X-Men
    "9780785121794", // Civil War
    "9780785134978", // Thor (Marvel Masterworks)
    "9780785145387", // Essential Fantastic Four
    "9780785156598", // Infinity Gauntlet
    "9780785157151", // Ultimate Comics Spider-Man
    "9780785160441", // Villains for Hire
    "9780785190165", // Revolutionary War: Alpha
    "9780785190219", // Ms. Marvel: No Normal
    "9781401216542", // (real comic cover)
    "9781401223175", // Batman: Hush
    "9781401223595", // Bad Girls
    "9781401225759", // The Sandman: Preludes & Nocturnes
    "9781401230005", // Fables: Rose Red
    "9781401232597", // Batman: The Long Halloween
    "9781401235420", // Batman: The Court of Owls
    "9781401235444", // Suicide Squad
    "9781401235468", // Superman: Action Comics
    "9781401238124", // Tiny Titans
    "9781401246983", // Justice League
    "9781401248192", // Watchmen
    "9781401263171", // Prez
    "9781421561325", // Uzumaki
    "9781434248350", // Green Lantern: The Animated Series
    "9781569319000", // Naruto, Vol. 1
    "9781607062158", // Echoes
    "9781607066019", // Saga, Vol. 1
    "9781607066552", // (real comic cover)
    "9781616554316", // Soupy Leaves Home
    "9781616558697", // The Savage Sword of Conan
    "9781632150400", // Rat Queens
    "9781632152329", // Nailbiter
    "9781632156778", // Sex
  ];
  const coverUrl = (isbn: string) =>
    `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`;
  const cacheKey = (isbn: string) => `hero-cover-${isbn}`;

  const ROWS = 3;
  const TILE_W = 132;
  const GAP = 14;

  // Resolved real-cover object URLs, one slot per ISBN; null = unavailable
  // (missing cover, offline, or fetch failed) and that slot renders its SVG.
  let covers = $state<(string | null)[]>(ISBNS.map(() => null));
  let objectUrls: string[] = [];

  // Deterministic "comic cover" placeholder per tile, echoing CoverArt's HSL
  // palette, as a data URI so it can be a plain CSS background. Two layouts —
  // a masthead-style cover and a title-band cover — alternate for variety.
  function svgCover(i: number): string {
    const hue = (i * 47 + 7) % 360;
    const bg = `hsl(${hue} 44% 15%)`;
    const bg2 = `hsl(${hue} 42% 21%)`;
    const band = `hsl(${hue} 52% 36%)`;
    const accent = `hsl(${(hue + 26) % 360} 72% 54%)`;
    const shadow = `hsl(${hue} 45% 10%)`;
    const ink = `hsl(${hue} 25% 90%)`;
    const num = "#" + String((i % 60) + 1).padStart(3, "0");
    // faux barcode: a few thin bars
    const bars = [0, 4, 7, 12, 15, 21, 25]
      .map((x) => `<rect x='${152 + x}' y='272' width='2' height='18' fill='${ink}' opacity='.7'/>`)
      .join("");

    const masthead = `
      <rect width='200' height='300' fill='${bg}'/>
      <rect y='54' width='200' height='182' fill='${band}'/>
      <rect x='34' y='96' width='132' height='104' fill='${shadow}' opacity='.35'/>
      <rect width='200' height='54' fill='${bg2}'/>
      <rect y='53' width='200' height='2' fill='${accent}'/>
      <rect x='12' y='11' width='32' height='32' fill='${accent}'/>
      <rect x='54' y='15' width='120' height='11' rx='1' fill='${ink}' opacity='.9'/>
      <rect x='54' y='31' width='84' height='8' rx='1' fill='${ink}' opacity='.55'/>
      <rect y='236' width='200' height='64' fill='${bg2}'/>
      <text x='12' y='262' font-family='monospace' font-size='13' fill='${ink}'>${num}</text>
      ${bars}`;

    const titleBand = `
      <rect width='200' height='300' fill='${band}'/>
      <rect y='0' width='200' height='150' fill='${shadow}' opacity='.25'/>
      <rect y='150' width='200' height='150' fill='${bg}'/>
      <rect y='44' width='200' height='70' fill='${accent}'/>
      <rect x='16' y='58' width='150' height='20' rx='2' fill='${shadow}'/>
      <rect x='16' y='84' width='104' height='12' rx='2' fill='${shadow}' opacity='.75'/>
      <rect x='156' y='12' width='32' height='32' fill='${shadow}'/>
      <rect x='158' y='14' width='28' height='28' fill='none' stroke='${accent}' stroke-width='2'/>
      <rect x='16' y='210' width='168' height='3' fill='${shadow}'/>
      <text x='16' y='276' font-family='monospace' font-size='13' fill='${ink}'>${num}</text>
      ${bars}`;

    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300' viewBox='0 0 200 300'>${
      i % 2 === 0 ? masthead : titleBand
    }</svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }

  // How many tiles a row needs so that ONE copy is at least as wide as the
  // viewport. The row is rendered twice and translated by -50%, so a single
  // copy must span the screen or a gap appears at the wrap point. Recomputed
  // on resize. Falls back to a generous count before mount / on the server.
  let perRow = $state(20);
  function recomputePerRow() {
    const w = typeof window !== "undefined" ? window.innerWidth : 1920;
    perRow = Math.ceil(w / (TILE_W + GAP)) + 3;
  }

  // Tiles are tied to ISBN slots so real covers spread across the wall; the
  // per-row offset keeps neighbouring rows from lining up identically.
  const rows = $derived(
    Array.from({ length: ROWS }, (_, r) =>
      Array.from({ length: perRow }, (_, k) => {
        const seed = r * 7 + k;
        return { key: r + "-" + k, isbnIndex: seed % ISBNS.length, svg: svgCover(seed) };
      }),
    ),
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
    recomputePerRow();
    window.addEventListener("resize", recomputePerRow);
    void comicStorage
      .init()
      .then(() => Promise.all(ISBNS.map((isbn, slot) => resolveCover(isbn, slot))));
  });

  onDestroy(() => {
    if (typeof window !== "undefined") window.removeEventListener("resize", recomputePerRow);
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
    filter: blur(2.5px);
    /* Dim so it reads as ambient texture, not foreground. */
    opacity: 0.55;
    pointer-events: none;
  }

  .row {
    display: flex;
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
    /* Spacing via margin (not flex gap) so every tile — including the last of
       each copy — carries a trailing gap. That makes the doubled row exactly
       two periods wide, so the -50% drift loops with no seam. */
    margin-right: 14px;
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
