<script lang="ts">
    import { maxbyWithValue, safeDiv } from "../model/lib/basics";
    import DataTable from "./DataTable.svelte";
    import LineGraph from "./LineGraph.svelte";
    import type { ClanDTO, WorldDTO } from "../model/records/dtos";
    import { PopulationScaler, ZeroCenteredScaler } from "./linegraph";
    import { SkillDefs } from "../model/econ/econdefs";
    import EntityStatsTable, { type EntityColumnSpec } from "./tables/EntityStatsTable.svelte";

    let { world }: { world: WorldDTO } = $props();

    let activeTab = $state<"Overview" | "Areas" | "Settlements" | "Clans">("Areas");
    const tabs: ("Overview" | "Areas" | "Settlements" | "Clans")[] = ["Overview", "Areas", "Settlements", "Clans"];

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

    let allClans = $derived([...world.clanMap.values()]);

    let areaColumns = $derived.by<EntityColumnSpec[]>(() => {
        const cols: EntityColumnSpec[] = [
            {
                label: "World",
                clans: allClans,
                population: world.population,
            }
        ];

        for (const cluster of world.clusters) {
            cols.push({
                label: cluster.name,
                entity: { uuid: cluster.uuid, name: cluster.name },
                clans: cluster.clans,
                population: cluster.population,
            });
        }
        return cols;
    });

    let settlementColumns = $derived.by<EntityColumnSpec[]>(() => {
        const cols: EntityColumnSpec[] = [
            {
                label: "World",
                clans: allClans,
                population: world.population,
            }
        ];

        const topSettlements = [...world.settlements]
            .sort((a, b) => b.population - a.population)
            .slice(0, 7);

        for (const settlement of topSettlements) {
            cols.push({
                label: settlement.name,
                entity: settlement,
                clans: settlement.clans,
                population: settlement.population,
            });
        }
        return cols;
    });

    let clanColumns = $derived.by<EntityColumnSpec[]>(() => {
        const cols: EntityColumnSpec[] = [
            {
                label: "World",
                clans: allClans,
                population: world.population,
            }
        ];

        if (allClans.length === 0) return cols;

        const specs: { label: string; keyFn: (c: ClanDTO) => number }[] = [
            { label: "Largest", keyFn: (c) => c.population },
            { label: "Healthiest", keyFn: (c) => safeDiv(c.lastPopulationChange.brModifier, c.lastPopulationChange.drModifier) },
            { label: "Happiest", keyFn: (c) => c.happiness.appeal },
            { label: "Best Fed", keyFn: (c) => c.qol.valueFrom("food") },
            { label: "Best Farmers", keyFn: (c) => c.skills.v(SkillDefs.Agriculture) },
            { label: "Best Fishers", keyFn: (c) => c.skills.v(SkillDefs.Fishing) },
        ];

        for (const spec of specs) {
            const [clan] = maxbyWithValue(allClans, spec.keyFn);
            if (clan) {
                cols.push({
                    label: spec.label,
                    entity: clan,
                    clans: [clan],
                    population: clan.population,
                });
            }
        }

        return cols;
    });
</script>

<div id="top">
    <h1>𒌦 &centerdot; The Land</h1>
    <h3>{world.population} people</h3>

    <div class="tab-button-group">
        {#each tabs as tab}
            <button
                type="button"
                class="tab-btn {activeTab === tab ? 'active' : ''}"
                onclick={() => activeTab = tab}
            >
                {tab}
            </button>
        {/each}
    </div>

    <div class="tab-content">
        {#if activeTab === "Overview"}
            <div style="display: flex; gap: 2em; margin-top: 1rem;">
                <div>
                    <h4>Statistics</h4>
                    <DataTable rows={world.stats} />
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
        {:else if activeTab === "Areas"}
            <div style="margin-top: 1rem;">
                <EntityStatsTable columns={areaColumns} />
            </div>
        {:else if activeTab === "Settlements"}
            <div style="margin-top: 1rem;">
                <EntityStatsTable columns={settlementColumns} />
            </div>
        {:else if activeTab === "Clans"}
            <div style="margin-top: 1rem;">
                <EntityStatsTable columns={clanColumns} />
            </div>
        {/if}
    </div>
</div>

<style>
    #top {
        margin-left: 1rem;
    }

    h1 {
        margin: 0 0 0.5rem 0;
    }

    h3 {
        margin: 0 0 1rem 0;
    }

    .graph-container {
        padding: 16px 4px 16px 16px;
        width: 300px;
        height: 200px;
        border: 1px solid #ccc;
    }

    .tab-button-group {
        display: inline-flex;
        gap: 0.25rem;
        background-color: #f3edd8;
        padding: 0.25rem;
        border-radius: 4px;
        align-items: center;
    }

    .tab-btn {
        all: unset;
        font-size: 0.9rem;
        padding: 0.25rem 0.75rem;
        cursor: pointer;
        border-radius: 3px;
        color: #333;
        transition:
            background-color 0.2s,
            font-weight 0.2s;
    }

    .tab-btn:hover {
        background-color: rgba(0, 0, 0, 0.05);
    }

    .tab-btn.active {
        font-weight: bold;
        background-color: #fff;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
</style>