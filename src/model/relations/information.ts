import { clamp, sumFun } from "../lib/basics";
import type { Clan } from "../people/people";
import type { Connection } from "./connection";
import type { Interaction } from "./interaction";
import { BasicInteraction, getRelativeAttention } from "./basicinteraction";
import { pct } from "../lib/format";
import { normal } from "../lib/distributions";
import type { UUID } from "../records/basicdata";
import type { World } from "../world";

// What one clan knows about another comes in two flavors:
//
// - *Memory*: a ledger of events the clan experienced or heard about, each
//   fading with time. Events are discrete and additive, so multiple reports
//   of different events all belong in the ledger; we don't (yet) worry about
//   two reports of the *same* event conflicting.
// - *Observations*: running estimates of the other clan's state (population,
//   traits, skills, QoL...). State is not additive, so incoming evidence has
//   to be integrated with what's already believed, and an estimate carries a
//   confidence saying how much to trust it.
//
// Both are per directed pair: this is what the subject clan believes about
// the object clan, which may differ from what any other clan believes.

// ---------------------------------------------------------------------------
// Memory: the event ledger.
// ---------------------------------------------------------------------------

// A kind of event clans remember about each other. The definition carries the
// parameters that govern how the event fades and how well news of it travels;
// individual events carry their own size.
export class MemoryEventDef {
    constructor(
        readonly key: string,
        readonly label: string,
        // Years for a remembered event's weight to halve.
        readonly halfLife: number,
        // How far news of this kind carries beyond the base rate set by
        // attention. See MemoryEntry.transmissionChance for what the number
        // means; it is multiplied by the individual event's salience, so a
        // kind with high reach still travels no further than its small
        // instances deserve.
        readonly newsReach: number,
        // Salience at or above which an event is unforgettable: when a clan
        // splits, both successors carry it off, however the people divided.
        readonly unforgettableSalience: number,
    ) { }
}

// Starter set; more will be added as event sources are moved over to the
// ledger (rituals, construction, ...).
export const MemoryEventDefs = {
    Gift: new MemoryEventDef('gift', 'Gift', 10, 2, 0.25),
    Aid: new MemoryEventDef('aid', 'Aid', 20, 5, 0.25),
    Conflict: new MemoryEventDef('conflict', 'Conflict', 20, 7, 0.2),
};

// One event is one event, however many clans end up holding a copy of it and
// however garbled those copies get. Copies share an id so that views (and,
// later, clans integrating conflicting reports) can tell one event told twice
// from two events.
let nextEventId = 1;

// One remembered event. Immutable: what a clan believes about an event it has
// already filed away doesn't change, it only fades.
export class MemoryEntry {
    constructor(
        readonly def: MemoryEventDef,
        // Year the event happened (as believed by the rememberer).
        readonly year: number,
        // Clan that acted. Usually the object of these perceptions, but for
        // news heard about it may be a third party.
        readonly actor: UUID,
        // Clan acted upon, if any.
        readonly target: UUID | undefined,
        // Size of the event in its own natural units (e.g. food given).
        readonly magnitude: number,
        // How striking the event was, on a scale where 1 is "a big deal of
        // its kind". Set by whatever recorded the event, since only it knows
        // what counts as big for its kind, and not capped: a truly enormous
        // event should be able to say so.
        readonly salience: number,
        // Links the news crossed to get here. 0 means witnessed or
        // experienced directly.
        readonly hops: number,
        // Clan we heard it from, if we didn't see it ourselves.
        readonly via: UUID | undefined,
        readonly explanation: string = '',
        // Shared by every copy of the same underlying event.
        readonly eventId: number = nextEventId++,
    ) { }

    // Fraction of the original impression still remaining in the given year.
    freshness(year: number): number {
        const age = Math.max(0, year - this.year);
        return Math.pow(0.5, age / this.def.halfLife);
    }

    // Magnitude as it currently weighs on the rememberer.
    weight(year: number): number {
        return this.magnitude * this.freshness(year);
    }

    // Chance that a clan paying this much attention to someone who knows of
    // this event picks it up from them.
    //
    // The shape is 1 - (1 - attention)^(1 + reach), which gives us what we
    // want at both ends. For a forgettable event reach is ~0 and the chance is
    // just the attention: half an eye on a neighbor means half their small
    // news. As the event gets bigger the exponent climbs and the chance runs
    // to 1, so a clan that gives away two days' food per head is talked about
    // even by those barely paying attention. Full attention hears everything,
    // and no attention hears nothing, at any size.
    transmissionChance(attention: number): number {
        if (attention <= 0) return 0;
        if (attention >= 1) return 1;
        const reach = this.def.newsReach * Math.max(0, this.salience);
        return 1 - Math.pow(1 - attention, 1 + reach);
    }

