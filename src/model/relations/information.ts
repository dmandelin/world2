import { clamp, sumFun } from "../lib/basics";
import type { Clan } from "../people/people";
import type { Connection } from "./connection";
import { KinConnection, MarriageConnection } from "./connection";
import type { Interaction } from "./interaction";
import { BasicInteraction, getRelativeAttention } from "./basicinteraction";
import { pct } from "../lib/format";
import { normal } from "../lib/distributions";
import type { UUID } from "../records/basicdata";
import type { World } from "../world";
import { getPrestige } from "./prestige";

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

// Clans have no writing and no way to measure, so they do not remember that a
// neighbor handed over 4.1 units of food in a particular year. They remember
// that it was a large gift and that they were hungry at the time. Bands are
// that memory: a short ordered scale of the kind a clan could actually carry
// in its head and retell to someone else.
export class Band {
    constructor(
        // Position on the scale, for rules that compare one band to another.
        readonly index: number,
        readonly key: string,
        readonly label: string,
        // Lowest measured value falling in this band.
        readonly floor: number,
        // What a value in this band counts for when the memory is weighed,
        // standing in for the amount nobody actually remembers.
        readonly weight: number,
    ) { }
}

// An ordered set of bands, ascending by floor.
export class BandScale {
    constructor(readonly name: string, readonly bands: readonly Band[]) { }

    classify(value: number): Band {
        let found = this.bands[0];
        for (const band of this.bands) {
            if (value < band.floor) break;
            found = band;
        }
        return found;
    }
}

// How big a gift of food felt, by what it came to per head of the clan
// receiving it, in food units where 1 is one person's ration for a year.
//
// The scale looks cramped against that unit, and it has to be: a donor may
// only give away its surplus above a 0.8 ration, a requester asks only for
// enough to reach 0.8, and that request is split across every willing donor.
// A single transfer therefore tops out near 0.15 per head, so these bands are
// set against the range aid actually occupies rather than against the unit.
// Weights are band midpoints in the same units, which keeps a sum of weights
// comparable to a sum of real amounts.
export const FoodSizeBands = new BandScale('size', [
    new Band(0, 'token', 'Token', 0, 0.005),
    new Band(1, 'small', 'Small', 0.01, 0.02),
    new Band(2, 'notable', 'Notable', 0.03, 0.05),
    new Band(3, 'large', 'Large', 0.07, 0.095),
    new Band(4, 'enormous', 'Enormous', 0.12, 0.16),
]);

// How badly help was needed, by what the receiving clan had to eat per head
// before it arrived. Clans start asking for aid below 0.8, so anything at or
// above that was not really want. Weights run the other way from the scale:
// the same gift means far more to the desperate.
export const NeedBands = new BandScale('need', [
    new Band(0, 'desperate', 'Desperate', 0, 4),
    new Band(1, 'hungry', 'Hungry', 0.60, 2),
    new Band(2, 'short', 'Short', 0.80, 1),
    new Band(3, 'comfortable', 'Comfortable', 1.00, 0.5),
]);

// Fraction of its original impression below which an occasion has faded past
// being carried at all. Module-level rather than on Memory, since the event
// definitions are built at load time and would hit the class before it is
// initialized.
export const FORGET_THRESHOLD = 0.01;

// Memorability at which a transfer of food sticks whatever else has happened
// since: Large-when-hungry, Notable-when-desperate, and anything above, the
// years a clan would still be telling its grandchildren about. Everything
// below competes for the few slots that remain.
export const UNFORGETTABLE_FOOD_MEMORABILITY = 0.19;

// How long a clan carries an occasion it no longer recounts, unless its kind
// says otherwise. Long enough that a recent run of behavior is still on the
// books, short enough that the ledger stays something a clan could plausibly
// hold. Occasions still recounted are exempt and can outlive it by decades.
export const DEFAULT_PURGE_YEARS = 10;

// How bad a quarrel got, by how many times a clan reached for force in a
// year's dealings. Weights are representative counts, so a sum of weights
// stays comparable to a count of real hawk plays.
export const HawkCountBands = new BandScale('conflict', [
    new Band(0, 'friction', 'Friction', 0, 1),
    new Band(1, 'quarrel', 'Quarrel', 2, 2),
    new Band(2, 'feud', 'Feud', 3, 3),
    new Band(3, 'fighting', 'Open fighting', 4, 4.5),
]);

