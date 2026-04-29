<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { get } from 'svelte/store';
	import { currentPageIndex, viewSettings } from '../store/session.js';
	import { filterStore, type Filter } from '$lib/store/filterStore';
	import type { ComicBook } from '../../types/comic.js';
	import { applyMonochrome } from '$lib/filters/monochrome';
	import { applyColorCorrection } from '$lib/filters/colorCorrection';
	import { applyVintage } from '$lib/filters/vintage';
	import { applyVibrant } from '$lib/filters/vibrant';
	import { logger } from '$lib/services/logger';

	const MAX_ZOOM = 5;
	const MIN_ZOOM = 0.1;

	export let comic: ComicBook;
	export let onExtractPage: (index: number) => Promise<Blob>;
	// Controls help-overlay visibility only; the shell owns its own overlay visibility state
	export let isUiVisible: boolean;
	export let onShowUi: (autoHide: boolean) => void;
	export let onHideUi: () => void;

	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D | null = null;

	let currentImage: HTMLImageElement | null = null;
	let currentImageUrl: string | null = null;

	let isImageLoading = false;
	let isUiPinned = false;

	let zoomLevel = 1;
	let panX = 0;
	let panY = 0;
	let isDragging = false;
	let lastPointerX = 0;
	let lastPointerY = 0;

	let ignoreNextTap = false;

	const activePointers = new Map<number, { x: number; y: number }>();
	let isPinching = false;
	let pinchStartDistance = 0;
	let pinchStartZoom = 1;

	let hasAppliedInitialView = false;
	let activeFilter: Filter = 'none';
	let prevFitMode = get(viewSettings).fitMode;

	$: if (comic && $currentPageIndex !== undefined) {
		loadCurrentPage();
	}

	$: if (comic && $filterStore[comic.id]) {
		activeFilter = $filterStore[comic.id];
		drawCurrentImage();
	}

	$: {
		const sv = $viewSettings.zoomLevel;
		if (sv !== zoomLevel && canvas) {
			updateZoom(sv, canvas.clientWidth / 2, canvas.clientHeight / 2);
		}
	}

	$: if ($viewSettings.fitMode !== prevFitMode && hasAppliedInitialView) {
		prevFitMode = $viewSettings.fitMode;
		applyViewMode();
	}

	onMount(() => {
		ctx = canvas.getContext('2d');
		loadCurrentPage();

		window.addEventListener('keydown', handleKeydown);
		canvas.addEventListener('pointerdown', handlePointerDown);
		canvas.addEventListener('pointermove', handlePointerMove);
		canvas.addEventListener('pointerup', handlePointerUp);
		canvas.addEventListener('pointercancel', handlePointerUp);
		canvas.addEventListener('wheel', handleWheel, { passive: false });

		onShowUi(true);
	});

	onDestroy(() => {
		window.removeEventListener('keydown', handleKeydown);
		canvas?.removeEventListener('pointerdown', handlePointerDown);
		canvas?.removeEventListener('pointermove', handlePointerMove);
		canvas?.removeEventListener('pointerup', handlePointerUp);
		canvas?.removeEventListener('pointercancel', handlePointerUp);
		canvas?.removeEventListener('wheel', handleWheel);

		activePointers.clear();

		if (currentImageUrl) {
			URL.revokeObjectURL(currentImageUrl);
			currentImageUrl = null;
		}
	});

	async function loadCurrentPage() {
		if (!comic || $currentPageIndex < 0 || $currentPageIndex >= comic.totalPages) return;

		isImageLoading = true;
		try {
			if (currentImageUrl) {
				URL.revokeObjectURL(currentImageUrl);
				currentImageUrl = null;
			}

			const blob = await onExtractPage($currentPageIndex);
			currentImageUrl = URL.createObjectURL(blob);

			const img = new Image();
			img.onload = () => {
				currentImage = img;
				if (!hasAppliedInitialView) {
					applyViewMode();
					hasAppliedInitialView = true;
				} else {
					clampPan();
					drawCurrentImage();
				}
				isImageLoading = false;
			};
			img.onerror = () => {
				logger.error('CanvasViewer', 'Failed to load image');
				isImageLoading = false;
			};
			img.src = currentImageUrl;
		} catch (error) {
			logger.error('CanvasViewer', 'Failed to extract page', error);
			isImageLoading = false;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		switch (event.key) {
			case 'ArrowLeft':
			case 'PageUp':
				goToPreviousPage();
				onHideUi();
				break;
			case 'ArrowRight':
			case 'PageDown':
			case ' ':
				event.preventDefault();
				goToNextPage();
				onHideUi();
				break;
			case 'Home':
				goToPage(0);
				break;
			case 'End':
				goToPage(comic.totalPages - 1);
				break;
			case '=':
			case '+':
				updateZoom(zoomLevel * 1.2, canvas.clientWidth / 2, canvas.clientHeight / 2);
				break;
			case '-':
				updateZoom(zoomLevel * 0.8, canvas.clientWidth / 2, canvas.clientHeight / 2);
				break;
			case '0':
				resetZoom();
				break;
		}
	}

	function handlePointerDown(event: PointerEvent) {
		if (!canvas) return;
		canvas.setPointerCapture(event.pointerId);
		activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

		if (activePointers.size === 2) {
			startPinch();
			ignoreNextTap = true;
			return;
		}

		if (event.button !== undefined && event.button !== 0) {
			return;
		}

		isDragging = true;
		lastPointerX = event.clientX;
		lastPointerY = event.clientY;
		ignoreNextTap = false;

		onShowUi(true);
	}

	function handlePointerMove(event: PointerEvent) {
		if (!canvas) return;
		if (!activePointers.has(event.pointerId)) return;

		activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

		if (isPinching && activePointers.size >= 2) {
			updatePinchZoom();
			return;
		}

		if (!isDragging) return;

		const deltaX = event.clientX - lastPointerX;
		const deltaY = event.clientY - lastPointerY;

		if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
			ignoreNextTap = true;
		}

		panX += deltaX;
		panY += deltaY;
		lastPointerX = event.clientX;
		lastPointerY = event.clientY;

		clampPan();
		drawCurrentImage();
	}

	function handlePointerUp(event: PointerEvent) {
		if (!canvas) return;
		if (canvas.hasPointerCapture(event.pointerId)) {
			canvas.releasePointerCapture(event.pointerId);
		}

		activePointers.delete(event.pointerId);

		if (activePointers.size < 2) {
			isPinching = false;
			pinchStartDistance = 0;
		}

		if (activePointers.size === 0) {
			isDragging = false;
		}
	}

	function handleWheel(event: WheelEvent) {
		event.preventDefault();
		onShowUi(true);

		if (event.ctrlKey || event.metaKey) {
			const factor = event.deltaY > 0 ? 0.9 : 1.1;
			updateZoom(zoomLevel * factor, event.clientX, event.clientY);
		} else {
			panX -= event.deltaX;
			panY -= event.deltaY;
			clampPan();
			drawCurrentImage();
		}
	}

	function handleTap(event: MouseEvent) {
		if (ignoreNextTap) {
			ignoreNextTap = false;
			return;
		}

		const target = event.currentTarget as HTMLElement | null;
		if (!target) return;

		const rect = target.getBoundingClientRect();
		const relativeX = event.clientX - rect.left;
		const leftZone = rect.width / 3;
		const rightZone = rect.width * (2 / 3);

		onShowUi(true);

		if (relativeX < leftZone) {
			goToPreviousPage();
			onHideUi();
			return;
		}

		if (relativeX > rightZone) {
			goToNextPage();
			onHideUi();
			return;
		}

		isUiPinned = !isUiPinned;
		if (isUiPinned) {
			onShowUi(false);
		} else {
			onHideUi();
		}
	}

	function handleContentKey(event: KeyboardEvent) {
		if (event.key !== 'Enter' && event.key !== ' ') return;
		event.preventDefault();
		// cast is safe: only clientX, clientY, currentTarget are used, which exist on both types
		handleTap(event as unknown as MouseEvent);
	}

	function goToPreviousPage() {
		if ($currentPageIndex > 0) {
			currentPageIndex.set($currentPageIndex - 1);
		}
	}

	function goToNextPage() {
		if ($currentPageIndex < comic.totalPages - 1) {
			currentPageIndex.set($currentPageIndex + 1);
		}
	}

	function goToPage(index: number) {
		if (index >= 0 && index < comic.totalPages) {
			currentPageIndex.set(index);
		}
	}

	export function triggerFitApply() {
		if (hasAppliedInitialView) applyViewMode();
	}

	function syncZoomToStore() {
		viewSettings.update((s) => ({ ...s, zoomLevel }));
	}

	function resetZoom() {
		zoomLevel = 1;
		panX = 0;
		panY = 0;
		clampPan();
		drawCurrentImage();
		syncZoomToStore();
	}

	function clampZoom(value: number) {
		return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
	}

	function applyViewMode() {
		if (!currentImage || !canvas) return;
		const rect = canvas.getBoundingClientRect();
		const widthScale = rect.width / currentImage.width;
		const heightScale = rect.height / currentImage.height;

		switch ($viewSettings.fitMode) {
			case 'fit-width':
				zoomLevel = widthScale;
				break;
			case 'fit-height':
				zoomLevel = heightScale;
				break;
			default:
				zoomLevel = 1;
		}

		zoomLevel = clampZoom(zoomLevel);
		panX = 0;
		panY = 0;
		clampPan();
		drawCurrentImage();
		syncZoomToStore();
	}

	function updateZoom(targetZoom: number, focusClientX: number, focusClientY: number) {
		if (!currentImage || !canvas) return;

		const rect = canvas.getBoundingClientRect();
		const prevZoom = zoomLevel;
		const newZoom = clampZoom(targetZoom);

		if (newZoom === prevZoom) return;

		const focusX = focusClientX - rect.left;
		const focusY = focusClientY - rect.top;

		const prevDrawWidth = currentImage.width * prevZoom;
		const prevDrawHeight = currentImage.height * prevZoom;

		const relX = prevDrawWidth ? (focusX - panX) / prevDrawWidth : 0.5;
		const relY = prevDrawHeight ? (focusY - panY) / prevDrawHeight : 0.5;

		zoomLevel = newZoom;

		const newDrawWidth = currentImage.width * zoomLevel;
		const newDrawHeight = currentImage.height * zoomLevel;

		panX = focusX - relX * newDrawWidth;
		panY = focusY - relY * newDrawHeight;

		clampPan();
		drawCurrentImage();
		syncZoomToStore();
	}

	function startPinch() {
		const points = Array.from(activePointers.values());
		if (points.length < 2) return;

		pinchStartDistance = distanceBetween(points[0], points[1]);
		pinchStartZoom = zoomLevel;
		isPinching = true;
		isDragging = false;
	}

	function updatePinchZoom() {
		const points = Array.from(activePointers.values());
		if (points.length < 2 || !canvas) return;

		const newDistance = distanceBetween(points[0], points[1]);
		if (pinchStartDistance === 0) {
			pinchStartDistance = newDistance;
			return;
		}

		const scale = newDistance / pinchStartDistance;
		const centerX = (points[0].x + points[1].x) / 2;
		const centerY = (points[0].y + points[1].y) / 2;

		updateZoom(pinchStartZoom * scale, centerX, centerY);
	}

	function distanceBetween(a: { x: number; y: number }, b: { x: number; y: number }) {
		return Math.hypot(a.x - b.x, a.y - b.y);
	}

	function clampPan() {
		if (!currentImage || !canvas) return;

		const rect = canvas.getBoundingClientRect();
		const drawWidth = currentImage.width * zoomLevel;
		const drawHeight = currentImage.height * zoomLevel;

		if (drawWidth <= rect.width) {
			panX = (rect.width - drawWidth) / 2;
		} else {
			const minX = rect.width - drawWidth;
			panX = Math.min(0, Math.max(minX, panX));
		}

		if (drawHeight <= rect.height) {
			panY = (rect.height - drawHeight) / 2;
		} else {
			const minY = rect.height - drawHeight;
			panY = Math.min(0, Math.max(minY, panY));
		}
	}

	function drawCurrentImage() {
		if (!ctx || !currentImage || !canvas) return;

		const rect = canvas.getBoundingClientRect();
		const dpr = window.devicePixelRatio || 1;
		const displayWidth = rect.width;
		const displayHeight = rect.height;

		clampPan();

		const width = Math.round(displayWidth * dpr);
		const height = Math.round(displayHeight * dpr);

		if (canvas.width !== width || canvas.height !== height) {
			canvas.width = width;
			canvas.height = height;
		}

		ctx.save();
		ctx.scale(dpr, dpr);
		ctx.clearRect(0, 0, displayWidth, displayHeight);
		ctx.drawImage(currentImage, panX, panY, currentImage.width * zoomLevel, currentImage.height * zoomLevel);

		// Apply filter
		switch (activeFilter) {
			case 'monochrome':
				applyMonochrome(ctx);
				break;
			case 'color-correction':
				applyColorCorrection(ctx);
				break;
			case 'vintage':
				applyVintage(ctx);
				break;
			case 'vibrant':
				applyVibrant(ctx);
				break;
		}

		ctx.restore();
	}
