import type Settlement from '../../components/Settlement.svelte';
import { clamp, maxby, sum, sumFun } from '../lib/basics';
import { normal } from '../lib/distributions';
import { eloSuccessProbability } from '../lib/modelbasics';
import { TradeGoods } from '../trade';
import { FoodQualityHappinessItem, FoodQuantityHappinessItem, foodVarietyAppeal, HappinessCalcItem, HappinessItem } from '../people/happiness';
import { Clan } from '../people/people';
import { SkillDefs, type SkillDef } from '../people/skills';

export class LaborAllocation {
    decision_: LaborAllocationDecision;

    // Planned allocations for labor left over after maintenance and other 
    // required allocations. Value is fraction and values must sum to 1.
    readonly planned_= new Map<SkillDef, number>();

    readonly allocs = new Map<SkillDef, number>();

    constructor(readonly clan: Clan, decision: LaborAllocationDecision|undefined = undefined) {
        const r = clamp(normal(0.2, 0.1), 0, 1);
        this.planned_.set(SkillDefs.Agriculture, r);
        this.planned_.set(SkillDefs.Fishing, 1 - r);
        this.plan(true);

        this.decision_ = decision ?? new LaborAllocationDecision(this, true);
    }

    clone(): LaborAllocation {
        const clone = new LaborAllocation(this.clan, this.decision_);
        clone.planned_.clear();
        for (const [skill, fraction] of this.planned_.entries()) {
            clone.planned_.set(skill, fraction);
        }
        clone.allocs.clear();
        for (const [skill, fraction] of this.allocs.entries()) {
            clone.allocs.set(skill, fraction);
        }
        return clone;
    }

    clonePlan(): Map<SkillDef, number> {
        const clone = new Map<SkillDef, number>();
        for (const [skill, fraction] of this.planned_.entries()) {
            clone.set(skill, fraction);
        }
        return clone;
    }

    get workers(): number { 
        return this.clan.population / 3;
    }

    get allocationPlan(): LaborAllocationDecision {
        return this.decision_;
    }

    plannedRatioFor(skill: SkillDef): number {
        return this.planned_.get(skill) ?? 0;
    }

    // Planning phase: update allocations.
    plan(priming: boolean): void {
        this.allocs.clear();

        // The decision normally relies in data that's not present
        // during priming.
        if (!priming) {
            this.decision_ = new LaborAllocationDecision(this);
            this.updatePlanned();
        }

        this.updateAllocs();
    }

    // Update planned "discretionary" allocations based on the latest
    // decision.
    private updatePlanned() {
        const r = this.planned_.get(SkillDefs.Agriculture);
        if (r === undefined) return;

        let sign;
        const choice = this.decision_.choice;
        switch (choice) {
            case LaborAllocationChange.MORE_FARMING:
                sign = 1;
                break;
            case LaborAllocationChange.LESS_FARMING:
                sign = -1;
                break;
            default:
                return;
        }

        const delta = sign * (0.05 + 0.1 * Math.random());
        const newR = clamp(r + delta, 0, 1);
        this.planned_.set(SkillDefs.Agriculture, newR);
        this.planned_.set(SkillDefs.Fishing, 1 - newR);
    }

    // Update actual allocations based on plans.
    private updateAllocs() {
        // Mandatory allocations.
        const housing = this.clan.housing.cost(this.clan);
        this.allocs.set(SkillDefs.Construction, housing);

        const ditching = this.clan.isDitching ? 0.02 : 0;
        if (ditching) {
            this.allocs.set(SkillDefs.Irrigation, ditching);
        }

        const reserved = housing + ditching;

        // Allocate planned items in remainder.
        const remainder = 1 - reserved;
        for (const [skill, fraction] of this.planned_.entries()) {
            this.allocs.set(skill, fraction * remainder);
        }
    }
}

enum LaborAllocationChange {
    NO_CHANGE,
    MORE_FARMING,
    LESS_FARMING,
}

