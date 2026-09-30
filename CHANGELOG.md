# Changelog

All notable changes to CMDR History are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).
The version shown in the page footer comes from `js/version.js`; bump both together.

## [Unreleased]

### Changed
- Served from [cmdr.odylle.org](https://cmdr.odylle.org); `odylle.github.io` redirects there.

## [0.2.0] - 2026-09-30

### Added
- **Engineering view** next to History, switched with tabs at the top (`#/engineering` can be bookmarked). Journals are parsed once for both views. It holds Blueprints, Fitted engineering, Engineers and Materials; History keeps the engineering statistics.
- **Blueprints** browser: every ship engineering blueprint, experimental effect, synthesis recipe, tech broker unlock and engineer unlock contribution, searchable by module, blueprint, engineer or material.
- Ship blueprints are grouped by outfitting category (Core internals, Optional internals, Hardpoints, Utility mounts) and by module type in collapsible groups showing how many are craftable or planned. Searching or "Craftable now" opens all matching groups.
- Grade pills show how many rolls you can afford right now, and flag grades where none of your unlocked engineers is high enough rank.
- Engineering plan: add blueprints with a grade range and number of rolls; shows total materials needed, what you have and what you're short of. The plan is kept in your browser between visits.
- Plan entries have a module count (e.g. four shield boosters) with +/− controls. Adding the same blueprint and grade range again raises the count; different ranges stay separate entries.
- Material trader suggestions that cover shortfalls from surplus stock, within the same family first.
- Fitted engineering per ship from the latest `Loadout`, with a one-click "To G5" (or "Reroll" at max grade) per module and "Plan all" per ship. Each fitted module is tracked individually, so identical modules at the same grade are grouped into one plan entry.
- `scripts/build-blueprints.mjs` generates `data/blueprints.js` from EDEngineer and EDCD coriolis-data.

### Changed
- Material counts are now live: the login snapshot plus pickups, discards, trades, crafts, synthesis, tech broker unlocks, engineer contributions and mission rewards since then.
- Material tooltips also work on the Blueprints view.
- The Engineers table and Materials inventory moved from History to the Engineering view.
- Section links in the sidebar scroll without changing the URL, which now holds the active view.

## [0.1.0] - 2026-09-30

First public release, formerly the local "Elite History" page.

### Added
- Reads Elite Dangerous Player Journals directly from disk in the browser (folder picker, file select or drag-and-drop); nothing is uploaded.
- Companion files next to the journals are read too: `Cargo.json`, `ShipLocker.json`, `Market.json`.
- Sections: Overview, Credits, Travel, galaxy Map, Exploration, Exobiology, Surface, Stations, Fleet, Carrier, Crew, Powerplay, Combat, Engineering, Materials, Mining and Lifetime statistics.
- Material tooltips with farming locations per material.
- Remembers the chosen journal folder for one-click rescans (Chromium browsers).
- Grouped section navigation as a sticky sidebar on wide screens; horizontal bar on smaller screens.
- Version and changelog link in the footer.

### Changed
- Renamed from Elite History to CMDR History.
- Split the single `index.html` into `css/`, `data/`, `js/journal/`, `js/views/` and `js/app.js`; plain scripts so the page still works when opened from disk.
- Wider page layout (max 1480 px).

### Removed
- Google Fonts dependency: IBM Plex Mono and IBM Plex Sans Condensed are self-hosted under `assets/fonts/`, so the page makes no third-party requests.

[Unreleased]: https://github.com/odylle/odylle.github.io/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/odylle/odylle.github.io/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/odylle/odylle.github.io/releases/tag/v0.1.0
