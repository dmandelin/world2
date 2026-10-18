import type { Clan } from "./people";
import { DiseaseLoadCalc } from "../environment/pathogens";
import { assert, clamp, productFun, sum, sumFun, isPositive } from "../lib/basics";
import { spct } from "../lib/format";
import { getLocalPrestige } from "../relations/prestige";
import { zScore } from "../lib/modelbasics";
import { BRIDE_MIN_AGE, GROOM_MIN_AGE, settleInitialMarriages } from "../relations/marriage";
// Base birth rate (per childbearing-age woman per year, with standard
// nutrition, minimal shelter and no migration) and the global death-rate
// multiplier are tunable, so read them from the shared knobs at call time.
import { tuning } from "../tuning";
import { famineDeathShare, nutritionBirthModifier, nutritionHazardModifier } from "./nutrition";

// What care is worth to births and deaths reads care provided -- effort given
// as well as how well it is done -- and lives in care.ts with the rest of what
// that is worth.
import { careBirthRateModifier, careDeathRateModifier } from "./care";

// What a clan's skill at looking after its people is worth to its quality of
// life.
//
// Pinned the same way as every other skill factor in the model: nothing
// either way at 50, the stated figure at 80, straight-line between and past.
// Care is the traditional life of the people, so 50 is what an ordinary clan
// manages and the numbers say what being notably good or bad at it is worth
// against that.
export const CARE_SKILL_BASE = 50;
export const CARE_SKILL_TOP = 80;

// What it is worth simply as a life. Points of quality of life at the top
// of the scale, straight-line from nothing at the middle -- so a badly cared
// for clan is as much worse off as a well cared for one is better.
export const CARE_QOL_AT_TOP = 10;

export function careQolEffect(care: number): number {
    return CARE_QOL_AT_TOP * (care - CARE_SKILL_BASE)
        / (CARE_SKILL_TOP - CARE_SKILL_BASE);
}
import { feastBirthRateModifier, feastDeathRateModifier, festivalAppeal } from "../festivals";

export const INITIAL_POPULATION_RATIOS = [
    [0.2157, 0.2337],
    [0.1541, 0.1598],
    [0.0908, 0.0879],
    [0.0324, 0.0256],
];

import {
    AGE_LIMIT, Demography, FEMALE, MALE, MaritalStatus, SEXES, SLICE_COUNT, SLICE_WIDTH,
    type Sex, sliceAgeWeights, sliceAges, sliceOf,
} from "./demography";

// A new clan's people, exactly `size` of them, in the proportions clans
// start with.
export function initialDemography(size: number): Demography {
    const slices = INITIAL_POPULATION_RATIOS.map(r => r.map(x => Math.round(x * size)));
    // Rounding can leave the total a few off. Make it up among the
    // children, so that the clan has just the people it was meant to.
    let error = sumFun(slices, s => s[0] + s[1]) - size;
    while (error > 0 && slices[0][0] + slices[0][1] > 0) {
        const g = Math.floor(Math.random() * 2);
        if (slices[0][g] > 0) {
            --slices[0][g];
            --error;
        }
    }
    while (error < 0) {
        ++slices[0][Math.floor(Math.random() * 2)];
        ++error;
    }
    const d = Demography.fromSlices(slices);
    settleInitialMarriages(d);
    return d;
}

// The share of a standard population, the one clans start with, at each age,
// by sex. What the standardized death rates are weighed by.
const STANDARD_AGE_SHARES: number[][] = (() => {
    const shares: number[][] = [];
    for (let i = 0; i < SLICE_COUNT; ++i) {
        const weights = sliceAgeWeights(i);
        const total = sum(weights);
        for (const w of weights) {
            shares.push(INITIAL_POPULATION_RATIOS[i].map(r => r * w / total));
        }
    }
    return shares;
})();

// Per year by age tier.
const BASE_DEATH_RATES = [0.0125, 0.0175, 0.025, 0.05];

