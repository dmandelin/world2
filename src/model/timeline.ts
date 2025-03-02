import type { World, Year } from "./world";

export class TimePoint {
    readonly year: Year;
    readonly totalPopulation: number;
    
    constructor(world: World) {
        this.year = world.year.clone();
        this.totalPopulation = world.clans.reduce((acc, clan) => acc + clan.size, 0);
    }
}