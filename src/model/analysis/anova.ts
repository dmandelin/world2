// ANOVA over a snapshot stream.
//
// The model is an ordinary least-squares linear model of the output variable
// on the selected input variables. Numeric inputs enter as single terms;
// categorical inputs are dummy-coded against their most common level, so a
// categorical term carries (levels - 1) degrees of freedom. That makes this
// both a regression and a classical ANOVA depending on what you feed it.
//
// Term sums of squares are partial ("drop one"): the extra variance a term
// explains once every other term is already in the model. With no
// interaction terms that is the usual Type II / Type III sum of squares, and
// unlike sequential sums of squares it doesn't depend on the order the
// variables happen to be listed in.

import { fUpperP, tTwoSidedP } from "./distributions";
import type { SnapshotStream, SnapshotValue } from "../data/sessions";

// Categorical variables beyond this many distinct values are identity-like
// (uuids, names) and would swamp the model, so we don't offer them.
export const MAX_LEVELS = 30;

export type ColumnKind = 'numeric' | 'categorical';

export type ColumnInfo = {
    name: string;
    kind: ColumnKind;
    levelCount: number;
    // Usable as an input variable.
    eligibleInput: boolean;
    // Usable as the output variable (numeric and not constant).
    eligibleOutput: boolean;
    note?: string;
};

export type CoefficientResult = {
    label: string;
    // Slope in the variable's own units (per level, for dummies).
    estimate: number;
    // Slope in standard deviations of the output per standard deviation of
    // the input: comparable across variables.
    standardized: number;
    stdError: number;
    t: number;
    p: number;
};

export type TermResult = {
    name: string;
    kind: ColumnKind;
    df: number;
    sumSq: number;
    meanSq: number;
    f: number;
    p: number;
    // Relationship with the output ignoring every other variable: signed
    // Pearson r for numeric inputs, the correlation ratio eta for
    // categorical ones.
    correlation: number;
    rSquaredAlone: number;
    // Share of the variance left unexplained by the other terms that this
    // term accounts for.
    partialEtaSquared: number;
    coefficients: CoefficientResult[];
    aliasedLabels: string[];
};

export type HistogramBin = {
    start: number;
    end: number;
    count: number;
};

export type ResidualSummary = {
    mean: number;
    sd: number;
    min: number;
    max: number;
    q05: number;
    q25: number;
    median: number;
    q75: number;
    q95: number;
    skewness: number;
    excessKurtosis: number;
    withinOneSd: number;
    withinTwoSd: number;
    histogram: HistogramBin[];
};

export type AnovaResult = {
    output: string;
    n: number;
    rowsDropped: number;
    outputMean: number;
    outputSd: number;

    intercept: number;
    terms: TermResult[];

    modelDf: number;
    modelSumSq: number;
    residualDf: number;
    residualSumSq: number;
    residualMeanSq: number;
    totalDf: number;
    totalSumSq: number;

    rSquared: number;
    adjRSquared: number;
    residualStdError: number;
    fStatistic: number;
    fP: number;

    residuals: ResidualSummary;
    warnings: string[];
};

export type AnovaFailure = { error: string };

export function isAnovaFailure(r: AnovaResult | AnovaFailure): r is AnovaFailure {
    return (r as AnovaFailure).error !== undefined;
}

// ----------------------------------------------------------------
// Column classification

function isNumericValue(v: SnapshotValue): v is number {
    return typeof v === 'number' && Number.isFinite(v);
}

