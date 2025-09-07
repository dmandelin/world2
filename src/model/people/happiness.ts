import { sumFun } from "../lib/basics";
import { createTwoSidedQuadratic } from "../lib/modelbasics";
import { TradeGoods } from "../trade";
import type { Clan } from "./people";

export abstract class HappinessItem {
    private expectedAppeal_: number;
    protected state_: number;

    constructor(
        expectedAppeal: number = 0,
        state: number = 0,
    ) {
        this.expectedAppeal_ = expectedAppeal;
        this.state_ = state;
    }

    // Display label.
    abstract get label(): string;

    get isSubsistence(): boolean {
        return false;
    }

    get appeal(): number {
        return this.appealOf(this.state_);
    }

    // Appeal as a function of state. Should be pure.
    abstract appealOf(state: number): number;

    // Update the state from the model. We track a copy of the state
    // in this structure so that we have a stable record of what
    // state the appeal was based on.
    abstract updateState(clan: Clan): void;

    get expectedAppeal(): number {
        return this.expectedAppeal_;
    }

    updateExpectedAppeal(): void {
        // Expectations adjust upward more easily than downward.
        const error = this.appeal - this.expectedAppeal_;
        this.expectedAppeal_ += error >= 0
            ? 0.5 * error
            : 0.1 * error;
    }

    get state(): number {
        return this.state_;
    }

    get value(): number {
        return this.appeal - this.expectedAppeal_;
    }
}

class FoodQuantityHappinessItem extends HappinessItem {
    get label(): string {
        return 'Food Quantity';
    }

    get isSubsistence(): boolean {
        return true;
    }

    appealOf(perCapitaSubsistence: number): number {
        return 50 * Math.log2(perCapitaSubsistence);
    }

    updateState(clan: Clan): void {
        this.state_ = clan.consumption.perCapitaSubsistence();
    }
}

class FoodQualityHappinessItem extends HappinessItem {
    get label(): string {
        return 'Food Quality';
    }

    get isSubsistence(): boolean {
        return true;
    }

    appealOf(fishRatio: number): number {
        return foodVarietyAppeal(fishRatio);
    }

    updateState(clan: Clan): void {
        this.state_ = fishRatio(clan);
    }
}

// Food variety
// - "Fish" represents a balanced hunter-gather diet and has base appeal.
// - Adding some cereals typically has higher appeal:
//   - Ritual emphasis, including direct usage
//   - Beer
//   - Storable food
// - A high percentage of cereals only in the diet has lower appeal and health.

const foodVarietyAppealFun = createTwoSidedQuadratic(0, -10, 0.7, 5, 1, 0);

export function fishRatio(clan: Clan): number {
    const cereals = clan.consumption.perCapita(TradeGoods.Cereals);
    const fish = clan.consumption.perCapita(TradeGoods.Fish);
    return fish / (cereals + fish);
}

export function foodVarietyAppeal(fishRatio: number): number {
    return foodVarietyAppealFun(fishRatio);
}

export function foodVarietyHealthFactor(fishRatio: number): number {
    const p = 1 - fishRatio;
    return 1 - 0.125 * p * p;
}

class ShelterHappinessItem extends HappinessItem {
    get label(): string {
        return 'Shelter';
    }

    appealOf(shelterAppeal: number): number {
        return shelterAppeal;
    }

    updateState(clan: Clan): void {
        this.state_ = clan.housing.shelter;
    }
}

class MigrationHappinessItem extends HappinessItem {
    get label(): string {
        return 'Migration';
    }

    appealOf(forcedMigrations: number): number {
        return -forcedMigrations;
    }

    updateState(clan: Clan): void {
        this.state_ = clan.settlement.forcedMigrations;
    }
}

class FloodHappinessItem extends HappinessItem {
    get label(): string {
        return 'Flood';
    }

    appealOf(damageFactor: number): number {
        return -damageFactor * 20;
    }

    updateState(clan: Clan): void {
        this.state_ = clan.settlement.floodLevel.damageFactor;
    }
}

class RitualHappinessItem extends HappinessItem {
    get label(): string {
        return 'Rituals';
    }

    appealOf(ritualAppeal: number): number {
        return ritualAppeal;
    }

    updateState(clan: Clan): void {
        this.state_ = clan.settlement.clans.rites.appeal;
    }
}

class StatusHappinessItem extends HappinessItem {
    get label(): string {
        return 'Status';
    }

    appealOf(averagePrestige: number): number {
        return averagePrestige;
    }

    updateState(clan: Clan): void {
        this.state_ = clan.averagePrestige;
    }
}

class SocietyHappinessItem extends HappinessItem {
    get label(): string {
        return 'Society';
    }

    appealOf(population: number): number {
        const limit = 300;
        return population <= limit ? 0 : -20 * (population - limit) / population;
    }

    updateState(clan: Clan): void {
        this.state_ = clan.settlement.population;
    }
}

export class HappinessCalc {
    readonly items: Map<string, HappinessItem> = new Map();
    readonly subsistenceItems: HappinessItem[] = [];

    constructor(readonly clan: Clan) {}

    private initialize(): void {
        this.add(
            new FoodQuantityHappinessItem(), 
            new FoodQualityHappinessItem(),
            new ShelterHappinessItem(),
            new MigrationHappinessItem(),
            new FloodHappinessItem(),
            new RitualHappinessItem(),
            new StatusHappinessItem(),
            new SocietyHappinessItem(),
        );
    }

    private add(...items: HappinessItem[]): void {
        for (const item of items) {
            this.items.set(item.label, item);
        }
    }

    update(): void {
        this.updateAppeal();
        this.updateExpectations();
    }

    private updateAppeal(): void {
        if (this.items.size === 0) {
            this.initialize();
        }
        for (const item of this.items.values()) {
            item.updateState(this.clan);
        }
    }

    private updateExpectations(): void {
        for (const item of this.items.values()) {
            item.updateExpectedAppeal();
        }
    }

    get appeal(): number {
        return sumFun(this.items.values(), item => item.appeal);
    }

    get subsistenceAppeal(): number {
        return sumFun(this.items.values(), item => item.isSubsistence ? item.appeal : 0);
    }

    get value(): number {
        return sumFun(this.items.values(), item => item.value);
    }

    getAppeal(label: string): number|undefined {
        return this.items.get(label)?.appeal;
    }

    getAppealNonNull(label: string): number {
        return this.items.get(label)?.appeal ?? 0;
    }
}

export class HappinessCalcItem {
    constructor(
        readonly label: string,
        readonly expectation: number,
        readonly appeal: number,
    ) {}

    get value(): number {
        return this.appeal - this.expectation;
    }
}
