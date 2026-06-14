// Base interface for an item fully tagged for UI display.
export interface Tagged {
    readonly sortKey: number;
    readonly name: string;
    readonly shortName?: string;
    readonly color: string;
    readonly icon?: string;
}