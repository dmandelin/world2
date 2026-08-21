import { sumFun, weightedHarmonicMean } from "./lib/basics";
import { poisson } from "./lib/distributions";
import { SkillDefs } from "./econ/econdefs";
import { TradeGoods, type TradeGood } from "./trade";
import type { Clan } from "./people/people";
import type { World } from "./world";

// Clans keep up their own ancestral rites year in and year out, but some
// years bring a trouble those cannot answer on their own: a member taken
// suddenly ill, or a dream nobody likes the look of. Each such trouble calls
// for a ritual with something definite at stake, and the ritual either
// carries or it does not.
//
// For now a clan always performs its own rituals, so the officiant and the
// people helped are the same. The machinery is written for two parties
// throughout, because asking a holier neighbor to say the words is the next
// thing this is for.

// ---------------------------------------------------------------------------
// What makes a ritual work.
// ---------------------------------------------------------------------------

// Officiating draws on three things, of which knowing what you are doing
// counts for the most: the words are long, the order matters, and a clan that
// can hold all of it in its head is worth two that are merely devout.
export const RITUAL_STAT_WEIGHTS: readonly { label: string, weight: number, value: (clan: Clan) => number }[] = [
    { label: 'Intellect', weight: 2, value: clan => clan.traits.intellect },
    { label: 'Piety', weight: 1, value: clan => clan.traits.piety },
    { label: 'Ritual Skill', weight: 1, value: clan => clan.skills.v(SkillDefs.Ritual) },
];

export class RitualStatItem {
    constructor(
        readonly label: string,
        readonly weight: number,
        readonly value: number,
    ) { }
}

export function ritualStatItems(clan: Clan): RitualStatItem[] {
    return RITUAL_STAT_WEIGHTS.map(
        s => new RitualStatItem(s.label, s.weight, s.value(clan)));
}

// Harmonic, so a clan that is hopeless at any one of the three cannot make it
// up with the other two: a rite botched in its wording is botched.
export function ritualStat(clan: Clan): number {
    return weightedHarmonicMean(ritualStatItems(clan), i => i.value, i => i.weight);
}

// Where the officiants actually sit. A harmonic mean of two middling traits
// and a ritual skill that is still low comes out well under 50, so the curve
// is centered on what clans really bring rather than on the nominal middle of
// a trait scale: the midpoint is the typical clan's coin flip, and the swing
// spans roughly the least to the most capable clan in a settlement. Both are
// read off a long run, so as ritual skill grows over the game, clans will
// start beating these odds -- which is the point of building the skill.
export const RITUAL_STAT_MIDPOINT = 38;
export const RITUAL_STAT_SWING = 13;

// ---------------------------------------------------------------------------
// Kinds of trouble.
// ---------------------------------------------------------------------------

export type RitualTypeSpec = {
    key: string;
    label: string;
    // Shown in the overview's Events row.
    icon: string;
    // What the ritual is for, in one line.
    description: string;
    stakeLabel: string;
    // Share of a standard turn's food consumption the rite consumes. A clan
    // eats one ration a head, so this is a share of its population.
    foodCostFraction: number;
    // Success chance for a clan a full swing above the midpoint. The chance
    // at the midpoint is always 50%, and the curve is logistic, so this one
    // number fixes how much the officiant's quality is worth.
    successAtHighStat: number;
    // How much a fresh result moves the beneficiary's view of the officiant's
    // holiness, on the 0-100 holiness scale.
    holinessSwing: number;
    // Years for that credit to fade to half. What the ancestors did about a
    // dying member is remembered for a generation; a dream read rightly is
    // worth talking about for a season.
    holinessHalfLife: number;
};

export abstract class RitualTypeDef {
    readonly key: string;
    readonly label: string;
    readonly icon: string;
    readonly description: string;
    readonly stakeLabel: string;
    readonly foodCostFraction: number;
    readonly successAtHighStat: number;
    readonly holinessSwing: number;
    readonly holinessHalfLife: number;
    // Logit slope per stat point, derived from successAtHighStat.
    readonly logitSlope: number;

