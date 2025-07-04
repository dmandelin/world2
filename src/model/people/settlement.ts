import { average, chooseFrom } from "../lib/basics";
import type { Clans } from "./clans";
import type { Rites } from "../rites";
import type { TradeGood } from "../trade";
import type { World } from "../world";
import type { SettlementCluster } from "./cluster";
import { poisson } from "../lib/distributions";
import { MaintenanceCalcItem, DitchMaintenanceCalc } from "../infrastructure";

export class Housing {
    constructor(readonly name: string, readonly description: string) {}
}

export const HousingTypes = {
    Huts: new Housing("Huts", "Small, simple mud dwellings, mainly for sleeping."),
    Houses: new Housing("Houses", "Small but permantent mud houses"),
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

    readonly localTradeGoods = new Set<TradeGood>();

    readonly daughters: Settlement[] = [];
    readonly daughterPlacer = new DaughterSettlementPlacer(this);

    // Infrastructure.
    ditchingLevel = 0;
    ditchQuality = 0.9;
    maintenanceCalc: DitchMaintenanceCalc|undefined;

    // Local conditions.
    floodingLevel_ = 1;

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

    get averageQoLFromGoods() {
        return average(this.clans.map(clan => 
            clan.qolCalc.items.find(item => item[0] === 'Goods')?.[1] ?? 0));
    }

    private lastSizeChange_ = 0;

    get lastSizeChange() {
        return this.lastSizeChange_;
    }

    get floodingLevel() {
        return this.floodingLevel_;
    }

    advance() {
        const sizeBefore = this.population;

        // Nature.
        this.floodingLevel_ = 1 + poisson(1);

        // Update productivity now, so that policy can use it.
        this.clans.updateProductivity();

        // Economic planning.
        // TODO - Move to a planning function.        
        const policySnapshot = new Map(this.clans.map(clan => [clan, clan.economicPolicy]));
        const slippage = this.clans.slippage;
        for (const clan of this.clans) {
            clan.chooseEconomicPolicy(policySnapshot, slippage);
            clan.planMaintenance();
        }

        // Economic production.
        // Maintenance goes before production, because it represents capital
        // that can be built in much less than a turn.
        this.maintain();
        this.clans.produce();
        this.clans.distribute();

        // Ritual production.
        this.advanceRites();

        // Consume production.
        this.clans.consume();

        // Advance traits and seniority.
        for (const clan of this.clans) clan.prepareTraitChanges();
        for (const clan of this.clans) clan.commitTraitChanges();
        for (const clan of this.clans) clan.advanceSeniority();

        // Population effects.
        this.clans.marry();
        for (const clan of this.clans) clan.advancePopulation();
        this.clans.split();
        this.clans.merge();
        this.clans.prune();
 
        this.lastSizeChange_ = this.population - sizeBefore;
    }

    maintain() {
        this.maintenanceCalc = new DitchMaintenanceCalc(this);
        this.ditchingLevel = this.maintenanceCalc.items.length ? 2 : 0;
        this.ditchQuality = this.maintenanceCalc.quality;
    }

    advanceRites(updateOptions: boolean = true) {
        // Planning for clan rites isn't important yet and introduces a lot of notification noise.
        this.clans.rites.plan(updateOptions);
        this.attendRites();
        for (const rites of this.rites) {
            rites.perform();
        }
    }

    attendRites() {
        console.log(`Attending rites in ${this.name}`);
    }
}