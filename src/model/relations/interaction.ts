import { pct } from "../lib/format";
import type { Clan } from "../people/people";
import { GenericItem } from "../records/basicdata";
import { pairIDOf, type HasUUID, type PairID, type UUID } from "./connection";

export abstract class Interaction {
    constructor(
        readonly c1: UUID,
        readonly c2: UUID,
    ) {}

    abstract alignmentItem(subject: Clan, object: Clan): GenericItem;
}

export class BasicInteraction extends Interaction {
    amount1to2: number = 0;
    amount2to1: number = 0;
    
    constructor(c1: UUID, c2: UUID) {
        super(c1, c2);
    }

    alignmentItem(subject: Clan, object: Clan): GenericItem {
        let subjectAmount, objectAmount;
        if (subject.uuid === this.c1) {
            subjectAmount = this.amount1to2;
            objectAmount = this.amount2to1;
        } else {
            subjectAmount = this.amount2to1;
            objectAmount = this.amount1to2;
        }

        const subjectToObjectRelativeAttention = subjectAmount / object.population;
        const objectToSubjectRelativeAttention = objectAmount / subject.population;
        const relativeAttention = Math.min(subjectToObjectRelativeAttention, objectToSubjectRelativeAttention);
        return new GenericItem(
            'Interaction',
            0.2 * relativeAttention,
            `From ${pct(relativeAttention)}`,
        )
    }
}

export class InteractionGraph {
    private m_: Map<PairID, Interaction[]> = new Map();
    private a_: Map<string, Set<PairID>> = new Map();

    clear(): void {
        this.m_.clear();
        this.a_.clear();
    }

    get(c1: HasUUID, c2: HasUUID): Interaction[]  {
        const pairID = pairIDOf(c1, c2);
        return this.m_.get(pairID) ?? [];
    }

    getFor(c: HasUUID): Iterable<[string, Interaction[]]> {
        const pairIDs = this.a_.get(c.uuid);
        if (!pairIDs) return [];
        return [...pairIDs].map(pairID => {
            const [c1, c2] = pairID.split('|');
            const other = c1 === c.uuid ? c2 : c1;
            return [other, this.m_.get(pairID)!] as [string, Interaction[]];
        });
    }

    addBasic(c1: HasUUID, c2: HasUUID, amount1to2: number, amount2to1: number): void {
        const pairID = pairIDOf(c1, c2);
        let interactions = this.m_.get(pairID);
        if (!interactions) {
            interactions = [];
            this.m_.set(pairID, interactions);

            let s1 = this.a_.get(c1.uuid);
            if (!s1) {
                s1 = new Set<PairID>();
                this.a_.set(c1.uuid, s1);
            }
            s1.add(pairID);
            let s2 = this.a_.get(c2.uuid);
            if (!s2) {
                s2 = new Set<PairID>();
                this.a_.set(c2.uuid, s2);
            }
            s2.add(pairID);
        }
        let interaction = interactions.find(i => i instanceof BasicInteraction) as BasicInteraction | undefined;
        if (!interaction) {
            interaction = new BasicInteraction(c1.uuid, c2.uuid);
            interactions.push(interaction);
        }
        interaction.amount1to2 = amount1to2;
        interaction.amount2to1 = amount2to1;
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