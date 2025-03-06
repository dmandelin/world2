import { normal } from "./distributions";

export class Technai {
    irrigationXP = 0;

    advance(population: number) {
        const popFactor = Math.pow(population / 100, 1.1);
        const xpRoll = normal(10, 5);
        const xpGain = popFactor * xpRoll;
        this.irrigationXP += Math.round(xpGain);
    }

    get irrigationLevel() {
        switch (true) {
            case this.irrigationXP < 50:
                return 0;
            default:
                return 1;
        }
    }

    get irrigationDescription() {
        if (this.irrigationLevel == 0)
            return `(${this.irrigationXP}/50) Learning to dig ditches to control flooding`;
        else
            return 'Flood control ditches';
    }

    get outputFactor() {
        return this.irrigationLevel == 0 ? 1 : 1.1;
    }
}