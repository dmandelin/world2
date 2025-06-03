<style>
    #top {
        margin-left: 1rem;
    }

    h1 {
        margin: 0 0 1rem 0;
    }

    .graph-container {
        width: 300px;
        height: 200px;
        border: 2px solid #2c250d;
    }
</style>

<script lang="ts">
    import DataTable from "./DataTable.svelte";
    import LineGraph from "./LineGraph.svelte";
    import type { WorldDTO } from "./dtos";

    let { world }: { world: WorldDTO } = $props();

    let popData = $derived.by(() => {
        return {
            title: 'Population',
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
            labels: world.timeline.map(timePoint => timePoint.year.toString()),
            datasets: [{
                label: 'QoL',
                data: world.timeline.map(timePoint => timePoint.averageQoL),
                color: 'green',
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