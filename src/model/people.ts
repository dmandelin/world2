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
        const share = size / 30;
        this.slices[0][0] = this.slices[0][1] = Math.floor(8 * share);
        this.slices[1][0] = this.slices[1][1] = Math.floor(4 * share);
        this.slices[2][0] = this.slices[2][1] = Math.floor(2 * share);
        this.slices[3][0] = this.slices[3][1] = Math.floor(1 * share);
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

function exp_basicPopChange() {
    const clan = new Clan('Test', 20);
    for (let i = 0; i < 20; ++i) {
        const eb = BASE_BIRTH_RATE * clan.slices[1][0];
        const ed = clan.slices.reduce((acc, slice, i) => 
            acc + slice[0] * BASE_DEATH_RATES[i] + slice[1] * 1.1 * BASE_DEATH_RATES[i], 0);

        const ebr = eb / clan.size;
        const edr = ed / clan.size;

        console.log(i*20, clan.size, 
            ebr.toFixed(2), edr.toFixed(2), (ebr - edr).toFixed(2));
        
        clan.advance();
    }
}

function exp_meanClanLifetime() {
    const lifetimes = [];
    for (let i = 0; i < 1000; ++i) {
        const clan = new Clan('Test', 20);
        let years = 0;
        while (clan.size > 0) {
            clan.advance();
            years += 20;
            if (years > 10000) break;
        }
        lifetimes.push(years);
    }

    const meanLifetime = lifetimes.reduce((acc, lifetime) => acc + lifetime, 0) / lifetimes.length;
    console.log('mean', meanLifetime);
    const variance = lifetimes.reduce((acc, lifetime) => acc + (lifetime - meanLifetime) ** 2, 0) / lifetimes.length;
    console.log('var', variance);
    const stdDev = Math.sqrt(variance);
    console.log('stdDev', stdDev);
    const coefficientOfVariation = stdDev / meanLifetime;
    console.log('cov', coefficientOfVariation);
    const median = lifetimes.sort((a, b) => a - b)[Math.floor(lifetimes.length / 2)];
    console.log('median', median);
}

exp_meanClanLifetime();