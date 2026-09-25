// What Talkativeness does to a clan's work.
//
// A clan that talks a lot gets less done at toil -- the nets, the fields, the
// ditches -- where the talk is a distraction, and a little more done at work
// that is mostly people: looking after them, and the festivals. Each is a
// factor per standard deviation of the trait from 50, compounding:
//
//     toil      90% per SD: 90% at 65, 81% at 80, 111% at 35
//     sociable  105% per SD: 105% at 65, 110% at 80, 95% at 35
//
// Leisure has no productivity to speak of, so it takes neither.

export const TALKATIVENESS_SD = 15;
export const TALK_TOIL_FACTOR_PER_SD = 0.9;
export const TALK_SOCIABLE_FACTOR_PER_SD = 1.05;

export function toilTalkFactor(talkativeness: number): number {
    return Math.pow(TALK_TOIL_FACTOR_PER_SD, (talkativeness - 50) / TALKATIVENESS_SD);
}

export function sociableTalkFactor(talkativeness: number): number {
    return Math.pow(TALK_SOCIABLE_FACTOR_PER_SD, (talkativeness - 50) / TALKATIVENESS_SD);
}
