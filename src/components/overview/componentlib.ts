import type { SettlementDTO } from "../dtos";

export type SettlementIssue = {
    title: string;
};

   // include:
    // - migration interest: any clans considering leaving
    // - hunger: nutrition below 1.0
    // - anomie: happiness penalty from population
    // - depopulation: negative population growth
export function settlementIssues(settlement: SettlementDTO): SettlementIssue[] {
    const issues: SettlementIssue[] = [];

    const checks = [
        checkMigrations,
        checkHunger,
        checkAnomie,
    ];

    for (const check of checks) {
        const issue = check(settlement);
        if (issue) {
            issues.push(issue);
        }
    }

    return issues;
}

function checkMigrations(settlement: SettlementDTO): SettlementIssue | undefined {
    if (settlement.clans.some(c => c.migrationPlan?.willMigrate)) {
        return { title: 'Some clans will migrate' };
    }
    if (settlement.clans.some(c => c.migrationPlan?.wantToMove)) {
        return { title: 'Some clans want to migrate' };
    }
    return undefined;
}

function checkHunger(settlement: SettlementDTO): SettlementIssue | undefined {
    if (settlement.clans.some(c => c.happiness.getAppealNonNull('Food Quantity') < 0)) {
        return { title: 'Some clans are unhappy due to lack of food' };
    }
    if (settlement.clans.some(c => c.happiness.getAppealNonNull('Food Quality') < 0)) {
        return { title: 'Some clans are unhappy due to lack of food variety' };
    }
    return undefined;
}

function checkAnomie(settlement: SettlementDTO): SettlementIssue | undefined {
    if (settlement.clans.some(c => c.happiness.getAppealNonNull('Society') < 0)) {
        return { title: 'Some clans are unhappy due to crowding' };
    }

    return undefined;
}
