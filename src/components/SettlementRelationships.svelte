<script lang="ts">
    import type { SettlementDTO } from "./dtos";
    import { pct } from "../model/lib/format";
    import { sortedByKey } from "../model/lib/basics";
    import EntityLink from "./state/EntityLink.svelte";
    
    let { settlement }: { settlement: SettlementDTO }= $props();
    let clans = $derived(settlement.clans);
</script>

<style>
</style>

<h3>Marriage Partners</h3>

{#each clans as c}
<div>
    <h4 style="color: {c.color}">{c.name}</h4>
    {#each sortedByKey(c.marriagePartners, ([clan, r]) => -r) as [clan, r]}
        <div>
            {pct(r)}: 
            <EntityLink entity={clan} />
            of
            <EntityLink entity={clan.settlement} />
            {#if clan.settlement.parent}(<EntityLink entity={clan.settlement.parent} />){/if}
        </div>
    {/each}
</div>
{/each}