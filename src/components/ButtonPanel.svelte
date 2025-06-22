<script lang="ts">
  let { 
    config, 
    selectedLabel = $bindable(),
    selectedData = $bindable(),
    onSelected,
  } : { 
        config: { 
          buttons: Array<{
            label: string,
            data?: any,
          }> 
        }, 
        selectedLabel?: string,
        selectedData?: any,
        onSelected?: (label: string, data?: any) => void
    } = $props();

  let activeIndex = $state(0);

  function click(index: number) {
    activeIndex = index;
    selectedLabel = config.buttons[index].label;
    selectedData = config.buttons[index].data;
    if (onSelected) {
      onSelected(selectedLabel, selectedData);
    }
  }
</script>

<style>
.panel {
  display: flex;
  gap: 0.5rem;
  margin: 1rem 0;
}
.panel button {
  width: 48px;
  height: 48px;
  background-color: #f3edd8;
  cursor: pointer;
}
.panel button.active {
  font-weight: bold;
  text-decoration: underline;
}
</style>

<div class="panel">
  {#each config.buttons as button, i}
    <button
      type="button"
      class="tab-header {i === activeIndex ? 'active' : ''}"
      onclick={() => click(i)}
    >
      {@html button.label}
    </button>
  {/each}
</div>
