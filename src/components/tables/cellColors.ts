// Cell background colors shared between tables, so the same quantity reads
// the same way wherever it is shown.

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