    constructor(spec: RitualTypeSpec) {
        this.key = spec.key;
        this.label = spec.label;
        this.icon = spec.icon;
        this.description = spec.description;
        this.stakeLabel = spec.stakeLabel;
        this.foodCostFraction = spec.foodCostFraction;
        this.successAtHighStat = spec.successAtHighStat;
        this.holinessSwing = spec.holinessSwing;
        this.holinessHalfLife = spec.holinessHalfLife;
        const p = spec.successAtHighStat;
        this.logitSlope = Math.log(p / (1 - p)) / RITUAL_STAT_SWING;
    }

    successChance(stat: number): number {
        return 1 / (1 + Math.exp(-this.logitSlope * (stat - RITUAL_STAT_MIDPOINT)));
    }

    // Chances at the low and high ends of the usual range of officiants, for
    // display.
    get chanceRange(): [number, number] {
        return [
            this.successChance(RITUAL_STAT_MIDPOINT - RITUAL_STAT_SWING),
            this.successChance(RITUAL_STAT_MIDPOINT + RITUAL_STAT_SWING),
        ];
    }

    foodCost(clan: Clan): number {
        return this.foodCostFraction * clan.population;
    }

    // Expected number of this kind of trouble for this clan this year.
    abstract rateFor(clan: Clan): number;
}

// Critical illnesses per expected death from illness and mishap. A clan of
// 20 loses about half a member a year to those causes, so this rate puts a
// life on the line roughly once a decade -- calibrated against a 150-year
// run, not derived.
export const LIFE_EVENTS_PER_EXPECTED_DEATH = 0.18;

class LifeRitualDef extends RitualTypeDef {
    override rateFor(clan: Clan): number {
        return LIFE_EVENTS_PER_EXPECTED_DEATH
            * clan.lastPopulationChange.expectedIllnessDeaths;
    }
}

// Portents per head per year for a clan whose life is neither good nor bad.
// Calibrated so that at the quality of life clans actually live at, one of 20
// sees a bad sign about every other year.
export const OMEN_EVENTS_PER_CAPITA = 0.0115;
// Points of quality of life that halve, or double, how often the signs look
// bad. Hard years are full of omens; comfortable ones are not.
export const OMEN_QOL_HALVING = 20;
// What a portent is worth, in points of the Omens quality-of-life category.
export const OMEN_QOL_STAKE = 1;

class OmenRitualDef extends RitualTypeDef {
    override rateFor(clan: Clan): number {
        // Read last year's quality of life without its own omens, so a run of
        // bad signs doesn't feed on itself.
        const qol = clan.qol.value - clan.qol.valueFrom('omens');
        return OMEN_EVENTS_PER_CAPITA * clan.population
            * Math.pow(2, -qol / OMEN_QOL_HALVING);
    }
}

export const RitualTypes = {
    Life: new LifeRitualDef({
        key: 'life',
        label: 'Critical Illness',
        icon: '☥', // ankh: a life in the balance
        description: 'A member taken suddenly ill or badly hurt.',
        stakeLabel: '1 life',
        // A major rite: something has to be given up for it.
        foodCostFraction: 0.01,
        // The ancestors are not much moved either way when a life is asked
        // for, so even a fine officiant gains little ground.
        successAtHighStat: 0.58,
        // A life asked for and granted is the strongest evidence a clan ever
        // gets about where it stands, and it is still being told a generation
        // later.
        holinessSwing: 8,
        holinessHalfLife: 25,
    }),

    Omen: new OmenRitualDef({
        key: 'omen',
        label: 'Ominous Portent',
        icon: '☾', // waning moon: a dream, a sign
        description: 'An ill-omened dream or sign that wants reading.',
        stakeLabel: '1 QoL (omens)',
        // A minor rite, done with what is at hand.
        foodCostFraction: 0,
        // Reading a sign rightly is a matter of skill, and it shows.
        successAtHighStat: 0.66,
        // A sign read rightly counts for much less, and is stale within a few
        // seasons.
        holinessSwing: 3,
        holinessHalfLife: 2,
    }),
};

