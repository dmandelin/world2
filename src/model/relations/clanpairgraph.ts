import { uuidOf, type HasOrIsUUID, type UUID } from "../records/basicdata";

// Adjacency-map graphs over clans.
//
// Everything the model holds about how two clans stand to each other lives in
// one of these: what connects them, what they do together, what they make of
// each other. They are keyed the same way and walked in the same three
// patterns -- one pair, one clan's neighbors, every pair -- so the keying and
// the walking are done here once.
//
// The store is a map of maps rather than one map keyed by a combined pair id.
// Both forms answer "this one pair" in about the same time, but a pair id has
// to be built before you can ask (a comparison and a string concatenation,
// and garbage afterward), and getting one clan's neighbors out of that form
// means splitting every id back apart into two strings. The nested form asks
// with two plain lookups and hands back a clan's neighbors as an iterator
// over a map that already exists: no strings built, nothing allocated.
//
// Walking neighbors is the hottest pattern in the model -- mutual aid alone
// does it four times a turn per clan -- so that is what the shape is chosen
// for.

// Shared stand-in for "no neighbors", so the empty case allocates no map.
const NO_NEIGHBORS: readonly [UUID, never][] = [];

// An undirected graph: one value per unordered pair, reachable from either
// end. Both directions of the adjacency map hold the *same* value, so an edge
// is one object however it is reached.
export class ClanPairGraph<V> {
    protected readonly adj_ = new Map<UUID, Map<UUID, V>>();

    get(c1: HasOrIsUUID, c2: HasOrIsUUID): V | undefined {
        return this.adj_.get(uuidOf(c1))?.get(uuidOf(c2));
    }

    has(c1: HasOrIsUUID, c2: HasOrIsUUID): boolean {
        return this.adj_.get(uuidOf(c1))?.has(uuidOf(c2)) ?? false;
    }

    // Both ends point at the same value.
    set(c1: HasOrIsUUID, c2: HasOrIsUUID, value: V): void {
        const u1 = uuidOf(c1);
        const u2 = uuidOf(c2);
        this.side(u1).set(u2, value);
        this.side(u2).set(u1, value);
    }

    delete(c1: HasOrIsUUID, c2: HasOrIsUUID): void {
        const u1 = uuidOf(c1);
        const u2 = uuidOf(c2);
        const s1 = this.adj_.get(u1);
        if (s1) {
            s1.delete(u2);
            if (s1.size === 0) this.adj_.delete(u1);
        }
        const s2 = this.adj_.get(u2);
        if (s2) {
            s2.delete(u1);
            if (s2.size === 0) this.adj_.delete(u2);
        }
    }

    // The value on this edge, adding it if the edge is new.
    getOrSet(c1: HasOrIsUUID, c2: HasOrIsUUID, make: () => V): V {
        let value = this.get(c1, c2);
        if (value === undefined) {
            value = make();
            this.set(c1, c2, value);
        }
        return value;
    }

    private side(uuid: UUID): Map<UUID, V> {
        let m = this.adj_.get(uuid);
        if (!m) {
            m = new Map();
            this.adj_.set(uuid, m);
        }
        return m;
    }

    // One clan's neighbors, as an iterator over the map that already holds
    // them. The hot path: nothing is built to answer this.
    getFor(c: HasOrIsUUID): Iterable<[UUID, V]> {
        return this.adj_.get(uuidOf(c))?.entries() ?? NO_NEIGHBORS;
    }

    // Every pair, once each. Both directions are stored, so one of them is
    // skipped by taking only the side where the first uuid sorts lower.
    *pairs(): IterableIterator<[UUID, UUID, V]> {
        for (const [u1, side] of this.adj_) {
            for (const [u2, value] of side) {
                if (u1 < u2) yield [u1, u2, value];
            }
        }
    }

    clear(): void {
        this.adj_.clear();
    }

    // Copy every edge of another graph into this one, passing each value
    // through `copy`. Subclasses use this for their own clone().
    protected fillFrom(other: ClanPairGraph<V>, copy: (value: V) => V): void {
        for (const [u1, u2, value] of other.pairs()) {
            this.set(u1, u2, copy(value));
        }
    }
}

// An undirected graph whose edges each hold a list of things: the connections
// between two clans, or the interactions going on between them. Absent and
// empty read the same to callers, so `get` always answers with an array.
const NO_ITEMS: readonly any[] = [];

