import { ClanAgent } from "./agents";
import { Annals } from "./annals";
import { clamp, remove } from "./basics";
import type { Clans } from "./clans";
import { normal, poisson } from "./distributions";
import { Assessments } from "./agents";
import { Pot } from "./production";
import type { Settlement } from "./settlement";
import { TradeGoods, type TradeGood } from "./trade";
import { PrestigeCalc } from "./prestige";
import { traitWeightedAverage, WeightedValue, zScore } from "./modelbasics";
import { INITIAL_POPULATION_RATIOS, PopulationChange } from "./calcs/population";

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

    constructor(readonly population: number) {
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
    
    splitOff(newPopulation: number): ConsumptionCalc {
        const newCalc = new ConsumptionCalc(newPopulation);
        for (const [good, sourceMap] of this.ledger_) {
            const newSourceMap = new Map<string, number>();
            for (const [source, amount] of sourceMap) {
                const newAmount = amount * newPopulation / this.population;
                newSourceMap.set(source, newAmount);
                this.ledger_.get(good)!.set(source, amount - newAmount);
            }
            newCalc.ledger_.set(good, newSourceMap);
        }
        return newCalc;
    }
}

export class ProductivityCalc {
    readonly baseSkill: number;
    readonly intelligenceSkillModifier: number = 1.0;
    readonly effectiveSkill: number;

    readonly skillFactor: number;
    readonly strengthFactor: number;

    readonly value: number;

    constructor(readonly clan: Clan) {
        this.baseSkill = clan.skill;

        const baseIntelligenceModifier = (clan.intelligence - 50) / 2;
        const intelligenceModifierFactor = (100 - clan.skill) / 100;
        this.intelligenceSkillModifier = baseIntelligenceModifier * intelligenceModifierFactor;
        this.effectiveSkill = this.baseSkill + this.intelligenceSkillModifier;
        this.skillFactor = Math.pow(1.01, this.effectiveSkill - 50);

        this.strengthFactor = Math.pow(1.01, (clan.strength - 50) / 4);

        this.value = this.skillFactor * this.strengthFactor;
    }

    get tooltip(): string[][] {
        return [
            ['Base skill', this.baseSkill.toFixed(1)],
            ['Intelligence', this.clan.intelligence.toFixed(1)],
            ['Intelligence modifier', this.intelligenceSkillModifier.toFixed(1)],
            ['Effective skill', this.effectiveSkill.toFixed(1)],
            ['Skill factor', this.skillFactor.toFixed(2)],
            ['Strength factor', this.strengthFactor.toFixed(2)],
            ['Productivity', this.value.toFixed(2)],
        ];
    }
}

export interface SkillChange {
    delta: number;
    imitationTooltip: string[][];
}

export class NilSkillChange implements SkillChange {
    get delta(): number {
        return 0;
    }

    get imitationTooltip(): string[][] {
        return [];
    }
}

export class ClanSkillChange implements SkillChange {
    readonly imitationTarget: number;
    readonly imitationTargetTable: readonly WeightedValue<String>[];
    readonly imitationDelta: number;
    readonly imitationError: number;

    readonly learningDelta: number;

    readonly innovationDelta: number;

    readonly moveDelta: number|undefined;

    readonly items: [string, number][] = [];

    constructor(readonly clan: Clan) {
        [this.imitationTarget, this.imitationTargetTable] = traitWeightedAverage(
            [...clan.settlement!.clans],
            c => c.name,
            c => c === clan ? 50 : clan.prestigeViewOf(c).value,
            c => c.skill,
        );
        // Imitation moves skill toward the target. Turns are about a
        // generation, so we'll assume a substantial chunk of the gap
        // can be closed in that time.
        this.imitationDelta = (this.imitationTarget - this.clan.skill) / 2;
        // Imitation error will tend to make things work less well, but
        // occasionally it will result in an improvement.
        this.imitationError = normal(-1, 1);

        // Learning refers to incrementally improving skill from personal
        // observation and experience. Not everyone attempts to learn in
        // this way, and this can also result in loss of skill.
        //
        // We'll probably want to enrich this soon, but for now we'll start
        // really simple with a standard effect for everyone that balances
        // the imitation error.
        this.learningDelta = normal(1, 1);

        // Innovation refers to a more radical change in practices. These
        // too can be good or bad, but a very bad one would usually be
        // rejected immediately, so we'll have that low probability or nil
        // for now. This is the main mechanism for improving long-term skill.
        // TODO - Use a continuous distribution with a fat right tail, but
        //        round down small items to 0.
        this.innovationDelta = poisson(0.1);

        this.items.push(
            ['Imitation target', this.imitationTarget],
            ['Imitation delta', this.imitationDelta],
            ['Imitation error', this.imitationError],
            ['Learning delta', this.learningDelta],
            ['Innovation delta', this.innovationDelta],
        );

        // Things may be a little different after a move, which might
        // work out better or worse for us.
        if (this.clan.tenure == 0) {
            this.moveDelta = normal(-10, 5);
            this.items.push(['Migration delta', this.moveDelta]);
        }
    }

    get delta(): number {
        return this.imitationDelta + this.imitationError + this.learningDelta + this.innovationDelta;
    }

