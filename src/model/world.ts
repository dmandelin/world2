import { Annals } from "./annals";
import { chooseFrom, removeAll, sumFun, dice, shuffled } from "./lib/basics";
import { Clan, randomClanColor, randomClanName } from "./people/people";
import { connectedClans, ConnectionGraph, NeighborConnection } from "./relations/connection";
import { createTrends } from "./records/trends";
import { InteractionGraph } from "./relations/interaction";
import { updateBasicInteractions } from "./relations/basicinteraction";
import { updateMutualAidInteractions } from "./relations/mutualaid";
import { isExemplarClan, log, loggingEnabled, setExemplarClanUID, setExemplarSettlementUUID } from "./lib/debug";
import { economicResult } from "./econ/economy";
import { Distribution, StockOutflow, Consumption } from "./econ/flows";
import { QualityOfLife } from "./econ/qol";
import { marry, MarriageDecisions } from "./relations/marriage";
import { MILES_PER_UNIT, SettlementCluster } from "./people/cluster";
import { migrate, planMigration, PlannedSettlement } from "./people/migration";
import { Note, type NoteEntity, type NoteTaker } from "./records/notifications";
import { Alerts, updateWorldAlerts, type AlertSpec } from "./records/alerts";
import { OffMapTradePartner, TradeGood, TradeGoods } from "./trade";
import { applyFloodCropLosses, ExtremeFlood, noteExtremeFloods, updateExtremeFloods, updateFloodLevels } from "./environment/flood";
import { Settlement } from "./people/settlement";
import { Timeline, TimePoint } from "./records/timeline";
import { WorldDTO } from "./records/dtos";
import { Year } from "./records/year";
import { type UUID } from "./records/basicdata";
import { PerceptionsGraph, updatePerceptions } from "./relations/perceptions";
import { runRituals, settleRitualEconomy, type RitualEvent } from "./rituals";
import { settleFestivalEconomy } from "./festivals";
import { propagateNews, seedInformationLevels, seedObservations, updateInformationLevels, updateObservations } from "./relations/information";
import { Conflicts } from "./relations/conflict";
import { FoodRedistributionResult, redistributeFood } from "./econ/redistribution";
import { FoodGiftsResult, shareFoodGifts } from "./econ/gifts";
import { SnapshotRecorder } from "./data/recorder";
import type { RecordingSession } from "./data/sessions";

// Sites used when generating a world. The first three are the historical
// starting configuration; beyond that we place sites at random.
const SITES: readonly (readonly [string, number, number])[] = [
    ['Eridu', 382, 378],
    ['Ur', 425, 325],
    ['Uruk', 200, 287],
    ['Larsa', 345, 305],
    ['Lagash', 470, 265],
    ['Umma', 400, 235],
    ['Shuruppak', 350, 215],
    ['Nippur', 300, 185],
    ['Adab', 335, 165],
    ['Isin', 258, 220],
    ['Bad-tibira', 393, 340],
    ['Kish', 248, 130],
];

export type WorldOptions = {
    // Number of settlements to start with (one per cluster).
    settlementCount?: number;
    // Number of clans in each starting settlement.
    clansPerSettlement?: number;
    // If set, entity snapshots are recorded into this session.
    session?: RecordingSession;
    // Skip UI-facing bookkeeping (DTO snapshots, watcher notification).
    // Used for batch data generation, where nothing is rendering.
    headless?: boolean;
};

export class World implements NoteTaker {
    readonly year = new Year();
    readonly yearsPerTurn = 1;
    readonly yearsPerTick = 1;
    plannedSettlements: PlannedSettlement[] = [];

    readonly timeline = new Timeline<TimePoint>();
    readonly trends = createTrends(this);
    // This has to be initialized before the clans because we pass it to them.
    readonly annals = new Annals(this);
    readonly notes: Note[] = [];
    readonly alerts = new Alerts();

    // New villages founded during the most recent turn, used to raise
    // foundation alerts (the planned settlements themselves are consumed and
    // cleared during migration).
    lastFoundations: { settlement: Settlement, clans: Clan[] }[] = [];

