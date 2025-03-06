import type { Clans } from "./people";
import { Technai } from "./tech";

export class Settlement {
    readonly technai = new Technai();

    static doomLimit = 5;
    doomClock = Settlement.doomLimit;

    message = '';

    constructor(
        readonly name: string, 
        readonly x: number,
        readonly y: number,
        readonly clans: Clans) {
        
        for (const clan of clans) {
            clan.settlement = this;
        }
    }

    get size() {
        return this.clans.reduce((acc, clan) => acc + clan.size, 0);
    }

    private lastSizeChange_ = 0;

    get lastSizeChange() {
        return this.lastSizeChange_;
    }

    advance() {
        const sizeBefore = this.size;
        this.technai.advance(this.size);
        this.clans.advance();
        this.lastSizeChange_ = this.size - sizeBefore;

        if (this.size > 300) {
            this.doomClock -= 1;
            if (this.doomClock === 0) {
                this.message = 'The people all moved out to escape overcrowding.';
                this.clans.splice(0, this.clans.length);
            } else {
                this.message = `Too many people for this area! Will emigrate in ${this.doomClock} turns.`;
            }
        } else {
            this.doomClock = Settlement.doomLimit;
        }
    }
}