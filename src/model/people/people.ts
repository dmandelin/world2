import { Annals } from "../annals";
import { clamp, remove } from "../lib/basics";
import { normal } from "../lib/distributions";
import { Assessments } from "./agents";
import { Pot } from "../production";
import { TradeGoods, type TradeGood } from "../trade";
import { PrestigeCalc } from "./prestige";
import { INITIAL_POPULATION_RATIOS, PopulationChange } from "./population";
import { QoLCalc } from "./qol";
import { Rites } from "../rites";
import type { Clans } from "./clans";
import { HousingTypes, type Settlement } from "./settlement";
import type { SettlementCluster } from "./cluster";
import type { World } from "../world";
import { MigrationCalc, type NewSettlementSupplier} from "./migration";
import { ClanSkills, type SkillDef, SkillDefs } from "./skills";
import { ProductivityCalc } from "./productivity";
import { Traits } from "./traits";

const clanGoodsSource = 'clan';

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
    Share: new EconomicPolicy('Sharing', 'S'),  // Contribute to communal sharing pot.
    Cheat: new EconomicPolicy('Shirking', 'C'), // Contribute minimum acceptable to communal sharing pot.
    Hoard: new EconomicPolicy('Hoarding', 'H'), // Contribute nothing to communal sharing pot.
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

export type EconomicReport = {
    baseProduce: number;
    commonFraction: number;
    commonProduce: number;
    clanProduce: number;
}

export interface GoodsReceiver {
    share: number;

    accept(source: string, good: TradeGood, amount: number): void;
}

export class ConsumptionCalc {
    // good -> source -> amount
    private ledger_: Map<TradeGood, Map<string, number>> = new Map();

    constructor(public population: number) {
    }

    clone(): ConsumptionCalc {
        const clone = new ConsumptionCalc(this.population);
        for (const [good, sourceMap] of this.ledger_) {
            const newSourceMap = new Map<string, number>();
            for (const [source, amount] of sourceMap) {
                newSourceMap.set(source, amount);
            }
            clone.ledger_.set(good, newSourceMap);
        }
        return clone;
    }

    get ledger(): IterableIterator<[TradeGood, Map<string, number>]> {
        return this.ledger_.entries();
    }

    amount(good: TradeGood): number {
        const sourceMap = this.ledger_.get(good);
        if (!sourceMap) return 0;
        return [...sourceMap.values()].reduce((acc, amount) => acc + amount, 0);
    }

    perCapita(good: TradeGood): number {
        const amount = this.amount(good);
        if (this.population === 0) return amount;
        return amount / this.population;
    }

    accept(source: string, good: TradeGood, amount: number) {
        if (amount <= 0) return;
        if (!this.ledger_.has(good)) this.ledger_.set(good, new Map<string, number>());
        const sourceMap = this.ledger_.get(good)!;
        const prevAmount = sourceMap.get(source) ?? 0;
        sourceMap.set(source, prevAmount + amount);
    }
    
    splitOff(originalPopulation: number, cadetPopulation: number): ConsumptionCalc {
        this.population = originalPopulation - cadetPopulation;
        const newCalc = new ConsumptionCalc(cadetPopulation);
        for (const [good, sourceMap] of this.ledger_) {
            const newSourceMap = new Map<string, number>();
            for (const [source, amount] of sourceMap) {
                const newAmount = amount * cadetPopulation / originalPopulation;
                newSourceMap.set(source, newAmount);
                this.ledger_.get(good)!.set(source, amount - newAmount);
            }
            newCalc.ledger_.set(good, newSourceMap);
        }
        return newCalc;
    }
}

export class Clan {
    readonly uuid = crypto.randomUUID();

    static minDesiredSize = 10;
    static maxDesiredSize = 100;

    private settlement_: Settlement|undefined;
    // Number of turns it's generally agreed the clan has been in the settlement,
    // counting a cadet clan based on the parent clan's tenure.
    seniority: number = 0;
    
    lastPopulationChange: PopulationChange = new PopulationChange(this, true);

    skills = new ClanSkills(this);

    // The initial population had been temporary residents.
    readonly traits = new Set<PersonalityTrait>([PersonalityTraits.MOBILE]);

    // Relationships
    parent: Clan|undefined;
    cadets: Clan[] = [];

    assessments = new Assessments(this);
    
    // This clan's views of itself and others.
    private prestigeViews_ = new Map<Clan, PrestigeCalc>();
    // Local prestige-generated share of influence.
    influence = 0;

    housing = HousingTypes.Huts;
    isDitching = false;
    biggestFloodSeen = 2;

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
    economicReport: EconomicReport = {
        baseProduce: 0,
        commonFraction: 0,
        commonProduce: 0,
        clanProduce: 0,
    };
    tradePartners = new Set<Clan>();

