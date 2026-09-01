import type { NoteEntity } from "./notifications";
import type { World } from "../world";
import { populationAverage } from "../lib/modelbasics";
import { arrayMapAdd, sumFun } from "../lib/basics";
import { pct } from "../lib/format";
import type { ClanFloodImpact } from "../environment/flood";
import type { Settlement } from "../people/settlement";

// ----------------------------------------------------------------------------
// Alert kinds
//
// An "alert" is a game-state condition worth surfacing to the player, shown as
// a floating badge down the right-hand side of the screen (in the manner of
// Civ/Paradox notification icons). Alerts of the same kind coalesce into a
// single badge; clicking it lists the individual alerts.
//
// To add a new kind: add an id to AlertKindId and a definition to ALERT_KINDS,
// then raise it from anywhere with `world.addAlert({ kind, entity })`.
// ----------------------------------------------------------------------------

export type AlertKindId =
    | 'dwindling'
    | 'malnourishment'
    | 'starvation'
    | 'strife'
    | 'foundation'
    | 'ritualchange'
    | 'flood20'
    | 'flood100'
    | 'flood500';

// Presentation for a kind of alert.
export interface AlertKindDef {
    readonly title: string;        // Human-readable name, e.g. "Starvation".
    readonly icon: string;         // Glyph shown in the badge.
    readonly color: string;        // Accent color (border/count) for the badge.
    readonly description: string;  // Explains the condition; shown on hover.
}

export const ALERT_KINDS: Record<AlertKindId, AlertKindDef> = {
    dwindling: {
        title: 'Dwindling',
        icon: '📉',
        color: '#8a6d3b',
        description: 'Clan population has fallen dangerously low.',
    },
    malnourishment: {
        title: 'Malnourishment',
        icon: '🍽️',
        color: '#b7791f',
        description: 'Clan is eating less than it needs.',
    },
    starvation: {
        title: 'Starvation',
        icon: '💀',
        color: '#9b2c2c',
        description: 'Clan is severely short of food.',
    },
    strife: {
        title: 'Strife',
        icon: '⚔️',
        color: '#7b341e',
        description: 'Settlement is riven by social discord.',
    },
    foundation: {
        title: 'Foundation',
        icon: '🏘️',
        color: '#2f7d5b',
        description: 'A new village is being founded.',
    },
    ritualchange: {
        title: 'Festival in Question',
        icon: '🎉',
        color: '#975a16',
        description: 'The clans must settle again how the festival is held.',
    },
    // One badge per severity of extreme flood, so a once-in-a-lifetime
    // flood does not look like a once-in-five-centuries one.
    flood20: {
        title: '20-year flood',
        icon: '🌊',
        color: '#2b6cb0',
        description: 'The rivers broke out over a region.',
    },
    flood100: {
        title: '100-year flood',
        icon: '🏚️',
        color: '#2c5282',
        description: 'The rivers broke out over half the land.',
    },
    flood500: {
        title: '500-year flood',
        icon: '🆘',
        color: '#742a2a',
        description: 'The rivers broke out over the whole land.',
    },
};

// ----------------------------------------------------------------------------
// Alert data
// ----------------------------------------------------------------------------

// A single alert instance. Immutable, plain data so it can be snapshotted into
// the world DTO and read directly by the UI.
export interface Alert {
    readonly kind: AlertKindId;
    // Unique within a kind; identifies the subject so re-detecting the same
    // condition refreshes rather than duplicates. Defaults to the entity uuid.
    readonly id: string;
    // Navigation target, if any (left-clicking a row selects it).
    readonly entity?: NoteEntity;
    // Short label for the popup row (e.g. the clan or settlement name).
    readonly label: string;
    // Optional detail shown beneath the label in the popup row.
    readonly detail?: string;
    // Latest game-year value at which to show this alert (inclusive). Use
    // Infinity to never expire. Defaults to the current year, so an alert that
    // is not re-raised next turn is cleared then.
    readonly expiry: number;
}

// What a caller supplies to raise an alert. Everything but `kind` is optional.
export interface AlertSpec {
    kind: AlertKindId;
    id?: string;
    entity?: NoteEntity;
    label?: string;
    detail?: string;
    expiry?: number;
}

// The live collection of alerts, held on the World.
export class Alerts {
    private items: Alert[] = [];

