<script lang="ts">
  import ImportPanel from "$lib/ui/ImportPanel.svelte";

  let { open, onclose, oncomplete }: {
    open: boolean;
    onclose?: () => void;
    oncomplete?: () => void;
  } = $props();

  function close() {
    onclose?.();
  }

  function onKeydown(event: KeyboardEvent) {
    if (open && event.key === "Escape") {
      close();
    }
  }

  function onBackdropClick() {
    close();
  }

  function onSheetClick(event: MouseEvent) {
    event.stopPropagation();
  }
</script>

<svelte:window onkeydown={onKeydown} />

{#if open}
  <div class="backdrop" onclick={onBackdropClick} role="presentation">
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_interactive_supports_focus -->
    <div
      class="sheet"
      role="dialog"
      aria-modal="true"
      aria-label="Add comics"
      onclick={onSheetClick}
    >
      <div class="header">
        <h2>Add comics</h2>
        <button type="button" class="close" onclick={close} aria-label="Close">✕</button>
      </div>
      <div class="body">
        <ImportPanel {oncomplete} />
      </div>
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: color-mix(in srgb, var(--color-text-main) 45%, transparent);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    z-index: 100;
  }

  .sheet {
    width: 100%;
    max-width: 560px;
    max-height: 90vh;
    overflow-y: auto;
    background: var(--color-bg-main);
    border: 1px solid var(--color-border);
    border-radius: 3px;
    box-shadow: 0 20px 40px color-mix(in srgb, var(--color-text-main) 20%, transparent);
    font-family: var(--font-base);
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--color-border);
  }

  .header h2 {
    margin: 0;
    font-size: 1rem;
    font-weight: 700;
    color: var(--color-text-main);
    font-family: var(--font-base);
  }

  .close {
    width: 30px;
    height: 30px;
    display: grid;
    place-items: center;
    background: transparent;
    border: 1px solid var(--color-border);
    border-radius: 3px;
    color: var(--color-text-secondary);
    cursor: pointer;
    font-family: var(--font-base);
    font-size: 0.85rem;
  }

  .close:hover {
    color: var(--color-text-main);
    border-color: var(--color-text-secondary);
  }

  .body {
    padding: 20px;
  }
</style>
