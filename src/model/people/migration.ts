import { clamp, sumFun } from "../lib/basics";
import { selectBySoftmax } from "../lib/modelbasics";
import { Clan, PersonalityTraits } from "./people";
import { crowdingValue } from "./qol";
import { randomHamletName } from "./names";
import { Settlement } from "./settlement";
import type { NoteTaker } from "../notifications";

export type MigrationTarget = Settlement | 'new';

export class MigrationCalc {
    qolThreshold: number = 0;
    qolThresholdReason: string = '';

    wantToMove: boolean = false;
    wantToMoveReason: string = '';

    targets: Map<MigrationTarget, CandidateMigrationCalc> = new Map();
    best: CandidateMigrationCalc| undefined;
    willMigrate: boolean = false;

    constructor(readonly clan: Clan, dummy: boolean = false) {
        if (dummy) return;

        this.prepare();
        this.trigger();

        // We really only need this if moving but it can be nice to
        // see the data.
        this.filter();
        if (this.wantToMove) {  
            this.select();
            this.decide();
        }
    }

    private prepare() {
        switch (true) {
            case this.clan.traits.has(PersonalityTraits.MOBILE):
                this.qolThreshold = 0;
                this.qolThresholdReason = 'Mobile';
                break;
            case this.clan.traits.has(PersonalityTraits.SETTLED):
                this.qolThreshold = -20;
                this.qolThresholdReason = 'Settled';
                break;
            default:
                this.qolThreshold = -10;
                this.qolThresholdReason = 'Settling';
        }
    }

    private trigger() {
        // TODO - make clans that just split want to move more often.
        if (Math.random() < 0.05) {
            this.wantToMove = true;
            this.wantToMoveReason = 'Clan events';
        } else if (this.clan.qol >= this.qolThreshold) {
            this.wantToMove = false;
            this.wantToMoveReason = `QoL ${this.clan.qol.toFixed(1)} >= ${this.qolThreshold} (${this.qolThresholdReason})`;
        } else if (Math.random() < 0.75) {
            this.wantToMove = false;
            this.wantToMoveReason = `Not ready to go, although QoL ${this.clan.qol.toFixed(1)} < ${this.qolThreshold} (${this.qolThresholdReason})`;
        } else {
            this.wantToMove = true;
            this.wantToMoveReason = `QoL ${this.clan.qol.toFixed(1)} < ${this.qolThreshold} (${this.qolThresholdReason})`;
        }
    }

    private filter() {
        const stayCalc = new CandidateMigrationCalc(this.clan, undefined, this.clan.settlement);
        for (const target of this.clan.settlement.cluster.settlements) {
            this.targets.set(target,  new CandidateMigrationCalc(this.clan, stayCalc, target));
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

    advance() {
        if (this.willMigrate) {
            migrateClan(this.clan, this.best!.target, this.clan.world);
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

    constructor(readonly clan: Clan, readonly stayCalc: CandidateMigrationCalc|undefined, readonly target: MigrationTarget) {
        if (target !== 'new' && target.population > 400) {
            this.isEligible = false;
            this.isIneligibleReason = `Crowded, not accepting newcomers`;
        }

        this.items = [
            this.inertia(),
            this.fromPopulation(),
            this.fromLocalGoods(),
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
                     return {name: 'Inertia', reason: 'Home area', value: 0};
                default: 
                    return {name: 'Inertia', reason: 'Home', value: 0};
            }
        }

        let item: CandidateMigrationCalcItem;
        switch (true) {
            case this.clan.traits.has(PersonalityTraits.MOBILE): 
                item = {name: 'Inertia', reason: 'Mobile', value: -0.5}; break;
            case this.clan.traits.has(PersonalityTraits.SETTLED): 
                item = {name: 'Inertia', reason: 'Settled', value: -2}; break;
            default: 
                item = {name: 'Inertia', reason: 'Settling', value: -1}; break;
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
            item = {name: 'Pop', reason: 'New settlement', value: -2};
        } else {
            item = {name: 'Pop', reason: 'Crowding', value: crowdingValue(this.clan, this.target)};
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
                name: 'Goods',
                reason: 'Goods like home', 
                value: qlFactor * this.clan.settlement.averageQoLFromGoods,
            };
        } else {
            item = {
                name: 'Goods',
                reason: 'Local goods', 
                value: qlFactor * this.target.averageQoLFromGoods,
            };
        }
        
        // Don't let this get too huge.
        item.value = clamp(item.value, -5, 5);
        return item;
    }
}

type CandidateMigrationCalcItem = {
    name: string;
    value: number;
    reason: string;
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