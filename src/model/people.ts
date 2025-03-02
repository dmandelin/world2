import { normal } from "./distributions";

// Per 20-year turn, for childbearing-age women.
const BASE_BIRTH_RATE = 3.1;

// Per 20-year turn by age tier.
const BASE_DEATH_RATES = [0.3, 0.4, 0.65, 1.0];

const CLAN_NAMES: string[] = [
    "Akkul", "Balag", "Baqal", "Dukug", "Dumuz", "Ezen", "Ezina", "Gibil", "Gudea",
    "Huzir", "Ibgal", "Idnin", "Imdug", "Imiru", "Ishmu", "Kigdu", "Kudul", "Lilum",
    "Lugal", "Namzu", "Nammu", "Nigir", "Nidaba", "Pabil", "Puzur", "Saba", "Shagir",
    "Shaku", "Shara", "Shuba", "Shudu", "Sulgi", "Tabra", "Tarzu", "Teshk", "Tirum",
    "Tugul", "Tukki", "Ubara", "Unug", "Urdu", "Urnin", "Ursag", "Ursim", "Zalki",
    "Zamug", "Zudil", "Zudu", "Zuzu"
];

export function randomClanName(exclude: string[]|Set<String>): string {
    if (Array.isArray(exclude)) exclude = new Set(exclude);
    const available = CLAN_NAMES.filter(name => !exclude.has(name));
    return available[Math.floor(Math.random() * available.length)];
}
  
export class Clan {
    static minDesiredSize = 10;
    static maxDesiredSize = 100;

    constructor(
        public name: string,
        public size: number,
        public skill: number = 50,
        public knowledge: number = 50,
    ) {
        const share = size / 30;
        this.slices[0][0] = this.slices[0][1] = Math.floor(7 * share);
        this.slices[1][0] = this.slices[1][1] = Math.floor(5 * share);
        this.slices[2][0] = this.slices[2][1] = Math.floor(2 * share);
        this.slices[3][0] = this.slices[3][1] = Math.floor(1 * share);
        const remainder = size - this.slicesTotal;
        this.slices[0][0] += Math.floor(remainder / 2);
        this.slices[0][1] += Math.floor((remainder + 1) / 2);
    }

    get quality() {
        return Math.round(2/(1/this.skill + 1/this.knowledge));
    }

    get prestige() {
        return Math.round(Math.log2(this.size) * this.quality / 6);
    }

    c() {
        const c = new Clan(this.name, this.size, this.skill, this.knowledge);
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
        this.advancePopulation();
        this.advanceTraits();
    }

    advancePopulation() {
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

    advanceTraits() {
        this.skill += Math.round(normal(2));
        this.knowledge += Math.round(normal(2));
    }

    absorb(other: Clan) {
        if (other.size >= this.size * 0.5) {
            this.name = `${this.name}-${other.name}`;
        }

        const origSize = this.size;
        this.size += other.size;

        for (let i = 0; i < this.slices.length; ++i) {
            this.slices[i][0] += other.slices[i][0];
            this.slices[i][1] += other.slices[i][1];
        }

        this.skill = Math.round(
            (this.skill * origSize + other.skill * other.size) / 
            (this.size + other.size));

        this.knowledge = Math.round(
            (this.knowledge * origSize + other.knowledge * other.size) /
            (this.size + other.size));
    }

    splitOff(clans: Clans): Clan {
        const fraction = 0.3 + 0.15 * (Math.random() + Math.random());
        const newSize = Math.round(this.size * fraction);

        const name = randomClanName(clans.map(clan => clan.name));
        const newClan = new Clan(name, newSize, this.skill, this.knowledge);
        this.size -= newSize;
        for (let i = 0; i < this.slices.length; ++i) {
            newClan.slices[i][0] = Math.round(this.slices[i][0] * fraction);
            newClan.slices[i][1] = Math.round(this.slices[i][1] * fraction);
            this.slices[i][0] -= newClan.slices[i][0];
            this.slices[i][1] -= newClan.slices[i][1];
        }
        return newClan;
    }
}

export class Clans extends Array<Clan> {
    constructor(...clans: Clan[]) {
      super(...clans);
      this.sort((a, b) => b.prestige - a.prestige);
    }
  
    get population(): number {
      return this.reduce((total, clan) => total + clan.size, 0);
    }

    advance() {
        for (const clan of this) clan.advance();
        this.split();
        this.merge();

        this.sort((a, b) => b.prestige - a.prestige);
    }

    split() {
        const newClans = [];
        for (const clan of this) {
            newClans.push(clan);
            if (clan.size > Clan.maxDesiredSize) {
                newClans.push(clan.splitOff(this));
            }
        }
        this.splice(0, this.length, ...newClans);
    }

    merge() {
        while (true) {
            if (this.length < 2) return;
            const sortedClans = this.toSorted((a, b) => a.size - b.size);
            if (sortedClans[0].size >= Clan.minDesiredSize) return;
            sortedClans[1].absorb(sortedClans[0]);
            this.splice(this.indexOf(sortedClans[0]), 1);
        }
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

function exp_clanGrowthRate() {
    const growthRates = [];
    for (let i = 0; i < 100; ++i) {
        const clan = new Clan('Test', 20);
        const priming = 20;
        const periods = 10;

        for (let j = 0; j < priming; ++j) clan.advance();
        const origSize = clan.size;
        if (origSize == 0) continue;
        
        for (let j = 0; j < periods; ++j) clan.advance();
        growthRates.push(Math.pow(clan.size / origSize, 1 / periods) - 1);
    } 

    console.log('median growth rate', growthRates.sort((a, b) => a - b)[Math.floor(growthRates.length / 2)]);
    console.log('min growth rate', growthRates.reduce((acc, rate) => Math.min(acc, rate)));
    console.log('max growth rate', growthRates.reduce((acc, rate) => Math.max(acc, rate)));
}
