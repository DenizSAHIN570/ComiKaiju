<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { get } from 'svelte/store';
	import { resolve } from '$app/paths';
	import { themeStore, allThemesFrom, getActiveTheme, PRESET_IDS } from '$lib/theme/themeStore';
	import { themeValidator } from '$lib/theme/themeValidator';
	import {
		FONT_STACKS,
		type Theme,
		type ThemeMode,
		type Palette,
		type FontId
	} from '$lib/theme/themeSchema';
	import FilterEditor from '$lib/ui/FilterEditor.svelte';
	import {
		customFilterStore,
		premadeFilters,
		type FilterConfig
	} from '$lib/store/filterStore';
	import { readerSettings, type FitMode } from '$lib/reader/readerSettings';

	type Section = 'themes' | 'reader' | 'filters';
	let section = $state<Section>('themes');

	// ---------- Themes ----------
	const themeState = $derived($themeStore);
	const activeTheme = $derived(getActiveTheme(themeState));
	const themes = $derived(allThemesFrom(themeState.userThemes));

	function isDarkNow(mode: ThemeMode): boolean {
		if (mode === 'dark') return true;
		if (mode === 'light') return false;
		return typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches;
	}
	const swatchKeys: (keyof Palette)[] = ['primary', 'secondary', 'bgMain', 'bgSurface', 'textMain'];

	const GROUPS: { title: string; keys: (keyof Palette)[] }[] = [
		{ title: 'Brand', keys: ['primary', 'secondary'] },
		{ title: 'Surfaces', keys: ['bgMain', 'bgSurface', 'bgSecondary'] },
		{ title: 'Text', keys: ['textMain', 'textSecondary', 'textMuted'] },
		{ title: 'Lines', keys: ['border'] },
		{ title: 'Semantic', keys: ['error', 'success', 'warning'] }
	];
	const LABELS: Record<keyof Palette, string> = {
		primary: 'Primary (main)',
		secondary: 'Secondary (side)',
		bgMain: 'Background',
		bgSurface: 'Surface',
		bgSecondary: 'Inset',
		textMain: 'Text',
		textSecondary: 'Text (secondary)',
		textMuted: 'Text (muted)',
		border: 'Border',
		error: 'Error / delete',
		success: 'Success / accept',
		warning: 'Warning'
	};
	const FONTS: { id: FontId; label: string }[] = [
		{ id: 'system-sans', label: 'System Sans' },
		{ id: 'system-serif', label: 'System Serif' },
		{ id: 'mono', label: 'Monospace' },
		{ id: 'rounded', label: 'Rounded' },
		{ id: 'humanist', label: 'Humanist' }
	];

	let draft = $state<Theme | null>(null);
	let editMode = $state<'light' | 'dark'>('dark');
	let importInput = $state<HTMLInputElement>();

	const isPreset = $derived(!!draft && PRESET_IDS.has(draft.id));
	const isOverridden = $derived(
		!!draft && isPreset && themeState.userThemes.some((t) => t.id === draft!.id)
	);

	function clone(t: Theme): Theme {
		return JSON.parse(JSON.stringify(t));
	}
	function reseed() {
		draft = clone(getActiveTheme(get(themeStore)));
	}
	function previewNow() {
		if (draft) themeStore.preview(draft, editMode);
	}

	onMount(() => {
		editMode = isDarkNow(get(themeStore).mode) ? 'dark' : 'light';
		reseed();
		previewNow();
	});
	// Leaving settings: restore the active theme in the app's real mode.
	onDestroy(() => themeStore.restore());

	function selectTheme(t: Theme) {
		themeStore.setActiveTheme(t.id);
		reseed();
		previewNow();
	}
	function newTheme() {
		const base = clone(themes.find((t) => t.id === 'preset-default') ?? themes[0]);
		const cfg: Theme = {
			...base,
			id: `custom-${crypto.randomUUID()}`,
			name: 'My Theme',
			builtIn: false
		};
		themeStore.commitTheme(cfg);
		reseed();
		previewNow();
	}

	const HEX = /^#[0-9a-fA-F]{6}$/;
	function setColor(key: keyof Palette, value: string) {
		if (!draft || !HEX.test(value)) return;
		draft = { ...draft, [editMode]: { ...draft[editMode], [key]: value } };
		previewNow();
	}
	function commit() {
		if (!draft) return;
		if (!draft.name.trim()) draft = { ...draft, name: 'Untitled' };
		themeStore.commitTheme(clone(draft));
	}
	function switchMode(mode: 'light' | 'dark') {
		editMode = mode;
		previewNow();
	}

	function resetPreset() {
		if (!draft) return;
		themeStore.deleteTheme(draft.id);
		reseed();
		previewNow();
	}
	function deleteCustom() {
		if (!draft) return;
		themeStore.deleteTheme(draft.id);
		reseed();
		previewNow();
	}

	function exportTheme() {
		if (!draft) return;
		const json = JSON.stringify({ ...draft, builtIn: false }, null, 2);
		const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
		const a = document.createElement('a');
		a.href = url;
		a.download = `theme-${draft.name.replace(/\s+/g, '-').toLowerCase()}.json`;
		a.click();
		URL.revokeObjectURL(url);
	}
	let importError = $state('');
	async function importFile(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		try {
			const parsed = JSON.parse(await file.text());
			const r = themeValidator.validate({ ...parsed, id: 'tmp', builtIn: false });
			if (!r.valid) {
				importError = `Import failed: ${r.errors[0]}`;
				return;
			}
			themeStore.importTheme(JSON.stringify(parsed));
			importError = '';
			reseed();
			previewNow();
		} catch {
			importError = 'Import failed: not valid JSON';
		}
		(e.target as HTMLInputElement).value = '';
	}

	// ---------- Filters ----------
	let filterEditorOpen = $state(false);
	let filterEditorInitial = $state<FilterConfig | null>(null);
	const customFilters = $derived($customFilterStore);

	onMount(() => {
		void customFilterStore.init();
	});

	function createFilter() {
		filterEditorInitial = null;
		filterEditorOpen = true;
	}
	function editFilter(config: FilterConfig) {
		filterEditorInitial = config;
		filterEditorOpen = true;
	}

	// ---------- Reader ----------
	const reader = $derived($readerSettings);
	type Layout = 'ltr' | 'rtl' | 'vertical';
	const layout = $derived<Layout>(
		reader.readingMode === 'vertical' ? 'vertical' : reader.readingDirection
	);
	const LAYOUTS: { id: Layout; label: string; desc: string }[] = [
		{ id: 'ltr', label: 'Left to right', desc: 'Western comics — turn pages leftward to right' },
		{ id: 'rtl', label: 'Right to left', desc: 'Manga — turn pages rightward to left' },
		{ id: 'vertical', label: 'Vertical scroll', desc: 'Webtoon — continuous top-to-bottom scrolling' }
	];
	function setLayout(id: Layout) {
		if (id === 'vertical') readerSettings.update({ readingMode: 'vertical' });
		else readerSettings.update({ readingMode: 'horizontal', readingDirection: id });
	}
	const FITS: { id: FitMode; label: string }[] = [
		{ id: 'fit-width', label: 'Fit width' },
		{ id: 'fit-height', label: 'Fit height' },
		{ id: 'original', label: 'Original size' }
	];

	const NAV: { id: Section; label: string }[] = [
		{ id: 'themes', label: 'Themes' },
		{ id: 'reader', label: 'Reader' },
		{ id: 'filters', label: 'Filters' }
	];
