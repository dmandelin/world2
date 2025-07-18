import type { Settlement } from "./people/settlement";
import type { World } from "./world";
import { Year } from "./records/year";

export class Annals {
    records: Record[] = [];

    constructor(readonly world?: World) {}

    get year() {
        return this.world?.year.clone() ?? new Year();
    }

    log(text: string, settlement?: Settlement) {
        this.records.push(new Record(this.year, text, settlement));
    }
}

export class Record {
    constructor(readonly year: Year, readonly text: string, readonly settlement?: Settlement) {}
}