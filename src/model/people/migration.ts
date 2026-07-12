import { sumFun } from "../lib/basics";
import { Clan, PersonalityTraits } from "./people";
import { randomHamletName } from "./names";
import { eloSuccessProbability } from "../lib/modelbasics";
import { Settlement } from "./settlement";
import { SettlementCluster } from "./cluster";
import { getAlignment } from "../relations/alignment";
import type { World } from "../world";
import { normal } from "../lib/distributions";

class NewSettlementMigrationTarget {
    get name(): string { return 'New settlement'; }
    get population(): number { return 0; }
    get cluster(): SettlementCluster | undefined { return undefined; }
}

export const NewSettlement = new NewSettlementMigrationTarget();

export type MigrationTarget = Settlement | NewSettlementMigrationTarget;

export class NewSettlementDecisionReportItem {
    constructor(
        readonly clanName: string,
        readonly stayPutAppeal: number,
        readonly movingAppeals: number[],
        readonly isTopChoice: boolean[]
    ) { }
}

export class NewSettlementDecisionReport {
    readonly items: Record<string, NewSettlementDecisionReportItem> = {};

    constructor(
        readonly settlementName: string,
        readonly roundsRun: number
    ) { }
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
        this.filter();
    }

    private trigger() {
        // TODO - make clans that just split want to move more often.
        // TODO - trigger on local capital/resource scarcity
        const scale = 10 / Math.log10(9);
        const pMove = eloSuccessProbability(-20, this.clan.stress.value, scale);
        if (Math.random() < pMove) {
            this.wantToMove = true;
            this.wantToMoveReason = 'Stress';
        }
    }

    private filter() {
        for (const target of this.clan.settlement.cluster.settlements) {
            this.targets.set(target, new CandidateMigrationCalc(this.clan, target));
        }
        this.targets.set(NewSettlement, new CandidateMigrationCalc(this.clan, NewSettlement));
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
            !(target as Settlement).clans.some(c => getAlignment(c, clan) > 0.1)) {
            this.isEligible = false;
            this.isIneligibleReason = `No place for newcomers in ${target.name}`;
        }

        this.items = [
            this.inertia(),
            this.fromConflict(),
            this.fromLandAvailability(),
            this.fromStress(),
            this.random(),
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
        const farmingFraction = this.clan.effortAllocation.farmingRatio();
        if (farmingFraction === 0) {
            return { name: 'Land', reason: 'Not farming', value: 0 };
        }

        const targetLandRatio = 1; // TODO - remove when bringing back
        const landRatio = 1; // TODO - remove when bringing back

        return {
            name: 'Land',
            reason: 'Farming land',
            value: (targetLandRatio - landRatio) * farmingFraction * 50,
        }
    }

    private fromStress(): CandidateMigrationCalcItem {
        const value = this.target === this.clan.settlement ? this.clan.stress.value : 0;
        return { name: 'Stress', reason: 'Stress', value };
    }

    private random(): CandidateMigrationCalcItem {
        return { name: 'Random', reason: 'Random variation', value: normal(0, 2) };
    }
}

type CandidateMigrationCalcItem = {
    name: string;
    value: number;
    reason: string;
};

function getCompanyValue(n: number): number {
    if (n <= 1) return -20;
    if (n === 2) return -10;
    return Math.min(5, n - 3);
}

