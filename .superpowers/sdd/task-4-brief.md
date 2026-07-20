## Task 4: `AppMenu.svelte` — mode switch + theme picker + links

**Files:**
- Create: `src/lib/ui/AppMenu.svelte`
- Reference (markup/CSS source): mockup `menu-button-v3.html`

**Interfaces:**
- Consumes: `themeStore` (`$themeStore` → `{ mode, activeThemeId, userThemes, meta }`), `allThemesFrom`, `getActiveTheme`, `PRESET_IDS` from `themeStore`; `orderThemesForPicker` from `themeOrder`; `resolve` from `$app/paths`; the 5 swatch keys `["primary","secondary","bgMain","bgSurface","textMain"]`.
- Produces: `<AppMenu />` (no props). Renders the hamburger button + dropdown.

- [ ] **Step 1: Build the component**

Create `src/lib/ui/AppMenu.svelte`. Port the button + dropdown markup and `.menubtn/.dropdown/.seg/.themes/.theme/.dd-item` styles from `menu-button-v3.html`, converting hardcoded mockup colors to tokens per Global Constraints. Script contract:

```svelte
<script lang="ts">
  import { themeStore, allThemesFrom, getActiveTheme, PRESET_IDS } from "$lib/theme/themeStore";
  import { orderThemesForPicker } from "$lib/theme/themeOrder";
  import type { ThemeMode, Palette } from "$lib/theme/themeSchema";
  import { resolve } from "$app/paths";

  let open = $state(false);
  const swatchKeys: (keyof Palette)[] = ["primary", "secondary", "bgMain", "bgSurface", "textMain"];
  const state = $derived($themeStore);
  const active = $derived(getActiveTheme(state));
  const isDark = $derived(state.mode === "dark" || (state.mode === "system" &&
    typeof matchMedia !== "undefined" && matchMedia("(prefers-color-scheme: dark)").matches));
  const picker = $derived(
    orderThemesForPicker(allThemesFrom(state.userThemes), state.meta, PRESET_IDS, 3),
  );
  function setMode(m: ThemeMode) { themeStore.setMode(m); }
  function pick(id: string) { themeStore.setActiveTheme(id); }
  function close() { open = false; }
</script>

<svelte:window onclick={close} />
<!-- button toggles `open` with stopPropagation; dropdown items call setMode/pick; -->
<!-- theme rows render swatchKeys from (isDark ? t.dark : t.light); active row gets ✓; -->
<!-- tag = PRESET_IDS.has(t.id) ? 'Preset' : 'Yours'; "Builder →" and "Settings" -->
<!-- link to resolve('/settings'); "Install app" triggers the PWA prompt (see Step 2). -->
```

- [ ] **Step 2: Wire the Install-app affordance**

Add a `beforeinstallprompt` capture and a handler:

```ts
let deferredPrompt: any = $state(null);
$effect(() => {
  const h = (e: Event) => { e.preventDefault(); deferredPrompt = e; };
  window.addEventListener("beforeinstallprompt", h);
  return () => window.removeEventListener("beforeinstallprompt", h);
});
async function install() { if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt = null; } }
```

Show the Install-app row only when `deferredPrompt` is set.

- [ ] **Step 3: Verify types + lint + visual**

Run: `npm run check && npm run lint`
Expected: PASS. In `npm run dev`, temporarily drop `<AppMenu />` into `+layout.svelte` or a page: dropdown opens, mode switch changes theme live, theme rows show swatches and switch the active theme, `Settings`/`Builder` navigate to `/settings`. Compare to `menu-button-v3.html`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/ui/AppMenu.svelte
git commit -m "feat(ui): add AppMenu (mode switch, theme picker, settings, install)"
```

---

