import { ClanAgent } from "./agents";
import { Annals } from "./annals";
import { clamp, remove } from "./basics";
import type { Clans } from "./clans";
import { normal } from "./distributions";
import { Assessments } from "./interactions";
import { Pot } from "./production";
import type { Settlement } from "./settlement";

// Per 20-year turn, for childbearing-age women.
const BASE_BIRTH_RATE = 3.05;

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
    // Standard deviation for individuals is 15, so it should be
    // somewhat less for an entire clan.
    return clamp(Math.round(normal(50, 12)), 0, 100);
}

const INITIAL_POPULATION_RATIOS = [
    [0.2157, 0.2337],
    [0.1541, 0.1598],
    [0.0908, 0.0879],
    [0.0324, 0.0256],
];

export class PersonalityTrait {
    constructor(readonly name: string) {}
}

export const PersonalityTraits = {
    GRINCH: new PersonalityTrait('Grinch'),
    SETTLED: new PersonalityTrait('Settled'),
    MOBILE: new PersonalityTrait('Mobile'),
};

export class EconomicPolicy {
    constructor(readonly name: string, readonly c: string) {}
}

export const EconomicPolicies = {
    Share: new EconomicPolicy('share', 'S'), // Contribute to communal sharing pot.
    Cheat: new EconomicPolicy('cheat', 'C'), // Contribute minimum acceptable to communal sharing pot.
    Hoard: new EconomicPolicy('hoard', 'H'), // Contribute nothing to communal sharing pot.
};

export type EconomicPolicyDecision = {
    keepReturn: number;
    shareSelfReturn: number;
    shareOthersReturn: number;
    shareReturn: number;
    cheatPotReturn: number;
    cheatKeepReturn: number;
    cheatOthersReturn: number;
    cheatReturn: number;
};

export class Clan {
    static minDesiredSize = 10;
    static maxDesiredSize = 100;

    public interactionModifier = 0;
    public festivalModifier = 0;

    settlement: Settlement|undefined;
    tenure: number = 0;
    
    lastSizeChange_: number = 0;

    // The initial population had been temporary residents.
    readonly traits = new Set<PersonalityTrait>([PersonalityTraits.MOBILE]);

    // Relationships
    parent: Clan|undefined;
    cadets: Clan[] = [];

    // 0 = most senior, +1 per cadet link
    seniority: number = 0;

    // Agent for the clan. This is used to determine how the clan interacts.
    agent = new ClanAgent(this);
    assessments = new Assessments(this);

    // Individual clan economy.
    economicPolicy = EconomicPolicies.Share;
    economicPolicyDecision: EconomicPolicyDecision = {
        keepReturn: 0,
        shareSelfReturn: 0,
        shareOthersReturn: 0,
        shareReturn: 0,
        cheatPotReturn: 0,
        cheatKeepReturn: 0,
        cheatOthersReturn: 0,
        cheatReturn: 0,
    }
    pot = new Pot([this]);
    consumption = 0;
    perCapitaConsumption = 0;

    constructor(
        readonly annals: Annals,
        public name: string,
        public color: string,
        public size: number,
        public strength: number = randomStat(),
        public intelligence: number = randomStat(),
    ) {
        for (let i = 0; i < 4; ++i) {
            this.slices[i][0] = Math.round(INITIAL_POPULATION_RATIOS[i][0] * size);
            this.slices[i][1] = Math.round(INITIAL_POPULATION_RATIOS[i][1] * size);
        }
    }

