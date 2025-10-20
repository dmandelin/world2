import { sum, sumFun } from "../model/lib/basics";
import { weightedAverage } from "../model/lib/modelbasics";
import type { ClanDTO } from "./dtos";

export interface Table {
    columns: TableColumn[];
    rows: TableRow[];
}

export interface TableColumn {
    label: string;
}

export interface TableRow {
    label: string;
    items: Record<string, number>;

    obj?: Object;

    bold?: boolean;
}

export class TableBuilder {
    constructor(private table_: Table) {}

    get table(): Table {
        return this.table_;
    }

    static fromColumnData<T>(
        columnData: Iterable<T>,
        columnLabelFn: (col: T) => string,
        columnItemFn: (col: T) => Record<string, number>,
    ): TableBuilder {
        const columns: TableColumn[] = [];
        const rowsObj: Record<string, TableRow> = {};
        for (const columnDataItem of columnData) {
            const label = columnLabelFn(columnDataItem);
            columns.push({ label });
            for (const [rowLabel, value] of Object.entries(columnItemFn(columnDataItem))) {
                if (!rowsObj[rowLabel]) {
                    rowsObj[rowLabel] = { label: rowLabel, items: {} };
                }
                rowsObj[rowLabel].items[label] = value;
            }
        }

        return new TableBuilder({ columns, rows: Object.values(rowsObj) });
    }

    static crossTab<K extends Object>(
        data: Iterable<K>,
        labelFn: (item: K) => string,
        cellFn: (row: K, col: K) => number,
    ): TableBuilder {
        const items = [...data];
        const columns: TableColumn[] = items.map(item => ({ label: labelFn(item) }));
        const rows: TableRow[] = [];
        for (const rowKey of data) {
            const row: TableRow = { label: labelFn(rowKey), items: {}, obj: rowKey };
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
        aggregateFn: (items: [Object, number][]) => number,
    ): TableBuilder {
        const aggregateRow: TableRow = { label, items: {}, bold: true };
        for (const column of this.table_.columns) {
            const values = this.table_.rows.map(
                row => [row.obj, row.items[column.label] ?? 0] as [Object, number]);
            aggregateRow.items[column.label] = aggregateFn(values);
        }
        this.table_.rows.push(aggregateRow);
        return this;
    }

    addTotalRow(): TableBuilder {
        return this.addAggregateRow('Total', items => sumFun(items, o => o[1]));
    }

    addAverageRow(weightFn?: (obj: Object) => number): TableBuilder {
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