// A kind of event clans remember about each other. The definition carries the
// parameters that govern how the event fades and how well news of it travels;
// individual events carry their own size.
export type MemoryEventSpec = {
    // Years for a remembered event's weight to halve.
    halfLife: number;
    // How far news of this kind carries beyond the base rate set by
    // attention. See MemoryEntry.transmissionChance for what the number
    // means; it is multiplied by the individual event's salience, so a kind
    // with high reach still travels no further than its small instances
    // deserve.
    newsReach: number;
    // Salience at or above which an event is unforgettable: when a clan
    // splits, both successors carry it off, however the people divided.
    unforgettableSalience: number;
    // Scale on which an event of this kind is remembered as big or small.
    sizeBands: BandScale;
    // If set, occasions of this kind are recounted only while they are this
    // recent, however striking, instead of competing for the few slots kept
    // for the kinds worth recounting at all. Everyday exchange works this
    // way: last year's gifts are common knowledge and the ones before that
    // have run together.
    recallYears?: number;
    // Memorability at which an occasion sticks whatever else has happened
    // since. Per kind, because memorability is measured on each kind's own
    // scale: food weights run in hundredths, hawk plays in whole numbers.
    unforgettableMemorability: number;
    // How long an occasion nobody recounts any more is still carried at all.
    // Past this it is gone from the ledger, not merely faded: whatever it
    // contributed lives on only in the impressions it helped form. Occasions
    // still being recounted are exempt, so a rescue told for generations is
    // never swept up by this.
    purgeYears?: number;
};

// A kind of event clans remember about each other. The definition carries the
// parameters that govern how the event fades and how well news of it travels;
// individual events carry their own size.
export class MemoryEventDef {
    readonly halfLife: number;
    readonly newsReach: number;
    readonly unforgettableSalience: number;
    readonly sizeBands: BandScale;
    readonly unforgettableMemorability: number;
    readonly recallYears: number | undefined;
    readonly purgeYears: number;
    // Soonest age at which any entry of this kind could need dropping,
    // whether by fading or by its span running out. Lets a ledger with
    // nothing due skip the work of deciding what is still recounted.
    readonly expiryYears: number;

    constructor(
        readonly key: string,
        readonly label: string,
        spec: MemoryEventSpec,
    ) {
        this.halfLife = spec.halfLife;
        this.newsReach = spec.newsReach;
        this.unforgettableSalience = spec.unforgettableSalience;
        this.sizeBands = spec.sizeBands;
        this.unforgettableMemorability = spec.unforgettableMemorability;
        this.recallYears = spec.recallYears;
        this.purgeYears = spec.purgeYears ?? DEFAULT_PURGE_YEARS;
        // Age past which an occasion has faded below the point of being
        // carried at all, from the half-life.
        const staleYears = this.halfLife * Math.log2(1 / FORGET_THRESHOLD);
        this.expiryYears = Math.min(staleYears, this.purgeYears);
    }
}

// Starter set; more will be added as event sources are moved over to the
// ledger (rituals, construction, ...).
export const MemoryEventDefs = {
    // Gifts are routine and soon indistinguishable from each other, so they
    // fade faster than aid, are recounted only while recent, and are dropped
    // altogether not long after.
    Gift: new MemoryEventDef('gift', 'Gift', {
        halfLife: 5,
        newsReach: 2,
        unforgettableSalience: 0.07,
        sizeBands: FoodSizeBands,
        // Never reached on the food scale, and moot anyway: gifts are
        // recounted by recency, not by standing.
        unforgettableMemorability: UNFORGETTABLE_FOOD_MEMORABILITY,
        recallYears: 3,
        purgeYears: 5,
    }),
    Aid: new MemoryEventDef('aid', 'Aid', {
        halfLife: 20,
        newsReach: 5,
        unforgettableSalience: 0.07,
        sizeBands: FoodSizeBands,
        unforgettableMemorability: UNFORGETTABLE_FOOD_MEMORABILITY,
    }),
    // Quarrels are remembered like aid: a few stand out and are recounted for
    // a lifetime, the rest run together into a sense of how touchy a
    // neighbor is. A year in which a clan reached for force at every turn is
    // not forgotten.
    Conflict: new MemoryEventDef('conflict', 'Conflict', {
        halfLife: 20,
        newsReach: 2,
        unforgettableSalience: 0.8,
        sizeBands: HawkCountBands,
        // Only a year of open fighting sticks on its own account. Ordinary
        // friction and quarrels compete for the few slots like anything else,
        // so a clan recounts its three worst run-ins and no more.
        unforgettableMemorability: 4,
    }),
};

// One event is one event, however many clans end up holding a copy of it and
// however garbled those copies get. Copies share an id so that views (and,
// later, clans integrating conflicting reports) can tell one event told twice
// from two events.
let nextEventId = 1;

