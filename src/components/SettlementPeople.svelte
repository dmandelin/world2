<script>
    import ClanCard from "./ClanCard.svelte";

    let { settlement } = $props();
</script>

<style>
</style>

<div style="display: flex; gap: 0.5rem; margin-bottom: 1rem;">
    {#each settlement.clans as clan}
    <ClanCard clan={clan} />
    {/each}
</div>