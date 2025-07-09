import { ProductionItemDTO, SettlementDTO } from './dtos';
import { pct } from '../model/lib/format';

export type SettlementProductionTable = {
    header: string[];
    subheader: string[];
    rows: string[][];
}

export function settlementProductionTable(settlement: SettlementDTO): SettlementProductionTable {
    // Column group per clan with columns for good, labor allocation, labor amount, tfp, and yield
    // Row per good

    const sp = settlement.production.goods;
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

export type AveragePrestigeTable = {
    header: string[];
    rows: string[][];
}

export function averagePrestigeTable(settlement: SettlementDTO): AveragePrestigeTable {
    const n = settlement.population;
    const rs = new Map<string, Map<string, number>>(); // calc item name -> clan name -> value
    for (const clan of settlement.clans) {
        for (const [other, prestigeCalc] of clan.prestige) {
            console.log(clan.prestige);
            for (const item of prestigeCalc.inference.items) {
                const part = item.value * clan.population / n;
                const row = rs.get(item.name) ?? new Map<string, number>();
                row.set(other.name, (row.get(other.name) ?? 0) + part);
                rs.set(item.name, row);
            }
            const totalPart = prestigeCalc.inference.value * clan.population / n;
            const totalRow = rs.get('Total') ?? new Map<string, number>();
            totalRow.set(other.name, (totalRow.get(other.name) ?? 0) + totalPart);
            rs.set('Total', totalRow);
        }
    }

    const header = ['Source', ...[...settlement.clans].map(c => c.name)]
    const rows = [...rs.entries()].map(([name, clanMap]) => {
        const row = [name];
        for (const clan of settlement.clans) {
            row.push((clanMap.get(clan.name) ?? 0).toFixed(1));
        }
        return row;
    });

    return { header, rows };
}