export function describeColumns(stream: SnapshotStream): ColumnInfo[] {
    const names = ['year', ...stream.fields];
    const rows = stream.rows;

    return names.map(name => {
        let numeric = 0;
        let present = 0;
        const levels = new Set<string>();
        let numericMin = Infinity;
        let numericMax = -Infinity;

        for (const row of rows) {
            const v = row[name];
            if (v === null || v === undefined) continue;
            present++;
            if (isNumericValue(v)) {
                numeric++;
                if (v < numericMin) numericMin = v;
                if (v > numericMax) numericMax = v;
            }
            if (levels.size <= MAX_LEVELS) levels.add(String(v));
        }

        const kind: ColumnKind = present > 0 && numeric === present ? 'numeric' : 'categorical';
        const levelCount = levels.size;

        if (kind === 'numeric') {
            const constant = present === 0 || numericMin === numericMax;
            return {
                name,
                kind,
                levelCount,
                eligibleInput: !constant,
                eligibleOutput: !constant,
                note: constant ? 'constant' : undefined,
            };
        }

        const tooMany = levelCount > MAX_LEVELS;
        return {
            name,
            kind,
            levelCount,
            eligibleInput: !tooMany && levelCount > 1,
            eligibleOutput: false,
            note: tooMany
                ? `too many levels (> ${MAX_LEVELS})`
                : levelCount <= 1 ? 'constant' : `${levelCount} levels`,
        };
    });
}

// ----------------------------------------------------------------
// Design matrix

type DesignColumn = {
    term: number;
    label: string;
    // Centered and scaled to unit standard deviation, for conditioning.
    scaled: Float64Array;
    rawMean: number;
    rawSd: number;
};

type Term = {
    name: string;
    kind: ColumnKind;
    columnIndexes: number[];
    // Raw values for the standalone correlation, one per used row.
    numericValues?: Float64Array;
    levelOf?: Int32Array;
    levelCount?: number;
};

