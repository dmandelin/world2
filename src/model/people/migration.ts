import { clamp, maxby, sumFun } from "../lib/basics";
import { Clan, PersonalityTraits } from "./people";
import { crowdingValue } from "./qol";
import { randomHamletName } from "./names";
import { Settlement } from "./settlement";
import type { NoteTaker } from "../notifications";

export type MigrationTarget = Settlement | 'new';

export class MigrationCalc {
    readonly targets: Map<MigrationTarget, CandidateMigrationCalc>;
    readonly best: CandidateMigrationCalc;
    readonly willMigrate: boolean = false;

    constructor(readonly clan: Clan, dummy: boolean = false) {
        if (dummy) {
            this.targets = new Map();
            this.best = {
                clan: clan,
                target: 'new',
                items: [],
                value: 0,
            } as unknown as CandidateMigrationCalc;
            return;
        }

        const targets: MigrationTarget[] = [...clan.world.allSettlements, 'new'];
        this.targets = new Map(targets.map(target => 
            [target, new CandidateMigrationCalc(clan, target)]));

        this.best = maxby(this.targets.values(), item => item.value);
        this.willMigrate = this.best.target !== this.clan.settlement;
    }

    advance() {
        if (this.willMigrate) {
            migrateClan(this.clan, this.best.target, this.clan.world);
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
        return this.best.table;
    }
}

export class CandidateMigrationCalc {
    readonly items: CandidateMigrationCalcItem[];
    readonly value: number;

    constructor(readonly clan: Clan, readonly target: MigrationTarget) {
        this.items = [
            this.inertia(),
            this.fromPopulation(),
            this.fromLocalGoods(),
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

        let item: CandidateMigrationCalcItem;
        switch (true) {
            case this.clan.traits.has(PersonalityTraits.MOBILE): 
                item = {label: 'Mobile', value: -0.5}; break;
            case this.clan.traits.has(PersonalityTraits.SETTLED): 
                item = {label: 'Settled', value: -2}; break;
            default: 
                item = {label: 'Settling', value: -1}; break;
        }

        if (this.target !== 'new' && this.target.cluster !== this.clan.settlement.cluster) {
            item.label = `Far (${item.label})`;
            item.value = -4 + 2 * item.value;
        } else {
            item.label = `Near (${item.label})`;
        }

        return item;
    }

    private fromPopulation(): CandidateMigrationCalcItem {
        let item: CandidateMigrationCalcItem;
        if (this.target === 'new') {
            item = {label: 'Nrw settlement', value: -2};
        } else {
            item = {label: 'Crowding', value: crowdingValue(this.clan, this.target)};
        }
        return item;
    }

    private fromLocalGoods(): CandidateMigrationCalcItem {
        // Giving full credit for QoL differences causes everyone
        // to quickly collect in one place.
        const qlFactor = 0.25;
        let item: CandidateMigrationCalcItem;
        if (this.target === 'new') {
            item = {
                label: 'Goods like home', 
                value: qlFactor * this.clan.settlement.averageQoLFromGoods,
            };
        } else {
            item = {
                label: 'Local goods', 
                value: qlFactor * this.target.averageQoLFromGoods,
            };
        }
        
        // Don't let this get too huge.
        item.value = clamp(item.value, -5, 5);
        return item;
    }
}

type CandidateMigrationCalcItem = {
    label: string;
    value: number;
};

function migrateClan(clan: Clan, target: MigrationTarget, noteTaker: NoteTaker) {
    const source = clan.settlement!;
    let actualTarget: Settlement;
    let isNew = false;

    if (target === 'new') {
        actualTarget = clan.cluster.foundSettlement(randomHamletName(), source);
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