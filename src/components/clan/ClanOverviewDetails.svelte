<script lang="ts">
    import type { ClanDTO } from "../../model/records/dtos";
    import TableView2 from "../tables/TableView2.svelte";
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
            const alignUs = world.alignmentToward(clan, other)?.value ?? 0;
            const alignThem = world.alignmentToward(other, clan)?.value ?? 0;
            return alignUs !== 0 || alignThem !== 0;
        });
        return sortedByKey(filtered, (c) => c.name);
    });

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
                    data: "Types",
                    label: "Relationship Types",
                    valueFn: (other) => getRelationshipTypes(other),
                },
                {
                    data: "OurAlignment",
                    label: `Alignment (${clan.name} → Other)`,
                    valueFn: (other) =>
                        world.alignmentToward(clan, other)?.value ?? 0,
                    formatFn: (v: number) => signed(v, 2),
                    tooltip: ourAlignmentTooltip,
                },
                {
                    data: "TheirAlignment",
                    label: `Alignment (Other → ${clan.name})`,
                    valueFn: (other) =>
                        world.alignmentToward(other, clan)?.value ?? 0,
                    formatFn: (v: number) => signed(v, 2),
                    tooltip: theirAlignmentTooltip,
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

{#snippet alignmentDetail(a: ReturnType<typeof world.alignmentToward>)}
    {#if a}
        <div style="font-size: 0.9em; padding: 0.25rem; min-width: 250px;">
            <TableView2
                table={new IterableTable(a.items, (i) => i.label, [
                    {
                        data: "Value",
                        label: "Value",
                        valueFn: (i) => i.value,
                        formatFn: (i: number) => signed(i, 2),
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
                        formatFn: (i: number) => signed(i, 2),
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
                    <strong>{signed(a.previousValue, 2)}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-top: 0.25rem; border-top: 1px dashed #eee; padding-top: 0.25rem;">
                    <span>Current Value:</span>
                    <strong>{signed(a.value, 2)}</strong>
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
