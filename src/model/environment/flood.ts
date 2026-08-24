import { clamp, dice, sumFun } from "../lib/basics";
import { plusOrMinus, weightedRandInt } from "../lib/distributions";
import { TradeGoods } from "../trade";
import type { Clan } from "../people/people";
import type { SettlementCluster } from "../people/cluster";
import type { NoteTaker } from "../records/notifications";

// Flooding.
//
// The rivers rise every year, and how far they rise decides what the year
// is worth. There are two kinds of flood:
//
// - "Normal" levels, from scant to abundant, which every settlement gets
//   one of every year. They set farm output and the odds of the river
//   shifting its bed. That's what this file models today.
// - Extreme floods (20-, 100-, and 500-year), which strike on top of the
//   normal level and destroy crops, housing, and people. Not yet modeled.
//
// Flooding is good in moderation and bad at either extreme: too little
// water and the fields go dry, too much and the crop drowns. Ditching
// trades labor for a flatter response to the same water, which is the
// long-run reason to build it.

// What is being flooded. The same water helps or hurts depending on what
// it lands on, so effects are looked up by land type rather than being
// properties of the flood alone. Housing types will join this later.
export type LandType = 'alluvium';

// How a flood level pays off on one land type, from no flood control up
// to full flood control.
export class FloodAgricultureEffect {
    constructor(
        // Yield factor with no ditching at all.
        readonly unditched: number,
        // Yield factor behind a sound ditch dug by a crew of middling skill.
        readonly ditched: number,
    ) {}

    // Yield factor for a given strength of flood control, where 0 is no
    // working ditch and 1 is a sound one dug by a crew of middling skill.
    // Skilled crews run past 1 and do better still.
    at(ditchEffect: number): number {
        return this.unditched + (this.ditched - this.unditched) * ditchEffect;
    }
}

export class FloodLevel {
    constructor(
        // Position in the scale, 0 (scant) through 4 (abundant).
        readonly index: number,
        readonly name: string,
        readonly description: string,
        private readonly agriculture: Record<LandType, FloodAgricultureEffect>,
        // Expected river shifts per year at this level.
        readonly expectedRiverShifts: number,
        // Share of built value lost to water damage in a year at this level.
        // Extreme floods will add their own damage on top of this.
        readonly damageFactor: number,
    ) {}

    agricultureOn(land: LandType = 'alluvium'): FloodAgricultureEffect {
        return this.agriculture[land];
    }

    riverShiftProbability(yearsElapsed: number = 1): number {
        return 1 - (1 - this.expectedRiverShifts) ** yearsElapsed;
    }

    // How hard the water pushes against the ditches in a given year: a
    // figure on the same scale as a ditch's rating, rising twenty points a
    // level and varying by a few points either way from year to year.
    randomRating(): number {
        return 20 * (this.index + 1) - 10 + dice(1, 10, 0) - dice(1, 10, 0);
    }

    static max(a: FloodLevel, b: FloodLevel): FloodLevel {
        return a.index > b.index ? a : b;
    }
}

// Unditched alluvium yields most at a moderate flood and falls away at
// either extreme. Behind a working ditch the curve turns the other way
// round: water held back in a scant year and carried off in an abundant one
// means the more water there is, the better the year, and an abundant flood
// becomes the best year of all rather than the worst.
export const FloodLevels = {
    Scant: new FloodLevel(
        0,
        'Scant',
        'The rivers barely rose; much of the land stayed dry',
        { alluvium: new FloodAgricultureEffect(0.60, 0.80) },
        0.002,
        0.00,
    ),
    Low: new FloodLevel(
        1,
        'Low',
        'The rivers rose less than usual',
        { alluvium: new FloodAgricultureEffect(0.75, 0.90) },
        0.005,
        0.01,
    ),
    Moderate: new FloodLevel(
        2,
        'Moderate',
        'The rivers rose about as they usually do',
        { alluvium: new FloodAgricultureEffect(0.90, 1.00) },
        0.010,
        0.02,
    ),
    High: new FloodLevel(
        3,
        'High',
        'The rivers rose more than usual',
        { alluvium: new FloodAgricultureEffect(0.75, 1.10) },
        0.015,
        0.04,
    ),
    Abundant: new FloodLevel(
        4,
        'Abundant',
        'The rivers spilled far across the fields',
        { alluvium: new FloodAgricultureEffect(0.60, 1.20) },
        0.020,
        0.07,
    ),
};

