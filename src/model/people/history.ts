// A clan's historical knowledge: the stories, memories and records of the
// most important things it has lived through, as the clan itself holds them.
//
// This is not the news-and-reputation ledger in relations/information.ts,
// which is about what one clan has seen another do and fades within years.
// History is the clan's account of itself -- where it came from, the floods it
// survived, the fat years and the hungry ones -- and it is kept for as long as
// anyone keeps telling it.
//
// ---------------------------------------------------------------------------
// One event, many tellings
// ---------------------------------------------------------------------------
//
// Several clans can remember the same event. Each item carries an `eventId`
// shared by every clan's memory of that event, so the model (and the UI) can
// tell one flood remembered twice from two floods. The items themselves are
// NOT shared: each clan holds its own copy. When a clan splits, both halves
// start with the same memories, and from then on the copies are free to drift
// apart. A later model of clans swapping stories can make them converge again
// (or share one telling outright); for now, nothing does.
//
// ---------------------------------------------------------------------------
// Two clocks
// ---------------------------------------------------------------------------
//
// Every item records the game year it happened in, which is our bookkeeping.
// What the clan knows is `when`: a level on WHEN_LEVELS, from "this year" to
// "in the days of creation". Age pushes it along the scale, but it is stored
// rather than derived, because other processes can push it further than age
// alone would, and it only ever gets vaguer.
//
// Ages are counted against `asOf`, the year the history was last brought up
// to date. That happens at the close of each year, before the calendar turns,
// so a flood that struck in the year just finished is "this year" -- the same
// year The Waters panel calls "this year's flood".

import type { Eudaimonia } from "../self/eudaimonia";
import type { ExtremeFlood } from "../environment/flood";
import type { World } from "../world";
import { dice, isPositive } from "../lib/basics";
import { randomAncestorPair } from "./names";

// --- Timeframes -------------------------------------------------------------

export type HistoryTimeframe = "recent" | "living" | "family" | "ancient";

export interface HistoryTimeframeDef {
    key: HistoryTimeframe;
    label: string;
    // Events younger than this many years fall in this timeframe.
    maxAge: number;
    // How stories from this far back are told.
    blurb: string;
}

// Newest first. The same windows serve two purposes: how an event's story is
// told, by its age, and the periods a clan reckons its best and worst years
// over.
export const HISTORY_TIMEFRAMES: readonly HistoryTimeframeDef[] = [
    {
        key: "recent", label: "Recent years", maxAge: 20,
        blurb: "Told plainly, as things that happened.",
    },
    {
        key: "living", label: "Living memory", maxAge: 80,
        blurb: "Grandparents' tales, grown a little in the telling.",
    },
    {
        key: "family", label: "Family stories", maxAge: 150,
        blurb: "Handed down, and grown past what could quite have happened.",
    },
    {
        key: "ancient", label: "Ancient stories", maxAge: Infinity,
        blurb: "Myth: how things came to be the way they are.",
    },
];

export const HISTORY_TIMEFRAME_DEFS: ReadonlyMap<HistoryTimeframe, HistoryTimeframeDef> =
    new Map(HISTORY_TIMEFRAMES.map(tf => [tf.key, tf]));

// How long a memory can go on being told this way, e.g. "up to 20 years".
export function timeframeSpan(tf: HistoryTimeframeDef): string {
    if (tf.maxAge !== Infinity) return `up to ${tf.maxAge} years`;
    const i = HISTORY_TIMEFRAMES.indexOf(tf);
    return `${HISTORY_TIMEFRAMES[i - 1].maxAge} years and beyond`;
}

// The timeframe as a tooltip: its span, then how it is told.
export function timeframeTooltip(tf: HistoryTimeframeDef): string {
    return `${tf.label}: ${timeframeSpan(tf)}. ${tf.blurb}`;
}

// --- What the clan knows of when --------------------------------------------

export interface WhenLevel {
    // What the clan says.
    label: string;
    // Events younger than this are known at this level or better.
    upToAge: number;
    // The ages the level covers, in our terms rather than the clan's.
    range: string;
}

