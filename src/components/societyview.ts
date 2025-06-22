import type { Settlement } from "../model/people/settlement";

export class SocietyView {
    readonly description: string[] = [];
    readonly long: string[] = [];

    readonly agricultureDescription: string = '';

    constructor(settlement?: Settlement) {
        if (settlement) {
            this.description = settlement.technai.description;
            this.long = settlement.technai.long;
            this.agricultureDescription = settlement.agricultureDescription;
        }
    }
}