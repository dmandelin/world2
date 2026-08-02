import { clamp } from "../lib/basics";
import { normal, poisson } from "../lib/distributions";

export const NUMERIC_TRAITS = ['piety', 'intellect'] as const;
export type NumericTrait = typeof NUMERIC_TRAITS[number];

export const BOOLEAN_TRAITS = [] as const;
export type BooleanTrait = string;

function randomTraitStat(): number {
    return clamp(Math.round(normal(50, 12)), 0, 100);
}

export class ClanTraits {
    private numeric: Record<string, number>;
    bitmap: number;

    constructor(numeric?: Partial<Record<NumericTrait, number>>, bitmap: number = 0) {
        this.numeric = {
            piety: numeric?.piety ?? randomTraitStat(),
            intellect: numeric?.intellect ?? randomTraitStat(),
        };
        this.bitmap = bitmap;
    }

    get piety(): number {
        return this.numeric['piety'] ?? 50;
    }

    set piety(val: number) {
        this.numeric['piety'] = clamp(Math.round(val), 0, 100);
    }

    get intellect(): number {
        return this.numeric['intellect'] ?? 50;
    }

    set intellect(val: number) {
        this.numeric['intellect'] = clamp(Math.round(val), 0, 100);
    }

    get(trait: string): number {
        return this.numeric[trait] ?? 0;
    }

    set(trait: string, val: number): void {
        this.numeric[trait] = clamp(Math.round(val), 0, 100);
    }

    hasBoolean(bitIndex: number): boolean {
        return (this.bitmap & (1 << bitIndex)) !== 0;
    }

    setBoolean(bitIndex: number, val: boolean): void {
        if (val) {
            this.bitmap |= (1 << bitIndex);
        } else {
            this.bitmap &= ~(1 << bitIndex);
        }
    }

    clone(): ClanTraits {
        return new ClanTraits({ ...this.numeric }, this.bitmap);
    }

    cloneWithSplitBump(): ClanTraits {
        const copy = this.clone();
        for (const key of NUMERIC_TRAITS) {
            const bump = Math.round(normal(0, 3));
            copy.set(key, copy.get(key) + bump);
        }
        for (let i = 0; i < BOOLEAN_TRAITS.length; i++) {
            if (Math.random() < 0.02) {
                copy.setBoolean(i, !copy.hasBoolean(i));
            }
        }
        return copy;
    }

    mutate(): void {
        for (const key of NUMERIC_TRAITS) {
            const change = poisson(1.5) - poisson(1.5);
            this.set(key, this.get(key) + change);
        }

        for (let i = 0; i < BOOLEAN_TRAITS.length; i++) {
            if (Math.random() < 0.005) {
                this.setBoolean(i, !this.hasBoolean(i));
            }
        }
    }
}