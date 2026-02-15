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
    valueFn: (row: RowData) => CellData;

    // Formatter for values in this column.
    formatFn?: (value: CellData) => string;

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
    bold?: boolean;

    // If set, the cell will have a tooltip with this snippet.
    tooltip?: Snippet<[RowData, TableColumn<RowData, any>]>;
}

// View-data model for a table. Includes schema, data, formatting, and behavior.
// TODO - decide if we actually need this
export interface CrossTable<RowColData, CellData> {
    // Column-oriented schema describing value types, formatting, and behavior.
    columns: TableColumn<RowColData, CellData>[];

    // Row data. Typically, the row of the table represents these entities. 
    rows: TableRow<RowColData>[];

    // If set, don't show a header row.
    hideHeader?: boolean;

    // If set, clicking on a row header will call this function with the row data.
    onClickRowHeader?: (row: RowColData) => void;
}

export class SingleRecordTable implements Table<string, [number]> {
    columns: [TableColumn<string, number>];
    rows: TableRow<string>[];

    constructor(
        data: Record<string, number>, 
        formatFn: (value: number) => string = (value => value.toFixed(2))) {

        this.columns = [{
            label: 'Value',
            valueFn: (row: string) => data[row],
            formatFn: (value: number) => value.toFixed(2),
        }];

        this.rows = Object.keys(data).map(label => ({
            data: label,
            label,
        }));

    }
}

export class RecordTable<RowData, ColumnCellDataTypes extends any[]> implements Table<RowData, ColumnCellDataTypes> {
    rows: TableRow<RowData>[];

    constructor(       
        data: Iterable<RowData>,
        rowLabelFn: (row: RowData) => string,
        readonly columns: { [K in keyof ColumnCellDataTypes]: TableColumn<RowData, ColumnCellDataTypes[K]> },
    ) {
        this.rows = [...data].map(e => ({
            data: e,
            label: rowLabelFn(e),
        }));
    }
}

export class CrossTab<RowColData, CellData> implements CrossTable<RowColData, CellData> {
    columns: TableColumn<RowColData, CellData>[];
    rows: TableRow<RowColData>[];

    constructor(       
        data: Iterable<RowColData>,
        labelFn: (item: RowColData) => string,
        valueFn: (row: RowColData, col: RowColData) => CellData,
        formatFn: (value: CellData) => string,
        tooltip?: Snippet<[RowColData, TableColumn<RowColData, CellData>]>,
    ) {
        this.columns = [...data].map(e => ({
            label: labelFn(e),
            valueFn: (row: RowColData) => valueFn(row, e),
            formatFn,
        }));

        this.rows = [...data].map(e => ({
            data: e,
            label: labelFn(e),
            tooltip,
        }));
    }
}