// In index order, so that a level can be stepped up or down.
export const FLOOD_LEVELS: readonly FloodLevel[] = [
    FloodLevels.Scant,
    FloodLevels.Low,
    FloodLevels.Moderate,
    FloodLevels.High,
    FloodLevels.Abundant,
];

// Probability of each level in the year's map-wide flow.
const BASE_LEVEL_WEIGHTS = [0.10, 0.20, 0.40, 0.20, 0.10];

// Chance for a cluster to sit one step off the map-wide level, and for a
// settlement to sit one step off its cluster's. Each is the chance of a
// step in one direction, so the chance of landing off-level is twice this.
const CLUSTER_STEP_PROBABILITY = 0.15;
const SETTLEMENT_STEP_PROBABILITY = 0.05;

export function floodLevelByIndex(index: number): FloodLevel {
    return FLOOD_LEVELS[clamp(Math.round(index), 0, FLOOD_LEVELS.length - 1)];
}

// This year's flow for the map as a whole, before local variation.
export function randomBaseFloodLevel(): FloodLevel {
    return FLOOD_LEVELS[weightedRandInt(FLOOD_LEVELS, l => BASE_LEVEL_WEIGHTS[l.index])];
}

// One local draw: usually the level it was handed, sometimes a step off it.
function steppedFrom(level: FloodLevel, stepProbability: number): FloodLevel {
    return floodLevelByIndex(level.index + plusOrMinus(stepProbability));
}

// Set this year's flood level everywhere: one map-wide flow, varied by
// cluster, then varied again by settlement.
export function updateFloodLevels(clusters: Iterable<SettlementCluster>): void {
    const baseLevel = randomBaseFloodLevel();
    for (const cluster of clusters) {
        const clusterLevel = steppedFrom(baseLevel, CLUSTER_STEP_PROBABILITY);
        cluster.updateFloodLevel(clusterLevel);
        for (const settlement of cluster.settlements) {
            settlement.updateFloodLevel(
                steppedFrom(clusterLevel, SETTLEMENT_STEP_PROBABILITY));
        }
    }
}

// ---------------------------------------------------------------------------
// Extreme floods
//
// On top of the year's normal level, the rivers occasionally break out
// altogether. Three kinds, named for how often they come: the 20-year flood
// over one cluster, the 100-year flood over half the land, and the 500-year
// flood over all of it. Each rolls its own "impact level", which doubles as
// the chance that any one clan in its path is actually caught, since even a
// great flood misses some fields and drowns others.
// ---------------------------------------------------------------------------

// The map the clusters are laid out on. Mirrors the map canvas in
// components/Map.svelte; the halves a 100-year flood picks between are
// defined against it.
export const MAP_WIDTH = 564;
export const MAP_HEIGHT = 492;

export type MapHalf = 'upriver' | 'downriver';

// The map splits along the line from its lower-left corner to its upper
// right. Above that line is upriver, to the northwest; below it, the stretch
// running down to the Gulf.
export function mapHalf(x: number, y: number): MapHalf {
    return x / MAP_WIDTH + y / MAP_HEIGHT < 1 ? 'upriver' : 'downriver';
}

export class ExtremeFloodKind {
    constructor(
        // Stable key, also the alert kind id.
        readonly key: 'flood20' | 'flood100' | 'flood500',
        readonly name: string,
        // How many years, typically, between floods of this kind.
        readonly returnPeriod: number,
        readonly annualProbability: number,
        readonly minImpact: number,
        readonly maxImpact: number,
        // Share of the year's crop a caught clan loses.
        readonly cropLoss: () => number,
        // Points of quality of life a caught clan loses.
        readonly qolDamage: () => number,
        // Chance a caught clan's people die in the water.
        readonly deathRisk: () => number,
        // How hard the water pushes, on a ditch's rating scale. Far past
        // anything a ditch around the fields can simply hold back.
        readonly rating: () => number,
    ) {}

