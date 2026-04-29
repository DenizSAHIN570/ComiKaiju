
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { get } from 'svelte/store';
	import { currentComic, currentPageIndex, isLoading, error, currentFile, setError } from '$lib/store/session.js';
	import ArchiveManager from '$lib/archive/archiveManager.js';
	import ReaderShell from '$lib/ui/ReaderShell.svelte';
	import type { ComicBook } from '../../types/comic.js';
	import { comicStorage } from '$lib/storage/comicStorage.js';
	import { logger } from '$lib/services/logger';

	let archiveManager: ArchiveManager;
	let comic: ComicBook | null = null;
	let file: File | null = null;
	let archiveReady = false;

	const unsubscribeComic = currentComic.subscribe((value) => {
		comic = value;
	});

	const unsubscribeFile = currentFile.subscribe((value) => {
		file = value;
	});

	const unsubscribePage = currentPageIndex.subscribe(async (pageIndex) => {
		if (comic && pageIndex !== undefined) {
			comic.currentPage = pageIndex;
			comic.lastRead = new Date();
			try {
				await comicStorage.saveComicMetadata(structuredCloneComic(comic));
				await comicStorage.updateProgress(comic.id, pageIndex, comic.totalPages);
			} catch (saveError) {
				logger.error('Reader', 'Failed to save reading position', saveError);
			}
		}
	});

	onMount(async () => {
		archiveManager = new ArchiveManager();
		await comicStorage.init();

		if (!comic) {
			await goto('/');
			return;
		}

		if (file && comic) {
			try {
				const isSupported = await archiveManager.isSupported(file);
				if (!isSupported) {
					throw new Error('Unsupported file format');
				}

				const pages = await archiveManager.openArchive(file);
				comic.pages = pages;
				comic.totalPages = pages.length;
				currentComic.set(comic);

				archiveReady = true;
				logger.info('Reader', `Loaded ${pages.length} pages from ${await archiveManager.getFileType(file)} archive`);
			} catch (e) {
				logger.error('Reader', 'Failed to load archive', e);
				requestFileReload();
			}
		} else if (comic && !file) {
			requestFileReload();
		}
	});

	onDestroy(() => {
		void saveProgress();
		unsubscribeComic();
		unsubscribeFile();
		unsubscribePage();
		if (archiveManager) {
			archiveManager.cleanup();
		}
	});

async function saveProgress(): Promise<void> {
	if (!comic) return;
	const pageIndex = get(currentPageIndex);
	comic.currentPage = pageIndex;
	comic.lastRead = new Date();
	const totalPages = comic.totalPages || comic.pages?.length || 0;
	try {
		await comicStorage.saveComicMetadata(structuredCloneComic(comic));
		await comicStorage.updateProgress(comic.id, pageIndex, totalPages);
	} catch (error) {
		logger.error('Reader', 'Failed to persist reading progress', error);
	}
}

function structuredCloneComic(comic: ComicBook): ComicBook {
	return {
		...comic,
		pages: comic.pages.map((page) => ({
			index: page.index,
			filename: page.filename,
			blob: undefined,
			url: undefined
		}))
	};
}

	async function onExtractPage(index: number): Promise<Blob> {
		if (!archiveManager || !comic) {
			throw new Error('Archive manager or comic not available');
		}
		
		// Check cache first
		try {
			const cachedBlob = await comicStorage.getPageBlob(comic.id, index);
			if (cachedBlob) {
				return cachedBlob;
			}
		} catch (error) {
			logger.warn('Reader', 'Failed to get cached page', error);
		}
		
		// Get the page from comic pages array
		const page = comic.pages[index];
		if (!page) {
			throw new Error(`Page ${index} not found`);
		}
		
		// Load page if not already loaded
		if (!page.blob) {
			await archiveManager.loadPage(page);
		}
		
		if (!page.blob) {
			throw new Error(`Failed to load page ${index}`);
		}
		
		// Cache the extracted page
		try {
			await comicStorage.savePageBlob(comic.id, index, page.blob);
		} catch (error) {
			logger.warn('Reader', 'Failed to cache page', error);
		}
		
		return page.blob;
	}
	
	async function handleFileReload(event: Event) {
		const input = event.target as HTMLInputElement;
		const selectedFile = input.files?.[0];
		
		if (selectedFile && comic) {
			// Verify this is the same file
			const expectedId = `${selectedFile.name}-${selectedFile.size}`;
			if (expectedId === comic.id) {
				// Update the store with the new file
				currentFile.set(selectedFile);
				
				// Reload the archive
				try {
					await archiveManager.openArchive(selectedFile);
					archiveReady = true;
					// Hide the file reload dialog
					const dialog = document.getElementById('file-reload-dialog');
					if (dialog) {
						dialog.style.display = 'none';
					}
				} catch (error) {
					logger.error('Reader', 'Failed to reload archive', error);
					setError('Failed to reload archive', 'error');
				}
			} else {
				alert('This doesn\'t appear to be the same file. Please select the correct file.');
			}
		}
		
		// Reset input
		input.value = '';
	}

	function requestFileReload() {
		// Show file reload dialog
		setTimeout(() => {
			const dialog = document.getElementById('file-reload-dialog');
			if (dialog) {
				dialog.style.display = 'flex';
			}
		}, 100);
	}

	async function exitReader() {
		await saveProgress();
		await goto('/');
	}
