Here's an idea for adding in a sharper version of conflict.
Although we may think relations were pretty cooperative at
this time, there would always be the possibility of someone
starting to behave "antisocially".

As usual, this could take various forms:

*   Insufficient gifts, feasts, aid, bride service
*   Issuing orders
*   Intimidation
*   Predatory marital behavior
*   Breaking rules to show power
*   Sorcery and sorcery accusations

The general idea is to give clans ways to seriously aggress
on each other, so that then we have to build defensive
mechanisms for them, and peace is a dynamic balance rather
than automatic.

We should pick a type of aggression that could be a major
issue in the period. Perhaps sorcery, sorcery accusations,
and/or monopolization of rituals would be the best fit.
The latter could also shade into not-necessarily-aggressive
central ritual provision. So we can have:

*   Dyadic: Aggression via sorcery: extract benefits via
    sorcery threats
*   Communal: Assert leadership over community ritual
*   Anti-communal: Defy sacred norms

All can be in play, but the dyadic and anti-communal seem
easier to start with. Dyadic in particular could start
creating more texture. Anti-communal might be simpler to
get started with.

*   Anti-communal
    *   Basic idea could be lots of bullying, intimidation
    *   Impacts stress and fortune, could also impact other
        things like food and marriage
    *   Responses:
        *   Move away
        *   Conflict
    *   In many cases, this would be more from certain
        individuals, not necessarily entire clans. So to
        some extent here the move is, does the clan suppress
        its internal bullies or let them act?
        *   We need there to be a cost to suppressing the
            bully: risk of fighting inside the clan, losing
            the bully (who might have special skills)
*   Dyadic
    *   Similar bullying but against a specific clan
    *   This could be individual or larger scale

More on anti-communal:

*   We can imagine that clans sometimes generate a "crooked"
    troublemaker
    *   On average this might amount to ~1 in 100, which
        would correspond to a trait score of about 85, but
        we won't want it to be that deterministic.
    *   Clans will also tend to suppress troublemakers
        internally, but this is a choice, and perhaps we
        should right away have options to defect on that.
        *   But, for dynamics it might be redundant -- maybe
            start with overall spawn chance.
*   The troublemaker is a detriment to other clan's fortunes
    *   Should probably make impact somewhat unequal
    *   Should have at least some impact on other goods
*   We could assume the clan lets the troublemaker ride for
    different reasons
    *   Fear of the troublemaker
    *   Benefits brought in by the troublemaker
    *   Indifference
    *   Perhaps on average they are neutral to the clan, but
        it does cost something to suppress them

As I think about it, though, it's unclear there's that much
interesting/important change with respect to "troublemakers"
in our early phases. There probably is some, but also, in
some interpretations they're a generalized threat that doesn't
have anything to do with the structure, which seems less
important.

So let's go with clan vs clan via sorcery. We can have:

*   Clans using threats of sorcery to extract benefits
*   Clans interpreting misfortunes and other events as
    aggression

It seems there probably isn't a hard line between the above
and a more regular practice of clans claiming holy status
expecting gifts, but without that being considered a threat
or crime. That's interesting, but also sort of a problem,
because the main point here is village fission, which that
doesn't help with.

Let's take a step back and try to understand fission a
little better.

*   One factor is probably just that there is a minimum
    viable size for settlements, so it's more possible
    to leave (based on any underlying tensions) as size
    grows
*   More size does mean more possibility of conflicts
*   More possibilities of splits of authority preventing
    resolution

Maybe one of the issues with conflicts is that they could
be incredibly complex and specific to the people involved,
so it's hard to say much about them except on really
specific terms, or really general terms. Maybe we can
think about tuning the current model rather that replacing.

Next things to think about:

*   Try tuning current model to get desired splitting behavior

## Next thoughts

*   Existing model
    *   Conflict-based upper limits to village size
        *   One issue is that conflict amount is per-clan,
            so splitting depends on #clans not people
        *   Another immediate issue is that it's on
            social QoL rather that some fortune parameter,
            but we could immediately fix that by porting
            it over
    *   Economic limits to village size
        *   Currently, it seems productivity isn't that much
            correlated with village size
            *   Recall the general question of whether productivity
                is equal in cities of different sizes, or larger in
                larger cities -- it seems that there can be some
                disagreement on this. (Notionally, equilibrium logic
                suggests equal, but increasing returns to scale
                exist.)

*   Why settlements could avoid social limits and grow
    *   Disputes handled by certain people rather than involving
        the entire settlement
        *   Easier to sync
        *   Cheaper
    *   Leadership disputes moved into structured systems rather
        than potentially arbitrary conflicts
    *   Avoidance: Some people won't like each other and prefer
        not to associate. They could do so, in a large settlement
    *   Capital investment: More to leave behind

Given the early significance of monuments, capital investment may
have been one of the initial key anchors; perhaps that then created
the demand for more scalable politics.

Given that the immediate need is really to get these villages splitting
as believed to have happened, maybe the right approach is to define
curves for how different fortune components depend on size, tune those
so that they can generate about the right amount of splitting, then
massage the model to roughly fit those curves (e.g., in some cases
different parts of the curve might be in different parts of the model.)
For now we could leave the economic side be and focus on conflict and
association as the factors that balance.

Items:

*   Define and tune a simpler abstract model
*   Change conflict intensity to depend on clan sizes
*   Move to fortune model and update splitting code
*   Tune so that villages split around 150-300