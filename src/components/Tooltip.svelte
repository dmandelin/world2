<script>
    let show = false;
  
    function handleMouseEnter() {
      show = true;
    }
  
    function handleMouseLeave() {
      show = false;
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
    background: black;
    color: white;
    padding: 6px 12px;
    border-radius: 4px;
    white-space: nowrap;
    opacity: 0.9;
    z-index: 10;
  }
  </style>
  
  <div class="tooltip-wrapper"
       role="tooltip"
       on:mouseenter={handleMouseEnter}
       on:mouseleave={handleMouseLeave}>
    
    <slot />
  
    {#if show}
      <div class="tooltip-content">
        <slot name="tooltip" />
      </div>
    {/if}
  </div>
  