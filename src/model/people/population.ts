import type { Clan } from "./people";
import { DiseaseLoadCalc } from "../environment/pathogens";
import { clamp, productFun, sum, sumFun } from "../lib/basics";
import { spct } from "../lib/format";
import { getLocalPrestige, getPrestige } from "../relations/prestige";
import { zScore } from "../lib/modelbasics";
import { getMarriageDecisions } from "../relations/marriage";

function foodVarietyHealthFactor(fishRatio: number): number {
    const p = 1 - fishRatio;
    return 1 - 0.125 * p * p;
}

export const INITIAL_POPULATION_RATIOS = [
    [0.2157, 0.2337],
    [0.1541, 0.1598],
    [0.0908, 0.0879],
    [0.0324, 0.0256],
];

export const SLICE_WIDTH = 20;

// Per year, for childbearing-age women with:
// - standard nutrition
// - minimal shelter
// - no migration
const BASE_BIRTH_RATE = 0.25;

// Per year by age tier.
const BASE_DEATH_RATES = [0.0125, 0.0175, 0.025, 0.05];

const FLOOD_BASE_DEATH_RATE = 0.0025;

// Global multiplier applied to every death rate (all causes, all slices). A
// single knob for tuning overall population growth.
export const DEATH_RATE_ADJUSTMENT_FACTOR = 0.88;

// Causes of death, in the order used for per-cause death-rate arrays.
export const DEATH_CAUSES = ['Disease', 'Hazards', 'Flood', 'Old Age', 'Starvation'] as const;

// Starvation risk thresholds [safe, fatal] on per-capita food consumption
// (1 = full subsistence). Below `safe` starvation risk climbs from 0; at or
// below `fatal` it is certain. The youngest and oldest slices are more
// vulnerable (higher thresholds) than the two middle slices.
const STARVATION_THRESHOLDS = [
    [0.8, 0.4], // slice 0 (youngest)
    [0.6, 0.3], // slice 1
    [0.6, 0.3], // slice 2
    [1.0, 0.5], // slice 3 (oldest)
];