// The clan counts years exactly only for the last three. Past that, it knows
// roughly how long ago, in years and then in generations; past a hundred,
// only that it was long ago.
export const WHEN_LEVELS: readonly WhenLevel[] = [
    { label: "this year", upToAge: 1, range: "this year" },
    { label: "last year", upToAge: 2, range: "1 year ago" },
    { label: "the year before last", upToAge: 3, range: "2 years ago" },
    { label: "a few years ago", upToAge: 5, range: "3 to 5 years ago" },
    { label: "some years ago", upToAge: 10, range: "5 to 10 years ago" },
    { label: "less than a generation ago", upToAge: 20, range: "10 to 20 years ago" },
    { label: "a generation ago", upToAge: 40, range: "20 to 40 years ago" },
    { label: "two generations ago", upToAge: 60, range: "40 to 60 years ago" },
    { label: "three or four generations ago", upToAge: 100, range: "60 to 100 years ago" },
    { label: "a long time ago", upToAge: 150, range: "100 to 150 years ago" },
    { label: "in the ancestors' time", upToAge: Infinity, range: "150 years ago or more" },
    // Never reached by age alone; for processes that turn history into myth.
    { label: "in the days of creation", upToAge: Infinity, range: "beyond any reckoning" },
];

export const WhenLevels = {
    ThisYear: 0,
    AncestorsTime: 10,
    Creation: 11,
} as const;

export function whenLevelForAge(age: number): number {
    for (let i = 0; i < WhenLevels.Creation; ++i) {
        if (age < WHEN_LEVELS[i].upToAge) return i;
    }
    return WhenLevels.AncestorsTime;
}

// --- Items ------------------------------------------------------------------

// Items are numbered for display and for picking a telling; copies keep the
// number. Event ids are what copies held by different clans share.
let nextHistoryItemId = 1;
let nextHistoryEventId = 1;

export function newHistoryEventId(): number {
    return nextHistoryEventId++;
}

export type HistoryItemKind = "origin" | "flood" | "fortune";

export abstract class HistoryItem {
    abstract readonly kind: HistoryItemKind;
    readonly id = nextHistoryItemId++;
    private when_: number;

    constructor(
        readonly eventId: number,
        // Game year, or undefined for what happened before the simulation.
        readonly year: number | undefined,
        when: number,
    ) {
        this.when_ = when;
    }

    // Level on WHEN_LEVELS: what the clan knows of when it happened.
    get when(): number {
        return this.when_;
    }

    // Knowledge of when only ever gets vaguer.
    blur(level: number): void {
        if (level > this.when_) this.when_ = Math.min(level, WHEN_LEVELS.length - 1);
    }

    // A copy with the same id and the same knowledge, free to diverge.
    copy(): this {
        return Object.assign(Object.create(Object.getPrototypeOf(this)), this);
    }
}

export type OriginSplit = {
    role: "senior" | "cadet";
    // The other house, by the name it had at the time.
    otherName: string;
    otherUuid: string;
};

// Where the clan comes from. Every clan has exactly one: a clan that splits
// forgets the older origin and remembers the split instead, so a clan's
// memory holds a single link to its senior or cadet house, not a family tree.
export class OriginMemory extends HistoryItem {
    readonly kind = "origin" as const;

    constructor(
        eventId: number,
        year: number | undefined,
        when: number,
        readonly maternalAncestor: string,
        readonly paternalAncestor: string,
        // Absent for the clans the world began with.
        readonly split?: OriginSplit,
    ) {
        super(eventId, year, when);
    }
}

export type FloodSize = "river" | "great" | "world";

// An extreme flood that caught the clan.
export class FloodMemory extends HistoryItem {
    readonly kind = "flood" as const;

    constructor(
        eventId: number,
        year: number,
        when: number,
        readonly floodKey: "flood20" | "flood100" | "flood500",
        readonly floodName: string,
        readonly cropsLost: number,
        // Grain lost as a share of what the clan needed to eat that year.
        readonly foodShareLost: number,
        // Drownings this flood accounts for, and the same before rounding.
        readonly deaths: number,
        readonly deathsExact: number,
        readonly ditchHelped: boolean,
        // Clan size going into the year.
        readonly population: number,
    ) {
        super(eventId, year, when);
    }

    get size(): FloodSize {
        switch (this.floodKey) {
            case "flood20": return "river";
            case "flood100": return "great";
            case "flood500": return "world";
        }
    }
}

// A year whose Fortune stands out as the best or worst over some period.
export class FortuneMemory extends HistoryItem {
    readonly kind = "fortune" as const;

