<script lang="ts">
    import type { Snippet } from "svelte";
    import {
        FilteredIterableTable,
        IterableTable,
        type Table,
        type TableColumn,
        type TableRow,
    } from "../tables/tables2";
    import {
        MutualAidInteraction,
        clanHelpDemand,
        getHelpReceivedValueFromMutualAid,
        getHelpProductivityModifier,
    } from "../../model/relations/mutualaid";
    import {
        pct,
        pctFormat,
        signed,
        signedFormat,
        spct,
        tsigned,
        unsigned,
        unsignedFormat,
        stressColor,
    } from "../../model/lib/format";
    import { safeDiv, sortedByKey, sumFun } from "../../model/lib/basics";
    import { populationAverage } from "../../model/lib/modelbasics";
    import ClanEffortMiniBar from "../items/ClanEffortMiniBar.svelte";
    import ClanResidenceTooltip from "../items/ClanResidenceTooltip.svelte";
    import EntityLink from "../state/EntityLink.svelte";
    import PopulationChange from "../PopulationChange.svelte";
    import PopulationPyramid from "../PopulationPyramid.svelte";
    import SkillDelta from "../SkillDelta.svelte";
    import TableView2 from "../tables/TableView2.svelte";
    import Tooltip from "../Tooltip.svelte";
    import {
        getClanLastTurnSnapshots,
        SettlementDTO,
        type ClanDTO,
        type WorldDTO,
        type ClanLastTurnSnapshots,
    } from "../../model/records/dtos";
    import {
        ObservationDefs,
        type ObservationDef,
    } from "../../model/relations/information";
    import type { Process } from "../../model/econ/process";
    import type { Activity } from "../../model/decisions/effort";
    import SimpleTooltip from "../widgets/SimpleTooltip.svelte";
    import { get } from "svelte/store";
    import {
        connectionsOf,
        MarriageConnection,
    } from "../../model/relations/connection";
    import {
        getMarriageDecisions,
        type MarriageDecisions,
    } from "../../model/relations/marriage";
    import ClanMigrationIcon from "../ClanMigrationIcon.svelte";
    import type { Opinion } from "../../model/relations/opinion";
    import type { Alignment } from "../../model/relations/alignment";
    import LineGraph from "../LineGraph.svelte";
    import {
        PopulationScaler,
        ZeroCenteredScaler,
        DefaultScaler,
        type YAxisScaler,
    } from "../linegraph";
    import {
        clanKeyTimelineGraphData,
        type ClanTimePoint,
    } from "../../model/records/timeline";

    let {
        settlement,
        predictMode,
    }: {
        settlement: SettlementDTO;
        predictMode?: boolean;
    } = $props();

    let csnaps = $derived(getClanLastTurnSnapshots(settlement));

    function getZScoreColor(z: number): string {
        const clampedZ = Math.max(-2, Math.min(2, z));
        const t = clampedZ / 2; // -1 to +1

        let r: number, g: number, b: number;
        if (t >= 0) {
            // Neutral gray (107, 114, 128) -> Blue (37, 99, 235)
            r = Math.round(107 + (37 - 107) * t);
            g = Math.round(114 + (99 - 114) * t);
            b = Math.round(128 + (235 - 128) * t);
        } else {
            // Neutral gray (107, 114, 128) -> Red (220, 38, 38)
            const absT = -t;
            r = Math.round(107 + (220 - 107) * absT);
            g = Math.round(114 + (38 - 114) * absT);
            b = Math.round(128 + (38 - 128) * absT);
        }
        return `rgb(${r}, ${g}, ${b})`;
    }

    let prestigeRankings = $derived.by(() => {
        if (!csnaps || csnaps.length === 0)
            return new Map<
                string,
                { rank: number; title: string; color: string }
            >();

        const n = csnaps.length;
        const values = csnaps.map((cs) => cs.e.prestigeAverage);
        const mean = values.reduce((a, b) => a + b, 0) / (n || 1);
        const variance =
            values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (n || 1);
        const stdDev = Math.sqrt(variance);

        const sorted = [...csnaps].sort(
            (a, b) => b.e.prestigeAverage - a.e.prestigeAverage,
        );

        const rankMap = new Map<string, number>();
        sorted.forEach((cs, idx) => {
            if (
                idx > 0 &&
                Math.abs(
                    cs.e.prestigeAverage -
                        sorted[idx - 1].e.prestigeAverage,
                ) < 1e-6
            ) {
                rankMap.set(cs.c.uuid, rankMap.get(sorted[idx - 1].c.uuid)!);
            } else {
                rankMap.set(cs.c.uuid, idx + 1);
            }
        });

        const resultMap = new Map<
            string,
            { rank: number; title: string; color: string }
        >();

        for (const cs of csnaps) {
            const val = cs.e.prestigeAverage;
            const rank = rankMap.get(cs.c.uuid) ?? 1;
            const z = stdDev > 1e-6 ? (val - mean) / stdDev : 0;
            const color = getZScoreColor(z);
            const zStr = z >= 0 ? `+${z.toFixed(2)}` : z.toFixed(2);
            const title = `Rank #${rank} (Prestige: ${signed(val, 0)}, Z-Score: ${zStr})`;

            resultMap.set(cs.c.uuid, {
                rank,
                title,
                color,
            });
        }

        return resultMap;
    });

    let relevantProcesses = $derived.by(() =>
        sortedByKey(
            new Set(
                csnaps.flatMap((cs) =>
                    cs.e.production.rs.map((opr) => opr.operation.process),
                ),
            ),
            (process) => process.sortKey,
        ),
    );

    interface RowDef {
        label?: string;
        labelTooltip?: string;
        class?: string;
        isHeader?: boolean;
        isBreak?: boolean;
        colspan?: number;
        cellClass?: string;
        topics?: string[];

        // Value definition
        value?: (c: ClanDTO) => any;
        format?: (v: any) => string;
        renderValueSnippet?: Snippet<[ClanLastTurnSnapshots]>;
        renderSnippet?: Snippet<[ClanLastTurnSnapshots]>;

        // Tooltip definition
        useTooltip?: boolean;
        tooltipSnippet?: Snippet<[ClanLastTurnSnapshots, any]>;
        context?: any;

        // Settlement summary column. How to roll the clan values up:
        //   "avg" (default) population-weighted average of the clan values
        //   "geomean" population-weighted geometric mean, for multiplicative
        //     modifiers, where an even split of x2 and x0.5 should read as x1
        //   "sum" total of the clan values (already settlement-scale amounts)
        //   "none" leave the cell blank
        settlementAgg?: "avg" | "geomean" | "sum" | "none";
        settlementTooltipSnippet?: Snippet<[ClanLastTurnSnapshots[], any]>;

        // For rows drawn by renderSnippet rather than a value function.
        settlementRenderSnippet?: Snippet<[ClanLastTurnSnapshots[]]>;

        // Delta definition
        deltaValue?: (c: ClanDTO) => number;
        deltaFormat?: (v: number) => string;
        customDeltaSnippet?: Snippet<[ClanLastTurnSnapshots, any]>;
        customDeltaContext?: any;

        timelineKey?: keyof ClanTimePoint;
        scaler?: YAxisScaler;
    }

    let settlementClans = $derived(csnaps.map((cs) => cs.e));
    let settlementPopulation = $derived(
        sumFun(settlementClans, (c) => c.population),
    );
    let settlementWorkers = $derived(sumFun(settlementClans, (c) => c.workers));

    // Age/sex slices of every clan added up, for the settlement-wide pyramid.
    let settlementSlices = $derived.by(() => {
        const total: number[][] = [];
        for (const clan of settlementClans) {
            clan.slices.forEach((slice, i) => {
                if (!total[i]) total[i] = slice.map(() => 0);
                slice.forEach((v, j) => (total[i][j] += v));
            });
        }
        return total;
    });

    // Population-weighted average of clan effort shares. The inputs each sum to
    // 1 over the activities (or processes) a clan is engaged in, so the result
    // does too, and activities only some clans pursue count as zero elsewhere.
    function averageEffortAllocation(
        clans: ClanDTO[],
        pick: (c: ClanDTO) => ReadonlyMap<Activity | Process, number>,
    ): ReadonlyMap<Activity | Process, number> {
        const totals = new Map<Activity | Process, number>();
        const totalPopulation = sumFun(clans, (c) => c.population);
        for (const clan of clans) {
            for (const [aop, share] of pick(clan)) {
                totals.set(
                    aop,
                    (totals.get(aop) ?? 0) + share * clan.population,
                );
            }
        }
        if (totalPopulation > 0) {
            for (const [aop, total] of totals) {
                totals.set(aop, total / totalPopulation);
            }
        }
        return totals;
    }

    // Stands in for a clan where ClanEffortMiniBar only needs total effort, so
    // its tooltips can report settlement-wide effort behind each share.
    function effortProxy(clans: ClanDTO[]): ClanDTO {
        return {
            effort: sumFun(clans, (c) => c.effort),
        } as unknown as ClanDTO;
    }

    // Weighted geometric mean, ignoring non-positive values (a modifier of 0 or
    // less has no meaningful log). Returns 1 if nothing usable is left.
    function weightedGeomean(
        items: { value: number; weight: number }[],
    ): number {
        let logSum = 0;
        let weight = 0;
        for (const item of items) {
            if (!(item.value > 0) || !Number.isFinite(item.value)) continue;
            logSum += Math.log(item.value) * item.weight;
            weight += item.weight;
        }
        return weight > 0 ? Math.exp(logSum / weight) : 1;
    }

    function settlementValue(row: RowDef): number | undefined {
        if (row.settlementAgg === "none" || !row.value) return undefined;
        const value = (c: ClanDTO) => Number(row.value!(c)) || 0;
        switch (row.settlementAgg) {
            case "sum":
                return sumFun(settlementClans, value);
            case "geomean":
                return weightedGeomean(
                    settlementClans.map((c) => ({
                        value: value(c),
                        weight: c.population,
                    })),
                );
            default:
                return populationAverage(settlementClans, value);
        }
    }

    // Row of a table produced by mergePopWeighted: the merged cell values plus
    // one of the original per-clan rows, so the original formatters still work.
    interface MergedRowData {
        label: string;
        sample: any;
        values: any[];
    }

    // Combines the same tooltip table built for several clans into one table
    // where every numeric cell is the population-weighted average across those
    // clans. Rows are matched by label; a clan missing a row counts as the
    // identity (zero when averaging, one for a multiplicative modifier), but a
    // clan with no rows at all (e.g. it doesn't run the process) is left out of
    // the weighting entirely. Non-numeric cells show through only when every
    // clan agrees on them.
    function mergePopWeighted(
        inputs: { table: Table<any, any, any>; weight: number }[],
        columnIndices?: number[],
        mode: "avg" | "geomean" = "avg",
    ): Table<any, any, any> {
        const included = inputs.filter((i) => i.table.rows.length > 0);
        const template = included[0]?.table;
        if (!template) return { columns: [] as any, rows: [] };

        const totalWeight = sumFun(included, (i) => i.weight);
        const colIndices =
            columnIndices ?? template.columns.map((_: any, i: number) => i);

        // Row labels in order of first appearance, with a representative row.
        const samples = new Map<string, TableRow<any, any>>();
        for (const { table } of included) {
            for (const r of table.rows) {
                if (!samples.has(r.label)) samples.set(r.label, r);
            }
        }

        const rows: TableRow<MergedRowData, any>[] = [...samples].map(
            ([label, sampleRow]) => {
                const values = colIndices.map((ci) => {
                    const numbers: { value: number; weight: number }[] = [];
                    let anyNumber = false;
                    let text: string | undefined;
                    let sameText = true;
                    for (const { table, weight } of included) {
                        const r = table.rows.find((rr) => rr.label === label);
                        const col = table.columns[ci];
                        const v =
                            r && col
                                ? r.valueFn
                                    ? r.valueFn(col.data)
                                    : col.valueFn(r.data)
                                : undefined;
                        if (typeof v === "number" && Number.isFinite(v)) {
                            anyNumber = true;
                            numbers.push({ value: v, weight });
                        } else {
                            // Missing here means "this clan was unaffected".
                            numbers.push({
                                value: mode === "geomean" ? 1 : 0,
                                weight,
                            });
                            if (typeof v === "string") {
                                if (text === undefined) text = v;
                                else if (text !== v) sameText = false;
                            }
                        }
                    }
                    if (!anyNumber) return sameText ? (text ?? "") : "";
                    if (mode === "geomean") return weightedGeomean(numbers);
                    return totalWeight > 0
                        ? sumFun(numbers, (n) => n.value * n.weight) /
                              totalWeight
                        : 0;
                });
                return {
                    data: { label, sample: sampleRow.data, values },
                    label,
                    isHeader: sampleRow.isHeader,
                    bold: sampleRow.bold,
                    divider: sampleRow.divider,
                    class: sampleRow.class,
                };
            },
        );

        const columns = colIndices.map((ci, i) => {
            const col = template.columns[ci];
            return {
                data: col.data,
                label: col.label,
                class: col.class,
                valueFn: (row: MergedRowData) => row.values[i],
                formatFn: (v: any, row?: MergedRowData) =>
                    typeof v === "number" && col.formatFn
                        ? col.formatFn(v, row?.sample, col.data)
                        : String(v ?? ""),
            };
        });

        return {
            columns: columns as any,
            rows,
            rowHeaderLabel: template.rowHeaderLabel,
        };
    }

    function mergedClanTable(
        css: ClanLastTurnSnapshots[],
        tableFn: (clan: ClanDTO) => Table<any, any, any>,
        columnIndices?: number[],
        mode: "avg" | "geomean" = "avg",
    ): Table<any, any, any> {
        return mergePopWeighted(
            css.map((cs) => ({
                table: tableFn(cs.e),
                weight: cs.e.population,
            })),
            columnIndices,
            mode,
        );
    }

    function getPairingCount(
        decisions: MarriageDecisions,
        c1: ClanDTO,
        c2: ClanDTO,
    ): number {
        for (const [hClan, map] of decisions.pairingCounts.counts.entries()) {
            if (hClan.uuid === c1.uuid) {
                for (const [wClan, count] of map.entries()) {
                    if (wClan.uuid === c2.uuid) {
                        return count;
                    }
                }
            }
        }
        return 0;
    }

    // Accessor for a directed opinion (respect, holiness, or marriage appeal)
    // between two clans.
    type OpinionToward = (
        observer: ClanDTO,
        target: ClanDTO,
    ) => Opinion | undefined;

    function getOpinionItemValue(
        toward: OpinionToward,
        observer: ClanDTO,
        target: ClanDTO,
        label: string,
    ): number {
        const r = toward(observer, target);
        if (!r) return 0;
        // Items already carry information-scaling in their own modifiers.
        const item = r.items.find((i) => i.label === label);
        return item ? item.value : 0;
    }

    // Accessor for directed alignment ("Favor") between two clans.
    type AlignmentToward = (
        observer: ClanDTO,
        target: ClanDTO,
    ) => Alignment | undefined;

    function getAlignmentItemValue(
        toward: AlignmentToward,
        observer: ClanDTO,
        target: ClanDTO,
        label: string,
    ): number {
        const a = toward(observer, target);
        if (!a) return 0;
        const item = a.items.find((i) => i.label === label);
        return item ? item.value : 0;
    }

    let rowGroups = $derived.by<RowDef[][]>(() => {
        const groups: RowDef[][] = [];

        // Group 1: Demographics / Population
        groups.push([
            {
                label: "People",
                class: "actual",
                cellClass: "rap",
                value: (c) => c.population,
                tooltipSnippet: peopleTooltip,
                settlementAgg: "sum",
                settlementTooltipSnippet: settlementPeopleTooltip,
                customDeltaSnippet: peopleDeltaCell,
                topics: ["demographics"],
            },
            {
                label: "Health",
                class: "actual",
                cellClass: "ra",
                value: (c) =>
                    Math.sqrt(
                        (c.lastPopulationChange?.brModifier ?? 1) /
                            (c.lastPopulationChange?.drModifier ?? 1),
                    ),
                format: spct,
                tooltipSnippet: healthTooltip,
                settlementAgg: "geomean",
                settlementTooltipSnippet: settlementHealthTooltip,
                deltaValue: (c) =>
                    Math.sqrt(
                        (c.lastPopulationChange?.brModifier ?? 1) /
                            (c.lastPopulationChange?.drModifier ?? 1),
                    ),
                deltaFormat: pct,
                scaler: new DefaultScaler(),
                topics: ["demographics"],
            },
            {
                label: "Residence",
                cellClass: "ra",
                value: (c) => c.residenceLevel.fractionInSettlement,
                format: pct,
                tooltipSnippet: residenceTooltip,
                deltaValue: (c) => c.residenceLevel.fractionInSettlement,
                deltaFormat: pct,
                timelineKey: "residenceFraction",
                scaler: new DefaultScaler(),
                topics: ["demographics", "welfare"],
            },
            {
                label: "Birth rate modifier",
                class: "actual",
                cellClass: "rap",
                value: (c) => c.lastPopulationChange.brModifier,
                format: spct,
                tooltipSnippet: brModifierTooltip,
                settlementAgg: "geomean",
                settlementTooltipSnippet: settlementBrModifierTooltip,
                deltaValue: (c) => c.lastPopulationChange.brModifier,
                deltaFormat: pct,
                timelineKey: "brModifier",
                scaler: new DefaultScaler(),
                topics: ["demographics:detail"],
            },
            {
                label: "Death rate modifier",
                class: "actual",
                cellClass: "rap",
                value: (c) => c.lastPopulationChange.drModifier,
                format: spct,
                tooltipSnippet: drModifierTooltip,
                settlementAgg: "geomean",
                settlementTooltipSnippet: settlementDrModifierTooltip,
                deltaValue: (c) => c.lastPopulationChange.drModifier,
                deltaFormat: pct,
                timelineKey: "drModifier",
                scaler: new DefaultScaler(),
                topics: ["demographics:detail"],
            },
            {
                label: "Support Ratio",
                class: "actual",
                cellClass: "rap",
                renderValueSnippet: supportRatioValueRender,
                deltaValue: (c) => safeDiv(c.population, c.workers),
                deltaFormat: (v) => v.toFixed(1),
                timelineKey: "supportRatio",
                scaler: new DefaultScaler(),
                topics: ["support_ratio:detail"],
            },
        ]);

        // Group 2: Welfare (Happiness, Social Welfare, Material Welfare, QoL, Stress, Mutual Aid, Help Modifier)
        groups.push([
            {
                label: "Generosity",
                class: "actual",
                cellClass: "rap",
                value: (c) => c.generosityAverage,
                format: (v) => unsigned(v, 1),
                tooltipSnippet: generosityTooltip,
                deltaValue: (c) => c.generosityAverage,
                deltaFormat: (v) => unsigned(v, 1),
                scaler: new DefaultScaler(),
                topics: ["perceptions"],
            },
            {
                label: "Bellicosity",
                class: "actual",
                cellClass: "rap",
                value: (c) => c.bellicosityAverage,
                format: (v) => unsigned(v, 1),
                tooltipSnippet: bellicosityTooltip,
                deltaValue: (c) => c.bellicosityAverage,
                deltaFormat: (v) => unsigned(v, 1),
                scaler: new DefaultScaler(),
                topics: ["perceptions"],
            },
            {
                label: "QoL",
                class: "actual",
                cellClass: "rap",
                value: (c) => c.qol.value,
                format: signed,
                tooltipSnippet: qolTooltip,
                settlementTooltipSnippet: settlementQolTooltip,
                deltaValue: (c) => c.qol.value,
                deltaFormat: signed,
                timelineKey: "qol",
                scaler: new ZeroCenteredScaler(),
                topics: ["welfare"],
            },
            {
                label: "Favor",
                class: "actual",
                cellClass: "rap",
                value: (c) => c.favorAverage,
                format: (v) => signed(v, 0),
                tooltipSnippet: favorTooltip,
                settlementTooltipSnippet: settlementFavorTooltip,
                deltaValue: (c) => c.favorAverage,
                deltaFormat: (v) => signed(v, 0),
                timelineKey: "favorAverage",
                scaler: new ZeroCenteredScaler(),
                topics: ["perceptions"],
            },
            {
                label: "Respect",
                class: "actual",
                cellClass: "rap",
                value: (c) => c.respectAverage,
                format: (v) => unsigned(v, 0),
                tooltipSnippet: respectTooltip,
                settlementTooltipSnippet: settlementRespectTooltip,
                deltaValue: (c) => c.respectAverage,
                deltaFormat: (v) => signed(v, 0),
                timelineKey: "respectAverage",
                scaler: new ZeroCenteredScaler(),
                topics: ["perceptions"],
            },
            {
                label: "&nbsp;Holiness",
                labelTooltip:
                    "How close to the gods and ancestors other clans think " +
                    "this one stands. Same scale as Respect.",
                class: "actual",
                cellClass: "rap",
                value: (c) => c.holinessAverage,
                format: (v) => unsigned(v, 0),
                tooltipSnippet: holinessTooltip,
                settlementTooltipSnippet: settlementHolinessTooltip,
                deltaValue: (c) => c.holinessAverage,
                deltaFormat: (v) => signed(v, 0),
                timelineKey: "holinessAverage",
                scaler: new ZeroCenteredScaler(),
                topics: ["perceptions"],
            },
            {
                label: "Prestige",
                class: "actual",
                cellClass: "rap",
                value: (c) => c.prestigeAverage,
                format: (v) => signed(v, 0),
                tooltipSnippet: prestigeTooltip,
                deltaValue: (c) => c.prestigeAverage,
                deltaFormat: (v) => signed(v, 0),
                timelineKey: "averagePrestige",
                scaler: new ZeroCenteredScaler(),
                topics: ["perceptions"],
            },
            {
                label: "Mutual Aid",
                class: "actual",
                cellClass: "rap",
                value: (c) => {
                    const world = settlement.world;
                    let totalValue = 0;
                    for (const other of world.clanMap.values()) {
                        if (c.uuid === other.uuid) continue;
                        const interactions = world.interactions.get(
                            c.ref,
                            other.ref,
                        );
                        const ma = interactions.find(
                            (i) => i instanceof MutualAidInteraction,
                        ) as MutualAidInteraction | undefined;
                        if (ma) {
                            totalValue +=
                                ma.amount * (1 - ma.icebergCost) * ma.trust;
                        }
                    }
                    const demand = clanHelpDemand(c.population);
                    return demand > 0 ? totalValue / demand : 0;
                },
                format: pct,
                tooltipSnippet: mutualAidSatTooltip,
                deltaValue: (c) => {
                    const world = settlement.world;
                    let totalValue = 0;
                    for (const other of world.clanMap.values()) {
                        if (c.uuid === other.uuid) continue;
                        const interactions = world.interactions.get(
                            c.ref,
                            other.ref,
                        );
                        const ma = interactions.find(
                            (i) => i instanceof MutualAidInteraction,
                        ) as MutualAidInteraction | undefined;
                        if (ma) {
                            totalValue +=
                                ma.amount * (1 - ma.icebergCost) * ma.trust;
                        }
                    }
                    const demand = clanHelpDemand(c.population);
                    return demand > 0 ? totalValue / demand : 0;
                },
                deltaFormat: pct,
                timelineKey: "mutualAidSat",
                scaler: new DefaultScaler(),
                topics: ["food:detail"],
            },
            {
                label: "Help Modifier",
                class: "actual",
                cellClass: "rap",
                value: (c) => {
                    const world = settlement.world;
                    const helpValue = getHelpReceivedValueFromMutualAid(
                        world,
                        c.ref,
                    );
                    const demand = clanHelpDemand(c.population);
                    return getHelpProductivityModifier(helpValue, demand);
                },
                format: spct,
                tooltipSnippet: helpProductivityModifierTooltip,
                settlementAgg: "geomean",
                deltaValue: (c) => {
                    const world = settlement.world;
                    const helpValue = getHelpReceivedValueFromMutualAid(
                        world,
                        c.ref,
                    );
                    const demand = clanHelpDemand(c.population);
                    return getHelpProductivityModifier(helpValue, demand);
                },
                deltaFormat: pct,
                timelineKey: "helpModifier",
                scaler: new DefaultScaler(),
                topics: ["food:detail"],
            },
        ]);

        // Group 4: Food
        const fmt2 = (v: number) => {
            if (!v || Math.abs(v) < 0.005) return "";
            return unsigned(v, 2);
        };

        groups.push([
            {
                label: "Food",
                class: "actual",
                isHeader: true,
                topics: ["food", "food:detail", "welfare"],
            },
            {
                label: "&nbsp;Produced",
                class: "actual",
                cellClass: "ra",
                value: (c) =>
                    c.distribution
                        ? c.distribution.totalFoodFromProduction /
                          (c.population || 1)
                        : 0,
                format: fmt2,
                tooltipSnippet: foodProducedTooltip,
                settlementTooltipSnippet: settlementFoodProducedTooltip,
                deltaValue: (c) =>
                    c.distribution
                        ? c.distribution.totalFoodFromProduction /
                          (c.population || 1)
                        : 0,
                deltaFormat: fmt2,
                timelineKey: "foodProduced",
                scaler: new DefaultScaler(),
                topics: ["food", "food:detail"],
            },
            {
                label: "&nbsp;&nbsp;Gifts",
                class: "actual",
                cellClass: "ra",
                value: (c) => {
                    const rec = c.consumption?.totalFoodGiftsReceived ?? 0;
                    const giv = c.distribution?.totalFoodGiftsGiven ?? 0;
                    return (rec - giv) / (c.population || 1);
                },
                format: fmt2,
                tooltipSnippet: giftsTooltip,
                topics: ["food:detail"],
            },
            {
                label: "&nbsp;&nbsp;Aid",
                class: "actual",
                cellClass: "ra",
                value: (c) => {
                    const rec = c.consumption?.totalFoodAidReceived ?? 0;
                    const givProd = c.distribution?.totalFoodAidGiven ?? 0;
                    const givStock = c.stockOutflow?.totalFoodAidGiven ?? 0;
                    return (rec - (givProd + givStock)) / (c.population || 1);
                },
                format: fmt2,
                tooltipSnippet: aidTooltip,
                topics: ["food:detail"],
            },
            {
                label: "&nbsp;&nbsp;From Stock",
                class: "actual",
                cellClass: "ra",
                value: (c) => {
                    const ret = c.stockOutflow?.totalFoodRetrieved ?? 0;
                    const sent = c.distribution?.totalFoodToStock ?? 0;
                    return (ret - sent) / (c.population || 1);
                },
                format: fmt2,
                tooltipSnippet: fromStockTooltip,
                topics: ["food:detail"],
            },
            {
                label: "&nbsp;&nbsp;Wasted",
                class: "actual",
                cellClass: "ra",
                value: (c) =>
                    -(c.distribution?.totalFoodWasted ?? 0) /
                    (c.population || 1),
                format: fmt2,
                topics: ["food:detail"],
            },
            {
                label: "&nbsp;Consumed",
                class: "actual",
                cellClass: "ra",
                value: (c) => (c.consumption ? c.consumption.perCapitaFood : 0),
                format: fmt2,
                tooltipSnippet: foodTooltip,
                settlementTooltipSnippet: settlementFoodTooltip,
                deltaValue: (c) =>
                    c.consumption ? c.consumption.perCapitaFood : 0,
                deltaFormat: fmt2,
                timelineKey: "food",
                scaler: new DefaultScaler(),
                topics: ["food", "food:detail", "welfare"],
            },
            {
                isBreak: true,
                topics: ["food", "food:detail"],
            },
            {
                label: "&nbsp;Initial stock",
                class: "actual",
                cellClass: "ra",
                value: (c) => {
                    if (!c.stock) return 0;
                    const pop = c.population || 1;
                    const init =
                        c.stock.totalFoodStock -
                        c.stock.totalFoodAdditions +
                        c.stock.totalFoodRetrievals +
                        c.stock.totalFoodRetrievalCost +
                        c.stock.totalFoodStorageLoss;
                    return init / pop;
                },
                format: fmt2,
                topics: ["food:detail"],
            },
            {
                label: "&nbsp;Added to stock",
                class: "actual",
                cellClass: "ra",
                value: (c) =>
                    c.stock ? c.stock.perCapitaFoodAdditions(c.population) : 0,
                format: fmt2,
                topics: ["food:detail"],
            },
            {
                label: "&nbsp;Retrieved to consume",
                class: "actual",
                cellClass: "ra",
                value: (c) =>
                    c.stockOutflow
                        ? c.stockOutflow.totalFoodToConsumption /
                          (c.population || 1)
                        : 0,
                format: fmt2,
                topics: ["food:detail"],
            },
            {
                label: "&nbsp;Given as gifts",
                class: "actual",
                cellClass: "ra",
                value: (c) =>
                    c.stockOutflow
                        ? c.stockOutflow.totalFoodGiftsGiven /
                          (c.population || 1)
                        : 0,
                format: fmt2,
                topics: ["food:detail"],
            },
            {
                label: "&nbsp;Given as aid",
                class: "actual",
                cellClass: "ra",
                value: (c) =>
                    c.stockOutflow
                        ? c.stockOutflow.totalFoodAidGiven / (c.population || 1)
                        : 0,
                format: fmt2,
                topics: ["food:detail"],
            },
            {
                label: "&nbsp;Retrieval costs",
                class: "actual",
                cellClass: "ra",
                value: (c) =>
                    c.stock
                        ? c.stock.perCapitaFoodRetrievalCost(c.population)
                        : 0,
                format: fmt2,
                topics: ["food:detail"],
            },
            {
                label: "&nbsp;Storage losses",
                class: "actual",
                cellClass: "ra",
                value: (c) =>
                    c.stock
                        ? c.stock.perCapitaFoodStorageLoss(c.population)
                        : 0,
                format: fmt2,
                topics: ["food:detail"],
            },
            {
                label: "&nbsp;Net in/out",
                class: "actual",
                cellClass: "ra",
                value: (c) => {
                    if (!c.stock) return 0;
                    const pop = c.population || 1;
                    const net =
                        c.stock.totalFoodAdditions -
                        c.stock.totalFoodRetrievals -
                        c.stock.totalFoodRetrievalCost -
                        c.stock.totalFoodStorageLoss;
                    return net / pop;
                },
                format: fmt2,
                topics: ["food:detail"],
            },
            {
                label: "&nbsp;Final stock",
                class: "actual",
                cellClass: "ra",
                value: (c) => c.stock.perCapitaFoodStock(c.population),
                format: fmt2,
                tooltipSnippet: foodStockTooltip,
                settlementTooltipSnippet: settlementFoodStockTooltip,
                deltaValue: (c) => c.stock.perCapitaFoodStock(c.population),
                deltaFormat: fmt2,
                timelineKey: "foodStorage",
                scaler: new DefaultScaler(),
                topics: ["food", "food:detail", "welfare"],
            },
        ]);

        // Group 5: Activities & Processes (Effort Allocation)
        groups.push([
            {
                label: "Activities",
                colspan: 2,
                renderSnippet: activitiesRender,
                settlementRenderSnippet: settlementActivitiesRender,
                topics: ["production"],
            },
            {
                label: "(Previous)",
                colspan: 2,
                renderSnippet: activitiesPrevRender,
                settlementRenderSnippet: settlementActivitiesPrevRender,
                topics: ["production"],
            },
            {
                label: "Processes",
                colspan: 2,
                renderSnippet: processesRender,
                settlementRenderSnippet: settlementProcessesRender,
                topics: ["production"],
            },
            {
                label: "(Previous)",
                colspan: 2,
                renderSnippet: processesPrevRender,
                settlementRenderSnippet: settlementProcessesPrevRender,
                topics: ["production"],
            },
        ]);

        // Group 6: Processes (dynamic)
        for (const process of relevantProcesses) {
            groups.push([
                {
                    label: process.name,
                    class: "actual",
                    isHeader: true,
                },
                {
                    label: "&nbsp;Production",
                    class: "actual",
                    cellClass: "rap",
                    useTooltip: true,
                    value: (c) =>
                        c.production.getForProcess(process, "amount") ?? 0,
                    format: (v) => v.toFixed(0),
                    settlementAgg: "sum",
                    deltaValue: (c) =>
                        c.production.getForProcess(process, "amount") ?? 0,
                    deltaFormat: (v) => v.toFixed(0),
                    topics: ["production"],
                },
                {
                    label: "&nbsp;Land",
                    class: "actual",
                    cellClass: "rap",
                    useTooltip: true,
                    value: (c) =>
                        c.production.getForProcess(process, "land") ?? 0,
                    format: (v) => v.toFixed(0),
                    settlementAgg: "sum",
                    deltaValue: (c) =>
                        c.production.getForProcess(process, "land") ?? 0,
                    deltaFormat: (v) => v.toFixed(0),
                    topics: ["production"],
                },
                {
                    label: "&nbsp;Labor",
                    class: "actual",
                    cellClass: "rap",
                    useTooltip: true,
                    value: (c) =>
                        c.production.getForProcess(process, "labor") ?? 0,
                    format: (v) => v.toFixed(0),
                    settlementAgg: "sum",
                    deltaValue: (c) =>
                        c.production.getForProcess(process, "labor") ?? 0,
                    deltaFormat: (v) => v.toFixed(0),
                    topics: ["production"],
                },

                {
                    label: "&nbsp;Base LP",
                    labelTooltip: "Base labor productivity",
                    class: "actual",
                    cellClass: "rap",
                    value: (c) =>
                        c.production.getForProcess(
                            process,
                            "laborProductivityFactor",
                        ) ?? 0,
                    format: spct,
                    tooltipSnippet: processProductivityTooltip,
                    context: process,
                    settlementAgg: "geomean",
                    settlementTooltipSnippet: settlementProcessProductivityTooltip,
                    deltaValue: (c) =>
                        c.production.getForProcess(
                            process,
                            "laborProductivityFactor",
                        ) ?? 0,
                    deltaFormat: (v) => v.toFixed(2),
                    topics: ["production", "productivity"],
                },
                {
                    label: "&nbsp;Net LP",
                    labelTooltip: "Net labor productivity",
                    class: "actual",
                    cellClass: "rap",
                    useTooltip: true,
                    value: (c) => netLaborProductivity(c, process),
                    format: spct,
                    settlementAgg: "geomean",
                    deltaValue: (c) => netLaborProductivity(c, process),
                    deltaFormat: (v) => v.toFixed(2),
                    topics: ["production", "productivity"],
                },
                {
                    label: "&nbsp;YPL",
                    labelTooltip: "Yield per labor (yield per effort)",
                    class: "actual",
                    cellClass: "rap",
                    useTooltip: true,
                    value: (c) =>
                        safeDiv(
                            c.production.getForProcess(process, "amount") ?? 0,
                            c.production.getForProcess(process, "labor") ?? 0,
                        ),
                    format: (v) => v.toFixed(2),
                    deltaValue: (c) =>
                        safeDiv(
                            c.production.getForProcess(process, "amount") ?? 0,
                            c.production.getForProcess(process, "labor") ?? 0,
                        ),
                    deltaFormat: (v) => v.toFixed(2),
                    topics: ["production", "productivity"],
                },
                {
                    label: "&nbsp;YPC",
                    labelTooltip: "Yield per capita",
                    class: "actual",
                    cellClass: "rap",
                    useTooltip: true,
                    value: (c) =>
                        safeDiv(
                            c.production.getForProcess(process, "amount") ?? 0,
                            c.previousPopulation,
                        ),
                    format: (v) => v.toFixed(2),
                    deltaValue: (c) =>
                        safeDiv(
                            c.production.getForProcess(process, "amount") ?? 0,
                            c.previousPopulation,
                        ),
                    deltaFormat: (v) => v.toFixed(2),
                    topics: ["production", "productivity"],
                },
            ]);
        }

        // Group 7: Skills (dynamic)
        if (csnaps.length > 0) {
            const skillGroup: RowDef[] = [];
            for (const skill of csnaps[0].e.skills.keys()) {
                skillGroup.push({
                    label: skill.name,
                    class: "actual",
                    cellClass: "rap",
                    useTooltip: true,
                    value: (c) => c.skills.v(skill),
                    format: unsigned,
                    customDeltaSnippet: skillDeltaCell,
                    customDeltaContext: skill,
                    topics: ["skills"],
                });
            }
            if (skillGroup.length > 0) {
                groups.push(skillGroup);
            }
        }

        // Group 8: Traits
        groups.push([
            {
                label: "Piety",
                class: "actual",
                cellClass: "rap",
                value: (c) => c.traits.piety,
                format: (v) => v.toFixed(0),
                deltaValue: (c) => c.traits.piety,
                deltaFormat: (v) => v.toFixed(0),
                timelineKey: "traitPiety",
                scaler: new DefaultScaler(),
                topics: ["traits"],
            },
            {
                label: "Intellect",
                class: "actual",
                cellClass: "rap",
                value: (c) => c.traits.intellect,
                format: (v) => v.toFixed(0),
                deltaValue: (c) => c.traits.intellect,
                deltaFormat: (v) => v.toFixed(0),
                timelineKey: "traitIntellect",
                scaler: new DefaultScaler(),
                topics: ["traits"],
            },
            {
                label: "Giving",
                class: "actual",
                cellClass: "rap",
                value: (c) => c.traits.giving,
                format: (v) => signed(v, 3),
                deltaValue: (c) => c.traits.giving,
                deltaFormat: (v) => signed(v, 3),
                timelineKey: "traitGiving",
                scaler: new ZeroCenteredScaler(),
                topics: ["traits"],
            },
            {
                label: "Aggression",
                class: "actual",
                cellClass: "rap",
                value: (c) => c.traits.aggression,
                format: (v) => v.toFixed(3),
                deltaValue: (c) => c.traits.aggression,
                deltaFormat: (v) => signed(v, 3),
                timelineKey: "traitAggression",
                scaler: new DefaultScaler(),
                topics: ["traits"],
            },
        ]);

        return groups;
    });

    function clanSustenanceTooltipTable(clan: ClanDTO) {
        return new FilteredIterableTable(
            clan.consumption.m.values(),
            (cg) => cg.good.name,
            (cg) => cg.good.isSubsistence,
            [
                {
                    data: "Consumed",
                    label: "Consumed",
                    valueFn: (cg) => cg.consumed,
                    formatFn: unsignedFormat(2),
                },
                {
                    data: "Stored",
                    label: "Stored",
                    valueFn: (cg) => cg.stored,

                    formatFn: unsignedFormat(2),
                },
                {
                    data: "Wasted",
                    label: "Wasted",
                    valueFn: (cg) => cg.wasted,
                    formatFn: unsignedFormat(2),
                },
            ],
        );
    }

    function clanFoodProductionTooltipTable(clan: ClanDTO) {
        const reports = clan.production.rs.filter(
            (opr) => opr.good.isSubsistence,
        );
        return new IterableTable(reports, (opr) => opr.good.name, [
            {
                data: "Amount",
                label: "Total Produced",
                valueFn: (opr) => opr.amount,
                formatFn: unsignedFormat(1),
            },
            {
                data: "PerCapita",
                label: "Per Capita",
                valueFn: (opr) =>
                    clan.population > 0 ? opr.amount / clan.population : 0,
                formatFn: pctFormat(0),
            },
        ]);
    }

    interface TransferTooltipRow {
        label: string;
        good?: string;
        amount?: number;
        perCapita?: number;
        isNet?: boolean;
    }

    function createTransferTooltipTable(
        rowHeaderLabel: string,
        rows: TableRow<TransferTooltipRow, string>[],
    ): Table<TransferTooltipRow, string, [string, number, number]> {
        return {
            rowHeaderLabel,
            columns: [
                {
                    data: "good",
                    label: "Good",
                    valueFn: (r) => r.good ?? "",
                },
                {
                    data: "amount",
                    label: "Amount",
                    valueFn: (r) => r.amount ?? 0,
                    formatFn: (v, r?: TransferTooltipRow) =>
                        r?.isNet ? signed(v, 2) : unsigned(v, 2),
                },
                {
                    data: "perCapita",
                    label: "Per Capita",
                    valueFn: (r) => r.perCapita ?? 0,
                    formatFn: (v, r?: TransferTooltipRow) =>
                        r?.isNet ? signed(v, 2) : unsigned(v, 2),
                },
            ],
            rows,
        };
    }

    function clanGiftsTooltipTable(clan: ClanDTO) {
        const pop = clan.population || 1;
        const rows: TableRow<TransferTooltipRow, string>[] = [];

        // Inflows (Received as gifts)
        rows.push({
            data: { label: "Inflows" },
            label: "Inflows",
            isHeader: true,
        });

        let totalInflow = 0;
        if (clan.consumption) {
            for (const g of clan.consumption.fromGifts) {
                if (g.good.isSubsistence && g.amount > 0) {
                    totalInflow += g.amount;
                    rows.push({
                        data: {
                            label: `From ${g.clan.name}`,
                            good: g.good.name,
                            amount: g.amount,
                            perCapita: g.amount / pop,
                        },
                        label: `From ${g.clan.name}`,
                    });
                }
            }
        }

        if (totalInflow === 0) {
            rows.push({
                data: {
                    label: "(None)",
                    good: "-",
                    amount: 0,
                    perCapita: 0,
                },
                label: "(None)",
            });
        }

        rows.push({
            data: {
                label: "Total Inflow",
                good: "",
                amount: totalInflow,
                perCapita: totalInflow / pop,
            },
            label: "Total Inflow",
            bold: true,
            divider: true,
        });

        // Outflows (Given as gifts)
        rows.push({
            data: { label: "Outflows" },
            label: "Outflows",
            isHeader: true,
        });

        let totalOutflow = 0;
        if (clan.distribution) {
            for (const g of clan.distribution.toGifts) {
                if (g.good.isSubsistence && g.amount > 0) {
                    totalOutflow += g.amount;
                    rows.push({
                        data: {
                            label: `To ${g.clan.name}`,
                            good: g.good.name,
                            amount: g.amount,
                            perCapita: g.amount / pop,
                        },
                        label: `To ${g.clan.name}`,
                    });
                }
            }
        }

        if (totalOutflow === 0) {
            rows.push({
                data: {
                    label: "(None)",
                    good: "-",
                    amount: 0,
                    perCapita: 0,
                },
                label: "(None)",
            });
        }

        rows.push({
            data: {
                label: "Total Outflow",
                good: "",
                amount: totalOutflow,
                perCapita: totalOutflow / pop,
            },
            label: "Total Outflow",
            bold: true,
            divider: true,
        });

        // Net Transfer
        const netAmount = totalInflow - totalOutflow;
        rows.push({
            data: {
                label: "Net Transfer",
                good: "",
                amount: netAmount,
                perCapita: netAmount / pop,
                isNet: true,
            },
            label: "Net Transfer",
            bold: true,
            divider: true,
        });

        return createTransferTooltipTable("Gifts", rows);
    }

    function clanAidTooltipTable(clan: ClanDTO) {
        const pop = clan.population || 1;
        const rows: TableRow<TransferTooltipRow, string>[] = [];

        // Inflows (Received as aid)
        rows.push({
            data: { label: "Inflows" },
            label: "Inflows",
            isHeader: true,
        });

        let totalInflow = 0;
        if (clan.consumption) {
            for (const g of clan.consumption.fromDonations) {
                if (g.good.isSubsistence && g.amount > 0) {
                    totalInflow += g.amount;
                    rows.push({
                        data: {
                            label: `From ${g.clan.name}`,
                            good: g.good.name,
                            amount: g.amount,
                            perCapita: g.amount / pop,
                        },
                        label: `From ${g.clan.name}`,
                    });
                }
            }
        }

        if (totalInflow === 0) {
            rows.push({
                data: {
                    label: "(None)",
                    good: "-",
                    amount: 0,
                    perCapita: 0,
                },
                label: "(None)",
            });
        }

        rows.push({
            data: {
                label: "Total Inflow",
                good: "",
                amount: totalInflow,
                perCapita: totalInflow / pop,
            },
            label: "Total Inflow",
            bold: true,
            divider: true,
        });

        // Outflows (Given as aid: distribution + stockOutflow)
        rows.push({
            data: { label: "Outflows" },
            label: "Outflows",
            isHeader: true,
        });

        let totalOutflow = 0;
        if (clan.distribution) {
            for (const g of clan.distribution.toDonations) {
                if (g.good.isSubsistence && g.amount > 0) {
                    totalOutflow += g.amount;
                    rows.push({
                        data: {
                            label: `To ${g.clan.name} (Prod)`,
                            good: g.good.name,
                            amount: g.amount,
                            perCapita: g.amount / pop,
                        },
                        label: `To ${g.clan.name} (Prod)`,
                    });
                }
            }
        }
        if (clan.stockOutflow) {
            for (const g of clan.stockOutflow.toDonations) {
                if (g.good.isSubsistence && g.amount > 0) {
                    totalOutflow += g.amount;
                    rows.push({
                        data: {
                            label: `To ${g.clan.name} (Stock)`,
                            good: g.good.name,
                            amount: g.amount,
                            perCapita: g.amount / pop,
                        },
                        label: `To ${g.clan.name} (Stock)`,
                    });
                }
            }
        }

        if (totalOutflow === 0) {
            rows.push({
                data: {
                    label: "(None)",
                    good: "-",
                    amount: 0,
                    perCapita: 0,
                },
                label: "(None)",
            });
        }

        rows.push({
            data: {
                label: "Total Outflow",
                good: "",
                amount: totalOutflow,
                perCapita: totalOutflow / pop,
            },
            label: "Total Outflow",
            bold: true,
            divider: true,
        });

        // Net Transfer
        const netAmount = totalInflow - totalOutflow;
        rows.push({
            data: {
                label: "Net Transfer",
                good: "",
                amount: netAmount,
                perCapita: netAmount / pop,
                isNet: true,
            },
            label: "Net Transfer",
            bold: true,
            divider: true,
        });

        return createTransferTooltipTable("Aid", rows);
    }

    function clanFromStockTooltipTable(clan: ClanDTO) {
        const pop = clan.population || 1;
        const rows: TableRow<TransferTooltipRow, string>[] = [];

        // Inflows (Retrieved from stock)
        rows.push({
            data: { label: "Inflows" },
            label: "Inflows",
            isHeader: true,
        });

        let totalInflow = 0;
        if (clan.stockOutflow) {
            for (const [good, amount] of clan.stockOutflow.toConsumption.entries()) {
                if (good.isSubsistence && amount > 0) {
                    totalInflow += amount;
                    rows.push({
                        data: {
                            label: "Retrieved for Consumption",
                            good: good.name,
                            amount: amount,
                            perCapita: amount / pop,
                        },
                        label: "Retrieved for Consumption",
                    });
                }
            }
            for (const g of clan.stockOutflow.toDonations) {
                if (g.good.isSubsistence && g.amount > 0) {
                    totalInflow += g.amount;
                    rows.push({
                        data: {
                            label: `Retrieved for Aid to ${g.clan.name}`,
                            good: g.good.name,
                            amount: g.amount,
                            perCapita: g.amount / pop,
                        },
                        label: `Retrieved for Aid to ${g.clan.name}`,
                    });
                }
            }
        }

        if (totalInflow === 0) {
            rows.push({
                data: {
                    label: "(None)",
                    good: "-",
                    amount: 0,
                    perCapita: 0,
                },
                label: "(None)",
            });
        }

        rows.push({
            data: {
                label: "Total Inflow",
                good: "",
                amount: totalInflow,
                perCapita: totalInflow / pop,
            },
            label: "Total Inflow",
            bold: true,
            divider: true,
        });

        // Outflows (Sent to stock)
        rows.push({
            data: { label: "Outflows" },
            label: "Outflows",
            isHeader: true,
        });

        let totalOutflow = 0;
        if (clan.distribution) {
            for (const [good, amount] of clan.distribution.toStock.entries()) {
                if (good.isSubsistence && amount > 0) {
                    totalOutflow += amount;
                    rows.push({
                        data: {
                            label: "Sent to Storage",
                            good: good.name,
                            amount: amount,
                            perCapita: amount / pop,
                        },
                        label: "Sent to Storage",
                    });
                }
            }
        }

        if (totalOutflow === 0) {
            rows.push({
                data: {
                    label: "(None)",
                    good: "-",
                    amount: 0,
                    perCapita: 0,
                },
                label: "(None)",
            });
        }

        rows.push({
            data: {
                label: "Total Outflow",
                good: "",
                amount: totalOutflow,
                perCapita: totalOutflow / pop,
            },
            label: "Total Outflow",
            bold: true,
            divider: true,
        });

        // Net Transfer
        const netAmount = totalInflow - totalOutflow;
        rows.push({
            data: {
                label: "Net Transfer",
                good: "",
                amount: netAmount,
                perCapita: netAmount / pop,
                isNet: true,
            },
            label: "Net Transfer",
            bold: true,
            divider: true,
        });

        return createTransferTooltipTable("From Stock", rows);
    }

    function clanFoodStockTooltipTable(clan: ClanDTO) {
        return new FilteredIterableTable(
            clan.stock.items,
            (item) => item.good.name,
            (item) => item.good.isSubsistence,
            [
                {
                    data: "Stock",
                    label: "Stock",
                    valueFn: (item) => item.perCapitaAmount(clan.population),
                    formatFn: unsignedFormat(2),
                },
                {
                    data: "Additions",
                    label: "Additions",
                    valueFn: (item) => item.perCapitaAdditions(clan.population),
                    formatFn: unsignedFormat(2),
                },
                {
                    data: "Retrievals",
                    label: "Retrievals",
                    valueFn: (item) =>
                        item.perCapitaRetrievals(clan.population),
                    formatFn: unsignedFormat(2),
                },
                {
                    data: "Retrieval Cost",
                    label: "Retrieval Cost",
                    valueFn: (item) =>
                        item.perCapitaRetrievalCost(clan.population),
                    formatFn: unsignedFormat(2),
                },
                {
                    data: "Storage Loss",
                    label: "Storage Loss",
                    valueFn: (item) =>
                        item.perCapitaStorageLoss(clan.population),
                    formatFn: unsignedFormat(2),
                },
            ],
        );
    }

    function clanStressTooltipTable(clan: ClanDTO) {
        return new FilteredIterableTable(
            clan.stress.items,
            (item) => item.label,
            (_) => true,
            [
                {
                    data: "Value",
                    label: "Value",
                    valueFn: (item) => item.value,
                    formatFn: signedFormat(),
                },
            ],
        );
    }

    function clanQolTooltipTable(clan: ClanDTO) {
        return new FilteredIterableTable(
            clan.qol.m.values(),
            (item) => item.name,
            (_) => true,
            [
                {
                    data: "Value",
                    label: "Value",
                    valueFn: (item) => item.value,
                    formatFn: signedFormat(),
                },
                {
                    data: "Explanation",
                    label: "",
                    valueFn: (item) => item.explanation,
                },
            ],
        );
    }

    // Shown when no clan has an opinion with items yet, so the breakdown still
    // has rows.
    const HOLINESS_ITEM_LABELS = [
        "Piety",
        "Ritual Skill",
        "Generosity",
        "Material QoL",
    ];

    interface RespectRowData {
        label: string;
        type: "item" | "total" | "previous" | "smoothed" | "population";
        itemLabel?: string;
    }

    function clanRespectTooltipTable(
        clan: ClanDTO,
        toward: OpinionToward,
        valueLabel: string,
        defaultItemLabels: string[] = [
            "Generosity",
            "Skills",
            "Material QoL",
            "Conversation QoL",
            "Conflict QoL",
            "Population",
            "Random",
        ],
    ): Table<RespectRowData, any, any> {
        const otherClans = clan.settlement.clans.filter(
            (c) => c.uuid !== clan.uuid,
        );

        const sampleR = otherClans
            .map((c) => toward(c, clan))
            .find((r) => r && r.items.length > 0);

        const itemLabels = sampleR
            ? sampleR.items.map((i) => i.label)
            : defaultItemLabels;

        const rows: TableRow<RespectRowData, any>[] = [
            ...itemLabels.map((label) => ({
                data: { label, type: "item" as const, itemLabel: label },
                label,
            })),
            {
                data: { label: "Current Judgments", type: "total" as const },
                label: "Current Judgments",
                divider: true,
                bold: true,
            },
            {
                data: { label: "Previous Value", type: "previous" as const },
                label: "Previous Value",
            },
            {
                data: {
                    label: `Smoothed ${valueLabel}`,
                    type: "smoothed" as const,
                },
                label: `Smoothed ${valueLabel}`,
                bold: true,
            },
            {
                data: { label: "Population", type: "population" as const },
                label: "Population",
                class: "gray-row",
            },
        ];

        const totalColumn: TableColumn<RespectRowData, any, number> = {
            data: "total",
            label: "Total",
            valueFn: (row: RespectRowData) => {
                if (row.type === "item") {
                    return populationAverage(otherClans, (c) =>
                        getOpinionItemValue(toward, c, clan, row.itemLabel!),
                    );
                } else if (row.type === "total") {
                    return populationAverage(
                        otherClans,
                        (c) => toward(c, clan)?.currentItemsTotal ?? 0,
                    );
                } else if (row.type === "previous") {
                    return populationAverage(
                        otherClans,
                        (c) => toward(c, clan)?.previousValue ?? 0,
                    );
                } else if (row.type === "smoothed") {
                    return populationAverage(
                        otherClans,
                        (c) => toward(c, clan)?.value ?? 0,
                    );
                } else {
                    return sumFun(otherClans, (c) => c.population);
                }
            },
            formatFn: (v: number, row: RespectRowData) => {
                if (row.type === "population") {
                    return v.toFixed(0);
                }
                return signed(v, 1);
            },
        };

        const clanColumns: TableColumn<RespectRowData, ClanDTO, number>[] =
            otherClans.map((otherClan) => ({
                data: otherClan,
                label: otherClan.name,
                valueFn: (row: RespectRowData) => {
                    const r = toward(otherClan, clan);
                    if (row.type === "item") {
                        return getOpinionItemValue(
                            toward,
                            otherClan,
                            clan,
                            row.itemLabel!,
                        );
                    } else if (row.type === "total") {
                        return r?.currentItemsTotal ?? 0;
                    } else if (row.type === "previous") {
                        return r?.previousValue ?? 0;
                    } else if (row.type === "smoothed") {
                        return r?.value ?? 0;
                    } else {
                        return otherClan.population;
                    }
                },
                formatFn: (v: number, row: RespectRowData) => {
                    if (row.type === "population") {
                        return v.toFixed(0);
                    }
                    return signed(v, 1);
                },
            }));

        return {
            columns: [totalColumn, ...clanColumns],
            rows,
            rowHeaderLabel: "Item",
        };
    }

    // Favor breakdown: alignment is in [-1, 1] but the Favor stat is shown
    // scaled by 100, so scale every value here to match.
    function clanFavorTooltipTable(
        clan: ClanDTO,
        toward: AlignmentToward,
        valueLabel: string,
    ): Table<RespectRowData, any, any> {
        const SCALE = 100;
        const otherClans = clan.settlement.clans.filter(
            (c) => c.uuid !== clan.uuid,
        );

        const sampleA = otherClans
            .map((c) => toward(c, clan))
            .find((a) => a && a.items.length > 0);

        const itemLabels = sampleA
            ? sampleA.items.map((i) => i.label)
            : ["Gifts", "Generosity", "Piety", "Sociability", "Conflict"];

        const rows: TableRow<RespectRowData, any>[] = [
            ...itemLabels.map((label) => ({
                data: { label, type: "item" as const, itemLabel: label },
                label,
            })),
            {
                data: { label: "Current Judgments", type: "total" as const },
                label: "Current Judgments",
                divider: true,
                bold: true,
            },
            {
                data: { label: "Previous Value", type: "previous" as const },
                label: "Previous Value",
            },
            {
                data: {
                    label: `Smoothed ${valueLabel}`,
                    type: "smoothed" as const,
                },
                label: `Smoothed ${valueLabel}`,
                bold: true,
            },
            {
                data: { label: "Population", type: "population" as const },
                label: "Population",
                class: "gray-row",
            },
        ];

        const totalColumn: TableColumn<RespectRowData, any, number> = {
            data: "total",
            label: "Total",
            valueFn: (row: RespectRowData) => {
                if (row.type === "item") {
                    return SCALE * populationAverage(otherClans, (c) =>
                        getAlignmentItemValue(toward, c, clan, row.itemLabel!),
                    );
                } else if (row.type === "total") {
                    return SCALE * populationAverage(
                        otherClans,
                        (c) => toward(c, clan)?.currentItemsTotal ?? 0,
                    );
                } else if (row.type === "previous") {
                    return SCALE * populationAverage(
                        otherClans,
                        (c) => toward(c, clan)?.previousValue ?? 0,
                    );
                } else if (row.type === "smoothed") {
                    return SCALE * populationAverage(
                        otherClans,
                        (c) => toward(c, clan)?.value ?? 0,
                    );
                } else {
                    return sumFun(otherClans, (c) => c.population);
                }
            },
            formatFn: (v: number, row: RespectRowData) => {
                if (row.type === "population") {
                    return v.toFixed(0);
                }
                return signed(v, 1);
            },
        };

        const clanColumns: TableColumn<RespectRowData, ClanDTO, number>[] =
            otherClans.map((otherClan) => ({
                data: otherClan,
                label: otherClan.name,
                valueFn: (row: RespectRowData) => {
                    const a = toward(otherClan, clan);
                    if (row.type === "item") {
                        return (
                            SCALE *
                            getAlignmentItemValue(
                                toward,
                                otherClan,
                                clan,
                                row.itemLabel!,
                            )
                        );
                    } else if (row.type === "total") {
                        return SCALE * (a?.currentItemsTotal ?? 0);
                    } else if (row.type === "previous") {
                        return SCALE * (a?.previousValue ?? 0);
                    } else if (row.type === "smoothed") {
                        return SCALE * (a?.value ?? 0);
                    } else {
                        return otherClan.population;
                    }
                },
                formatFn: (v: number, row: RespectRowData) => {
                    if (row.type === "population") {
                        return v.toFixed(0);
                    }
                    return signed(v, 1);
                },
            }));

        return {
            columns: [totalColumn, ...clanColumns],
            rows,
            rowHeaderLabel: "Item",
        };
    }

    function clanHappinessTooltipTable(clan: ClanDTO) {
        return new FilteredIterableTable(
            clan.happiness.items.values(),
            (item) => item.label,
            (_) => true,
            [
                {
                    data: "State",
                    label: "State",
                    valueFn: (item) => item.stateDisplay,
                },
                {
                    data: "Appeal",
                    label: "Appeal",
                    valueFn: (item) => item.appeal,
                    formatFn: (v: number) => signed(v, 0),
                },
            ],
        );
    }

    function clanSustenanceHappinessTooltipTable(clan: ClanDTO) {
        return new FilteredIterableTable(
            clan.happiness.items.values(),
            (item) => item.label,
            (item) => item.isSubsistence,
            [
                {
                    data: "State",
                    label: "State",
                    valueFn: (item) => item.stateDisplay,
                },
                {
                    data: "Appeal",
                    label: "Appeal",
                    valueFn: (item) => item.appeal,
                    formatFn: (v: number) => signed(v, 0),
                },
            ],
        );
    }

    function clanSocialHappinessTooltipTable(clan: ClanDTO) {
        return new FilteredIterableTable(
            clan.happiness.items.values(),
            (item) => item.label,
            (item) => item.isSocial,
            [
                {
                    data: "State",
                    label: "State",
                    valueFn: (item) => item.stateDisplay,
                },
                {
                    data: "Appeal",
                    label: "Appeal",
                    valueFn: (item) => item.appeal,
                    formatFn: (v: number) => signed(v, 3),
                },
            ],
        );
    }

    function clanSocietyHappinessDetailTooltipTable(clan: ClanDTO) {
        const societyItem = clan.happiness.getSocietyItem();
        if (!societyItem) {
            return {
                columns: [
                    {
                        data: "No society item",
                        label: "No society item",
                        valueFn: () => 0,
                    },
                ],
                rows: [],
            };
        }
        return new IterableTable(
            societyItem.subitems,
            (subitem) => subitem.otherName,
            [
                {
                    data: "Rel",
                    label: "Rel",
                    valueFn: (subitem) => subitem.relativeAttention,
                    formatFn: (v: number) => pct(v, 0),
                },
                {
                    data: "Aln",
                    label: "Aln",
                    valueFn: (subitem) => subitem.alignment,
                    formatFn: (v: number) => pct(v, 0),
                },
                {
                    data: "Appeal",
                    label: "Appeal",
                    valueFn: (subitem) => subitem.value,
                    formatFn: (v: number) => signed(v, 2),
                },
            ],
        );
    }

    function clanConnectionsTooltipTable(clan: ClanDTO) {
        return new FilteredIterableTable(
            connectionsOf(clan),
            ([other, connections]) => other.name,
            (_) => true,
            [
                {
                    data: "Att",
                    label: "Att",
                    valueFn: ([other, connections]) =>
                        clan.world.attentionTo(clan, other),
                    formatFn: (v: number) => v.toFixed(0),
                },
                {
                    data: "Rel",
                    label: "Rel",
                    valueFn: ([other, connections]) =>
                        clan.world.attentionTo(clan, other) /
                        (other.population || 1),
                    formatFn: pct,
                },
                {
                    data: "Kind",
                    label: "Kind",
                    valueFn: ([other, connections]) =>
                        connections.map((c) => c.debugString()).join(", "),
                },
            ],
        );
    }

    function clanHealthTooltipTable(clan: ClanDTO) {
        return new IterableTable(
            Array.from(
                new Set([
                    ...(clan.lastPopulationChange?.brModifiers ?? []).map(
                        (m) => m.source,
                    ),
                    ...(clan.lastPopulationChange?.drModifiers ?? []).map(
                        (m) => m.source,
                    ),
                ]),
            ),
            (source) => source,
            [
                {
                    data: "BR",
                    label: "BR",
                    valueFn: (source) =>
                        clan.lastPopulationChange?.brModifiers.find(
                            (m) => m.source === source,
                        )?.value,
                    formatFn: (v: number | undefined) =>
                        v !== undefined ? spct(v, 0) : "-",
                },
                {
                    data: "DR",
                    label: "DR",
                    valueFn: (source) =>
                        clan.lastPopulationChange?.drModifiers.find(
                            (m) => m.source === source,
                        )?.value,
                    formatFn: (v: number | undefined) =>
                        v !== undefined ? spct(v, 0) : "-",
                },
            ],
        );
    }

    function clanRateModifierTooltipTable(clan: ClanDTO, rate: "br" | "dr") {
        const modifiers =
            rate === "br"
                ? clan.lastPopulationChange.brModifiers
                : clan.lastPopulationChange.drModifiers;
        return new IterableTable(modifiers, (item) => item.source, [
            {
                data: "State",
                label: "",
                valueFn: (item) => item.inputValue,
                formatFn: (v: number | string) =>
                    typeof v === "number" ? v.toFixed(2) : v,
            },
            {
                data: "Value",
                label: "",
                valueFn: (item) => item.value,
                formatFn: (v: number) => spct(v, 0),
            },
        ]);
    }

    function productivityModifierTooltipTable(clan: ClanDTO, process: Process) {
        return new IterableTable(
            clan.production.forProcess(process)?.productivity.items ?? [],
            (item) => item.label,
            [
                {
                    data: "Value",
                    label: "Value",
                    valueFn: (item) => item.value,
                    formatFn: (v: number) => spct(v, 0),
                },
                {
                    data: "Explanation",
                    label: "Explanation",
                    valueFn: (item) => item.explanation,
                },
            ],
        );
    }

    function netLaborProductivity(clan: ClanDTO, process: Process): number {
        const r = clan.production.forProcess(process);
        if (!r) {
            return 1;
        }
        return (
            (r.laborProductivityFactor * Math.min(r.labor, r.land)) / r.labor
        );
    }

    let selectedLens = $state<string>("All");
    const lenses: Record<string, string[]> = {
        All: ["*"],
        Econ: [
            "production",
            "productivity",
            "food:detail",
            "skills",
            "support_ratio:detail",
        ],
        Productivity: ["productivity"],
        Demographics: ["demographics", "demographics:detail"],
    };

    function isRowVisible(row: RowDef, selectedLensTopics: string[]): boolean {
        if (!row.topics) {
            return false;
        }
        if (selectedLensTopics.includes("*")) {
            if (row.topics.some((t) => !t.includes(":"))) {
                return true;
            }
        }
        return row.topics.some((t) => selectedLensTopics.includes(t));
    }

    let filteredRowGroups = $derived.by<RowDef[][]>(() => {
        const selectedLensTopics = lenses[selectedLens];
        const result: RowDef[][] = [];
        for (const group of rowGroups) {
            const visibleNonHeaderRows = group.filter(
                (row) => !row.isHeader && isRowVisible(row, selectedLensTopics),
            );
            if (visibleNonHeaderRows.length > 0) {
                const groupResult = group.filter(
                    (row) =>
                        row.isHeader || isRowVisible(row, selectedLensTopics),
                );
                result.push(groupResult);
            } else {
                const hasHeader = group.some((row) => row.isHeader);
                if (!hasHeader) {
                    const visibleRows = group.filter((row) =>
                        isRowVisible(row, selectedLensTopics),
                    );
                    if (visibleRows.length > 0) {
                        result.push(visibleRows);
                    }
                }
            }
        }
        return result;
    });
