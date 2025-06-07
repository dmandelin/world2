<script lang="ts">
  let { config } : {config: { buttons: Array<{label: string }> } } = $props();
  let activeIndex = $state(0);

  function click(index: number) {
    activeIndex = index;
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
