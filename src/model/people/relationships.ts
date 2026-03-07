import { normal } from "../lib/distributions";
import { sumFun, sumValues } from "../lib/basics";
import type { Clan } from "./people";

// Attention
//
// Attention represents how much of an agent's interaction capacity
// (time and people) is taken up by a particular relationship, 
// including its relationship with itself. Units are scaled so that
// in a reference size community, it takes N units of attention to
// have a full reference ("culturally normal") relationship with a
// clan of N people.
//
// A larger clan might tend to have more attention capacity, although
// at some point holding the clan together would itself take up most
// of their attention. For now, we'll assume an "everyone knows everyone"
// type of culture, in which case it's reasonable to give a clan of
// any size an attention capacity equal to the reference size, and
// require them to use enough capacity to have a full relationship with
// themselves.
//
// Since attention budget is fixed for now, most calculations can
// still be done in terms of attention fraction.

const REFERENCE_COMMUNITY_SIZE = 150;

export class CalcBase {
    value: number = 0;
}

export class Relationships {
    private m: Map<Clan, Relationship> = new Map();

    constructor(readonly subject: Clan) {}

    get(object: Clan): Relationship | undefined {
        return this.m.get(object);
    }

    get totalInteractionVolume(): number {
        return sumFun(this.m.values(), relationship => relationship.totalInteractionVolume);
    }

    update() {
        // Update the map to contain clans the subject is in contact with.
        for (const [object, relationship] of this.m) {
            if (!this.shouldHaveRelationshipWith(object)) {
                this.m.delete(object);
            }
        }
        for (const object of this.subject.settlement.clans) {
            if (!this.m.has(object)) {
                this.m.set(object, new Relationship(this.subject, object));
            }
        }

        const totalAttention = REFERENCE_COMMUNITY_SIZE;
        const totalContactedPopulation = sumFun(this.m.values(), relationship => relationship.object.population);

        // For now, clans are required to pay full attention to themselves. Otherwise,
        // we'd have to implement internal dissolution effects.
        const selfAttention = Math.min(totalAttention, this.subject.population);
        const selfAttentionFraction = selfAttention / totalAttention;
        const remainingAttentionFraction = 1 - selfAttentionFraction;
        const remainingPopulation = totalContactedPopulation - this.subject.population;

        for (const [object, relationship] of this.m) {
            if (object === this.subject) {
                relationship.update(selfAttentionFraction);
            } else {
                relationship.update(remainingAttentionFraction
                     * (relationship.object.population / remainingPopulation));
            }
        }
    }

    private shouldHaveRelationshipWith(object: Clan): boolean {
        return object !== this.subject &&
            object.settlement === this.subject.settlement;
    }
}

export enum Stance {
    Generous = 'Generous',
    Stingy = 'Stingy',
};

export class Relationship {
    private attentionFraction_ = 0;
    private relativeAttention_ = 0;
    private coresidenceFraction_ = 0;

    interactions: {'Settled': SettledOngoingInteraction, 'Nomadic': NomadicOngoingInteraction};
    alignment: Alignment;

    stance: Stance = Stance.Generous;

    // Implementation notes on stance:
    // - Turns are 20 years so we can assume clans respond to each other.
    //   A generous clan will get burned by a stingy clan a little bit,
    //   but will then change their behavior to protect themselves for
    //   most of a turn.
    // - Stance interactions:
    //   - Generous vs Generous: both interact in high-trust ways, full
    //     benefits.
    //   - Stingy vs Stingy: interaction is reduced and more guarded, so
    //     lower benefits. Could be applied at both volume and effect levels.
    //   - Generous vs Stingy: result is similar to stingy vs stingy,
    //     except that there is slightly more interaction and also a
    //     small zero-sum transfer from generous to stingy.

    constructor(
        readonly subject: Clan,
        readonly object: Clan) 
    {
        this.interactions = {
            'Settled': new SettledOngoingInteraction(subject, object),
            'Nomadic': new NomadicOngoingInteraction(subject, object),
        };
        this.alignment = new Alignment(subject, object);
    }

    update(attentionFraction: number) {
        this.attentionFraction_ = attentionFraction;
        this.relativeAttention_ = attentionFraction / (this.object.population / REFERENCE_COMMUNITY_SIZE);

        this.coresidenceFraction_ = this.subject.settlement === this.object.settlement
            ? Math.min(this.subject.residenceFraction, this.object.residenceFraction)
            : 0;

        for (const interaction of Object.values(this.interactions)) {
            interaction.update(this.relativeAttention, this.coresidenceFraction_);
        }
        this.alignment.update();
    }

    get attentionFraction(): number {
        return this.attentionFraction_;
    }

    get relativeAttention(): number {
        return this.relativeAttention_;
    }

    get coresidenceFraction(): number {
        return this.coresidenceFraction_;
    }

    get totalInteractionVolume(): number {
        return sumValues(this.interactions, interaction => interaction.volume);
    }
}

export abstract class OngoingInteraction {
    volume = 0;

    baseFromAttention = 0.1;
    coresidenceFactor = 0;

    constructor(
        readonly name: string,
        readonly subject: Clan,
        readonly object: Clan
    ) {
        this.update(0.1, 0.1);
    }

    update(relativeAttention: number, coresidenceFraction: number): void {
        this.baseFromAttention = relativeAttention;
        this.coresidenceFactor = this.getCoresidenceFactor(coresidenceFraction);
        
        this.volume = this.baseFromAttention * this.coresidenceFactor;
    }

    abstract getCoresidenceFactor(coresidenceFraction: number): number;
}

export class NomadicOngoingInteraction extends OngoingInteraction {
    constructor(
        readonly subject: Clan,
        readonly object: Clan
    ) {
        // Nomadic interactions scale up larger because they spend less time together, so
        // it costs less to get everyone together and there's less continuous friction.
        super("Nomadic", subject, object);
    }

    getCoresidenceFactor(coresidenceFraction: number): number {
        return 1 - coresidenceFraction;
    }
}    

export class SettledOngoingInteraction extends OngoingInteraction {
    baseFromAttention = 0;
    settlementScaleFactor = 0;

    constructor(
        readonly subject: Clan,
        readonly object: Clan
    ) {
        super("Settled", subject, object);
    }

    getCoresidenceFactor(coresidenceFraction: number): number {
        return coresidenceFraction;
    }
}    

export class Alignment extends CalcBase {
    items: Record<string, number> = {};

    constructor(
        readonly subject: Clan,
        readonly object: Clan
    ) {
        super();
        this.update();
    }

    update() {
        // TODO - Bring back alignment effect of interactions.
        //this.items['Society'] = this.subject.relationships.get(this.object)?.interactionVolume.value ?? 0;
        this.items['Kinship'] = this.subject.kinshipTo(this.object);
        this.items['Marriage'] = this.subject.marriagePartners.get(this.object) ?? 0;
        if (this.subject !== this.object) {
            this.items['Random'] = normal(0, 0.1);
        }
        this.value = sumValues(this.items, v => v);
    }
}