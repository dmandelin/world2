import { Annals } from "./annals";
import { absmin, clamp, remove } from "./basics";
import type { Clans } from "./clans";
import { normal, poisson } from "./distributions";
import { Assessments } from "./agents";
import { Pot } from "./production";
import type { Settlement } from "./settlement";
import { TradeGoods, type TradeGood } from "./trade";
import { PrestigeCalc } from "./prestige";
import { traitWeightedAverage, WeightedValue, zScore } from "./modelbasics";
import { INITIAL_POPULATION_RATIOS, PopulationChange } from "./calcs/population";
import { QoLCalc } from "./qol";
import { pct } from "./format";
import type { World } from "./world";

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

export class RitualEffectivenessCalc {
    readonly baseSkill: number;
    readonly intelligenceSkillModifier: number = 1.0;
    readonly effectiveSkill: number;

    readonly skillFactor: number;

    readonly value: number;

    constructor(readonly clan: Clan) {
        this.baseSkill = clan.ritualSkill;

        const baseIntelligenceModifier = (clan.intelligence - 50) * 2;
        const intelligenceModifierFactor = (100 - clan.ritualSkill) / 100;
        this.intelligenceSkillModifier = baseIntelligenceModifier * intelligenceModifierFactor;
        this.effectiveSkill = this.baseSkill + this.intelligenceSkillModifier;
        this.skillFactor = Math.pow(1.01, this.effectiveSkill - 50);

        this.value = this.skillFactor;
    }

    get tooltip(): string[][] {
        return [
            ['Base skill', this.baseSkill.toFixed(1)],
            ['Intelligence', this.clan.intelligence.toFixed(1)],
            ['Intelligence modifier', this.intelligenceSkillModifier.toFixed(1)],
            ['Effective skill', this.effectiveSkill.toFixed(1)],
            ['Effectiveness', this.value.toFixed(2)],
        ];
    }
}

export interface SkillChange {
    originalValue: number;
    educationTarget: number;
    imitationTarget: number;

    delta: number;
    imitationTooltip: string[][];
}

export class NilSkillChange implements SkillChange {
    readonly delta = 0;
    readonly educationTarget = 0;
    readonly educationTargetDelta = 0;
    readonly imitationTarget = 0;
    readonly imitationTargetDelta = 0;
    readonly imitationTooltip: string[][] = [];

    constructor(readonly originalValue: number) {
    }
}

export class ClanSkillChange implements SkillChange {
    readonly originalValue: number;
    readonly educationTarget: number;
    readonly imitationTarget: number;
    readonly imitationTargetTable: readonly WeightedValue<String>[];

    readonly items: {label: string, weight: number, value: number, ev: number}[] = [];

    constructor(
        readonly clan: Clan, 
        readonly trait: (clan: Clan) => number,
        experienceRatio: number) {

        const rr = 0.5; // Population replacement rate
        const cms = 50; // Child max skill
        const alr = 1.0; // Adult learning rate

        const t = trait(clan);
        this.originalValue = t;
        this.educationTarget =  Math.min(cms, t);
        [this.imitationTarget, this.imitationTargetTable] = traitWeightedAverage(
            [...clan.settlement!.clans],
            c => c.name,
            c => clan.prestigeViewOf(c).value,
            c => trait(c),
        );

        // Imitation with error (education) by children.
        const educationDelta = absmin(cms, this.educationTarget) - t;
        this.items.push({
            label: 'Education', 
            weight: 1 - rr, 
            value: educationDelta - normal(2, 4) * clamp(t / 100, 0, 1),
            ev: educationDelta - 2 * clamp(t / 100, 0, 1),
        });

        // Imitation with error by adult clan members.
        const imitationDelta = this.imitationTarget - t;
        this.items.push({
            label: 'Imitation', 
            weight: (1 - rr) * alr,
            value: imitationDelta - normal(2, 4) * clamp(t / 100, 0, 1), 
            ev: imitationDelta - 2 * clamp(t / 100, 0, 1),
        });

        // Learning from experience and observation.
        this.items.push({
            label: `Experience (${pct(experienceRatio)})`, 
            weight: 1, 
            value: experienceRatio * normal(2, 4) * clamp((100 - t) / 100, 0, 1), 
            ev: experienceRatio * 2 * clamp((100 - t) / 100, 0, 1),
        })

        // Things may be a little different after a move, which might
        // work out better or worse for us.
        if (this.clan.tenure == 0) {
            this.items.push({
                label: 'Migration',
                weight: 1, 
                value: -10 + normal(2, 4), 
                ev: -10,
            })
        }
    }