    // Periods this year is the record for, narrowest first. Kept up to date
    // by the history as the windows slide, so not readonly.
    periods: HistoryTimeframe[];

    constructor(
        eventId: number,
        year: number,
        when: number,
        readonly polarity: "best" | "worst",
        readonly fortune: number,
        // The clan's eudaimonia as that year closed: enough to replay the
        // Fortune derivation.
        readonly snapshot: Eudaimonia,
        periods: HistoryTimeframe[],
    ) {
        super(eventId, year, when);
        this.periods = periods;
    }

    // The broadest period it holds the record for, which is how it is known.
    get headline(): HistoryTimeframe {
        return this.periods[this.periods.length - 1];
    }

    override copy(): this {
        const c = super.copy();
        c.periods = [...this.periods];
        return c;
    }
}

export type AnyHistoryItem = OriginMemory | FloodMemory | FortuneMemory;

// Names one event across every clan that remembers it, where an item is one
// clan's copy. The same year's Fortune could in principle be one clan's best
// year and another's worst, so a Fortune record's polarity is part of it.
export function historyEventKey(item: AnyHistoryItem): string {
    return item.kind === "fortune"
        ? `fortune:${item.eventId}:${item.polarity}`
        : `${item.kind}:${item.eventId}`;
}

const KIND_ORDER: Record<HistoryItemKind, number> = { origin: 0, flood: 1, fortune: 2 };

// Oldest first; what happened before anyone was counting leads.
export function compareHistoryItems(a: AnyHistoryItem, b: AnyHistoryItem): number {
    const ay = a.year ?? -Infinity;
    const by = b.year ?? -Infinity;
    if (ay !== by) return ay - by;
    return KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
}

// --- Fortune records --------------------------------------------------------

// A year's Fortune, as tracked for records. Immutable, so histories share them.
class FortuneYear {
    constructor(
        readonly eventId: number,
        readonly year: number,
        readonly fortune: number,
        readonly snapshot: Eudaimonia,
    ) {}
}

// A clan needs a few years behind it before any of them stands out.
export const FORTUNE_MIN_YEARS = 5;

// The longest finite window, beyond which only the all-time records are kept.
const FORTUNE_WINDOW = HISTORY_TIMEFRAMES[HISTORY_TIMEFRAMES.length - 2].maxAge;

// Append to a monotonic run: each entry beats everything newer than it, so
// the record over the last W years is the first entry younger than W. `beats`
// is strict, so a newer year displaces an older one it ties.
function pushRun(run: FortuneYear[], entry: FortuneYear, beats: (a: number, b: number) => boolean) {
    while (run.length && !beats(run[run.length - 1].fortune, entry.fortune)) run.pop();
    run.push(entry);
}

const higher = (a: number, b: number) => a > b;
const lower = (a: number, b: number) => a < b;

// --- History ----------------------------------------------------------------

// The clans the world begins with were founded 40 + 2d20 years before it.
const FOUNDING_MIN_AGE = 40;

export class History {
    private items_: AnyHistoryItem[] = [];
    private asOf_: number;

    // Fortune bookkeeping. The runs cover the longest finite window; the
    // all-time records are kept on their own.
    private bestRun_: FortuneYear[] = [];
    private worstRun_: FortuneYear[] = [];
    private bestEver_: FortuneYear | undefined;
    private worstEver_: FortuneYear | undefined;
    private yearsTracked_ = 0;

    private constructor(asOf: number) {
        this.asOf_ = asOf;
    }

    // The history of a clan the world began with: an origin some two
    // generations or so before the simulation starts, and nothing else yet.
    static founding(asOf: number): History {
        const history = new History(asOf);
        const [maternal, paternal] = randomAncestorPair();
        const age = FOUNDING_MIN_AGE + dice(2, 20, 0);
        history.items_.push(new OriginMemory(
            newHistoryEventId(), asOf - age, whenLevelForAge(age), maternal, paternal));
        return history;
    }

    clone(): History {
        const h = new History(this.asOf_);
        h.items_ = this.items_.map(i => i.copy());
        h.bestRun_ = [...this.bestRun_];
        h.worstRun_ = [...this.worstRun_];
        h.bestEver_ = this.bestEver_;
        h.worstEver_ = this.worstEver_;
        h.yearsTracked_ = this.yearsTracked_;
        return h;
    }

