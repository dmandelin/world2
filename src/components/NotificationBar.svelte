<script lang="ts">
  import type { Note } from "../model/records/notifications";
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
        align-items: center;
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

    .panel .vr {
        width: 2px;
        height: 36px;
        background-color: #333;
    }
</style>

<div class="panel">
  {#each notes as note, i}
    <Tooltip>
        {#if note.shortLabel === '$vr$'}
            <div class="vr"></div>
        {:else}
            <button
                type="button"
                class={{vr: note.shortLabel === '$vr$'}}
                onclick={() => click(i)}
            >
                {note.shortLabel}
            </button>
        {/if}
        <div slot="tooltip" class="ttt">
            {note.year}: {note.message}
        </div>
    </Tooltip>
  {/each}
</div>