export type MemoryEntrySpec = {
    def: MemoryEventDef;
    // Year the event happened (as believed by the rememberer).
    year: number;
    // Clan that acted. Usually the object of these perceptions, but for news
    // heard about it may be a third party.
    actor: UUID;
    // Clan acted upon, if any.
    target?: UUID;
    // The true size of the event in its own natural units. This is our
    // bookkeeping, not the clan's: nothing a clan does should read it.
    magnitude: number;
    // How big the event felt, which is what the clan actually retains.
    size: Band;
    // How badly it was needed, where that means anything.
    need?: Band;
    // Whether this passed between kin or between clans that have married.
    // Giving inside the family is what family is for, so it says nothing
    // about whether a clan is open-handed with anyone else.
    withinKin?: boolean;
    // How striking the event was, on a scale where 1 is "a big deal of its
    // kind". Not capped: a truly enormous event should be able to say so.
    salience: number;
    // Links the news crossed to get here. 0 means witnessed or experienced
    // directly.
    hops?: number;
    // Clan we heard it from, if we didn't see it ourselves.
    via?: UUID;
    explanation?: string;
    // Shared by every copy of the same underlying event.
    eventId?: number;
};

// One remembered event. Immutable: what a clan believes about an event it has
// already filed away doesn't change, it only fades.
//
// Note the split between `magnitude` and `size`. The former is what really
// happened and is kept so we can check our own work; the latter is what the
// clan came away with. Rules about how clans behave belong on the bands.
export class MemoryEntry {
    readonly def: MemoryEventDef;
    readonly year: number;
    readonly actor: UUID;
    readonly target: UUID | undefined;
    readonly magnitude: number;
    readonly size: Band;
    readonly need: Band | undefined;
    readonly withinKin: boolean;
    readonly salience: number;
    readonly hops: number;
    readonly via: UUID | undefined;
    readonly explanation: string;
    readonly eventId: number;

    constructor(spec: MemoryEntrySpec) {
        this.def = spec.def;
        this.year = spec.year;
        this.actor = spec.actor;
        this.target = spec.target;
        this.magnitude = spec.magnitude;
        this.size = spec.size;
        this.need = spec.need;
        this.withinKin = spec.withinKin ?? false;
        this.salience = spec.salience;
        this.hops = spec.hops ?? 0;
        this.via = spec.via;
        this.explanation = spec.explanation ?? '';
        this.eventId = spec.eventId ?? nextEventId++;
    }

    // How much this stands out among things worth recounting: how big it was,
    // weighted by how badly it was wanted. A token gift in a comfortable year
    // is nothing; a large one in a desperate year is a story.
    get memorability(): number {
        return this.size.weight * (this.need?.weight ?? 1);
    }

    // Striking enough to stick on its own account, whatever else happened.
    get isUnforgettable(): boolean {
        return this.memorability >= this.def.unforgettableMemorability;
    }

    // How this compares with other occasions right now, which is what decides
    // which few are still told as occasions.
    standing(year: number): number {
        return this.memorability * this.freshness(year);
    }

    // How the clan would describe it, from what it actually kept.
    get description(): string {
        const kin = this.withinKin ? ', within the family' : '';
        return this.need
            ? `${this.size.label}, when ${this.need.label.toLowerCase()}${kin}`
            : `${this.size.label}${kin}`;
    }

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

