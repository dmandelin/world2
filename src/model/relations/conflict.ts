import type { Clan } from "../people/people";
import { uuidOf, type HasOrIsUUID, type UUID } from "../records/basicdata";
import type { World } from "../world";

// How many iterations of the simple conflict game to apply per
// turn for any pair of clans.
const ITERATIONS_PER_TURN = 5;

// Probability of playing hawk in one iteration.
const HAWK_PROBABILITY = 0.2;

// Wrapper around ConflictGraph adding higher-level behaviors.
export class Conflicts {
    private readonly g;

    constructor(private readonly world: World, g?: ConflictGraph) {
        this.g = g ?? new ConflictGraph();
    }

    clone(): Conflicts {
        return new Conflicts(this.world, this.g.clone());
    }

    get(c1: HasOrIsUUID, c2: HasOrIsUUID) {
        return this.g.get(uuidOf(c1), uuidOf(c2));
    }

    *entriesForClan(c1: HasOrIsUUID) {
        for (const [uuid2, conflict] of this.g.entriesForHasUUID(c1)) {
            const c2 = this.world.clanMap.get(uuid2);
            if (!c2) continue;
            yield [c2, conflict] as [Clan, Conflict];
        }
    }

    advance(): void {
        // For now we assume that only local conflicts are significant.
        this.prune((c1, c2, conflict) => c1.settlement !== c2.settlement);

        for (const settlement of this.world.allSettlements) {
            for (const c1 of settlement.clans) {
                for (const c2 of settlement.clans) {
                    if (c1 === c2) continue;
                    if (c1 > c2) continue;
                    const conflict = this.g.getOrCreate(c1.uuid, c2.uuid);
                    conflict.advance();
                }
            }
        }
    }

    // Remove everything where `fn` returns true.
    prune(fn: (c1: Clan, c2: Clan, conflict: Conflict) => boolean): void {
        for (const [c1, c2, conflict] of this.g.entries()) {
            const clan1 = this.world.clanMap.get(c1);
            if (!clan1) continue;
            const clan2 = this.world.clanMap.get(c2);
            if (!clan2) continue;

            if (fn(clan1, clan2, conflict)) {
                this.g.remove(c1, c2);
            }
        }
    }
}

// Graph of conflicts that deals in UUIDs only.
export class ConflictGraph {
    // clan1 -> clan2 -> conflict (where clan1.uuid < clan2.uuid)
    private readonly m_ = new Map<UUID, Map<UUID, Conflict>>();
    // clan2 -> clan1 -> conflict
    private readonly r_ = new Map<UUID, Map<UUID, Conflict>>();

    *entries() {
        for (const [c1, c1Map] of this.m_) {
            for (const [c2, conflict] of c1Map) {
                yield [c1, c2, conflict] as [UUID, UUID, Conflict];
            }
        }
    }

    *entriesForHasUUID(c: HasOrIsUUID): Iterable<[UUID, Conflict]>{
        const uuid = uuidOf(c);
        const c1Map = this.m_.get(uuid);
        if (!c1Map) return;
        for (const [c2, conflict] of c1Map) {
            yield [c2, conflict] as [UUID, Conflict];
        }
    }

    clone(): ConflictGraph {
        const g = new ConflictGraph();
        for (const [c1, c1Map] of this.m_) {
            for (const [c2, conflict] of c1Map) {
                g.add(c1, c2, conflict);
            }
        }
        return g;
    }

    add(c1: UUID, c2: UUID, conflict: Conflict): void {
        if (c1 > c2) [c1, c2] = [c2, c1];

        let c1Map = this.m_.get(c1);
        if (!c1Map) {
            c1Map = new Map();
            this.m_.set(c1, c1Map);
        }
        c1Map.set(c2, conflict);

        let c2Map = this.r_.get(c2);
        if (!c2Map) {
            c2Map = new Map();
            this.r_.set(c2, c2Map);
        }
        c2Map.set(c1, conflict);
    }

