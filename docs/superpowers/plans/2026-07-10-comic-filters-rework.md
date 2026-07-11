# Comic Filters Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore one-click premade filters (incl. daltonize colorblind assist) and make custom filters fully editable/saveable to a reusable library, all through one config-driven engine.

**Architecture:** Every filter is a `FilterConfig` executed by `FilterEngine` via a bounded `switch`. Premades are code constants; customs live in an IndexedDB library surfaced by a reactive store; the active filter is a per-comic snapshot. `CanvasViewer`/`ScrollViewer` already render any config and are untouched.

**Tech Stack:** SvelteKit (Svelte 4, `export let`), TypeScript, Canvas 2D, IndexedDB.

## Global Constraints

- No SSR; app is static. Use `logger` service, not `console`.
- `FilterEngine` dispatch MUST stay a bounded `switch` (no dynamic `this[name]`).
- Parameter values are read from `parameters[key].default` (never the descriptor object).
- Parameters are numeric-only (no injection surface).
- Engine ops write to `Uint8ClampedArray` (auto clamps 0–255).
- Unit tests run via `node --experimental-strip-types <file>.mts` importing the `.ts` directly (esbuild is not installed).

---

### Task 1: Engine operations — contrast, sepia, daltonize

**Files:**

- Modify: `src/lib/services/filterEngine.ts`
- Test: `scratchpad/engineOpsTest.mts` (scratchpad; not committed to src)

**Interfaces:**

- Consumes: `FilterConfig` from `../../types/filterConfig.js`; existing `param(config, key, fallback)` helper.
- Produces: methods `applyContrast`, `applySepia`, `applyDaltonize(ctx, config)`; `applyFilter` switch handles the three new names.

- [ ] **Step 1: Add the three ops before the closing brace of the class**

```ts
  /**
   * Apply contrast around mid-grey (128). contrast is a percentage: 100 = no change.
   */
  applyContrast(ctx: CanvasRenderingContext2D, config: FilterConfig): void {
    const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    const data = imageData.data;
    const factor = this.param(config, "contrast", 100) / 100;

    for (let i = 0; i < data.length; i += 4) {
      data[i] = (data[i] - 128) * factor + 128;
      data[i + 1] = (data[i + 1] - 128) * factor + 128;
      data[i + 2] = (data[i + 2] - 128) * factor + 128;
    }
    ctx.putImageData(imageData, 0, 0);
  }

  /**
   * Apply a fixed sepia colour matrix.
   */
  applySepia(ctx: CanvasRenderingContext2D, config: FilterConfig): void {
    const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      data[i] = r * 0.393 + g * 0.769 + b * 0.189;
      data[i + 1] = r * 0.349 + g * 0.686 + b * 0.168;
      data[i + 2] = r * 0.272 + g * 0.534 + b * 0.131;
    }
    ctx.putImageData(imageData, 0, 0);
  }

  /**
   * Daltonize (colour-blind assist). mode: 0=Protanopia, 1=Deuteranopia, 2=Tritanopia.
   * Simulate dichromacy, then push the unseen error into visible channels.
   */
  applyDaltonize(ctx: CanvasRenderingContext2D, config: FilterConfig): void {
    const SIM: number[][][] = [
      [ [0.567, 0.433, 0], [0.558, 0.442, 0], [0, 0.242, 0.758] ], // protanopia
      [ [0.625, 0.375, 0], [0.7, 0.3, 0], [0, 0.3, 0.7] ],         // deuteranopia
      [ [0.95, 0.05, 0], [0, 0.433, 0.567], [0, 0.475, 0.525] ],   // tritanopia
    ];
    const mode = Math.max(0, Math.min(2, Math.round(this.param(config, "mode", 1))));
    const m = SIM[mode];

    const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const sr = m[0][0] * r + m[0][1] * g + m[0][2] * b;
      const sg = m[1][0] * r + m[1][1] * g + m[1][2] * b;
      const sb = m[2][0] * r + m[2][1] * g + m[2][2] * b;

      const er = r - sr;
      const eg = g - sg;
      const eb = b - sb;

      // Redistribute error into channels the reader can still see.
      data[i] = r;
      data[i + 1] = g + 0.7 * er + eg;
      data[i + 2] = b + 0.7 * er + eb;
    }
    ctx.putImageData(imageData, 0, 0);
  }
```

