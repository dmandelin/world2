<script lang="ts">
    import { signed, spct } from "../../model/lib/format";
    import type { PopulationChangeModifier } from "../../model/people/population";
    import type { ClanDTO, SettlementDTO } from "../dtos";
    import MigrationPlan from "../MigrationPlan.svelte";
    import { selectClan } from "../state/uistate.svelte";
    import { TableBuilder } from "../tablebuilder";
    import TableView from "../TableView.svelte";

	let { settlement }: { settlement: SettlementDTO } = $props();

    function settlementClanTable(settlement: SettlementDTO) {
        return TableBuilder.fromNamedItems(settlement.clans, [
            {
                label: "★",
                valueFn: c => migrationPlanValue(c),
                formatFn: 'imgsrc',
                tooltip: clanMigrationPlanTooltip,
            },
            {
                label: "Pop",
                valueFn: c => c.population,
            },
            {
                label: "BR",
                valueFn: c => c.lastPopulationChange.brModifier,
                formatFn: v => spct(v),
                tooltip: clanBrModifiersTooltip,
            },
            {
                label: "DR",
                valueFn: c => c.lastPopulationChange.drModifier,
                formatFn: v => spct(v),
                tooltip: clanDrModifiersTooltip,
            },
            {
                label: "Sus",
                valueFn: c => c.consumption.perCapitaSubsistence(),
                formatFn: v => (100 * v).toFixed(),
                tooltip: clanSustenanceTooltip,
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
        .onClickRowHeader((clan: ClanDTO) => {
            selectClan(clan);
        })
        .table;
    }

    function migrationPlanValue(clan: ClanDTO): string {
        if (clan.migrationPlan?.willMigrate) {
            return "migrate-yes-256.png";
        } else if (clan.migrationPlan?.wantToMove) {
            return "migrate-want-256.png";
        } else {
            return "";
        }
    }

    function clanPopChangeModifierTooltip(modifiers: readonly PopulationChangeModifier[]) {
        return TableBuilder.fromKeyedItems(modifiers, 'source', [
            {
                label: "",
                valueFn: i => i.inputValue,
                formatFn: v => typeof v === "number" ? v.toFixed(2) : v,
            },
            {
                label: "",
                valueFn: i => i.value,
                formatFn: v => spct(v),
            },
        ])
        .table;
    }

    function clanSustenanceTooltipTable(clan: ClanDTO) {
        return TableBuilder.fromRecordItems(clan.consumption.perCapitaSubistenceAmounts, [
            {
                label: "Q",
                valueFn: i => i,
                formatFn: v => (100 * v).toFixed(),
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

{#snippet clanMigrationPlanTooltip(clan: ClanDTO)}
    <MigrationPlan plan={clan.migrationPlan} />
{/snippet}

{#snippet clanSustenanceTooltip(clan: ClanDTO)}
  <TableView table={clanSustenanceTooltipTable(clan)}></TableView>
{/snippet}

{#snippet clanHappinessTooltip(clan: ClanDTO)}
  <TableView table={clanHappinessTooltipTable(clan)}></TableView>
{/snippet}

{#snippet clanBrModifiersTooltip(clan: ClanDTO)}
  <TableView table={clanPopChangeModifierTooltip(clan.lastPopulationChange.brModifiers)}></TableView>
{/snippet}

{#snippet clanDrModifiersTooltip(clan: ClanDTO)}
  <TableView table={clanPopChangeModifierTooltip(clan.lastPopulationChange.drModifiers)}></TableView>
{/snippet}

<div id="top">
    <h3 style="margin-block-end: 0.5em;">Clans</h3>
    <TableView table={settlementClanTable(settlement)}></TableView>
</div>