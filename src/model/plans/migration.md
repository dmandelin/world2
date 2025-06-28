# Migration

**Migration** is when a clan (or other group of people) moves from
one human community to another.

*   Not migration: Shifting locations within an area, as in 
    slash-and-burn agriculture. We may model that in housing
    and moving costs, but it doesn't alter the social network
    so we don't need to model it in detail.

## Behavioral model

*   **Trigger**: By default, people stay in place, but an intention
    to move can be triggered on each turn:

    *   Clans splitting gives a high chance to move, as typically
        the whole point was that they weren't getting along.
    *   Small baseline probability representing events such as 
        house getting destroyed, annoying relative moves to town,
        etc.
    *   QoL at levels indicating likely population decline.

    Depending on model detail in later steps, intention to move can
    be boolean or float, representing the strength of push.

    Note that for now there are no "pull" factors where a higher
    appeal elsewhere induces content people to move. Later there
    may be upstarts or elites who do move (or are not considered
    content).

*   **Filter**: Once a clan has been triggered to potentially move,
    they filter for eligible locations. At the beginning, we'll
    require:

    *   Better appeal than the current setting, unless the signal to
        move is very strong, in which case it may make sense to take
        any gamble. The appeal difference needs to be over a threshold
        (boolean or logistic).
    *   Destination has low/no crowding penalty: otherwise incumbents
        won't accept new residents.
    *   Same settlement cluster: later we can allow longer moves but
        they'll have higher costs.

*   **Select**: If a clan has found one or more possible destinations
    after filtering, they select one with a low-temperature softmax
    model, and move there.

    Later we can allow communities to "advertise" (intentionally or not)
    via monuments and such, which might increase the selection appeal
    above and beyond the QoL change expectations.

## Factors influencing appeal

Appeal is more or less expected quality of life in the candidate
community. However, clans don't necessarily have the ability to
estimate that in detail. Here are the factors they may consider:

*   Moving costs.
*   Crowding. This is easily visible to clans.
*   Tenure impact. This can have both pluses and minuses. The main
    point is that clans with a big tenure bonus are more reluctant.
*   Prestige impact. Clans probably can't assess this in a lot
    of detail, but could at least think that maybe they could
    fix very low prestige by moving out.
*   Goods. Not assessable in detail, but clans may have some information
    on how well people like themselves have it.
*   Learning opportunities. If everyone's skill is low locally, a
    clan may want to move to a place with higher skill.

## Effects of moving

*   The home settlement of the clan changes. The clan is now neighbors
    of the other clans in that settlement, who start to form opinions
    of them.
*   The clan pays a cost of moving of about 1-5% of goods in a 20-year
    turn, greater for longer moves or founding a new settlement.
*   Tenure in the settlement is reset to 0 turns. See below for details.
*   Loss of "skill": The farming and ritual skills represent knowledge,
    capital investment, and so on, some of which must be left behind
    or no longer applies. The size of loss depends on the social, 
    ecological, etc., distance of the move.

### Effects of tenure

*   QoL and prestige bonuses: We assume that adaptation to local conditions
    and integration with the local community are asymptotically increasing 
    functions of tenure.
*   Founder bonus: The founding generation was motivated to create a new
    settlement and experiences a QoL bonus from doing so.
*   Similarly, it's easier to move into a new community where there aren't
    a lot of established relationships yet. We should make sure prestige
    effects are milder in this case.

## Turn sequencing

Seeing migrations only after the fact is confusing: they just sort of
happen, and it's hard to see what state triggered them. (We'd at least
have to add a ton more last-turn-decision info to the UI.)

We also have an annoying issue where it's necessary to have a turn before
the game starts in order to display anything to actually show in the UI.
Otherwise there'd be all kinds of 0s and NaNs. This is handled by duplicate
code right now. I think what it really needs, though, is to be able to
show the *planning view* for what will happen next, and not actually the
*after-action view*, which is what it's showing now.

Here's the new move sequence:

*   **Game start**. Nothing special here.
*   **Logical start of regular turn**
*   Compute move decisions but don't actually move yet. The only
    wrinkle for game start is that we need special cases for any
    deciders who use last-turn results to make decisions, as
    opposed to current state.
*   **Return from computation and let the user see this in the UI.**
    This is effectively the planning phase from the user's point of
    view. They see the state and can select actions to take next.
    This view will also show expected results from the planned
    actions.
*   [User clicks next-turn or play, depending on phasing detail]
*   Execute move decisions.
*   (Execute legacy turn actions. These should eventually be changed
    into a plan-and-execute structure as applicable, but for now it
    seems fine for them to happen here.)
*   **[Optional] Return from computation for an after-action phase.**
    Continue when the user clicks done or plan-next-turn.
*   Go back to logical start of regular turn.

Let's go ahead and add the after-action phase as soon as it makes
sense, but also an easy option to skip it.

In general, the planning view should be able to most everything,
but when push comes to shove, it must show decisions but can
punt on expected results. Conversely, the after-action view must
show the actual results and the decisions that led to them, but
can punt on detail about the decisions.