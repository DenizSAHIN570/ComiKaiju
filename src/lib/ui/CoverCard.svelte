<script lang="ts">
  import CoverArt from "$lib/ui/CoverArt.svelte";

  let {
    title,
    thumbnail,
    index,
    meta,
    progress,
    onopen,
    ondelete,
  }: {
    title: string;
    thumbnail?: string;
    index?: number;
    meta?: string;
    progress?: number;
    onopen?: () => void;
    ondelete?: () => void;
  } = $props();

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onopen?.();
    }
  }

  function handleDelete(e: MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    ondelete?.();
  }
</script>

<div
  class="card"
  role="button"
  tabindex="0"
  aria-label={title}
  onclick={() => onopen?.()}
  onkeydown={handleKeydown}
>
  <div class="cover">
    <CoverArt {title} {thumbnail} {index} />
    {#if ondelete}
      <button type="button" class="menu" onclick={handleDelete} aria-label="Delete">
        ⋯
      </button>
    {/if}
    {#if progress && progress > 0}
      <div class="pbar"><i style="width:{Math.min(100, Math.round(progress * 100))}%"></i></div>
    {/if}
  </div>
  <div class="t">{title}</div>
  {#if meta}
    <div class="m">{meta}</div>
  {/if}
</div>

<style>
  .card {
    cursor: pointer;
    display: block;
    text-align: left;
  }

  .card:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  .cover {
    aspect-ratio: 2 / 3;
    position: relative;
    overflow: hidden;
    border: 1px solid var(--color-border);
    border-radius: 0;
    background: var(--color-bg-surface);
    transition: border-color 0.15s;
  }

  .card:hover .cover,
  .card:focus-visible .cover {
    border-color: var(--color-primary);
  }

  .menu {
    position: absolute;
    top: 8px;
    right: 8px;
    z-index: 5;
    width: 26px;
    height: 26px;
    border-radius: 3px;
    background: color-mix(in srgb, var(--color-text-main) 55%, transparent);
    color: var(--color-bg-main);
    border: none;
    display: grid;
    place-items: center;
    opacity: 0;
    transition: opacity 0.15s, background 0.15s;
    cursor: pointer;
    font-family: var(--font-base);
    font-size: 0.9rem;
    line-height: 1;
  }

  .card:hover .menu,
  .card:focus-visible .menu {
    opacity: 1;
  }

  .menu:hover {
    background: var(--color-status-error);
  }

  .pbar {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 3px;
    background: color-mix(in srgb, var(--color-text-main) 35%, transparent);
    z-index: 4;
  }

  .pbar i {
    display: block;
    height: 100%;
    background: var(--color-primary);
  }

  .t {
    margin-top: 10px;
    font-family: var(--font-base);
    font-size: 0.82rem;
    font-weight: 650;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--color-text-main);
  }

  .m {
    margin-top: 3px;
    font-family: var(--font-base);
    font-size: 0.66rem;
    color: var(--color-text-muted);
  }
</style>
