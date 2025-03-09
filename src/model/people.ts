import { clamp } from "./basics";
import { normal, poisson, weightedRandInt } from "./distributions";
import { Behaviors, Festival, FestivalBehavior, mutate } from "./festival";
import type { Settlement } from "./settlement";

// Per 20-year turn, for childbearing-age women.
const BASE_BIRTH_RATE = 3.0;

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

const CLAN_COLORS: string[] = [
    'red', 'orange', 'green', 'blue', 'purple', 'brown', 'black', 'gray', 'pink', 'cyan'
];

export function randomClanName(exclude: string[]|Set<String>): string {
    if (Array.isArray(exclude)) exclude = new Set(exclude);
    const available = CLAN_NAMES.filter(name => !exclude.has(name));
    return available[Math.floor(Math.random() * available.length)];
}

export function randomClanColor(exclude: string[]|Set<String>): string {
    if (Array.isArray(exclude)) exclude = new Set(exclude);
    const available = CLAN_COLORS.filter(color => !exclude.has(color));
    return available[Math.floor(Math.random() * available.length)];
}

function randomStat(): number {
    return clamp(Math.round(normal(50, 20)), 0, 100);
}

const INITIAL_POPULATION_RATIOS = [
    [0.2157, 0.2337],
    [0.1541, 0.1598],
    [0.0908, 0.0879],
    [0.0324, 0.0256],
];

export class Clan {
    static minDesiredSize = 10;
    static maxDesiredSize = 100;

    public happiness = 50;
    public interactionModifier = 0;
    public festivalModifier = 0;

    settlement: Settlement|undefined;

    constructor(
        public name: string,
        public color: string,
        public size: number,
        public festivalBehavior: FestivalBehavior = Behaviors.reliable,
        public skill: number = randomStat(),
        public knowledge: number = randomStat(),
    ) {
        for (let i = 0; i < 4; ++i) {
            this.slices[i][0] = Math.round(INITIAL_POPULATION_RATIOS[i][0] * size);
            this.slices[i][1] = Math.round(INITIAL_POPULATION_RATIOS[i][1] * size);
        }
    }

    get quality() {
        return Math.round(2/(1/this.skill + 1/this.knowledge));
    }

    get techModifier() {
        const techOutputFactor = this.settlement?.technai.outputFactor ?? 1;
        return Math.round((techOutputFactor - 1) * 20);
    }

    get qol() {
        return this.quality + 
            this.interactionModifier + 
            this.festivalModifier + 
            this.techModifier +
            (this.settlement?.populationPressureModifier || 0);
    }

    get prestige() {
        return Math.round(Math.log2(this.size) * this.qol / 6);
    }

    c() {
        const c = new Clan(this.name, this.color, this.size, this.festivalBehavior, this.skill, this.knowledge);
        for (let i = 0; i < this.slices.length; ++i) {
            c.slices[i][0] = this.slices[i][0];
            c.slices[i][1] = this.slices[i][1];
        }
        c.settlement = this.settlement;
        c.happiness = this.happiness;
        c.interactionModifier = this.interactionModifier;
        c.festivalModifier = this.festivalModifier;
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
        this.advanceHappiness();
    }

    advancePopulation() {
        const prevSlices = this.slices.map(slice => slice.slice());

        let quality = this.qol;
        if (quality < 0) quality = 0;
        if (quality > 100) quality = 100;
        const qbrm = 1 + (quality - 50) / 1000;
        const qdrm = 1 + (50 - quality) / 1000;

        const births = Math.round(this.slices[1][0] * BASE_BIRTH_RATE * qbrm);
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
                if (Math.random() >= BASE_DEATH_RATES[i] * qdrm) ++fSurvivors;
            for (let j = 0; j < this.slices[i][1]; ++j)
                if (Math.random() >= 1.1 * BASE_DEATH_RATES[i] * qdrm) ++mSurvivors;
            this.slices[i+1][0] = fSurvivors;
            this.slices[i+1][1] = mSurvivors;
        }