// The frailty of age: a yearly risk of dying of old age from 60 on that
// doubles about every 8 years, as it does in most human populations. It
// starts at 2.3% a year, which keeps life expectancy at 60 near the 9 years
// it was when old age was a flat 5% a year across the whole 60+ slice.
const OLD_AGE_ONSET = 60;
const OLD_AGE_RISK_AT_ONSET = 0.023;
const OLD_AGE_RISK_DOUBLING_YEARS = 8;

function oldAgeRisk(age: number): number {
    if (age < OLD_AGE_ONSET) return 0;
    return OLD_AGE_RISK_AT_ONSET
        * Math.pow(2, (age - OLD_AGE_ONSET) / OLD_AGE_RISK_DOUBLING_YEARS);
}

const FLOOD_BASE_DEATH_RATE = 0.0025;

// Causes of death, in the order used for per-cause death-rate arrays.
export const DEATH_CAUSES = ['Disease', 'Hazards', 'Flood', 'Old Age', 'Starvation'] as const;

// Indices into DEATH_CAUSES for the two causes a rite might plausibly turn
// aside: someone who fell ill, or who came to harm.
export const DISEASE_CAUSE_INDEX = 0;
export const HAZARDS_CAUSE_INDEX = 1;
const OLD_AGE_CAUSE_INDEX = 3;

// How much older a husband is than his wife, as near as the counts can say
// who was married to whom: the difference in the ages they may marry from.
const SPOUSE_AGE_GAP = GROOM_MIN_AGE - BRIDE_MIN_AGE;

// A death from illness or mishap, kept so that a rite can spare it.
interface IllnessDeath {
    sex: Sex;
    age: number;
    status: MaritalStatus;
    cause: number;
}


// Cumulative probability of dying of disease across a full 20-year age slice.
// Childhood (slice 0) risk scales with disease load between the min and max;
// the later slices have fixed cumulative risks.
const DISEASE_CHILDHOOD_MIN_CUM = 0.10;
const DISEASE_CHILDHOOD_MAX_CUM = 0.40;
const DISEASE_LATER_CUM = [0.02, 0.04, 0.10]; // slices 1..3

const SEX_FACTORS = [1, 1.1]; // female, male mortality multiplier

// Random number of successes in n independent trials, each with probability p.
// Handles p > 1 by granting floor(p) guaranteed successes per trial plus a
// Bernoulli draw for the fractional part. Slices are small, so per-item die
// rolls are simple and fast enough.
function randomCount(n: number, p: number): number {
    if (!isPositive(n) || !isPositive(p)) return 0;
    const whole = Math.floor(p);
    const frac = p - whole;
    let count = n * whole;
    for (let i = 0; i < n; i++) if (Math.random() < frac) ++count;
    return count;
}

// Assign each of n people to at most one cause of death, given per-cause death
// rates that sum to the overall probability of death. Returns deaths per cause.
function drawDeathsByCause(n: number, deathRates: number[]): number[] {
    const counts = new Array(deathRates.length).fill(0);
    for (let person = 0; person < n; ++person) {
        const u = Math.random();
        let cum = 0;
        for (let c = 0; c < deathRates.length; ++c) {
            cum += deathRates[c];
            if (u < cum) { ++counts[c]; break; }
        }
    }
    return counts;
}

// Move the year's drawn deaths by what the rituals settled. A rite that
// carried takes one of the deaths from illness or mishap back; one that
// failed adds a death among the living, counted as illness. Nothing happens
// if there is no death to take back, or nobody left to lose.
function applyRitualDeathAdjustment(
    adjustment: number,
    illnessDeaths: IllnessDeath[],
    dead: Demography,
    survivors: Demography,
    actualDeaths: number[],
): void {
    for (let n = adjustment; n < 0; ++n) {
        if (!illnessDeaths.length) break;
        const pick = Math.floor(Math.random() * illnessDeaths.length);
        const [spared] = illnessDeaths.splice(pick, 1);
        --actualDeaths[spared.cause];
        dead.remove(spared.sex, spared.age, spared.status, 1);
        survivors.add(spared.sex, spared.age, spared.status, 1);
    }

    for (let n = adjustment; n > 0; --n) {
        // Whoever it takes is anyone among the living, alike.
        if (survivors.total === 0) break;
        dead.merge(survivors.take(1));
        ++actualDeaths[DISEASE_CAUSE_INDEX];
    }
}

