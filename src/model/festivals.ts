import { clamp, safeDiv, sumFun } from './lib/basics';
import { normal } from './lib/distributions';
import { ces } from './lib/modelbasics';
import { TradeGoods, type TradeGood } from './trade';
import type { Clan } from './people/people';
import type { Settlement } from './people/settlement';

// The settlement's own festivals: the round of gatherings the whole village
// keeps every year, as against the rites a clan says over its own troubles
// (those are in rituals.ts).
//
// A festival has two sides, and they are not the same thing:
// - The *Feast* is the party. Food, drink, dancing, everybody there. What it
//   is worth is its **Appeal**, and appeal is what makes people glad they
//   came, gets them talking to neighbors they otherwise pass in the field,
//   and sends them home in better health and better temper.
// - The *Rite* is the business the gathering is actually for: the offerings
//   made, the words said, in the order they have always been said in. What
//   it is worth is its **Power**, and power is what leaves people feeling
//   that the year has been squared with whoever needs squaring with, and
//   that the ones who did it right are worth listening to.
//
// Both are paid for the same way, in time and in food, and both convert that
// outlay by a CES function, but with different substitutability. A feast can
// make up a thin larder with a long night of dancing, within reason
// (rho = -0.5). A rite cannot: the offering is the point, and no amount of
// standing about makes up for having nothing to offer (rho = -2). Both have
// diminishing returns to the pair, so twice the outlay is well short of
// twice the festival.
//
// On top of that sits a scale factor for the way the settlement holds its
// festivals -- the *structure* and who *leads* it. One household is not a
// festival; a village is; a town of thousands, held this way, is a crowd in
// which half the clans are never seen to take their part, and the whole
// thing works less well than it did at half the size.

// ---------------------------------------------------------------------------
// How a settlement holds its festivals.
// ---------------------------------------------------------------------------

// The form of the thing: who takes part, and on what footing. For now there
// is only one, but the structure is always some definite arrangement, and
// later ones will admit people on other terms than "everybody, as usual".
export class RitualStructure {
    constructor(
        readonly name: string,
        readonly description: string,
        // How this way of doing it fares at each size, per aspect. Feast and
        // Rite differ: it takes fewer people for everyone to be seen to have
        // played their part in the rite than it does to fill out a good
        // feast, and the rite falls away sooner for the same reason.
        readonly scale: Readonly<Record<RitualAspectKey, RitualScaleSpec>>,
        // Share of the food brought to the festival that people actually
        // eat. The rest is burnt, poured out, or left to spoil on the
        // offering table -- gone either way, and booked as sacrifice.
        readonly foodEatenShare: number,
    ) { }
}

export const RitualStructures = {
    CommunalFestivals: new RitualStructure(
        'Communal Festivals',
        'Everyone comes, and every clan brings what it has always been '
        + 'expected to bring. Nobody is invited and nobody is excluded: the '
        + 'festival is simply what the settlement does.',
        {
            // A feast wants numbers, and holds up well past its best size:
            // a bigger crowd is still a crowd at a feast.
            feast: { peakPopulation: 200, halfLifeDoublings: 1.8 },
            // The rite is at its best in a village where every clan can be
            // seen to take its part, and comes apart as that stops being
            // common knowledge: about four fifths as good at 150, half at
            // 300, and barely a tenth by 800.
            rite: { peakPopulation: 50, halfLifeDoublings: 2.5 },
        },
        0.8),
};

// Who holds it together. Under Clan Elders that means the senior members of
// each clan, acting by custom rather than by office: they settle the day,
// keep the order of things, and see that nothing is left out.
export class RitualLeadership {
    constructor(
        readonly name: string,
        readonly description: string,
        // What this leadership is worth to the scale factor, as a multiplier.
        // Elders leading in the traditional way are the baseline.
        readonly scaleFactor: number,
    ) { }
}

export const RitualLeaderships = {
    ClanElders: new RitualLeadership(
        'Clan Elders',
        'The elders of each clan settle the day between them and keep the '
        + 'order of things on it. No one holds an office; they lead because '
        + 'they are the ones who remember how it goes.',
        1),
};

// How a way of holding festivals fares at a given size.
export type RitualScaleSpec = {
    // Population at which it works best.
    peakPopulation: number;
    // Doublings of population past that peak at which it is worth half as
    // much. Larger means it carries further before coming apart.
    halfLifeDoublings: number;
};

