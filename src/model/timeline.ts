import type { GraphData } from "../components/linegraph";
import type { ClanDTO } from "../components/dtos";
import { znan } from "./lib/basics";
import { weightedAverage } from "./lib/modelbasics";
import type { Clan } from "./people/people";
import type { World } from "./world";
import type { Year } from "./year";

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

export class ClanTimePoint {
    readonly population: number;
    readonly qol: number;
    readonly averagePrestige: number;

    constructor(clan: Clan) {
        this.population = clan.population;
        this.qol = clan.qol;
        this.averagePrestige = clan.averagePrestige;
    }
}

export class TimePoint {
    readonly year: Year;
    readonly totalPopulation: number;
    readonly averageQoL: number;
    readonly averageSubsistenceSat: number;
    readonly averageRitualSat: number;
    readonly clans: Map<string, ClanTimePoint>;
    
    constructor(world: World) {
        this.year = world.year.clone();
        this.totalPopulation = world.totalPopulation;

        this.averageQoL = weightedAverage(
            world.allClans, clan => clan.qol, clan => clan.population);
        this.averageSubsistenceSat = znan(weightedAverage(
            world.allClans, 
            clan => clan.qolCalc.getSat('Subsistence'), 
            clan => clan.population));
        this.averageRitualSat = znan(weightedAverage(
             world.allClans, 
            clan => clan.qolCalc.getSat('Ritual'), 
            clan => clan.population));

        this.clans = new Map<string, ClanTimePoint>();
        for (const clan of world.allClans) {
            this.clans.set(clan.uuid, new ClanTimePoint(clan));
        }
    }
}

export function clanTimelineGraphData(clan: ClanDTO): GraphData {
    const graphData: GraphData = {
        title: 'Clan Timeline',
        labels: clan.world.timeline.map(timePoint => timePoint.year.toString()),
        datasets: [{
            label: 'Population',
            data: [],
            color: 'blue',
        }, {
            label: 'QoL',
            data: [],
            color: 'red',
        }, {
            label: 'Prestige',
            data: [],
            color: 'green',
        }],
    };

    for (const tp of clan.world.timeline.points) {
        const clanData = tp.clans.get(clan.uuid);
        if (clanData) {
            graphData.datasets[0].data.push(clanData.population);
            graphData.datasets[1].data.push(clanData.qol);
            graphData.datasets[2].data.push(clanData.averagePrestige);
        } else {
            for (const dataset of graphData.datasets) {
                dataset.data.push(undefined);
            }
        }
    }

    return graphData;
}