    chooseEconomicPolicy(policies: Map<Clan, EconomicPolicy>, slippage: number) {
        // Consumption from keeping.
        const testKeepPot = new Pot([]);
        testKeepPot.accept(this.size, this.size * this.productivity);
        const keepReturn = testKeepPot.output;

        // Consumption from sharing.
        // First see what the pot is without us.
        const testShareBasePot = new Pot([]);
        for (const clan of policies.keys()) {
            if (clan == this) continue;
            const policy = policies.get(clan);
            const input = clan.size * clan.productivity;
            if (policy === EconomicPolicies.Share) {
                testShareBasePot.accept(clan.size, input);
            } else if (policy === EconomicPolicies.Cheat) {
                testShareBasePot.accept(clan.size, input * (1 - slippage));
            }
        }
        const shareOthersBaseReturn = testShareBasePot.output;
        // Now add us to the pot.
        const testSharePot = testShareBasePot.clone();
        testSharePot.accept(this.size, this.size * this.productivity);
        const shareSelfReturn = testSharePot.output * this.size / testSharePot.contributors;
        // Determine a net return to others for sharing.
        const shareOthersNetReturn = (testSharePot.output - shareSelfReturn) - shareOthersBaseReturn;
        // For now simply assume a small prosocial bias giving r = 0.1.
        const shareOthersReturn = 0.1 * shareOthersNetReturn;
        const shareReturn = shareSelfReturn + shareOthersReturn;

        // Consumption from cheating.
        const testCheatPot = testShareBasePot.clone();
        testCheatPot.accept(this.size, this.size * this.productivity * (1 - slippage));
        const cheatPotReturn = testCheatPot.output * this.size / testCheatPot.contributors;
        const cheatKeepReturn = this.size * this.productivity * slippage * 0.5;
        // Net to others for this reduced level of sharing.
        const cheatOthersNetReturn = (testCheatPot.output - cheatPotReturn) - shareOthersBaseReturn;
        const cheatOthersReturn = 0.1 * cheatOthersNetReturn;
        const cheatReturn = cheatKeepReturn + cheatPotReturn + cheatOthersReturn;

        // Choose the best policy.
        if (shareReturn > keepReturn && shareReturn >= cheatReturn) {
            this.economicPolicy = EconomicPolicies.Share;
        } else if (cheatReturn > keepReturn && cheatReturn > shareReturn) {
            this.economicPolicy = EconomicPolicies.Cheat;
        } else {
            this.economicPolicy = EconomicPolicies.Hoard;
        }

        this.economicPolicyDecision = {
            keepReturn: keepReturn,
            shareSelfReturn: shareSelfReturn,
            shareOthersReturn: shareOthersReturn,
            shareReturn: shareReturn,
            cheatPotReturn: cheatPotReturn,
            cheatKeepReturn: cheatKeepReturn,
            cheatOthersReturn: cheatOthersReturn,
            cheatReturn: cheatReturn,
        };
    }

    get productionAbility() {
        return Math.round(2/(1/this.strength + 1/this.intelligence));
    }

    get productivity() {
        const z = (this.productionAbility - 50) / 15;
        return Math.pow(1.2, z);
    }

    get techModifier() {
        return this.settlement?.technai.outputBoost ?? 0;
    }

    get tenureModifier() {
        return [-5, 0, 1, 2, 2, 3, 3, 3, 4, 4, 4, 4, 5][clamp(this.tenure, 0, 12)];
    }

    get qolFromConsumption() {
        return 40 + Math.log2(this.perCapitaConsumption) * 15;
    }

    get qolFromAbility() {
        const zi = (this.intelligence - 50) / 15;
        const zs = (this.strength - 50) / 15;
        return zi * 3 + zs * 3;
    }

    get qol() {
        return this.qolFromConsumption +
            this.qolFromAbility + 
            this.interactionModifier + 
            this.festivalModifier + 
            this.techModifier +
            this.tenureModifier +
            (this.settlement?.populationPressureModifier || 0);
    }

    get prestige() {
        return Math.round(Math.log2(this.size) * this.qol / 6) - this.seniority;
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
        ++this.tenure;
    }

