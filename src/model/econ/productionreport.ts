import type { Clan } from "../people/people";
import type { CommonsProductionNode, ProductionNode } from "./productionnode";

export class ProductionReport {
    private nodesMap_ = new Map<ProductionNode, ProductionNodeReport>();

    constructor(readonly clan: Clan) {}

    nodes(): Iterable<ProductionNode> {
        return this.nodesMap_.keys();
    }

    accept(node: CommonsProductionNode, amount: number): void {
        const existing = this.nodesMap_.get(node);
        if (existing) {
            existing.amount += amount;
        } else {
            this.nodesMap_.set(node, { node, amount });
        }
    }

    outputForNode(node: ProductionNode): number {
        return this.nodesMap_.get(node)?.amount ?? 0;
    }
}

export type ProductionNodeReport = {
    node: ProductionNode;
    amount: number;
};
