<script lang="ts">
    import type { ClanDTO } from "../../model/records/dtos";
    import TableView2 from "../tables/TableView2.svelte";
    import {
        affinityStyle,
        alignmentStyle,
        conversationAmountStyle,
        conversationAppealStyle,
        conversationValueStyle,
    } from "../tables/cellColors";
    import AffinityCalc from "../relations/AffinityCalc.svelte";
    import EntityLink from "../state/EntityLink.svelte";
    import { IterableTable } from "../tables/tables2";
    import {
        connectionsOf,
        MarriageConnection,
        KinConnection,
        FriendshipConnection,
        NeighborConnection,
        type Connection,
    } from "../../model/relations/connection";
    import { pct, signed, unsigned } from "../../model/lib/format";
    import {
        AFFINITY_APPEAL_WEIGHT,
        APPEAL_FLOOR,
        appealOf,
        conversationValueOf,
        getRelativeAttention,
        relativeAffinityOf,
    } from "../../model/relations/conversation";
    import { sortedByKey } from "../../model/lib/basics";

    let { clan }: { clan: ClanDTO } = $props();

    let world = $derived(clan.world);

    let connMap = $derived.by(() => {
        const map = new Map<string, Connection[]>();
        for (const [other, conns] of connectionsOf(clan)) {
            map.set(other.uuid, conns);
        }
        return map;
    });

    let relatedClans = $derived.by(() => {
        const allClans = Array.from(world.clanMap.values());
        const filtered = allClans.filter((other) => {
            if (other.uuid === clan.uuid) return false;
            const conns = connMap.get(other.uuid);
            if (conns && conns.length > 0) return true;
            if (other.settlement?.uuid === clan.settlement?.uuid) return true;
            if (getRelativeAttention(clan, other) > 0) return true;
            const alignUs = world.alignmentToward(clan, other)?.value ?? 0;
            const alignThem = world.alignmentToward(other, clan)?.value ?? 0;
            return alignUs !== 0 || alignThem !== 0;
        });
        return sortedByKey(filtered, (c) => c.name);
    });

    // What this clan's conversation with another is worth to it; see
    // conversationValueOf.
    function conversationValue(other: ClanDTO): number {
        return conversationValueOf(
            getRelativeAttention(clan, other), clan, other);
    }

    function getRelationshipTypes(other: ClanDTO): string {
        const conns = connMap.get(other.uuid) ?? [];
        const types: string[] = [];
        for (const c of conns) {
            if (c instanceof MarriageConnection) {
                types.push(
                    c.relatedness > 0
                        ? `Marriage (${pct(c.relatedness)})`
                        : "Marriage",
                );
            } else if (c instanceof KinConnection) {
                types.push("Kin");
            } else if (c instanceof FriendshipConnection) {
                types.push("Friendship");
            } else if (c instanceof NeighborConnection) {
                types.push("Neighbors");
            } else {
                types.push(c.debugString());
            }
        }
        if (
            types.length === 0 &&
            other.settlement?.uuid === clan.settlement?.uuid
        ) {
            types.push("Same Settlement");
        }
        return types.length > 0 ? types.join(", ") : "-";
    }

    let relationshipsTable = $derived.by(() => {
        return new IterableTable(
            relatedClans,
            (c) => c.name,
            [
                {
                    data: "Settlement",
                    label: "Where",
                    valueFn: (other) => other.settlement?.name ?? "-",
                    cellSnippet: settlementLinkSnippet,
                },
                {
                    data: "Types",
                    label: "Who",
                    valueFn: (other) => getRelationshipTypes(other),
                },
                {
                    data: "Affinity",
                    label: "Affinity",
                    headerTooltip: `How much ${clan.name} has in common with the other clan, 0 to 100`,
                    valueFn: (other) =>
                        world.affinityToward(clan, other)?.absolute ?? NaN,
                    formatFn: (v: number) =>
                        Number.isFinite(v) ? unsigned(100 * v, 0) : "-",
                    tooltip: affinityTooltip,
                    cellStyleFn: (v: number) => affinityStyle(v),
                },
                {
                    data: "Appeal",
                    label: "Appeal",
                    headerTooltip: `Conversation appeal: how much ${clan.name} wants to spend its time on the other clan, 1 being neutral`,
                    valueFn: (other) => appealOf(clan, other),
                    formatFn: (v: number) => unsigned(v, 2),
                    tooltip: appealTooltip,
                    cellStyleFn: (v: number) => conversationAppealStyle(v),
                },
                {
                    data: "Amount",
                    label: "Amount",
                    headerTooltip: `Conversation amount: how many of the other clan's people ${clan.name} deals with regularly`,
                    valueFn: (other) =>
                        getRelativeAttention(clan, other) * other.population,
                    formatFn: (v: number) => unsigned(v, 0),
                    tooltip: amountTooltip,
                    cellStyleFn: (v: number) => conversationAmountStyle(v),
                },
                {
                    data: "Conversation",
                    label: "Talk",
                    valueFn: (other) => conversationValue(other),
                    formatFn: (v: number) => pct(v),
                    tooltip: conversationTooltip,
                    cellStyleFn: (v: number) => conversationValueStyle(v),
                },
                {
                    data: "OurAlignment",
                    label: "Our View",
                    headerTooltip: `Alignment, ${clan.name} toward the other clan, x100`,
                    valueFn: (other) =>
                        world.alignmentToward(clan, other)?.value ?? 0,
                    formatFn: (v: number) => signed(100 * v, 0),
                    tooltip: ourAlignmentTooltip,
                    cellStyleFn: (v: number) => alignmentStyle(v),
                },
                {
                    data: "TheirAlignment",
                    label: "Their View",
                    headerTooltip: `Alignment, the other clan toward ${clan.name}, x100`,
                    valueFn: (other) =>
                        world.alignmentToward(other, clan)?.value ?? 0,
                    formatFn: (v: number) => signed(100 * v, 0),
                    tooltip: theirAlignmentTooltip,
                    cellStyleFn: (v: number) => alignmentStyle(v),
                },
            ],
            clanLinkSnippet,
            "Other Clan",
        );
    });
