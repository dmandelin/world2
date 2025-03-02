<script lang="ts">
    import { onMount } from 'svelte';
  
    let {data} = $props();
  
    let width = $state(0);
    let height = $state(0);
  
    onMount(() => {
      const container = document.querySelector('.line-graph-container');
      if (container) {
        width = container.clientWidth;
        height = container.clientHeight;
      }
    });
  
    function getPath(dataset: Dataset): string {
      const maxValue = Math.max(...dataset.data);
      const minValue = Math.min(...dataset.data);
      const xStep = width / (dataset.data.length - 1);
      const yScale = height / (maxValue - minValue);
  
      return dataset.data
        .map((value, index) => {
          const x = index * xStep;
          const y = height - (value - minValue) * yScale;
          return `${index === 0 ? 'M' : 'L'} ${x},${y}`;
        })
        .join(' ');
    }
  </script>
  
  <style>
    .line-graph-container {
      width: 100%;
      height: 100%;
    }
    svg {
      width: 100%;
      height: 100%;
    }
    path {
      fill: none;
      stroke-width: 2;
    }
  </style>
  
  <div class="line-graph-container">
    <svg viewBox={`0 0 ${width} ${height}`}>
      {#each data.datasets as dataset}
        <path d={getPath(dataset)} stroke={dataset.color} />
      {/each}
    </svg>
  </div>