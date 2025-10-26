<style>
    #top {
        margin-left: 1rem;
    }

    h1 {
        margin: 0 0 1rem 0;
    }

    .graph-container {
        padding: 16px 4px 16px 16px;
        width: 300px;
        height: 200px;
        border: 1px solid #ccc;
    }
</style>

<script lang="ts">
    import { maxbyWithValue, minbyWithValue, type OptByWithValue } from "../model/lib/basics";
    import { pctFormat, signedFormat } from "../model/lib/format";
    import { ConsumptionCalc } from "../model/people/people";
    import DataTable from "./DataTable.svelte";
    import LineGraph from "./LineGraph.svelte";
    import TableView from "./TableView.svelte";
    import type { ClanDTO, WorldDTO } from "./dtos";
    import { PopulationScaler, ZeroCenteredScaler } from "./linegraph";
    import { selectClan, selectSettlement } from "./state/uistate.svelte";
    import { TableBuilder } from "./tablebuilder";

    let { world }: { world: WorldDTO } = $props();

    let popData = $derived.by(() => {
        return {
            title: 'Population',
            yAxisScaler: new PopulationScaler(),
            labels: world.timeline.map(timePoint => timePoint.year.toString()),
            datasets: [{
                label: 'Population',
                data: world.timeline.map(timePoint => timePoint.totalPopulation),
                color: 'blue'
            }]
        };
    });

    let qolData = $derived.by(() => {
        return {
            title: 'Quality of Life',
            yAxisScaler: new ZeroCenteredScaler(),
            labels: world.timeline.map(timePoint => timePoint.year.toString()),
            datasets: [{
                label: 'Welfare',
                data: world.timeline.map(timePoint => timePoint.averageAppeal),
                color: 'black',
            }, {
                label: 'Subsistence',
                data: world.timeline.map(timePoint => timePoint.averageSubsistenceSat),
                color: 'green',
            }, {
                label: 'Happiness',
                data: world.timeline.map(timePoint => timePoint.averageHappiness),
                color: 'red',
            }]
        };
    });

    let notableClansTable = $derived.by(() => {
        const specs: [string, OptByWithValue<ClanDTO>, (clan: ClanDTO) => number, (n: number) => string][] = [
            ['Biggest', maxbyWithValue, clan => clan.population, n => n.toFixed()],
            ['Smallest', minbyWithValue,  clan => clan.population, n => n.toFixed()],
            ['Best fed', maxbyWithValue, clan => clan.consumption.perCapitaSubsistence(), pctFormat(0, false)],
            ['Worst fed', minbyWithValue, clan => clan.consumption.perCapitaSubsistence(), pctFormat(0, false)],
            ['Best SoL', maxbyWithValue, clan => clan.happiness.appeal, signedFormat()],
            ['Worst SoL', minbyWithValue, clan => clan.happiness.appeal, signedFormat()],
            ['Happiest', maxbyWithValue, clan => clan.happiness.appeal, signedFormat()],
            ['Least happy', minbyWithValue, clan => clan.happiness.appeal, signedFormat()],
            ['Most influential', maxbyWithValue, clan => clan.influence, pctFormat()],
            ['Least influential', minbyWithValue, clan => clan.influence, pctFormat()],
        ];

        const clans = [...world.clans()];
        const items: [string, {clan: ClanDTO, displayValue: string}][] =
            specs.map(([name, optBy, clanValueFn, fmt]) => {
                const [clan, value] = optBy(clans, clanValueFn);
                return [name, {clan, displayValue: fmt(value)}];
            });


        return TableBuilder.fromItems(items, [
            {
                label: 'Value',
                valueFn: i => i.displayValue,
            },
            { 
                label: 'Clan',
                valueFn: i => i.clan.name,
                onClickCell: (item, _) => selectClan(item.clan),
            },
            {
                label: 'of',
                valueFn: i => 'of',
            },
            {
                label: 'Settlement',
                valueFn: i => i.clan.ref.settlement.name,
                onClickCell: (item, _) => selectSettlement(item.clan.ref.settlement),
            },
        ])
        .hideColumnHeaders()
        .table;
    });

</script>

<div id="top">
    <h1>𒌦 &centerdot; The Land</h1>
    <h3>{world.population} people</h3>

    <div style="display: flex; gap: 2em;">
        <div>
            <h4>Statistics</h4>
            <DataTable rows={world.stats} />

            <h4>Notable Clans</h4>
            <TableView table={notableClansTable} />
        </div>

        <div>
            <div class="graph-container">
                <LineGraph data={popData} />
            </div>

            <div class="graph-container" style="margin-top: 2rem;">
                <LineGraph data={qolData} />
            </div>
        </div>
    </div>
</div>