import { Annals } from "../annals";
import { log } from "../lib/debug";
import { clamp, randInt, remove, sumFun } from "../lib/basics";
import { ClanSkills } from "./clanskills";
import { membershipChanged } from "./membership";
import { Activities, EffortAllocation } from "../decisions/effort";
import { HappinessCalc } from "./happiness";
import { HelpAllocation } from "../decisions/helpalloc";
import { HousingDecision } from "../decisions/housingdecision";
import { HousingTypes } from "../econ/housing";
import { INITIAL_POPULATION_RATIOS, PopulationChange, PopulationChangeBuilder } from "./population";
import { MigrationCalc } from "./migration";
import { normal } from "../lib/distributions";
import { Operation, ProductionReport } from "../econ/operation";
import { Processes, SkillDefs } from "../econ/econdefs";
import { QualityOfLife } from "../econ/qol";
import { ResidenceLevel } from "./residence";
import { Rites } from "../rites";
import type { RitualEvent } from "../rituals";
import { type TradeGood, TradeGoods, type TradePartner, TradeRelationship } from "../trade";
import { ClanFloodDamage } from "../environment/flood";
import { FestivalOperation, RitualAspects } from "../festivals";
import type { Settlement } from "./settlement";
import type { SettlementCluster } from "./cluster";
import type { World } from "../world";
import type { Year } from "../records/year";
import { connectedClans, KinConnection } from "../relations/connection";
import { divideInformationOnSplit } from "../relations/information";
import { Stress } from "./stress";
import { Distribution, StockOutflow, Consumption } from "../econ/flows";
import { Stock } from "../econ/stock";
import { BasicInteraction } from "../relations/basicinteraction";

const CLAN_NAMES: string[] = [
    "Abzu", "Adab", "Akkad", "Akkul", "Akkur", "Alulim", "Amurru", "Anzu", "Apin", "Aratta", "Asarlu",
    "Baba", "Babil", "Badtib", "Balag", "Baqal", "Bilga", "Birdu", "Borum",
    "Dagan", "Dagul", "Dilmun", "Dirig", "Dudum", "Dukug", "Dumuz", "Dumuzi", "Dunnum",
    "Eana", "Ebih", "Ekiq", "Elam", "Emar", "Enki", "Enlil", "Enmer", "Entem", "Eridu", "Eshnun", "Ezen", "Ezina",
    "Gala", "Garama", "Gatum", "Geshtin", "Gibil", "Gigir", "Gilgam", "Gipar", "Girsu", "Gubba", "Gudea", "Gulla",
    "Halab", "Hanam", "Hanish", "Haran", "Hashur", "Hattu", "Hurum", "Huzir",
    "Ibgal", "Idnin", "Igigi", "Igimil", "Ikunum", "Ilum", "Imdug", "Imgur", "Imiru", "Inanna", "Irigal", "Ishkur", "Ishmu", "Ishtar", "Isin",
    "Kadi", "Kakka", "Kalar", "Kanesh", "Karum", "Kesh", "Kigdu", "Kish", "Kubaba", "Kudul", "Kulaba", "Kurum",
    "Lagash", "Lahar", "Larsa", "Libal", "Lilum", "Limmul", "Lugal", "Lulal", "Lullu",
    "Mada", "Mami", "Marduk", "Mari", "Martu", "Mashash", "Meluhha", "Mushus",
    "Nabu", "Nadin", "Nammu", "Namtar", "Namzu", "Nanna", "Nanib", "Nanshe", "Naram", "Naza", "Nedu", "Nidaba", "Nigir", "Nungal",
    "Pabil", "Pukku", "Purum", "Pushu", "Puzur",
    "Raba", "Ridan", "Rimush", "Rusa",
    "Saba", "Sabum", "Sagan", "Samug", "Sangar", "Sarpan", "Shagir", "Shakan", "Shaku", "Shalim", "Shamash", "Shara", "Shuba", "Shudu", "Shurupp", "Subar", "Sulgi", "Sumer",
    "Tabra", "Tarzu", "Teshk", "Tiamat", "Tidnu", "Tigris", "Tilla", "Tirum", "Tugul", "Tukki", "Tummal", "Tura",
    "Ubara", "Umma", "Umu", "Unug", "Urdu", "Urnin", "Ursag", "Urshu", "Ursim", "Utu", "Uzu",
    "Zabala", "Zabum", "Zagros", "Zalki", "Zame", "Zamug", "Zarku", "Ziusud", "Zudil", "Zudu", "Zulum", "Zuzu"
];