    // This event as the hearer files it: same event, one more link away.
    retold(via: UUID): MemoryEntry {
        return new MemoryEntry(
            this.def, this.year, this.actor, this.target, this.magnitude,
            this.salience, this.hops + 1, via, this.explanation, this.eventId);
    }
}

// One clan's ledger of events involving another.
export class Memory {
    private entries_: MemoryEntry[] = [];

    get entries(): readonly MemoryEntry[] { return this.entries_; }

    add(entry: MemoryEntry): void {
        this.entries_.push(entry);
    }

    entriesOf(def: MemoryEventDef): MemoryEntry[] {
        return this.entries_.filter(e => e.def === def);
    }

    // Decayed total magnitude of events of a kind, the usual way evaluative
    // code will consume the ledger.
    weightOf(def: MemoryEventDef, year: number): number {
        return sumFun(this.entriesOf(def), e => e.weight(year));
    }

    // Drop entries that have faded past usefulness, so the ledger doesn't
    // grow without bound.
    static readonly FORGET_THRESHOLD = 0.01;

    forget(year: number): void {
        this.entries_ = this.entries_.filter(
            e => e.freshness(year) >= Memory.FORGET_THRESHOLD);
    }

    keepOnly(predicate: (entry: MemoryEntry) => boolean): void {
        this.entries_ = this.entries_.filter(predicate);
    }

    clone(): Memory {
        const m = new Memory();
        // Entries are immutable, so sharing them is fine.
        m.entries_ = [...this.entries_];
        return m;
    }
}

// ---------------------------------------------------------------------------
// Observations: state tracking.
// ---------------------------------------------------------------------------

// How an impression of one quantity forms and spreads. The estimate is a
// running average of yearly impressions, so two numbers set the accuracy: how
// blurred a single year's look is, and how much of it is folded in. A look of
// spread S folded in at weight w settles at an error of S·√(w/(2-w)), which is
// how a clan can start out with only a rough idea and sharpen it over years of
// acquaintance without ever seeing more clearly in one year than it should.
export type ObservationSpec = {
    // Value assumed about a clan we know nothing about.
    prior: number;
    // Spread of a single year's impression at full attention. Less attention
    // blurs it further, as the square of the shortfall.
    lookStdev: number;
    // How much a year's impression at full attention moves the estimate, and
    // so also how fast confidence builds.
    lookWeight: number;
    // Attention below which the quantity goes unremarked entirely, unless the
    // value itself is conspicuous.
    attentionThreshold: number;
    // A value this high gets noticed however little attention is being paid.
    conspicuousAbove: number;
    // Share of the attention paid to a clan that gets spent discussing this
    // quality of it. At 1, even an unremarkable value comes up about as often
    // as the clan is attended to at all; qualities that simply don't come up
    // in conversation get less.
    chatter: number;
    // How far from the prior a value has to be to be worth mentioning for its
    // own sake. At this far it starts travelling on its own merits; at twice
    // this far it travels regardless of who is being discussed.
    notableDeviation: number;
    // Years for confidence in an unrefreshed estimate to halve.
    staleHalfLife: number;
    // What clans already know of each other when the world opens, on the
    // understanding that they have been neighbors for some time by then.
    seedStdev: number;
    seedConfidence: number;
    // What a split costs each successor's impressions. The people are the
    // same, but the ones who knew best may have gone the other way, so both
    // sides come away with a blurrier idea, held less firmly.
    splitStdev: number;
    splitConfidenceFactor: number;
    // Range the quantity can take. Observers never perceive a value outside
    // it, however badly they misjudge, so blurred looks are held to it.
    min?: number;
    max?: number;
};

// A quantity clans form impressions of about each other.
export class ObservationDef {
    readonly prior: number;
    readonly lookStdev: number;
    readonly lookWeight: number;
    readonly attentionThreshold: number;
    readonly conspicuousAbove: number;
    readonly chatter: number;
    readonly notableDeviation: number;
    readonly staleHalfLife: number;
    readonly seedStdev: number;
    readonly seedConfidence: number;
    readonly splitStdev: number;
    readonly splitConfidenceFactor: number;
    readonly min: number;
    readonly max: number;

