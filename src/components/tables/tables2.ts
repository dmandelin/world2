// Tables yet again, try to make a little easier to deal with.

import type { Snippet } from "svelte";

// View-data model for a table. Includes schema, data, formatting, and behavior.
export interface Table<RowData, ColData, ColumnCellDataTypes extends any[]> {
    // Column-oriented schema describing value types, formatting, and behavior.
    columns: { [K in keyof ColumnCellDataTypes]: TableColumn<RowData, ColData, ColumnCellDataTypes[K]> }

    // Row data. Typically, the row of the table represents these entities. 
    rows: TableRow<RowData, ColData>[];

    // If set, don't show a header row.
    hideHeader?: boolean;

    // If set, clicking on a row header will call this function with the row data.
    onClickRowHeader?: (row: RowData) => void;
}

// View-data model for a table column. Includes a value function (how to get`
// the call value from the row value), formatting, and behavior.
export interface TableColumn<RowData, ColData, CellData> {
    // Key data for the column. May be the same as label but doesn't have to be.
    data: ColData;

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
    tooltip?: Snippet<[CellData, RowData, ColData]>;

    // If set, clicking on a cell will call this function with the cell data, 
    // row data, and column.
    onClickCell?: (data: CellData, row: RowData, col: ColData) => void;
}

// View-data model for a table row.
export interface TableRow<RowData, ColData> {
    // Data represented by this row.
    data: RowData;

    // Display label. Shown in the header column.
    label: string;

    // Whether to display this row in bold.
    bold?: boolean;

    // If set, the cell will have a tooltip with this snippet.
    tooltip?: Snippet<[any, RowData, ColData]>;
}

// View-data model for a table. Includes schema, data, formatting, and behavior.
// TODO - decide if we actually need this
export interface CrossTable<RowColData, CellData> {
    // Column-oriented schema describing value types, formatting, and behavior.
    columns: TableColumn<RowColData, RowColData, CellData>[];

    // Row data. Typically, the row of the table represents these entities. 
    rows: TableRow<RowColData, RowColData>[];

    // If set, don't show a header row.
    hideHeader?: boolean;

    // If set, clicking on a row header will call this function with the row data.
    onClickRowHeader?: (row: RowColData) => void;
}

export class SingleRecordTable implements Table<string, string, [number]> {
    columns: [TableColumn<string, string, number>];
    rows: TableRow<string, string>[];

    constructor(
        data: Record<string, number>, 
        formatFn: (value: number) => string = (value => value.toFixed(2))) {

        this.columns = [{
            data: 'Value',
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

export class RecordTable<RowData, ColumnCellDataTypes extends any[]> implements Table<RowData, string, ColumnCellDataTypes> {
    rows: TableRow<RowData, string>[];

    constructor(       
        data: Iterable<RowData>,
        rowLabelFn: (row: RowData) => string,
        readonly columns: { [K in keyof ColumnCellDataTypes]: TableColumn<RowData, string, ColumnCellDataTypes[K]> },
    ) {
        this.rows = [...data].map(e => ({
            data: e,
            label: rowLabelFn(e),
        }));
    }
}

export class CrossTab<RowColData, CellData> implements CrossTable<RowColData, CellData> {
    columns: TableColumn<RowColData, RowColData, CellData>[];
    rows: TableRow<RowColData, RowColData>[];

    constructor(       
        data: Iterable<RowColData>,
        labelFn: (item: RowColData) => string,
        valueFn: (row: RowColData, col: RowColData) => CellData,
        formatFn: (value: CellData) => string,
        tooltip?: Snippet<[CellData, RowColData, RowColData]>,
    ) {
        this.columns = [...data].map(e => ({
            data: e,
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
