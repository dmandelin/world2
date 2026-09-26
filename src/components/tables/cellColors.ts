// Cell background colors shared between tables, so the same quantity reads
// the same way wherever it is shown.

// Conversation appeal reads as warmth: how drawn one clan is to another's
// company. Cool, quiet slate for the ones it keeps away from, soft apricot
// deepening toward terracotta for the ones it seeks out. Brackets every 0.1
// either side of a neutral 0.95-1.05.
const APPEAL_COOL = ["#e9eef0", "#d8e1e6", "#c4d2da", "#adc1cc", "#94aebd"];
const APPEAL_WARM = ["#fbeedc", "#f7ddbd", "#f2c79b", "#eaad7c", "#df9063"];

export function conversationAppealStyle(value: number): string | undefined {
    const steps = Math.floor(Math.abs(value - 1) / 0.1 + 0.5);
    if (steps === 0) return undefined;
    const palette = value > 1 ? APPEAL_WARM : APPEAL_COOL;
    return `background-color: ${palette[Math.min(steps, palette.length) - 1]};`;
}

// Conversation in people reads as how lively it gets: still and pale at
// nothing, through butter and apricot, to a bright coral-rose where the talk
// fizzes. Brackets of 10 people, the last open-ended from 90.
const CONVERSATION_AMOUNT_PALETTE = [
    "#f4f1ea", "#f3ecd2", "#f4e3b0", "#f6d88c", "#f7c870",
    "#f6b25f", "#f39a58", "#ec805b", "#e0676a", "#d0547d",
];

export function conversationAmountStyle(value: number): string | undefined {
    const i = Math.min(CONVERSATION_AMOUNT_PALETTE.length - 1,
        Math.max(0, Math.floor(value / 10)));
    return `background-color: ${CONVERSATION_AMOUNT_PALETTE[i]};`;
}

// Conversation value reads as how much good a clan got of it: pale at
// nothing, through a soft sage, to a deep green where the company was both
// plentiful and wanted. Brackets of 10%, the last open-ended from 90%, which
// is about where knowing nearly all of a clan one likes lands.
const CONVERSATION_VALUE_PALETTE = [
    "#f3f4ef", "#e8efdf", "#dbe8cc", "#cce0b8", "#bbd6a3",
    "#a8ca8e", "#93bc7b", "#7dad6b", "#679c5e", "#528a54",
];

export function conversationValueStyle(value: number): string | undefined {
    const i = Math.min(CONVERSATION_VALUE_PALETTE.length - 1,
        Math.max(0, Math.floor(value * 10)));
    return `background-color: ${CONVERSATION_VALUE_PALETTE[i]};`;
}

// Affinity reads as kinship of spirit: pale below 0.4, where clans have
// little in common, through lilac to a deep plum where they are as alike as
// clans get. Brackets of 0.1 from 0.4, the last open-ended from 0.9.
const AFFINITY_PALETTE = [
    "#f1ecf4", "#e4d9ec", "#d4c3e1", "#c1abd4", "#ad92c5", "#9678b3",
];

export function affinityStyle(value: number): string | undefined {
    if (!(value >= 0.4)) return undefined;
    const i = Math.min(AFFINITY_PALETTE.length - 1, Math.floor((value - 0.4) * 10));
    return `background-color: ${AFFINITY_PALETTE[i]};`;
}

// Alignment reads as goodwill: a dusty rose deepening to brick for clans
// that wish another ill, a soft sky deepening to slate blue for clans that
// wish it well. Brackets every 0.2 either side of a neutral -0.1 to +0.1, so
// the palette runs out only at the strongest feelings, 0.9 and past.
const ALIGNMENT_ILL = ["#f7e6e3", "#efd0ca", "#e5b6ad", "#d9998e", "#c97b6f"];
const ALIGNMENT_WELL = ["#e6eef6", "#d0e0ee", "#b7cfe4", "#9bbcd8", "#7fa7ca"];

export function alignmentStyle(value: number): string | undefined {
    const steps = Math.floor(Math.abs(value) / 0.2 + 0.5);
    if (steps === 0) return undefined;
    const palette = value > 0 ? ALIGNMENT_WELL : ALIGNMENT_ILL;
    return `background-color: ${palette[Math.min(steps, palette.length) - 1]};`;
}
