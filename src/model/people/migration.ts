import { Clan, PersonalityTraits } from "./people";
import { Settlement } from "./settlement";
import { maxby, sumFun } from "../lib/basics";
import { crowdingValue } from "./qol";

export type MigrationTarget = Settlement | 'new';

export class MigrationCalc {
    readonly targets: Map<MigrationTarget, CandidateMigrationCalc>;
    readonly best: CandidateMigrationCalc;

    constructor(readonly clan: Clan) {
        const targets: MigrationTarget[] = [...clan.world.allSettlements, 'new'];
        this.targets = new Map(targets.map(target => 
            [target, new CandidateMigrationCalc(clan, target)]));

        this.best = maxby(this.targets.values(), item => item.value);
    }
}

export class CandidateMigrationCalc {
    readonly items: CandidateMigrationCalcItem[];
    readonly value: number;

    constructor(readonly clan: Clan, readonly target: MigrationTarget) {
        this.items = [
            this.inertia(),
            this.fromPopulation()
        ];
        this.value = sumFun(this.items, item => item.value);
    }

    private inertia(): {label: string, value: number} {
        switch (true) {
            case this.clan.traits.has(PersonalityTraits.MOBILE): return {label: 'Mobile', value: 0};
            case this.clan.traits.has(PersonalityTraits.SETTLED): return {label: 'Settled', value: -2};
            default: return {label: 'Settling', value: -1};
        }
    }

    private fromPopulation(): CandidateMigrationCalcItem {
        if (this.target === 'new') {
            return {label: 'New settlement', value: -5};
        } else {
            return {label: 'Crowding', value: crowdingValue(this.clan, this.target)};
        }
    }
}

type CandidateMigrationCalcItem = {
    label: string;
    value: number;
};
