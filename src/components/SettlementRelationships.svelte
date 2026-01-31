<script lang="ts">
    import { Clan } from "../model/people/people";
    import { pct, signed, unsigned } from "../model/lib/format";
    import { sortedByKey } from "../model/lib/basics";
    import { TableBuilder, type Table } from "./tablebuilder";
    import EntityLink from "./state/EntityLink.svelte";
    import TableView from "./TableView.svelte";
    import type { SettlementDTO } from "./dtos";
    import type { Snippet } from "svelte";
    
    let { settlement }: { settlement: SettlementDTO }= $props();
    let clans = $derived(settlement.clans);

    function buildRelationshipsTable(
        settlement: SettlementDTO, cellTooltip: Snippet<[Clan, Clan]>): Table<Clan, Clan> {

        return TableBuilder.crossTab(
            sortedByKey(settlement.clans.map(c => c.ref), c => -c.averageRespect),
            clan => clan.name,
            (rowClan, colClan) => rowClan.relationships.get(colClan)?.interactionVolume.amount ?? 0,
            value => unsigned(value, 2),
            cellTooltip,
        )
        .addAverageRow(rowClan => (rowClan as Clan).population).table;
    }

    /*
export function buildRespectTooltip(
    subject: Clan, object: Clan): Table<RespectCalcItem, string> {
    const respectCalc: RespectCalc = subject.relationships.get(object.ref)!;
    return TableBuilder.fromRecordItems(
        respectCalc.items,
        [
            { label: '', valueFn: item => item.value, formatFn: value => signed(value, 2) },

        ])
        .addTotalRow()
        .table;
}
*/
</script>

<style>
</style>

{#snippet cellTooltip(subject: Clan, object: Clan)}
TOOLTIP
<!--
  {pct(subject.relationships.get(object)?.informationLevel ?? 0)} informed
  <TableView table={buildRelationshipsTooltip(subject, object)}></TableView>
-->
{/snippet}

<div style="display: flex; flex-direction: row; gap: 2rem;">
    <div>
        <h3>Relationships</h3>
        <TableView table={buildRelationshipsTable(settlement, cellTooltip)}></TableView>
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