<script lang="ts">
  import { onDestroy } from 'svelte';
  import { onMount } from 'svelte';
  import { currentPageIndex, viewSettings } from '../store/session.js';
  import type { ComicBook } from '../../types/comic.js';
  import FilterButton from './FilterButton.svelte';
  import FilterEditor from './FilterEditor.svelte';
  import CanvasViewer from './CanvasViewer.svelte';
  import ScrollViewer from './ScrollViewer.svelte';
  import { premadeFilters, customFilterStore } from '$lib/store/filterStore';
  import type { FilterConfig } from '$lib/store/filterStore';
  import { configValidator } from '$lib/services/configValidator';
  import { comicStorage } from '$lib/storage/comicStorage';
  import { logger } from '$lib/services/logger';

  const UI_HIDE_DELAY = 2200;
  const MAX_ZOOM = 5;
  const MIN_ZOOM = 0.1;

  export let comic: ComicBook;
  export let onExtractPage: (index: number) => Promise<Blob>;
  export let onExit: (() => Promise<void> | void) | undefined = undefined;

  let isExiting = false;
  let isUiVisible = true;
  let hideUiTimer: ReturnType<typeof setTimeout> | null = null;
  let canvasViewerRef: CanvasViewer;

  // Active numeric filter config for this comic (null = no filter)
  let customFilterConfig: FilterConfig | null = null;
  let isEditorOpen = false;
  let editorInitial: FilterConfig | null = null;
  let previewBlob: Blob | null = null;

  async function handleExit() {
    if (!onExit || isExiting) return;
    isExiting = true;
    try {
      await onExit();
    } finally {
      isExiting = false;
    }
  }

  // Scroll mode keeps UI always visible
  $: if ($viewSettings.readingMode === 'vertical') {
    isUiVisible = true;
    if (hideUiTimer) {
      clearTimeout(hideUiTimer);
      hideUiTimer = null;
    }
  }

  function showUi(autoHide: boolean) {
    isUiVisible = true;
    if (hideUiTimer) {
      clearTimeout(hideUiTimer);
      hideUiTimer = null;
    }
    if (autoHide && $viewSettings.readingMode === 'horizontal') {
      hideUiTimer = setTimeout(() => {
        isUiVisible = false;
        hideUiTimer = null;
      }, UI_HIDE_DELAY);
    }
  }

  function hideUi() {
    if ($viewSettings.readingMode === 'vertical') return;
    if (hideUiTimer) {
      clearTimeout(hideUiTimer);
      hideUiTimer = null;
    }
    isUiVisible = false;
  }

  async function loadCustomFilter() {
    try {
      const filter = await comicStorage.loadFilterConfig(comic.id);
      if (filter) {
        // Validate before applying
        const validation = configValidator.validate(filter);
        if (validation.valid) {
          customFilterConfig = filter;
          logger.info('ReaderShell', `Loaded filter: ${filter.name}`);
        } else {
          logger.warn('ReaderShell', `Invalid stored filter: ${validation.errors.join(', ')}`);
        }
      }
    } catch (error) {
      logger.error('ReaderShell', 'Failed to load filter', error);
    }
  }

  // Single entry point for selecting a built-in filter, applying a custom one,
  // or clearing (config === null). Persists the choice on the comic record.
  async function applyFilterConfig(config: FilterConfig | null) {
    try {
      if (config) {
        const validation = configValidator.validate(config);
        if (!validation.valid) {
          logger.error('ReaderShell', `Invalid filter config: ${validation.errors.join(', ')}`);
          return;
        }
      }

      await comicStorage.saveFilterConfig(comic.id, config);
      customFilterConfig = config;
      logger.info('ReaderShell', config ? `Applied filter: ${config.name}` : 'Cleared filter');
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

  // Grab the current page as a preview source, then open the editor.
  async function openEditorWith(config: FilterConfig | null) {
    try {
      previewBlob = await onExtractPage($currentPageIndex);
    } catch {
      previewBlob = null;
    }
    editorInitial = config;
    isEditorOpen = true;
  }

  function handleEditorToggle() {
    if (isEditorOpen) {
      isEditorOpen = false;
    } else {
      const active = customFilterConfig?.id.startsWith('custom-')
        ? customFilterConfig
        : null;
      openEditorWith(active);
    }
  }

  function handleApplyFilterEvent(event: Event) {
    const detail = (event as CustomEvent).detail as { filterId?: string } | undefined;
    const id = detail?.filterId;
    if (!id || id === 'none') {
      applyFilterConfig(null);
      return;
    }
    const filter = premadeFilters.find((f) => f.id === id);
    if (filter) applyFilterConfig(structuredClone(filter));
  }

  function goToPrevPage() {
    if ($currentPageIndex > 0) {
      currentPageIndex.set($currentPageIndex - 1);
    }
  }

  function goToNextPage() {
    if ($currentPageIndex < comic.totalPages - 1) {
      currentPageIndex.set($currentPageIndex + 1);
    }
  }

  function adjustZoom(factor: number) {
    viewSettings.update((s) => ({
      ...s,
      zoomLevel: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, s.zoomLevel * factor))
    }));
  }

  function resetZoom() {
    viewSettings.update((s) => ({ ...s, zoomLevel: 1 }));
  }

  function reapplyFit() {
    canvasViewerRef?.triggerFitApply();
  }

  function switchMode() {
    viewSettings.update((s) => ({
      ...s,
      readingMode: s.readingMode === 'vertical' ? 'horizontal' : 'vertical'
    }));
  }

  onMount(async () => {
    window.addEventListener('filter-editor-toggle', handleEditorToggle);
    window.addEventListener('apply-filter', handleApplyFilterEvent);
    await customFilterStore.init();
    await loadCustomFilter();
  });

  onDestroy(() => {
    window.removeEventListener('filter-editor-toggle', handleEditorToggle);
    window.removeEventListener('apply-filter', handleApplyFilterEvent);
    if (hideUiTimer) {
      clearTimeout(hideUiTimer);
      hideUiTimer = null;
    }
  });
