import { clamp, sum } from "../lib/basics";
import type { Clan } from "./people";

export const INITIAL_POPULATION_RATIOS = [
    [0.2157, 0.2337],
    [0.1541, 0.1598],
    [0.0908, 0.0879],
    [0.0324, 0.0256],
];

// Per 20-year turn, for childbearing-age women.
const BASE_BIRTH_RATE = 2.90;

// Per 20-year turn by age tier.
const BASE_DEATH_RATES = [0.3, 0.4, 0.65, 1.0];

export class DiseaseLoadCalc {
    readonly zoonotic: number;
    readonly endemic: number;

    readonly value: number;

    constructor(readonly clan: Clan) {
        // TODO - fill out model
        this.zoonotic = 0.1;
        this.endemic = Math.log10(clan.world.totalPopulation) * 0.05;
        this.value = this.zoonotic + this.endemic;
    }
}

export class PopulationChangeItem {
    constructor(
        readonly name: string,
        readonly standardRate: number,
        readonly expectedRate: number,
        readonly actualRate: number,
        readonly actual: number,
    ) {}

    get asRow(): string[] {
        return [
            this.name,
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
    readonly newSlices: number[][] = [
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
    ];

    constructor(public readonly clan: Clan, empty: boolean = false) {
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
            );
            this.newSlices = this.clan.slices;
            return;
        }

        // Births. For now, birth rate depends on nutrition.
        const brFactor = clamp(this.clan.consumption.perCapitaSubsistence(), 0, 2);
        const pmbr = brFactor * BASE_BIRTH_RATE;
        const eb = 0.5 * (this.clan.slices[0][0] + this.clan.slices[1][0]) * pmbr;
        this.births = Math.round(eb);
        let femaleBirths = 0;
        for (let i = 0; i < this.births; ++i) {
            if (Math.random() < 0.48) ++femaleBirths;
        }
        const maleBirths = this.births - femaleBirths;
        this.newSlices[0][0] = femaleBirths;
        this.newSlices[0][1] = maleBirths;
        const birthsItem = new PopulationChangeItem(
            'Births', 
            INITIAL_POPULATION_RATIOS[1][0] * pmbr,
            eb / this.previousSize,
            this.births / this.previousSize,
            this.births,
        );

        // Childhood diseases: a terrible source of tragedy through prehistory
        // and prehistory until effective infection control in modern times.
        this.diseaseLoad = new DiseaseLoadCalc(this.clan);
        const diseaseDeaths = Math.round(this.diseaseLoad.value * this.births);
        const diseaseItem = new PopulationChangeItem(
            'Disease',
            -this.diseaseLoad.value,
            -this.diseaseLoad.value,
            -this.diseaseLoad.value,
            -diseaseDeaths,
        );
        const femaleDiseaseDeaths = Math.round(this.diseaseLoad.value * femaleBirths);
        const maleDiseaseDeaths = diseaseDeaths - femaleDiseaseDeaths;
        this.newSlices[1][0] -= femaleDiseaseDeaths;
        this.newSlices[1][1] -= maleDiseaseDeaths;

        // Hazards.
        // TODO - include more items from QoL here
        // TODO - include some disease load here but maybe just do epidemics
        const subsistence = this.clan.consumption.perCapitaSubsistence();
        const drFactor = subsistence >= 1
                       ? 1 - clamp((subsistence - 1) / 5, 0, 0.2)
                       : 1 + clamp((1 - subsistence) / 2, 0, 0.5)
        let [ed, sedr] = [0, 0];
        for (let i = 0; i < this.clan.slices.length - 1; ++i) {
            let [fSurvivors, mSurvivors] = [0, 0];
            for (let j = 0; j < this.clan.slices[i][0]; ++j)
                if (Math.random() >= BASE_DEATH_RATES[i] * drFactor) ++fSurvivors;
            for (let j = 0; j < this.clan.slices[i][1]; ++j)
                if (Math.random() >= 1.1 * BASE_DEATH_RATES[i] * drFactor) ++mSurvivors;
            this.newSlices[i+1][0] = fSurvivors;
            this.newSlices[i+1][1] = mSurvivors;

            ed += drFactor * BASE_DEATH_RATES[i] * this.clan.slices[i][0]
                + drFactor * 1.1 * BASE_DEATH_RATES[i] * this.clan.slices[i][1];
            sedr += INITIAL_POPULATION_RATIOS[i][0] * BASE_DEATH_RATES[i]
                + INITIAL_POPULATION_RATIOS[i][1] * 1.1 * BASE_DEATH_RATES[i];
        }
        ed += this.clan.slices[this.clan.slices.length - 1][0]
            + this.clan.slices[this.clan.slices.length - 1][1];
        sedr += INITIAL_POPULATION_RATIOS[this.clan.slices.length - 1][0]
            + INITIAL_POPULATION_RATIOS[this.clan.slices.length - 1][1];

        let newTotal = 0;
        for (let i = 0; i < this.clan.slices.length; ++i) {
            newTotal += this.newSlices[i][0] + this.newSlices[i][1];
        }
        this.deaths = this.previousSize + this.births - diseaseDeaths - newTotal;

        const hazardsItem = new PopulationChangeItem(
            'Hazards', 
            -sedr,
            -ed / this.previousSize,
            -this.deaths / this.previousSize,
            -this.deaths,
        );

        this.items = [birthsItem, diseaseItem, hazardsItem];
            
        this.total = new PopulationChangeItem(
            'Total',
            sum(this.items.map(item => item.standardRate)),
            sum(this.items.map(item => item.expectedRate)),
            sum(this.items.map(item => item.actualRate)),
            sum(this.items.map(item => item.actual)),
        );
    }

    get br() {
        return this.births / this.previousSize;
    }

    get dr() {
        return this.deaths / this.previousSize;
    }

    get change() {
        return this.births - this.deaths;
    }
}
