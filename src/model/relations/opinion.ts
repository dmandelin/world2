// The shape shared by the absolute opinions one clan holds of another:
// Respect and Holiness. Both are built the same way -- a list of scored
// items, summed and then smoothed year over year -- so a view that can break
// one down can break down the other.

export interface OpinionItem {
    readonly label: string;
    readonly baseValue: number;
    readonly modifier: number;
    readonly explanation: string;
    readonly value: number;
}

export interface Opinion {
    readonly items: readonly OpinionItem[];
    readonly currentItemsTotal: number;
    readonly previousValue: number;
    readonly value: number;
    readonly informationValue: number;
}
