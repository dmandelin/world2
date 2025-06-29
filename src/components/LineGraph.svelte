<script lang="ts">
  import { onMount } from 'svelte';
  import { Graph, GraphBox, type GraphData } from './linegraph';

  let width = $state(0);
  let height = $state(0);

  let markedXPixel: number|undefined = $state(undefined);
  let markedYPixel: number|undefined = $state(undefined);

  let xMarkLabel: string|undefined = $state(undefined);
  let yMarkLabel: string|undefined = $state(undefined);

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

  function onClick(event: MouseEvent) {
    const clickX = event.offsetX;
    const clickY = event.offsetY;

    // Check if the click is within the graph area
    if (clickX >= gleft && clickX <= gright && clickY >= gtop && clickY <= gbot) {
      const xIndex = graph.xp2i(clickX);
      const yValue = graph.yp2i(clickY);

      markedXPixel = graph.xi2p(xIndex);
      markedYPixel = graph.sides[0].scaledDatasets[0].data[xIndex][1];

      xMarkLabel = graph.xAxisLabels[xIndex];
      yMarkLabel = yValue.toFixed();
    } else {
      markedXPixel = undefined; 
      markedYPixel = undefined;
      xMarkLabel = undefined;
      yMarkLabel = undefined;
    }
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
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <svg viewBox={`0 0 ${width} ${height}`} onclick={onClick}>
    <!-- Graph title -->
    <text x="{width / 2}" y="{margin / 2}" font-size="16" text-anchor="middle" alignment-baseline="middle">{graph.title}</text>

    <!-- Box enclosing graph -->
    <rect x="{margin}" y="{margin}" width="{gw}" height="{gh}" stroke="black" fill="none" />

    <!-- X axis left mark -->
    <line x1="{gleft}" y1="{gbot}" x2="{gleft}" y2="{gbot+4}" stroke="black" />
    <text x="{gleft}" y="{gbot+6}" font-size="10" text-anchor="end" alignment-baseline="hanging" transform="rotate(-45 {gleft} {gbot+6})">{graph.minXValue}</text>

    <!-- X axis right mark -->
    <line x1="{gright}" y1="{gbot}" x2="{gright}" y2="{gbot+4}" stroke="black" />
    <text x="{gright}" y="{gbot+6}" font-size="10" text-anchor="end" alignment-baseline="hanging" transform="rotate(-45 {gright} {gbot+6})">{graph.maxXValue}</text>

    <!-- X axis label for marked pixel -->
    {#if markedXPixel !== undefined}
      <text x="{markedXPixel}" y="{gbot+6}" font-size="10" text-anchor="end" alignment-baseline="hanging" transform="rotate(-45 {markedXPixel} {gbot+6})">
        {xMarkLabel}
      </text>
    {/if}

    <!-- both sides of the graph if present -->
      {#each graph.sides as side, sideIndex}
      {#if sideIndex === 0}
        <!-- Y axis top mark -->
        <line x1="{gleft}" y1="{gtop}" x2="{gleft-4}" y2="{gtop}" stroke="black" />
        <text x="{gleft-6}" y="{gtop}" font-size="10" text-anchor="end" alignment-baseline="middle">{side.maxYAxisValue.toFixed()}</text>

        <!-- Y axis bottom mark -->
        <line x1="{gleft}" y1="{gbot}" x2="{gleft-4}" y2="{gbot}" stroke="black" />
        <text x="{gleft-6}" y="{gbot}" font-size="10" text-anchor="end" alignment-baseline="middle">{side.minYAxisValue.toFixed()}</text>

        <!-- Y axis tick lines -->
        {#each side.yAxisTicks as [label, y]}
          <line x1="{gleft}" y1="{y}" x2="{gleft-4}" y2="{y}" stroke="black" />
          <line x1="{gleft}" y1="{y}" x2="{gright}" y2="{y}" stroke="gray" />
          <text x="{gleft-6}" y="{y}" font-size="10" text-anchor="end" alignment-baseline="middle">{label}</text>
        {/each}

      {:else}
        <text x="{gright+4}" y="{gtop}" font-size="10" text-anchor="start" alignment-baseline="middle">{side.maxYAxisValue.toFixed()}</text>
        <text x="{gright+4}" y="{gbot}" font-size="10" text-anchor="start" alignment-baseline="middle">{side.minYAxisValue.toFixed()}</text>
        {#each side.yAxisTicks as [label, y]}
          <line x1="{gleft}" y1="{y}" x2="{gright}" y2="{y}" stroke="gray" />
          <text x="{gright+4}" y="{y}" font-size="10" text-anchor="start" alignment-baseline="middle">{label}</text>
        {/each}
      {/if}

      <!-- Y axis label for marked pixel -->
      {#if markedYPixel !== undefined}
        <text x="{gleft-6}" y="{markedYPixel}" font-size="10" text-anchor="end" alignment-baseline="middle">
          {yMarkLabel}
        </text>
      {/if}

      {#each side.svgPaths as svgPath}
        {@html svgPath}
      {/each}

      <!-- legend if there is more than one dataset -->
      {#if side.scaledDatasets.length > 1 && graph.data.showLegend !== false}
        {#each side.scaledDatasets as dataset, index}
          <rect x="{gright+4}" y="{gtop - index * 16}" width="10" height="10" fill="{dataset.color}" />
          <text x="{gright+16}" y="{gtop - index * 16 + 10}" font-size="10">{dataset.label}</text>
        {/each}
      {/if}
    {/each}


    <!-- gray horizontal and vertical lines through marked pixel -->
    {#if markedXPixel !== undefined && markedYPixel !== undefined}
      <line x1="{markedXPixel}" y1="{gtop}" x2="{markedXPixel}" y2="{gbot}" stroke="gray" stroke-dasharray="4" />
      <line x1="{gleft}" y1="{markedYPixel}" x2="{gright}" y2="{markedYPixel}" stroke="gray" stroke-dasharray="4" />
    {/if}
  </svg>
</div>
