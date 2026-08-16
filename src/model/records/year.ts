// Format a bare year number, for data (such as remembered events) that stores
// years as numbers rather than as Year objects.
export function formatYear(value: number): string {
    return value < 0 ? `${-value} BC` : `${value} AD`;
}

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
        return formatYear(this.value_);
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

