import type { Clan } from "../people/people";
import type { Operation } from "./operation";
import { Processes } from "./process";

export class OperationHelp {

    constructor(readonly m: ReadonlyMap<Operation, number>) {}

    static from(clan: Clan, helpAmount: number): OperationHelp {
        // Help with big hunting/fishing trips could make sense, but for
        // now we only send help for agriculture.
        const m = new Map<Operation, number>();
        m.set(clan.operations.find(op => op.process === Processes.Agriculture)!, helpAmount);
        return new OperationHelp(m);
    }
}