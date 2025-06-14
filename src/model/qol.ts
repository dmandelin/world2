import { harmonicMean } from "./basics";
import type { Clan } from "./people";

export class QolCalc {
    readonly sats: [string, string][];
    readonly items: [string, string][];

    readonly numericSats: [string, number][];
    readonly value: number;

    constructor(readonly clan: Clan) {
        const ritualSat = clan.settlement!.clans.rites.quality
            ? 50 + Math.log2(clan.settlement!.clans.rites.quality) * 15
            : 10;
        this.numericSats = [
            ['Subsistence', 50 + Math.log2(clan.perCapitaSubsistenceConsumption) * 15],
            ['Ritual', ritualSat],
        ];

        this.sats = this.numericSats.map(([name, value]) => {
            return [name, value.toFixed(1)];
        });
        const fromSats = harmonicMean(this.numericSats.map(([_, value]) => value));

        const localAveragePrestige = clan.selfAndNeighbors.reduce((acc, clan) => 
            acc + clan.averagePrestige, 0)
         / clan.selfAndNeighbors.length;

        const items: [string, number][] = [
            ['Satisfaction', fromSats],
            ['Status', (clan.averagePrestige - localAveragePrestige) / 2],
            ['Intelligence', (clan.intelligence - 50) / 15],
            ['Strength', (clan.intelligence - 50) / 15],
            ['Crowding', clan.settlement!.populationPressureModifier],
        ];

        this.items = items.map(([name, value]) => {
            return [name, value.toFixed(1)];
        });
        this.value = items.reduce((acc, [_, value]) => acc + value, 0);
    }

    getSat(name: 'Subsistence' | 'Ritual'): number {
        return this.numericSats.find(([n, _]) => n === name)?.[1] ?? 0;
    }
}