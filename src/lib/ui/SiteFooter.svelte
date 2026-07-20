<script lang="ts">
  const year = new Date().getFullYear();
</script>

<footer>
  <div class="cp">© {year} ComiKaiju. Built for readers.</div>
  <div class="pw">
    Powered by
    <a href="https://svelte.dev" target="_blank" rel="noopener noreferrer">Svelte</a>
    .
  </div>
</footer>

<style>
  footer {
    /* Sticky-footer: fills the gap when the page is shorter than the viewport. */
    margin-top: auto;
    padding: 26px 30px 20px;
    border-top: 1px solid var(--color-border);
    text-align: center;
    color: var(--color-text-muted);
  }

  .cp {
    font-size: 0.8rem;
  }

  .pw {
    margin-top: 6px;
    font-size: 0.72rem;
    opacity: 0.8;
  }

  .pw a {
    color: var(--color-primary);
    text-decoration: none;
  }
</style>