    productivityCalcs: Map<SkillDef, ProductivityCalc> = new Map<SkillDef, ProductivityCalc>();

    consumption = new ConsumptionCalc(0);
    pot = new Pot(clanGoodsSource, [this]);
    readonly rites: Rites;

    migrationPlan_: MigrationCalc = new MigrationCalc(this, true);

    private qolCalc_: QoLCalc|undefined;

    constructor(
        readonly world: World,
        readonly annals: Annals,
        public name: string,
        public color: string,
        public population: number,
        public strength: number = randomStat(),
        public intelligence: number = randomStat(),
    ) {
        this.world.timeline.register(this.uuid, this.name);

        for (let i = 0; i < 4; ++i) {
            this.slices[i][0] = Math.round(INITIAL_POPULATION_RATIOS[i][0] * population);
            this.slices[i][1] = Math.round(INITIAL_POPULATION_RATIOS[i][1] * population);
        }

        this.rites = new Rites(`${this.name} rites`, [], [this], [], this.world);
    }

    get settlement(): Settlement {
        return this.settlement_!;
    }

    setSettlement(settlement: Settlement) {
        this.settlement_ = settlement;
    }

    get cluster(): SettlementCluster {
        return this.settlement!.cluster;
    }

    get neighbors(): Clan[] {
        return [...this.settlement!.clans].filter(clan => clan !== this);
    }

    get selfAndNeighbors(): Clan[] {
        return this.settlement!.clans;
    }

    get skill() {
        return this.skills.v(SkillDefs.Agriculture);
    }

    get ritualSkill() {
        return this.skills.v(SkillDefs.Ritual);
    }

    consume() {
        this.qolCalc_ = new QoLCalc(this);
    }

    get qolCalc() {
        return this.qolCalc_!;
    }

    get qol(): number {
        return this.qolCalc?.value || 0;
    }

    get migrationPlan(): MigrationCalc|undefined {
        return this.migrationPlan_;
    }

    planMigration() {
        this.migrationPlan_ = new MigrationCalc(this);
    }

    advanceMigration(newSettlementSupplier: NewSettlementSupplier) {
        this.migrationPlan?.advance(newSettlementSupplier);
    }

    get averagePrestige(): number {
        return this.settlement!.clans.averagePrestige(this);
    }

    prestigeViewOf(other: Clan): PrestigeCalc {
        return this.prestigeViews_.get(other) ?? new PrestigeCalc(this, other);
    }

    get prestigeViews(): Map<Clan, PrestigeCalc> {
        return this.prestigeViews_;
    }

    startUpdatingPrestige() {
        for (const clan of this.settlement!.clans) {
            if (!this.prestigeViews_.has(clan)) {
                this.prestigeViews_.set(clan, new PrestigeCalc(this, clan));
            }
            this.prestigeViews_.get(clan)!.startUpdate();
        }

        for (const clan of this.prestigeViews_.keys()) {
            if (!this.settlement?.clans.includes(clan)) {
                this.prestigeViews_.delete(clan);
            }
        }
    }

    finishUpdatingPrestige() {
        for (const clan of this.settlement!.clans) {
            this.prestigeViews_.get(clan)!.commitUpdate();
        }
    }

    kinshipTo(other: Clan): number {
        const rStep = 0.25;
        if (this === other) return 1;

        if (this.parent === other) return rStep;
        if (other.parent === this) return rStep;

        if (this.parent?.parent === other) return rStep * rStep;
        if (other.parent?.parent === this) return rStep * rStep;
        if (this.parent === other.parent && this.parent !== undefined) return rStep * rStep;

        return 0.01;
    }

    advanceSeniority() {
        // People can remember back only so far.
        if (this.seniority < 4) {
            ++this.seniority;
        }
    }

    get benevolence() {
        let r = 0;
        let n = 0;
        for (const clan of this.settlement?.clans ?? []) {
            if (clan === this) continue;
            r += this.assessments.alignment(clan) * clan.population;
            n += clan.population;
        }
        return r / n;
    }

    get reputation() {
        let r = 0;
        let n = 0;
        for (const clan of this.settlement?.clans ?? []) {
            if (clan === this) continue;
            r += clan.assessments.alignment(this) * clan.population;
            n += clan.population;
        }
        return r / n;
    }

    addKinBasedTradePartner(clan: Clan) {
        // In kin-based trade, one of the trade partners marries into
        // the other (if not already related), providing the bonds of
        // trust needed to facilitate trade. Thus clans have limited
        // capacity for trade partners.
        if (this.tradePartners.has(clan)) return;
        if (this.tradePartners.size >= 2 || clan.tradePartners.size >= 2) return;
        
        this.tradePartners.add(clan);
        clan.tradePartners.add(this);
    }

