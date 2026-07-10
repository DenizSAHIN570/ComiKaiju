<script lang="ts">
	import { themeStore, getActiveTheme } from '$lib/theme/themeStore';
	import { PRESETS, type Theme, type ThemeMode } from '$lib/theme/themeSchema';

	export let onEdit: (theme: Theme | null) => void = () => {};

	let open = false;
	$: state = $themeStore;
	$: active = getActiveTheme(state);

	const MODES: { id: ThemeMode; label: string }[] = [
		{ id: 'light', label: 'Light' },
		{ id: 'dark', label: 'Dark' },
		{ id: 'system', label: 'System' }
	];
</script>

<div class="theme-menu">
	<button class="trigger" on:click={() => (open = !open)} aria-label="Theme settings" title="Theme">
		<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<circle cx="12" cy="12" r="9" stroke-width="2" />
			<path stroke-width="2" d="M12 3a9 9 0 000 18z" fill="currentColor" stroke="none" />
		</svg>
	</button>

	{#if open}
		<button class="scrim" on:click={() => (open = false)} aria-label="Close"></button>
		<div class="panel" role="menu">
			<div class="modes">
				{#each MODES as m (m.id)}
					<button class:selected={state.mode === m.id} on:click={() => themeStore.setMode(m.id)}>
						{m.label}
					</button>
				{/each}
			</div>

			<div class="section-label">Presets</div>
			{#each PRESETS as t (t.id)}
				<div class="row" class:active={active.id === t.id}>
					<button class="name" on:click={() => themeStore.setActiveTheme(t.id)}>{t.name}</button>
					<button class="icon" title="Duplicate & edit" on:click={() => { onEdit(t); open = false; }}>✎</button>
				</div>
			{/each}

			{#if state.userThemes.length}
				<div class="section-label">My Themes</div>
				{#each state.userThemes as t (t.id)}
					<div class="row" class:active={active.id === t.id}>
						<button class="name" on:click={() => themeStore.setActiveTheme(t.id)}>{t.name}</button>
						<button class="icon" title="Edit" on:click={() => { onEdit(t); open = false; }}>✎</button>
						<button class="icon" title="Delete" on:click={() => themeStore.deleteTheme(t.id)}>🗑</button>
					</div>
				{/each}
			{/if}

			<button class="create" on:click={() => { onEdit(null); open = false; }}>+ Create theme</button>
		</div>
	{/if}
</div>

<style>
	.theme-menu {
		position: relative;
		display: inline-flex;
	}
	.trigger {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.5rem;
		border-radius: 9999px;
		color: var(--color-text-secondary);
		background: transparent;
		border: 1px solid var(--color-border);
		cursor: pointer;
		transition: all 0.2s;
	}
	.trigger:hover {
		background: var(--color-bg-secondary);
		color: var(--color-text-main);
		border-color: var(--color-text-secondary);
	}
	.scrim {
		position: fixed;
		inset: 0;
		background: transparent;
		border: 0;
		z-index: 40;
	}
	.panel {
		position: absolute;
		right: 0;
		top: calc(100% + 0.5rem);
		z-index: 50;
		min-width: 15rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border);
		border-radius: 12px;
		padding: 0.5rem;
		box-shadow: 0 10px 30px color-mix(in srgb, #000 40%, transparent);
	}
	.modes {
		display: flex;
		gap: 0.25rem;
		margin-bottom: 0.5rem;
	}
	.modes button {
		flex: 1;
		padding: 0.35rem;
		border-radius: 6px;
		border: 1px solid var(--color-border);
		background: transparent;
		color: var(--color-text-secondary);
		cursor: pointer;
		font-size: 0.8rem;
	}
	.modes button.selected {
		background: var(--color-primary);
		color: #fff;
		border-color: var(--color-primary);
	}
	.section-label {
		font-size: 0.7rem;
		text-transform: uppercase;
		color: var(--color-text-muted);
		padding: 0.5rem 0.25rem 0.25rem;
	}
	.row {
		display: flex;
		align-items: center;
		border-radius: 6px;
	}
	.row.active {
		background: var(--color-bg-secondary);
	}
	.row .name {
		flex: 1;
		text-align: left;
		padding: 0.4rem 0.5rem;
		background: transparent;
		border: 0;
		color: var(--color-text-main);
		cursor: pointer;
	}
	.row.active .name {
		color: var(--color-primary);
	}
	.icon {
		padding: 0.4rem;
		background: transparent;
		border: 0;
		cursor: pointer;
		color: var(--color-text-secondary);
	}
	.create {
		width: 100%;
		margin-top: 0.5rem;
		padding: 0.5rem;
		border-radius: 6px;
		border: 1px dashed var(--color-border);
		background: transparent;
		color: var(--color-text-secondary);
		cursor: pointer;
	}
	.create:hover {
		color: var(--color-primary);
		border-color: var(--color-primary);
	}
</style>
