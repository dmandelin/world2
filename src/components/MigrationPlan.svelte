<script lang="ts">
    import { sortedByKey } from "../model/lib/basics";
    import { signed } from "../model/lib/format";
    import DataTable from "./DataTable.svelte";

    let { plan } = $props();

    let targetTable = $derived.by((): string[][] => {
        if (!plan) return [];

        const columnSet = new Set<string>();
        const items = [];
        const selection = plan.softmaxSelection;

        for (const candidate of plan.targets.values()) {
            const name = candidate.target === 'new' 
                ? '(New)' 
                : candidate.target === candidate.clan.settlement
                ? '(Here)'
                : candidate.target.name;
            const eligibility = candidate.isEligible ? '' : 'X';
            const value = signed(candidate.value, 1);

            const prob = selection ? selection.probabilities.get(candidate) ?? 0 : 0;

            const columns = [];
            for (const {name, value} of candidate.items) {
                columnSet.add(name);
                columns.push({ name, value: signed(value, 0) });
            }
            items.push({ name, eligibility, value, prob, columns });
        }

        const header = ['Place', '?', 'P', 'Rng', 'A', ...columnSet];
        let rangeStartProb = 0;
        const rows = sortedByKey(items, item => item.name).map(item => {
            const row = [
                item.name, 
                item.eligibility, 
                item.prob.toFixed(2), 
                `${rangeStartProb.toFixed(2)}-${(rangeStartProb + item.prob).toFixed(2)}`,
                item.value,
            ];
            rangeStartProb += item.prob;
            for (const columnName of columnSet) {
                const column = item.columns.find(c => c.name === columnName);
                row.push(column ? column.value : '');
            }
            return row;
        });
        return [header, ...rows];
    });
</script>

<style>
</style>

{#if plan}
    {#if plan.wantToMove}
        <p>Want to move: {plan.wantToMoveReason}</p>
    {:else}
        <p>Content where we are: {plan.wantToMoveReason}</p>
    {/if}

    {#if targetTable.length > 1}
        <DataTable rows={targetTable} />

        <div style="margin-top: 0.5em">Roll: {plan.softmaxSelection?.roll.toFixed(3) ?? 0}</div>
        <div style="margin-top: 0.5em">Choice: {plan.best?.target.name}</div>
        {#if plan.willMigrate}
            <div><b>Will migrate</b></div>
        {:else}
            <div>Will not migrate
                {#if plan.othersLeftFirst}
                    (others left first)
                {/if}
            </div>
        {/if}
    {/if}
{/if}