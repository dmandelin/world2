<script lang="ts">
    import { pct } from "../../model/lib/format";
    import type { ExtremeFlood } from "../../model/environment/flood";
    import Tooltip from "../Tooltip.svelte";

    let {
        flood,
        size = 24,
        tooltip = true,
    }: {
        flood: ExtremeFlood;
        size?: number;
        // Off where an enclosing tooltip already explains the flood, so the
        // two do not both pop.
        tooltip?: boolean;
    } = $props();

    // How far up the house the water came, and how dark the ring around the
    // icon is: the three kinds read as one picture getting worse.
    const LOOKS = {
        flood20: { waterY: 17, water: "#7fa8c4", ring: "#b7791f" },
        flood100: { waterY: 13.5, water: "#4a7fa5", ring: "#c05621" },
        flood500: { waterY: 9, water: "#2c5282", ring: "#742a2a" },
    } as const;

    let look = $derived(LOOKS[flood.kind.key]);
    // Wavy top edge for the water, drawn at whatever level it reached.
    let waterPath = $derived(
        `M0 ${look.waterY} q3 -2 6 0 t6 0 t6 0 t6 0 L24 24 L0 24 Z`,
    );
    let deaths = $derived(flood.deaths);
</script>

{#snippet icon()}
    <span
        class="flood-icon"
        style="--ring: {look.ring}; width: {size}px; height: {size}px;"
    >
        <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
            <!-- the ground the village stands on -->
            <line
                x1="1"
                y1="20"
                x2="23"
                y2="20"
                stroke="#cbb98b"
                stroke-width="1.5"
            />
            <!-- a mudbrick house, for the water to rise against -->
            <g stroke="#8a7443" stroke-width="1.2" stroke-linejoin="round">
                <path d="M8 20 L8 12 L17 12 L17 20 Z" fill="#e0cd97" />
                <path d="M6.5 12 L18.5 12" stroke-linecap="round" />
                <path d="M11 20 L11 15 L14 15 L14 20" fill="#8a7443" stroke="none" />
            </g>
            <!-- the water, come up as far as this flood brought it -->
            <path d={waterPath} fill={look.water} opacity="0.85" />
        </svg>
    </span>
{/snippet}

{#if !tooltip}
    {@render icon()}
{:else}
<Tooltip>
    {@render icon()}
    <div slot="tooltip" class="tip">
        <div class="tip-head">{flood.kind.name}</div>
        <div class="tip-line">
            Struck {flood.areaName} &centerdot; {pct(flood.impact)} of it caught
        </div>
        <div class="tip-note">
            <div>
                {flood.clansAffected} clan{flood.clansAffected === 1 ? "" : "s"} in
                {flood.settlementsAffected} settlement{flood.settlementsAffected ===
                1
                    ? ""
                    : "s"} &centerdot; {flood.peopleAffected.toFixed(0)} people
            </div>
            <div>{flood.cropsLost.toFixed(0)} of grain lost in the fields</div>
            <div>
                {flood.qolDamage.toFixed(1)} quality of life, on average, from those
                it caught
            </div>
            {#if deaths >= 0.5}
                <div class="tip-alert">{deaths.toFixed(0)} drowned</div>
            {/if}
        </div>
    </div>
</Tooltip>
{/if}

<style>
    .flood-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        box-sizing: border-box;
        border: 1.5px solid var(--ring);
        border-radius: 50%;
        background: #fdfbf2;
        overflow: hidden;
        vertical-align: middle;
    }

    .flood-icon svg {
        display: block;
    }

    /* The tooltip shell is nowrap; let the detail lines wrap. */
    .tip {
        white-space: normal;
        max-width: 24rem;
    }

    .tip-head {
        font-size: 1rem;
        font-weight: bold;
        white-space: nowrap;
    }

    .tip-line {
        white-space: nowrap;
    }

    .tip-note {
        margin-top: 0.4rem;
        padding-top: 0.35rem;
        border-top: 1px solid #ddd2ab;
        font-size: 0.85em;
        color: #6b5f3a;
    }

    .tip-alert {
        color: #a3401c;
        font-weight: bold;
    }
</style>
