<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { currentPageIndex, viewSettings, setPage } from '../store/session.js';
	import type { ComicBook } from '../../types/comic.js';
	import type { FilterConfig } from '$lib/store/filterStore';
	import { FilterEngine } from '$lib/services/filterEngine.js';
	import { logger } from '$lib/services/logger';

	const MIN_ZOOM = 0.5;
	const MAX_ZOOM = 4;
	const filterEngine = new FilterEngine();

	export let comic: ComicBook;
	export let onExtractPage: (index: number) => Promise<Blob>;
	export const onShowUi: (autoHide: boolean) => void = () => {};
	export let customFilterConfig: FilterConfig | null = null;

	let container: HTMLDivElement;

	let pageUrls: (string | null | 'loading' | 'error')[] = Array(comic.totalPages).fill(null);
	// Cached raw page blobs so the filter can be (re)applied without re-extracting.
	let rawBlobs: (Blob | undefined)[] = Array(comic.totalPages).fill(undefined);

	let lazyObserver: IntersectionObserver;
	let progressObserver: IntersectionObserver;

	// fit-height / original pages can exceed the viewport width, so allow
	// horizontal scroll for them (and whenever zoomed past 1).
	$: overflowX =
		$viewSettings.zoomLevel > 1 || $viewSettings.fitMode !== 'fit-width'
			? 'auto'
			: 'hidden';

	// Per-page image sizing for the webtoon viewer, mirroring the page-mode fit
	// options: fit-width fills the container width, fit-height sizes each page to
	// one viewport height, original is native pixels — all scaled by zoom.
	$: imgStyle = (() => {
		const z = $viewSettings.zoomLevel;
		switch ($viewSettings.fitMode) {
			case 'fit-height':
				return `height:${z * 100}vh;width:auto;max-width:none;`;
			case 'original':
				return `width:auto;height:auto;max-width:none;zoom:${z};`;
			default:
				return `width:${z * 100}%;height:auto;`;
		}
	})();

	// Re-render already-loaded pages when the active filter changes.
	$: if (customFilterConfig !== undefined) applyFilterToLoaded();

	// Pinch-to-zoom state
	const pinchPointers = new Map<number, { x: number; y: number }>();
	let isPinching = false;
	let pinchStartDistance = 0;
	let pinchStartZoom = 1;

	function scrollToPage(index: number, behavior: ScrollBehavior = 'smooth') {
		const el = container.querySelector(`[data-index="${index}"]`);
		el?.scrollIntoView({ behavior, block: 'start' });
	}

	async function loadPage(index: number) {
		if (pageUrls[index] !== null && pageUrls[index] !== 'error') return;

		pageUrls[index] = 'loading';
		pageUrls = pageUrls;

		try {
			const blob = await onExtractPage(index);
			rawBlobs[index] = blob;
			pageUrls[index] = await renderPage(blob);
			pageUrls = pageUrls;
		} catch (err) {
			logger.error('ScrollViewer', `Failed to load page ${index}`, err);
			pageUrls[index] = 'error';
			pageUrls = pageUrls;
		}
	}

	// Produce the display URL for a page blob, applying the active filter (via an
	// offscreen canvas) when one is set. Falls back to the raw blob on any failure.
	async function renderPage(blob: Blob): Promise<string> {
		if (!customFilterConfig) {
			return URL.createObjectURL(blob);
		}

		try {
			const bitmap = await createImageBitmap(blob);
			const canvas = document.createElement('canvas');
			canvas.width = bitmap.width;
			canvas.height = bitmap.height;
			const ctx = canvas.getContext('2d', { willReadFrequently: true });
			if (!ctx) {
				bitmap.close();
				return URL.createObjectURL(blob);
			}
			ctx.drawImage(bitmap, 0, 0);
			bitmap.close();
			filterEngine.applyFilter(ctx, customFilterConfig);
			const filtered = await new Promise<Blob | null>((resolve) =>
				canvas.toBlob(resolve, 'image/jpeg', 0.92)
			);
			return URL.createObjectURL(filtered ?? blob);
		} catch (err) {
			logger.error('ScrollViewer', 'Failed to apply filter to page', err);
			return URL.createObjectURL(blob);
		}
	}

	// Rebuild display URLs for all loaded pages after a filter change, revoking
	// the previous URLs so nothing leaks.
	async function applyFilterToLoaded() {
		for (let i = 0; i < rawBlobs.length; i++) {
			const raw = rawBlobs[i];
			if (!raw) continue;

			const previous = pageUrls[i];
			const next = await renderPage(raw);
			if (typeof previous === 'string' && previous !== 'loading' && previous !== 'error') {
				URL.revokeObjectURL(previous);
			}
			pageUrls[i] = next;
			pageUrls = pageUrls;
		}
	}

	const SCROLL_SPEED = 8;
	let scrollDirection: 'up' | 'down' | null = null;
	let scrollRafId: number | null = null;

	function scrollLoop() {
		if (!scrollDirection) return;
		container.scrollBy({ top: scrollDirection === 'down' ? SCROLL_SPEED : -SCROLL_SPEED });
		scrollRafId = requestAnimationFrame(scrollLoop);
	}

	function startScroll(direction: 'up' | 'down') {
		if (scrollDirection === direction) return;
		scrollDirection = direction;
		if (!scrollRafId) scrollRafId = requestAnimationFrame(scrollLoop);
	}

	function stopScroll() {
		scrollDirection = null;
		if (scrollRafId !== null) {
			cancelAnimationFrame(scrollRafId);
			scrollRafId = null;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		switch (event.key) {
			case 'ArrowUp':
				event.preventDefault();
				startScroll('up');
				break;
			case 'ArrowDown':
			case ' ':
				event.preventDefault();
				startScroll('down');
				break;
			case 'Home':
				event.preventDefault();
				stopScroll();
				container.scrollTo({ top: 0, behavior: 'smooth' });
				break;
			case 'End':
				event.preventDefault();
				stopScroll();
				container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
				break;
			case '+':
			case '=':
				viewSettings.update(s => ({ ...s, zoomLevel: Math.min(MAX_ZOOM, s.zoomLevel * 1.2) }));
				break;
			case '-':
				viewSettings.update(s => ({ ...s, zoomLevel: Math.max(MIN_ZOOM, s.zoomLevel / 1.2) }));
				break;
			case '0':
				viewSettings.update(s => ({ ...s, zoomLevel: 1 }));
				break;
		}
	}

	function handleKeyup(event: KeyboardEvent) {
		if (event.key === 'ArrowUp' || event.key === 'ArrowDown' || event.key === ' ') {
			stopScroll();
		}
	}

	function handleWheel(event: WheelEvent) {
		if (event.ctrlKey || event.metaKey) {
			event.preventDefault();
			const factor = event.deltaY > 0 ? 0.9 : 1.1;
			viewSettings.update(s => ({
				...s,
				zoomLevel: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, s.zoomLevel * factor))
			}));
		}
	}

	function handlePointerDown(event: PointerEvent) {
		pinchPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
		if (pinchPointers.size === 2) {
			const pts = Array.from(pinchPointers.values());
			pinchStartDistance = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
			pinchStartZoom = $viewSettings.zoomLevel;
			isPinching = true;
		}
	}

	function handlePointerMove(event: PointerEvent) {
		if (!pinchPointers.has(event.pointerId)) return;
		pinchPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
		if (!isPinching || pinchPointers.size < 2) return;
		const pts = Array.from(pinchPointers.values());
		const newDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
		if (pinchStartDistance === 0) { pinchStartDistance = newDist; return; }
		const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, pinchStartZoom * (newDist / pinchStartDistance)));
		viewSettings.update(s => ({ ...s, zoomLevel: newZoom }));
	}

	function handlePointerUp(event: PointerEvent) {
		pinchPointers.delete(event.pointerId);
		if (pinchPointers.size < 2) {
			isPinching = false;
			pinchStartDistance = 0;
		}
	}

	onMount(() => {
		const ratioMap = new Map<number, number>();

		lazyObserver = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						const el = entry.target as HTMLElement;
						const index = parseInt(el.dataset.index ?? '-1', 10);
						if (index >= 0) {
							loadPage(index);
						}
					}
				}
			},
			{ rootMargin: '1500px' }
		);

		progressObserver = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					const el = entry.target as HTMLElement;
					const index = parseInt(el.dataset.index ?? '-1', 10);
					if (index >= 0) {
						ratioMap.set(index, entry.intersectionRatio);
					}
				}

				let bestIndex = -1;
				let bestRatio = -1;
				for (const [index, ratio] of ratioMap) {
					if (ratio > bestRatio) {
						bestRatio = ratio;
						bestIndex = index;
					}
				}

				if (bestIndex >= 0) {
					setPage(bestIndex);
				}
			},
			{ threshold: [0, 0.5, 1] }
		);

		container.querySelectorAll<HTMLElement>('[data-index]').forEach((el) => {
			lazyObserver.observe(el);
			progressObserver.observe(el);
		});

		window.addEventListener('keydown', handleKeydown);
		window.addEventListener('keyup', handleKeyup);
		container.addEventListener('wheel', handleWheel, { passive: false });

		container.addEventListener('pointerdown', handlePointerDown);
		container.addEventListener('pointermove', handlePointerMove);
		container.addEventListener('pointerup', handlePointerUp);
		container.addEventListener('pointercancel', handlePointerUp);

		scrollToPage($currentPageIndex, 'auto');
	});

	onDestroy(() => {
		lazyObserver?.disconnect();
		progressObserver?.disconnect();

		for (const url of pageUrls) {
			if (url && url !== 'loading' && url !== 'error') {
				URL.revokeObjectURL(url);
			}
		}

		stopScroll();
		window.removeEventListener('keydown', handleKeydown);
		window.removeEventListener('keyup', handleKeyup);
		container?.removeEventListener('wheel', handleWheel);

		container?.removeEventListener('pointerdown', handlePointerDown);
		container?.removeEventListener('pointermove', handlePointerMove);
		container?.removeEventListener('pointerup', handlePointerUp);
		container?.removeEventListener('pointercancel', handlePointerUp);
	});
