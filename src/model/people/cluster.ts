import { averageFun, chooseFrom, removeAll, sumFun } from "../lib/basics";
import type { Clan } from "./people";
import type { NoteTaker } from "../records/notifications";
import { Clans } from "./clans";
import { Settlement } from "./settlement";
import { FloodLevels, type FloodLevel } from "../environment/flood";
import { DiseaseLoadCalc } from "../environment/pathogens";
import { weightedAverage } from "../lib/modelbasics";
import { CommonsProductionNode, ProductionNode } from "../econ/productionnode";
import { SkillDefs } from "./skills";
import { ClanProductionReport } from "../econ/productionreport";
import { isExemplarClan } from "../lib/debug";

export const MILES_PER_UNIT = 0.16666667;

export class SettlementCluster {
    private placer_ = new SettlementPlacer(this);
    readonly settlements: Settlement[] = [];

    private floodLevel_: FloodLevel = FloodLevels.Normal;

    fishery = new CommonsProductionNode('Regional Fisheries', 50, SkillDefs.Fishing);
    naturalFields = new CommonsProductionNode('Natural Alluvial Fields', 50, SkillDefs.Agriculture);

    diseaseLoad: DiseaseLoadCalc = new DiseaseLoadCalc(this, this.buildLaborMaps());

    constructor(readonly name: string, readonly x: number, readonly y: number) {
        this.settlements = [];
    }

    milesTo(other: SettlementCluster): number {
        const distance = Math.sqrt((this.x - other.x) ** 2 + (this.y - other.y) ** 2);
        return MILES_PER_UNIT * distance;
    }

    get clans(): Clan[] {
        return this.settlements.flatMap(s => s.clans);
    }

    get population(): number {
        return sumFun(this.settlements, s => s.population);
    }

    get lastPopulationChange(): number {
        return sumFun(this.settlements, s => s.lastSizeChange);
    }

    get appeal(): number {
        return weightedAverage(this.clans, clan => clan.appeal, clan => clan.population);
    }

    get happiness(): number {
        return weightedAverage(this.clans, clan => clan.happinessValue, clan => clan.population);
    }

    get floodLevel(): FloodLevel {
        return this.floodLevel_;
    }

    updateFloodLevel(level: FloodLevel): void {
        this.floodLevel_ = level;
    }

    updateDisease(): void {
        this.diseaseLoad = new DiseaseLoadCalc(this, this.buildLaborMaps());
    }

    advance(): void {
        for (const settlement of this.settlements) {
            settlement.advancePrePhase();
        }

        // This has to happen before actual economic production
        // and distribution.
        this.applyEffortAllocations();

        // Update disease load:
        // - After labor allocations, since those influence disease load, and we
        //   want current-turn load to reflect current-turn activity.
        // - Before production, because at some point disease will probably
        //   influence productivity.
        this.updateDisease();

        // Produce for the new production nodes.
        for (const clan of this.clans) clan.production = new ClanProductionReport(clan);
        for (const node of [this.fishery, this.naturalFields]) {
            node.commit(this.buildLaborMap(node));
        }

        for (const settlement of this.settlements) {
            settlement.advancePostPhase();
        }

        // Prune empty settlements.
        removeAll(this.settlements, s => s.population === 0);
    }

    private buildLaborMaps(): Map<ProductionNode, Map<Clan, number>> {
        const labor = new Map<ProductionNode, Map<Clan, number>>();
        for (const node of [this.fishery, this.naturalFields]) {
            labor.set(node, this.buildLaborMap(node));
        }
        return labor;
    }

    private buildLaborMap(node: ProductionNode): Map<Clan, number> {
        const nodeLabor = new Map<Clan, number>();
        for (const clan of this.clans) {
            const clanLaborFraction = clan.effortAllocation.getForNode(node);
            if (clanLaborFraction > 0) {
                nodeLabor.set(clan, clanLaborFraction * clan.workers);
            }
        }
        return nodeLabor;
    }

    // Compute actual effort allocations based on choices.
    private applyEffortAllocations(): void {
        // Each clan should get a chance to use commons, so we change
        // incrementally, but there is also a tendency for persistence,
        // so we can start from the status quo.

        for (const clan of this.clans) {
            clan.effortAllocation.applyStart();
        }

        let allowedUpdatesRemaining = 20;
        while (allowedUpdatesRemaining--) {
            let updated = false;
            // TODO - Some sensible ordering.
            for (const clan of this.clans) {
                const clanUpdated = clan.effortAllocation.applyStep(this.buildLaborMaps());
                if (clanUpdated) {
                    updated = true;
                }
            }
            if (!updated) break;
        }
    }

    updatePerceptions(): void {
        for (const s of this.settlements) {
            s.updateSeniority();
            s.updatePrestigeViews();

            for (const clan of s.clans) {
                clan.updateRespect();
            }
        }
    }

    foundSettlement(name: string, source: Settlement): Settlement {
        const [x, y] = this.placer_.placeFor();
        return new Settlement(source.world, name, x, y, this, source);
    }
}

class SettlementPlacer {
    readonly places = 12;
    private first = true;
    private radius = Math.random() * 10 + 15;
    private originAngle = Math.random() * 2 * Math.PI;
    readonly openPlaces = Array.from({ length: this.places }, (_, i) => i);
    private jitter = 3;

    constructor(readonly cluster: SettlementCluster) {}

    placeFor(): [number, number] {
        if (this.first) {
            this.first = false;
            return [this.cluster.x, this.cluster.y];
        }

        if (!this.openPlaces.length) {
            this.radius *= 1.5;
            this.jitter *= 1.5;
            this.originAngle = Math.random() * 2 * Math.PI / this.places;
            this.openPlaces.push(...Array.from({ length: this.places }, (_, i) => i));
        }
        const place = chooseFrom(this.openPlaces, true);

        const angle = this.originAngle + place * (2 * Math.PI / this.places);
        const x = this.cluster.x + this.radius * Math.cos(angle) + this.generateJitter();
        const y = this.cluster.y + this.radius * Math.sin(angle) + this.generateJitter();
        return [Math.round(x), Math.round(y)];
    }

    private generateJitter() {
        return (Math.random() * 2 - 1) * this.jitter;
    }
}