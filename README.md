# CMDR History

**Your Elite Dangerous career, straight from your own journal files.**
Open the page, point it at your journal folder, and get a full breakdown of where you've been, what you've found, what you've earned and what you've flown. No install, no account, no uploads.

**▶ [cmdr.odylle.org](https://cmdr.odylle.org)**

---

## What it shows

| | |
|---|---|
| **Commander** | Overview KPIs, credit balance, total wealth and fleet value over time |
| **Journey** | Jumps and distance per month, an interactive galaxy map of your route, exploration (first discoveries, mapping efficiency, notable bodies), exobiology progress per genus, surface landings and footfalls, stations docked |
| **Fleet** | Ships with hull/module value, rebuy and jump range, current cargo, fleet carrier finances, cargo and market orders, NPC crew |
| **Activity** | Powerplay merits per week, combat bounties, bonds and ranks, engineering statistics (rolls per blueprint, engineer and grade, experimentals), mining |
| **Records** | Lifetime statistics as recorded by the game itself |

A separate **Engineering** view (tab at the top, or [`#/engineering`](https://cmdr.odylle.org/#/engineering)) is the workshop:

| | |
|---|---|
| **Blueprints** | Every ship blueprint, experimental, synthesis recipe, tech broker unlock and engineer unlock, grouped like the outfitting screen (core, optional, hardpoints, utility). Grade pills show how many rolls you can afford right now |
| **Plan** | Pick blueprints, grade ranges and rolls; get the total materials, what you're short of and material trader suggestions to cover it |
| **Fitted** | Engineering on each ship from its latest loadout, with one click to plan the remaining grades |
| **Engineers** | Unlock status and rank per engineer |
| **Materials** | Live inventory against grade caps, with farming locations for every material |

## Privacy

Everything happens in your browser tab. Journal files are read locally and parsed in memory; **nothing is sent anywhere**. The page loads no analytics, no trackers and no third-party scripts or fonts. It makes no requests beyond its own files, which you can verify in your browser's network tab or by reading the source in this repository.

## Usage

1. Open **[cmdr.odylle.org](https://cmdr.odylle.org)**.
2. Click **Open journal folder** and select:
   ```
   %USERPROFILE%\Saved Games\Frontier Developments\Elite Dangerous
   ```
3. That's it. Next time, **Rescan** reopens the same folder with one click.

`Cargo.json`, `ShipLocker.json` and `Market.json` in the same folder are picked up automatically for current cargo and carrier market data.

### Browser support

| Browser | Folder picker | Remembers folder |
|---|---|---|
| Chrome, Edge, Brave, Opera | ✅ | ✅ |
| Firefox, Safari | Select or drag-and-drop the files instead | ❌ |

### Running offline

Download the repository (or a [release](https://github.com/odylle/odylle.github.io/releases) zip) and open `index.html` directly. It works from disk without a web server.

## How it works

The Player Journal is a line-delimited JSON log the game writes during every session. CMDR History streams through all `Journal.*.log` files, keeps the events it needs, and aggregates them per commander (multiple accounts are supported). Snapshot events like `Materials`, `Statistics`, `EngineerProgress` and `Loadout` provide current state; incremental events such as jumps, scans, sales and crafts build the history. Material counts start from the `Materials` snapshot written at login and are updated with every pickup, trade, craft and reward after it.

The engineering plan is saved in your browser's local storage, on your machine only.

Figures derived from journals only cover the journal files present in the folder. The **Lifetime** section comes from the game's own `Statistics` event and covers your commander's entire career.

## Project structure

```
index.html            page shell
css/                  fonts.css (self-hosted @font-face) · main.css (theme and layout)
data/                 static game data: materials, exobiology values, blueprints (generated)
js/version.js         app name and version, single source of truth
js/journal/core.js    journal parsing and aggregation (no DOM)
js/views/             render helpers, History sections, galaxy map, Engineering view (blueprints.js)
js/app.js             folder access, loading and startup
scripts/              maintenance tooling (not loaded by the page)
assets/fonts/         IBM Plex Mono and IBM Plex Sans Condensed (WOFF2)
```

Plain HTML, CSS and JavaScript: no framework, no build step, no dependencies. Scripts are classic `<script>` tags rather than ES modules, so the page also runs from `file://`.

## Development

```sh
git clone https://github.com/odylle/odylle.github.io
cd odylle.github.io
# open index.html in a browser, or serve it:
python -m http.server 8000
```

### Updating blueprint data

`data/blueprints.js` is generated. To refresh it, check out [EDEngineer](https://github.com/msarilar/EDEngineer) and [coriolis-data](https://github.com/EDCD/coriolis-data) next to this repository and run:

```sh
node scripts/build-blueprints.mjs ../EDEngineer ../coriolis-data
```

The script joins the two sources by matching each grade's recipe per module type, reports anything it couldn't map, and needs Node 18 or later.

Releases follow [Semantic Versioning](https://semver.org/). To release, bump `js/version.js`, move the *Unreleased* notes in [CHANGELOG.md](CHANGELOG.md) under the new version, then tag it:

```sh
git tag v0.1.0 && git push --tags
```

Issues and suggestions are welcome, whether it's a stat you'd like to see or a journal event that isn't handled yet.

## Credits

- Material data: [EDCD FDevIDs](https://github.com/EDCD/FDevIDs)
- Blueprints, engineers and material families: [EDEngineer](https://github.com/msarilar/EDEngineer) by msarilar; journal blueprint symbols: [EDCD coriolis-data](https://github.com/EDCD/coriolis-data)
- Material farming locations: community guides on the Frontier forums, Inara and EDBlackbox
- Fonts: [IBM Plex](https://github.com/IBM/plex), SIL Open Font License 1.1

## License

[MIT](LICENSE) © CMDR Odylle

*Elite Dangerous is © Frontier Developments plc. CMDR History is an unofficial fan project and is not affiliated with or endorsed by Frontier Developments.*
