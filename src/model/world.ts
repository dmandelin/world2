import { Clan } from "./people";

export class World {
    readonly clans = [
        new Clan('Abgal', 60),
        new Clan('Ninshubur', 50),
        new Clan('Didanu', 40),
    ];
}

export const world = new World();