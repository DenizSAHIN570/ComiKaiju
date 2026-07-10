<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { comicStorage } from '$lib/storage/comicStorage';
	import type { FileSystemItem } from '../../types/comic';
	import { setComic, setLoading, setError } from '$lib/store/session';
	import ArchiveManager from '$lib/archive/archiveManager';
	import { logger } from '$lib/services/logger';
	import { directoryService, type DirectoryFile } from '$lib/services/directoryService';

	let items = $state<FileSystemItem[]>([]);
	let loading = $state(true);
	
	// Local Folder State
	let folderHandle = $state<FileSystemDirectoryHandle | null>(null);
	let folderFiles = $state<DirectoryFile[]>([]);
	let folderLoading = $state(false);

	onMount(async () => {
		try {
			await comicStorage.init();
			await Promise.all([
				loadLibrary(),
				checkStoredFolder()
			]);
		} catch (e) {
			logger.error('Library', 'Initialization failed', e);
			setError('Failed to load library', 'error');
		}
	});

	async function checkStoredFolder() {
		folderLoading = true;
		try {
			const handle = await directoryService.getStoredFolder();
			if (handle) {
				folderHandle = handle;
				folderFiles = await directoryService.listComics(handle);
			}
		} catch (err) {
			logger.error('Library', 'Failed to restore folder', err);
		} finally {
			folderLoading = false;
		}
	}

	async function openFolder() {
		try {
			const handle = await directoryService.openComicsFolder();
			if (handle) {
				folderHandle = handle;
				folderLoading = true;
				folderFiles = await directoryService.listComics(handle);
				folderLoading = false;
			}
		} catch (err) {
			setError('Failed to open folder', 'error');
		}
	}

	async function openLocalFile(file: DirectoryFile) {
		try {
			setLoading(true, 'Opening local comic...');
			const fileData = await file.handle.getFile();
			
			const archiveManager = new ArchiveManager();
			// We don't have stored metadata for local files usually, or we could generate it temporarily
			// For now, treat as fresh open
			const pages = await archiveManager.openArchive(fileData);
			
			const comic = {
				id: 'local-' + file.name, // Temporary ID
				title: file.name.replace(/\.(cbz|zip|cbr|rar)$/i, ''),
				filename: file.name,
				pages: pages.map(p => ({ filename: p.filename, index: p.index })),
				currentPage: 0,
				totalPages: pages.length,
				lastRead: new Date()
			};

			setComic(comic, fileData);
			await goto('/reader');
		} catch (err) {
			logger.error('Library', 'Failed to open local file', err);
			setError('Failed to open local comic', 'error');
		} finally {
			setLoading(false);
		}
	}

	async function loadLibrary() {
		loading = true;
		try {
			items = await comicStorage.getAllFiles();
		} catch (error) {
			logger.error('Library', 'Failed to load library', error);
			setError('Failed to load library', 'error');
		} finally {
			loading = false;
		}
	}

	async function openComic(item: FileSystemItem) {
		try {
			setLoading(true, 'Opening comic...');
			const file = await comicStorage.getFile(item.id);
			if (!file) throw new Error('File data not found');

			const archiveManager = new ArchiveManager();
			let comic = await comicStorage.getComicMetadata(item.id);
			
			if (!comic || !comic.pages || comic.pages.length === 0) {
				const pages = await archiveManager.openArchive(file);
				comic = {
					id: item.id,
					title: item.name.replace(/\.(cbz|zip|cbr|rar)$/i, ''),
					filename: item.name,
					pages: pages.map(p => ({ filename: p.filename, index: p.index })),
					currentPage: 0,
					totalPages: pages.length,
					lastRead: new Date()
				};
			    await comicStorage.saveComicMetadata(comic);
			} else {
				comic.lastRead = new Date();
				await comicStorage.saveComicMetadata(comic);
			}
            
            if (!comic) throw new Error('Failed to initialize comic metadata');

			await comicStorage.updateLastAccessed(item.id, {
				currentPage: comic.currentPage ?? 0,
				totalPages: comic.totalPages
			});

			setComic(comic, file);
			await goto('/reader');
		} catch (error) {
			logger.error('Library', 'Error opening comic', error);
			setError('Failed to open comic', 'error');
		} finally {
			setLoading(false);
		}
	}

	async function deleteItem(item: FileSystemItem, e: MouseEvent) {
        e.stopPropagation();
        e.preventDefault();
		if (!confirm(`Are you sure you want to delete "${item.name}"?`)) return;
		try {
			await comicStorage.deleteComic(item.id);
			await loadLibrary();
		} catch (error) {
			logger.error('Library', 'Failed to delete item', error);
			setError('Failed to delete item', 'error');
		}
	}

	function formatSize(bytes?: number) {
		if (bytes === undefined) return '-';
		if (bytes === 0) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return Math.round((bytes / Math.pow(k, i)) * 10) / 10 + ' ' + sizes[i];
	}
</script>

<svelte:head>
	<title>Library - ComiKaiju</title>
	<meta name="description" content="Browse your imported comic book library. All comics are stored locally on your device." />
</svelte:head>

