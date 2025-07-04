import { Annals } from "./annals";
import { Clan, randomClanColor, randomClanName } from "./people/people";
import { Clans } from "./people/clans";
import { chooseFrom, sumFun, shuffled } from "./lib/basics";
import { Settlement } from "./people/settlement";
import { Timeline, TimePoint } from "./timeline";
import { TradeGood, TradeGoods } from "./trade";
import { WorldDTO } from "../components/dtos";
import { Year } from "./year";
import { Note, type NoteTaker } from "./notifications";
import { SettlementCluster } from "./people/cluster";
import { NewSettlementSupplier } from "./people/migration";
import { randomFloodLevel } from "./flood";

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

        const settlement = new Settlement(this.world, name, x, y, undefined, new Clans(this.world, ...clans));
        const cluster = new SettlementCluster(this.world, settlement);
        return cluster;
    }

    createClusters(params: readonly [string, number, number, number][]) {
        return params.map(([name, x, y, clanCount]) => 
            this.createCluster(name, x, y, clanCount));
    }
}

// State in the turn substep state machine. A state is a stable point
// where we can show data in the UI.
enum TurnState {
    // See plans and predictions made by the entities, possibly alter 
    // them.
    Planning,
    // See results of executing the previous turn.
    Reviewing,
}

export class World implements NoteTaker {
    private turnState = TurnState.Planning;

    readonly year = new Year();
    readonly yearsPerTurn = 20;

    readonly timeline = new Timeline<TimePoint>();
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

    get nowPlanning() { return this.turnState === TurnState.Planning; }
    get nowReviewing() { return this.turnState === TurnState.Reviewing; }

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

    // ----------------------------------------------------------------
    // Action handlers to trigger turn substeps

    advanceFromPlanningView() {
        console.log('[World] Advance from planning view.');
        this.advance();
        this.plan();
    }

    // ----------------------------------------------------------------
    // Functions that carry out turn substeps

    // Let agents predict results and make choices for how to act.
    private plan() {
        console.log('[World]   Planning.');

        for (const clan of this.allClans) {
            clan.planMigration();
            clan.planMaintenance();
            clan.planHousing();
        }

        // Notify observers.
        this.notify();
    }

    private preAdvance() {
        // Decisions can depend on perceptions, so we'll initialize them 
        // first, but then update after pre-advancing state.
        this.updatePerceptions();

        for (const s of this.motherSettlements) {
            const snapshot = new Map(s.clans.map(clan => [clan, clan.economicPolicy]));
            const slippage = s.clans.slippage;
            for (const clan of s.clans) {
                clan.seniority = 2;
                clan.updateProductivity();
                // For now, start with default economic policies, but do make the
                // decision on construction.
                clan.planHousing();
                clan.planMaintenance();
            }
            s.maintain();
            s.clans.produce();
            s.clans.distribute();

            // Selecting ritual options creates notification noise and isn't necessary here.
            s.advanceRites(false);

            s.clans.consume();
        }

        this.updatePerceptions();

        this.timeline.add(this.year, new TimePoint(this));
        this.notify();
    }

    private advance() {
        // Nature
        const floodLevel = randomFloodLevel();
        for (const cluster of this.clusters) {
            cluster.updateFloodLevel(floodLevel);
        }

        // Main advance phase.
        this.migrate();
        for (const cl of this.clusters) {
            cl.advance();
        }

        this.updatePerceptions();

        // Update timeline.
        this.year.advance(this.yearsPerTurn);
        this.timeline.add(this.year, new TimePoint(this));
        this.addNote('$vr$', `Year ${this.year.toString()} begins.`);

        // Notify observers.
        this.notify();
    }

    migrate() {
        const nss = new NewSettlementSupplier();
        for (const clan of shuffled(this.allClans)) {
            clan.advanceMigration(nss);
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

    get motherSettlements() {
        return this.clusters.map(c => c.mother);
    }

    get allSettlements() {
        return this.clusters.flatMap(c => c.settlements);
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
