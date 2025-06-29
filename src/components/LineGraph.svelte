<script lang="ts">
  import { onMount } from 'svelte';
  import { Graph, GraphBox, type GraphData } from './linegraph';

  let width = $state(0);
  let height = $state(0);

  let { data }: { data: GraphData } = $props();

  const margin = 30;
  const bottomMargin = 40;
  const gtop = margin;
  const gleft = margin;

  let gw = $derived.by(() => width - 2 * margin);
  let gh = $derived.by(() => height - margin - bottomMargin);
  let gbot = $derived.by(() => height - bottomMargin);
  let gright = $derived.by(() => width - margin);

  let graph = $derived.by(() => {
    return new Graph(data, new GraphBox(gleft, gtop, gw, gh));
  });

  onMount(() => {
    const container = document.querySelector('.line-graph-container');
    if (container) {
      width = container.clientWidth;
      height = container.clientHeight;
    }
  });

  /*
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

    if (line.includes("NaN")) {
      console.warn(`Dataset "${dataset.label}" contains NaN values.`);
      debugger;
    }

    return [line, yAxisLabels];
  }
    */
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
    <!-- Graph title -->
    <text x="{width / 2}" y="{margin / 2}" font-size="16" text-anchor="middle" alignment-baseline="middle">{graph.title}</text>

    <!-- Box enclosing graph -->
    <rect x="{margin}" y="{margin}" width="{gw}" height="{gh}" stroke="black" fill="none" />

    <!-- Y axis top mark -->
    <line x1="{gleft}" y1="{gtop}" x2="{gleft-4}" y2="{gtop}" stroke="black" />
    <text x="{gleft-6}" y="{gtop}" font-size="10" text-anchor="end" alignment-baseline="middle">{graph.maxYAxisValue.toFixed()}</text>

    <!-- Y axis bottom mark -->
    <line x1="{gleft}" y1="{gbot}" x2="{gleft-4}" y2="{gbot}" stroke="black" />
    <text x="{gleft-6}" y="{gbot}" font-size="10" text-anchor="end" alignment-baseline="middle">{graph.minYAxisValue.toFixed()}</text>

    <!-- Y axis tick lines -->
    {#each graph.yAxisTicks as [label, y]}
      <line x1="{gleft}" y1="{y}" x2="{gleft-4}" y2="{y}" stroke="black" />
      <line x1="{gleft}" y1="{y}" x2="{gright}" y2="{y}" stroke="gray" />
      <text x="{gleft-6}" y="{y}" font-size="10" text-anchor="end" alignment-baseline="middle">{label}</text>
    {/each}

    <!-- X axis left mark -->
    <line x1="{gleft}" y1="{gbot}" x2="{gleft}" y2="{gbot+4}" stroke="black" />
    <text x="{gleft}" y="{gbot+6}" font-size="10" text-anchor="end" alignment-baseline="hanging" transform="rotate(-45 {gleft} {gbot+6})">{graph.minXValue}</text>

    <!-- X axis right mark -->
    <line x1="{gright}" y1="{gbot}" x2="{gright}" y2="{gbot+4}" stroke="black" />
    <text x="{gright}" y="{gbot+6}" font-size="10" text-anchor="end" alignment-baseline="hanging" transform="rotate(-45 {gright} {gbot+6})">{graph.maxXValue}</text>

    {#each graph.svgPaths as svgPath}
      {@html svgPath}
    {/each}
  </svg>
</div>