export class ClanPairListGraph<T> extends ClanPairGraph<T[]> {
    // Narrower than the base: an edge with no list is the same as an edge
    // with an empty one, and callers should not have to tell them apart.
    override get(c1: HasOrIsUUID, c2: HasOrIsUUID): T[] {
        return super.get(c1, c2) ?? (NO_ITEMS as T[]);
    }

    getOfType<U extends T>(
        c1: HasOrIsUUID, c2: HasOrIsUUID,
        type: new (...args: any[]) => U): U | undefined {
        const items = super.get(c1, c2);
        if (!items) return undefined;
        return items.find(item => item instanceof type) as U | undefined;
    }

    // The item of this kind on the edge, adding the edge and the item if
    // either is missing.
    getOrCreate<U extends T>(
        c1: HasOrIsUUID, c2: HasOrIsUUID,
        type: new (uuid1: UUID, uuid2: UUID) => U,
        provider?: () => U): U {
        let items = super.get(c1, c2);
        if (!items) {
            items = [];
            this.set(c1, c2, items);
        }
        let item = items.find(i => i instanceof type) as U | undefined;
        if (!item) {
            item = provider ? provider() : new type(uuidOf(c1), uuidOf(c2));
            items.push(item);
        }
        return item;
    }

    // Drop every item of a kind, everywhere, and any edge left holding
    // nothing. The two directions share one array, so removing in place
    // removes it from both.
    removeType(type: new (...args: any[]) => T): void {
        const emptied: [UUID, UUID][] = [];
        for (const [u1, u2, items] of this.pairs()) {
            for (let i = items.length - 1; i >= 0; --i) {
                if (items[i] instanceof type) items.splice(i, 1);
            }
            if (items.length === 0) emptied.push([u1, u2]);
        }
        for (const [u1, u2] of emptied) this.delete(u1, u2);
    }

    // Drop one item from one edge, and the edge if that was the last of them.
    removeItem(c1: HasOrIsUUID, c2: HasOrIsUUID, item: T): void {
        const items = super.get(c1, c2);
        if (!items) return;
        const i = items.indexOf(item);
        if (i === -1) return;
        items.splice(i, 1);
        if (items.length === 0) this.delete(c1, c2);
    }
}

// A directed graph: what one clan holds about another, which need not be what
// the other holds about it. Kept with a reverse index as well, so "everyone
// who has a view of this clan" is as cheap as "everyone this clan has a view
// of" -- news of a clan has to reach everyone who thinks about it.
export class DirectedClanPairGraph<V> {
    // subject -> object -> value
    protected readonly out_ = new Map<UUID, Map<UUID, V>>();
    // object -> subject -> value
    protected readonly in_ = new Map<UUID, Map<UUID, V>>();

    getEdge(subject: HasOrIsUUID, object: HasOrIsUUID): V | undefined {
        return this.out_.get(uuidOf(subject))?.get(uuidOf(object));
    }

    setEdge(subject: HasOrIsUUID, object: HasOrIsUUID, value: V): void {
        const s = uuidOf(subject);
        const o = uuidOf(object);
        side(this.out_, s).set(o, value);
        side(this.in_, o).set(s, value);
    }

    deleteEdge(subject: HasOrIsUUID, object: HasOrIsUUID): void {
        const s = uuidOf(subject);
        const o = uuidOf(object);
        this.out_.get(s)?.delete(o);
        this.in_.get(o)?.delete(s);
    }

    // Everything this clan holds about others.
    getFor(subject: HasOrIsUUID): Iterable<[UUID, V]> {
        return this.out_.get(uuidOf(subject))?.entries() ?? NO_NEIGHBORS;
    }

    // Everything others hold about this clan.
    getRegarding(object: HasOrIsUUID): Iterable<[UUID, V]> {
        return this.in_.get(uuidOf(object))?.entries() ?? NO_NEIGHBORS;
    }

    *edges(): IterableIterator<[UUID, UUID, V]> {
        for (const [s, side] of this.out_) {
            for (const [o, value] of side) yield [s, o, value];
        }
    }

    protected fillFrom(
        other: DirectedClanPairGraph<V>, copy: (value: V) => V): void {
        for (const [s, o, value] of other.edges()) this.setEdge(s, o, copy(value));
    }
}

function side<V>(m: Map<UUID, Map<UUID, V>>, uuid: UUID): Map<UUID, V> {
    let inner = m.get(uuid);
    if (!inner) {
        inner = new Map();
        m.set(uuid, inner);
    }
    return inner;
}
