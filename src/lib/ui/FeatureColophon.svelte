<div class="colophon">
  <div class="col">
    <div class="kick">
      <span class="n">01</span>Offline
    </div>
    <h5>Reads without a connection</h5>
    <p>Your whole library lives in the browser and works on a plane. Install it as an app for a native feel.</p>
  </div>

  <div class="col">
    <div class="kick">
      <span class="n">02</span>Private
    </div>
    <h5>Nothing leaves your device</h5>
    <p>No accounts, no servers, no tracking. Comics are yours alone — reading stays personal.</p>
  </div>

  <div class="col">
    <div class="kick">
      <span class="n">03</span>Fast
    </div>
    <h5>Instant pages, deduped storage</h5>
    <p>WebAssembly extraction and smart caching keep turns instant and storage lean.</p>
  </div>
</div>

<style>
  .colophon {
    margin: 0 30px;
    border-top: 1px solid var(--color-border);
    display: grid;
    grid-template-columns: repeat(3, 1fr);
  }

  .col {
    padding: 22px 26px 24px;
    border-left: 1px solid var(--color-border);
    transition: background 0.18s;
  }

  .col:first-child {
    border-left: none;
    padding-left: 0;
  }

  .col:hover {
    background: var(--color-bg-secondary);
  }

  .col .kick {
    font-family: var(--font-base);
    font-size: 0.62rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--color-text-muted);
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .col .kick .n {
    color: var(--color-primary);
  }

  .col h5 {
    margin: 12px 0 6px;
    font-size: 1rem;
    font-weight: 750;
    letter-spacing: -0.01em;
  }

  .col p {
    margin: 0;
    font-size: 0.82rem;
    line-height: 1.5;
    color: var(--color-text-secondary);
  }
</style>