    // This event as the hearer files it: same event, one more link away. What
    // gets passed on is the coarse account, which is all the teller had.
    retold(via: UUID): MemoryEntry {
        return new MemoryEntry({
            def: this.def,
            year: this.year,
            actor: this.actor,
            target: this.target,
            magnitude: this.magnitude,
            size: this.size,
            need: this.need,
            withinKin: this.withinKin,
            salience: this.salience,
            hops: this.hops + 1,
            via,
            explanation: this.explanation,
            eventId: this.eventId,
        });
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

    keepOnly(predicate: (entry: MemoryEntry) => boolean): void {
        this.entries_ = this.entries_.filter(predicate);
    }

    // How many occasions of one kind a clan can still recount. Everything
    // else has run together into a general sense of how that neighbor has
    // behaved, which is what the generosity impression is.
    static readonly RECOUNTABLE = 3;

    // The occasions still told as occasions: the few that stand out most,
    // plus any that were striking enough to stick on their own account.
    //
    // This is derived rather than stored, so it costs nothing to keep the
    // rest of the ledger around, and a memory that slips out of the top few
    // can come back if a fresher one fades faster.
    rememberedIds(year: number): Set<number> {
        const kept = new Set<number>();
        // The few best per kind, found by selection rather than by sorting the
        // whole ledger: this runs for every pair every turn, and ledgers run
        // to hundreds of entries.
        const best = new Map<MemoryEventDef, { id: number, standing: number }[]>();
        for (const entry of this.entries_) {
            // Everyday exchange is recounted while it is recent and then
            // simply isn't, however big any one instance was.
            const window = entry.def.recallYears;
            if (window !== undefined) {
                if (year - entry.year <= window) kept.add(entry.eventId);
                continue;
            }
            if (entry.isUnforgettable) {
                kept.add(entry.eventId);
                continue;
            }
            let top = best.get(entry.def);
            if (!top) best.set(entry.def, top = []);
            const standing = entry.standing(year);
            if (top.length < Memory.RECOUNTABLE) {
                top.push({ id: entry.eventId, standing });
            } else if (standing > top[0].standing) {
                top[0] = { id: entry.eventId, standing };
            } else {
                continue;
            }
            // Keep the weakest first so the check above is a single compare.
            top.sort((a, b) => a.standing - b.standing);
        }
        for (const top of best.values()) {
            for (const t of top) kept.add(t.id);
        }
        return kept;
    }

    // Drop what is no longer carried: occasions faded past usefulness, and
    // occasions nobody recounts any more that are past their kind's span.
    // Anything still being recounted stays however old it is.
    forget(year: number): void {
        // Most turns nothing has come due, and working out what is still
        // recounted costs a pass over the whole ledger, so check first.
        let due = false;
        for (const entry of this.entries_) {
            if (year - entry.year > entry.def.expiryYears) { due = true; break; }
        }
        if (!due) return;

        const recounted = this.rememberedIds(year);
        this.entries_ = this.entries_.filter(entry => {
            if (entry.freshness(year) < FORGET_THRESHOLD) return false;
            if (recounted.has(entry.eventId)) return true;
            return year - entry.year <= entry.def.purgeYears;
        });
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
// How an estimate settles as evidence comes in.
//
// 'impression' suits a quality you can simply look at. Each year's look moves
// the estimate a fixed fraction, set by how much attention you are paying, so
// a clear idea takes years of watching to build.
//
// 'average' suits a quality you infer by adding up deeds. It keeps a running
// mean of what has actually been seen, and because the mean is over a count
// that starts near zero, the first year seen already carries most of the
// estimate and later years refine it. That is the difference between judging
// how devout someone is and judging how freely they give: you cannot see
// generosity, you can only tot up what they did.
export type ObservationMode = 'impression' | 'average';

export type ObservationSpec = {
    mode: ObservationMode;
    // The real value, where there is one an observer could be checked
    // against. A quality inferred from deeds has no such figure: what the
    // observer counted is all there is, so views showing "how far off" leave
    // it blank rather than inventing a truth.
    truthFn?: (clan: Clan) => number;
    // 'average' only: weight of the prior, counted in years of evidence. At
    // 1/3, the first year seen already carries three quarters of the estimate
    // and five years carry 94% of it, which is what keeps a running mean from
    // creeping out of a midpoint anchor.
    priorYears?: number;
    // 'average' only: floor on how little a fresh year can move the estimate,
    // so that it never settles so hard it stops tracking a clan whose habits
    // change. 0.1 leaves an effective window of about ten years.
    minAlpha?: number;
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
    readonly mode: ObservationMode;
    readonly truthFn: ((clan: Clan) => number) | undefined;
    readonly priorYears: number;
    readonly minAlpha: number;
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
        // What the observer would make of the object this year. For a quality
        // that simply is what it is, the subject is ignored and the observer
        // adds its own blur. For one inferred from deeds, this is already the
        // observer's partial view, since it is read off what that observer
        // happens to know.
        readonly valueFn: (subject: Clan, object: Clan) => number,
        spec: ObservationSpec,
    ) {
        this.mode = spec.mode;
        this.truthFn = spec.truthFn;
        this.priorYears = spec.priorYears ?? 1 / 3;
        this.minAlpha = spec.minAlpha ?? 0.1;
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

    // Spread of a year's impression at this much attention. An averaged
    // quality is read off the observer's own ledger rather than eyeballed, so
    // its error is the ledger's partiality, not a blur we add on top.
    lookStdevAt(attention: number): number {
        return this.mode === 'average'
            ? this.lookStdev
            : this.lookStdev / (attention * attention);
    }

    // How far a fresh year's evidence moves an averaged estimate that already
    // rests on `yearsSeen` years. Falls as 1/n so that the estimate is a
    // running mean, with a floor so it keeps tracking.
    averageAlpha(yearsSeen: number): number {
        return Math.max(this.minAlpha, 1 / (this.priorYears + yearsSeen + 1));
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
// A kindness done to you weighs a little more than the same kindness done to
// someone else. Only a little: what a clan gives away is what makes it
// generous, whoever happens to receive it.
export const AID_TO_SELF_WEIGHT = 1.5;

// Generosity is reported on a 0-100 scale like the traits, so a year's giving
// in recipient-rations is scaled up to sit in a readable range.
export const GENEROSITY_SCALE = 100;

// A clan already taken to be an old acquaintance has, in effect, been
// watching for this many years, so the first fresh year refines its judgment
// rather than overwriting it.
export const SEEDED_YEARS_SEEN = 5;

// What one clan saw another give away over the last year, counting only what
// it knows about. This is read straight off the observer's own ledger, so two
// clans watching the same neighbor can honestly reach different conclusions:
// they saw different things.
//
// Giving within the family does not count. A clan that keeps its kin and its
// in-laws supplied is doing what a clan is for; open-handedness means giving
// where there is no such claim on you. Aid is exempt from that rule, since
// pulling anyone through a bad year is generous whoever they are.
//
// Transfers are recorded during the advance phase and observations are formed
// at the start of the next turn, so the year just completed is one year back.
export function givingSeen(subject: Clan, object: Clan): number {
    const memory = subject.world.perceptions
        .get(subject, object)?.information.memory;
    if (!memory) return 0;
    const of = subject.world.year.value - subject.world.yearsPerTurn;
    let total = 0;
    for (const entry of memory.entries) {
        if (entry.def !== MemoryEventDefs.Aid && entry.def !== MemoryEventDefs.Gift) {
            continue;
        }
        if (entry.actor !== object.uuid || entry.year !== of) continue;
        if (entry.withinKin && entry.def === MemoryEventDefs.Gift) continue;
        total += entry.size.weight
            * (entry.target === subject.uuid ? AID_TO_SELF_WEIGHT : 1);
    }
    return GENEROSITY_SCALE * total;
}

// Bellicosity is reported as hawk plays a year, which is already a readable
// number, so it needs no scaling up the way giving does.
export const BELLICOSITY_SCALE = 1;

// How often one clan saw another reach for force over the last year, counting
// only what it knows about. Being on the receiving end weighs a little more
// than hearing that someone else was.
export function aggressionSeen(subject: Clan, object: Clan): number {
    const memory = subject.world.perceptions
        .get(subject, object)?.information.memory;
    if (!memory) return 0;
    const of = subject.world.year.value - subject.world.yearsPerTurn;
    let total = 0;
    for (const entry of memory.entries) {
        if (entry.def !== MemoryEventDefs.Conflict) continue;
        if (entry.actor !== object.uuid || entry.year !== of) continue;
        total += entry.size.weight
            * (entry.target === subject.uuid ? AID_TO_SELF_WEIGHT : 1);
    }
    return BELLICOSITY_SCALE * total;
}

export const ObservationDefs = {
    Piety: new ObservationDef('piety', 'Piety', (_, clan) => clan.traits.piety, {
        mode: 'impression',
        truthFn: clan => clan.traits.piety,
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

    Generosity: new ObservationDef('generosity', 'Generosity', givingSeen, {
        // Judged by adding up deeds, not by looking: a clan that gave freely
        // last year is already thought generous, and later years refine that
        // rather than slowly talking it round from a midpoint.
        mode: 'average',
        priorYears: 1 / 3,
        minAlpha: 0.1,
        // Knowing nothing, assume nothing given.
        prior: 0,
        // Not a blur we add: the observer's figure is exactly what its own
        // ledger holds. This is how far apart two observers' figures can
        // reasonably land, which is what says whether a report disagrees.
        lookStdev: 8,
        lookWeight: 0.2,
        // You need barely any dealings with a clan to notice whether it gives.
        attentionThreshold: 0.1,
        conspicuousAbove: Infinity,
        // Who gave and who did not is the substance of village talk.
        chatter: 1,
        notableDeviation: 10,
        staleHalfLife: 20,
        seedStdev: 5,
        seedConfidence: 0.8,
        splitStdev: 5,
        splitConfidenceFactor: 0.6,
        min: 0,
    }),

    Bellicosity: new ObservationDef('bellicosity', 'Bellicosity', aggressionSeen, {
        // Like generosity, judged by adding up deeds rather than by looking:
        // a clan that came out swinging last year is already thought
        // quarrelsome, and later years refine that.
        mode: 'average',
        priorYears: 1 / 3,
        minAlpha: 0.1,
        // Knowing nothing, assume nobody starts fights.
        prior: 0,
        // How far apart two observers' counts can reasonably land.
        lookStdev: 2,
        lookWeight: 0.2,
        // A quarrel is hard to miss even between clans that barely deal with
        // each other.
        attentionThreshold: 0.1,
        conspicuousAbove: Infinity,
        // Who picked a fight with whom is the other half of village talk.
        chatter: 1,
        notableDeviation: 3,
        staleHalfLife: 20,
        seedStdev: 1.5,
        seedConfidence: 0.8,
        splitStdev: 1.5,
        splitConfidenceFactor: 0.6,
        min: 0,
    }),
};

export const ALL_OBSERVATION_DEFS: readonly ObservationDef[] =
    Object.values(ObservationDefs);

// What a report at second hand is worth next to seeing for oneself, at equal
// attention.
export const HEARSAY_WEIGHT = 0.5;

// How much weight a clan puts on another's word, from the standing it grants
// the teller. The same report lands differently depending on who carries it:
// a clan held in regard is taken at more than its word, one held in contempt
// at rather less. Prestige combines liking and respect and could run to ±1 in
// principle but sits much nearer zero in practice, so it is amplified before
// being read as a multiplier.
export const PRESTIGE_CREDENCE_FACTOR = 4;
export const MIN_CREDENCE = 0.25;
export const MAX_CREDENCE = 2.5;

export function credence(hearer: Clan, teller: Clan): number {
    return clamp(
        1 + PRESTIGE_CREDENCE_FACTOR * getPrestige(hearer, teller),
        MIN_CREDENCE, MAX_CREDENCE);
}

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
        // How much the hearer credited the teller, from the standing it
        // grants them. Undefined for what a clan saw itself.
        readonly credence?: number,
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
    // Years of firsthand evidence behind an averaged estimate, which is what
    // decides how much a fresh year still moves it.
    private yearsSeen_ = 0;

    constructor(readonly def: ObservationDef) {
        this.value_ = def.prior;
    }

    get yearsSeen(): number { return this.yearsSeen_; }

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

    // The estimate to actually act on.
    //
    // An impression is pulled back toward the prior by however unsure we are,
    // since a vague sense of someone's piety should not be acted on as though
    // it were certain. An average needs no such correction: it starts at the
    // prior and the prior's weight is already carried inside the running mean,
    // so shrinking it again would anchor it twice and undo the fast start.
    get estimate(): number {
        return this.def.mode === 'average'
            ? this.value_
            : this.confidence_ * this.value_
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
        credence?: number,
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
            valueBefore, this.value_, confidenceBefore, this.confidence_,
            credence));
    }

    // Fold in a year of one's own watching of an averaged quality. The weight
    // is not ours to choose: it falls out of how many years already stand
    // behind the estimate, which is what makes this a running mean.
    observeYear(reported: number, year: number, spread: number): void {
        const alpha = this.def.averageAlpha(this.yearsSeen_);
        this.observe(reported, alpha, year, 0, spread);
        this.yearsSeen_ += 1;
        // Confidence tracks how much of the estimate rests on real evidence
        // rather than on the prior it started from.
        this.confidence_ = this.yearsSeen_
            / (this.def.priorYears + this.yearsSeen_);
    }

    // Plant a starting impression for clans taken to be already acquainted.
    // Not evidence anyone gathered, so it leaves no provenance behind.
    seed(value: number, confidence: number, year: number): void {
        this.value_ = value;
        this.confidence_ = clamp(confidence, 0, 1);
        // An assumed acquaintance has effectively been watching for a while,
        // so a fresh year should refine the estimate rather than overwrite it.
        if (this.def.mode === 'average' && this.yearsSeen_ === 0) {
            this.yearsSeen_ = SEEDED_YEARS_SEEN;
        }
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
        o.yearsSeen_ = this.yearsSeen_;
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
        credence?: number,
    ): void {
        this.getOrCreate(def).observe(
            reported, weight, year, hops, spread, source, credence);
    }

    seed(def: ObservationDef, value: number, confidence: number, year: number): void {
        this.getOrCreate(def).seed(value, confidence, year);
    }

    observeYear(def: ObservationDef, reported: number, year: number, spread: number): void {
        this.getOrCreate(def).observeYear(reported, year, spread);
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
// How much of everything there is to know about a neighbor a clan can reach
// by dealing with that neighbor alone. Half: you learn a great deal about
// people you see constantly, but the rest of what is known about them is
// known by other people, and the only way to it is to ask around.
export const MAX_DIRECT_INFORMATION = 0.5;

// Share of what a clan knows about a third party that passes to someone it
// deals with fully. Less, in proportion, to someone it deals with less.
export const INFORMATION_SPREAD_SHARE = 0.2;

// How fast the level closes on what present dealings would support. Knowing
// someone is a matter of years, not of one good conversation.
export const INFORMATION_ADAPT_RATE = 0.2;

export class ClanInformation {
    constructor(
        // Events, remembered and fading.
        readonly memory: Memory = new Memory(),
        // State, estimated with varying confidence.
        readonly observations: Observations = new Observations(),
    ) { }

    // How much of the object clan the subject actually sees, from ongoing
    // direct interaction. Recomputed each turn: it describes the present
    // relationship, not anything remembered.
    private contactItems_: ClanInformationItem[] = [];

    // How much the subject knows about the object overall, from 0 (a name and
    // nothing else) to 1 (as much as anyone knows). This accumulates, since
    // knowing a neighbor is the work of years and does not vanish because one
    // year's dealings were thin.
    private level_ = 0;
    private directTarget_ = 0;
    // Fraction of what direct dealings miss that hearsay also fails to cover.
    private unknownAfterHearsay_ = 1;

    get items(): readonly ClanInformationItem[] { return this.contactItems_; }

    get contact(): number {
        return sumFun(this.contactItems_, item => item.value);
    }

    get level(): number { return this.level_; }
    // What present dealings alone would support.
    get directTarget(): number { return this.directTarget_; }
    // What asking around adds on top of that.
    get heardTarget(): number { return this.target - this.directTarget_; }
    // Where the level is heading, given both. Sources cover overlapping
    // ground rather than adding up, so they are combined by what each leaves
    // unknown: several informants tell you much of the same thing, and no
    // amount of asking quite gets you to certainty.
    get target(): number {
        return clamp(1 - (1 - this.directTarget_) * this.unknownAfterHearsay_, 0, 1);
    }

    // The information level, under the name the older consumers know it by:
    // it still scales respect and skill imitation.
    get value(): number {
        return this.level_;
    }

    setTargets(direct: number, unknownAfterHearsay: number): void {
        this.directTarget_ = direct;
        this.unknownAfterHearsay_ = unknownAfterHearsay;
    }

    // Move toward the target. `rate` of 1 adopts it outright, which is what
    // seeding a world of long-standing neighbors wants.
    approachTarget(rate: number = INFORMATION_ADAPT_RATE): void {
        this.level_ += (this.target - this.level_) * rate;
    }

    // Override the level directly, rather than letting it climb toward a
    // target. Used to divide a clan's understanding of a third party between
    // its successors when the clan splits, so a new clan doesn't start out
    // knowing its old neighbors as strangers.
    setLevelForSplit(level: number): void {
        this.level_ = clamp(level, 0, 1);
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
        ci.level_ = this.level_;
        ci.directTarget_ = this.directTarget_;
        ci.unknownAfterHearsay_ = this.unknownAfterHearsay_;
        return ci;
    }
}

// Work out how much each clan knows about each other clan, and move the
// levels toward it.
//
// Dealing with a neighbor directly gets you at most halfway; the rest comes
// from the people you deal with passing on what they know. A clan that talks
// to nobody but its closest neighbor therefore stays half-informed about it
// and knows next to nothing about anyone else, while a clan at the center of
// village life ends up knowing nearly everything about nearly everyone.
export function updateInformationLevels(world: World, rate?: number): void {
    // Read every level before changing any, so that what a clan passes on is
    // what it knew at the start of the turn rather than part-way through.
    const pending: { information: ClanInformation, direct: number, unknown: number }[] = [];

    for (const subject of world.allClans) {
        const links = [...world.perceptions.getFor(subject)];
        for (const [objectID, perceptions] of links) {
            const information = perceptions.information;
            const direct = MAX_DIRECT_INFORMATION * clamp(information.contact, 0, 1);

            // Each informant covers a share of what is left, so what nobody
            // covers is the product of what each of them misses.
            let unknown = 1;
            for (const [tellerID, tellerLink] of links) {
                if (tellerID === objectID) continue;
                const teller = world.clanMap.get(tellerID);
                if (!teller) continue;
                const closeness = clamp(tellerLink.information.contact, 0, 1);
                if (closeness <= 0) continue;
                const tellerKnows =
                    world.perceptions.get(teller, objectID)?.information.level ?? 0;
                unknown *= 1 - INFORMATION_SPREAD_SHARE * closeness * tellerKnows;
            }

            pending.push({ information, direct, unknown });
        }
    }

    for (const p of pending) {
        p.information.setTargets(p.direct, p.unknown);
        p.information.approachTarget(rate);
    }
}

// Settle the levels for a world whose clans have been neighbors for years.
// Run repeatedly because what each clan hears depends on what its neighbors
// already know, so the levels have to find each other.
export function seedInformationLevels(world: World): void {
    for (let i = 0; i < 12; ++i) updateInformationLevels(world, 1);
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
// firsthand. `recipientFoodPerCapita` is what the recipient had to eat before
// the help arrived, which is what decides how much the help meant.
export function recordFoodAid(
    donor: Clan,
    recipient: Clan,
    amount: number,
    recipientFoodPerCapita: number,
): void {
    if (amount <= 0) return;
    // Aid looms as large as it mattered to the recipient, so size is measured
    // against a year's ration for one of its members.
    const perCapita = amount / Math.max(1, recipient.population);
    recordDirectEvent(donor, recipient, new MemoryEntry({
        def: MemoryEventDefs.Aid,
        year: donor.world.year.value,
        actor: donor.uuid,
        target: recipient.uuid,
        magnitude: amount,
        size: MemoryEventDefs.Aid.sizeBands.classify(perCapita),
        need: NeedBands.classify(recipientFoodPerCapita),
        salience: perCapita,
    }));
}

// Remember a gift of food. Unlike aid, a gift answers no particular want, so
// there is no need to record: what it says is simply that the giver had
// something to spare and chose this neighbor.
export function recordFoodGift(donor: Clan, recipient: Clan, amount: number): void {
    if (amount <= 0) return;
    const perCapita = amount / Math.max(1, recipient.population);
    recordDirectEvent(donor, recipient, new MemoryEntry({
        def: MemoryEventDefs.Gift,
        year: donor.world.year.value,
        actor: donor.uuid,
        target: recipient.uuid,
        magnitude: amount,
        size: MemoryEventDefs.Gift.sizeBands.classify(perCapita),
        withinKin: areKin(donor, recipient),
        salience: perCapita,
    }));
}

// Whether two clans count as one another's own people: descended from one
// clan, or joined by marriage. What passes between such clans is the ordinary
// traffic of a family and says nothing about open-handedness at large.
export function areKin(a: Clan, b: Clan): boolean {
    const connections = a.world.connections;
    if (connections.getForType(a, b, KinConnection)) return true;
    const marriage = connections.getForType(a, b, MarriageConnection);
    return !!marriage && marriage.relatedness > 0;
}

// Remember a year's quarrelling. `hawkPlays` is how many times the aggressor
// reached for force out of `encounters` occasions of friction; a clan that
// never did so leaves nothing to remember.
export function recordConflict(
    aggressor: Clan,
    victim: Clan,
    hawkPlays: number,
    encounters: number,
): void {
    if (hawkPlays <= 0) return;
    recordDirectEvent(aggressor, victim, new MemoryEntry({
        def: MemoryEventDefs.Conflict,
        year: aggressor.world.year.value,
        actor: aggressor.uuid,
        target: victim.uuid,
        magnitude: hawkPlays,
        size: MemoryEventDefs.Conflict.sizeBands.classify(hawkPlays),
        // How much of the year's friction it took by force, which is what
        // says whether this was an ordinary bad patch or a year of open
        // fighting.
        salience: encounters > 0 ? hawkPlays / encounters : 0,
    }));
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

// Share of the undivided clan's understanding of a third party that one
// successor carries off, rolled independently per successor and per third
// party. Floored at 0.5 so the two successors' shares never total less than
// the whole (nothing about a third party is ever entirely lost), and average
// 1.4 combined (both sides remember much of the same thing, so there's
// overlap rather than a clean division).
function splitInformationLevelShare(): number {
    return 0.5 + Math.random() * 0.4;
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

        // Divide how well the undivided clan understood this third party.
        // Both successors carry off a share, rolled independently.
        const priorLevel = information.level;
        information.setLevelForSplit(priorLevel * splitInformationLevelShare());
        childInfo.setLevelForSplit(priorLevel * splitInformationLevelShare());
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
            observations.seed(def, def.valueFn(subject, object), def.seedConfidence, year);
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
                    def.perceivable(def.valueFn(subject, object) + normal(0, def.seedStdev)),
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
                const seen = def.valueFn(subject, object);
                if (!def.registers(attention, seen)) continue;
                const spread = def.lookStdevAt(attention);
                const observations = perceptions.information.observations;
                if (def.mode === 'average') {
                    // Already the observer's own partial count, so nothing to
                    // blur; how much it moves the estimate is set by how many
                    // years already stand behind it.
                    observations.observeYear(def, def.perceivable(seen), year, spread);
                } else {
                    observations.observe(
                        def,
                        def.perceivable(seen + normal(0, spread)),
                        def.lookWeight * attention,
                        year,
                        0,
                        spread);
                }
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
        credence: number,
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
                // garbling, plus however unsure the teller was to start. How
                // much of it is taken on board depends on how closely the two
                // deal with each other, how sure the teller was, and what the
                // hearer thinks of the teller.
                const cred = credence(hearer, teller);
                reports.push({
                    observations: hearerPerceptions.information.observations,
                    def,
                    value: def.perceivable(held.estimate + normal(0, def.lookStdev)),
                    weight: def.lookWeight * attention * held.confidence
                        * HEARSAY_WEIGHT * cred,
                    spread: def.lookStdev * (2 - held.confidence),
                    teller: tellerID,
                    credence: cred,
                });
            }
        }
    }

    for (const r of reports) {
        r.observations.observe(
            r.def, r.value, r.weight, year, 1, r.spread, r.teller, r.credence);
    }
}
