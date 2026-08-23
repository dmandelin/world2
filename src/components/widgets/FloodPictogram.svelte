<script lang="ts" module>
    // Clip paths are referenced by id, so each pictogram on the page needs
    // its own.
    let nextClipId = 0;
</script>

<script lang="ts">
    import { pct } from "../../model/lib/format";
    import type { FloodLevel } from "../../model/environment/flood";
    import Tooltip from "../Tooltip.svelte";

    let {
        floodLevel,
        width = 64,
        caption = true,
    }: {
        floodLevel: FloodLevel;
        width?: number;
        caption?: boolean;
    } = $props();

    // A cross-section of the fields and the channel that waters them. The
    // field surface sits at y=9 and the channel bottom at y=21, so the
    // water line reads as "well below the fields" through "over them".
    const WATER_LINE = [18.5, 15.5, 12.5, 9.5, 6.5];
    let waterY = $derived(WATER_LINE[floodLevel.index]);
    // Only an abundant flood tops the banks and sheets across the fields.
    let overBanks = $derived(waterY < 9);

    let effect = $derived(floodLevel.agricultureOn("alluvium"));

    const clipId = `flood-void-${nextClipId++}`;
</script>

<div class="flood-art" style="width: {width}px;">
    <Tooltip>
        <svg
            viewBox="0 0 64 26"
            {width}
            height={(width * 26) / 64}
            aria-hidden="true"
        >
            <defs>
                <!-- Everything above the ground, so water poured in from the
                     top settles into the channel and, once high enough,
                     spreads over the fields. -->
                <clipPath id={clipId}>
                    <path
                        d="M0 0 L64 0 L64 9 L48 9 L38 21 L26 21 L16 9 L0 9 Z"
                    />
                </clipPath>
            </defs>

            <!-- fields and channel -->
            <path
                d="M0 9 L16 9 L26 21 L38 21 L48 9 L64 9 L64 26 L0 26 Z"
                fill="#d9c795"
            />

            <!-- standing crop, drowned when the water tops the banks -->
            <g stroke="#6a8f3c" stroke-width="1.2" stroke-linecap="round">
                <path d="M7 9 L7 4" />
                <path d="M7 6 L4.5 4" />
                <path d="M7 6 L9.5 4" />
                <path d="M57 9 L57 4" />
                <path d="M57 6 L54.5 4" />
                <path d="M57 6 L59.5 4" />
            </g>

            <g clip-path="url(#{clipId})">
                <rect
                    x="0"
                    y={waterY}
                    width="64"
                    height={26 - waterY}
                    fill="#7fa8c4"
                    opacity={overBanks ? 0.85 : 1}
                />
                <line
                    x1="0"
                    y1={waterY}
                    x2="64"
                    y2={waterY}
                    stroke="#4a7fa5"
                    stroke-width="1"
                />
            </g>

            <!-- bank line last, so it stays legible under a sheet of water -->
            <path
                d="M0 9 L16 9 L26 21 L38 21 L48 9 L64 9"
                fill="none"
                stroke="#8a7443"
                stroke-width="1.2"
                stroke-linejoin="round"
            />
        </svg>
        <div slot="tooltip" class="tip">
            <div class="tip-head tip-line">
                {floodLevel.name} flood
            </div>
            <div class="tip-line">{floodLevel.description}</div>
            <div class="tip-note">
                Farm yield on alluvium: {pct(effect.unditched)} unditched
                &centerdot; {pct(effect.ditched)} fully ditched. River shift {pct(
                    floodLevel.riverShiftProbability(),
                    1,
                )} per year.
            </div>
        </div>
    </Tooltip>
    {#if caption}
        <div class="flood-caption">{floodLevel.name}</div>
    {/if}
</div>

<style>
    .flood-art {
        flex: 0 0 auto;
    }

    .flood-art svg {
        display: block;
    }

    .flood-caption {
        font-size: 0.62rem;
        line-height: 1.1;
        text-align: center;
        font-variant: small-caps;
        letter-spacing: 0.03em;
        color: #4b7f95;
    }

    /* The tooltip shell is nowrap; let the explanation wrap. */
    .tip {
        white-space: normal;
        max-width: 22rem;
    }

    .tip-line {
        white-space: nowrap;
    }

    .tip-head {
        font-size: 1rem;
    }

    .tip-note {
        margin-top: 0.4rem;
        padding-top: 0.35rem;
        border-top: 1px solid #ddd2ab;
        font-size: 0.85em;
        color: #6b5f3a;
    }
</style>
