<script lang="ts">
    import type { Snippet } from "svelte";
    import { selectEntity, type Uuidable } from "./uistate.svelte";

    let {
        entity,
        extra,
    }: {
        entity: Uuidable & { name: string };
        extra?: Snippet<[any]>;
    } = $props();

</script>

<style>
    button {
        all: unset;
        cursor: pointer;
        white-space: nowrap;
        &:hover {
            color:saddlebrown;
        }
    }
</style>

<button 
    type="button"
    onclick={() => selectEntity(entity)}>
    {entity.name} 
    {#if extra}
        <span style="font-size: 0.8em; color: gray;">{@render extra(entity)}</span>
    {/if}
</button>