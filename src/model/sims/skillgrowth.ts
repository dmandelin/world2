import { weightedRandInt } from "../lib/distributions";
import { moveToward } from "../lib/modelbasics";

export function simulateSkillGrowth() {
    // Set up the equivalent of 3-5 clans, then apply some
    // high-level formulas and see how things go.

    const migrationProbability = 0.1;

    const n = 5;
    const values = new Array(n).fill(0);
    console.log(0, values.join(' '));
    for (let turn = 0; turn < 50; ++turn) {
        const newValues = [...values];

        if (Math.random() < migrationProbability) {
            const i = Math.floor(Math.random() * values.length);
            values[i] -= 3;
        }

        for (let i = 0; i < values.length; ++i) {
            const imitationRoll = weightedRandInt(values, v => 2 ** v);
            if (values[imitationRoll] != values[i]) {
                newValues[i] = moveToward(values[i], values[imitationRoll], 3)
            } else {
                const b = 0.25;
                const p = 0.5;
                const learningRoll = Math.random();
                if (learningRoll < p * (1 - b)) {
                    ++newValues[i];
                } else if (learningRoll >= 1 - p * b) {
                    --newValues[i];
                }
            }
        }

        values.splice(0);
        values.push(...newValues);
        console.log(turn + 1, values.join(' '));
    }
}