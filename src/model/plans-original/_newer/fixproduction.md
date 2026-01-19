Notes on production calculations with an eye to smoothing
out the bugs.

The update sequence:

-   Flooding (nature)
    -   Set at the beginning of the advance phase.
-   Labor productivity
    -   Happens early in the planning phase
    -   Reads stat values (updated last turn)
    -   Reads last-turn flooding value, which is incorrect!
        -   To fix:
            x   We still want to use predicted productivity
                during the planning phase
            x   But we should make sure we update labor
                productivity again before computing production
            x   UI should still display last-turn flooding
            -   Also need to separate issues from events in the
                overview

The UI elements:

-   The UI generally shows the end of the planning phase, so
    that we can see what clans are going to do in the next
    turn. Reasons for that include:
    -   Then we can use the UI to understand why the clans
        made those choices: the world is in the state it was
        when the clans chose.
    -   That's an ideal pause point if we add controls to
        override the clans' choices.
-   It would be logical, then, to indicate in the UI anywhere
    that we're instead displaying "last turn" values.

-   Settlement
    -   Shows last-turn 
-   Clan card
    -   Shows current (planning phase, value to be used in
        upcoming turn) labor productivity values.
-   Economy panels
    -   Show last-turn economic results

*   Maybe a better way of distinguishing between last and
    current turn is to mark certain panels as "Review".
