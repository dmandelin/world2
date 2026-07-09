import type { Clan } from "../people/people";
import type { UUID } from "../records/basicdata";
import type { World } from "../world";

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

    // Remove everything where `fn` returns true.
    prune(world: World, fn: (c1: Clan, c2: Clan, conflict: Conflict) => boolean): void {
        for (const [c1, c1Map] of this.m_) {
            const clan1 = world.clanMap.get(c1);
            if (!clan1) continue;
            for (const [c2, conflict] of c1Map) {
                const clan2 = world.clanMap.get(c2);
                if (!clan2) continue;
                if (fn(clan1, clan2, conflict)) {
                    c1Map.delete(c2);
                    if (c1Map.size === 0) this.m_.delete(c1);
                    const c2Map = this.r_.get(c2);
                    if (c2Map) {
                        c2Map.delete(c1);
                        if (c2Map.size === 0) this.r_.delete(c2);
                    }
                }
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

export function updateConflicts(world: World): void {
    // For now we assume that only local conflicts are significant.
    world.conflicts.prune(world, (c1, c2, conflict) => c1.settlement !== c2.settlement);

    for (const settlement of world.allSettlements) {
        for (const c1 of settlement.clans) {
            for (const c2 of settlement.clans) {
                if (c1 === c2) continue;
                if (c1 > c2) continue;
                const conflict = world.conflicts.getOrCreate(c1.uuid, c2.uuid);
                conflict.update();
            }
        }
    }
}