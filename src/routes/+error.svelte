<script lang="ts">
	import { page } from '$app/stores';
	import ThemeMenu from '$lib/ui/ThemeMenu.svelte';
</script>

<svelte:head>
	<title>{$page.status}: {$page.error?.message || 'Error'} - ComiKaiju</title>
</svelte:head>

<div class="min-h-screen bg-bg-main text-text-main flex flex-col items-center justify-center p-4 relative overflow-hidden">
	<!-- Background pattern -->
	<div class="absolute inset-0 opacity-5 pointer-events-none" 
		style="background-image: radial-gradient(var(--color-primary) 1px, transparent 1px); background-size: 30px 30px;">
	</div>

	<div class="relative z-10 text-center max-w-md w-full">
		<h1 class="text-9xl font-black text-primary mb-4 tracking-tighter opacity-20 select-none">
			{$page.status}
		</h1>
		
		<div class="absolute inset-0 flex flex-col items-center justify-center">
			<div class="bg-bg-surface p-8 rounded-2xl shadow-2xl border border-border backdrop-blur-sm">
				<h2 class="text-2xl font-bold mb-2">Page Not Found</h2>
				<p class="text-text-secondary mb-6">
					{$page.error?.message || "The comic you're looking for seems to be in another dimension."}
				</p>
				
				<a 
					href="/"
					class="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-bold shadow-lg shadow-primary/20"
				>
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" stroke-linecap="round" stroke-linejoin="round"/>
					</svg>
					Return Home
				</a>
			</div>
		</div>
	</div>

	<div class="absolute top-4 right-4">
		<ThemeMenu />
	</div>
</div>
