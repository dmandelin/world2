Perceptions depend on what information clans have about each
other. So far we have an information statistic and can use it
to downscale respect factors, but that's not how information
works:

*   Clans would get plenty of information second- and third-
    hand.
*   Some information is a lot more salient and travels a lot
    more easily than others.
*   Right now, clans influence each other only toward the
    total statistic. That does make sense, but clans should
    also explicitly use information they got from other clans.
    *   One reason is that different clans may react differently
        to the same news.

Let's go over the evaluative information clans use and how
that might track:

*   mutual aid - will need update
*   direct gifts
    *   Clans should generally know about gifts directly to
        themselves, but if there were enough, it could get
        hard to track
*   direct aid
    *   Similar to direct gifts but more salient
*   aid heard about
    *   Clans probably can't track exact amounts that much
        over time, but we might not actually lose much by
        letting them (vs designing some more coarse-grained
        system)
    *   Large amounts of aid will be more salient than small
        and the information will travel further
    *   We should probably have at least 2-link information
        transfer, but that might be enough to get started,
        because 1-link covers a village, so 2-link presumably
        can start to link villages
    *   Let effect of aid decay over time
*   traits
    *   piety
        *   Boosts favor/belonging
        *   This presumably can be heard about, but the
            information probably won't travel far unless
            exceptional, or in heavily embedded relationships
    *   intellect
        *   Boosts competence
        *   Similar to piety but may be somewhat less salient
            since it's not that visible (vs examples of 
            unusually intense or effective religious practice)
    *   although in some cases people can get some information
        on these quickly by first impression, we might imagine
        that having a solid impression on a clan's traits
        would probably take some years
*   sociability
    *   this specifically is an alignment bonus from basic
        interaction
    *   thus knowledge is direct and immediate
    *   probably has some second-hand impact too from mentions
        and combined visits
*   direct conflict
    *   this is also direct and immediate - from dyadic conflict
    *   may also want to penalize if any conflict moves are norm
        violations, but it's unclear if people think they are
    *   perhaps it's not exactly a norm violation but people will
        think you're argumentative so this can matter second-hand
*   skills
    *   similar to traits, but working together would also boost
        this knowledge
    *   visible productions too
*   QoL
    *   material - someone who's eating better, has better shelter,
        etc. will probably look healthier, but they probably have
        to interact fairly directly to learn this
    *   social - this will be more of a matter of gossip so probably
        travels somewhat further, but it's still pretty personal so
        has to be fairly direct
    *   conflict - this will travel further yet and will tend to
        be quite salient
        *   Thus bad news travels further than good
*   population
    *   in our current setting people will pretty much just know
*   random

Synthesizing that:

*   Facts clans will track about each other
    *   Automatically known because it's direct
        *   Gifts from B to A
        *   Aid from B to A
        *   Conflicts between B and A
    *   Automatically known otherwise
        *   Population - they don't necessarily know the exact number,
            but at our scale, if they're interacting, they'll have an
            impression. That could change later.
    *   Information that travels relatively easily
        *   Aid given, especially if large
        *   Conflicts, especially if serious
    *   Information that travels with more difficulty
        *   Traits
        *   Skills
        *   QoL
*   How information travels
    *   General concepts
        *   Items of information have a salience
        *   On each link, according to the link strength and salience,
            an information item may be transmitted accurately,
            erroneously, or not at all
            *   If clans are receiving information from multiple
                sources they'll have to integrate it, which has to
                happen before they retransmit
        *   Probably want to build all this up in pieces
    *   Direct info
        *   Can stay mostly the same, but...
        *   Probably makes more sense to track the event and its
            time, with a decay factor
        *   This also starts to look like a ledger, which could be
            generally useful
    *   Event information that travels easily
        *   For now, let's not worry about conflicting information
            and just let it flow.
        *   This can be something that flows according to salience
            then goes into the ledger
    *   State information that travels with more difficulty
        *   Here we might already need to consider conflicting
            information.
        *   Otherwise it can flow according to salience but wouldn't
            go into a ledger, rather "state tracking"

Items:

x   Introduce information concept for a clan to know stuff about
    another clan
    x   Ledger
    x   State
*   Move direct info to ledger
    x   Gifts
    x   Aid
    x   Conflicts
    *   (Construction)
*   Move indirect event info to ledger
    x   Aid
    x   Conflicts
    x   (Gifts)
    *   (Rituals)
    *   (Construction)
*   Move direct state info to state tracking
    *   Population
*   Move direct+indirect state info to state tracking
    *   Do some simplified version for scaling
    *   Sociability
    *   Traits
        x   Piety
        *   Intellect
    *   Skills
    *   QoL
    *   (Signals/displays)
*   Followups
    *   Scale down conflict activity to simplify and speed up
    *   Apply a blanket 7 or so total remembered long-term events
    *   Add hidden-from-each-other generosity and bellicosity
        stats
    *   Assessment scatter plots
    *   Let information spread 2 links
        *   For this to mean much of anything we need
            some cross-settlement links so check for
            those
        *   Subitems
            *   Aid
            *   Piety
    x   Somehow deal with the fact that a clan is not
        literally going to remember 53 separate instances
        of food aid
    x   Share out information on splits
    *   Have a way for super-notable information to get
        transmitted after the fact
    *   Get correct cutoffs and final forgetting deadlines
        In part to control size
    *   Have clans keep memory for a while if temporarily
        disconnected
*   Actual impact of the information on judgments
    *   Alignment
    *   Respect