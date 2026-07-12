import { Annals } from "./annals";
import { chooseFrom, sumFun, dice } from "./lib/basics";
import { Clan, randomClanColor, randomClanName } from "./people/people";
import { connectedClans, ConnectionGraph, NeighborConnection } from "./relations/connection";
import { createTrends } from "./records/trends";
import { InteractionGraph, updateBasicInteractions } from "./relations/interaction";
import { log, loggingEnabled, setExemplarClanUID, setExemplarSettlementUUID } from "./lib/debug";
import { marry } from "./relations/marriage";
import { MILES_PER_UNIT, SettlementCluster } from "./people/cluster";
import { migrate, planMigration, PlannedSettlement } from "./people/migration";
import { Note, type NoteTaker } from "./records/notifications";
import { OffMapTradePartner, TradeGood, TradeGoods } from "./trade";
import { randomFloodLevel } from "./environment/flood";
import { Settlement } from "./people/settlement";
import { Timeline, TimePoint } from "./records/timeline";
import { WorldDTO } from "./records/dtos";
import { Year } from "./records/year";
import { splitPairID, type UUID } from "./records/basicdata";
import { PerceptionsGraph, updatePerceptions } from "./relations/perceptions";
import { Conflicts } from "./relations/conflict";

export class World implements NoteTaker {
    readonly year = new Year();
    readonly yearsPerTurn = 20;
    plannedSettlements: PlannedSettlement[] = [];

    readonly timeline = new Timeline<TimePoint>();
    readonly trends = createTrends(this);
    // This has to be initialized before the clans because we pass it to them.
    readonly annals = new Annals(this);
    readonly notes: Note[] = [];

    readonly clanMap = new Map<UUID, Clan>();
    readonly connections = new ConnectionGraph();
    readonly interactions = new InteractionGraph();
    readonly conflicts = new Conflicts(this);
    readonly perceptions = new PerceptionsGraph();
    readonly clusters = new SettlementsBuilder(this).createClusters([
        ['Eridu', 382, 378, 5],
        ['Ur', 425, 325, 5],
        ['Uruk', 200, 287, 5],
    ]);

    readonly watchers = new Set<(world: World) => void>();

    beginningOfTurnSnapshot_: WorldDTO|undefined;
    endOfTurnSnapshot_: WorldDTO|undefined;
    previousEndOfTurnSnapshot_: WorldDTO|undefined;

    dto: WorldDTO|undefined;

    constructor() {
    }

    addNote(shortLabel: string, message: string) {
        this.notes.push(new Note(this.year.toString(), shortLabel, message));
    }

    clansFromPairID(pairID: string): [Clan, Clan] {
        return splitPairID(pairID).map(uuid => this.clanMap.get(uuid)!) as [Clan, Clan];
    }

