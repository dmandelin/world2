import { Annals } from "./annals";
import { chooseFrom, maxby, minby } from "./basics";
import { Clan, Clans, randomClanColor, randomClanName } from "./people";
import { Settlement } from "./settlement";
import { TimePoint } from "./timeline";
import { Year } from "./year";

class SettlementsBuilder {
    private clanNames: Set<string> = new Set();
    private clanColors: Set<string> = new Set();

    constructor(readonly world: World) {}

    createSettlement(name: string, x: number, y: number, clanCount: number) {
        const clans = [];
        for (let i = 0; i < clanCount; i++) {
            const clan = new Clan(
                this.world.annals,
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

    readonly timeline: TimePoint[] = [];
    // This has to be initialized before the clans because we pass it to them.
    readonly annals = new Annals(this);

    readonly settlements = new SettlementsBuilder(this).createSettlements([
        ['Eridu', 290, 425, 3],
        ['Ur', 350, 350, 3],
        ['Uruk', 200, 287, 3],
    ]);

    readonly watchers = new Set<(world: World) => void>();

    constructor() {
        this.timeline.push(new TimePoint(this));
    }

    advance() {
        for (const s of this.settlements) 
            s.advance();
        this.emigrate();

        this.year.advance(this.yearsPerTurn);
        this.timeline.push(new TimePoint(this));
        this.notify();
    }

    emigrate() {
        // People may move from a place with QoL issues to a better place.
        // More than one group may want to move to the same place, but
        // they wouldn't want to crowd in, so we'll have to see who gets
        // to move first.

        if (this.settlements.length < 2) return;

        while (true) {
            // Determine a source and target.
            const target = maxby(this.settlements, s => s.localQOLModifier);

            const candidates = this.allClans.filter(c =>
                c.settlement!.localQOLModifier < 0 && 
                c.settlement!.localQOLModifier + c.tenureModifier + 3 < target.localQOLModifier &&
                c.settlement !== target);
            if (!candidates.length) break;
            const sourceClan = chooseFrom(candidates);
            const source = sourceClan.settlement!;

            // Move the clan.
            sourceClan.tenure = 0;
            source.clans.remove(sourceClan);
            target.clans.push(sourceClan);

            this.annals.log(`Clan ${sourceClan.name} moved from ${source.name} to ${target.name}`);

        }
    }

    get totalPopulation() {
        return this.settlements.reduce((acc, s) => acc + s.size, 0);
    }

    get allClans() {
        return this.settlements.flatMap(s => s.clans);
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
