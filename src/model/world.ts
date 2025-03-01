import { Clan } from "./people";

export class World {
    readonly clans = [
        new Clan('Abgal', 20, 60),
        new Clan('Ninshubur', 30, 50),
        new Clan('Didanu', 20, 40),
    ];
}

export const world = new World();