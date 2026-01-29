import type { Clan } from "./people";

export class CalcBase {}

export class Relationship {
    constructor(
        readonly clan: Clan,
        readonly other: Clan) {}
}

export class Interaction extends CalcBase {
    // Initial concept:
    // - When co-resident:
    //   - Clan divides its 1.0 total interaction intensity
    //     among other clans.
    //   - Interaction intensity can be different in the two
    //     directions.
    //   - For many effects, min of the two directions counts.
    //     - But there could be cases where one clan can induce
    //       another to interact more than they wanted.
    //   - Before we have a spatial model, there should be an
    //     inverse square root cost penalty to represent the
    //     difficulty of interacting across a big village.
    //
    // - When not co-resident:
    //   - The 1.0 to divide is reduced by some factor, probably
    //     0.1 to 0.3.
    //
    // - At some point we'll probably want rituals as a key
    //   booster. Might need to also separate high-intensity
    //   vs low-intensity interaction.
}