    get delta(): number {
        return this.items.reduce((acc, o) => acc + o.weight * o.value, 0);
    }

    get educationTargetDelta(): number {
        return this.educationTarget - this.originalValue;
    }

    get imitationTargetDelta(): number {
        return this.imitationTarget - this.originalValue;
    }

    get imitationTooltip(): string[][] {
        return WeightedValue.tooltip(this.imitationTargetTable,
            ['Model', 'V', 'P', 'W', 'WV'],
        );
    }

    get changeSourcesTooltip(): string[][] {
        const header = ['Source', 'W', 'EV', 'WEV', 'V', 'WV'];
        const data = this.items.map(o => [
            o.label, 
            o.weight.toFixed(2),
            o.ev.toFixed(1),
            (o.weight * o.ev).toFixed(1),
            o.value.toFixed(1),
            (o.weight * o.value).toFixed(1),
        ]);
        const footer = [ 
            'Total',
            '',
            '',
            this.items.reduce((acc, o) => acc + o.ev * o.weight, 0).toFixed(1),
            '',
            this.items.reduce((acc, o) => acc + o.weight * o.value, 0).toFixed(1),
        ]
        return [header, ...data, footer];
    }
}

export class Clan {
    static minDesiredSize = 10;
    static maxDesiredSize = 100;

    settlement: Settlement|undefined;
    seniority: number = -1;
    tenure: number = 0;
    
    lastPopulationChange: PopulationChange = new PopulationChange(this, true);

    private skill_: number = normal(30, 10);
    skillChange: SkillChange = new NilSkillChange(this.skill_);

    private ritualSkill_: number = normal(30, 10);
    ritualSkillChange: SkillChange = new NilSkillChange(this.ritualSkill_);

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
        readonly world: World,
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

    get ritualSkill() {
        return this.ritualSkill_;
    }

    get qolCalc() {
        return new QoLCalc(this);
    }

    get qol(): number {
        return this.qolCalc.value;
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

    get ritualEffectiveness() {
        return this.ritualEffectivenessCalc.value;
    }

    get ritualEffectivenessCalc() {
        return new RitualEffectivenessCalc(this);
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
        this.skillChange = new ClanSkillChange(this, 
            clan => clan.skill, 1.0);

        const ritualWeight = this.settlement!.clans.rites.weights.get(this) ?? 0;
        const experienceRatio = Math.min(2.0, this.settlement!.clans.length * ritualWeight);
        this.ritualSkillChange = new ClanSkillChange(this, 
            clan => clan.ritualSkill, experienceRatio);
    }

    commitTraitChanges() {
        this.skill_ += this.skillChange.delta;
        this.ritualSkill_ += this.ritualSkillChange.delta;

        this.strength = this.advancedTrait(this.strength);
        this.intelligence = this.advancedTrait(this.intelligence);

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
        const newClan = new Clan(this.world, this.annals, name, color, newSize);
        newClan.strength = this.strength;
        newClan.intelligence = this.intelligence;
        newClan.skill_ = this.skill_;
        newClan.ritualSkill_ = this.ritualSkill_;
        newClan.settlement = this.settlement;
        newClan.traits.clear();
        for (const trait of this.traits) newClan.traits.add(trait);
        newClan.assessments = this.assessments.clone();
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
