<script lang="ts">
    import { onMount } from "svelte";
    import GeneratePanel from "../../components/sessions/GeneratePanel.svelte";
    import SessionOverview from "../../components/sessions/SessionOverview.svelte";
    import {
        sessionStore,
        type RecordingSession,
    } from "../../model/data/sessions";
    import type { GenerationResult } from "../../lib/datagen/generate";

    let sessions = $state<RecordingSession[]>([]);
    let selectedId = $state<string | undefined>(undefined);
    let creating = $state(false);

    const selected = $derived(sessions.find((s) => s.id === selectedId));

    function refresh() {
        sessions = [...sessionStore.sessions];
    }

    onMount(() => {
        // Loading the live world creates the default session. Imported here
        // rather than at the top so the server doesn't build a world just to
        // render this route.
        let unsubscribe = () => {};
        import("../../model/worldinstance").then(() => {
            refresh();
            selectedId ??= sessions[0]?.id;
            unsubscribe = sessionStore.subscribe(refresh);
        });
        return () => unsubscribe();
    });

    function newSession() {
        creating = true;
        selectedId = undefined;
    }

    function select(session: RecordingSession) {
        creating = false;
        selectedId = session.id;
    }

    function onGenerated(result: GenerationResult) {
        refresh();
        selectedId = result.session.id;
    }
</script>

<div class="layout">
    <aside>
        <a class="home" href="/" title="Kalam -- The Land">𒌦</a>

        <button class="new-session" onclick={newSession}>
            <span class="plus">+</span> New session
        </button>

        <ul class="session-list">
            {#each sessions as session (session.id)}
                <li>
                    <button
                        class="session"
                        class:selected={!creating && session.id === selectedId}
                        onclick={() => select(session)}
                    >
                        <span class="session-name">{session.name}</span>
                        <span class="session-meta">
                            {session.createdAt.toLocaleString()}
                        </span>
                        <span class="session-meta">
                            {session.totalRows.toLocaleString()} snapshots
                            {#if session.kind === "live"}· live{/if}
                        </span>
                    </button>
                </li>
            {:else}
                <li class="empty">No sessions yet.</li>
            {/each}
        </ul>
    </aside>

    <main>
        {#if creating}
            <GeneratePanel {onGenerated} />
        {:else if selected}
            <SessionOverview session={selected} />
        {:else}
            <p class="hint">
                Pick a session on the left, or start a new one with +.
            </p>
        {/if}
    </main>
</div>

<style>
    :global(body) {
        font-family: "PT Serif", Arial, sans-serif;
        background-color: #f9f6eb;
        color: #2c250d;
    }

    .layout {
        display: flex;
        gap: 1.5rem;
        align-items: flex-start;
    }

    aside {
        width: 16rem;
        flex: none;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .home {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 56px;
        height: 28px;
        border: 2px solid #62531d;
        border-radius: 4px;
        background-color: rgba(249, 246, 235, 0.9);
        color: #62531d;
        font-size: 1.1rem;
        line-height: 1;
        text-decoration: none;
    }

    .home:hover {
        background-color: #f0ebd1;
    }

    .new-session {
        padding: 0.35rem 0.6rem;
        border: 2px solid #62531d;
        border-radius: 4px;
        background-color: #f0ebd1;
        color: #2c250d;
        font: inherit;
        font-weight: bold;
        text-align: left;
        cursor: pointer;
    }

    .new-session:hover {
        background-color: #e6dfba;
    }

    .plus {
        font-size: 1.1rem;
    }

    .session-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
    }

    .session {
        display: flex;
        flex-direction: column;
        width: 100%;
        gap: 0.1rem;
        padding: 0.4rem 0.5rem;
        border: 2px solid #c9be92;
        border-radius: 4px;
        background-color: #fffdf6;
        color: #2c250d;
        font: inherit;
        text-align: left;
        cursor: pointer;
    }

    .session:hover {
        border-color: #62531d;
    }

    .session.selected {
        border-color: #62531d;
        background-color: #f0ebd1;
    }

    .session-name {
        font-weight: bold;
        font-size: 0.9rem;
        overflow-wrap: anywhere;
    }

    .session-meta {
        font-size: 0.75rem;
        color: #62531d;
    }

    .empty,
    .hint {
        color: #62531d;
    }

    main {
        flex: 1;
        min-width: 0;
    }
</style>
