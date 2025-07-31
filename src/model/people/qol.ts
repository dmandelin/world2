import { clamp, sumFun } from "../lib/basics";
import { ces, createTwoSidedQuadratic } from "../lib/modelbasics";
import { signed } from "../lib/format";
import { TradeGoods } from "../trade";
import type { Clan } from "./people";
import type { Settlement } from "./settlement";
import type { Housing } from "../econ/housing";

export class SatisfactionItem {
    constructor(
        readonly name: string,
        readonly perCapita: number,
    ) {}
}

export class QolItem {
    constructor(
        readonly name: string,
        readonly value: number,
        readonly indent: number = 0,
        readonly satisfactionItems?: SatisfactionItem[],
    ) {}
}

export class QolCalc {
    readonly subsistenceItems: SatisfactionItem[];
    readonly subsistenceSatisfaction: number;

    readonly ritualAppeal: number;

    readonly satisfactionItems: SatisfactionItem[];
    readonly satisfaction: number;

    readonly items: QolItem[];
    readonly value: number;

    constructor(readonly clan: Clan, overrideRitualAppeal?: number) {
        this.subsistenceItems = [TradeGoods.Cereals, TradeGoods.Fish]
            .map(good => new SatisfactionItem(good.name, clan.consumption.perCapita(good)));
        this.subsistenceSatisfaction = sumFun(this.subsistenceItems, item => item.perCapita);

        this.ritualAppeal = overrideRitualAppeal ?? clan.settlement.clans.rites.appeal;

        this.satisfactionItems = [
            new SatisfactionItem('Subsistence', this.subsistenceSatisfaction),
        ];
        this.satisfaction = ces(this.satisfactionItems.map(item => item.perCapita), {rho: -5});

        this.items = [
            new QolItem('Clan rituals', clan.rites.appeal, 0),
            new QolItem('Village rituals', this.ritualAppeal, 0),
            new QolItem('Goods', qolFromPerCapitaGoods(this.satisfaction), 0, this.satisfactionItems),
            new QolItem('Food variety', foodVarietyQolModifier(clan), 1),
            new QolItem('Housing', clan.housing.qol, 0),
            new QolItem('Moves', housingFloodingValue(clan), 1),
            new QolItem('Flooding', clan.settlement.floodLevel.qolModifier
                * (1 - clan.settlement.ditchQuality), 0),
            new QolItem('Status', statusValue(clan), 0),
            new QolItem('Labor', laborValue(clan), 0),
            new QolItem('Crowding', crowdingValue(clan), 0),
            new QolItem('Inspiration', 25 - clamp(clan.world.year.yearsSince() / 20, 0, 25), 0),
        ];

        this.value = sumFun(this.items, i => i.value);
    }

    getSat(name: string): number {
        return this.satisfactionItems.find(si => si.name === name)?.perCapita ?? 0;
    }

    get subsistenceTable(): string[][] {
        const header = ['Food', 'Amt'];
        const rows = this.subsistenceItems.map(item => {
            return [item.name, item.perCapita.toFixed(2)];
        });
        return [header, ...rows];
    }

    get satsTable(): string[][] {
        const header = ['Need', 'Amt', 'QoL'];
        const rows = this.satisfactionItems.map(si => {
            return [si.name, si.perCapita.toFixed(2), signed(qolFromPerCapitaGoods(si.perCapita), 1)];
        });
        const totalRow = [
            'Overall', 
            this.satisfaction.toFixed(2),
            this.value.toFixed(1),
        ];
        return [header, ...rows, totalRow];
    }

    get itemsTable(): string[][] {
        const header = ['Item', 'QoL'];
        //const rows = this.items.map(([name, value]) => [name, value.toFixed(1)]);
        const rows: string[][] = [];
        return [header, ...rows];
    }
}

export function housingFloodingValue(clan: Clan, overrideHousing?: Housing): number {
    const housing = overrideHousing ?? clan.housing;

    return clan.settlement.floodLevel.baseExpectedForcedMigrations 
        * housing.forcedMigrationCost
        * (1 - clan.settlement.ditchQuality);
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

const foodVarietyFun = createTwoSidedQuadratic(0, -10, 0.5, 0, 1, -5);

export function foodVarietyQolModifier(clan: Clan): number {
    const cereals = clan.consumption.perCapita(TradeGoods.Cereals);
    const fish = clan.consumption.perCapita(TradeGoods.Fish);
    const fishRatio = fish / (cereals + fish);
    return foodVarietyFun(fishRatio);
}


// Doubling per-capita goods increases QoL by 50 points.
// One point of QoL is equivalent to 1.14% per-capita goods.
export function qolFromPerCapitaGoods(perCapitaGoods: number): number {
    if (perCapitaGoods <= 0) {
        return -100;
    }
    return Math.max(-100, Math.log2(perCapitaGoods) * 50);
}