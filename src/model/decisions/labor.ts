import type Settlement from '../../components/Settlement.svelte';
import { clamp } from '../lib/basics';
import { normal } from '../lib/distributions';
import { eloSuccessProbability } from '../lib/modelbasics';
import { TradeGoods } from '../trade';
import { foodVarietyAppeal } from '../people/happiness';
import { Clan } from '../people/people';
import { SkillDefs, type SkillDef } from '../people/skills';

export class LaborAllocation {
    allocationPlan_: LaborAllocationPlan;

    // Planned allocations for labor left over after maintenance and other 
    // required allocations. Value is fraction and values must sum to 1.
    readonly planned_= new Map<SkillDef, number>();

    readonly allocs = new Map<SkillDef, number>();

    constructor(readonly clan: Clan) {
        const r = clamp(normal(0.2, 0.1), 0, 1);
        this.planned_.set(SkillDefs.Agriculture, r);
        this.planned_.set(SkillDefs.Fishing, 1 - r);
        this.plan();

        this.allocationPlan_ = new LaborAllocationPlan(this, true);
    }

    clone(): LaborAllocation {
        const clone = new LaborAllocation(this.clan);
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

    get workers(): number { 
        return this.clan.population / 3;
    }

    get allocationPlan(): LaborAllocationPlan {
        return this.allocationPlan_;
    }

    plannedRatioFor(skill: SkillDef): number {
        return this.planned_.get(skill) ?? 0;
    }

    plan(): void {
        this.allocs.clear();
        this.updatePlanned();
        this.updateAllocs();
    }

    private updatePlanned() {
        // Happens during world initialization.
        if (!this.clan.consumption) return;

        this.allocationPlan_ = new LaborAllocationPlan(this);

        /*
        const r = this.planned_.get(SkillDefs.Agriculture);
        if (r === undefined) return;
        const sign = Math.random() < 0.5 ? -1 : 1;
        const delta = sign * (0.1 + 0.1 * Math.random());
        const newR = clamp(r + delta, 0, 1);
        this.planned_.set(SkillDefs.Agriculture, newR);
        this.planned_.set(SkillDefs.Fishing, 1 - newR);
        */
    }

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

export class LaborAllocationPlanScenario { 
    constructor(
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

    // TODO - remove code duplication
    get foodQuantityAppeal(): number {
        return 50 * Math.log2(this.perCapitaSubsistence);
    }

    // TODO - consider better factoring
    get foodQualityAppeal(): number {
        return foodVarietyAppeal(this.fishRatio);
    }

    get appeal(): number {
        return this.foodQuantityAppeal + this.foodQualityAppeal;
    }
}

export class LaborAllocationPlan {
    readonly happiness: number;
    readonly experimentProbability: number;
    readonly experimentingRoll: number;
    readonly experimenting: boolean;

    readonly scenarios: LaborAllocationPlanScenario[];

    constructor(readonly laborAllocation: LaborAllocation, noChange: boolean = false) {
        // First decide whether to experiment with new allocations. For now,
        // we have a conservative culture that will mostly try new things
        // only if hungry, but not absolutely.
        const h = laborAllocation.clan.happiness;
        this.happiness = h ? h.getValue('Food Quantity') + h.getValue('Food Quality') : 0;
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
            return new LaborAllocationPlanScenario(
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
}