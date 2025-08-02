<script lang="ts">
    import DataTable from "../DataTable.svelte";
    import type { Clan } from "../../model/people/people";
    import { HousingDecision } from "../../model/decisions/housingdecision";
    import { pct } from "../../model/lib/format";
    import { SkillDefs } from "../../model/people/skills";
    
    let {clan, decision }: { clan: Clan, decision: HousingDecision } = $props();

    let imitationRows = $derived.by(() => {
        const rows = decision.imitationItems.map(item => [
            item.label, item.housing.name, item.prestige.toFixed(), pct(item.weight)]);
        return [['Clan', 'Housing', 'Prestige', 'Weight'], ...rows];
    });

    let guessRows = $derived.by(() => {
        const rows = [...decision.guessItems.values()].map(item => [
            item.housing.name, 
            item.benefit.toFixed(), item.cost.toFixed(), item.appeal.toFixed()]);
        return [['Housing', 'Shelter', 'Cost', 'Appeal'], ...rows];
    });

    let choiceRows = $derived.by(() => {
        const rows = decision.choiceItems.map(item => [
            item.label, item.housing.name, item.appeal.toFixed(), pct(item.weight)]);
        return [['Choice', 'Housing', 'Appeal', 'Weight'], ...rows];
    });
</script>

<style>
</style>

<h4>Imitation sources ({decision.imitated.name})</h4>
<DataTable rows={imitationRows} />

<h4>Guesses ({decision.guessed.name})</h4>
<DataTable rows={guessRows} />

{#if decision.choiceItems.length > 0}
    <h4>Choice ({decision.choice.name})</h4>
    <DataTable rows={choiceRows} />
{/if}

<div style="margin-top: 0.5em">
Cost: {(clan.laborAllocation.allocs.get(SkillDefs.Construction) ?? 0).toFixed(2)}
(moves: {clan.settlement.forcedMigrations})
</div>
