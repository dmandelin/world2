import { DiseaseLoadCalc } from "../environment/pathogens";
import { clamp, sum } from "../lib/basics";
import { spct } from "../lib/format";
import type { Clan } from "./people";

export const INITIAL_POPULATION_RATIOS = [
    [0.2157, 0.2337],
    [0.1541, 0.1598],
    [0.0908, 0.0879],
    [0.0324, 0.0256],
];

// Per 20-year turn, for childbearing-age women.
const BASE_BIRTH_RATE = 4.5;

// Per 20-year turn by age tier.
const BASE_DEATH_RATES = [0.25, 0.35, 0.5, 1.0];

export class PopulationChangeItem {
    constructor(
        readonly name: string,
        readonly mod: number,
        readonly standardRate: number,
        readonly expectedRate: number,
        readonly actualRate: number,
        readonly actual: number,
    ) {}

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

export class PopulationChange {
    readonly previousSize: number;

    readonly births: number;
    readonly deaths: number;

    constructor(
        readonly clan: Clan,
        readonly diseaseLoad: DiseaseLoadCalc|undefined,
        readonly items: PopulationChangeItem[],
        readonly newSlices: number[][],
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
            ed / this.previousSize,
            actual / this.previousSize,
            actual
        );
    }
}

export class PopulationChangeBuilder {
    readonly shelterModifier: number;
    readonly newSlices: number[][] = [];

    births = 0;
    femaleBirths = 0;
    maleBirths = 0;

    diseaseDeaths = 0;
    femaleDiseaseDeaths = 0;
    maleDiseaseDeaths = 0;

    constructor(readonly clan: Clan) {
        // Up to 10% increase/decrease in birth/death rates for shelter.
        // That's for a warm environment and assuming some shelter always.
        this.shelterModifier = 1 + 0.01 * this.clan.housing.shelter;
    }

    build(): PopulationChange {
        // First slice.
        const birthsItem = this.calculateBirths();
        const diseaseItem = this.calculateDisease(); // depends on births
        this.newSlices.push([
            this.femaleBirths - this.femaleDiseaseDeaths,
            this.maleBirths - this.maleDiseaseDeaths,
        ]);

        const hazardsItems = this.calculateHazards();

        const items = [
            birthsItem,
            diseaseItem,
            ...hazardsItems,
        ];

        return new PopulationChange(this.clan, this.diseaseLoad, items, this.newSlices);
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
        // For now, birth rate depends on nutrition and shelter.
        const brFactor = clamp(this.clan.consumption.perCapitaSubsistence(), 0, 2)
            * this.shelterModifier;
        const pmbr = brFactor * BASE_BIRTH_RATE;
        const eb = 0.5 * (this.clan.slices[0][0] + this.clan.slices[1][0]) * pmbr;
        this.births = Math.round(eb);
        for (let i = 0; i < this.births; ++i) {
            if (Math.random() < 0.48) ++this.femaleBirths;
        }
        this.maleBirths = this.births - this.femaleBirths;
        return new PopulationChangeItem(
            'Births',
            brFactor,
            INITIAL_POPULATION_RATIOS[1][0] * pmbr,
            eb / this.initialPopulation,
            this.births / this.initialPopulation,
            this.births,
        );
    }

    calculateDisease() {
        // Childhood diseases: a terrible source of tragedy through prehistory
        // and prehistory until effective infection control in modern times.
        // TODO - Make nutrition affect disease.
        // Fold in a term for other hazards.
        const mortality = this.diseaseLoad.value + 0.2;
        this.diseaseDeaths = Math.round(mortality * this.births);
        const diseaseDeathRate = this.diseaseDeaths / this.initialPopulation;
        this.femaleDiseaseDeaths = Math.round(mortality * this.femaleBirths);
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
        const subsistence = this.clan.consumption.perCapitaSubsistence();
        const subsistenceDrFactor = subsistence >= 1
                       ? 1 - clamp((subsistence - 1) / 5, 0, 0.2)
                       : 1 + clamp((1 - subsistence) / 2, 0, 0.5)
        const drFactor = subsistenceDrFactor / this.shelterModifier;

        const sources = [];
        if (this.floodLevel.damageFactor >= 0.1) {
            sources.push({
                name: 'Flood',
                deaths: 0, ed: 0, sedr: 0,
                mod: this.floodLevel.damageFactor,
                drFun: () => this.floodLevel.damageFactor * 0.05,
            });
        }
        sources.push({
                name: 'Hazards',
                deaths: 0, ed: 0, sedr: 0,
                mod: drFactor,
                drFun: (i: number) => BASE_DEATH_RATES[i] * drFactor,
            });

        for (let i = 0; i < this.clan.slices.length - 1; ++i) {
            // Calculate per-cause and overall death rates.
            const femaleDRs = [];
            let femaleDR = 0;
            for (const source of sources) {
                const dr = source.drFun(i);
                femaleDRs.push(dr);
                femaleDR += dr;
            }

            // Calculate survivors and per-cause deaths for each slice.
            let [fSurvivors, mSurvivors] = [0, 0];
            for (let j = 0; j < this.clan.slices[i][0]; ++j) {
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
            for (let j = 0; j < this.clan.slices[i][1]; ++j) {
                let cumMaleDR = 0;
                let survived = true;
                for (let k = 0; k < femaleDRs.length; ++k) {
                    cumMaleDR += 1.1 * femaleDRs[i];
                    if (Math.random() < cumMaleDR) {
                        survived = false;
                        ++sources[k].deaths;
                        break;
                    }
                }
                if (survived) ++mSurvivors;
            }
            this.newSlices.push([fSurvivors, mSurvivors]);

            // Expected values.
            for (const [k, source] of sources.entries()) {
                source.ed += femaleDRs[k] * this.clan.slices[i][0]
                           + femaleDRs[k] * 1.1 * this.clan.slices[i][1];
                source.sedr += femaleDRs[k] * INITIAL_POPULATION_RATIOS[i][0]
                       + femaleDRs[k] * 1.1 * BASE_DEATH_RATES[i];
            }
        }
        const last = sources[sources.length - 1];
        // Old age
        last.ed += this.clan.slices[this.clan.slices.length - 1][0]
            + this.clan.slices[this.clan.slices.length - 1][1];
        last.sedr += INITIAL_POPULATION_RATIOS[this.clan.slices.length - 1][0]
            + INITIAL_POPULATION_RATIOS[this.clan.slices.length - 1][1];
        last.deaths += this.clan.slices[this.clan.slices.length - 1][0]
            + this.clan.slices[this.clan.slices.length - 1][1];

        return sources.map(source =>
            new PopulationChangeItem(
                source.name, 
                source.mod, 
                -source.sedr, 
                -source.ed / this.initialPopulation,
                -source.deaths / this.initialPopulation,
                -source.deaths));
    }

    static empty(clan: Clan) {
        return new PopulationChange(clan, undefined, [], clan.slices);
    }
}