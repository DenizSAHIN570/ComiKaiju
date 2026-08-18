<script lang="ts">
  // ComiKaiju mark: a kaiju eye peering through a torn comic panel.
  // Traced from the official logo1.svg / logo1beyaz.svg source files.
  // "paper"/"ink" flip with the app's own light/dark theme class (set on
  // <html> by themeEngine.ts) — not prefers-color-scheme — so it always
  // matches whatever the user picked in Settings. The iris stays a fixed
  // brand orange; it isn't tied to the user's chosen accent color.
  export let size: number = 40;
  export let withWordmark: boolean = false;

  // Source artboard is 2000x2000; these are the tight content bounds within
  // it (icon alone, vs. icon + wordmark lockup) so the rendered mark isn't
  // padded with empty artboard margin.
  const ICON_BOX = { x: 446.63, y: 553.04, w: 1121.65, h: 640.88 };
  const LOCKUP_BOX = { x: 404.07, y: 553.03, w: 1205.29, h: 845.39 };
  $: box = withWordmark ? LOCKUP_BOX : ICON_BOX;
  $: viewBox = `${box.x} ${box.y} ${box.w} ${box.h}`;
</script>

<span class="ck-logo" style="--ck-logo-size: {size}px">
  <svg
    {viewBox}
    width={size}
    height={size * (box.h / box.w)}
    aria-hidden="true"
  >
    {#if withWordmark}
      <g class="ck-ink">
        <path
          d="M523.44,1278.61c-4.59-4.59-11.59-10.06-19.02-13.55-7.65-3.5-16.62-5.68-25.14-5.68-33.67,0-58.59,27.11-58.59,60.78,0,39.57,32.14,59.47,58.81,59.47,9.84,0,19.46-2.84,27.11-6.78,8.31-4.15,14.21-9.62,16.83-12.24v20.11c-16.18,11.59-33.01,14.21-43.94,14.21-43.29,0-75.43-32.79-75.43-74.99s32.58-75.86,76.3-75.86c8.75,0,25.58,1.09,43.07,14.43v20.11Z"
        />
        <path
          d="M564.76,1319.5c0-43.51,33.89-75.43,75.86-75.43s75.86,31.92,75.86,75.43-33.67,75.43-75.86,75.43-75.86-32.14-75.86-75.43ZM581.38,1319.5c0,33.45,26.45,60.12,59.25,60.12s59.25-26.67,59.25-60.12-26.45-60.12-59.25-60.12-59.25,26.67-59.25,60.12Z"
        />
        <path
          d="M760.65,1392.3l24.27-153.91,55.97,123.09,57.06-123.31,22.74,154.13h-16.62l-13.77-101.44-49.63,107.56-48.97-107.56-14.43,101.44h-16.62Z"
        />
        <path d="M989.99,1246.47v145.82h-16.18v-145.82h16.18Z" />
        <path
          d="M1063.23,1309l62.09-62.53h21.86l-68.21,67.99,70.4,77.83h-22.3l-59.69-66.9-4.15,4.15v62.75h-16.18v-145.82h16.18v62.53Z"
        />
        <path
          d="M1271.14,1351.2h-62.09l-17.49,41.1h-17.93l67.12-152.82,65.37,152.82h-17.93l-17.05-41.1ZM1264.8,1335.89l-24.49-58.37-24.92,58.37h49.41Z"
        />
        <path d="M1362.31,1246.47v145.82h-16.18v-145.82h16.18Z" />
        <path
          d="M1448.66,1246.47v104.94c0,11.81-.22,25.14-8.96,34.33-5.03,5.47-12.46,9.18-23.17,9.18s-19.46-3.28-26.02-10.71l8.96-12.68c4.81,5.25,11.15,8.09,16.62,8.09,4.37,0,8.31-1.53,10.93-4.15,5.47-5.47,5.47-14.65,5.47-23.61v-105.38h16.18Z"
        />
        <path
          d="M1521.9,1335.89c0,12.24,0,25.58,11.59,35.42,5.9,5.03,15.96,8.31,24.05,8.31s18.15-3.28,24.05-8.31c11.59-9.84,11.59-23.17,11.59-35.42v-89.42h16.18v93.79c0,12.24-1.31,24.05-9.18,34.98-8.75,12.02-24.05,19.68-42.63,19.68s-33.89-7.65-42.63-19.68c-7.87-10.93-9.18-22.74-9.18-34.98v-93.79h16.18v89.42Z"
        />
      </g>
    {/if}
    <rect
      class="ck-paper"
      x="446.63"
      y="553.04"
      width="1121.65"
      height="640.88"
    />
    <path
      fill="#f60"
      d="M1069.02,759.92c15.13,82.1,13.78,184.15-49.51,269.01-63.29-84.87-64.63-186.92-49.51-269.01-58.56,20.46-100.58,76.18-100.58,141.72,0,82.89,67.2,150.09,150.09,150.09s150.09-67.2,150.09-150.09c0-65.54-42.02-121.26-100.58-141.72Z"
    />
    <g class="ck-ink">
      <path
        d="M823.18,950.06c117.3-49.4,273.38-111.26,405.74-150.51,93.36-27.69,151.77-36.56,190.33-39.22h149.04v-207.3h-745.11v397.02Z"
      />
      <path
        d="M691.69,1007.04c28.07-12.52,110.91-49.7,110.91-49.7v-404.3h-355.97v454h245.06Z"
      />
      <path
        d="M1445.77,780.91c-15.64,37.49-57.76,119.95-147.47,192.89v220.12h269.99v-413.01h-122.52Z"
      />
      <path
        d="M1277.72,989.73c-35.87,26.99-130.46,95.01-220.24,126.9-67.14,23.85-411.31-89.01-411.31-89.01h-199.54v166.31h831.09v-204.19Z"
      />
    </g>
  </svg>
</span>

<style>
  .ck-logo {
    display: inline-flex;
    align-items: center;
  }

  /* Light theme (default): black ink on a white panel. */
  .ck-paper {
    fill: #ffffff;
  }
  .ck-logo :global(.ck-ink) {
    fill: #000000;
  }

  /* Dark theme: swap so the mark keeps contrast against dark chrome. */
  :global(html.dark) .ck-logo .ck-paper {
    fill: #000000;
  }
  :global(html.dark) .ck-logo :global(.ck-ink) {
    fill: #ffffff;
  }
</style>
