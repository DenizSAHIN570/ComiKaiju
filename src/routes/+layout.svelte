<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { error, clearError, isLoading, loadingMessage, downloadProgress, setError } from '$lib/store/session.js';
	import { formatBytes } from '$lib/utils/format.js';
	import { themeStore } from '$lib/theme/themeStore';
	import { logger } from '$lib/services/logger';
	import { initShortcuts } from '$lib/services/keyboardShortcuts';
	import { dev } from '$app/environment';
	
	onMount(() => {
	  // Initialize services
	  themeStore.init();
	  initShortcuts();

		// Register Service Worker for offline support (Production only)
		if (!dev && 'serviceWorker' in navigator) {
			navigator.serviceWorker.register('/service-worker.js', {
				type: 'module'
			}).then((registration) => {
				logger.info('PWA', 'Service Worker registered', { scope: registration.scope });
			}).catch((error) => {
				logger.error('PWA', 'Service Worker registration failed', error);
			});
		}
		
		// Global Error Handlers
		window.onerror = (msg, url, lineNo, columnNo, err) => {
			const errorMessage = typeof msg === 'string' ? msg : 'An unexpected error occurred';
			logger.error('Global', errorMessage, { url, lineNo, columnNo, err });
			setError(errorMessage, 'critical');
			return false;
		};

		window.onunhandledrejection = (event) => {
			const reason = event.reason;
			const msg = reason instanceof Error ? reason.message : String(reason);
			logger.error('Global', `Unhandled Rejection: ${msg}`, reason);
			setError(`Unhandled Error: ${msg}`, 'error');
		};

		// Track mouse usage for accessibility
		let isMouseUser = false;
		function handleMouseDown() {
			isMouseUser = true;
			document.body.classList.add('mouse-user');
		}
		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === 'Tab') {
				isMouseUser = false;
				document.body.classList.remove('mouse-user');
			}
		}
		
		document.addEventListener('mousedown', handleMouseDown);
		document.addEventListener('keydown', handleKeyDown);
		
		return () => {
			document.removeEventListener('mousedown', handleMouseDown);
			document.removeEventListener('keydown', handleKeyDown);
			window.onerror = null;
			window.onunhandledrejection = null;
		};
	});
	
	// Auto-clear non-critical errors
	$: if ($error && $error.severity !== 'critical') {
		setTimeout(() => {
			clearError();
		}, 10000);
	}
</script>

<main>
	<slot />
</main>

{#if $isLoading}
	<div class="loading-overlay" role="status" aria-label="Loading">
		<div class="loading-content bg-bg-surface text-text-main">
			<div class="loading-spinner border-border border-t-primary"></div>
			<p>{$loadingMessage || 'Loading...'}</p>
			{#if $downloadProgress}
				{#if $downloadProgress.total}
					<div class="download-progress-bar">
						<div
							class="download-progress-fill"
							style="width: {Math.min(100, Math.round(($downloadProgress.loaded / $downloadProgress.total) * 100))}%"
						></div>
					</div>
					<p class="download-progress-label">
						{Math.min(100, Math.round(($downloadProgress.loaded / $downloadProgress.total) * 100))}%
					</p>
				{:else}
					<div class="download-progress-bar indefinite">
						<div class="download-progress-fill"></div>
					</div>
					<p class="download-progress-label">{formatBytes($downloadProgress.loaded)} downloaded</p>
				{/if}
			{/if}
		</div>
	</div>
{/if}

{#if $error}
	<div class="global-error {$error.severity}" role="alert">
		<div class="error-content">
			<span class="error-icon">
				{#if $error.severity === 'critical'}🛑
				{:else if $error.severity === 'warning'}⚠️
				{:else if $error.severity === 'info'}ℹ️
				{:else}❌{/if}
			</span>
			<div class="error-details">
				<span class="error-message">{$error.message}</span>
				{#if $error.code}
					<span class="error-code">Code: {$error.code}</span>
				{/if}
			</div>
			<button class="error-dismiss" on:click={clearError} aria-label="Dismiss">✕</button>
		</div>
	</div>
{/if}

<style>
	main {
		min-height: 100vh;
		background-color: var(--color-bg-main);
		color: var(--color-text-main);
	}

	.loading-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 9999;
		backdrop-filter: blur(2px);
	}

	.loading-content {
		text-align: center;
		padding: 2rem;
		border-radius: 12px;
		box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
		min-width: 200px;
		background-color: var(--color-bg-surface);
		color: var(--color-text-main);
	}

	.loading-spinner {
		width: 40px;
		height: 40px;
		border: 4px solid var(--color-border);
		border-top: 4px solid var(--color-primary);
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin: 0 auto 1rem;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	.download-progress-bar {
		width: 100%;
		height: 6px;
		background-color: var(--color-border);
		border-radius: 3px;
		overflow: hidden;
		margin-top: 0.75rem;
	}

	.download-progress-fill {
		height: 100%;
		background-color: var(--color-primary);
		transition: width 0.2s ease;
	}

	.download-progress-bar.indefinite .download-progress-fill {
		width: 40%;
		animation: download-indefinite 1.2s ease-in-out infinite;
	}

	@keyframes download-indefinite {
		0% { transform: translateX(-100%); }
		100% { transform: translateX(250%); }
	}

	.download-progress-label {
		margin: 0.5rem 0 0;
		font-size: 0.85rem;
		color: var(--color-text-main);
	}
	
	.global-error {
		position: fixed;
		top: 1rem;
		right: 1rem;
		z-index: 10000;
		width: 90%;
		max-width: 400px;
		border-radius: 6px;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
		animation: slideIn 0.3s ease-out;
		overflow: hidden;
	}

	.global-error.critical { background: #991b1b; color: white; }
	.global-error.error { background: var(--color-status-error); color: white; }
	.global-error.warning { background: var(--color-status-warning); color: black; }
	.global-error.info { background: var(--color-primary); color: white; }
	
	@keyframes slideIn {
		from { transform: translateX(100%); opacity: 0; }
		to { transform: translateX(0); opacity: 1; }
	}
	
	.error-content {
		display: flex;
		align-items: flex-start;
		padding: 1rem;
		gap: 0.75rem;
	}
	
	.error-details {
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	.error-code {
		font-size: 0.75rem;
		opacity: 0.8;
		margin-top: 0.25rem;
	}
	
	.error-dismiss {
		background: none;
		border: none;
		color: currentColor;
		font-size: 1.25rem;
		cursor: pointer;
		padding: 0;
		line-height: 1;
		opacity: 0.7;
	}
	
	.error-dismiss:hover { opacity: 1; }
</style>