- [ ] **Step 2: Add the three cases to the `applyFilter` switch**

```ts
        case "applyContrast":
          this.applyContrast(ctx, config);
          break;
        case "applySepia":
          this.applySepia(ctx, config);
          break;
        case "applyDaltonize":
          this.applyDaltonize(ctx, config);
          break;
```

- [ ] **Step 3: Write the unit test** (`scratchpad/engineOpsTest.mts`)

```ts
import { FilterEngine } from "/home/deniz/Projects/ComiKaiju/src/lib/services/filterEngine.ts";
function ctxFrom(px: number[]) {
  const data = new Uint8ClampedArray(px);
  return {
    canvas: { width: px.length / 4, height: 1 },
    _data: data,
    getImageData() {
      return { data, width: px.length / 4, height: 1 };
    },
    putImageData(i: any) {
      this._data.set(i.data);
    },
  } as any;
}
const e = new FilterEngine();
let pass = true;
const ok = (n: string, c: boolean, x = "") => {
  console.log(`${c ? "✅" : "❌"} ${n} ${x}`);
  if (!c) pass = false;
};

// Sepia on neutral grey -> warm (r>g>b)
let c = ctxFrom([128, 128, 128, 255]);
e.applyFilter(c, {
  id: "v",
  name: "v",
  type: "sepia",
  parameters: {},
  canvasFunctions: ["applySepia"],
} as any);
ok(
  "sepia warm r>g>b",
  c._data[0] > c._data[1] && c._data[1] > c._data[2],
  `[${c._data[0]},${c._data[1]},${c._data[2]}]`,
);

// Contrast 200 pushes 200 brighter, 50 darker
c = ctxFrom([200, 200, 200, 255, 50, 50, 50, 255]);
e.applyFilter(c, {
  id: "c",
  name: "c",
  type: "contrast",
  parameters: { contrast: { name: "c", type: "number", default: 200 } },
  canvasFunctions: ["applyContrast"],
} as any);
ok("contrast brightens highs", c._data[0] > 200, `${c._data[0]}`);
ok("contrast darkens lows", c._data[4] < 50, `${c._data[4]}`);

// Daltonize deut on red-vs-green shifts channels, stays finite
c = ctxFrom([200, 40, 40, 255]);
const before = [...c._data];
e.applyFilter(c, {
  id: "d",
  name: "d",
  type: "daltonize",
  parameters: { mode: { name: "m", type: "number", default: 1 } },
  canvasFunctions: ["applyDaltonize"],
} as any);
ok("daltonize finite", [...c._data].every(Number.isFinite));
ok(
  "daltonize shifts",
  c._data[1] !== before[1] || c._data[2] !== before[2],
  `[${c._data[0]},${c._data[1]},${c._data[2]}]`,
);

console.log(pass ? "\nPASS" : "\nFAIL");
process.exit(pass ? 0 : 1);
```

- [ ] **Step 4: Run it**

Run: `node --experimental-strip-types scratchpad/engineOpsTest.mts 2>&1 | grep -v Experimental`
Expected: all ✅, `PASS`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/filterEngine.ts
git commit -m "feat(filters): add contrast, sepia, daltonize engine ops"
```

---

### Task 2: Premade filter definitions

**Files:**

- Modify: `src/types/filterConfig.ts`

**Interfaces:**

- Produces: `export const premadeFilters: FilterConfig[]` with ids `monochrome`, `color-correction`, `vintage`, `vibrant`, `protanopia`, `deuteranopia`, `tritanopia`. Removes `builtinFilters`.

- [ ] **Step 1: Replace the `builtinFilters` array with `premadeFilters`**

Delete the existing `builtinFilters` export entirely and add:

```ts
// Premade one-click filters (fixed, not user-editable).
export const premadeFilters: FilterConfig[] = [
  {
    id: "monochrome",
    name: "Monochrome",
    description: "Grayscale",
    type: "vibrance",
    parameters: {
      vibrance: { name: "Vibrance", type: "number", default: -100 },
    },
    canvasFunctions: ["applyVibrance"],
  },
  {
    id: "color-correction",
    name: "Color Correction",
    description: "Boost contrast and colour",
    type: "composite",
    parameters: {
      contrast: { name: "Contrast", type: "number", default: 110 },
      vibrance: { name: "Vibrance", type: "number", default: 15 },
    },
    canvasFunctions: ["applyContrast", "applyVibrance"],
  },
  {
    id: "vintage",
    name: "Vintage",
    description: "Sepia tone",
    type: "sepia",
    parameters: {},
    canvasFunctions: ["applySepia"],
  },
  {
    id: "vibrant",
    name: "Vibrant",
    description: "Enhanced saturation",
    type: "vibrance",
    parameters: { vibrance: { name: "Vibrance", type: "number", default: 50 } },
    canvasFunctions: ["applyVibrance"],
  },
  {
    id: "protanopia",
    name: "Protanopia (assist)",
    description: "Colour-blind assist — red-weak",
    type: "daltonize",
    parameters: { mode: { name: "Mode", type: "number", default: 0 } },
    canvasFunctions: ["applyDaltonize"],
  },
  {
    id: "deuteranopia",
    name: "Deuteranopia (assist)",
    description: "Colour-blind assist — green-weak",
    type: "daltonize",
    parameters: { mode: { name: "Mode", type: "number", default: 1 } },
    canvasFunctions: ["applyDaltonize"],
  },
  {
    id: "tritanopia",
    name: "Tritanopia (assist)",
    description: "Colour-blind assist — blue-weak",
    type: "daltonize",
    parameters: { mode: { name: "Mode", type: "number", default: 2 } },
    canvasFunctions: ["applyDaltonize"],
  },
];

