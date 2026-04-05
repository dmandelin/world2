import { Annals } from "./annals";
import { chooseFrom, sumFun, shuffled } from "./lib/basics";
import { Clan, randomClanColor, randomClanName } from "./people/people";
import { Clans } from "./people/clans";
import { createTrends } from "./records/trends";
import { NewSettlementSupplier } from "./people/migration";
import { Note, type NoteTaker } from "./records/notifications";
import { OffMapTradePartner, TradeGood, TradeGoods } from "./trade";
import { randomFloodLevel } from "./environment/flood";
import { Settlement } from "./people/settlement";
import { MILES_PER_UNIT, SettlementCluster } from "./people/cluster";
import { Timeline, TimePoint } from "./records/timeline";
import { WorldDTO } from "./records/dtos";
import { Year } from "./records/year";
import { marry } from "./people/marriage";
import { log, loggingEnabled, setExemplarSettlementUUID } from "./lib/debug";

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
        ['Eridu', 382, 378, 3],
        ['Ur', 425, 325, 3],
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
        setExemplarSettlementUUID(this.clusters[0].mother.uuid);

        log('World >>> Initialize')
        this.addNote(
            '*',
            'First permanent settlements founded!'
        );

        // Initialize state not intialized above.
        this.initializeTradeGoods();
        // Seed initial marriage relationships.
        marry(this);

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

        // Log distances between clusters.
        if (loggingEnabled()) {
            for (let i = 0; i < this.clusters.length; i++) {
                for (let j = i + 1; j < this.clusters.length; j++) {
                    const c1 = this.clusters[i];
                    const c2 = this.clusters[j];
                    const distance = Math.sqrt((c1.mother.x - c2.mother.x) ** 2 + (c1.mother.y - c2.mother.y) ** 2);
                    log(`Distance between ${c1.mother.name} and ${c2.mother.name}: ${(MILES_PER_UNIT * distance).toFixed(2)} miles`);
                }
            }
        }
        log('World <<< Initialize')
        this.notify();
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
        log('World >>> Advance from planning view');
        this.advance();
        this.plan();
        log('World <<< Advance from planning view');
        this.notify();
    }

    // ----------------------------------------------------------------
    // Functions that carry out turn substeps

    // Let agents predict results and make choices for how to act.
    private plan(priming: boolean = false) {
        log('World >>> Plan');
        this.updateRelationships();
        this.updatePerceptions();

        for (const clan of this.allClans) {
            // Update productivity values so that planning can see them.
            clan.updateProductivity(true);

            // Don't move immediately.
            if (!priming) clan.considerMigration();
            clan.planMaintenance();
            clan.planHousing();
            clan.laborAllocation.plan(priming);
        }

        for (const settlement of this.allSettlements) {
            settlement.planMigrations();
        }

        log('World <<< Plan');
    }

    private advance(noEffect: boolean = false) {
        log('World >>> Advance');

        // Nature
        const floodLevel = randomFloodLevel();
        for (const cluster of this.clusters) {
            cluster.updateFloodLevel(floodLevel);
            cluster.updateDisease();
        }

        for (const settlement of this.allSettlements) {
            settlement.recordBeginningOfTurnSnapshot();
        }
        for (const clan of this.allClans) {
            clan.recordBeginningOfTurnSnapshot();
        }

        // Main advance phase.
        if (!noEffect) {
            this.migrate();
            marry(this);
        }

        for (const cl of this.clusters) {
            cl.advance(noEffect);
        }

        // Update timeline.
        if (!noEffect) {
            this.year.advance(this.yearsPerTurn);

            this.timeline.add(this.year, new TimePoint(this));
            for (const settlement of this.allSettlements) {
                settlement.addTimePoint();
            }

            for (const trend of this.trends) trend.update(this.year);
            this.addNote('$vr$', `Year ${this.year.toString()} begins.`);
        }

        for (const settlement of this.allSettlements) {
            settlement.addTimePoint();
            settlement.recordEndOfTurnSnapshot();
        }
        for (const clan of this.allClans) {
            clan.recordEndOfTurnSnapshot();
        }

        log('World <<< Advance');
    }

    migrate() {
        const nss = new NewSettlementSupplier();
        for (const clan of shuffled(this.allClans)) {
            clan.advanceMigration(nss);
        }
    }

    updateRelationships() {
        for (const clan of this.allClans) {
            clan.relationships.update();
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