    // How hard this particular flood came down, and so what share of the
    // clans in its path it catches. Two uniforms rather than one, to put a
    // hump in the middle of the range instead of a flat spread.
    randomImpact(): number {
        const span = this.maxImpact - this.minImpact;
        return this.minImpact + span * (Math.random() + Math.random()) / 2;
    }
}

export const ExtremeFloodKinds = {
    TwentyYear: new ExtremeFloodKind(
        'flood20', '20-year flood', 20, 0.05, 0.2, 0.5,
        () => Math.min(dice(1, 60, 0), dice(1, 60, 0)) / 100,
        () => Math.min(dice(1, 10, 0), dice(1, 10, 0)),
        () => 0,
        () => 125 + dice(1, 25, 0) - dice(1, 25, 0),
    ),
    HundredYear: new ExtremeFloodKind(
        'flood100', '100-year flood', 100, 0.01, 0.3, 0.6,
        () => Math.min(1, (30 + dice(1, 100, 0)) / 100),
        () => dice(1, 10, 0),
        () => 0.01,
        () => 150 + dice(1, 25, 0) - dice(1, 25, 0),
    ),
    FiveHundredYear: new ExtremeFloodKind(
        'flood500', '500-year flood', 500, 0.002, 0.4, 0.8,
        () => Math.min(1, (20 + dice(2, 60, 0)) / 100),
        () => Math.max(dice(1, 10, 0), dice(1, 10, 0)),
        () => dice(2, 5, 0) / 100,
        () => 200 + dice(1, 50, 0) - dice(1, 50, 0),
    ),
};

export const EXTREME_FLOOD_KINDS: readonly ExtremeFloodKind[] = [
    ExtremeFloodKinds.TwentyYear,
    ExtremeFloodKinds.HundredYear,
    ExtremeFloodKinds.FiveHundredYear,
];

// What one flood did to one clan.
export class ClanFloodImpact {
    // Filled in when the harvest is actually taken, so a flood can report
    // what it cost in grain and not only in percentages.
    cropsLost = 0;

    constructor(
        readonly flood: ExtremeFlood,
        readonly clan: Clan,
        readonly cropLoss: number,
        readonly qolDamage: number,
        readonly deathRisk: number,
        // Whether the settlement's ditch was deep enough to take the edge
        // off. It cannot hold water like this back, but it can carry some
        // of it away and spare the people the worst of the ruin.
        readonly ditchHelped: boolean,
    ) {}
}

// The stretch of land a flood covered. Each kind of flood has its own
// shape of area, and the map lens draws each of them differently.
export type FloodArea =
    | { readonly kind: 'cluster'; readonly cluster: SettlementCluster }
    | { readonly kind: 'half'; readonly half: MapHalf }
    | { readonly kind: 'map' };

// One extreme flood that happened this year.
export class ExtremeFlood {
    readonly impacts: ClanFloodImpact[] = [];

    constructor(
        readonly kind: ExtremeFloodKind,
        // 0-1: how much of its area this one really caught.
        readonly impact: number,
        readonly area: FloodArea,
        // How hard this one pushed, on a ditch's rating scale.
        readonly rating: number,
    ) {}

    // Where it struck, for display.
    get areaName(): string {
        switch (this.area.kind) {
            case 'cluster': return this.area.cluster.name;
            case 'half': return `the ${this.area.half} half`;
            case 'map': return 'the whole land';
        }
    }

    // Somewhere to send a player who clicks through, where there is one.
    get entity(): { uuid: string; name: string } | undefined {
        return this.area.kind === 'cluster' ? this.area.cluster : undefined;
    }

