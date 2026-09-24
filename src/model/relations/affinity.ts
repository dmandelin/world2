// Affinity: how similar and compatible one clan finds another.
//
// Where alignment is how much A cares about B's welfare, affinity is how much
// A and B are the same sort of people: whether they are family, whether they
// live the same way, whether they simply get on. It is the stuff that makes
// cooperation come easily and conflict cut deeper.
//
// It is made of factors, each between 0 and 1, averaged together:
//
//     Kinship     whether one is a cadet of the other
//     Residence   how alike they are in time spent living in the settlement
//     Livelihood  how alike they are in farming against fishing
//     Temperament an unexplained liking, unique to the pair, slowly drifting
//
// A clan has affinity exactly 1 with itself: it is its own kin and lives
// exactly as it does. Two clans that
// are identical in every respect but are not the same clan come to 1 apart
// from temperament.
//
// Affinity is directional. The factors above are symmetric except for
// temperament, which is part shared by the pair and part each side's own. What
// makes it really directional is the RELATIVE reading: a clan's affinity for
// another measured against its affinity for all the clans it knows. A clan
// with few ties sets a low bar, so its one cadet clan stands out; a clan
// with many finds the same tie unremarkable.
//
//     relative = (absolute - mean) / (1 - mean)
//
// where mean is the subject's average absolute affinity over the other clans
// it knows. The rescaling keeps a clan's relative affinity for itself at 1;
// clans it likes less than usual read negative.
//
// ---------------------------------------------------------------------------
// How the calculation is written
// ---------------------------------------------------------------------------
//
// Following eudaimonia.ts: ONE implementation, with an optional trace sink.
// The turn loop passes no sink and gets plain arithmetic behind one branch;
// the Affinity panel replays the same function with a sink to show every
// factor. If you add a factor: add the local, add its `put` to the trace
// function beneath, and add it to AFF_NODES.

import type { Clan } from "../people/people";
import type { ClanDTO } from "../records/dtos";
import type { World } from "../world";
import { normal } from "../lib/distributions";
import { KinConnection } from "./connection";

// --- Tuning ---------------------------------------------------------------

// Temperament is 0.5 plus two parts, each wandering on its own:
//
//     shared  how well the two get on, the same seen from either side
//     own     what each side makes of it, drawn separately for each direction
//
// Each part is a random walk pulled gently back toward 0, so it wanders
// without running off, and settles to a steady spread. The shared part takes
// 70% of the variance, so the two sides' temperaments correlate at about 0.7
// (a little less after clamping to [0, 1]). Together they have a spread of
// about 0.2, so temperament stays mostly within 0.1 to 0.9.
export const TEMPERAMENT_SD = 0.2;
export const TEMPERAMENT_SHARED_VARIANCE = 0.7;
// How much of the way back to 0 each part is pulled in a year. At 1% a part
// takes on the order of a century to forget where it was: a pair's liking
// for each other is stable year to year but not fixed forever.
export const TEMPERAMENT_PULL = 0.01;

const SHARED_SD = TEMPERAMENT_SD * Math.sqrt(TEMPERAMENT_SHARED_VARIANCE);
const OWN_SD = TEMPERAMENT_SD * Math.sqrt(1 - TEMPERAMENT_SHARED_VARIANCE);
// The yearly step that keeps a part at its steady spread under that pull:
// steady variance is step^2 / (2 pull - pull^2).
const STEP_FACTOR = Math.sqrt(2 * TEMPERAMENT_PULL - TEMPERAMENT_PULL ** 2);

// Below this spread between a clan's self-affinity and its average, relative
// affinity is not meaningful (every clan it knows is as dear as itself).
const MIN_RELATIVE_SPAN = 1e-6;

// --- Nodes ----------------------------------------------------------------

export const AffNode = {
    Kinship: "kinship",
    SubjectResidence: "subjectResidence",
    ObjectResidence: "objectResidence",
    Residence: "residence",
    SubjectFarming: "subjectFarming",
    ObjectFarming: "objectFarming",
    Livelihood: "livelihood",
    TemperamentShared: "temperamentShared",
    TemperamentOwn: "temperamentOwn",
    Temperament: "temperament",
    Absolute: "absolute",
} as const;

export type AffNodeId = (typeof AffNode)[keyof typeof AffNode];

export interface AffNodeDef {
    id: AffNodeId;
    label: string;
    // "factor" nodes are the terms averaged; "input" nodes are what they are
    // made from; "result" is the average.
    role: "input" | "factor" | "result";
    note: string;
}

