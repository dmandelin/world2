import { matchingFraction } from "../lib/basics";
import { pct } from "../lib/format";
import type { Clan } from "../people/people";
import { Housing, HousingTypes } from "../people/settlement";
import type { World } from "../world";
import { Year } from "./year";

export interface Trend {
    label: string;

    initialize(year: Year): void;
    update(year: Year): void;
    clone(): Trend;
}

class TrendDef {
    constructor() {

    }

    get label() {
        return 'TREND';
    }

    initialize(year: Year) {

    }

    update(year: Year) {

    }

    clone(): Trend {
        return new TrendDef();
    }
}

class HousingTrend {
    private history = new Map<Year, number>();
    private current = 0;

    constructor(readonly world: World) {}

    get label(): string {
        return `+H ${pct(this.current)}`;
    }

    initialize(year: Year): void {
        this.update(year);
    }

    update(year: Year): void {
        this.current = matchingFraction(this.world.allClans, 
            c => c.housing !== HousingTypes.Huts);
        this.history.set(year, this.current);
    }

    clone(): Trend {
        const clone = new HousingTrend(this.world);
        clone.history = new Map(this.history);
        clone.current = this.current;
        return clone;
    }
}

export function createTrends(world: World): Trend[] {
    return [new HousingTrend(world), new TrendDef()];
}