import type { ProductionItemDTO, SettlementDTO } from './dtos';
import type { AttitudeCalc, InferenceCalc } from '../model/people/attitude';
import type { ClanDTO } from './dtos';
import { Clan } from '../model/people/people';
import { pct, signed, spct } from '../model/lib/format';
import { TradeGoods } from '../model/trade';
import { type Rites } from '../model/rites';
import type { ClanSkillChange } from '../model/people/skillchange';
import { harmonicMean, sortedByKey, sumFun, weightedHarmonicMean } from '../model/lib/basics';
import type { HappinessItem } from '../model/people/happiness';
import type { PopulationChangeItem, PopulationChangeModifier } from '../model/people/population';

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
        const rowSuffix = [];
        for (const clan of settlement.clans) {
            const citem: ProductionItemDTO|undefined = clan.production.goods.find(g => g.good === item.good);
            if (citem) {
                rowSuffix.push(
                    citem.land === Infinity ? '' : citem.land.toFixed(2),
                    pct(citem.workerFraction),
                    citem.workers.toFixed(2), 
                    citem.laborProductivity !== undefined ? citem.laborProductivity.toFixed(2) : '',
                    citem.tfp !== undefined ? citem.tfp.toFixed(2) : '',
                    citem.amount !== undefined ? citem.amount.toFixed(2) : '',               
                );
            } else {
                rowSuffix.push('', '', '', '', '', '');
            }
        }

        // Settlement totals
        row.push(
            item.land === Infinity ? '' : item.land.toFixed(),
            pct(item.workerFraction),
            item.workers.toFixed(), 
            item.laborProductivity !== undefined ? item.laborProductivity.toFixed(2) : '',
            item.tfp !== undefined ? item.tfp.toFixed(2) : '',
            item.amount !== undefined ? item.amount.toFixed() : '',               
        );

        return [...row, ...rowSuffix];
    });

    const header = ['Total', ...[...settlement.clans].map(c => c.name)];
    const subheader = ['Good', ...[...settlement.clans]
        .map(c => c.name)
        .flatMap(name => [name, 'K', 'L%', 'L', 'P', 'Y'])];

    return { header, subheader, rows}
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
                    const i = clan.happiness.items.get(label)!;

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
    
export function appealTable(items: readonly HappinessItem<any>[]): string[][] {
    const header = ['Source', 'A'];
    const rows = items.map(item => [
        item.label,
        item.appeal.toFixed(1),
    ]);
    return [header, ...rows];
}

export function happinessTable(items: readonly HappinessItem<any>[]): string[][] {
    const header = ['Source', 'E', 'A', 'V'];
    const rows = items.map(item => [
        item.label,
        item.expectedAppeal.toFixed(1),
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

export type PopulationChangeModifierTable = {
    header: string[];
    rows: string[][];
}

class PopulationChangeModifierTableItem {
    constructor(
        readonly source: string,
        public inputValue: number|string,
        public value: number,
    ) {}
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

export function settlementEconomyTable(settlement: SettlementDTO): BasicTable {
    const header = ['Product', 'K', 'L', 'L%', 'LP', 'TFP', 'Y', 'C', 'C/'];
    const rows = [];
    let [totalLand, totalWorkers, totalWf, totalProduction, totalConsumption] = [0, 0, 0, 0, 0];
    const totalPopulation = sumFun(
        settlement.clans, c => c.consumption.population);
    for (const item of settlement.production.goods.values()) {
        if (item.workers === 0) continue;

        const consumption = sumFun(
            settlement.clans, c => c.consumption.amount(item.good));
        const perCapitaConsumption = totalPopulation > 0
            ? consumption / totalPopulation
            : 0;

        rows.push([
            item.good.name,
            item.land.toFixed(),
            item.workers.toFixed(),
            pct(item.workerFraction),
            item.laborProductivity?.toFixed(2) ?? '',
            item.tfp?.toFixed(2) ?? '',
            item.amount?.toFixed() ?? '',
            consumption.toFixed(),
            perCapitaConsumption.toFixed(2),
        ]);

        totalLand += item.land;
        totalWorkers += item.workers;
        totalWf += item.workerFraction;
        totalProduction += item.amount ?? 0;
        totalConsumption += consumption;
    }
    rows.push([
        'Total',
        totalLand.toFixed(),
        totalWorkers.toFixed(),
        pct(totalWf),
        '',
        '',
        totalProduction.toFixed(),
        totalConsumption.toFixed(),
        (totalPopulation > 0 ? (totalConsumption / totalPopulation).toFixed(2) : ''),
    ]);
    return { header, rows };
}

export function laborAllocationPlanTable(clan: ClanDTO): BasicTable {
    const header = [
        'Scenario',
        'A',
        'A#',
        'A*',
        'f%',
        'T',
        'C',
        'F',
        'PC',
        'PF',
    ];
    const rows = clan.laborAllocation.allocationPlan.scenarios.map(scenario => [
        scenario.label,
        scenario.appeal.toFixed(1),
        scenario.foodQuantityAppeal.toFixed(1),
        scenario.foodQualityAppeal.toFixed(1),
        pct(scenario.fishRatio),
        scenario.perCapitaSubsistence.toFixed(2),
        scenario.perCapitaCereals.toFixed(2),
        scenario.perCapitaFish.toFixed(2),
        scenario.cerealsTFP.toFixed(2),
        scenario.fishTFP.toFixed(2),
    ]);

    return { header, rows };
}
