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
*   food exchange
    *   retain production in clans by default
    *   create institutions and interactions for exchange
*   ritual production
    *   start with communal production
    *   offer ability to put on special rituals
    *   also crises and omens
*   justice
    *   disputes over marriages, abuses, respect, and so on

## Topical backlog

*   Food exchange and mutual aid
    x   Switch to individual clan production
    x   Add more skill variance
    x   Make clans sync up more slowly on skills:
    *   Add crop failures and disasters
    *   Add crop failure responses

*   Marriage model changes
    x   Record relationships
    x   Update relatedness
    x   Marry more broadly
    *   Visualize better in the UI
        x   Show relatedness
        *   Show marriages this turn
        *   (P2) Show people moving in and out for marriage in
            population change panels.
    x   Have marriage affect alignment
    *   (Soon) Limit how much two clans can marry together. At first
        there's not too much point because scale is so small, though.
    *   (Later) Consider prestige effects for marriage

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

Implementation notes:

*   Switch to individual production
    *   At the start we can assume land is regularly redistributed
    *   But as soon as we get any real capital investments we'll have
        to have land ownership
*   Add collective sharing of some amount (10%?) of production
    by default
    *   Consider adding cooperate-defect choices around this
    *   Consider adding option to share larger amounts
*   Add trade relationship action
    *   This should probably be a "thick" relationship, possibly
        requiring marriage ties to initiate. This isn't a simple
        market exchange, it's a complex relationship that includes
        the exchange of goods and is expected to persist over time.
    *   On that basis, they could trade relatively specific amounts.
        We could allow various simple or complicated negotiation
        options.
*   Add crop failures/insurance
    *   Simplest model would simply be to give some bonus points for
        insurance relationships, but this can do some other interesting
        things, so we probably want more detail.
    *   First point is that people will want to be in some relationships
        where they're covered.
        *   In starting villages, we can say there's a communal insurance
            model where everyone will help out if someone gets a crop
            failure.
            *   However, we may want to give people the option not to
                help, or to help extra, if they choose.
            *   One way or another, this will have limits to scale.
                *   One point is that typically people will do stuff to
                    confirm and signal these relationships, which has a
                    cost.
        *   People founding a new village will want some ties with people
            back home.
            *   If they have related clans there, that might be enough.
                We'll then need to extend the model so that the related
                clans can help
            *   Otherwise, they may need a sponsor, who is then in some
                sort of relationship with them and probably expects
                reciprocation of some sort.
        *   In some cases, people may have to go begging, which might
            put them in debt or in some sort of subordinate relationship.
    *   Crop failure if unmitigated would cause some sort of famine event.
        A mild one might simply reduce nutrition somewhat, but a serious
        one could cause deaths during that year.
    *   Clans providing insurance directly provide food, which reduces
        the famine effects
    *   We can also allow clans storage to mitigate against crop failure,
        but this will typically require technology and/or investment.
*   Add gifts
    *   Clans with high output can give gifts to increase alignment and
        prestige.

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

#### Discussion: Simple ritual leadership modeling

Let's try to detail in this in a simple model. We can also think by
analogy to a pioneer church, which might start up without much
preaching expertise. But people probably find that there are significant
differences in preaching ability. What that means depends on how
homogeneous preferences are. If people mostly want the same things
(which seems likely in our case as there seems to be a lot of common
culture) then that's pretty simple. Another possibility would be
immigrants from all over the place with quite different expectations.
In that case, I think leaders would have to be loose and syncretic,
and perhaps a more common culture could form over time.

It also seems that in small-scale societies, influence can be very fluid.
Imagine that there's a great speaker in clan S in generation 1. They'll
have on average only 2 children who survive to adulthood, and depending
on the culture maybe only one gender could become a great speaker, so only
1 child. Some ability can be inherited, as well as relationships and
position, but there will be some regression to the mean. Also, the great
speaker might not have any children at all. Over time there will be more
physical, intellectual, and dynastic capital needed for these things and
then inheritance will become more important.

One way to make this work is to have the clan leader be an individual
with their own ritual leadership stat. That can then be partially inherited,
but of course with much higher variance than the clan ritual leadership
stat, which should create more turnover.

Back to our pioneer churches: We imagine that at first, people take turns,
but pretty quickly start to figure out who the best ritual leaders are.
But if there is more than one, how to decide which one? At first, people
might simply tussle over this, but they'd probably soon develop some
"norms", some standard way of selecting the leader.

#### Leader selection ways

This can be all over the place, but a few points:

*   In the most fluid societies, this may happen from personal callings
    such as visions, as well as training by elders. Anyone paying much
    attention could be largely voluntary, so this would depend greatly
    on individual qualities.
*   In our case, we think that later on there will be (not strictly)
    inherited "priesthoods", so we can start by considering that lineage,
    knowledge, personal skill, relationships, and circumstance can all
    count, and that there's an inherited clan chief who will be the
    eligible leader.
    *   At the start, certain clans perhaps have more or older connections
        to the people they learned farming from, so they would have more
        lineage points.
    *   But this might not be a greatly secure status at first.
