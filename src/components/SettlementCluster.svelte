<script lang="ts">
    import type { ClusterDTO } from "../model/records/dtos";
    import EntityStatsTable, { type EntityColumnSpec } from "./tables/EntityStatsTable.svelte";

    let { cluster }: { cluster: ClusterDTO } = $props();

    let columns = $derived.by<EntityColumnSpec[]>(() => {
        const cols: EntityColumnSpec[] = [];
        // First column: cluster aggregate
        cols.push({
            label: "Cluster",
            clans: cluster.clans,
            population: cluster.population,
        });
        // One column per settlement
        for (const s of cluster.settlements) {
            cols.push({
                label: s.name,
                entity: s,
                clans: s.clans,
                population: s.population,
            });
        }
        return cols;
    });
</script>

<div id="top">
    <h2>
        {cluster.name}
        <span class="stats">
            | Pop {cluster.population}
            | {cluster.settlements.length} settlement{cluster.settlements.length !== 1 ? 's' : ''}
        </span>
    </h2>

    <EntityStatsTable {columns} />
</div>

<style>
    #top {
        margin-left: 1rem;
    }

    h2 {
        margin: 0.25rem 0;
    }

    .stats {
        font-size: 0.7em;
        font-weight: normal;
        color: #6e5b47;
    }
</style>
