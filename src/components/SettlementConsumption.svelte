<script lang="ts">
    import ClanConsumptionCard from "../components/ClanConsumptionCard.svelte";

    let { settlement } = $props();
</script>

<div style="display: flex; gap: 0.5rem;">
    {#each settlement.clans as clan}
    <ClanConsumptionCard clan={clan} />
    {/each}
</div>
