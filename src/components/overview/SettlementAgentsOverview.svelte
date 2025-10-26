<script lang="ts">
    import { signed } from "../../model/lib/format";
    import type { ClanDTO, SettlementDTO } from "../dtos";
    import { TableBuilder } from "../tablebuilder";
    import TableView from "../TableView.svelte";

	let { settlement }: { settlement: SettlementDTO } = $props();

    function settlementClanTable(settlement: SettlementDTO) {
        return TableBuilder.fromNamedItems(settlement.clans, [
            {
                label: "Pop",
                valueFn: c => c.population,
            },
            {
                label: "Sus",
                valueFn: c => c.consumption.perCapitaSubsistence(),
                formatFn: v => (100 * v).toFixed(),
            },
            {
                label: "SoL",
                valueFn: c => c.happiness.appeal,
                formatFn: v => signed(v, 0),
                tooltip: clanHappinessTooltip,
            },
            {
                label: "Hap",
                valueFn: c => c.happiness.value,
                formatFn: v => signed(v, 0),
                tooltip: clanHappinessTooltip,
            },
            {
                label: "Res",
                valueFn: c => c.averagePrestige,
                formatFn: v => signed(v, 0),
            },
        ])
        .table;
    }

    function clanHappinessTooltipTable(clan: ClanDTO) {
        return TableBuilder.fromMapItems(clan.happiness.items, [
            {
                label: "A",
                valueFn: i => i.appeal,
                formatFn: v => signed(v, 1),
            },
            {
                label: "E",
                valueFn: i => i.expectedAppeal,
                formatFn: v => signed(v, 1),
            },
            {
                label: "H",
                valueFn: i => i.value,
                formatFn: v => signed(v, 1),
            },
        ])
        .table;
    }
</script>

{#snippet clanHappinessTooltip(clan: ClanDTO)}
  <TableView table={clanHappinessTooltipTable(clan)}></TableView>
{/snippet}

<div id="top">
    <h3 style="margin-block-end: 0.5em;">Clans</h3>
    <TableView table={settlementClanTable(settlement)}></TableView>
</div>