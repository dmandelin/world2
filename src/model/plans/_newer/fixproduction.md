Notes on production calculations with an eye to smoothing
out the bugs.

The update sequence:

-   Labor productivity
    -   Happens early in the planning phase
    -   Reads stat values (updated last turn)

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
-   Clan card
    -   Shows current (planning phase, value to be used in
        upcoming turn) labor productivity values.
-   Economy panels
    -   Show last-turn economic results