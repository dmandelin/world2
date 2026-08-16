import { clamp, sumFun } from "../lib/basics";
import type { Clan } from "../people/people";
import type { Connection } from "./connection";
import type { Interaction } from "./interaction";
import { BasicInteraction, getRelativeAttention } from "./basicinteraction";
import { pct } from "../lib/format";
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
    ) { }
}

// Starter set; more will be added as event sources are moved over to the
// ledger (rituals, construction, ...).
export const MemoryEventDefs = {
    Gift: new MemoryEventDef('gift', 'Gift', 10, 2),
    Aid: new MemoryEventDef('aid', 'Aid', 20, 5),
    Conflict: new MemoryEventDef('conflict', 'Conflict', 20, 7),
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

// A quantity clans form impressions of about each other.
export class ObservationDef {
    constructor(
        readonly key: string,
        readonly label: string,
        // Value assumed about a clan we know nothing about.
        readonly prior: number,
        // How readily an impression forms from a given amount of contact, and
        // how readily news of it travels a link.
        readonly salience: number,
        // Years for confidence in an unrefreshed estimate to halve.
        readonly staleHalfLife: number,
    ) { }
}

// Starter set. Skills will need one def per skill, and QoL one per component;
// those get added as each is moved over to observations.
export const ObservationDefs = {
    Population: new ObservationDef('population', 'Population', 0, 1, 40),
    Sociability: new ObservationDef('sociability', 'Sociability', 0, 1, 20),
    Piety: new ObservationDef('piety', 'Piety', 50, 0.3, 30),
    Intellect: new ObservationDef('intellect', 'Intellect', 50, 0.2, 30),
    MaterialQoL: new ObservationDef('materialQoL', 'Material QoL', 0, 0.3, 15),
};

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

    // The estimate to actually act on: what we believe, pulled back toward
    // the prior by however unsure we are.
    get estimate(): number {
        return this.confidence_ * this.value_
            + (1 - this.confidence_) * this.def.prior;
    }

    // Fold in new evidence. `weight` in [0, 1] is how far to move toward the
    // reported value: it stands in for both how good a look we got and how
    // much we trust the teller. This is the seam where conflicting reports
    // get integrated, so it will grow more sophisticated.
    observe(value: number, weight: number, year: number, hops: number = 0): void {
        const w = clamp(weight, 0, 1);
        if (w <= 0) return;
        this.value_ = (1 - w) * this.value_ + w * value;
        this.confidence_ = this.confidence_ + (1 - this.confidence_) * w;
        this.lastUpdated_ = year;
        this.fadedThrough_ = year;
        this.hops_ = hops;
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

    observe(def: ObservationDef, value: number, weight: number, year: number, hops: number = 0): void {
        this.getOrCreate(def).observe(value, weight, year, hops);
    }

    fade(year: number): void {
        for (const o of this.m_.values()) o.fade(year);
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
