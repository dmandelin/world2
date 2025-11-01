<script lang="ts">
    import DataTable2 from "../DataTable2.svelte";
    import type { ClanDTO } from "../dtos";
    import { pct, signed } from "../../model/lib/format";
    import { SkillDefs } from "../../model/people/skills";
    import { laborAllocationPlanTable } from "../tables";
    
    let {clan} : { clan: ClanDTO } = $props();
    let allocation = $derived(clan.laborAllocation.clone());
    let decision = $derived(allocation.allocationPlan);
    let previous = $derived(decision.previousPlan);
</script>

<style>
</style>

<div>
    <h3>Labor Decisions</h3>
    <div>Previous Plan: {pct(previous.get(SkillDefs.Agriculture) ?? 0)} farming</div>
    <h4>Experiment?</h4>
    <table>
        <tbody>
            {#each Object.entries(decision.happinessItems) as [key, value]}
                <tr><td>{key}</td><td>{signed(value, 0)}</td></tr>
            {/each}
            <tr><td>Contentment</td><td>{signed(decision.happiness, 0)}</td></tr>
            <tr><td>Chance to experiment</td><td>{pct(decision.experimentProbability)}</td></tr>
            <tr><td>&nbsp;&nbsp;Roll</td><td>{(100 * decision.experimentingRoll).toFixed(0)}</td></tr>
        </tbody>
    </table>
    <div class="bold">
        &rarr;
        {#if decision.experimenting}
            Experimenting
        {:else}
            Keeping traditions
        {/if}
    </div>
    {#if decision.experimenting}
    <h4>Experiments</h4>
    <DataTable2 table={laborAllocationPlanTable(clan)} />
    {/if}
    <div class="bold mtop">Plan: {pct(allocation.plannedRatioFor(SkillDefs.Agriculture) ?? 0)} farming</div>
</div>
