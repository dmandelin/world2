import { sumFun } from "../lib/basics";
import type { SettlementCluster } from "../people/cluster";
import { SkillDef } from "../people/skills";

export class WorkerDiseaseLoadItem {
    load: number = 0;

    constructor(readonly skillDef: SkillDef, public workers: number) {}

    finish(): void {
        this.load = 0.05 * Math.log10(this.workers) * this.skillDef.diseaseLoadFactor;
    }
}

export class DiseaseLoadCalc {
    readonly workerDiseaseLoads = new Map<SkillDef, WorkerDiseaseLoadItem>();

    readonly value: number;

    constructor(readonly cluster: SettlementCluster) {
        // For now, we'll assume things are rapidly transmitted across the
        // cluster, so we can calculate a uniform load.

        for (const settlement of cluster.settlements) {
                for (const pn of settlement.productionNodes) {
                    const diseaseLoadFactor = pn.skillDef.diseaseLoadFactor;
                    if (diseaseLoadFactor) {
                        const workers = pn.workers();
                        let item = this.workerDiseaseLoads.get(pn.skillDef);
                        if (!item) {
                            item = new WorkerDiseaseLoadItem(
                                pn.skillDef, workers * diseaseLoadFactor);
                            this.workerDiseaseLoads.set(pn.skillDef, item);
                        } else {
                            item.workers += workers;
                        }
                    }
                }
        }
        
        for (const item of this.workerDiseaseLoads.values()) {
            item.finish();
        }
        
        // No endemic at the starting small scale.

        // Not enough traffic for cross-cluster effects at the start.

        this.value = sumFun([...this.workerDiseaseLoads.values()], item => item.load);
    }
}
