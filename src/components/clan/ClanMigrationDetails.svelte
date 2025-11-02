<script lang="ts">
    import { sortedByKey } from "../../model/lib/basics";
    import { signed } from "../../model/lib/format";
    import { NewSettlement } from "../../model/people/migration";
    import DataTable from "../DataTable.svelte";
    import type { ClanDTO } from "../dtos";

    let { clan } : { clan: ClanDTO } = $props();
    let plan = $derived(clan.migrationPlan);

    let targetTable = $derived.by((): string[][] => {
        if (!plan) return [];

        const columnSet = new Set<string>();
        const items = [];
        for (const candidate of plan.targets.values()) {
            const name = candidate.target === NewSettlement
                ? '(New)' 
                : candidate.target === candidate.clan.settlement
                ? '(Here)'
                : candidate.target.name;
            const eligibility = candidate.isEligible ? '' : 'X';
            const value = signed(candidate.value, 1);
            const columns = [];
            for (const {name, value} of candidate.items) {
                columnSet.add(name);
                columns.push({ name, value: signed(value, 0) });
            }
            items.push({ name, eligibility, value, columns });
        }

        const header = ['Place', '?', 'A', ...columnSet];
        const rows = sortedByKey(items, item => item.name).map(item => {
            const row = [item.name, item.eligibility, item.value];
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