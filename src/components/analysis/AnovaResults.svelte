<script lang="ts">
    import type { AnovaResult, CoefficientResult } from "../../model/analysis/anova";
    import { significanceStars } from "../../model/analysis/distributions";
    import { fixed, num, pValue, percent, signedNum } from "./format";

    let { result }: { result: AnovaResult } = $props();

    const allCoefficients = $derived(
        result.terms.flatMap((t) =>
            t.coefficients.map((c) => ({ term: t.name, ...c })),
        ),
    );

    // Ordered strongest-first so the equation reads as a ranking.
    const rankedCoefficients = $derived(
        [...allCoefficients].sort(
            (a, b) => Math.abs(b.standardized) - Math.abs(a.standardized),
        ),
    );

    const maxBin = $derived(
        Math.max(1, ...result.residuals.histogram.map((b) => b.count)),
    );

    function shareOfExplained(sumSq: number): number {
        return result.modelSumSq > 0 ? sumSq / result.modelSumSq : 0;
    }

    function coefficientLabel(c: CoefficientResult): string {
        return c.label;
    }
</script>

<section>
    <h3>Model summary</h3>
    <div class="cards">
        <div class="card">
            <div class="card-value">{percent(result.rSquared, 1)}</div>
            <div class="card-label">R² — variance explained</div>
        </div>
        <div class="card">
            <div class="card-value">{percent(result.adjRSquared, 1)}</div>
            <div class="card-label">Adjusted R²</div>
        </div>
        <div class="card">
            <div class="card-value">{num(result.residualStdError)}</div>
            <div class="card-label">Residual std. error</div>
        </div>
        <div class="card">
            <div class="card-value">{num(result.fStatistic)}</div>
            <div class="card-label">
                F({result.modelDf}, {result.residualDf}), p {pValue(result.fP)}
            </div>
        </div>
        <div class="card">
            <div class="card-value">{result.n.toLocaleString()}</div>
            <div class="card-label">
                observations{result.rowsDropped
                    ? `, ${result.rowsDropped.toLocaleString()} dropped`
                    : ""}
            </div>
        </div>
    </div>

    <p class="plain">
        The model accounts for <strong>{percent(result.rSquared, 1)}</strong> of
        the variation in <strong>{result.output}</strong>, whose mean is
        {num(result.outputMean)} and standard deviation {num(result.outputSd)}.
        Typical prediction error is <strong>±{num(result.residualStdError)}</strong>,
        against a baseline of ±{num(result.outputSd)} if you just guessed the
        mean every time.
    </p>

    {#if result.warnings.length}
        <ul class="warnings">
            {#each result.warnings as warning}
                <li>{warning}</li>
            {/each}
        </ul>
    {/if}
</section>

<section>
    <h3>ANOVA table</h3>
    <p class="note">
        Sums of squares are partial: each is the extra variation a variable
        explains once all the others are already accounted for.
    </p>
    <table>
        <thead>
            <tr>
                <th class="left">Source</th>
                <th>df</th>
                <th>Sum Sq</th>
                <th>Mean Sq</th>
                <th>F</th>
                <th>p</th>
                <th class="left"></th>
            </tr>
        </thead>
        <tbody>
            {#each result.terms as term}
                <tr class:aliased={term.df === 0}>
                    <td class="left">
                        {term.name}
                        {#if term.df === 0}
                            <span class="aliased-tag">redundant</span>
                        {/if}
                    </td>
                    <td>{term.df}</td>
                    <td>{num(term.sumSq)}</td>
                    <td>{num(term.meanSq)}</td>
                    <td>{num(term.f)}</td>
                    <td>{pValue(term.p)}</td>
                    <td class="left stars">{significanceStars(term.p)}</td>
                </tr>
            {/each}
            <tr class="rule">
                <td class="left">Residual</td>
                <td>{result.residualDf}</td>
                <td>{num(result.residualSumSq)}</td>
                <td>{num(result.residualMeanSq)}</td>
                <td></td>
                <td></td>
                <td></td>
            </tr>
            <tr>
                <td class="left">Model</td>
                <td>{result.modelDf}</td>
                <td>{num(result.modelSumSq)}</td>
                <td>{num(result.modelSumSq / Math.max(1, result.modelDf))}</td>
                <td>{num(result.fStatistic)}</td>
                <td>{pValue(result.fP)}</td>
                <td class="left stars">{significanceStars(result.fP)}</td>
            </tr>
            <tr class="total">
                <td class="left">Total</td>
                <td>{result.totalDf}</td>
                <td>{num(result.totalSumSq)}</td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
            </tr>
        </tbody>
    </table>
    <p class="legend">
        Significance: *** p &lt; 0.001 · ** p &lt; 0.01 · * p &lt; 0.05 · . p &lt; 0.1
    </p>
</section>

<section>
    <h3>Strength of association</h3>
    <p class="note">
        On its own: how the variable tracks the output when nothing else is
        controlled for (Pearson r for numeric variables, the correlation ratio
        η for categorical ones). Unique: what it still explains after the
        others have had their say.
    </p>
    <table>
        <thead>
            <tr>
                <th class="left">Variable</th>
                <th>r / η</th>
                <th>r² alone</th>
                <th>partial η²</th>
                <th>share of explained</th>
                <th class="left">Direction</th>
            </tr>
        </thead>
        <tbody>
            {#each [...result.terms].sort((a, b) => b.partialEtaSquared - a.partialEtaSquared) as term}
                <tr>
                    <td class="left">{term.name}</td>
                    <td>{fixed(term.correlation, 3)}</td>
                    <td>{percent(term.rSquaredAlone, 1)}</td>
                    <td>{percent(term.partialEtaSquared, 1)}</td>
                    <td>
                        <div class="bar-cell">
                            <span class="bar-figure"
                                >{percent(shareOfExplained(term.sumSq), 1)}</span
                            >
                            <span
                                class="bar"
                                style="width: {Math.round(
                                    100 * shareOfExplained(term.sumSq),
                                )}%"
                            ></span>
                        </div>
                    </td>
                    <td class="left">
                        {#if term.kind === "categorical"}
                            varies by level
                        {:else if term.correlation > 0}
                            higher {term.name} → higher {result.output}
                        {:else if term.correlation < 0}
                            higher {term.name} → lower {result.output}
                        {:else}
                            none
                        {/if}
                    </td>
                </tr>
            {/each}
        </tbody>
    </table>
</section>

<section>
    <h3>Learned predictor function</h3>
    <pre class="equation">{result.output} ≈ {num(result.intercept, 5)}
{rankedCoefficients
        .map(
            (c) =>
                `   ${signedNum(c.estimate, 5)} × ${coefficientLabel(c)}`,
        )
        .join("\n")}</pre>
    <p class="note">
        Terms are listed strongest first. For a categorical variable each line
        is the shift relative to its reference level, which is folded into the
        constant.
    </p>

    <table>
        <thead>
            <tr>
                <th class="left">Term</th>
                <th>Estimate</th>
                <th>Std. error</th>
                <th>t</th>
                <th>p</th>
                <th class="left"></th>
                <th>Standardized β</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td class="left">(constant)</td>
                <td>{num(result.intercept, 5)}</td>
                <td colspan="5"></td>
            </tr>
            {#each rankedCoefficients as c}
                <tr>
                    <td class="left">{c.label}</td>
                    <td>{num(c.estimate, 5)}</td>
                    <td>{num(c.stdError, 3)}</td>
                    <td>{fixed(c.t, 2)}</td>
                    <td>{pValue(c.p)}</td>
                    <td class="left stars">{significanceStars(c.p)}</td>
                    <td>{fixed(c.standardized, 3)}</td>
                </tr>
            {/each}
        </tbody>
    </table>
    <p class="legend">
        Standardized β is the change in {result.output}, in its own standard
        deviations, per one standard deviation of the input — the fair way to
        compare variables measured on different scales.
    </p>
</section>

<section>
    <h3>Error distribution</h3>
    <p class="plain">
        Half the errors fall between {num(result.residuals.q25)} and
        {num(result.residuals.q75)}, and
        {percent(result.residuals.withinTwoSd, 0)} of them are within
        ±{num(2 * result.residuals.sd)}.
        {#if Math.abs(result.residuals.skewness) < 0.5 && Math.abs(result.residuals.excessKurtosis) < 1}
            The errors are close to symmetric and bell-shaped, which is what
            the p-values above assume.
        {:else if Math.abs(result.residuals.skewness) >= 0.5}
            The errors are skewed, with a long tail of
            {result.residuals.skewness > 0
                ? "under-predictions (actual well above predicted)"
                : "over-predictions (actual well below predicted)"}, so treat
            the p-values as approximate.
        {:else}
            The errors are heavy-tailed relative to a normal distribution, so
            treat the p-values as approximate.
        {/if}
    </p>

    <div class="residual-stats">
        <div><span>Mean</span>{num(result.residuals.mean)}</div>
        <div><span>Std. dev.</span>{num(result.residuals.sd)}</div>
        <div><span>Min</span>{num(result.residuals.min)}</div>
        <div><span>5%</span>{num(result.residuals.q05)}</div>
        <div><span>25%</span>{num(result.residuals.q25)}</div>
        <div><span>Median</span>{num(result.residuals.median)}</div>
        <div><span>75%</span>{num(result.residuals.q75)}</div>
        <div><span>95%</span>{num(result.residuals.q95)}</div>
        <div><span>Max</span>{num(result.residuals.max)}</div>
        <div><span>Skewness</span>{fixed(result.residuals.skewness, 2)}</div>
        <div>
            <span>Excess kurtosis</span>{fixed(
                result.residuals.excessKurtosis,
                2,
            )}
        </div>
        <div>
            <span>Within ±1 sd</span>{percent(result.residuals.withinOneSd, 0)}
        </div>
    </div>

    <div class="histogram">
        {#each result.residuals.histogram as bin}
            <div
                class="hbin"
                title="{num(bin.start)} to {num(bin.end)}: {bin.count.toLocaleString()}"
            >
                <div
                    class="hbar"
                    style="height: {Math.max(
                        1,
                        Math.round((100 * bin.count) / maxBin),
                    )}%"
                ></div>
            </div>
        {/each}
    </div>
    <div class="histogram-axis">
        <span>{num(result.residuals.min)}</span>
        <span>residual (actual − predicted)</span>
        <span>{num(result.residuals.max)}</span>
    </div>
</section>

<style>
    section {
        margin-bottom: 2rem;
    }

    h3 {
        margin-bottom: 0.4rem;
    }

    .note,
    .legend {
        color: #62531d;
        font-size: 0.85rem;
        margin: 0.2rem 0 0.6rem;
        max-width: 46rem;
    }

    .plain {
        max-width: 46rem;
        margin: 0.4rem 0 0.8rem;
    }

    .cards {
        display: flex;
        flex-wrap: wrap;
        gap: 0.6rem;
    }

    .card {
        border: 2px solid #62531d;
        border-radius: 4px;
        background-color: #fffdf6;
        padding: 0.4rem 0.7rem;
        min-width: 8rem;
    }

    .card-value {
        font-size: 1.15rem;
        font-weight: bold;
    }

    .card-label {
        font-size: 0.75rem;
        color: #62531d;
    }

    .warnings {
        margin: 0.8rem 0 0;
        padding-left: 1.2rem;
        color: #7a5a12;
        font-size: 0.85rem;
    }

    table {
        border-collapse: collapse;
        font-size: 0.85rem;
    }

    th,
    td {
        border: 1px solid #c9be92;
        padding: 0.15rem 0.5rem;
        text-align: right;
        white-space: nowrap;
    }

    th {
        background-color: #f0ebd1;
    }

    th.left,
    td.left {
        text-align: left;
    }

    tr.rule td {
        border-top: 2px solid #62531d;
    }

    tr.total td {
        font-weight: bold;
    }

    .stars {
        color: #a02020;
        font-weight: bold;
        letter-spacing: 0.1em;
    }

    tr.aliased td {
        color: #8a7c4e;
    }

    .aliased-tag {
        font-size: 0.7rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        border: 1px solid #c9be92;
        border-radius: 3px;
        padding: 0 0.25rem;
        margin-left: 0.3rem;
    }

    .bar-cell {
        position: relative;
        display: flex;
        justify-content: flex-end;
        min-width: 7rem;
    }

    .bar-figure {
        position: relative;
        z-index: 1;
    }

    .bar {
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        background-color: #d8cfa4;
        border-radius: 2px;
    }

    .equation {
        margin: 0.4rem 0;
        padding: 0.6rem 0.8rem;
        border: 2px solid #62531d;
        border-radius: 4px;
        background-color: #fffdf6;
        font-family: monospace;
        font-size: 0.8rem;
        overflow-x: auto;
        max-width: 46rem;
    }

    .residual-stats {
        display: flex;
        flex-wrap: wrap;
        gap: 0.3rem 0.8rem;
        font-size: 0.85rem;
        margin-bottom: 0.8rem;
    }

    .residual-stats div {
        border: 1px solid #c9be92;
        border-radius: 3px;
        background-color: #fffdf6;
        padding: 0.1rem 0.45rem;
    }

    .residual-stats span {
        color: #62531d;
        margin-right: 0.4rem;
    }

    .histogram {
        display: flex;
        align-items: flex-end;
        gap: 1px;
        height: 110px;
        max-width: 46rem;
        border-bottom: 2px solid #62531d;
    }

    .hbin {
        flex: 1;
        height: 100%;
        display: flex;
        align-items: flex-end;
    }

    .hbar {
        width: 100%;
        background-color: #62531d;
    }

    .histogram-axis {
        display: flex;
        justify-content: space-between;
        max-width: 46rem;
        font-size: 0.75rem;
        color: #62531d;
        margin-top: 0.2rem;
    }
</style>