    // Whether a given clan stood in the flood's path at all.
    covers(clan: Clan): boolean {
        switch (this.area.kind) {
            case 'cluster': return clan.settlement.cluster === this.area.cluster;
            case 'half': return mapHalf(clan.settlement.x, clan.settlement.y) === this.area.half;
            case 'map': return true;
        }
    }

    // A ditch this far behind the water cannot hold it, but one better than
    // half its rating still drains and diverts enough to halve the misery.
    helpsAgainst(ditchRating: number): boolean {
        return ditchRating > this.rating / 2;
    }

    // Roll every clan in the path, and record the ones it caught.
    strike(clans: Iterable<Clan>): void {
        for (const clan of clans) {
            if (!this.covers(clan)) continue;
            if (Math.random() >= this.impact) continue;
            const ditchHelped = this.helpsAgainst(clan.settlement.ditchRating);
            const qolDamage = this.kind.qolDamage() * (ditchHelped ? 0.5 : 1);
            const item = new ClanFloodImpact(
                this, clan, this.kind.cropLoss(), qolDamage,
                this.kind.deathRisk(), ditchHelped);
            this.impacts.push(item);
            clan.floodDamage.add(item);
        }
    }

    // How many of the clans it caught had a ditch that took the edge off.
    get clansHelpedByDitches(): number {
        return this.impacts.filter(i => i.ditchHelped).length;
    }

    get clansAffected(): number {
        return this.impacts.length;
    }

    get peopleAffected(): number {
        return sumFun(this.impacts, i => i.clan.population);
    }

    get settlementsAffected(): number {
        return new Set(this.impacts.map(i => i.clan.settlement.uuid)).size;
    }

    get cropsLost(): number {
        return sumFun(this.impacts, i => i.cropsLost);
    }

    // Average quality-of-life damage among the clans it caught.
    get qolDamage(): number {
        return this.impacts.length
            ? sumFun(this.impacts, i => i.qolDamage) / this.impacts.length
            : 0;
    }

    // Deaths this flood accounts for, out of the year's drowning deaths in
    // the clans it caught, split among the floods by the risk each carried.
    get deaths(): number {
        let total = 0;
        for (const item of this.impacts) {
            const damage = item.clan.floodDamage;
            if (damage.totalDeathRisk <= 0) continue;
            total += damage.deaths * item.deathRisk / damage.totalDeathRisk;
        }
        return total;
    }
}

// Everything this year's floods did to one clan. Replaced each year.
export class ClanFloodDamage {
    readonly impacts: ClanFloodImpact[] = [];
    // Drowning deaths drawn in the population model, set once they are known.
    deaths = 0;

    constructor(readonly clan: Clan) {}

    add(impact: ClanFloodImpact): void {
        this.impacts.push(impact);
    }

    get affected(): boolean {
        return this.impacts.length > 0;
    }

    // Floods compound on what the earlier ones left standing rather than
    // simply adding up, so two half-losses take three quarters, not all.
    get cropLoss(): number {
        let remaining = 1;
        for (const impact of this.impacts) remaining *= 1 - impact.cropLoss;
        return 1 - remaining;
    }

    get cropsLost(): number {
        return sumFun(this.impacts, i => i.cropsLost);
    }

    get qolDamage(): number {
        return sumFun(this.impacts, i => i.qolDamage);
    }

    // Chance of drowning from the extreme floods alone, as competing risks.
    get extremeDeathRisk(): number {
        let survival = 1;
        for (const impact of this.impacts) survival *= 1 - impact.deathRisk;
        return 1 - survival;
    }

    // Including the background risk from the year's normal water level, so
    // that deaths drawn under the one 'Flood' cause can be split by source.
    get totalDeathRisk(): number {
        return this.extremeDeathRisk + this.clan.settlement.floodLevel.damageFactor;
    }

    // The distinct floods that caught this clan.
    get floods(): ExtremeFlood[] {
        return [...new Set(this.impacts.map(i => i.flood))];
    }

