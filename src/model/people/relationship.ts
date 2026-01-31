import type { Clan } from "./people";

export class CalcBase {}

export class Relationships {
    private m: Map<Clan, Relationship> = new Map();

    constructor(readonly subject: Clan) {}

    get(object: Clan): Relationship | undefined {
        return this.m.get(object);
    }

    update() {
        // Update the map to contain clans the subject is in contact with.
        for (const [object, relationship] of this.m) {
            if (!this.shouldHaveRelationshipWith(object)) {
                this.m.delete(object);
            }
        }
        for (const object of this.subject.settlement.clans) {
            if (!this.m.has(object)) {
                this.m.set(object, new Relationship(this.subject, object));
            }
        }

        // Update the relationships.
        for (const [object, relationship] of this.m) {
            relationship.update(1/this.m.size);
        }
    }

    private shouldHaveRelationshipWith(object: Clan): boolean {
        return object !== this.subject &&
            object.settlement === this.subject.settlement;
    }
}

export class Relationship {
    interactionVolume: InteractionVolume;

    constructor(
        readonly subject: Clan,
        readonly object: Clan) 
    {
        this.interactionVolume = new InteractionVolume(subject, object);
    }

    update(attentionFraction: number) {
        this.interactionVolume.update(attentionFraction);
    }
}

export class InteractionVolume extends CalcBase {
    attentionFraction = 0;

    nomadicVolume = 0;

    coresidenceFactor = 0;
    settlementScaleFactor = 0;
    coresidentVolume = 0;

    amount = 0;

    constructor(
        readonly subject: Clan,
        readonly object: Clan
    ) {
        super();
        this.update();
    }

    update(attentionFraction = 0.1) {
        this.attentionFraction = attentionFraction;

        this.nomadicVolume = attentionFraction * 0.25;

        this.coresidenceFactor = this.subject.settlement === this.object.settlement
            ? Math.min(this.subject.residenceFraction, this.object.residenceFraction)
            : 0;
        this.settlementScaleFactor = Math.min(1, Math.sqrt(150 / this.subject.settlement.population));
        this.coresidentVolume = attentionFraction * this.coresidenceFactor * this.settlementScaleFactor;

        this.amount = this.nomadicVolume + this.coresidentVolume;
    }
}