    readonly clanMap = new Map<UUID, Clan>();
    readonly connections = new ConnectionGraph();
    readonly interactions = new InteractionGraph();
    readonly conflicts = new Conflicts(this);
    readonly perceptions = new PerceptionsGraph();
    readonly clusters: SettlementCluster[];

    readonly headless: boolean;
    readonly recorder: SnapshotRecorder | undefined;

    readonly watchers = new Set<(world: World) => void>();

    beginningOfTurnSnapshot_: WorldDTO | undefined;
    endOfTurnSnapshot_: WorldDTO | undefined;
    previousEndOfTurnSnapshot_: WorldDTO | undefined;

    lastMarriageDecisions?: MarriageDecisions;
    lastFoodRedistribution?: FoodRedistributionResult;
    lastFoodGifts?: FoodGiftsResult;

    // Rituals performed this turn, across the whole world.
    rituals: RitualEvent[] = [];

    // Extreme floods that struck this turn, across the whole world.
    extremeFloods: ExtremeFlood[] = [];

    dto: WorldDTO | undefined;

    constructor(options: WorldOptions = {}) {
        this.headless = options.headless ?? false;
        this.recorder = options.session
            ? new SnapshotRecorder(options.session)
            : undefined;

        const settlementCount = options.settlementCount ?? 3;
        const clansPerSettlement = options.clansPerSettlement ?? 5;
        this.clusters = new SettlementsBuilder(this).createClusters(
            siteSpecs(settlementCount, clansPerSettlement));
    }

    addNote(shortLabel: string, message: string, tooltip?: string, entities?: NoteEntity[]) {
        this.notes.push(new Note(this.year.toString(), shortLabel, message, tooltip, entities));
    }

    // Raise an alert badge for the current turn. See records/alerts.ts.
    addAlert(spec: AlertSpec) {
        this.alerts.add(spec, this.year.value);
    }

    // Expire stale alerts and recompute state-derived ones for the current turn.
    private refreshAlerts() {
        this.alerts.pruneExpired(this.year.value);
        updateWorldAlerts(this);
    }

    clanFrom(uuid: string): Clan {
        return this.clanMap.get(uuid)!;
    }

    clansFrom(uuid1: string, uuid2: string): [Clan, Clan] {
        return [this.clanMap.get(uuid1)!, this.clanMap.get(uuid2)!];
    }

    initialize() {
        if (!this.headless) {
            setExemplarSettlementUUID(this.clusters[0].settlements[0].uuid);
            setExemplarClanUID(this.clusters[0].settlements[0].clans[0].uuid);
        }

        log('World >>> Initialize')

        this.initializeTradeGoods();

        // Snapshot the starting state before anything advances.
        this.recorder?.record(this);

        // Establish who deals with whom, then let the clans start out already
        // knowing each other, as neighbors of long standing would.
        this.planConnections();
        updateBasicInteractions(this);
        updatePerceptions(this);
        seedInformationLevels(this);
        seedObservations(this);

        // After this function, we should be able to show in the UI:
        // - End of turn state and intermediate values for the start year
        // - Change from one turn earlier
        // To get two sets of intermediate values we need to run 
        // two turns. We can put some restrictions on what happens,
        // such as not having clans migrate.

        this.runTurn(true);
        this.runTurn(true);

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
        this.refreshAlerts();
        this.notify();
    }

    initializeTradeGoods() {
        const clayFigurineSource = new OffMapTradePartner(
            'Northern artisans', [TradeGoods.ClayFigurines]);

        // The first two settlements get the starting trade goods. With the
        // default configuration those are Eridu and Ur.
        const settlements = this.allSettlements;
        if (settlements[0]) {
            this.initializeTrade(
                settlements[0],
                [TradeGoods.Cereals, TradeGoods.Fish],
                clayFigurineSource);
        }
        if (settlements[1]) {
            this.initializeTrade(
                settlements[1],
                [TradeGoods.Cereals, TradeGoods.ReedProducts],
                clayFigurineSource);
        }
    }

