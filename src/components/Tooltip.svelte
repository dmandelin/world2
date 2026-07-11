<script lang="ts">
    import { tick } from 'svelte';
    let show = false;
    let tooltipContent: HTMLDivElement | undefined;
    let placeBelow = false;
  
    async function handleMouseEnter() {
      show = true;
      placeBelow = false;
      await tick();
      if (tooltipContent) {
        const rect = tooltipContent.getBoundingClientRect();
        if (rect.top < 0) {
          placeBelow = true;
        }
      }
    }
  
    function handleMouseLeave() {
      show = false;
      placeBelow = false;
    }
  </script>
  
  <style>
  .tooltip-wrapper {
    position: relative;
    display: inline-block;
    cursor: pointer;
  }
  
  .tooltip-content {
    position: absolute;
    bottom: 125%;
    left: 50%;
    transform: translateX(-50%);
    padding: 6px 12px;
    background-color: #f9f6eb;
    border-radius: 4px;
    white-space: nowrap;
    opacity: 0.95;
    z-index: 10;
    border: 2px solid #62531d;
    border-radius: 2px;
  }
  .tooltip-content.below {
    bottom: auto;
    top: 125%;
  }
  .tooltip-inner {
    all: revert;
  }
  </style>
  
  <div class="tooltip-wrapper"
       role="tooltip"
       on:mouseenter={handleMouseEnter}
       on:mouseleave={handleMouseLeave}>
    
    <slot />
  
    {#if show}
      <div class="tooltip-content" class:below={placeBelow} bind:this={tooltipContent}>
        <div class="tooltip-inner">
          <slot name="tooltip" />
        </div>
      </div>
    {/if}
  </div>
  