<script lang="ts">
	import { onDestroy } from 'svelte';
	import { currentPageIndex, viewSettings } from '../store/session.js';
	import type { ComicBook } from '../../types/comic.js';
	import FilterButton from './FilterButton.svelte';
	import CanvasViewer from './CanvasViewer.svelte';
	import ScrollViewer from './ScrollViewer.svelte';

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

	async function handleExit() {
		if (!onExit || isExiting) return;
		isExiting = true;
		try {
			await onExit();
		} finally {
			isExiting = false;
		}
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

	onDestroy(() => {
		if (hideUiTimer) {
			clearTimeout(hideUiTimer);
			hideUiTimer = null;
		}
	});
</script>

<div class="reader-shell">
	<FilterButton {comic} />

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
		<ScrollViewer {comic} {onExtractPage} onShowUi={showUi} />
	{:else}
		<CanvasViewer
			bind:this={canvasViewerRef}
			{comic}
			{onExtractPage}
			isUiVisible={isUiVisible}
			onShowUi={showUi}
			onHideUi={hideUi}
		/>
	{/if}
</div>

<style>
	.reader-shell {
		position: relative;
		height: 100vh;
		width: 100vw;
		background: #000;
		color: #f5f5f5;
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
		background: linear-gradient(180deg, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0) 100%);
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
		background: linear-gradient(135deg, #ff6600 0%, #ff8533 100%);
		color: #fff;
		border: none;
		border-radius: 999px;
		font-weight: 600;
		letter-spacing: 0.02em;
		cursor: pointer;
		box-shadow: 0 6px 18px rgba(255, 102, 0, 0.35);
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
		box-shadow: 0 10px 24px rgba(255, 102, 0, 0.45);
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
		color: #ff8533;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.page-info {
		font-size: 0.9rem;
		color: #d1d1d1;
	}

	.controls {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.controls button {
		padding: 0.5rem 1rem;
		background: #1f1f1f;
		color: #f5f5f5;
		border: 1px solid #2f2f2f;
		border-radius: 6px;
		cursor: pointer;
		transition:
			background 0.2s ease,
			border-color 0.2s ease,
			transform 0.2s ease;
	}

	.controls button:hover:not(:disabled) {
		background: #292929;
		border-color: #3a3a3a;
		transform: translateY(-1px);
	}

	.controls button:disabled {
		opacity: 0.4;
		cursor: not-allowed;
		transform: none;
	}

	.controls select {
		padding: 0.5rem;
		background: #1f1f1f;
		color: #f5f5f5;
		border: 1px solid #2f2f2f;
		border-radius: 6px;
	}

	.zoom-controls {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		background: #151515;
		border-radius: 8px;
		border: 1px solid #1f1f1f;
		padding: 0.25rem;
		box-shadow: inset 0 0 12px rgba(255, 255, 255, 0.05);
	}

	.zoom-level {
		color: #ff8533;
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
