import { matchingFraction } from "../lib/basics";
import { pct } from "../lib/format";
import { weightedAverage } from "../lib/modelbasics";
import { HousingTypes } from "../econ/housing";
import { SkillDefs } from "../people/skills";
import type { World } from "../world";
import { Year } from "./year";

export class TrendDTO {
    constructor(readonly current: string) {}
}

export interface Trend {
    label: string;
    asDTO: TrendDTO;

    initialize(year: Year): void;
    update(year: Year): void;
}

abstract class BasicTrend<T> implements Trend {
    protected history = new Map<Year, T>();
    protected current_: T|undefined;

    constructor(readonly world: World) {
    }

    abstract get label(): string;
    abstract getValue(): T;

    get current(): T {
        return this.current_!;
    }

    initialize(year: Year): void {
        this.update(year);
    }

    update(year: Year): void {
        this.current_ = this.getValue();
        this.history.set(year, this.current_);
    }

    get asDTO(): TrendDTO {
        return new TrendDTO(this.label);
    }
}

class HousingTrend extends BasicTrend<number> {
    get label(): string {
        return `+H ${pct(this.current)}`;
    }

    getValue(): number {
        return matchingFraction(
            this.world.allClans,
            c => c.housing !== HousingTypes.Huts,
        );
    }
}

class FarmingTrend extends BasicTrend<number> {
    get label(): string {
        return `F ${pct(this.current)}`;
    }

    getValue(): number {
        return weightedAverage(
            this.world.allClans,
            c => c.laborAllocation.allocs.get(SkillDefs.Agriculture) ?? 0,
            c => c.population,
        );
    }
}

export function createTrends(world: World): Trend[] {
    return [
        new HousingTrend(world),
        new FarmingTrend(world),
    ];
}