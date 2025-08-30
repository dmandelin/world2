import { averageFun, removeAll, sumFun } from "../lib/basics";
import type { Clan } from "./people";
import type { NoteTaker } from "../records/notifications";
import { Clans } from "./clans";
import { Settlement } from "./settlement";
import { FloodLevels, type FloodLevel } from "../environment/flood";
import { DiseaseLoadCalc } from "../environment/pathogens";
import { weightedAverage } from "../lib/modelbasics";

export class SettlementCluster {
    readonly settlements: Settlement[];
    private floodLevel_: FloodLevel = FloodLevels.Normal;
    diseaseLoad: DiseaseLoadCalc;

    constructor(readonly noteTaker: NoteTaker, readonly mother: Settlement) {
        this.settlements = [mother];
        mother.setCluster(this);
        
        this.diseaseLoad = new DiseaseLoadCalc(this);
    }

    get name(): string {
        return `${this.mother.name} area`;
    }

    get daughters(): Settlement[] {
        return this.mother.daughters;
    }

    get clans(): Clan[] {
        return this.settlements.flatMap(s => s.clans);
    }

    get population(): number {
        return sumFun(this.settlements, s => s.clans.population);
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
        for (const s of this.settlements) s.updateForFloodLevel(level);
    }

    updateDisease(): void {
        this.diseaseLoad = new DiseaseLoadCalc(this);
    }

    advance(noEffect: boolean = false): void {
        for (const settlement of this.settlements) {
            settlement.advance(noEffect);
        }

        // Prune empty daughter settlements.
        removeAll(this.settlements, s => s.population === 0 && s !== this.mother);
        removeAll(this.mother.daughters, s => s.population === 0);
    }

    updatePerceptions(): void {
        for (const s of this.settlements) {
            s.clans.updateSeniority();
            s.clans.updatePrestigeViews();
            s.clans.updateAlignmentViews();
        }
    }

    foundSettlement(name: string, source: Settlement): Settlement {
        const [x, y] = this.mother.daughterPlacer.placeFor(this.mother);
        const settlement = new Settlement(this.mother.world, name, x, y, this.mother, new Clans(this.noteTaker));

        settlement.setCluster(this);
        this.settlements.push(settlement);
        this.noteTaker.addNote('🏠', 
            `Founded new village ${settlement.name} from ${source.name} near ${this.mother.name}.`);
        return settlement;
    }
}