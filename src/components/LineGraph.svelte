<script lang="ts">
    import { onMount } from 'svelte';
  
    type GraphData = {
        title?: string;
        labels: Iterable<string>;
        datasets: Array<{
            label: string
            data: number[],
            color: string,
        }>;
    };

    let { data }: { data: GraphData } = $props();
  
    let width = $state(0);
    let height = $state(0);
  
    onMount(() => {
      const container = document.querySelector('.line-graph-container');
      if (container) {
        width = container.clientWidth;
        height = container.clientHeight;
      }
    });
  
    function getPath(dataset: Dataset, yOffset: number): string {
      const maxValue = Math.max(...dataset.data);
      const minValue = Math.min(...dataset.data);
      const xStep = width / (dataset.data.length - 1);
      const yScale = height / (maxValue - minValue);
  
      return dataset.data
        .map((value, index) => {
          const x = index * xStep;
          const y = height - (value - minValue) * yScale;
          return `${index === 0 ? 'M' : 'L'} ${x},${y + yOffset}`;
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
      {#if data.title}
        <text
          x={width / 2}
          y="16"
          text-anchor="middle"
          dominant-baseline="middle"
          font-size="16"
        >
          {data.title}
        </text>
      {/if}
      {#each data.datasets as dataset}
        <path d={getPath(dataset, data.title ? 16 : 0)} stroke={dataset.color} />
      {/each}
    </svg>
  </div>