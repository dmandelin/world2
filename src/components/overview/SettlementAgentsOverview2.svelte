<script lang="ts">
    import type { Snippet } from "svelte";
    import {
        FilteredIterableTable,
        IterableTable,
        SingleMapTable,
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
    import { safeDiv, sortedByKey } from "../../model/lib/basics";
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
    import type { Process } from "../../model/econ/process";
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

    let marriageAppealRankings = $derived.by(() => {
        if (!csnaps || csnaps.length === 0)
            return new Map<
                string,
                { rank: number; title: string; color: string }
            >();

        const n = csnaps.length;
        const values = csnaps.map((cs) => cs.e.marriageAppealAverage);
        const mean = values.reduce((a, b) => a + b, 0) / (n || 1);
        const variance =
            values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (n || 1);
        const stdDev = Math.sqrt(variance);

        const sorted = [...csnaps].sort(
            (a, b) => b.e.marriageAppealAverage - a.e.marriageAppealAverage,
        );

        const rankMap = new Map<string, number>();
        sorted.forEach((cs, idx) => {
            if (
                idx > 0 &&
                Math.abs(
                    cs.e.marriageAppealAverage -
                        sorted[idx - 1].e.marriageAppealAverage,
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
            const val = cs.e.marriageAppealAverage;
            const rank = rankMap.get(cs.c.uuid) ?? 1;
            const z = stdDev > 1e-6 ? (val - mean) / stdDev : 0;
            const color = getZScoreColor(z);
            const zStr = z >= 0 ? `+${z.toFixed(2)}` : z.toFixed(2);
            const title = `Rank #${rank} (Marriage Appeal: ${signed(val, 2)}, Z-Score: ${zStr})`;

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

        // Delta definition
        deltaValue?: (c: ClanDTO) => number;
        deltaFormat?: (v: number) => string;
        customDeltaSnippet?: Snippet<[ClanLastTurnSnapshots, any]>;
        customDeltaContext?: any;

        timelineKey?: keyof ClanTimePoint;
        scaler?: YAxisScaler;
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

    function getMarriageInterestItemValue(
        world: WorldDTO,
        observer: ClanDTO,
        target: ClanDTO,
        label: string,
    ): number {
        const r = world.marriageInterestToward(observer, target);
        if (!r) return 0;
        const infoMultiplier = Math.max(0, Math.min(1, r.informationValue));
        const item = r.items.find((i) => i.label === label);
        return item ? item.value * infoMultiplier : 0;
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
                label: "QoL",
                class: "actual",
                cellClass: "rap",
                value: (c) => c.qol.value,
                format: signed,
                tooltipSnippet: qolTooltip,
                deltaValue: (c) => c.qol.value,
                deltaFormat: signed,
                timelineKey: "qol",
                scaler: new ZeroCenteredScaler(),
                topics: ["welfare"],
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

        // Group 3: Marriage Appeal
        groups.push([
            {
                label: "Avg Marriage Appeal",
                class: "actual",
                cellClass: "rap",
                value: (c) => c.marriageAppealAverage,
                format: (v) => signed(v, 1),
                tooltipSnippet: marriageAppealTooltip,
                deltaValue: (c) => c.marriageAppealAverage,
                deltaFormat: (v) => signed(v, 1),
                timelineKey: "marriageAppealAverage",
                scaler: new ZeroCenteredScaler(),
                topics: ["perceptions"],
            },
            {
                label: "Marriage Appeal SD",
                class: "actual",
                cellClass: "rap",
                value: (c) => c.marriageAppealStdDev,
                format: (v) => v.toFixed(1),
                deltaValue: (c) => c.marriageAppealStdDev,
                deltaFormat: (v) => signed(v, 1),
                timelineKey: "marriageAppealStdDev",
                scaler: new DefaultScaler(),
                topics: ["perceptions"],
            },
            {
                label: "Avg Wedding Appeal",
                class: "actual",
                cellClass: "rap",
                value: (c) => {
                    const world = settlement.world;
                    const decisions = world.lastMarriageDecisions;
                    if (!decisions) return 0;
                    let weightedSum = 0;
                    let totalMarriages = 0;
                    for (const other of world.clanMap.values()) {
                        if (other.uuid === c.uuid) continue;
                        const count = getPairingCount(decisions, c, other);
                        if (count > 0) {
                            const mi = world.marriageInterestToward(c, other);
                            const appeal = mi ? mi.value : 0;
                            weightedSum += count * appeal;
                            totalMarriages += count;
                        }
                    }
                    return totalMarriages > 0
                        ? weightedSum / totalMarriages
                        : null;
                },
                format: (v) => (v === null ? "" : signed(v, 1)),
                tooltipSnippet: avgWeddingAppealTooltip,
                topics: ["perceptions", "demographics"],
            },
            {
                label: "Avg Partner Appeal",
                class: "actual",
                cellClass: "rap",
                value: (c) => {
                    const world = settlement.world;
                    let weightedSum = 0;
                    let totalWeight = 0;
                    for (const other of world.clanMap.values()) {
                        if (other.uuid === c.uuid) continue;
                        const conn = world.connections.getForType(
                            c,
                            other,
                            MarriageConnection,
                        );
                        if (conn && conn.relatedness > 0) {
                            const mi = world.marriageInterestToward(c, other);
                            const appeal = mi ? mi.value : 0;
                            weightedSum += conn.relatedness * appeal;
                            totalWeight += conn.relatedness;
                        }
                    }
                    return totalWeight > 0 ? weightedSum / totalWeight : null;
                },
                format: (v) => (v === null ? "" : signed(v, 1)),
                tooltipSnippet: avgPartnerAppealTooltip,
                topics: ["perceptions", "welfare"],
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
                label: "&nbsp;&nbsp;Given as gifts",
                class: "actual",
                cellClass: "ra",
                value: (c) =>
                    c.distribution
                        ? c.distribution.totalFoodGiftsGiven /
                          (c.population || 1)
                        : 0,
                format: fmt2,
                topics: ["food:detail"],
            },
            {
                label: "&nbsp;&nbsp;Received as gifts",
                class: "actual",
                cellClass: "ra",
                value: (c) =>
                    c.consumption
                        ? c.consumption.totalFoodGiftsReceived /
                          (c.population || 1)
                        : 0,
                format: fmt2,
                topics: ["food:detail"],
            },
            {
                label: "&nbsp;&nbsp;Net transfer via gifts",
                class: "actual",
                cellClass: "ra",
                value: (c) => {
                    const rec = c.consumption?.totalFoodGiftsReceived ?? 0;
                    const giv = c.distribution?.totalFoodGiftsGiven ?? 0;
                    return (rec - giv) / (c.population || 1);
                },
                format: fmt2,
                topics: ["food:detail"],
            },
            {
                label: "&nbsp;&nbsp;(Prod) Given as aid",
                class: "actual",
                cellClass: "ra",
                value: (c) =>
                    c.distribution
                        ? c.distribution.totalFoodAidGiven / (c.population || 1)
                        : 0,
                format: fmt2,
                topics: ["food:detail"],
            },
            {
                label: "&nbsp;&nbsp;Received as aid",
                class: "actual",
                cellClass: "ra",
                value: (c) =>
                    c.consumption
                        ? c.consumption.totalFoodAidReceived /
                          (c.population || 1)
                        : 0,
                format: fmt2,
                topics: ["food:detail"],
            },
            {
                label: "&nbsp;&nbsp;Net transfer via aid",
                class: "actual",
                cellClass: "ra",
                value: (c) => {
                    const rec = c.consumption?.totalFoodAidReceived ?? 0;
                    const givProd = c.distribution?.totalFoodAidGiven ?? 0;
                    const givStock = c.stockOutflow?.totalFoodAidGiven ?? 0;
                    return (rec - (givProd + givStock)) / (c.population || 1);
                },
                format: fmt2,
                topics: ["food:detail"],
            },
            {
                label: "&nbsp;Sent to storage",
                class: "actual",
                cellClass: "ra",
                value: (c) =>
                    c.distribution
                        ? c.distribution.totalFoodToStock / (c.population || 1)
                        : 0,
                format: fmt2,
                topics: ["food:detail"],
            },
            {
                label: "&nbsp;Retrieved from storage",
                class: "actual",
                cellClass: "ra",
                value: (c) =>
                    c.stockOutflow
                        ? c.stockOutflow.totalFoodRetrieved /
                          (c.population || 1)
                        : 0,
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
                topics: ["production"],
            },
            {
                label: "(Previous)",
                colspan: 2,
                renderSnippet: activitiesPrevRender,
                topics: ["production"],
            },
            {
                label: "Processes",
                colspan: 2,
                renderSnippet: processesRender,
                topics: ["production"],
            },
            {
                label: "(Previous)",
                colspan: 2,
                renderSnippet: processesPrevRender,
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

    function clanFoodTakenTooltipTable(clan: ClanDTO) {
        if (!clan.consumption) return undefined;
        const rows: {
            partner: string;
            good: string;
            amount: number;
            cost?: number;
        }[] = [];
        for (const g of clan.consumption.fromDonations) {
            if (g.good.isSubsistence) {
                rows.push({
                    partner: g.clan.name,
                    good: g.good.name,
                    amount: g.amount,
                    cost: g.transactionCost ?? 0,
                });
            }
        }
        return new IterableTable(rows, (r) => `${r.partner} (${r.good})`, [
            {
                data: "Partner",
                label: "Donor",
                valueFn: (r) => r.partner,
            },
            {
                data: "Good",
                label: "Good",
                valueFn: (r) => r.good,
            },
            {
                data: "Amount",
                label: "Amount",
                valueFn: (r) => r.amount,
                formatFn: unsignedFormat(2),
            },
            {
                data: "Cost",
                label: "Iceberg Cost",
                valueFn: (r) => r.cost ?? 0,
                formatFn: unsignedFormat(2),
            },
        ]);
    }

    function clanFoodGivenTooltipTable(clan: ClanDTO) {
        const rows: {
            partner: string;
            good: string;
            amount: number;
            source: string;
        }[] = [];
        if (clan.distribution) {
            for (const g of clan.distribution.toDonations) {
                if (g.good.isSubsistence) {
                    rows.push({
                        partner: g.clan.name,
                        good: g.good.name,
                        amount: g.amount,
                        source: "Production",
                    });
                }
            }
        }
        if (clan.stockOutflow) {
            for (const g of clan.stockOutflow.toDonations) {
                if (g.good.isSubsistence) {
                    rows.push({
                        partner: g.clan.name,
                        good: g.good.name,
                        amount: g.amount,
                        source: "Stock",
                    });
                }
            }
        }
        return new IterableTable(rows, (r) => `${r.partner} (${r.good})`, [
            {
                data: "Partner",
                label: "Recipient",
                valueFn: (r) => r.partner,
            },
            {
                data: "Good",
                label: "Good",
                valueFn: (r) => r.good,
            },
            {
                data: "Source",
                label: "Source",
                valueFn: (r) => r.source,
            },
            {
                data: "Amount",
                label: "Amount",
                valueFn: (r) => r.amount,
                formatFn: unsignedFormat(2),
            },
        ]);
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

    function clanMarriageAppealTooltipTable(clan: ClanDTO) {
        const otherClans = clan.settlement.clans.filter(
            (c) => c.uuid !== clan.uuid,
        );
        return new FilteredIterableTable(
            otherClans,
            (c) => c.name,
            (_) => true,
            [
                {
                    data: "Population",
                    label: "Population",
                    valueFn: (c) => c.population,
                    formatFn: unsignedFormat(0),
                },
                {
                    data: "Generosity",
                    label: "Generosity",
                    valueFn: (c) =>
                        getMarriageInterestItemValue(
                            clan.world,
                            c,
                            clan,
                            "Generosity",
                        ),
                    formatFn: (v: number) => signed(v, 1),
                },
                {
                    data: "Skills",
                    label: "Skills",
                    valueFn: (c) =>
                        getMarriageInterestItemValue(
                            clan.world,
                            c,
                            clan,
                            "Skills",
                        ),
                    formatFn: (v: number) => signed(v, 1),
                },
                {
                    data: "Stress",
                    label: "Stress",
                    valueFn: (c) =>
                        getMarriageInterestItemValue(
                            clan.world,
                            c,
                            clan,
                            "Stress",
                        ),
                    formatFn: (v: number) => signed(v, 1),
                },
                {
                    data: "Standard of Living",
                    label: "SoL",
                    valueFn: (c) =>
                        getMarriageInterestItemValue(
                            clan.world,
                            c,
                            clan,
                            "Standard of Living",
                        ),
                    formatFn: (v: number) => signed(v, 1),
                },
                {
                    data: "Random",
                    label: "Random",
                    valueFn: (c) =>
                        getMarriageInterestItemValue(
                            clan.world,
                            c,
                            clan,
                            "Random",
                        ),
                    formatFn: (v: number) => signed(v, 1),
                },
                {
                    data: "Previous",
                    label: "Prev",
                    valueFn: (c) =>
                        clan.world.marriageInterestToward(c, clan)
                            ?.previousValue ?? 0,
                    formatFn: (v: number) => signed(v, 1),
                },
                {
                    data: "Current Total",
                    label: "Total",
                    valueFn: (c) =>
                        clan.world.marriageInterestToward(c, clan)
                            ?.currentItemsTotal ?? 0,
                    formatFn: (v: number) => signed(v, 1),
                },
                {
                    data: "Interest",
                    label: "Interest",
                    valueFn: (c) =>
                        clan.world.marriageInterestToward(c, clan)?.value ?? 0,
                    formatFn: (v: number) => signed(v, 1),
                },
            ],
        );
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

{#snippet marriageAppealTooltip(cs: ClanLastTurnSnapshots)}
    <TableView2 table={clanMarriageAppealTooltipTable(cs.e)}></TableView2>
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
    <TableView2
        table={new IterableTable(
            Array.from(
                new Set([
                    ...(cs.e.lastPopulationChange?.brModifiers ?? []).map(
                        (m) => m.source,
                    ),
                    ...(cs.e.lastPopulationChange?.drModifiers ?? []).map(
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
                        cs.e.lastPopulationChange?.brModifiers.find(
                            (m) => m.source === source,
                        )?.value,
                    formatFn: (v: number | undefined) =>
                        v !== undefined ? spct(v, 0) : "-",
                },
                {
                    data: "DR",
                    label: "DR",
                    valueFn: (source) =>
                        cs.e.lastPopulationChange?.drModifiers.find(
                            (m) => m.source === source,
                        )?.value,
                    formatFn: (v: number | undefined) =>
                        v !== undefined ? spct(v, 0) : "-",
                },
            ],
        )}
    />
{/snippet}

{#snippet brModifierTooltip(cs: ClanLastTurnSnapshots)}
    <TableView2
        table={new IterableTable(
            cs.e.lastPopulationChange.brModifiers,
            (item) => item.source,
            [
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
            ],
        )}
    />
{/snippet}

{#snippet drModifierTooltip(cs: ClanLastTurnSnapshots)}
    <TableView2
        table={new IterableTable(
            cs.e.lastPopulationChange.drModifiers,
            (item) => item.source,
            [
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
            ],
        )}
    />
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

{#snippet foodTakenTooltip(cs: ClanLastTurnSnapshots)}
    {@const table = clanFoodTakenTooltipTable(cs.e)}
    {#if table && table.rows.length > 0}
        <TableView2 {table}></TableView2>
    {:else}
        <div style="padding: 4px;">No food aid taken</div>
    {/if}
{/snippet}

{#snippet foodGivenTooltip(cs: ClanLastTurnSnapshots)}
    {@const table = clanFoodGivenTooltipTable(cs.e)}
    {#if table && table.rows.length > 0}
        <TableView2 {table}></TableView2>
    {:else}
        <div style="padding: 4px;">No food aid given</div>
    {/if}
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
                        {@const mi = world.marriageInterestToward(clan, other)}
                        <li>
                            • With {other.name}: {count} marriage{count > 1
                                ? "s"
                                : ""} (Appeal: {mi ? signed(mi.value, 1) : "0"})
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
                        {@const mi = world.marriageInterestToward(clan, other)}
                        <li>
                            • With {other.name}: {pct(conn.relatedness)} related
                            (Appeal: {mi ? signed(mi.value, 1) : "0"})
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
                {#each csnaps as cs}
                    {@const rank = marriageAppealRankings.get(cs.c.uuid)}
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
                                colspan={1 + csnaps.length * 2}
                                style="height: 0.5em"
                            ></td></tr
                        >
                    {:else}
                        <tr class={row.class ?? ""}>
                            {#if row.isHeader}
                                <td colspan={1 + csnaps.length * 2}
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
</style>
