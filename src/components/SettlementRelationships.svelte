<script lang="ts">
    import { Clan } from "../model/people/people";
    import { pct, signed, unsigned, unsignedFormat } from "../model/lib/format";
    import { sortedByKey } from "../model/lib/basics";
    import EntityLink from "./state/EntityLink.svelte";
    import TableView2 from "./tables/TableView2.svelte";
    import { Stance, type Relationship } from "../model/people/relationships";
    import type { SettlementDTO } from "./dtos";
    import type { Snippet } from "svelte";
    import { type Table, type TableColumn, CrossTab, SingleRecordTable } from "./tables/tables2";
    
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
        const r = rowClan.relationships.get(colClan);
        if (!r) {
            return 0;
        }
        return r.interactionVolume.value;
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

    function buildCellTooltip(
        subject: Clan, object: Clan, field: 'interactionVolume' | 'alignment'): Table<string, string, [number]> {
        
        const r = subject.relationships.get(object);
        if (!r) {
            return {
                columns: [
                    { data: 'Value', label: 'Value', valueFn: row => 0 },
                ],
                rows: [
                ]
            }
        }
        if (field === 'alignment') {
            return buildAlignmentCellTooltip(r);
        } else {
            return buildInteractionVolumeCellTooltip(r);
        }
    }

    function buildInteractionVolumeCellTooltip(r: Relationship): Table<string, string, [number]> {
        const d = r.interactionVolume;
        return new SingleRecordTable({
            'Attention': d.attentionFraction,
            'Nomadic Contact': d.nomadicVolume,
            'Coresidence': d.coresidenceFactor,
            'Settlement Scale Factor': d.settlementScaleFactor,
            'Settlement Contact': d.coresidentVolume,
        });
    }

    function buildAlignmentCellTooltip(r: Relationship): Table<string, string, [number]> {
        const d = r.alignment;
        return new SingleRecordTable(d.items);
    }
</script>

<style>
</style>

{#snippet interactionVolumeCellTooltip(value: number, subject: Clan, object: Clan)}
  <TableView2 table={buildCellTooltip(subject, object, 'interactionVolume')}></TableView2>
{/snippet}

{#snippet alignmentCellTooltip(value: number, subject: Clan, object: Clan)}
  <TableView2 table={buildCellTooltip(subject, object, 'alignment')}></TableView2>
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
    </div>
</div>