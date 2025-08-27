import type { ProductionItemDTO, SettlementDTO } from './dtos';
import type { AttitudeCalc, InferenceCalc } from '../model/people/attitude';
import type { ClanDTO } from './dtos';
import { Clan } from '../model/people/people';
import { pct, signed } from '../model/lib/format';
import { TradeGoods } from '../model/trade';
import { type Rites } from '../model/rites';
import type { ClanSkillChange } from '../model/people/skillchange';
import { sortedByKey, sumFun } from '../model/lib/basics';
import type { HappinessCalcItem } from '../model/people/happiness';
import type PopulationChange from './PopulationChange.svelte';
import type { PopulationChangeItem } from '../model/people/population';

export type SettlementRitesTable = {
    header: string[];
    rows: string[][];
}

export function settlementRitesTable(settlement: SettlementDTO): SettlementRitesTable {
    const rites = [...[...settlement.clans].map(c => c.rites), settlement.rites];
    const rowMap = new Map<string, Map<Rites, number>>();
    for (const rite of rites) {
        for (const item of rite.items.values()) {
            const row = rowMap.get(item.name) ?? new Map<Rites, number>();
            row.set(rite, (row.get(rite) ?? 0) + item.value);
            rowMap.set(item.name, row);
        }
    }

    const header = [...[...settlement.clans].map(c => c.name), 'Village'];
    const rows = [...rowMap.entries()].map(([name, riteMap]) => {
        const row = [name];
        for (const value of riteMap.values()) {
            row.push(signed(value));
        }
        return row;
    });

    const totalRow = ['Total'];
    for (const rite of rites) {
        totalRow.push(signed(rite.appeal));
    }
    rows.push(totalRow);

    return { header, rows };
}

export type SettlementEconomyTable = {
    header: string[];
    subheader: string[];
    rows: string[][];
}

export function settlementProductionTable(settlement: SettlementDTO): SettlementEconomyTable {
    // Column group per clan with columns for good, labor allocation, labor amount, tfp, and yield
    // Row per good

    const rows = [...settlement.production.goods.values()].map((item) => { 
        const row = [item.good.name];

        // Clans
        for (const clan of settlement.clans) {
            const citem: ProductionItemDTO|undefined = clan.production.goods.find(g => g.good === item.good);
            if (citem) {
                row.push(
                    citem.land === Infinity ? '' : citem.land.toFixed(),
                    pct(citem.workerFraction),
                    citem.workers.toFixed(), 
                    citem.tfp !== undefined ? citem.tfp.toFixed(2) : '',
                    citem.amount !== undefined ? citem.amount.toFixed() : '',               
                );
            } else {
                row.push('', '', '', '', '');
            }
        }

        // Settlement totals
        row.push(
            item.land === Infinity ? '' : item.land.toFixed(),
            pct(item.workerFraction),
            item.workers.toFixed(), 
            item.tfp !== undefined ? item.tfp.toFixed(2) : '',
            item.amount !== undefined ? item.amount.toFixed() : '',               
        );

        return row;
    });

    const header = [...[...settlement.clans].map(c => c.name), 'Total'];
    const subheader = ['Good', ...[...settlement.clans]
        .map(c => c.name)
        .flatMap(name => [name, 'K', 'L%', 'L', 'P', 'Y'])];

    return { header, subheader, rows}
}

