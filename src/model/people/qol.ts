import { harmonicMean } from "../lib/basics";
import { ces } from "../lib/modelbasics";
import type { Clan } from "./people";
import type { Settlement } from "./settlement";

export class QoLCalc {
    readonly perCapitaGoods: [string, number][];

    constructor(readonly clan: Clan, overrideRitualAppealAsTFP?: number) {
        this.perCapitaGoods = [
            ['Subsistence', clan.perCapitaSubsistenceConsumption],
            ['Ritual', overrideRitualAppealAsTFP ?? clan.settlement!.clans.rites.appealAsTFP],
        ];
    }

    get perCapitaOverall(): number {
        return ces(this.perCapitaGoods.map(([_, value]) => value), {rho: -5});
    }

    get items(): [string, number][] {
        return [
            ['Goods', qolFromPerCapitaGoods(this.perCapitaOverall)],
            ['Housing', housingValue(this.clan)],
            ['Status', statusValue(this.clan)],
            ['Labor', laborValue(this.clan)],
            ['Crowding', crowdingValue(this.clan)],
            ['Flooding', floodingValue(this.clan)],
        ];
    }

    get value(): number {
        return this.items.reduce((acc, [_, v]) => acc + v, 0);
    }

    getSat(name: 'Subsistence' | 'Ritual'): number {
        const value = this.perCapitaGoods.find(([n, _]) => n === name)?.[1] ?? 0;
        return qolFromPerCapitaGoods(value);
    }

    get satsTable(): string[][] {
        const header = ['Need', 'Per Capita', 'Satisfaction'];
        const rows = this.perCapitaGoods.map(([name, value]) => {
            return [name, value.toFixed(2), qolFromPerCapitaGoods(value).toFixed(1)];
        });
        const totalRow = [
            'Overall', 
            this.perCapitaOverall.toFixed(2),
            this.value.toFixed(1),
        ];
        return [header, ...rows, totalRow];
    }

    get itemsTable(): string[][] {
        const header = ['Item', 'Value'];
        const rows = this.items.map(([name, value]) => [name, value.toFixed(1)]);
        return [header, ...rows];
    }
}

function housingValue(clan: Clan): number {
    return clan.housing.qol;
}

function statusValue(clan: Clan): number {
    return clan.averagePrestige - clan.settlement!.clans.reduce((acc, c) => 
        acc + c.averagePrestige, 0) / clan.settlement!.clans.length;
}

function laborValue(clan: Clan): number {
    return clan.isDitching ? -2 : 0;
}

export function crowdingValue(clan: Clan, overrideSettlement?: Settlement): number {
    let population;
    if (overrideSettlement && overrideSettlement !== clan.settlement) {
        population = overrideSettlement.population + clan.population;
    } else {
        population = clan.settlement!.population;
    }

    const r = population / 300;
    const b = Math.pow(r, 1/6);
    const d = Math.pow(r, 0.5);
    return Math.min(0, (b - d) * 100);
}

export function floodingValue(clan: Clan): number {
    const floodingLevel = clan.settlement!.floodingLevel;
    const ditchingLevel = clan.settlement!.ditchingLevel;

    const controlledFlooding = Math.min(floodingLevel, ditchingLevel);
    const uncontrolledFlooding = floodingLevel - controlledFlooding;

    // Uncontrolled flooding is full cost. Controlled flooding has cost
    // scaled by ditch quality.
    const baseFloodingCost = clan.housing.baseFloodingCost;
    const controlledFloodingCost = baseFloodingCost * controlledFlooding * (1 - clan.settlement!.ditchQuality);
    const uncontrolledFloodingCost = baseFloodingCost * uncontrolledFlooding;
    return controlledFloodingCost + uncontrolledFloodingCost;
}

// Doubling per-capita goods increases QoL by 50 points.
// One point of QoL is equivalent to 1.14% per-capita goods.
function qolFromPerCapitaGoods(perCapitaGoods: number): number {
    if (perCapitaGoods <= 0) {
        return -100;
    }
    return Math.max(-100, Math.log2(perCapitaGoods) * 50);
}