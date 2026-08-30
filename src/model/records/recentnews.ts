import type { NewsItem } from "../relations/information";

// The last twenty years of news worth reporting, for the world at large.
//
// Every clan keeps its own news, and between them they hold a great many
// copies of the same few occasions. This is the other view: one entry per
// thing that happened, anywhere, kept long enough to show a run of years and
// no longer. It exists to be read -- the event feeds, the settlement views --
// rather than to be reasoned over, so it holds what a reader would want to
// see and drops the rest at the door.
//
// Only items above a salience threshold get in. Most of what happens in a
// year is a small gift between two clans who deal with each other constantly,
// which is worth exactly nothing to a reader.

// How many years are kept.
export const RECENT_NEWS_YEARS = 20;

// How big a thing has to be to be worth reporting at all. Food news is
// measured in rations per head of the recipient and conflict in the share of
// a year's friction that turned to force, so this is generous to quarrels and
// strict with gifts, which is about right for what reads as news.
export const RECENT_NEWS_SALIENCE = 0.05;

export type RecentNewsEntry = {
    readonly year: number;
    readonly item: NewsItem;
};

export class RecentNews {
    // One bucket per year, addressed by the year itself modulo the span. The
    // whole point of the shape: dropping the oldest year is emptying one
    // array, not filtering a list of thousands, and it happens once a year
    // rather than once per item added.
    private readonly buckets: NewsItem[][] =
        Array.from({ length: RECENT_NEWS_YEARS }, () => []);
    // Which year each bucket currently holds, so a bucket left over from
    // twenty years ago is recognised as stale rather than read as current.
    private readonly bucketYears: number[] =
        new Array(RECENT_NEWS_YEARS).fill(Number.NEGATIVE_INFINITY);
    private latestYear_ = Number.NEGATIVE_INFINITY;

    get latestYear(): number { return this.latestYear_; }

    private slot(year: number): number {
        const i = year % RECENT_NEWS_YEARS;
        return i < 0 ? i + RECENT_NEWS_YEARS : i;
    }

    // Take in one occasion, if it is worth reporting. Reusing the bucket is
    // what makes the twenty-year window free: the year that was there is
    // dropped by being written over.
    add(item: NewsItem, year: number): void {
        if (item.salience < RECENT_NEWS_SALIENCE) return;
        const i = this.slot(year);
        if (this.bucketYears[i] !== year) {
            this.buckets[i].length = 0;
            this.bucketYears[i] = year;
        }
        this.buckets[i].push(item);
        if (year > this.latestYear_) this.latestYear_ = year;
    }

    // Everything still in the window, newest year first. Years outside it are
    // skipped rather than cleaned up, so nothing has to be done on the years
    // when nothing happens.
    *entries(): IterableIterator<RecentNewsEntry> {
        const oldest = this.latestYear_ - RECENT_NEWS_YEARS + 1;
        for (let year = this.latestYear_; year >= oldest; --year) {
            const i = this.slot(year);
            if (this.bucketYears[i] !== year) continue;
            for (const item of this.buckets[i]) yield { year, item };
        }
    }

    // Everything a given set of clans had a part in, newest first. What the
    // settlement and clan views want.
    *entriesInvolving(uuids: ReadonlySet<string>): IterableIterator<RecentNewsEntry> {
        for (const entry of this.entries()) {
            const { actor, target } = entry.item;
            if (uuids.has(actor) || (target && uuids.has(target))) yield entry;
        }
    }

    get size(): number {
        let n = 0;
        for (const _ of this.entries()) ++n;
        return n;
    }
}
