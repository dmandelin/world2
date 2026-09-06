import { PopulationScaler, ZeroCenteredScaler, DefaultScaler, type YAxisScaler, type GraphData } from "../../components/linegraph";
import type { ClanDTO, SettlementDTO } from "./dtos";
import { getLocalPrestige, getPrestige } from "../relations/prestige";
import { znan, safeDiv } from "../lib/basics";
import { weightedAverage, populationAverage } from "../lib/modelbasics";
import type { Clan } from "../people/people";
import type { World } from "../world";
import type { Year } from "./year";
import type { Settlement } from "../people/settlement";

export class Timeline<T> {
    private readonly years_: Year[] = [];
    private readonly points_: T[] = [];
    private readonly uuidToNameMap_: Map<string, string> = new Map();

    get years(): readonly Year[] {
        return this.years_;
    }

    get points(): readonly T[] {
        return this.points_;
    }

    register(uuid: string, name: string): void {
        this.uuidToNameMap_.set(uuid, name);
    }

    add(year: Year, point: T) {
        this.years_.push(year);
        this.points_.push(point);
    }

    map(fn: (point: T, year: Year) => any): any[] {
        return this.points_.map((point, i) => fn(point, this.years_[i]));
    }
}

import { SkillDefs, Processes } from "../econ/econdefs";
import { Activities } from "../decisions/effort";
import { MarriageConnection } from "../relations/connection";
import { getHelpReceivedValueFromMutualAid, getHelpProductivityModifier, clanHelpDemand } from "../relations/mutualaid";

export class ClanTimePoint {
    readonly population: number;
    readonly workers: number;
    readonly supportRatio: number;
    readonly brModifier: number;
    readonly drModifier: number;
    readonly appeal: number;
    readonly socialAppeal: number;
    readonly subsistenceAppeal: number;
    readonly qol: number;
    readonly eudaimonia: number;
    readonly eudaimoniaLife: number;
    readonly fortune: number;
    readonly eudaimoniaFood: number;
    readonly eudaimoniaDelta: number;
    readonly stress: number;
    readonly residenceFraction: number;
    readonly respectAverage: number;
    readonly holinessAverage: number;
    readonly favorAverage: number;
    readonly avgWeddingAppeal: number;
    readonly avgPartnerAppeal: number;
    readonly foodProduced: number;
    readonly foodTransferred: number;
    readonly food: number;
    readonly foodStorage: number;
    readonly averagePrestige: number;
    readonly happiness: number;
    readonly mutualAidSat: number;
    readonly helpModifier: number;

    readonly skillLocalEcology: number;
    readonly skillFishing: number;
    readonly skillAgriculture: number;
    readonly skillIrrigation: number;
    readonly skillConstruction: number;
    readonly skillRitual: number;
    readonly skillCraft: number;
    readonly skillCare: number;

    readonly traitPiety: number;
    readonly traitIntellect: number;
    readonly traitGiving: number;
    readonly traitAggression: number;

    readonly activityLeisure: number;
    readonly activityCare: number;
    readonly activityHelp: number;
    readonly activityProduction: number;
    readonly processFishing: number;
    readonly processAgriculture: number;