    advancePopulation() {
        const origSize = this.size;
        const prevSlices = this.slices.map(slice => slice.slice());

        let quality = this.qol;
        if (quality < 0) quality = 0;
        if (quality > 100) quality = 100;
        const qbrm = 1 + (quality - 30) / 1000;
        const qdrm = 1 + (30 - quality) / 1000;

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
        this.lastSizeChange_ = this.size - origSize;
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

    get lastSizeChange() {
        return this.lastSizeChange_;
    }

    advanceTraits() {
        this.strength = this.advancedTrait(this.strength);
        this.intelligence = this.advancedTrait(this.intelligence);

        // Grinch trait
        if (this.festivalModifier < 0 && !this.traits.has(PersonalityTraits.GRINCH)) {
            // Clans might become grinches if they have a bad festival.
            if (Math.random() < -0.05 * this.festivalModifier) 
                this.traits.add(PersonalityTraits.GRINCH);
        } else if (this.traits.has(PersonalityTraits.GRINCH)) {
            // Clans might join in again if others had good festivals
            if (this.settlement?.clans.every(clan => clan.festivalModifier > 0)) {
                if (Math.random() < 0.5) 
                    this.traits.delete(PersonalityTraits.GRINCH);
            }
        }

        // Mobility traits
        if (this.traits.has(PersonalityTraits.MOBILE)) {
            // If they've been here a while they might cease to be mobile.
            if (this.tenure >= 1 && Math.random() < 0.3) {
                this.traits.delete(PersonalityTraits.MOBILE);
            }
        } else if (this.traits.has(PersonalityTraits.SETTLED)) {
            // They might get a little sick of the place.
            if (Math.random() < 0.1) {
                this.traits.delete(PersonalityTraits.SETTLED);
            }
        } else {
            const r = Math.random();
            if (this.tenure >= 1 && Math.random() < 0.3) {
                this.traits.add(PersonalityTraits.SETTLED);
            } else if (r >= 0.9) {
                this.traits.add(PersonalityTraits.MOBILE);
            }   
        }
    }

    advancedTrait(value: number) {
        const incr = Math.round(normal(2));
        if (incr > 0 && value > 50 || incr < 0 && value < 50) {
            if (Math.random() < Math.abs(value - 50) / 50) return value;
        }
        return clamp(value + incr, 0, 100);
    }

    moveTo(settlement: Settlement) {
        if (this.settlement) {
            this.settlement.clans.remove(this);
        }
        settlement.clans.push(this);
        this.settlement = settlement;
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

        this.intelligence = Math.round(
            (this.intelligence * origSize + other.intelligence * other.size) / 
            (origSize + other.size));

        // Cadets of the absorbed clan become cadets of the absorbing clan.
        for (const cadet of other.cadets) {
            cadet.parent = this;
            this.cadets.push(cadet);
        }
        // Remove any previous parent of the old clan.
        if (other.parent) {
            remove(other.parent.cadets, other);
        }

        this.annals.log(`Clan ${other.name} (${other.size}) joined into clan ${this.name} (${this.size})`, this.settlement);
    }

    splitOff(clans: Clans): Clan {
        const fraction = 0.3 + 0.15 * (Math.random() + Math.random());
        const newSize = Math.round(this.size * fraction);

        const name = randomClanName(clans.map(clan => clan.name));
        const color = randomClanColor(clans.map(clan => clan.color));
        const newClan = new Clan(this.annals, name, color, newSize);
        newClan.strength = this.strength;
        newClan.intelligence = this.intelligence;
        newClan.settlement = this.settlement;
        newClan.traits.clear();
        for (const trait of this.traits) newClan.traits.add(trait);
        newClan.assessments = this.assessments.clone();
        newClan.agent = this.agent.clone();
        this.size -= newSize;
        for (let i = 0; i < this.slices.length; ++i) {
            newClan.slices[i][0] = Math.round(this.slices[i][0] * fraction);
            newClan.slices[i][1] = Math.round(this.slices[i][1] * fraction);
            this.slices[i][0] -= newClan.slices[i][0];
            this.slices[i][1] -= newClan.slices[i][1];
        }

        // New clan starts as a cadet.
        newClan.parent = this;
        this.cadets.push(newClan);

        newClan.perCapitaConsumption = this.perCapitaConsumption;
        newClan.consumption = Math.round(this.consumption * fraction);
        this.consumption -= newClan.consumption;

        newClan.economicPolicy = this.economicPolicy;
        newClan.economicPolicyDecision = this.economicPolicyDecision;

        this.annals.log(`Clan ${newClan.name} (${newClan.size}) split off from clan ${this.name} (${this.size})`, this.settlement);
        return newClan;
    }
}

function exp_basicPopChange() {
    const clan = new Clan(new Annals(), 'Test', 'blue', 20);
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
        const clan = new Clan(new Annals(), 'Test', 'blue', 20);
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
        const clan = new Clan(new Annals(), 'Test', 'blue', 20);
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
