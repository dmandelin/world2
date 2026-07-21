import { clamp, sumFun } from "../lib/basics";
import type { Clan } from "../people/people";
import { GenericItem } from "../records/basicdata";
import { getAlignment } from "./alignment";
import { getRelativeAttention } from "./basicinteraction";
import type { Conflict } from "./conflict";

export const TRUST_DECAY_ALPHA = 0.5;

export class Trust {
    value: number = 0.5;
    prevTrust: number = 0.5;
    items: GenericItem[] = [];

    get target(): number {
        return clamp(sumFun(this.items, item => item.value), 0, 1);
    }

    get alignment(): number {
        return this.items.find(i => i.label === 'Alignment')?.value ?? 0;
    }

    get relativeAttention(): number {
        return (this.items.find(i => i.label === 'Relative Attention')?.value ?? 0) * 2;
    }

    update(subject: Clan, object: Clan, conflict?: Conflict): void {
        this.prevTrust = this.value;
        const alignmentVal = getAlignment(subject, object);
        const relAttnVal = getRelativeAttention(subject, object);
        conflict = conflict ?? subject.world?.conflicts?.get(subject, object);

        this.items = [
            new GenericItem('Base', 0.5, 'Base target trust'),
            new GenericItem('Alignment', alignmentVal, 'Overall clan alignment'),
            new GenericItem('Relative Attention', relAttnVal / 2, 'Attention devoted to relationship'),
            ...(conflict ? [conflict.conflictItem(subject)] : []),
        ];

        this.value = TRUST_DECAY_ALPHA * this.prevTrust + (1.0 - TRUST_DECAY_ALPHA) * this.target;
    }

    clone(): Trust {
        const t = new Trust();
        t.value = this.value;
        t.prevTrust = this.prevTrust;
        t.items = [...this.items];
        return t;
    }
}

