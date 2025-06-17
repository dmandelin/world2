import { Annals } from "./annals";
import { Clan, PersonalityTraits, randomClanColor, randomClanName } from "./people";
import { Clans } from "./clans";
import { chooseFrom, maxbyWithValue, shuffled } from "./basics";
import { Settlement } from "./settlement";
import { TimePoint } from "./timeline";
import { TradeGood, TradeGoods } from "./trade";
import { WorldDTO } from "../components/dtos";
import { Year } from "./year";
import { Note } from "./notifications";

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
    readonly notes: Note[] = [];

    readonly settlements = new SettlementsBuilder(this).createSettlements([
        ['Eridu', 290, 425, 3],
        ['Ur', 350, 350, 3],
        ['Uruk', 200, 287, 3],
    ]);

    readonly watchers = new Set<(world: World) => void>();

    dto = new WorldDTO(this);

    constructor() {
    }

    initialize() {
        this.initializeTradeGoods();
        this.preAdvance();
        this.notes.push(new Note('N'));
    }

    initializeTradeGoods() {
        let e: Settlement, u: Settlement;
        for (const s of this.settlements) {
            let localTradeGoods: TradeGood[] = [];
            switch (s.name) {
                case 'Eridu':
                    localTradeGoods = [TradeGoods.Cereals, TradeGoods.Fish];
                    e = s;
                    break;
                case 'Ur':
                    localTradeGoods = [TradeGoods.Cereals, TradeGoods.ReedProducts];
                    u = s;
                    break;
                case 'Uruk':
                    localTradeGoods = [TradeGoods.Cereals, TradeGoods.Bitumen];
                    break;
            }
            for (const g of localTradeGoods) {
                s.localTradeGoods.add(g);
            }
        }
        chooseFrom(e!.clans).addKinBasedTradePartner(chooseFrom(u!.clans));
    }

    preAdvance() {
        // Decisions can depend on perceptions, so we'll initialize them first,
        // but then update after pre-advancing state.
        this.updatePerceptions();

        for (const s of this.settlements) {
            const snapshot = new Map(s.clans.map(clan => [clan, clan.economicPolicy]));
            const slippage = s.clans.slippage;
            for (const clan of s.clans) {
                clan.tenure = 1;
                clan.chooseEconomicPolicy(snapshot, slippage);
            }
            s.clans.produce();
            s.clans.distribute();
            s.clans.performRites();
        }

        this.updatePerceptions();

        this.timeline.push(new TimePoint(this));
        this.notify();
    }

    advance() {
        // Main advance phase.
        for (const s of this.settlements) {
            s.advance();
        }
        this.emigrate();

        this.updatePerceptions();

        // Update timeline.
        this.year.advance(this.yearsPerTurn);
        this.timeline.push(new TimePoint(this));

        // Notify observers.
        this.notify();
    }

    emigrate() {
        // People may move from a place with QoL issues to a better place.
        // More than one group may want to move to the same place, but
        // they wouldn't want to crowd in, so we'll have to see who gets
        // to move first.

        if (this.settlements.length < 2) return;

        for (const clan of shuffled(this.allClans)) {
            const inertia = clan.traits.has(PersonalityTraits.MOBILE) 
                ? 0
                : clan.traits.has(PersonalityTraits.SETTLED)
                ? 2
                : 1;

            const moveValue = (settlement: Settlement|'new') => {
                // Base newValue is assuming no tech kit at the new settlement.
                const newValue = settlement == 'new'
                    ? -5 : settlement.localQOLModifierWith(clan.size);
                const inertiaValue = settlement == 'new'
                    ? inertia * 2 + 1 : inertia;
                const oldValue = clan.settlement!.localQOLModifier;
                return newValue - (oldValue + inertiaValue);
            }

            // See if there are settlements worth moving to.
            const targets: Array<Settlement|'new'> = [...this.settlements, 'new'];
            let [best, value] = maxbyWithValue(targets, s => moveValue(s));
            if (best == clan.settlement) continue;
            if (value <= 0) break;

            // Create a new settlement if needed.
            const isNew = best == 'new';
            if (best == 'new') {
                const dir = Math.random() * 2 * Math.PI;
                const distance = Math.random() * 10 + 20;
                const x = clan.settlement!.x + Math.round(Math.cos(dir) * distance);
                const y = clan.settlement!.y + Math.round(Math.sin(dir) * distance);
                const newSettlement = new Settlement(`Hamlet ${this.settlements.length + 1}`,
                    x, y, new Clans());
                this.settlements.push(newSettlement);

                newSettlement.parent = clan.settlement;
                clan.settlement!.daughters.push(newSettlement);

                best = newSettlement;
                this.annals.log(
                    `Clan ${clan.name} founded ${newSettlement.name}`, newSettlement);
            }

            // Move the clan.
            const source = clan.settlement!;
            clan.tenure = 0;
            clan.moveTo(best);
            clan.traits.delete(PersonalityTraits.SETTLED);
            clan.traits.add(PersonalityTraits.MOBILE);

            if (!isNew) {
                this.annals.log(
                    `Clan ${clan.name} moved from ${source.name} to ${best.name}`, source);
            }
        }
    }

    updatePerceptions() {
        for (const s of this.settlements) {
            for (const clan of s.clans) {
                clan.assessments.update();
            }
            s.clans.updateSeniority();
            s.clans.updatePrestigeViews();
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
        this.dto = new WorldDTO(this);

        for (const watcher of this.watchers) 
            watcher(this);
    }
}

export const world = new World();
world.initialize();