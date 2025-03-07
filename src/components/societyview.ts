import type { Settlement } from "../model/settlement";

export class SocietyView {
    readonly description: string[] = [];
    readonly long: string[] = [];

    constructor(settlement?: Settlement) {
        if (settlement) {
            this.description = settlement.technai.description;
            this.long = settlement.technai.long;
        }
    }
}