export const ALL_RITUAL_TYPES: readonly RitualTypeDef[] = Object.values(RitualTypes);

// ---------------------------------------------------------------------------
// One ritual, performed and settled.
// ---------------------------------------------------------------------------

export class RitualEvent {
    readonly statItems: RitualStatItem[];
    readonly stat: number;
    readonly successChance: number;
    readonly roll: number;
    readonly success: boolean;
    readonly foodCostOwed: number;
    // What the clan could actually spare; a hungry clan gives less.
    foodCostPaid: number = 0;

    constructor(
        readonly def: RitualTypeDef,
        // Whose trouble it is.
        readonly beneficiary: Clan,
        // Who says the words. Currently always the beneficiary itself.
        readonly performer: Clan,
        readonly year: number,
    ) {
        this.statItems = ritualStatItems(performer);
        this.stat = ritualStat(performer);
        this.successChance = def.successChance(this.stat);
        this.roll = Math.random();
        this.success = this.roll < this.successChance;
        this.foodCostOwed = def.foodCost(beneficiary);
    }

    get beneficiaryID(): string { return this.beneficiary.uuid; }
    get performerID(): string { return this.performer.uuid; }

    get resultLabel(): string {
        if (this.def === RitualTypes.Life) {
            return this.success ? 'Life spared' : 'Life lost';
        }
        return this.success ? '+1 omens QoL' : '-1 omens QoL';
    }

    // Points of holiness the beneficiary credits (or debits) the officiant
    // with when the result comes in. The credit stands afterward and fades at
    // the ritual type's half-life; see RitualCredit in holiness.ts.
    get holinessEffect(): number {
        return (this.success ? 1 : -1) * this.def.holinessSwing;
    }
}

// ---------------------------------------------------------------------------
// Running the year's rituals.
// ---------------------------------------------------------------------------

// Roll up the year's troubles and settle each one on the spot. Called early
// in the turn, so the results are in hand before the economy charges for them
// and before the year's deaths and quality of life are worked out.
export function runRituals(world: World): void {
    world.rituals = [];
    for (const clan of world.allClans) {
        clan.ritualEvents = [];
        clan.pendingDeathAdjustment = 0;
    }

    const year = world.year.value;
    for (const clan of world.allClans) {
        for (const def of ALL_RITUAL_TYPES) {
            const count = poisson(Math.max(0, def.rateFor(clan)));
            for (let i = 0; i < count; ++i) {
                // The clan sees to its own troubles, for now.
                const event = new RitualEvent(def, clan, clan, year);
                clan.ritualEvents.push(event);
                world.rituals.push(event);
                if (def === RitualTypes.Life) {
                    clan.pendingDeathAdjustment += event.success ? -1 : 1;
                }
                // Booked once, here, so that a result lands exactly once no
                // matter how often perceptions are recomputed.
                world.perceptions.getOrCreate(clan, clan)
                    .holiness.creditRitual(event);
            }
        }
    }
}

// Take the year's offerings out of what the clan produced. Food already
// spoken for elsewhere is not touched, so a clan with nothing to spare makes
// a smaller offering rather than going hungry for it.
export function chargeRitualFoodCosts(clan: Clan): void {
    const goods: TradeGood[] = [TradeGoods.Fish, TradeGoods.Cereals];
    for (const event of clan.ritualEvents) {
        let owed = event.foodCostOwed;
        if (owed <= 0) continue;
        for (const good of goods) {
            if (owed <= 1e-9) break;
            const take = Math.min(clan.distribution.undistributed(good), owed);
            if (take <= 0) continue;
            clan.distribution.addRitual(good, take);
            event.foodCostPaid += take;
            owed -= take;
        }
    }
}

// Net effect of the year's portents on the clan's quality of life.
export function omenQolEffect(clan: Clan): number {
    return sumFun(
        clan.ritualEvents.filter(e => e.def === RitualTypes.Omen),
        e => e.success ? OMEN_QOL_STAKE : -OMEN_QOL_STAKE);
}
