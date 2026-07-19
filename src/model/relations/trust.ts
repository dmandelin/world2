import type { Clan } from "../people/people";
import type { ClanDTO } from "../records/dtos";
import { getAlignment } from "./alignment";
import { getRelativeAttention } from "./basicinteraction";

export const TRUST_DECAY_ALPHA = 0.5;

export class Trust {
    value: number = 0.5;

    // Track detailed breakdown for tooltips
    target: number = 0.5;
    alignment: number = 0;
    relativeAttention: number = 0;
    prevTrust: number = 0.5;

    update(subject: Clan, object: Clan): void {
        this.prevTrust = this.value;
        this.alignment = getAlignment(subject, object);
        this.relativeAttention = getRelativeAttention(subject, object);
        
        // Target: 0.5 + alignment + (relativeAttention / 2)
        // Bounded by [alignment, 1.0] and overall [0, 1.0]
        const rawTarget = 0.5 + this.alignment + (this.relativeAttention / 2);
        this.target = Math.max(0, Math.max(this.alignment, Math.min(1.0, rawTarget)));
        
        this.value = TRUST_DECAY_ALPHA * this.prevTrust + (1.0 - TRUST_DECAY_ALPHA) * this.target;
    }
}
