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
    /* Plain running text in whatever font surrounds it, marked as something
     * you can click by a dotted rule underneath rather than by any button
     * chrome. PT Serif has no semibold, so a weight bump would land on full
     * bold and shout; the dots carry the affordance instead. */
    button {
        all: unset;
        cursor: pointer;
        white-space: nowrap;
        text-decoration: underline;
        text-decoration-style: dotted;
        text-decoration-thickness: 1px;
        text-decoration-color: #a5987a;
        text-underline-offset: 0.2em;
        &:hover {
            color: saddlebrown;
            text-decoration-color: saddlebrown;
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