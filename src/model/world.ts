import { Message } from "./message";
import { Clan, Clans, randomClanColor, randomClanName } from "./people";
import { Settlement } from "./settlement";
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

class SettlementsBuilder {
    private clanNames: Set<string> = new Set();
    private clanColors: Set<string> = new Set();

    createSettlement(name: string, x: number, y: number, clanCount: number) {
        const clans = [];
        for (let i = 0; i < clanCount; i++) {
            const clan = new Clan(
                randomClanName(this.clanNames), 
                randomClanColor(this.clanColors),
                Math.floor(Math.random() * 37) + 15);
            clans.push(clan);

            this.clanNames.add(clan.name);
            this.clanColors.add(clan.color);
        }

        return new Settlement(name, x, y, new Clans(...clans));
    }

    createSettlements(params: readonly [string, number, number, number][]) {
        return params.map(([name, x, y, clanCount]) => 
            this.createSettlement(name, x, y, clanCount));
    }
}

export class World {
    readonly year = new Year();
    readonly yearsPerTurn = 20;

    readonly settlements = new SettlementsBuilder().createSettlements([
        ['Eridu', 290, 425, 3],
        ['Ur', 350, 350, 3],
        ['Uruk', 200, 287, 3],
    ]);

    readonly timeline: TimePoint[] = [];

    readonly watchers = new Set<(world: World) => void>();

    constructor() {
        this.timeline.push(new TimePoint(this));
    }

    advance() {
        for (const s of this.settlements) 
            s.advance();

        this.year.advance(this.yearsPerTurn);
        this.timeline.push(new TimePoint(this));
        this.notify();
    }

    get totalPopulation() {
        return this.settlements.reduce((acc, s) => acc + s.size, 0);
    }

    get allClans() {
        return this.settlements.flatMap(s => s.clans);
    }

    get messages(): Message[] {
        return this.settlements
            .filter(s => s.message)
            .map(s => new Message(s.name, s.message));
    }

    watch(watcher: (world: World) => void) {
        this.watchers.add(watcher);
    }

    unwatch(watcher: (world: World) => void) {
        this.watchers.delete(watcher);
    }

    notify() {
        for (const watcher of this.watchers) 
            watcher(this);
    }
}

export const world = new World();