    // Add or refresh an alert. `currentYear` supplies the default expiry.
    add(spec: AlertSpec, currentYear: number): void {
        const entity = spec.entity
            ? { uuid: spec.entity.uuid, name: spec.entity.name }
            : undefined;
        const alert: Alert = {
            kind: spec.kind,
            id: spec.id ?? entity?.uuid ?? spec.kind,
            entity,
            label: spec.label ?? entity?.name ?? '',
            detail: spec.detail,
            expiry: spec.expiry ?? currentYear,
        };
        const i = this.items.findIndex(a => a.kind === alert.kind && a.id === alert.id);
        if (i >= 0) this.items[i] = alert;
        else this.items.push(alert);
    }

    // Remove alerts whose expiry year has passed.
    pruneExpired(currentYear: number): void {
        this.items = this.items.filter(a => currentYear <= a.expiry);
    }

    // Remove every alert of a kind (used when the player dismisses a badge).
    dismissKind(kind: AlertKindId): void {
        this.items = this.items.filter(a => a.kind !== kind);
    }

    get all(): readonly Alert[] {
        return this.items;
    }
}

// ----------------------------------------------------------------------------
// Detectors
//
// Recompute all state-derived alerts for the current turn. Called after the
// world advances, before notifying watchers. Detectors add alerts with the
// default expiry (this year), so a condition that no longer holds vanishes on
// the next turn's prune.
// ----------------------------------------------------------------------------

export const DWINDLING_POPULATION = 12;
const MALNOURISHED_PER_CAPITA_FOOD = 0.9;
const STARVING_PER_CAPITA_FOOD = 0.7;

export function updateWorldAlerts(world: World): void {
    const year = world.year.value;

    for (const clan of world.allClans) {
        if (clan.population < DWINDLING_POPULATION) {
            world.addAlert({
                kind: 'dwindling',
                entity: clan,
                detail: `${clan.population} people`,
            });
        }

        // Food per capita. Starvation is the severe subset, so a starving clan
        // is not also listed as merely malnourished.
        const food = clan.consumption.perCapitaFood;
        if (food < STARVING_PER_CAPITA_FOOD) {
            world.addAlert({
                kind: 'starvation',
                entity: clan,
                detail: `${pct(food)} of food needs`,
            });
        } else if (food < MALNOURISHED_PER_CAPITA_FOOD) {
            world.addAlert({
                kind: 'malnourishment',
                entity: clan,
                detail: `${pct(food)} of food needs`,
            });
        }
    }

    // Strife: population-weighted social quality of life below zero, per settlement.
    for (const settlement of world.allSettlements) {
        if (settlement.clans.length === 0) continue;
        const socialQol = populationAverage(
            settlement.clans, c => c.qol.valueFrom('social'));
        if (socialQol < 0) {
            world.addAlert({
                kind: 'strife',
                entity: settlement,
                detail: `social quality of life ${socialQol.toFixed(1)}`,
            });
        }
    }

    // Extreme floods: one row per settlement caught, so the badge below the
    // map counts places flooded and each settlement shows its own.
    for (const flood of world.extremeFloods) {
        if (flood.clansAffected === 0) continue;
        const bySettlement = new Map<Settlement, ClanFloodImpact[]>();
        for (const impact of flood.impacts) {
            arrayMapAdd(bySettlement, impact.clan.settlement, impact);
        }
        for (const [settlement, impacts] of bySettlement) {
            const crops = sumFun(impacts, i => i.cropLoss) / impacts.length;
            const clans = impacts.length === 1
                ? '1 clan' : `${impacts.length} clans`;
            world.addAlert({
                kind: flood.kind.key,
                id: `${flood.kind.key}:${flood.areaName}:${settlement.uuid}`,
                entity: settlement,
                detail: `${clans} hit · ${pct(crops)} of their crop lost`,
            });
        }
    }

    // Foundation: clans founding new villages this turn.
    for (const foundation of world.lastFoundations) {
        world.addAlert({
            kind: 'foundation',
            id: foundation.settlement.uuid,
            entity: foundation.settlement,
            detail: `founded by ${foundation.clans.map(c => c.name).join(', ')}`,
        });
    }

    // Settlements whose festival custom came open during this turn's planning.
    for (const change of world.lastRitualChanges) {
        world.addAlert({
            kind: 'ritualchange',
            id: change.settlement.uuid,
            entity: change.settlement,
            detail: change.detail,
        });
    }
}
