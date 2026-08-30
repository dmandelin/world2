// Who is where, and whether it has changed.
//
// The lists of every clan in a cluster, and of every clan in the world, are
// walked constantly -- tens of thousands of times a turn -- and each was
// being rebuilt from scratch on every read, flattening the settlements into a
// fresh array each time. Between them they were about a sixth of the run.
//
// They are cached instead, against this counter. Anything that changes who
// belongs where bumps it, and every cached list rebuilds on its next read.
// The counter is global rather than per-world because a cluster does not know
// its world; a stray bump from elsewhere costs one rebuild, which is nothing,
// while a missed bump would be a real bug, so it errs the safe way.
//
// The five things that change membership: a clan being founded, a clan moving
// to another settlement, a settlement being founded, a clan dying out, and a
// settlement being abandoned.
let generation = 0;

export function membershipGeneration(): number {
    return generation;
}

export function membershipChanged(): void {
    ++generation;
}

// A list rebuilt only when membership has changed since it was last read.
//
// Callers get the cached array itself rather than a copy -- copying is the
// cost being avoided -- so nothing may modify what it is handed. Everything
// that adds or removes a member does so on the settlement's own list, which
// is the source these are built from.
export class MembershipCache<T> {
    private cached_: T[] = [];
    private generation_ = -1;

    constructor(private readonly build: () => T[]) { }

    get(): T[] {
        const now = membershipGeneration();
        if (this.generation_ !== now) {
            this.cached_ = this.build();
            this.generation_ = now;
        }
        return this.cached_;
    }
}
