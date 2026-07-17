import type { ClanDTO, SettlementDTO } from '../model/records/dtos';
import { pct, spct } from '../model/lib/format';
import { sumFun } from '../model/lib/basics';
import type { PopulationChangeItem, PopulationChangeModifier } from '../model/people/population';

export type AverageAttitudeTable = {
    header: string[];
    rows: string[][];
}

export class HappinessTable {
    readonly header: string[];
    readonly subheader: string[];
    readonly rows: string[][];

    constructor(readonly s: SettlementDTO,
    ) {
        const digits = 0;
        this.header = ['Source', 'Average', ...s.clans.map(c => c.name)];
        const subheaderGroup = ['E', 'A', 'V'];
        this.subheader = ['', ...s.clans.flatMap(c => subheaderGroup), ...subheaderGroup];
        this.rows = [];
        const totalNumbers: number[] = [];
        if (s.clans.length > 0) {
            for (const label of s.clans[0].happiness.items.keys()) {
                let clanNumbers: number[] = [];
                let [ae, aa, av] = [0, 0, 0];  // Averages
                for (const clan of s.clans) {
                    const w = clan.population / s.population;
                    const i = clan.happiness.items.get(label);
                    if (!i) continue;

                    const e = i.expectedAppeal;
                    const a = i.appeal;
                    const v = i.value;

                    ae += e * w;
                    aa += a * w;
                    av += v * w;

                    clanNumbers.push(e, a, v);
                }
                const rowNumbers = [ae, aa, av, ...clanNumbers];
                this.rows.push([label, ...rowNumbers.map(n => n.toFixed(digits))]);
                for (let i = 0; i < rowNumbers.length; i++) {
                    totalNumbers[i] = (totalNumbers[i] ?? 0) + rowNumbers[i];
                }
            }
            const row = ['Total', ...totalNumbers.map(n => n.toFixed(digits))];
            this.rows.push(row);
        }
    }
}



class PopulationChangeTableItem {
    constructor(
        readonly name: string,
        readonly previousPopulation: number,
        public standardRate: number,
        public expectedRate: number,
        public actualRate: number,
        public actual: number,
    ) { }

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

export type PopulationChangeModifierTable = {
    header: string[];
    rows: string[][];
}

class PopulationChangeModifierTableItem {
    constructor(
        readonly source: string,
        public inputValue: number | string,
        public value: number,
    ) { }
}

export function populationChangeModifierTable(
    settlement: SettlementDTO,
    modifiersFun: (clan: ClanDTO) => PopulationChangeModifier[],
    modifierFun: (clan: ClanDTO) => number): PopulationChangeModifierTable {
    const items: Map<string, PopulationChangeModifierTableItem> = new Map();
    for (const clan of settlement.clans) {
        for (const mod of modifiersFun(clan)) {
            const existingItem = items.get(mod.source);
            if (existingItem) {
                existingItem.value += mod.value * clan.population / settlement.population;
                if (typeof mod.inputValue === 'string' || typeof existingItem.inputValue === 'string') {
                    existingItem.inputValue = '';
                } else {
                    existingItem.inputValue += mod.inputValue * clan.population / settlement.population;
                }
            } else {
                items.set(mod.source,
                    new PopulationChangeModifierTableItem(
                        mod.source,
                        typeof mod.inputValue === 'string'
                            ? ''
                            : mod.inputValue * clan.population / settlement.population,
                        mod.value * clan.population / settlement.population));
            }
        }
        const totalMod = modifierFun(clan);
        const existingTotal = items.get('Total');
        if (existingTotal) {
            existingTotal.value += totalMod * clan.population / settlement.population;
        } else {
            items.set('Total',
                new PopulationChangeModifierTableItem(
                    'Total', '', totalMod * clan.population / settlement.population));
        }
    }
    const header = ['Source', '', 'Modifier'];
    const rows = [...items.values()].map(mod => {
        let ref = '';
        if (typeof mod.inputValue === 'number') {
            switch (mod.source) {
                case 'Food Quantity':
                    ref = pct(mod.inputValue);
                    break;
                case 'Food Quality':
                    ref = `${pct(1 - mod.inputValue)} cereals`;
                    break;
                case 'Migration':
                    ref = mod.inputValue.toFixed();
                    break;
            }
        }
        return [
            mod.source,
            ref,
            spct(mod.value, 1)];
    });
    return { header, rows };
}

export function combinedPopulationChangeModifierTable(settlement: SettlementDTO):
    PopulationChangeModifierTable {

    const brTable = populationChangeModifierTable(
        settlement,
        c => c.lastPopulationChange.brModifiers,
        c => c.lastPopulationChange.brModifier);
    const drTable = populationChangeModifierTable(
        settlement,
        c => c.lastPopulationChange.drModifiers,
        c => c.lastPopulationChange.drModifier);

    const drMap = new Map(drTable.rows.map(r => [r[0], r[r.length - 1]]));
    const header = ['Source', '', 'BR', 'DR'];
    const rows = [];
    for (const [i, row] of brTable.rows.entries()) {
        rows.push([...row, drMap.get(row[0]) || '']);
        drMap.delete(row[0]);
    }
    for (const [source, value] of drMap.entries()) {
        rows.push([source, '', '', ...value]);
    }
    return { header, rows };
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

export type BasicTable = {
    header: string[];
    rows: string[][];
}