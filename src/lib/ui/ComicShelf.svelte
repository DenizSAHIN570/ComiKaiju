<script lang="ts">
  import CoverArt from "$lib/ui/CoverArt.svelte";

  let {
    comics,
    autoOpenFirst = true,
    onopen,
    ondelete,
  }: {
    comics: Array<{
      id: string;
      name: string;
      size?: number;
      updatedAt?: number;
      thumbnail?: string;
      metadata?: {
        title?: string;
        currentPage?: number;
        totalPages?: number;
        coverThumbnail?: string;
      };
    }>;
    autoOpenFirst?: boolean;
    onopen?: (id: string) => void;
    ondelete?: (id: string) => void;
  } = $props();

  // svelte-ignore state_referenced_locally
  let openId = $state<string | null>(autoOpenFirst ? (comics[0]?.id ?? null) : null);

  function open(id: string) {
    openId = id;
  }

  function extension(name: string): string {
    const i = name.lastIndexOf(".");
    return i === -1 ? "" : name.slice(i + 1).toUpperCase();
  }

  function formatSize(bytes?: number): string {
    if (bytes == null) return "—";
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(1)} MB`;
    const kb = bytes / 1024;
    return `${kb.toFixed(1)} KB`;
  }

  function formatDate(ms?: number): string {
    if (ms == null) return "—";
    return new Date(ms).toLocaleDateString(undefined, { month: "short", day: "2-digit" });
  }

  function progressCaption(current?: number, total?: number): string {
    if (!total) return "";
    if (current != null && current + 1 >= total) return "finished";
    if (current == null || current === 0) return "not started";
    const pct = Math.round(((current + 1) / total) * 100);
    return `page ${current + 1} / ${total} · ${pct}%`;
  }

  function progressPercent(current?: number, total?: number): number {
    if (!total) return 0;
    if (current != null && current + 1 >= total) return 100;
    if (current == null || current === 0) return 0;
    return Math.min(100, Math.round(((current + 1) / total) * 100));
  }
</script>

<div class="shelf">
  {#each comics as comic, i (comic.id)}
    {@const isOpen = openId === comic.id}
    {@const title = comic.metadata?.title ?? comic.name}
    {@const thumb = comic.metadata?.coverThumbnail ?? comic.thumbnail}
    {@const total = comic.metadata?.totalPages}
    {@const current = comic.metadata?.currentPage}
    {@const kicker = i === 0 && autoOpenFirst ? "Now reading" : "Comic"}
    <div
      role="button"
      tabindex="0"
      aria-expanded={isOpen}
      aria-label={title}
      class="spine"
      class:open={isOpen}
      onmouseenter={() => open(comic.id)}
      onfocusin={() => open(comic.id)}
      onclick={() => open(comic.id)}
      onkeydown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open(comic.id);
        }
      }}
    >
      <span class="num">{String(i + 1).padStart(2, "0")}</span>
      <div class="art">
        <CoverArt {title} thumbnail={thumb} index={i + 1} />
      </div>
      {#if isOpen}
        <div class="info">
          <div class="k">{kicker}</div>
          <h4>{title}</h4>
          <div class="meta">
            <div class="row"><span class="lab">Pages</span><span class="val">{total ?? "—"}</span></div>
            <div class="row"><span class="lab">Size</span><span class="val">{formatSize(comic.size)}</span></div>
            <div class="row"><span class="lab">Format</span><span class="val">{extension(comic.name)}</span></div>
            <div class="row"><span class="lab">Added</span><span class="val">{formatDate(comic.updatedAt)}</span></div>
          </div>
          <div class="prog"><i style="width:{progressPercent(current, total)}%"></i></div>
          <div class="pcap">{progressCaption(current, total)}</div>
          <div class="actions">
            <button
              type="button"
              class="read"
              onclick={(e) => {
                e.stopPropagation();
                onopen?.(comic.id);
              }}
            >
              Read →
            </button>
            <button
              type="button"
              class="del"
              onclick={(e) => {
                e.stopPropagation();
                ondelete?.(comic.id);
              }}
              aria-label="Delete"
            >
              ⋯
            </button>
          </div>
        </div>
      {/if}
    </div>
  {/each}
</div>

<style>
  .shelf {
    display: flex;
    gap: 5px;
    /* 30px inset on every side, matching the Continue band's horizontal margin.
       Height carries the padding so the spines keep their 360px. */
    padding: 30px;
    height: 420px;
  }

  .spine {
    flex: 1 1 0;
    min-width: 0;
    position: relative;
    overflow: hidden;
    cursor: pointer;
    display: flex;
    align-items: stretch;
    background: transparent;
    border: none;
    padding: 0;
    margin: 0;
    text-align: left;
    font: inherit;
    color: inherit;
    transition:
      flex-basis 0.42s cubic-bezier(0.2, 0.7, 0.2, 1),
      flex-grow 0.42s cubic-bezier(0.2, 0.7, 0.2, 1);
  }

  .spine.open,
  .shelf:hover .spine:hover {
    flex: 0 0 490px;
  }

  .shelf:hover .spine {
    flex: 1 1 0;
  }

  .art {
    flex: none;
    width: 240px;
    position: relative;
    overflow: hidden;
  }

  .num {
    position: absolute;
    top: 9px;
    left: 0;
    right: 0;
    text-align: center;
    font-family: var(--font-base);
    font-size: 0.6rem;
    color: var(--color-text-muted);
    z-index: 4;
    transition: opacity 0.2s;
  }

  .spine:hover .num,
  .spine.open .num {
    opacity: 0;
  }

  .info {
    flex: none;
    width: 250px;
    background: var(--color-bg-surface);
    border-left: 1px solid var(--color-border);
    padding: 18px 20px;
    display: flex;
    flex-direction: column;
  }

  .info .k {
    font-family: var(--font-base);
    font-size: 0.6rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--color-text-muted);
  }

  .info h4 {
    margin: 6px 0 2px;
    font-size: 1.15rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    line-height: 1.05;
  }

  .info .meta {
    display: flex;
    flex-direction: column;
    border-top: 1px solid var(--color-border);
    margin-top: 16px;
  }

  .info .row {
    display: flex;
    justify-content: space-between;
    padding: 9px 0;
    border-bottom: 1px solid var(--color-border);
    font-size: 0.78rem;
  }

  .info .row .lab {
    color: var(--color-text-muted);
  }

  .info .row .val {
    font-family: var(--font-base);
    color: var(--color-text-main);
  }

  .info .prog {
    margin: 16px 0 6px;
    height: 2px;
    background: var(--color-bg-secondary);
  }

  .info .prog i {
    display: block;
    height: 100%;
    background: var(--color-primary);
  }

  .info .pcap {
    font-family: var(--font-base);
    font-size: 0.66rem;
    color: var(--color-text-secondary);
  }

  .info .actions {
    margin-top: auto;
    display: flex;
    gap: 10px;
    padding-top: 16px;
  }

  .info .read {
    flex: 1;
    background: var(--color-primary);
    color: var(--color-bg-main);
    border: none;
    border-radius: 3px;
    padding: 10px;
    font-weight: 700;
    font-size: 0.8rem;
    cursor: pointer;
    font-family: var(--font-base);
  }

  .info .del {
    background: transparent;
    border: 1px solid var(--color-border);
    color: var(--color-text-secondary);
    border-radius: 3px;
    padding: 10px 12px;
    font-size: 0.8rem;
    cursor: pointer;
    font-family: var(--font-base);
  }
</style>
