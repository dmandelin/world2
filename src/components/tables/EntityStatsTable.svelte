<script lang="ts">
    import TableView2 from "./TableView2.svelte";
    import type { Table, TableColumn, TableRow } from "./tables2";
    import type { ClanDTO } from "../../model/records/dtos";
    import { MutualAidInteraction, clanHelpDemand, getHelpReceivedValueFromMutualAid, getHelpProductivityModifier } from "../../model/relations/mutualaid";
    import { pct, signed, spct, unsigned } from "../../model/lib/format";
    import { floodLevelByIndex, type ExtremeFlood, type FloodLevel } from "../../model/environment/flood";
    import ExtremeFloodIcon from "../widgets/ExtremeFloodIcon.svelte";
    import { populationAverage } from "../../model/lib/modelbasics";
    import { safeDiv, sortedByKey } from "../../model/lib/basics";
    import EntityLink from "../state/EntityLink.svelte";

    export interface EntityColumnSpec {
        label: string;
        sublabel?: string;
        entity?: { uuid: string; name: string };
        clans: ClanDTO[];
        population?: number;
    }

    interface RowDef {
        label: string;
        value: (c: ClanDTO) => number;
        format: (v: number) => string;
        isHeader?: boolean;
        isSum?: boolean;
        // For rows whose value belongs to the column's place rather than to
        // its clans, such as the weather over it.
        colValue?: (col: EntityColumnSpec) => string;
    }

    // How the year's flood fell over the settlements a column covers. A
    // column spanning one settlement has one level; a cluster or the world
    // may have several, so weight them by the people living under them.
    type FloodSummary = {
        level: FloodLevel;
        mixed: boolean;
        parts: { level: FloodLevel; settlements: number; population: number }[];
        // Extreme floods that caught anyone under this column this year.
        extremes: ExtremeFlood[];
    };

    function floodSummary(col: EntityColumnSpec): FloodSummary | undefined {
        const byLevel = new Map<FloodLevel, { settlements: Set<string>; population: number }>();
        let weighted = 0;
        let population = 0;
        for (const clan of col.clans) {
            const level = clan.settlement.floodLevel;
            let part = byLevel.get(level);
            if (!part) byLevel.set(level, part = { settlements: new Set(), population: 0 });
            part.settlements.add(clan.settlement.uuid);
            part.population += clan.population;
            weighted += level.index * clan.population;
            population += clan.population;
        }
        if (byLevel.size === 0 || population === 0) return undefined;

        const parts = sortedByKey(byLevel.entries(), ([level]) => level.index)
            .map(([level, part]) => ({
                level,
                settlements: part.settlements.size,
                population: part.population,
            }));
        const extremes = [...new Set(col.clans.flatMap(c => c.floodDamage.floods))];
        return {
            level: floodLevelByIndex(weighted / population),
            mixed: byLevel.size > 1,
            parts,
            extremes,
        };
    }

    let { columns }: { columns: EntityColumnSpec[] } = $props();

    let allClans = $derived(columns.flatMap(c => c.clans));

    let relevantProcesses = $derived.by(() => {
        const procs = new Set(allClans.flatMap(c => c.production.rs.map(opr => opr.operation.process)));
        return sortedByKey(procs, p => p.sortKey);
    });

    let rowGroups = $derived.by<RowDef[][]>(() => {
        const groups: RowDef[][] = [];

        // Group 0: Environment. The flood decides the year, so it leads.
        groups.push([
            {
                label: "Flood",
                value: () => 0,
                format: () => "",
                colValue: (col) => {
                    const summary = floodSummary(col);
                    if (!summary) return "-";
                    return summary.mixed ? `${summary.level.name}*` : summary.level.name;
                },
            },
        ]);

        // Group 1: Demographics
        groups.push([
            { label: "People", value: (c) => c.population, format: (v) => v.toFixed(0), isSum: true },
            { label: "Support Ratio", value: (c) => safeDiv(c.population, c.workers), format: (v) => v.toFixed(1) },
            { label: "Birth rate mod", value: (c) => c.lastPopulationChange.brModifier, format: spct },
            { label: "Death rate mod", value: (c) => c.lastPopulationChange.drModifier, format: spct },
        ]);

        // Group 2: Welfare
        groups.push([
            { label: "QoL", value: (c) => c.qol.value, format: signed },
            {
                label: "Mutual Aid",
                value: (c) => {
                    const world = c.world;
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
                    const world = c.world;
                    const helpValue = getHelpReceivedValueFromMutualAid(world, c.ref);
                    const demand = clanHelpDemand(c.population);
                    return getHelpProductivityModifier(helpValue, demand);
                },
                format: spct,
            },
            { label: "Residence", value: (c) => c.residenceLevel.fractionInSettlement, format: pct },
        ]);

        // Group 3: Prestige
        groups.push([
            { label: "Avg Prestige", value: (c) => c.prestigeAverage, format: (v) => signed(v, 0) },
        ]);

        // Group 4: Food
        groups.push([
            { label: "Food", value: (c) => c.consumption.perCapitaFood, format: pct },
            { label: "Food Stock", value: (c) => c.stock ? c.stock.perCapitaFoodStock(c.population) : 0, format: pct },
        ]);

        // Group 5: Processes (dynamic)
        for (const process of relevantProcesses) {
            groups.push([
                { label: process.name, value: () => 0, format: () => "", isHeader: true },
                { label: "&nbsp;Production", value: (c) => c.production.getForProcess(process, "amount") ?? 0, format: (v) => v.toFixed(0), isSum: true },
                { label: "&nbsp;Labor", value: (c) => c.production.getForProcess(process, "labor") ?? 0, format: (v) => v.toFixed(0), isSum: true },
                { label: "&nbsp;Land", value: (c) => c.production.getForProcess(process, "land") ?? 0, format: (v) => v.toFixed(0), isSum: true },
                { label: "&nbsp;Base LP", value: (c) => c.production.getForProcess(process, "laborProductivityFactor") ?? 0, format: spct },
                {
                    label: "&nbsp;YPL",
                    value: (c) => safeDiv(
                        c.production.getForProcess(process, "amount") ?? 0,
                        c.production.getForProcess(process, "labor") ?? 0,
                    ),
                    format: (v) => v.toFixed(2),
                },
                {
                    label: "&nbsp;YPC",
                    value: (c) => safeDiv(
                        c.production.getForProcess(process, "amount") ?? 0,
                        c.previousPopulation,
                    ),
                    format: (v) => v.toFixed(2),
                },
            ]);
        }

        // Group 6: Skills (dynamic)
        if (allClans.length > 0) {
            const skillGroup: RowDef[] = [];
            for (const skill of allClans[0].skills.keys()) {
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

    let table = $derived.by<Table<RowDef, EntityColumnSpec, [string]>>(() => {
        const tableCols: TableColumn<RowDef, EntityColumnSpec, string>[] = columns.map(col => ({
            data: col,
            label: col.label,
            headerSnippet: columnHeader,
            class: "col-header",
            valueFn: (row: RowDef) => {
                if (row.isHeader) return "";
                if (!col.clans || col.clans.length === 0) return "-";
                const val = row.isSum
                    ? col.clans.reduce((sum, c) => sum + row.value(c), 0)
                    : populationAverage(col.clans, row.value);
                return row.format(val);
            }
        }));

        const tableRows: TableRow<RowDef, EntityColumnSpec>[] = rowGroups.flat().map(row => ({
            data: row,
            label: row.label,
            isHeader: row.isHeader,
            class: row.isHeader ? "header-row" : "",
            valueFn: row.colValue ? (col: EntityColumnSpec) => row.colValue!(col) : undefined,
            cellSnippet: row.colValue ? floodCell : undefined,
            tooltip: row.colValue ? floodTooltip : undefined,
        }));

        return {
            columns: tableCols as any,
            rows: tableRows,
        };
    });
</script>

{#snippet floodCell(value: string, _row: RowDef, col: EntityColumnSpec)}
    {@const summary = floodSummary(col)}
    <span class="flood-cell">
        {value}
        {#each summary?.extremes ?? [] as flood, i (i)}
            <ExtremeFloodIcon {flood} size={16} tooltip={false} />
        {/each}
    </span>
{/snippet}

{#snippet floodTooltip(_value: any, _row: RowDef, col: EntityColumnSpec)}
    {@const summary = floodSummary(col)}
    {#if summary}
        <div><strong>{summary.level.name} flood</strong></div>
        <div>{summary.level.description}</div>
        {#if summary.mixed}
            <div class="tip-note">
                {#each summary.parts as part}
                    <div>
                        {part.level.name}: {part.settlements} settlement{part.settlements === 1 ? "" : "s"}
                        &centerdot; pop {part.population.toFixed(0)}
                    </div>
                {/each}
            </div>
        {/if}
        {#each summary.extremes as flood, i (i)}
            <div class="tip-note">
                <div><strong>{flood.kind.name}</strong> over {flood.areaName}</div>
                <div>
                    {flood.clansAffected} clan{flood.clansAffected === 1 ? "" : "s"} caught
                    &centerdot; {flood.cropsLost.toFixed(0)} of grain lost
                    &centerdot; {flood.qolDamage.toFixed(1)} quality of life each
                </div>
                {#if flood.deaths >= 0.5}
                    <div>{flood.deaths.toFixed(0)} drowned</div>
                {/if}
            </div>
        {/each}
    {:else}
        <div>No settlements.</div>
    {/if}
{/snippet}

{#snippet columnHeader(col: EntityColumnSpec)}
    <div class="col-header-inner">
        {#if col.entity && col.label !== col.entity.name}
            <div class="claim-to-fame">{col.label}</div>
            <div><EntityLink entity={col.entity} /></div>
        {:else if col.entity}
            <div><EntityLink entity={col.entity} /></div>
        {:else}
            <div><strong>{col.label}</strong></div>
            {#if col.sublabel}
                <div class="sublabel">{col.sublabel}</div>
            {/if}
        {/if}
        <div class="pop-sub">pop {col.population ?? col.clans.reduce((s, c) => s + c.population, 0)}</div>
    </div>
{/snippet}

<div class="entity-stats-table">
    <TableView2 {table} />
</div>

<style>
    .entity-stats-table {
        margin-left: 0.5rem;
    }

    .col-header-inner {
        text-align: center;
    }

    .claim-to-fame {
        font-weight: bold;
        font-size: 0.9em;
        margin-bottom: 0.1em;
    }

    .sublabel {
        font-weight: normal;
        font-size: 0.85em;
        color: #555;
    }

    .flood-cell {
        display: inline-flex;
        align-items: center;
        justify-content: flex-end;
        gap: 0.25rem;
    }

    .tip-note {
        margin-top: 0.35rem;
        padding-top: 0.3rem;
        border-top: 1px solid #ddd2ab;
    }

    .pop-sub {
        font-size: 0.75em;
        font-weight: normal;
        color: #888;
    }
</style>
