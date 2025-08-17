export class Year {
    // Negative is BC, positive is AD, zero is unused.
    readonly start = -6500;
    private value = this.start;

    clone(): Year {
        const year = new Year();
        year.value = this.value;
        return year;
    }

    advance(years: number) {
        let newValue = this.value + years;
        if (this.value < 0 && newValue >= 0) ++newValue;
        this.value = newValue;
    }

    yearsSince(year?: Year) {
        return this.value - (year ? year.value : this.start);
    }

    toString() {
        return this.value < 0 ? `${-this.value} BC` : `${this.value} AD`;
    }

    add(years: number): Year {
        const newYear = this.clone();
        newYear.advance(years);
        return newYear;
    }

    sub(year: Year): number {
        return this.value - year.value;
    }
}