// Combine independent per-cause risk ratios into an overall probability of
// death (competing risks), then distribute that probability back across the
// causes in proportion to each cause's original risk.
function redistributeRisks(risks: number[]): number[] {
    const overall = 1 - risks.reduce((acc, r) => acc * (1 - r), 1);
    const total = risks.reduce((a, b) => a + b, 0);
    if (!isPositive(total)) return risks.map(() => 0);
    return risks.map(r => overall * (r / total));
}

export class PopulationChangeItem {
    constructor(
        readonly name: string,
        readonly mod: number,
        readonly standardRate: number,
        // Independent risk ratio of this cause alone (per capita, this period).
        readonly riskRate: number,
        // Expected rate after accounting for competing risks (redistributed).
        readonly expectedRate: number,
        readonly actualRate: number,
        readonly actual: number,
    ) { }

    get asRow(): string[] {
        return [
            this.name,
            spct(this.mod),
            (this.standardRate * 1000).toFixed(),
            (this.expectedRate * 1000).toFixed(),
            (this.actualRate * 1000).toFixed(),
            this.actual.toFixed(),
        ];
    }
}

export class PopulationChangeModifier {
    constructor(
        readonly source: string,
        readonly inputValue: string | number,
        readonly value: number,
    ) { }
}

// The prestige of the clan in the eyes of the clans its recent brides came
// from; see marriage.ts.
function getAvgAppealToBrides(clan: Clan): number {
    return clan.world.brideAppeal.get(clan) ?? 0;
}

export class PopulationChange {
    readonly previousSize: number;

    readonly births: number;
    readonly deaths: number;

    constructor(
        readonly yearsElapsed: number,
        readonly clan: Clan,
        readonly diseaseLoad: DiseaseLoadCalc | undefined,
        readonly items: PopulationChangeItem[],
        // The clan's people at the end of the period.
        readonly newDemography: Demography,
        readonly brModifiers: PopulationChangeModifier[],
        readonly brModifier: number,
        readonly drModifiers: PopulationChangeModifier[],
        readonly drModifier: number,
        // Of those who died, how many were betrothed, women first: each
        // death ends a betrothal, which marriage.ts sees to.
        readonly betrothedDeaths: readonly number[] = [0, 0],
    ) {
        this.previousSize = clan.population;
        let [births, deaths] = [0, 0];
        for (const item of items) {
            if (item.actual < 0) {
                deaths -= item.actual;
            } else {
                births += item.actual;
            }
        }
        [this.births, this.deaths] = [births, deaths];

        if (!isFinite(this.births) || !isFinite(this.deaths)) {
            debugger;
        }
    }

    get change() {
        return this.births - this.deaths;
    }

    get total(): PopulationChangeItem {
        let sedr = 0;
        let rr = 0;
        let ed = 0;
        let actual = 0;
        for (const item of this.items) {
            sedr += item.standardRate;
            rr += item.riskRate;
            ed += item.expectedRate;
            actual += item.actual;
        }
        return new PopulationChangeItem(
            'Total',
            1,
            sedr,
            this.previousSize > 0 ? rr / this.previousSize : 0,
            this.previousSize > 0 ? ed / this.previousSize : 0,
            this.previousSize > 0 ? actual / this.previousSize : 0,
            actual
        );
    }

    get birthsItem(): PopulationChangeItem | undefined {
        return this.items.find(i => i.name === 'Births');
    }

    // Death causes, in DEATH_CAUSES order (everything that isn't births).
    get deathItems(): PopulationChangeItem[] {
        return this.items.filter(i => i.name !== 'Births');
    }