export function runAnova(
    stream: SnapshotStream,
    outputName: string,
    inputNames: readonly string[],
): AnovaResult | AnovaFailure {
    const infos = new Map(describeColumns(stream).map(c => [c.name, c]));

    const outputInfo = infos.get(outputName);
    if (!outputInfo) return { error: `Unknown output variable "${outputName}".` };
    if (!outputInfo.eligibleOutput) {
        return { error: `"${outputName}" can't be an output variable (${outputInfo.note ?? 'not numeric'}).` };
    }

    const warnings: string[] = [];
    const inputs = inputNames.filter(name => name !== outputName);
    const usable: ColumnInfo[] = [];
    for (const name of inputs) {
        const info = infos.get(name);
        if (!info) continue;
        if (!info.eligibleInput) {
            warnings.push(`Skipped "${name}": ${info.note ?? 'unusable'}.`);
            continue;
        }
        usable.push(info);
    }
    if (usable.length === 0) return { error: 'Select at least one usable input variable.' };

    // Rows where the output and every input is present.
    const rows = stream.rows;
    const used: number[] = [];
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!isNumericValue(row[outputName])) continue;
        let ok = true;
        for (const info of usable) {
            const v = row[info.name];
            if (v === null || v === undefined) { ok = false; break; }
            if (info.kind === 'numeric' && !isNumericValue(v)) { ok = false; break; }
        }
        if (ok) used.push(i);
    }

    const n = used.length;
    const rowsDropped = rows.length - n;
    if (n < 3) return { error: `Only ${n} complete observations; need at least 3.` };

    // Output vector.
    const y = new Float64Array(n);
    for (let i = 0; i < n; i++) y[i] = rows[used[i]][outputName] as number;
    const yMean = mean(y);
    const yCentered = new Float64Array(n);
    for (let i = 0; i < n; i++) yCentered[i] = y[i] - yMean;
    const totalSumSq = dot(yCentered, yCentered);
    if (totalSumSq <= 0) return { error: `"${outputName}" is constant over these rows.` };
    const ySd = Math.sqrt(totalSumSq / (n - 1));

    // Design columns.
    const columns: DesignColumn[] = [];
    const terms: Term[] = [];

    for (const info of usable) {
        const termIndex = terms.length;
        if (info.kind === 'numeric') {
            const raw = new Float64Array(n);
            for (let i = 0; i < n; i++) raw[i] = rows[used[i]][info.name] as number;
            const column = makeColumn(termIndex, info.name, raw);
            if (!column) {
                warnings.push(`Skipped "${info.name}": constant over these rows.`);
                continue;
            }
            terms.push({
                name: info.name,
                kind: 'numeric',
                columnIndexes: [columns.length],
                numericValues: raw,
            });
            columns.push(column);
        } else {
            const strings = used.map(i => String(rows[i][info.name]));
            const counts = new Map<string, number>();
            for (const s of strings) counts.set(s, (counts.get(s) ?? 0) + 1);
            const levels = [...counts.keys()].sort((a, b) =>
                (counts.get(b)! - counts.get(a)!) || a.localeCompare(b));
            if (levels.length < 2) {
                warnings.push(`Skipped "${info.name}": only one level over these rows.`);
                continue;
            }
            const levelIndex = new Map(levels.map((l, i) => [l, i]));
            const levelOf = new Int32Array(n);
            for (let i = 0; i < n; i++) levelOf[i] = levelIndex.get(strings[i])!;

            // Level 0 is the most common one and serves as the reference.
            const columnIndexes: number[] = [];
            for (let l = 1; l < levels.length; l++) {
                const raw = new Float64Array(n);
                for (let i = 0; i < n; i++) raw[i] = levelOf[i] === l ? 1 : 0;
                const column = makeColumn(termIndex, `${info.name} = ${levels[l]}`, raw);
                if (!column) continue;
                columnIndexes.push(columns.length);
                columns.push(column);
            }
            if (columnIndexes.length === 0) {
                warnings.push(`Skipped "${info.name}": no usable levels.`);
                continue;
            }
            terms.push({
                name: `${info.name} (vs ${levels[0]})`,
                kind: 'categorical',
                columnIndexes,
                levelOf,
                levelCount: levels.length,
            });
        }
    }

    const p = columns.length;
    if (p === 0) return { error: 'No usable input variables after screening.' };
    if (n <= p + 1) {
        return { error: `Model has ${p} predictors but only ${n} observations.` };
    }

    // Cross-products. Everything downstream works off these, so refitting
    // sub-models costs O(p^3) rather than another pass over the data.
    const gram = crossProducts(columns, n);
    const xy = new Float64Array(p);
    for (let j = 0; j < p; j++) xy[j] = dot(columns[j].scaled, yCentered);

    const full = solve(gram, xy, indexRange(p));
    const modelDf = full.kept.length;
    const modelSumSq = full.explainedSumSq;
    const residualDf = n - modelDf - 1;
    if (residualDf <= 0) return { error: 'Not enough residual degrees of freedom; use fewer inputs.' };

    const residualSumSq = Math.max(0, totalSumSq - modelSumSq);
    const residualMeanSq = residualSumSq / residualDf;

    const keptSet = new Set(full.kept);
    for (let j = 0; j < p; j++) {
        if (!keptSet.has(j)) {
            warnings.push(`Dropped "${columns[j].label}": redundant with other inputs (perfectly predictable from them).`);
        }
    }

    // Standard errors from the inverse cross-product matrix.
    const invDiag = inverseDiagonal(full);

    // Per-term partial sums of squares. Comparisons run against the columns
    // the full fit actually retained: if we dropped a term's column back into
    // the reduced model, an aliased duplicate would silently take its place
    // and every collinear term would look like it contributes nothing.
    const termResults: TermResult[] = terms.map((term) => {
        const remaining = full.kept.filter(j => !term.columnIndexes.includes(j));
        const reduced = remaining.length
            ? solve(gram, xy, remaining)
            : { kept: [] as number[], explainedSumSq: 0, coefficients: [] as number[], lower: [] as number[][] };
        const df = full.kept.length - reduced.kept.length;
        const sumSq = Math.max(0, modelSumSq - reduced.explainedSumSq);
        const meanSq = df > 0 ? sumSq / df : 0;
        const f = df > 0 && residualMeanSq > 0 ? meanSq / residualMeanSq : NaN;
        const pValue = df > 0 ? fUpperP(f, df, residualDf) : NaN;

        const coefficients: CoefficientResult[] = [];
        const aliasedLabels: string[] = [];
        for (const j of term.columnIndexes) {
            const slot = full.kept.indexOf(j);
            const column = columns[j];
            if (slot < 0) {
                aliasedLabels.push(column.label);
                continue;
            }
            const scaledEstimate = full.coefficients[slot];
            const stdErrorScaled = Math.sqrt(Math.max(0, residualMeanSq * invDiag[slot]));
            const t = stdErrorScaled > 0 ? scaledEstimate / stdErrorScaled : NaN;
            coefficients.push({
                label: column.label,
                estimate: scaledEstimate / column.rawSd,
                standardized: ySd > 0 ? scaledEstimate / ySd : 0,
                stdError: stdErrorScaled / column.rawSd,
                t,
                p: tTwoSidedP(t, residualDf),
            });
        }

        const { correlation, rSquaredAlone } = standaloneAssociation(term, yCentered, totalSumSq);

        return {
            name: term.name,
            kind: term.kind,
            df,
            sumSq,
            meanSq,
            f,
            p: pValue,
            correlation,
            rSquaredAlone,
            partialEtaSquared: sumSq + residualSumSq > 0 ? sumSq / (sumSq + residualSumSq) : 0,
            coefficients,
            aliasedLabels,
        };
    });

    // Fitted values and residuals.
    const residuals = new Float64Array(n);
    for (let i = 0; i < n; i++) {
        let fitted = 0;
        for (let s = 0; s < full.kept.length; s++) {
            fitted += full.coefficients[s] * columns[full.kept[s]].scaled[i];
        }
        residuals[i] = yCentered[i] - fitted;
    }

    // Intercept in the original units.
    let intercept = yMean;
    for (let s = 0; s < full.kept.length; s++) {
        const column = columns[full.kept[s]];
        intercept -= (full.coefficients[s] / column.rawSd) * column.rawMean;
    }

    const rSquared = modelSumSq / totalSumSq;
    const adjRSquared = 1 - (1 - rSquared) * ((n - 1) / residualDf);
    const fStatistic = modelDf > 0 && residualMeanSq > 0
        ? (modelSumSq / modelDf) / residualMeanSq
        : NaN;

    return {
        output: outputName,
        n,
        rowsDropped,
        outputMean: yMean,
        outputSd: ySd,
        intercept,
        terms: termResults,
        modelDf,
        modelSumSq,
        residualDf,
        residualSumSq,
        residualMeanSq,
        totalDf: n - 1,
        totalSumSq,
        rSquared,
        adjRSquared,
        residualStdError: Math.sqrt(residualMeanSq),
        fStatistic,
        fP: fUpperP(fStatistic, modelDf, residualDf),
        residuals: summarizeResiduals(residuals),
        warnings,
    };
}

