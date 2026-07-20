<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { comicStorage } from '$lib/storage/comicStorage';
	import type { ComicBook, FileSystemItem } from '../../types/comic';
	import { setComic, setLoading, setError } from '$lib/store/session';
	import ArchiveManager from '$lib/archive/archiveManager';
	import { logger } from '$lib/services/logger';
	import { directoryService, type DirectoryFile } from '$lib/services/directoryService';
	import AppBar from '$lib/ui/AppBar.svelte';
	import SiteFooter from '$lib/ui/SiteFooter.svelte';
	import AddSheet from '$lib/ui/AddSheet.svelte';
	import CoverCard from '$lib/ui/CoverCard.svelte';

	let items = $state<FileSystemItem[]>([]);
	let loading = $state(true);
	let metadataMap = $state<Record<string, ComicBook>>({});
	let addOpen = $state(false);
	let sort = $state<'recent' | 'name' | 'size'>('recent');

	const sortedItems = $derived.by(() => {
		const arr = [...items];
		if (sort === 'name') {
			arr.sort((a, b) => a.name.localeCompare(b.name));
		} else if (sort === 'size') {
			arr.sort((a, b) => (b.size ?? 0) - (a.size ?? 0));
		} else {
			arr.sort((a, b) => b.updatedAt - a.updatedAt);
		}
		return arr;
	});

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
		} catch {
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
			await goto(resolve('/reader'));
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
			const entries = await Promise.all(
				items.map(async (item) => [item.id, await comicStorage.getComicMetadata(item.id)] as const)
			);
			const map: Record<string, ComicBook> = {};
			for (const [id, meta] of entries) {
				if (meta) map[id] = meta;
			}
			metadataMap = map;
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
			await goto(resolve('/reader'));
		} catch (error) {
			logger.error('Library', 'Error opening comic', error);
			setError('Failed to open comic', 'error');
		} finally {
			setLoading(false);
		}
	}

	async function deleteItem(item: FileSystemItem) {
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

	function stripExt(name: string) {
		return name.replace(/\.(cbz|zip|cbr|rar)$/i, '');
	}

	function itemMeta(item: FileSystemItem) {
		const meta = metadataMap[item.id];
		const size = formatSize(item.size);
		return meta?.totalPages ? `${meta.totalPages}p · ${size}` : size;
	}

	function itemProgress(item: FileSystemItem) {
		const meta = metadataMap[item.id];
		if (!meta?.totalPages) return 0;
		const current = meta.currentPage ?? 0;
		return Math.min(1, (current + 1) / meta.totalPages);
	}
</script>

<svelte:head>
	<title>Library - ComiKaiju</title>
	<meta name="description" content="Browse your imported comic book library. All comics are stored locally on your device." />
</svelte:head>

<AppBar active="library" onadd={() => (addOpen = true)} />

<div class="lib-sub">
    <span>{items.length} comics</span>
    <label class="sort">
        sorted by
        <select bind:value={sort}>
            <option value="recent">recent</option>
            <option value="name">name</option>
            <option value="size">size</option>
        </select>
    </label>
</div>

{#if folderHandle}
    <div class="section-head">
        <h2>Local · {folderHandle.name}</h2>
        <button type="button" class="folder-btn" onclick={openFolder}>Change folder</button>
    </div>
    {#if folderLoading}
        <div class="state-msg">Scanning folder…</div>
    {:else if folderFiles.length === 0}
        <div class="state-msg">No comic files found in this folder.</div>
    {:else}
        <div class="libgrid">
            {#each folderFiles as file (file.name)}
                <CoverCard
                    title={stripExt(file.name)}
                    meta="Local file"
                    onopen={() => openLocalFile(file)}
                />
            {/each}
        </div>
    {/if}
{:else}
    <div class="section-head">
        <h2>Local folder</h2>
        <button type="button" class="folder-btn" onclick={openFolder}>Open folder</button>
    </div>
{/if}

<div class="section-head">
    <h2>Imported</h2>
</div>

{#if loading}
    <div class="state-msg">Loading…</div>
{:else if items.length === 0}
    <div class="state-msg empty">
        <p>No comics yet.</p>
        <a href={resolve('/')}>Go upload some</a>
    </div>
{:else}
    <div class="libgrid">
        {#each sortedItems as item, i (item.id)}
            <CoverCard
                title={stripExt(item.name)}
                thumbnail={item.thumbnail}
                index={i + 1}
                meta={itemMeta(item)}
                progress={itemProgress(item)}
                onopen={() => openComic(item)}
                ondelete={() => deleteItem(item)}
            />
        {/each}
    </div>
{/if}

<SiteFooter />

<AddSheet open={addOpen} onclose={() => (addOpen = false)} oncomplete={loadLibrary} />

<style>
    .lib-sub {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        margin: 0 30px;
        padding: 16px 0 0;
        font-family: var(--font-base);
        font-size: 0.72rem;
        color: var(--color-text-muted);
        letter-spacing: 0.04em;
    }

    .sort {
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .sort select {
        background: transparent;
        color: var(--color-text-main);
        border: 1px solid var(--color-border);
        border-radius: 3px;
        font-family: var(--font-base);
        font-size: 0.72rem;
        padding: 3px 6px;
        cursor: pointer;
    }

    .section-head {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        margin: 22px 30px 0;
    }

    .section-head h2 {
        font-family: var(--font-base);
        font-size: 0.95rem;
        font-weight: 700;
        margin: 0;
        color: var(--color-text-main);
    }

    .folder-btn {
        background: transparent;
        border: 1px solid var(--color-border);
        border-radius: 3px;
        color: var(--color-text-secondary);
        font-family: var(--font-base);
        font-size: 0.72rem;
        padding: 6px 10px;
        cursor: pointer;
        transition: border-color 0.15s, color 0.15s;
    }

    .folder-btn:hover {
        border-color: var(--color-primary);
        color: var(--color-primary);
    }

    .libgrid {
        padding: 20px 30px 30px;
        display: grid;
        grid-template-columns: repeat(6, 1fr);
        gap: 24px 22px;
    }

    .state-msg {
        margin: 20px 30px 30px;
        color: var(--color-text-secondary);
        font-family: var(--font-base);
    }

    .state-msg.empty {
        text-align: center;
        padding: 3rem 0;
    }

    .state-msg.empty a {
        color: var(--color-primary);
        text-decoration: underline;
    }

    @media (max-width: 1100px) {
        .libgrid {
            grid-template-columns: repeat(4, 1fr);
        }
    }

    @media (max-width: 700px) {
        .libgrid {
            grid-template-columns: repeat(2, 1fr);
        }
    }
</style>