// Parameter descriptors for the custom editor's four adjustment groups.
export const customFilterParameters = {
  red: {
    name: "Red",
    type: "number" as const,
    min: 0,
    max: 255,
    default: 255,
    step: 1,
  },
  green: {
    name: "Green",
    type: "number" as const,
    min: 0,
    max: 255,
    default: 255,
    step: 1,
  },
  blue: {
    name: "Blue",
    type: "number" as const,
    min: 0,
    max: 255,
    default: 255,
    step: 1,
  },
  gamma: {
    name: "Gamma",
    type: "number" as const,
    min: 0.1,
    max: 5,
    default: 1,
    step: 0.1,
  },
  vibrance: {
    name: "Vibrance",
    type: "number" as const,
    min: -100,
    max: 100,
    default: 0,
    step: 1,
    unit: "%",
  },
  temperature: {
    name: "Temperature",
    type: "number" as const,
    min: 2000,
    max: 10000,
    default: 6500,
    step: 100,
    unit: "K",
  },
  tint: {
    name: "Tint",
    type: "number" as const,
    min: -100,
    max: 100,
    default: 0,
    step: 1,
  },
};

export const CUSTOM_FILTER_FUNCTIONS = [
  "applyRgbAdjustment",
  "applyGammaCorrection",
  "applyVibrance",
  "applyWhiteBalance",
];
```

- [ ] **Step 2: Type-check**

Run: `npm run check 2>&1 | tail -2`
Expected: errors only where `builtinFilters` is still imported (fixed in later tasks) — note them, continue.

- [ ] **Step 3: Commit**

```bash
git add src/types/filterConfig.ts
git commit -m "feat(filters): define premade filters and custom editor params"
```

---

### Task 3: Validator allowlist

**Files:**

- Modify: `src/lib/services/configValidator.ts`

**Interfaces:**

- Produces: `validFunctions` includes contrast/sepia/daltonize; `validTypes` includes premade type strings.

- [ ] **Step 1: Extend `isValidFunctionName`**

```ts
const validFunctions = [
  "applyRgbAdjustment",
  "applyGammaCorrection",
  "applyVibrance",
  "applyWhiteBalance",
  "applyContrast",
  "applySepia",
  "applyDaltonize",
];
```

- [ ] **Step 2: Extend `isValidType`**

```ts
const validTypes = [
  "rgb",
  "gamma",
  "vibrance",
  "white-balance",
  "composite",
  "sepia",
  "daltonize",
];
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/services/configValidator.ts
git commit -m "feat(filters): allow new ops and types in validator"
```

---

### Task 4: Library storage CRUD

**Files:**

- Modify: `src/lib/storage/comicStorage.ts`

**Interfaces:**

- Consumes: existing `ensureDB()`, `settingsStoreName`, `FilterConfig`.
- Produces: `getCustomFilters(): Promise<FilterConfig[]>`, `saveCustomFilter(config: FilterConfig): Promise<void>`, `deleteCustomFilter(id: string): Promise<void>`.

- [ ] **Step 1: Add methods after `loadFilterConfig`**

```ts
  // --- Custom Filter Library (global, reusable) ---

  private customFiltersKey = "customFilters";

  async getCustomFilters(): Promise<FilterConfig[]> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.settingsStoreName, "readonly");
      const store = tx.objectStore(this.settingsStoreName);
      const req = store.get(this.customFiltersKey);
      req.onsuccess = () => resolve((req.result as FilterConfig[]) ?? []);
      req.onerror = () => reject(new Error("Failed to load custom filters"));
    });
  }

  async saveCustomFilter(config: FilterConfig): Promise<void> {
    const existing = await this.getCustomFilters();
    const idx = existing.findIndex((f) => f.id === config.id);
    if (idx >= 0) existing[idx] = config;
    else existing.push(config);
    await this.putCustomFilters(existing);
  }

  async deleteCustomFilter(id: string): Promise<void> {
    const existing = await this.getCustomFilters();
    await this.putCustomFilters(existing.filter((f) => f.id !== id));
  }

  private async putCustomFilters(filters: FilterConfig[]): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.settingsStoreName, "readwrite");
      const store = tx.objectStore(this.settingsStoreName);
      const req = store.put(filters, this.customFiltersKey);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(new Error("Failed to save custom filters"));
    });
  }
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/storage/comicStorage.ts
git commit -m "feat(filters): custom filter library storage"
```

---

### Task 5: Store exports + reactive library store

**Files:**

- Modify: `src/lib/store/filterStore.ts`

**Interfaces:**

- Produces: re-export `premadeFilters`, `customFilterParameters`, `CUSTOM_FILTER_FUNCTIONS`, type `FilterConfig`; `customFilterStore` with `subscribe`, `init()`, `save(config)`, `remove(id)`.

- [ ] **Step 1: Replace file contents**

```ts
import { writable, type Writable } from "svelte/store";
import { comicStorage } from "$lib/storage/comicStorage";
import type { FilterConfig } from "../../types/filterConfig.js";