</script>

{#snippet deltaCell(
    cs: ClanLastTurnSnapshots,
    valueFunc: (c: ClanDTO) => number,
    fmt: (v: number) => string = (v) => v.toString(),
    timelineKey?: keyof ClanTimePoint,
    scaler?: YAxisScaler,
    title?: string,
)}
    {@const delta = cs.p ? valueFunc(cs.e) - valueFunc(cs.p) : 0}
    <td
        class={delta >= 0
            ? "delta-positive"
            : delta <= 0
              ? "delta-negative"
              : delta >= 0
                ? "delta-negative"
                : ""}
    >
        <Tooltip>
            {#if cs.p}
                {tsigned(delta, fmt)}
            {:else}
                -
            {/if}
            <div
                slot="tooltip"
                style="text-align: left; color: initial; min-width: 250px;"
            >
                {#if cs.p}
                    {fmt(valueFunc(cs.p))}
                {:else}
                    ?
                {/if}
                &rarr;
                {fmt(valueFunc(cs.e))}
                {#if timelineKey && scaler && title}
                    <hr
                        style="margin: 8px 0; border: none; border-top: 1px solid #eee;"
                    />
                    <div style="width: 250px; height: 150px;">
                        <LineGraph
                            data={clanKeyTimelineGraphData(
                                cs.e,
                                timelineKey,
                                title,
                                scaler,
                            )}
                        />
                    </div>
                {/if}
            </div>
        </Tooltip>
    </td>
{/snippet}

{#snippet clanNotifications(clan: ClanDTO)}
    {#each clan.notifications as n}
        <SimpleTooltip tip={n.message}>{n.tag}</SimpleTooltip>
    {/each}
{/snippet}

{#snippet happinessTooltip(cs: ClanLastTurnSnapshots)}
    <TableView2 table={clanHappinessTooltipTable(cs.e)}></TableView2>
{/snippet}

{#snippet favorTooltip(cs: ClanLastTurnSnapshots)}
    <TableView2
        table={clanFavorTooltipTable(
            cs.e,
            (observer, target) => cs.e.world.alignmentToward(observer, target),
            "Favor",
        )}
    ></TableView2>
    <div
        style="font-size: 0.85em; margin-top: 0.35rem; color: #666; font-style: italic;"
    >
        Retention ratio: 90% (Smoothed Favor = 10% Current Judgments + 90%
        Previous Value).
    </div>
{/snippet}

{#snippet prestigeTooltip(cs: ClanLastTurnSnapshots)}
    {@const clan = cs.e}
    {@const world = clan.world}
    {@const raters = clan.settlement.clans.filter((c) => c.uuid !== clan.uuid)}
    <div style="font-size: 0.9em; padding: 0.25rem; min-width: 260px;">
        <strong>Prestige (Alignment &times; Respect)</strong>
        <p style="margin: 0.25rem 0; color: #666;">
            Population-weighted prestige other clans grant {clan.name}.
        </p>
        <table style="border-collapse: collapse; width: 100%;">
            <thead>
                <tr>
                    <th style="text-align: left;">From</th>
                    <th style="text-align: right;">Align</th>
                    <th style="text-align: right;">Respect</th>
                    <th style="text-align: right;">Prestige</th>
                    <th style="text-align: right;">Pop</th>
                </tr>
            </thead>
            <tbody>
                {#each raters as r}
                    {@const a = world.alignmentToward(r, clan)?.value ?? 0}
                    {@const rp = world.respectToward(r, clan)?.value ?? 0}
                    <tr>
                        <td style="text-align: left;">{r.name}</td>
                        <td style="text-align: right;">{signed(a, 2)}</td>
                        <td style="text-align: right;">{signed(rp, 1)}</td>
                        <td style="text-align: right;"
                            >{signed(world.prestigeToward(r, clan), 1)}</td
                        >
                        <td style="text-align: right;">{r.population}</td>
                    </tr>
                {/each}
                <tr style="border-top: 1px solid #ccc; font-weight: bold;">
                    <td style="text-align: left;">Weighted avg</td>
                    <td></td>
                    <td></td>
                    <td style="text-align: right;">{signed(clan.prestigeAverage, 1)}</td>
                    <td></td>
                </tr>
            </tbody>
        </table>
    </div>
{/snippet}

{#snippet respectTooltip(cs: ClanLastTurnSnapshots)}
    <TableView2
        table={clanRespectTooltipTable(
            cs.e,
            (observer, target) => cs.e.world.respectToward(observer, target),
            "Respect",
        )}
    ></TableView2>
    <div
        style="font-size: 0.85em; margin-top: 0.35rem; color: #666; font-style: italic;"
    >
        Retention ratio: 90% (Smoothed Respect = 10% Current Judgments + 90%
        Previous Value).
    </div>
{/snippet}

{#snippet holinessTooltip(cs: ClanLastTurnSnapshots)}
    <TableView2
        table={clanRespectTooltipTable(
            cs.e,
            (observer, target) => cs.e.world.holinessToward(observer, target),
            "Holiness",
            HOLINESS_ITEM_LABELS,
        )}
    ></TableView2>
    <div
        style="font-size: 0.85em; margin-top: 0.35rem; color: #666; font-style: italic;"
    >
        Retention ratio: 90% (Smoothed Holiness = 10% Current Judgments + 90%
        Previous Value).
    </div>
{/snippet}

{#snippet peopleTooltip(cs: ClanLastTurnSnapshots)}
    <PopulationPyramid clan={cs.e} />
    <hr />
    <div>Workers: {unsigned(cs.e.workers)}</div>
    <div>
        Population Per Worker: {safeDiv(cs.e.population, cs.e.workers).toFixed(
            1,
        )}
    </div>
{/snippet}

{#snippet settlementPeopleTooltip(css: ClanLastTurnSnapshots[])}
    <PopulationPyramid
        clan={{ slices: settlementSlices, population: settlementPopulation }}
    />
    <hr />
    <div>Workers: {unsigned(settlementWorkers)}</div>
    <div>
        Population Per Worker: {safeDiv(
            settlementPopulation,
            settlementWorkers,
        ).toFixed(1)}
    </div>
{/snippet}

{#snippet settlementHealthTooltip(css: ClanLastTurnSnapshots[])}
    <TableView2
        table={mergedClanTable(
            css,
            clanHealthTooltipTable,
            undefined,
            "geomean",
        )}
    />
{/snippet}

{#snippet settlementBrModifierTooltip(css: ClanLastTurnSnapshots[])}
    <TableView2
        table={mergedClanTable(
            css,
            (clan) => clanRateModifierTooltipTable(clan, "br"),
            undefined,
            "geomean",
        )}
    />
{/snippet}

{#snippet settlementDrModifierTooltip(css: ClanLastTurnSnapshots[])}
    <TableView2
        table={mergedClanTable(
            css,
            (clan) => clanRateModifierTooltipTable(clan, "dr"),
            undefined,
            "geomean",
        )}
    />
{/snippet}

{#snippet settlementProcessProductivityTooltip(
    css: ClanLastTurnSnapshots[],
    process: Process,
)}
    <TableView2
        table={mergedClanTable(
            css,
            (clan) => productivityModifierTooltipTable(clan, process),
            [0],
            "geomean",
        )}
    />
{/snippet}

{#snippet settlementQolTooltip(css: ClanLastTurnSnapshots[])}
    <TableView2 table={mergedClanTable(css, clanQolTooltipTable, [0])} />
{/snippet}

{#snippet settlementFavorTooltip(css: ClanLastTurnSnapshots[])}
    <TableView2
        table={mergedClanTable(
            css,
            (clan) =>
                clanFavorTooltipTable(
                    clan,
                    (observer, target) =>
                        clan.world.alignmentToward(observer, target),
                    "Favor",
                ),
            [0],
        )}
    />
{/snippet}

{#snippet settlementRespectTooltip(css: ClanLastTurnSnapshots[])}
    <TableView2
        table={mergedClanTable(
            css,
            (clan) =>
                clanRespectTooltipTable(
                    clan,
                    (observer, target) =>
                        clan.world.respectToward(observer, target),
                    "Respect",
                ),
            [0],
        )}
    />
{/snippet}

{#snippet settlementHolinessTooltip(css: ClanLastTurnSnapshots[])}
    <TableView2
        table={mergedClanTable(
            css,
            (clan) =>
                clanRespectTooltipTable(
                    clan,
                    (observer, target) =>
                        clan.world.holinessToward(observer, target),
                    "Holiness",
                    HOLINESS_ITEM_LABELS,
                ),
            [0],
        )}
    />
{/snippet}

{#snippet settlementFoodProducedTooltip(css: ClanLastTurnSnapshots[])}
    <TableView2 table={mergedClanTable(css, clanFoodProductionTooltipTable)} />
{/snippet}

{#snippet settlementFoodTooltip(css: ClanLastTurnSnapshots[])}
    <TableView2 table={mergedClanTable(css, clanSustenanceTooltipTable)} />
{/snippet}

{#snippet settlementFoodStockTooltip(css: ClanLastTurnSnapshots[])}
    <TableView2 table={mergedClanTable(css, clanFoodStockTooltipTable)} />
{/snippet}

{#snippet peopleDeltaTooltip(cs: ClanLastTurnSnapshots)}
    <PopulationChange clan={cs.e} />
    <hr style="margin: 8px 0; border: none; border-top: 1px solid #eee;" />
    <div style="width: 250px; height: 150px;">
        <LineGraph
            data={clanKeyTimelineGraphData(
                cs.e,
                "population",
                "Population",
                new PopulationScaler(),
            )}
        />
    </div>
{/snippet}

{#snippet peopleDeltaCell(cs: ClanLastTurnSnapshots)}
    <td class="delta">
        <Tooltip>
            {cs.e.lastPopulationChange
                ? tsigned(cs.e.lastPopulationChange.change)
                : ""}
            <div slot="tooltip" style="text-align: left; color: initial;">
                {@render peopleDeltaTooltip(cs)}
            </div>
        </Tooltip>
    </td>
{/snippet}

{#snippet nextSupportRatioTooltip(cs: ClanLastTurnSnapshots)}
    <div>Workers: {cs.e.workers}</div>
    <div>Carers and Dependents: {cs.e.population - cs.e.workers}</div>
    <div>
        Population Per Worker: {safeDiv(cs.e.population, cs.e.workers).toFixed(
            1,
        )}
    </div>
{/snippet}

{#snippet healthTooltip(cs: ClanLastTurnSnapshots)}
    <TableView2 table={clanHealthTooltipTable(cs.e)} />
{/snippet}

{#snippet brModifierTooltip(cs: ClanLastTurnSnapshots)}
    <TableView2 table={clanRateModifierTooltipTable(cs.e, "br")} />
{/snippet}

{#snippet drModifierTooltip(cs: ClanLastTurnSnapshots)}
    <TableView2 table={clanRateModifierTooltipTable(cs.e, "dr")} />
{/snippet}

{#snippet stressValueRender(cs: ClanLastTurnSnapshots)}
    <Tooltip>
        <span style="color: {stressColor(cs.e.stress.value)}"
            >{signed(cs.e.stress.value)}</span
        >
        <div slot="tooltip" style="text-align: left; color: initial;">
            {@render stressTooltip(cs)}
        </div>
    </Tooltip>
{/snippet}

{#snippet stressTooltip(cs: ClanLastTurnSnapshots)}
    <TableView2 table={clanStressTooltipTable(cs.e)}></TableView2>
{/snippet}

{#snippet impressionTooltip(
    clan: ClanDTO,
    def: ObservationDef,
    blurb: string,
)}
    {@const views = clan.impressionViews(def)}
    <div style="font-size: 0.9em; padding: 0.25rem; max-width: 240px;">
        <div style="margin-bottom: 0.35rem;">{blurb}</div>
        <TableView2
            table={new IterableTable(views, (v) => v.clan.name, [
                {
                    data: "Thinks",
                    label: "Thinks",
                    valueFn: (v) => v.estimate,
                    formatFn: (x: number) => unsigned(x, 1),
                },
                {
                    data: "Confidence",
                    label: "Conf",
                    valueFn: (v) => v.confidence,
                    formatFn: (x: number) => pct(x),
                },
                {
                    data: "Weight",
                    label: "Weight",
                    valueFn: (v) => v.weight,
                    formatFn: (x: number) => pct(x),
                },
            ])}
        ></TableView2>
        <div
            style="display: flex; justify-content: space-between; margin-top: 0.25rem; border-top: 1px dashed #ccc; padding-top: 0.25rem;"
        >
            <span>Weighted average:</span>
            <strong>{unsigned(clan.impressionAverage(def), 1)}</strong>
        </div>
    </div>
{/snippet}

{#snippet generosityTooltip(cs: ClanLastTurnSnapshots)}
    {@render impressionTooltip(
        cs.e,
        ObservationDefs.Generosity,
        `How freely ${cs.e.name} is thought to give, from the aid and gifts each neighbor has seen it hand out. Weighted by population.`,
    )}
{/snippet}

{#snippet bellicosityTooltip(cs: ClanLastTurnSnapshots)}
    {@render impressionTooltip(
        cs.e,
        ObservationDefs.Bellicosity,
        `How quarrelsome ${cs.e.name} is thought to be, from the times each neighbor has seen it reach for force. Weighted by population.`,
    )}
{/snippet}

{#snippet qolTooltip(cs: ClanLastTurnSnapshots)}
    <TableView2 table={clanQolTooltipTable(cs.e)}></TableView2>
{/snippet}

{#snippet foodProducedTooltip(cs: ClanLastTurnSnapshots)}
    <div style="margin-bottom: 6px;">
        <b>Food Target:</b>
        {pct(cs.e.perCapitaFoodProductionTarget)} / capita
    </div>
    <TableView2 table={clanFoodProductionTooltipTable(cs.e)}></TableView2>
{/snippet}

{#snippet giftsTooltip(cs: ClanLastTurnSnapshots)}
    <TableView2 table={clanGiftsTooltipTable(cs.e)}></TableView2>
{/snippet}

{#snippet aidTooltip(cs: ClanLastTurnSnapshots)}
    <TableView2 table={clanAidTooltipTable(cs.e)}></TableView2>
{/snippet}

{#snippet fromStockTooltip(cs: ClanLastTurnSnapshots)}
    <TableView2 table={clanFromStockTooltipTable(cs.e)}></TableView2>
{/snippet}

{#snippet foodTooltip(cs: ClanLastTurnSnapshots)}
    <TableView2 table={clanSustenanceTooltipTable(cs.e)}></TableView2>
{/snippet}

{#snippet foodStockTooltip(cs: ClanLastTurnSnapshots)}
    <TableView2 table={clanFoodStockTooltipTable(cs.e)}></TableView2>
{/snippet}

{#snippet materialWelfareTooltip(cs: ClanLastTurnSnapshots)}
    <TableView2 table={clanSustenanceHappinessTooltipTable(cs.e)}></TableView2>
{/snippet}

{#snippet connectionsTooltip(cs: ClanLastTurnSnapshots)}
    <TableView2 table={clanConnectionsTooltipTable(cs.e)}></TableView2>
{/snippet}

{#snippet socialWelfareTooltip(cs: ClanLastTurnSnapshots)}
    <h4>Sources</h4>
    <TableView2 table={clanSocialHappinessTooltipTable(cs.e)}></TableView2>
    <h4>Society Detail</h4>
    <TableView2 table={clanSocietyHappinessDetailTooltipTable(cs.e)}
    ></TableView2>
{/snippet}

{#snippet activitiesRender(cs: ClanLastTurnSnapshots)}
    <ClanEffortMiniBar clan={cs.e} m={cs.e.effortAllocation.m} />
{/snippet}

{#snippet activitiesPrevRender(cs: ClanLastTurnSnapshots)}
    {#if cs.p}<ClanEffortMiniBar clan={cs.p} m={cs.p.effortAllocation.m} />{/if}
{/snippet}

{#snippet processesRender(cs: ClanLastTurnSnapshots)}
    <ClanEffortMiniBar clan={cs.e} m={cs.e.effortAllocation.pm} />
{/snippet}

{#snippet processesPrevRender(cs: ClanLastTurnSnapshots)}
    {#if cs.p}<ClanEffortMiniBar
            clan={cs.p}
            m={cs.p.effortAllocation.pm}
        />{/if}
{/snippet}

{#snippet settlementActivitiesRender(css: ClanLastTurnSnapshots[])}
    {@const clans = css.map((cs) => cs.e)}
    <ClanEffortMiniBar
        clan={effortProxy(clans)}
        m={averageEffortAllocation(clans, (c) => c.effortAllocation.m)}
    />
{/snippet}

{#snippet settlementActivitiesPrevRender(css: ClanLastTurnSnapshots[])}
    {@const clans = css.filter((cs) => cs.p).map((cs) => cs.p!)}
    {#if clans.length}
        <ClanEffortMiniBar
            clan={effortProxy(clans)}
            m={averageEffortAllocation(clans, (c) => c.effortAllocation.m)}
        />
    {/if}
{/snippet}

{#snippet settlementProcessesRender(css: ClanLastTurnSnapshots[])}
    {@const clans = css.map((cs) => cs.e)}
    <ClanEffortMiniBar
        clan={effortProxy(clans)}
        m={averageEffortAllocation(clans, (c) => c.effortAllocation.pm)}
    />
{/snippet}

{#snippet settlementProcessesPrevRender(css: ClanLastTurnSnapshots[])}
    {@const clans = css.filter((cs) => cs.p).map((cs) => cs.p!)}
    {#if clans.length}
        <ClanEffortMiniBar
            clan={effortProxy(clans)}
            m={averageEffortAllocation(clans, (c) => c.effortAllocation.pm)}
        />
    {/if}
{/snippet}

{#snippet residenceTooltip(cs: ClanLastTurnSnapshots)}
    <ClanResidenceTooltip clan={cs.e} />
{/snippet}

{#snippet mutualAidSatTooltip(cs: ClanLastTurnSnapshots)}
    {@const world = settlement.world}
    {@const clan = cs.e}
    {@const demand = clanHelpDemand(clan.population)}
    <div style="font-size: 0.9em; padding: 0.25rem; min-width: 250px;">
        <strong>Mutual Aid Satisfaction (Value Sat):</strong>
        <p style="margin: 0.25rem 0;">
            Satisfaction based on net help value received relative to demand.
        </p>
        <ul
            style="margin: 0.25rem 0; padding-left: 1.2rem; list-style-type: none;"
        >
            <li>• Help demand: {unsigned(demand, 1)}</li>
            <hr
                style="margin: 0.25rem 0; border: none; border-top: 1px solid #ccc;"
            />
            {#each Array.from(world.clanMap.values()) as other}
                {#if clan.uuid !== other.uuid}
                    {@const interactions = world.interactions.get(
                        clan.ref,
                        other.ref,
                    )}
                    {@const ma = interactions.find(
                        (i) => i instanceof MutualAidInteraction,
                    ) as MutualAidInteraction | undefined}
                    {#if ma && ma.amount > 0}
                        {@const netVal = ma.amount * (1 - ma.icebergCost)}
                        {@const valueVal = netVal * ma.trust}
                        <li>
                            • From {other.name}: {unsigned(valueVal, 1)} (net: {unsigned(
                                netVal,
                                1,
                            )} × trust: {unsigned(ma.trust, 2)})
                        </li>
                    {/if}
                {/if}
            {/each}
        </ul>
    </div>
{/snippet}

{#snippet helpProductivityModifierTooltip(cs: ClanLastTurnSnapshots)}
    {@const world = settlement.world}
    {@const clan = cs.e}
    {@const helpValue = getHelpReceivedValueFromMutualAid(world, clan)}
    {@const demand = clanHelpDemand(clan.population)}
    {@const modifier = getHelpProductivityModifier(helpValue, demand)}
    <div style="font-size: 0.9em; padding: 0.25rem; min-width: 250px;">
        <strong>Help Productivity Modifier:</strong>
        <p style="margin: 0.25rem 0;">
            A multiplier applied to Agriculture productivity based on help value
            received.
        </p>
        <ul
            style="margin: 0.25rem 0; padding-left: 1.2rem; list-style-type: none;"
        >
            <li>• Net help value received: {unsigned(helpValue, 1)}</li>
            <li>• Help demand: {unsigned(demand, 1)}</li>
            <li>• Help ratio: {pct(demand > 0 ? helpValue / demand : 1.0)}</li>
            <hr
                style="margin: 0.25rem 0; border: none; border-top: 1px solid #ccc;"
            />
            <li>• Modifier: <strong>{spct(modifier)}</strong></li>
        </ul>
        <div
            style="font-size: 0.8em; color: #6e5b47; font-style: italic; margin-top: 0.25rem;"
        >
            Curve: 0.6 if no help, 1.0 if exactly met, maxes out around 1.3.
        </div>
    </div>
{/snippet}

{#snippet avgWeddingAppealTooltip(cs: ClanLastTurnSnapshots)}
    {@const world = settlement.world}
    {@const clan = cs.e}
    {@const decisions =
        world.lastMarriageDecisions ?? getMarriageDecisions(world as any)}
    <div style="font-size: 0.9em; padding: 0.25rem; min-width: 250px;">
        <strong>Avg Wedding Appeal:</strong>
        <p style="margin: 0.25rem 0;">
            Average marriage appeal of {clan.name} toward its marriage partners last
            turn, weighted by the number of marriages with each partner.
        </p>
        <ul
            style="margin: 0.25rem 0; padding-left: 1.2rem; list-style-type: none;"
        >
            {#each Array.from(world.clanMap.values()) as other}
                {#if clan.uuid !== other.uuid}
                    {@const count = getPairingCount(decisions, clan, other)}
                    {#if count > 0}
                        {@const prestige = world.prestigeToward(clan, other)}
                        <li>
                            • With {other.name}: {count} marriage{count > 1
                                ? "s"
                                : ""} (Appeal: {signed(prestige, 1)})
                        </li>
                    {/if}
                {/if}
            {/each}
        </ul>
    </div>
{/snippet}

{#snippet avgPartnerAppealTooltip(cs: ClanLastTurnSnapshots)}
    {@const world = settlement.world}
    {@const clan = cs.e}
    <div style="font-size: 0.9em; padding: 0.25rem; min-width: 250px;">
        <strong>Avg Partner Appeal:</strong>
        <p style="margin: 0.25rem 0;">
            Average marriage appeal of {clan.name} toward all clans it is currently
            related to by marriage, weighted by relatedness.
        </p>
        <ul
            style="margin: 0.25rem 0; padding-left: 1.2rem; list-style-type: none;"
        >
            {#each Array.from(world.clanMap.values()) as other}
                {#if clan.uuid !== other.uuid}
                    {@const conn = world.connections.getForType(
                        clan,
                        other,
                        MarriageConnection,
                    )}
                    {#if conn && conn.relatedness > 0}
                        {@const prestige = world.prestigeToward(clan, other)}
                        <li>
                            • With {other.name}: {pct(conn.relatedness)} related
                            (Appeal: {signed(prestige, 1)})
                        </li>
                    {/if}
                {/if}
            {/each}
        </ul>
    </div>
{/snippet}

{#snippet supportRatioPrevTooltip(cs: ClanLastTurnSnapshots)}
    {#if cs.p}
        <div>Workers: {cs.p.workers}</div>
        <div>Carers and Dependents: {cs.p.population - cs.p.workers}</div>
        <div>
            Population Per Worker: {safeDiv(
                cs.p.population,
                cs.p.workers,
            ).toFixed(1)}
        </div>
    {/if}
{/snippet}

{#snippet supportRatioValueRender(cs: ClanLastTurnSnapshots)}
    {#if cs.p}
        <Tooltip>
            {safeDiv(cs.p.population, cs.p.workers).toFixed(1)}
            <div slot="tooltip" style="text-align: left; color: initial;">
                {@render supportRatioPrevTooltip(cs)}
            </div>
        </Tooltip>
    {:else}
        -
    {/if}
{/snippet}

{#snippet processProductivityTooltip(
    cs: ClanLastTurnSnapshots,
    process: Process,
)}
    <TableView2 table={productivityModifierTooltipTable(cs.e, process)} />
{/snippet}

{#snippet skillDeltaCell(cs: ClanLastTurnSnapshots, skill: any)}
    <td><SkillDelta {skill} clan={cs.e}></SkillDelta></td>
{/snippet}

<div id="top" class={predictMode ? "predict" : ""}>
    <div class="lens-button-group">
        {#each Object.keys(lenses) as lens}
            <button
                type="button"
                class="lens-btn {selectedLens === lens ? 'active' : ''}"
                onclick={() => (selectedLens = lens)}
            >
                {lens}
            </button>
        {/each}
    </div>

    <table>
        <thead>
            <tr>
                <td></td>
                <td class="clan-header settlement-col">{settlement.name}</td>
                {#each csnaps as cs}
                    {@const rank = prestigeRankings.get(cs.c.uuid)}
                    <td class="clan-header" colspan="2">
                        <div
                            style="display: flex; flex-direction: column; align-items: center; justify-content: center;"
                        >
                            {#if rank}
                                <SimpleTooltip tip={rank.title}>
                                    <div
                                        style="display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 50%; background-color: {rank.color}; color: #ffffff; font-weight: bold; font-size: 0.75rem; line-height: 1; margin-bottom: 3px; cursor: default; box-shadow: 0 1px 2px rgba(0,0,0,0.15);"
                                    >
                                        {rank.rank}
                                    </div>
                                </SimpleTooltip>
                            {/if}
                            <div
                                style="display: flex; flex-direction: row; align-items: center; justify-content: center; gap: 0.2em;"
                            >
                                <EntityLink
                                    entity={cs.c}
                                    extra={clanNotifications}
                                />
                                <ClanMigrationIcon clan={cs.c} />
                            </div>
                        </div>
                    </td>
                {/each}
            </tr>
        </thead>
        <tbody>
            {#each filteredRowGroups as group, groupIdx}
                {#if groupIdx > 0}
                    <tr><td style="height: 0.5em"></td></tr>
                {/if}
                {#each group as row}
                    {#if row.isBreak}
                        <tr
                            ><td
                                colspan={2 + csnaps.length * 2}
                                style="height: 0.5em"
                            ></td></tr
                        >
                    {:else}
                        <tr class={row.class ?? ""}>
                            {#if row.isHeader}
                                <td colspan={2 + csnaps.length * 2}
                                    >{row.label}</td
                                >
                            {:else}
                                <td class="row-label">
                                    {#if row.labelTooltip}
                                        <SimpleTooltip tip={row.labelTooltip}
                                            >{@html row.label}</SimpleTooltip
                                        >
                                    {:else}
                                        {@html row.label}
                                    {/if}
                                </td>
                                {@const sval = settlementValue(row)}
                                <td class="settlement-col ra">
                                    {#if row.settlementRenderSnippet}
                                        {@render row.settlementRenderSnippet(
                                            csnaps,
                                        )}
                                    {:else if sval !== undefined}
                                        {#if row.settlementTooltipSnippet}
                                            <Tooltip>
                                                {row.format
                                                    ? row.format(sval)
                                                    : sval}
                                                <div
                                                    slot="tooltip"
                                                    style="text-align: left; color: initial;"
                                                >
                                                    {@render row.settlementTooltipSnippet(
                                                        csnaps,
                                                        row.context,
                                                    )}
                                                </div>
                                            </Tooltip>
                                        {:else}
                                            {row.format
                                                ? row.format(sval)
                                                : sval}
                                        {/if}
                                    {/if}
                                </td>
                                {#each csnaps as cs}
                                    {#if row.colspan === 2}
                                        <td colspan="2">
                                            {#if row.renderSnippet}
                                                {@render row.renderSnippet(cs)}
                                            {/if}
                                        </td>
                                    {:else}
                                        <td class={row.cellClass}>
                                            {#if row.renderValueSnippet}
                                                {@render row.renderValueSnippet(
                                                    cs,
                                                )}
                                            {:else if row.value}
                                                {@const val = row.value(cs.e)}
                                                {#if row.tooltipSnippet || row.useTooltip}
                                                    <Tooltip>
                                                        {row.format
                                                            ? row.format(val)
                                                            : val}
                                                        <div
                                                            slot="tooltip"
                                                            style="text-align: left; color: initial;"
                                                        >
                                                            {#if row.tooltipSnippet}
                                                                {@render row.tooltipSnippet(
                                                                    cs,
                                                                    row.context,
                                                                )}
                                                            {/if}
                                                        </div>
                                                    </Tooltip>
                                                {:else}
                                                    {row.format
                                                        ? row.format(val)
                                                        : val}
                                                {/if}
                                            {/if}
                                        </td>
                                        {#if row.customDeltaSnippet}
                                            {@render row.customDeltaSnippet(
                                                cs,
                                                row.customDeltaContext,
                                            )}
                                        {:else if row.deltaValue}
                                            {@render deltaCell(
                                                cs,
                                                row.deltaValue,
                                                row.deltaFormat,
                                                row.timelineKey,
                                                row.scaler,
                                                (row.label ?? "")
                                                    .replace(
                                                        /&nbsp;|<[^>]*>/g,
                                                        "",
                                                    )
                                                    .trim(),
                                            )}
                                        {:else}
                                            <td></td>
                                        {/if}
                                    {/if}
                                {/each}
                            {/if}
                        </tr>
                    {/if}
                {/each}
            {/each}
        </tbody>
    </table>
</div>

<style>
    td {
        padding: 0 0.5em;
    }

    td.rap {
        padding-right: 1.3em;
    }

    .delta-positive {
        color: #464;
    }

    .delta-negative {
        color: #644;
    }

    .predict .actual {
        opacity: 0;
    }

    .clan-header {
        text-align: center;
        font-weight: bold;
    }

    td.settlement-col {
        border-right: 1px solid #d3c4ad;
        padding-right: 1.25em;
    }

    /* Clan names sit at the bottom of a column holding the prestige rank badge,
       centered in a row as tall as the migration icon beside them. Bottom-align
       to clear the badge, then pad by the slack that icon leaves below. */
    td.settlement-col.clan-header {
        vertical-align: bottom;
        padding-bottom: 3.6px;
    }

    td.settlement-col + td {
        padding-left: 1.25em;
    }

    .row-label {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 12em;
    }

    .lens-button-group {
        display: inline-flex;
        gap: 0.25rem;
        background-color: #f3edd8;
        padding: 0.25rem;
        border-radius: 4px;
        align-items: center;
        margin-bottom: 0.75rem;
    }
    .lens-btn {
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
    .lens-btn:hover {
        background-color: rgba(0, 0, 0, 0.05);
    }
    .lens-btn.active {
        font-weight: bold;
        background-color: #fff;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    :global(td.gray-row) {
        color: #888;
    }
</style>
