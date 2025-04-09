// A production pot, where effort and/or resources from
// various source go in, and products come out to different
// receivers.

type Receiver = {
    size: number;
    consumption: number;

    consumptionFromCommons: number;
    shareOfCommons: number;
}

export class Pot {
    private contributors_: number = 0;
    private input_: number = 0;

    constructor(
        readonly receivers: Receiver[],
    ) {}

    get contributors() {
        return this.contributors_;
    }

    get input() {
        return this.input_;
    }

    get baseProductivity() {
        return this.input / this.contributors;
    }

    get scaleFactor() {
        return Math.pow(this.contributors_ / 50, 1/6);
    }

    get output() {
        return this.scaleFactor * this.input_;
    }

    get tfp() {
        return this.baseProductivity * this.scaleFactor;
    }

    clone() {
        const c = new Pot(this.receivers);
        c.contributors_ = this.contributors_;
        c.input_ = this.input_;
        return c;
    }

    clear() {
        this.contributors_ = 0;
        this.input_ = 0;
    }

    accept(contributors: number, input: number) {
        this.contributors_ += contributors;
        this.input_ += input;
    }

    distribute() {
        const output = this.output;
        const total = this.receivers.reduce((acc, clan) => acc + clan.size, 0);
        for (const clan of this.receivers) {
            const share = clan.size / total;
            const outputShare = output * share;
            clan.shareOfCommons = share;
            clan.consumptionFromCommons = outputShare;
            clan.consumption += outputShare;
        }
    }
}