export {
  premadeFilters,
  customFilterParameters,
  CUSTOM_FILTER_FUNCTIONS,
} from "../../types/filterConfig.js";
export type { FilterConfig } from "../../types/filterConfig.js";

// Global, reusable custom filter library (persisted in IndexedDB settings).
const createCustomFilterStore = () => {
  const { subscribe, set }: Writable<FilterConfig[]> = writable([]);
  return {
    subscribe,
    async init() {
      set(await comicStorage.getCustomFilters());
    },
    async save(config: FilterConfig) {
      await comicStorage.saveCustomFilter(config);
      set(await comicStorage.getCustomFilters());
    },
    async remove(id: string) {
      await comicStorage.deleteCustomFilter(id);
      set(await comicStorage.getCustomFilters());
    },
  };
};

export const customFilterStore = createCustomFilterStore();
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/store/filterStore.ts
git commit -m "feat(filters): reactive custom filter library store"
```

---

### Task 6: FilterButton menu rework

**Files:**

- Modify: `src/lib/ui/FilterButton.svelte`

**Interfaces:**

- Consumes: `premadeFilters`, `FilterConfig`.
- Produces: props `activeConfig: FilterConfig | null`, `customFilters: FilterConfig[]`, `onSelect: (c: FilterConfig | null) => void`, `onEdit: (c: FilterConfig) => void`, `onDelete: (id: string) => void`, `onOpenEditor: () => void`.

- [ ] **Step 1: Replace the `<script>` block**

```svelte
<script lang="ts">
  import { premadeFilters } from '$lib/store/filterStore';
  import type { FilterConfig } from '$lib/store/filterStore';

  export let activeConfig: FilterConfig | null = null;
  export let customFilters: FilterConfig[] = [];
  export let onSelect: (config: FilterConfig | null) => void;
  export let onEdit: (config: FilterConfig) => void;
  export let onDelete: (id: string) => void;
  export let onOpenEditor: () => void;

  let isMenuOpen = false;
  const toggleMenu = () => (isMenuOpen = !isMenuOpen);
  function pick(config: FilterConfig | null) { onSelect(config); isMenuOpen = false; }
  function edit(config: FilterConfig) { onEdit(config); isMenuOpen = false; }
  function create() { onOpenEditor(); isMenuOpen = false; }