// ----------------------------------------------------------------
// Linear algebra
//
// The design is centered, so the intercept is handled separately and the
// cross-product matrix is the (scaled) covariance of the predictors.

function makeColumn(term: number, label: string, raw: Float64Array): DesignColumn | undefined {
    const n = raw.length;
    const m = mean(raw);
    let ss = 0;
    for (let i = 0; i < n; i++) ss += (raw[i] - m) ** 2;
    const sd = Math.sqrt(ss / (n - 1));
    if (!(sd > 0)) return undefined;

    const scaled = new Float64Array(n);
    for (let i = 0; i < n; i++) scaled[i] = (raw[i] - m) / sd;
    return { term, label, scaled, rawMean: m, rawSd: sd };
}

function crossProducts(columns: DesignColumn[], n: number): number[][] {
    const p = columns.length;
    const gram: number[][] = Array.from({ length: p }, () => new Array(p).fill(0));
    for (let a = 0; a < p; a++) {
        const ca = columns[a].scaled;
        for (let b = a; b < p; b++) {
            const cb = columns[b].scaled;
            let sum = 0;
            for (let i = 0; i < n; i++) sum += ca[i] * cb[i];
            gram[a][b] = sum;
            gram[b][a] = sum;
        }
    }
    return gram;
}

type Solution = {
    // Original column indexes retained, in order.
    kept: number[];
    // Cholesky factor over the retained columns.
    lower: number[][];
    coefficients: number[];
    explainedSumSq: number;
};

