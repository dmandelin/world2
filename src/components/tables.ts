import type { ProductionItemDTO, SettlementDTO } from './dtos';
import type { AttitudeCalc, InferenceCalc } from '../model/people/attitude';
import type { ClanDTO } from './dtos';
import { Clan } from '../model/people/people';
import { pct, signed } from '../model/lib/format';
import { TradeGoods } from '../model/trade';
import { type Rites } from '../model/rites';

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
                    pct(citem.workerFraction),
                    citem.workers.toFixed(), 
                    citem.tfp.toFixed(2),
                    citem.amount.toFixed(),               
                );
            } else {
                row.push('', '', '', '');
            }
        }

        // Settlement totals
        row.push(
            pct(item.workerFraction),
            item.workers.toFixed(), 
            item.tfp.toFixed(2),
            item.amount.toFixed(),               
        );

        return row;
    });

    const header = [...[...settlement.clans].map(c => c.name), 'Total'];
    const subheader = ['Good', ...[...settlement.clans]
        .map(c => c.name)
        .flatMap(name => [name, 'L%', 'L', 'P', 'Y'])];

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