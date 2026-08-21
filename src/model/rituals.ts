import { chooseWeighted, clamp, sumFun, weightedHarmonicMean } from "./lib/basics";
import { poisson } from "./lib/distributions";
import { SkillDefs } from "./econ/econdefs";
import { TradeGoods, type TradeGood } from "./trade";
import type { Clan } from "./people/people";
import type { World } from "./world";
import type { UUID } from "./records/basicdata";
import { getAlignment } from "./relations/alignment";
import { getHoliness } from "./relations/holiness";

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
    // How readily news of a result gets around, as an exponent on how well a
    // clan knows the officiant. A low power spreads news to nearly everyone
    // acquainted; 1 spreads it in plain proportion to acquaintance.
    newsInformationExponent: number;
    // What a clan hands the neighbor it asks, as a share of the officiant's
    // standard annual food consumption. Covers the offering and something over
    // for the trouble.
    askGiftFraction: number;
    // The social side of asking: points of well-being the asker gives up and
    // the officiant gains, for the imposition and the obligation.
    askStressTransfer: number;
    // What being helped, and helping, does to how the two clans regard each
    // other. The clan that was helped feels it far more keenly.
    alignmentBoostAsker: number;
    alignmentBoostOfficiant: number;
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
    readonly newsInformationExponent: number;
    readonly askGiftFraction: number;
    readonly askStressTransfer: number;
    readonly alignmentBoostAsker: number;
    readonly alignmentBoostOfficiant: number;
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
        this.newsInformationExponent = spec.newsInformationExponent;
        this.askGiftFraction = spec.askGiftFraction;
        this.askStressTransfer = spec.askStressTransfer;
        this.alignmentBoostAsker = spec.alignmentBoostAsker;
        this.alignmentBoostOfficiant = spec.alignmentBoostOfficiant;
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
        // A life in the balance is everyone's news: even a slight
        // acquaintance usually hears how it came out.
        newsInformationExponent: 0.25,
        askGiftFraction: 0.02,
        askStressTransfer: 0.5,
        // Alignment runs -1 to 1 and is shown as Favor x100. These are the
        // marks a single rite leaves; because they stand and fade at the same
        // 25-year half-life as the holiness credit, a standing arrangement
        // between two clans settles around +8 Favor from the asker and +3
        // back, which is a strong tie without crowding out everything else
        // alignment weighs.
        alignmentBoostAsker: 0.015,
        alignmentBoostOfficiant: 0.006,
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
        // Talked about in plain proportion to how much the neighbors have to
        // do with the clan: a small thing, not news in itself.
        newsInformationExponent: 1,
        // The rite costs the officiant nothing but its time, so nothing
        // changes hands but the obligation.
        askGiftFraction: 0,
        askStressTransfer: 0.5,
        alignmentBoostAsker: 0.003,
        alignmentBoostOfficiant: 0.0012,
    }),
};

export const ALL_RITUAL_TYPES: readonly RitualTypeDef[] = Object.values(RitualTypes);

// ---------------------------------------------------------------------------
// Who says the words.
// ---------------------------------------------------------------------------

// Holiness points that make a clan ten times the likelier choice. Clans are
// not obliged to go to the holiest neighbor, but they lean that way hard.
export const HOLINESS_PER_TENFOLD_PREFERENCE = 20;
const HOLINESS_SOFTMAX_BETA = Math.LN10 / HOLINESS_PER_TENFOLD_PREFERENCE;

// How holy the asker takes a possible officiant to be. A clan weighing itself
// adds its Pride, the same flattery it applies to its own standing generally.
export function officiantAppeal(asker: Clan, candidate: Clan): number {
    return getHoliness(asker, candidate)
        + (candidate === asker ? asker.traits.pride : 0);
}

// The neighbors a clan could ask, itself included. A clan that bears the
// asker no goodwill would not say the words for it, so it is not on the list.
export function officiantCandidates(asker: Clan): Clan[] {
    const settlement = asker.settlement;
    if (!settlement) return [asker];
    // Self-alignment is 1, so the asker is always among its own options.
    return settlement.clans.filter(
        c => c.population > 0 && getAlignment(c, asker) > 0);
}