*   In general, any given leader could be suddenly discredited, e.g.,
    by messing up a ritual and then having a bad event happen.
*   We might also assume that the village ritual leader is chosen by
    consensus of the elders.
    *   Elders are roughly the oldest 10% of the population, which is
        20-30 people in a village.
        *   We're basically assuming that they're influential enough
            that their collective decision will determine the overall
            decision. That's not literally true but may be a close
            enough approximation for now.
    *   It's reasonable to say that the consensus process can generally
        work well, if people are reasonably aligned to start with, up
        to that size.
    *   However, even if people are aligned, it will get harder going
        past that size. What happens is quite complicated and apparently
        includes:
        *   Meetings take too long and can't hear everyone. Participation
            may start to get pretty unequal and/or pointless.
        *   More factions and cliques may start to form.
        *   More chance of holdouts makes it harder to ever make a
            decision.
    *   Since this is all so complicated, it may be too hard to design
        all that much of it upfront, but rather to create a decision
        model and start looking at its emergent behaviors.
*   Another general point is that there are going to be different ritual
    leaders, e.g., there could be different leaders for different ceremonies,
    but also different roles such as healer or astronomer.
    *   This could get complicated eventually with specialties.
    *   But even in simple models, it implies that leadership can be
        fractional.
*   Putting those two together, then the natural thing would be to 
    have all clans vote on their preferred leader(s), convert the
    votes to fractional leadership, and then see if all clans will
    consent to that.
*   What would people conflict over?
    *   They could conflict over some new innovation. For example, if
        some leader started doing a different thing, maybe some people
        like that, some don't.
    *   They could conflict over some clan gaining too much influence,
        if that's counter to their existing practices. I'm not sure we
        have evidence for that much of this dynamic here.
    *   There could be conflict because of two leaders with matched
        skill who don't want to share (or their followers don't want
        them to share). For this to kick in, I think we need some desire
        for aggrandizement, and it's not clear that's a major force
        early on.

We could also allow clans to put on "special rituals" that represent
innovations on the normal collective ritual cycle. These could either
be small-scale (e.g., healing rituals for individuals) or large-scale
(a sacrifice to a heroic ancestor that everyone is invited to).

#### Omens and crises

People in ancient societies apparently regularly consulted omens.
Exactly how that affected their beliefs and decisions is complicated,
but we can consider these features:

*   Omens can affect the appeal of decisions:
    *   Can be "random"
    *   Can be swayed by an interpreter
        *   Note: Interpreters were sometimes accused of fraud or bias!
*   Using omens can increase or decrease confidence/alignment for a
    decision.
*   Bad omens may lead to scapegoating
*   There could be conflict over the meaning of an omen
*   Repeated bad omens or other disasters could cause people to lose
    faith, create a splinter sect, start a new religious movement, or
    replace leaders

TODO - implementation notes

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

Implementation notes:

*   This could easily get incredibly complicated, so let's start
    with something relatively simple.
*   First, let's imagine that things start with a community
    assembly for disputes: everyone can speak, but there is
    probably more influence by elders, the more prestigious, etc.
*   There will be some "dispute" level, e.g., number of notional
    issues referred to the assembly per turn, maybe starting
    around 400 per turn for a village of 20.
    *   Or we could imagine these are scaled by dispute seriousness
        and let the measure be more abstract.
*   Dispute resolution systems could have a number of disputes
    they can handle and a success rate for handling them
    *   Kin relations can help, especially if the dispute is between
        two clans that are related. People have an interest in
        resolving the dispute and can pressure clan members
        *   This may break down if people aren't related enough,
            and then people may move away or create new practices.
    *   Community assembly can handle a fixed amount because everyone
        has to be present
    *   Probability of success depends on alignment and skill
*   Resolved and unresolved disputes will have an impact on trust
    levels.
    *   For this, we might need trust and order ratings separate
        from the alignment ratings. Individual disputes could be
        dyadic, but if we're treating them in the aggregate,
        some people might be happier than others with dispute
        resolution outcomes, but this starts to look more like a
        relation of clans to the community as a whole.
    *   Unresolved disputes lower trust.
    *   Resolved disputes put trust toward a midpoint: they might 
        drop trust a bit if it's very high, but if it's already low,
        having some disputes and mitigating them might help.
*   In the community assembly, some person or clan might speak
    particularly successfully and gain prestige (and also help
    resolve more disputes)
*   Major disputes
    *   These can be over social issues, major business dealings, or
        major crimes
    *   Ideally these get narrative treatment and come in different
        kinds, but for now let's map out just a couple of categories
    *   Social issues
        *   Could be things like ritual leadership, property ownership
            models, changing mores, etc. Each one should be a concrete
            issue.
        *   Could use common political models here
    *   Crimes
        *   The idea is that there's a crime so serious it could really
            affect one more clan's standing
        *   Result is a major trial.
        *   Each actor who has influence over the result must choose a
            a strategy: follow divine omen, favor community harmony,
            favor party A or B, etc.
        *   Then have to play out voting/consensus/etc with whatever
            structure exists
        *   Apply verdicts with meaningful effects
        *   Judges and counselors may gain prestige.

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