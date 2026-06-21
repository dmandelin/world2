import { Annals } from "../annals";
import { average, clamp, randInt, remove, sumFun } from "../lib/basics";
import { ClanSkills } from "./clanskills";
import { Consumption } from "../econ/consumption";
import { EffortAllocation } from "../decisions/effort";
import { HappinessCalc } from "./happiness";
import { HelpAllocation } from "../decisions/helpalloc";
import { HousingDecision } from "../decisions/housingdecision";
import { HousingTypes } from "../econ/housing";
import { INITIAL_POPULATION_RATIOS, PopulationChange, PopulationChangeBuilder } from "./population";
import { MigrationCalc, type NewSettlementSupplier} from "./migration";
import { normal } from "../lib/distributions";
import { Operation, ProductionReport } from "../econ/operation";
import { Processes, SkillDefs } from "../econ/econdefs";
import { QualityOfLife } from "../econ/qol";
import { Relationships } from "../relations/relationships";
import { ResidenceLevel } from "./residence";
import { Rites } from "../rites";
import { TradeGoods } from "../trade";
import { Traits } from "./traits";
import { type FloodLevel, FloodLevels } from "../environment/flood";
import { type TradeGood, type TradePartner, TradeRelationship } from "../trade";
import { weightedAverage } from "../lib/modelbasics";
import type { Settlement } from "./settlement";
import type { SettlementCluster } from "./cluster";
import type { World } from "../world";

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

export class Clan implements TradePartner {
    readonly uuid = crypto.randomUUID();

    static minDesiredSize = 10;
    static maxDesiredSize = 60;

    private settlement_: Settlement;

    private residenceLevel_ = new ResidenceLevel(this);
    // Number of turns it's generally agreed the clan has been in the settlement,
    // counting a cadet clan based on the parent clan's tenure.
    seniority: number = 2;
    
    lastPopulationChange: PopulationChange = PopulationChangeBuilder.empty(this);

    skills = new ClanSkills(this);

    // The initial population had been temporary residents.
    readonly traits = new Set<PersonalityTrait>([PersonalityTraits.MOBILE]);

    // Relationships
    readonly relationships = new Relationships(this);

    parent: Clan|undefined;
    cadets: Clan[] = [];

    migrationPlan_: MigrationCalc = new MigrationCalc(this, true);
    previousSettlement_: Settlement;

    readonly rites: Rites; // TODO - remove if not used
    ritualGoodsUsage: 'Private'|'Communal' = 'Private';

    housingDecision: HousingDecision|undefined;
    housing = HousingTypes.Huts;

    isDitching = false;
    biggestFloodSeen: FloodLevel = FloodLevels.Normal;

    effortAllocation: EffortAllocation;
    helpAllocation: HelpAllocation = new HelpAllocation();
    operations: Operation[] = [];

    targetPerCapitaFood: number;
    readonly tradeRelationships = new Set<TradeRelationship>();
    
    production: ProductionReport = new ProductionReport([]);
    consumption: Consumption;
    qol: QualityOfLife = new QualityOfLife(new Map());

    private readonly happinessCalc_: HappinessCalc;

    // Adds the clan to the settlement.
    constructor(
        readonly world: World,
        settlement: Settlement,
        readonly annals: Annals,
        public name: string,
        public color: string,
        public population: number,
        public strength: number = randomStat(),
        public intelligence: number = randomStat(),
    ) {
        this.world.timeline.register(this.uuid, this.name);

        this.settlement_ = settlement;
        this.settlement_.clans.push(this);
        this.previousSettlement_ = settlement;

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

        this.operations = [
            new Operation(this, Processes.Fishing),
            new Operation(this, Processes.Agriculture),
        ]

        this.targetPerCapitaFood = 0.9 + (randInt(3) + randInt(3)) * 0.1;

        // Must go after initializing production nodes since it builds effort for them.
        this.effortAllocation = new EffortAllocation(this);
        this.consumption = new Consumption(0, this.effortAllocation, new Map());
        // Low skill loading since rituals are simpler than village rituals and
        // clans are more happy just to be together. They still really care, though,
        // as the ancestors are watching, among other things.
        this.rites = new Rites(`${this.name} rites`, 35, 30, 0.15, [this], [], [], this.world);

        this.happinessCalc_ = new HappinessCalc(this);
    }

    get moniker(): string {
        return this.settlement.name;
    }

