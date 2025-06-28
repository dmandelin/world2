import { averageFun, sumFun } from "../lib/basics";
import type { Clan } from "./people";
import type { NoteTaker } from "../notifications";
import { Clans } from "./clans";
import { Settlement } from "./settlement";

export class SettlementCluster {
    readonly settlements: Settlement[];

    constructor(readonly noteTaker: NoteTaker, readonly mother: Settlement) {
        this.settlements = [mother];
        mother.setCluster(this);
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

    get qol(): number {
        return averageFun(this.settlements, s => s.clans.averageQoL);
    }

    advance(): void {
        for (const settlement of this.settlements) {
            settlement.advance();
        }
    }

    updatePerceptions(): void {
        for (const s of this.settlements) {
            for (const clan of s.clans) {
                clan.assessments.update();
            }
            s.clans.updateSeniority();
            s.clans.updatePrestigeViews();
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