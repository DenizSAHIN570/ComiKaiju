<script lang="ts">
  import { resolve } from "$app/paths";
  import AppMenu from "$lib/ui/AppMenu.svelte";

  let {
    active = "home",
    onadd,
    onsearch,
  }: {
    active?: "home" | "library" | "settings";
    onadd?: () => void;
    onsearch?: () => void;
  } = $props();
</script>

<div class="mast">
  <div class="nav">
    <a href={resolve("/")} class:active={active === "home"}>Home</a>
    <a href={resolve("/library")} class:active={active === "library"}>Library</a>
  </div>
  <div class="word">ComiKaiju</div>
  <div class="nav right">
    <button type="button" onclick={() => onsearch?.()}>Search</button>
    <button type="button" onclick={() => onadd?.()}>Add</button>
    <AppMenu />
  </div>
</div>
<div class="rule"></div>

<style>
  .mast {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    padding: 22px 30px 18px;
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
    font-family: var(--font-base);
    font-weight: 700;
    font-size: 1.4rem;
    letter-spacing: 0.32em;
    text-transform: uppercase;
    text-indent: 0.32em;
    color: var(--color-text-main);
  }

  .rule {
    height: 1px;
    background: var(--color-border);
    margin: 0 30px;
  }
</style>
