import type { MigrationCalc } from "../../model/people/migration";
import type { SettlementDTO } from "../dtos";

export type SettlementIssue = {
    title: string;
    details?: string[];
};

export type SettlementEvent = {
    title: string;
    details?: string[];
};

export function settlementEvents(settlement: SettlementDTO): SettlementEvent[] {
    return settlementChecks(settlement, [
        checkFlooding,
    ]);
}

export function settlementIssues(settlement: SettlementDTO): SettlementIssue[] {
    return settlementChecks(settlement, [
        checkMigrations,
        checkHunger,
        checkAnomie,
    ]);
}

type SettlementCheck<T> = (settlement: SettlementDTO) => T | T[] | undefined;

export function settlementChecks<T>(settlement: SettlementDTO, checks: SettlementCheck<T>[]): T[] {
    const items: T[] = [];

    for (const check of checks) {
        const itemOrItems = check(settlement);
        if (itemOrItems) {
            if (Array.isArray(itemOrItems)) {
                items.push(...itemOrItems);
            } else {
                items.push(itemOrItems);
            }
        }
    }

    return items;
}

function checkFlooding(settlement: SettlementDTO): SettlementIssue | undefined {
    if (settlement.floodLevel.damageFactor >= 0.05) {
        return { title: `${settlement.floodLevel.name} flooding!` };
    }
    return undefined;
}

function checkMigrations(settlement: SettlementDTO): SettlementIssue[] {
    let [willMigrate, wantToMove] = [0, 0];
    let willMigrateDetails = new Set<string>();
    let wantToMoveDetails = new Set<string>();

    for (const clan of settlement.clans) {
        if (!clan.migrationPlan) continue;
        if (clan.migrationPlan.willMigrate) {
            ++willMigrate;
            if (clan.migrationPlan.wantToMoveReason) {
                willMigrateDetails.add(clan.migrationPlan.wantToMoveReason);
            }
        } else if (clan.migrationPlan.wantToMove) {
            ++wantToMove;
            if (clan.migrationPlan.wantToMoveReason) {
                wantToMoveDetails.add(clan.migrationPlan.wantToMoveReason);
            }
        }
    }

    const issues: SettlementIssue[] = [];
    if (willMigrate) {
        issues.push({ 
            title: `${willMigrate} clans will migrate`, 
            details: Array.from(willMigrateDetails) 
        });
    }
    if (wantToMove) {
        issues.push({ 
            title: `${wantToMove} clans want to migrate`, 
            details: Array.from(wantToMoveDetails) 
        });
    }
    return issues;
}

function checkHunger(settlement: SettlementDTO): SettlementIssue | undefined {
    const lowQuantity = settlement.clans.filter(c => c.happiness.getAppealNonNull('Food Quantity') < 0).length;
    if (lowQuantity) {
        return { title: `${lowQuantity} clans are unhappy due to lack of food` };
    }
    return undefined;
}

function checkAnomie(settlement: SettlementDTO): SettlementIssue | undefined {
    const unhappyClans = settlement.clans.filter(c => c.happiness.getAppealNonNull('Society') < 0).length;
    if (unhappyClans) {
        return { title: `${unhappyClans} clans are unhappy due to crowding` };
    }

    return undefined;
}
