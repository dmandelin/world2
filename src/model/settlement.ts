import { average, chooseFrom } from "./basics";
import type { Clans } from "./clans";
import type { Rites } from "./rites";
import { Technai } from "./tech";
import type { TradeGood } from "./trade";
import type { World } from "./world";

class DaughterSettlementPlacer {
    readonly places = 12;
    private radius = Math.random() * 10 + 15;
    private originAngle = Math.random() * 2 * Math.PI;
    readonly openPlaces = Array.from({ length: this.places }, (_, i) => i);
    private jitter = 3;

    constructor(readonly settlement: Settlement) {}

    placeFor(parent: Settlement): [number, number] {
        if (!this.openPlaces.length) {
            this.radius *= 1.5;
            this.jitter *= 1.5;
            this.originAngle = Math.random() * 2 * Math.PI / this.places;
            this.openPlaces.push(...Array.from({ length: this.places }, (_, i) => i));
        }
        const place = chooseFrom(this.openPlaces, true);

        const angle = this.originAngle + place * (2 * Math.PI / this.places);
        const x = this.settlement.x + this.radius * Math.cos(angle) + this.generateJitter();
        const y = this.settlement.y + this.radius * Math.sin(angle) + this.generateJitter();
        return [Math.round(x), Math.round(y)];
    }

    private generateJitter() {
        return (Math.random() * 2 - 1) * this.jitter;
    }
}

export class Settlement {
    readonly technai = new Technai(this);
    readonly localTradeGoods = new Set<TradeGood>();

    parent: Settlement|undefined;
    readonly daughters: Settlement[] = [];
    readonly daughterPlacer = new DaughterSettlementPlacer(this);

    constructor(
        readonly world: World,
        readonly name: string, 
        readonly x: number,
        readonly y: number,
        readonly clans: Clans) {
        
        for (const clan of clans) {
            clan.settlement = this;
        }
    }

    get areaSettlements(): Settlement[] {
        const settlements = [];
        const work: Settlement[] = [this];
        while (work) {
            const s = work.pop()!;
            if (!s) break;
            settlements.push(s);
            for (const d of s.daughters) {
                work.push(d);
            }
        }
        return settlements;
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

    get rites(): Rites[] {
        return [this.clans.rites, ...this.clans.map(clan => clan.rites)];
    }

    get averageQoL() {
        return average(this.clans.map(clan => clan.qol));
    }

    private lastSizeChange_ = 0;

    get lastSizeChange() {
        return this.lastSizeChange_;
    }

    advance() {
        const sizeBefore = this.size;
 
        this.technai.advance(this.size);
        this.clans.advance();
        this.advanceRites();
 
        this.lastSizeChange_ = this.size - sizeBefore;
    }

    advanceRites(updateOptions: boolean = true) {
        // Planning for clan rites isn't important yet and introduces a lot of notification noise.
        this.clans.rites.plan(updateOptions);
        this.attendRites();
        for (const rites of this.rites) {
            rites.perform();
        }
    }

    attendRites() {
        console.log(`Attending rites in ${this.name}`);
    }
}