// Cholesky with pivot screening: columns that are linear combinations of
// earlier ones get dropped rather than blowing the factorization up.
function solve(gram: number[][], xy: Float64Array, active: number[]): Solution {
    const m = active.length;
    const kept: number[] = [];
    const rows: number[][] = Array.from({ length: m }, () => []);
    const tolerance = 1e-9;

    for (let k = 0; k < m; k++) {
        const gk = active[k];
        let d = gram[gk][gk];
        for (let j = 0; j < kept.length; j++) d -= rows[k][j] ** 2;
        if (d <= tolerance * Math.max(1e-12, gram[gk][gk])) continue;

        const s = Math.sqrt(d);
        for (let i = k + 1; i < m; i++) {
            const gi = active[i];
            let v = gram[gi][gk];
            for (let j = 0; j < kept.length; j++) v -= rows[i][j] * rows[k][j];
            rows[i].push(v / s);
        }
        rows[k].push(s);
        kept.push(gk);
    }

    // Rows for kept columns, in kept order, form the lower-triangular factor.
    const lower: number[][] = [];
    for (let k = 0, slot = 0; k < m; k++) {
        if (slot < kept.length && active[k] === kept[slot]) {
            lower.push(rows[k]);
            slot++;
        }
    }

    // L z = X'y, then L' b = z.
    const r = kept.length;
    const z = new Array(r).fill(0);
    for (let i = 0; i < r; i++) {
        let v = xy[kept[i]];
        for (let j = 0; j < i; j++) v -= lower[i][j] * z[j];
        z[i] = v / lower[i][i];
    }
    const coefficients = new Array(r).fill(0);
    for (let i = r - 1; i >= 0; i--) {
        let v = z[i];
        for (let j = i + 1; j < r; j++) v -= lower[j][i] * coefficients[j];
        coefficients[i] = v / lower[i][i];
    }

    let explainedSumSq = 0;
    for (let i = 0; i < r; i++) explainedSumSq += z[i] * z[i];

    return { kept, lower, coefficients, explainedSumSq };
}

// Diagonal of (X'X)^-1 over the retained columns.
function inverseDiagonal(solution: Solution): number[] {
    const r = solution.kept.length;
    const L = solution.lower;

    // Invert the lower-triangular factor.
    const inv: number[][] = Array.from({ length: r }, () => new Array(r).fill(0));
    for (let i = 0; i < r; i++) {
        inv[i][i] = 1 / L[i][i];
        for (let j = 0; j < i; j++) {
            let sum = 0;
            for (let k = j; k < i; k++) sum += L[i][k] * inv[k][j];
            inv[i][j] = -sum / L[i][i];
        }
    }

    // (L L')^-1 = L'^-1 L^-1, whose diagonal is the column norms of L^-1.
    const diag = new Array(r).fill(0);
    for (let i = 0; i < r; i++) {
        let sum = 0;
        for (let j = i; j < r; j++) sum += inv[j][i] ** 2;
        diag[i] = sum;
    }
    return diag;
}

// ----------------------------------------------------------------
// Standalone association between one input and the output

