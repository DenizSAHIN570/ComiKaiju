<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { comicStorage } from '$lib/storage/comicStorage.js';
	import { setLoading, setError, setComic } from '$lib/store/session.js';
	import { handleFile, cleanupComicProcessor } from '$lib/services/comicProcessor.js';
	import { directoryService, type DirectoryFile } from '$lib/services/directoryService';
	import ThemeToggle from '$lib/ui/ThemeToggle.svelte';
	import { logger } from '$lib/services/logger';
    import ArchiveManager from '$lib/archive/archiveManager.js';
    import { goto } from '$app/navigation';
    import type { ComicBook, FileSystemItem } from '../types/comic';

	let fileInput = $state<HTMLInputElement>();
	let dragActive = $state(false);
	let recentComics = $state<(FileSystemItem & { metadata?: ComicBook })[]>([]);
    let localFiles = $state<(DirectoryFile & { metadata?: ComicBook })[]>([]);
    let localFolderHandle = $state<FileSystemDirectoryHandle | null>(null);
	let storageInfo = $state({ usage: 0, quota: 0, percentage: 0 });
    let openMenuId = $state<string | null>(null);
    let fileSystemSupported = $state(false);

	onMount(async () => {
		try {
            fileSystemSupported = 'showDirectoryPicker' in window;

            await comicStorage.init();
			await Promise.all([
                loadComics(),
                fileSystemSupported ? loadLocalLibrary() : Promise.resolve()
            ]);
		} catch (error) {
			logger.error('Home', 'Failed to initialize', error);
			setError('Failed to initialize application', 'error');
		}
	});

    async function loadLocalLibrary() {
        try {
            const handle = await directoryService.getStoredFolder();
            if (handle) {
                localFolderHandle = handle;
                const files = await directoryService.listComics(handle);
                
                // Load metadata for local files to show progress
                localFiles = await Promise.all(files.map(async (f) => {
                    const id = `local-${f.name}`;
                    const metadata = await comicStorage.getComicMetadata(id);
                    return { ...f, metadata: metadata || undefined };
                }));
            }
        } catch (err) {
            logger.error('Home', 'Failed to load local library', err);
        }
    }

    async function openLocalFolder() {
        try {
            const handle = await directoryService.openComicsFolder();
            if (handle) {
                localFolderHandle = handle;
                setLoading(true, 'Scanning folder...');
                await loadLocalLibrary();
            }
        } catch (err: any) {
            logger.error('Home', 'Failed to open local folder', err);
            setError(`Failed to open folder: ${err.message || 'Unknown error'}`, 'error');
        } finally {
            setLoading(false);
        }
    }

    async function openLocalComic(item: DirectoryFile & { metadata?: ComicBook }) {
        try {
            logger.info('Home', `Opening local comic: ${item.name}`);
            setLoading(true, 'Opening local comic...');
            
            const file = await item.handle.getFile();
            const id = `local-${item.name}`;
            
            let comic = item.metadata;
            
            // If no metadata, or no pages, we need to parse the archive
            if (!comic || !comic.pages || comic.pages.length === 0) {
                 const archiveManager = new ArchiveManager();
                 const pages = await archiveManager.openArchive(file);
                 
                 comic = {
                    id,
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

            setComic(comic, file);
            await goto('/reader');
        } catch (error) {
            logger.error('Home', 'Failed to open local comic', error);
            setError('Failed to open local comic', 'error');
        } finally {
            setLoading(false);
        }
    }

	async function loadComics() {
		try {
			const files = await comicStorage.getRecentFiles(12);
			
			// Calculate total usage based on files instead of disk quota
			let totalUsage = 0;
			
			recentComics = await Promise.all(files.map(async file => {
				const metadata = await comicStorage.getComicMetadata(file.id);
				if (file.size) totalUsage += file.size;
				return {
					...file,
					metadata: metadata || undefined
				};
			}));
			
			// Use manually calculated usage to match file sizes
			const estimate = await comicStorage.getStorageEstimate();
			storageInfo = {
				...estimate,
				usage: totalUsage // Override usage
			};
		} catch (err) {
			logger.error('Home', 'Failed to load comics', err);
		}
	}

	async function handleFileInput(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];

		if (file) {
			await handleFile(file, loadComics);
		}

		input.value = '';
	}

	async function openRecentComic(item: FileSystemItem & { metadata?: ComicBook }) {
		try {
			logger.info('Home', `Opening comic: ${item.name}`);
			setLoading(true, 'Loading comic...');

            const file = await comicStorage.getFile(item.id);
			if (!file) {
				logger.warn('Home', `File data not found: ${item.id}`);
				setError('Comic data not found in storage', 'warning');
				setLoading(false);
				return;
			}

			const archiveManager = new ArchiveManager();
			
            // Unwrap proxy if it exists
            let comic: ComicBook | undefined;
            if (item.metadata) {
                 comic = JSON.parse(JSON.stringify(item.metadata));
            }
			
			if (!comic || !comic.pages || comic.pages.length === 0) {
				const pages = await archiveManager.openArchive(file);
				comic = {
					id: item.id,
					title: item.name.replace(/\.(cbz|zip|cbr|rar)$/i, ''),
					filename: item.name,
					pages: pages.map(p => ({ filename: p.filename, index: p.index })),
					currentPage: 0,
					totalPages: pages.length,
					lastRead: new Date(),
                    coverThumbnail: item.thumbnail
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
			logger.info('Home', 'Navigating to reader...');
			await goto('/reader');
			
		} catch (error) {
			logger.error('Home', 'Failed to open comic', error);
			setLoading(false);
			setError('Failed to open comic: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error');
		} finally {
			setTimeout(() => setLoading(false), 500);
		}
	}
	
	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		dragActive = true;
	}

	function handleDragLeave() {
		dragActive = false;
	}

	async function handleDrop(event: DragEvent) {
		event.preventDefault();
		dragActive = false;

		const files = event.dataTransfer?.files;
		if (files && files.length > 0) {
			await handleFile(files[0], loadComics);
		}
	}
	
	async function deleteComic(item: FileSystemItem, event: MouseEvent) {
		event.stopPropagation();
        event.preventDefault();
        openMenuId = null; // Close menu
		
		if (confirm(`Delete "${item.name}" from library?`)) {
			try {
                await comicStorage.deleteComic(item.id);
				await loadComics();
				logger.info('Home', `Deleted comic: ${item.name}`);
			} catch (error) {
				logger.error('Home', 'Failed to delete comic', error);
				setError('Failed to delete comic', 'error');
			}
		}
	}

    function toggleMenu(id: string, event: MouseEvent) {
        event.stopPropagation();
        event.preventDefault(); 
        if (openMenuId === id) {
            openMenuId = null;
        } else {
            openMenuId = id;
        }
    }

    function closeMenu() {
        openMenuId = null;
    }
	
	function formatFileSize(bytes: number): string {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
	}
	
	function formatDate(timestamp: number): string {
		const date = new Date(timestamp);
		const now = new Date();
		const diff = now.getTime() - date.getTime();
		const days = Math.floor(diff / (1000 * 60 * 60 * 24));

		if (days === 0) return 'Today';
		if (days === 1) return 'Yesterday';
		if (days < 7) return `${days} days ago`;
		return date.toLocaleDateString();
	}
</script>

<svelte:head>
	<title>ComiKaiju - Offline Comic Reader</title>
    <meta name="description" content="A private, offline-first comic book reader for the web. Supports CBZ/CBR files, works offline via PWA, and respects your privacy." />
</svelte:head>

<svelte:window onclick={closeMenu} />

<div class="page-container">
    <!-- Navbar -->
	<header class="navbar">
		<div class="navbar-content">
			<div class="brand">
                <div class="logo shadow-glow">C</div>
				<h1>ComiKaiju</h1>
			</div>
			<div class="actions">
				{#if recentComics.length > 0}
                    <div class="storage-widget">
						<div class="storage-stats">
							<span class="storage-label">Storage</span>
							<span class="storage-numbers">{formatFileSize(storageInfo.usage)} / {formatFileSize(storageInfo.quota)}</span>
						</div>
						<div class="storage-track">
							<div class="storage-bar" style="width: {Math.min(storageInfo.percentage, 100)}%"></div>
						</div>
					</div>
				{/if}
				<ThemeToggle />
			</div>
		</div>
	</header>

    <main class="main-content">
        <!-- Local Library Shelf (If Connected) -->
        {#if localFiles.length > 0}
            <section class="recent-section local-library">
                <div class="section-container">
                    <div class="section-header">
                        <h3>
                            <span class="pill local-pill"></span>
                            Local: {localFolderHandle ? localFolderHandle.name : 'Unknown Folder'}
                        </h3>
                        <button class="view-all text-btn" onclick={openLocalFolder}>
                            Change Folder
                        </button>
                    </div>
                    
                    <div class="bookshelf">
                        <div class="shelf-row">
                            {#each localFiles as item}
                                <div class="comic-book">
                                    <div class="comic-cover">
                                        <div 
                                            class="cover-action" 
                                            role="button" 
                                            tabindex="0" 
                                            onclick={() => openLocalComic(item)} 
                                            onkeydown={(e) => e.key === 'Enter' && openLocalComic(item)}
                                        >
                                            <div class="placeholder-cover local-cover">
                                                <div class="placeholder-icon">
                                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                                                    </svg>
                                                </div>
                                                <div class="placeholder-title">{item.name.replace(/\.(cbz|zip|cbr|rar)$/i, '')}</div>
                                            </div>
                                            {#if item.metadata && item.metadata.totalPages > 0}
                                                <div class="progress-badge">
                                                    {Math.min(item.metadata.currentPage + 1, item.metadata.totalPages)} / {item.metadata.totalPages}
                                                </div>
                                                <div class="progress-bar-container">
                                                    <div class="progress-bar-fill" style="width: {((item.metadata.currentPage + 1) / item.metadata.totalPages) * 100}%"></div>
                                                </div>
                                            {/if}
                                        </div>
                                    </div>
                                    <div class="comic-info-container">
                                        <div 
                                            class="comic-info" 
                                            role="button" 
                                            tabindex="0" 
                                            onclick={() => openLocalComic(item)}
                                            onkeydown={(e) => e.key === 'Enter' && openLocalComic(item)}
                                        >
                                            <div class="comic-title">{item.name}</div>
                                            <div class="comic-meta">Local File</div>
                                        </div>
                                    </div>
                                </div>
                            {/each}
                        </div>
                        <div class="shelf-support"></div>
                    </div>
                </div>
            </section>
        {/if}

        <!-- Recent Comics (Imported) -->
        {#if recentComics.length > 0}
            <section class="recent-section">
                <div class="section-container">
                    <div class="section-header">
                        <h3>
                            <span class="pill"></span>
                            Recent Imports
                        </h3>
                        <a href="/library" class="view-all">
                            View All <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                        </a>
                    </div>
                    
                    <div class="bookshelf">
                        <div class="shelf-row">
                            {#each recentComics as item (item.id)}
                                <div class="comic-book" style:z-index={openMenuId === item.id ? 50 : undefined}>
                                    <div class="comic-cover">
                                        <div 
                                            class="cover-action" 
                                            role="button" 
                                            tabindex="0" 
                                            onclick={() => openRecentComic(item)} 
                                            onkeydown={(e) => e.key === 'Enter' && openRecentComic(item)}
                                        >
                                            {#if item.thumbnail}
                                                <img src={item.thumbnail} alt={item.name} />
                                            {:else}
                                                <div class="placeholder-cover">
                                                    <div class="placeholder-icon">
                                                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                                            <polyline points="14,2 14,8 20,8"/>
                                                        </svg>
                                                    </div>
                                                    <div class="placeholder-title">{item.name.replace(/\.(cbz|zip|cbr|rar)$/i, '')}</div>
                                                </div>
                                            {/if}
                                            {#if item.metadata && item.metadata.totalPages > 0}
                                                <div class="progress-badge">
                                                    {Math.min(item.metadata.currentPage + 1, item.metadata.totalPages)} / {item.metadata.totalPages}
                                                </div>
                                                <div class="progress-bar-container">
                                                    <div class="progress-bar-fill" style="width: {((item.metadata.currentPage + 1) / item.metadata.totalPages) * 100}%"></div>
                                                </div>
                                            {/if}
                                        </div>
                                    </div>
                                    
                                    <div class="comic-info-container">
                                        <div 
                                            class="comic-info" 
                                            role="button" 
                                            tabindex="0" 
                                            onclick={() => openRecentComic(item)}
                                            onkeydown={(e) => e.key === 'Enter' && openRecentComic(item)}
                                        >
                                            <div class="comic-title">{item.name}</div>
                                            <div class="comic-meta">
                                                <span>{formatFileSize(item.size || 0)}</span>
                                                <span>•</span>
                                                <span>{formatDate(item.updatedAt)}</span>
                                            </div>
                                        </div>
                                        <div class="menu-container">
                                            <button class="menu-btn" onclick={(e) => toggleMenu(item.id, e)} aria-label="Options">
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="pointer-events-none">
                                                    <circle cx="12" cy="12" r="1" />
                                                    <circle cx="12" cy="5" r="1" />
                                                    <circle cx="12" cy="19" r="1" />
                                                </svg>
                                            </button>
                                            {#if openMenuId === item.id}
                                                <div class="dropdown-menu">
                                                    <button class="dropdown-item delete" onclick={(e) => deleteComic(item, e)}>
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="pointer-events-none">
                                                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" stroke-linecap="round" stroke-linejoin="round"/>
                                                        </svg>
                                                        Delete
                                                    </button>
                                                </div>
                                            {/if}
                                        </div>
                                    </div>
                                </div>
                            {/each}
                        </div>
                        <div class="shelf-support"></div>
                    </div>
                </div>
            </section>
        {/if}

        <!-- Hero Section (BELOW RECENT) -->
        <section class="hero-section" class:compact={recentComics.length > 0}>
            <div class="hero-bg"></div>
            
            <div class="hero-content">
                {#if recentComics.length === 0}
                    <h2 class="hero-title">
                        Your Comics. <br class="mobile-hide" />
                        <span class="highlight">Anywhere. Offline.</span>
                    </h2>
                    <p class="hero-subtitle">
                        A private, browser-based reader for your CBZ and CBR collection. No tracking, no servers, just you and your stories.
                    </p>
                {:else}
                    <h2 class="hero-title-small">Add More Comics</h2>
                {/if}
                
                <!-- Upload Area -->
                <div class="hero-actions">
                    <div class="upload-container">
                        <div 
                            class="drop-zone"
                            class:active={dragActive}
                            ondragover={handleDragOver}
                            ondragleave={handleDragLeave}
                            ondrop={handleDrop}
                            role="button"
                            tabindex="0"
                            onclick={() => fileInput?.click()}
                            onkeydown={(e) => e.key === 'Enter' && fileInput?.click()}
                        >
                            <div class="drop-zone-overlay"></div>
                            <div class="drop-content">
                                <div class="upload-icon-circle">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                    </svg>
                                </div>
                                <h3>{recentComics.length > 0 ? 'Import File' : 'Import Comic'}</h3>
                                <p>Drag & drop or click</p>
                            </div>
                        </div>
                        <input
                            bind:this={fileInput}
                            type="file"
                            accept=".cbz,.zip,.cbr,.rar"
                            onchange={handleFileInput}
                            style="display: none;"
                        />
                    </div>

                    <div class="or-divider">OR</div>

                    <button 
                        class="sync-folder-btn" 
                        class:disabled={!fileSystemSupported}
                        onclick={fileSystemSupported ? openLocalFolder : undefined}
                        disabled={!fileSystemSupported}
                        title={!fileSystemSupported ? "Requires a Chromium-based browser (Chrome, Edge)" : "Sync a local folder"}
                    >
                        <div class="icon-circle" class:disabled-icon={!fileSystemSupported}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                            </svg>
                        </div>
                        <div class="btn-content">
                            <h3>
                                {#if !fileSystemSupported}
                                    Not Supported
                                {:else}
                                    {localFolderHandle ? 'Change Folder' : 'Sync Folder'}
                                {/if}
                            </h3>
                            <p>
                                {#if !fileSystemSupported}
                                    Use Chrome/Edge. (Brave requires shields down)
                                {:else}
                                    Read directly from disk
                                {/if}
                            </p>
                        </div>
                    </button>
                </div>
            </div>
        </section>

        <!-- Features Grid -->
        <section class="features-section">
            <div class="features-grid">
                <!-- Feature 1 -->
                <div class="feature-card">
                    <div class="feature-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                        </svg>
                    </div>
                    <h3>Fully Offline</h3>
                    <p>Works without internet. Your library is stored in your browser using standard web technologies. Install it as a PWA for a native-like experience.</p>
                </div>

                <!-- Feature 2 -->
                <div class="feature-card">
                    <div class="feature-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h3>Privacy First</h3>
                    <p>No servers, no tracking, Zero-knowledge about you. Your comics never leave your device. We believe reading is a personal experience.</p>
                </div>

                <!-- Feature 3 -->
                <div class="feature-card">
                    <div class="feature-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <h3>Blazing Fast</h3>
                    <p>Powered by WebAssembly and Service Workers. Instant page loads, deduplication, and optimized caching for smooth reading.</p>
                </div>
            </div>
        </section>
        
        <footer>
            <p>&copy; {new Date().getFullYear()} ComiKaiju. Built for readers.</p>
            <p style="margin-top: 0.5rem; font-size: 0.75rem; opacity: 0.7;">
                Powered by <a href="https://svelte.dev" target="_blank" rel="noopener noreferrer" style="color: var(--color-primary);">Svelte</a>.
            </p>
        </footer>
    </main>
</div>

<style>
    /* Global Layout & Typography */
    .page-container {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        background-color: var(--color-bg-main);
        color: var(--color-text-main);
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }

    /* Navbar */
    .navbar {
        border-bottom: 1px solid var(--color-border);
        position: sticky;
        top: 0;
        background-color: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(12px);
        z-index: 50;
    }

    .navbar-content {
        width: 100%;
        padding: 0 1.5rem;
        height: 4rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .brand {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .logo {
        width: 2rem;
        height: 2rem;
        background-color: var(--color-primary);
        border-radius: 0.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: 900;
        font-size: 1.125rem;
    }

    .shadow-glow {
        box-shadow: 0 0 15px rgba(255, 102, 0, 0.3);
    }

    .brand h1 {
        font-size: 1.25rem;
        font-weight: 700;
        letter-spacing: -0.025em;
        margin: 0;
    }

    .actions {
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    /* Storage Widget */
    .storage-widget {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 0.125rem;
    }

    .storage-stats {
        display: flex;
        align-items: baseline;
        gap: 0.5rem;
    }

    .storage-label {
        font-size: 0.625rem;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: var(--color-text-muted);
        font-weight: 700;
    }

    .storage-numbers {
        font-size: 0.625rem;
        color: var(--color-text-secondary);
        font-weight: 500;
        font-variant-numeric: tabular-nums;
    }

    .storage-track {
        width: 6rem;
        height: 0.375rem;
        background-color: var(--color-bg-secondary);
        border-radius: 9999px;
        overflow: hidden;
    }

    .storage-bar {
        height: 100%;
        background-color: var(--color-primary);
        transition: width 0.5s ease;
    }

    @media (max-width: 640px) {
        .storage-widget { display: none; }
    }

    /* Main Content */
    .main-content {
        flex: 1;
        display: flex;
        flex-direction: column;
    }

    /* Recent Section (Now on top) */
    .recent-section {
        padding: 3rem 1.5rem;
        background-color: var(--color-bg-main);
    }

    .section-container {
        max-width: 1280px;
        margin: 0 auto;
    }

    .section-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 2rem;
    }

    .section-header h3 {
        font-size: 1.5rem;
        font-weight: 700;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin: 0;
    }

    .pill {
        width: 0.5rem;
        height: 2rem;
        background-color: var(--color-primary);
        border-radius: 9999px;
    }

    .view-all {
        font-size: 0.875rem;
        font-weight: 700;
        color: var(--color-primary);
        display: flex;
        align-items: center;
        gap: 0.25rem;
        transition: color 0.2s;
    }

    .view-all:hover { color: var(--color-primary-hover); }

    /* Bookshelf Styles */
	.bookshelf { perspective: 1000px; }
	.shelf-row {
		display: flex;
		gap: 1.5rem;
		padding: 2rem 1rem 0.5rem;
		overflow-x: auto;
		scrollbar-width: thin;
		scrollbar-color: var(--color-border) transparent;
		position: relative;
		background: linear-gradient(to bottom, transparent 0%, var(--color-bg-main) 95%);
	}
	.shelf-row::-webkit-scrollbar { height: 8px; }
	.shelf-row::-webkit-scrollbar-track { background: transparent; }
	.shelf-row::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 4px; }
	
    .shelf-support {
		height: 20px;
		background: linear-gradient(to bottom, var(--color-bg-secondary) 0%, var(--color-bg-surface) 30%, var(--color-bg-main) 100%);
		box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.5), 0 2px 5px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.05);
		border-radius: 2px;
		position: relative;
	}
	.shelf-support::before {
		content: '';
		position: absolute; top: 0; left: 0; right: 0; height: 2px;
		background: linear-gradient(to right, transparent 0%, rgba(255, 255, 255, 0.05) 50%, transparent 100%);
	}

	.comic-book {
		min-width: 140px; max-width: 140px;
		position: relative;
		transform-style: preserve-3d;
        transition: transform 0.3s ease;
	}
	.comic-book:hover { transform: translateY(-5px); z-index: 10; }
	
    .comic-cover {
		width: 140px; height: 210px;
		background: var(--color-bg-surface);
		border-radius: 4px;
		overflow: hidden;
		position: relative;
		box-shadow: -5px 0 15px rgba(0, 0, 0, 0.8), 2px 2px 5px rgba(0, 0, 0, 0.6), 0 0 40px rgba(0, 0, 0, 0.5);
		border: 1px solid var(--color-border);
	}
    .comic-cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .cover-action { width: 100%; height: 100%; cursor: pointer; }
    
    .progress-bar-container { position: absolute; bottom: 0; left: 0; right: 0; height: 4px; background: rgba(0, 0, 0, 0.3); z-index: 3; }
    .progress-bar-fill { height: 100%; background: var(--color-primary); }
    .progress-badge {
        position: absolute; bottom: 0.5rem; left: 0.5rem;
        background: rgba(0, 0, 0, 0.8); color: var(--color-primary);
        padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.65rem; font-weight: 700;
        z-index: 4; border: 1px solid var(--color-primary);
    }

    .placeholder-cover {
		width: 100%; height: 100%;
		display: flex; flex-direction: column; align-items: center; justify-content: center;
		background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%);
		color: white; padding: 1rem; text-align: center;
	}
    .placeholder-title { font-size: 0.9rem; font-weight: 600; line-height: 1.3; max-height: 3.9em; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; line-clamp: 3; -webkit-box-orient: vertical; }

    .comic-info-container { display: flex; justify-content: space-between; margin-top: 0.75rem; }
    .comic-info { flex: 1; min-width: 0; text-align: left; cursor: pointer; padding-right: 0.5rem; }
    .comic-info .comic-title { font-size: 0.85rem; font-weight: 600; color: var(--color-text-main); margin-bottom: 0.25rem; white-space: normal; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.2; height: 2.4em; }
	.comic-info .comic-meta { font-size: 0.7rem; color: var(--color-text-muted); display: flex; align-items: center; justify-content: flex-start; gap: 0.5rem; }
    
    .menu-container { position: relative; z-index: 10; }
    .menu-btn { background: transparent; border: none; color: var(--color-text-secondary); padding: 0.25rem; border-radius: 4px; cursor: pointer; transition: all 0.2s; }
    .menu-btn:hover { background: var(--color-bg-secondary); color: var(--color-text-main); }
    
    .dropdown-menu { position: absolute; bottom: calc(100% + 5px); right: 0; width: 120px; background: var(--color-bg-surface); border: 1px solid var(--color-border); border-radius: 8px; box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.3), 0 4px 6px rgba(0, 0, 0, 0.1); z-index: 100; overflow: hidden; }
    .dropdown-item { display: flex; align-items: center; gap: 0.5rem; width: 100%; padding: 0.75rem 1rem; font-size: 0.85rem; background: transparent; border: none; color: var(--color-text-main); cursor: pointer; text-align: left; transition: background 0.2s; }
    .dropdown-item:hover { background: var(--color-bg-secondary); }
    .dropdown-item.delete { color: var(--color-status-error); }
    .dropdown-item.delete:hover { background: rgba(239, 68, 68, 0.1); }

    /* Hero Section (Responsive logic) */
    .hero-section {
        position: relative;
        padding: 5rem 1.5rem;
        text-align: center;
        overflow: hidden;
        border-top: 1px solid transparent;
    }

    .hero-section.compact {
        padding: 3rem 1.5rem;
        background-color: var(--color-bg-secondary);
        border-top: 1px solid var(--color-border);
    }

    .hero-bg {
        position: absolute; inset: 0; opacity: 0.03;
        background-image: radial-gradient(var(--color-primary) 1px, transparent 1px);
        background-size: 40px 40px; pointer-events: none;
    }

    .hero-content { position: relative; z-index: 10; max-width: 56rem; margin: 0 auto; }
    .hero-title { font-size: 3rem; font-weight: 900; line-height: 1.1; margin-bottom: 1.5rem; letter-spacing: -0.05em; }
    .hero-title-small { font-size: 1.5rem; font-weight: 800; margin-bottom: 1.5rem; color: var(--color-text-main); }
    .highlight { color: transparent; background-clip: text; -webkit-background-clip: text; background-image: linear-gradient(to right, var(--color-primary), var(--color-primary-hover)); }
    .hero-subtitle { font-size: 1.125rem; color: var(--color-text-secondary); margin-bottom: 2.5rem; max-width: 42rem; margin-left: auto; margin-right: auto; line-height: 1.6; }

    @media (min-width: 640px) {
        .hero-title { font-size: 3.75rem; }
        .hero-title-small { font-size: 2rem; }
    }

    .hero-actions {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        align-items: stretch; /* Ensure equal height */
        justify-content: center;
        max-width: 42rem;
        margin: 0 auto;
    }

    @media (min-width: 640px) {
        .hero-actions {
            flex-direction: row;
            gap: 2rem;
        }
    }

    .upload-container, .sync-folder-btn {
        width: 100%;
        min-width: 200px;
        display: flex;
        flex-direction: column;
    }

    @media (min-width: 640px) {
        .upload-container, .sync-folder-btn {
            flex: 1 1 0px; /* Equal width on desktop */
        }
    }

    .drop-zone { position: relative; border: 2px dashed var(--color-border); border-radius: 1rem; padding: 1.5rem; background-color: var(--color-bg-surface); cursor: pointer; transition: all 0.3s ease; overflow: hidden; height: 100%; box-sizing: border-box; }
    .drop-zone:hover { border-color: var(--color-primary); transform: translateY(-2px); }
    .drop-content { position: relative; z-index: 10; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .upload-icon-circle { width: 3rem; height: 3rem; background-color: var(--color-bg-secondary); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 0.75rem; color: var(--color-primary); transition: transform 0.3s; }
    .drop-zone:hover .upload-icon-circle { transform: scale(1.1); }
    .drop-content h3 { font-size: 1rem; font-weight: 700; margin-bottom: 0.25rem; margin-top: 0; }
    .drop-content p { font-size: 0.8rem; color: var(--color-text-secondary); margin: 0; }
    
    .or-divider {
        font-size: 0.8rem;
        font-weight: 700;
        color: var(--color-text-muted);
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .sync-folder-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 1.5rem;
        background: var(--color-bg-surface);
        border: 2px solid var(--color-border);
        border-radius: 1rem;
        color: var(--color-text-main);
        cursor: pointer;
        transition: all 0.3s ease;
        height: 100%;
        box-sizing: border-box;
        width: 100%;
    }

    .sync-folder-btn:hover {
        border-color: var(--color-primary);
        transform: translateY(-2px);
    }
    
    .sync-folder-btn.disabled {
        opacity: 0.6;
        cursor: not-allowed;
        border-color: var(--color-border);
        background-color: var(--color-bg-secondary);
        transform: none !important;
    }
    
    .disabled-icon {
        background-color: var(--color-bg-secondary);
        color: var(--color-text-muted);
    }

    .icon-circle {
        width: 3rem; height: 3rem;
        background-color: var(--color-bg-secondary);
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        margin-bottom: 0.75rem;
        color: var(--color-primary);
        transition: transform 0.3s;
    }

    .sync-folder-btn:hover .icon-circle { transform: scale(1.1); }
    .btn-content h3 { font-size: 1rem; font-weight: 700; margin-bottom: 0.25rem; margin-top: 0; }
    .btn-content p { font-size: 0.8rem; color: var(--color-text-secondary); margin: 0; }

    .local-library {
        background-color: var(--color-bg-surface); /* Slightly different bg */
        border-bottom: 1px solid var(--color-border);
    }
    
    .local-pill { background-color: #10b981; /* Green for local */ }
    .local-cover { background: linear-gradient(135deg, #059669 0%, #10b981 100%); }
    .text-btn { background: none; border: none; padding: 0; font: inherit; cursor: pointer; text-decoration: underline; }

    /* Features Section */
    .features-section { padding: 5rem 1.5rem; border-top: 1px solid var(--color-border); }
    .features-grid { max-width: 1400px; margin: 0 auto; display: grid; grid-template-columns: 1fr; gap: 2rem; }
    @media (min-width: 768px) { .features-grid { grid-template-columns: repeat(3, 1fr); } }
    .feature-card { background-color: var(--color-bg-surface); border: 1px solid var(--color-border); border-radius: 1rem; padding: 1.5rem; display: flex; flex-direction: column; }
    .feature-icon { width: 3rem; height: 3rem; background-color: rgba(255, 102, 0, 0.1); color: var(--color-primary); border-radius: 0.75rem; display: flex; align-items: center; justify-content: center; margin-bottom: 1rem; }
    .feature-card h3 { font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem; }
    .feature-card p { color: var(--color-text-secondary); font-size: 0.95rem; line-height: 1.5; }

    footer { padding: 2rem; text-align: center; border-top: 1px solid var(--color-border); color: var(--color-text-muted); font-size: 0.875rem; }
    @media (max-width: 640px) { .mobile-hide { display: none; } }
</style>