    exportsTo(clan: Clan): TradeGood[] {
        // We'll export everything that they don't already have.
        return [...this.settlement!.localTradeGoods]
            .filter(good => !clan.settlement?.localTradeGoods.has(good));
    }

    importsFrom(clan: Clan): TradeGood[] {
        return clan.exportsTo(this);
    }

    updateProductivity() {
        this.productivityCalcs = this.skills.createProductivityCalcs();
    }

    productivity(skillDef: SkillDef): number {
        return this.productivityCalcs.get(skillDef)?.tfp ?? 0;
    }

    get agriculturalProductivity(): number {
        return this.productivityCalcs.get(SkillDefs.Agriculture)?.tfp ?? 0;
    }

    get ritualEffectiveness(): number {
        return this.productivityCalcs.get(SkillDefs.Ritual)?.tfp ?? 0;
    }

    chooseEconomicPolicy(policies: Map<Clan, EconomicPolicy>, slippage: number) {
        // Consumption from keeping.
        const testKeepPot = new Pot('', []);
        testKeepPot.accept(this.population, this.population * this.agriculturalProductivity);
        const keepReturn = testKeepPot.output;

        // Consumption from sharing.
        // First see what the pot is without us.
        const testShareBasePot = new Pot('', []);
        for (const clan of policies.keys()) {
            if (clan == this) continue;
            const policy = policies.get(clan);
            const input = clan.population * clan.agriculturalProductivity;
            if (policy === EconomicPolicies.Share) {
                testShareBasePot.accept(clan.population, input);
            } else if (policy === EconomicPolicies.Cheat) {
                testShareBasePot.accept(clan.population, input * (1 - slippage));
            }
        }
        const shareOthersBaseReturn = testShareBasePot.output;
        // Now add us to the pot.
        const testSharePot = testShareBasePot.clone();
        testSharePot.accept(this.population, this.population * this.agriculturalProductivity);
        const shareSelfReturn = testSharePot.output * this.population / testSharePot.contributors;
        // Determine a net return to others for sharing.
        const shareOthersNetReturn = (testSharePot.output - shareSelfReturn) - shareOthersBaseReturn;
        // For now simply assume a small prosocial bias giving r = 0.1.
        const shareOthersReturn = 0.1 * shareOthersNetReturn;
        const shareReturn = shareSelfReturn + shareOthersReturn;

        // Consumption from cheating.
        const testCheatPot = testShareBasePot.clone();
        testCheatPot.accept(this.population, this.population * this.agriculturalProductivity * (1 - slippage));
        const cheatPotReturn = testCheatPot.output * this.population / testCheatPot.contributors;
        const cheatKeepReturn = this.population * this.agriculturalProductivity * slippage * 0.5;
        // Net to others for this reduced level of sharing.
        const cheatOthersNetReturn = (testCheatPot.output - cheatPotReturn) - shareOthersBaseReturn;
        const cheatOthersReturn = 0.1 * cheatOthersNetReturn;
        const cheatReturn = cheatKeepReturn + cheatPotReturn + cheatOthersReturn;

        // Determine the best policy, but require a little extra for selfish policies,
        // because we don't want a clan to switch to hoarding over a 0.1% difference.
        // Once they're there, though, they can stay there as long as there's any benefit.
        let returns: [EconomicPolicy, number][] = [
            [EconomicPolicies.Share, shareReturn],
            [EconomicPolicies.Cheat, cheatReturn],
            [EconomicPolicies.Hoard, keepReturn],
        ];
        returns.sort((a, b) => b[1] - a[1]);
        const [bestPolicy, bestReturn] = returns[0];
        const [curPolicy, curReturn] = returns.find(([p, r]) => p === this.economicPolicy) ?? [this.economicPolicy, 0];

        if (bestPolicy !== curPolicy) {
            let frictionFactor = curPolicy === EconomicPolicies.Share ? 0.1 : 0.02;
            if (bestReturn - curReturn >= frictionFactor * bestReturn) {
                this.economicPolicy = bestPolicy;
            }
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

    planMaintenance() {
        // This is a current maintenance activity and for now everyone does it.
        this.isDitching = true;
        
        // Update biggest flood seen after the decision, because nature
        // has already moved at this point.
        if (this.settlement.floodingLevel > this.biggestFloodSeen) {
            this.biggestFloodSeen = this.settlement.floodingLevel;
        }
    }

    planHousing() {
        // Go random for current testing.
        this.housing = Math.random() < 0.5 ? HousingTypes.Huts : HousingTypes.Houses;
    }

    get share() {
        return this.population / (this.settlement?.population ?? this.population);
    }

    accept(source: string, good: TradeGood, amount: number) {
        this.consumption.accept(source, good, amount);
    }

    get subsistenceConsumption() {
        return this.consumption.amount(TradeGoods.Subsistence);
    }
    
    get perCapitaSubsistenceConsumption() {
        return this.consumption.perCapita(TradeGoods.Subsistence);
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

    advancePopulation() {
        this.lastPopulationChange = new PopulationChange(this);
        for (let i = 0; i < this.slices.length; ++i) {
            this.slices[i][0] = this.lastPopulationChange.newSlices[i][0];
            this.slices[i][1] = this.lastPopulationChange.newSlices[i][1];
        }
        this.population = this.slicesTotal;
    }

    getTrait(trait: string): number {
        if (trait === Traits.Intelligence) {
            return this.intelligence;
        } else if (trait === Traits.Strength) {
            return this.strength;
        }
        return 0;
    }

    prepareTraitChanges() {
        this.skills.prepareAdvance();
    }

    commitTraitChanges() {
        this.skills.commitAdvance();

        this.strength = this.advancedTrait(this.strength);
        this.intelligence = this.advancedTrait(this.intelligence);

        // Mobility traits
        if (this.traits.has(PersonalityTraits.MOBILE)) {
            // If they've been here a while they might cease to be mobile.
            if (this.seniority >= 1 && Math.random() < 0.3) {
                this.traits.delete(PersonalityTraits.MOBILE);
            }
        } else if (this.traits.has(PersonalityTraits.SETTLED)) {
            // They might get a little sick of the place.
            if (Math.random() < 0.1) {
                this.traits.delete(PersonalityTraits.SETTLED);
            }
        } else {
            const r = Math.random();
            if (this.seniority >= 1 && Math.random() < 0.3) {
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
        this.settlement_ = settlement;

        this.seniority = 0;
    }

    absorb(other: Clan) {
        if (other.population >= this.population * 0.5) {
            this.name = `${this.name}-${other.name}`;
        }

        const origSize = this.population;
        this.population += other.population;

        for (let i = 0; i < this.slices.length; ++i) {
            this.slices[i][0] += other.slices[i][0];
            this.slices[i][1] += other.slices[i][1];
        }

        this.intelligence = Math.round(
            (this.intelligence * origSize + other.intelligence * other.population) / 
            (origSize + other.population));

        // Cadets of the absorbed clan become cadets of the absorbing clan.
        for (const cadet of other.cadets) {
            cadet.parent = this;
            this.cadets.push(cadet);
        }
        // Remove any previous parent of the old clan.
        if (other.parent) {
            remove(other.parent.cadets, other);
        }

        this.annals.log(`Clan ${other.name} (${other.population}) joined into clan ${this.name} (${this.population})`, this.settlement);
    }

    splitOff(clans: Clans): Clan {
        const originalPopulation = this.population;
        const fraction = 0.3 + 0.15 * (Math.random() + Math.random());
        const newSize = Math.round(this.population * fraction);

        const name = randomClanName(clans.map(clan => clan.name));
        const color = randomClanColor(clans.map(clan => clan.color));
        const newClan = new Clan(this.world, this.annals, name, color, newSize);
        newClan.strength = this.strength;
        newClan.intelligence = this.intelligence;
        newClan.skills = this.skills.cloneFor(newClan);
        newClan.settlement_ = this.settlement;
        newClan.traits.clear();
        for (const trait of this.traits) newClan.traits.add(trait);
        newClan.assessments = this.assessments.clone();
        this.population -= newSize;
        for (let i = 0; i < this.slices.length; ++i) {
            newClan.slices[i][0] = Math.round(this.slices[i][0] * fraction);
            newClan.slices[i][1] = Math.round(this.slices[i][1] * fraction);
            this.slices[i][0] -= newClan.slices[i][0];
            this.slices[i][1] -= newClan.slices[i][1];
        }

        // New clan starts as a cadet.
        newClan.parent = this;
        this.cadets.push(newClan);

        newClan.updateProductivity();

        newClan.economicPolicy = this.economicPolicy;
        newClan.economicPolicyDecision = this.economicPolicyDecision;
        newClan.consumption = this.consumption.splitOff(originalPopulation, newSize);

        this.consume();
        newClan.consume();

        this.annals.log(`Clan ${newClan.name} (${newClan.population}) split off from clan ${this.name} (${this.population})`, this.settlement);
        return newClan;
    }
}
