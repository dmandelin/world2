import { Annals } from "./annals";
import { Clan, PersonalityTraits, randomClanColor, randomClanName } from "./people/people";
import { Clans } from "./people/clans";
import { chooseFrom, sumFun, maxbyWithValue, shuffled } from "./lib/basics";
import { Settlement } from "./people/settlement";
import { TimePoint } from "./timeline";
import { TradeGood, TradeGoods } from "./trade";
import { WorldDTO } from "../components/dtos";
import { Year } from "./year";
import { Note, type NoteTaker } from "./notifications";
import { crowdingValue } from "./people/qol";
import { SettlementCluster } from "./people/cluster";
import { randomHamletName } from "./people/names";

class SettlementsBuilder {
    private clanNames: Set<string> = new Set();
    private clanColors: Set<string> = new Set();

    constructor(readonly world: World) {}

    createCluster(name: string, x: number, y: number, clanCount: number) {
        const clans = [];
        for (let i = 0; i < clanCount; i++) {
            const clan = new Clan(
                this.world,
                this.world.annals,
                randomClanName(this.clanNames), 
                randomClanColor(this.clanColors),
                Math.floor(Math.random() * 37) + 15);
            clans.push(clan);

            this.clanNames.add(clan.name);
            this.clanColors.add(clan.color);
        }

        const settlement = new Settlement(this.world, name, x, y, new Clans(this.world, ...clans));
        const cluster = new SettlementCluster(this.world, settlement);
        return cluster;
    }

    createClusters(params: readonly [string, number, number, number][]) {
        return params.map(([name, x, y, clanCount]) => 
            this.createCluster(name, x, y, clanCount));
    }
}

export class World implements NoteTaker {
    readonly year = new Year();
    readonly yearsPerTurn = 20;

    readonly timeline: TimePoint[] = [];
    // This has to be initialized before the clans because we pass it to them.
    readonly annals = new Annals(this);
    readonly notes: Note[] = [];

    readonly clusters = new SettlementsBuilder(this).createClusters([
        ['Eridu', 290, 425, 3],
        ['Ur', 350, 350, 3],
        ['Uruk', 200, 287, 3],
    ]);

    readonly watchers = new Set<(world: World) => void>();

    dto = new WorldDTO(this);

    constructor() {
    }

    addNote(shortLabel: string, message: string) {
        this.notes.push(new Note(this.year.toString(), shortLabel, message));
    }

    initialize() {
        this.addNote(
            '*',
            'First permanent settlements founded!'
        );

        this.initializeTradeGoods();
        this.preAdvance();
    }

    initializeTradeGoods() {
        let e: Settlement, u: Settlement;
        for (const s of this.motherSettlements) {
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

    get motherSettlements() {
        return this.clusters.map(c => c.mother);
    }

    get allSettlements() {
        return this.clusters.flatMap(c => c.settlements);
    }

    preAdvance() {
        // Decisions can depend on perceptions, so we'll initialize them first,
        // but then update after pre-advancing state.
        this.updatePerceptions();

        for (const s of this.motherSettlements) {
            const snapshot = new Map(s.clans.map(clan => [clan, clan.economicPolicy]));
            const slippage = s.clans.slippage;
            for (const clan of s.clans) {
                clan.tenure = 1;
                clan.chooseEconomicPolicy(snapshot, slippage);
            }
            s.clans.produce();
            s.clans.distribute();

            // Selecting ritual options creates notification noise and isn't necessary here.
            s.advanceRites(false);
        }

        this.updatePerceptions();

        this.timeline.push(new TimePoint(this));
        this.notify();
    }

    advance() {
        // Main advance phase.
        for (const cl of this.clusters) {
            cl.advance();
        }
        this.emigrate();

        this.updatePerceptions();

        // Update timeline.
        this.year.advance(this.yearsPerTurn);
        this.timeline.push(new TimePoint(this));
        this.addNote('$vr$', `Year ${this.year.toString()} begins.`);

        // Notify observers.
        this.notify();
    }

    emigrate() {
        // People may move from a place with QoL issues to a better place.
        // More than one group may want to move to the same place, but
        // they wouldn't want to crowd in, so we'll have to see who gets
        // to move first.

        if (this.allSettlements.length < 2) return;

        for (const clan of shuffled(this.allClans)) {
            const inertia = clan.traits.has(PersonalityTraits.MOBILE) 
                ? 0
                : clan.traits.has(PersonalityTraits.SETTLED)
                ? 2
                : 1;

            const moveValue = (settlement: Settlement|'new') => {
                const newValue = settlement == 'new'
                    ? 0 : crowdingValue(clan, settlement);
                const inertiaValue = settlement == 'new'
                    ? inertia * 2 + 1 : inertia;
                const oldValue = crowdingValue(clan);
                return newValue - (oldValue + inertiaValue);
            }

            // See if there are settlements worth moving to.
            const targets: Array<Settlement|'new'> = [...this.allSettlements, 'new'];
            let [best, value] = maxbyWithValue(targets, s => moveValue(s));
            if (best == clan.settlement) continue;
            if (value <= 0) break;

            // Create a new settlement if needed.
            const isNew = best == 'new';
            if (best == 'new') {
                best = clan.cluster.foundSettlement(randomHamletName(), clan.settlement!);
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
                this.addNote(
                    '↔',
                    `Clan ${clan.name} moved from ${source.name} to ${best.name}`,
                );
            }
        }
    }

    updatePerceptions() {
        for (const cl of this.clusters) {
            cl.updatePerceptions();
        }
    }        

    get totalPopulation() {
        return sumFun(this.clusters, (cl: SettlementCluster) => cl.population);
    }

    get allClans() {
        return this.clusters.flatMap(s => s.clans);
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
