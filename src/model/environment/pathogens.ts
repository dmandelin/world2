import { Processes } from "../econ/econdefs";
import { Process } from "../econ/process";
import { sum, sumFun } from "../lib/basics";
import type { SettlementCluster } from "../people/cluster";
import type { Clan } from "../people/people";
import { SkillDef } from "../people/skills";

export class WorkerDiseaseLoadItem {
    load: number = 0;

    constructor(readonly skillDef: SkillDef, public workers: number) {}

    finish(): void {
        if (this.workers == 0) return;
        this.load = 0.05 * Math.log10(this.workers) * this.skillDef.diseaseLoadFactor;
    }
}

export class DiseaseLoadCalc {
    readonly workerDiseaseLoads = new Map<SkillDef, WorkerDiseaseLoadItem>();

    readonly value: number;

    constructor(
        readonly cluster: SettlementCluster, 
        readonly laborMap: Map<Process, Map<Clan, number>>) {
        // For now, we'll assume things are rapidly transmitted across the
        // cluster, so we can calculate a uniform load.

        for (const process of [Processes.Fishing, Processes.Agriculture]) {
            const diseaseLoadFactor = process.skillDef.diseaseLoadFactor;
            if (diseaseLoadFactor) {
                const nodeLaborMap = laborMap.get(process);
                if (!nodeLaborMap) continue;

                const workers = sum(nodeLaborMap.values());
                let item = this.workerDiseaseLoads.get(process.skillDef);
                if (!item) {
                    item = new WorkerDiseaseLoadItem(
                        process.skillDef, workers * diseaseLoadFactor);
                    this.workerDiseaseLoads.set(process.skillDef, item);
                } else {
                    item.workers += workers;
                }
            }
        }
        
        for (const item of this.workerDiseaseLoads.values()) {
            item.finish();
        }
        
        // Not enough traffic for cross-cluster effects at the start.

        this.value = sumFun([...this.workerDiseaseLoads.values()], item => item.load);
    }
}
