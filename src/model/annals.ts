import type { World } from "./world";
import { Year } from "./year";

export class Annals {
    records: Record[] = [];

    constructor(readonly world?: World) {}

    get year() {
        return this.world?.year ?? new Year();
    }

    log(text: string) {
        this.records.push(new Record(this.year, text));
    }
}

export class Record {
    constructor(readonly year: Year, readonly text: string) {}
}