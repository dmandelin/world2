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
    import DataTable from "./DataTable.svelte";
    import LineGraph from "./LineGraph.svelte";
    import type { WorldDTO } from "./dtos";
    import { PopulationScaler, ZeroCenteredScaler } from "./linegraph";

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
                label: 'QoL',
                data: world.timeline.map(timePoint => timePoint.averageQoL),
                color: 'black',
            }, {
                label: 'Subsistence sat',
                data: world.timeline.map(timePoint => timePoint.averageSubsistenceSat),
                color: 'green',
            }, {
                label: 'Ritual sat',
                data: world.timeline.map(timePoint => timePoint.averageRitualSat),
                color: 'red',
            }]
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
            <DataTable rows={world.notableClans} />
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