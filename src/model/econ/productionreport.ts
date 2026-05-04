import type { Clan } from "../people/people";
import type { SkillDef } from "../people/skills";
import type { TradeGood } from "../trade";
import { CommonsProductionNode, type ProductionNode } from "./productionnode";

export class ProductionNodeReport {
    private item: ProductionNodeReportItem

    constructor(readonly node: ProductionNode) {
        const good = node instanceof CommonsProductionNode ? node.skillDef?.outputGood : undefined;
        this.item = {
            land: 0,
            labor: 0,
            node: this.node,
            good,
            amount: 0,
        }
    }

    accept(
        land: number, 
        labor: number, 
        good: TradeGood,
        amount: number,
    ): void {
        this.item.land += land;
        this.item.labor += labor;
        this.item.amount += amount;
    }

    landPerWorker(): number {
        return this.item.land / this.item.labor;
    }
}

export type ProductionNodeReportItem = {
    land: number;
    labor: number;
    node: ProductionNode;
    good?: TradeGood;
    amount: number;
};

export class ClanProductionReport {
    private nodesMap_ = new Map<ProductionNode, ClanProductionNodeReportItem>();

    constructor(readonly clan: Clan) {}

    nodes(): Iterable<ProductionNode> {
        return this.nodesMap_.keys();
    }

    reports(): Iterable<ClanProductionNodeReportItem> {
        return this.nodesMap_.values();
    }

    accept(
        node: CommonsProductionNode, 
        land: number, 
        labor: number, 
        laborProductivityFactor: number,
        good: TradeGood,
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
                good,
                node,
                amount,
            }
            this.nodesMap_.set(node, nodeReport);
        }
    }

    forNode(node: ProductionNode): ClanProductionNodeReportItem|undefined {
        return this.nodesMap_.get(node);
    }

    forSkill(skillDef: SkillDef): ClanProductionNodeReportItem|undefined {
        for (const report of this.nodesMap_.values()) {
            if (report.node instanceof CommonsProductionNode && report.node.skillDef === skillDef) {
                return report;
            }
        }
        return undefined;
    }


    outputForNode(node: ProductionNode): number {
        return this.nodesMap_.get(node)?.amount ?? 0;
    }
}

export type ClanProductionNodeReportItem = {
    land: number;
    labor: number;
    laborProductivityFactor: number;
    node: ProductionNode;
    good: TradeGood;
    amount: number;
};
