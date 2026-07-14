import { PopulationScaler, ZeroCenteredScaler, DefaultScaler, type YAxisScaler, type GraphData } from "../../components/linegraph";
import type { ClanDTO } from "./dtos";
import { getLocalPrestige } from "../relations/respect";
import { znan, safeDiv } from "../lib/basics";
import { weightedAverage, populationAverage, populationStdDev } from "../lib/modelbasics";
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

import { SkillDefs } from "../econ/econdefs";

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
    readonly stress: number;
    readonly residenceFraction: number;
    readonly marriageAppealAverage: number;
    readonly marriageAppealStdDev: number;
    readonly food: number;
    readonly targetFood: number;
    readonly foodStorage: number;
    readonly foodSecurity: number;
    readonly averagePrestige: number;
    readonly happiness: number;

    readonly skillLocalEcology: number;
    readonly skillFishing: number;
    readonly skillAgriculture: number;
    readonly skillIrrigation: number;
    readonly skillConstruction: number;
    readonly skillRitual: number;

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
        this.stress = clan.stress.value;
        this.residenceFraction = clan.residenceLevel.fractionInSettlement;
        
        const otherClans = clan.settlement.clans.filter(c => c.uuid !== clan.uuid);
        if (otherClans.length === 0) {
            this.marriageAppealAverage = 0;
            this.marriageAppealStdDev = 0;
        } else {
            this.marriageAppealAverage = populationAverage(
                otherClans,
                c => clan.world.perceptions.get(c.uuid, clan.uuid)?.marriageInterest?.value ?? 0
            );
            this.marriageAppealStdDev = populationStdDev(
                otherClans,
                c => clan.world.perceptions.get(c.uuid, clan.uuid)?.marriageInterest?.value ?? 0,
                this.marriageAppealAverage
            );
        }

        this.food = clan.consumption.perCapitaFood;
        this.targetFood = clan.targetPerCapitaFood;
        this.foodStorage = clan.consumption.perCapitaFoodStock;
        this.foodSecurity = 1 - clan.consumption.foodInsecurity.value;
        this.averagePrestige = getLocalPrestige(clan);
        this.happiness = clan.happinessValue;

        this.skillLocalEcology = clan.skills.v(SkillDefs.LocalEcology);
        this.skillFishing = clan.skills.v(SkillDefs.Fishing);
        this.skillAgriculture = clan.skills.v(SkillDefs.Agriculture);
        this.skillIrrigation = clan.skills.v(SkillDefs.Irrigation);
        this.skillConstruction = clan.skills.v(SkillDefs.Construction);
        this.skillRitual = clan.skills.v(SkillDefs.Ritual);
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