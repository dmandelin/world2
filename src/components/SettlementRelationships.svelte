<script lang="ts">
    import type { SettlementDTO } from "./dtos";
    import { pct } from "../model/lib/format";
    
    let { settlement }: { settlement: SettlementDTO }= $props();
    let clans = $derived(settlement.clans);
</script>

<style>
</style>

<h3>Marriage Partners</h3>

{#each clans as c}
<div>
    <h4 style="color: {c.color}">{c.name}</h4>
    {#each c.marriagePartners.entries() as [name, r]}
        <div>{pct(r)}: {name}</div>
    {/each}
</div>
{/each}