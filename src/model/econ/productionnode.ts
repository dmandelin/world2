import { Clan } from '../people/people';
import { type SkillDef } from '../people/skills';
import { fractionOf, sumFun } from '../lib/basics';
import { type ClanProductionNodeReportItem } from './productionreport'
import { ProductionNodeReport } from './productionreport';

// A ProductionNode is an entity where labor, land, tools, and materials
// can be combined to produce goods. Examples include farms, fisheries, 
// and workshops. Models of ownership, access, and control may vary.
//
// Being able to play out what-if scenarios is crucial to optimization
// and empirical calculation of marginal quantities. Design for that may
// be somewhat of a work in progress.
export abstract class ProductionNode {
    report: ProductionNodeReport = new ProductionNodeReport(this);

    constructor(
        readonly name: string,
    ) {}

    get sortKey(): number {
        return 0;
    }

    get shortName(): string {
        return 'P'
    }

    get color(): string {
        return 'black';
    }

    // Total quantity of goods produced by this clan. Pure.
    abstract output(labor: Map<Clan, number>, clan: Clan): number;

    // Commit production to the producers' ProductionReports.
    abstract commit(labor: Map<Clan, number>): void;
}

export abstract class LandProductionNode extends ProductionNode {
    constructor(
        name: string,
        readonly land: number,
        readonly skillDef: SkillDef,
    ) {
        super(name);
    }
}

export class CommonsProductionNode extends LandProductionNode {
    constructor(
        readonly name: string,
        readonly land: number,
        readonly skillDef: SkillDef,
    ) {
        super(name, land, skillDef);
    }

    get sortKey(): number {
        return this.skillDef.sortKey;
    }

    get shortName(): string {
        return this.skillDef.name[0];
    }

    get color(): string {
        return this.skillDef.color;
    }
    
    landPerWorker(labor: Map<Clan, number>, clan: Clan): number {
        return this.land / (labor.get(clan) ?? 1);
    }

    // Production report for a given clan. Pure.
    computeClanReport(labor: Map<Clan, number>, clan: Clan): ClanProductionNodeReportItem {
        // - Assume output is linear in workers and land at this scale, 
        //   with both required.
        // - Assume users get equal shares of effective land.
        const effectiveLand = fractionOf(clan, labor) * this.land;
        const effectiveWorkers = labor.get(clan) ?? 0;
        const inputAmount = Math.min(effectiveLand, effectiveWorkers);

        const lpBase = this.skillDef.outputPerWorker;
        const lpMod = clan.productivity(this.skillDef);
        const lp = lpBase * lpMod;

        return {
            land: effectiveLand,
            labor: effectiveWorkers,
            laborProductivityFactor: lpMod,
            node: this,
            good: this.skillDef.outputGood!,
            amount: inputAmount * lp,
        };
    }

    // Output for a given clan. Pure.
    output(labor: Map<Clan, number>, clan: Clan): number {
        return this.computeClanReport(labor, clan).amount;
    }

    commit(labor: Map<Clan, number>): void {
        this.report = new ProductionNodeReport(this);

        for (const clan of labor.keys()) {
            const clanReport = this.computeClanReport(labor, clan);
            clan.production.accept(
                this, 
                clanReport.land, 
                clanReport.labor, 
                clanReport.laborProductivityFactor,
                this.skillDef.outputGood!,
                clanReport.amount,
            );

            this.report.accept(
                clanReport.land,
                clanReport.labor,
                this.skillDef.outputGood!,
                clanReport.amount,
            );
        }
    }
}
