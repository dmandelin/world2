<script lang="ts">
    import ClanTradeCard from "./ClanTradeCard.svelte";

    let { settlement } = $props();
</script>

<div style="display: flex; gap: 0.5rem;">
    {#each settlement.clans as clan}
    <ClanTradeCard clan={clan} />
    {/each}
</div>

<h4 style="margin: 1em 0 0.5em 0;">Exportable Goods</h4>
{#each settlement.localTradeGoods as good}
    <div>{good.name}</div>
{/each}
