<script lang="ts">
	import { onMount } from 'svelte';
	import { comicStorage } from '$lib/storage/comicStorage.js';
	import { setLoading, setError, setComic } from '$lib/store/session.js';
	import { handleUrlImport, isHttpUrl } from '$lib/services/comicProcessor.js';
	import { logger } from '$lib/services/logger';
	import ArchiveManager from '$lib/archive/archiveManager.js';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { ComicBook, FileSystemItem } from '../types/comic';
	import AppBar from '$lib/ui/AppBar.svelte';
	import ContinueBand from '$lib/ui/ContinueBand.svelte';
	import ComicShelf from '$lib/ui/ComicShelf.svelte';
	import FeatureColophon from '$lib/ui/FeatureColophon.svelte';
	import SiteFooter from '$lib/ui/SiteFooter.svelte';
	import AddSheet from '$lib/ui/AddSheet.svelte';
	import ImportPanel from '$lib/ui/ImportPanel.svelte';
	import UrlImportConfirm from '$lib/ui/UrlImportConfirm.svelte';

	let addOpen = $state(false);
	let pendingImportUrl = $state<string | null>(null);
	let recentComics = $state<(FileSystemItem & { metadata?: ComicBook })[]>([]);

	onMount(async () => {
		const urlParam = new URL(window.location.href).searchParams.get('url');
		if (urlParam && isHttpUrl(urlParam)) {
			pendingImportUrl = urlParam;
			const cleanUrl = new URL(window.location.href);
			cleanUrl.searchParams.delete('url');
			window.history.replaceState({}, '', cleanUrl.toString());
		}

		try {
			await comicStorage.init();
			await loadComics();
		} catch (error) {
			logger.error('Home', 'Failed to initialize', error);
			setError('Failed to initialize application', 'error');
		}
	});

	async function loadComics() {
		try {
			const files = await comicStorage.getRecentFiles(12);

			recentComics = await Promise.all(
				files.map(async (file) => {
					const metadata = await comicStorage.getComicMetadata(file.id);
					return {
						...file,
						metadata: metadata || undefined
					};
				})
			);
		} catch (err) {
			logger.error('Home', 'Failed to load comics', err);
		}
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
					pages: pages.map((p) => ({ filename: p.filename, index: p.index })),
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
			await goto(resolve('/reader'));
		} catch (error) {
			logger.error('Home', 'Failed to open comic', error);
			setLoading(false);
			setError('Failed to open comic: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error');
		} finally {
			setTimeout(() => setLoading(false), 500);
		}
	}

	async function deleteComic(item: FileSystemItem, event?: MouseEvent) {
		event?.stopPropagation();
		event?.preventDefault();

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

	function openById(id: string) {
		const item = recentComics.find((c) => c.id === id);
		if (item) openRecentComic(item);
	}

	function deleteById(id: string) {
		const item = recentComics.find((c) => c.id === id);
		if (item) deleteComic(item);
	}

	async function confirmUrlImport() {
		const url = pendingImportUrl;
		pendingImportUrl = null;
		if (url) {
			await handleUrlImport(url, loadComics);
		}
	}

	function cancelUrlImport() {
		pendingImportUrl = null;
	}

	const hasComics = $derived(recentComics.length > 0);

	const lastRead = $derived.by(() => {
		if (recentComics.length === 0) return null;
		return recentComics.reduce((best, item) => {
			const itemTime = item.metadata?.lastRead ? new Date(item.metadata.lastRead).getTime() : item.updatedAt;
			const bestTime = best.metadata?.lastRead ? new Date(best.metadata.lastRead).getTime() : best.updatedAt;
			return itemTime > bestTime ? item : best;
		});
	});

	const shelfComics = $derived(recentComics.filter((c) => c.id !== lastRead?.id));

	const lastReadComic = $derived(
		lastRead
			? {
					title: lastRead.metadata?.title ?? lastRead.name.replace(/\.(cbz|zip|cbr|rar)$/i, ''),
					currentPage: lastRead.metadata?.currentPage ?? 0,
					totalPages: lastRead.metadata?.totalPages ?? 0,
					updatedAt: lastRead.metadata?.lastRead
						? new Date(lastRead.metadata.lastRead).getTime()
						: lastRead.updatedAt
				}
			: null
	);

	const lastReadPageImage = $derived(
		lastRead?.metadata?.lastReadThumbnail ?? lastRead?.metadata?.coverThumbnail ?? lastRead?.thumbnail
	);
</script>

<svelte:head>
	<title>ComiKaiju - Offline Comic Reader</title>
	<meta
		name="description"
		content="A private, offline-first comic book reader for the web. Supports CBZ/CBR files, works offline via PWA, and respects your privacy."
	/>
</svelte:head>

<div class="page">
	<AppBar active="home" onadd={() => (addOpen = true)} />

	{#if hasComics && lastRead && lastReadComic}
		<ContinueBand
			comic={lastReadComic}
			pageImage={lastReadPageImage}
			onresume={() => openById(lastRead.id)}
			onlibrary={() => goto(resolve('/library'))}
		/>
		<ComicShelf comics={shelfComics} autoOpenFirst onopen={openById} ondelete={deleteById} />
	{:else}
		<section class="home-hero">
			<div class="hero-scrim"></div>
			<div class="hero-inner">
				<h1 class="hero-title">
					<span style="color:var(--color-secondary)">Read</span> your
					<span style="color:var(--color-secondary)">comics</span> right in your browser
				</h1>
				<p class="hero-lead">
					Import a CBZ or CBR and start reading instantly. Everything stays on your device — no
					account, no server, works offline.
				</p>
				<ImportPanel oncomplete={loadComics} />
			</div>
		</section>
	{/if}

	<FeatureColophon />
	<SiteFooter />
</div>

<AddSheet open={addOpen} onclose={() => (addOpen = false)} oncomplete={loadComics} />

{#if pendingImportUrl}
	<UrlImportConfirm url={pendingImportUrl} onConfirm={confirmUrlImport} onCancel={cancelUrlImport} />
{/if}

<style>
	.page {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		background-color: var(--color-bg-main);
		color: var(--color-text-main);
		font-family: var(--font-base);
	}

	/* Empty-state hero: drop a background photo (e.g. scattered comics on a table) via
	   --home-hero-bg without touching markup. A theme-safe scrim keeps the headline and
	   import panel legible over any photo, in either theme. */
	.home-hero {
		position: relative;
		overflow: hidden;
		padding: 76px 30px 80px;
		border-bottom: 1px solid var(--color-border);
		text-align: center;
		background-image: var(--home-hero-bg, none);
		background-size: cover;
		background-position: center;
	}

	.hero-scrim {
		position: absolute;
		inset: 0;
		background: color-mix(in srgb, var(--color-bg-main) 78%, transparent);
	}

	.hero-inner {
		position: relative;
		z-index: 2;
		max-width: 640px;
		margin: 0 auto;
	}

	.hero-title {
		margin: 0 0 14px;
		font-size: 2.7rem;
		font-weight: 900;
		letter-spacing: -0.04em;
		line-height: 1.02;
		font-family: var(--font-base);
		color: var(--color-text-main);
	}

	.hero-lead {
		margin: 0 auto 30px;
		font-size: 1rem;
		line-height: 1.6;
		color: var(--color-text-secondary);
		max-width: 44ch;
		font-family: var(--font-base);
	}

	@media (max-width: 640px) {
		.hero-title {
			font-size: 2.1rem;
		}
	}
</style>