    get items(): readonly AnyHistoryItem[] {
        return this.items_;
    }

    get asOf(): number {
        return this.asOf_;
    }

    get origin(): OriginMemory | undefined {
        return this.items_.find((i): i is OriginMemory => i.kind === "origin");
    }

    // Years since it happened, as of the last update. Undefined for what
    // happened before the simulation.
    yearsAgo(item: HistoryItem): number | undefined {
        return item.year === undefined ? undefined : Math.max(0, this.asOf_ - item.year);
    }

    whenLabel(item: HistoryItem): string {
        return WHEN_LEVELS[item.when].label;
    }

    // How the story is told: by its age, or as myth once the clan only knows
    // it happened in the ancestors' time.
    timeframeOf(item: HistoryItem): HistoryTimeframe {
        const age = this.yearsAgo(item);
        if (age === undefined || item.when >= WhenLevels.AncestorsTime) return "ancient";
        for (const tf of HISTORY_TIMEFRAMES) {
            if (age < tf.maxAge) return tf.key;
        }
        return "ancient";
    }

    // The clan became two. This clan's origin is now the split, with a new
    // pair of ancestors at the head of its line; the older origin is let go.
    foundBySplit(
        eventId: number,
        year: number,
        role: OriginSplit["role"],
        other: { uuid: string; name: string },
    ): void {
        const [maternal, paternal] = randomAncestorPair();
        const origin = new OriginMemory(
            eventId, year, whenLevelForAge(Math.max(0, this.asOf_ - year)),
            maternal, paternal,
            { role, otherName: other.name, otherUuid: other.uuid });
        this.items_ = this.items_.filter(i => i.kind !== "origin");
        this.items_.unshift(origin);
    }

    recordFlood(memory: FloodMemory): void {
        this.items_.push(memory);
    }

    // Take in the year's Fortune, and bring the best and worst years up to
    // date for every period.
    recordFortune(year: number, fortune: number, snapshot: Eudaimonia): void {
        const entry = new FortuneYear(newHistoryEventId(), year, fortune, snapshot);

        pushRun(this.bestRun_, entry, higher);
        pushRun(this.worstRun_, entry, lower);
        while (this.bestRun_.length && year - this.bestRun_[0].year >= FORTUNE_WINDOW) {
            this.bestRun_.shift();
        }
        while (this.worstRun_.length && year - this.worstRun_[0].year >= FORTUNE_WINDOW) {
            this.worstRun_.shift();
        }
        if (!this.bestEver_ || fortune >= this.bestEver_.fortune) this.bestEver_ = entry;
        if (!this.worstEver_ || fortune <= this.worstEver_.fortune) this.worstEver_ = entry;
        ++this.yearsTracked_;

        this.refreshFortuneRecords(year);
    }

    // Bring what the clan knows of when things happened up to the given year.
    age(now: number): void {
        this.asOf_ = now;
        for (const item of this.items_) {
            if (item.year !== undefined) item.blur(whenLevelForAge(Math.max(0, now - item.year)));
        }
    }

    // The record over the last `years` years.
    private recordWithin(polarity: "best" | "worst", now: number, years: number): FortuneYear | undefined {
        if (years === Infinity) return polarity === "best" ? this.bestEver_ : this.worstEver_;
        const run = polarity === "best" ? this.bestRun_ : this.worstRun_;
        return run.find(e => now - e.year < years);
    }

    // A period only counts once the clan has lived through more of it than
    // the period before: fifty years can have a best year in living memory,
    // but not yet one beyond it.
    private periodCounts(index: number): boolean {
        if (this.yearsTracked_ < FORTUNE_MIN_YEARS) return false;
        return index === 0 || this.yearsTracked_ > HISTORY_TIMEFRAMES[index - 1].maxAge;
    }

