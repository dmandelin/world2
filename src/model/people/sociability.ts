// What Sociability does to a clan's work.
//
// A sociable clan gets less done at toil -- the nets, the fields, the
// ditches -- where the company is a distraction, and more done at the
// festivals, where the company is the point. Each is a factor per standard
// deviation of the trait from 50, compounding, and the two mirror each other:
//
//     toil      90% per SD: 90% at 65, 81% at 80, 111% at 35
//     festival  110% per SD: 110% at 65, 121% at 80, 91% at 35
//
// Leisure has no productivity to speak of, so it takes neither.

export const SOCIABILITY_SD = 15;
export const SOCIABILITY_TOIL_FACTOR_PER_SD = 0.9;
export const SOCIABILITY_FESTIVAL_FACTOR_PER_SD = 1.1;

export function toilSociabilityFactor(sociability: number): number {
    return Math.pow(SOCIABILITY_TOIL_FACTOR_PER_SD, (sociability - 50) / SOCIABILITY_SD);
}

export function festivalSociabilityFactor(sociability: number): number {
    return Math.pow(SOCIABILITY_FESTIVAL_FACTOR_PER_SD, (sociability - 50) / SOCIABILITY_SD);
}
