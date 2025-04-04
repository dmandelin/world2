import { clamp } from "./basics";
import type { Clans } from "./clans";
import { Technai } from "./tech";

export class Settlement {
    readonly technai = new Technai(this);

    parent: Settlement|undefined;
    daughters: Settlement[] = [];

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

    get popLimit() {
        // Initially we assume people are taking advantage of small natural
        // fields of barley, lentils, and such, for a population limit of 300.
        //
        // Once there is irrigation, we'll assume people can irrigate a wide
        // area and are willing to commute up to 1.5 km to work in the fields.
        // This gives a population limit of 1000.
        return this.technai.hasIrrigation ? 1000 : 300;
    }

    get agricultureDescription() {
        if (this.size < 300 || !this.technai.hasIrrigation) {
            return 'We\'re farming small fields of barley and lentils we found by the river.';
        } else {
            return 'We\'re farming fields we irrigated using canals.';
        }
    }

    get populationPressureModifier() {
        return this.populationPressureModifierWith(0);
    }

    populationPressureModifierWith(additionalPeople: number) {
        if (this.size == 0) return 0;
        return clamp(Math.round(-15 * Math.log2(2 * (this.size + additionalPeople) / this.popLimit)), -100, 0);
    }
    
    get localQOLModifier() {
        return this.populationPressureModifier + this.technai.outputBoost;
    }

    localQOLModifierWith(additionalPeople: number) {
        return this.populationPressureModifierWith(additionalPeople) + this.technai.outputBoost;
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