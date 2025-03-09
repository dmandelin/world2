import { clamp } from "./basics";
import type { Clans } from "./people";
import { Technai } from "./tech";

export class Settlement {
    readonly technai = new Technai();
    readonly popLimit = 300;

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

    get abandoned() {
        return this.clans.length === 0;
    }

    get size() {
        return this.clans.reduce((acc, clan) => acc + clan.size, 0);
    }

    get populationPressureModifier() {
        return clamp(Math.round(-20 * Math.log2(2 * this.size / this.popLimit)), -100, 0);
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
    }
}