import { sumFun } from "../lib/basics";
import { pct } from "../lib/format";
import { createTwoSidedQuadratic } from "../lib/modelbasics";
import { TradeGoods } from "../trade";
import type { Clan } from "./people";

export abstract class HappinessItem<T> {
    private expectedAppeal_: number;
    protected state_: T;

    constructor(
        expectedAppeal: number = 0,
        state: T,
    ) {
        this.expectedAppeal_ = expectedAppeal;
        this.state_ = state;
    }

    // Display label.
    abstract get label(): string;

    // Display text for current state.
    abstract get stateDisplay(): string;

    get isSubsistence(): boolean {
        return false;
    }

    get appeal(): number {
        return this.appealOf(this.state_);
    }

    // Appeal as a function of state. Should be pure.
    abstract appealOf(state: T): number;

    // Update the state from the model. We track a copy of the state
    // in this structure so that we have a stable record of what
    // state the appeal was based on.
    abstract updateState(clan: Clan): void;

    get expectedAppeal(): number {
        return this.expectedAppeal_;
    }

    get expectedAppealFloor(): number|undefined {
        return undefined;
    }

    updateExpectedAppeal(): void {
        // Expectations adjust upward more easily than downward.
        const error = this.appeal - this.expectedAppeal_;
        this.expectedAppeal_ += error >= 0
            ? 0.5 * error
            : 0.1 * error;
        
        // There can be a floor. Starving is never considered acceptable.
        const floor = this.expectedAppealFloor;
        if (floor !== undefined) {
            this.expectedAppeal_ = Math.max(this.expectedAppeal_, floor);
        }
    }

    get state(): T {
        return this.state_;
    }

    get value(): number {
        return this.appeal - this.expectedAppeal_;
    }
}

abstract class NumericHappinessItem extends HappinessItem<number> {
    constructor(
        expectedAppeal: number = 0,
        state: number = 0,
    ) {
        super(expectedAppeal, state);
    }
}

export class FoodQuantityHappinessItem extends NumericHappinessItem {
    get label(): string {
        return 'Food Quantity';
    }

    get stateDisplay(): string {
        return pct(this.state_);
    }

    get isSubsistence(): boolean {
        return true;
    }

    get expectedAppealFloor(): number|undefined {
        return this.appealOf(0.75);
    }

    appealOf(perCapitaSubsistence: number): number {
            return FoodQuantityHappinessItem.appealOf(perCapitaSubsistence);
    }

    static appealOf(perCapitaSubsistence: number): number {
        return 50 * Math.log2(perCapitaSubsistence);
    }

    updateState(clan: Clan): void {
        this.state_ = clan.consumption.perCapitaSubsistence();
    }
}

export class FoodQualityHappinessItem extends HappinessItem<{quantity: number, fishRatio: number}> {
    constructor(
        expectedAppeal: number = 0,
        state: {quantity: number, fishRatio: number} = {quantity: 0, fishRatio: 0},
    ) {
        super(expectedAppeal, state);
    }

    get label(): string {
        return 'Food Quality';
    }

    get stateDisplay(): string {
        return `${pct(this.state_.fishRatio)} fish / ${pct(FoodQualityHappinessItem.careOf(this.state_.quantity))} care`;
    }


    get isSubsistence(): boolean {
        return true;
    }

    appealOf(state: {quantity: number, fishRatio: number}): number {
        return FoodQualityHappinessItem.appealOf(state);
    }

    static careOf(quantity: number): number {
        return quantity >= 1 ? 1 : 2 ** (10 * (quantity - 1));
    }

    static appealOf({quantity, fishRatio}: {quantity: number, fishRatio: number}): number {
        // People only care about quality if there's enough quantity.
        return FoodQualityHappinessItem.careOf(quantity) * foodVarietyAppeal(fishRatio);
    }

    updateState(clan: Clan): void {
        this.state_ = { quantity: clan.consumption.perCapitaSubsistence(), fishRatio: fishRatio(clan) };
    }
}

// Food variety
// - "Fish" represents a balanced hunter-gather diet and has base appeal.
// - Adding some cereals typically has higher appeal:
//   - Ritual emphasis, including direct usage
//   - Beer
//   - Storable food
// - A high percentage of cereals only in the diet has lower appeal and health.

const foodVarietyAppealFun = createTwoSidedQuadratic(0, -10, 0.7, 2, 1, 0);

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

class ShelterHappinessItem extends NumericHappinessItem {
    get label(): string {
        return 'Shelter';
    }

    get stateDisplay(): string {
        return this.state_.toFixed(0);
    }

    appealOf(shelterAppeal: number): number {
        return shelterAppeal;
    }

    updateState(clan: Clan): void {
        this.state_ = clan.housing.shelter;
    }
}

class MigrationHappinessItem extends NumericHappinessItem {
    get label(): string {
        return 'Migration';
    }

    get stateDisplay(): string {
        return this.state_.toFixed(0);
    }

    appealOf(forcedMigrations: number): number {
        return -forcedMigrations;
    }

    updateState(clan: Clan): void {
        this.state_ = clan.settlement.forcedMigrations;
    }
}

class FloodHappinessItem extends NumericHappinessItem {
    get label(): string {
        return 'Flood';
    }

    get stateDisplay(): string {
        return pct(this.state);
    }

    appealOf(damageFactor: number): number {
        return -damageFactor * 20;
    }

    updateState(clan: Clan): void {
        this.state_ = clan.settlement.floodLevel.damageFactor;
    }
}

class SocietyHappinessItem extends NumericHappinessItem {
    get label(): string {
        return 'Society';
    }

    get stateDisplay(): string {
        return `interaction volume ${this.state_.toFixed(2)}`;
    }

    appealOf(interactionVolume: number): number {
        return 20 * interactionVolume;
    }
    
    updateState(clan: Clan): void {
        this.state_ = clan.relationships.totalInteractionVolume;
    }
}

class RitualHappinessItem extends NumericHappinessItem {
    get label(): string {
        return 'Rituals';
    }

    get stateDisplay(): string {
        return this.state_.toFixed(1);
    }

    appealOf(ritualAppeal: number): number {
        return ritualAppeal;
    }

    updateState(clan: Clan): void {
        this.state_ = clan.settlement.clans.rites.appeal;
    }
}

class StatusHappinessItem extends NumericHappinessItem {
    get label(): string {
        return 'Status';
    }

    get stateDisplay(): string {
        return this.state_.toFixed(1);
    }

    appealOf(averagePrestige: number): number {
        return averagePrestige;
    }

    updateState(clan: Clan): void {
        this.state_ = clan.averagePrestige;
    }
}

export class HappinessCalc {
    readonly items: Map<string, HappinessItem<any>> = new Map();

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

    clone(): HappinessCalc {
        const clone = new HappinessCalc(this.clan);
        for (const item of this.items.values()) {
            clone.add(item);
        }
        return clone;
    }

    private add(...items: HappinessItem<any>[]): void {
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

    get(label: string): HappinessItem<any>|undefined {
        return this.items.get(label);
    }

    getAppeal(label: string): number|undefined {
        return this.items.get(label)?.appeal;
    }

    getAppealNonNull(label: string, stateOverride: number|undefined = undefined): number {
        const item = this.items.get(label);
        if (!item) return 0;

        return stateOverride !== undefined ? item.appealOf(stateOverride) : item.appeal ?? 0;
    }

    getValue(label: string): number {
        return this.items.get(label)?.value ?? 0;
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
