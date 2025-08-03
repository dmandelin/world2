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

    readonly diseaseLoad: DiseaseLoadCalc|undefined;
    readonly items: PopulationChangeItem[];
    readonly total: PopulationChangeItem;

    // Actual changes.
    readonly births: number;
    readonly deaths: number;
    readonly newSlices: number[][];

    constructor(public readonly clan: Clan, empty: boolean = false) {
        const newSlices = [[0, 0], [0, 0], [0, 0], [0, 0]];
        this.previousSize = clan.population;

        if (empty) {
            this.births = 0;
            this.deaths = 0;
            this.items = [];
            this.total = new PopulationChangeItem(
                'Total',
                0,
                0,
                0,
                0,
                0,
            );
            this.newSlices = clan.slices;
            return;
        }

        // Up to 10% increase/decrease in birth/death rates for shelter.
        // That's for a warm environment and assuming some shelter always.
        const shelterModifier = 1 + 0.01 * this.clan.housing.shelter;

        // Births. For now, birth rate depends on nutrition and shelter.
        const brFactor = clamp(this.clan.consumption.perCapitaSubsistence(), 0, 2)
            * shelterModifier;
        const pmbr = brFactor * BASE_BIRTH_RATE;
        const eb = 0.5 * (this.clan.slices[0][0] + this.clan.slices[1][0]) * pmbr;
        this.births = Math.round(eb);
        let femaleBirths = 0;
        for (let i = 0; i < this.births; ++i) {
            if (Math.random() < 0.48) ++femaleBirths;
        }
        const maleBirths = this.births - femaleBirths;
        newSlices[0][0] = femaleBirths;
        newSlices[0][1] = maleBirths;
        const birthsItem = new PopulationChangeItem(
            'Births',
            brFactor,
            INITIAL_POPULATION_RATIOS[1][0] * pmbr,
            eb / this.previousSize,
            this.births / this.previousSize,
            this.births,
        );

        // Childhood diseases: a terrible source of tragedy through prehistory
        // and prehistory until effective infection control in modern times.
        this.diseaseLoad = this.clan.settlement.cluster.diseaseLoad;
        // Fold in a term for other hazards.
        const mortality = this.diseaseLoad.value + 0.2;
        const diseaseDeaths = Math.round(mortality * this.births);
        const diseaseDeathRate = diseaseDeaths / this.previousSize;
        const diseaseItem = new PopulationChangeItem(
            'Disease',
            1,
            -diseaseDeathRate,
            -diseaseDeathRate,
            -diseaseDeathRate,
            -diseaseDeaths,
        );
        const femaleDiseaseDeaths = Math.round(mortality * femaleBirths);
        const maleDiseaseDeaths = diseaseDeaths - femaleDiseaseDeaths;
        newSlices[0][0] -= femaleDiseaseDeaths;
        newSlices[0][1] -= maleDiseaseDeaths;

        // Hazards.
        // TODO - include more items from QoL here
        // TODO - include some disease load here but maybe just do epidemics
        const subsistence = this.clan.consumption.perCapitaSubsistence();
        const subsistenceDrFactor = subsistence >= 1
                       ? 1 - clamp((subsistence - 1) / 5, 0, 0.2)
                       : 1 + clamp((1 - subsistence) / 2, 0, 0.5)
        const drFactor = subsistenceDrFactor / shelterModifier;
        let [ed, sedr] = [0, 0];
        let deaths = 0;
        for (let i = 0; i < this.clan.slices.length - 1; ++i) {
            let [fSurvivors, mSurvivors] = [0, 0];
            for (let j = 0; j < this.clan.slices[i][0]; ++j)
                if (Math.random() >= BASE_DEATH_RATES[i] * drFactor) ++fSurvivors;
            for (let j = 0; j < this.clan.slices[i][1]; ++j)
                if (Math.random() >= 1.1 * BASE_DEATH_RATES[i] * drFactor) ++mSurvivors;
            newSlices[i+1][0] = fSurvivors;
            newSlices[i+1][1] = mSurvivors;
            deaths += this.clan.slices[i][0] - fSurvivors + this.clan.slices[i][1] - mSurvivors;

            ed += drFactor * BASE_DEATH_RATES[i] * this.clan.slices[i][0]
                + drFactor * 1.1 * BASE_DEATH_RATES[i] * this.clan.slices[i][1];
            sedr += INITIAL_POPULATION_RATIOS[i][0] * BASE_DEATH_RATES[i]
                + INITIAL_POPULATION_RATIOS[i][1] * 1.1 * BASE_DEATH_RATES[i];
        }
        ed += this.clan.slices[this.clan.slices.length - 1][0]
            + this.clan.slices[this.clan.slices.length - 1][1];
        sedr += INITIAL_POPULATION_RATIOS[this.clan.slices.length - 1][0]
            + INITIAL_POPULATION_RATIOS[this.clan.slices.length - 1][1];
        deaths += this.clan.slices[this.clan.slices.length - 1][0]
            + this.clan.slices[this.clan.slices.length - 1][1];

        this.deaths = deaths;

        const hazardsItem = new PopulationChangeItem(
            'Hazards', 
            drFactor,
            -sedr,
            -ed / this.previousSize,
            -this.deaths / this.previousSize,
            -this.deaths,
        );

        this.items = [birthsItem, diseaseItem, hazardsItem];
            
        this.total = new PopulationChangeItem(
            'Total',
            1,
            sum(this.items.map(item => item.standardRate)),
            sum(this.items.map(item => item.expectedRate)),
            sum(this.items.map(item => item.actualRate)),
            sum(this.items.map(item => item.actual)),
        );

        this.newSlices = newSlices;

        let newTotal = 0;
        for (let i = 0; i < this.clan.slices.length; ++i) {
            newTotal += newSlices[i][0] + newSlices[i][1];
        }
    }

    get br() {
        return this.births / this.previousSize;
    }

    get dr() {
        return this.deaths / this.previousSize;
    }

    get change() {
        return this.total.actual;
    }
}
