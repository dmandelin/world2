<script lang="ts">
    import { selectEntity, type Uuidable } from "./uistate.svelte";

    let {
        entity
    }: {
        entity: Uuidable & { name: string };
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
</button>