</script>

<div class="reader-shell">
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

	<div class="overlay-top" class:hidden={!isUiVisible}>
		{#if onExit}
			<button class="back-button" on:click={handleExit} disabled={isExiting} aria-label="Go back">
				<span class="arrow">←</span>
				<span>{isExiting ? 'Saving…' : 'Back'}</span>
			</button>
		{/if}

		<div class="header">
			<div class="title-block">
				<h2>{comic.title}</h2>
				<div class="page-info">Page {$currentPageIndex + 1} of {comic.totalPages}</div>
			</div>

			<div class="controls">
				<button
					on:click={goToPrevPage}
					disabled={$currentPageIndex <= 0}
					aria-label="Previous page">←</button
				>

				<div class="zoom-controls">
					<button on:click={() => adjustZoom(0.9)} aria-label="Zoom out">−</button>
					<span class="zoom-level">{Math.round($viewSettings.zoomLevel * 100)}%</span>
					<button on:click={() => adjustZoom(1.1)} aria-label="Zoom in">+</button>
					<button on:click={resetZoom} aria-label="Reset zoom">⌂</button>
					<button on:click={reapplyFit} aria-label="Apply fit mode">⟳</button>
				</div>

				<select bind:value={$viewSettings.fitMode} aria-label="View mode">
					<option value="fit-width">Fit Width</option>
					<option value="fit-height">Fit Height</option>
					<option value="original">Original Size</option>
				</select>

				<button on:click={switchMode} aria-label="Switch reading mode" class="mode-toggle">
					{$viewSettings.readingMode === 'vertical' ? '⇄ Page Mode' : '↕ Scroll'}
				</button>

				<button
					on:click={goToNextPage}
					disabled={$currentPageIndex >= comic.totalPages - 1}
					aria-label="Next page">Next →</button
				>
			</div>
		</div>
	</div>

	{#if $viewSettings.readingMode === 'vertical'}
		<ScrollViewer {comic} {onExtractPage} onShowUi={showUi} {customFilterConfig} />
	{:else}
		<CanvasViewer
		  bind:this={canvasViewerRef}
		  {comic}
		  {onExtractPage}
		  isUiVisible={isUiVisible}
		  onShowUi={showUi}
		  onHideUi={hideUi}
		  customFilterConfig={customFilterConfig}
		/>
	{/if}
</div>

<style>
	.reader-shell {
		position: relative;
		height: 100vh;
		width: 100vw;
		background: var(--color-bg-main);
		color: var(--color-text-main);
		overflow: hidden;
	}

	.overlay-top {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		z-index: 10;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 1.5rem;
		background: linear-gradient(180deg, color-mix(in srgb, var(--color-bg-main) 85%, transparent) 0%, transparent 100%);
		gap: 1rem;
		pointer-events: none;
		transition: opacity 0.25s ease;
		opacity: 1;
	}

	.overlay-top > * {
		pointer-events: auto;
	}

	.overlay-top.hidden {
		opacity: 0;
	}

	.overlay-top.hidden,
	.overlay-top.hidden * {
		pointer-events: none !important;
	}

	.back-button {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1.25rem;
		background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%);
		color: #fff;
		border: none;
		border-radius: 999px;
		font-weight: 600;
		letter-spacing: 0.02em;
		cursor: pointer;
		box-shadow: 0 6px 18px color-mix(in srgb, var(--color-primary) 35%, transparent);
		transition:
			transform 0.2s ease,
			box-shadow 0.2s ease,
			opacity 0.2s ease;
	}

	.back-button .arrow {
		font-size: 1.1rem;
		line-height: 1;
	}

	.back-button:not(:disabled):hover {
		transform: translateY(-1px);
		box-shadow: 0 10px 24px color-mix(in srgb, var(--color-primary) 45%, transparent);
	}

	.back-button:disabled {
		opacity: 0.7;
		cursor: progress;
		box-shadow: none;
	}

	.header {
		display: flex;
		align-items: center;
		gap: 1.5rem;
		width: 100%;
		justify-content: space-between;
	}

	.title-block {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		min-width: 0;
	}

	.title-block h2 {
		margin: 0;
		font-size: 1.1rem;
		font-weight: 600;
		color: var(--color-primary-hover);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.page-info {
		font-size: 0.9rem;
		color: var(--color-text-secondary);
	}

	.controls {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.controls button {
		padding: 0.5rem 1rem;
		background: var(--color-border);
		color: var(--color-text-main);
		border: 1px solid var(--color-border);
		border-radius: 6px;
		cursor: pointer;
		transition:
			background 0.2s ease,
			border-color 0.2s ease,
			transform 0.2s ease;
	}

	.controls button:hover:not(:disabled) {
		background: var(--color-bg-secondary);
		border-color: var(--color-border);
		transform: translateY(-1px);
	}

	.controls button:disabled {
		opacity: 0.4;
		cursor: not-allowed;
		transform: none;
	}

	.controls select {
		padding: 0.5rem;
		background: var(--color-border);
		color: var(--color-text-main);
		border: 1px solid var(--color-border);
		border-radius: 6px;
	}

	.zoom-controls {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		background: var(--color-bg-secondary);
		border-radius: 8px;
		border: 1px solid var(--color-border);
		padding: 0.25rem;
		box-shadow: inset 0 0 12px color-mix(in srgb, var(--color-text-main) 5%, transparent);
	}

	.zoom-level {
		color: var(--color-primary-hover);
		font-size: 0.85rem;
		font-weight: 600;
		min-width: 50px;
		text-align: center;
	}

	.mode-toggle {
		white-space: nowrap;
	}

	@media (max-width: 768px) {
		.controls {
			gap: 0.6rem;
		}

		.controls button {
			padding: 0.45rem 0.75rem;
		}

		.zoom-controls {
			display: none;
		}
	}
</style>
