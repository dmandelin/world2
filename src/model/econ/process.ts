import { SkillDef } from "../people/skills";
import { type TradeGood } from "../trade";
import type { Tagged } from "./tagged";

// Description of an economic production process. Stateless.
export class Process implements Tagged {
    constructor(
        readonly name: string,
        readonly sortKey: number,
        readonly shortName: string,
        readonly color: string,
        readonly outputGood: TradeGood|undefined,
        readonly outputPerWorker: number,
        readonly useLocation: ProcessLocation = ProcessLocation.Either,
    ) {}
}

export enum ProcessLocation {
    HomeOnly,
    AwayOnly,
    Either,
}