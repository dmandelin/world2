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

    readonly clans = new Clans(...[
        new Clan('Abgal', 'green', 26, 60, 50),
        new Clan('Ninshubur', 'blue', 36, 50, 60),
        new Clan('Didanu', 'black', 31, 40, 40),
    ]);

    readonly timeline: TimePoint[] = [];

    constructor() {
        this.timeline.push(new TimePoint(this));
    }

    advance() {
        this.clans.advance();
        this.year.advance(this.yearsPerTurn);

        this.timeline.push(new TimePoint(this));
    }
}

export const world = new World();