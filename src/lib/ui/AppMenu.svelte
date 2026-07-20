<script lang="ts">
  import { themeStore, allThemesFrom, getActiveTheme, PRESET_IDS } from "$lib/theme/themeStore";
  import { orderThemesForPicker } from "$lib/theme/themeOrder";
  import type { ThemeMode, Palette } from "$lib/theme/themeSchema";
  import { resolve } from "$app/paths";

  interface InstallPromptEvent extends Event {
    prompt: () => void;
  }

  let open = $state(false);
  let deferredPrompt: InstallPromptEvent | null = $state(null);

  const swatchKeys: (keyof Palette)[] = ["primary", "secondary", "bgMain", "bgSurface", "textMain"];
  const MODES: { id: ThemeMode; label: string; icon: string }[] = [
    { id: "light", label: "Light", icon: "☀" },
    { id: "dark", label: "Dark", icon: "☾" },
    { id: "system", label: "System", icon: "◐" },
  ];

  const themeState = $derived($themeStore);
  const active = $derived(getActiveTheme(themeState));
  const isDark = $derived(
    themeState.mode === "dark" ||
      (themeState.mode === "system" &&
        typeof matchMedia !== "undefined" &&
        matchMedia("(prefers-color-scheme: dark)").matches),
  );
  const picker = $derived(
    orderThemesForPicker(allThemesFrom(themeState.userThemes), themeState.meta, PRESET_IDS, 3),
  );

  $effect(() => {
    const h = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e as InstallPromptEvent;
    };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  });

  function toggle(e: MouseEvent) {
    e.stopPropagation();
    open = !open;
  }

  function close() {
    open = false;
  }

  function setMode(m: ThemeMode) {
    themeStore.setMode(m);
  }

  function pick(id: string) {
    themeStore.setActiveTheme(id);
  }

  async function install() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt = null;
    }
  }
</script>

<svelte:window onclick={close} />

<div class="menuwrap">
  <button
    class="menubtn"
    class:on={open}
    aria-label="Menu"
    aria-expanded={open}
    onclick={toggle}
  >
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  </button>

  {#if open}
    <div class="dropdown">
      <div class="dd-label">Appearance</div>
      <div class="seg">
        {#each MODES as m (m.id)}
          <button class:active={themeState.mode === m.id} onclick={() => setMode(m.id)}>
            {m.icon} {m.label}
          </button>
        {/each}
      </div>
      <div class="dd-div"></div>
      <div class="dd-label">
        Theme
        <a class="mk" href={resolve("/settings")}>Builder &rarr;</a>
      </div>
      <div class="themes">
        {#each picker as t (t.id)}
          {@const palette = isDark ? t.dark : t.light}
          {@const isActive = active.id === t.id}
          <button class="theme" class:active={isActive} onclick={() => pick(t.id)}>
            <span class="swatches">
              {#each swatchKeys as key (key)}
                <span class="sw" style:background={palette[key]}></span>
              {/each}
            </span>
            <span class="nm">{t.name}</span>
            <span class="tag">{PRESET_IDS.has(t.id) ? "Preset" : "Yours"}</span>
            <span class="chk">&#10003;</span>
          </button>
        {/each}
      </div>
      <div class="dd-div"></div>
      <a class="dd-item" href={resolve("/settings")}>
        <span class="ic">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3" />
            <path
              d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"
            />
          </svg>
        </span>Settings<span class="arr">&rarr;</span>
      </a>
      {#if deferredPrompt}
        <button class="dd-item" type="button" onclick={install}>
          <span class="ic">
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
            </svg>
          </span>
          <span>Install app<span class="sub">read from your home screen</span></span>
        </button>
      {/if}
    </div>
  {/if}
</div>

<style>
  .menuwrap {
    position: relative;
  }

  .menubtn {
    width: 34px;
    height: 34px;
    border: 1px solid var(--color-border);
    border-radius: 3px;
    background: transparent;
    color: var(--color-text-main);
    display: grid;
    place-items: center;
    cursor: pointer;
    transition: border-color 0.15s;
    font-family: var(--font-base);
  }
  .menubtn:hover,
  .menubtn.on {
    border-color: var(--color-primary);
  }
  .menubtn svg {
    width: 16px;
    height: 16px;
  }

  .dropdown {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    width: 264px;
    background: var(--color-bg-main);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    box-shadow: 0 10px 28px -12px color-mix(in srgb, var(--color-text-main) 20%, transparent);
    overflow: hidden;
    z-index: 20;
    text-align: left;
    font-family: var(--font-base);
  }

  .dd-label {
    font-family: var(--font-base);
    font-size: 0.6rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--color-text-muted);
    padding: 14px 16px 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .dd-label .mk {
    color: var(--color-primary);
    text-transform: none;
    letter-spacing: 0;
    font-size: 0.68rem;
    cursor: pointer;
    text-decoration: none;
    font-family: var(--font-base);
  }

  .seg {
    display: flex;
    margin: 0 16px 12px;
    border: 1px solid var(--color-border);
    border-radius: 3px;
    overflow: hidden;
  }
  .seg button {
    flex: 1;
    background: transparent;
    border: none;
    border-left: 1px solid var(--color-border);
    color: var(--color-text-secondary);
    font-family: var(--font-base);
    font-size: 0.74rem;
    padding: 8px 0;
    cursor: pointer;
  }
  .seg button:first-child {
    border-left: none;
  }
  .seg button.active {
    background: var(--color-primary);
    color: var(--color-bg-main);
  }

  .dd-div {
    height: 1px;
    background: var(--color-border);
  }

  .themes {
    padding: 2px 8px 8px;
  }
  .theme {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 8px;
    border-radius: 3px;
    cursor: pointer;
    width: 100%;
    background: transparent;
    border: none;
    text-align: left;
    color: var(--color-text-main);
    font-family: var(--font-base);
  }
  .theme:hover,
  .theme.active {
    background: var(--color-bg-surface);
  }
  .swatches {
    display: flex;
    gap: 3px;
    flex: none;
  }
  .sw {
    width: 12px;
    height: 12px;
    border-radius: 2px;
    border: 1px solid color-mix(in srgb, var(--color-text-main) 12%, transparent);
  }
  .theme .nm {
    font-size: 0.82rem;
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .theme .tag {
    font-family: var(--font-base);
    font-size: 0.56rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--color-text-muted);
  }
  .theme .chk {
    color: var(--color-primary);
    font-weight: 700;
    flex: none;
    width: 14px;
    text-align: center;
  }
  .theme:not(.active) .chk {
    visibility: hidden;
  }

  .dd-item {
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 12px 16px;
    color: var(--color-text-main);
    cursor: pointer;
    font-size: 0.86rem;
    text-decoration: none;
    width: 100%;
    background: transparent;
    border: none;
    text-align: left;
    font-family: var(--font-base);
  }
  .dd-item:hover {
    background: var(--color-bg-surface);
  }
  .dd-item .ic {
    width: 16px;
    height: 16px;
    color: var(--color-text-secondary);
    display: grid;
    place-items: center;
  }
  .dd-item .arr {
    margin-left: auto;
    color: var(--color-text-muted);
    font-family: var(--font-base);
    font-size: 0.8rem;
  }
  .dd-item .sub {
    display: block;
    font-family: var(--font-base);
    font-size: 0.62rem;
    color: var(--color-text-muted);
    margin-top: 1px;
  }
</style>
