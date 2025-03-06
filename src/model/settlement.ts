import type { Clan, Clans } from "./people";

export class Settlement {
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

    advance() {
        this.clans.advance();

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