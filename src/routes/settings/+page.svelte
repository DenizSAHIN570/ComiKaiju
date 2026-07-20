<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { get } from 'svelte/store';
	import AppBar from '$lib/ui/AppBar.svelte';
	import SiteFooter from '$lib/ui/SiteFooter.svelte';
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

<AppBar active="settings" />

<div class="settings">
	<nav class="snav">
		{#each NAV as item (item.id)}
			<button
				type="button"
				class:active={section === item.id}
				onclick={() => (section = item.id)}
			>
				{item.label}
			</button>
		{/each}
	</nav>

	<div class="scontent">
		{#if section === 'themes'}
			<div class="shead">
				<h2>Themes</h2>
				<p>Pick a theme to edit it below. Changes apply live; presets can be edited and reset.</p>
			</div>

			<!-- Top: theme options -->
			<div class="chips">
				{#each themes as t (t.id)}
					{@const palette = isDarkNow(themeState.mode) ? t.dark : t.light}
					<button
						type="button"
						class="chip"
						class:active={activeTheme.id === t.id}
						onclick={() => selectTheme(t)}
					>
						<span class="sws">
							{#each swatchKeys as k (k)}
								<span class="sw" style="background:{palette[k]}"></span>
							{/each}
						</span>
						<span class="nm">{t.name}</span>
						<span class="tg">{PRESET_IDS.has(t.id) ? 'Preset' : 'Yours'}</span>
					</button>
				{/each}
				<button type="button" class="chip new" onclick={newTheme}>
					<span class="nm">+ New</span>
				</button>
			</div>

			<!-- Bottom: always-visible editor for the selected theme -->
			{#if draft}
				<div class="editor">
					<div class="etop">
						<input
							class="name-input"
							value={draft.name}
							maxlength="60"
							placeholder="Theme name"
							oninput={(e) => (draft = { ...draft!, name: e.currentTarget.value })}
							onchange={commit}
						/>
						<div class="modetabs">
							<button
								type="button"
								class:sel={editMode === 'light'}
								onclick={() => switchMode('light')}>Light</button
							>
							<button type="button" class:sel={editMode === 'dark'} onclick={() => switchMode('dark')}
								>Dark</button
							>
						</div>
					</div>

					<div class="groups">
						{#each GROUPS as g (g.title)}
							<div class="grp">
								<div class="gt">{g.title}</div>
								{#each g.keys as key (key)}
									<label class="pick">
										<span class="pl">{LABELS[key]}</span>
										<input
											class="col-input"
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
					</div>

					<div class="fontrow">
						<div class="gt">Font</div>
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
						<p class="samp" style="font-family:{FONT_STACKS[draft.font]}">
							The quick brown fox jumps over the lazy dog
						</p>
					</div>

					{#if importError}<p class="err">{importError}</p>{/if}

					<div class="eactions">
						<button type="button" class="ghost-sm" onclick={() => importInput?.click()}>
							Import
						</button>
						<input
							type="file"
							accept="application/json"
							bind:this={importInput}
							onchange={importFile}
							hidden
						/>
						<button type="button" class="ghost-sm" onclick={exportTheme}>Export</button>
						<span class="spacer"></span>
						{#if isPreset}
							{#if isOverridden}
								<button type="button" class="danger" onclick={resetPreset}>Reset to default</button>
							{/if}
						{:else}
							<button type="button" class="danger" onclick={deleteCustom}>Delete theme</button>
						{/if}
					</div>
				</div>
			{/if}
		{:else if section === 'reader'}
			<div class="shead">
				<h2>Reader</h2>
				<p>Default reading layout for newly opened comics.</p>
			</div>

			<h3 class="glabel">Reading layout</h3>
			<div class="radio-list">
				{#each LAYOUTS as l (l.id)}
					<button
						type="button"
						class="radio-row"
						class:sel={layout === l.id}
						onclick={() => setLayout(l.id)}
					>
						<span class="radio" class:on={layout === l.id}></span>
						<span>
							<div class="rl">{l.label}</div>
							<div class="rd">{l.desc}</div>
						</span>
					</button>
				{/each}
			</div>

			<h3 class="glabel">Page fit</h3>
			<div class="segmented">
				{#each FITS as f (f.id)}
					<button
						type="button"
						class:sel={reader.fitMode === f.id}
						onclick={() => readerSettings.update({ fitMode: f.id })}
					>
						{f.label}
					</button>
				{/each}
			</div>
		{:else if section === 'filters'}
			<div class="fhead">
				<div class="shead">
					<h2>Filters</h2>
					<p>Manage your reusable image filters. Custom filters appear in the reader's filter menu.</p>
				</div>
				<button type="button" class="btn-primary" onclick={createFilter}>+ Create filter</button>
			</div>

			<h3 class="glabel">Presets</h3>
			<div class="fgrid">
				{#each premadeFilters as f (f.id)}
					<div class="fcard">
						<div class="fn">{f.name}</div>
						{#if f.description}<div class="fd">{f.description}</div>{/if}
						<div class="fa">
							<button type="button" onclick={() => editFilter(f)}>Duplicate</button>
						</div>
					</div>
				{/each}
			</div>

			<h3 class="glabel">My Filters</h3>
			{#if customFilters.length === 0}
				<p class="empty">No custom filters yet. Create one to get started.</p>
			{:else}
				<div class="fgrid">
					{#each customFilters as f (f.id)}
						<div class="fcard">
							<div class="fn">{f.name}</div>
							{#if f.description}<div class="fd">{f.description}</div>{/if}
							<div class="fa">
								<button type="button" onclick={() => editFilter(f)}>Edit</button>
								<button
									type="button"
									class="danger-link"
									onclick={() => void customFilterStore.remove(f.id)}
								>
									Delete
								</button>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		{/if}
	</div>
</div>

<SiteFooter />

<style>
	.settings {
		display: grid;
		grid-template-columns: 184px 1fr;
		min-height: 60vh;
	}

	.snav {
		border-right: 1px solid var(--color-border);
		padding: 22px 0;
		display: flex;
		flex-direction: column;
	}
	.snav button {
		display: block;
		width: 100%;
		text-align: left;
		padding: 10px 22px;
		border: 0;
		border-left: 2px solid transparent;
		background: transparent;
		font-family: var(--font-base);
		font-size: 0.78rem;
		letter-spacing: 0.04em;
		color: var(--color-text-secondary);
		cursor: pointer;
	}
	.snav button:hover {
		color: var(--color-text-main);
	}
	.snav button.active {
		color: var(--color-text-main);
		border-left-color: var(--color-primary);
	}

	.scontent {
		padding: 26px 30px 40px;
		max-width: 52rem;
	}

	.shead {
		margin-bottom: 22px;
	}
	.shead h2 {
		margin: 0 0 4px;
		font-size: 1.35rem;
		font-weight: 800;
		letter-spacing: -0.02em;
		color: var(--color-text-main);
	}
	.shead p {
		margin: 0;
		color: var(--color-text-secondary);
		font-size: 0.86rem;
		max-width: 40rem;
	}

	.btn-primary {
		flex-shrink: 0;
		background: var(--color-primary);
		border: 1px solid var(--color-primary);
		border-radius: 3px;
		color: #fff;
		font-family: var(--font-base);
		font-weight: 650;
		font-size: 0.82rem;
		padding: 9px 15px;
		cursor: pointer;
	}
	.btn-primary:hover {
		background: var(--color-primary-hover);
	}

	/* Theme chips */
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		margin-bottom: 26px;
	}
	.chip {
		display: flex;
		align-items: center;
		gap: 9px;
		padding: 8px 12px;
		border: 1px solid var(--color-border);
		border-radius: 3px;
		background: var(--color-bg-main);
		color: var(--color-text-main);
		font-family: var(--font-base);
		cursor: pointer;
	}
	.chip:hover {
		border-color: var(--color-text-secondary);
	}
	.chip.active {
		border-color: var(--color-primary);
		box-shadow: inset 0 0 0 1px var(--color-primary);
	}
	.chip.new {
		border-style: dashed;
		color: var(--color-text-secondary);
	}
	.chip.new:hover {
		color: var(--color-primary);
		border-color: var(--color-primary);
	}
	.chip .sws {
		display: flex;
		gap: 3px;
	}
	.chip .sw {
		width: 11px;
		height: 11px;
		border-radius: 2px;
		border: 1px solid color-mix(in srgb, var(--color-text-main) 15%, transparent);
	}
	.chip .nm {
		font-size: 0.82rem;
		font-weight: 600;
	}
	.chip .tg {
		font-family: var(--font-base);
		font-size: 0.6rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-text-muted);
	}

	/* Inline editor */
	.editor {
		border: 1px solid var(--color-border);
		border-radius: 4px;
		background: var(--color-bg-surface);
		padding: 20px;
	}
	.etop {
		display: flex;
		gap: 12px;
		align-items: center;
		margin-bottom: 20px;
	}
	.name-input {
		flex: 1;
		background: var(--color-bg-main);
		border: 1px solid var(--color-border);
		border-radius: 3px;
		padding: 10px 12px;
		color: var(--color-text-main);
		font-family: var(--font-base);
		font-size: 0.95rem;
		font-weight: 600;
	}
	.modetabs {
		display: flex;
		border: 1px solid var(--color-border);
		border-radius: 3px;
		overflow: hidden;
	}
	.modetabs button {
		background: transparent;
		border: 0;
		border-left: 1px solid var(--color-border);
		padding: 9px 16px;
		color: var(--color-text-secondary);
		font-family: var(--font-base);
		font-size: 0.78rem;
		cursor: pointer;
	}
	.modetabs button:first-child {
		border-left: none;
	}
	.modetabs button.sel {
		background: var(--color-primary);
		color: #fff;
	}
	.groups {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 20px 28px;
	}
	.gt {
		font-family: var(--font-base);
		font-size: 0.65rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-text-muted);
		margin-bottom: 8px;
	}
	.pick {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 5px 0;
	}
	.pick .pl {
		flex: 1;
		color: var(--color-text-secondary);
		font-size: 0.82rem;
	}
	.pick .col-input {
		width: 26px;
		height: 22px;
		border-radius: 3px;
		border: 1px solid var(--color-border);
		background: transparent;
		padding: 0;
		cursor: pointer;
	}
	.hex {
		width: 82px;
		background: var(--color-bg-main);
		border: 1px solid var(--color-border);
		border-radius: 3px;
		padding: 6px 8px;
		color: var(--color-text-main);
		font-family: var(--font-base);
		font-size: 0.72rem;
	}
	.fontrow {
		margin-top: 20px;
		padding-top: 16px;
		border-top: 1px solid var(--color-border);
	}
	.fontrow select {
		width: 100%;
		max-width: 280px;
		background: var(--color-bg-main);
		border: 1px solid var(--color-border);
		border-radius: 3px;
		padding: 9px;
		color: var(--color-text-main);
		font-family: var(--font-base);
	}
	.fontrow .samp {
		margin: 10px 0 0;
		color: var(--color-text-secondary);
		font-size: 0.9rem;
	}
	.err {
		color: var(--color-status-error);
		font-size: 0.85rem;
		margin: 0.75rem 0 0;
	}
	.eactions {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-top: 20px;
		padding-top: 16px;
		border-top: 1px solid var(--color-border);
	}
	.spacer {
		flex: 1;
	}
	.ghost-sm {
		background: transparent;
		border: 1px solid var(--color-border);
		border-radius: 3px;
		color: var(--color-text-secondary);
		font-family: var(--font-base);
		font-size: 0.8rem;
		padding: 8px 14px;
		cursor: pointer;
	}
	.ghost-sm:hover {
		color: var(--color-text-main);
		border-color: var(--color-text-secondary);
	}
	.danger {
		background: transparent;
		border: 1px solid var(--color-status-error);
		border-radius: 3px;
		color: var(--color-status-error);
		font-family: var(--font-base);
		font-size: 0.8rem;
		padding: 8px 14px;
		cursor: pointer;
	}
	.danger:hover {
		background: var(--color-status-error);
		color: #fff;
	}

	/* Reader + filters shared */
	.glabel {
		font-family: var(--font-base);
		font-size: 0.8rem;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--color-text-muted);
		margin: 26px 0 12px;
	}
	.glabel:first-of-type {
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
		gap: 8px;
		max-width: 440px;
		margin-bottom: 26px;
	}
	.radio-row {
		display: flex;
		align-items: center;
		gap: 13px;
		padding: 13px 15px;
		border: 1px solid var(--color-border);
		border-radius: 3px;
		background: var(--color-bg-main);
		cursor: pointer;
		text-align: left;
	}
	.radio-row.sel {
		border-color: var(--color-primary);
	}
	.radio {
		width: 15px;
		height: 15px;
		border-radius: 50%;
		border: 2px solid var(--color-text-muted);
		flex-shrink: 0;
	}
	.radio.on {
		border-color: var(--color-primary);
		background: radial-gradient(circle, var(--color-primary) 42%, transparent 46%);
	}
	.rl {
		color: var(--color-text-main);
		font-weight: 600;
		font-size: 0.88rem;
	}
	.rd {
		color: var(--color-text-secondary);
		font-size: 0.8rem;
	}
	.segmented {
		display: flex;
		gap: 8px;
		max-width: 440px;
	}
	.segmented button {
		flex: 1;
		padding: 10px;
		border: 1px solid var(--color-border);
		border-radius: 3px;
		background: var(--color-bg-main);
		color: var(--color-text-secondary);
		font-family: var(--font-base);
		font-size: 0.82rem;
		cursor: pointer;
	}
	.segmented button.sel {
		background: var(--color-primary);
		color: #fff;
		border-color: var(--color-primary);
	}

	/* Filters */
	.fhead {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
	}
	.fhead .shead {
		margin-bottom: 0;
	}
	.fgrid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
		gap: 14px;
	}
	.fcard {
		border: 1px solid var(--color-border);
		border-radius: 4px;
		background: var(--color-bg-main);
		padding: 14px;
	}
	.fcard .fn {
		color: var(--color-text-main);
		font-weight: 650;
		font-size: 0.88rem;
	}
	.fcard .fd {
		color: var(--color-text-secondary);
		font-size: 0.76rem;
		margin-top: 3px;
	}
	.fcard .fa {
		margin-top: 12px;
		display: flex;
		gap: 14px;
	}
	.fcard .fa button {
		background: transparent;
		border: 0;
		color: var(--color-text-secondary);
		font-family: var(--font-base);
		font-size: 0.78rem;
		cursor: pointer;
		padding: 0;
	}
	.fcard .fa button:hover {
		color: var(--color-primary);
	}
	.fcard .fa .danger-link {
		color: var(--color-status-error);
	}
	.fcard .fa .danger-link:hover {
		color: var(--color-status-error);
	}

	@media (max-width: 768px) {
		.settings {
			grid-template-columns: 1fr;
		}
		.snav {
			border-right: 0;
			border-bottom: 1px solid var(--color-border);
			flex-direction: row;
			flex-wrap: wrap;
			padding: 10px 12px;
		}
		.scontent {
			padding: 20px 16px 30px;
			max-width: none;
		}
	}
</style>
