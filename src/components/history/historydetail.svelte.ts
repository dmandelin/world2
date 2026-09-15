// How much of a remembered item the History views show. A setting of the
// viewer's, shared by every History view so it holds across panels.

export type HistoryDetail = "default" | "high" | "debug";

export const HISTORY_DETAILS: readonly { key: HistoryDetail; label: string; hint: string }[] = [
    {
        key: "default",
        label: "Default",
        hint: "What each clan remembers, without the stories or the years",
    },
    {
        key: "high",
        label: "High",
        hint: "The stories as told, and the year each happened",
    },
    {
        key: "debug",
        label: "Debug",
        hint: "The stories, with every memory's model details open",
    },
];

export const historyDetailState: { level: HistoryDetail } = $state({ level: "default" });
