<script lang="ts">
  let { title, thumbnail, index }: { title: string; thumbnail?: string; index?: number } = $props();

  // Deterministic hue from title (placeholder art only — content, not chrome)
  const hue = $derived([...title].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7));
  const idx = $derived(index != null ? "#" + String(index).padStart(3, "0") : "");

  const bg = $derived(`hsl(${hue} 45% 18%)`);
  const band = $derived(`hsl(${hue} 60% 42%)`);
  const text = $derived(`hsl(${hue} 30% 92%)`);
  const coverStyle = $derived(`--bg:${bg};--band:${band};--text:${text}`);
</script>

{#if thumbnail}
  <img src={thumbnail} alt={title} style="width:100%;height:100%;object-fit:cover" />
{:else}
  <div class="cover" style={coverStyle}>
    <div class="band"></div>
    <div class="title">{title}</div>
    {#if idx}
      <div class="index">{idx}</div>
    {/if}
  </div>
{/if}

<style>
  .cover {
    position: absolute;
    inset: 0;
    background: var(--bg);
    display: flex;
    flex-direction: column;
  }

  .band {
    position: absolute;
    left: 0;
    right: 0;
    height: 32%;
    background: var(--band);
    top: 32%;
  }

  .title {
    position: absolute;
    left: 14px;
    right: 14px;
    top: 50%;
    transform: translateY(-50%);
    font-family: var(--font-base);
    font-weight: 900;
    line-height: 0.86;
    letter-spacing: -0.02em;
    font-size: 2.4rem;
    text-transform: uppercase;
    color: var(--text);
  }

  .index {
    position: absolute;
    left: 14px;
    top: 12px;
    font-family: var(--font-base);
    font-size: 0.58rem;
    letter-spacing: 0.1em;
    color: var(--text);
    opacity: 0.85;
  }
</style>
