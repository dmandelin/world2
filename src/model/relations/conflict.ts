import type { Clan } from "../people/people";
import { uuidOf, type HasOrIsUUID, type UUID } from "../records/basicdata";
import type { World } from "../world";

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

    advance(): void {
        // For now we assume that only local conflicts are significant.
        this.prune((c1, c2, conflict) => c1.settlement !== c2.settlement);

        for (const settlement of this.world.allSettlements) {
            for (const c1 of settlement.clans) {
                for (const c2 of settlement.clans) {
                    if (c1 === c2) continue;
                    if (c1 > c2) continue;
                    const conflict = this.g.getOrCreate(c1.uuid, c2.uuid);
                    conflict.update();
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
            conflict = new Conflict();
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

export class Conflict {
    value = 1;

    update() {}
}