export const AFF_NODES: readonly AffNodeDef[] = [
    { id: AffNode.Kinship, label: "Kinship", role: "factor",
      note: "1 if one clan is a cadet of the other." },
    { id: AffNode.SubjectResidence, label: "Own residence", role: "input",
      note: "Share of the year the subject spends in the settlement." },
    { id: AffNode.ObjectResidence, label: "Their residence", role: "input",
      note: "Share of the year the other clan spends in the settlement." },
    { id: AffNode.Residence, label: "Residence", role: "factor",
      note: "1 less the difference in residence." },
    { id: AffNode.SubjectFarming, label: "Own farming share", role: "input",
      note: "Farming as a share of the subject's farming and fishing." },
    { id: AffNode.ObjectFarming, label: "Their farming share", role: "input",
      note: "Farming as a share of the other clan's farming and fishing." },
    { id: AffNode.Livelihood, label: "Livelihood", role: "factor",
      note: "1 less the difference in farming share." },
    { id: AffNode.TemperamentShared, label: "Shared temperament", role: "input",
      note: "How well the two get on, the same from either side. Centered on 0." },
    { id: AffNode.TemperamentOwn, label: "Own temperament", role: "input",
      note: "What this side makes of it, apart from the other. Centered on 0." },
    { id: AffNode.Temperament, label: "Temperament", role: "factor",
      note: "Unexplained liking, unique to this direction of the pair, drifting slowly." },
    { id: AffNode.Absolute, label: "Affinity", role: "result",
      note: "The average of the factors." },
];

export const AFF_FACTOR_COUNT = AFF_NODES.filter(d => d.role === "factor").length;

// --- Tracing --------------------------------------------------------------

export interface AffTrace {
    put(id: AffNodeId, value: number): void;
}

export class AffinityReport implements AffTrace {
    private readonly values_ = new Map<AffNodeId, number>();

    put(id: AffNodeId, value: number): void {
        this.values_.set(id, value);
    }

    get(id: AffNodeId): number {
        return this.values_.get(id) ?? 0;
    }

    get steps(): { def: AffNodeDef; value: number }[] {
        const out: { def: AffNodeDef; value: number }[] = [];
        for (const def of AFF_NODES) {
            const value = this.values_.get(def.id);
            if (value !== undefined) out.push({ def, value });
        }
        return out;
    }
}

// --- The calculation ------------------------------------------------------

// Absolute affinity of subject for object, given the pair's temperament.
//
// Keep the trace block at the bottom in step with the math above it.
export function computeAffinity<T extends Clan | ClanDTO>(
    subject: T,
    object: T,
    temperament: number,
    trace?: AffTrace,
): number {
    const self = subject.uuid === object.uuid;
    const connections = subject.world.connections;

    const kinship = self || connections.getForType(subject, object, KinConnection) ? 1 : 0;

    const subjectResidence = subject.residenceFraction;
    const objectResidence = object.residenceFraction;
    const residence = 1 - Math.min(1, Math.abs(subjectResidence - objectResidence));

    const subjectFarming = subject.effortAllocation.farmingRatio();
    const objectFarming = object.effortAllocation.farmingRatio();
    const livelihood = 1 - Math.min(1, Math.abs(subjectFarming - objectFarming));

    const absolute = (kinship + residence + livelihood + temperament)
        / AFF_FACTOR_COUNT;

    if (trace !== undefined) {
        traceAffinity(trace, kinship,
            subjectResidence, objectResidence, residence,
            subjectFarming, objectFarming, livelihood, temperament, absolute);
    }

    return absolute;
}

// Out of line so the cold branch does not count against inlining the above.
function traceAffinity(
    trace: AffTrace,
    kinship: number,
    subjectResidence: number,
    objectResidence: number,
    residence: number,
    subjectFarming: number,
    objectFarming: number,
    livelihood: number,
    temperament: number,
    absolute: number,
): void {
    trace.put(AffNode.Kinship, kinship);
    trace.put(AffNode.SubjectResidence, subjectResidence);
    trace.put(AffNode.ObjectResidence, objectResidence);
    trace.put(AffNode.Residence, residence);
    trace.put(AffNode.SubjectFarming, subjectFarming);
    trace.put(AffNode.ObjectFarming, objectFarming);
    trace.put(AffNode.Livelihood, livelihood);
    trace.put(AffNode.Temperament, temperament);
    trace.put(AffNode.Absolute, absolute);
}

// Relative affinity: absolute against the subject's mean over the clans it
// knows, rescaled so that self stays at 1.
export function relativeAffinity(absolute: number, mean: number): number {
    const span = 1 - mean;
    if (span < MIN_RELATIVE_SPAN) return 0;
    return (absolute - mean) / span;
}

// --- State ----------------------------------------------------------------

