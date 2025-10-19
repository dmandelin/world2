// Alignment represents how much clan A thinks helping clan B is
// good and hurting clan B is bad.

import {AttitudeCalc} from './attitude';
import {Clan} from './people';
import {sumFun} from '../lib/basics';
import {normal} from '../lib/distributions';

class AlignmentInferenceCalcItem {
    constructor(
        readonly name: string,
        readonly value: number) {}
}

class AlignmentInferenceCalc {
    readonly itemMap: Map<string, AlignmentInferenceCalcItem> = new Map<string, AlignmentInferenceCalcItem>();

    constructor(readonly clan: Clan, readonly other: Clan) {
        this.add('Kinship', this.kinship());
        this.add('Marriage', this.clan.marriagePartners.get(this.other) ?? 0);
        if (this.clan !== this.other) {
            this.add('Neighborhood', this.neighborhood());
            this.add('Random', normal(0, 0.1));
        }
    }

    get items(): AlignmentInferenceCalcItem[] {
        return [...this.itemMap.values()];
    }

    private add(name: string, value: number): AlignmentInferenceCalcItem {
        const item = new AlignmentInferenceCalcItem(name, value);
        this.itemMap.set(name, item);
        return item;
    }

    private kinship(): number {
        return this.clan.kinshipTo(this.other);
    }

    private neighborhood(): number {
        if (this.clan.settlement !== this.other.settlement) {
            return 0;
        }
        if (this.clan.seniority === 0 || this.other.seniority === 0) {
            return 0;
        }
        return 0.25 / (1 + this.clan.settlement.population / 150);
    }

    get value(): number {
        return sumFun([...this.itemMap.values()], item => item.value);
    }
}

export class AlignmentCalc extends AttitudeCalc<AlignmentInferenceCalc> {
    createInferenceCalc(): AlignmentInferenceCalc {
        return new AlignmentInferenceCalc(this.clan, this.other);
    }

    modelViewOf(model: Clan, other: Clan): AlignmentCalc {
        return model.alignmentViewOf(other)!;
    }

    get useInferenceOnlyOnSelf(): boolean { return true; }
}