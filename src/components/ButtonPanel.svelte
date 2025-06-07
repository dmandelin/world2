<script lang="ts">
  let { config, selectedLabel = $bindable(), onSelected }
    : { 
        config: { buttons: Array<{label: string }> }, 
        selectedLabel?: string,
        onSelected?: (label: string) => void
    } = $props();

  let activeIndex = $state(0);

  function click(index: number) {
    activeIndex = index;
    selectedLabel = config.buttons[index].label;
    if (onSelected) {
      onSelected(selectedLabel);
    }
  }
</script>

<style>
.panel {
  display: flex;
  justify-content: flex-end;
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
      {button.label}
    </button>
  {/each}
</div>
