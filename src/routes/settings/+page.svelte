<script lang="ts">
	import { themeStore, allThemesFrom, getActiveTheme } from '$lib/theme/themeStore';
	import { type Theme, type ThemeMode, type Palette } from '$lib/theme/themeSchema';
	import ThemeBuilder from '$lib/ui/ThemeBuilder.svelte';

	let builderOpen = $state(false);
	let builderInitial = $state<Theme | null>(null);

	const themeState = $derived($themeStore);
	const active = $derived(getActiveTheme(themeState));
	const themes = $derived(allThemesFrom(themeState.userThemes));

	const MODES: { id: ThemeMode; label: string }[] = [
		{ id: 'light', label: 'Light' },
		{ id: 'dark', label: 'Dark' },
		{ id: 'system', label: 'System' }
	];

	// Which palette a card should preview, following the active mode.
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

<div class="settings">
	<header class="page-head">
		<a class="back" href="/" aria-label="Back to home">←</a>
		<h1>Settings</h1>
	</header>

	<section class="card">
		<h2>Appearance</h2>
		<p class="hint">Choose a theme and how it follows light or dark mode.</p>

		<div class="field">
			<span class="field-label">Mode</span>
			<div class="modes">
				{#each MODES as m (m.id)}
					<button class:selected={themeState.mode === m.id} onclick={() => themeStore.setMode(m.id)}>
						{m.label}
					</button>
				{/each}
			</div>
		</div>

		<div class="field">
			<div class="field-row">
				<span class="field-label">Themes</span>
				<button class="create" onclick={create}>+ Create theme</button>
			</div>

			<div class="theme-grid">
				{#each themes as t (t.id)}
					{@const palette = isDarkNow(themeState.mode) ? t.dark : t.light}
					<div class="theme-card" class:active={active.id === t.id}>
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
							<span class="theme-name">
								{t.name}
								{#if active.id === t.id}<span class="badge">Active</span>{/if}
							</span>
						</button>
						<div class="card-actions">
							<button class="link" onclick={() => edit(t)}>
								{t.builtIn ? 'Duplicate' : 'Edit'}
							</button>
							{#if !t.builtIn}
								<button class="link danger" onclick={() => themeStore.deleteTheme(t.id)}>Delete</button>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>
	</section>
</div>

<style>
	.settings {
		max-width: 48rem;
		margin: 0 auto;
		padding: 1.5rem 1rem 4rem;
		color: var(--color-text-main);
	}
	.page-head {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1.5rem;
	}
	.back {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.25rem;
		height: 2.25rem;
		border-radius: 9999px;
		border: 1px solid var(--color-border);
		color: var(--color-text-secondary);
		text-decoration: none;
		font-size: 1.1rem;
	}
	.back:hover {
		background: var(--color-bg-secondary);
		color: var(--color-text-main);
	}
	h1 {
		font-size: 1.5rem;
		font-weight: 700;
		margin: 0;
	}
	.card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border);
		border-radius: 12px;
		padding: 1.5rem;
	}
	h2 {
		font-size: 1.1rem;
		font-weight: 600;
		margin: 0 0 0.25rem;
	}
	.hint {
		color: var(--color-text-secondary);
		font-size: 0.9rem;
		margin: 0 0 1.25rem;
	}
	.field {
		margin-bottom: 1.5rem;
	}
	.field:last-child {
		margin-bottom: 0;
	}
	.field-label {
		display: block;
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		color: var(--color-text-muted);
		margin-bottom: 0.5rem;
	}
	.field-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.5rem;
	}
	.modes {
		display: flex;
		gap: 0.5rem;
		max-width: 22rem;
	}
	.modes button {
		flex: 1;
		padding: 0.55rem;
		border-radius: 8px;
		border: 1px solid var(--color-border);
		background: transparent;
		color: var(--color-text-secondary);
		cursor: pointer;
	}
	.modes button.selected {
		background: var(--color-primary);
		color: #fff;
		border-color: var(--color-primary);
	}
	.create {
		padding: 0.4rem 0.8rem;
		border-radius: 8px;
		border: 1px dashed var(--color-border);
		background: transparent;
		color: var(--color-text-secondary);
		cursor: pointer;
		font-size: 0.85rem;
	}
	.create:hover {
		color: var(--color-primary);
		border-color: var(--color-primary);
	}
	.theme-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(13rem, 1fr));
		gap: 0.75rem;
	}
	.theme-card {
		border: 1px solid var(--color-border);
		border-radius: 10px;
		overflow: hidden;
		background: var(--color-bg-main);
	}
	.theme-card.active {
		border-color: var(--color-primary);
	}
	.select {
		display: block;
		width: 100%;
		text-align: left;
		background: transparent;
		border: 0;
		padding: 0.75rem;
		cursor: pointer;
	}
	.swatches {
		display: flex;
		gap: 4px;
		margin-bottom: 0.6rem;
	}
	.swatch {
		width: 1.4rem;
		height: 1.4rem;
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
		padding: 0.05rem 0.4rem;
	}
	.card-actions {
		display: flex;
		gap: 0.5rem;
		padding: 0 0.75rem 0.75rem;
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
</style>