export function settlementConsumptionTable(settlement: SettlementDTO): SettlementEconomyTable {
    // Column group per clan with columns for amount and per capita
    // Row group per good with rows per source and total
    const rows: string[][] = [];
    for (const good of Object.values(TradeGoods)) {
        let nonzero = false;
        const sourceClanMap = new Map<string, Map<ClanDTO, number>>(); // source -> clan -> amount
        const totalMap = new Map<ClanDTO, number>(); // clan -> total amount
        for (const clan of settlement.clans) {
            const clanTotal = clan.consumption.amount(good);
            totalMap.set(clan, clanTotal);
            if (clanTotal > 0) nonzero = true;

            for (const [source, amount] of clan.consumption.sourceMap(good).entries()) {
                const clanMap = sourceClanMap.get(source) ?? new Map<ClanDTO, number>();
                clanMap.set(clan, (clanMap.get(clan) ?? 0) + amount);
                sourceClanMap.set(source, clanMap);
            }
        }
        if (!nonzero) continue;

        const row = [good.name];
        let settlementTotal = 0;
        let settlementPopulation = 0;
        for (const clan of settlement.clans) {
            const total = totalMap.get(clan)!;
            if (total === 0) {
                row.push('', '');
            } else {
                row.push(total.toFixed(), (total / clan.consumption.population).toFixed(2));
            }

            settlementTotal += total;
            settlementPopulation += clan.consumption.population;
        }
        rows.push([...row, settlementTotal.toFixed(), (settlementTotal / settlementPopulation).toFixed(2)]);

        const settlementSourceMap = new Map<string, number>();
        for (const [source, clanMap] of sourceClanMap.entries()) {
            const sourceRow = ['- ' + source];
            for (const clan of settlement.clans) {
                const amount = clanMap.get(clan) ?? 0;
                if (amount === 0) {
                    sourceRow.push('', '');
                } else {
                    sourceRow.push(amount.toFixed(), (amount / clan.consumption.population).toFixed(2));
                    settlementSourceMap.set(source,
                        (settlementSourceMap.get(source) ?? 0) + amount);
                }
            }
            rows.push([...sourceRow, 
                settlementSourceMap.get(source)?.toFixed() ?? '',
                ((settlementSourceMap.get(source) ?? 0) / settlementPopulation).toFixed(2)]);
        }
    }

    const header = [...[...settlement.clans].map(c => c.name), 'Total'];
    const subheader = ['Good', ...[...settlement.clans]
        .map(c => c.name)
        .flatMap(name => [name, 'Q', 'R'])];
    return { header, subheader, rows };
}

export type AverageAttitudeTable = {
    header: string[];
    rows: string[][];
}

export function averageAttitudeTable<AC extends AttitudeCalc<IC>, IC extends InferenceCalc> (
    settlement: SettlementDTO,
    attitudeCalcProvider: (clan: ClanDTO) => Iterable<[Clan, AC]>,
    includeTotals: boolean = true,
    precision: number = 2,
): AverageAttitudeTable {
    const rs = new Map<string, Map<string, number>>(); // calc item name -> clan name -> value
    for (const clan of settlement.clans) {
        for (const [other, attitudeCalc] of attitudeCalcProvider(clan)) {
            if (other === clan.ref) continue;
            for (const item of attitudeCalc.inference.items) {
                const part = item.value * clan.population / (settlement.population - other.population);
                const row = rs.get(item.name) ?? new Map<string, number>();
                row.set(other.name, (row.get(other.name) ?? 0) + part);
                rs.set(item.name, row);
            }
            if (includeTotals) {
                const totalPart = attitudeCalc.inference.value * clan.population / (settlement.population - other.population);
                const totalRow = rs.get('Total') ?? new Map<string, number>();
                totalRow.set(other.name, (totalRow.get(other.name) ?? 0) + totalPart);
                rs.set('Total', totalRow);
            }
        }
    }

    const header = ['Source', ...[...settlement.clans].map(c => c.name)]
    const rows = [...rs.entries()].map(([name, clanMap]) => {
        const row = [name];
        for (const clan of settlement.clans) {
            row.push(signed(clanMap.get(clan.name) ?? 0, precision));
        }
        return row;
    });

    return { header, rows };
}

export function skillImitationTable(sc: ClanSkillChange) {
    const header = ['Source', '𝕊', 'ℙ', '𝕎'];
    const rows = sortedByKey(sc.imitationTargetItems, i => -i.weight).map(item => [
        item.label, 
        item.trait.toFixed(),
        item.prestige.toFixed(),
        item.weight.toFixed(2),
    ]);
    return [header, ...rows];

}

export class HappinessTable {
    readonly header: string[];
    readonly subheader: string[];
    readonly rows: string[][];

