import { sumFun } from "../lib/basics";
import { Clan, PersonalityTraits } from "./people";
import { randomHamletName } from "./names";
import { eloSuccessProbability, selectBySoftmaxVerbose, type SoftmaxSelection } from "../lib/modelbasics";
import { Settlement } from "./settlement";
import { SettlementCluster } from "./cluster";
import type { NoteTaker } from "../records/notifications";
import { SkillDefs } from "./skills";

class NewSettlementMigrationTarget {
    get name(): string { return 'New settlement'; }
    get population(): number { return 0; }
    get cluster(): SettlementCluster | undefined { return undefined; }
}

export const NewSettlement = new NewSettlementMigrationTarget();

export type MigrationTarget = Settlement | NewSettlementMigrationTarget;

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
    softmaxSelection: SoftmaxSelection<CandidateMigrationCalc> | undefined;
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
        // TODO - make clans that just split want to move more often.
        if (Math.random() < 0.05) {
            this.wantToMove = true;
            this.wantToMoveReason = 'Clan events';
            return;
        }

        this.clan.settlement.productionNode(SkillDefs.Agriculture).landPerWorker(this.clan)
        if (this.clan.happiness.getAppealNonNull('Food Quantity') < 0) {
            // Hungry, but this creates a desire to move only if there's
            // some reason to think moving will help. At present the main
            // thing that changes is farmland availability.
            // TODO - consider opportunities to learn productive skills
            // TODO - consider local infrastructure
            if ((this.clan.laborAllocation.allocs.get(SkillDefs.Agriculture) ?? 0 > 0) &&
                this.clan.settlement.productionNode(SkillDefs.Agriculture).landPerWorker(this.clan) < 1) {
                this.wantToMove = true;
                this.wantToMoveReason = 'Land';
                return;
            }
        }

        // 99% chance of staying put at 0 conflict happiness, but 90% chance
        // of considering move if -12 or lower.
        const conflictAppeal = this.clan.happiness.getValue('Conflict');
        if (conflictAppeal < 0 && Math.random() < eloSuccessProbability(-8, conflictAppeal, 4)) {
            this.wantToMove = true;
            this.wantToMoveReason = 'Conflict';
            return;
        }
    }

    private filter() {
        for (const target of this.clan.settlement.cluster.settlements) {
            this.targets.set(target, new CandidateMigrationCalc(this.clan, target));
        }
        this.targets.set(NewSettlement, new CandidateMigrationCalc(this.clan, NewSettlement));
    }

    private select() {
        this.softmaxSelection = selectBySoftmaxVerbose(
            this.targets.values(),
            item => item.isEligible ? item.value : -Infinity
        );
        for (const [calc, prob] of this.softmaxSelection.probabilities.entries()) {
            calc.selectionProbability = prob;
        }
        this.best = this.softmaxSelection.selected;
    }

    private decide() {
        this.willMigrate = this.best !== undefined && this.best.target !== this.clan.settlement;
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
            target.name,
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
    selectionProbability: number = 0;

    constructor(readonly clan: Clan, readonly target: MigrationTarget) {
        if (target !== clan.settlement 
            && target !== NewSettlement &&
            !(target as Settlement).clans.some(c => c.kinshipTo(clan) > 0.1)) {
            this.isEligible = false;
            this.isIneligibleReason = `No place for newcomers in ${target.name}`;
        }

        this.items = [
            this.inertia(),
            this.fromConflict(),
            this.fromLandAvailability(),
        ];
        this.value = sumFun(this.items, item => item.value);
    }

    private inertia(): CandidateMigrationCalcItem {
        const moveType = this.moveType();
        if (moveType === 'home') {
            switch (true) {
                case this.clan.traits.has(PersonalityTraits.MOBILE):
                    return { name: 'Inertia', reason: 'Home (Mobile)', value: 1 };
                case this.clan.traits.has(PersonalityTraits.SETTLED):
                    return { name: 'Inertia', reason: 'Home (Settled)', value: 5 };
                default:
                    return { name: 'Inertia', reason: 'Home', value: 2 };
            }
        }

        if (moveType === 'new') {
            switch (true) {
                case this.clan.traits.has(PersonalityTraits.MOBILE):
                    return { name: 'Inertia', reason: 'New (Mobile)', value: -2 };
                case this.clan.traits.has(PersonalityTraits.SETTLED):
                    return { name: 'Inertia', reason: 'New (Settled)', value: -8 };
                default:
                    return { name: 'Inertia', reason: 'New', value: -5 };
            }
        }

        if (moveType === 'local') {
            switch (true) {
                case this.clan.traits.has(PersonalityTraits.MOBILE):
                    return { name: 'Inertia', reason: 'Local (Mobile)', value: -1 };
                case this.clan.traits.has(PersonalityTraits.SETTLED):
                    return { name: 'Inertia', reason: 'Local (Settled)', value: -5 };
                default:
                    return { name: 'Inertia', reason: 'Local', value: -2 };
            }
        }

        if (moveType === 'distant') {
            switch (true) {
                case this.clan.traits.has(PersonalityTraits.MOBILE):
                    return { name: 'Inertia', reason: 'Distant (Mobile)', value: -3 };
                case this.clan.traits.has(PersonalityTraits.SETTLED):
                    return { name: 'Inertia', reason: 'Distant (Settled)', value: -10 };
                default:
                    return { name: 'Inertia', reason: 'Distant', value: -5 };
            }
        }

        throw new Error(`Unknown move type ${moveType}`);
    }

    private moveType(): 'home' | 'new' | 'local' | 'distant' {
        switch (true) {
            case this.target === this.clan.settlement:
                return 'home';
            case this.target === NewSettlement:
                return 'new';
            case this.target.cluster === this.clan.settlement.cluster:
                return 'local';
            default:
                return 'distant';
        }
    }

    private fromConflict(): CandidateMigrationCalcItem {
        let item: CandidateMigrationCalcItem;
        if (this.target instanceof NewSettlementMigrationTarget) {
            item = { name: 'Conflict', reason: 'New settlement', value: 0 };
        } else {
            item = { name: 'Conflict', reason: 'Conflict', value: this.target.averageAppealFrom('Conflict') };
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
        const targetLandRatio = this.target instanceof NewSettlementMigrationTarget 
            ? 1.0
            : this.target.productionNode(SkillDefs.Agriculture).landPerWorker();

        return {
            name: 'Land',
            reason: 'Farming land',
            value: (targetLandRatio - landRatio) * farmingFraction * 50,
        }
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

    if (target instanceof NewSettlementMigrationTarget) {
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