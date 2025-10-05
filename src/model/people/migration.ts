import { clamp, sumFun } from "../lib/basics";
import { Clan, PersonalityTraits } from "./people";
import { normal } from "../lib/distributions";
import { randomHamletName } from "./names";
import { selectBySoftmax } from "../lib/modelbasics";
import { Settlement } from "./settlement";
import { SettlementCluster } from "./cluster";
import type { NoteTaker } from "../records/notifications";
import { SkillDefs } from "./skills";

export type MigrationTarget = Settlement | 'new';

export class NewSettlementSupplier {
    private readonly newBySource: Map<Settlement, Settlement> = new Map();

    constructor() { }

    get(cluster: SettlementCluster, source: Settlement): Settlement {
        // We assume that clans from the same source found a village
        // together, but clans from different sources are independent.
        if (this.newBySource.has(source)) {
            return this.newBySource.get(source)!;
        }

        const name = randomHamletName();
        const newSettlement = cluster.foundSettlement(name, source);
        this.newBySource.set(source, newSettlement);
        return newSettlement;
    }
}

export class MigrationCalc {
    wantToMove: boolean = false;
    wantToMoveReason: string = '';

    othersLeftFirst: boolean = false;

    targets: Map<MigrationTarget, CandidateMigrationCalc> = new Map();
    best: CandidateMigrationCalc | undefined;
    willMigrate: boolean = false;

    constructor(readonly clan: Clan, dummy: boolean = false) {
        if (dummy) return;

        this.trigger();

        // We really only need this if moving but it can be nice to
        // see the data.
        this.filter();
        if (this.wantToMove) {
            this.select();
            this.decide();
        }
    }

    private trigger() {
        // TODO - restore
        // TODO - make clans that just split want to move more often.
        if (Math.random() < 0.05) {
            this.wantToMove = true;
            this.wantToMoveReason = 'Clan events';
            return;
        }

        if (this.clan.happiness.getAppealNonNull('Food Quantity') < 0) {
            this.wantToMove = true;
            this.wantToMoveReason = 'Hunger';
            return;
        }

        if (this.clan.happiness.getAppealNonNull('Society') < 0) {
            this.wantToMove = true;
            this.wantToMoveReason = 'Crowding';
            return;
        }
    }

    private filter() {
        const stayCalc = new CandidateMigrationCalc(this.clan, undefined, this.clan.settlement);
        for (const target of this.clan.settlement.cluster.settlements) {
            this.targets.set(target, new CandidateMigrationCalc(this.clan, stayCalc, target));
        }
        this.targets.set('new', new CandidateMigrationCalc(this.clan, stayCalc, 'new'));
    }

    private select() {
        this.best = selectBySoftmax(
            this.targets.values().filter(v => v.isEligible),
            item => item.value);
    }

    private decide() {
        this.willMigrate = Boolean(this.best?.isEligible);
    }

    advance(newSettlementSupplier: NewSettlementSupplier): boolean {
        if (this.willMigrate) {
            migrateClan(this.clan, this.best!.target, newSettlementSupplier, this.clan.world);
            return true;
        } else {
            return false;
        }
    }

    get targetsTable(): string[][] {
        const header = ['Target', 'Value'];
        const rows = Array.from(this.targets.entries()).map(([target, calc]) => [
            target === 'new' ? 'New settlement' : target.name,
            calc.value.toFixed(1)
        ]);
        return [header, ...rows];
    }

    get bestTargetTable(): string[][] {
        return [];
    }
}

export class CandidateMigrationCalc {
    isEligible: boolean = true;
    isIneligibleReason: string = '';

    readonly items: CandidateMigrationCalcItem[];
    readonly value: number;

    constructor(readonly clan: Clan, readonly stayCalc: CandidateMigrationCalc | undefined, readonly target: MigrationTarget) {
        if (target !== 'new' && target.population > 400) {
            this.isEligible = false;
            this.isIneligibleReason = `Crowded, not accepting newcomers`;
        }

        this.items = [
            this.inertia(),
            this.fromPopulation(),
            this.fromLandAvailability(),
            this.fromRitual(),
        ];
        this.value = sumFun(this.items, item => item.value);

        if (this.stayCalc && this.value < this.stayCalc.value) {
            this.isEligible = false;
            this.isIneligibleReason = `No better than home (${this.stayCalc.value.toFixed(1)})`;
        }

        if (clan.settlement === target) {
            this.isEligible = false;
            this.isIneligibleReason = 'Already at home';
        }
    }