export class LaborAllocationDecisionScenario { 
    constructor(
        readonly change: LaborAllocationChange,
        readonly label: string,
        readonly perCapitaCereals: number,
        readonly perCapitaFish: number,
        readonly cerealsTFP: number,
        readonly fishTFP: number,
    ) {}

    get perCapitaSubsistence(): number {
        return this.perCapitaCereals + this.perCapitaFish;
    }

    get fishRatio(): number {
        return this.perCapitaSubsistence > 0
            ? this.perCapitaFish / this.perCapitaSubsistence
            : 0;
    }

    get foodQuantityAppeal(): number {
        return FoodQuantityHappinessItem.appealOf(this.perCapitaSubsistence);
    }

    get foodQualityAppeal(): number {
        return FoodQualityHappinessItem.appealOf({ 
            quantity: this.perCapitaSubsistence, 
            fishRatio: this.fishRatio,
        });
    }

    get appeal(): number {
        return this.foodQuantityAppeal + this.foodQualityAppeal;
    }
}

export class LaborAllocationDecision {
    readonly previousPlan: Map<SkillDef, number>;

    readonly happinessItems: { [key: string]: HappinessItem<any> };
    readonly happiness: number;

    readonly experimentProbability: number;
    readonly experimentingRoll: number;
    readonly experimenting: boolean;

    readonly scenarios: LaborAllocationDecisionScenario[];

    constructor(readonly laborAllocation: LaborAllocation, noChange: boolean = false) {
        this.previousPlan = laborAllocation.clonePlan();

        // First decide whether to experiment with new allocations. For now,
        // we have a conservative culture that will mostly try new things
        // only if hungry, but not absolutely.
        const h = laborAllocation.clan.happiness;
        this.happinessItems = h ? {
            'Food Quantity': h.get('Food Quantity')!,
            'Food Quality': h.get('Food Quality')!,
        } : {};
        this.happiness = sumFun(Object.values(this.happinessItems), item => item.value);
        this.experimentProbability = noChange
            ? 0
            : eloSuccessProbability(-5, this.happiness, 5);
        this.experimentingRoll = Math.random();
        this.experimenting = this.experimentingRoll < this.experimentProbability;
        if (!this.experimenting) {
            this.scenarios = [];
            return; 
        }

        // Consider three scenarios: status quo, shifting 10% of output
        // to agriculture, shifting 10% of output to fishing.
        const clan = laborAllocation.clan;
        const outputDeltas = [0, 0.1, -0.1];
        this.scenarios = outputDeltas.map(delta => {
            const apn = clan.settlement.productionNode(SkillDefs.Agriculture)!;
            const fpn = clan.settlement.productionNode(SkillDefs.Fishing)!;
            const agTFP = apn.tfp(clan);
            const fiTFP = fpn.tfp(clan);

            const ac = clan.consumption.perCapita(TradeGoods.Cereals);
            const fc = clan.consumption.perCapita(TradeGoods.Fish);
            const tc = ac + fc;
            const acDelta = delta * tc;
            const fcDelta = Math.max(-fc, -acDelta * fiTFP / agTFP);
            return new LaborAllocationDecisionScenario(
                delta === 0 ? LaborAllocationChange.NO_CHANGE
                    : delta > 0 ? LaborAllocationChange.MORE_FARMING
                    : LaborAllocationChange.LESS_FARMING,
                delta === 0 ? 'Status quo'
                    : delta > 0 ? 'More farming'
                    : 'More fishing',
                ac + acDelta,
                fc + fcDelta,
                agTFP,
                fiTFP,
            );
        });
    }

    get bestScenario(): LaborAllocationDecisionScenario | undefined {
        if (this.scenarios.length === 0) return undefined;
        return maxby(this.scenarios, s => s.appeal);
    }

    get best(): LaborAllocationChange | undefined {
        return this.bestScenario?.change;
    }

    get chosenScenario(): LaborAllocationDecisionScenario | undefined {
        return this.experimenting ? this.bestScenario : undefined;
    }

    get choice(): LaborAllocationChange | undefined {
        return this.experimenting ? this.best : undefined;
    }
}