// How sharply the decline turns once it starts. Above 1 it is gentle just
// past the peak and steepens after, which is how these arrangements actually
// fail: a village somewhat too big muddles through, and then at some point
// there is no longer a way for everyone to be seen to take their part.
export const SCALE_DECLINE_SHARPNESS = 2.5;

// The scale factor for one aspect: 0 at a population of one, climbing with
// the logarithm of numbers to 1 at the peak, and decaying past it. The decay
// never quite reaches zero -- a settlement too big for its festivals still
// gets something out of them, just steadily less.
export function ritualScaleFactor(
    population: number, spec: RitualScaleSpec): number {
    const { peakPopulation, halfLifeDoublings } = spec;
    if (population <= 1 || peakPopulation <= 1) return 0;

    const doublingsPastPeak = Math.log2(population / peakPopulation);
    if (doublingsPastPeak <= 0) {
        // Linear in log population from nothing at one person to the whole of
        // it at the peak.
        return clamp(1 + doublingsPastPeak / Math.log2(peakPopulation), 0, 1);
    }
    if (halfLifeDoublings <= 0) return 0;
    const halvings = Math.pow(
        doublingsPastPeak / halfLifeDoublings, SCALE_DECLINE_SHARPNESS);
    return clamp(Math.pow(2, -halvings), 0, 1);
}

// ---------------------------------------------------------------------------
// The two aspects.
// ---------------------------------------------------------------------------

export type RitualAspectKey = 'feast' | 'rite';

export type RitualAspectSpec = {
    key: RitualAspectKey;
    name: string;
    icon: string;
    description: string;
    // What the aspect's total is called.
    valueName: string;
    // The notional standard, which is what every clan does to begin with:
    // this share of its own year, and this share of its own year's eating.
    standardEffortShare: number;
    standardFoodShare: number;
    // Substitution between time and food. Negative and large means the two
    // are needed together and neither makes up for the other.
    rho: number;
    // Returns to scale on the pair, below 1 so that laying on twice as much
    // is well short of twice the festival.
    nu: number;
    // Log-scale spread of the year's luck: whether the weather held, whether
    // the dancing caught, whether the omens during it read well.
    luckSpread: number;
};

export class RitualAspectDef {
    readonly key: RitualAspectKey;
    readonly name: string;
    readonly icon: string;
    readonly description: string;
    readonly valueName: string;
    readonly standardEffortShare: number;
    readonly standardFoodShare: number;
    readonly rho: number;
    readonly nu: number;
    readonly luckSpread: number;

    constructor(spec: RitualAspectSpec) {
        this.key = spec.key;
        this.name = spec.name;
        this.icon = spec.icon;
        this.description = spec.description;
        this.valueName = spec.valueName;
        this.standardEffortShare = spec.standardEffortShare;
        this.standardFoodShare = spec.standardFoodShare;
        this.rho = spec.rho;
        this.nu = spec.nu;
        this.luckSpread = spec.luckSpread;
    }

    // What a clan of this size would bring at the plain standard, in
    // worker-turns. This is the yardstick the neighbors read a clan's
    // open-handedness against -- it goes with the hands the clan has, so
    // bringing less than this is a choice rather than an accident of how
    // many of its people are grown. Not to be confused with
    // standardLaborForPopulation, which is what the festival asks of the
    // settlement as a whole.
    notionalLaborFor(clan: Clan): number {
        return this.standardEffortShare * clan.effort;
    }

    // What the notional standard asks for a settlement of this size, in
    // worker-turns. The festival's demands are set by how many people have
    // to be fed, housed for the day, and seen to take their part, so this
    // goes with heads rather than with hands -- which is what makes the time
    // side bite: a settlement heavy with children has the same festival to
    // put on with fewer adults to put it on with.
    standardLaborForPopulation(population: number): number {
        return FESTIVAL_EFFORT_PER_PERSON * aspectEffortWeight(this) * population;
    }

    standardFoodFor(clan: Clan): number {
        return this.standardFoodShare * clan.population;
    }

    // Time and food into a base value, with 1 meaning "the standard, done as
    // it has always been done".
    baseValue(timeRatio: number, foodRatio: number): number {
        if (timeRatio <= 0 || foodRatio <= 0) return 0;
        const value = ces([timeRatio, foodRatio], {
            rho: this.rho,
            alpha: [0.5, 0.5],
            nu: this.nu,
        });
        return Number.isFinite(value) ? Math.max(0, value) : 0;
    }
}

