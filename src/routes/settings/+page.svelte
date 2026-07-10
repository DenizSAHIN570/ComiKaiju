<script lang="ts">
	import { themeStore, allThemesFrom, getActiveTheme } from '$lib/theme/themeStore';
	import { type Theme, type ThemeMode, type Palette } from '$lib/theme/themeSchema';
	import ThemeBuilder from '$lib/ui/ThemeBuilder.svelte';

	type Section = 'themes' | 'appearance';
	let section = $state<Section>('themes');

	let builderOpen = $state(false);
	let builderInitial = $state<Theme | null>(null);

	const themeState = $derived($themeStore);
	const active = $derived(getActiveTheme(themeState));
	const themes = $derived(allThemesFrom(themeState.userThemes));

	const NAV: { id: Section; label: string }[] = [
		{ id: 'themes', label: 'Themes' },
		{ id: 'appearance', label: 'Appearance' }
	];

	const MODES: { id: ThemeMode; label: string; desc: string }[] = [
		{ id: 'light', label: 'Light', desc: 'Always use the light palette' },
		{ id: 'dark', label: 'Dark', desc: 'Always use the dark palette' },
		{ id: 'system', label: 'System', desc: 'Follow your device setting' }
	];

	function isDarkNow(mode: ThemeMode): boolean {
		if (mode === 'dark') return true;
		if (mode === 'light') return false;
		return typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches;
	}
	const swatchKeys: (keyof Palette)[] = ['primary', 'secondary', 'bgMain', 'bgSurface', 'textMain'];

	function create() {
		builderInitial = null;
		builderOpen = true;
	}
	function edit(theme: Theme) {
		builderInitial = theme;
		builderOpen = true;
	}
</script>

<svelte:head>
	<title>Settings — ComiKaiju</title>
</svelte:head>

<ThemeBuilder open={builderOpen} initial={builderInitial} onClose={() => (builderOpen = false)} />

<div class="settings-layout">
	<aside class="sidebar">
		<a class="back" href="/">← ComiKaiju</a>
		<h1>Settings</h1>
		<nav>
			{#each NAV as item (item.id)}
				<button class="nav-item" class:active={section === item.id} onclick={() => (section = item.id)}>
					{item.label}
				</button>
			{/each}
		</nav>
	</aside>

	<main class="content">
		{#if section === 'themes'}
			<div class="content-head">
				<div>
					<h2>Themes</h2>
					<p class="hint">Pick a theme or build your own. Each theme defines a light and a dark palette.</p>
				</div>
				<button class="btn-primary" onclick={create}>+ Create theme</button>
			</div>

			<div class="theme-grid">
				{#each themes as t (t.id)}
					{@const palette = isDarkNow(themeState.mode) ? t.dark : t.light}
					<div class="theme-card" class:active={active.id === t.id}>
						<button class="select" onclick={() => themeStore.setActiveTheme(t.id)} aria-label="Use {t.name}">
							<span class="swatches">
								{#each swatchKeys as k (k)}
									<span class="swatch" style="background:{palette[k]}"></span>
								{/each}
							</span>
							<span class="theme-name">
								{t.name}
								{#if active.id === t.id}<span class="badge">Active</span>{/if}
							</span>
						</button>
						<div class="card-actions">
							<button class="link" onclick={() => edit(t)}>{t.builtIn ? 'Duplicate' : 'Edit'}</button>
							{#if !t.builtIn}
								<button class="link danger" onclick={() => themeStore.deleteTheme(t.id)}>Delete</button>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{:else if section === 'appearance'}
			<div class="content-head">
				<div>
					<h2>Appearance</h2>
					<p class="hint">Choose whether the active theme follows light or dark mode.</p>
				</div>
			</div>

			<div class="mode-list">
				{#each MODES as m (m.id)}
					<button class="mode-row" class:selected={themeState.mode === m.id} onclick={() => themeStore.setMode(m.id)}>
						<span class="radio" class:on={themeState.mode === m.id}></span>
						<span class="mode-text">
							<span class="mode-label">{m.label}</span>
							<span class="mode-desc">{m.desc}</span>
						</span>
					</button>
				{/each}
			</div>
		{/if}
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
		padding: 2rem 2.5rem;
		max-width: 60rem;
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

	.theme-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
		gap: 1rem;
	}
	.theme-card {
		border: 1px solid var(--color-border);
		border-radius: 10px;
		overflow: hidden;
		background: var(--color-bg-surface);
	}
	.theme-card.active {
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
	.theme-name {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--color-text-main);
		font-weight: 500;
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

	.mode-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		max-width: 34rem;
	}
	.mode-row {
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
	.mode-row.selected {
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
		background:
			radial-gradient(circle, var(--color-primary) 40%, transparent 45%);
	}
	.mode-text {
		display: flex;
		flex-direction: column;
	}
	.mode-label {
		color: var(--color-text-main);
		font-weight: 500;
	}
	.mode-desc {
		color: var(--color-text-secondary);
		font-size: 0.85rem;
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
