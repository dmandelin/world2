<script lang="ts">
    import TableView2 from "./TableView2.svelte";
    import type { Table, TableColumn, TableRow } from "./tables2";
    import type { ClanDTO } from "../../model/records/dtos";
    import { MutualAidInteraction, clanHelpDemand, getHelpReceivedValueFromMutualAid, getHelpProductivityModifier } from "../../model/relations/mutualaid";
    import { pct, signed, spct, unsigned } from "../../model/lib/format";
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
    }

    let { columns }: { columns: EntityColumnSpec[] } = $props();

    let allClans = $derived(columns.flatMap(c => c.clans));

    let relevantProcesses = $derived.by(() => {
        const procs = new Set(allClans.flatMap(c => c.production.rs.map(opr => opr.operation.process)));
        return sortedByKey(procs, p => p.sortKey);
    });

    let rowGroups = $derived.by<RowDef[][]>(() => {
        const groups: RowDef[][] = [];

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
            { label: "Avg Prestige", value: (c) => c.prestigeAverage, format: (v) => signed(v, 2) },
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
        }));

        return {
            columns: tableCols as any,
            rows: tableRows,
        };
    });
</script>

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

    .pop-sub {
        font-size: 0.75em;
        font-weight: normal;
        color: #888;
    }
</style>
