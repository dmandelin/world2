<script lang="ts">
    import { pct, signed } from "../model/lib/format";
    import { sortedByKey, sumFun } from "../model/lib/basics";
    import { IterableTable } from "./tables/tables2";
    import type { Table, TableRow } from "./tables/tables2";
    import DataTable2 from "./tables/TableView2.svelte";
    import Tooltip from "./Tooltip.svelte";
    import type { ClanDTO } from "../model/records/dtos";
    import type { SkillDef } from "../model/people/skills";
    import { ClanSkillChangeItem } from "../model/people/skillchange";
    import type { ImitationTargetItem } from "../model/people/skillchange";

    let { clan, skill }: { clan: ClanDTO, skill: SkillDef } = $props();
    let clanSkill = $derived(clan.skills.get(skill)!);

    let imitationTable = $derived(clanSkill.lastChange ? new IterableTable<ImitationTargetItem, [number, number, number]>(
        sortedByKey(clanSkill.lastChange.imitationTargetItems, i => -i.weight),
        item => item.label,
        [
            { data: '𝕊', label: '𝕊', valueFn: r => r.trait, formatFn: v => v.toFixed() },
            { data: 'R', label: 'R', valueFn: r => r.respect, formatFn: v => v.toFixed() },
            { data: '𝕎', label: '𝕎', valueFn: r => r.weight, formatFn: v => v.toFixed(2) },
        ],
    ) : undefined);

    let changeSourcesTable = $derived.by(() => {
        if (!clanSkill.lastChange) return undefined;
        const items = clanSkill.lastChange.items;
        const totalDelta = sumFun(items, o => o.delta);
        const rows: TableRow<ClanSkillChangeItem, string>[] = [
            ...items.map(item => ({
                data: item,
                label: item.label,
            })),
            {
                data: new ClanSkillChangeItem('Total', totalDelta),
                label: 'Total',
                bold: true,
            },
        ];
        return {
            columns: [
                { data: 'Δ', label: 'Δ', valueFn: (r: ClanSkillChangeItem) => r.delta, formatFn: (v: number) => v.toFixed() },
            ],
            rows,
            hideHeader: false,
        } satisfies Table<ClanSkillChangeItem, string, [number]>;
    });
</script>

<style>
    .ttt {
        text-align: left;
        font-size: small;
        margin: 0;
    }
</style>

<Tooltip>
    {signed(clanSkill.lastChange?.delta || 0)}
    <div slot="tooltip" class="ttt">
        {#if clanSkill.lastChange}
            <h4>Imitation Sources</h4>
            {#if imitationTable}
                <DataTable2 table={imitationTable} />
            {/if}
            <h4>Effort = {pct(clanSkill.lastChange.relativeEffort)}</h4>
            <h4>Learning factor = {pct(clanSkill.lastChange.effortFactor)})</h4>
            <h4>Skill Changes</h4>
            {#if changeSourcesTable}
                <DataTable2 table={changeSourcesTable} />
            {/if}
        {/if}
    </div>
</Tooltip>
