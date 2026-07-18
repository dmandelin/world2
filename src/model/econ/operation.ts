import { Productivity } from "./productivity";
import { sumFun } from "../lib/basics";
import type { Clan } from "../people/people";
import type { Process } from "./process";
import type { TradeGood } from "../trade";

// An ongoing economic operation. Stateful.
export class Operation {
    constructor(
        readonly clan: Clan,
        readonly process: Process,
    ) { }

    produce(labor: number, land: number, help: number): OperationProductionReport {
        // Assume output is linear in workers and land at this scale, 
        // with both required.
        const inputAmount = Math.min(land, labor);

        let productivity = Productivity.forClanProcess(this.clan, this.process, labor, land, help);

        const lpBase = this.process.outputPerWorker;
        const lpMod = productivity.tfp ?? 1;
        const lp = lpBase * lpMod;

        return {
            operation: this,
            land,
            labor,
            help,
            productivity,
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
    constructor(readonly rs: OperationProductionReport[]) { }

    forProcess(process: Process): OperationProductionReport | undefined {
        return this.rs.filter(r => r.operation.process === process)[0];
    }

    getForProcess<K extends keyof OperationProductionReport>(process: Process, propName: K):
        OperationProductionReport[K] | undefined {
        const r = this.rs.filter(r => r.operation.process === process)[0];
        return r ? r[propName] : undefined;
    }

    effortForProcesses(...processes: Process[]): number {
        return sumFun(this.rs
            .filter(r => processes.includes(r.operation.process)),
            r => r.labor);
    }

    effort(): number {
        return sumFun(this.rs, r => r.labor);
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
    productivity: Productivity;
    laborProductivityFactor: number;
    good: TradeGood;
    amount: number;
};