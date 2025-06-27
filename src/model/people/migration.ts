import { Clan, PersonalityTraits } from "./people";
import { Settlement } from "./settlement";
import { maxby, sumFun } from "../lib/basics";
import { crowdingValue } from "./qol";

export type MigrationTarget = Settlement | 'new';

export class MigrationCalc {
    readonly targets: Map<MigrationTarget, CandidateMigrationCalc>;
    readonly best: CandidateMigrationCalc;

    constructor(readonly clan: Clan, dummy: boolean = false) {
        if (dummy) {
            this.targets = new Map();
            this.best = {
                clan: clan,
                target: 'new',
                items: [],
                value: 0
            } as unknown as CandidateMigrationCalc;
            return;
        }

        const targets: MigrationTarget[] = [...clan.world.allSettlements, 'new'];
        this.targets = new Map(targets.map(target => 
            [target, new CandidateMigrationCalc(clan, target)]));

        this.best = maxby(this.targets.values(), item => item.value);
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
        return this.best.table;
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

    get table(): string[][] {
        const header = ['Item', 'Value'];
        const rows = this.items.map(item => [item.label, item.value.toFixed(1)]);
        return [header, ...rows, ['Total', this.value.toFixed(1)]];
    }

    private inertia(): CandidateMigrationCalcItem {
        if (this.target === this.clan.settlement) {
            switch (true) {
                case this.clan.traits.has(PersonalityTraits.MOBILE):
                     return {label: 'Home area', value: 0};
                default: 
                    return {label: 'Home', value: 0};
            }
        }

        switch (true) {
            case this.clan.traits.has(PersonalityTraits.MOBILE): 
                return {label: 'Mobile', value: -0.5};
            case this.clan.traits.has(PersonalityTraits.SETTLED): 
                return {label: 'Settled', value: -2};
            default: 
                return {label: 'Settling', value: -1};
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
