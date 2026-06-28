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
    import { pctFormat, signedFormat, unsigned } from "../model/lib/format";
    import DataTable from "./DataTable.svelte";
    import DataTable2 from "./tables/TableView2.svelte";
    import LineGraph from "./LineGraph.svelte";
    import { IterableTable } from "./tables/tables2";
    import type { ClanDTO, WorldDTO } from "../model/records/dtos";
    import { PopulationScaler, ZeroCenteredScaler } from "./linegraph";
    import { selectClan, selectSettlement } from "./state/uistate.svelte";
    import { clansOfPairID } from "../model/relations/connection";

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
            ['Best fed', maxbyWithValue, clan => clan.consumption.perCapitaFood, pctFormat(0, false)],
            ['Worst fed', minbyWithValue, clan => clan.consumption.perCapitaFood, pctFormat(0, false)],
            ['Best SoL', maxbyWithValue, clan => clan.happiness.appeal, signedFormat()],
            ['Worst SoL', minbyWithValue, clan => clan.happiness.appeal, signedFormat()],
            ['Happiest', maxbyWithValue, clan => clan.happiness.appeal, signedFormat()],
            ['Least happy', minbyWithValue, clan => clan.happiness.appeal, signedFormat()],
            ['Most prestigious', maxbyWithValue, clan => clan.relationships.localRespect, unsigned],
            ['Least prestigious', minbyWithValue, clan => clan.relationships.localRespect, unsigned],
        ];

        const clans = [...world.clanMap.values()];
        const items =
            specs.map(([name, optBy, clanValueFn, fmt]) => {
                const [clan, value] = optBy(clans, clanValueFn);
                return { name, clan, displayValue: fmt(value) };
            });


        return {
            ...new IterableTable(items, i => i.name, [
                {
                    data: 'Value',
                    label: 'Value',
                    valueFn: i => i.displayValue,
                },
                { 
                    data: 'Clan',
                    label: 'Clan',
                    valueFn: i => i.clan.name,
                    onClickCell: (data, row) => selectClan(row.clan),
                },
                {
                    data: 'of',
                    label: 'of',
                    valueFn: i => 'of',
                },
                {
                    data: 'Settlement',
                    label: 'Settlement',
                    valueFn: i => i.clan.ref.settlement.name,
                    onClickCell: (data, row) => selectSettlement(row.clan.ref.settlement),
                },
            ]),
            hideHeader: true
        };
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
            <DataTable2 table={notableClansTable} />
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

    <div>
        <h4>Connections</h4>
        {#each world.connections.entries() as [pairID, connections]}
        {@const [c1, c2] = clansOfPairID(pairID, world)}
            <div><b>{c1.name} - {c2.name}</b></div>
            {#each connections as connection}
                <div>
                    {connection.debugString()}
                </div>
            {/each}
        {/each}
    </div>
</div>