    constructor(readonly s: SettlementDTO,
    ) {
        this.header = ['Source', ...s.clans.map(c => c.name), 'Average'];
        const subheaderGroup = ['E', 'A', 'V'];
        this.subheader = ['', ...s.clans.flatMap(c => subheaderGroup), ...subheaderGroup];
        const rows: string[][] = [];
        if (s.clans.length > 0) {
            for (let i = 0; i < s.clans[0].happiness.rows.length; i++) {
                const row = [s.clans[0].happiness.rows[i].label];
                let [totalExpectation, totalAppeal, totalValue] = [0, 0, 0];
                for (const clan of s.clans) {
                    row.push(clan.happiness.rows[i].expectation.toFixed(1));
                    row.push(clan.happiness.rows[i].appeal.toFixed(1));
                    row.push(clan.happiness.rows[i].value.toFixed(1));

                    totalExpectation += clan.happiness.rows[i].expectation * clan.population;
                    totalAppeal += clan.happiness.rows[i].appeal * clan.population;
                    totalValue += clan.happiness.rows[i].value * clan.population;
                }
                row.push((totalExpectation / s.population).toFixed(1));
                row.push((totalAppeal / s.population).toFixed(1));
                row.push((totalValue / s.population).toFixed(1));
                rows.push(row);
            }
        }
        this.rows = rows;
    }
}

export function appealTable(items: readonly HappinessCalcItem[]): string[][] {
    const header = ['Source', 'A'];
    const rows = items.map(item => [
        item.label,
        item.appeal.toFixed(1),
    ]);
    return [header, ...rows];
}


export function happinessTable(items: readonly HappinessCalcItem[]): string[][] {
    const header = ['Source', 'E', 'A', 'V'];
    const rows = items.map(item => [
        item.label,
        item.expectation.toFixed(1),
        item.appeal.toFixed(1),
        item.value.toFixed(1),
    ]);
    return [header, ...rows];
}

class PopulationChangeTableItem {
    constructor(
        readonly name: string,
        readonly previousPopulation: number,
        public standardRate: number,
        public expectedRate: number,
        public actualRate: number,
        public actual: number,
    ) {}

    add(other: PopulationChangeItem, previousPopulation: number): void {
        this.standardRate += other.standardRate * previousPopulation;
        this.expectedRate += other.expectedRate * previousPopulation;
        this.actualRate += other.actualRate * previousPopulation;
        this.actual += other.actual;
    }

    asRow(previousPopulation: number): string[] {
        return [
            this.name,
            (this.standardRate * 1000 / previousPopulation).toFixed(),
            (this.expectedRate * 1000 / previousPopulation).toFixed(),
            (this.actualRate * 1000 / previousPopulation).toFixed(),
            this.actual.toFixed(),
        ];
    }   
}

export type PopulationChangeTable = {
    births: number;
    deaths: number;
    header: string[];
    rows: string[][];
}

export function populationChangeTable(settlement: SettlementDTO): PopulationChangeTable {
    let previousPopulation = 0;
    let [births, deaths] = [0, 0];
    const items: Map<string, PopulationChangeTableItem> = new Map();
    for (const clan of settlement.clans) {
        previousPopulation += clan.lastPopulationChange.previousSize;
        births += clan.lastPopulationChange.births;
        deaths += clan.lastPopulationChange.deaths;
        for (const item of clan.lastPopulationChange.items) {
            const existingItem = items.get(item.name);
            if (existingItem) {
                existingItem.add(item, clan.lastPopulationChange.previousSize);
            } else {
                items.set(item.name, 
                    new PopulationChangeTableItem(
                        item.name, 
                        clan.lastPopulationChange.previousSize,
                        item.standardRate * clan.lastPopulationChange.previousSize, 
                        item.expectedRate * clan.lastPopulationChange.previousSize, 
                        item.actualRate * clan.lastPopulationChange.previousSize, 
                        item.actual));
            }
        }
    }

    const totalItem = new PopulationChangeTableItem(
        'Total',
        previousPopulation,
        sumFun([...items.values()], i => i.standardRate),
        sumFun([...items.values()], i => i.expectedRate),
        sumFun([...items.values()], i => i.actualRate),
        sumFun([...items.values()], i => i.actual),
    );
    items.set('Total', totalItem);

    const header = ['Source', 'S', 'E', 'A', 'Δ'];
    const rows = [...items.values()].map(item => item.asRow(previousPopulation));
    return { births, deaths, header, rows };
}