    constructor(
        readonly key: string,
        readonly label: string,
        // The truth of the matter, which observers only ever see blurred.
        readonly valueFn: (clan: Clan) => number,
        spec: ObservationSpec,
    ) {
        this.prior = spec.prior;
        this.lookStdev = spec.lookStdev;
        this.lookWeight = spec.lookWeight;
        this.attentionThreshold = spec.attentionThreshold;
        this.conspicuousAbove = spec.conspicuousAbove;
        this.chatter = spec.chatter;
        this.notableDeviation = spec.notableDeviation;
        this.staleHalfLife = spec.staleHalfLife;
        this.seedStdev = spec.seedStdev;
        this.seedConfidence = spec.seedConfidence;
        this.splitStdev = spec.splitStdev;
        this.splitConfidenceFactor = spec.splitConfidenceFactor;
        this.min = spec.min ?? -Infinity;
        this.max = spec.max ?? Infinity;
    }

    // A blurred value as it would actually be perceived: nobody reads a clan's
    // piety as 121, however poor a look they got.
    perceivable(value: number): number {
        return clamp(value, this.min, this.max);
    }

    // Spread of a year's impression at this much attention.
    lookStdevAt(attention: number): number {
        return this.lookStdev / (attention * attention);
    }

    // Whether the quantity registers at all at this much attention.
    registers(attention: number, trueValue: number): boolean {
        return attention >= this.attentionThreshold
            || trueValue >= this.conspicuousAbove;
    }

    // Chance that a clan's impression of this quality comes up in a
    // conversation and gets passed along.
    //
    // Two ways it can surface. A quality of a clan one deals with regularly
    // comes up simply because that clan is on one's mind, at a rate set by how
    // much attention it gets and how interesting the quality is to talk about.
    // Separately, a value far enough from the ordinary is worth mentioning for
    // its own sake, whoever it is about — which is what lets a striking fact
    // travel even from someone who has since lost touch with the subject.
    transmissionChance(attentionToSubject: number, value: number): number {
        const routine = clamp(this.chatter * attentionToSubject, 0, 1);
        const striking = clamp(
            (Math.abs(value - this.prior) - this.notableDeviation)
            / this.notableDeviation,
            0, 1);
        return 1 - (1 - routine) * (1 - striking);
    }
}

// Only piety so far. Population, skills, and QoL follow the same shape and
// get added as each is moved over to observations.
export const ObservationDefs = {
    Piety: new ObservationDef('piety', 'Piety', clan => clan.traits.piety, {
        prior: 50,
        // A year of close acquaintance places a clan's piety to within about
        // 15, and averaging those years settles at about 5.
        lookStdev: 15,
        lookWeight: 0.2,
        // Below a fifth of one's attention a clan's devotions go unremarked,
        // unless they are conspicuous enough to be impossible to miss.
        attentionThreshold: 0.2,
        conspicuousAbove: 80,
        // People take a lively interest in their neighbors' devotions, so even
        // unremarkable piety comes up about as often as the neighbor does.
        // Qualities that matter less locally will want less than this.
        chatter: 1,
        // The notably devout or notably slack get talked about on their own
        // account.
        notableDeviation: 15,
        staleHalfLife: 30,
        // Years of being neighbors already: a fair idea, held with some
        // assurance, but short of what a lifetime of close attention gives.
        seedStdev: 7,
        seedConfidence: 0.8,
        splitStdev: 7,
        splitConfidenceFactor: 0.6,
        min: 0,
        max: 100,
    }),
};

export const ALL_OBSERVATION_DEFS: readonly ObservationDef[] =
    Object.values(ObservationDefs);

// What a report at second hand is worth next to seeing for oneself, at equal
// attention.
export const HEARSAY_WEIGHT = 0.5;

// How far off a report can land before it stops counting as corroboration,
// measured in the spreads we'd expect a report of its kind to have. Inside one
// spread a report is broadly confirming; past two it starts to look like the
// other clan is talking about someone else.
export const AGREEMENT_TOLERANCE_SPREADS = 2;

// One piece of evidence as it landed: what was reported, how it squared with
// what was already believed, and what it did to the estimate. Kept for the
// current turn only, so that a view can show how an impression got where it is.
export class ObservationUpdate {
    constructor(
        // Clan whose report this was, or undefined for the observer's own eyes.
        readonly source: UUID | undefined,
        readonly hops: number,
        readonly reported: number,
        readonly weight: number,
        // How well it squared with what was already believed: 1 dead on, 0
        // neither here nor there, -1 flatly contradictory.
        readonly agreement: number,
        readonly valueBefore: number,
        readonly valueAfter: number,
        readonly confidenceBefore: number,
        readonly confidenceAfter: number,
    ) { }

