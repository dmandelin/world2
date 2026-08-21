// A running total that stands and fades: something happened, it counted for
// a while, and it counts for less every year after. Used for the marks a
// ritual leaves on how one clan sees another -- how holy it takes them to be,
// and how much it feels it owes them.
//
// Unlike the items rebuilt from scratch each turn, a credit is booked once,
// where the thing happened, and then only decays. Decay is charged through a
// marker year, so it costs nothing to decay the same credit several times in
// a turn.
export class DecayingCredit {
    private value_ = 0;
    private throughYear_: number | undefined;
    private lastResultYear_: number | undefined;

    constructor(readonly halfLife: number) { }

    get value(): number { return this.value_; }
    get lastResultYear(): number | undefined { return this.lastResultYear_; }

    // Years since the most recent thing that added to this, or undefined if
    // nothing ever has.
    yearsSince(year: number): number | undefined {
        return this.lastResultYear_ === undefined
            ? undefined : year - this.lastResultYear_;
    }

    decayTo(year: number): void {
        if (this.throughYear_ === undefined) {
            this.throughYear_ = year;
            return;
        }
        const age = year - this.throughYear_;
        if (age <= 0) return;
        this.value_ *= Math.pow(0.5, age / this.halfLife);
        this.throughYear_ = year;
    }

    add(amount: number, year: number): void {
        this.decayTo(year);
        this.value_ += amount;
        this.lastResultYear_ = year;
    }

    protected copyInto(other: DecayingCredit): void {
        other.value_ = this.value_;
        other.throughYear_ = this.throughYear_;
        other.lastResultYear_ = this.lastResultYear_;
    }

    clone(): DecayingCredit {
        const c = new DecayingCredit(this.halfLife);
        this.copyInto(c);
        return c;
    }
}