</script>
```

- [ ] **Step 2: Replace the menu markup** (the `{#if isMenuOpen}` block)

```svelte
  {#if isMenuOpen}
    <div class="filter-menu">
      <ul>
        <li><button class:active={!activeConfig} on:click={() => pick(null)}>None</button></li>
        <li class="section">Premade</li>
        {#each premadeFilters as filter (filter.id)}
          <li>
            <button class:active={activeConfig?.id === filter.id} on:click={() => pick(structuredClone(filter))}>
              {filter.name}
            </button>
          </li>
        {/each}
        {#if customFilters.length}
          <li class="section">My Filters</li>
          {#each customFilters as filter (filter.id)}
            <li class="custom-row">
              <button class="custom-name" class:active={activeConfig?.id === filter.id} on:click={() => pick(structuredClone(filter))}>
                {filter.name}
              </button>
              <button class="icon" title="Edit" on:click|stopPropagation={() => edit(filter)}>✎</button>
              <button class="icon" title="Delete" on:click|stopPropagation={() => onDelete(filter.id)}>🗑</button>
            </li>
          {/each}
        {/if}
        <li class="divider"></li>
        <li><button on:click={create}>⚙️ Create Custom Filter</button></li>
      </ul>
    </div>
  {/if}
```

- [ ] **Step 3: Add styles for `.section`, `.custom-row`, `.custom-name`, `.icon`** (append to `<style>`)

```css
.filter-menu .section {
  padding: 0.4rem 1rem 0.15rem;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #888;
}
.filter-menu .custom-row {
  display: flex;
  align-items: center;
}
.filter-menu .custom-row .custom-name {
  flex: 1;
}
.filter-menu .custom-row .icon {
  width: auto;
  padding: 0.5rem 0.5rem;
  font-size: 0.85rem;
}
```

- [ ] **Step 4: Type-check**

Run: `npm run check 2>&1 | tail -2`
Expected: remaining errors only in ReaderShell (fixed in Task 8).

- [ ] **Step 5: Commit**

```bash
git add src/lib/ui/FilterButton.svelte
git commit -m "feat(filters): premade + custom library menu"
```

---

### Task 7: FilterEditor rework (name, 4 sections, preview, save/apply/delete)

**Files:**

- Modify: `src/lib/ui/FilterEditor.svelte`

**Interfaces:**

- Consumes: `customFilterParameters`, `CUSTOM_FILTER_FUNCTIONS`, `FilterConfig`, `FilterEngine`, `configValidator`, `logger`.
- Produces: props `open: boolean`, `initialConfig: FilterConfig | null`, `previewBlob: Blob | null`, `onApply: (c: FilterConfig | null) => void`, `onSave: (c: FilterConfig) => void`, `onDelete: (id: string) => void`, `onClose: () => void`.

- [ ] **Step 1: Replace the entire `<script>` block**

```svelte
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

  type Params = Record<string, number>;
  let name = '';
  let params: Params = defaults();
  let editingId: string | null = null;
  let previewCanvas: HTMLCanvasElement;
  let previewBitmap: ImageBitmap | null = null;

  function defaults(): Params {
    const p: Params = {};
    for (const [k, d] of Object.entries(customFilterParameters)) p[k] = d.default;
    return p;
  }

  // Seed on open; close() resets, so each open re-seeds cleanly.
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

  const SECTIONS: { title: string; keys: string[] }[] = [
    { title: 'RGB Channels', keys: ['red', 'green', 'blue'] },
    { title: 'Gamma', keys: ['gamma'] },
    { title: 'Vibrance', keys: ['vibrance'] },
    { title: 'White Balance', keys: ['temperature', 'tint'] },
  ];

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

  function applyFilter() { onApply(buildConfig()); close(); }

  function save() {
    if (!name.trim()) { alert('Please name your filter before saving.'); return; }
    const config = buildConfig();
    const validation = configValidator.validate(config);
    if (!validation.valid) { alert(`Invalid filter:\n${validation.errors.join('\n')}`); return; }
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

  // Preview: render the current page (or a synthetic pattern) with the filter.
  $: if (open && previewCanvas) drawPreview(params, previewBlob);

  async function drawPreview(_p: Params, blob: Blob | null) {
    const ctx = previewCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    const size = 150;
    previewCanvas.width = size;
    previewCanvas.height = size;

    if (blob) {
      if (!previewBitmap) {
        try { previewBitmap = await createImageBitmap(blob); } catch { previewBitmap = null; }
      }
    }
    if (previewBitmap) {
      const s = Math.min(previewBitmap.width, previewBitmap.height);
      ctx.drawImage(previewBitmap, 0, 0, s, s, 0, 0, size, size);
    } else {
      const grad = ctx.createLinearGradient(0, 0, size, size);
      grad.addColorStop(0, '#ff6600'); grad.addColorStop(0.5, '#3366ff'); grad.addColorStop(1, '#33cc66');
      ctx.fillStyle = grad; ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = '#fff'; ctx.fillRect(45, 45, 60, 60);
    }
    engine.applyFilter(ctx, buildConfig());
  }

  // Drop the cached bitmap when the source changes or the editor closes.
  $: if (!open) previewBitmap = null;
</script>
```

- [ ] **Step 2: Replace the markup** (everything between `</script>` and `<style>`)

```svelte
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
```

- [ ] **Step 3: Ensure styles exist for `.name-field`, `.section h4`, `.close`** (append to `<style>`; the file already styles `.parameter-row`, `.value-display`, `.actions`, `.preview-section`, overlay)

```css
.name-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 1rem;
}
.name-field span {
  font-size: 0.8rem;
  color: #d1d1d1;
}
.name-field input {
  padding: 0.5rem;
  border-radius: 6px;
  border: 1px solid #444;
  background: #2a2a2a;
  color: #f5f5f5;
}
.section h4 {
  margin: 0 0 0.5rem;
  color: #ff8533;
  font-size: 0.95rem;
}
.section {
  margin-bottom: 1rem;
}
.editor-header .close {
  background: #333;
  border: 1px solid #444;
  color: #f5f5f5;
  border-radius: 4px;
  cursor: pointer;
  padding: 0.3rem 0.6rem;
}
```

- [ ] **Step 4: Type-check**

Run: `npm run check 2>&1 | tail -2`
Expected: remaining errors only in ReaderShell (Task 8).

- [ ] **Step 5: Commit**

```bash
git add src/lib/ui/FilterEditor.svelte
git commit -m "feat(filters): editor with name, four groups, preview, save/apply/delete"
```

---

### Task 8: ReaderShell wiring

**Files:**

- Modify: `src/lib/ui/ReaderShell.svelte`

**Interfaces:**

- Consumes: `premadeFilters`, `customFilterStore`, `FilterConfig`; `FilterButton`, `FilterEditor` new props; `onExtractPage`.
- Produces: `applyFilterConfig`, `saveCustom`, `deleteCustom`, `openEditorWith`, preview blob loading; `apply-filter` event maps to `premadeFilters` by id.

- [ ] **Step 1: Update imports** (replace the `builtinFilters` import line)

```svelte
  import { premadeFilters, customFilterStore } from '$lib/store/filterStore';
  import type { FilterConfig } from '$lib/store/filterStore';
```

- [ ] **Step 2: Update state + handlers** (replace the current filter state/functions)

```svelte
  let customFilterConfig: FilterConfig | null = null;
  let isEditorOpen = false;
  let editorInitial: FilterConfig | null = null;
  let previewBlob: Blob | null = null;

  async function loadCustomFilter() {
    try {
      const filter = await comicStorage.loadFilterConfig(comic.id);
      if (filter && configValidator.validate(filter).valid) customFilterConfig = filter;
    } catch (error) {
      logger.error('ReaderShell', 'Failed to load filter', error);
    }
  }

  async function applyFilterConfig(config: FilterConfig | null) {
    try {
      if (config && !configValidator.validate(config).valid) return;
      await comicStorage.saveFilterConfig(comic.id, config);
      customFilterConfig = config;
    } catch (error) {
      logger.error('ReaderShell', 'Failed to apply filter', error);
    }
  }

  async function saveCustom(config: FilterConfig) {
    await customFilterStore.save(config);
    await applyFilterConfig(config);
  }

  async function deleteCustom(id: string) {
    await customFilterStore.remove(id);
    if (customFilterConfig?.id === id) await applyFilterConfig(null);
  }

  async function openEditorWith(config: FilterConfig | null) {
    try { previewBlob = await onExtractPage($currentPageIndex); }
    catch { previewBlob = null; }
    editorInitial = config;
    isEditorOpen = true;
  }

  function handleEditorToggle() {
    if (isEditorOpen) isEditorOpen = false;
    else openEditorWith(customFilterConfig?.id.startsWith('custom-') ? customFilterConfig : null);
  }

  function handleApplyFilterEvent(event: Event) {
    const id = (event as CustomEvent).detail?.filterId as string | undefined;
    if (!id || id === 'none') { applyFilterConfig(null); return; }
    const filter = premadeFilters.find((f) => f.id === id);
    if (filter) applyFilterConfig(structuredClone(filter));
  }
```

- [ ] **Step 3: Init the library store on mount** (inside existing `onMount`)

```svelte
    window.addEventListener('filter-editor-toggle', handleEditorToggle);
    window.addEventListener('apply-filter', handleApplyFilterEvent);
    await customFilterStore.init();
    await loadCustomFilter();
```

- [ ] **Step 4: Update the markup** (FilterButton + FilterEditor)

```svelte
	<FilterButton
		activeConfig={customFilterConfig}
		customFilters={$customFilterStore}
		onSelect={applyFilterConfig}
		onEdit={(c) => openEditorWith(c)}
		onDelete={deleteCustom}
		onOpenEditor={() => openEditorWith(null)}
	/>

	<FilterEditor
		open={isEditorOpen}
		initialConfig={editorInitial}
		{previewBlob}
		onApply={applyFilterConfig}
		onSave={saveCustom}
		onDelete={deleteCustom}
		onClose={() => (isEditorOpen = false)}
	/>
```

- [ ] **Step 5: Type-check + lint**

Run: `npm run check 2>&1 | tail -2 && npx eslint src/lib/ui/ReaderShell.svelte src/lib/ui/FilterButton.svelte src/lib/ui/FilterEditor.svelte 2>&1 | tail -5`
Expected: 0 type errors; no NEW lint errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/ui/ReaderShell.svelte
git commit -m "feat(filters): wire premade + custom library into reader"
```

---

### Task 9: Keyboard shortcuts by premade index

**Files:**

- Modify: `src/lib/services/keyboardShortcuts.ts`

**Interfaces:**

- Consumes: `premadeFilters`.
- Produces: `Ctrl+Shift+1..7` dispatch premade ids; `0` = none; `F` = editor.

- [ ] **Step 1: Update the import and digit handling**

Replace `import { builtinFilters } ...` with:

```ts
import { premadeFilters } from "../../types/filterConfig.js";
```

And in the digit match block:

```ts
const digitMatch = event.code.match(/^Digit([1-7])$/);
if (digitMatch) {
  event.preventDefault();
  const filter = premadeFilters[Number(digitMatch[1]) - 1];
  if (filter) {
    window.dispatchEvent(
      new CustomEvent("apply-filter", { detail: { filterId: filter.id } }),
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/services/keyboardShortcuts.ts
git commit -m "feat(filters): premade filter keyboard shortcuts"
```

---

### Task 10: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Type-check, lint, build**

Run: `npm run check 2>&1 | tail -2 && npx prettier --write "src/**/*.{ts,svelte}" >/dev/null && npm run build 2>&1 | tail -3`
Expected: 0 type errors; build succeeds.

- [ ] **Step 2: Confirm no NEW lint errors vs pre-existing baseline**

Run: `npx eslint src/lib/services/filterEngine.ts src/lib/ui/FilterButton.svelte src/lib/ui/FilterEditor.svelte src/lib/store/filterStore.ts 2>&1 | tail -10`
Expected: only pre-existing patterns (Map/each-key/any), no new categories.

- [ ] **Step 3: Re-run engine tests**

Run: `node --experimental-strip-types scratchpad/engineOpsTest.mts 2>&1 | grep -v Experimental && node --experimental-strip-types scratchpad/dispatchTest.mts 2>&1 | grep -v Experimental`
Expected: both PASS.

- [ ] **Step 4: Live browser check (dev server)**

Verify in both page and scroll modes: each premade produces a visible, distinct effect; None clears; Create Custom → adjust sliders → live preview updates → Save (named) appears under My Filters → Apply persists; Edit re-opens with values; Delete removes it; reopening the comic restores the active filter; `Ctrl+Shift+1..7/0/F` work.

- [ ] **Step 5: Final commit (if formatting changed anything)**

```bash
git add -A && git commit -m "chore(filters): format" || echo "nothing to format"
```
