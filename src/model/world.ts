import { Annals } from "./annals";
import { chooseFrom, maxby, maxbyWithValue, minby, shuffled } from "./basics";
import { Clan, Clans, PersonalityTrait, PersonalityTraits, randomClanColor, randomClanName } from "./people";
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
        this.rank();

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

        for (const clan of shuffled(this.allClans)) {
            // See if there are settlements worth moving to.
            const [best, value] = maxbyWithValue(this.settlements, s =>
                s.localQOLModifierWith(clan.size) - ( 
                    clan.settlement!.localQOLModifier +
                    clan.tenureModifier + 
                    clan.interactionModifier));
            if (best == clan.settlement) continue;
            if (value < 2) break;

            // Move the clan.
            const source = clan.settlement!;
            clan.tenure = 0;
            clan.moveTo(best);
            clan.traits.delete(PersonalityTraits.SETTLED);
            clan.traits.add(PersonalityTraits.MOBILE);

            this.annals.log(
                `Clan ${clan.name} moved from ${source.name} to ${best.name}`, source);
        }
    }

    rank() {
        const work = this.allClans.filter(c => !c.parent);
        while (work.length) {
            const clan = work.pop()!;
            clan.seniority = clan.parent ? clan.parent.seniority + 1 : 0;
            work.push(...clan.cadets);
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
