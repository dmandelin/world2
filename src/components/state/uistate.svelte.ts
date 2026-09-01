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
});

// Exported readonly UI state.
const _uiState = $derived(({
    selectedSettlement: _worldState?.settlements?.find(s => s.uuid === uiPrimaryState.selectedSettlementUUID),
    selectedClan: _worldState?.clanMap ? [..._worldState.clanMap.values()].find(c => c.uuid === uiPrimaryState.selectedClanUUID) : undefined,
    selectedCluster: _worldState?.clusters?.find(cl => cl.uuid === uiPrimaryState.selectedClusterUUID),
    requestedSettlementTab: uiPrimaryState.requestedSettlementTab,
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

// Called by the settlement view once it has opened the panel that was asked
// for, so the request does not stand and override the next click.
export function clearRequestedSettlementTab(): void {
    uiPrimaryState.requestedSettlementTab = undefined;
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

// --- Breakpoints -----------------------------------------------------------
//
// Which occasions cut a multi-year advance short. Kept here rather than on
// the world because it is a setting of the viewer's, not of the simulation:
// it changes what you get to look at, not what happens.

export const breakpointState: Record<BreakpointId, boolean> =
    $state(defaultBreakpoints());

export function toggleBreakpoint(id: BreakpointId): void {
    breakpointState[id] = !breakpointState[id];
}

export function armedBreakpoints(): Set<BreakpointId> {
    return new Set(
        BREAKPOINT_IDS.filter(id => breakpointState[id]));
}