    get previousSettlement(): Settlement {
        return this.previousSettlement_;
    }

    get settlement(): Settlement {
        return this.settlement_;
    }

    get cluster(): SettlementCluster {
        return this.settlement.cluster;
    }

    get neighbors(): Clan[] {
        return [...this.settlement.clans].filter(clan => clan !== this);
    }

    get selfAndNeighbors(): Clan[] {
        return this.settlement.clans;
    }

    get children(): number {
        return this.slices[0][0] + this.slices[0][1];
    }

    get adults(): number {
        return this.population - this.children;
    }

    get effort(): number {
        return this.adults;
    }

    get workers(): number {
        // TODO - Figure out what this should really be
        return this.effort;
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
        return this.residenceLevel_.fractionInSettlement;
    }

    get effectiveResidentPopulation(): number {
        return this.population * this.residenceFraction;
    }

    updateHappiness() {
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

    considerMigration() {
        this.migrationPlan_ = new MigrationCalc(this);
    }

    advanceMigration(newSettlementSupplier: NewSettlementSupplier): boolean {
        this.previousSettlement_ = this.settlement_;
        if (this.migrationPlan === undefined) return false;
        return this.migrationPlan.advance(newSettlementSupplier);
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

    respectFor(other: Clan): number {
        const rv = this.relationships.get(other);
        if (!rv) return 0;
        return rv.respect.value;
    }

    // Respect within settlement.
    get localRespect(): number { return this.relationships.localRespect; }

    get helpReceived(): number {
        return sumFun(
            this.relationships,
            ([other, _]) => other.helpAllocation.get(this) * other.effort);
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
                  this.consumption.perCapita(TradeGoods.Cereals)
                + this.consumption.perCapita(TradeGoods.Fish);
            //const cost = sustenanceAvailable * 0.05;
            const cost = 0; // TODO - add back cost when we add a real benefit
            // TODO - rework in functional way when ready
            //if (this.consumption.remove(`To ${relationship.partner.name}`, TradeGoods.Cereals, cost)) {
            //    this.consumption.accept(`From ${relationship.partner.name}`, TradeGoods.ClayFigurines, 1);
            //}
        }
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
            const originalLength = this.settlement.clans.length;
            remove(this.settlement.clans, this);
            if (this.settlement.clans.length !== originalLength - 1) {
                debugger;
            }
        }

        this.settlement_ = settlement;
        settlement.clans.push(this);

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

    splitIfNeeded() {
        if (this.population > Clan.maxDesiredSize) {
            this.split();
        }
    }

    split(): Clan {
        const fraction = 0.3 + 0.15 * (Math.random() + Math.random());
        const newSize = Math.round(this.population * fraction);

        const name = randomClanName(this.world.allClans.map(clan => clan.name));
        const color = randomClanColor(this.world.allClans.map(clan => clan.color));
        const newClan = new Clan(this.world, this.settlement, this.annals, name, color, newSize);
        newClan.strength = this.strength;
        newClan.intelligence = this.intelligence;
        newClan.skills = this.skills.cloneFor(newClan);
        newClan.traits.clear();
        for (const trait of this.traits) newClan.traits.add(trait);
        for (let i = 0; i < this.slices.length; ++i) {
            newClan.slices[i][0] = Math.round(this.slices[i][0] * fraction);
            newClan.slices[i][1] = Math.round(this.slices[i][1] * fraction);
            this.slices[i][0] -= newClan.slices[i][0];
            this.slices[i][1] -= newClan.slices[i][1];
            this.population -= newClan.slices[i][0] + newClan.slices[i][1];
        }

        // New clan 
        // starts as a cadet.
        newClan.parent = this;
        this.cadets.push(newClan);

        // Inherit relationships from the parent clan.
        // TODO - We should probably allow some relationships to go with
        // only one side.
        newClan.relationships.initializeFrom(this.relationships);

        // Plan for the new clan, since it didn't get a chance to during the main
        // planning phase. We don't need to update productivity because that happens
        // at the start of production during the advance phase.
        newClan.planMaintenance();
        newClan.planHousing();
        newClan.considerMigration();

        this.annals.log(`Clan ${newClan.name} (${newClan.population}) split off from clan ${this.name} (${this.population})`, this.settlement);

        // We can't update relationships properly until the clan is added to the
        // settlement, so that's done elsewhere.
        return newClan;
    }
}