// A clan's affinity for another, as last computed. Lives in the pair's
// Perceptions, so it exists exactly for the clans the subject knows.
export class Affinity {
    // Temperament's two parts; see TEMPERAMENT_SD. The shared part is kept in
    // step with the other direction's by updateAffinities.
    private shared_: number;
    private own_: number;
    // Not yet matched with the other direction's shared part.
    private unpaired_ = true;
    private absolute_ = 0;
    private relative_ = 0;
    // The subject's mean absolute affinity over the clans it knows, as used
    // for the relative reading. Kept so the panel can show the derivation.
    private mean_ = 0;

    constructor(
        shared: number = normal(0, SHARED_SD),
        own: number = normal(0, OWN_SD),
    ) {
        this.shared_ = shared;
        this.own_ = own;
    }

    get shared(): number { return this.shared_; }
    get own(): number { return this.own_; }
    get temperament(): number {
        return Math.min(1, Math.max(0, 0.5 + this.shared_ + this.own_));
    }
    get absolute(): number { return this.absolute_; }
    get relative(): number { return this.relative_; }
    get mean(): number { return this.mean_; }
    // What alignment takes in: halfway between the absolute reading, which
    // says how much the two have in common outright, and the relative one,
    // which says how that compares with the subject's other acquaintances.
    get forAlignment(): number { return (this.absolute_ + this.relative_) / 2; }

    // Replay the calculation with a trace, for the panel.
    report<T extends Clan | ClanDTO>(subject: T, object: T): AffinityReport {
        const report = new AffinityReport();
        computeAffinity(subject, object, this.temperament, report);
        report.put(AffNode.TemperamentShared, this.shared_);
        report.put(AffNode.TemperamentOwn, this.own_);
        return report;
    }

    // Take on the shared part from the other direction of the pair. A pair
    // met for the first time has both directions new; one side's draw stands.
    pairWith(back: Affinity): void {
        if (this.unpaired_ && !back.unpaired_) {
            this.shared_ = back.shared_;
        } else {
            back.shared_ = this.shared_;
        }
        this.unpaired_ = false;
        back.unpaired_ = false;
    }

    // One year's wander of both parts, carrying the shared part over to the
    // other direction.
    driftWith(back: Affinity): void {
        this.shared_ = wander(this.shared_, SHARED_SD);
        back.shared_ = this.shared_;
        this.own_ = wander(this.own_, OWN_SD);
        back.own_ = wander(back.own_, OWN_SD);
    }

    updateAbsolute(subject: Clan, object: Clan): void {
        this.absolute_ = computeAffinity(subject, object, this.temperament);
    }

    setRelative(mean: number): void {
        this.mean_ = mean;
        this.relative_ = relativeAffinity(this.absolute_, mean);
    }

    clone(): Affinity {
        const a = new Affinity(this.shared_, this.own_);
        a.unpaired_ = this.unpaired_;
        a.absolute_ = this.absolute_;
        a.relative_ = this.relative_;
        a.mean_ = this.mean_;
        return a;
    }
}

// A year's step of one part: pulled back toward 0, then jostled by just
// enough to hold its steady spread.
function wander(value: number, sd: number): number {
    return value * (1 - TEMPERAMENT_PULL) + normal(0, sd * STEP_FACTOR);
}

// A clan's affinity for itself. Temperament is taken as full, so it comes to
// exactly 1 both absolutely and relatively. Never drifted: updateAffinities
// only walks pairs of different clans.
export function selfAffinity(): Affinity {
    return new Affinity(0.5, 0);
}

// Called from updatePerceptions once the known pairs are settled and before
// alignment, which reads it. `drift` is set only for the end-of-turn update,
// so temperament wanders a year at a time.
export function updateAffinities(world: World, drift: boolean = true): void {
    // Temperament first, a pair at a time, so the shared part moves once and
    // lands on both sides.
    for (const subject of world.allClans) {
        for (const [objectID, perceptions] of world.perceptions.getFor(subject.uuid)) {
            if (subject.uuid > objectID) continue;
            const back = world.perceptions.get(objectID, subject.uuid)?.affinity;
            if (!back) continue;
            const affinity = perceptions.affinity;
            affinity.pairWith(back);
            if (drift) affinity.driftWith(back);
        }
    }

    for (const subject of world.allClans) {
        let sum = 0;
        let count = 0;
        for (const [objectID, perceptions] of world.perceptions.getFor(subject.uuid)) {
            const object = world.clanFrom(objectID);
            if (!object) continue;
            const affinity = perceptions.affinity;
            affinity.updateAbsolute(subject, object);
            sum += affinity.absolute;
            ++count;
        }
        const mean = count > 0 ? sum / count : 0;
        for (const [, perceptions] of world.perceptions.getFor(subject.uuid)) {
            perceptions.affinity.setRelative(mean);
        }
        const self = world.perceptions.get(subject, subject)?.affinity;
        if (self) {
            self.updateAbsolute(subject, subject);
            self.setRelative(mean);
        }
    }
}