    get isFirsthand(): boolean { return this.source === undefined; }
}

// A running estimate of one quantity, with how sure we are of it.
export class Observation {
    private value_: number;
    private confidence_ = 0;
    // Year we last heard anything at all about this.
    private lastUpdated_: number | undefined;
    // Year through which staleness has already been charged, so that fading
    // every turn costs the same as fading once over the same span.
    private fadedThrough_: number | undefined;
    private hops_ = 0;
    private updates_: ObservationUpdate[] = [];

    constructor(readonly def: ObservationDef) {
        this.value_ = def.prior;
    }

    // Raw estimate, meaningful only to the extent confidence is high.
    get value(): number { return this.value_; }
    // 0 means we're just repeating the prior, 1 means we're sure.
    get confidence(): number { return this.confidence_; }
    get lastUpdated(): number | undefined { return this.lastUpdated_; }
    // Links crossed by the evidence behind the current estimate.
    get hops(): number { return this.hops_; }
    // Everything that came in this turn, in the order it was taken in.
    get updates(): readonly ObservationUpdate[] { return this.updates_; }

    get ownLook(): ObservationUpdate | undefined {
        return this.updates_.find(u => u.isFirsthand);
    }

    get reportsHeard(): ObservationUpdate[] {
        return this.updates_.filter(u => !u.isFirsthand);
    }

    // The estimate to actually act on: what we believe, pulled back toward
    // the prior by however unsure we are.
    get estimate(): number {
        return this.confidence_ * this.value_
            + (1 - this.confidence_) * this.def.prior;
    }

    // Forget last turn's provenance, so a view never shows stale workings.
    beginTurn(): void {
        if (this.updates_.length) this.updates_ = [];
    }

    // Fold in new evidence. `weight` in [0, 1] is how far to move toward the
    // reported value: it stands in for both how good a look we got and how
    // much we trust the teller. `spread` is how far off a report like this one
    // is expected to land, which is what says whether a difference from what
    // we already believed is ordinary noise or a real disagreement.
    observe(
        reported: number,
        weight: number,
        year: number,
        hops: number,
        spread: number,
        source?: UUID,
    ): void {
        const w = clamp(weight, 0, 1);
        if (w <= 0) return;

        const valueBefore = this.value_;
        const confidenceBefore = this.confidence_;

        // With nothing yet believed there is nothing to square the report
        // against, so a first report is taken at face value.
        const agreement = this.confidence_ <= 0 ? 1 : clamp(
            1 - Math.abs(reported - this.value_)
                / (AGREEMENT_TOLERANCE_SPREADS * Math.max(spread, 1e-6)),
            -1, 1);

        this.value_ = (1 - w) * this.value_ + w * reported;
        // Corroboration firms up a judgment; a report that doesn't square with
        // what we thought shakes it, in proportion to how much we credit the
        // report and how far off it was.
        this.confidence_ += agreement >= 0
            ? (1 - this.confidence_) * w * agreement
            : this.confidence_ * w * agreement;

        this.lastUpdated_ = year;
        this.fadedThrough_ = year;
        this.hops_ = hops;
        this.updates_.push(new ObservationUpdate(
            source, hops, reported, w, agreement,
            valueBefore, this.value_, confidenceBefore, this.confidence_));
    }

    // Plant a starting impression for clans taken to be already acquainted.
    // Not evidence anyone gathered, so it leaves no provenance behind.
    seed(value: number, confidence: number, year: number): void {
        this.value_ = value;
        this.confidence_ = clamp(confidence, 0, 1);
        this.lastUpdated_ = year;
        this.fadedThrough_ = year;
        this.hops_ = 0;
    }

    // Blur this impression as a clan coming out of a split holds it. The
    // belief is the one the undivided clan had, but the members who knew it
    // best may have gone the other way.
    degradeForSplit(year: number): void {
        if (this.confidence_ <= 0) return;
        this.value_ = this.def.perceivable(
            this.value_ + normal(0, this.def.splitStdev));
        this.confidence_ *= this.def.splitConfidenceFactor;
        this.lastUpdated_ = year;
        this.fadedThrough_ = year;
    }

