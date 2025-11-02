import type { Snippet } from "svelte";
import { sumFun } from "../model/lib/basics";
import { weightedAverage } from "../model/lib/modelbasics";

export interface Table<RowData extends Object, ColumnData extends Object> {
    columns: TableColumn<RowData, ColumnData>[];
    rows: TableRow<RowData, ColumnData>[];
    onClickRowHeader?: (row: RowData) => void;
    hideColumnHeaders?: boolean;
}

export interface TableColumn<RowData extends Object, ColumnData extends Object> {
    label: string;
    data?: ColumnData;
    formatFn?: 'imgsrc' | ((value: number) => string);
    tooltip?: Snippet<[RowData, ColumnData]>;
}

export interface TableRow<RowData extends Object, ColumnData extends Object> {
    data?: RowData;
    label: string;

    items: Record<string, number|string>;

    tooltip?: Snippet<[RowData, ColumnData]>;
    bold?: boolean;
}

export interface ColumnSpec<RowData extends Object, ColumnData extends Object> {
    label: string;
    valueFn: (row: RowData) => number|string;
    formatFn?: 'imgsrc' | ((value: number) => string);
    tooltip?: Snippet<[RowData, ColumnData]>;
    onClickCell?: (row: RowData, col: ColumnData) => void;
}

export class TableBuilder<RowData extends Object, ColumnData extends Object> {
    constructor(private table_: Table<RowData, ColumnData>) {}

    get table(): Table<RowData, ColumnData> {
        return this.table_;
    }

    static fromItems<Item extends Object>(
        items: Iterable<[string, Item]>,
        columnSpecs: ColumnSpec<Item, string>[],
    ): TableBuilder<Item, string> {
        const columns: TableColumn<Item, string>[] = columnSpecs.map(
            spec => ({ 
                label: spec.label, 
                formatFn: spec.formatFn, 
                tooltip: spec.tooltip,
                onClickCell: spec.onClickCell,
            }));
        const rows: TableRow<Item, string>[] = [];
        for (const [label, item] of items) {
            const row: TableRow<Item, string> = {
                data: item, label, items: {} };
            for (const spec of columnSpecs) {
                row.items[spec.label] = spec.valueFn(item);
            }
            rows.push(row);
        }
        return new TableBuilder({ columns, rows });
    }
    
    static fromKeyedItems<K extends PropertyKey, Item extends { [key in K]: string }>(
        items: Iterable<Item>,
        key: K,
        columnSpecs: ColumnSpec<Item, string>[],
    ): TableBuilder<Item, string> {
        function* toEntries(items: Iterable<Item>): Iterable<[string, Item]> {
            for (const item of items) {
                yield [item[key], item];
            }
        }

        return TableBuilder.fromItems(toEntries(items), columnSpecs);
    }

    static fromNamedItems<Item extends { name: string }>(
        items: Iterable<Item>,
        columnSpecs: ColumnSpec<Item, string>[],
    ): TableBuilder<Item, string> {
        return TableBuilder.fromKeyedItems(items, 'name', columnSpecs);
    }

    static fromRecordItems<Item extends Object>(
        rowData: Record<string, Item>,
        columnSpecs: ColumnSpec<Item, string>[],
    ): TableBuilder<Item, string> {
        return TableBuilder.fromItems(Object.entries(rowData), columnSpecs);
    }

    static fromMapItems<Item extends Object>(
        rowData: Map<string, Item>,
        columnSpecs: ColumnSpec<Item, string>[],
    ): TableBuilder<Item, string> {
        return TableBuilder.fromItems(rowData.entries(), columnSpecs);
    }

    static fromColumnData<ColumnData extends Object>(
        columnData: Iterable<ColumnData>,
        columnLabelFn: (col: ColumnData) => string,
        columnItemFn: (col: ColumnData) => Record<string, number>,
        formatFn: (value: number) => string,
    ): TableBuilder<string, ColumnData> {
        const columns: TableColumn<string, ColumnData>[] = [];
        const rowsObj: Record<string, TableRow<string, ColumnData>> = {};
        for (const columnDataItem of columnData) {
            const label = columnLabelFn(columnDataItem);
            columns.push({ data: columnDataItem, label, formatFn });
            for (const [rowLabel, value] of Object.entries(columnItemFn(columnDataItem))) {
                if (!rowsObj[rowLabel]) {
                    rowsObj[rowLabel] = { label: rowLabel, items: {} };
                }
                rowsObj[rowLabel].items[label] = value;
            }
        }

        return new TableBuilder({ columns, rows: Object.values(rowsObj) });
    }

    static crossTab<Data extends Object>(
        data: Iterable<Data>,
        labelFn: (item: Data) => string,
        valueFn: (row: Data, col: Data) => number,
        formatFn: (value: number) => string,
        rowTooltip?: Snippet<[Data, Data]>,
    ): TableBuilder<Data, Data> {
        const items = [...data];
        const columns: TableColumn<Data, Data>[] = items.map(item => 
            ({ data: item, label: labelFn(item), formatFn }));
        const rows: TableRow<Data, Data>[] = [];
        for (const rowKey of data) {
            const row: TableRow<Data, Data> = { label: labelFn(rowKey), items: {}, data: rowKey };
            if (rowTooltip) {
                row.tooltip = rowTooltip;
            }
            rows.push(row);

            for (const colKey of data) {
                const value = valueFn(rowKey, colKey);
                row.items[labelFn(colKey)] = value;
            }
        }
        return new TableBuilder({ columns, rows });
    }

    addAggregateRow(
        label: string,
        aggregateFn: (items: [RowData, number][]) => number,
    ): this {
        const aggregateRow: TableRow<RowData, ColumnData> = { label, items: {}, bold: true };
        for (const column of this.table_.columns) {
            const values = this.table_.rows.map(
                row => [row.data, row.items[column.label] ?? 0] as [RowData, number]);
            aggregateRow.items[column.label] = aggregateFn(values);
        }
        this.table_.rows.push(aggregateRow);
        return this;
    }

    addTotalRow(): this {
        return this.addAggregateRow('Total', items => sumFun(items, o => o[1]));
    }

    addAverageRow(weightFn?: (obj: RowData) => number): this {
        return this.addAggregateRow(
            'Average', 
            items => weightedAverage(items, o => o[1], o => weightFn ? weightFn(o[0]) : 1));
    }

    hideColumnHeaders(): this {
        this.table_.hideColumnHeaders = true;
        return this;
    }

    onClickRowHeader(fn: (row: RowData) => void): this {
        this.table_.onClickRowHeader = fn;
        return this;
    }
}

export function mapRecord<T, U>(record: Record<string, T>, fn: (value: T) => U): Record<string, U> {
    const result: Record<string, U> = {};
    for (const [key, value] of Object.entries(record)) {
        result[key] = fn(value);
    }
    return result;
}