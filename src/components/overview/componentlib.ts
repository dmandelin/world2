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
        checkFlooding,
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

function checkFlooding(settlement: SettlementDTO): SettlementIssue | undefined {
    if (settlement.floodLevel.damageFactor >= 0.05) {
        return { title: `${settlement.floodLevel.name} flooding!` };
    }
    return undefined;
}

function checkMigrations(settlement: SettlementDTO): SettlementIssue | undefined {
    const willMigrate = settlement.clans.filter(c => c.migrationPlan?.willMigrate).length;
    if (willMigrate) {
        return { title: `${willMigrate} clans will migrate` };
    }
    const wantToMove = settlement.clans.filter(c => c.migrationPlan?.wantToMove).length;
    if (wantToMove) {
        return { title: `${wantToMove} clans want to migrate` };
    }
    return undefined;
}

function checkHunger(settlement: SettlementDTO): SettlementIssue | undefined {
    const lowQuantity = settlement.clans.filter(c => c.happiness.getAppealNonNull('Food Quantity') < 0).length;
    if (lowQuantity) {
        return { title: `${lowQuantity} clans are unhappy due to lack of food` };
    }
    const lowQuality = settlement.clans.filter(c => c.happiness.getAppealNonNull('Food Quality') < 0).length;
    if (lowQuality) {
        return { title: `${lowQuality} clans are unhappy due to lack of food variety` };
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
