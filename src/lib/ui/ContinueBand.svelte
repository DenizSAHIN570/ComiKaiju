<script lang="ts">
  let {
    comic,
    pageImage,
    onresume,
    onlibrary,
  }: {
    comic: { title: string; currentPage: number; totalPages: number; updatedAt?: number };
    pageImage?: string;
    onresume?: () => void;
    onlibrary?: () => void;
  } = $props();

  function progressCaption(current: number, total: number): string {
    if (!total) return "";
    if (current != null && current + 1 >= total) return "finished";
    if (current == null || current === 0) return "not started";
    return `page ${current + 1} of ${total}`;
  }

  function progressPct(current: number, total: number): number {
    if (!total) return 0;
    if (current != null && current + 1 >= total) return 100;
    if (current == null || current === 0) return 0;
    return Math.min(100, Math.max(0, ((current + 1) / total) * 100));
  }

  const caption = $derived(progressCaption(comic.currentPage, comic.totalPages));
  const progressPercent = $derived(progressPct(comic.currentPage, comic.totalPages));

  function relativeTime(ms?: number): string {
    if (ms == null) return "";
    const diffMs = Date.now() - ms;
    const day = 24 * 60 * 60 * 1000;
    if (diffMs < 0 || diffMs < 60 * 60 * 1000) return "just now";
    if (diffMs < day) {
      const hours = Math.round(diffMs / (60 * 60 * 1000));
      return `${hours} hour${hours === 1 ? "" : "s"} ago`;
    }
    const days = Math.round(diffMs / day);
    if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
    const months = Math.round(days / 30);
    return `${months} month${months === 1 ? "" : "s"} ago`;
  }

  const leftOff = $derived(relativeTime(comic.updatedAt));

  const subLine = $derived(
    [caption, leftOff ? `left off ${leftOff}` : ""].filter(Boolean).join(" · "),
  );
</script>

<div class="continue">
  <div class="pagebg">
    {#if pageImage}
      <div class="page-image" style="background-image:url({pageImage})"></div>
    {:else}
      <div class="page">
        <div class="panel wide"></div>
        <div class="panel"></div>
        <div class="panel"></div>
        <div class="panel"></div>
        <div class="panel"></div>
      </div>
    {/if}
  </div>
  <div class="scrim"></div>
  <div class="c-inner">
    <div class="eye">Continue reading</div>
    <h2>{comic.title}</h2>
    <div class="c-sub">{subLine}</div>
    <div class="c-line"><i style="width:{progressPercent}%"></i></div>
    <div class="c-cta">
      <button type="button" class="btn" onclick={() => onresume?.()}>▶ Resume</button>
      <button type="button" class="btn ghost" onclick={() => onlibrary?.()}>Library</button>
    </div>
  </div>
</div>

<style>
  .continue {
    position: relative;
    margin: 0 30px;
    height: 480px;
    /* Parent is a flex column; without this the band compresses below its set height. */
    flex-shrink: 0;
    border-bottom: 1px solid var(--color-border);
    overflow: hidden;
  }

  .pagebg {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: 62%;
    background: var(--color-bg-surface);
    overflow: hidden;
  }

  .page-image {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center;
  }

  .page {
    position: absolute;
    inset: 14px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1.1fr 0.9fr 0.9fr;
    gap: 10px;
  }

  .panel {
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    position: relative;
    overflow: hidden;
  }

  .panel.wide {
    grid-column: 1 / 3;
  }

  .scrim {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      var(--color-bg-main) 34%,
      color-mix(in srgb, var(--color-bg-main) 60%, transparent) 44%,
      transparent 62%
    );
  }

  .c-inner {
    position: relative;
    z-index: 2;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    max-width: 52%;
    padding: 0 4px;
  }

  .eye {
    font-family: var(--font-base);
    font-size: 0.66rem;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--color-text-muted);
  }

  .c-inner h2 {
    margin: 12px 0 7px;
    font-size: 2.6rem;
    font-weight: 900;
    letter-spacing: -0.035em;
    line-height: 0.95;
  }

  .c-sub {
    font-family: var(--font-base);
    font-size: 0.76rem;
    color: var(--color-text-secondary);
  }

  .c-line {
    margin: 20px 0 22px;
    height: 2px;
    background: var(--color-bg-secondary);
    max-width: 340px;
  }

  .c-line i {
    display: block;
    height: 100%;
    background: var(--color-primary);
  }

  .c-cta {
    display: flex;
    gap: 14px;
    align-items: center;
  }

  .btn {
    background: var(--color-primary);
    color: var(--color-bg-main);
    border: none;
    border-radius: 3px;
    padding: 11px 20px;
    font-weight: 700;
    font-size: 0.84rem;
    font-family: var(--font-base);
    cursor: pointer;
  }

  .btn.ghost {
    background: transparent;
    border: 1px solid var(--color-border);
    color: var(--color-text-main);
  }
</style>