export const RitualAspects = {
    Feast: new RitualAspectDef({
        key: 'feast',
        name: 'Feast',
        icon: '🍲',
        description: 'Food, drink, music and dancing, and everyone there to '
            + 'see and be seen.',
        valueName: 'Appeal',
        standardEffortShare: 0.05,
        standardFoodShare: 0.05,
        // A long night can partly make up a thin table, and a full table a
        // short night, but only partly.
        rho: -0.5,
        nu: 0.8,
        luckSpread: 0.12,
    }),

    Rite: new RitualAspectDef({
        key: 'rite',
        name: 'Rite',
        icon: '🔥',
        description: 'The offerings made and the words said, in the order '
            + 'they have always been said in.',
        valueName: 'Power',
        standardEffortShare: 0.05,
        // Less food than the feast by the basketful, but it has to be the
        // best of everything, which is why the share works out the same.
        standardFoodShare: 0.05,
        // The offering is the point. Nothing made up for by standing about.
        rho: -2,
        nu: 0.8,
        luckSpread: 0.12,
    }),
};

export const ALL_RITUAL_ASPECTS: readonly RitualAspectDef[] =
    Object.values(RitualAspects);

// Worker-turns the whole festival asks for per head of the settlement,
// split between the aspects in proportion to what each asks of a clan's
// year. What clans actually bring is a share of their own effort, so this is
// the other side of the bargain and the two need not agree.
export const FESTIVAL_EFFORT_PER_PERSON = 1 / 20;

// Share of a clan's festival effort that goes to each aspect. Both aspects
// ask the same of the standard, so the year's festival time splits evenly;
// this is the place to change that when they stop being equal.
export function aspectEffortWeight(aspect: RitualAspectDef): number {
    const total = sumFun(ALL_RITUAL_ASPECTS, a => a.standardEffortShare);
    return total > 0 ? aspect.standardEffortShare / total : 0;
}

// What the notional standard costs a clan altogether, as a share of its own
// year. This is what a clan sets aside for festivals before arranging the
// rest of its work.
export const STANDARD_FESTIVAL_EFFORT_SHARE =
    sumFun(ALL_RITUAL_ASPECTS, a => a.standardEffortShare);

// Keeping the settlement's festivals used to be part of the Production
// activity -- not named, but there, inside the share of the year a clan spent
// working. Now that it is an activity of its own, that time has come out of
// production, and the hours left in the fields have to bring in what the
// larger share used to. So output per worker goes up by exactly what was
// taken out: splitting the activity out of production is meant to name what
// clans were already doing, not to make them poorer.
//
// This lives here rather than with the processes it scales because econdefs
// sits in an import cycle with people and tuning, and a constant read across
// that cycle at module-evaluation time lands in the temporal dead zone.
const PRODUCTION_SHARE_BEFORE_FESTIVALS = 0.5;
export const FESTIVAL_TIME_COMPENSATION =
    PRODUCTION_SHARE_BEFORE_FESTIVALS
    / (PRODUCTION_SHARE_BEFORE_FESTIVALS - STANDARD_FESTIVAL_EFFORT_SHARE);

// And what it costs in food, as a share of the clan's year's eating. A clan
// aims to bring in what it owes the fires along with what it eats itself, so
// this is added to what it sets out to produce.
export const STANDARD_FESTIVAL_FOOD_SHARE =
    sumFun(ALL_RITUAL_ASPECTS, a => a.standardFoodShare);

// ---------------------------------------------------------------------------
// One clan's part in it.
// ---------------------------------------------------------------------------

// The standing arrangement by which a clan takes its part in the settlement's
// festivals: what it is expected to lay on, and what it managed this year.
// This is the operation behind the Festivals activity, and it is deliberately
// nothing to do with the production operations: no trade good comes out of a
// festival, and the effort it takes is set aside before production is
// planned rather than competing inside it.
export class FestivalOperation {
    // Food actually laid on this year, by aspect, and how it was disposed
    // of. Filled in when the year's festivals are paid for; see
    // settleFestivalEconomy.
    private foodPaid_ = new Map<RitualAspectKey, number>();
    private foodEaten_ = new Map<RitualAspectKey, number>();
    private foodSacrificed_ = new Map<RitualAspectKey, number>();

