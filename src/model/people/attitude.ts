import { sumFun } from '../lib/basics';
import { Clan } from './people';

export class AttitudeCalcItem {
    weight: number;

    constructor(
        readonly name: string,
        readonly value: number,
        readonly sourcePrestige: number) {
            this.weight = this.baseWeight;
        }

    get baseWeight(): number {
        return Math.pow(1.02, this.sourcePrestige);
    }
}

export abstract class AttitudeCalc<InferenceCalc extends {value: number}> {
    readonly heritagePrestige_ = 0;
    readonly inferencePrestige_ = 0;

    private inferred_: InferenceCalc;
    private heritage_: number|undefined;

    private items_: AttitudeCalcItem[];
    private bufferedItems_: AttitudeCalcItem[] = [];

    constructor(readonly clan: Clan, readonly other: Clan) {
        this.inferred_ = this.createInferenceCalc();
        this.items_ = [new AttitudeCalcItem(
            'Inferred', this.inferred_.value, this.inferencePrestige_)];
    }

    abstract createInferenceCalc(): InferenceCalc;

    abstract modelViewOf(model: Clan, other: Clan): AttitudeCalc<InferenceCalc>;

    get useInferenceOnlyOnSelf(): boolean {
        return false;
    }

    private buffer(name: string, value: number, sourcePrestige: number) {
        this.bufferedItems_.push(new AttitudeCalcItem(name, value, sourcePrestige));
    }

    startUpdate() {
        this.heritage_ = this.value;
        this.inferred_ = this.createInferenceCalc();

        this.bufferedItems_ = [];
        this.buffer('Inferred', this.inferred_.value, this.inferencePrestige_);

        if (this.clan !== this.other || !this.useInferenceOnlyOnSelf) {
            if (this.heritage_ !== undefined) {
                this.buffer('Heritage', this.heritage_, this.heritagePrestige_);
            }

            if (this.clan.settlement!.population < 300) {
                for (const model of this.clan.prestigeViews.keys()) {
                    if (model === this.other || model === this.clan) continue;
                    this.buffer(
                        model.name, 
                        this.modelViewOf(model, this.other)!.value, 
                        this.clan.prestigeViewOf(model)!.value);
                }
            }
        }

        // Normalize weights.
        const w = sumFun(this.bufferedItems_, item => item.baseWeight);
        for (const item of this.bufferedItems_) {
            item.weight = item.baseWeight / w;
        }
    }

    commitUpdate() {
        this.items_ = this.bufferedItems_;
        this.bufferedItems_ = [];
    }

    get inference(): InferenceCalc {
        return this.inferred_;
    }

    get items(): AttitudeCalcItem[] {
        return this.items_;
    }

    get value(): number {
        return sumFun(this.items_, item => item.value * item.weight);
    }
}
