<script lang="ts">
  import { premadeFilters } from '$lib/store/filterStore';
  import type { FilterConfig } from '$lib/store/filterStore';

  export let activeConfig: FilterConfig | null = null;
  export let customFilters: FilterConfig[] = [];
  export let onSelect: (config: FilterConfig | null) => void;
  export let onEdit: (config: FilterConfig) => void;
  export let onDelete: (id: string) => void;
  export let onOpenEditor: () => void;

  let isMenuOpen = false;

  const toggleMenu = () => (isMenuOpen = !isMenuOpen);

  function pick(config: FilterConfig | null) {
    onSelect(config);
    isMenuOpen = false;
  }

  function edit(config: FilterConfig) {
    onEdit(config);
    isMenuOpen = false;
  }

  function create() {
    onOpenEditor();
    isMenuOpen = false;
  }
</script>

<div class="filter-container">
  {#if isMenuOpen}
    <div class="filter-menu">
      <ul>
        <li>
          <button class:active={!activeConfig} on:click={() => pick(null)}>None</button>
        </li>

        <li class="section">Premade</li>
        {#each premadeFilters as filter (filter.id)}
          <li>
            <button
              class:active={activeConfig?.id === filter.id}
              on:click={() => pick(structuredClone(filter))}
            >
              {filter.name}
            </button>
          </li>
        {/each}

        {#if customFilters.length}
          <li class="section">My Filters</li>
          {#each customFilters as filter (filter.id)}
            <li class="custom-row">
              <button
                class="custom-name"
                class:active={activeConfig?.id === filter.id}
                on:click={() => pick(structuredClone(filter))}
              >
                {filter.name}
              </button>
              <button class="icon" title="Edit" on:click|stopPropagation={() => edit(filter)}>✎</button>
              <button class="icon" title="Delete" on:click|stopPropagation={() => onDelete(filter.id)}>🗑</button>
            </li>
          {/each}
        {/if}

        <li class="divider"></li>
        <li>
          <button on:click={create}>⚙️ Create Custom Filter</button>
        </li>
      </ul>
    </div>
  {/if}
  <button class="filter-toggle" on:click={toggleMenu} aria-label="Open filter menu">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
      <path d="M12 4c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
      <path d="M12 14c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
    </svg>
  </button>
</div>

<style>
.filter-container {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  z-index: 20;
}

.filter-toggle {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%);
  color: white;
  border: none;
  border-radius: 50%;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 6px 18px color-mix(in srgb, var(--color-primary) 35%, transparent);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.filter-toggle:hover {
  transform: translateY(-2px) scale(1.05);
  box-shadow: 0 10px 24px color-mix(in srgb, var(--color-primary) 45%, transparent);
}

.filter-menu {
  position: absolute;
  bottom: 68px;
  right: 0;
  background: var(--color-bg-secondary);
  border-radius: 8px;
  box-shadow: 0 10px 30px color-mix(in srgb, var(--color-bg-main) 40%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-text-main) 10%, transparent);
  width: 230px;
  max-height: 70vh;
  overflow-y: auto;
}

.filter-menu ul {
  list-style: none;
  margin: 0;
  padding: 0.5rem;
}

.filter-menu li button {
  width: 100%;
  padding: 0.6rem 1rem;
  background: transparent;
  color: var(--color-text-main);
  border: none;
  text-align: left;
  cursor: pointer;
  border-radius: 4px;
  font-size: 0.95rem;
  transition: background 0.2s ease;
}

.filter-menu li button:hover {
  background: var(--color-border);
}

.filter-menu li button.active {
  background: var(--color-primary);
  color: white;
  font-weight: 600;
}

.filter-menu .section {
  padding: 0.5rem 1rem 0.15rem;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text-muted);
}

.filter-menu .custom-row {
  display: flex;
  align-items: center;
}

.filter-menu .custom-row .custom-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.filter-menu .custom-row .icon {
  width: auto;
  padding: 0.5rem 0.4rem;
  font-size: 0.85rem;
}

.filter-menu .divider {
  height: 1px;
  background: var(--color-border);
  margin: 0.5rem 0;
}
</style>