    private refreshFortuneRecords(now: number): void {
        const found = new Map<string, { entry: FortuneYear; polarity: "best" | "worst"; periods: HistoryTimeframe[] }>();
        const note = (entry: FortuneYear, polarity: "best" | "worst", period: HistoryTimeframe) => {
            const key = `${polarity}:${entry.year}`;
            const record = found.get(key);
            if (record) record.periods.push(period);
            else found.set(key, { entry, polarity, periods: [period] });
        };

        HISTORY_TIMEFRAMES.forEach((tf, i) => {
            if (!this.periodCounts(i)) return;
            const best = this.recordWithin("best", now, tf.maxAge);
            const worst = this.recordWithin("worst", now, tf.maxAge);
            // A run of years all alike has nothing in it to remember.
            if (!best || !worst || best.fortune === worst.fortune) return;
            note(best, "best", tf.key);
            note(worst, "worst", tf.key);
        });

        // Keep the item for a year that is still a record, so its id and what
        // the clan knows of its date carry on; add and drop the rest.
        const existing = new Map<string, FortuneMemory>();
        for (const item of this.items_) {
            if (item.kind === "fortune") existing.set(`${item.polarity}:${item.year}`, item);
        }
        this.items_ = this.items_.filter(i => i.kind !== "fortune");
        for (const [key, { entry, polarity, periods }] of found) {
            const item = existing.get(key);
            if (item) {
                item.periods = periods;
                this.items_.push(item);
            } else {
                this.items_.push(new FortuneMemory(
                    entry.eventId, entry.year, whenLevelForAge(Math.max(0, now - entry.year)),
                    polarity, entry.fortune, entry.snapshot, periods));
            }
        }
    }
}

// --- Laying out for display ---------------------------------------------------

export interface HistoryWhenGroup<T> {
    level: number;
    def: WhenLevel;
    entries: T[];
}

export interface HistoryTimeframeGroup<T> {
    tf: HistoryTimeframeDef;
    whens: HistoryWhenGroup<T>[];
}

// Lays history out newest first: by how far back the story lies, then by
// what the clan knows of when it happened, then by year. `place` finds the
// item an entry stands for and the history that holds it, so a listing of
// several clans' memories can be laid out the same way as one clan's.
export function groupHistory<T>(
    entries: readonly T[],
    place: (entry: T) => { item: AnyHistoryItem; history: History },
): HistoryTimeframeGroup<T>[] {
    const groups: HistoryTimeframeGroup<T>[] = [];
    for (const tf of HISTORY_TIMEFRAMES) {
        const byLevel = new Map<number, T[]>();
        for (const entry of entries) {
            const { item, history } = place(entry);
            if (history.timeframeOf(item) !== tf.key) continue;
            const list = byLevel.get(item.when);
            if (list) list.push(entry);
            else byLevel.set(item.when, [entry]);
        }
        if (byLevel.size === 0) continue;
        const whens = [...byLevel]
            .sort(([a], [b]) => a - b)
            .map(([level, list]) => ({
                level,
                def: WHEN_LEVELS[level],
                entries: list.toSorted((a, b) =>
                    compareHistoryItems(place(b).item, place(a).item)),
            }));
        groups.push({ tf, whens });
    }
    return groups;
}

// --- The year's update ------------------------------------------------------

// Take the year that just closed into every clan's history. Runs once the
// year's drownings are drawn and its eudaimonia is reckoned, and before the
// calendar turns, so that it is all "this year".
export function updateHistories(world: World): void {
    const now = world.year.value;

    // Every clan a flood caught shares the one event.
    const floodIds = new Map<ExtremeFlood, number>(
        world.extremeFloods.map(f => [f, newHistoryEventId()]));

    for (const clan of world.allClans) {
        const history = clan.history;
        const damage = clan.floodDamage;
        const population = clan.lastPopulationChange.previousSize;
        for (const impact of damage.impacts) {
            // The year's drownings split among its floods by the risk each
            // carried, as ExtremeFlood.deaths does.
            const deathsExact = isPositive(damage.totalDeathRisk)
                ? damage.deaths * impact.deathRisk / damage.totalDeathRisk : 0;
            history.recordFlood(new FloodMemory(
                floodIds.get(impact.flood) ?? newHistoryEventId(),
                now, WhenLevels.ThisYear,
                impact.flood.kind.key, impact.flood.kind.name,
                impact.cropsLost,
                // A person eats one unit of food a year.
                impact.cropsLost / Math.max(1, population),
                Math.round(deathsExact), deathsExact,
                impact.ditchHelped, population));
        }

        if (clan.eudaimonia.hasRun) {
            history.recordFortune(now, clan.eudaimonia.fortune, clan.eudaimonia.clone());
        }

        history.age(now);
    }
}
