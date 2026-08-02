import type { Clan } from "./people";
import { DiseaseLoadCalc } from "../environment/pathogens";
import { clamp, productFun, sum } from "../lib/basics";
import { spct } from "../lib/format";
import { fishRatio, foodVarietyHealthFactor } from "./happiness";
import { getLocalPrestige } from "../relations/respect";
import { zScore } from "../lib/modelbasics";
import { getMarriageDecisions } from "../relations/marriage";

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

export class PopulationChangeItem {
    constructor(
        readonly name: string,
        readonly mod: number,
        readonly standardRate: number,
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
            const mi = clan.world.perceptions.get(brideClan.uuid, clan.uuid)?.marriageInterest;
            const appeal = mi ? mi.value : 0;
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
        let ed = 0;
        let actual = 0;
        for (const item of this.items) {
            sedr += item.standardRate;
            ed += item.expectedRate;
            actual += item.actual;
        }
        return new PopulationChangeItem(
            'Total',
            1,
            sedr,
            this.previousSize > 0 ? ed / this.previousSize : 0,
            this.previousSize > 0 ? actual / this.previousSize : 0,
            actual
        );
    }
}

export class PopulationChangeBuilder {
    readonly brModifiers: PopulationChangeModifier[] = [];
    readonly drModifiers: PopulationChangeModifier[] = [];

    readonly brModifier: number;
    readonly drModifier: number;

    readonly newSlices: number[][] = [];

    births = 0;
    femaleBirths = 0;
    maleBirths = 0;

    diseaseDeaths = 0;
    femaleDiseaseDeaths = 0;
    maleDiseaseDeaths = 0;

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

        const prestigeVal = safeVal(getLocalPrestige(this.clan), 0);
        const prestigeBrModifier = 1 + 0.003 * prestigeVal;
        this.brModifiers.push(new PopulationChangeModifier(
            'Prestige', prestigeVal, prestigeBrModifier));
        const prestigeDrModifier = 1 - 0.002 * prestigeVal;
        this.drModifiers.push(new PopulationChangeModifier(
            'Prestige', prestigeVal, prestigeDrModifier));

        const stress = safeVal(this.clan.stress.value, 0);
        const stressBrModifier = 1 + 0.005 * stress;
        this.brModifiers.push(new PopulationChangeModifier(
            'Stress', stress, stressBrModifier));
        const stressDrModifier = 1 - 0.005 * stress;
        this.drModifiers.push(new PopulationChangeModifier(
            'Stress', stress, stressDrModifier));

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

