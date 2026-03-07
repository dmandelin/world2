import { normal } from "../lib/distributions";
import { clamp, productFun, sumFun, sumValues, weightedGeometricMean } from "../lib/basics";
import type { Clan } from "./people";
import type { SkillDef } from "./skills";

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

// Productivity factors
//
// A clan having full interactions in a settlement will be tuned to
// get up to a 45% productivity boost, so that perhaps 100 attention
// spent on interactions yields that amount. This is multiplied by a
// factor from alignment. Neutral people can cooperate with each other,
// so perhaps they can get 20-50% of the normal benefit. This implies
// a "frenemy" category where alignment is subzero but interaction is
// still beneficial. 
// *   Clans both resident for farming should be able to get the full
//     boost, so they'll need only 0.4 attention for full benefit.
// *   There should be diminishing returns, so maybe a square root
//     makes it work out reasonably well.
// *   Nomadic interactions will give a smaller productivity boost.
//     Their interactions are still important, but mathematically
//     they don't spend as much time together.

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
        const remainingAttention = totalAttention - selfAttention;
        const remainingPopulation = totalContactedPopulation - this.subject.population;

        for (const [object, relationship] of this.m) {
            if (object === this.subject) {
                relationship.update(selfAttention);
            } else {
                relationship.update(remainingAttention
                     * (relationship.object.population / remainingPopulation));
            }
        }
    }

    private shouldHaveRelationshipWith(object: Clan): boolean {
        return object !== this.subject &&
            object.settlement === this.subject.settlement;
    }

    alignmentToward(object: Clan): number {
        const relationship = this.m.get(object);
        return relationship ? relationship.alignment.value : 0;
    }

    cooperationLevelWith(object: Clan): number {
        const alignment = this.alignmentToward(object);
        if (alignment > 0) {
            return 0.4 + 0.6 * alignment;
        } else if (alignment > -0.2) {
            return 2 * (alignment + 0.2);
        } else {
            return 1 / .8 * (alignment + 0.2);
        }
    }

    getProductivityFactor(skill: SkillDef): number {
        const v = weightedGeometricMean(
            this.m.values(), 
            relationship => relationship.getProductivityFactor(skill),
            relationship => relationship.relativeAttention);
        if (isNaN(v)) debugger;
        return v;
    }
}

export enum Stance {
    Generous = 'Generous',
    Stingy = 'Stingy',
};

export class Relationship {
    private attention_ = 0;
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

    update(attention: number) {
        if (isNaN(attention)) debugger;
        this.attention_ = attention;

        this.coresidenceFraction_ = this.subject.settlement === this.object.settlement
            ? Math.min(this.subject.residenceFraction, this.object.residenceFraction)
            : 0;

        for (const interaction of Object.values(this.interactions)) {
            interaction.update(this.attention, this.coresidenceFraction_);
        }
        this.alignment.update();
    }

    get attention(): number {
        return this.attention_;
    }

    get attentionFraction(): number {
        return this.attention_ / REFERENCE_COMMUNITY_SIZE;
    }

    get relativeAttention(): number {
        return this.attention / this.object.population;
    }

    get coresidenceFraction(): number {
        return this.coresidenceFraction_;
    }

    get totalInteractionVolume(): number {
        return sumValues(this.interactions, interaction => interaction.volume);
    }

    getProductivityFactor(skill: SkillDef): number {
        return productFun(
            Object.values(this.interactions), 
            interaction => interaction.getProductivityFactor(
                skill, 
                this.subject.relationships.cooperationLevelWith(this.object)));
    }
}

export abstract class OngoingInteraction {
    volume = 0;

    attention = 0;
    coresidenceFactor = 0;

    constructor(
        readonly name: string,
        readonly subject: Clan,
        readonly object: Clan
    ) {
        this.update(0.1, 0.1);
    }

    update(attention: number, coresidenceFraction: number): void {
        this.attention = attention;
        this.coresidenceFactor = this.getCoresidenceFactor(coresidenceFraction);
        this.volume = this.attention * this.coresidenceFactor;
    }

    getProductivityFactor(skill: SkillDef, cooperationFactor: number) {
        return 1 + cooperationFactor * Math.sqrt(this.volume / 100) * this.maxProductivityBonus;
    }

    abstract getCoresidenceFactor(coresidenceFraction: number): number;
    abstract get maxProductivityBonus(): number;
}

export class NomadicOngoingInteraction extends OngoingInteraction {
    readonly maxProductivityBonus = 0.2;

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
    readonly maxProductivityBonus = 0.45;

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