import type { Clan } from "../people/people";
import type { World } from "../world";
import type { Year } from "./year";

export interface Trend {
    initialize(year: Year): void;
    update(year: Year): void;
}

class TrendDef {
    constructor() {

    }

    initialize(year: Year) {

    }

    update(year: Year) {

    }
}

export function createTrends(world: World): Trend[] {
    return [new TrendDef(), new TrendDef()];
}