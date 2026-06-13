import type { Clan } from "../people/people";
import type { ProductivityCalc } from "../people/productivity";
import type { TradeGood } from "../trade";
import type { Process } from "./process";

// An ongoing economic operation. Stateful.
export class Operation {
    constructor(
        readonly clan: Clan,
        readonly process: Process,
    ) {}

    produce(labor: number, land: number, help: number): OperationProductionReport {
        // Assume output is linear in workers and land at this scale, 
        // with both required.
        const inputAmount = Math.min(land, labor);

        const productivityCalc = this.clan.productivityCalcs.get(this.process.skillDef)!;

        const lpBase = this.process.outputPerWorker;
        const lpMod = productivityCalc.tfp ?? 1;
        const lp = lpBase * lpMod;

        return {
            operation: this,
            land,
            labor,
            help,
            productivityCalc,
            laborProductivityFactor: lpMod,
            good: this.process.outputGood!,
            amount: inputAmount * lp,
        };
    }
}

export function produce(
    operations: Operation[], 
    labor: ReadonlyMap<Operation, number>, 
    land: ReadonlyMap<Operation, number>,
    help: ReadonlyMap<Operation, number>): ProductionReport {
    const reports: OperationProductionReport[] = [];
    for (const op of operations) {
        const laborAmount = labor.get(op) ?? 0;
        const landAmount = land.get(op) ?? 0;
        const helpAmount = help.get(op) ?? 0;
        const report = op.produce(laborAmount, landAmount, helpAmount);
        reports.push(report);
    }
    return new ProductionReport(reports);
}

export class ProductionReport {
    constructor(readonly rs: OperationProductionReport[]) {}

    forProcess(process: Process): OperationProductionReport|undefined {
        return this.rs.filter(r => r.operation.process === process)[0];
    }
    
    getForProcess<K extends keyof OperationProductionReport>(process: Process, propName: K): 
    OperationProductionReport[K]|undefined {
        const r = this.rs.filter(r => r.operation.process === process)[0];
        return r ? r[propName] : undefined;
    }

    totals(): Map<TradeGood, number> {
        const m = new Map<TradeGood, number>();
        for (const r of this.rs) {
            const prev = m.get(r.good) ?? 0;
            m.set(r.good, prev + r.amount);
        }
        return m;
    }
}

export type OperationProductionReport = {
    operation: Operation;
    land: number;
    labor: number;
    help: number;
    productivityCalc: ProductivityCalc;
    laborProductivityFactor: number;
    good: TradeGood;
    amount: number;
};