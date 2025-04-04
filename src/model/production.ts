// A production pot, where effort and/or resources from
// various source go in, and products come out to different
// receivers.

type Receiver = {
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

    clear() {
        this.contributors_ = 0;
        this.input_ = 0;
    }

    accept(contributors: number, input: number) {
        this.contributors_ += contributors;
        this.input_ += input;
    }
}