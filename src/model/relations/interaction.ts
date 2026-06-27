import { pairIDOf, type HasUUID, type PairID } from "./connection";

export class Interaction {
    constructor(
        readonly c1: HasUUID,
        readonly c2: HasUUID,
    ) {}
}

export class BasicInteraction extends Interaction {
    amount1to2: number = 0;
    amount2to1: number = 0;
    
    constructor(c1: HasUUID, c2: HasUUID) {
        super(c1, c2);
    }
}

export class InteractionGraph {
    private m_: Map<PairID, Interaction[]> = new Map();

    clear(): void {
        this.m_.clear();
    }

    addBasic(c1: HasUUID, c2: HasUUID, amount1to2: number, amount2to1: number): void {
        const pairID = pairIDOf(c1, c2);
        let interactions = this.m_.get(pairID);
        if (!interactions) {
            interactions = [];
            this.m_.set(pairID, interactions);
        }
        let interaction = interactions.find(i => i instanceof BasicInteraction) as BasicInteraction | undefined;
        if (!interaction) {
            interaction = new BasicInteraction(c1, c2);
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
        return g;
    }
}