        this.size = this.slicesTotal;
    }

    get expectedPopulationChange() {
        let quality = this.qol;
        if (quality < 0) quality = 0;
        if (quality > 100) quality = 100;
        const qbrm = 1 + (quality - 50) / 1000;
        const qdrm = 1 + (50 - quality) / 1000;

        const ebr = BASE_BIRTH_RATE * qbrm * this.slices[1][0] / this.size;
        let ed = 0;
        for (let i = 0; i < this.slices.length - 1; ++i) {
            ed += this.slices[i][0] * qdrm * BASE_DEATH_RATES[i] + this.slices[i][1] * qdrm * 1.1 * BASE_DEATH_RATES[i];
        }
        const edr = ed / this.size;
        return [ebr, edr, ebr - edr].map(r => Math.round(r * 1000));
    }

    advanceTraits() {
        this.skill = this.advancedTrait(this.skill);
        this.knowledge = this.advancedTrait(this.knowledge);
    }

    advancedTrait(value: number) {
        const incr = Math.round(normal(2));
        if (incr > 0 && value > 50 || incr < 0 && value < 50) {
            if (Math.random() < Math.abs(value - 50) / 50) return value;
        }
        return clamp(value + incr, 0, 100);
    }

    advanceHappiness() {
        const skillModifier = (this.skill - 50) / 10;
        const knowledgeModifier = (this.knowledge - 50) / 10;
        const luckModifier = normal(0, 5);
        this.happiness = Math.round(50 + 
            skillModifier + 
            knowledgeModifier + 
            luckModifier +
            this.interactionModifier +
            this.festivalModifier
        );
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
        const color = randomClanColor(clans.map(clan => clan.color));
        const newClan = new Clan(name, color, newSize, this.festivalBehavior, this.skill, this.knowledge);
        newClan.settlement = this.settlement;
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
    festival: Festival = new Festival(this);

    constructor(...clans: Clan[]) {
      super(...clans);
      this.sort((a, b) => b.prestige - a.prestige);
    }
  
    get population(): number {
      return this.reduce((total, clan) => total + clan.size, 0);
    }

    advance() {
        this.runFestival();
        this.interact();
        this.marry();
        for (const clan of this) clan.advance();
        this.split();
        this.merge();
        this.prune()

        this.sort((a, b) => b.prestige - a.prestige);
    }

    runFestival() {
        for (const clan of this) {
            clan.festivalBehavior = mutate(clan.festivalBehavior);
            clan.festivalModifier = 0;
        }
        const participants = [];
        for (const clan of this) {
            if (clan.festivalBehavior.willParticipate()) {
                participants.push(clan);
            } else {
                const t = 30;
                if (clan.knowledge > t)
                    clan.knowledge = t + Math.round((clan.knowledge - t) * 0.9);
            }
        }
        this.festival = new Festival(participants);
        this.festival.process();
    }

    interact() {
        // Each pair of clans may have some zero-sum interactions,
        // typically embedded in a positive- or negative-sum context.
        // Those contexts are assumed to be part of the general model,
        // so we only need to consider the zero-sum interactions here.
        //
        // The interaction transfers happiness and 'temporary quality'
        // (representing resources, tangble or otherwise) between the
        // two.
        for (const c of this) {
            c.interactionModifier = 0;
        }

        for (let i = 0; i < this.length; ++i) {
            for (let j = i + 1; j < this.length; ++j) {
                const stakes = poisson(1);
                if (stakes == 0) continue;

                const a = this[i];
                const b = this[j];
                
                // Use the Elo formula but with 10 points instead of 400.
                const aWinProb = 1 / (1 + Math.pow(10, (b.prestige - a.prestige) / 10));
                if (Math.random() < aWinProb) {
                    a.interactionModifier += stakes;
                    b.interactionModifier -= stakes;
                } else {
                    a.interactionModifier -= stakes;
                    b.interactionModifier += stakes;
                }
            }
        }
    }

    marry() {
        // Young women marrying into their husbands' clans was the
        // most common pattern. We don't simulate every pairing.
        // The key point is that without this, once a clan gets down
        // to a small number of young women, it will rapidly die out.
        // But in reality they would of course try to marry.

        const husbandWeights = this.map(clan => 
            Math.pow(10, clan.qol / 100));
        
        let women = 0;
        for (const clan of this) {
            women += clan.slices[1][0];
            clan.slices[1][0] = 0;
        }

        for (let i = 0; i < women; ++i) {
            const husbandIndex = weightedRandInt(husbandWeights);
            // If same clan selected: don't marry, stay in the clan.
            // Note that women from properous clans are less likely
            // to marry in this model. However, they still can
            // give birth, and we assume in part they may form a
            // matrilocal marriage.
            const husbandClan = this[husbandIndex];
            ++husbandClan.slices[1][0];
            if (husbandClan.slices[1][0] >= husbandClan.slices[1][1]) {
                husbandWeights[husbandIndex] = 0;
            }
        }
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

    prune() {
        this.splice(0, this.length, ...this.filter(clan => clan.size > 0));
    }
}

function exp_basicPopChange() {
    const clan = new Clan('Test', 'blue', 20);
    for (let i = 0; i < 20; ++i) {
        const eb = BASE_BIRTH_RATE * clan.slices[1][0];
        const ed = clan.slices.reduce((acc, slice, i) => 
            acc + slice[0] * BASE_DEATH_RATES[i] + slice[1] * 1.1 * BASE_DEATH_RATES[i], 0);

        const ebr = eb / clan.size;
        const edr = ed / clan.size;

        clan.advance();
    }
}

function exp_meanClanLifetime() {
    const lifetimes = [];
    for (let i = 0; i < 1000; ++i) {
        const clan = new Clan('Test', 'blue', 20);
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
        const clan = new Clan('Test', 'blue', 20);
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