    constructor(readonly clan: Clan) { }

    // How open-handed this clan means to be, as a factor on the notional
    // standard. Nobody counts out the baskets beforehand, so what a clan
    // brings is a matter of its own habit rather than of any rule.
    get givingFactor(): number {
        return this.clan.traits.festivalGiving;
    }

    // Share of its own year the clan means to give the festivals.
    get willingness(): number {
        return STANDARD_FESTIVAL_EFFORT_SHARE * this.givingFactor;
    }

    // What the clan means to bring each aspect in food.
    foodOwed(aspect: RitualAspectDef): number {
        return this.givingFactor * aspect.standardFoodFor(this.clan);
    }

    // What the plain standard would ask of a clan this size, whatever this
    // one means to bring. The yardstick, not the offer.
    notionalFood(aspect: RitualAspectDef): number {
        return aspect.standardFoodFor(this.clan);
    }

    get totalFoodOwed(): number {
        return sumFun(ALL_RITUAL_ASPECTS, a => this.foodOwed(a));
    }

    foodPaid(aspect: RitualAspectDef): number {
        return this.foodPaid_.get(aspect.key) ?? 0;
    }

    get totalFoodPaid(): number {
        return sumFun(ALL_RITUAL_ASPECTS, a => this.foodPaid(a));
    }

    foodEaten(aspect: RitualAspectDef): number {
        return this.foodEaten_.get(aspect.key) ?? 0;
    }

    foodSacrificed(aspect: RitualAspectDef): number {
        return this.foodSacrificed_.get(aspect.key) ?? 0;
    }

    get totalFoodEaten(): number {
        return sumFun(ALL_RITUAL_ASPECTS, a => this.foodEaten(a));
    }

    get totalFoodSacrificed(): number {
        return sumFun(ALL_RITUAL_ASPECTS, a => this.foodSacrificed(a));
    }

    // Worker-turns the clan actually put in on one aspect, out of the share
    // of its year the effort allocation ended up giving festivals.
    labor(aspect: RitualAspectDef): number {
        return this.clan.festivalLabor * aspectEffortWeight(aspect);
    }

    startYear(): void {
        this.foodPaid_.clear();
        this.foodEaten_.clear();
        this.foodSacrificed_.clear();
    }

    recordFoodPaid(
        aspect: RitualAspectDef, eaten: number, sacrificed: number): void {
        const add = (m: Map<RitualAspectKey, number>, amount: number) =>
            m.set(aspect.key, (m.get(aspect.key) ?? 0) + amount);
        add(this.foodPaid_, eaten + sacrificed);
        add(this.foodEaten_, eaten);
        add(this.foodSacrificed_, sacrificed);
    }
}

// What one clan brought to one aspect, as it stood when the festival was
// held. Read from here rather than from the clan, whose numbers move again
// when the year's births and deaths are drawn.
export class FestivalContribution {
    readonly timeRatio: number;
    readonly foodRatio: number;

    constructor(
        readonly clan: Clan,
        readonly aspect: RitualAspectDef,
        // Share of the clan's whole year that went to festivals.
        readonly effortShare: number,
        readonly workers: number,
        // Worker-turns on this aspect, and this clan's share of what the
        // settlement's festival asks. The clan brings a share of its own
        // hands; the festival asks by heads, so the two need not agree.
        readonly labor: number,
        readonly standardLabor: number,
        // What the plain standard would ask of a clan this size in
        // worker-turns, whatever this one meant to bring. The yardstick the
        // neighbors read its open-handedness against.
        readonly notionalLabor: number,
        // Food laid on for this aspect, and what the standard asks. Paid
        // falls short of what was meant when the larder does.
        readonly food: number,
        readonly standardFood: number,
        // How that food went: eaten at the festival, or given up on the
        // offering table.
        readonly foodEaten: number,
        readonly foodSacrificed: number,
    ) {
        this.timeRatio = safeDiv(labor, standardLabor, 0);
        this.foodRatio = safeDiv(food, standardFood, 0);
    }

    // What this clan was seen to bring, as a factor on the plain standard for
    // a clan its size. This is what the neighbors judge: a clan's own
    // open-handedness, cut down by whatever its year would not stretch to.
    // Time and food count alike, since a festival needs both.
    get givingSeen(): number {
        return 0.5 * (safeDiv(this.labor, this.notionalLabor, 0)
            + safeDiv(this.food, this.notionalFood, 0));
    }

