import { GenericItem, pairIDOf, uuidOf, type HasOrIsUUID, type PairID, type UUID } from "../records/basicdata";
import type { Clan } from "../people/people";

export abstract class Interaction {
    constructor(
        readonly c1: UUID,
        readonly c2: UUID,
    ) {}

    abstract alignmentItem(subject: Clan, object: Clan): GenericItem;
    abstract information(subject: Clan, object: Clan): number;
}

export class InteractionGraph {
    private m_: Map<PairID, Interaction[]> = new Map();
    private a_: Map<string, Set<PairID>> = new Map();

    clear(): void {
        this.m_.clear();
        this.a_.clear();
    }

    get(c1: HasOrIsUUID, c2: HasOrIsUUID): Interaction[]  {
        const pairID = pairIDOf(c1, c2);
        return this.m_.get(pairID) ?? [];
    }

    getFor(c: HasOrIsUUID): Iterable<[string, Interaction[]]> {
        const pairIDs = this.a_.get(uuidOf(c));
        if (!pairIDs) return [];
        return [...pairIDs].map(pairID => {
            const [c1, c2] = pairID.split('|');
            const other = c1 === uuidOf(c) ? c2 : c1;
            return [other, this.m_.get(pairID)!] as [string, Interaction[]];
        });
    }

    getOrCreate<T extends Interaction>(
        c1: HasOrIsUUID,
        c2: HasOrIsUUID,
        type: new (uuid1: UUID, uuid2: UUID) => T,
        provider?: () => T
    ): T {
        const pairID = pairIDOf(c1, c2);
        let interactions = this.m_.get(pairID);
        if (!interactions) {
            interactions = [];
            this.m_.set(pairID, interactions);

            let s1 = this.a_.get(uuidOf(c1));
            if (!s1) {
                s1 = new Set<PairID>();
                this.a_.set(uuidOf(c1), s1);
            }
            s1.add(pairID);
            let s2 = this.a_.get(uuidOf(c2));
            if (!s2) {
                s2 = new Set<PairID>();
                this.a_.set(uuidOf(c2), s2);
            }
            s2.add(pairID);
        }
        let interaction = interactions.find(i => i instanceof type) as T | undefined;
        if (!interaction) {
            interaction = provider ? provider() : new type(uuidOf(c1), uuidOf(c2));
            interactions.push(interaction);
        }
        return interaction;
    }

    clone(): InteractionGraph {
        const g = new InteractionGraph();
        for (const [pairID, interactions] of this.m_) {
            g.m_.set(pairID, [...interactions]);
        }
        for (const [uuid, pairIDs] of this.a_) {
            g.a_.set(uuid, new Set(pairIDs));
        }
        return g;
    }
}