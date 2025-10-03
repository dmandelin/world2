I need to give clans more ways to interact for various reasons:

- more dynamism to the simulation
- create substructure with clans being more or less aligned
  to certain other clans
- create more ways for them to differentiate from each other

I also need to update the production model to be less completely
communal. It seems there could have been some communal activities
when there's lots of work to do, and various levels of sharing,
but not automatic total sharing. This will create differential
production and favor-trading opportunities.

Initial set:

*   marriages
    *   marriage will create relationships among clans
    *   TODO - detail
*   food exchange
    *   retain production in clans by default
    *   create institutions and interactions for exchange
    *   TODO - detail
*   ritual production
    *   start with communal production
    *   offer ability to put on special rituals
    *   also crises and omens
    *   TODO - detail
*   justice
    *   disputes over marriages, abuses, respect, and so on
    *   TODO - detail

## Discussions

### Marriages

This is very complicated and there probably isn't much data. These
societies generally were patrilocal, so our model will assume that
the wife's clan considers themselves to be giving a major gift to
the husband's. We can apply that in various levels of detail, with
payments in prestige, wealth, labor, and so on if we choose. We'll
also say that the men's clans propose and the women's choose.

In order to marry:

*   The clans must have a relationship enabling them to know each 
    other's young members and trusting enough to marry
    *   Neighbors in the same small settlement will
    *   Also to other villages in the cluster
    *   May have to spend to maintain those relationships
    *   May have specific practices like inter-village fairs or
        visiting relatives to create those relationships
    *   Can probably allow far marriages at some cost to explore
        and give gifts, and lower probability of success

*   Marriages must be somewhat spread out, not too concentrated
    with another clan, or else they'll merge
    *   At first we're pretty small scale so we can be pretty
        relaxed about this

Marriages will cause clans to become more aligned with each other.

Implementation notes:

*   Current marriage code does approximately the right basic thing,
    but completely scoped to the local settlement.
    *   It would be nice to keep that pattern for simplicity, but 
        it's too unrealistic to not have any marriage ties crossing
        settlements.
    *   Eventually we'll have more villages, so for now we'll have
        to run a more restricted version of this. It's probably
        enough to allow marriages with clans in other villages, but
        if needed we can have off-map marriage partners.
*   Initial steps are to marry more broadly, and record those
    relationships.
    *   Depending on size, each clan will have 5-20 people to
        marry per turn.
    *   Marrying one person into another clan will typically account 
        for 5-20% of the population of that clan.
    *   We can make 20%, rounded up, the maximum number of people
        that each clan will marry with a single other clan.
        *   If needed, we could allow higher values, but then
            possibly have the clans merge. Or just give them an
            option to merge.
    *   We may want to record the marriages for display in the UI.
    *   A basic idea would be to have the clans become more related
        according to the number of marriage partners.
        *   What happens to this over time?
            *   Let's say two clans become 20% more related each
                turn. Then in 3 turns they'll be 50% related.
                *   One simple solution is not to let people
                    marry if total relatedness would go over, say
                    30%.
            *   Let's say two clans have some marriages and become
                20% related, but then don't marry each other.
                *   In a genetic sense, they could probably become
                    basically unrelated, highly related, or something
                    in between.
                *   But either way, people may forget the relationship
                    over time. The typical dropping by half each
                    turn could be about right.
    *   We need to let clans marry outside their settlement.
        *   Eventually, we'll need to make this more complicated,
            but for now, let's just let people get spouses from
            any settlement as long as total population is under 
            some limit like 2000. At that point limit everyone
            to their own settlement as a signal that we need to
            add more features.

### Food exchange

First we need to convert clans back to retaining their own production.
Then we can give them ways to interact:

*   Exchange cereals for fish to improve food variety
    *   Could initially use fixed exchange rate
*   Insurance for crop failures
    *   Have some number of crop failures
    *   Allow relationships where others will help
        *   Mutual relationship, requires effort to keep going
            between crises
        *   Communal relationship, may involve a regular exchange
            of some percentage, may require effort to keep going

### Ritual production

