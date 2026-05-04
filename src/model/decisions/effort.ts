import { CommonsProductionNode, type ProductionNode } from "../econ/productionnode";
import { between, chooseFrom, sumFun } from "../lib/basics";
import { isExemplarClan } from "../lib/debug";
import type { Clan } from "../people/people";
import type { SkillDef } from "../people/skills";

// How a clan allocates its "effort", which subsumes time taken
// (including preparation and recovery) and other factors not
// explicitly modeled, such as mental discipline.
//
// Effort is measured in units, where 1 "average adult" produces
// 1 unit of effort per turn. Effort is allocated in fractions.
export class EffortAllocation {
    // f for fractions.
    // These should be whole percentages, and must sum to 1.0.
    private f_: [Activity, number][];

    constructor(readonly clan: Clan, f?: [Activity, number][]) {
        // Fixed allocations for basic activities.
        this.f_ = f ? [...f] : [
            [Activities.Leisure, 0.2],
            [Activities.Care, 0.2],
        ];
        const remaining = 1 - sumFun(this.f_, ([_, fraction]) => fraction);

        // Start with production 80% fishing and 20% farming.
        const fFishing = 0.8 * remaining;
        const fAgriculture = remaining - fFishing;
        for (const node of this.clan.productionNodes) {
            if (node === this.clan.settlement.cluster.fishery) {
                this.f_.push([Activities.Production(node), fFishing]);
            } else if (node === this.clan.settlement.cluster.naturalFields) {
                this.f_.push([Activities.Production(node), fAgriculture]);
            }
        }
    }

    debugString(): string {
        return this.f_.map(([activity, fraction]) => `${activity.name}: ${fraction.toFixed(2)}`).join(', ');
    }

    [Symbol.iterator](): Iterator<[Activity, number]> {
        return this.f_[Symbol.iterator]();
    }

    private getEntries(activityName: string): [Activity, number][] {
        return this.f_.filter(([a, _]) => a.name === activityName);
    }

    private getEntry(activity: Activity): [Activity, number]|undefined {
        return this.f_.find(([a, _]) => a.name === activity.name && a.node === activity.node);
    }

    private getOrCreateEntry(activity: Activity): [Activity, number] {
        let entry = this.getEntry(activity);
        if (!entry) {
            entry = [activity, 0];
            this.f_.push(entry);
        }
        return entry;
    }

    get(activity: Activity): number {
        const entry = this.getEntry(activity);
        return entry ? entry[1] : 0;
    }

    getForNode(node: ProductionNode): number {
        return this.getEntry(Activities.Production(node))?.[1] ?? 0;
    }

    getForSkill(skillDef: SkillDef): number {
        const node = this.clan.productionNodes.find(node => node instanceof CommonsProductionNode && node.skillDef === skillDef);
        return node ? this.getForNode(node) : 0;
    }

    farmingRatio(): number {
        const farmingEffort = this.getForNode(this.clan.settlement.cluster.naturalFields);
        const fishingEffort = this.getForNode(this.clan.settlement.cluster.fishery);
        return farmingEffort / (farmingEffort + fishingEffort);
    }

    clone(): EffortAllocation {
        return new EffortAllocation(this.clan, this.f_);
    }

    // "Applying" the allocation refers to the process of converting
    // the high-level choices to specific effort allocations.

    // Initialize the application process.
    applyStart() {
        // Reserve effort needed for child care and initially leave
        // the rest for leisure.
        const fCare = Math.min(1, 0.25 * this.clan.children / this.clan.effort);

        // If we need more or less care than we have now, adjust everything
        // else proportionally.
        const careDelta = fCare - this.get(Activities.Care);
        const leisureEntry = this.getEntry(Activities.Leisure);
        if (leisureEntry) {
            leisureEntry[1] -= careDelta;
        }
        this.getOrCreateEntry(Activities.Care)[1] += careDelta;

        if (isExemplarClan(this.clan)) {
            console.log(
                `Start effort allocation for ${this.clan.name}:`, 
                this.clan.effortAllocation.debugString());
        }
    }

    // Try to make one step change to the allocation. Return true if 
    // a change was made.
    applyStep(labor: Map<ProductionNode, Map<Clan, number>>): boolean {
        const expectedProduction = sumFun(
            this.clan.productionNodes, 
            node => node.output(labor.get(node) ?? new Map(), this.clan));
        if (isExemplarClan(this.clan)) {
            console.log(
                `Expected production for ${this.clan.name}: ${expectedProduction.toFixed(2)} (population: ${this.clan.population})`);
        }
        if (expectedProduction < (this.clan.targetPerCapitaFood - 0.05) * this.clan.population) {
            // Not enough: work more at the expense of leisure. Note that clans
            // don't necessarily know exactly what has the most marginal production.
            // For now we'll be very simple about that and make it random.
            const leisureEntry = this.getEntry(Activities.Leisure);
            if (!leisureEntry || leisureEntry[1] <= 0) return false;

            const delta = Math.min(0.05, leisureEntry[1]);
            const node = chooseFrom(this.clan.productionNodes);

            leisureEntry[1] -= delta;
            this.getOrCreateEntry(Activities.Production(node))[1] += delta;

            if (isExemplarClan(this.clan)) {
                console.log(
                    `Updated effort allocation for ${this.clan.name}:`, 
                    this.clan.effortAllocation.debugString());
            }

            return true;
        }
        
        if (expectedProduction > (this.clan.targetPerCapitaFood + 0.05) * this.clan.population) {
            // More than enough: work less and enjoy more leisure.
            const workedNodes = this.clan.productionNodes.filter(node => this.get(Activities.Production(node)) > 0);
            const node = chooseFrom(workedNodes);

            const delta = Math.min(0.05, this.get(Activities.Production(node)));

            this.getOrCreateEntry(Activities.Production(node))[1] -= delta;
            this.getOrCreateEntry(Activities.Leisure)[1] += delta;

            if (isExemplarClan(this.clan)) {
                console.log(
                    `Updated effort allocation for ${this.clan.name}:`, 
                    this.clan.effortAllocation.debugString());
            }

            return true;
        }

        return false;
    }
}

export type Activity = {
    name: string;
    sortKey: number;
    shortName?: string;
    color?: string;
    node?: ProductionNode;
}

class Activities {
    static readonly Leisure: Activity = { name: 'Leisure', sortKey: 999, shortName: 'L', color: '#3b82f6' };
    static readonly Care: Activity = { name: 'Care', sortKey: 998, shortName: 'C', color: '#ef4444' };

    static Production(node: ProductionNode): Activity {
        // TODO - It would be nice to cache these, but a naive approach
        //        leaks memory.
        return { name: `Production (${node.name})`, sortKey: node.sortKey, shortName: node.shortName, color: node.color, node };
    }
}

// TODO - add domestic labor and maintenance
// TODO - add ritual and social time
// TODO - add time cost for relationships