const CLAN_COLORS: string[] = [
    'red', 'orange', 'green', 'blue', 'purple', 'brown', 'black', 'gray', 'pink', 'cyan'
];

export function randomClanName(exclude: string[] | Set<String>): string {
    if (Array.isArray(exclude)) exclude = new Set(exclude);
    const available = CLAN_NAMES.filter(name => !exclude.has(name));
    if (available.length === 0) {
        return CLAN_NAMES[Math.floor(Math.random() * CLAN_NAMES.length)];
    }
    return available[Math.floor(Math.random() * available.length)];
}

export function randomClanColor(exclude: string[] | Set<String>): string {
    if (Array.isArray(exclude)) exclude = new Set(exclude);
    const available = CLAN_COLORS.filter(color => !exclude.has(color));
    if (available.length === 0) {
        return CLAN_COLORS[Math.floor(Math.random() * CLAN_COLORS.length)];
    }
    return available[Math.floor(Math.random() * available.length)];
}

import { ClanTraits, NUMERIC_TRAITS } from "./traits";

export interface GoodsReceiver {
    share: number;

    accept(source: string, good: TradeGood, amount: number): void;
}

export class Clan implements TradePartner {
    readonly uuid = crypto.randomUUID();

    // Year the clan came into being, for "years in existence" reporting.
    readonly foundedYear: Year;

    static minDesiredSize = 10;
    static maxDesiredSize = 60;

    private settlement_: Settlement;

    private residenceLevel_ = new ResidenceLevel(this);
    // Number of turns it's generally agreed the clan has been in the settlement,
    // counting a cadet clan based on the parent clan's tenure.
    seniority: number = 2;

    lastPopulationChange: PopulationChange = PopulationChangeBuilder.empty(this);

    skills = new ClanSkills(this);

    traits = new ClanTraits();

    migrationPlan_: MigrationCalc = new MigrationCalc(this, true);
    previousSettlement_: Settlement;

    readonly rites: Rites; // TODO - remove if not used
    ritualGoodsUsage: 'Private' | 'Communal' = 'Private';

    // What this year's extreme floods, if any, did to this clan.
    floodDamage: ClanFloodDamage = new ClanFloodDamage(this);

    // Troubles this clan faced this turn, and how the rites for them went.
    ritualEvents: RitualEvent[] = [];
    // Rites this clan said this turn, for itself or for a neighbor.
    ritualsPerformed: RitualEvent[] = [];
    // Deaths a ritual result adds (positive) or averts (negative) this turn,
    // applied when the year's population change is drawn.
    pendingDeathAdjustment: number = 0;

    housingDecision: HousingDecision | undefined;
    housing = HousingTypes.Huts;

    // What this clan is willing to put into the ditches, and what it
    // actually did. Under "At Will" these are the same; a later
    // organizational method may separate them.
    get ditchingWillingness(): number {
        return this.traits.ditchingEffort;
    }

    get ditchingEffortShare(): number {
        return this.effortAllocation.get(Activities.Ditching);
    }

    get ditchingLabor(): number {
        return this.ditchingEffortShare * this.effort;
    }

    // The clan's part in the settlement's festivals: what it means to give
    // them, and what its year actually left for them. Every clan does the
    // notional standard for now, so willingness is the same for all.
    readonly festivals = new FestivalOperation(this);

    get festivalWillingness(): number {
        return this.festivals.willingness;
    }

    get festivalEffortShare(): number {
        return this.effortAllocation.get(Activities.Festivals);
    }

    get festivalLabor(): number {
        return this.festivalEffortShare * this.effort;
    }

    // The two halves of that, which are where the two festival skills are
    // practiced: the feast is where a clan gets its hand in at making and
    // performing, the rite is where the words are kept.
    get feastLabor(): number {
        return this.festivals.labor(RitualAspects.Feast);
    }

