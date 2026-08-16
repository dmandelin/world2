import { clamp, sumFun } from "../lib/basics";
import type { Clan } from "../people/people";
import type { Connection } from "./connection";
import type { Interaction } from "./interaction";
import { BasicInteraction } from "./basicinteraction";
import { pct } from "../lib/format";
import type { UUID } from "../records/basicdata";

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
        // Baseline tendency for news of this kind to be passed along a link.
        // Scaled per-event by how big the event was.
        readonly salience: number,
    ) { }
}

// Starter set; more will be added as event sources are moved over to the
// ledger (rituals, construction, ...).
export const MemoryEventDefs = {
    Gift: new MemoryEventDef('gift', 'Gift', 10, 0.2),
    Aid: new MemoryEventDef('aid', 'Aid', 20, 0.5),
    Conflict: new MemoryEventDef('conflict', 'Conflict', 20, 0.7),
};

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
        // How striking the event was, roughly 0-1. Set by whatever recorded
        // the event, since only it knows what counts as big for its kind.
        readonly salience: number,
        // Links the news crossed to get here. 0 means witnessed or
        // experienced directly.
        readonly hops: number,
        // Clan we heard it from, if we didn't see it ourselves.
        readonly via: UUID | undefined,
        readonly explanation: string = '',
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

    // How likely this is to come up and be passed along now. Used when we
    // start transmitting news over links.
    newsworthiness(year: number): number {
        return this.def.salience * this.salience * this.freshness(year);
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