    private inertia(): CandidateMigrationCalcItem {
        if (this.target === this.clan.settlement) {
            switch (true) {
                case this.clan.traits.has(PersonalityTraits.MOBILE):
                    return { name: 'Inertia', reason: 'Home area', value: 0 };
                default:
                    if (this.clan.settlement === this.clan.settlement.cluster.mother) {
                        return { name: 'Inertia', reason: 'Home village', value: 2 };
                    }
                    return { name: 'Inertia', reason: 'Home', value: 0 };
            }
        }

        let item: CandidateMigrationCalcItem;
        switch (true) {
            case this.clan.traits.has(PersonalityTraits.MOBILE):
                item = { name: 'Inertia', reason: 'Mobile', value: -0.5 }; break;
            case this.clan.traits.has(PersonalityTraits.SETTLED):
                item = { name: 'Inertia', reason: 'Settled', value: -2 }; break;
            default:
                item = { name: 'Inertia', reason: 'Settling', value: -1 }; break;
        }

        if (this.target !== 'new' && this.target.cluster !== this.clan.settlement.cluster) {
            item.reason = `Far (${item.reason})`;
            item.value = -4 + 2 * item.value;
        } else {
            item.reason = `Near (${item.reason})`;
        }

        return item;
    }

    private fromPopulation(): CandidateMigrationCalcItem {
        let item: CandidateMigrationCalcItem;
        if (this.target === 'new') {
            item = { name: 'Pop', reason: 'New settlement', value: 0 };
        } else {
            item = { name: 'Pop', reason: 'Society', value: this.target.averageAppealFrom('Society') };
        }
        return item;
    }

    private fromLandAvailability(): CandidateMigrationCalcItem {
        // Originally we had an item for local standard of living, but this
        // caused clans to move a lot to be near the richest clan, which isn't
        // totally wrong, but wasn't actually helping them.
        //
        // But to the extent a clan depends on farmland, if they can plant
        // more than they have locally, that's a reason.
        const farmingFraction = this.clan.laborAllocation.allocs.get(SkillDefs.Agriculture) ?? 0;
        const landRatio = this.clan.settlement.productionNode(SkillDefs.Agriculture)
            .landPerWorker(this.clan);
        const targetLandRatio = this.target === 'new' 
            ? 1.0
            : this.target.productionNode(SkillDefs.Agriculture).landPerWorker();

        return {
            name: 'Land',
            reason: 'Farming land',
            value: (targetLandRatio - landRatio) * farmingFraction * 50,
        }
    }

    private fromRitual(): CandidateMigrationCalcItem {
        let item: CandidateMigrationCalcItem;
        if (this.target === 'new') {
            item = {
                name: 'Ritual',
                reason: 'New village',
                value: this.clan.settlement.rites[0]?.estimatedAppealWith(
                    // Assume the clan expects neighbors soon enough.
                    this.clan.population * 2) ?? 0,
            };
        } else {
            // This will help them avoid immediate overcrowding.
            const newPop = this.target == this.clan.settlement
                ? this.target.population
                : this.target.population + this.clan.population;
            item = {
                name: 'Ritual',
                reason: 'Rituals',
                value: this.target.rites[0]?.estimatedAppealWith(newPop) ?? 0,
            };
        }

        return item;
    }
}

type CandidateMigrationCalcItem = {
    name: string;
    value: number;
    reason: string;
};

function migrateClan(
    clan: Clan,
    target: MigrationTarget,
    newSettlementSupplier: NewSettlementSupplier,
    noteTaker: NoteTaker) {

    const source = clan.settlement!;
    let actualTarget: Settlement;
    let isNew = false;

    if (target === 'new') {
        actualTarget = newSettlementSupplier.get(source.cluster, source);
        isNew = true;
    } else {
        actualTarget = target;
    }

    clan.moveTo(actualTarget);
    clan.traits.delete(PersonalityTraits.SETTLED);
    clan.traits.add(PersonalityTraits.MOBILE);

    if (!isNew) {
        noteTaker.addNote(
            '↔',
            `Clan ${clan.name} moved from ${source.name} to ${actualTarget.name}`,
        );
    }
}