Village splits are behaving a bit strangely, so it's a good time
to revise the migration model. Start, of course, with theoretical
background.

# Background

We want to model this:
-   At first, villages grew in number but stayed village size
-   Later, some settlements grew beyond village size, while new
    villages continued to appear

Key questions are:
-   Why do villages usually split at a certain size?
-   Why do villages sometimes grow beyond that size?
-   What's different in the two cases?

Local size limits are both economic and social, but for village
splitting early on, economics are probably not a main cause.
Early farmers would typically commute up to 3-4km, which covers
enough land to support 5-10K residents, or perhaps even 20K.
For us very early on, the limits of the local alluvium could be
an issue, but irrigation should make that not a significant limit.

The primary limitation is social and is around Dunbar's number.
Precisely why fissioning tends to occur beyond that number is
unclear, but it seems that there is a background of conflicts
(over marriages, crimes, scheduling and details of collective
events) that the community can reliably synchronize on a resolution
for only under a certain population.

Many factors could be involved, but let's try to home in on the
most important. Below Dunbar's number, hypothetically, everyone
knows everyone: the social graph is completely connected. People
sync their opinions via gossip, and most people come to assent.
Above Dunbar's number, not everyone is equally connected. As a
result, people start to feel more similar to those they're
connected to; there's not much to feel differently similar about
in our initial relatively simple world. (People are also less
genetically connected in larger villages. It's probably good
if this appears naturally via marriage connections in our
simulation, but I think if everyone's just universally somewhat
less connected, that makes fissioning more likely, but doesn't
seem a good explanation of a specific threshold.) That, combined
with non-universal connectivity, make polarization on a big issue
possible. This is our primary conceptual model for why villages
split.

As to why settlements sometimes grow beyond village size, the
natural explanation would be that something new allows keeping
the peace on larger scales than gossip. These could include:

*   More formal adjudication procedures, such as a collective
    court assembly or a priest-led court, to decide something
    one time and make the decision stick
*   Broadcast information sources such as sermons, to create
    some level of broad commonality
*   Interaction scopes such as game fields, market places, and
    worship houses that cause people to mix more beyond family
    bounds
*   Institutions promoting exogamy to create broader networks
    and smooth out relatedness by marriage

These things can be demanded either bottom-up by the community
in response to social stress (possibly as latent demand) or by
upstarts or elites for a variety of purposes, such as satisfying
a known demand, building a monument to increase status, or
attracting more followers in a location. Once they exist, it
seems they can be fairly readily replicated, because once a few
towns start growing in a culture area, it seems there isn't that
much limit to how much more they can grow.

# Modeling

Though the mechanisms are more complicated, local population
seems to be the primary factor in fissioning, so we could use
a simple model of stress as a function of population, mitigated
by certain features.

However, recall that a recent focus has been on the idea that
people need different kinds of relationships, and how they
satisfy those needs determines a lot of what goes on. Apparently
we need to add the idea that they need avoid certain kinds of
(anti-)relationships. So let's keep the clans as agents.

For Dunbar's number, let's posit that through visits, gossip,
small gifts, and favors, one adult can exchange social-peace
information with L≈75 other adults. Clans are now around 30,
so each clan has about 15 adults, each of whom could in theory
maintain connections with 45 different adults, for a total of
over 500! However, for the graph to be completely connected,
for each two clans, every member must be connected to every
other member. It should work to model this by giving each clan
L=80 units of social attention, with cost N=#adults to maintain
full connection to any clan (including themselves). (We could
also just scale by population: results should be the same.) They 
can also maintain partial connection with proportionally lower
influence. Note that this isn't only a time and resources limit:
beyond the attention limit, people have a harder time figuring
out who they're talking to, whether they should believe what
they're saying, etc.

Interactions of this type (later extended to interacting at
different amenities and events, and later still to symbolic
relationships) can be the main source of relatedness/goodwill.
Genetic relatedness is often said to be important, but in
practice it seems those relationships are known and confirmed
through interactions.

Relationships and activities should probably have some influence
on how clans spend their attention:
*   Clans need some sort of relationship or interaction sphere
    to spend attention
*   Some relationships may require expending attention to
    maintain. In fact, we can posit that relationships generally
    require some kind of ground of trust, which before organized
    policing required social bonds, often including marriage,
    including for things like open trade
*   Kinship should enhance the relatedness when present, though.

For triggering splits, we have options. We could trigger specific
events and see if the graph can synchronize or not. That might be
hard to tune, though. Another possibility is to let disconnected
neighbors start generating disamenities for each other, which
still has per-clan texture but is more gradual and less sudden.

# Model changes

*   Firm up exactly what snapshots we're showing, maybe should
    be simply UI snapshot comparisons
