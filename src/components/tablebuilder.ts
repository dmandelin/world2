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

    addTotalRow(): TableBuilder {
        const totalRow: TableRow = { label: "Total", items: {} };
        for (const column of this.table_.columns) {
            totalRow.items[column.label] = 0;
        }
        for (const row of this.table_.rows) {
            for (const column of this.table_.columns) {
                totalRow.items[column.label] += row.items[column.label] ?? 0;
            }
        }
        this.table_.rows.push(totalRow);
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