</script>

<svelte:head>
	<title>{comic?.title || 'Reading'} - ComiKaiju</title>
	<meta name="description" content="Read your comic books in an immersive, offline-first browser-based reader. Enjoy your CBZ/CBR collection with optimal performance." />
</svelte:head>

{#if $error}
	<div class="error-overlay">
		<div class="error-content">
			<h2>Error</h2>
			<p>{$error.message}</p>
			<button on:click={exitReader}>Go Home</button>
		</div>
	</div>
{/if}

{#if $isLoading}
	<div class="loading-overlay">
		<div class="loading-content">
			<div class="loading-spinner"></div>
			<p>Loading...</p>
		</div>
	</div>
{/if}

{#if comic && file && archiveReady}
	<ReaderShell {comic} {onExtractPage} onExit={exitReader} />
{:else if comic && file && !archiveReady}
	<div class="loading-overlay">
		<div class="loading-content">
			<div class="loading-spinner"></div>
			<p>Loading archive...</p>
		</div>
	</div>
{:else if comic}
	<!-- File reload dialog -->
	<div id="file-reload-dialog" class="file-reload-overlay">
		<div class="file-reload-content">
			<h2>File Required</h2>
			<p>Please select the comic file to continue reading:</p>
			<p><strong>{comic.filename}</strong></p>
			<div class="file-reload-actions">
				<input
					type="file"
					accept=".cbz,.zip,.cbr,.rar"
					on:change={handleFileReload}
					id="file-reload-input"
				/>
				<label for="file-reload-input" class="file-select-button">
					Select File
				</label>
				<button on:click={exitReader} class="cancel-button">
					Cancel
				</button>
			</div>
			<small>
				Due to browser security limitations, you need to re-select the file each time.
			</small>
		</div>
	</div>
{:else}
	<!-- No comic - redirect to home -->
	<div class="no-comic">
		<p>No comic selected.</p>
		<button on:click={exitReader}>Go Home</button>
	</div>
{/if}

<style>
	.error-overlay,
	.loading-overlay,
	.file-reload-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		background: rgba(0, 0, 0, 0.9);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		color: white;
	}
	
	.error-content,
	.loading-content,
	.file-reload-content {
		text-align: center;
		background: #2a2a2a;
		padding: 2rem;
		border-radius: 8px;
		max-width: 400px;
		width: 90%;
	}
	
	.loading-spinner {
		width: 40px;
		height: 40px;
		border: 4px solid #444;
		border-top: 4px solid var(--color-primary);
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin: 0 auto 1rem;
	}
	
	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}
	
	.file-reload-actions {
		margin: 1.5rem 0;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	
	#file-reload-input {
		display: none;
	}
	
	.file-select-button {
		background: var(--color-primary);
		color: white;
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 1rem;
		display: inline-block;
		text-align: center;
	}
	
	.file-select-button:hover {
		background: var(--color-primary-hover);
	}
	
	.cancel-button {
		background: #666;
		color: white;
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 1rem;
	}
	
	.cancel-button:hover {
		background: #777;
	}
	
	.no-comic {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100vh;
		background: #1a1a1a;
		color: white;
	}
	
	button {
		background: var(--color-primary);
		color: white;
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		margin-top: 1rem;
	}
	
	button:hover {
		background: var(--color-primary-hover);
	}
</style>
