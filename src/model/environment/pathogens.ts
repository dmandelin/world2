import { Processes } from "../econ/econdefs";
import { Process } from "../econ/process";
import { sum, sumFun } from "../lib/basics";
import type { SettlementCluster } from "../people/cluster";
import type { Clan } from "../people/people";

function getDiseaseLoadFactor(process: Process): number {
    switch (process) {
        case Processes.Agriculture:
            return 2;
        default:
            return 1;
    }
}

export class DiseaseLoadCalc {
    readonly items = new Map<string, DiseaseLoadItem>();

    readonly value: number;

    constructor(
        readonly cluster: SettlementCluster,
        readonly laborMap: Map<Process, Map<Clan, number>>) {
        // For now, we'll assume things are rapidly transmitted across the
        // cluster, so we can calculate a uniform load.

        for (const process of [Processes.Fishing, Processes.Agriculture]) {
            const diseaseLoadFactor = getDiseaseLoadFactor(process);
            if (diseaseLoadFactor) {
                const processLaborMap = laborMap.get(process);
                if (!processLaborMap) continue;

                const effort = sum(processLaborMap.values());
                let item = this.items.get(process.name);
                if (!item) {
                    item = new DiseaseLoadItem(
                        process.name, effort * diseaseLoadFactor, diseaseLoadFactor);
                    this.items.set(process.name, item);
                } else {
                    item.effort += effort * diseaseLoadFactor;
                }
            }
        }

        for (const item of this.items.values()) {
            item.finish();
        }

        // Not enough traffic for cross-cluster effects at the start.

        this.value = sumFun([...this.items.values()], item => item.load);
    }
}

export class DiseaseLoadItem {
    load: number = 0;

    constructor(readonly label: string, public effort: number, public diseaseLoadFactor: number) { }

    finish(): void {
        if (this.effort == 0) return;
        this.load = 0.05 * Math.log10(this.effort) * this.diseaseLoadFactor;
    }
}
