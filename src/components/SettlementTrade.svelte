<script lang="ts">
    let { settlement } = $props();
</script>

<h4 style="margin: 1em 0 0.5em 0;">Exportable Goods</h4>
{#each settlement.localTradeGoods as good}
    <div>{good.name}</div>
{/each}
