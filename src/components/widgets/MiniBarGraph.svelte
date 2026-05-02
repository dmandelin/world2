<script lang="ts">
  export interface MiniBarData {
    value: number;
    color?: string;
    label?: string;
  }

  let { data = [] }: { data: MiniBarData[] } = $props();

  const defaultColors = [
    '#10b981', // emerald-500
    '#ef4444', // red-500
    '#3b82f6', // blue-500
    '#f59e0b', // amber-500
    '#8b5cf6', // violet-500
    '#06b6d4', // cyan-500
    '#ec4899', // pink-500
    '#f97316'  // orange-500
  ];

  let totalValue = $derived(data.reduce((sum, item) => sum + Math.max(0, item.value), 0));
</script>

<div class="mini-bar-graph">
  {#if totalValue > 0}
    {#each data as item, i}
      {#if item.value > 0}
        <div
          class="bar"
          style="width: {(item.value / totalValue) * 100}%; background-color: {item.color || defaultColors[i % defaultColors.length]};"
          title={item.label}
        >
          {#if item.label}
            <span class="label">{item.label}</span>
          {/if}
        </div>
      {/if}
    {/each}
  {/if}
</div>

<style>
  .mini-bar-graph {
    display: flex;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  .bar {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    overflow: hidden;
  }

  .label {
    color: white;
    font-size: 0.75rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding: 0 4px;
    text-shadow: 0px 1px 2px rgba(0, 0, 0, 0.6);
    user-select: none;
  }
</style>