    // Let an estimate we haven't refreshed go stale. Safe to call every turn:
    // decay is charged only for years not already charged for.
    fade(year: number): void {
        const from = this.fadedThrough_ ?? this.lastUpdated_;
        if (from === undefined) return;
        const age = year - from;
        if (age <= 0) return;
        this.confidence_ *= Math.pow(0.5, age / this.def.staleHalfLife);
        this.fadedThrough_ = year;
    }

    clone(): Observation {
        const o = new Observation(this.def);
        o.value_ = this.value_;
        o.confidence_ = this.confidence_;
        o.lastUpdated_ = this.lastUpdated_;
        o.fadedThrough_ = this.fadedThrough_;
        o.hops_ = this.hops_;
        // Updates are immutable, so sharing them is fine.
        o.updates_ = this.updates_;
        return o;
    }
}

// One clan's impressions of another's state.
export class Observations {
    private m_ = new Map<string, Observation>();

    get all(): Iterable<Observation> { return this.m_.values(); }

    get(def: ObservationDef): Observation | undefined {
        return this.m_.get(def.key);
    }

    getOrCreate(def: ObservationDef): Observation {
        let o = this.m_.get(def.key);
        if (!o) {
            o = new Observation(def);
            this.m_.set(def.key, o);
        }
        return o;
    }

    // Best guess at a quantity, falling back to the prior if we've never
    // heard anything.
    estimate(def: ObservationDef): number {
        return this.m_.get(def.key)?.estimate ?? def.prior;
    }

    confidence(def: ObservationDef): number {
        return this.m_.get(def.key)?.confidence ?? 0;
    }

    observe(
        def: ObservationDef,
        reported: number,
        weight: number,
        year: number,
        hops: number,
        spread: number,
        source?: UUID,
    ): void {
        this.getOrCreate(def).observe(reported, weight, year, hops, spread, source);
    }

    seed(def: ObservationDef, value: number, confidence: number, year: number): void {
        this.getOrCreate(def).seed(value, confidence, year);
    }

    fade(year: number): void {
        for (const o of this.m_.values()) o.fade(year);
    }

    degradeForSplit(year: number): void {
        for (const o of this.m_.values()) o.degradeForSplit(year);
    }

    // Take on another set of impressions as a clan coming out of a split
    // inherits them, blurred. Anything already held is replaced: a successor
    // has no impressions of its own yet.
    inheritDegraded(other: Observations, year: number): void {
        for (const [key, o] of other.m_) {
            const copy = o.clone();
            copy.degradeForSplit(year);
            this.m_.set(key, copy);
        }
    }

    beginTurn(): void {
        for (const o of this.m_.values()) o.beginTurn();
    }

    clone(): Observations {
        const os = new Observations();
        for (const [key, o] of this.m_) os.m_.set(key, o.clone());
        return os;
    }
}

// ---------------------------------------------------------------------------
// The pair-level container.
// ---------------------------------------------------------------------------

// A component of the direct contact level between two clans.
export class ClanInformationItem {
    constructor(
        readonly label: string,
        readonly value: number,
        readonly explanation: string,
    ) { }
}

// Everything one clan knows about another.
export class ClanInformation {
    constructor(
        // Events, remembered and fading.
        readonly memory: Memory = new Memory(),
        // State, estimated with varying confidence.
        readonly observations: Observations = new Observations(),
    ) { }

    // How much of the object clan the subject actually sees, from ongoing
    // direct interaction. This is the channel: it governs what gets noticed
    // firsthand and how much news flows over the link. It is recomputed each
    // turn rather than accumulated, since it describes the present
    // relationship, not anything remembered.
    private contactItems_: ClanInformationItem[] = [];

    get items(): readonly ClanInformationItem[] { return this.contactItems_; }

    get contact(): number {
        return sumFun(this.contactItems_, item => item.value);
    }

    // Legacy name for the contact level, still used as a blanket multiplier on
    // respect and on skill imitation. Those move to observations later.
    get value(): number {
        return this.contact;
    }

    updateFor(subject: Clan, object: Clan, connections: Connection[], interactions: Interaction[]): void {
        this.contactItems_ = [];
        for (const interaction of interactions) {
            const infoVal = interaction.information(subject, object);
            const isBasic = interaction instanceof BasicInteraction;
            const explanation = isBasic ? `${pct(infoVal)} attention` : "";

            this.contactItems_.push(new ClanInformationItem(
                isBasic ? "Basic Interaction" : interaction.constructor.name,
                infoVal,
                explanation,
            ));
        }

        const year = subject.world.year.value;
        this.memory.forget(year);
        this.observations.fade(year);
    }