    // Record the grain the flood actually took, split among the floods in
    // proportion to what each of them claimed.
    recordCropsLost(amount: number): void {
        const shares = this.impacts.map(i => i.cropLoss);
        const total = shares.reduce((a, b) => a + b, 0);
        if (total <= 0) return;
        this.impacts.forEach((impact, i) => {
            impact.cropsLost += amount * shares[i] / total;
        });
    }
}

// Roll this year's extreme floods and see who they caught. Clears last
// year's damage, so it must run before anything reads it.
export function updateExtremeFloods(
    clusters: readonly SettlementCluster[],
    clans: readonly Clan[],
): ExtremeFlood[] {
    for (const clan of clans) clan.floodDamage = new ClanFloodDamage(clan);

    const floods: ExtremeFlood[] = [];

    // 20-year floods: every cluster rolls on its own.
    const k20 = ExtremeFloodKinds.TwentyYear;
    for (const cluster of clusters) {
        if (Math.random() < k20.annualProbability) {
            floods.push(new ExtremeFlood(
                k20, k20.randomImpact(), { kind: 'cluster', cluster }, k20.rating()));
        }
    }

    // 100-year floods: each half of the land rolls on its own.
    const k100 = ExtremeFloodKinds.HundredYear;
    for (const half of ['upriver', 'downriver'] as MapHalf[]) {
        if (Math.random() < k100.annualProbability) {
            floods.push(new ExtremeFlood(
                k100, k100.randomImpact(), { kind: 'half', half }, k100.rating()));
        }
    }

    // 500-year floods: one roll for the whole land.
    const k500 = ExtremeFloodKinds.FiveHundredYear;
    if (Math.random() < k500.annualProbability) {
        floods.push(new ExtremeFlood(
            k500, k500.randomImpact(), { kind: 'map' }, k500.rating()));
    }

    for (const flood of floods) flood.strike(clans);
    return floods;
}

// Take the flood's share of the year's crop, before any of it is eaten,
// stored, offered, or given away. Cereals only: the flood takes what was
// standing in the fields, not what came out of the water.
export function applyFloodCropLosses(clans: Iterable<Clan>): void {
    for (const clan of clans) {
        const damage = clan.floodDamage;
        if (!damage.affected) continue;
        const lost = clan.distribution.undistributed(TradeGoods.Cereals) * damage.cropLoss;
        if (lost <= 0) continue;
        clan.distribution.addFlood(TradeGoods.Cereals, lost);
        damage.recordCropsLost(lost);
    }
}

// The short label the event log keys the flood icon and tag off.
export const FLOOD_NOTE_LABEL = '\u{1F30A}';

// Write the year's floods into the event log. Called once the population
// change is drawn, so the note can say what the water actually cost.
export function noteExtremeFloods(noteTaker: NoteTaker, floods: readonly ExtremeFlood[]): void {
    for (const flood of floods) {
        if (flood.clansAffected === 0) continue;

        const places = flood.settlementsAffected === 1
            ? '1 settlement' : `${flood.settlementsAffected} settlements`;
        const clans = flood.clansAffected === 1
            ? '1 clan' : `${flood.clansAffected} clans`;
        const parts = [
            `${clans} in ${places}, ${flood.peopleAffected.toFixed(0)} people`,
            `${flood.cropsLost.toFixed(0)} of grain lost`,
            `${flood.qolDamage.toFixed(1)} quality of life each`,
        ];
        const deaths = flood.deaths;
        if (deaths >= 0.5) parts.push(`${deaths.toFixed(0)} drowned`);

        const entity = flood.entity;
        if (entity) {
            noteTaker.addNote(
                FLOOD_NOTE_LABEL,
                `A ${flood.kind.name} struck {0}`,
                parts.join(' \u00b7 '),
                [{ uuid: entity.uuid, name: entity.name }],
            );
        } else {
            noteTaker.addNote(
                FLOOD_NOTE_LABEL,
                `A ${flood.kind.name} struck ${flood.areaName}`,
                parts.join(' \u00b7 '),
            );
        }
    }
}
