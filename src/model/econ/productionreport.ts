import type { Clan } from "../people/people";
import type { CommonsProductionNode, ProductionNode } from "./productionnode";

export class ProductionReport {
    private nodesMap_ = new Map<ProductionNode, ProductionNodeReport>();

    constructor(readonly clan: Clan) {}

    nodes(): Iterable<ProductionNode> {
        return this.nodesMap_.keys();
    }

    accept(
        node: CommonsProductionNode, 
        land: number, 
        labor: number, 
        laborProductivityFactor: number,
        amount: number,
    ): void {
        const existing = this.nodesMap_.get(node);
        if (existing) {
            existing.amount += amount;
        } else {
            const nodeReport = {
                land,
                labor,
                laborProductivityFactor,
                node,
                amount,
            }
            this.nodesMap_.set(node, nodeReport);
        }
    }

    forNode(node: ProductionNode): ProductionNodeReport|undefined {
        return this.nodesMap_.get(node);
    }

    outputForNode(node: ProductionNode): number {
        return this.nodesMap_.get(node)?.amount ?? 0;
    }
}

export type ProductionNodeReport = {
    land: number;
    labor: number;
    laborProductivityFactor: number;
    node: ProductionNode;
    amount: number;
};
