<script lang="ts">
    import { Clan } from "../model/people/people";
    import { MarriagePartners, RelationshipView, Stance } from "../model/people/relationships";
    import { pct, spct, unsignedFormat } from "../model/lib/format";
    import { sortedByKey } from "../model/lib/basics";
    import { type Table, CrossTab, SingleRecordTable } from "./tables/tables2";
    import EntityLink from "./state/EntityLink.svelte";
    import TableView2 from "./tables/TableView2.svelte";
    import type { SettlementDTO } from "../model/records/dtos";
    import type { Snippet } from "svelte";
    
    let { settlement }: { settlement: SettlementDTO }= $props();
    let clans = $derived(settlement.clans);

    function buildRelationshipsTable<CellValue>(
        valueFn: (rowClan: Clan, colClan: Clan) => CellValue,
        formatFn: (value: CellValue) => string,
        cellTooltip: Snippet<[CellValue, Clan, Clan]>): CrossTab<Clan, CellValue> {

        const clans = sortedByKey(settlement.clans.map(c => c.ref), c => -c.averageRespect);
            
        return new CrossTab<Clan, CellValue>(
            clans,
            (clan: Clan) => clan.name,
            valueFn,
            formatFn,
            cellTooltip,
        )
    }

    function interactionLevelCellValue(rowClan: Clan, colClan: Clan): number {
        const rv = rowClan.relationships.get(colClan);
        if (!rv) {
            return 0;
        }
        return rv.attention / rv.object.population;
    }

    function alignmentCellValue(rowClan: Clan, colClan: Clan): number {
        const r = rowClan.relationships.get(colClan);
        if (!r) {
            return 0;
        }
        return r.alignment.value;
    }

    function stanceCellValue(rowClan: Clan, colClan: Clan): Stance {
        const r = rowClan.relationships.get(colClan);
        if (!r) {
            return Stance.Generous;
        }
        return r.stance;
    }
</script>

<style>
</style>

{#snippet interactionVolumeCellTooltip(value: number, subject: Clan, object: Clan)}
n/a
{/snippet}

{#snippet alignmentCellTooltip(value: number, subject: Clan, object: Clan)}
  {@const rv = subject.relationships.get(object)}
  {@const a = rv ? rv.alignment : undefined}
  {#if a}
    Base {pct(a.base)} from {a.attention} attention / {a.objectPopulation} population
    <br>
    {spct(a.interactionTypeModifier)} from {a.interactionType}
  {/if}
{/snippet}

{#snippet stanceCellTooltip(value: Stance, subject: Clan, object: Clan)}
n/a
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
            <h3>Stance</h3>
            <TableView2 table={buildRelationshipsTable(stanceCellValue, s => s.toString(), stanceCellTooltip)}></TableView2>
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