    get riteLabor(): number {
        return this.festivals.labor(RitualAspects.Rite);
    }

    // Time spent looking after people, which is where Care is practised.
    get careLabor(): number {
        return this.effortAllocation.get(Activities.Care) * this.effort;
    }

    effortAllocation: EffortAllocation;
    helpAllocation: HelpAllocation = new HelpAllocation();
    operations: Operation[] = [];

    readonly tradeRelationships = new Set<TradeRelationship>();

    stress = new Stress();

    production: ProductionReport = new ProductionReport([]);
    distribution: Distribution;
    stockOutflow: StockOutflow;
    stock: Stock = new Stock();
    consumption: Consumption;
    qol: QualityOfLife = new QualityOfLife(new Map());

    private readonly happinessCalc_: HappinessCalc;

    notifications: ClanNotification[] = [];

    // Adds the clan to the settlement.
    constructor(
        readonly world: World,
        settlement: Settlement,
        readonly annals: Annals,
        public name: string,
        public color: string,
        public population: number,
    ) {
        this.foundedYear = world.year.clone();
        this.world.clanMap.set(this.uuid, this);
        this.world.timeline.register(this.uuid, this.name);

        this.settlement_ = settlement;
        this.settlement_.clans.push(this);
        membershipChanged();
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

        // Must go after initializing production nodes since it builds effort for them.
        this.effortAllocation = new EffortAllocation(this);
        this.distribution = new Distribution(this);
        this.stockOutflow = new StockOutflow(this);
        this.consumption = new Consumption(this);
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

    get craftSkill() {
        return this.skills.v(SkillDefs.Craft);
    }

    get careSkill() {
        return this.skills.v(SkillDefs.Care);
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

    informationOn(other: Clan): number {
        if (other === this) {
            return 1.0;
        }
        return this.world.perceptions
            .get(this, other)?.information.value ?? 0;
    }

    mutualAidPayoff(): number {
        let value = 0;
        for (const [_, interactions] of this.world.interactions.getFor(this)) {
            for (const interaction of interactions) {
                if (interaction instanceof BasicInteraction) {
                    const amount = Math.min(interaction.amount1to2, interaction.amount2to1);
                    if (amount > 0) {
                        const relativeAmount = amount / this.population;
                        value += relativeAmount;
                    }
                }
            }

        }
        return 5 * value;
    }

    conflictPayoff() {
        return sumFun(
            this.world.conflicts.entriesForClan(this),
            ([_, conflict]) => conflict.value(this));
    }

    // The social side of the year's ritual favors: standing gained by saying
    // the words for a neighbor, and given up by having to ask.
    ritualHelpPayoff(): number {
        return sumFun(this.ritualsPerformed, e => e.stressTransfer)
            - sumFun(this.ritualEvents, e => e.stressTransfer);
    }

    updateStress() {
        this.stress.update(this);
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

    get migrationPlan(): MigrationCalc | undefined {
        return this.migrationPlan_;
    }

    get isMigrating(): boolean {
        return this.migrationPlan !== undefined
            && this.migrationPlan_.willMigrate;
    }

    assessMigration() {
        this.migrationPlan_ = new MigrationCalc(this);
    }

    advanceSeniority() {
        // People can remember back only so far.
        if (this.seniority < 4) {
            ++this.seniority;
        }
    }

    get helpReceived(): number {
        return sumFun(
            connectedClans(this),
            other => other.helpAllocation.get(this) * other.effort);
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
        // Under "At Will" there is nothing to plan: each clan works on the
        // ditches as much as it cares to, and that willingness is a trait.
        // Organizational methods that assign the work will decide it here.
    }

    planHousing() {
        this.housingDecision = new HousingDecision(this);
        if (this.housingDecision.choice !== this.housing) {
            this.world.addNote(
                'H',
                `{0} in {1} changing housing from ${this.housing.name} to ${this.housingDecision.choice.name}.`,
                undefined,
                [{ uuid: this.uuid, name: this.name }, { uuid: this.settlement.uuid, name: this.settlement.name }],
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

    advancePopulation(noEffect: boolean = false, yearsElapsed: number = this.world.yearsPerTick) {
        this.lastPopulationChange = new PopulationChangeBuilder(this, yearsElapsed).build();
        if (!noEffect) {
            // Hand the year's drowning deaths back to the floods that caused
            // them, so each can report what it cost.
            this.floodDamage.deaths = -(this.lastPopulationChange.items
                .find(i => i.name === 'Flood')?.actual ?? 0);
            for (let i = 0; i < this.slices.length; ++i) {
                this.slices[i][0] = this.lastPopulationChange.newSlices[i][0];
                this.slices[i][1] = this.lastPopulationChange.newSlices[i][1];
            }
            this.population = this.slicesTotal;
        }
    }

    get perCapitaFoodProductionTarget(): number {
        const piety = this.traits.piety;
        const forEating = piety >= 50
            ? Math.max(0.1, Math.pow(1.2, (piety - 50) / 15))
            : Math.max(0.1, Math.pow(0.9, (50 - piety) / 15));
        // Most of what goes to the settlement's festivals comes back as a
        // meal, so only what is given up on the offering table has to be
        // grown on top of what the clan means to eat.
        const sacrificed = 1 - this.settlement.ritualStructure.foodEatenShare;
        const forFestivals = this.population > 0
            ? sacrificed * this.festivals.totalFoodOwed / this.population : 0;
        return forEating + forFestivals;
    }

    getTrait(trait: string): number {
        return this.traits.get(trait);
    }

    prepareTraitChanges(elapsedYears: number = this.world?.yearsPerTick ?? 1) {
        this.skills.prepareAdvance(elapsedYears);
    }

    commitTraitChanges() {
        this.skills.commitAdvance();
        this.traits.mutate();
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
        membershipChanged();

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

        for (const key of NUMERIC_TRAITS) {
            const val = Math.round(
                (this.traits.get(key) * origSize + other.traits.get(key) * other.population) /
                (origSize + other.population));
            this.traits.set(key, val);
        }
        this.traits.giving =
            (this.traits.giving * origSize + other.traits.giving * other.population) /
            (origSize + other.population);
        this.traits.aggression =
            (this.traits.aggression * origSize + other.traits.aggression * other.population) /
            (origSize + other.population);

        // TODO - Handle relationships

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
        newClan.traits = this.traits.cloneWithSplitBump();
        newClan.skills = this.skills.cloneFor(newClan);
        newClan.effortAllocation = new EffortAllocation(newClan, this.effortAllocation.m, this.effortAllocation.pm);
        for (let i = 0; i < this.slices.length; ++i) {
            newClan.slices[i][0] = Math.round(this.slices[i][0] * fraction);
            newClan.slices[i][1] = Math.round(this.slices[i][1] * fraction);
            this.slices[i][0] -= newClan.slices[i][0];
            this.slices[i][1] -= newClan.slices[i][1];
            this.population -= newClan.slices[i][0] + newClan.slices[i][1];
        }

        this.world.connections.getOrCreate(
            this,
            newClan,
            KinConnection,
            () => new KinConnection(this.uuid, newClan.uuid)
        )
        // Both clans are made of people who knew the neighbors, so divide what
        // the undivided clan knew rather than letting the new one start blank.
        divideInformationOnSplit(this, newClan);
        // TODO - Inherit the rest of the relationships from the parent clan.

        // Plan for the new clan, since it didn't get a chance to during the main
        // planning phase. We don't need to update productivity because that happens
        // at the start of production during the advance phase.
        newClan.planMaintenance();
        newClan.planHousing();
        newClan.assessMigration();

        this.annals.log(`Clan ${newClan.name} (${newClan.population}) split off from clan ${this.name} (${this.population})`, this.settlement);

        this.notifications.push(new ClanNotification('s', `Split off clan ${newClan.name} (${newClan.population})`));
        newClan.notifications.push(new ClanNotification('n', `Split off from clan ${this.name} (${this.population})`));
        log('notifs now', this.notifications, newClan.notifications);

        return newClan;
    }

    clearNotifications() {
        this.notifications = [];
    }
}

export class ClanNotification {
    constructor(readonly tag: string, readonly message: string) { }
}