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

    isCrossTable?: false;
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
    formatFn?: (value: CellData, row?: any, col?: any) => string;

    // If set, the cell data will be used as the src of an img element instead 
    // of being displayed as text.
    imgsrc?: boolean;

    // If set, the cell data will render as HTML.
    html?: boolean;

    // If set, the cell will have a tooltip with this snippet.
    tooltip?: Snippet<[CellData, RowData, ColData]>;

    // If set, the column header will display a tooltip with this text.
    headerTooltip?: string;

    // If set, clicking on a cell will call this function with the cell data, 
    // row data, and column.
    onClickCell?: (data: CellData, row: RowData, col: ColData) => void;

    // Optional CSS class name to style header and cells.
    class?: string;
}

// View-data model for a table row.
export interface TableRow<RowData, ColData> {
    // Data represented by this row.
    data: RowData;

    // Display label. Shown in the header column.
    label: string;

    // Whether to display this row in bold.
    bold?: boolean;

    // Optional prefix text to render in a separate column to the left of the label.
    prefix?: string;

    // If set, the cell will have a tooltip with this snippet.
    tooltip?: Snippet<[any, RowData, ColData]>;

    // If set, the row header (label) will have a tooltip with this snippet.
    headerTooltip?: Snippet<[RowData]>;

    // If set, get the value for this cell from the row instead of the column.
    valueFn?: (col: ColData) => any;

    // If set, format the cell value using this function.
    formatFn?: (value: any, col: ColData) => string;

    // If true, render a visual divider above this row.
    divider?: boolean;

    // Optional CSS class name to style header and cells.
    class?: string;
}

// View-data model for a table. Includes schema, data, formatting, and behavior.
// TODO - decide if we actually need this
export interface CrossTable<RowColData, CellData> {
    // Column-oriented schema describing value types, formatting, and behavior.
    columns: TableColumn<RowColData, any, any>[];

    // Row data. Typically, the row of the table represents these entities. 
    rows: TableRow<RowColData, RowColData>[];

    // If set, don't show a header row.
    hideHeader?: boolean;

    // If set, clicking on a row header will call this function with the row data.
    onClickRowHeader?: (row: RowColData) => void;

    isCrossTable: true;
}

// Table from a single record with
// - Row per key in the record
// - Single column with value from the record
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
            formatFn,
        }];

        this.rows = Object.keys(data).map(label => ({
            data: label,
            label,
        }));

    }
}

// Table from a single map with:
// - Row per key in the map
// - Single column with value from the map
export class SingleMapTable<RowData> implements Table<RowData, string, [number]> {
    columns: [TableColumn<RowData, string, number>];
    rows: TableRow<RowData, string>[];

    constructor(
        data: Map<string, RowData>,
        valueFn: (row: RowData) => number,
        filterFn: (row: RowData) => boolean = () => true,
        formatFn: (value: number) => string = (value => value.toFixed(2))) {

        this.columns = [{
            data: 'Value',
            label: 'Value',
            valueFn: (row: RowData) => valueFn(row),
            formatFn,
        }];
        
        this.rows = [...data.entries()]
            .filter(([key, value]) => filterFn(value))
            .map(([key, value]) => ({
                data: value,
                label: key,
            }));
    }
}

// Table of an iterable of RowData with:
// - Row per item in the iterable
// - Columns as set in the constructor
export class FilteredIterableTable<RowData, ColumnCellDataTypes extends any[]> implements Table<RowData, string, ColumnCellDataTypes> {
    rows: TableRow<RowData, string>[];

    constructor(
        data: Iterable<RowData>,
        rowLabelFn: (row: RowData) => string,
        filterFn: (row: RowData) => boolean = () => true,
        readonly columns: { [K in keyof ColumnCellDataTypes]: TableColumn<RowData, string, ColumnCellDataTypes[K]> }) {
        
        this.rows = [...data]
            .filter(filterFn)
            .map((value, index) => ({
                data: value,
                label: rowLabelFn(value),
            }));
    }
}

// Table from an iterable of record with:
// - Row per record
// - Columns as set in the constructor
export class IterableTable<RowData, ColumnCellDataTypes extends any[]> implements Table<RowData, string, ColumnCellDataTypes> {
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

export interface RowDataColumnSpec<RowData> {
    label: string;
    valueFn: (row: RowData) => any;
    formatFn?: (value: any, row?: RowData, col?: any) => string;
    tooltip?: Snippet<[any, RowData, any]>;
    headerTooltip?: string;
}

export interface RowDataRowSpec<ColData> {
    label: string;
    valueFn: (col: ColData) => any;
    formatFn?: (value: any, col: ColData) => string;
    tooltip?: Snippet<[any, any, ColData]>;
    headerTooltip?: Snippet<[any]>;
    divider?: boolean;
}

export class CrossTab<RowColData, CellData> implements CrossTable<RowColData, CellData> {
    columns: TableColumn<RowColData, any, any>[];
    rows: TableRow<RowColData, RowColData>[];
    readonly isCrossTable = true;

    constructor(       
        data: Iterable<RowColData>,
        labelFn: (item: RowColData) => string,
        valueFn: (row: RowColData, col: RowColData) => CellData,
        formatFn: (value: CellData) => string,
        tooltip?: Snippet<[CellData, RowColData, RowColData]>,
        rowHeaderTooltip?: Snippet<[RowColData]>,
        rowDataCols?: RowDataColumnSpec<RowColData>[],
        rowDataRows?: RowDataRowSpec<RowColData>[],
        colClassFn?: (item: RowColData) => string,
        rowClassFn?: (item: RowColData) => string,
    ) {
        this.columns = [...data].map(e => ({
            data: e,
            label: labelFn(e),
            valueFn: (row: RowColData) => valueFn(row, e),
            formatFn,
            class: colClassFn?.(e),
        }));

        if (rowDataCols) {
            for (const spec of rowDataCols) {
                this.columns.push({
                    data: spec.label,
                    label: spec.label,
                    valueFn: spec.valueFn,
                    formatFn: spec.formatFn,
                    tooltip: spec.tooltip,
                    headerTooltip: spec.headerTooltip,
                });
            }
        }

        this.rows = [...data].map(e => ({
            data: e,
            label: labelFn(e),
            tooltip,
            headerTooltip: rowHeaderTooltip,
            class: rowClassFn?.(e),
        }));

        if (rowDataRows) {
            for (const spec of rowDataRows) {
                this.rows.push({
                    data: spec as any,
                    label: spec.label,
                    valueFn: spec.valueFn,
                    formatFn: spec.formatFn,
                    tooltip: spec.tooltip as any,
                    headerTooltip: spec.headerTooltip,
                    divider: spec.divider,
                });
            }
        }
    }
}

// Table from a 2D string array where:
// - Row 0 contains column header labels (excluding column 0, which is the row header label)
// - Subsequent rows have the row label in index 0, and cell values in indices 1+
export class TwoDArrayTable implements Table<string[], string, string[]> {
    columns: TableColumn<string[], string, string>[];
    rows: TableRow<string[], string>[];

    constructor(data: string[][]) {
        if (!data || data.length === 0) {
            this.columns = [] as any;
            this.rows = [];
            return;
        }

        const headers = data[0];
        this.columns = headers.slice(1).map((label, index) => ({
            data: label,
            label,
            valueFn: (row: string[]) => row[index + 1],
        })) as any;

        this.rows = data.slice(1).map(row => ({
            data: row,
            label: row[0],
        }));
    }
}
