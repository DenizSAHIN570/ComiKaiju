<!-- Filter Editor - build a custom filter from four adjustment groups -->
<script lang="ts">
  import { customFilterParameters, CUSTOM_FILTER_FUNCTIONS } from '$lib/store/filterStore';
  import type { FilterConfig } from '../../types/filterConfig';
  import { configValidator } from '$lib/services/configValidator';
  import { FilterEngine } from '$lib/services/filterEngine';
  import { logger } from '$lib/services/logger';

  export let open = false;
  export let initialConfig: FilterConfig | null = null;
  export let previewBlob: Blob | null = null;
  export let onApply: (config: FilterConfig | null) => void;
  export let onSave: (config: FilterConfig) => void;
  export let onDelete: (id: string) => void;
  export let onClose: () => void;

  const engine = new FilterEngine();

  const SECTIONS: { title: string; keys: string[] }[] = [
    { title: 'RGB Channels', keys: ['red', 'green', 'blue'] },
    { title: 'Gamma', keys: ['gamma'] },
    { title: 'Vibrance', keys: ['vibrance'] },
    { title: 'White Balance', keys: ['temperature', 'tint'] },
  ];

  let name = '';
  let params: Record<string, number> = defaults();
  let editingId: string | null = null;
  let previewCanvas: HTMLCanvasElement;
  let previewBitmap: ImageBitmap | null = null;

  function defaults(): Record<string, number> {
    const p: Record<string, number> = {};
    for (const [k, d] of Object.entries(customFilterParameters)) p[k] = d.default ?? 0;
    return p;
  }

  // Seed the editor from an existing custom filter when it opens.
  // The reset below (on close) clears state, so each open re-seeds cleanly.
  $: if (open && editingId === null && name === '' && initialConfig) {
    editingId = initialConfig.id.startsWith('custom-') ? initialConfig.id : null;
    name = initialConfig.name;
    const seeded = defaults();
    for (const k of Object.keys(seeded)) {
      const v = initialConfig.parameters[k]?.default;
      if (typeof v === 'number') seeded[k] = v;
    }
    params = seeded;
  }

  // Reset internal state whenever the editor closes (from any source).
  $: if (!open && (editingId !== null || name !== '')) {
    name = '';
    params = defaults();
    editingId = null;
  }
  $: if (!open) previewBitmap = null;

  // Redraw the preview when parameters change.
  $: if (open && previewCanvas) drawPreview(params, previewBlob);

  function buildConfig(): FilterConfig {
    const parameters: FilterConfig['parameters'] = {};
    for (const [k, d] of Object.entries(customFilterParameters)) {
      parameters[k] = { ...d, default: params[k] };
    }
    return {
      id: editingId ?? `custom-${crypto.randomUUID()}`,
      name: name.trim() || 'Custom Filter',
      description: 'User-defined filter',
      type: 'composite',
      parameters,
      canvasFunctions: CUSTOM_FILTER_FUNCTIONS,
    };
  }

  function applyFilter() {
    onApply(buildConfig());
    close();
  }

  function save() {
    if (!name.trim()) {
      alert('Please name your filter before saving.');
      return;
    }
    const config = buildConfig();
    const validation = configValidator.validate(config);
    if (!validation.valid) {
      alert(`Invalid filter:\n${validation.errors.join('\n')}`);
      return;
    }
    onSave(config);
    logger.info('FilterEditor', `Saved filter: ${config.name}`);
    close();
  }

  function remove() {
    if (!editingId) return;
    if (!confirm(`Delete filter "${name}"?`)) return;
    onDelete(editingId);
    close();
  }

  function close() {
    name = '';
    params = defaults();
    editingId = null;
    onClose();
  }

  async function drawPreview(_params: Record<string, number>, blob: Blob | null) {
    const ctx = previewCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const size = 150;
    previewCanvas.width = size;
    previewCanvas.height = size;

    if (blob && !previewBitmap) {
      try {
        previewBitmap = await createImageBitmap(blob);
      } catch {
        previewBitmap = null;
      }
    }

    if (previewBitmap) {
      const s = Math.min(previewBitmap.width, previewBitmap.height);
      ctx.drawImage(previewBitmap, 0, 0, s, s, 0, 0, size, size);
    } else {
      const grad = ctx.createLinearGradient(0, 0, size, size);
      grad.addColorStop(0, '#ff6600');
      grad.addColorStop(0.5, '#3366ff');
      grad.addColorStop(1, '#33cc66');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = '#fff';
      ctx.fillRect(45, 45, 60, 60);
    }

    engine.applyFilter(ctx, buildConfig());
  }