    get imitationTooltip(): string[][] {
        return WeightedValue.tooltip(this.imitationTargetTable,
            ['Model', 'W', 'Sk', 'W'],
        );
    }

    get changeSourcesTooltip(): string[][] {
        return this.items.map(([k, v]) => [k, v.toFixed(1)]);
    }
}

export class Clan {
    static minDesiredSize = 10;
    static maxDesiredSize = 100;

    public interactionModifier = 0;
    public festivalModifier = 0;

    settlement: Settlement|undefined;
    seniority: number = -1;
    tenure: number = 0;
    
    lastPopulationChange: PopulationChange = new PopulationChange(this, true);

    private skill_: number = normal(30, 10);
    skillChange = new NilSkillChange();

    // The initial population had been temporary residents.
    readonly traits = new Set<PersonalityTrait>([PersonalityTraits.MOBILE]);

    // Relationships
    parent: Clan|undefined;
    cadets: Clan[] = [];

    // Agent for the clan. This is used to determine how the clan interacts.
    agent = new ClanAgent(this);
    assessments = new Assessments(this);
    
    // This clan's views of others.
    private prestigeViews_ = new Map<Clan, PrestigeCalc>();
    // Local prestige-generated share of influence.
    influence = 0;

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

    consumption = new ConsumptionCalc(0);
    pot = new Pot(clanGoodsSource, [this]);

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

    get neighbors(): Clan[] {
        return [...this.settlement!.clans].filter(clan => clan !== this);
    }

    get selfAndNeighbors(): Clan[] {
        return this.settlement!.clans;
    }

    get skill() {
        return this.skill_;
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
            if (clan === this) continue;
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
            if (clan === this) continue;
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

    get benevolence() {
        let r = 0;
        let n = 0;
        for (const clan of this.settlement?.clans ?? []) {
            if (clan === this) continue;
            r += this.assessments.alignment(clan) * clan.size;
            n += clan.size;
        }
        return r / n;
    }

    get reputation() {
        let r = 0;
        let n = 0;
        for (const clan of this.settlement?.clans ?? []) {
            if (clan === this) continue;
            r += clan.assessments.alignment(this) * clan.size;
            n += clan.size;
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

    chooseEconomicPolicy(policies: Map<Clan, EconomicPolicy>, slippage: number) {
        // Consumption from keeping.
        const testKeepPot = new Pot('', []);
        testKeepPot.accept(this.size, this.size * this.productivity);
        const keepReturn = testKeepPot.output;

        // Consumption from sharing.
        // First see what the pot is without us.
        const testShareBasePot = new Pot('', []);
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

    get productivity() {
        return this.productivityCalc.value;
    }

    get productivityCalc() {
        return new ProductivityCalc(this);
    }

    get techModifier() {
        return this.settlement?.technai.outputBoost ?? 0;
    }

    get share() {
        return this.size / (this.settlement?.size ?? this.size);
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

    get qolFromConsumption() {
        return 40 + Math.log2(this.perCapitaSubsistenceConsumption) * 15;
    }

    get qolFromRelativePrestige() {
        const localAveragePrestige = this.selfAndNeighbors.reduce((acc, clan) => 
            acc + clan.averagePrestige, 0)
         / this.selfAndNeighbors.length;
        return (this.averagePrestige - localAveragePrestige) / 2;
    }

    get qolFromAbility() {
        const zi = (this.intelligence - 50) / 15;
        const zs = (this.strength - 50) / 15;
        return zi + zs;
    }

    get qolFromSkill() {
        const z = (this.skill - 50) / 15;
        return z * 5;
    }

    get qol() {
        return this.qolFromConsumption +
            this.qolFromRelativePrestige +
            this.qolFromAbility + 
            this.qolFromSkill +
            this.interactionModifier + 
            this.festivalModifier + 
            this.techModifier +
            (this.settlement?.populationPressureModifier || 0);
    }

    get qolTable(): [string, string][] {
        return [
            ['Consumption', this.qolFromConsumption.toFixed(1) ],
            ['Relative Prestige', this.qolFromRelativePrestige.toFixed(1) ],
            ['Skill', this.qolFromSkill.toFixed(1) ],
            ['Ability', this.qolFromAbility.toFixed(1) ],
            ['Interaction', this.interactionModifier.toFixed(1) ],
            ['Festival', this.festivalModifier.toFixed(1) ],
            ['Tech', this.techModifier.toFixed(1) ],
            ['Crowding', (this.settlement?.populationPressureModifier || 0).toFixed(1)],
            ['Total', this.qol.toFixed(1)],
        ];
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
        this.size = this.slicesTotal;
    }

    prepareTraitChanges() {
        this.skillChange = new ClanSkillChange(this);
    }

    commitTraitChanges() {
        this.skill_ += this.skillChange.delta;

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

        this.seniority = -1;
        this.tenure = 0;
        this.skill_ *= 0.9;
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
        newClan.skill_ = this.skill_;
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

        newClan.economicPolicy = this.economicPolicy;
        newClan.economicPolicyDecision = this.economicPolicyDecision;
        newClan.consumption = this.consumption.splitOff(newSize);

        this.annals.log(`Clan ${newClan.name} (${newClan.size}) split off from clan ${this.name} (${this.size})`, this.settlement);
        return newClan;
    }
}
