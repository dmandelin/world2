// Tables yet again, try to make a little easier to deal with.

import type { Snippet } from "svelte";

// Data-driven: tables can have row data, column data, and/or cell data
// - data could be fixed or created on demand

// Formatting/behavior: attach to various items

// Builders: convenience functions for common scenarios

// View-data model for a table. Includes schema, data, formatting, and behavior.
export interface Table<RowData, ColumnCellDataTypes extends any[]> {
    // Column-oriented schema describing value types, formatting, and behavior.
    columns: { [K in keyof ColumnCellDataTypes]: TableColumn<RowData, ColumnCellDataTypes[K]> }

    // Row data. Typically, the row of the table represents these entities. 
    rows: TableRow<RowData>[];

    // If set, don't show a header row.
    hideHeader?: boolean;

    // If set, clicking on a row header will call this function with the row data.
    onClickRowHeader?: (row: RowData) => void;
}

// View-data model for a table column. Includes a value function (how to get`
// the call value from the row value), formatting, and behavior.
export interface TableColumn<RowData, CellData> {
    // Display label. Shown in the header row.
    label: string;

    // Value of the cell in this column for a given row. This can be anything
    // from a lookup into another tabular data structure to a complex mapping
    // from row data.
    value: (row: RowData) => CellData;

    // If set, the cell data will be used as the src of an img element instead 
    // of being displayed as text.
    imgsrc?: boolean;

    // If set, the cell will have a tooltip with this snippet.
    tooltip?: Snippet<[CellData, RowData, TableColumn<RowData, CellData>]>;

    // If set, clicking on a cell will call this function with the cell data, 
    // row data, and column.
    onClickCell?: (data: CellData, row: RowData, col: TableColumn<RowData, CellData>) => void;
}

// View-data model for a table row.
export interface TableRow<RowData> {
    // Data represented by this row.
    data: RowData;

    // Display label. Shown in the header column.
    label: string;

    // Whether to display this row in bold.
    bold: boolean;

    // If set, the cell will have a tooltip with this snippet.
    tooltip?: Snippet<[RowData, TableColumn<RowData, any>]>;
}