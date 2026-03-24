import { normal } from "../lib/distributions";
import { clamp, productFun, sumFun, sumValues, weightedGeometricMean } from "../lib/basics";
import type { Clan } from "./people";
import { SkillDefs, type SkillDef } from "./skills";

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

// Thinking through productivity factors again
//
// An immediate issue is that right now, clans can get the full bonus
// regardless of the size of their interaction set, even if it's just
// themselves. A second issue is that the calculation is complex and
// spread among multiple functions, making it hard to visualize. So
// let's overhaul.
//
// We could use a simple model where 1 point of mutual attention gives
// a certain percentage bonus, but changes expected eventually will
// complicate the picture. Let's think about what these productivity-
// boosting interactions actually are:
// -    Exchanging small favors to solve bottlenecks, such as borrowing
//      a tool, helping fix a roof, etc.
// -    Exchanging bigger help for bigger bottlenecks, such as at harvest
//      time.
// -    Helping out in case of emergencies and disasters. Note that as
//      clans get their own food storage, this may become less important.
// -    Exchanging somewhat specialized skills and services. There are
//      probably not full-time specialists, but some people might be
//      better at certain things.
//
// If we want to keep the model simple for now, it should work to have
// a single bonus possibly with diminishing returns to represent some
// kinds of mutual help being more valuable; however it probably also
// takes more relationship investment to get people to want to do that.
// Note also that we don't need a ton of interaction volume per se for
// things like disaster insurance -- how often they interact doesn't
// matter directly, it's about what's needed to maintain the relationship.
//
// Interaction volume will matter for learning and innovation processes.
//
// For our basic economic processes, instead of interaction volume,
// what's going on? In order to interact economically, mechanically they
// just need to interact economically -- swap the favor, or whatever.
// But the point is that this kind of economy relies on people knowing
// each other and having regular interactions. The idea will be that
// clans can spend attention, which will unlock economic exchanges.
//
// Specifically:
// *    Any amount of mutual attention means clans are aware of each
//      other and could have economic interactions.
// *    The richness of those interactions will depend on trust: if two
//      clans trust each other greatly, they might back each up other
//      in disasters, extend big favors, etc. But if they only trust each
//      other a little, they might only cooperate on small things.
// *    The amount of economic interaction would also depend on how much
//      economic interaction they choose to have. To keep it simple for
//      now, that will go by attention.
// *    For now, let's make gains additive across economic partners for
//      simplicity, especially in visualization.
// *    Let's say that the base value is sqrt(attention/100). Thus, spreading
//      attention across multiple clans gives a higher base value.
// *    We also need to handle the issue of "nomadic" vs "settled" 
//      attention. We can use the same attention value for both, for
//      now, but they'll have different effects.

const REFERENCE_COMMUNITY_SIZE = 150;

export class CalcBase {
    value: number = 0;
}

export class Relationships implements Iterable<[Clan, Relationship]> {
    private m: Map<Clan, Relationship> = new Map();

    constructor(readonly subject: Clan) {}

    [Symbol.iterator](): Iterator<[Clan, Relationship]> {
        return this.m.entries();
    }

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

        for (const [object, relationship] of this.m) {
            if (relationship.attention < 0)            debugger;
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

    getProductivityFactor(skill: SkillDef): number {
        return 1 + sumFun(this.m.values(), 
            relationship =>
                (relationship.interactions['Settled'].getBaseProductivityBonus(skill)
               + relationship.interactions['Nomadic'].getBaseProductivityBonus(skill))
             * relationship.cooperationLevel);
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

    get cooperationLevel(): number {
        if (this.alignment.value > 0) {
            return 0.4 + 0.6 * this.alignment.value;
        } else if (this.alignment.value > -0.2) {
            return 2 * (this.alignment.value + 0.2);
        } else {
            return 1 / .8 * (this.alignment.value + 0.2);
        }
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

    getBaseProductivityBonus(skill: SkillDef) {
        return Math.sqrt(this.volume / 100)
         * this.maxProductivityBonus
         * this.getSkillEffectivenessFactor(skill)
         * Math.max(1, this.object.population / this.subject.population);
    }
    abstract get maxProductivityBonus(): number;
    abstract getSkillEffectivenessFactor(skill: SkillDef): number;

    abstract getCoresidenceFactor(coresidenceFraction: number): number;
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

    getSkillEffectivenessFactor(skill: SkillDef): number {
        // Nomadic interactions are highly effective for nomadic-type activities,
        // and also quite effective for part-time, high-importance activities,
        // but less so for agriculture and routine construction.
        if (skill === SkillDefs.Agriculture) {
            return 0.25;
        } else if (skill === SkillDefs.Construction) {
            return 0.5;
        }
        return 1;
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

    getSkillEffectivenessFactor(skill: SkillDef): number {
        return 1;
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