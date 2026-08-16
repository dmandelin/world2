import { SkillDef } from "../people/skills";
import { type TradeGood } from "../trade";
import type { Tagged } from "./tagged";

// Description of an economic production process. Stateless.
export class Process implements Tagged {
    // Base output per worker-year, before productivity modifiers. Mutable so
    // headless tuning runs can sweep it; see model/tuning.ts.
    outputPerWorker: number;

    constructor(
        readonly name: string,
        readonly sortKey: number,
        readonly shortName: string,
        readonly color: string,
        readonly outputGood: TradeGood|undefined,
        outputPerWorker: number,
        readonly useLocation: ProcessLocation = ProcessLocation.Either,
    ) {
        this.outputPerWorker = outputPerWorker;
    }
}

export enum ProcessLocation {
    HomeOnly,
    AwayOnly,
    Either,
}