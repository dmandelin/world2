import { world as _world } from '../../model/world';

// State of the world, private to this module and automatically updated.
let _worldState = $state(_world.dto);
_world.watch(() => {
    _worldState = _world.dto;
});

// Exported readonly state of the world.
export function worldState() {
    return _worldState;
}

// Primary settable UI state values.
export const uiPrimaryState = $state({
    selectedSettlementUUID: (_world.allSettlements[0]!.uuid) as string|undefined,
    selectedClanUUID: undefined as string|undefined,
});

// Exported readonly UI state.
const _uiState = $derived(({
    selectedSettlement: _worldState.settlements.find(s => s.uuid === uiPrimaryState.selectedSettlementUUID),
    selectedClan: [..._worldState.clans()].find(c => c.uuid === uiPrimaryState.selectedClanUUID),
}));
export function uiState() {
    return _uiState;
}

// Select a settlement in the UI.
export function selectSettlement(uuidable: string|{uuid: string}|undefined): void {
    uiPrimaryState.selectedSettlementUUID = uuidOf(uuidable);
    uiPrimaryState.selectedClanUUID = undefined;
}

// Select a clan in the UI.
export function selectClan(uuidable: string|{uuid: string}|undefined): void {
    // Doesn't clear settlement because it's part of the scope.
    uiPrimaryState.selectedClanUUID = uuidOf(uuidable);
}

function uuidOf(uuidable: string|{uuid: string}|undefined): string|undefined {
    return typeof uuidable === 'string' ? uuidable : uuidable?.uuid;
}