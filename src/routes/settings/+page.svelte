<script lang="ts">
	import { onMount } from 'svelte';
	import { themeStore, allThemesFrom, getActiveTheme } from '$lib/theme/themeStore';
	import { type Theme, type ThemeMode, type Palette } from '$lib/theme/themeSchema';
	import ThemeBuilder from '$lib/ui/ThemeBuilder.svelte';
	import FilterEditor from '$lib/ui/FilterEditor.svelte';
	import {
		customFilterStore,
		premadeFilters,
		type FilterConfig
	} from '$lib/store/filterStore';

	type Section = 'themes' | 'filters';
	let section = $state<Section>('themes');

	// --- Themes ---
	let themeBuilderOpen = $state(false);
	let themeBuilderInitial = $state<Theme | null>(null);

	const themeState = $derived($themeStore);
	const activeTheme = $derived(getActiveTheme(themeState));
	const themes = $derived(allThemesFrom(themeState.userThemes));

	const MODES: { id: ThemeMode; label: string }[] = [
		{ id: 'light', label: 'Light' },
		{ id: 'dark', label: 'Dark' },
		{ id: 'system', label: 'System' }
	];

	function isDarkNow(mode: ThemeMode): boolean {
		if (mode === 'dark') return true;
		if (mode === 'light') return false;
		return typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches;
	}
	const swatchKeys: (keyof Palette)[] = ['primary', 'secondary', 'bgMain', 'bgSurface', 'textMain'];

	function createTheme() {
		themeBuilderInitial = null;
		themeBuilderOpen = true;
	}
	function editTheme(theme: Theme) {
		themeBuilderInitial = theme;
		themeBuilderOpen = true;
	}

	// --- Filters ---
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

	const NAV: { id: Section; label: string }[] = [
		{ id: 'themes', label: 'Themes' },
		{ id: 'filters', label: 'Filters' }
	];
</script>

<svelte:head>
	<title>Settings — ComiKaiju</title>
</svelte:head>

<ThemeBuilder
	open={themeBuilderOpen}
	initial={themeBuilderInitial}
	onClose={() => (themeBuilderOpen = false)}
/>

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
		<a class="back" href="/">← ComiKaiju</a>
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
							Pick a theme or build your own. Each theme defines a light and a dark palette.
						</p>
					</div>
					<button class="btn-primary" onclick={createTheme}>+ Create theme</button>
				</div>

				<div class="mode-inline">
					<span class="mode-inline-label">Mode</span>
					<div class="segmented">
						{#each MODES as m (m.id)}
							<button
								class:selected={themeState.mode === m.id}
								onclick={() => themeStore.setMode(m.id)}
							>
								{m.label}
							</button>
						{/each}
					</div>
				</div>

				<div class="grid">
					{#each themes as t (t.id)}
						{@const palette = isDarkNow(themeState.mode) ? t.dark : t.light}
						<div class="card" class:active={activeTheme.id === t.id}>
							<button
								class="select"
								onclick={() => themeStore.setActiveTheme(t.id)}
								aria-label="Use {t.name}"
							>
								<span class="swatches">
									{#each swatchKeys as k (k)}
										<span class="swatch" style="background:{palette[k]}"></span>
									{/each}
								</span>
								<span class="card-name">
									{t.name}
									{#if activeTheme.id === t.id}<span class="badge">Active</span>{/if}
								</span>
							</button>
							<div class="card-actions">
								<button class="link" onclick={() => editTheme(t)}>
									{t.builtIn ? 'Duplicate' : 'Edit'}
								</button>
								{#if !t.builtIn}
									<button class="link danger" onclick={() => themeStore.deleteTheme(t.id)}>
										Delete
									</button>
								{/if}
							</div>
						</div>
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
									<button class="link danger" onclick={() => void customFilterStore.remove(f.id)}>
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
		max-width: 34rem;
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

	.mode-inline {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1.5rem;
	}
	.mode-inline-label {
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		color: var(--color-text-muted);
	}
	.segmented {
		display: flex;
		gap: 0.25rem;
	}
	.segmented button {
		padding: 0.4rem 0.9rem;
		border-radius: 8px;
		border: 1px solid var(--color-border);
		background: transparent;
		color: var(--color-text-secondary);
		cursor: pointer;
		font-size: 0.85rem;
	}
	.segmented button.selected {
		background: var(--color-primary);
		color: #fff;
		border-color: var(--color-primary);
	}

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
	.card.active {
		border-color: var(--color-primary);
		box-shadow: 0 0 0 1px var(--color-primary);
	}
	.select {
		display: block;
		width: 100%;
		text-align: left;
		background: transparent;
		border: 0;
		padding: 0.9rem;
		cursor: pointer;
	}
	.swatches {
		display: flex;
		gap: 5px;
		margin-bottom: 0.7rem;
	}
	.swatch {
		width: 1.6rem;
		height: 1.6rem;
		border-radius: 5px;
		border: 1px solid color-mix(in srgb, var(--color-text-main) 15%, transparent);
	}
	.filter-body {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 0.9rem 0.9rem 0.5rem;
		flex: 1;
	}
	.card-name {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--color-text-main);
		font-weight: 500;
	}
	.card-desc {
		color: var(--color-text-secondary);
		font-size: 0.8rem;
	}
	.badge {
		font-size: 0.65rem;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		color: var(--color-primary);
		border: 1px solid var(--color-primary);
		border-radius: 9999px;
		padding: 0.05rem 0.45rem;
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
	.link.danger:hover {
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