</script>

<div class="filter-editor-overlay" class:hidden={!open}>
  <div class="filter-editor">
    <div class="editor-header">
      <h3>{editingId ? 'Edit Filter' : 'Custom Filter'}</h3>
      <button class="close" on:click={close} aria-label="Close editor">✕</button>
    </div>

    <label class="name-field">
      <span>Name</span>
      <input type="text" bind:value={name} placeholder="My Filter" />
    </label>

    {#each SECTIONS as section (section.title)}
      <div class="section">
        <h4>{section.title}</h4>
        {#each section.keys as key (key)}
          <div class="parameter-row">
            <label for={`p-${key}`}>{customFilterParameters[key].name}</label>
            <input
              id={`p-${key}`}
              type="range"
              min={customFilterParameters[key].min}
              max={customFilterParameters[key].max}
              step={customFilterParameters[key].step}
              bind:value={params[key]}
            />
            <span class="value-display">{params[key]}{customFilterParameters[key].unit ?? ''}</span>
          </div>
        {/each}
      </div>
    {/each}

    <div class="preview-section">
      <h4>Preview</h4>
      <canvas bind:this={previewCanvas} width="150" height="150"></canvas>
    </div>

    <div class="actions">
      <button on:click={applyFilter}>Apply</button>
      <button on:click={save} class="primary">Save</button>
      {#if editingId}
        <button on:click={remove} class="danger">Delete</button>
      {/if}
    </div>
  </div>
</div>

<style>
  .filter-editor-overlay {
    position: fixed;
    inset: 0;
    background: color-mix(in srgb, var(--color-bg-main) 70%, transparent);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }

  .filter-editor-overlay.hidden {
    display: none;
  }

  .filter-editor {
    background: var(--color-bg-secondary);
    border-radius: 12px;
    padding: 1.5rem;
    max-width: 500px;
    width: 90%;
    max-height: 85vh;
    overflow-y: auto;
    color: var(--color-text-main);
  }

  .editor-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .editor-header h3 {
    margin: 0;
    font-size: 1.2rem;
  }

  .editor-header .close {
    background: var(--color-border);
    border: 1px solid var(--color-border);
    color: var(--color-text-main);
    border-radius: 4px;
    cursor: pointer;
    padding: 0.3rem 0.6rem;
  }

  .name-field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-bottom: 1rem;
  }

  .name-field span {
    font-size: 0.8rem;
    color: var(--color-text-secondary);
  }

  .name-field input {
    padding: 0.5rem;
    border-radius: 6px;
    border: 1px solid var(--color-border);
    background: var(--color-bg-secondary);
    color: var(--color-text-main);
  }

  .section {
    margin-bottom: 1rem;
  }

  .section h4 {
    margin: 0 0 0.5rem;
    color: var(--color-primary-hover);
    font-size: 0.95rem;
  }

  .parameter-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
  }

  .parameter-row label {
    min-width: 90px;
    font-size: 0.9rem;
  }

  .parameter-row input[type='range'] {
    flex: 1;
    height: 6px;
    -webkit-appearance: none;
    appearance: none;
    background: var(--color-border);
    border-radius: 3px;
  }

  .parameter-row input[type='range']::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    background: var(--color-primary);
    border-radius: 50%;
    cursor: pointer;
  }

  .value-display {
    min-width: 56px;
    text-align: right;
    font-family: monospace;
    color: var(--color-primary-hover);
  }

  .preview-section {
    background: var(--color-bg-secondary);
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1rem;
    text-align: center;
  }

  .preview-section h4 {
    margin: 0 0 0.5rem;
    font-size: 0.9rem;
    color: var(--color-text-secondary);
  }

  .preview-section canvas {
    width: 150px;
    height: 150px;
    border-radius: 4px;
    image-rendering: pixelated;
  }

  .actions {
    display: flex;
    gap: 0.5rem;
  }

  .actions button {
    flex: 1;
    padding: 0.75rem;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 600;
    background: var(--color-border);
    color: var(--color-text-main);
  }

  .actions button.primary {
    background: var(--color-primary);
    color: white;
  }

  .actions button.primary:hover {
    background: var(--color-primary-hover);
  }

  .actions button.danger {
    background: var(--color-status-error);
    color: white;
  }

  .actions button.danger:hover {
    background: color-mix(in srgb, var(--color-status-error) 85%, #000);
  }
</style>
