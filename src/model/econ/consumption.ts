import { Consumption } from "./flows";

export { Consumption };

export class ConsumptionGood {
    constructor(
        readonly good: any,
        public consumed: number,
        public wasted: number,
        public stored: number,
    ) { }
}
