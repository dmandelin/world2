import { SkillDef } from "../people/skills";
import { type TradeGood } from "../trade";

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