export function planMigration(world: World) {
    // 1. First call assessMigration on every clan in every settlement.
    for (const clan of world.allClans) {
        clan.assessMigration();
    }

    // 2. Agreement process per settlement
    for (const settlement of world.allSettlements) {
        const clans = settlement.clans;
        if (clans.length === 0) continue;

        // Max appeal of other targets for each clan (excluding NewSettlement)
        const maxOtherAppeals = new Map<Clan, number>();
        const stayPutAppeals = new Map<Clan, number>();

        for (const clan of clans) {
            const plan = clan.migrationPlan!;
            const stayPutCandidate = plan.targets.get(clan.settlement);
            stayPutAppeals.set(clan, stayPutCandidate ? stayPutCandidate.value : 0);

            let maxOther = -Infinity;
            for (const [target, candidate] of plan.targets.entries()) {
                if (target !== NewSettlement) {
                    const val = candidate.isEligible ? candidate.value : -Infinity;
                    if (val > maxOther) {
                        maxOther = val;
                    }
                }
            }
            maxOtherAppeals.set(clan, maxOther);
        }

        // We run a series of rounds
        const movingAppeals = new Map<Clan, number[]>();
        const isTopChoice = new Map<Clan, boolean[]>();

        for (const clan of clans) {
            const plan = clan.migrationPlan!;
            const initialNewVal = plan.targets.get(NewSettlement)?.value ?? 0;
            movingAppeals.set(clan, [initialNewVal]);

            const maxOther = maxOtherAppeals.get(clan) ?? -Infinity;
            isTopChoice.set(clan, [initialNewVal > maxOther]);
        }

        let roundsRun = 0;
        const maxRounds = 50;

        while (roundsRun < maxRounds) {
            // Clans with moving as top choice in the previous round and wantToMove is true
            const prevChoices = clans.filter(clan => {
                const choices = isTopChoice.get(clan)!;
                return choices[choices.length - 1] && clan.migrationPlan!.wantToMove;
            });
            const prevCount = prevChoices.length;

            // Company value based on prevCount
            const company = getCompanyValue(prevCount);

            // Compute effective appeal for each clan in this round
            const currentTopChoices: Clan[] = [];
            for (const clan of clans) {
                const initialNewVal = movingAppeals.get(clan)![0];
                const randVal = normal(0, 2);
                const roundVal = initialNewVal + randVal + company;

                movingAppeals.get(clan)!.push(roundVal);

                const maxOther = maxOtherAppeals.get(clan) ?? -Infinity;
                const top = roundVal > maxOther;
                isTopChoice.get(clan)!.push(top);

                if (top && clan.migrationPlan!.wantToMove) {
                    currentTopChoices.push(clan);
                }
            }

            roundsRun++;

            // Termination condition
            const allPrevStillWant = prevChoices.every(c => currentTopChoices.includes(c));
            const noneWant = currentTopChoices.length === 0;

            if (allPrevStillWant || noneWant) {
                break;
            }
        }

        // TODO - later consider the alignment and capability of other clans in this process.

        // Create the report
        const report = new NewSettlementDecisionReport(settlement.name, roundsRun);
        for (const clan of clans) {
            const item = new NewSettlementDecisionReportItem(
                clan.name,
                stayPutAppeals.get(clan) ?? 0,
                movingAppeals.get(clan) ?? [],
                isTopChoice.get(clan) ?? []
            );
            report.items[clan.uuid] = item;
        }
        settlement.newSettlementDecisionReport = report;

        // Record the decisions
        const finalTopChoices = clans.filter(clan => {
            const choices = isTopChoice.get(clan)!;
            return choices[choices.length - 1] && clan.migrationPlan!.wantToMove;
        });

        const agreedToMigrate = finalTopChoices.length > 0;

        for (const clan of clans) {
            const plan = clan.migrationPlan!;
            if (agreedToMigrate && finalTopChoices.includes(clan)) {
                plan.willMigrate = true;
                plan.best = plan.targets.get(NewSettlement);
            } else {
                plan.willMigrate = false;
                plan.best = plan.targets.get(clan.settlement);
            }
        }
    }
}

export function migrate(world: World) {
    const migratingBySource = new Map<Settlement, Clan[]>();

    for (const clan of world.allClans) {
        clan.previousSettlement_ = clan.settlement;
        const plan = clan.migrationPlan;
        if (plan && plan.willMigrate && plan.best) {
            const target = plan.best.target;
            if (target === NewSettlement) {
                const source = clan.settlement;
                if (!migratingBySource.has(source)) {
                    migratingBySource.set(source, []);
                }
                migratingBySource.get(source)!.push(clan);
            } else {
                // Individual migration to an existing settlement (fallback/just in case)
                const actualTarget = target as Settlement;
                clan.moveTo(actualTarget);
                clan.traits.delete(PersonalityTraits.SETTLED);
                clan.traits.add(PersonalityTraits.MOBILE);
                world.addNote(
                    '↔',
                    `Clan ${clan.name} moved from ${clan.previousSettlement.name} to ${actualTarget.name}`,
                );
            }
        }
    }

    // Execute group new-settlement migrations
    for (const [source, migratingClans] of migratingBySource.entries()) {
        if (migratingClans.length === 0) continue;

        const newSettlementName = randomHamletName();
        const newSettlement = source.cluster.foundSettlement(newSettlementName, source);

        for (const clan of migratingClans) {
            clan.moveTo(newSettlement);
            clan.traits.delete(PersonalityTraits.SETTLED);
            clan.traits.add(PersonalityTraits.MOBILE);
            world.addNote(
                '✨',
                `Clan ${clan.name} moved from ${source.name} to found ${newSettlement.name}`,
            );
        }
    }
}