*   Fix up relationship model
    x   Basic new relationship structure
    x   Display something reasonable in debug panel
    x   Kin working in new structure
    x   Marriage working in new structure
    x   Neighbors working in new structure
    *   Friends working in new structure
    *   New "relationship operation" concept
        *   General socializing operation
            *   Transmits information
            *   Increases alignment
        *   Mutual help activity
            *   Condition on connection?
            *   Condition on alignment?
    x   Make sure split clans have neighbors at next point
    *   Get an actual map for clan IDs
    *   Make sure deltas can show in main panel
    *   Point visualizations at new relationship structures

x   Bring back attention limit with relationship updates
x   Ensure clans use attention and have connections for marriage
    ties
x   Update alignment based on attention and interactions
*   Include random extra negative or positive interactions
    *   These should probably have some material effect too
        and not be just pure alignment effects
*   Fix up how clan kinship works -- at this level should
    probably be more like other relationships
    *   Thoughts on this:
        *   This is about senior-cadet clan relationships,
            though this can include invented ones
        *   The relationship should be sustained through some
            sort of activity. The code can still track the facts
            about these relationships, which later could
            correspond to written records
        *   If the clans get together and enact the relationship,
            they will have some view on what the relationship is.
        *   Eventually this could get complicated with different
            levels of nesting and who knows about whom (apparently
            people often are hazy about distant relatives and
            related groups), but we don't need this at first
        *   Eventually there should be an action for a junior
            clan to try to declare itself the senior
        *   But before that, we should have some benefit from
            being the senior clan, which for now would be
            prestige (!)
            *   Prestige should also have some sort of benefit.
                This could get complicated, but for now we can
                have it affect happiness and demographics
                (maybe under some name like "stress")
    *   Items to do
        *   Review architecture of new prestige model
            *   Immediate problem is that we can't show deltas because
                we have a big object that we mutate
            *   Looming problem is that we want clans to be able to
                have information about clans they don't have a
                relationship with
            *   Thoughts
                *   Might be useful to look at clan-clan relationships
                    as similar to Operations (ongoing activities that
                    can be invested in and/or worked on)
                *   What happens when there are multiple relationships:
                    kin and neighbors, or marriage and neighbors? 
                    *   Let's separate the relationship from the interaction
                        Relationship = when two people/groups believe they
                        have a certain relation to each other; interactions =
                        interactions that take place
                    *   Neighbors *is* then quite significant, but we 
                        should clarify what kind they are, or get coresidence
                        mattering more, because neighbors in a small farming
                        village could be a closer, more familiar relationship
                        than some
                *   New data structures needed
                    *   Family relationships - kin & marriages
                    *   Clan-clan information
                    *   Clan -> which clans they can interact with and their
                        cost
                    *   Let clans allocate attention there as an allocation
                    *   Require attention or other costs to maintain relationships
                        not based on proximity
                    *   Create an interaction object or the like when they
                        have attention to each other or a relationship where
                        they could interact
                    *   Create ways to add new relationships
        *   Revise prestige model
            *   Include senior-cadet relationships
            x   Introduce new model
            x   From relationships
            x   Fix up prestige aggregate - not working right
            *   Other prestige factors
            *   More dependence on relationship factors
            *   Add self-respect: clans should have information
                about themselves, can also have self bias
            x   Show cluster-level prestige ratings
            *   Come up with some way to visualize prestige differences
            *   Show sources of respect in a tooltip
            *   Fix bug where we don't get deltas because we're not
                cloning (kind of annoying because data structure is
                complicated)
            *   Decide exactly which prestige rating affects demographics -
                right now it's unclear
            *   Show some kind of text/visual summary of prestige
        x   Add basic effects for prestige
            x   stress/aid demographic effect
            x   happiness effect
        *   Figure out other benefits for prestige
            x   Make the demographic effect of prestige based on
                relative prestige
            *   Marriage
            *   Attention
            *   Access to land?
            *   Gifts of labor or goods? (but what's the motivation?)
        *   Add Kin relationship to relationships model with
            alignment bonus
*   Let clans have knowledge of clans they don't directly interact
    with
    *   Be sure to let clan A learn transitively through people it
        knows about respect-related information
*   Get friends working again
*   Make low-related marriage relationships not strong ties
*   Limit or make attention more expensive across distance,
    including when not coresident
*   Introduce some sort of "charisma" differential or skill
*   Make attention requirements scale sublinearly, because there
    are economies of scale knowing N people in the same clan, and
    that will give larger clans an advantage in getting attention
*   Have clans transmit alignment information to each other
*   Create amenity for positive relationships
*   Create disamenity for interactions outside of positive
    relationships/interactions
*   Verify that scale causes stress per metrics above
*   Trigger village splits from stress or conflict
*   Charge cost for building new village
*   Give option to ditch individual farm for flood control
*   Give option to construct new farm via irrigation canal
*   Allow clans to move to villages where they have connections
*   Allow clans to apply for junior membership in new villages