We could start by assuming that clans of a village put on the ritual
cycle collectively. There could be some cost in labor and/or cereals
or other goods.

But let's instead think in somewhat more detail, and simplify later.
There are both clan- and village-level rituals. There are certain
occasions for rituals, such as harvest, planting, weddings, funerals,
weekly meetings of some sort, and so on. For village-level rituals,
we initially assume that everything is collective or based on turn-
taking, so there is equal participation.

However, participation is not necessarily identical. There might be
certain clans that handle food, drinks, decorations, costumes, 
sacrifices, and so on. So in a complicated model we could have
different roles with different types of skills. This structure also
creates the space for a clan to start doing something different with
its part of the rituals without necessarily changing the entire
structure.

Another difference is that we can allow clans to upgrade their clan
rituals. These could raise the self-prestige (sometimes called
"morale") of the clan and possibly have other effects.

The simplest specialization is probably "ritual leader" for the major
rituals. This can have an outsized impact on the result. There could
be different leader selection practices, such as equal/collective,
consensus, common assent, majority voice (and any of those on the
entire collective or elders). Giving more time to the most ritually
skilled clan or clans could produce better rituals, which people will
tend to like, but will also tend to raise the prestige and influence
of that clan, which they could use in different ways. In our first
millennium or two, it seems those uses were mostly prosocial, implying
that they did rely on the consent of the population in some way.

There can of course be difficulty in getting a leader selection that
everyone agrees with. This gets harder with scale, and may require new
practices to deal with.

TODO - more on how that works

We could also allow clans to put on "special rituals" that represent
innovations on the normal collective ritual cycle. These could either
be small-scale (e.g., healing rituals for individuals) or large-scale
(a sacrifice to a heroic ancestor that everyone is invited to).

TODO - more detail

TODO - more on omens and responses to crises

### Justice

Various kinds of disputes can arise:

*   Family: Disputes over marriage, divorce, parentage, etc. This is
    a staple of courts today and probably always has been.

*   Minor local issues: Getting kicked by a neighbor's cow, drunken
    youths breaking things, etc. There will be fairly regular events
    of this type, so people will need to be able to resolve things.

*   Significant disputes: Arguments over major business transactions,
    social developments, or major crimes. These won't happen as often,
    might be harder to deal with, might prompt changes of practice,
    and the outcomes might have simulation-noticeable effects.

Let's start with local issues, family and otherwise. The basic idea
is that some amount of these issues will arise, which can have 
negative effects, but practices such as community mediation can
mitigate them. It can also be possible for certain people to excel
at mediation.

What do these issues look like? One basic form would be a neighbor
damaging or taking property of another. If people are in a regular
relationship in good standing with each other, they can probably
resolve this by agreement, but not every time. But if they don't
know each other, it's less likely they can resolve, and even less
likely if they are already hostile to each other.

The number of such incidents should scale superlinearly, because
there will be generally more opportunities to "collide" in bigger,
denser settlements.

Incidents that can't be handled by the parties involved may be
brought to a communal assembly, court of elders, or other such
thing. These give another chance to resolve the issue, but success
will depend on the prestige of the court, its power (e.g., the
level of community alignment with a communal assembly's decision),
incentives it offers, and possibly other factors.

Issues that aren't resolved can result in a feud between two clans,
which will be bad for both of them. Like other disputes, the feud
can be resolved, by the clans involved or by other parties. Splits
in a community assembly could cause fission events, community
breakdown, or other significant changes.

TODO - another pass, more detail

## Brainstormed lists

List of basic actions:

- marriage/marriage alliance
- gift exchange
- labor exchange
- trade deal
- shame/gossip against
- ostracism
- raid
- feud
- defensive pact
- predict omen
- collective feast
- collective ritual
- collective infrastructure investment
- mediate dispute

Potential sources of conflict:

- access to natural resources
- management of surpluses and stores
- access to prestige goods
- command over labor
- marriage partners
- prestige: best feasts, gifts, rituals
- authority: whose omens and rituals are paid attention to
- honor: disrepect/disputes
- autonomy: freedom from norms/commands