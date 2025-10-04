import { Annals } from "../annals";
import { clamp, remove } from "../lib/basics";
import { normal } from "../lib/distributions";
import { type TradeGood, type TradePartner, TradeRelationship } from "../trade";
import { PrestigeCalc } from "./prestige";
import { INITIAL_POPULATION_RATIOS, PopulationChange, PopulationChangeBuilder } from "./population";
import { Rites } from "../rites";
import type { Clans } from "./clans";
import type { Settlement } from "./settlement";
import type { SettlementCluster } from "./cluster";
import type { World } from "../world";
import { MigrationCalc, type NewSettlementSupplier} from "./migration";
import { ClanSkills, type SkillDef, SkillDefs } from "./skills";
import { ProductivityCalc } from "./productivity";
import { Traits } from "./traits";
import { HousingDecision } from "../decisions/housingdecision";
import { type FloodLevel, FloodLevels } from "../environment/flood";
import { LaborAllocation } from "../decisions/labor";
import { AlignmentCalc } from "./alignment";
import { TradeGoods } from "../trade";
import { HousingTypes } from "../econ/housing";
import { HappinessCalc } from "./happiness";
import { ResidenceLevels, type ResidenceLevel } from "./residence";

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

export interface GoodsReceiver {
    share: number;

    accept(source: string, good: TradeGood, amount: number): void;
}

export class ConsumptionCalc {
    // good -> source -> amount
    private ledger_: Map<TradeGood, Map<string, number>> = new Map();
    private population_: number = 0;

    constructor(readonly clan: Clan) {
    }

    reset() {
        this.population_ = this.clan.population;
        this.ledger_.clear();
    }

    clone(): ConsumptionCalc {
        const clone = new ConsumptionCalc(this.clan);
        clone.population_ = this.population_;
        for (const [good, sourceMap] of this.ledger_) {
            const newSourceMap = new Map<string, number>();
            for (const [source, amount] of sourceMap) {
                newSourceMap.set(source, amount);
            }
            clone.ledger_.set(good, newSourceMap);
        }
        return clone;
    }

    get population(): number {
        return this.population_;
    }

    get ledger(): IterableIterator<[TradeGood, Map<string, number>]> {
        return this.ledger_.entries();
    }

    sourceMap(good: TradeGood): Map<string, number> {
        return this.ledger_.get(good) ?? new Map<string, number>();
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

    perCapitaSubsistence(): number {
        return this.perCapita(TradeGoods.Cereals) + this.perCapita(TradeGoods.Fish);
    }

    remove(source: string, good: TradeGood, amount: number): boolean {
        if (amount <= 0) return false;
        if (this.amount(good) < amount) return false;
        const sourceMap = this.ledger_.get(good)!;
        sourceMap.set(source, (sourceMap.get(source) ?? 0) - amount);
        return true;
    }

    accept(source: string, good: TradeGood, amount: number) {
        if (amount <= 0) return;
        if (!this.ledger_.has(good)) this.ledger_.set(good, new Map<string, number>());
        const sourceMap = this.ledger_.get(good)!;
        const prevAmount = sourceMap.get(source) ?? 0;
        let newAmount = prevAmount + amount;

        // Seasonal availability varies and forage is hard to store, so
        // there will always be some shortfall if this is the only good.
        if (good === TradeGoods.Fish) {
            newAmount = Math.min(newAmount, this.population * 0.9)
        }

        sourceMap.set(source, newAmount);
    }
    
    splitOff(newClan: Clan): ConsumptionCalc {
        const originalPopulation = this.population_;
        this.population_ -= newClan.population;
        const newCalc = new ConsumptionCalc(this.clan);
        for (const [good, sourceMap] of this.ledger_) {
            const newSourceMap = new Map<string, number>();
            for (const [source, amount] of sourceMap) {
                const newAmount = amount * newClan.population / originalPopulation;
                newSourceMap.set(source, newAmount);
                this.ledger_.get(good)!.set(source, amount - newAmount);
            }
            newCalc.ledger_.set(good, newSourceMap);
        }
        return newCalc;
    }
}

export class Clan implements TradePartner {
    readonly uuid = crypto.randomUUID();

    static minDesiredSize = 10;
    static maxDesiredSize = 75;

