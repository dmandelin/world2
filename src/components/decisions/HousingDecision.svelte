<script lang="ts">
    import DataTable from "../DataTable.svelte";
    import { HousingDecision } from "../../model/decisions/housingdecision";
    import { pct } from "../../model/lib/format";

    let { decision }: { decision: HousingDecision } = $props();

    let imitationRows = $derived.by(() => {
        const rows = decision.imitationItems.map(item => [
            item.label, item.housing.name, item.prestige.toFixed(), pct(item.weight)]);
        return [['Clan', 'Housing', 'Prestige', 'Weight'], ...rows];
    });

    let guessRows = $derived.by(() => {
        const rows = [...decision.guessItems.values()].map(item => [
            item.housing.name, 
            item.housingQoL.toFixed(), item.floodingQoL.toFixed(), item.qol.toFixed()]);
        return [['Housing', 'Amenities', 'Flooding', 'Appeal'], ...rows];
    });

    let choiceRows = $derived.by(() => {
        const rows = decision.choiceItems.map(item => [
            item.label, item.housing.name, item.qol.toFixed(), pct(item.weight)]);
        return [['Choice', 'Housing', 'QoL', 'Weight'], ...rows];
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
