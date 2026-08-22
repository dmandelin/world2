<script lang="ts">
  import type { Snippet } from 'svelte';
  import Tooltip from './Tooltip.svelte';

  export type Tab = {
    label: string,
    snippet: Snippet,
    // When set, the button shows this glyph and the label becomes its tooltip.
    icon?: string,
    // Tabs sharing a group sit together; a gap marks where one group ends.
    group?: string,
  };

  let {
    tabs,
    orientation = 'horizontal',
  }: {
    tabs: Tab[],
    orientation?: 'horizontal' | 'vertical',
  } = $props();

  let activeIndex = $state(0);

  function selectTab(index: number) {
    activeIndex = index;
  }
</script>

{#snippet tabButton(tab: Tab, i: number)}
  <button
    type="button"
    class="tab-header {i === activeIndex ? 'active' : ''}"
    class:icon={!!tab.icon}
    onclick={() => selectTab(i)}
  >
    {tab.icon ?? tab.label}
  </button>
{/snippet}

<div class="tabbed" class:vertical={orientation === 'vertical'}>
  <div class="tab-headers">
    {#each tabs as tab, i}
      {@const startsGroup = i > 0 && tabs[i - 1].group !== tab.group}
      {#if tab.icon}
        <div class="tab-slot" class:group-start={startsGroup}>
          <Tooltip>
            {@render tabButton(tab, i)}
            <div slot="tooltip">{tab.label}</div>
          </Tooltip>
        </div>
      {:else}
        {@render tabButton(tab, i)}
      {/if}
    {/each}
  </div>

  <div class="tab-content">
    <!-- With pictorial buttons the label isn't visible anywhere else, so the
         panel names itself. Text tabs already show it, so they don't. -->
    {#if tabs[activeIndex].icon}
      <h2 class="tab-title">{tabs[activeIndex].label}</h2>
    {/if}
    {@render tabs[activeIndex].snippet()}
  </div>
</div>

<style>
.tab-headers {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}
.tab-header {
  all: unset;
  cursor: pointer;
  white-space: nowrap;
}
.tab-header.active {
  font-weight: bold;
  text-decoration: underline;
}

/* Vertical: a rail of buttons down the left, content filling the rest. */
.tabbed.vertical {
  display: flex;
  align-items: flex-start;
  gap: 1.4rem;
}
.tabbed.vertical .tab-headers {
  flex: 0 0 auto;
  flex-direction: column;
  gap: 0.1rem;
  margin-bottom: 0;
}
.tabbed.vertical .tab-content {
  flex: 1;
  min-width: 0;
}

.tab-title {
  margin: 0 0 0.6rem;
  padding-bottom: 0.3rem;
  border-bottom: 1px solid #e3d7ae;
  font-size: 1.15rem;
  color: #62531d;
}

/* Panels disagree about whether their first element carries a top margin, so
   every one of them used to open on a different gap. Collapse it here and let
   .tab-title own the spacing. Selector is deliberately deep: several panels
   set this margin from their own scoped rules, which tie a flatter one. */
.tab-content > .tab-title + :global(*),
.tab-content > .tab-title + :global(* > :first-child) {
  margin-top: 0;
}

/* Pictorial buttons: the glyph carries the meaning, so drop the text-oriented
   active styling and mark the selection with weight and a filled chip. */
/* Fixed box: glyph advance widths vary a lot (text symbols like ✴ are far
   narrower than colour emoji), which left the rail ragged. */
.tab-header.icon {
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 2.75rem;
  height: 2.15rem;
  font-size: 1.5rem;
  line-height: 1;
  /* Reserve the clay edge's width so activating a tab doesn't shift the rail. */
  border: var(--clay-edge-width) solid transparent;
  opacity: 0.82;
  filter: grayscale(0.25);
}
.tab-header.icon:hover {
  opacity: 1;
  filter: none;
  background-color: #f0e7cd;
}
/* Gap plus a hairline where one group of tabs gives way to the next. */
.tabbed.vertical .tab-slot.group-start {
  margin-top: 0.55rem;
  padding-top: 0.55rem;
  border-top: 1px solid #e0d4ab;
}
.tabbed:not(.vertical) .tab-slot.group-start {
  margin-left: 0.75rem;
  padding-left: 0.75rem;
  border-left: 1px solid #e0d4ab;
}
.tab-header.icon.active {
  font-weight: normal;
  text-decoration: none;
  opacity: 1;
  filter: none;
  background-color: #e8d9a8;
  border-color: var(--clay-edge-color);
  border-image: var(--clay-edge-source) var(--clay-edge-slice) repeat;
}
</style>
