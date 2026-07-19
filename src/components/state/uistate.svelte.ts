import { world as _world } from '../../model/world';

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
    selectedSettlementUUID: (_world.allSettlements[0]!.uuid) as string|undefined,
    selectedClanUUID: undefined as string|undefined,
    selectedClusterUUID: undefined as string|undefined,
});

// Exported readonly UI state.
const _uiState = $derived(({
    selectedSettlement: _worldState.settlements.find(s => s.uuid === uiPrimaryState.selectedSettlementUUID),
    selectedClan: [..._worldState.clanMap.values()].find(c => c.uuid === uiPrimaryState.selectedClanUUID),
    selectedCluster: _worldState.clusters.find(cl => cl.uuid === uiPrimaryState.selectedClusterUUID),
}));
export function uiState() {
    return _uiState;
}

// Select any entity in the UI.
export function selectEntity(uuidable: Uuidable): void {
    const uuid = uuidOf(uuidable);
    const clan = [..._world.clanMap.values()].find(c => c.uuid === uuid);
    if (clan) {
        selectSettlement(clan.settlement);
        selectClan(clan);
    } else {
        const settlement = _world.allSettlements.find(s => s.uuid === uuid);
        if (settlement) {
            selectSettlement(settlement);
        } else {
            const cluster = _world.clusters.find(cl => cl.uuid === uuid);
            if (cluster) {
                selectCluster(cluster);
            }
        }
    }
}

// Select a settlement in the UI.
export function selectSettlement(uuidable: Uuidable): void {
    uiPrimaryState.selectedSettlementUUID = uuidOf(uuidable);
    uiPrimaryState.selectedClanUUID = undefined;
    uiPrimaryState.selectedClusterUUID = undefined;
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