// Pick who to ask. Softmax on perceived holiness, so the holiest neighbor is
// usually but not always the one asked.
export function chooseOfficiant(asker: Clan): Clan {
    const candidates = officiantCandidates(asker);
    if (candidates.length <= 1) return candidates[0] ?? asker;
    // Shift by the best on offer before exponentiating, which changes no
    // ratio and keeps the weights in a sane range.
    const appeals = candidates.map(c => officiantAppeal(asker, c));
    const best = Math.max(...appeals);
    const weighted = candidates.map((clan, i) => ({
        clan,
        weight: Math.exp(HOLINESS_SOFTMAX_BETA * (appeals[i] - best)),
    }));
    return chooseWeighted(weighted, w => w.weight).clan;
}

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
    // Clans that heard about it, besides the one it was said for. Filled in
    // by spreadRitualNews.
    readonly heardBy: UUID[] = [];

    // What the asker hands the officiant, sized to the officiant's own year's
    // eating: enough to cover the offering and something over for the trouble.
    readonly giftOwed: number;
    giftPaid: number = 0;

    constructor(
        readonly def: RitualTypeDef,
        // Whose trouble it is.
        readonly beneficiary: Clan,
        // Who says the words: the beneficiary itself, or a neighbor it asked.
        readonly performer: Clan,
        readonly year: number,
    ) {
        this.statItems = ritualStatItems(performer);
        this.stat = ritualStat(performer);
        this.successChance = def.successChance(this.stat);
        this.roll = Math.random();
        this.success = this.roll < this.successChance;
        // Whoever says the words provides the offering, at their own scale.
        this.foodCostOwed = def.foodCost(performer);
        this.giftOwed = performer === beneficiary
            ? 0 : def.askGiftFraction * performer.population;
    }

    // Whether this was a favor asked of a neighbor rather than a clan seeing
    // to its own trouble.
    get wasAsked(): boolean { return this.performer !== this.beneficiary; }

    // Well-being the asker gives up and the officiant gains for the favor.
    get stressTransfer(): number {
        return this.wasAsked ? this.def.askStressTransfer : 0;
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
        clan.ritualsPerformed = [];
        clan.pendingDeathAdjustment = 0;
    }

    const year = world.year.value;
    for (const clan of world.allClans) {
        for (const def of ALL_RITUAL_TYPES) {
            const count = poisson(Math.max(0, def.rateFor(clan)));
            for (let i = 0; i < count; ++i) {
                // A clan can say the words itself or ask a neighbor it takes
                // to be holier. The candidates have already been filtered to
                // those who would agree.
                const performer = chooseOfficiant(clan);
                const event = new RitualEvent(def, clan, performer, year);
                clan.ritualEvents.push(event);
                performer.ritualsPerformed.push(event);
                world.rituals.push(event);
                if (def === RitualTypes.Life) {
                    clan.pendingDeathAdjustment += event.success ? -1 : 1;
                }
                // Booked once, here, so that a result lands exactly once no
                // matter how often perceptions are recomputed.
                spreadRitualNews(world, event);
                bindOverRitual(world, event);
            }
        }
    }
}

// Who ends up knowing how a rite turned out, and therefore whose reading of
// the officiant's holiness it moves. The clan it was said for was there; the
// rest hear about it, or don't, according to how much they have to do with
// the officiant in the first place, raised to the rite's news power.
function spreadRitualNews(world: World, event: RitualEvent): void {
    world.perceptions.getOrCreate(event.beneficiary, event.performer)
        .holiness.creditRitual(event);

    for (const [hearerID, perceptions]
        of world.perceptions.getRegarding(event.performer)) {
        if (hearerID === event.beneficiaryID) continue;
        const information = clamp(perceptions.information.value, 0, 1);
        const chance = Math.pow(information, event.def.newsInformationExponent);
        if (Math.random() >= chance) continue;
        perceptions.holiness.creditRitual(event);
        event.heardBy.push(hearerID);
    }
}

// What being helped, and helping, does to how the two clans regard each
// other. The clan that was helped feels it far more keenly than the one that
// obliged. Nothing to book when a clan saw to its own trouble.
function bindOverRitual(world: World, event: RitualEvent): void {
    if (!event.wasAsked) return;
    world.perceptions.getOrCreate(event.beneficiary, event.performer)
        .alignment.creditRitual(event, event.def.alignmentBoostAsker);
    world.perceptions.getOrCreate(event.performer, event.beneficiary)
        .alignment.creditRitual(event, event.def.alignmentBoostOfficiant);
}

const FOOD_GOODS: TradeGood[] = [TradeGoods.Fish, TradeGoods.Cereals];

// Draw food out of what a clan produced and has not yet spoken for. Returns
// what it could actually find: a clan with nothing to spare gives less rather
// than going hungry for it.
function drawFood(
    clan: Clan,
    owed: number,
    take: (good: TradeGood, amount: number) => void,
): number {
    let paid = 0;
    for (const good of FOOD_GOODS) {
        if (owed - paid <= 1e-9) break;
        const amount = Math.min(clan.distribution.undistributed(good), owed - paid);
        if (amount <= 0) continue;
        take(good, amount);
        paid += amount;
    }
    return paid;
}

// Settle what the year's rites cost and who pays. Whoever says the words
// provides the offering; a clan that asked a neighbor to say them hands over
// food first, covering that offering and something more for the trouble.
export function settleRitualEconomy(world: World): void {
    for (const event of world.rituals) {
        // The fee first, so the officiant has it in hand for the offering.
        if (event.giftOwed > 0) {
            event.giftPaid = drawFood(
                event.beneficiary, event.giftOwed, (good, amount) => {
                    // Moved through the ordinary gift channel so the food
                    // really changes hands, but deliberately not filed in the
                    // ledgers as a gift: this is a fee for work done, not
                    // open-handedness, and should not read as generosity.
                    event.beneficiary.distribution.addGift(
                        event.performer, good, amount);
                    event.performer.consumption.addGift(
                        event.beneficiary, good, amount);
                });
        }
        if (event.foodCostOwed > 0) {
            event.foodCostPaid = drawFood(
                event.performer, event.foodCostOwed,
                (good, amount) =>
                    event.performer.distribution.addRitual(good, amount));
        }
    }
}

// Net effect of the year's portents on the clan's quality of life.
export function omenQolEffect(clan: Clan): number {
    return sumFun(
        clan.ritualEvents.filter(e => e.def === RitualTypes.Omen),
        e => e.success ? OMEN_QOL_STAKE : -OMEN_QOL_STAKE);
}
