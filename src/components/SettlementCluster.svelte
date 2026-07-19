<script lang="ts">
    import type { ClusterDTO, ClanDTO, SettlementDTO } from "../model/records/dtos";
    import { MutualAidInteraction, clanHelpDemand, getHelpReceivedValueFromMutualAid, getHelpProductivityModifier } from "../model/relations/mutualaid";
    import {
        pct,
        signed,
        spct,
        unsigned,
    } from "../model/lib/format";
    import { populationAverage } from "../model/lib/modelbasics";
    import { safeDiv } from "../model/lib/basics";
    import EntityLink from "./state/EntityLink.svelte";

    let { cluster }: { cluster: ClusterDTO } = $props();

    // A column is either the whole cluster or a single settlement.
    interface Column {
        label: string;
        entity?: { uuid: string; name: string }; // for EntityLink
        clans: ClanDTO[];
        population: number;
    }

    let columns = $derived.by<Column[]>(() => {
        const cols: Column[] = [];
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

    // Row definition: label + value extractor from a ClanDTO
    interface RowDef {
        label: string;
        value: (c: ClanDTO) => number;
        format: (v: number) => string;
        isHeader?: boolean;
    }

    let relevantProcesses = $derived.by(() => {
        const procs = new Set(cluster.clans.flatMap(c => c.production.rs.map(opr => opr.operation.process)));
        return [...procs].sort((a, b) => a.sortKey - b.sortKey);
    });

    let rowGroups = $derived.by<RowDef[][]>(() => {
        const groups: RowDef[][] = [];

        // Group 1: Demographics
        groups.push([
            { label: "People", value: (c) => c.population, format: (v) => v.toFixed(0) },
            { label: "Support Ratio", value: (c) => safeDiv(c.population, c.workers), format: (v) => v.toFixed(1) },
            { label: "Birth rate mod", value: (c) => c.lastPopulationChange.brModifier, format: spct },
            { label: "Death rate mod", value: (c) => c.lastPopulationChange.drModifier, format: spct },
        ]);

        // Group 2: Welfare
        groups.push([
            { label: "Happiness", value: (c) => c.happiness.appeal, format: signed },
            { label: "Social Welfare", value: (c) => c.happiness.socialAppeal, format: signed },
            { label: "Material Welfare", value: (c) => c.happiness.subsistenceAppeal, format: signed },
            { label: "QoL", value: (c) => c.qol.value, format: signed },
            { label: "Stress", value: (c) => c.stress.value, format: signed },
            {
                label: "Mutual Aid",
                value: (c) => {
                    const world = cluster.world;
                    let totalValue = 0;
                    for (const other of world.clanMap.values()) {
                        if (c.uuid === other.uuid) continue;
                        const interactions = world.interactions.get(c.ref, other.ref);
                        const ma = interactions.find(i => i instanceof MutualAidInteraction) as MutualAidInteraction | undefined;
                        if (ma) {
                            totalValue += ma.amount * (1 - ma.icebergCost) * ma.trust;
                        }
                    }
                    const demand = clanHelpDemand(c.population);
                    return demand > 0 ? totalValue / demand : 0;
                },
                format: pct,
            },
            {
                label: "Help Modifier",
                value: (c) => {
                    const world = cluster.world;
                    const helpValue = getHelpReceivedValueFromMutualAid(world, c.ref);
                    const demand = clanHelpDemand(c.population);
                    return getHelpProductivityModifier(helpValue, demand);
                },
                format: spct,
            },
            { label: "Residence", value: (c) => c.residenceLevel.fractionInSettlement, format: pct },
        ]);

        // Group 3: Marriage Appeal
        groups.push([
            { label: "Avg Marriage Appeal", value: (c) => c.marriageAppealAverage, format: (v) => signed(v, 2) },
            { label: "Marriage Appeal SD", value: (c) => c.marriageAppealStdDev, format: (v) => v.toFixed(2) },
        ]);

        // Group 4: Food
        groups.push([
            { label: "Food", value: (c) => c.consumption.perCapitaFood, format: pct },
            { label: "Food Target", value: (c) => c.targetPerCapitaFood, format: pct },
            { label: "Food Storage", value: (c) => c.consumption.perCapitaFoodStock, format: pct },
            { label: "Food Security", value: (c) => 1 - c.consumption.foodInsecurity.value, format: pct },
        ]);

        // Group 5: Processes (dynamic)
        for (const process of relevantProcesses) {
            groups.push([
                { label: process.name, value: () => 0, format: () => "", isHeader: true },
                { label: "\u00a0Production", value: (c) => c.production.getForProcess(process, "amount") ?? 0, format: (v) => v.toFixed(0) },
                { label: "\u00a0Labor", value: (c) => c.production.getForProcess(process, "labor") ?? 0, format: (v) => v.toFixed(0) },
                { label: "\u00a0Land", value: (c) => c.production.getForProcess(process, "land") ?? 0, format: (v) => v.toFixed(0) },
                { label: "\u00a0Base LP", value: (c) => c.production.getForProcess(process, "laborProductivityFactor") ?? 0, format: spct },
                {
                    label: "\u00a0YPL",
                    value: (c) => safeDiv(
                        c.production.getForProcess(process, "amount") ?? 0,
                        c.production.getForProcess(process, "labor") ?? 0,
                    ),
                    format: (v) => v.toFixed(2),
                },
                {
                    label: "\u00a0YPC",
                    value: (c) => safeDiv(
                        c.production.getForProcess(process, "amount") ?? 0,
                        c.previousPopulation,
                    ),
                    format: (v) => v.toFixed(2),
                },
            ]);
        }

        // Group 6: Skills (dynamic)
        if (cluster.clans.length > 0) {
            const skillGroup: RowDef[] = [];
            for (const skill of cluster.clans[0].skills.keys()) {
                skillGroup.push({
                    label: skill.name,
                    value: (c) => c.skills.v(skill),
                    format: unsigned,
                });
            }
            if (skillGroup.length > 0) groups.push(skillGroup);
        }

        return groups;
    });

    function weightedAvgForColumn(col: Column, valueFn: (c: ClanDTO) => number): number {
        if (col.clans.length === 0) return 0;
        return populationAverage(col.clans, valueFn);
    }

    // For "People" row, show sum instead of average
    function sumForColumn(col: Column, valueFn: (c: ClanDTO) => number): number {
        return col.clans.reduce((sum, c) => sum + valueFn(c), 0);
    }

    // Determine if a row should use sum (e.g., People, Production, Labor, Land)
    function isSumRow(label: string): boolean {
        const sumLabels = ["People", "\u00a0Production", "\u00a0Labor", "\u00a0Land"];
        return sumLabels.includes(label);
    }
</script>

<div id="top">
    <h2>
        {cluster.name}
        <span class="stats">
            | Pop {cluster.population}
            | {cluster.settlements.length} settlement{cluster.settlements.length !== 1 ? 's' : ''}
        </span>
    </h2>

    <table>
        <thead>
            <tr>
                <td></td>
                {#each columns as col}
                    <td class="col-header">
                        {#if col.entity}
                            <EntityLink entity={col.entity} />
                        {:else}
                            <strong>{col.label}</strong>
                        {/if}
                        <div class="pop-sub">pop {col.population}</div>
                    </td>
                {/each}
            </tr>
        </thead>
        <tbody>
            {#each rowGroups as group, groupIdx}
                {#if groupIdx > 0}
                    <tr><td style="height: 0.5em"></td></tr>
                {/if}
                {#each group as row}
                    <tr class={row.isHeader ? "header-row" : ""}>
                        {#if row.isHeader}
                            <td colspan={1 + columns.length}><strong>{row.label}</strong></td>
                        {:else}
                            <td class="row-label">{@html row.label}</td>
                            {#each columns as col}
                                <td class="val">
                                    {#if col.clans.length === 0}
                                        -
                                    {:else}
                                        {@const v = isSumRow(row.label)
                                            ? sumForColumn(col, row.value)
                                            : weightedAvgForColumn(col, row.value)}
                                        {row.format(v)}
                                    {/if}
                                </td>
                            {/each}
                        {/if}
                    </tr>
                {/each}
            {/each}
        </tbody>
    </table>
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

    table {
        border-collapse: collapse;
    }

    td {
        padding: 0.1em 0.6em;
    }

    .col-header {
        text-align: center;
        font-weight: bold;
        vertical-align: bottom;
        border-bottom: 1px solid #ccc;
    }

    .pop-sub {
        font-size: 0.75em;
        font-weight: normal;
        color: #888;
    }

    .row-label {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 12em;
    }

    .val {
        text-align: right;
        padding-right: 1.3em;
    }

    .header-row td {
        padding-top: 0.3em;
        font-style: italic;
    }
</style>
