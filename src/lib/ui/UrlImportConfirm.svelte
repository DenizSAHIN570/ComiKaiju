<script lang="ts">
  interface Props {
    url: string;
    onConfirm: () => void;
    onCancel: () => void;
  }

  let { url, onConfirm, onCancel }: Props = $props();
</script>

<div class="url-import-overlay" role="dialog" aria-modal="true" aria-label="Confirm import from URL">
  <div class="url-import-card">
    <h3>Import comic from link?</h3>
    <p class="url-import-url">{url}</p>
    <div class="url-import-actions">
      <button class="url-import-cancel" onclick={onCancel}>Cancel</button>
      <button class="url-import-confirm" onclick={onConfirm}>Download & Open</button>
    </div>
  </div>
</div>

<style>
  .url-import-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    backdrop-filter: blur(2px);
  }

  .url-import-card {
    background-color: var(--color-bg-surface);
    color: var(--color-text-main);
    border-radius: 12px;
    padding: 1.5rem;
    max-width: 90vw;
    width: 420px;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  }

  .url-import-card h3 {
    margin: 0 0 0.75rem;
    font-size: 1.1rem;
  }

  .url-import-url {
    word-break: break-all;
    background: var(--color-bg-main);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    padding: 0.5rem 0.75rem;
    font-size: 0.85rem;
    margin: 0 0 1.25rem;
  }

  .url-import-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
  }

  .url-import-cancel,
  .url-import-confirm {
    padding: 0.5rem 1rem;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    font-weight: 500;
  }

  .url-import-cancel {
    background: transparent;
    color: var(--color-text-main);
    border: 1px solid var(--color-border);
  }

  .url-import-confirm {
    background: var(--color-primary);
    color: white;
  }
</style>