    initializeTrade(settlement: Settlement, localTradeGoods: TradeGood[], partner: OffMapTradePartner) {
        for (const t of localTradeGoods) {
            settlement.localTradeGoods.add(t);
        }

        if (!settlement.clans.length) return;
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

    runTurn(priming: boolean = false, ticks: number = Math.round(this.yearsPerTurn / this.yearsPerTick)) {
        for (let t = 0; t < ticks; t++) {
            this.behave(priming);
            this.advanceTick();
        }
    }

    advanceFromUserPlanningView(ticks: number = Math.round(this.yearsPerTurn / this.yearsPerTick)) {
        log('World >>> Advance from user planning view');
        for (const clan of this.allClans) clan.clearNotifications();
        log('Cleared notifications for all clans');
        this.runTurn(false, ticks);
        log('World <<< Advance from user planning view');
        this.refreshAlerts();
        this.notify();
    }

    // Advance without any UI-facing bookkeeping. Used for batch runs.
    advanceHeadless(ticks: number = Math.round(this.yearsPerTurn / this.yearsPerTick)) {
        for (const clan of this.allClans) clan.clearNotifications();
        this.runTurn(false, ticks);
    }

    // ----------------------------------------------------------------
    // Functions that carry out turn substeps

    // Have (automatic) agents make their plans.
    private behave(priming: boolean = false) {
        log('World >>> Behave');

        // Split and merge at the start so that new clans plan.
        if (!priming) {
            for (const clan of [...this.allClans]) clan.splitIfNeeded();
            log("Did splits")
        }
        // TODO - Bring back
        //this.clans.merge();
        //this.clans.prune();

        this.planConnections();
        updateBasicInteractions(this);
        updateMutualAidInteractions(this);
        // Update perceptions here so they can influence the rest of planning.
        updatePerceptions(this);
        // How much each clan knows about each other, which depends on this
        // turn's dealings and on what those dealings let them pass along.
        updateInformationLevels(this);
        // Pass along last turn's news and take a fresh look at each other, now
        // that this turn's interactions are set, so that what clans have heard
        // and noticed can inform their planning.
        propagateNews(this);
        updateObservations(this);

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

    // Advance phase (1 tick).
    private advanceTick() {
        this.advanceState();
        // TODO - Try to remove
        this.recordEndOfTurnState();
    }

    // Main advance phase: update state.
    private advanceState() {
        log('World >>> Advance');

        if (!this.headless) {
            this.beginningOfTurnSnapshot_ = new WorldDTO(this);
        }

        // Nature decides how high the rivers run. What breaks out on top of
        // that waits until the ditches for the year are dug, below.
        updateFloodLevels(this.clusters);

        // Advance for cross-cluster events.
        this.conflicts.advance();
        marry(this);
        migrate(this);

        // Advance within clusters.
        for (const cl of this.clusters) {
            for (const settlement of cl.settlements) {
                // Refound settlement if it has to move.
                settlement.refoundedAfterRiverShift = false;
                if (Math.random() <= settlement.floodLevel.riverShiftProbability()) {
                    settlement.refoundedAfterRiverShift = true;
                    settlement.foundationYear = settlement.world.year.clone();
                }

                for (const clan of settlement.clans) clan.residenceLevel.update();
            }

            // This has to happen before actual economic production
            // and distribution.
            cl.applyEffortAllocations();

            // Update disease load:
            // - After labor allocations, since those influence disease load, and we
            //   want current-turn load to reflect current-turn activity.
            // - Before production, because at some point disease will probably
            //   influence productivity.
            cl.updateDisease();

            for (const settlement of cl.settlements) {
                settlement.maintain();
            }
        }

        // Now that this year's ditches stand, see what breaks out over them.
        this.extremeFloods = updateExtremeFloods(this.clusters, this.allClans);

        // Troubles that call for a rite, and how the rites went. Settled
        // before the economy, which charges for them, and before the year's
        // deaths and quality of life, which they bear on.
        runRituals(this);

        this.advanceEconomy();

        // Advance perceptions and learnings.
        for (const cl of this.clusters) {
            for (const settlement of cl.settlements) {
                // Advance traits and seniority.
                for (const clan of settlement.clans) clan.prepareTraitChanges();
                for (const clan of settlement.clans) clan.commitTraitChanges();
                // Skill changes depend on knowing if we just moved, so seniority
                // is updated after that.
                for (const clan of settlement.clans) clan.advanceSeniority();

                const sizeBefore = settlement.effectiveResidentPopulation;
                for (const clan of settlement.clans) clan.advancePopulation();
                removeAll(settlement.clans, c => c.population === 0);

                // Tell height.
                settlement.growTell(sizeBefore);
            }

            // Prune empty settlements.
            removeAll(cl.settlements, s => s.population === 0);
        }

        // Now that the drownings are drawn, the year's floods can be written
        // up with what they actually cost.
        noteExtremeFloods(this, this.extremeFloods);

        // Advance the year.
        this.year.advance(this.yearsPerTick);

        // Update perceptions based on the end-of-turn state.
        updatePerceptions(this);

        if (!this.headless) {
            this.previousEndOfTurnSnapshot_ = this.endOfTurnSnapshot_;
            this.endOfTurnSnapshot_ = new WorldDTO(this);
        }

        // Snapshot end-of-turn state for analysis.
        this.recorder?.record(this);

        log('World <<< Advance');
    }

    advanceEconomy() {
        const allClans: Clan[] = [];
        for (const cl of this.clusters) {
            for (const settlement of cl.settlements) {
                for (const clan of settlement.clans) {
                    allClans.push(clan);
                    const r = economicResult(clan, clan.effortAllocation);
                    clan.production = r.production;
                    clan.distribution = new Distribution(clan);
                    clan.stockOutflow = new StockOutflow(clan);
                    clan.consumption = new Consumption(clan);
                    clan.stock.resetTurnStats();
                }
            }
        }

        // Whatever the flood took, it took in the field, before anyone
        // could eat it, store it, offer it, or give it away.
        applyFloodCropLosses(allClans);

        // The year's offerings and ritual fees come off the top, before
        // anything is eaten, stored, or given away.
        settleRitualEconomy(this);

        // So does what the settlement's festivals ate and poured out. Once
        // that food has changed hands, the year's festivals can be reckoned
        // up: the quality of life, health and standing that follow from them
        // are all settled below or later in the turn.
        settleFestivalEconomy(this.allSettlements);

        // Run food gift sharing before arranging consumption!
        this.lastFoodGifts = shareFoodGifts(allClans);

        // Step 1 & 2: Arrange consumption (first from production up to target food/capita, then from stock)
        for (const clan of allClans) {
            let targetAdditionalFood = Math.max(0, clan.population - clan.consumption.totalFood);

            // Consume out of production not yet distributed elsewhere
            // (Fish first, Cereals second).
            const availFish = clan.distribution.undistributed(TradeGoods.Fish);
            const fishToConsume = Math.min(availFish, targetAdditionalFood);
            if (fishToConsume > 0) {
                clan.distribution.addConsumption(TradeGoods.Fish, fishToConsume);
                clan.consumption.addProduction(TradeGoods.Fish, fishToConsume);
                targetAdditionalFood -= fishToConsume;
            }

            const availCereals = clan.distribution.undistributed(TradeGoods.Cereals);
            const cerealsToConsume = Math.min(availCereals, targetAdditionalFood);
            if (cerealsToConsume > 0) {
                clan.distribution.addConsumption(TradeGoods.Cereals, cerealsToConsume);
                clan.consumption.addProduction(TradeGoods.Cereals, cerealsToConsume);
                targetAdditionalFood -= cerealsToConsume;
            }

            // If consumption is below 1.0 per capita, consume out of stock (paying 20% retrieval cost)
            let deficit = Math.max(0, targetAdditionalFood);
            if (deficit > 1e-9) {
                for (const item of clan.stock.items) {
                    if (!item.good.isSubsistence || deficit <= 1e-9) continue;
                    const stockAvail = item.amount;
                    if (stockAvail <= 1e-9) continue;

                    const maxRetrieved = stockAvail / 1.20;
                    const retrieved = Math.min(deficit, maxRetrieved);
                    const cost = retrieved * 0.20;

                    clan.stockOutflow.addConsumption(item.good, retrieved, cost);
                    clan.consumption.addStock(item.good, retrieved);

                    deficit -= retrieved;
                }
            }
        }

        // Step 3: Redistribution among all clans
        this.redistributeFood(allClans);

        // Step 4: Any remaining Cereals from production sent to stock
        for (const clan of allClans) {
            const remainingCereals = clan.distribution.undistributed(TradeGoods.Cereals);
            if (remainingCereals > 0) {
                clan.distribution.addStock(TradeGoods.Cereals, remainingCereals);
            }
        }

        // Step 4b: Any remaining goods other than Cereals (e.g. surplus Fish,
        // which can't be stored or gifted) are wasted.
        for (const clan of allClans) {
            for (const good of clan.distribution.produced.keys()) {
                if (good === TradeGoods.Cereals) continue;
                const remaining = clan.distribution.undistributed(good);
                if (remaining > 0) {
                    clan.distribution.addWaste(good, remaining);
                }
            }
        }

        // Step 5: Record 20% storage loss from stock based on (current stock contents) + (StockOutflow)
        for (const clan of allClans) {
            for (const item of clan.stock.items) {
                const outflow = clan.stockOutflow.totalOutflow(item.good);
                const additions = clan.distribution.totalToStock(item.good);
                const baseStock = Math.max(0, item.amount - outflow + additions);
                const lossRate = item.good === TradeGoods.Cereals ? 0.20 : 1.0;
                const lossAmount = baseStock * lossRate;
                clan.stockOutflow.addLoss(item.good, lossAmount);
            }
        }

        // Step 6 & 7: Apply Distribution and StockOutflow flows to stock and compute QoL
        for (const clan of allClans) {
            for (const good of Object.values(TradeGoods)) {
                const additions = clan.distribution.totalToStock(good);
                const retrievals = clan.stockOutflow.totalToConsumption(good) + clan.stockOutflow.totalToDonated(good);
                const retrievalCost = clan.stockOutflow.totalRetrievalCost(good);
                const storageLoss = clan.stockOutflow.totalLost(good);

                const item = clan.stock.getItem(good);
                item.additions = additions;
                item.retrievals = retrievals;
                item.retrievalCost = retrievalCost;
                item.storageLoss = storageLoss;
                item.amount = Math.max(0, item.amount + additions - retrievals - retrievalCost - storageLoss);
            }

            clan.qol = QualityOfLife.from(clan.consumption);

            if (isExemplarClan(clan)) {
                console.log(`Production for ${clan.name}:`);
                console.log(clan.effortAllocation);
                console.log(clan.production);
                console.log(clan.distribution);
                console.log(clan.stockOutflow);
                console.log(clan.consumption);
                console.log(clan.qol);
            }
        }
    }

    redistributeFood(allClans: Clan[]) {
        this.lastFoodRedistribution = redistributeFood(allClans);
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
        if (this.headless) return;

        this.dto = new WorldDTO(this);

        for (const watcher of this.watchers)
            watcher(this);
    }
}

// Build the site/clan-count specs for a world of the requested size.
function siteSpecs(
    settlementCount: number,
    clansPerSettlement: number,
): [string, number, number, number][] {
    const specs: [string, number, number, number][] = [];
    for (let i = 0; i < settlementCount; i++) {
        if (i < SITES.length) {
            const [name, x, y] = SITES[i];
            specs.push([name, x, y, clansPerSettlement]);
        } else {
            specs.push([
                `Site ${i + 1}`,
                Math.round(150 + Math.random() * 350),
                Math.round(100 + Math.random() * 300),
                clansPerSettlement,
            ]);
        }
    }
    return specs;
}

class SettlementsBuilder {
    private clanNames: Set<string> = new Set();
    private clanColors: Set<string> = new Set();

    constructor(readonly world: World) { }

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
