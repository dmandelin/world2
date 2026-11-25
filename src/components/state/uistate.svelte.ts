import { world as _world } from '../../model/worldinstance';
import { BREAKPOINT_IDS, defaultBreakpoints, type BreakpointId }
    from '../../model/records/breakpoints';

export type Uuidable = string | { uuid: string } | undefined;

// State of the world, private to this module and automatically updated.
let _worldState = $state(_world.dto!);
_world.watch(() => {
    _worldState = _world.dto!;
});

// Exported readonly state of the world.
export function worldState() {
    return _worldState;
}

// Primary settable UI state values.
export const uiPrimaryState = $state({
    selectedSettlementUUID: (_world.allSettlements[0]?.uuid) as string|undefined,
    selectedClanUUID: undefined as string|undefined,
    selectedClusterUUID: undefined as string|undefined,
    // A panel of the settlement view that something has asked to be shown --
    // a link in the event feed that knows where the thing it names is
    // written up. Cleared as soon as the view honors it, so it opens the
    // panel once rather than pinning the view to it.
    requestedSettlementTab: undefined as string|undefined,
    // The same for the clan view: a panel of it something has asked to show.
    requestedClanTab: undefined as string|undefined,
});

// Exported readonly UI state.
const _uiState = $derived(({
    selectedSettlement: _worldState?.settlements?.find(s => s.uuid === uiPrimaryState.selectedSettlementUUID),
    selectedClan: _worldState?.clanMap ? [..._worldState.clanMap.values()].find(c => c.uuid === uiPrimaryState.selectedClanUUID) : undefined,
    selectedCluster: _worldState?.clusters?.find(cl => cl.uuid === uiPrimaryState.selectedClusterUUID),
    requestedSettlementTab: uiPrimaryState.requestedSettlementTab,
    requestedClanTab: uiPrimaryState.requestedClanTab,
}));
export function uiState() {
    return _uiState;
}

// Select any entity in the UI. `tab` names a panel of the settlement view to
// open along with it, for links that know where what they name is written up.
export function selectEntity(uuidable: Uuidable, tab?: string): void {
    const uuid = uuidOf(uuidable);
    const clan = [..._world.clanMap.values()].find(c => c.uuid === uuid);
    if (clan) {
        selectSettlement(clan.settlement, tab);
        selectClan(clan);
    } else {
        const settlement = _world.allSettlements.find(s => s.uuid === uuid);
        if (settlement) {
            selectSettlement(settlement, tab);
        } else {
            const cluster = _world.clusters.find(cl => cl.uuid === uuid);
            if (cluster) {
                selectCluster(cluster);
            }
        }
    }
}

// Select a settlement in the UI.
export function selectSettlement(uuidable: Uuidable, tab?: string): void {
    uiPrimaryState.selectedSettlementUUID = uuidOf(uuidable);
    uiPrimaryState.selectedClanUUID = undefined;
    uiPrimaryState.selectedClusterUUID = undefined;
    uiPrimaryState.requestedSettlementTab = tab;
}

// Ask the settlement view to open one of its panels, without changing which
// settlement or clan is selected. For a stat that has somewhere fuller to be
// read about, so clicking it takes you there.
export function requestSettlementTab(tab: string): void {
    uiPrimaryState.requestedSettlementTab = tab;
}

// Called by the settlement view once it has opened the panel that was asked
// for, so the request does not stand and override the next click.
export function clearRequestedSettlementTab(): void {
    uiPrimaryState.requestedSettlementTab = undefined;
}

// Open a clan's view at one of its panels, as a stat in the clans overview
// does when it has somewhere fuller to be read about.
export function selectClanTab(uuidable: Uuidable, tab: string): void {
    selectEntity(uuidable);
    uiPrimaryState.requestedClanTab = tab;
}

// Called by the clan view once it has opened the panel asked for.
export function clearRequestedClanTab(): void {
    uiPrimaryState.requestedClanTab = undefined;
}

// Select a clan in the UI.
export function selectClan(uuidable: Uuidable): void {
    // Doesn't clear settlement because it's part of the scope.
    uiPrimaryState.selectedClanUUID = uuidOf(uuidable);
    uiPrimaryState.selectedClusterUUID = undefined;
}

// Select a cluster in the UI.
export function selectCluster(uuidable: Uuidable): void {
    uiPrimaryState.selectedClusterUUID = uuidOf(uuidable);
    uiPrimaryState.selectedSettlementUUID = undefined;
    uiPrimaryState.selectedClanUUID = undefined;
}

export function uuidOf(uuidable: Uuidable): string | undefined {
    return typeof uuidable === 'string' ? uuidable : uuidable?.uuid;
}

// --- Sticky settings -------------------------------------------------------
//
// Settings of the viewer's that are kept in local storage. Each is a flat
// record of booleans; only the keys the defaults still have are read back,
// so a setting added since takes its default and one since removed is
// dropped.

function loadSticky<T extends Record<string, boolean>>(
    key: string, defaults: T,
): T {
    const state: Record<string, boolean> = { ...defaults };
    try {
        const raw = localStorage.getItem(key);
        const saved = raw ? JSON.parse(raw) : undefined;
        if (saved && typeof saved === 'object') {
            for (const k of Object.keys(defaults)) {
                if (typeof saved[k] === 'boolean') state[k] = saved[k];
            }
        }
    } catch {
        // No storage (as on the server), or something unreadable in it:
        // the defaults stand.
    }
    return state as T;
}

function saveSticky(key: string, state: object): void {
    try {
        localStorage.setItem(key, JSON.stringify(state));
    } catch {
        // Not being able to remember them is no reason to stop.
    }
}

// --- Breakpoints -----------------------------------------------------------
//
// Which occasions cut a multi-year advance short. Kept here rather than on
// the world because it is a setting of the viewer's, not of the simulation:
// it changes what you get to look at, not what happens.
//
// Being the viewer's, it is kept in local storage and carries over from one
// session to the next (see Sticky settings above).

export const breakpointState: Record<BreakpointId, boolean> =
    $state(loadSticky('world2.breakpoints', defaultBreakpoints()));

export function toggleBreakpoint(id: BreakpointId): void {
    breakpointState[id] = !breakpointState[id];
}

export function armedBreakpoints(): Set<BreakpointId> {
    return new Set(
        BREAKPOINT_IDS.filter(id => breakpointState[id]));
}

// --- Run controls ----------------------------------------------------------
//
// Switches that do change what happens, handed to the world with each
// advance. Off by default, in the model and here alike. Kept from one session
// to the next like the breakpoints.

export const runControls = $state(loadSticky('world2.runControls', {
    preventMigrations: false,
}));

// Write each back whenever it changes. Effects only run in the browser.
$effect.root(() => {
    $effect(() => saveSticky('world2.breakpoints', breakpointState));
    $effect(() => saveSticky('world2.runControls', runControls));
});