    // The plain standard's food for a clan this size.
    get notionalFood(): number {
        return this.aspect.standardFoodFor(this.clan);
    }
}

// ---------------------------------------------------------------------------
// What the year's festivals came to.
// ---------------------------------------------------------------------------

export class FestivalAspectCalc {
    readonly contributions: FestivalContribution[];

    // Worker-turns and food laid on across the settlement, against what the
    // notional standard asks of it.
    readonly labor: number;
    readonly standardLabor: number;
    readonly food: number;
    readonly standardFood: number;
    // How that food went.
    readonly foodEaten: number;
    readonly foodSacrificed: number;

    // Those two as ratios to the standard: the CES inputs.
    readonly timeRatio: number;
    readonly foodRatio: number;

    // Time and food combined, before luck and before scale.
    readonly baseValue: number;
    // How the day itself went.
    readonly luck: number;
    // What this way of holding a festival is worth at this population.
    readonly scaleFactor: number;

    // Appeal, for the feast; Power, for the rite.
    readonly value: number;

    constructor(
        readonly aspect: RitualAspectDef,
        readonly structure: RitualStructure,
        readonly leadership: RitualLeadership,
        readonly population: number,
        clans: readonly Clan[],
    ) {
        this.contributions = clans
            .filter(clan => clan.population > 0)
            .map(clan => new FestivalContribution(
                clan,
                aspect,
                clan.festivalEffortShare,
                clan.effort,
                clan.festivals.labor(aspect),
                // The settlement's requirement, shared out by heads.
                safeDiv(clan.population, population, 0)
                    * aspect.standardLaborForPopulation(population),
                aspect.notionalLaborFor(clan),
                clan.festivals.foodPaid(aspect),
                aspect.standardFoodFor(clan),
                clan.festivals.foodEaten(aspect),
                clan.festivals.foodSacrificed(aspect)));

        this.labor = sumFun(this.contributions, c => c.labor);
        this.standardLabor = aspect.standardLaborForPopulation(population);
        this.food = sumFun(this.contributions, c => c.food);
        this.standardFood = sumFun(this.contributions, c => c.standardFood);
        this.foodEaten = sumFun(this.contributions, c => c.foodEaten);
        this.foodSacrificed = sumFun(this.contributions, c => c.foodSacrificed);

        this.timeRatio = safeDiv(this.labor, this.standardLabor, 0);
        this.foodRatio = safeDiv(this.food, this.standardFood, 0);

        this.baseValue = aspect.baseValue(this.timeRatio, this.foodRatio);
        this.luck = Math.exp(normal(0, aspect.luckSpread));
        this.scaleFactor = leadership.scaleFactor
            * ritualScaleFactor(population, structure.scale[aspect.key]);

        this.value = this.baseValue * this.luck * this.scaleFactor;
    }

    // What one clan brought, for the tables.
    forClan(uuid: string): FestivalContribution | undefined {
        return this.contributions.find(c => c.clan.uuid === uuid);
    }

    // What a settlement of these clans would bring to this aspect at the
    // plain standard, in worker-turns and in food: the yardstick for how
    // open-handed everyone was.
    get notionalLabor(): number {
        return sumFun(this.contributions, c => c.notionalLabor);
    }

    get notionalFood(): number {
        return sumFun(this.contributions, c => c.notionalFood);
    }

    // What the settlement as a whole was seen to bring to this aspect,
    // against that yardstick.
    get givingSeen(): number {
        return 0.5 * (safeDiv(this.labor, this.notionalLabor, 0)
            + safeDiv(this.food, this.notionalFood, 0));
    }
}

// The settlement's whole year of festivals.
export class Festivals {
    readonly structure: RitualStructure;
    readonly leadership: RitualLeadership;
    readonly population: number;
    readonly aspects: Map<RitualAspectKey, FestivalAspectCalc>;

    constructor(readonly settlement: Settlement) {
        this.structure = settlement.ritualStructure;
        this.leadership = settlement.ritualLeadership;
        this.population = settlement.population;
        this.aspects = new Map(ALL_RITUAL_ASPECTS.map(aspect => [
            aspect.key,
            new FestivalAspectCalc(
                aspect, this.structure, this.leadership,
                this.population, settlement.clans),
        ]));
    }

