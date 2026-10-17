Some observations from a 300-year run at present:

*   Population grew and settlements proliferated rapidly
*   It looks like average settlement size dropped
*   Eudaimonia rose at first but then declined

What is not as we want it to be:

*   There should start to be larger settlements by the
    time we have clusters of 10 villages
    *   But really, we shouldn't have that fast of
        population growth
*   We'd have to know why eudaimonia declined to know
    if that's correct or not

## Average settlement size

*   Adding graphs confirms that it craters.
*   Moves are currently triggered by social QoL, which is
    an obsolete model, so we need to replace that.

### Replacing Social QoL

The social QoL migration factor was supposed to represent
"scalar stress" triggering migration. In the new models,
this would be represented by:

*   Conflicts, especially when it becomes harder for the
    whole community to align on a resolution
    *   For this, we need to implement the new conflict
        model
*   Marginalization: clans not getting enough connections
    or priority
    *   We'd start this by getting more metrics on what
        clans are getting here
    *   Also need to better understand what current values
        we're producing and make this make more sense
        generally

#### Conversation Redux

The model has gotten very confusing. Let's think fresh,
starting from the "outputs". What does conversation do?

*   Transmit information
*   Increase alignment/trust
*   Increase happiness/fortune/QoL

Perhaps we should think of conversation in part as a small
gift, of time/attention/acknowledgment, that has the usual
effects of a gift and produces a track record which can
build trust toward larger exchanges.

This would imply a giving game along the lines of food aid,
but with differences:

*   Allocation more by affinity than need
*   Different baseline situation

What are the needs here? Why do clans need to give/receive
attention?

*   Psychological
    *   It seems people both a drive to socialize and limits
        to social battery, so we can model traits for both
        behavior and evaluation.
*   Functional
    *   Marriage partners
    *   Peacekeeping
    *   Mutual aid exchange
    *   Collective events and projects
    *   News and learning
    *   Influence

Ultimately we want functional and psychological to roughly
align, but seeing that there are several functional pieces,
we can't expect that to happen all at once.

Giving and receiving attention may have different benefits:
e.g., receiving gives more influence, giving more information.

What does a basic model look like? First thoughts:

*   For optional socializing, each clan can offer different
    amounts of person-time to others
*   At rituals, clans can take turns paying attention to
    each other
*   It's understood that there is within-clan socializing,
    so cross-clan relations have to be understood on top
    of that.
    *   Given that there are lots of within-clan interactions,
        why do people interact outside the clan?
        *   Marriage relations/kin
        *   Neighbors may automatically have interactions
        *   Festivals
        *   Cultivated aid/trade relationships
        *   Desire for something different
        *   Desire for additional socializing in small clan
    *   Doing that again, separating motivators from evaluators:
        *   Cause cross-clan interactions as side effects
            *   Marriage/kin - but also relates to desire to be
                connected to them
            *   Neighbors - but also relates to desire to be
                connected to them
            *   Festivals - but also relates to motivations for
                various festival activities
        *   Cultural needs
            *   Cultivated aid/trade relationships
        *   Psychological needs
            *   Desire to be connected to others around
            *   Desire for something different
            *   Desire for additional socializing in small clan
            *   Ambition
    *   We can define these more specifically for our setting:
        *   Marriage: Let's posit that for a broad range of
            cultures including our initial setting, connections
            across marriage are very important, and people will
            spend time and resources to meet.
        *   Kin: As marriage.
        *   Neighbors: Let's have a trait for how much people
            want to interact with non-clan neighbors.
        *   Festivals: No special notes.
        *   Cultivated aid/trade relationships: Clans should
            have a strategy for trying to have at least X aid
            relationships to draw on.
        *   Desire to be connected to others around: Covered
            under items above.
        *   Desire for something different: We might not need
            this in addition to the factors we already have.
        *   Desire for additional socializing in small clan:
            Apparently the attention supply is somewhat internal,
            but can be topped up from outside. But note that
            large clans might also generate more misfits who
            also specifically seek cross-clan relationships.
        *   Ambition: Leads to specifically desiring cross-clan
            reknown.
    *   That's a huge amount of stuff, so let's zoom in on marriage,
        since that's obviously important.
        *   I don't know the exact setup, but vaguely assume that
            marriages are patrilocal, but with wives remaining in
            contact with their original families and kin.
        *   We further assume that people have a drive to maintain
            these kin relationships, so:
            *   -Fortune if they're unable to
            *   They will pay costs, e.g., travel, to maintain
                these relationships
    *   Or maybe start with neighbors, since the marriage model
        itself needs help.
        *   Reasons to want to interact with neighbors, specifically:
            *   Strategic aid relationships
            *   Collective rituals and projects
            *   Additional/different socializing
        *   Stuff
            *   Let's assume that people have desired numbers of
                relationships and amounts of interactions, with
                different tiers such as close, near, acquaintance,
                and so on. We're not going to represent all of
                that complexity but rather some extremely simplified
                version.
            *   Also, we're going to work in numbers of people,
                but families might be the actual interacting units
                in many cases.
            *   As a first step, let's say that each person or
                family would have ~50 "associates" total, and
                up to ~200 "acquaintances" as in people they know
                something about.
            *   Intra-clan relations will consume/provide some of
                those in a dense graph.
            *   After that, each person/family has 50-N "slots" for
                extra-clan associates.
            *   We can have a diminishing-returns welfare function
                for association. There will probably be some
                approximation function mapping number of outside
                slots filled to welfare.
            *   It would be nice to make these cost something, but
                a hard cap seems OK.
            *   Affinity should make welfare effects better.
            *   Strategic aid relationships: This will depend on
                how that part of the model works. But roughly,
                there must be some sort of trust concept about
                whether they'll come through. That would relate
                to the behavior so we can build this out as we
                get more behavior differences there.
            *   Collective rituals and projects: Need some sort of
                inbuilt demand for this, possibly also with clans
                able to satisfy some internally. Then there's also
                a ritual component with asymmetric attention.

Next items:

*   Review and update model and UIs to make sure basic structure
    reflects the ideas above.
    x   Tune down conversation level a bit
    x   Rename conversation strength/value to connection level
        or something like that
    *   (P2) Consume some attention internally
*   Review and update model and UIs to make sure welfare reflects
    the ideas above.
*   Review and update that clan matching behavior has a reasonable
    relationship to welfare functions.

Then:

*   Add UI to find out if any clans are experiencing relationship
    dissatisfaction, and see if there's anything they can do
*   See if that can be the basis of a fission model. If so, try
    it out

Next:

*   Implement revised conflict model for fissioning.