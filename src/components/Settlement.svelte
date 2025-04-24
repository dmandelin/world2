<script>
    import ClanCard from "./ClanCard.svelte";

    let { settlement } = $props();
</script>

<style>
    #top {
        margin-left: 1rem;
    }

    h1 {
        margin: 0 0 1rem 0;
    }

    h3, h4 {
        margin: 0.5rem 0;
    }
</style>

<div id="top">
<h1>{settlement.name}</h1>
<h3>{settlement.size} people</h3>

<h4 style="text-align: center; border-bottom: 1px solid grey">The {settlement.clans.length} clans</h4>
<div style="display: flex; gap: 0.25rem;">
    {#each settlement.clans as clan}
    <ClanCard clan={clan} />
    {/each}
</div>
</div>