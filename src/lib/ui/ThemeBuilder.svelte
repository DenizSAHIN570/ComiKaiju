<script lang="ts">
	import { themeStore } from '$lib/theme/themeStore';
	import { PRESETS, type Theme, type Palette, type FontId } from '$lib/theme/themeSchema';
	import { themeValidator } from '$lib/theme/themeValidator';

	export let open = false;
	export let initial: Theme | null = null;
	export let onClose: () => void = () => {};

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

	let draft: Theme | undefined;
	let editMode: 'light' | 'dark' = 'dark';
	let error = '';
	let fileInput: HTMLInputElement;

	// JSON clone: unwraps Svelte reactive proxies (structuredClone throws on them)
	// and is safe for the pure-data Theme shape (strings/booleans/nested objects).
	function cloneTheme(t: Theme): Theme {
		return JSON.parse(JSON.stringify(t));
	}

	function freshDraft(): Theme {
		const base = cloneTheme(PRESETS[0]);
		return { ...base, id: `custom-${crypto.randomUUID()}`, name: 'My Theme', builtIn: false };
	}

	// Seed the draft when opened.
	$: if (open && !draft) {
		draft = initial
			? {
					...cloneTheme(initial),
					id: initial.builtIn ? `custom-${crypto.randomUUID()}` : initial.id,
					name: initial.builtIn ? `${initial.name} Copy` : initial.name,
					builtIn: false
				}
			: freshDraft();
		error = '';
	}
	$: if (!open) draft = undefined;

	// Live preview on any draft / editMode change.
	$: if (open && draft) themeStore.preview(draft, editMode);

	const HEX = /^#[0-9a-fA-F]{6}$/;
	function setColor(key: keyof Palette, value: string) {
		if (!draft || !HEX.test(value)) return;
		draft = { ...draft, [editMode]: { ...draft[editMode], [key]: value } };
	}

	function cancel() {
		themeStore.restore();
		onClose();
	}
	function save() {
		if (!draft) return;
		const r = themeValidator.validate(draft);
		if (!r.valid) {
			error = r.errors[0];
			return;
		}
		themeStore.saveTheme(draft);
		onClose();
	}
	function del() {
		if (!draft) return;
		themeStore.deleteTheme(draft.id);
		onClose();
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
	async function importFile(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		try {
			const parsed = JSON.parse(await file.text());
			const r = themeValidator.validate({ ...parsed, id: 'tmp', builtIn: false });
			if (!r.valid) {
				error = `Import failed: ${r.errors[0]}`;
				return;
			}
			draft = { ...parsed, id: `custom-${crypto.randomUUID()}`, builtIn: false };
			error = '';
		} catch {
			error = 'Import failed: not valid JSON';
		}
	}
</script>

{#if open && draft}
	<div class="overlay" role="dialog" aria-modal="true">
		<div class="modal">
			<header>
				<input class="title" bind:value={draft.name} maxlength="60" placeholder="Theme name" />
				<button class="close" on:click={cancel} aria-label="Close">✕</button>
			</header>

			<div class="tabs">
				<button class:sel={editMode === 'light'} on:click={() => (editMode = 'light')}>Light</button>
				<button class:sel={editMode === 'dark'} on:click={() => (editMode = 'dark')}>Dark</button>
			</div>

			<div class="body">
				{#each GROUPS as g (g.title)}
					<div class="group">
						<div class="group-title">{g.title}</div>
						{#each g.keys as key (key)}
							<label class="picker">
								<span>{LABELS[key]}</span>
								<input
									type="color"
									value={draft[editMode][key]}
									on:input={(e) => setColor(key, e.currentTarget.value)}
								/>
								<input
									class="hex"
									value={draft[editMode][key]}
									on:change={(e) => setColor(key, e.currentTarget.value)}
									maxlength="7"
								/>
							</label>
						{/each}
					</div>
				{/each}

				<div class="group">
					<div class="group-title">Font</div>
					<select bind:value={draft.font}>
						{#each FONTS as f (f.id)}
							<option value={f.id}>{f.label}</option>
						{/each}
					</select>
				</div>
			</div>

			{#if error}<p class="error">{error}</p>{/if}

			<footer>
				<button class="secondary" on:click={() => fileInput.click()}>Import</button>
				<input
					type="file"
					accept="application/json"
					bind:this={fileInput}
					on:change={importFile}
					hidden
				/>
				<button class="secondary" on:click={exportTheme}>Export</button>
				{#if initial && !initial.builtIn}
					<button class="danger" on:click={del}>Delete</button>
				{/if}
				<span class="spacer"></span>
				<button class="secondary" on:click={cancel}>Cancel</button>
				<button class="primary" on:click={save}>Save</button>
			</footer>
		</div>
	</div>
{/if}

<style>
	.overlay {
		position: fixed;
		inset: 0;
		z-index: 60;
		display: flex;
		align-items: center;
		justify-content: center;
		background: color-mix(in srgb, #000 60%, transparent);
		padding: 1rem;
	}
	.modal {
		width: 100%;
		max-width: 32rem;
		max-height: 90vh;
		overflow-y: auto;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border);
		border-radius: 12px;
		color: var(--color-text-main);
	}
	header {
		display: flex;
		gap: 0.5rem;
		padding: 1rem;
		border-bottom: 1px solid var(--color-border);
	}
	.title {
		flex: 1;
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border);
		border-radius: 6px;
		padding: 0.5rem;
		color: var(--color-text-main);
		font-size: 1rem;
	}
	.close {
		background: transparent;
		border: 0;
		color: var(--color-text-secondary);
		cursor: pointer;
		font-size: 1rem;
	}
	.tabs {
		display: flex;
		gap: 0.25rem;
		padding: 0.75rem 1rem 0;
	}
	.tabs button {
		flex: 1;
		padding: 0.5rem;
		background: transparent;
		border: 1px solid var(--color-border);
		border-radius: 6px;
		color: var(--color-text-secondary);
		cursor: pointer;
	}
	.tabs button.sel {
		background: var(--color-primary);
		color: #fff;
		border-color: var(--color-primary);
	}
	.body {
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
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
		font-family: var(--font-base);
	}
	select {
		width: 100%;
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border);
		border-radius: 6px;
		padding: 0.5rem;
		color: var(--color-text-main);
	}
	.error {
		color: var(--color-status-error);
		padding: 0 1rem;
		margin: 0;
		font-size: 0.85rem;
	}
	footer {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		padding: 1rem;
		border-top: 1px solid var(--color-border);
	}
	.spacer {
		flex: 1;
	}
	footer button {
		padding: 0.5rem 0.9rem;
		border-radius: 6px;
		cursor: pointer;
		border: 1px solid var(--color-border);
	}
	.secondary {
		background: transparent;
		color: var(--color-text-secondary);
	}
	.danger {
		background: transparent;
		color: var(--color-status-error);
		border-color: var(--color-status-error);
	}
	.primary {
		background: var(--color-primary);
		color: #fff;
		border-color: var(--color-primary);
	}
</style>
