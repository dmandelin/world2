<script lang="ts">
    import { populationChangeModifierTable, populationChangeTable } from "./tables";
    import LineGraph from "./LineGraph.svelte";
    import { PopulationScaler } from "./linegraph";
    import type { SettlementTimePoint } from "../model/records/timeline";

    let { settlement } = $props();
    let table = $derived(populationChangeTable(settlement));

    let brModifiers = $derived(populationChangeModifierTable(
        settlement, 
        clan => clan.lastPopulationChange.brModifiers,
        clan => clan.lastPopulationChange.brModifier));

    let drModifiers = $derived(populationChangeModifierTable(
        settlement, 
        clan => clan.lastPopulationChange.drModifiers,
        clan => clan.lastPopulationChange.drModifier));

    let popData = $derived.by(() => {
        return {
            title: 'Population',
            yAxisScaler: new PopulationScaler(),
            labels: settlement.timeline.map((timePoint: SettlementTimePoint) => timePoint.year.toString()),
            datasets: [{
                label: 'Population',
                data: settlement.timeline.map((timePoint: SettlementTimePoint) => timePoint.population),
                color: '#666',
            }],
            secondYAxis: {
                scaler: new PopulationScaler(),
                datasets: [{
                    label: 'Disease Load',
                    data: settlement.timeline.map((timePoint: SettlementTimePoint) => timePoint.diseaseLoad * 1000),
                    color: 'green',
                }],
            },
        };
    });
</script>

<style>
    td, th {
        text-align: left;
        padding: 0.125em 0.5em;
    }

    td:not(:first-child), th:not(:first-child) {
        text-align: right;
    }

    tr:last-child {
        font-weight: bold;
    }
</style>

<div style="display: flex; gap: 4rem">
    <div>
        <table>
            <thead>
                <tr>
                    {#each table.header as cell}
                        <th>{cell}</th>
                    {/each}
                </tr>
            </thead>
            <tbody>
                {#each table.rows as row}
                    <tr>
                        {#each row as cell}
                            <td>{cell}</td>
                        {/each}
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>
    <div class="graph-container">
        <LineGraph data={popData} />
    </div>
</div>

<div style="display: flex; gap: 2rem; margin-top: 1rem;">
    <div>
        <h4>Birth rate modifiers</h4>
        <table>
            <thead>
                <tr>
                    <th>Source</th>
                    <th>Modifier</th>
                </tr>
            </thead>
            <tbody>
                {#each brModifiers.rows as row}
                    <tr>
                        {#each row as cell}
                            <td>{cell}</td>
                        {/each}
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>
    <div>
        <h4>Death rate modifiers</h4>
        <table>
            <thead>
                <tr>
                    <th>Source</th>
                    <th>Modifier</th>
                </tr>
            </thead>
            <tbody>
                {#each drModifiers.rows as row}
                    <tr>
                        {#each row as cell}
                            <td>{cell}</td>
                        {/each}
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>
    <div>
        <h4>Disease</h4>
        <p>{(settlement.cluster.diseaseLoad.value * 1000).toFixed()}</p>
    </div>
</div>