// Convex, monotonically decreasing starvation risk ratio in per-capita food
// consumption: 0 with zero slope at `safe`, rising to 1 at `fatal` and staying
// 1 below it. The squared ramp gives the required increasing-toward-0 derivative.
function starvationRisk(consumption: number, safe: number, fatal: number): number {
    if (consumption >= safe) return 0;
    if (consumption <= fatal) return 1;
    const t = (safe - consumption) / (safe - fatal);
    return t * t;
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
    if (n <= 0 || p <= 0) return 0;
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

// Combine independent per-cause risk ratios into an overall probability of
// death (competing risks), then distribute that probability back across the
// causes in proportion to each cause's original risk.
function redistributeRisks(risks: number[]): number[] {
    const overall = 1 - risks.reduce((acc, r) => acc * (1 - r), 1);
    const total = risks.reduce((a, b) => a + b, 0);
    if (total <= 0) return risks.map(() => 0);
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

function getAvgAppealToBrides(clan: Clan): number {
    const decisions = clan.world.lastMarriageDecisions ?? getMarriageDecisions(clan.world);
    let weightedSum = 0;
    let totalBrides = 0;
    for (const wifeSet of decisions.potentialWives) {
        const brideClan = wifeSet.clan;
        const bridesToThisClan = wifeSet.marriedTo.get(clan) ?? 0;
        if (bridesToThisClan > 0) {
            const appeal = getPrestige(brideClan, clan);
            weightedSum += bridesToThisClan * appeal;
            totalBrides += bridesToThisClan;
        }
    }
    return totalBrides > 0 ? weightedSum / totalBrides : 0;
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
        readonly newSlices: number[][],
        readonly brModifiers: PopulationChangeModifier[],
        readonly brModifier: number,
        readonly drModifiers: PopulationChangeModifier[],
        readonly drModifier: number,
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

    readonly newSlices: number[][] = [];

    constructor(
        readonly clan: Clan,
        readonly yearsElapsed: number = clan.world?.yearsPerTick ?? 1,
    ) {
        const safeVal = (v: number, fallback: number = 1) => (isNaN(v) || !isFinite(v)) ? fallback : v;

        const subsistence = safeVal(this.clan.consumption.perCapitaFood, 1);
        const foodQuantityBrModifier = clamp(subsistence, 0, 2);
        this.brModifiers.push(new PopulationChangeModifier(
            'Food Quantity', subsistence, foodQuantityBrModifier));
        const subsistenceDrModifier = subsistence >= 1
            ? 1 - clamp((subsistence - 1) / 5, 0, 0.2)
            : 1 + clamp((1 - subsistence) / 2, 0, 0.5);
        this.drModifiers.push(new PopulationChangeModifier(
            'Food Quantity', subsistence, subsistenceDrModifier));

        const fishRat = safeVal(this.clan.consumption.fishRatio, 0.5);
        const foodQualityModifier = safeVal(foodVarietyHealthFactor(fishRat), 1);
        this.brModifiers.push(new PopulationChangeModifier(
            'Food Quality', fishRat, foodQualityModifier));
        this.drModifiers.push(new PopulationChangeModifier(
            'Food Quality', fishRat, safeVal(1 / foodQualityModifier, 1)));

        const shelterModifier = 1 + 0.01 * safeVal(this.clan.housing.shelter, 1);
        this.brModifiers.push(new PopulationChangeModifier(
            'Shelter', this.clan.housing.name, shelterModifier));

        const allBrideAppeals = this.clan.world.allClans.map(c => safeVal(getAvgAppealToBrides(c), 0));
        const clanBrideAppeal = safeVal(getAvgAppealToBrides(this.clan), 0);
        const brideAppealZScore = safeVal(zScore(clanBrideAppeal, allBrideAppeals), 0);
        const marriageAppealBrModifier = clamp(1 + 0.1 * brideAppealZScore, 0.67, 1.5);
        this.brModifiers.push(new PopulationChangeModifier(
            'Marriage Appeal', clanBrideAppeal, marriageAppealBrModifier));

        const resFrac = safeVal(this.clan.residenceFraction, 1);
        const mobilityBrModifier = clamp(1 + 0.5 * resFrac, 1, 1.5);
        this.brModifiers.push(new PopulationChangeModifier(
            'Settlement', resFrac, mobilityBrModifier));

        const prestigeVal = safeVal(100 * getLocalPrestige(this.clan), 0);
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

        const intellect = safeVal(this.clan.traits?.intellect ?? 50, 50);
        const foresightBrModifier = Math.pow(0.9, (intellect - 50) / 15);
        const foresightDrModifier = Math.pow(0.95, (intellect - 50) / 15);
        this.brModifiers.push(new PopulationChangeModifier(
            'Foresight', intellect, foresightBrModifier));
        this.drModifiers.push(new PopulationChangeModifier(
            'Foresight', intellect, foresightDrModifier));

        this.brModifier = safeVal(productFun(this.brModifiers, m => m.value), 1);
        this.drModifier = safeVal(productFun(this.drModifiers, m => m.value), 1);
    }

    // Build a population change in three clear steps:
    //   1. Compute expected rates (birth rate; per-slice, per-cause risk ratios).
    //   2. Draw the actual change in people from each cause via random rolls.
    //   3. Apply aging transitions and assemble the new age slices.
    build(): PopulationChange {
        const clan = this.clan;
        const Y = this.yearsElapsed;
        const prevSize = this.initialPopulation;
        const nCauses = DEATH_CAUSES.length;

        // ---- Step 1: expected rates ----

        // Birth rate uses exactly the 20-40 slice (index 1) women, not an average.
        const perWomanBirthRate = this.brModifier * BASE_BIRTH_RATE * Y;
        const childbearingWomen = clan.slices[1][0];
        const expectedBirths = childbearingWomen * perWomanBirthRate;

        // Per-slice annual disease risk ratios, derived from the cumulative
        // probability of dying of disease across each 20-year slice.
        const childhoodDiseaseCum = clamp(
            DISEASE_CHILDHOOD_MIN_CUM + this.diseaseLoad.value,
            DISEASE_CHILDHOOD_MIN_CUM, DISEASE_CHILDHOOD_MAX_CUM);
        const diseaseCumBySlice = [childhoodDiseaseCum, ...DISEASE_LATER_CUM];
        const diseaseRiskBySlice = diseaseCumBySlice.map(
            cum => 1 - Math.pow(1 - cum, 1 / SLICE_WIDTH));

        const floodRisk = this.floodLevel.damageFactor * FLOOD_BASE_DEATH_RATE * Y;

        const consumption = Number.isFinite(clan.consumption.perCapitaFood)
            ? clan.consumption.perCapitaFood : 1;

        // Independent annual risk ratio per cause (in DEATH_CAUSES order) for a
        // given slice and sex mortality multiplier. Every cause is scaled by the
        // global DEATH_RATE_ADJUSTMENT_FACTOR tuning knob.
        const A = DEATH_RATE_ADJUSTMENT_FACTOR;
        const rawRisks = (i: number, sexFactor: number): number[] => [
            diseaseRiskBySlice[i] * Y * sexFactor * A,                 // Disease
            BASE_DEATH_RATES[i] * this.drModifier * Y * sexFactor * A, // Hazards
            floodRisk * sexFactor * A,                                 // Flood
            (i === 3 ? Y / SLICE_WIDTH : 0) * sexFactor * A,           // Old Age
            // No adjustment here because we want risk 1.0 at some point.
            Math.min(1, starvationRisk(                                // Starvation
                consumption, STARVATION_THRESHOLDS[i][0], STARVATION_THRESHOLDS[i][1]
            ) * sexFactor),
        ];

        // ---- Step 2: draw the actual changes ----

        // Births, and their sex split. Newborns enter slice 0 and face this
        // year's slice-0 death risks.
        const births = randomCount(childbearingWomen, perWomanBirthRate);
        let femaleBirths = 0;
        for (let i = 0; i < births; ++i) if (Math.random() < 0.48) ++femaleBirths;
        const newborns = [femaleBirths, births - femaleBirths];
        const expectedNewborns = [expectedBirths * 0.48, expectedBirths * 0.52];

        const actualDeaths = new Array(nCauses).fill(0);
        const expectedDeaths = new Array(nCauses).fill(0);   // after competing risks
        const independentDeaths = new Array(nCauses).fill(0); // each cause alone
        const standardDeaths = new Array(nCauses).fill(0);

        const survivors: number[][] = [];
        for (let i = 0; i < clan.slices.length; ++i) {
            const rowSurvivors: number[] = [];
            for (let g = 0; g < 2; ++g) {
                const risks = rawRisks(i, SEX_FACTORS[g]);
                const deathRates = redistributeRisks(risks);

                const actualPop = clan.slices[i][g] + (i === 0 ? newborns[g] : 0);
                const expectedPop = clan.slices[i][g] + (i === 0 ? expectedNewborns[g] : 0);

                const counts = drawDeathsByCause(actualPop, deathRates);
                let died = 0;
                for (let c = 0; c < nCauses; ++c) {
                    actualDeaths[c] += counts[c];
                    expectedDeaths[c] += deathRates[c] * expectedPop;
                    independentDeaths[c] += risks[c] * expectedPop;
                    standardDeaths[c] += deathRates[c] * INITIAL_POPULATION_RATIOS[i][g];
                    died += counts[c];
                }
                rowSurvivors.push(actualPop - died);
            }
            survivors.push(rowSurvivors);
        }

        // ---- Step 3: aging transitions and new slices ----

        // Each year a fraction of survivors ages into the next slice. The oldest
        // slice has no aging-out here; leaving it is modeled as old-age death.
        const agingFraction = Math.min(1, Y / SLICE_WIDTH);
        const agedOut: number[][] = [];
        for (let i = 0; i < 4; ++i) {
            agedOut.push([
                i < 3 ? randomCount(survivors[i][0], agingFraction) : 0,
                i < 3 ? randomCount(survivors[i][1], agingFraction) : 0,
            ]);
        }

        this.newSlices.length = 0;
        for (let i = 0; i < 4; ++i) {
            const row: number[] = [];
            for (let g = 0; g < 2; ++g) {
                const inflow = i > 0 ? agedOut[i - 1][g] : 0;
                row.push(survivors[i][g] - agedOut[i][g] + inflow);
            }
            this.newSlices.push(row);
        }

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

        const causeMods = [1, this.drModifier, this.floodLevel.damageFactor, 1, consumption];
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
            this.newSlices,
            this.brModifiers,
            this.brModifier,
            this.drModifiers,
            this.drModifier,
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
        return new PopulationChange(1, clan, undefined, [], clan.slices, [], 1, [], 1);
    }
}