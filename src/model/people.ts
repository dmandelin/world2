// Per 20-year turn, for childbearing-age women.
const BASE_BIRTH_RATE = 3;

// Per 20-year turn by age tier.
const BASE_DEATH_RATES = [0.3, 0.4, 0.65, 1.0];

export class Clan {
    constructor(
        readonly name: string,
        public size: number,
        public skill: number = 2,
    ) {
        const share = Math.floor(size / 6);
        this.slices[0][0] = this.slices[0][1] = share;
        this.slices[1][0] = this.slices[1][1] = Math.floor(0.8 * share);
        this.slices[2][0] = this.slices[2][1] = Math.floor(0.7 * share);
        this.slices[3][0] = this.slices[3][1] = Math.floor(0.5 * share);
        const remainder = size - this.slicesTotal;
        this.slices[0][0] += Math.floor(remainder / 2);
        this.slices[0][1] += Math.floor((remainder + 1) / 2);
    }

    c() {
        const c = new Clan(this.name, this.size, this.skill);
        for (let i = 0; i < this.slices.length; ++i) {
            c.slices[i][0] = this.slices[i][0];
            c.slices[i][1] = this.slices[i][1];
        }
        return c;
    }

    readonly slices: number[][] = [
        [0, 0], // Children, girls first (0-18)
        [0, 0], // Adults (18-35)
        [0, 0], // Seniors (35-55)
        [0, 0], // Elders (55+)
    ];

    private get slicesTotal(): number {
        return this.slices.reduce((acc, slice) => acc + slice[0] + slice[1], 0);
    }

    advance() {
        const prevSlices = this.slices.map(slice => slice.slice());

        const births = Math.round(this.slices[1][0] * BASE_BIRTH_RATE);
        let femaleBirths = 0;
        for (let i = 0; i < births; ++i) {
            if (Math.random() < 0.48) ++femaleBirths;
        }
        const maleBirths = births - femaleBirths;

        this.slices[0][0] = femaleBirths;
        this.slices[0][1] = maleBirths;

        for (let i = 0; i < this.slices.length - 1; ++i) {
            let [fSurvivors, mSurvivors] = [0, 0];
            for (let j = 0; j < this.slices[i][0]; ++j)
                if (Math.random() >= BASE_DEATH_RATES[i]) ++fSurvivors;
            for (let j = 0; j < this.slices[i][1]; ++j)
                if (Math.random() >= 1.1 * BASE_DEATH_RATES[i]) ++mSurvivors;
            this.slices[i+1][0] = fSurvivors;
            this.slices[i+1][1] = mSurvivors;
        }

        this.size = this.slicesTotal;
    }
}