    get totalDeathsItem(): PopulationChangeItem {
        const deaths = this.deathItems;
        // The individual causes' alone-risks don't add (competing risks), so the
        // Base column shows the aggregate risk ratio 1-∏(1-rᵢ). Since the
        // redistributed per-cause rates already sum to that aggregate, the sum of
        // expectedRate is exactly it.
        const aggregate = sumFun(deaths, i => i.expectedRate);
        return new PopulationChangeItem(
            'Total Deaths',
            1,
            sumFun(deaths, i => i.standardRate),
            aggregate,
            aggregate,
            sumFun(deaths, i => i.actualRate),
            sumFun(deaths, i => i.actual),
        );
    }

    // Expected deaths this period from illness and mishap -- the two causes a
    // clan could imagine a rite doing something about. Expected rather than
    // actual, so the rate at which critical illnesses come up doesn't jump
    // around with the year's die rolls.
    get expectedIllnessDeaths(): number {
        let rate = 0;
        for (const item of this.items) {
            if (item.name === 'Disease' || item.name === 'Hazards') {
                // Death items carry negative rates.
                rate -= item.expectedRate;
            }
        }
        return rate * this.previousSize;
    }

    get totalChangeItem(): PopulationChangeItem {
        const b = this.birthsItem;
        const d = this.totalDeathsItem;
        return new PopulationChangeItem(
            'Total Change',
            1,
            (b?.standardRate ?? 0) + d.standardRate,
            (b?.riskRate ?? 0) + d.riskRate,
            (b?.expectedRate ?? 0) + d.expectedRate,
            (b?.actualRate ?? 0) + d.actualRate,
            (b?.actual ?? 0) + d.actual,
        );
    }
}

export class PopulationChangeBuilder {
    readonly brModifiers: PopulationChangeModifier[] = [];
    readonly drModifiers: PopulationChangeModifier[] = [];

    readonly brModifier: number;
    readonly drModifier: number;

    constructor(
        readonly clan: Clan,
        readonly yearsElapsed: number = clan.world?.yearsPerTick ?? 1,
    ) {
        // Nutrition: how much the clan ate and how well balanced it was,
        // together. See nutrition.ts.
        const nutrition = this.clan.nutrition;
        const nutritionBrModifier = nutritionBirthModifier(nutrition);
        this.brModifiers.push(new PopulationChangeModifier(
            'Nutrition', nutrition, nutritionBrModifier));
        const nutritionDrModifier = nutritionHazardModifier(nutrition);
        this.drModifiers.push(new PopulationChangeModifier(
            'Nutrition', nutrition, nutritionDrModifier));

        const shelterModifier = 1 + 0.01 * this.clan.housing.shelter;
        this.brModifiers.push(new PopulationChangeModifier(
            'Shelter', this.clan.housing.name, shelterModifier));

        const allBrideAppeals = this.clan.world.allClans.map(c => getAvgAppealToBrides(c));
        const clanBrideAppeal = getAvgAppealToBrides(this.clan);
        const brideAppealZScore = zScore(clanBrideAppeal, allBrideAppeals);
        const marriageAppealBrModifier = clamp(1 + 0.1 * brideAppealZScore, 0.67, 1.5);
        this.brModifiers.push(new PopulationChangeModifier(
            'Marriage Appeal', clanBrideAppeal, marriageAppealBrModifier));

        const resFrac = this.clan.residenceFraction;
        const mobilityBrModifier = clamp(1 + 0.5 * resFrac, 1, 1.5);
        this.brModifiers.push(new PopulationChangeModifier(
            'Settlement', resFrac, mobilityBrModifier));

        const prestigeVal = 100 * getLocalPrestige(this.clan);
        const prestigeBrModifier = 1 + 0.003 * prestigeVal;
        this.brModifiers.push(new PopulationChangeModifier(
            'Prestige', prestigeVal, prestigeBrModifier));
        const prestigeDrModifier = 1 - 0.002 * prestigeVal;
        this.drModifiers.push(new PopulationChangeModifier(
            'Prestige', prestigeVal, prestigeDrModifier));

        const socialQoL = this.clan.qol.valueFrom("social") - (this.clan.qol.m.get("Prestige")?.value ?? 0);
        const socialQoLBrModifier = 1 + 0.005 * -socialQoL;
        this.brModifiers.push(new PopulationChangeModifier(
            'Society', -socialQoL, socialQoLBrModifier));
        const socialQoLDrModifier = 1 - 0.005 * socialQoL;
        this.drModifiers.push(new PopulationChangeModifier(
            'Society', -socialQoL, socialQoLDrModifier));

        // A good year of feasts: people eat well in company a few times a
        // year, marry more readily for having met, and go home in better
        // health and temper than they came.
        const appeal = festivalAppeal(this.clan);
        this.brModifiers.push(new PopulationChangeModifier(
            'Festivals', appeal, feastBirthRateModifier(this.clan)));
        this.drModifiers.push(new PopulationChangeModifier(
            'Festivals', appeal, feastDeathRateModifier(this.clan)));

        // Care provided shows up on the birth rate as a single figure, and on
        // the death rates per age slice, where the effect really lives; the
        // death-rate entry here is the middling slices' worth of it, so the
        // breakdown reads as something rather than nothing.
        const provision = this.clan.careProvision;
        this.brModifiers.push(new PopulationChangeModifier(
            'Care', provision, careBirthRateModifier(provision)));
        this.drModifiers.push(new PopulationChangeModifier(
            'Care', provision, careDeathRateModifier(provision, 1)));

        const intellect = this.clan.traits?.intellect ?? 50;
        const foresightBrModifier = Math.pow(0.9, (intellect - 50) / 15);
        const foresightDrModifier = Math.pow(0.95, (intellect - 50) / 15);
        this.brModifiers.push(new PopulationChangeModifier(
            'Foresight', intellect, foresightBrModifier));
        this.drModifiers.push(new PopulationChangeModifier(
            'Foresight', intellect, foresightDrModifier));

        this.brModifier = productFun(this.brModifiers, m => m.value);
        this.drModifier = productFun(this.drModifiers, m => m.value);
    }