    private settlement_: Settlement|undefined;
    private residenceLevel_: ResidenceLevel;
    // Number of turns it's generally agreed the clan has been in the settlement,
    // counting a cadet clan based on the parent clan's tenure.
    seniority: number = 2;
    
    lastPopulationChange: PopulationChange = PopulationChangeBuilder.empty(this);

    skills = new ClanSkills(this);

    // The initial population had been temporary residents.
    readonly traits = new Set<PersonalityTrait>([PersonalityTraits.MOBILE]);

    // Relationships
    parent: Clan|undefined;
    cadets: Clan[] = [];
    // Maps a clan to a relatedness factor based on the marriage history of
    // the two clans.
    readonly marriagePartners: Map<Clan, number> = new Map();

    migrationPlan_: MigrationCalc = new MigrationCalc(this, true);

    // This clan's views of itself and others.
    private prestigeViews_ = new Map<Clan, PrestigeCalc>();
    // Local prestige-generated share of influence.
    influence = 0;
    // This clan's assessment of others as helpful or harmful.
    private alignmentViews_ = new Map<Clan, AlignmentCalc>(); 

    readonly rites: Rites; // TODO - remove if not used
    ritualGoodsUsage: 'Private'|'Communal' = 'Private';

    housingDecision: HousingDecision|undefined;
    housing = HousingTypes.Huts;

    isDitching = false;
    biggestFloodSeen: FloodLevel = FloodLevels.Normal;

    productivityCalcs: Map<SkillDef, ProductivityCalc> = new Map<SkillDef, ProductivityCalc>();
    laborAllocation = new LaborAllocation(this);
    readonly tradeRelationships = new Set<TradeRelationship>();
    consumption = new ConsumptionCalc(this);

    private readonly happinessCalc_: HappinessCalc;

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

        // It's annoying but important to get the total exactly right, because
        // cadet clans will be initialized with the specific population split
        // off from the senior clan.
        let error = this.slicesTotal - this.population;
        const initError = error;
        while (error > 0) {
            let gix = Math.floor(Math.random() * 2);
            --this.slices[0][gix];
            --error;
        }
        while (error < 0) { 
            let gix = Math.floor(Math.random() * 2);
            ++this.slices[0][gix];
            ++error;
        }

        this.residenceLevel_ = ResidenceLevels.Work;

        // Low skill loading since rituals are simpler than village rituals and
        // clans are more happy just to be together. They still really care, though,
        // as the ancestors are watching, among other things.
        this.rites = new Rites(`${this.name} rites`, 35, 30, 0.15, [this], [], [], this.world);

        this.happinessCalc_ = new HappinessCalc(this);
    }

