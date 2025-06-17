<script lang="ts">
  import type { Note } from "../model/notifications";
    import Tooltip from "./Tooltip.svelte";
    
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

    .ttt {
        text-align: left;
        font-size: small;
        margin: 0;
    }
</style>

<div class="panel">
  {#each notes as note, i}
    <Tooltip>
        <button
            type="button"
            onclick={() => click(i)}
        >
            {note.shortLabel}
        </button>
        <div slot="tooltip" class="ttt">
            {note.year}: {note.message}
        </div>
    </Tooltip>
  {/each}
</div>