</script>

<svelte:window on:resize={drawCurrentImage} />

<div class="viewer">
	<div
		class="canvas-layer"
		class:dragging={isDragging}
		role="button"
		tabindex="0"
		aria-pressed={isUiPinned}
		aria-label="Comic page viewer. Tap or click left to go back, right to advance, center to toggle controls."
		on:click={handleTap}
		on:keydown={handleContentKey}
	>
		<canvas bind:this={canvas} class:loading={isImageLoading}></canvas>

		{#if isImageLoading}
			<div class="loading-overlay">
				<div class="loading-spinner"></div>
				<p>Loading page...</p>
			</div>
		{/if}

		<div class="help-overlay" class:hidden={!isUiVisible && !isUiPinned}>
			<small>
				<strong>Navigation:</strong> tap left/right or use arrow keys •
				<strong>Zoom:</strong> pinch or scroll •
				<strong>Pan:</strong> drag the page
			</small>
		</div>
	</div>
</div>

<style>
	.hidden {
		opacity: 0 !important;
		pointer-events: none !important;
	}

	.viewer {
		position: relative;
		height: 100vh;
		width: 100vw;
		background: #000;
		color: #f5f5f5;
		overflow: hidden;
	}

	.canvas-layer {
		height: 100%;
		width: 100%;
		position: relative;
		touch-action: none;
		cursor: grab;
	}

	.canvas-layer.dragging {
		cursor: grabbing;
	}

	.canvas-layer:focus-visible {
		outline: 2px solid #ff6600;
		outline-offset: 3px;
	}

	canvas {
		height: 100%;
		width: 100%;
		display: block;
		cursor: inherit;
	}

	canvas.loading {
		filter: blur(2px);
	}

	.canvas-layer .loading-overlay {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		padding: 1.5rem;
		border-radius: 10px;
		background: rgba(12, 12, 12, 0.92);
		text-align: center;
		border: 1px solid rgba(255, 255, 255, 0.08);
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
	}

	.loading-spinner {
		width: 36px;
		height: 36px;
		border: 4px solid rgba(255, 255, 255, 0.15);
		border-top-color: #ff6600;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin: 0 auto 0.75rem;
	}

	.help-overlay {
		position: absolute;
		left: 50%;
		bottom: 1.5rem;
		transform: translateX(-50%);
		background: rgba(12, 12, 12, 0.85);
		color: #d9d9d9;
		padding: 0.6rem 1rem;
		border-radius: 999px;
		font-size: 0.75rem;
		box-shadow: 0 6px 18px rgba(0, 0, 0, 0.45);
		border: 1px solid rgba(255, 255, 255, 0.08);
		pointer-events: none;
		transition: opacity 0.25s ease;
		opacity: 1;
	}

	.help-overlay.hidden {
		opacity: 0;
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
