import { Clan } from "./people";

export class Year {
    // Negative is BC, positive is AD, zero is unused.
    private value = -6500;

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

    readonly clans = [
        new Clan('Abgal', 20, 60),
        new Clan('Ninshubur', 30, 50),
        new Clan('Didanu', 20, 40),
    ];

    advance() {
        for (const clan of this.clans) clan.advance();
        this.year.advance(this.yearsPerTurn);
    }
}

export const world = new World();