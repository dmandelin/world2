<script lang="ts">
    import { Clan } from "../model/people/people";
    import { pct, signed, unsigned } from "../model/lib/format";
    import { sortedByKey } from "../model/lib/basics";
    import { TableBuilder, type Table } from "./tablebuilder";
    import EntityLink from "./state/EntityLink.svelte";
    import TableView from "./TableView.svelte";
    import type { SettlementDTO } from "./dtos";
    import type { Snippet } from "svelte";
    import type { Relationship } from "../model/people/relationships";
    
    let { settlement }: { settlement: SettlementDTO }= $props();
    let clans = $derived(settlement.clans);

    function buildRelationshipsTable(
        settlement: SettlementDTO, 
        field: 'interactionVolume' | 'alignment',
        cellTooltip: Snippet<[Clan, Clan]>): Table<Clan, Clan> {

        return TableBuilder.crossTab(
            sortedByKey(settlement.clans.map(c => c.ref), c => -c.averageRespect),
            clan => clan.name,
            (rowClan, colClan) => rowClan.relationships.get(colClan)?.[field].value ?? 0,
            value => unsigned(value, 2),
            cellTooltip,
        )
        .addAverageRow(rowClan => (rowClan as Clan).population).table;
    }

    function buildCellTooltip(
        subject: Clan, object: Clan, field: 'interactionVolume' | 'alignment'): Table<number, string> {
        
        const r = subject.relationships.get(object);
        if (!r) {
            return {
                columns: [
                    { label: 'Value'},
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

    function buildInteractionVolumeCellTooltip(r: Relationship): Table<number, string> {
        const d = r.interactionVolume;
        return {
            columns: [
                { label: 'Value', formatFn: v => unsigned(v, 2) },
            ],
            rows: [
                {
                    label: 'Attention',
                    items: {'Value': d.attentionFraction}
                },
                {
                    label: 'Nomadic Contact',
                    items: {'Value': d.nomadicVolume}
                },
                {
                    label: 'Coresidence',
                    items: {'Value': d.coresidenceFactor}
                },
                {
                    label: 'Settlement Scale Factor',
                    items: {'Value': d.settlementScaleFactor}
                },
                {
                    label: 'Settlement Contact',
                    items: {'Value': d.coresidentVolume}
                },

            ]
        }
    }

    function buildAlignmentCellTooltip(r: Relationship): Table<number, string> {
        const d = r.alignment;
        return TableBuilder.fromRecordItems(
                d.items,
                [{label: 'Value', valueFn: row => row, formatFn: v => signed(v, 2)}])
            .addTotalRow()
            .table;
    }
</script>

<style>
</style>

{#snippet interactionVolumeCellTooltip(subject: Clan, object: Clan)}
  <TableView table={buildCellTooltip(subject, object, 'interactionVolume')}></TableView>
{/snippet}

{#snippet alignmentCellTooltip(subject: Clan, object: Clan)}
  <TableView table={buildCellTooltip(subject, object, 'alignment')}></TableView>
{/snippet}

<div style="display: flex; flex-direction: row; gap: 2rem;">
    <div>
        <div>
            <h3>Interaction Level</h3>
            <TableView table={buildRelationshipsTable(settlement, 'interactionVolume', interactionVolumeCellTooltip)}></TableView>
        </div>
        <div>
            <h3>Alignment</h3>
            <TableView table={buildRelationshipsTable(settlement, 'alignment', alignmentCellTooltip)}></TableView>
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