    clone(): ClanInformation {
        const ci = new ClanInformation(
            this.memory.clone(),
            this.observations.clone(),
        );
        ci.contactItems_ = [...this.contactItems_];
        return ci;
    }
}

// ---------------------------------------------------------------------------
// Recording events.
// ---------------------------------------------------------------------------

// File an event both parties were party to into both their ledgers. They saw
// the same thing, so they get the very same entry object: that keeps the
// footprint down, and lets views recognize two clans' reports of one event by
// identity rather than by comparing fields.
export function recordDirectEvent(a: Clan, b: Clan, entry: MemoryEntry): void {
    const perceptions = a.world.perceptions;
    perceptions.getOrCreate(a, b).information.memory.add(entry);
    perceptions.getOrCreate(b, a).information.memory.add(entry);
}

// Remember a gift of food aid. Both donor and recipient know about it
// firsthand.
export function recordFoodAid(donor: Clan, recipient: Clan, amount: number): void {
    if (amount <= 0) return;
    // Aid looms as large as it mattered to the recipient: a day's food per
    // head is a big deal, a token is barely worth mentioning.
    const perCapita = amount / Math.max(1, recipient.population);
    recordDirectEvent(donor, recipient, new MemoryEntry(
        MemoryEventDefs.Aid,
        donor.world.year.value,
        donor.uuid,
        recipient.uuid,
        amount,
        perCapita,
        0,
        undefined,
        `${amount.toFixed(1)} food (${perCapita.toFixed(2)}/person)`,
    ));
}

// ---------------------------------------------------------------------------
// Passing news along.
// ---------------------------------------------------------------------------

// How long an event stays news. Events get their chance to spread on the turn
// after they happen and are old hat after that, which is what keeps one round
// of gossip per event rather than an endless trickle of stale trivia.
export const NEWS_WINDOW_YEARS = 1;

// Spread news one link. A clan that took part in an event tells the clans it
// interacts with, in proportion to how closely they interact and how big the
// event was; only firsthand accounts are retold, so news currently reaches at
// most the neighbors of a participant.
export function propagateNews(world: World): void {
    const now = world.year.value;

    // What each clan can currently pass on: its own firsthand accounts, while
    // they are still news. Gathered once, since each is offered to several
    // hearers.
    const tellable = new Map<UUID, MemoryEntry[]>();
    for (const teller of world.allClans) {
        const fresh: MemoryEntry[] = [];
        for (const [, perceptions] of world.perceptions.getFor(teller)) {
            for (const entry of perceptions.information.memory.entries) {
                if (entry.hops !== 0) continue;
                if (now - entry.year > NEWS_WINDOW_YEARS) continue;
                fresh.push(entry);
            }
        }
        if (fresh.length) tellable.set(teller.uuid, fresh);
    }
    if (!tellable.size) return;

    // Collect first and file afterward, so that who hears what doesn't depend
    // on the order clans happen to come up in.
    const heard: { hearer: Clan, entry: MemoryEntry, teller: UUID }[] = [];
    for (const hearer of world.allClans) {
        // Everything the hearer already has, by event rather than by copy: it
        // shouldn't be told twice by two tellers, or told about its own doings.
        const known = new Set<number>();
        for (const [, perceptions] of world.perceptions.getFor(hearer)) {
            for (const entry of perceptions.information.memory.entries) {
                known.add(entry.eventId);
            }
        }

        for (const [tellerID] of world.perceptions.getFor(hearer)) {
            const news = tellable.get(tellerID);
            if (!news) continue;
            const teller = world.clanMap.get(tellerID);
            if (!teller) continue;
            const attention = getRelativeAttention(hearer, teller);
            if (attention <= 0) continue;

            for (const entry of news) {
                if (known.has(entry.eventId)) continue;
                if (Math.random() >= entry.transmissionChance(attention)) continue;
                known.add(entry.eventId);
                heard.push({ hearer, entry, teller: tellerID });
            }
        }
    }

    for (const { hearer, entry, teller } of heard) {
        fileHeardEvent(world, hearer, entry.retold(teller));
    }
}