    get feast(): FestivalAspectCalc { return this.aspects.get('feast')!; }
    get rite(): FestivalAspectCalc { return this.aspects.get('rite')!; }

    // The two headline numbers.
    get appeal(): number { return this.feast.value; }
    get power(): number { return this.rite.value; }

    get calcs(): FestivalAspectCalc[] {
        return ALL_RITUAL_ASPECTS.map(a => this.aspects.get(a.key)!);
    }

    // Whether anything worth calling a festival happened at all.
    get held(): boolean {
        return this.appeal > 0 || this.power > 0;
    }

    // Share of the settlement's whole year that went into the festivals.
    get effortShare(): number {
        const settlementEffort = sumFun(this.settlement.clans, c => c.effort);
        const labor = sumFun(this.calcs, c => c.labor);
        return safeDiv(labor, settlementEffort, 0);
    }

    get food(): number {
        return sumFun(this.calcs, c => c.food);
    }

    get foodEaten(): number {
        return sumFun(this.calcs, c => c.foodEaten);
    }

    get foodSacrificed(): number {
        return sumFun(this.calcs, c => c.foodSacrificed);
    }

    // How open-handed the settlement was seen to be as a whole, against the
    // plain standard for clans of these sizes.
    get givingSeen(): number {
        const notionalLabor = sumFun(this.calcs, c => c.notionalLabor);
        const notionalFood = sumFun(this.calcs, c => c.notionalFood);
        const labor = sumFun(this.calcs, c => c.labor);
        const food = sumFun(this.calcs, c => c.food);
        return 0.5 * (safeDiv(labor, notionalLabor, 0)
            + safeDiv(food, notionalFood, 0));
    }

    // How open-handed one clan was seen to be this year, across both
    // aspects, as a factor on the plain standard for a clan its size.
    // Undefined for a clan that was not here when the festivals were held.
    givingSeenBy(uuid: string): number | undefined {
        const parts = this.calcs
            .map(c => c.forClan(uuid))
            .filter((c): c is FestivalContribution => c !== undefined);
        if (!parts.length) return undefined;
        const labor = sumFun(parts, c => c.labor);
        const notionalLabor = sumFun(parts, c => c.notionalLabor);
        const food = sumFun(parts, c => c.food);
        const notionalFood = sumFun(parts, c => c.notionalFood);
        return 0.5 * (safeDiv(labor, notionalLabor, 0)
            + safeDiv(food, notionalFood, 0));
    }
}

// ---------------------------------------------------------------------------
// Paying for it.
// ---------------------------------------------------------------------------

const FOOD_GOODS: TradeGood[] = [TradeGoods.Fish, TradeGoods.Cereals];

// Draw the food one clan owes one aspect out of what it produced and has not
// yet spoken for, and book where it went. Most of a festival is eaten -- the
// point of laying on food is that people eat it -- so that share goes into
// the clan's own consumption for the year, and only what is burnt, poured
// out, or left to spoil on the offering table is really gone.
//
// A clan with nothing to spare brings less rather than going hungry for the
// festival, and the shortfall shows up in the year's Appeal and Power.
function drawFestivalFood(
    clan: Clan, aspect: RitualAspectDef, owed: number, eatenShare: number): void {
    let paid = 0;
    for (const good of FOOD_GOODS) {
        if (owed - paid <= 1e-9) break;
        const amount = Math.min(clan.distribution.undistributed(good), owed - paid);
        if (amount <= 0) continue;

        const eaten = amount * eatenShare;
        const sacrificed = amount - eaten;
        clan.distribution.addFestivalFood(good, eaten);
        clan.distribution.addSacrifice(good, sacrificed);
        // Booked as food from this year's production, because that is what it
        // is: the clan grew it and its people ate it, at the fires rather
        // than at home.
        clan.consumption.addProduction(good, eaten);
        clan.festivals.recordFoodPaid(aspect, eaten, sacrificed);

        paid += amount;
    }
}

// Take the year's festival food off the top, before anything is eaten at
// home, stored, or given away, and then work out what the festivals came to.
// The food has to change hands first: a settlement that could put nothing on
// the table did not hold much of a festival, and the numbers should say so.
export function settleFestivalEconomy(settlements: readonly Settlement[]): void {
    for (const settlement of settlements) {
        const eatenShare = settlement.ritualStructure.foodEatenShare;
        for (const clan of settlement.clans) {
            clan.festivals.startYear();
            for (const aspect of ALL_RITUAL_ASPECTS) {
                const owed = clan.festivals.foodOwed(aspect);
                if (owed <= 0) continue;
                drawFestivalFood(clan, aspect, owed, eatenShare);
            }
        }
        settlement.updateFestivals();
    }
}

