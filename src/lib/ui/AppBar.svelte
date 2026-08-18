<script lang="ts">
  import { resolve } from "$app/paths";
  import AppMenu from "$lib/ui/AppMenu.svelte";
  import Logo from "$lib/ui/Logo.svelte";

  let {
    active = "home",
    showLibrary = true,
    onadd,
    onsearch,
  }: {
    active?: "home" | "library" | "settings";
    /** Hidden when the library is empty and no folder is synced. */
    showLibrary?: boolean;
    onadd?: () => void;
    onsearch?: () => void;
  } = $props();
</script>

<div class="mast">
  <div class="nav">
    <a href={resolve("/")} class:active={active === "home"}>Home</a>
    {#if showLibrary || active === "library"}
      <a href={resolve("/library")} class:active={active === "library"}
        >Library</a
      >
    {/if}
  </div>
  <a href={resolve("/")} class="word" aria-label="ComiKaiju home">
    <Logo size={80} />
  </a>
  <div class="nav right">
    {#if onsearch}
      <button type="button" onclick={() => onsearch?.()}>Search</button>
    {/if}
    {#if onadd}
      <button type="button" onclick={() => onadd?.()}>Add</button>
    {/if}
    <AppMenu />
  </div>
</div>
<div class="rule"></div>

<style>
  .mast {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    padding: 10px 30px 8px;
  }

  .nav {
    display: flex;
    align-items: center;
    gap: 24px;
    font-family: var(--font-base);
    font-size: 0.72rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--color-text-secondary);
  }

  .nav.right {
    justify-content: flex-end;
  }

  .nav a,
  .nav button {
    color: var(--color-text-secondary);
    text-decoration: none;
    background: transparent;
    border: none;
    padding: 0;
    font: inherit;
    letter-spacing: inherit;
    text-transform: inherit;
    cursor: pointer;
  }

  .nav a.active {
    color: var(--color-text-main);
  }

  .nav a.active::after {
    content: "";
    display: block;
    height: 2px;
    background: var(--color-primary);
    margin-top: 5px;
  }

  .word {
    display: flex;
    align-items: center;
    text-decoration: none;
  }

  .rule {
    height: 1px;
    background: var(--color-border);
    margin: 0 30px;
  }
</style>
