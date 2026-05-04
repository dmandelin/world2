import type { ProductionNode } from "../econ/productionnode";
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
        readonly laborMap: Map<ProductionNode, Map<Clan, number>>) {
        // For now, we'll assume things are rapidly transmitted across the
        // cluster, so we can calculate a uniform load.

        for (const pn of [cluster.fishery, cluster.naturalFields]) {
            const diseaseLoadFactor = pn.skillDef.diseaseLoadFactor;
            if (diseaseLoadFactor) {
                const nodeLaborMap = laborMap.get(pn);
                if (!nodeLaborMap) continue;

                const workers = sum(nodeLaborMap.values());
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
        
        for (const item of this.workerDiseaseLoads.values()) {
            item.finish();
        }
        
        // Not enough traffic for cross-cluster effects at the start.

        this.value = sumFun([...this.workerDiseaseLoads.values()], item => item.load);
    }
}
