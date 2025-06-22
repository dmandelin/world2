import { clamp } from "../lib/basics";
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

export class PopulationChange {
    readonly previousSize: number;
    // QoL-based rate factors.
    readonly qbrf: number;
    readonly qdrf: number;

    // Standard-population-ratio expected rate factors.
    readonly sebr: number;
    readonly sedr: number;
    // Expected rate factors.
    readonly ebr: number;
    readonly edr: number;

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
            this.qbrf = 1;
            this.qdrf = 1;
            this.ebr = 0;
            this.edr = 0;
            this.sebr = 0;
            this.sedr = 0;
            this.newSlices = this.clan.slices;
            return;
        }

        // QoL factors
        const q = clamp(this.clan.qol, -100, 100);
        this.qbrf = 1 + q / 100;
        this.qdrf = 1 - q / 100;

        // Births.
        const pmbr = this.qbrf * BASE_BIRTH_RATE;
        const eb = 0.5 * (this.clan.slices[0][0] + this.clan.slices[1][0]) * pmbr;
        this.births = Math.round(eb);
        let femaleBirths = 0;
        for (let i = 0; i < this.births; ++i) {
            if (Math.random() < 0.48) ++femaleBirths;
        }
        const maleBirths = this.births - femaleBirths;
        this.newSlices[0][0] = femaleBirths;
        this.newSlices[0][1] = maleBirths;

        this.ebr = eb / this.previousSize;
        this.sebr = INITIAL_POPULATION_RATIOS[1][0] * pmbr;

        // Aging and deaths.
        let [ed, sedr] = [0, 0];
        for (let i = 0; i < this.clan.slices.length - 1; ++i) {
            let [fSurvivors, mSurvivors] = [0, 0];
            for (let j = 0; j < this.clan.slices[i][0]; ++j)
                if (Math.random() >= BASE_DEATH_RATES[i] * this.qdrf) ++fSurvivors;
            for (let j = 0; j < this.clan.slices[i][1]; ++j)
                if (Math.random() >= 1.1 * BASE_DEATH_RATES[i] * this.qdrf) ++mSurvivors;
            this.newSlices[i+1][0] = fSurvivors;
            this.newSlices[i+1][1] = mSurvivors;

            ed += this.qdrf * BASE_DEATH_RATES[i] * this.clan.slices[i][0]
                + this.qdrf * 1.1 * BASE_DEATH_RATES[i] * this.clan.slices[i][1];
            sedr += INITIAL_POPULATION_RATIOS[i][0] * BASE_DEATH_RATES[i]
                + INITIAL_POPULATION_RATIOS[i][1] * 1.1 * BASE_DEATH_RATES[i];
        }
        ed += this.clan.slices[this.clan.slices.length - 1][0]
            + this.clan.slices[this.clan.slices.length - 1][1];
        sedr += INITIAL_POPULATION_RATIOS[this.clan.slices.length - 1][0]
            + INITIAL_POPULATION_RATIOS[this.clan.slices.length - 1][1];

        this.sedr = sedr;
        this.edr = ed / this.previousSize;

        let newTotal = 0;
        for (let i = 0; i < this.clan.slices.length; ++i) {
            newTotal += this.newSlices[i][0] + this.newSlices[i][1];
        }
        this.deaths = this.previousSize + this.births - newTotal;
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