// ---------------------------------------------------------------------------
// What it is worth.
// ---------------------------------------------------------------------------

// Diminishing returns on a festival value: the notional standard, held at
// full scale, buys half of whatever is on offer, and no festival however
// splendid buys all of it.
export function festivalEffect(value: number): number {
    return value > 0 ? value / (value + 1) : 0;
}

export function festivalsOf(clan: Clan): Festivals | undefined {
    return clan.settlement?.festivals;
}

// How open-handed a clan was seen to be at this year's festivals, as a
// factor on the plain standard for a clan its size. Undefined when there has
// been no festival to judge it by.
export function festivalGivingSeen(clan: Clan): number | undefined {
    return festivalsOf(clan)?.givingSeenBy(clan.uuid);
}

export function festivalAppeal(clan: Clan): number {
    return festivalsOf(clan)?.appeal ?? 0;
}

export function festivalPower(clan: Clan): number {
    return festivalsOf(clan)?.power ?? 0;
}

// Points of quality of life a full-strength feast is worth, in gladness at
// having been there. Half of it at the notional standard.
export const FEAST_QOL_MAX = 8;

// And the same for the rite, in the ease of mind that comes of having made
// gifts to the ancestors and to the powers of the world, and of believing
// they were well received.
export const RITE_QOL_MAX = 8;

export function feastQolEffect(clan: Clan): number {
    return FEAST_QOL_MAX * festivalEffect(festivalAppeal(clan));
}

export function riteQolEffect(clan: Clan): number {
    return RITE_QOL_MAX * festivalEffect(festivalPower(clan));
}

// What a good year of feasts does to births and deaths. People who eat well
// together a few times a year, dance, and go home in good temper marry more
// readily and bury fewer of their children; the mechanism is not one thing,
// so this is a flat swing on the rates rather than an account of it.
export const FEAST_HEALTH_SWING = 0.10;

export function feastBirthRateModifier(clan: Clan): number {
    return 1 + FEAST_HEALTH_SWING * festivalEffect(festivalAppeal(clan));
}

export function feastDeathRateModifier(clan: Clan): number {
    return 1 - FEAST_HEALTH_SWING * festivalEffect(festivalAppeal(clan));
}

// What the feast is worth as a way of finding things out. Everyone in the
// settlement is in one place, so this is broadcast rather than conversation:
// a clan learns as much about the neighbors it barely deals with as about
// the ones it works beside all year.
export const FEAST_INFORMATION_CONTACT = 0.4;

export function feastInformationContact(subject: Clan, object: Clan): number {
    if (!subject.settlement || subject.settlement !== object.settlement) return 0;
    return FEAST_INFORMATION_CONTACT * festivalEffect(festivalAppeal(subject));
}

// Goodwill a shared feast leaves behind, on the -1..1 alignment scale.
export const FEAST_ALIGNMENT_MAX = 0.12;

export function feastAlignmentEffect(subject: Clan, object: Clan): number {
    if (!subject.settlement || subject.settlement !== object.settlement) return 0;
    return FEAST_ALIGNMENT_MAX * festivalEffect(festivalAppeal(subject));
}

// Standing a clan gets for having taken its part in a rite that carried.
// Everyone who was there saw it, so this is not scaled by how well the
// neighbors otherwise know the clan.
export const RITE_RESPECT_MAX = 10;

export function riteRespectEffect(subject: Clan, object: Clan): number {
    if (!subject.settlement || subject.settlement !== object.settlement) return 0;
    return RITE_RESPECT_MAX * festivalEffect(festivalPower(object));
}

// Not here yet: what a powerful rite does to what a clan feels like doing.
// The rites of this settlement are the rites of sowing and harvest, so a year
// they went well should be a year for farming. The trouble is that the effort
// planner picks between whole ways of working by hill-climbing on food, so any
// pull at all either does nothing or swings the settlement wholesale into the
// fields, and the middle ground the effect wants is not there to aim at. It
// needs a planner that can weigh appeal against food continuously, so it waits
// for that.