    // Build a population change in three clear steps:
    //   1. Compute expected rates (birth rate; per-age, per-cause risk ratios).
    //   2. Draw the actual change in people from each cause via random rolls.
    //   3. Age everyone the years that went by.
    build(): PopulationChange {
        const clan = this.clan;
        const Y = this.yearsElapsed;
        assert(Number.isInteger(Y) && Y >= 1, `People age by whole years, not ${Y}.`);
        const prevSize = this.initialPopulation;
        const nCauses = DEATH_CAUSES.length;

        // ---- Step 1: expected rates ----

        // Births come of the married women of the 20-40 slice.
        const perWomanBirthRate = this.brModifier * tuning.baseBirthRate * Y;
        const childbearingWomen = clan.demography.count(
            { sex: FEMALE, ages: sliceAges(1), status: MaritalStatus.Married });
        const expectedBirths = childbearingWomen * perWomanBirthRate;

        // Per-slice annual disease risk ratios, derived from the cumulative
        // probability of dying of disease across each 20-year slice.
        const childhoodDiseaseCum = clamp(
            DISEASE_CHILDHOOD_MIN_CUM + this.diseaseLoad.value,
            DISEASE_CHILDHOOD_MIN_CUM, DISEASE_CHILDHOOD_MAX_CUM);
        const diseaseCumBySlice = [childhoodDiseaseCum, ...DISEASE_LATER_CUM];
        const diseaseRiskBySlice = diseaseCumBySlice.map(
            cum => 1 - Math.pow(1 - cum, 1 / SLICE_WIDTH));

        // Background risk from the year's water level, plus the sharp risk
        // of an extreme flood, which is a probability for the year already.
        const floodRisk = this.floodLevel.damageFactor * FLOOD_BASE_DEATH_RATE * Y
                        + clan.floodDamage.extremeDeathRisk;

        // A clan shares what food it has toward those who are most
        // vulnerable, so famine falls alike on every age; see nutrition.ts.
        const nutrition = clan.nutrition;
        const famineRisk = famineDeathShare(nutrition);

        // Independent annual risk ratio per cause (in DEATH_CAUSES order) for a
        // given age and sex mortality multiplier. Every cause is scaled by the
        // global death-rate adjustment tuning knob.
        const A = tuning.deathRateAdjustmentFactor;
        // How much the looking after the clan's people got done is worth in
        // each slice. Applied to the causes a carer could actually do
        // something about: illness, mishap, and the frailty of the old. Not
        // to drowning in a flood, and not to starving, which is a question of
        // how much food there is rather than of who is looking after whom.
        // The middling slices' share is already in drModifier, so it is
        // divided back out here to keep from counting twice.
        const provision = clan.careProvision;
        const careMid = careDeathRateModifier(provision, 1);
        const careBySlice = [0, 1, 2, 3].map(
            i => careDeathRateModifier(provision, i) / careMid);
        const rawRisks = (age: number, sexFactor: number): number[] => {
            const i = sliceOf(age);
            return [
                diseaseRiskBySlice[i] * careBySlice[i] * Y * sexFactor * A,  // Disease
                BASE_DEATH_RATES[i] * this.drModifier * careBySlice[i]
                    * Y * sexFactor * A,                                    // Hazards
                floodRisk * sexFactor * A,                                  // Flood
                Math.min(1, oldAgeRisk(age) * careBySlice[i]
                    * Y * sexFactor * A),                                   // Old Age
                // No adjustment here because we want risk 1.0 at some point.
                famineRisk,                                                 // Starvation
            ];
        };

        // The same for every age and sex: each cause alone, and after
        // competing risks.
        const risksByAge: number[][][] = [];
        const ratesByAge: number[][][] = [];
        for (let age = 0; age < AGE_LIMIT; ++age) {
            const risks = SEXES.map(g => rawRisks(age, SEX_FACTORS[g]));
            risksByAge.push(risks);
            ratesByAge.push(risks.map(redistributeRisks));
        }

        // ---- Step 2: draw the actual changes ----

        // Births, and their sex split. Newborns enter at age 0 and face this
        // year's childhood death risks.
        const births = randomCount(childbearingWomen, perWomanBirthRate);
        let femaleBirths = 0;
        for (let i = 0; i < births; ++i) if (Math.random() < 0.48) ++femaleBirths;
        const newborns = [femaleBirths, births - femaleBirths];
        const expectedNewborns = [expectedBirths * 0.48, expectedBirths * 0.52];

        const next = clan.demography.clone();
        for (const g of SEXES) next.add(g, 0, MaritalStatus.Unmarried, newborns[g]);

        const actualDeaths = new Array(nCauses).fill(0);
        const expectedDeaths = new Array(nCauses).fill(0);   // after competing risks
        const independentDeaths = new Array(nCauses).fill(0); // each cause alone
        const standardDeaths = new Array(nCauses).fill(0);

        const addExpected = (sex: Sex, age: number, n: number) => {
            for (let c = 0; c < nCauses; ++c) {
                expectedDeaths[c] += ratesByAge[age][sex][c] * n;
                independentDeaths[c] += risksByAge[age][sex][c] * n;
            }
        };
        clan.demography.forEach((sex, age, _status, count) => addExpected(sex, age, count));
        for (const g of SEXES) addExpected(g, 0, expectedNewborns[g]);

        for (let age = 0; age < AGE_LIMIT; ++age) {
            for (const g of SEXES) {
                for (let c = 0; c < nCauses; ++c) {
                    standardDeaths[c] += ratesByAge[age][g][c] * STANDARD_AGE_SHARES[age][g];
                }
            }
        }

        // One entry per death from illness or mishap, so a ritual result can
        // reach back and spare a particular one of them.
        const illnessDeaths: IllnessDeath[] = [];

        // Everyone who dies this year. Drawn in full before anyone is taken
        // out, so that a widow made by one of the deaths doesn't face the
        // year's risks a second time.
        const dead = new Demography();
        next.forEach((sex, age, status, count) => {
            const counts = drawDeathsByCause(count, ratesByAge[age][sex]);
            let died = 0;
            for (let c = 0; c < nCauses; ++c) {
                actualDeaths[c] += counts[c];
                if (c === DISEASE_CAUSE_INDEX || c === HAZARDS_CAUSE_INDEX) {
                    for (let k = 0; k < counts[c]; ++k) {
                        illnessDeaths.push({ sex, age, status, cause: c });
                    }
                }
                died += counts[c];
            }
            if (died > 0) dead.add(sex, age, status, died);
        });
        next.subtract(dead);

        // ---- Step 2b: what the year's rituals settled ----
        //
        // A rite said over a critical illness either carries or it doesn't,
        // and the stake is one life. Applied to the drawn deaths rather than
        // to the rates, so the life saved or lost is a particular one.
        applyRitualDeathAdjustment(
            clan.pendingDeathAdjustment, illnessDeaths, dead, next, actualDeaths);

        // ---- Step 3: aging ----

        // Everyone left is a year older for each year gone by. Anyone who
        // would reach AGE_LIMIT has died of old age, though by then its
        // rising risk has taken nearly everyone already.
        for (let y = 0; y < Y; ++y) {
            const aged = next.ageOneYear();
            actualDeaths[OLD_AGE_CAUSE_INDEX] += aged.total;
            dead.merge(aged);
        }

        // ---- Step 4: what the deaths leave behind ----

        // A married person's death widows their spouse, who is in the clan
        // too, and of about the age a spouse would be. A betrothed person's
        // death ends the betrothal, which reaches into another clan; that
        // is left to marriage.ts, once the year's change is made.
        const betrothedDeaths = [0, 0];
        dead.forEach((sex, age, status, count) => {
            if (status === MaritalStatus.Married) {
                const spouse: Sex = sex === FEMALE ? MALE : FEMALE;
                const spouseAge = age + (sex === FEMALE ? SPOUSE_AGE_GAP : -SPOUSE_AGE_GAP);
                for (let k = 0; k < count; ++k) {
                    next.changeStatusNearAge(
                        spouse, Math.max(0, Math.min(AGE_LIMIT - 1, spouseAge)),
                        MaritalStatus.Married, MaritalStatus.Widowed);
                }
            } else if (status === MaritalStatus.Betrothed) {
                betrothedDeaths[sex] += count;
            }
        });

        // ---- Assemble items ----
        const rate = (v: number) => prevSize > 0 ? v / prevSize : 0;

        // Births are not a competing risk, so the alone and adjusted rates match.
        const birthsItem = new PopulationChangeItem(
            'Births',
            this.brModifier,
            INITIAL_POPULATION_RATIOS[1][0] * perWomanBirthRate,
            rate(expectedBirths),
            rate(expectedBirths),
            rate(births),
            births,
        );

        const causeMods = [
            1,
            this.drModifier,
            this.floodLevel.damageFactor + clan.floodDamage.extremeDeathRisk,
            1,
            nutrition,
        ];
        const deathItems = DEATH_CAUSES.map((name, c) => new PopulationChangeItem(
            name,
            causeMods[c],
            -standardDeaths[c],
            -rate(independentDeaths[c]),
            -rate(expectedDeaths[c]),
            -rate(actualDeaths[c]),
            -actualDeaths[c],
        ));

        return new PopulationChange(
            this.yearsElapsed,
            this.clan,
            this.diseaseLoad,
            [birthsItem, ...deathItems],
            next,
            this.brModifiers,
            this.brModifier,
            this.drModifiers,
            this.drModifier,
            betrothedDeaths,
        );
    }

    get initialPopulation() {
        return this.clan.population;
    }

    get diseaseLoad() {
        return this.clan.settlement.cluster.diseaseLoad;
    }

    get floodLevel() {
        return this.clan.settlement.floodLevel;
    }

    static empty(clan: Clan) {
        return new PopulationChange(1, clan, undefined, [], clan.demography, [], 1, [], 1);
    }
}