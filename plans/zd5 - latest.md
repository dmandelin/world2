Trying to do tuning around village fission. Latest
effort is trying to get population growth back to
expected levels after various recent model changes.

Exactly why population is declining is somewhat
unclear, and some moves that you might expect to
result in more population (such as removing famine
deaths) can result in less.

One possible clue is that food consumption usually
is below 1.0. It's not that low, though, so maybe
that's not even that bad.

Things to try:

*   Make breakpoint panel options sticky across sessions

*   Note: It would make sense to give clans more ways
    not to starve, but there is not that much starvation,
    so we are probably ready to look at fission
    *   Decisions seem to reduce birth rate enough to
        cap population. So, this would be a reason to
        move out.
    *   Idea:
        *   Completely remove current migration decision
            code
        *   Add new code based entirely on something related
            to decisions penalty
            x   Get an assessment of how moving out will
                impact: what factors will tend to change and
                in what ways? How do interactions change?
            x   Perhaps give clans a threshold for how much
                decision disfavor they're willing to take
            x   And then also a threshold for how many clans
                or people they think they need to successfully
                form a new community
            *   (Add option to clans to split to move if needed)
            x   Then execute moves
            x   Then tune for ~3 villages after 500 years
            *   Also at some point:
                *   Move costs
                    *   Factor variable costs into move decisions.
                        Higher diligence means more willing to pay.
                    *   This is probably pretty important - falsely
                        assuming this to be 0 probably causes
                        villages to spread out too fast - also check
                        on how this influences farmland and what
                        they're "buying" here and for how much
                *   Consider if we do need a mobility trait,
                    possibly just as a way to not have everyone
                    try to move at once
                *   Intellect => bonuses adapting to move
                *   Clans influencing each other or parts of each
                    other to move
            *   Make sure tuning coefficients and model features
                are sensible.
        *   Make sure migrations are recorded as clan
            memory (and so could influence later decisions)
            *   Also have some notion whether the migration
                turned out well
            *   Then at some point make them influence
                later decisions

*   Note2: There is another response to disagreement, for clans
    to change their behavior to agree with each other more often.
    It does make sense to have that, but eventually that should
    fail with scale, so it's fine to have fission before then.
    This could even then be something that helps the first bits
    of growth, or causes some areas to grow more than others.
    *   Compare to ideas about >7 decision-making agents causing
        breakdown

*   Empirical tuning search
*   Smooth the graphs
*   Understand in more detail why birth rate doesn't
    seem to keep up with death rate in the long term
    *   So far:
        *   Fixed a bug causing excessive conflict impact
        *   Age-matched spouses to avoid young husbands
            marrying widows almost out of childbearing
            age
        *   We have a redundant marriage appeal modifier
            to birth rate
    *   Things noticed now:
        *   A small amount of starvation - give clans
            better ways to escape this, possibly
            differentially
            *   This apparently is due to occasional shocks,
                especially flood-related fishing productivity,
                other flooding issues, and generally not
                having much of any food storage
            *   Food sharing doesn't make that much difference
                because stuff tends to impact the whole village
            *   Breaking all that down:
                *   Flood-related fishing productivity. Does seem
                    like it would be an issue.
                    *   We could reduce the fishing productivity
                        modifier to account for the fact that it's
                        not all fishing
                    *   Or add in hunting and gathering properly
                    *   Can also add somewhat option to fish more
                        when this happen
                *   Flood-related farming productivity
                    *   One option is to look at irrigation and make
                        sure clans have enough ways to help themselves
                        there
                    *   We can also make productivity vary more
                        between farms/clans, due to any/all of:
                        *   Different irrigation skill
                        *   Different irrigation investment
                        *   Random impact within the village
                *   Not having much food storage
                    *   Need to look at how clans decide how much to
                        produce
                    *   Might want to give clans a notion that they target
                        producing a certain amount of food; not only
                        personality but possibly transmissable culture
                        *   Need to think about how they measure
            *   Might be good to add intra-clan food balancing, so
                that larger clans are a bit more inherently balanced
            *   Might want to re-introduce concept that some kind of food
                gifts (probably need to specify basis) improve food security
        *   Once population rises, decisions reduce birth
            rate - give clans the chance to move out to
            escape this effect

After that, to try to firm up the model further, it
does appear that marriage opportunities (quantity and
quality) and food insurance relationships are typically
major motivators, so it would make sense to try to
confirm that clans have enough actions and get enough
results out of them.

We also need to somewhat prioritize replacing the
"residence fertility bonus" with an early-weaning
model. Mainly because it doesn't make a ton of sense
in its current form.