    remove(c1: UUID, c2: UUID): void {
        if (c1 > c2) [c1, c2] = [c2, c1];

        const c1Map = this.m_.get(c1);
        if (!c1Map) return;
        c1Map.delete(c2);
        if (c1Map.size === 0) this.m_.delete(c1);

        const c2Map = this.r_.get(c2);
        if (!c2Map) return;
        c2Map.delete(c1);
        if (c2Map.size === 0) this.r_.delete(c2);
    }

    getOrCreate(c1: UUID, c2: UUID): Conflict {
        let conflict = this.get(c1, c2);
        if (!conflict) {
            conflict = new Conflict(c1, c2);
            this.add(c1, c2, conflict);
        }
        return conflict;
    }

    get(c1: UUID, c2: UUID): Conflict | undefined {
        if (c1 > c2) [c1, c2] = [c2, c1];

        const c1Map = this.m_.get(c1);
        if (!c1Map) return undefined;
        return c1Map.get(c2);
    }
}

const DOVE = 0;
const HAWK = 1;

// The payoff structure assumes that for a conflict
// iteration, there is some loss (damaging event that
// triggered the conflict and/or costs of peaceful
// resolution) and the conflict is over how to distribute
// it.

// TODO - Consider having conflicts over gains too.

// Reward for both playing dove: a relatively low cost of
// damages and resolution.
const R = -1;
// Temptation to play hawk against dove: dove has to take
// the loss.
const T = 0;
// Sucker's payoff for playing dove against hawk.
const S = -2;
// Punishment for both playing hawk: high cost of resolution.
const P = -5;


export class Conflict {
    readonly uuid1: string;
    readonly uuid2: string;

    // Indexed by clan1 strategy, clan2 strategy.
    results = [
        [new ConflictResults(), new ConflictResults()],
        [new ConflictResults(), new ConflictResults()],
    ];

    constructor(c1: HasOrIsUUID, c2: HasOrIsUUID) {
        this.uuid1 = uuidOf(c1);
        this.uuid2 = uuidOf(c2);
    }

    value(c: HasOrIsUUID) {
        return this.uuid1 === uuidOf(c)
             ? this.totalOf(r => r.c1Payoff)
             : this.totalOf(r => r.c2Payoff);
    }

    private totalOf(fn: (r: ConflictResults) => number): number {
        let total = 0;
        for (const rr of this.results) {
            for (const r of rr) {
                total += fn(r);
            }
        }
        return total;
    }

    advance() {
        // Model conflicts between the two clans for a turn as
        // an iterated hawk-dove game.
        // For now, strategies are simple: fixed probability
        // of hawk.

        for (const rr of this.results) {
            for (const r of rr) {
                r.clear();
            }
        }

        for (let i = 0; i < ITERATIONS_PER_TURN; ++i) {
            this.iterate()
        }
    }

    private iterate() {
        const c1Strategy = Math.random() < HAWK_PROBABILITY ? HAWK : DOVE;
        const c2Strategy = Math.random() < HAWK_PROBABILITY ? HAWK : DOVE;
        const r = this.results[c1Strategy][c2Strategy];
        if (c1Strategy == DOVE && c2Strategy == DOVE) {
            r.apply(R, R);
        } else if (c1Strategy == DOVE && c2Strategy == HAWK) {
            r.apply(R, T);
        } else if (c1Strategy == HAWK && c2Strategy == DOVE) {
            r.apply(T, R);
        } else if (c1Strategy == HAWK && c2Strategy == HAWK) {
            r.apply(P, P);
        }
    }
}

export class ConflictResults {
    // Number of iterations represented in these results
    count = 0

    // Abstract payoffs to contestants. c1.uuid < c2.uuid as usual.
    c1Payoff = 0
    c2Payoff = 0

    clear(): void {
        this.count = 0;
        this.c1Payoff = 0;
        this.c2Payoff = 0;
    }

    apply(c1Payoff: number, c2Payoff: number) {
        ++this.count;
        this.c1Payoff += c1Payoff;
        this.c2Payoff += c2Payoff;
    }
}