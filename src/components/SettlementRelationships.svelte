<script lang="ts">
    import { Clan } from "../model/people/people";
    import { MarriagePartners } from "../model/relations/relationships";
    import { pct, spct, unsigned, unsignedFormat } from "../model/lib/format";
    import { sortedByKey } from "../model/lib/basics";
    import { CrossTab, IterableTable } from "./tables/tables2";
    import EntityLink from "./state/EntityLink.svelte";
    import TableView2 from "./tables/TableView2.svelte";
    import type { ClanDTO, SettlementDTO } from "../model/records/dtos";
    import type { Snippet } from "svelte";
    
    let { settlement }: { settlement: SettlementDTO }= $props();
    let world = $derived(settlement.world);
    let clans = $derived(settlement.clans);

    function buildRelationshipsTable<CellValue>(
        valueFn: (rowClan: ClanDTO, colClan: ClanDTO) => CellValue,
        formatFn: (value: CellValue) => string,
        cellTooltip: Snippet<[CellValue, ClanDTO, ClanDTO]>): CrossTab<ClanDTO, CellValue> {

        const clans: ClanDTO[] = sortedByKey(settlement.clans, c => c.name);
            
        return new CrossTab<ClanDTO, CellValue>(
            clans,
            (clan: ClanDTO) => clan.name,
            valueFn,
            formatFn,
            cellTooltip,
        )
    }

    function interactionLevelCellValue(rowClan: ClanDTO, colClan: ClanDTO): number {
        const att = world.attentionTo(rowClan, colClan);
        return att / colClan.population;
    }

    function alignmentCellValue(rowClan: ClanDTO, colClan: ClanDTO): number {
        const a = world.alignmentToward(rowClan, colClan);
        if (!a) return 0;
        return a.value;
    }

    function respectCellValue(rowClan: ClanDTO, colClan: ClanDTO): number {
        const r = world.respectToward(rowClan, colClan);
        if (!r) return 0;
        return r.value;
    }
</script>

<style>
</style>

{#snippet interactionVolumeCellTooltip(value: number, subject: ClanDTO, object: ClanDTO)}
    {@const att = world.attentionTo(subject, object)}
    {#if att}
        {unsigned(att)} attention / {object.population} population
    {/if}
{/snippet}

{#snippet alignmentCellTooltip(value: number, subject: ClanDTO, object: ClanDTO)}
  {@const a = world.alignmentToward(subject, object)}
  {#if a}
        <TableView2 table={
            new IterableTable(
                a.items,
                i => i.label,
                [{
                    data: 'Value',
                    label: 'Value',
                    valueFn: i => i.value,
                    formatFn: (i: number) => unsigned(i, 2),
                }, {
                    data: 'Explanation',
                    label: 'Explanation',
                    valueFn: i => i.explanation,
                }],
            )
        }></TableView2>
  {/if}
{/snippet}

{#snippet respectCellTooltip(value: number, subject: ClanDTO, object: ClanDTO)}
  {@const r = world.respectToward(subject, object)}
    {#if r}
        <TableView2 table={
            new IterableTable(
                r.items,
                i => i.label,
                [{
                    data: 'Value',
                    label: 'Value',
                    valueFn: i => i.value,
                    formatFn: (i: number) => unsigned(i, 2),
                }, {
                    data: 'Inf Mod',
                    label: 'Inf Mod',
                    valueFn: i => i.informationModifier,
                    formatFn: (i: number) => unsigned(i, 2),
                }, {
                    data: 'Base',
                    label: 'Base',
                    valueFn: i => i.baseValue,
                    formatFn: (i: number) => unsigned(i, 2),
                }, {
                    data: 'Explanation',
                    label: 'Explanation',
                    valueFn: i => i.explanation,
                }],
            )
        }></TableView2>
    {/if}
{/snippet}

<div style="display: flex; flex-direction: row; gap: 2rem;">
    <div>
        <div>
            <h3>Interaction Level</h3>
            <TableView2 table={buildRelationshipsTable(interactionLevelCellValue, unsignedFormat(2), interactionVolumeCellTooltip)}></TableView2>
        </div>
        <div>
            <h3>Alignment</h3>
            <TableView2 table={buildRelationshipsTable(alignmentCellValue, unsignedFormat(2), alignmentCellTooltip)}></TableView2>
        </div>
        <div>
            <h3>Respect</h3>
            <TableView2 table={buildRelationshipsTable(respectCellValue, unsignedFormat(2), respectCellTooltip)}></TableView2>
        </div>
    </div>
    <div>
        <h3>Marriage Partners</h3>

        {#each clans as c}
        <div>
            <h4 style="color: {c.color}">{c.name}</h4>
            {#each sortedByKey(c.relationships.withInteractionChain(MarriagePartners), ([rv, ic]) => -rv.relatedness) as [rv, ic]}
                <div>
                    {pct(rv.relatedness)}: 
                    <EntityLink entity={rv.object} />
                    of
                    <EntityLink entity={rv.object.settlement} />
                    {#if rv.object.settlement.parent}(<EntityLink entity={rv.object.settlement.parent} />){/if}
                </div>
            {/each}
        </div>
        {/each}
    </div>
</div>