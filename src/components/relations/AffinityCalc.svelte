<script lang="ts">
    // How one clan's affinity for another was worked out: the factors, their
    // average, and the relative reading against the clans the subject knows.
    // Shared by the Affinity panel and the clan overview's relationships.
    import { pct, signed } from "../../model/lib/format";
    import { AffNode } from "../../model/relations/affinity";
    import type { ClanDTO } from "../../model/records/dtos";

    let { subject, object }: { subject: ClanDTO; object: ClanDTO } = $props();

    let affinity = $derived(subject.world.affinityToward(subject, object));

    function formatStep(value: number, role: string, id: string): string {
        // The temperament parts are offsets around 0, not shares.
        if (id === AffNode.TemperamentShared || id === AffNode.TemperamentOwn)
            return signed(value, 2);
        if (id === AffNode.TemperamentBase) return value.toFixed(2);
        if (role === "input") return pct(value);
        return value.toFixed(2);
    }
</script>

{#if affinity}
    {@const report = affinity.report(subject, object)}
    <div class="tip">
        <strong>Affinity ({subject.name} → {object.name})</strong>
        <table>
            <tbody>
                {#each report.steps as { def, value: v }}
                    <tr
                        class:factor={def.role === "factor"}
                        class:input={def.role === "input"}
                        class:result={def.role === "result"}
                        title={def.note}
                    >
                        <td>{def.label}</td>
                        <td class="num">{formatStep(v, def.role, def.id)}</td>
                    </tr>
                {/each}
                <tr class="input">
                    <td>{subject.name} average</td>
                    <td class="num">{affinity.mean.toFixed(2)}</td>
                </tr>
                <tr class="result">
                    <td>Relative</td>
                    <td class="num">{signed(affinity.relative, 2)}</td>
                </tr>
            </tbody>
        </table>
        <p class="note">
            Relative = (affinity − average) / (1 − average), the average being
            over the clans {subject.name} knows.
        </p>
    </div>
{:else}
    <div class="tip">{subject.name} does not know {object.name}.</div>
{/if}

<style>
    .tip {
        font-size: 0.9em;
        padding: 0.25rem;
        min-width: 260px;
    }
    .tip table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 0.25rem;
    }
    .tip td {
        padding: 0.05rem 0.25rem;
    }
    .tip .num {
        text-align: right;
        font-variant-numeric: tabular-nums;
    }
    .tip tr.input td {
        color: #777;
        padding-left: 1rem;
    }
    .tip tr.result td {
        font-weight: bold;
        border-top: 1px solid #ccc;
    }
    .tip .note {
        margin: 0.25rem 0 0;
        color: #666;
        font-size: 0.85em;
    }
</style>
