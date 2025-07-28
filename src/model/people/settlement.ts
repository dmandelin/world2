import { average, chooseFrom } from "../lib/basics";
import type { Clans } from "./clans";
import type { Rites } from "../rites";
import type { TradeGood } from "../trade";
import type { World } from "../world";
import type { SettlementCluster } from "./cluster";
import { DitchMaintenanceCalc } from "../infrastructure";
import { DistributionNode } from "../econ/distributionnode";
import { ProductionNode } from "../econ/productionnode";
import { SkillDefs } from "./skills";

export class Housing {
    constructor(
        readonly name: string, 
        readonly description: string,
        readonly qol: number,
        readonly forcedMigrationCost: number,
    ) {}
}

export const HousingTypes = {
    Huts: new Housing("Huts", "Small, simple mud dwellings, mainly for sleeping.", -5, -2),
    Cottages: new Housing("Cottages", "Small but permanent mud houses with a thatched roof.", -2, -10),
    Houses: new Housing("Houses", "Permanent mud houses", 0, -20),
}

class DaughterSettlementPlacer {
    readonly places = 12;
    private radius = Math.random() * 10 + 15;
    private originAngle = Math.random() * 2 * Math.PI;
    readonly openPlaces = Array.from({ length: this.places }, (_, i) => i);
    private jitter = 3;

    constructor(readonly settlement: Settlement) {}

    placeFor(parent: Settlement): [number, number] {
        if (!this.openPlaces.length) {
            this.radius *= 1.5;
            this.jitter *= 1.5;
            this.originAngle = Math.random() * 2 * Math.PI / this.places;
            this.openPlaces.push(...Array.from({ length: this.places }, (_, i) => i));
        }
        const place = chooseFrom(this.openPlaces, true);

        const angle = this.originAngle + place * (2 * Math.PI / this.places);
        const x = this.settlement.x + this.radius * Math.cos(angle) + this.generateJitter();
        const y = this.settlement.y + this.radius * Math.sin(angle) + this.generateJitter();
        return [Math.round(x), Math.round(y)];
    }

    private generateJitter() {
        return (Math.random() * 2 - 1) * this.jitter;
    }
}

export class Settlement {
    private cluster_: SettlementCluster|undefined;

    readonly productionNodes: ProductionNode[] = [];
    readonly distributionNode: DistributionNode;

    readonly localTradeGoods = new Set<TradeGood>();

    readonly daughters: Settlement[] = [];
    readonly daughterPlacer = new DaughterSettlementPlacer(this);

    // Infrastructure.
    ditchingLevel = 0;
    ditchQuality = 0.3;
    maintenanceCalc: DitchMaintenanceCalc|undefined;

    constructor(
        readonly world: World,
        readonly name: string, 
        readonly x: number,
        readonly y: number,
        readonly parent: Settlement|undefined,
        readonly clans: Clans) {
        
        if (this.parent) {
            this.parent.daughters.push(this);
        }

        for (const clan of clans) {
            clan.setSettlement(this);
        }

        this.distributionNode = new DistributionNode(this);
        this.productionNodes.push(
            new ProductionNode('Farms', this, SkillDefs.Agriculture, this.distributionNode),
            new ProductionNode('Fisheries', this, SkillDefs.Fishing, this.distributionNode),
        );
    }

    get cluster(): SettlementCluster {
        return this.cluster_!;
    }

    setCluster(cluster: SettlementCluster) {
        this.cluster_ = cluster;
    }

    get abandoned() {
        return this.clans.length === 0;
    }

    get population() {
        return this.clans.reduce((acc, clan) => acc + clan.population, 0);
    }

    get rites(): Rites[] {
        return [this.clans.rites, ...this.clans.map(clan => clan.rites)];
    }

    get averageQoL() {
        return average(this.clans.map(clan => clan.qol));
    }

    private lastSizeChange_ = 0;

    get lastSizeChange() {
        return this.lastSizeChange_;
    }

    get floodLevel() {
        return this.cluster.floodLevel;
    }

    advance(noEffect: boolean = false) {
        const sizeBefore = this.population;

        // Split and merge at the start of the turn so that normal update
        // logic correctly updates the new clans.
        if (!noEffect) {
            this.clans.split();
            this.clans.merge();
            this.clans.prune();
        }

        // Economic production.
        // Maintenance goes before production, because it represents capital
        // that can be built in much less than a turn.
        this.resetEconomicNodes();
        this.maintain();
        this.produce();
        this.distribute();
        this.exchange();

        // Ritual production.
        this.advanceRites();

        // Consume production.
        for (const clan of this.clans) clan.consume();

        if (!noEffect) {
            // Advance traits and seniority.
            for (const clan of this.clans) clan.prepareTraitChanges();
            for (const clan of this.clans) clan.commitTraitChanges();
            for (const clan of this.clans) clan.advanceSeniority();

            // Population effects.
            this.clans.marry();
            for (const clan of this.clans) clan.advancePopulation();
        }

        this.lastSizeChange_ = this.population - sizeBefore;
    }

    resetEconomicNodes() {
        for (const clan of this.clans) {
            clan.consumption.reset();
        }

        this.distributionNode.reset();

        for (const pn of this.productionNodes) {
                pn.reset();
        }
    }

    maintain() {
        this.maintenanceCalc = new DitchMaintenanceCalc(this);
        this.ditchingLevel = this.maintenanceCalc.items.length ? 1 : 0;
        this.ditchQuality = this.maintenanceCalc.quality;
    }

    produce() {
        for (const pn of this.productionNodes) {
            pn.acceptFrom(this);
            pn.produce();
            pn.commit();
        }
    }

    distribute() {
        this.distributionNode.distribute();
        this.distributionNode.commit();
    }

    exchange() {
        for (const clan of this.clans) {
            clan.exchange();
        }
    }

    advanceRites(updateOptions: boolean = true) {
        if (this.abandoned) return;

        // Planning for clan rites isn't important yet and introduces a lot of notification noise.
        this.clans.rites.plan(updateOptions);
        for (const rites of this.rites) {
            rites.perform();
        }
    }

    consume() {
        for (const clan of this.clans) {
            clan.consume();
        }
    }
}