    build(): PopulationChange {
        const birthsItem = this.calculateBirths();
        const diseaseItem = this.calculateDisease(); // depends on births
        const hazardsItems = this.calculateHazards(); // computes this.newSlices

        const items = [
            birthsItem,
            diseaseItem,
            ...hazardsItems,
        ];

        return new PopulationChange(
            this.yearsElapsed,
            this.clan,
            this.diseaseLoad,
            items,
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

    calculateBirths() {
        const pmbr = this.brModifier * BASE_BIRTH_RATE * this.yearsElapsed;
        const eb = 0.5 * (this.clan.slices[0][0] + this.clan.slices[1][0]) * pmbr;
        const intEb = Math.floor(eb);
        const fracEb = eb - intEb;
        this.births = intEb + (Math.random() < fracEb ? 1 : 0);
        if (!isFinite(this.births)) debugger;
        if (this.births > 1000) {
            debugger;
            throw new Error("Too many births for simple model");
        }
        for (let i = 0; i < this.births; ++i) {
            if (Math.random() < 0.48) ++this.femaleBirths;
        }
        this.maleBirths = this.births - this.femaleBirths;
        if (isNaN(this.femaleBirths) || isNaN(this.maleBirths)) {
            debugger;
        }
        const initPop = this.initialPopulation;
        return new PopulationChangeItem(
            'Births',
            this.brModifier,
            INITIAL_POPULATION_RATIOS[1][0] * pmbr,
            initPop > 0 ? eb / initPop : 0,
            initPop > 0 ? this.births / initPop : 0,
            this.births,
        );
    }

    calculateDisease() {
        // Childhood diseases: a terrible source of tragedy through prehistory
        // and prehistory until effective infection control in modern times.
        // TODO - Make nutrition affect disease.
        // Fold in a term for other hazards.
        const mortality = this.diseaseLoad.value + 0.2;
        const expectedDisease = mortality * this.births;
        this.diseaseDeaths = Math.floor(expectedDisease) + (Math.random() < (expectedDisease % 1) ? 1 : 0);
        if (!isFinite(this.diseaseDeaths)) debugger;
        const initPop = this.initialPopulation;
        const diseaseDeathRate = initPop > 0 ? this.diseaseDeaths / initPop : 0;
        const expectedFemaleDisease = mortality * this.femaleBirths;
        this.femaleDiseaseDeaths = Math.min(this.diseaseDeaths, Math.floor(expectedFemaleDisease) + (Math.random() < (expectedFemaleDisease % 1) ? 1 : 0));
        this.maleDiseaseDeaths = this.diseaseDeaths - this.femaleDiseaseDeaths;
        return new PopulationChangeItem(
            'Disease',
            1,
            -diseaseDeathRate,
            -diseaseDeathRate,
            -diseaseDeathRate,
            -this.diseaseDeaths,
        );
    }

    calculateHazards() {
        const drFactor = this.drModifier;

        const sources = [];
        if (this.floodLevel.damageFactor >= 0.1) {
            sources.push({
                name: 'Flood',
                deaths: 0, ed: 0, sedr: 0,
                mod: this.floodLevel.damageFactor,
                drFun: () => this.floodLevel.damageFactor * FLOOD_BASE_DEATH_RATE * this.yearsElapsed,
            });
        }
        sources.push({
            name: 'Hazards',
            deaths: 0, ed: 0, sedr: 0,
            mod: drFactor,
            drFun: (i: number) => BASE_DEATH_RATES[i] * drFactor * this.yearsElapsed,
        });

        const newborns = [
            this.femaleBirths - this.femaleDiseaseDeaths,
            this.maleBirths - this.maleDiseaseDeaths,
        ];

        const survivors: number[][] = [];

        // Calculate hazard deaths for all 4 age slices (0..3)
        for (let i = 0; i < this.clan.slices.length; ++i) {
            const femaleDRs = [];
            let femaleDR = 0;
            for (const source of sources) {
                const dr = source.drFun(i);
                femaleDRs.push(dr);
                femaleDR += dr;
            }

            const initialF = this.clan.slices[i][0] + (i === 0 ? newborns[0] : 0);
            const initialM = this.clan.slices[i][1] + (i === 0 ? newborns[1] : 0);

            let [fSurvivors, mSurvivors] = [0, 0];
            for (let j = 0; j < initialF; ++j) {
                let cumFemaleDR = 0;
                let survived = true;
                for (let k = 0; k < femaleDRs.length; ++k) {
                    cumFemaleDR += femaleDRs[k];
                    if (Math.random() < cumFemaleDR) {
                        survived = false;
                        ++sources[k].deaths;
                        break;
                    }
                }
                if (survived) ++fSurvivors;
            }

            for (let j = 0; j < initialM; ++j) {
                let cumMaleDR = 0;
                let survived = true;
                for (let k = 0; k < femaleDRs.length; ++k) {
                    cumMaleDR += 1.1 * femaleDRs[k];
                    if (Math.random() < cumMaleDR) {
                        survived = false;
                        ++sources[k].deaths;
                        break;
                    }
                }
                if (survived) ++mSurvivors;
            }

            survivors.push([fSurvivors, mSurvivors]);

            // Expected values
            for (const [k, source] of sources.entries()) {
                source.ed += femaleDRs[k] * initialF + femaleDRs[k] * 1.1 * initialM;
                source.sedr += femaleDRs[k] * INITIAL_POPULATION_RATIOS[i][0] + femaleDRs[k] * 1.1 * BASE_DEATH_RATES[i];
            }
        }

        // Aging transitions (1/SLICE_WIDTH per year of slice survivors age out into next category)
        const agingFraction = Math.min(1, this.yearsElapsed / SLICE_WIDTH);
        const agingOut: number[][] = [];
        for (let i = 0; i < 4; ++i) {
            const expF = survivors[i][0] * agingFraction;
            const outF = Math.floor(expF) + (Math.random() < (expF % 1) ? 1 : 0);
            const expM = survivors[i][1] * agingFraction;
            const outM = Math.floor(expM) + (Math.random() < (expM % 1) ? 1 : 0);
            agingOut.push([Math.min(survivors[i][0], outF), Math.min(survivors[i][1], outM)]);
        }

        // Old age deaths (elders aging out of slice 3 expire)
        const last = sources[sources.length - 1]!;
        const oldAgeDeaths = agingOut[3][0] + agingOut[3][1];
        last.deaths += oldAgeDeaths;
        last.ed += agingFraction * (survivors[3][0] + 1.1 * survivors[3][1]);
        last.sedr += agingFraction * (INITIAL_POPULATION_RATIOS[3][0] + 1.1 * BASE_DEATH_RATES[3]);

        // Construct new slices
        this.newSlices.length = 0;
        this.newSlices.push([
            survivors[0][0] - agingOut[0][0],
            survivors[0][1] - agingOut[0][1],
        ]);
        this.newSlices.push([
            (survivors[1][0] - agingOut[1][0]) + agingOut[0][0],
            (survivors[1][1] - agingOut[1][1]) + agingOut[0][1],
        ]);
        this.newSlices.push([
            (survivors[2][0] - agingOut[2][0]) + agingOut[1][0],
            (survivors[2][1] - agingOut[2][1]) + agingOut[1][1],
        ]);
        this.newSlices.push([
            (survivors[3][0] - agingOut[3][0]) + agingOut[2][0],
            (survivors[3][1] - agingOut[3][1]) + agingOut[2][1],
        ]);

        const initPop = this.initialPopulation;
        return sources.map(source =>
            new PopulationChangeItem(
                source.name,
                source.mod,
                -source.sedr,
                initPop > 0 ? -source.ed / initPop : 0,
                initPop > 0 ? -source.deaths / initPop : 0,
                -source.deaths));
    }

    static empty(clan: Clan) {
        return new PopulationChange(1, clan, undefined, [], clan.slices, [], 1, [], 1);
    }
}