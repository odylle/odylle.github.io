# Changelog

All notable changes to CMDR History are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).
The version shown in the page footer comes from `js/version.js`; bump both together.

## [Unreleased]

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

[Unreleased]: https://github.com/odylle/odylle.github.io/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/odylle/odylle.github.io/releases/tag/v0.1.0