    initialize() {
        setExemplarSettlementUUID(this.clusters[0].settlements[0].uuid);
        setExemplarClanUID(this.clusters[0].settlements[0].clans[0].uuid);

        log('World >>> Initialize')

        this.initializeTradeGoods();

        // After this function, we should be able to show in the UI:
        // - End of turn state and intermediate values for the start year
        // - Change from one turn earlier
        // To get two sets of intermediate values we need to run 
        // two turns. We can put some restrictions on what happens,
        // such as not having clans migrate.

        this.behave(true);
        this.advance();
        this.behave(true);
        this.advance();

        // Run planning because we're about to activate planning view.
        this.behave(true);

        // Log distances between clusters.
        if (loggingEnabled()) {
            for (let i = 0; i < this.clusters.length; i++) {
                for (let j = i + 1; j < this.clusters.length; j++) {
                    const c1 = this.clusters[i];
                    const c2 = this.clusters[j];
                    const distance = Math.sqrt((c1.x - c2.x) ** 2 + (c1.y - c2.y) ** 2);
                    log(`Distance between ${c1.name} and ${c2.name}: ${(MILES_PER_UNIT * distance).toFixed(2)} miles`);
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
            this.allSettlements.find(s => s.name === 'Eridu')!,
            [TradeGoods.Cereals, TradeGoods.Fish],
            clayFigurineSource);
        this.initializeTrade(
            this.allSettlements.find(s => s.name === 'Ur')!,
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
    //      *    Special case: Clans split and merge at the start of the
    //           behave phase, so that they can otherwise participate in
    //           the turn completely as normal. In theory this could be
    //           an action during the advance phase, but then it gets very
    //           hard to clearly report clan results. Another option is to
    //           have a separate split/merge phase, but that's too much
    //           clicking just for splits and merges. This special case is
    //           equivalent to squashing a post-advance split phase into
    //           the following behave phase.
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
        for (const clan of this.allClans) clan.clearNotifications();
        console.log('Cleared notifications for all clans');
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

        // Split and merge at the start so that new clans plan.
        if (!priming) {
            for (const clan of [...this.allClans]) clan.splitIfNeeded();
            console.log("Did splits")
        }
        // TODO - Bring back
        //this.clans.merge();
        //this.clans.prune();

        this.planConnections();
        updateBasicInteractions(this);
        // Update perceptions here so they can influence the rest of planning.
        updatePerceptions(this);

        this.planMutualHelp();

        // Make decisions.
        if (!priming) {
            planMigration(this);
        }
        for (const clan of this.allClans) {
            clan.planMaintenance();
            clan.planHousing();
        }

        log('World <<< Behave');
    }

    // Advance phase.
    private advance() {
        this.advanceState();
        // TODO - Try to remove
        this.recordEndOfTurnState();
    }

    // Main advance phase: update state.
    private advanceState() {
        log('World >>> Advance');

        this.beginningOfTurnSnapshot_ = new WorldDTO(this);

        // Nature decides.
        const floodLevel = randomFloodLevel();
        for (const cluster of this.clusters) {
            cluster.updateFloodLevel(floodLevel);
        }

        // Advance for cross-cluster events.
        this.conflicts.advance();
        marry(this);
        migrate(this);

        // Advance within clusters.
        for (const cl of this.clusters) {
            cl.advance();
        }
        // Advance the year.
        this.year.advance(this.yearsPerTurn);

        // Update perceptions based on the end-of-turn state.
        updatePerceptions(this);

        this.previousEndOfTurnSnapshot_ = this.endOfTurnSnapshot_;
        this.endOfTurnSnapshot_ = new WorldDTO(this);

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
        }
    }


    planConnections() {
        // Make everyone a neighbor of everyone else in the same settlement.
        this.connections.keepOnlyForType(
            (c1, c2, connection) => c1.settlement === c2.settlement,
            NeighborConnection,
            this,
        );
        for (const settlement of this.allSettlements) {
            for (const c1 of settlement.clans) {
                for (const c2 of settlement.clans) {
                    if (c1.uuid >= c2.uuid) continue;
                    this.connections.getOrCreate(c1, c2, NeighborConnection);
                }
            }
        }
    }

    planMutualHelp() {
        // For now, it's all within-settlement, but this may change, so the
        // code will leave here for now.

        const helpLimit = 0.1;
        for (const settlement of this.allSettlements) {
            this.planMutualHelpForSettlement(settlement, helpLimit);
        }
    }

    planMutualHelpForSettlement(settlement: Settlement, helpLimit: number) {
        // Simplest algorithm: everyone offers equal amounts of help up to the
        // limit to everyone have a relationship with in the same settlement.
        // Each pair then sends each other the min of their offers.
        for (const c1 of settlement.clans) {
            c1.helpAllocation.clear();
            const recipients = [...connectedClans(c1)]
                .filter(c2 => c1.settlement === c2.settlement);
            if (recipients.length === 0) continue;
            const offer = helpLimit / recipients.length;
            for (const c2 of recipients) {
                c1.helpAllocation.set(c2, offer);
            }
        }

        for (const c1 of settlement.clans) {
            for (const [c2, c1OfferToC2] of c1.helpAllocation) {
                if (c1.uuid >= c2.uuid) continue; // Process each pair only once.
                const c2OfferToC1 = c2.helpAllocation.get(c1) ?? 0;
                const matchedAmount = Math.min(c1.population * c1OfferToC2, c2.population * c2OfferToC1);
                c1.helpAllocation.set(c2, c1.population > 0 ? matchedAmount / c1.population : 0);
                c2.helpAllocation.set(c1, c2.population > 0 ? matchedAmount / c2.population : 0);
            }
        }
    }

    get totalPopulation() {
        return sumFun(this.clusters, (cl: SettlementCluster) => cl.population);
    }

    get allSettlements() {
        return this.clusters.flatMap(c => c.settlements);
    }

    get allClans() {
        return this.clusters.flatMap(s => s.clans);
    }

    get beginningOfTurnSnapshot() {
        return this.beginningOfTurnSnapshot_;
    }

    get endOfTurnSnapshot() {
        return this.endOfTurnSnapshot_;
    }

    get previousEndOfTurnSnapshot() {
        return this.previousEndOfTurnSnapshot_;
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

class SettlementsBuilder {
    private clanNames: Set<string> = new Set();
    private clanColors: Set<string> = new Set();

    constructor(readonly world: World) {}

    createCluster(name: string, x: number, y: number, clanCount: number) {
        const cluster = new SettlementCluster(name, x, y);
        const settlement = new Settlement(this.world, name, x, y, cluster);

        for (let i = 0; i < clanCount; i++) {
            const clan = new Clan(
                this.world,
                settlement,
                this.world.annals,
                randomClanName(this.clanNames), 
                randomClanColor(this.clanColors),
                dice(3, 6, 15));
            this.clanNames.add(clan.name);
            this.clanColors.add(clan.color);
        }

        return cluster;
    }

    createClusters(params: readonly [string, number, number, number][]) {
        return params.map(([name, x, y, clanCount]) => 
            this.createCluster(name, x, y, clanCount));
    }
}

export const world = new World();
world.initialize();
