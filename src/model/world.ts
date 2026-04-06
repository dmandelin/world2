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
import { registerClanEndOfTurnSnapshot } from "./records/snapreg";

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

    dto: WorldDTO|undefined;

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

        // Capture this state as the first point in the timeline.
        this.recordEndOfTurnState();

        // Run an initial turn so that there is state for all the output
        // variables but don't apply the effects that mutate clans.
        this.behave(true);
        this.advance();
        for (const cluster of this.clusters) {
            // This depends on labor actually allocated to production nodes
            // so we have to run it after the first production call.
            cluster.updateDisease();
        }

        for (const trend of this.trends) trend.initialize(this.year);

        // Run planning because we're about to activate planning view.
        this.behave(true);

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

    // The Logical Turn
    //
    // The simulation runs a sequence of turns, each of which represents
    // a time window in the world. Each turn has two main aspects, planning
    // and advancing.
    //
    // - Planning
    //   - Agents collect and process information, and make decisions 
    //     about how to act.
    //   - The world state does not change due to planning.
    //
    // - Advancing
    //   - World state changes:
    //     - (Variables: 
    //          S0 = start of turn state,
    //          P = plans made by agents, 
    //          IV = intermediate values,
    //          S1 = end of turn state)
    //     - Intermediate values such as farming productivity are calculated
    //       as functions of (S0, P, IV). This includes flows.
    //     - End-of-turn states such as happiness and population are
    //       calculated as functions of (S0, P, IV).
    //   - Plans do not change due to advancing.
    //   - It *could* actually be valid to update IVs during planning, as
    //     "what-if" views. We could even have IVs that represent a tenative
    //     value of an output stock. It's only state that can't change
    //     during planning.
    //
    // Note that these "aspects" aren't phases: time and control flow
    // are are a little more complicated and explained below.
    //
    // Note that agent *evaluations* are considered part of end-of-turn state,
    // because intuitively we want things like happiness and prestige to be
    // *results of our actions*, and to be able to answer questions such as,
    // did agents get what they aimed at? Another way to look at this is that
    // learning is a slow background process, and thus agent values that have
    // to do with learning must be part of advancing-aspect values. However,
    // it is logical and meaningful to capture a value for agent perceptions
    // of the current situation that affect planning during planning as well.
    //
    // At any given time, control flow is either running (advancing state
    // or planning automatically) or waiting on the user. A point where
    // we let the user act is called a "view". The usual views are:
    //
    // *    Planning view. Part of the planning aspect. Automatic
    //      planning can make place before (initial plan user can adjust),
    //      during (invoked as a tool by the user), and/or after (automatic
    //      detailing of user instructions) planning view is shown.
    // *    Review. Omits next-turn planning information, making it easier 
    //      to see how previous-turn plans related to previous-turn outcomes. 
    //      Note that since nothing changes during this view, the data for it 
    //      can be taken as a snapshot and then it can be shown at any time.
    //
    // One more point is that the primary concept is a simulation, with
    // automated agents that have realistic behaviors. However, we could
    // use all this with a UI that gives a human user full control over
    // one or more agents, in which case the entire planning aspect would
    // be in the UI. So we'll distinguish between different kinds of
    // planning activity, with plain "planning" referring to the entire aspect.
    //
    // The sequential phases making up a turn are:
    //
    // 1.   Behave: Agents make decisions based on simulated motivations.
    // 2.   User Plan: Show planning view to the human user.
    //      *    There might be tools where the user can invoke some 
    //           automated planning while staying in this view.
    //      *    There could be a subphase or phase after this where user
    //           plans are automatically refined and detailed, but we
    //           don't need that yet.
    // 3.   Advance: World computes intermediate values and end-of-turn state.
    //      *    There's a subphase at the start where nature "plans".
    //           This works for now but there are other valid choices.

    // ----------------------------------------------------------------
    // Action handlers to trigger turn substeps

    advanceFromUserPlanningView() {
        log('World >>> Advance from user planning view');
        this.advance();
        this.behave();
        log('World <<< Advance from user planning view');
        this.notify();
    }

    // ----------------------------------------------------------------
    // Functions that carry out turn substeps

    // Have (automatic) agents make their plans.
    private behave(priming: boolean = false) {
        log('World >>> Behave');

        // Update perceptions to base decisions on.
        // TODO - See if we need this or if this all would have happened
        //        during advance.
        this.updateRelationships();
        this.updatePerceptions();

        // Make decisions.
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

        log('World <<< Behave');
    }

    // Advance phase.
    private advance() {
        this.advanceState();
        this.recordEndOfTurnState();
    }

    // Main advance phase: update state.
    private advanceState() {
        log('World >>> Advance');

        // Nature decides.
        const floodLevel = randomFloodLevel();
        for (const cluster of this.clusters) {
            cluster.updateFloodLevel(floodLevel);
            cluster.updateDisease();
        }

        // TODO - See if we actually need these
        for (const settlement of this.allSettlements) {
            settlement.recordBeginningOfTurnSnapshot();
        }

        // Advance for cross-cluster events.
        this.migrate();
        marry(this);

        // Advance within clusters.
        for (const cl of this.clusters) {
            cl.advance();
        }
        // Advance the year.
        this.year.advance(this.yearsPerTurn);

        log('World <<< Advance');
    }

    recordEndOfTurnState() {
        // Update timeline.
        // TODO - Combine this with newer logging.
        this.timeline.add(this.year, new TimePoint(this));
        for (const settlement of this.allSettlements) {
            settlement.addTimePoint();
        }

        for (const trend of this.trends) trend.update(this.year);
        this.addNote('$vr$', `Year ${this.year.toString()} begins.`);

        for (const settlement of this.allSettlements) {
            // TODO - Combine this with newer logging.
            settlement.addTimePoint();
            settlement.recordEndOfTurnSnapshot();
            for (const clan of settlement.endOfTurnSnapshot!.clans) {
                registerClanEndOfTurnSnapshot(clan);
            }
        }
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