    constructor(clan: Clan) {
        this.population = clan.population;
        this.workers = clan.workers;
        this.supportRatio = safeDiv(clan.population, clan.workers);
        this.brModifier = clan.lastPopulationChange?.brModifier ?? 0;
        this.drModifier = clan.lastPopulationChange?.drModifier ?? 0;
        this.appeal = clan.appeal;
        this.socialAppeal = clan.happiness.socialAppeal;
        this.subsistenceAppeal = clan.happiness.subsistenceAppeal;
        this.qol = clan.qol.value;
        this.eudaimonia = clan.eudaimonia.value;
        this.eudaimoniaLife = clan.eudaimonia.life;
        this.fortune = clan.eudaimonia.fortune;
        this.eudaimoniaFood = clan.eudaimonia.food;
        this.eudaimoniaDelta = clan.eudaimonia.delta;
        this.stress = clan.stress.value;
        this.residenceFraction = clan.residenceLevel.fractionInSettlement;
        
        const otherClans = clan.settlement.clans.filter(c => c.uuid !== clan.uuid);
        if (otherClans.length === 0) {
            this.respectAverage = 0;
            this.holinessAverage = 0;
            this.favorAverage = 0;
        } else {
            this.respectAverage = populationAverage(
                otherClans,
                c => clan.world.perceptions.get(c.uuid, clan.uuid)?.respect?.value ?? 0
            );
            this.holinessAverage = populationAverage(
                otherClans,
                c => clan.world.perceptions.get(c.uuid, clan.uuid)?.holiness?.value ?? 0
            );
            this.favorAverage = 100 * populationAverage(
                otherClans,
                c => clan.world.perceptions.get(c.uuid, clan.uuid)?.alignment?.value ?? 0
            );
        }

        const world = clan.world;
        const decisions = world.lastMarriageDecisions;
        if (decisions) {
            let weightedSum = 0;
            let totalMarriages = 0;
            for (const other of world.allClans) {
                if (other.uuid === clan.uuid) continue;
                let count = 0;
                for (const [hClan, map] of decisions.pairingCounts.counts.entries()) {
                    if (hClan.uuid === clan.uuid) {
                        for (const [wClan, cnt] of map.entries()) {
                            if (wClan.uuid === other.uuid) {
                                count = cnt;
                                break;
                            }
                        }
                    }
                }
                if (count > 0) {
                    const appeal = getPrestige(clan, other);
                    weightedSum += count * appeal;
                    totalMarriages += count;
                }
            }
            this.avgWeddingAppeal = totalMarriages > 0 ? weightedSum / totalMarriages : 0;
        } else {
            this.avgWeddingAppeal = 0;
        }

        let partnerWeightedSum = 0;
        let partnerTotalWeight = 0;
        for (const other of world.allClans) {
            if (other.uuid === clan.uuid) continue;
            const conn = world.connections.getForType(clan, other, MarriageConnection);
            if (conn && conn.relatedness > 0) {
                const appeal = getPrestige(clan, other);
                partnerWeightedSum += conn.relatedness * appeal;
                partnerTotalWeight += conn.relatedness;
            }
        }
        this.avgPartnerAppeal = partnerTotalWeight > 0 ? partnerWeightedSum / partnerTotalWeight : 0;

        this.foodProduced = clan.distribution ? clan.distribution.totalFoodFromProduction / (clan.population || 1) : 0;
        const foodTaken = clan.consumption ? clan.consumption.totalFoodTaken : 0;
        const foodGiven = (clan.distribution?.totalFoodGiven ?? 0) + (clan.stockOutflow?.totalFoodGiven ?? 0);
        this.foodTransferred = (foodTaken - foodGiven) / (clan.population || 1);
        this.food = clan.consumption.perCapitaFood;
        this.foodStorage = clan.stock ? clan.stock.perCapitaFoodStock(clan.population) : 0;
        this.averagePrestige = 100 * getLocalPrestige(clan);
        this.happiness = clan.happinessValue;
        
        const helpValue = getHelpReceivedValueFromMutualAid(world, clan);
        const demand = clanHelpDemand(clan.population);
        this.mutualAidSat = demand > 0 ? helpValue / demand : 0;
        this.helpModifier = getHelpProductivityModifier(helpValue, demand);

        this.skillLocalEcology = clan.skills.v(SkillDefs.LocalEcology);
        this.skillFishing = clan.skills.v(SkillDefs.Fishing);
        this.skillAgriculture = clan.skills.v(SkillDefs.Agriculture);
        this.skillIrrigation = clan.skills.v(SkillDefs.Irrigation);
        this.skillConstruction = clan.skills.v(SkillDefs.Construction);
        this.skillRitual = clan.skills.v(SkillDefs.Ritual);
        this.skillCraft = clan.skills.v(SkillDefs.Craft);
        this.skillCare = clan.skills.v(SkillDefs.Care);

        this.traitPiety = clan.traits?.piety ?? 50;
        this.traitIntellect = clan.traits?.intellect ?? 50;
        this.traitGiving = clan.traits?.giving ?? 0;
        this.traitAggression = clan.traits?.aggression ?? 0.2;

        this.activityLeisure = clan.effortAllocation.get(Activities.Leisure) * 100;
        this.activityCare = clan.effortAllocation.get(Activities.Care) * 100;
        this.activityHelp = clan.effortAllocation.get(Activities.Help) * 100;
        this.activityProduction = clan.effortAllocation.get(Activities.Production) * 100;
        this.processFishing = clan.effortAllocation.getForProcess(Processes.Fishing) * 100;
        this.processAgriculture = clan.effortAllocation.getForProcess(Processes.Agriculture) * 100;
    }
}

