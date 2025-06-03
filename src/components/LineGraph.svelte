<script lang="ts">
    import { onMount } from 'svelte';
  
    type GraphData = {
        title?: string;
        labels: Iterable<string>;
        datasets: Array<{
            label: string,
            data: number[],
            color: string,
        }>;
    };

    class Dataset {
      label: string;
      data: number[];
      color: string;

      readonly maxValue: number;
      readonly minValue: number;
      readonly xStep: number;
      readonly yScale: number;

      readonly svgPath: string;
      readonly svgYAxisLabels: string;

      constructor(label: string, data: number[], color: string) {
        this.label = label;
        this.data = data;
        this.color = color;

        this.maxValue = Math.max(...data);
        this.minValue = Math.min(...data);
        this.xStep = width / (data.length - 1);
        this.yScale = height / (this.maxValue - this.minValue);

        [this.svgPath, this.svgYAxisLabels] = getPath(this, 0);
      }
    }

    let { data }: { data: GraphData } = $props();
    let datasets = $derived.by(() => {
      return data.datasets.map(ds => new Dataset(ds.label, ds.data, ds.color));
    });
  
    let width = $state(0);
    let height = $state(0);
  
    onMount(() => {
      const container = document.querySelector('.line-graph-container');
      if (container) {
        width = container.clientWidth;
        height = container.clientHeight;
      }
    });
  
    function getPath(dataset: Dataset, yOffset: number): [string, string] {
      const maxValue = Math.max(...dataset.data);
      const minValue = Math.min(...dataset.data);
      const xStep = width / (dataset.data.length - 1);
      const yScale = height / (maxValue - minValue);
  
      const line = dataset.data
        .map((value, index) => {
          const x = index * xStep;
          const y = height - (value - minValue) * yScale;
          return `${index === 0 ? 'M' : 'L'} ${x},${y + yOffset}`;
        })
        .join(' ');

      const yAxisLabels = dataset.data.map((value, index) => {
        const x = index * xStep;
        const y = height - 16 + yOffset;
        return `<text x="${x}" y="${y + 4}" font-size="10" text-anchor="middle">${value}</text>`;
      }).join('');

      return [line, yAxisLabels];
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
      {#each datasets as dataset}
        <path d={dataset.svgPath} stroke={dataset.color} />
        <!-- {@html dataset.svgYAxisLabels} -->
      {/each}
    </svg>
  </div>