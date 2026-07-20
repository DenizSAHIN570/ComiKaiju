<script lang="ts">
  import { handleFile, handleUrlImport, isHttpUrl } from "$lib/services/comicProcessor";
  import { directoryService } from "$lib/services/directoryService";
  import UrlImportConfirm from "$lib/ui/UrlImportConfirm.svelte";

  let { oncomplete }: { oncomplete?: () => void } = $props();

  let fileInput = $state<HTMLInputElement>();
  let dragActive = $state(false);
  let urlValue = $state("");
  let urlHint = $state<string | null>(null);
  let pendingUrl = $state<string | null>(null);
  let syncing = $state(false);

  const supportsFolderSync = typeof window !== "undefined" && "showDirectoryPicker" in window;

  async function complete() {
    await oncomplete?.();
  }

  function openFilePicker() {
    fileInput?.click();
  }

  async function onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      await handleFile(file, complete);
    }
    input.value = "";
  }

  function onDragOver(event: DragEvent) {
    event.preventDefault();
    dragActive = true;
  }

  function onDragLeave() {
    dragActive = false;
  }

  async function onDrop(event: DragEvent) {
    event.preventDefault();
    dragActive = false;

    const file = event.dataTransfer?.files?.[0];
    if (file) {
      await handleFile(file, complete);
    }
  }

  function submitUrl() {
    const trimmed = urlValue.trim();
    if (!trimmed) return;

    if (!isHttpUrl(trimmed)) {
      urlHint = "Enter a valid http:// or https:// link.";
      return;
    }

    urlHint = null;
    pendingUrl = trimmed;
    urlValue = "";
  }

  async function confirmUrlImport() {
    const url = pendingUrl;
    pendingUrl = null;
    if (url) {
      await handleUrlImport(url, complete);
    }
  }

  function cancelUrlImport() {
    pendingUrl = null;
  }

  async function syncFolder() {
    if (!supportsFolderSync || syncing) return;
    syncing = true;
    try {
      const handle = await directoryService.openComicsFolder();
      if (handle) {
        await complete();
      }
    } finally {
      syncing = false;
    }
  }
</script>

<div class="import">
  <div
    class="drop"
    class:active={dragActive}
    ondragover={onDragOver}
    ondragleave={onDragLeave}
    ondrop={onDrop}
    role="button"
    tabindex="0"
    onclick={openFilePicker}
    onkeydown={(e) => e.key === "Enter" && openFilePicker()}
  >
    <div class="ic" aria-hidden="true">⤓</div>
    <div>
      <div class="h">Drop a comic, or choose a file</div>
      <div class="p">CBZ · CBR</div>
    </div>
    <div class="cta">
      <button type="button" class="btn" onclick={(e) => { e.stopPropagation(); openFilePicker(); }}>
        Choose file
      </button>
    </div>
  </div>
  <input
    bind:this={fileInput}
    type="file"
    accept=".cbz,.cbr"
    class="visually-hidden"
    onchange={onFileChange}
  />

  <div class="row2">
    <span class="lbl">or link</span>
    <input
      type="text"
      placeholder="https://…/comic.cbz"
      bind:value={urlValue}
      onkeydown={(e) => e.key === "Enter" && submitUrl()}
    />
    <button type="button" class="add" onclick={submitUrl}>Add</button>
  </div>
  {#if urlHint}
    <p class="hint">{urlHint}</p>
  {/if}
</div>

{#if supportsFolderSync}
  <button type="button" class="sync" onclick={syncFolder} disabled={syncing}>
    or sync a folder from your disk
  </button>
{:else}
  <div class="sync-disabled">
    <span class="sync sync--disabled">or sync a folder from your disk</span>
    <p class="note">Requires a Chromium browser (Chrome/Edge).</p>
  </div>
{/if}

{#if pendingUrl}
  <UrlImportConfirm url={pendingUrl} onConfirm={confirmUrlImport} onCancel={cancelUrlImport} />
{/if}

<style>
  .import {
    max-width: 520px;
    margin: 0 auto;
    border: 1px solid var(--color-border);
    border-radius: 3px;
    background: var(--color-bg-surface);
    text-align: left;
    font-family: var(--font-base);
  }

  .drop {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 18px;
    border-bottom: 1px dashed var(--color-border);
    cursor: pointer;
  }

  .drop.active {
    background: var(--color-bg-secondary);
  }

  .drop .ic {
    width: 44px;
    height: 44px;
    border-radius: 3px;
    background: var(--color-bg-main);
    border: 1px solid var(--color-border);
    color: var(--color-primary);
    display: grid;
    place-items: center;
    flex: none;
    font-family: var(--font-base);
  }

  .drop .h {
    font-weight: 700;
    font-size: 0.92rem;
    color: var(--color-text-main);
    font-family: var(--font-base);
  }

  .drop .p {
    font-size: 0.78rem;
    color: var(--color-text-secondary);
    margin-top: 2px;
    font-family: var(--font-base);
  }

  .drop .cta {
    margin-left: auto;
  }

  .btn {
    background: var(--color-primary);
    color: var(--color-bg-main);
    border: none;
    border-radius: 3px;
    padding: 11px 18px;
    font-weight: 700;
    font-size: 0.84rem;
    cursor: pointer;
    font-family: var(--font-base);
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
  }

  .row2 {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 18px;
  }

  .row2 .lbl {
    font-family: var(--font-base);
    font-size: 0.6rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--color-text-muted);
    white-space: nowrap;
  }

  .row2 input {
    flex: 1;
    background: var(--color-bg-main);
    border: 1px solid var(--color-border);
    border-radius: 3px;
    color: var(--color-text-main);
    padding: 9px 11px;
    font-size: 0.8rem;
    font-family: var(--font-base);
  }

  .row2 .add {
    background: transparent;
    border: 1px solid var(--color-border);
    color: var(--color-text-secondary);
    border-radius: 3px;
    padding: 9px 14px;
    font-size: 0.8rem;
    cursor: pointer;
    font-family: var(--font-base);
  }

  .hint {
    margin: 0;
    padding: 0 18px 14px;
    font-size: 0.76rem;
    color: var(--color-status-error);
    font-family: var(--font-base);
  }

  .sync {
    margin: 16px auto 0;
    background: transparent;
    border: none;
    color: var(--color-text-secondary);
    font-size: 0.8rem;
    font-family: var(--font-base);
    letter-spacing: 0.03em;
    text-decoration: underline;
    text-underline-offset: 3px;
    cursor: pointer;
    display: block;
  }

  .sync:disabled {
    cursor: default;
    opacity: 0.6;
  }

  .sync-disabled {
    margin: 16px auto 0;
    text-align: center;
  }

  .sync--disabled {
    color: var(--color-text-muted);
    cursor: default;
    pointer-events: none;
  }

  .note {
    margin: 4px 0 0;
    font-size: 0.7rem;
    color: var(--color-text-muted);
    font-family: var(--font-base);
  }
</style>
