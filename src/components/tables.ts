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
