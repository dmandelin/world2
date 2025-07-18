<script lang="ts">
    import type { Trend } from "../model/records/trends";
    import TrendFace from "./TrendFace.svelte";

  let { 
    config, 
    selectedTrend = $bindable(),
    onSelected,
  } : { 
        config: { 
          trends: Trend[]; 
        }, 
        selectedTrend?: any,
        onSelected?: (trend: Trend) => void
    } = $props();

  let activeIndex = $state(0);

  function click(index: number) {
    activeIndex = index;
    selectedTrend = config.trends[index];
    if (onSelected) {
      onSelected(selectedTrend);
    }
  }
</script>

<style>
.panel {
  display: flex;
  gap: 0.5rem;
  margin: 1rem 0;
}
.panel button {
  width: 72px;
  height: 48px;
  background-color: #f3edd8;
  cursor: pointer;
}
.panel button.active {
  font-weight: bold;
  text-decoration: underline;
}
</style>

<div class="panel">
  {#each config.trends as trend, i}
    <button
      type="button"
      class="tab-header {i === activeIndex ? 'active' : ''}"
      onclick={() => click(i)}
    >
      <TrendFace trend={trend} />
    </button>
  {/each}
</div>
