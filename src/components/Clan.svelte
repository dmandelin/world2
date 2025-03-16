<script lang="ts">
    import PopulationPyramid from "./PopulationPyramid.svelte";

    let { clan } = $props();

</script>

{#if clan !== undefined}
<h3>{clan.name}</h3>
<PopulationPyramid {clan} />

{/if}