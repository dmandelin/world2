# world2

**world2** is a simulation of the development of cities and social
structures in prehistoric southern Mesopotamia.

## Goals

The ultimate goal is to create a map game with as realistic dynamics
as possible that portrays the development of cities, culture, and
society in world prehistory and history. It may or may not be 
entertaining, but it has the structure of a game, so it can equally 
well be called a game or simulation.

For now this is scoped down to southern Mesopotamia 6500&ndash;4500 BC,
to make things tractable. Next places to add would be those that had
important interactions with southern Mesopotamia: nothern Mesopotamia, 
the Susiana plain to the east, and the mining regions in the Taurus
mountains to the northwest, and the Zagros mountains to the east.

Key features:

*   Model dynamics based on social science, including history, 
    economics, anthropology, archaeology, sociology, psychology.
*   Intertwined development of population, production economy,
    specialization, trade, religion, and culture.
*   UI for inspecting model parameters and calculations, to really
    understand what's going on.

## Status

In development. Does stuff but may or may not make any sense. The
model includes basic submodels for:

*   Population and population growth
*   Individual clans with a few traits and skills such as local
    tenure, strength, and farming
*   Economic production with choices between collective or family
    production
*   Ritual production with choices for how to select leaders
*   Prestige rating for each clan as seen by each other and itself
*   Social learning of skills and prestige assessments
*   Quality of life
*   Migration to a different or new settlement to increase quality
    of life.

[backlog.md](https://github.com/dmandelin/world2/blob/main/src/model/plans/backlog.md)
lists near-future plans.

## Architecture

Extreme simplicity is the way for now. This is a SvelteKit application
running entirely in a web client, with Node serving a few assets.

## Try it

TODO - Instructions for installing prerequisites

```bash
npm run dev
```

This will build, start the server, and print out a URL. Open the URL.

*   The main thing you can do is click the advance turn button in the
    upper right.
*   Many of the stats have tooltips showing detailed calculations.
    On touchscreen, long tap an item to show its tooltip if it has one.

[Report an issue](https://github.com/dmandelin/world2/issues/new)