export class SettlementTimePoint {
    readonly year: Year;
    readonly population: number;
    readonly diseaseLoad: number;

    constructor(settlement: Settlement) {
        this.year = settlement.world.year.clone();
        this.population = settlement.population;
        this.diseaseLoad = settlement.cluster.diseaseLoad.value;
    }
}

export class TimePoint {
    readonly year: Year;
    readonly totalPopulation: number;
    readonly averageAppeal: number;
    readonly averageSubsistenceSat: number;
    readonly averageHappiness: number;
    readonly clans: Map<string, ClanTimePoint>;
    
    constructor(world: World) {
        this.year = world.year.clone();
        this.totalPopulation = world.totalPopulation;

        this.averageAppeal = weightedAverage(
            world.allClans, clan => clan.appeal, clan => clan.population);
        this.averageSubsistenceSat = znan(weightedAverage(
            world.allClans, 
            clan => clan.happiness.subsistenceAppeal,
            clan => clan.population));
        this.averageHappiness = znan(weightedAverage(
             world.allClans, 
            clan => clan.happinessValue,
            clan => clan.population));

        this.clans = new Map<string, ClanTimePoint>();
        for (const clan of world.allClans) {
            this.clans.set(clan.uuid, new ClanTimePoint(clan));
        }
    }
}


export function clanKeyTimelineGraphData(
    clan: ClanDTO,
    key: keyof ClanTimePoint,
    title: string,
    scaler: YAxisScaler
): GraphData {
    const graphData: GraphData = {
        title: title,
        showLegend: false,
        labels: clan.world.timeline.map((timePoint: TimePoint) => timePoint.year.toString()),
        yAxisScaler: scaler,
        datasets: [{
            label: title,
            data: [],
            color: 'blue',
        }],
    };

    for (const tp of clan.world.timeline.points) {
        const clanData = tp.clans.get(clan.uuid);
        if (clanData) {
            const val = clanData[key];
            graphData.datasets[0].data.push(typeof val === 'number' ? val : undefined);
        } else {
            graphData.datasets[0].data.push(undefined);
        }
    }

    return graphData;
}
// One clan statistic over time: a line per clan of a settlement, plus one for
// the settlement as a whole, which is the population-weighted average of
// whichever of its clans were alive that year.
//
// Membership is read from the settlement as it stands now, so a clan that
// moved in later is still drawn back through the years it spent elsewhere.
// Over the spans this covers that is usually the clan you want to follow, but
// the settlement line is not a record of who actually lived here.
export function settlementClanGraphData(
    settlement: SettlementDTO,
    key: keyof ClanTimePoint,
    scaler: YAxisScaler,
): GraphData {
    const clans = settlement.clans.filter(c => c.population > 0);
    const world = clans[0]?.world;
    if (!world) {
        return { labels: [], yAxisScaler: scaler, datasets: [] };
    }

    const points = world.timeline.points;
    const labels = world.timeline.map((tp: TimePoint) => tp.year.toString());

    // The settlement first, so it reads as the headline and the clans as the
    // spread around it.
    const settlementData = points.map((tp: TimePoint) => {
        let sum = 0;
        let weight = 0;
        for (const clan of clans) {
            const p = tp.clans.get(clan.uuid);
            if (!p || !(p.population > 0)) continue;
            const v = p[key];
            if (typeof v !== 'number' || !Number.isFinite(v)) continue;
            sum += v * p.population;
            weight += p.population;
        }
        return weight > 0 ? sum / weight : undefined;
    });

    const datasets = [
        { label: settlement.name, color: '#1f2328', data: settlementData },
        ...clans.map(clan => ({
            label: clan.name,
            color: clan.color,
            data: points.map((tp: TimePoint) => {
                const v = tp.clans.get(clan.uuid)?.[key];
                return typeof v === 'number' ? v : undefined;
            }),
        })),
    ];

    // No title: the panel already names it, and a second heading inside the
    // plot only eats vertical room.
    return {
        showLegend: true,
        labels,
        yAxisScaler: scaler,
        datasets,
    };
}
