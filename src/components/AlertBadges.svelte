<script lang="ts">
    import { ALERT_KINDS, type Alert, type AlertKindDef, type AlertKindId } from "../model/records/alerts";
    import { selectEntity } from "./state/uistate.svelte";

    // `world` is the WorldDTO snapshot; it carries the current alerts plus the
    // dismissAlertKind callback back into the model.
    let { world }: { world: { alerts: Alert[]; dismissAlertKind: (k: AlertKindId) => void } } = $props();

    interface AlertGroup {
        kind: AlertKindId;
        def: AlertKindDef;
        alerts: Alert[];
    }

    // Coalesce alerts of the same kind into one badge, in registry order.
    let groups = $derived.by(() => {
        const byKind = new Map<AlertKindId, Alert[]>();
        for (const a of world.alerts ?? []) {
            if (!byKind.has(a.kind)) byKind.set(a.kind, []);
            byKind.get(a.kind)!.push(a);
        }
        const result: AlertGroup[] = [];
        for (const kind of Object.keys(ALERT_KINDS) as AlertKindId[]) {
            const alerts = byKind.get(kind);
            if (alerts && alerts.length) result.push({ kind, def: ALERT_KINDS[kind], alerts });
        }
        return result;
    });

    let openKind = $state<AlertKindId | null>(null);

    function toggle(kind: AlertKindId) {
        openKind = openKind === kind ? null : kind;
    }

    function dismiss(kind: AlertKindId, e: MouseEvent) {
        e.preventDefault();
        if (openKind === kind) openKind = null;
        world.dismissAlertKind(kind);
    }

    function navigate(alert: Alert) {
        if (alert.entity) {
            selectEntity(alert.entity);
            openKind = null;
        }
    }
</script>

{#if groups.length > 0}
    {#if openKind !== null}
        <!-- Click-away backdrop to close an open popup. -->
        <div
            class="alert-backdrop"
            role="presentation"
            onclick={() => (openKind = null)}
        ></div>
    {/if}
    <div class="alert-badges">
        {#each groups as group (group.kind)}
            <div class="alert-badge-wrap">
                <button
                    type="button"
                    class="alert-badge"
                    class:open={openKind === group.kind}
                    style="--accent: {group.def.color};"
                    title={`${group.def.title} (${group.alerts.length}) — ${group.def.description}`}
                    aria-label={`${group.def.title}: ${group.alerts.length}`}
                    onclick={() => toggle(group.kind)}
                    oncontextmenu={(e) => dismiss(group.kind, e)}
                >
                    <span class="icon">{group.def.icon}</span>
                    {#if group.alerts.length > 1}
                        <span class="count">{group.alerts.length}</span>
                    {/if}
                </button>

                {#if openKind === group.kind}
                    <div class="alert-popup">
                        <div class="popup-header">
                            <span class="popup-icon">{group.def.icon}</span>
                            <span class="popup-title">{group.def.title}</span>
                            <span class="popup-hint">right-click badge to dismiss</span>
                        </div>
                        <div class="popup-desc">{group.def.description}</div>
                        <ul class="popup-list">
                            {#each group.alerts as alert (alert.id)}
                                <li>
                                    {#if alert.entity}
                                        <button
                                            type="button"
                                            class="popup-row link"
                                            onclick={() => navigate(alert)}
                                        >
                                            <span class="row-label">{alert.label}</span>
                                            {#if alert.detail}
                                                <span class="row-detail">{alert.detail}</span>
                                            {/if}
                                        </button>
                                    {:else}
                                        <div class="popup-row">
                                            <span class="row-label">{alert.label}</span>
                                            {#if alert.detail}
                                                <span class="row-detail">{alert.detail}</span>
                                            {/if}
                                        </div>
                                    {/if}
                                </li>
                            {/each}
                        </ul>
                    </div>
                {/if}
            </div>
        {/each}
    </div>
{/if}

<style>
    .alert-badges {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 8px;
        margin-top: 12px;
    }

    .alert-backdrop {
        position: fixed;
        inset: 0;
        z-index: 90;
        background: transparent;
    }

    .alert-badge-wrap {
        position: relative;
    }

    /* Clay-token badge: earthy, round, Ancient-Near-East feel. */
    .alert-badge {
        position: relative;
        width: 46px;
        height: 46px;
        padding: 0;
        border-radius: 50%;
        border: 2px solid var(--accent);
        background:
            radial-gradient(circle at 35% 30%, #fbf1d8 0%, #ecdcb4 55%, #d9c493 100%);
        box-shadow: 0 2px 4px rgba(44, 37, 13, 0.35), inset 0 0 6px rgba(160, 140, 90, 0.35);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.1s ease, box-shadow 0.1s ease;
    }

    .alert-badge:hover {
        transform: translateY(-1px) scale(1.04);
        box-shadow: 0 3px 7px rgba(44, 37, 13, 0.45), inset 0 0 6px rgba(160, 140, 90, 0.35);
    }

    .alert-badge.open {
        box-shadow: 0 0 0 3px rgba(123, 52, 30, 0.25), 0 3px 7px rgba(44, 37, 13, 0.45);
    }

    .alert-badge .icon {
        font-size: 22px;
        line-height: 1;
        filter: saturate(0.85);
    }

    .alert-badge .count {
        position: absolute;
        top: -4px;
        right: -4px;
        min-width: 18px;
        height: 18px;
        padding: 0 4px;
        box-sizing: border-box;
        border-radius: 9px;
        background: var(--accent);
        color: #fbf1d8;
        font-size: 11px;
        font-weight: 700;
        line-height: 18px;
        text-align: center;
        border: 1px solid #fbf1d8;
    }

    /* Popup opens to the left of the badge (badges sit at the screen's edge). */
    .alert-popup {
        position: absolute;
        top: 0;
        right: calc(100% + 12px);
        z-index: 95;
        width: 240px;
        background: #f9f6eb;
        border: 2px solid #a08c5a;
        border-radius: 6px;
        box-shadow: 0 6px 16px rgba(44, 37, 13, 0.35);
        padding: 8px 10px;
        color: #2c250d;
        text-align: left;
    }

    .popup-header {
        display: flex;
        align-items: baseline;
        gap: 6px;
    }

    .popup-icon {
        font-size: 15px;
    }

    .popup-title {
        font-weight: 700;
        font-size: 0.9rem;
        color: #62531d;
    }

    .popup-hint {
        margin-left: auto;
        font-size: 0.55rem;
        color: #a08c5a;
        font-style: italic;
        white-space: nowrap;
    }

    .popup-desc {
        font-size: 0.7rem;
        color: #7a6a3a;
        margin: 2px 0 6px;
    }

    .popup-list {
        list-style: none;
        margin: 0;
        padding: 0;
        max-height: 260px;
        overflow-y: auto;
        scrollbar-width: thin;
        scrollbar-color: #c4b98a transparent;
    }

    .popup-row {
        display: flex;
        flex-direction: column;
        width: 100%;
        padding: 4px 6px;
        border: none;
        border-radius: 4px;
        background: transparent;
        text-align: left;
        font: inherit;
        color: inherit;
    }

    .popup-row.link {
        cursor: pointer;
    }

    .popup-row.link:hover {
        background: rgba(98, 83, 29, 0.1);
    }

    .row-label {
        font-size: 0.82rem;
        font-weight: 600;
        color: #2c250d;
    }

    .popup-row.link:hover .row-label {
        color: saddlebrown;
    }

    .row-detail {
        font-size: 0.68rem;
        color: #a08c5a;
    }
</style>
