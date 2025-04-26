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
    padding: 6px 12px;
    background-color: #f9f6eb;
    border-radius: 4px;
    white-space: nowrap;
    opacity: 0.95;
    z-index: 10;
    border: 2px solid #62531d;
    border-radius: 2px;
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
  