// File news the hearer picked up. It says something about everyone involved,
// so it goes in the hearer's ledger on each party it already has one for. A
// clan with no relationship to either party has nowhere to put it and loses
// the news, which is a limitation of keying ledgers to live connections.
function fileHeardEvent(world: World, hearer: Clan, entry: MemoryEntry): void {
    for (const about of [entry.actor, entry.target]) {
        if (!about || about === hearer.uuid) continue;
        const perceptions = world.perceptions.get(hearer, about);
        perceptions?.information.memory.add(entry);
    }
}

// ---------------------------------------------------------------------------
// Forming impressions.
// ---------------------------------------------------------------------------

// Take a year's look at everyone we deal with, and pass along what's worth
// remarking on. Hearsay goes first so that a clan's own eyes have the last
// word, both on the estimate and on how far off the evidence behind it came
// from.
export function updateObservations(world: World): void {
    const year = world.year.value;
    for (const clan of world.allClans) {
        for (const [, perceptions] of world.perceptions.getFor(clan)) {
            perceptions.information.observations.beginTurn();
        }
    }
    passAlongObservations(world, year);
    observeDirectly(world, year);
}

// ---------------------------------------------------------------------------
// Dividing what a clan knows when it splits.
// ---------------------------------------------------------------------------

// Share of the undivided clan's lesser memories a successor carries off. The
// stories went wherever the people who told them went, so a group is unlikely
// to keep much less than its size in them, and may well keep nearly all: the
// same tale is usually known to more than one household.
function splitKeepFraction(share: number): number {
    const floor = share / 2;
    return floor + Math.random() * (1 - floor);
}

function keptOnSplit(entry: MemoryEntry, keepFraction: number): boolean {
    // Everyone who lived through the big things remembers them.
    return entry.salience >= entry.def.unforgettableSalience
        || Math.random() < keepFraction;
}

// Hand down what an undivided clan knew to the two clans it becomes.
//
// Both successors are made of people who knew the neighbors, so neither
// starts over: they divide the parent's ledgers and each keep a blurred copy
// of its impressions. The neighbors, for their part, knew these people too, so
// their impressions of the parent carry over to the new clan.
//
// Note what is deliberately not inherited: the neighbors' *ledgers*. An event
// happened between a neighbor and the undivided clan, and the parent still
// stands as the party to it. Copying those entries onto the new clan as well
// would have the neighbor counting the same aid twice.
export function divideInformationOnSplit(parent: Clan, child: Clan): void {
    const world = parent.world;
    const year = world.year.value;
    const total = parent.population + child.population;
    const parentKeep = splitKeepFraction(total > 0 ? parent.population / total : 0.5);
    const childKeep = splitKeepFraction(total > 0 ? child.population / total : 0.5);

    // Snapshot before touching anything, since we add to the graph as we go.
    const parentLedgers = [...world.perceptions.getFor(parent)]
        .filter(([about]) => about !== child.uuid)
        .map(([about, perceptions]) => [about, perceptions.information] as const);

    for (const [about, information] of parentLedgers) {
        const childInfo = world.perceptions.getOrCreate(child, about).information;

        // Each side rolls for the lesser memories separately, so a story can
        // go to both, to one, or be lost with the household that held it.
        // Entries are immutable, so the two ledgers share whatever both kept.
        for (const entry of information.memory.entries) {
            if (keptOnSplit(entry, childKeep)) childInfo.memory.add(entry);
        }
        information.memory.keepOnly(entry => keptOnSplit(entry, parentKeep));

        childInfo.observations.inheritDegraded(information.observations, year);
        information.observations.degradeForSplit(year);
    }

    // The neighbors' side: they knew these people, so what they thought of the
    // undivided clan is what they now think of the new one, allowing that the
    // part that broke away may not be quite like the whole. Their impression
    // of the parent stands as it is, since the parent is still itself.
    const neighbors = [...world.perceptions.getRegarding(parent)]
        .filter(([subject]) => subject !== child.uuid);
    for (const [subject, perceptions] of neighbors) {
        world.perceptions.getOrCreate(subject, child).information.observations
            .inheritDegraded(perceptions.information.observations, year);
    }

    // Parent and child were one clan a moment ago and have no illusions about
    // each other, whatever else they have lost.
    for (const [subject, object] of [[parent, child], [child, parent]] as const) {
        const observations =
            world.perceptions.getOrCreate(subject, object).information.observations;
        for (const def of ALL_OBSERVATION_DEFS) {
            observations.seed(def, def.valueFn(object), def.seedConfidence, year);
        }
    }
}