</script>

<svelte:head>
	<title>Settings — ComiKaiju</title>
</svelte:head>

<FilterEditor
	open={filterEditorOpen}
	initialConfig={filterEditorInitial}
	previewBlob={null}
	showApply={false}
	onApply={() => {}}
	onSave={(config) => {
		void customFilterStore.save(config);
	}}
	onDelete={(id) => {
		void customFilterStore.remove(id);
	}}
	onClose={() => (filterEditorOpen = false)}
/>

<div class="settings-layout">
	<aside class="sidebar">
		<a class="back" href={resolve('/')}>← ComiKaiju</a>
		<h1>Settings</h1>
		<nav>
			{#each NAV as item (item.id)}
				<button
					class="nav-item"
					class:active={section === item.id}
					onclick={() => (section = item.id)}
				>
					{item.label}
				</button>
			{/each}
		</nav>
	</aside>

	<main class="content">
		<div class="content-inner">
			{#if section === 'themes'}
				<div class="content-head">
					<div>
						<h2>Themes</h2>
						<p class="hint">
							Pick a theme to edit it below. Changes apply live; presets can be edited and reset.
						</p>
					</div>
				</div>

				<!-- Top: theme options -->
				<div class="chips">
					{#each themes as t (t.id)}
						{@const palette = isDarkNow(themeState.mode) ? t.dark : t.light}
						<button
							class="chip"
							class:active={activeTheme.id === t.id}
							onclick={() => selectTheme(t)}
						>
							<span class="chip-swatches">
								{#each swatchKeys as k (k)}
									<span class="dot" style="background:{palette[k]}"></span>
								{/each}
							</span>
							<span class="chip-name">{t.name}</span>
						</button>
					{/each}
					<button class="chip new" onclick={newTheme}>+ New</button>
				</div>

				<!-- Bottom: always-visible editor for the selected theme -->
				{#if draft}
					<div class="editor">
						<div class="editor-top">
							<input
								class="name-input"
								value={draft.name}
								maxlength="60"
								placeholder="Theme name"
								oninput={(e) => (draft = { ...draft!, name: e.currentTarget.value })}
								onchange={commit}
							/>
							<div class="mode-tabs">
								<button class:sel={editMode === 'light'} onclick={() => switchMode('light')}>Light</button>
								<button class:sel={editMode === 'dark'} onclick={() => switchMode('dark')}>Dark</button>
							</div>
						</div>

						<div class="groups">
							{#each GROUPS as g (g.title)}
								<div class="group">
									<div class="group-title">{g.title}</div>
									{#each g.keys as key (key)}
										<label class="picker">
											<span>{LABELS[key]}</span>
											<input
												type="color"
												value={draft[editMode][key]}
												oninput={(e) => setColor(key, e.currentTarget.value)}
												onchange={commit}
											/>
											<input
												class="hex"
												value={draft[editMode][key]}
												maxlength="7"
												onchange={(e) => {
													setColor(key, e.currentTarget.value);
													commit();
												}}
											/>
										</label>
									{/each}
								</div>
							{/each}

							<div class="group">
								<div class="group-title">Font</div>
								<select
									value={draft.font}
									onchange={(e) => {
										draft = { ...draft!, font: e.currentTarget.value as FontId };
										previewNow();
										commit();
									}}
								>
									{#each FONTS as f (f.id)}
										<option value={f.id}>{f.label}</option>
									{/each}
								</select>
								<p class="font-sample" style="font-family:{FONT_STACKS[draft.font]}">
									The quick brown fox jumps over the lazy dog
								</p>
							</div>
						</div>

						{#if importError}<p class="err">{importError}</p>{/if}

						<div class="editor-actions">
							<button class="ghost" onclick={() => importInput?.click()}>Import</button>
							<input
								type="file"
								accept="application/json"
								bind:this={importInput}
								onchange={importFile}
								hidden
							/>
							<button class="ghost" onclick={exportTheme}>Export</button>
							<span class="spacer"></span>
							{#if isPreset}
								{#if isOverridden}
									<button class="danger" onclick={resetPreset}>Reset to default</button>
								{/if}
							{:else}
								<button class="danger" onclick={deleteCustom}>Delete theme</button>
							{/if}
						</div>
					</div>
				{/if}
			{:else if section === 'reader'}
				<div class="content-head">
					<div>
						<h2>Reader</h2>
						<p class="hint">Default reading layout for newly opened comics.</p>
					</div>
				</div>

				<h3 class="group-label">Reading layout</h3>
				<div class="radio-list">
					{#each LAYOUTS as l (l.id)}
						<button class="radio-row" class:selected={layout === l.id} onclick={() => setLayout(l.id)}>
							<span class="radio" class:on={layout === l.id}></span>
							<span class="radio-text">
								<span class="radio-label">{l.label}</span>
								<span class="radio-desc">{l.desc}</span>
							</span>
						</button>
					{/each}
				</div>

				<h3 class="group-label">Page fit</h3>
				<div class="segmented">
					{#each FITS as f (f.id)}
						<button
							class:selected={reader.fitMode === f.id}
							onclick={() => readerSettings.update({ fitMode: f.id })}
						>
							{f.label}
						</button>
					{/each}
				</div>
			{:else if section === 'filters'}
				<div class="content-head">
					<div>
						<h2>Filters</h2>
						<p class="hint">
							Manage your reusable image filters. Custom filters appear in the reader's filter menu.
						</p>
					</div>
					<button class="btn-primary" onclick={createFilter}>+ Create filter</button>
				</div>

				<h3 class="group-label">Presets</h3>
				<div class="grid">
					{#each premadeFilters as f (f.id)}
						<div class="card">
							<div class="filter-body">
								<span class="card-name">{f.name}</span>
								{#if f.description}<span class="card-desc">{f.description}</span>{/if}
							</div>
							<div class="card-actions">
								<button class="link" onclick={() => editFilter(f)}>Duplicate</button>
							</div>
						</div>
					{/each}
				</div>

				<h3 class="group-label">My Filters</h3>
				{#if customFilters.length === 0}
					<p class="empty">No custom filters yet. Create one to get started.</p>
				{:else}
					<div class="grid">
						{#each customFilters as f (f.id)}
							<div class="card">
								<div class="filter-body">
									<span class="card-name">{f.name}</span>
									{#if f.description}<span class="card-desc">{f.description}</span>{/if}
								</div>
								<div class="card-actions">
									<button class="link" onclick={() => editFilter(f)}>Edit</button>
									<button class="link danger-link" onclick={() => void customFilterStore.remove(f.id)}>
										Delete
									</button>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			{/if}
		</div>
	</main>
</div>

<style>
	.settings-layout {
		display: flex;
		min-height: 100vh;
		align-items: stretch;
	}
	.sidebar {
		width: 15rem;
		flex-shrink: 0;
		border-right: 1px solid var(--color-border);
		padding: 1.5rem 1rem;
		background: var(--color-bg-surface);
	}
	.back {
		display: inline-block;
		color: var(--color-text-secondary);
		text-decoration: none;
		font-size: 0.85rem;
		margin-bottom: 1.5rem;
	}
	.back:hover {
		color: var(--color-primary);
	}
	.sidebar h1 {
		font-size: 1.25rem;
		font-weight: 700;
		margin: 0 0 1rem;
		color: var(--color-text-main);
	}
	nav {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}
	.nav-item {
		text-align: left;
		padding: 0.5rem 0.75rem;
		border-radius: 8px;
		border: 0;
		border-left: 2px solid transparent;
		background: transparent;
		color: var(--color-text-secondary);
		cursor: pointer;
		font-size: 0.95rem;
	}
	.nav-item:hover {
		background: var(--color-bg-secondary);
		color: var(--color-text-main);
	}
	.nav-item.active {
		background: var(--color-bg-secondary);
		color: var(--color-primary);
		border-left-color: var(--color-primary);
		font-weight: 600;
	}

	.content {
		flex: 1;
		min-width: 0;
		display: flex;
		justify-content: center;
		padding: 2rem 1.5rem;
	}
	.content-inner {
		width: 100%;
		max-width: 52rem;
	}
	.content-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1.5rem;
	}
	h2 {
		font-size: 1.4rem;
		font-weight: 700;
		margin: 0 0 0.25rem;
		color: var(--color-text-main);
	}
	.hint {
		color: var(--color-text-secondary);
		font-size: 0.9rem;
		margin: 0;
		max-width: 36rem;
	}
	.btn-primary {
		flex-shrink: 0;
		padding: 0.5rem 1rem;
		border-radius: 8px;
		border: 1px solid var(--color-primary);
		background: var(--color-primary);
		color: #fff;
		cursor: pointer;
		font-size: 0.9rem;
	}
	.btn-primary:hover {
		background: var(--color-primary-hover);
	}

	/* Theme chips */
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
		margin-bottom: 1.5rem;
	}
	.chip {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		padding: 0.5rem 0.75rem;
		border-radius: 9999px;
		border: 1px solid var(--color-border);
		background: var(--color-bg-surface);
		color: var(--color-text-main);
		cursor: pointer;
		font-size: 0.9rem;
	}
	.chip:hover {
		border-color: var(--color-text-secondary);
	}
	.chip.active {
		border-color: var(--color-primary);
		box-shadow: 0 0 0 1px var(--color-primary);
	}
	.chip.new {
		color: var(--color-text-secondary);
		border-style: dashed;
	}
	.chip.new:hover {
		color: var(--color-primary);
		border-color: var(--color-primary);
	}
	.chip-swatches {
		display: flex;
		gap: 3px;
	}
	.dot {
		width: 0.85rem;
		height: 0.85rem;
		border-radius: 3px;
		border: 1px solid color-mix(in srgb, var(--color-text-main) 15%, transparent);
	}

	/* Inline editor */
	.editor {
		border: 1px solid var(--color-border);
		border-radius: 12px;
		background: var(--color-bg-surface);
		padding: 1.25rem;
	}
	.editor-top {
		display: flex;
		gap: 0.75rem;
		align-items: center;
		margin-bottom: 1.25rem;
	}
	.name-input {
		flex: 1;
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border);
		border-radius: 8px;
		padding: 0.55rem 0.75rem;
		color: var(--color-text-main);
		font-size: 1rem;
	}
	.mode-tabs {
		display: flex;
		gap: 0.25rem;
	}
	.mode-tabs button {
		padding: 0.5rem 1rem;
		border-radius: 8px;
		border: 1px solid var(--color-border);
		background: transparent;
		color: var(--color-text-secondary);
		cursor: pointer;
	}
	.mode-tabs button.sel {
		background: var(--color-primary);
		color: #fff;
		border-color: var(--color-primary);
	}
	.groups {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
		gap: 1.25rem;
	}
	.group-title {
		font-size: 0.75rem;
		text-transform: uppercase;
		color: var(--color-text-muted);
		margin-bottom: 0.5rem;
	}
	.picker {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.25rem 0;
	}
	.picker span {
		flex: 1;
		color: var(--color-text-secondary);
		font-size: 0.9rem;
	}
	.picker input[type='color'] {
		width: 2.5rem;
		height: 2rem;
		border: 1px solid var(--color-border);
		border-radius: 6px;
		background: transparent;
		cursor: pointer;
		padding: 0;
	}
	.hex {
		width: 5.5rem;
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border);
		border-radius: 6px;
		padding: 0.35rem;
		color: var(--color-text-main);
	}
	select {
		width: 100%;
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border);
		border-radius: 6px;
		padding: 0.5rem;
		color: var(--color-text-main);
	}
	.font-sample {
		margin: 0.5rem 0 0;
		color: var(--color-text-secondary);
		font-size: 0.9rem;
	}
	.err {
		color: var(--color-status-error);
		font-size: 0.85rem;
		margin: 0.75rem 0 0;
	}
	.editor-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 1.25rem;
		padding-top: 1rem;
		border-top: 1px solid var(--color-border);
	}
	.spacer {
		flex: 1;
	}
	.ghost {
		padding: 0.45rem 0.9rem;
		border-radius: 8px;
		border: 1px solid var(--color-border);
		background: transparent;
		color: var(--color-text-secondary);
		cursor: pointer;
		font-size: 0.85rem;
	}
	.ghost:hover {
		color: var(--color-text-main);
		border-color: var(--color-text-secondary);
	}
	.danger {
		padding: 0.45rem 0.9rem;
		border-radius: 8px;
		border: 1px solid var(--color-status-error);
		background: var(--color-status-error);
		color: #fff;
		cursor: pointer;
		font-size: 0.85rem;
	}
	.danger:hover {
		background: color-mix(in srgb, var(--color-status-error) 85%, #000);
	}

	/* Filters + shared cards */
	.group-label {
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		color: var(--color-text-muted);
		margin: 1.5rem 0 0.75rem;
	}
	.group-label:first-of-type {
		margin-top: 0;
	}
	.empty {
		color: var(--color-text-secondary);
		font-size: 0.9rem;
	}

	/* Reader: layout radios + fit segmented */
	.radio-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		max-width: 34rem;
	}
	.radio-row {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		padding: 0.85rem 1rem;
		border-radius: 10px;
		border: 1px solid var(--color-border);
		background: var(--color-bg-surface);
		cursor: pointer;
		text-align: left;
	}
	.radio-row.selected {
		border-color: var(--color-primary);
	}
	.radio {
		width: 1.1rem;
		height: 1.1rem;
		border-radius: 9999px;
		border: 2px solid var(--color-text-muted);
		flex-shrink: 0;
	}
	.radio.on {
		border-color: var(--color-primary);
		background: radial-gradient(circle, var(--color-primary) 40%, transparent 45%);
	}
	.radio-text {
		display: flex;
		flex-direction: column;
	}
	.radio-label {
		color: var(--color-text-main);
		font-weight: 500;
	}
	.radio-desc {
		color: var(--color-text-secondary);
		font-size: 0.85rem;
	}
	.segmented {
		display: flex;
		gap: 0.5rem;
		max-width: 34rem;
	}
	.segmented button {
		flex: 1;
		padding: 0.55rem;
		border-radius: 8px;
		border: 1px solid var(--color-border);
		background: transparent;
		color: var(--color-text-secondary);
		cursor: pointer;
	}
	.segmented button.selected {
		background: var(--color-primary);
		color: #fff;
		border-color: var(--color-primary);
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
		gap: 1rem;
	}
	.card {
		border: 1px solid var(--color-border);
		border-radius: 10px;
		overflow: hidden;
		background: var(--color-bg-surface);
		display: flex;
		flex-direction: column;
	}
	.filter-body {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 0.9rem 0.9rem 0.5rem;
		flex: 1;
	}
	.card-name {
		color: var(--color-text-main);
		font-weight: 500;
	}
	.card-desc {
		color: var(--color-text-secondary);
		font-size: 0.8rem;
	}
	.card-actions {
		display: flex;
		gap: 0.75rem;
		padding: 0 0.9rem 0.9rem;
	}
	.link {
		background: transparent;
		border: 0;
		color: var(--color-text-secondary);
		cursor: pointer;
		font-size: 0.85rem;
		padding: 0.2rem 0;
	}
	.link:hover {
		color: var(--color-primary);
	}
	.danger-link {
		color: var(--color-status-error);
	}
	.danger-link:hover {
		color: var(--color-status-error);
	}

	@media (max-width: 768px) {
		.settings-layout {
			flex-direction: column;
		}
		.sidebar {
			width: auto;
			border-right: 0;
			border-bottom: 1px solid var(--color-border);
		}
		nav {
			flex-direction: row;
			flex-wrap: wrap;
		}
		.content {
			padding: 1.5rem 1rem;
		}
	}
</style>
