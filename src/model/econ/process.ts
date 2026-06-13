import { SkillDef, SkillDefs } from "../people/skills";
import { Traits } from '../people/traits';
import { type TradeGood, TradeGoods } from "../trade";

// Description of an economic production process. Stateless.
export class Process {
    constructor(
        readonly name: string,
        readonly sortKey: number,
        readonly shortName: string,
        readonly color: string,
        readonly outputGood: TradeGood|undefined,
        readonly outputPerWorker: number,
        readonly skillDef: SkillDef,
        readonly traitFactors: Map<string, number> = new Map<string, number>(),
        readonly useLocation: ProcessLocation = ProcessLocation.Either,
        readonly diseaseLoadFactor: number = 0,
    ) {}
}

export enum ProcessLocation {
    HomeOnly,
    AwayOnly,
    Either,
}

export const Processes = {
    Fishing: new Process('Fishing', 1, 'F', '#3b82f6', TradeGoods.Fish, 3, SkillDefs.Fishing,
        new Map([['Skill', 3], [Traits.Intelligence, 1], [Traits.Strength, 1]]),
        ProcessLocation.AwayOnly, 1),
    Agriculture: new Process('Agriculture', 2, 'A', '#10b981', TradeGoods.Cereals, 3, SkillDefs.Agriculture,
        new Map([['Skill', 2], [Traits.Intelligence, 1], [Traits.Strength, 2]]),
        ProcessLocation.HomeOnly, 2),
};