<div class="library-container">
    <header class="library-header">
        <div class="header-left">
            <a href="/" class="back-link">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back
            </a>
            <h1>Full Library</h1>
        </div>
        <div class="header-right">
            <button class="folder-btn" onclick={openFolder}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                </svg>
                {folderHandle ? 'Change Folder' : 'Open Folder'}
            </button>
            <span class="count">{items.length} Imported</span>
        </div>
    </header>

    <div class="library-content">
        {#if folderHandle}
            <section class="folder-section">
                <div class="section-header">
                    <h2>Local: {folderHandle.name}</h2>
                    <span class="count">{folderFiles.length} items</span>
                </div>
                
                {#if folderLoading}
                    <div class="loading">Scanning folder...</div>
                {:else if folderFiles.length === 0}
                     <div class="empty-folder">No comic files found in this folder.</div>
                {:else}
                    <div class="comic-grid">
                        {#each folderFiles as file}
                             <div class="comic-card local" onclick={() => openLocalFile(file)} role="button" tabindex="0" onkeydown={(e) => e.key === 'Enter' && openLocalFile(file)}>
                                <div class="card-cover">
                                    <div class="placeholder local-placeholder">
                                        <span>{file.name.slice(0, 3)}</span>
                                    </div>
                                </div>
                                <div class="card-info">
                                    <div class="title" title={file.name}>{file.name}</div>
                                    <div class="meta">Local File</div>
                                </div>
                            </div>
                        {/each}
                    </div>
                {/if}
            </section>
            <hr class="divider" />
        {/if}

        <div class="section-header">
            <h2>Imported Library</h2>
        </div>

        {#if loading}
            <div class="loading">Loading...</div>
        {:else if items.length === 0}
            <div class="empty">
                <p>No comics found.</p>
                <a href="/">Go upload some!</a>
            </div>
        {:else}
            <div class="comic-grid">
                {#each items as item (item.id)}
                    <div class="comic-card" onclick={() => openComic(item)} role="button" tabindex="0" onkeydown={(e) => e.key === 'Enter' && openComic(item)}>
                        <div class="card-cover">
                            {#if item.thumbnail}
                                <img src={item.thumbnail} alt={item.name} />
                            {:else}
                                <div class="placeholder">
                                    <span>{item.name.slice(0, 2)}</span>
                                </div>
                            {/if}
                            <button class="delete-btn" onclick={(e) => deleteItem(item, e)} title="Delete">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </button>
                        </div>
                        <div class="card-info">
                            <div class="title" title={item.name}>{item.name}</div>
                            <div class="meta">{formatSize(item.size)}</div>
                        </div>
                    </div>
                {/each}
            </div>
        {/if}
    </div>
</div>

<style>
    .library-container {
        min-height: 100vh;
        background-color: var(--color-bg-main);
        color: var(--color-text-main);
        font-family: var(--font-base);
        padding: 2rem;
    }

    .library-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 2rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid var(--color-border);
    }

    .header-left {
        display: flex;
        align-items: center;
        gap: 1.5rem;
    }

    .back-link {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: var(--color-text-secondary);
        text-decoration: none;
        font-weight: 500;
        transition: color 0.2s;
    }

    .back-link:hover {
        color: var(--color-primary);
    }

    .header-right {
        display: flex;
        align-items: center;
        gap: 1.5rem;
    }

    .folder-btn {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        background: var(--color-bg-surface);
        border: 1px solid var(--color-border);
        border-radius: 6px;
        color: var(--color-text-main);
        font-size: 0.9rem;
        cursor: pointer;
        transition: all 0.2s;
    }

    .folder-btn:hover {
        border-color: var(--color-primary);
        color: var(--color-primary);
    }

    .section-header {
        display: flex;
        align-items: baseline;
        gap: 1rem;
        margin-bottom: 1.5rem;
    }

    .section-header h2 {
        font-size: 1.25rem;
        font-weight: 600;
        margin: 0;
    }

    .folder-section {
        margin-bottom: 3rem;
    }

    .divider {
        border: 0;
        border-top: 1px solid var(--color-border);
        margin: 2rem 0;
        opacity: 0.5;
    }

    .local-placeholder {
        background: var(--color-bg-tertiary, var(--color-bg-secondary));
        color: var(--color-primary);
    }

    .empty-folder {
        color: var(--color-text-muted);
        font-style: italic;
    }

    h1 {
        font-size: 1.5rem;
        font-weight: 700;
        margin: 0;
    }

    .count {
        color: var(--color-text-muted);
        font-size: 0.9rem;
    }

    .comic-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
        gap: 2rem;
    }

    .comic-card {
        cursor: pointer;
        transition: transform 0.2s;
    }

    .comic-card:hover {
        transform: translateY(-5px);
    }

    .card-cover {
        aspect-ratio: 2/3;
        background: var(--color-bg-surface);
        border: 1px solid var(--color-border);
        border-radius: 8px;
        overflow: hidden;
        position: relative;
        box-shadow: 0 4px 6px color-mix(in srgb, #000 10%, transparent);
    }

    .card-cover img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .placeholder {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--color-bg-secondary);
        color: var(--color-text-muted);
        font-size: 2rem;
        font-weight: 700;
        text-transform: uppercase;
    }

    .delete-btn {
        position: absolute;
        top: 0.5rem;
        right: 0.5rem;
        width: 32px;
        height: 32px;
        background: color-mix(in srgb, #000 70%, transparent);
        border: none;
        border-radius: 4px;
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.2s, background 0.2s;
        cursor: pointer;
    }

    .comic-card:hover .delete-btn {
        opacity: 1;
    }

    .delete-btn:hover {
        background: var(--color-status-error);
    }

    .card-info {
        margin-top: 0.75rem;
    }

    .title {
        font-size: 0.9rem;
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        color: var(--color-text-main);
    }

    .meta {
        font-size: 0.75rem;
        color: var(--color-text-muted);
        margin-top: 0.25rem;
    }

    .loading, .empty {
        text-align: center;
        padding: 4rem;
        color: var(--color-text-secondary);
    }

    .empty a {
        color: var(--color-primary);
        text-decoration: underline;
    }
</style>