    get moniker(): string {
        return this.settlement!.name;
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

    get residenceLevel(): ResidenceLevel {
        return this.residenceLevel_;
    }   

    get residenceFraction(): number {
        const farmingRatio = this.laborAllocation.allocs.get(SkillDefs.Agriculture) ?? 0;
        return this.residenceLevel_.useFraction(farmingRatio);
    }

    get effectiveResidentPopulation(): number {
        return this.population * this.residenceFraction;
    }

    consume() {
        this.happinessCalc_.update();
    }

    get happiness(): HappinessCalc {
        return this.happinessCalc_;
    }

    get happinessValue(): number {
        return this.happiness.value;
    }

    get appeal(): number {
        return this.happiness.appeal;
    }

    get migrationPlan(): MigrationCalc|undefined {
        return this.migrationPlan_;
    }

    get isMigrating(): boolean {
        return this.migrationPlan !== undefined
            && this.migrationPlan_.willMigrate;
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

    alignmentViewOf(other: Clan): AlignmentCalc {
        return this.alignmentViews_.get(other) ?? new AlignmentCalc(this, other);
    }

    get alignmentViews(): Map<Clan, AlignmentCalc> {
        return this.alignmentViews_;
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

    startUpdatingAlignment() {
        for (const clan of this.settlement!.clans) {
            if (!this.alignmentViews_.has(clan)) {
                this.alignmentViews_.set(clan, new AlignmentCalc(this, clan));
            }
            this.alignmentViews_.get(clan)!.startUpdate();
        }

        for (const clan of this.alignmentViews_.keys()) {
            if (!this.settlement?.clans.includes(clan)) {
                this.alignmentViews_.delete(clan);
            }
        }
    }

    finishUpdatingAlignment() {
        for (const clan of this.settlement!.clans) {
            this.alignmentViews_.get(clan)!.commitUpdate();
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

    get tradeGoods(): TradeGood[] {
        return [...this.settlement.localTradeGoods];
    }

    addTradeRelationship(partner: TradePartner): TradeRelationship {
        const relationship = new TradeRelationship(this, partner);
        this.tradeRelationships.add(relationship);
        partner.tradeRelationships.add(relationship);
        return relationship;
    }

    exchange() {
        for (const relationship of this.tradeRelationships) {
            // For now we are always trading farm products for
            // clay figurines. We'll assume that the exports are
            // livestock and high-value produce such as dates,
            // so that labor cost of the goods sent is relatively
            // high, but we don't have to worry about transportation
            // costs too much. We also assume for now that even
            // in common production models, clans can trade their
            // consumption resources for this.

            const sustenanceAvailable = 
                  this.consumption.amount(TradeGoods.Cereals)
                + this.consumption.amount(TradeGoods.Fish);
            //const cost = sustenanceAvailable * 0.05;
            const cost = 0; // TODO - add back cost when we add a real benefit
            if (this.consumption.remove(`To ${relationship.partner.name}`, TradeGoods.Cereals, cost)) {
                this.consumption.accept(`From ${relationship.partner.name}`, TradeGoods.ClayFigurines, 1);
            }
        }
    }

    updateProductivity(forPlanning: boolean) {
        this.productivityCalcs = this.skills.createProductivityCalcs(forPlanning);
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

    planMaintenance() {
        // This is a current maintenance activity and for now everyone does it.
        this.isDitching = true;
    }

    planHousing() {
        this.housingDecision = new HousingDecision(this);
        if (this.housingDecision.choice !== this.housing) {
            this.world.addNote(
                'H',
                `Clan ${this.name} in ${this.settlement.name} changing housing from ${this.housing.name} to ${this.housingDecision.choice.name}.`,
            );
            this.housing = this.housingDecision.choice;
        }
    }

    get share() {
        return this.population / (this.settlement?.population ?? this.population);
    }

    accept(source: string, good: TradeGood, amount: number) {
        this.consumption.accept(source, good, amount);
    }

    readonly slices: number[][] = [
        [0, 0], // Children, girls first (0-18)
        [0, 0], // Adults (18-35)
        [0, 0], // Seniors (35-55)
        [0, 0], // Elders (55+)
    ];

    get slicesTotal(): number {
        return this.slices.reduce((acc, slice) => acc + slice[0] + slice[1], 0);
    }

    advancePopulation(noEffect: boolean = false) {
        this.lastPopulationChange = new PopulationChangeBuilder(this).build();
        if (!noEffect) {
            for (let i = 0; i < this.slices.length; ++i) {
                this.slices[i][0] = this.lastPopulationChange.newSlices[i][0];
                this.slices[i][1] = this.lastPopulationChange.newSlices[i][1];
            }
            this.population = this.slicesTotal;
        }
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
        for (let i = 0; i < this.slices.length; ++i) {
            newClan.slices[i][0] = Math.round(this.slices[i][0] * fraction);
            newClan.slices[i][1] = Math.round(this.slices[i][1] * fraction);
            this.slices[i][0] -= newClan.slices[i][0];
            this.slices[i][1] -= newClan.slices[i][1];
            this.population -= newClan.slices[i][0] + newClan.slices[i][1];
        }

        // New clan starts as a cadet.
        newClan.parent = this;
        this.cadets.push(newClan);

        // Plan for the new clan, since it didn't get a chance to during the main
        // planning phase. We don't need to update productivity because that happens
        // at the start of production during the advance phase.
        newClan.laborAllocation = this.laborAllocation.clone();
        newClan.laborAllocation.plan();
        newClan.planMaintenance();
        newClan.planHousing();
        newClan.planMigration();

        this.annals.log(`Clan ${newClan.name} (${newClan.population}) split off from clan ${this.name} (${this.population})`, this.settlement);
        return newClan;
    }
}
