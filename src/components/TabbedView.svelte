<script lang="ts">
  import type { Snippet } from 'svelte';
  
  let { tabs }: { tabs: {label: string, snippet: Snippet}[] } = $props();
  let activeIndex = $state(0);

  function selectTab(index: number) {
    activeIndex = index;
  }
</script>

<style>
.tab-headers {
  display: flex;
  justify-content: space-evenly;
  gap: 1rem;
  margin-bottom: 1rem;
}
.tab-header {
  all: unset;
  cursor: pointer;
}
.tab-header.active {
  font-weight: bold;
  text-decoration: underline;
}
</style>

<div class="tab-headers">
  {#each tabs as tab, i}
    <button
      type="button"
      class="tab-header {i === activeIndex ? 'active' : ''}"
      onclick={() => selectTab(i)}
    >
      {tab.label}
    </button>
  {/each}
</div>

{@render tabs[activeIndex].snippet()}