</script>

{#snippet clanLinkSnippet(other: ClanDTO)}
    <EntityLink entity={other} />
{/snippet}

{#snippet settlementLinkSnippet(name: string, other: ClanDTO)}
    {#if other.settlement}
        <EntityLink entity={other.settlement} />
    {:else}
        {name}
    {/if}
{/snippet}

{#snippet affinityTooltip(val: number, other: ClanDTO)}
    <AffinityCalc subject={clan} object={other} />
{/snippet}

{#snippet appealTooltip(val: number, other: ClanDTO)}
    {@const rel = relativeAffinityOf(clan, other)}
    <div style="font-size: 0.9em; padding: 0.25rem; min-width: 240px;">
        <div>
            1 + {AFFINITY_APPEAL_WEIGHT} &times; {signed(rel, 2)} relative
            affinity =
            {#if 1 + AFFINITY_APPEAL_WEIGHT * rel < APPEAL_FLOOR}
                {unsigned(1 + AFFINITY_APPEAL_WEIGHT * rel, 2)}, held at the
                floor of
            {/if}
            <strong>{unsigned(val, 2)}</strong>
        </div>
        <div style="font-size: 0.85em; color: #666; margin-top: 0.35rem;">
            How much {clan.name} wants to spend its time on {other.name},
            against the clans it knows on average: it seeks out the ones it has
            more in common with. Never below {unsigned(APPEAL_FLOOR, 2)}, since
            villagers still have to get past each other in the lane.
        </div>
    </div>
{/snippet}

{#snippet amountTooltip(val: number, other: ClanDTO)}
    <div style="font-size: 0.9em; padding: 0.25rem; min-width: 240px;">
        <div>
            {pct(getRelativeAttention(clan, other))} of {other.name}'s
            {other.population} people = <strong>{unsigned(val, 1)}</strong>
            known
        </div>
        <div style="font-size: 0.85em; color: #666; margin-top: 0.35rem;">
            How many of {other.name}'s people {clan.name} deals with regularly:
            the conversation's strength, the same both ways, times their
            number.
        </div>
    </div>
{/snippet}

{#snippet conversationTooltip(val: number, other: ClanDTO)}
    <div style="font-size: 0.9em; padding: 0.25rem; min-width: 240px;">
        <div>
            {pct(getRelativeAttention(clan, other))} of {other.name} known
            &times; {unsigned(appealOf(clan, other), 2)} appeal
            = <strong>{pct(val)}</strong>
        </div>
        <div style="font-size: 0.85em; color: #666; margin-top: 0.35rem;">
            How much {clan.name}'s conversation with {other.name} is worth to
            it: how much of {other.name} it knows, times how much it wants to
            spend its time on them.
        </div>
    </div>
{/snippet}

{#snippet alignmentDetail(a: ReturnType<typeof world.alignmentToward>)}
    {#if a}
        <div style="font-size: 0.9em; padding: 0.25rem; min-width: 250px;">
            <TableView2
                table={new IterableTable(a.items, (i) => i.label, [
                    {
                        data: "Value",
                        label: "Value",
                        valueFn: (i) => i.value,
                        formatFn: (i: number) => signed(100 * i, 0),
                    },
                    {
                        data: "Mod",
                        label: "Mod",
                        valueFn: (i) => i.modifier,
                        formatFn: (i: number) => unsigned(i, 2),
                    },
                    {
                        data: "Base",
                        label: "Base",
                        valueFn: (i) => i.baseValue,
                        formatFn: (i: number) => signed(100 * i, 0),
                    },
                    {
                        data: "Explanation",
                        label: "Explanation",
                        valueFn: (i) => i.explanation,
                    },
                ])}
            ></TableView2>
            <div style="margin-top: 0.5rem; border-top: 1px solid #ccc; padding-top: 0.5rem;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                    <span>Previous Value:</span>
                    <strong>{signed(100 * a.previousValue, 0)}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-top: 0.25rem; border-top: 1px dashed #eee; padding-top: 0.25rem;">
                    <span>Current Value:</span>
                    <strong>{signed(100 * a.value, 0)}</strong>
                </div>
            </div>
        </div>
    {:else}
        <div>No alignment items</div>
    {/if}
{/snippet}

{#snippet ourAlignmentTooltip(val: number, subject: ClanDTO)}
    {@render alignmentDetail(world.alignmentToward(clan, subject))}
{/snippet}

{#snippet theirAlignmentTooltip(val: number, subject: ClanDTO)}
    {@render alignmentDetail(world.alignmentToward(subject, clan))}
{/snippet}

<div class="clan-overview-details">
    <div class="overview-header">
        <h3>Overview</h3>
        <p>Clan Size: {clan.population}</p>
    </div>

    <div class="relationships-section">
        <h4>Clan Relationships</h4>
        {#if relatedClans.length === 0}
            <p class="no-relationships">No relationships with other clans.</p>
        {:else}
            <TableView2 table={relationshipsTable} />
        {/if}
    </div>
</div>

<style>
    .clan-overview-details {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }
    .overview-header p {
        margin: 0.25rem 0 0 0;
    }
    .relationships-section h4 {
        margin: 0 0 0.5rem 0;
    }
    .no-relationships {
        font-style: italic;
        color: #666;
    }
</style>
