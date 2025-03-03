import { Behaviors } from "./festival";
import { Clan, Clans } from "./people";
import { TimePoint } from "./timeline";

export class Year {
    // Negative is BC, positive is AD, zero is unused.
    private value = -6500;

    clone(): Year {
        const year = new Year();
        year.value = this.value;
        return year;
    }

    advance(years: number) {
        let newValue = this.value + years;
        if (this.value < 0 && newValue >= 0) ++newValue;
        this.value = newValue;
    }

    toString() {
        return this.value < 0 ? `${-this.value} BC` : `${this.value} AD`;
    }
}

export class World {
    readonly year = new Year();
    readonly yearsPerTurn = 20;

    static doomLimit = 5;
    doomClock = World.doomLimit;

    message = '';

    readonly clans = new Clans(...[
        new Clan('Abgal', 'green', 26, Behaviors.reliable, 60, 50),
        new Clan('Ninshubur', 'blue', 36, Behaviors.reliable, 50, 60),
        new Clan('Didanu', 'black', 31, Behaviors.flaky, 40, 40),
    ]);

    readonly timeline: TimePoint[] = [];

    constructor() {
        this.timeline.push(new TimePoint(this));
    }

    advance() {
        this.clans.advance();
        this.year.advance(this.yearsPerTurn);

        if (this.totalPopulation > 500) {
            this.doomClock -= 1;
            if (this.doomClock === 0) {
                this.message = 'The people all moved out to escape overcrowding.';
                this.clans.splice(0, this.clans.length);
            } else {
                this.message = `Too many people for this area! Will emigrate in ${this.doomClock * this.yearsPerTurn} years.`;
            }
        } else {
            this.doomClock = World.doomLimit;
        }

        this.timeline.push(new TimePoint(this));
    }

    get totalPopulation() {
        return this.clans.reduce((acc, clan) => acc + clan.size, 0);
    }
}

export const world = new World();