export class Year {
    // Negative is BC, positive is AD, zero is unused.
    private value = -6500;

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

    toString() {
        return this.value < 0 ? `${-this.value} BC` : `${this.value} AD`;
    }
}

