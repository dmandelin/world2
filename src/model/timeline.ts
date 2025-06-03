import { weightedAverage } from "./modelbasics";
import type { World } from "./world";
import type { Year } from "./year";

export class TimePoint {
    readonly year: Year;
    readonly totalPopulation: number;
    readonly averageQoL: number;
    readonly clans;
    
    constructor(world: World) {
        this.year = world.year.clone();
        this.totalPopulation = world.totalPopulation;
        this.averageQoL = weightedAverage(world.allClans, clan => clan.qol, clan => clan.size);
        this.clans = world.allClans.map(clan => ({
            name: clan.name,
            color: clan.color,
            size: clan.size,
            prestige: clan.averagePrestige,
        }));
    }
}

export function rankings(world: World): LineGraphData {
    const data: LineGraphData = {
        labels: [],
        datasets: [],
    }
    const datasetMap = new Map<string, Dataset>();

    for (const p of world.timeline) {
        data.labels.push(p.year.toString());
        for (const clan of p.clans) {
            let dataset = datasetMap.get(clan.name);
            if (!dataset) {
                dataset = { 
                    label: clan.name, 
                    data: data.labels.map(() => 0), 
                    color: clan.color,
                };
                datasetMap.set(clan.name, dataset);
                data.datasets.push(dataset);
            }
            dataset.data.push(clan.prestige);
        }
    }
    for (const dataset of data.datasets) {
        while (dataset.data.length < data.labels.length) dataset.data.push(0);
    }

    return data;
}

