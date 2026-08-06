export class Year {
    // Negative is BC, positive is AD, zero is unused.
    // We account for priming turns.
    readonly start = -6500 - 2;
    private value_ = this.start;

    get value(): number {
        return this.value_;
    }

    isMultipleOf(n: number): boolean {
        return this.value_ % n === 0;
    }

    clone(): Year {
        const year = new Year();
        year.value_ = this.value_;
        return year;
    }

    advance(years: number) {
        let newValue = this.value_ + years;
        if (this.value_ < 0 && newValue >= 0) ++newValue;
        this.value_ = newValue;
    }

    yearsSince(year?: Year) {
        return this.value_ - (year ? year.value_ : this.start);
    }

    toString() {
        return this.value_ < 0 ? `${-this.value_} BC` : `${this.value_} AD`;
    }

    add(years: number): Year {
        const newYear = this.clone();
        newYear.advance(years);
        return newYear;
    }

    sub(year: Year): number {
        return this.value_ - year.value_;
    }
}