// Clans don't meet as strangers when the world opens: they have been
// neighbors long enough to have each other's measure. Without this the game
// would start with everyone guessing the prior about everyone else and spend
// its first decades catching up to what they already ought to know.
export function seedObservations(world: World): void {
    const year = world.year.value;
    for (const subject of world.allClans) {
        for (const [objectID, perceptions] of world.perceptions.getFor(subject)) {
            const object = world.clanMap.get(objectID);
            if (!object) continue;
            for (const def of ALL_OBSERVATION_DEFS) {
                perceptions.information.observations.seed(
                    def,
                    def.perceivable(def.valueFn(object) + normal(0, def.seedStdev)),
                    def.seedConfidence,
                    year);
            }
        }
    }
}

function observeDirectly(world: World, year: number): void {
    for (const subject of world.allClans) {
        for (const [objectID, perceptions] of world.perceptions.getFor(subject)) {
            const object = world.clanMap.get(objectID);
            if (!object) continue;
            const attention = clamp(getRelativeAttention(subject, object), 0, 1);
            if (attention <= 0) continue;

            for (const def of ALL_OBSERVATION_DEFS) {
                const trueValue = def.valueFn(object);
                if (!def.registers(attention, trueValue)) continue;
                const spread = def.lookStdevAt(attention);
                perceptions.information.observations.observe(
                    def,
                    def.perceivable(trueValue + normal(0, spread)),
                    def.lookWeight * attention,
                    year,
                    0,
                    spread);
            }
        }
    }
}

// Something one clan could tell another, and how likely it is to come up.
type Tellable = {
    def: ObservationDef,
    held: Observation,
    about: UUID,
    // Chance per conversation that this particular subject comes up, which
    // depends on the teller and the clan discussed but not on who is
    // listening.
    chance: number,
};

// Clans tell each other what they've noticed, one link. Only firsthand
// impressions get retold; whether one comes up at all depends on how much the
// teller deals with the clan in question and how striking the value is.
function passAlongObservations(world: World, year: number): void {
    const tellable = new Map<UUID, Tellable[]>();
    for (const teller of world.allClans) {
        const items: Tellable[] = [];
        for (const [aboutID, perceptions] of world.perceptions.getFor(teller)) {
            const about = world.clanMap.get(aboutID);
            if (!about) continue;
            const attentionToSubject =
                clamp(getRelativeAttention(teller, about), 0, 1);
            for (const def of ALL_OBSERVATION_DEFS) {
                const held = perceptions.information.observations.get(def);
                if (!held || held.hops !== 0 || held.confidence <= 0) continue;
                const chance = def.transmissionChance(attentionToSubject, held.estimate);
                if (chance <= 0) continue;
                items.push({ def, held, about: aboutID, chance });
            }
        }
        if (items.length) tellable.set(teller.uuid, items);
    }
    if (!tellable.size) return;

    // Collect first and apply afterward, so that what gets around doesn't
    // depend on the order clans happen to come up in, and so that a teller
    // reports what it believed at the start of the turn.
    const reports: {
        observations: Observations,
        def: ObservationDef,
        value: number,
        weight: number,
        spread: number,
        teller: UUID,
    }[] = [];

    for (const hearer of world.allClans) {
        for (const [tellerID] of world.perceptions.getFor(hearer)) {
            const items = tellable.get(tellerID);
            if (!items) continue;
            const teller = world.clanMap.get(tellerID);
            if (!teller) continue;
            const attention = clamp(getRelativeAttention(hearer, teller), 0, 1);
            if (attention <= 0) continue;

            for (const { def, held, about, chance } of items) {
                // Nobody needs to be told about themselves, and a hearer with
                // no relationship to the subject has nowhere to file it.
                if (about === hearer.uuid) continue;
                const hearerPerceptions = world.perceptions.get(hearer, about);
                if (!hearerPerceptions) continue;
                if (Math.random() >= chance) continue;

                // How far off a retold value lands: one look's worth of
                // garbling, plus however unsure the teller was to start.
                reports.push({
                    observations: hearerPerceptions.information.observations,
                    def,
                    value: def.perceivable(held.estimate + normal(0, def.lookStdev)),
                    weight: def.lookWeight * attention * held.confidence * HEARSAY_WEIGHT,
                    spread: def.lookStdev * (2 - held.confidence),
                    teller: tellerID,
                });
            }
        }
    }

    for (const r of reports) {
        r.observations.observe(r.def, r.value, r.weight, year, 1, r.spread, r.teller);
    }
}
