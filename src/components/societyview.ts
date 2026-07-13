import type { Settlement } from "../model/people/settlement";

export class SocietyView {
    readonly description: string[] = [];
    readonly long: string[] = [];

    readonly agricultureDescription: string = '';

    constructor(settlement?: Settlement) {
        if (settlement) {
            this.description = [];
            this.long = [];
            this.agricultureDescription = '';
        }
    }
}