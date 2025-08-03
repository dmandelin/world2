import { Annals } from "./annals";
import { Clan, randomClanColor, randomClanName } from "./people/people";
import { Clans } from "./people/clans";
import { chooseFrom, sumFun, shuffled } from "./lib/basics";
import { Settlement } from "./people/settlement";
import { Timeline, TimePoint } from "./records/timeline";
import { OffMapTradePartner, TradeGood, TradeGoods } from "./trade";
import { WorldDTO } from "../components/dtos";
import { Year } from "./records/year";
import { Note, type NoteTaker } from "./records/notifications";
import { SettlementCluster } from "./people/cluster";
import { NewSettlementSupplier } from "./people/migration";
import { randomFloodLevel } from "./environment/flood";
import { createTrends } from "./records/trends";

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
    readonly trends = createTrends(this);
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

        // Initialize state not intialized above
        this.initializeTradeGoods();

        // Run an initial turn so that there is state for all the output
        // variables but don't apply the effects that mutate clans.
        this.plan(true);
        this.advance(true);
        for (const cluster of this.clusters) {
            // This depends on labor actually allocated to production nodes
            // so we have to run it after the first production call.
            cluster.updateDisease();
        }

        // Capture this state as the first point in the timeline.
        this.timeline.add(this.year, new TimePoint(this));
        for (const trend of this.trends) trend.initialize(this.year);

        // Run planning because we're about to activate planning view.
        this.plan(true);
    }

    initializeTradeGoods() {
        let e: Settlement, u: Settlement;
        const clayFigurineSource = new OffMapTradePartner(
            'Northern artisans', [TradeGoods.ClayFigurines]);

        this.initializeTrade(
            this.motherSettlements.find(s => s.name === 'Eridu')!,
            [TradeGoods.Cereals, TradeGoods.Fish],
            clayFigurineSource);
        this.initializeTrade(
            this.motherSettlements.find(s => s.name === 'Ur')!,
            [TradeGoods.Cereals, TradeGoods.ReedProducts],
            clayFigurineSource);
    }

    initializeTrade(settlement: Settlement, localTradeGoods: TradeGood[], partner: OffMapTradePartner) {
        for (const t of localTradeGoods) {
            settlement.localTradeGoods.add(t);
        }

        const clan = chooseFrom(settlement.clans);
        const relationship = clan.addTradeRelationship(partner);
        relationship.addExchange(clan, [...clan.tradeGoods][0], partner.tradeGoods[0]);
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
    private plan(priming: boolean = false) {
        console.log('[World]   Planning.');

        this.updatePerceptions();

        for (const clan of this.allClans) {
            // Update productivity values so that planning can see them.
            clan.updateProductivity();

            // Don't move immediately.
            if (!priming) clan.planMigration();
            clan.planMaintenance();
            clan.planHousing();
            clan.laborAllocation.plan();
        }

        // Notify observers.
        this.notify();
    }

    private advance(noEffect: boolean = false) {
        // Nature
        const floodLevel = randomFloodLevel();
        for (const cluster of this.clusters) {
            cluster.updateFloodLevel(floodLevel);
            cluster.updateDisease();
        }

        // Main advance phase.
        if (!noEffect) this.migrate();
        for (const cl of this.clusters) {
            cl.advance(noEffect);
        }

        // Update timeline.
        if (!noEffect) {
            this.year.advance(this.yearsPerTurn);
            this.timeline.add(this.year, new TimePoint(this));
            for (const trend of this.trends) trend.update(this.year);
            this.addNote('$vr$', `Year ${this.year.toString()} begins.`);
        }

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
