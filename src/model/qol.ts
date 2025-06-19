import { harmonicMean } from "./basics";
import { ces } from "./modelbasics";
import type { Clan } from "./people";
import type { Settlement } from "./settlement";

export class QoLCalc {
    readonly perCapitaGoods: [string, number][];

    constructor(readonly clan: Clan, overrideRitualQuality?: number) {
        this.perCapitaGoods = [
            ['Subsistence', clan.perCapitaSubsistenceConsumption],
            ['Ritual', overrideRitualQuality ?? clan.settlement!.clans.rites.quality],
        ];
    }

    get perCapitaOverall(): number {
        return ces(-5, ...this.perCapitaGoods.map(([_, value]) => value));
    }

    get items(): [string, number][] {
        return [
            ['Goods', qolFromPerCapitaGoods(this.perCapitaOverall)],
            ['Status', statusValue(this.clan)],
            ['Crowding', crowdingValue(this.clan)],
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

function statusValue(clan: Clan): number {
    return clan.averagePrestige - clan.settlement!.clans.reduce((acc, c) => 
        acc + c.averagePrestige, 0) / clan.settlement!.clans.length;
}

export function crowdingValue(clan: Clan, overrideSettlement?: Settlement): number {
    let population;
    if (overrideSettlement) {
        population = overrideSettlement.size + clan.size;
    } else {
        population = clan.settlement!.size;
    }

    const r = population / 300;
    const b = Math.pow(r, 1/6);
    const d = Math.pow(r, 0.5);
    return Math.min(0, (b - d) * 100);
}

function qolFromPerCapitaGoods(perCapitaGoods: number): number {
    if (perCapitaGoods <= 0) {
        return -100;
    }
    return Math.max(-100, Math.log2(perCapitaGoods) * 50);
}