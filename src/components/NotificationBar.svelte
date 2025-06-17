<script lang="ts">
  import type { Note } from "../model/notifications";
    
  let { notes }: { notes: Note[] } = $props();

  function click(index: number) {
    console.log(`Clicked note at index: ${index}`);
  }
</script>

<style>
.panel {
  width: 564px;
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin: 1rem 0;
}
.panel button {
  min-width: 48px;
  height: 48px;
  background-color: #f3edd8;
  border-radius: 16px;
  cursor: pointer;
}
</style>

<div class="panel">
  {#each notes as note, i}
    <button
      type="button"
      onclick={() => click(i)}
    >
      {note.shortLabel}
    </button>
  {/each}
</div>