function standaloneAssociation(
    term: Term,
    yCentered: Float64Array,
    totalSumSq: number,
): { correlation: number; rSquaredAlone: number } {
    const n = yCentered.length;

    if (term.kind === 'numeric' && term.numericValues) {
        const x = term.numericValues;
        const xMean = mean(x);
        let sxy = 0;
        let sxx = 0;
        for (let i = 0; i < n; i++) {
            const dx = x[i] - xMean;
            sxy += dx * yCentered[i];
            sxx += dx * dx;
        }
        const denom = Math.sqrt(sxx * totalSumSq);
        const r = denom > 0 ? sxy / denom : 0;
        return { correlation: r, rSquaredAlone: r * r };
    }

    // Correlation ratio: between-group share of the output's variance.
    const levelOf = term.levelOf!;
    const levelCount = term.levelCount!;
    const sums = new Float64Array(levelCount);
    const counts = new Float64Array(levelCount);
    for (let i = 0; i < n; i++) {
        sums[levelOf[i]] += yCentered[i];
        counts[levelOf[i]] += 1;
    }
    let between = 0;
    for (let l = 0; l < levelCount; l++) {
        if (counts[l] > 0) between += (sums[l] * sums[l]) / counts[l];
    }
    const etaSquared = totalSumSq > 0 ? between / totalSumSq : 0;
    return { correlation: Math.sqrt(Math.max(0, etaSquared)), rSquaredAlone: etaSquared };
}

// ----------------------------------------------------------------
// Residual diagnostics

function summarizeResiduals(residuals: Float64Array): ResidualSummary {
    const n = residuals.length;
    const sorted = Float64Array.from(residuals).sort();

    const m = mean(residuals);
    let m2 = 0;
    let m3 = 0;
    let m4 = 0;
    for (let i = 0; i < n; i++) {
        const d = residuals[i] - m;
        m2 += d * d;
        m3 += d * d * d;
        m4 += d * d * d * d;
    }
    m2 /= n;
    m3 /= n;
    m4 /= n;
    const sd = Math.sqrt(m2);

    let withinOne = 0;
    let withinTwo = 0;
    if (sd > 0) {
        for (let i = 0; i < n; i++) {
            const d = Math.abs(residuals[i] - m);
            if (d <= sd) withinOne++;
            if (d <= 2 * sd) withinTwo++;
        }
    }

    return {
        mean: m,
        sd,
        min: sorted[0],
        max: sorted[n - 1],
        q05: quantile(sorted, 0.05),
        q25: quantile(sorted, 0.25),
        median: quantile(sorted, 0.5),
        q75: quantile(sorted, 0.75),
        q95: quantile(sorted, 0.95),
        skewness: sd > 0 ? m3 / Math.pow(m2, 1.5) : 0,
        excessKurtosis: sd > 0 ? m4 / (m2 * m2) - 3 : 0,
        withinOneSd: withinOne / n,
        withinTwoSd: withinTwo / n,
        histogram: histogram(sorted, 25),
    };
}

function histogram(sorted: Float64Array, binCount: number): HistogramBin[] {
    const n = sorted.length;
    const lo = sorted[0];
    const hi = sorted[n - 1];
    if (!(hi > lo)) return [{ start: lo, end: hi, count: n }];

    const width = (hi - lo) / binCount;
    const bins: HistogramBin[] = Array.from({ length: binCount }, (_, i) => ({
        start: lo + i * width,
        end: lo + (i + 1) * width,
        count: 0,
    }));
    for (let i = 0; i < n; i++) {
        let b = Math.floor((sorted[i] - lo) / width);
        if (b >= binCount) b = binCount - 1;
        if (b < 0) b = 0;
        bins[b].count++;
    }
    return bins;
}

function quantile(sorted: Float64Array, q: number): number {
    const n = sorted.length;
    if (n === 0) return NaN;
    const pos = (n - 1) * q;
    const lo = Math.floor(pos);
    const hi = Math.ceil(pos);
    if (lo === hi) return sorted[lo];
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

// ----------------------------------------------------------------

function mean(values: Float64Array): number {
    let sum = 0;
    for (let i = 0; i < values.length; i++) sum += values[i];
    return sum / values.length;
}

function dot(a: Float64Array, b: Float64Array): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
    return sum;
}

function indexRange(p: number): number[] {
    return Array.from({ length: p }, (_, i) => i);
}
