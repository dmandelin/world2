import type { Snippet } from "svelte";
import { sumFun } from "../model/lib/basics";
import { weightedAverage } from "../model/lib/modelbasics";

export interface Table<RowData extends Object, ColumnData extends Object> {
    columns: TableColumn<ColumnData>[];
    rows: TableRow<RowData, ColumnData>[];
}

export interface TableColumn<ColumnData extends Object> {
    data?: ColumnData;
    label: string;
}

export interface TableRow<RowData extends Object, ColumnData extends Object> {
    data?: RowData;
    label: string;

    items: Record<string, number>;

    tooltip?: Snippet<[RowData, ColumnData]>;
    bold?: boolean;
}

export interface ColumnSpec<RowData extends Object> {
    label: string;
    valueFn: (row: RowData) => number;
}

export class TableBuilder<RowData extends Object, ColumnData extends Object> {
    constructor(private table_: Table<RowData, ColumnData>) {}

    get table(): Table<RowData, ColumnData> {
        return this.table_;
    }

    static fromRecordItems<RecordItem extends Object>(
        rowData: Record<string, RecordItem>,
        columnSpecs: ColumnSpec<RecordItem>[],
    ): TableBuilder<RecordItem, string> {
        const columns: TableColumn<string>[] = columnSpecs.map(
            spec => ({ label: spec.label }));
        const rows: TableRow<RecordItem, string>[] = [];
        for (const [rowLabel, recordItem] of Object.entries(rowData)) {
            const row: TableRow<RecordItem, string> = { 
                data: recordItem, label: rowLabel, items: {} };
            for (const spec of columnSpecs) {
                row.items[spec.label] = spec.valueFn(recordItem);
            }
            rows.push(row);
        }

        return new TableBuilder({ columns, rows });
    }

    static fromColumnData<ColumnData extends Object>(
        columnData: Iterable<ColumnData>,
        columnLabelFn: (col: ColumnData) => string,
        columnItemFn: (col: ColumnData) => Record<string, number>,
    ): TableBuilder<string, ColumnData> {
        const columns: TableColumn<ColumnData>[] = [];
        const rowsObj: Record<string, TableRow<string, ColumnData>> = {};
        for (const columnDataItem of columnData) {
            const label = columnLabelFn(columnDataItem);
            columns.push({ data: columnDataItem, label });
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
        cellFn: (row: Data, col: Data) => number,
        rowTooltip?: Snippet<[Data, Data]>,
    ): TableBuilder<Data, Data> {
        const items = [...data];
        const columns: TableColumn<Data>[] = items.map(item => ({ data: item, label: labelFn(item) }));
        const rows: TableRow<Data, Data>[] = [];
        for (const rowKey of data) {
            const row: TableRow<Data, Data> = { label: labelFn(rowKey), items: {}, data: rowKey };
            if (rowTooltip) {
                row.tooltip = rowTooltip;
            }
            rows.push(row);

            for (const colKey of data) {
                const value = cellFn(rowKey, colKey);
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
}

export function mapRecord<T, U>(record: Record<string, T>, fn: (value: T) => U): Record<string, U> {
    const result: Record<string, U> = {};
    for (const [key, value] of Object.entries(record)) {
        result[key] = fn(value);
    }
    return result;
}