</script>

<div
	class="scroll-viewer"
	bind:this={container}
	style="overflow-x: {overflowX};"
>
	<div class="pages">
		{#each Array(comic.totalPages) as _, i}
			<div class="page-wrapper" data-index={i}>
				{#if pageUrls[i] && pageUrls[i] !== 'loading' && pageUrls[i] !== 'error'}
					<img src={pageUrls[i]} alt="Page {i + 1}" loading="eager" style={imgStyle} />
				{:else if pageUrls[i] === 'error'}
					<div class="page-placeholder error"><span>!</span></div>
				{:else}
					<div class="page-placeholder">
						{#if pageUrls[i] === 'loading'}
							<div class="loading-spinner"></div>
							<span>Loading page {i + 1}…</span>
						{:else}
							<span class="page-number">{i + 1}</span>
						{/if}
					</div>
				{/if}
			</div>
		{/each}
	</div>
</div>

<style>
	.scroll-viewer {
		overflow-y: auto;
		height: 100vh;
		width: 100vw;
		background: var(--color-bg-main);
		color: var(--color-text-main);
		position: relative;
		touch-action: pan-y;
	}

	.pages {
		width: 100%;
		margin: 0 auto;
	}

	.page-wrapper {
		width: 100%;
		display: flex;
		justify-content: center;
	}

	.page-wrapper img {
		display: block;
	}

	.page-placeholder {
		width: 100%;
		height: calc(90vw * 1.4);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background: var(--color-bg-secondary);
		color: var(--color-text-muted);
		gap: 0.75rem;
		border-bottom: 1px solid var(--color-border);
	}

	.page-placeholder.error {
		color: var(--color-status-error);
	}

	.page-number {
		font-size: 2rem;
		font-weight: 300;
		opacity: 0.4;
	}

	.loading-spinner {
		width: 36px;
		height: 36px;
		border: 4px solid color-mix(in srgb, var(--color-text-main) 15%, transparent);
		border-top-color: var(--color-primary);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}
</style>
