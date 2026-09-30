/* ---------- Main render ---------- */
function show(v){
  V = v;
  const S = v.stats || {}, X = S.Exploration || {}, B = S.Exobiology || {};
  $("cmdr").innerHTML = `CMDR <b>${esc(v.cmdr)}</b> · ${dt(v.first)} → ${dt(v.last)} · ${nf(v.files)} sessions`;
  const life = (n, lbl = "lifetime") => n != null ? `${lbl} ${nf(n)}` : "";
  const totalSpecies = v.genera.filter(g => !g.other).reduce((a, g) => a + g.known, 0);
  const exoEarned = v.orgSold.value + v.orgSold.bonus;

  const overview = `<div class="kpis">
    ${kpi("Jumps", nf(v.jumps), life(X.Total_Hyperspace_Jumps))}
    ${kpi("Distance", nf(v.ly), life(X.Total_Hyperspace_Distance) && life(X.Total_Hyperspace_Distance) + " ly", "cyan", "ly")}
    ${kpi("Systems visited", nf(v.systemsVisited), life(X.Systems_Visited))}
    ${kpi("Systems first discovered", nf(v.sysDiscovered), `${pct(v.sysDiscovered, v.honked)} of systems honked`, "violet")}
    ${kpi("Bodies scanned", nf(v.bodiesScanned), `${nf(v.planets)} planets · ${nf(v.stars)} stars`, "violet")}
    ${kpi("Bodies first discovered", nf(v.discovered), `${nf(v.discPlanets)} planets · ${nf(v.discStars)} stars`, "violet")}
    ${kpi("Bodies mapped", nf(v.mapped), `${nf(v.firstMapped)} first mapped · ${nf(v.efficient)} efficient`, "violet")}
    ${kpi("Species analysed", nf(v.speciesFound), `of ${totalSpecies} catalogued · ${nf(v.organic)} samples`, "green")}
    ${kpi("Exobiology earned", cr(exoEarned), `${nf(v.orgSold.firstLogged)} first logged`, "amber", "Cr")}
    ${kpi("Landings", nf(v.landings), `${nf(v.uniqueLanded)} different bodies`, "pink")}
    ${kpi("First footfalls", nf(v.firstFoot), `${nf(v.footfalls)} bodies walked · ${life(X.First_Footfalls)}`, "pink")}
    ${kpi("Stations docked", nf(v.stationsUnique), `${nf(v.docks)} dockings`, "amber")}
  </div>`;

  const travel = `<div class="panel chart"><div class="head"><h3>Activity per month</h3>
      <div class="seg" role="group" aria-label="Metric"><button type="button" data-k="jumps" class="on">Jumps</button><button type="button" data-k="ly">Light years</button></div></div>
      <div id="monthChart">${monthChart(v.months, "jumps")}</div></div>
    <div class="grid g3">
      ${panel("Travel", kv([
        ["Average jump", nf(v.avgJump, 1) + " ly"],
        ["Longest jump", v.longest ? nf(v.longest.d, 2) + " ly" : "–", v.longest ? `${esc(v.longest.from || "?")} → ${esc(v.longest.to)}` : "", true],
        ["Farthest from Sol", v.farthest ? nf(v.farthest.d) + " ly" : "–", v.farthest ? esc(v.farthest.name) + " · " + dt(v.farthest.t) : "", true],
        X.Greatest_Distance_From_Start != null && ["Farthest from start (lifetime)", nf(X.Greatest_Distance_From_Start) + " ly"],
        ["Fuel scooped", nf(v.scooped) + " t", `${nf(v.scoops)} scoops · ${nf(v.fuelUsed)} t burned`],
        ["Rode along on carrier jumps", nf(v.carrierJumps), `${nf(v.carrierLy)} ly carried`],
        ["Own carrier jumps scheduled", nf(v.carrierRequests), S.FLEETCARRIER ? `lifetime ${nf(S.FLEETCARRIER.FLEETCARRIER_TOTAL_JUMPS)} · ${nf(S.FLEETCARRIER.FLEETCARRIER_DISTANCE_TRAVELLED)} ly` : ""],
      ]))}
      ${panel("Arrival star class", hbars([...v.arrivalStars.entries()].sort((a, b) => b[1] - a[1]), "cyan"))}
      ${panel("Most visited systems", v.topSys.length ? `<div class="tbl"><table><thead><tr><th>System</th><th class="num">Arrivals</th><th class="num">Last</th></tr></thead><tbody>
        ${v.topSys.map(s => `<tr><td>${esc(s.name)}</td><td class="num hl">${nf(s.visits)}</td><td class="num">${dt(s.last)}</td></tr>`).join("")}</tbody></table></div>` : `<p class="note">No repeat visits.</p>`)}
    </div>
    ${panel("Ships flown", `<div class="tbl"><table><thead><tr><th>Ship</th><th class="num">Jumps</th><th class="num">Light years</th><th class="num">Max range</th><th class="num">Landings</th></tr></thead><tbody>
        ${v.ships.map(s => `<tr><td>${esc(s.label || s.typeName)}<span class="sub">${esc(s.typeName)}${s.ident ? " · " + esc(s.ident) : ""}</span></td><td class="num">${nf(s.jumps)}</td><td class="num hl">${nf(s.ly)}</td><td class="num">${s.maxJump ? nf(s.maxJump, 1) + " ly" : "–"}</td><td class="num">${nf(s.landings)}</td></tr>`).join("") || `<tr><td colspan="5" class="empty">No ship data</td></tr>`}
      </tbody></table></div>`)}`;

  const map = `<div class="mapbox" id="mapbox">
      <canvas id="galaxy" tabindex="0" aria-label="Top-down galaxy map of visited systems"></canvas>
      <div class="maptools">
        <button class="btn small cyan" type="button" id="mFit">Fit route</button>
        <button class="btn small violet" type="button" id="mGal">Whole galaxy</button>
        <button class="btn small" type="button" id="mLine">Route line</button>
      </div>
      <div class="tip" id="tip"></div>
      <div class="scale" id="scale"></div>
    </div>
    <p class="note">Top-down (X / Z) view, galactic core up. Colour runs <span class="ramp"></span> oldest → newest jump. Drag to pan, wheel to zoom, hover a star for its name.</p>`;

  const nav = v.notable;
  const exploration = `<div class="tags">${nav.map(n => `<div class="tag ${n.n ? "violet" : "zero"}"><span class="l">${n.label}</span><span class="v">${nf(n.n)} <small>${nf(n.disc)} first</small></span></div>`).join("")}</div>
    <div class="grid g2">
      ${panel("Planet classes", hbars(v.byClass.map(([c, o]) => [c, o.n, o.disc]), "violet", {secondary:true}) + `<div class="legend"><span><i style="background:var(--violet);box-shadow:var(--g-violet)"></i>first discovered by you</span><span><i style="background:rgba(180,107,255,.35)"></i>scanned</span></div>`)}
      ${panel("Star types", hbars(v.starTypes.map(([c, o]) => [c, o.n, o.disc]), "cyan", {secondary:true}) + `<div class="legend"><span><i style="background:var(--cyan);box-shadow:var(--g-cyan)"></i>first discovered by you</span><span><i style="background:rgba(34,228,255,.35)"></i>scanned</span></div>`)}
    </div>
    <div class="grid g2">
      ${panel("Scanning", kv([
        ["Systems honked (FSS discovery scan)", nf(v.honked)],
        ["Systems fully scanned", nf(v.allFound), pct(v.allFound, v.honked) + " of honked"],
        ["Biggest system honked", v.biggestSys ? nf(v.biggestSys.bodies) + " bodies" : "–", v.biggestSys ? esc(v.biggestSys.name) : "", true],
        ["Surface mapped (DSS)", nf(v.mapped), `${nf(v.firstMapped)} first mapped · ${pct(v.efficient, v.mapped)} efficient`],
        ["Geological signals found", nf(v.geoSignals)],
        ["Exploration data sold", cr(v.explSold.earnings) + " Cr", `${nf(v.explSold.systems)} systems · ${nf(v.explSold.bodies)} bodies in ${nf(v.explSold.sales)} sales`],
        X.Exploration_Profits != null && ["Exploration profits (lifetime)", cr(X.Exploration_Profits) + " Cr"],
      ]))}
      ${panel("Records", kv(v.records.map(r => [r.label, r.val, esc(r.name), true])))}
    </div>`;

  const exoTiles = `<div class="kpis">
      ${kpi("Samples analysed", nf(v.organic), `${nf(v.samples)} log/sample scans`, "green")}
      ${kpi("Species", `${nf(v.speciesFound)}`, `${pct(v.genera.filter(g => !g.other).reduce((a, g) => a + g.found, 0), totalSpecies)} of catalogue${B.Organic_Species_Encountered != null ? " · lifetime " + B.Organic_Species_Encountered : ""}`, "green")}
      ${kpi("Variants", nf(v.variants), B.Organic_Variant_Encountered != null ? `lifetime ${B.Organic_Variant_Encountered}` : "", "green")}
      ${kpi("Genera", `${v.genera.filter(g => !g.other && g.found).length}<small>/ ${v.genera.filter(g => !g.other).length}</small>`, B.Organic_Genus_Encountered != null ? `lifetime ${B.Organic_Genus_Encountered}` : "", "green")}
      ${kpi("Vista Genomics paid", cr(exoEarned), `${cr(v.orgSold.value)} base + ${cr(v.orgSold.bonus)} bonus`, "amber", "Cr")}
      ${kpi("Catalogue value analysed", cr(v.estValue), "base value of every analysed sample", "amber", "Cr")}
      ${kpi("Bio signals found", nf(v.bioSignals), `on ${nf(v.bioBodies)} bodies · ${nf(v.bioComplete)} fully sampled`, "cyan")}
      ${kpi("Codex entries", nf(v.codex.total), `${nf(v.codex.fresh)} new to your codex`, "violet")}
    </div>`;
  const genera = `<div class="genera">${v.genera.filter(g => g.samples || !g.other).sort((a, b) => (a.other ? 1 : 0) - (b.other ? 1 : 0) || b.found / b.known - a.found / a.known || b.samples - a.samples).map(g => `
      <div class="genus${g.found === g.known && !g.other ? " done" : ""}">
        <div class="gh"><span class="gn">${esc(g.genus)}</span><span class="gc">${g.found} / ${g.known}</span></div>
        <div class="pb"><i style="width:${g.found / g.known * 100}%"></i></div>
        ${g.species.sort((a, b) => (b.n > 0) - (a.n > 0) || (b.value || 0) - (a.value || 0)).map(s => `
          <div class="sp${s.n ? "" : " miss"}"><span class="nm">${esc(s.name)}${s.n ? ` <span class="ct">×${s.n}</span>` : ""}</span><span class="vl">${s.value ? cr(s.value) : "?"}</span>
          ${s.variants.length ? `<div class="chips">${s.variants.map(x => `<span class="chip">${esc(x)}</span>`).join("")}</div>` : ""}</div>`).join("")}
      </div>`).join("")}</div>`;
  const exo = `${exoTiles}
    <div class="grid g2">
      ${panel("Richest biology bodies", `<div class="tbl"><table><thead><tr><th>Body</th><th class="num">Signals</th><th class="num">Analysed</th></tr></thead><tbody>
        ${v.topBio.map(b => `<tr><td>${esc(b.name)}</td><td class="num hl">${b.n}</td><td class="num">${b.done}</td></tr>`).join("") || `<tr><td colspan="3" class="empty">No biological signals</td></tr>`}</tbody></table></div>`)}
      ${panel("Latest new codex entries", `<div class="tbl"><table><tbody>
        ${v.codex.newList.map(c => `<tr><td>${esc(c.name)}<span class="sub">${esc(c.region || "")} · ${esc(c.system || "")}</span></td><td class="num">${dt(c.t)}</td></tr>`).join("") || `<tr><td class="empty">None</td></tr>`}</tbody></table></div>`)}
    </div>
    <h3 style="margin:6px 0 0">Genus collection <span style="letter-spacing:0;text-transform:none;font-weight:400"> · catalogue base value per species, dimmed = not yet analysed</span></h3>
    ${genera}`;

  const hl = v.heaviestLanding, ht = v.hottestLanding;
  const surface = `<div class="kpis">
      ${kpi("Touchdowns", nf(v.landings), `${nf(v.liftoffs || v.A.liftoffs)} liftoffs`, "pink")}
      ${kpi("Bodies landed on", nf(v.uniqueLanded), "", "pink")}
      ${kpi("Bodies walked on", nf(v.footfalls), life(X.Planet_Footfalls), "pink")}
      ${kpi("First footfalls", nf(v.firstFoot), life(X.First_Footfalls), "pink")}
      ${kpi("SRV deployments", nf(v.srv), "", "amber")}
      ${kpi("Heaviest landing", hl && hl.grav ? nf(hl.grav / 9.80665, 2) : "–", hl ? esc(hl.name) : "", "amber", "g")}
      ${kpi("Hottest landing", ht && ht.temp ? nf(ht.temp) : "–", ht ? esc(ht.name) : "", "amber", "K")}
      ${kpi("On-foot distance", X.OnFoot_Distance_Travelled != null ? nf(X.OnFoot_Distance_Travelled / 1000, 1) : "–", "lifetime", "cyan", "km")}
    </div>
    ${panel("Most landed-on bodies", `<div class="tbl"><table><tbody>${v.mostLanded.map(b => `<tr><td>${esc(b.name)}</td><td class="num hl">${b.n}×</td></tr>`).join("") || `<tr><td class="empty">No landings</td></tr>`}</tbody></table></div>`)}`;

  const stations = `<div class="grid g2">
      ${panel("Dockings by station type", hbars(v.stTypes.map(([t, n]) => [prettyType(t), n]), "amber"))}
      ${panel("Most docked stations", `<div class="tbl"><table><thead><tr><th>Station</th><th class="num">Dockings</th><th class="num">Last</th></tr></thead><tbody>
        ${v.topStations.map(s => `<tr><td>${esc(s.name)}<span class="sub">${esc(prettyType(s.type))} · ${esc(s.system)}</span></td><td class="num hl">${s.count}</td><td class="num">${dt(s.last)}</td></tr>`).join("") || `<tr><td colspan="3" class="empty">Never docked</td></tr>`}</tbody></table></div>`)}
    </div>
    <p class="note">${nf(v.docks)} dockings at ${nf(v.stationsUnique)} different stations and carriers · ${nf(v.settlements)} settlements approached.</p>`;

  const M = S.Mining || {};
  const industry = `<div class="grid g2">
      ${panel("Refined by type", v.refined.length ? hbars(v.refined.slice(0, 14), "pink") : `<p class="note">No refinery output in these journals.</p>`)}
      ${panel("Mining & odds and ends", kv([
        ["Tonnes refined", nf(v.refinedTotal), M.Quantity_Mined != null ? `lifetime ${nf(M.Quantity_Mined)}` : ""],
        ["Asteroids prospected", nf(v.prospected)],
        ["Cores cracked", nf(v.cracked)],
        ["Limpets launched", nf([...v.drones.values()].reduce((a, n) => a + n, 0)), [...v.drones.entries()].map(([k, n]) => `${esc(k)} ${nf(n)}`).join(" · ")],
        ["Materials collected", nf(v.matsCollected)],
        M.Mining_Profits != null && ["Mining profits (lifetime)", cr(M.Mining_Profits) + " Cr", "", true],
        ["Screenshots taken", nf(v.screenshots)],
      ]))}
    </div>`;

  const R = v.rank;
  const lifetime = v.stats ? `<div class="kpis">
      ${kpi("Time played", nf(X.Time_Played / 3600), "hours", "cyan", "h")}
      ${kpi("Current wealth", cr(S.Bank_Account?.Current_Wealth), `${nf(S.Bank_Account?.Owned_Ship_Count)} ships owned`, "amber", "Cr")}
      ${kpi("Exploration profits", cr(X.Exploration_Profits), `highest payout ${cr(X.Highest_Payout)}`, "violet", "Cr")}
      ${kpi("Exobiology profits", cr(B.Organic_Data_Profits), `${nf(B.Organic_Data)} samples sold`, "green", "Cr")}
      ${kpi("Trade profits", cr(S.Trading?.Market_Profits), `${nf(S.Trading?.Markets_Traded_With)} markets`, "amber", "Cr")}
      ${kpi("Mining profits", cr(M.Mining_Profits), `${nf(M.Quantity_Mined)} t mined`, "pink", "Cr")}
      ${kpi("Bounty profits", cr(S.Combat?.Bounty_Hunting_Profit), `${nf(S.Combat?.Bounties_Claimed)} bounties`, "pink", "Cr")}
      ${kpi("Passengers delivered", nf(S.Passengers?.Passengers_Missions_Delivered), `${nf(S.Passengers?.Passengers_Missions_Accepted)} missions`, "cyan")}
    </div>
    <div class="grid g2">
      ${R ? panel("Ranks", kv(["Combat","Trade","Explore","Exobiologist","Soldier","Empire","Federation"].filter(k => R[k] != null).map(k => [k === "Soldier" ? "Mercenary" : k === "Explore" ? "Exploration" : k, rankName(k, R[k]), v.progress && v.progress[k] != null && R[k] < (RANKS[k].length > 9 ? 14 : 13) ? `${v.progress[k]}% to next` : "", R[k] >= 8 && RANKS[k].length <= 9]))) : ""}
      ${panel("Exploration (lifetime)", kv([
        ["Hyperspace jumps", nf(X.Total_Hyperspace_Jumps)], ["Hyperspace distance", nf(X.Total_Hyperspace_Distance) + " ly"],
        ["Systems visited", nf(X.Systems_Visited)], ["Planets scanned to level 3", nf(X.Planets_Scanned_To_Level_3)],
        ["Efficient scans", nf(X.Efficient_Scans)], ["Planet footfalls", nf(X.Planet_Footfalls)], ["First footfalls", nf(X.First_Footfalls)],
        ["Exobiology first logged", nf(B.First_Logged), cr(B.First_Logged_Profits) + " Cr"],
      ]))}
    </div>
    <p class="note">From the game's Statistics event of ${dt(v.stats.timestamp)}. Wealth includes ships and modules.</p>` : `<p class="note">No Statistics event found in these journals.</p>`;

  /* ---- Credits ---- */
  const lastCr = v.creditSeries.at(-1)?.[1], lastW = v.wealthSeries.at(-1)?.[1], lastC = v.carrierSeries.at(-1)?.[1];
  const firstW = v.wealthSeries[0]?.[1];
  const credits = `<div class="kpis">
      ${kpi("Credit balance", cr(lastCr), v.credits ? "at last login " + dt(v.credits.t) : "", "amber", "Cr")}
      ${kpi("Total wealth", cr(lastW), firstW != null ? `${lastW >= firstW ? "+" : ""}${cr(lastW - firstW)} since ${dt(v.wealthSeries[0][0])}` : "", "amber", "Cr")}
      ${kpi("Fleet value", cr(v.fleetValue), `${nf(v.fleet.length)} ships · hull + modules`, "cyan", "Cr")}
      ${kpi("Carrier balance", cr(lastC), v.carrier ? esc(v.carrier.Name) : "", "violet", "Cr")}
      ${kpi("Trade profit", cr(v.tradeProfit), "commodity sales minus cost", "green", "Cr")}
    </div>
    <div class="panel chart"><div class="head"><h3>Credits over time</h3>
      <div class="legend" style="margin:0">${[["Total wealth","#FFC23D"],["Credit balance","#22E4FF"],["Carrier balance","#B46BFF"]].map(([n, c]) => `<span><i style="background:${c};box-shadow:0 0 8px ${c}"></i>${n}</span>`).join("")}</div></div>
      ${lineChart([{name:"Total wealth", color:"#FFC23D", pts:v.wealthSeries}, {name:"Credit balance", color:"#22E4FF", pts:v.creditSeries}, {name:"Carrier balance", color:"#B46BFF", pts:v.carrierSeries}])}
      <p class="note">One point per login (credits, wealth) or carrier update. Wealth is the game's own figure: credits plus ships, modules and carrier.</p></div>
    <div class="grid g2">
      ${panel("Income by source (journals)", hbars(v.income, "green", {fmt:cr}))}
      ${panel("Spending by category (journals)", hbars(v.spend, "pink", {fmt:cr}))}
    </div>`;

  /* ---- Fleet ---- */
  const C0 = v.cargo;
  const shipCargo = panel(`Ship cargo <span style="letter-spacing:0;text-transform:none;font-weight:400">· ${C0 ? `${nf(C0.total)}${C0.capacity ? " / " + nf(C0.capacity) : ""} t · ${C0.fromFile ? "Cargo.json" : "journal"} ${dt(C0.t)}` : "no data"}</span>`,
    C0 && C0.items.length ? hbars(C0.items.map(x => [x.name + (x.stolen ? " (stolen)" : "") + (x.mission ? " (mission)" : ""), x.count]), "cyan") : `<p class="note">${C0 ? "Hold is empty." : "No cargo inventory found. Include Cargo.json from the journal folder to see the current hold."}</p>`);
  const fleet = shipCargo + `${panel("", `<div class="tbl"><table><thead><tr><th>Ship</th><th>Location</th><th class="num">Hull</th><th class="num">Modules</th><th class="num">Total value</th><th class="num">Rebuy</th><th class="num">Jump range</th></tr></thead><tbody>
      ${v.fleet.map(f => `<tr><td>${esc(f.name || f.type)}${f.current ? ' <span class="chip" style="color:var(--green);border-color:var(--green)">active</span>' : ""}<span class="sub">${esc(f.type)}</span></td>
        <td>${esc(f.where)}</td><td class="num">${f.hull ? cr(f.hull) : "–"}</td><td class="num">${f.modules ? cr(f.modules) : "–"}</td>
        <td class="num hl">${f.value ? cr(f.value) : "–"}</td><td class="num">${f.rebuy ? cr(f.rebuy) : "–"}</td><td class="num">${f.jump ? nf(f.jump, 1) + " ly" : "–"}</td></tr>`).join("") || `<tr><td colspan="7" class="empty">No fleet data</td></tr>`}
    </tbody><tfoot><tr><td colspan="4" style="color:var(--mute)">Fleet total</td><td class="num hl">${cr(v.fleetValue)}</td><td colspan="2"></td></tr></tfoot></table></div>`)}
    <p class="note">Values come from each ship's most recent loadout (hull + modules as fitted); ships you haven't flown since these journals started fall back to the shipyard listing. Location is from the last shipyard visit${v.A.storedShips ? ` (${dt(v.A.storedShips.timestamp)})` : ""}.</p>`;

  /* ---- Combat ---- */
  const C = S.Combat || {};
  const combat = `<div class="kpis">
      ${kpi("Bounties", nf(v.bounties.n), C.Bounties_Claimed != null ? `lifetime ${nf(C.Bounties_Claimed)} claimed` : "", "pink")}
      ${kpi("Bounty value", cr(v.bounties.cr), C.Bounty_Hunting_Profit != null ? `lifetime ${cr(C.Bounty_Hunting_Profit)}` : "", "pink", "Cr")}
      ${kpi("Combat bonds", nf(v.bonds.n), cr(v.bonds.cr) + " Cr", "amber")}
      ${kpi("Combat rank", R ? rankName("Combat", R.Combat) : "–", v.progress?.Combat != null ? v.progress.Combat + "% to next" : "", "violet")}
      ${kpi("Interdicted", nf(v.interdicted), `${nf(v.escaped)} escaped`, "cyan")}
      ${kpi("Under attack", nf(v.underAttack), "warnings logged", "cyan")}
      ${kpi("Deaths", nf(v.deaths), C.Insurance_Claims != null ? "" : "", "pink")}
      ${kpi("Assassinations", nf(C.Assassinations), C.Assassination_Profits != null ? cr(C.Assassination_Profits) + " Cr lifetime" : "", "violet")}
    </div>
    <div class="grid g3">
      ${panel("Kills by ship type", v.bounties.byTarget.length ? hbars(v.bounties.byTarget.slice(0, 12), "pink") : `<p class="note">No bounties in these journals.</p>`)}
      ${panel("Kills by faction", v.bounties.byFaction.length ? hbars(v.bounties.byFaction.slice(0, 12), "amber") : `<p class="note">No bounties in these journals.</p>`)}
      ${panel("Deaths", (v.killers.length ? `<div class="tbl"><table><tbody>${v.killers.slice().reverse().map(k => `<tr><td>${esc(k.name)}<span class="sub">${esc(prettyShip(k.ship))}</span></td><td class="num">${dt(k.t)}</td></tr>`).join("")}</tbody></table></div>` : `<p class="note">Never died. Nice.</p>`)
        + (S.Combat ? `<h3 style="margin-top:16px">Lifetime</h3>` + kv([["Highest single reward", cr(C.Highest_Single_Reward) + " Cr"], ["Skimmers destroyed", nf(C.Skimmers_Killed)], ["Combat bond profits (lifetime)", cr(C.Combat_Bond_Profits) + " Cr"], ["Insurance claims", nf(S.Bank_Account?.Insurance_Claims)]]) : ""))}
    </div>`;

  /* ---- Engineering ---- */
  const E = v.engineers, unlocked = E.filter(e => e.progress === "Unlocked");
  const engineering = `<div class="kpis">
      ${kpi("Engineers unlocked", nf(unlocked.length), `${nf(E.filter(e => e.rank === 5).length)} at grade 5 · ${nf(E.length)} known`, "cyan")}
      ${kpi("Modifications", nf(v.crafts), S.Crafting ? `lifetime ${nf(S.Crafting.Recipes_Generated)}` : "", "violet")}
      ${kpi("Grade 5 rolls", nf(v.craftLevels.find(l => +l[0] === 5)?.[1] || 0), "", "violet")}
      ${kpi("Experimentals applied", nf(v.experimentals.reduce((a, x) => a + x[1], 0)), "", "pink")}
      ${kpi("Material trades", nf(v.matTrades), S.Material_Trader_Stats ? `${nf(S.Material_Trader_Stats.Materials_Traded)} mats lifetime` : "", "amber")}
    </div>
    <div class="grid g2">
      ${panel("Engineers", `<div class="tbl"><table><thead><tr><th>Engineer</th><th>Status</th><th class="num">Grade</th></tr></thead><tbody>
        ${E.map(e => `<tr><td>${esc(e.name)}</td><td class="${e.progress === "Unlocked" ? "hl" : ""}" style="${e.progress === "Unlocked" ? "" : "color:var(--mute)"}">${esc(e.progress || "–")}</td>
          <td class="num"><span class="pips">${e.rank ? [1,2,3,4,5].map(i => `<i class="${i <= e.rank ? "on" : ""}"></i>`).join("") : ""}</span>${e.rank && e.rank < 5 && e.rp ? `<span class="sub">${e.rp}% to next</span>` : ""}</td></tr>`).join("") || `<tr><td colspan="3" class="empty">No engineer data</td></tr>`}
      </tbody></table></div>`)}
      <div class="grid" style="align-content:start">
        ${panel("Most rolled blueprints", hbars(v.craftsByBp.slice(0, 12), "violet"))}
        ${panel("Rolls per engineer", hbars(v.craftsByEng.slice(0, 10), "cyan"))}
        ${panel("Rolls per grade", hbars(v.craftLevels.map(([l, n]) => ["Grade " + l, n]), "pink"))}
        ${v.experimentals.length ? panel("Experimental effects applied", hbars(v.experimentals.slice(0, 10), "amber")) : ""}
      </div>
    </div>`;

  /* ---- Materials ---- */
  const matPanel = (cat, cls) => {
    const list = v.mats[cat];
    const full = list.filter(m => m.count >= m.cap).length;
    return panel(`${cat} <span style="letter-spacing:0;text-transform:none;font-weight:400">· ${list.length} types · ${full} at cap</span>`, list.length ? `<div class="mats">${list.map(m => `
      <div class="mat ${m.count >= m.cap ? "full" : m.count / m.cap < .15 ? "low" : ""} ${cls}" data-sym="${esc(m.sym)}" tabindex="0"><span class="n">${esc(m.name)}</span><span class="gr">G${m.grade || "?"}</span>
      <span class="t"><b style="width:${Math.min(100, m.count / m.cap * 100)}%"></b></span><span class="x">${nf(m.count)}<small>/${m.cap}</small></span></div>`).join("")}</div>` : `<p class="note">None.</p>`);
  };
  const materials = v.A.materials ? `<p class="note">Snapshot from the last login (${dt(v.matsAt)}). Bars fill towards the grade cap (G1 300 · G2 250 · G3 200 · G4 150 · G5 100); pink = nearly empty, green = full.</p>
    <div class="grid g3">${matPanel("Raw", "cyan")}${matPanel("Manufactured", "violet")}${matPanel("Encoded", "amber")}</div>
    ${v.locker ? panel(`Ship locker (on-foot) <span style="letter-spacing:0;text-transform:none;font-weight:400">· ${dt(v.locker.t)}</span>`, `<div class="grid g2" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr))">${v.locker.cats.map(c => `<div><h3>${c.k} · ${nf(c.list.reduce((a, x) => a + x.count, 0))}</h3>${c.list.length ? hbars(c.list.slice(0, 10).map(x => [x.name, x.count]), "green") : `<p class="note">Empty</p>`}</div>`).join("")}</div>`) : ""}`
    : `<p class="note">No Materials event in these journals.</p>`;

  /* ---- Carrier ---- */
  const K = v.carrier, SU = K?.SpaceUsage, FC = S.FLEETCARRIER || {};
  const carrier = K ? `<div class="kpis">
      ${kpi("Carrier", esc(K.Name), `${esc(K.Callsign)} · docking ${esc(K.DockingAccess)}`, "violet txt")}
      ${kpi("Balance", cr(K.Finance?.CarrierBalance), `${cr(K.Finance?.AvailableBalance)} available`, "amber", "Cr")}
      ${kpi("Tritium", nf(K.FuelLevel), `of 1,000 t · ${nf(v.carrierFuel)} t deposited`, "cyan", "t")}
      ${kpi("Jumps", nf(FC.FLEETCARRIER_TOTAL_JUMPS ?? v.carrierRequests), `${nf(v.carrierRequests)} in these journals`, "cyan")}
      ${kpi("Distance travelled", nf(FC.FLEETCARRIER_DISTANCE_TRAVELLED), "lifetime", "cyan", "ly")}
      ${kpi("Location", esc(v.carrierLoc?.system || "–"), v.carrierLoc ? dt(v.carrierLoc.t) : "", "green txt")}
    </div>
    <div class="grid g2">
      ${panel("Capacity", `<div class="stack">${[["Crew", SU.Crew, "#B46BFF"], ["Cargo", SU.Cargo, "#22E4FF"], ["Reserved", SU.CargoSpaceReserved, "#FFC23D"], ["Ship packs", SU.ShipPacks, "#FF2E88"], ["Module packs", SU.ModulePacks, "#39FFA0"]].filter(x => x[1]).map(([n, x, c]) => `<i style="width:${x / SU.TotalCapacity * 100}%;background:${c};box-shadow:0 0 10px ${c}" title="${n}: ${nf(x)} t"></i>`).join("")}</div>
        ${kv([["Crew", nf(SU.Crew) + " t"], ["Cargo", nf(SU.Cargo) + " t"], ["Reserved for buy orders", nf(SU.CargoSpaceReserved) + " t"], ["Ship / module packs", nf(SU.ShipPacks + SU.ModulePacks) + " t"], ["Free", nf(SU.FreeSpace) + " t", `of ${nf(SU.TotalCapacity)} t`, true]])}
        <h3 style="margin-top:14px">Services</h3><div class="tags">${(K.Crew || []).map(c => `<span class="chip" style="${c.Activated ? (c.Enabled === false ? "color:var(--amber);border-color:var(--amber)" : "color:var(--green);border-color:var(--green)") : "color:var(--mute);border-color:var(--line)"}">${esc(prettyRole(c.CrewRole))}${c.Activated && c.Enabled === false ? " (off)" : ""}</span>`).join("")}</div>
        ${kv([["Tax: refuel / repair / rearm", `${K.Finance?.TaxRate_refuel ?? "–"}% / ${K.Finance?.TaxRate_repair ?? "–"}% / ${K.Finance?.TaxRate_rearm ?? "–"}%`], ["Refuel profit (lifetime)", cr(FC.FLEETCARRIER_REFUEL_PROFIT) + " Cr"], ["Market profit (lifetime)", cr(FC.FLEETCARRIER_TRADEPROFIT_TOTAL) + " Cr"]])}`)}
      ${panel("Jump log", `<div class="tbl"><table><thead><tr><th>Destination</th><th class="num">Distance</th><th class="num">Departed</th></tr></thead><tbody>
        ${v.carrierJumpList.slice().reverse().slice(0, 18).map(j => `<tr><td>${esc(j.system)}</td><td class="num hl">${j.ly ? nf(j.ly) + " ly" : "–"}</td><td class="num">${dt(j.dep || j.t)}</td></tr>`).join("") || `<tr><td colspan="3" class="empty">No jumps scheduled in these journals</td></tr>`}
      </tbody></table></div><p class="note">Includes cancelled requests. Distance is shown when both systems were visited by you.</p>`)}
    </div>
    ${v.carrierMarket ? carrierMarketPanel(v) : ""}
    <p class="note">From the CarrierStats event of ${dt(K.timestamp)} (written when you open carrier management).</p>` : `<p class="note">No carrier data in these journals.</p>`;

  /* ---- Crew & wing ---- */
  const CS = S.Crew || {}, cc = K?.Crew?.filter(c => c.CrewName) || [];
  const crew = `<div class="kpis">
      ${kpi("NPC crew hired", nf(v.crew.length), CS.NpcCrew_Hired != null ? `lifetime ${nf(CS.NpcCrew_Hired)} hired · ${nf(CS.NpcCrew_Fired)} fired · ${nf(CS.NpcCrew_Died)} died` : "", "violet")}
      ${kpi("Wages paid", cr(v.crew.reduce((a, c) => a + c.wages, 0)), CS.NpcCrew_TotalWages != null ? `lifetime ${cr(CS.NpcCrew_TotalWages)}` : "", "amber", "Cr")}
      ${kpi("Wings joined", nf(v.social.wings), `${nf(v.social.wingmates.length)} different wingmates`, "cyan")}
      ${kpi("Multicrew", nf(v.social.multicrew.length), S.Multicrew ? `${nf(S.Multicrew.Multicrew_Time_Total / 60)} min lifetime` : "", "pink")}
      ${kpi("Carrier crew", nf(cc.length), "service officers", "green")}
    </div>
    <div class="grid g2">
      ${panel("NPC crew", `<div class="tbl"><table><thead><tr><th>Name</th><th>Status</th><th>Rank</th><th class="num">Wages paid</th></tr></thead><tbody>
        ${v.crew.map(c => `<tr><td>${esc(c.name)}<span class="sub">${esc(c.faction || "")}</span></td><td class="${c.fired ? "" : "hl"}" style="${c.fired ? "color:var(--mute)" : ""}">${c.fired ? "Dismissed" : esc(c.role || "Employed")}<span class="sub">${dt(c.hired || c.first)} → ${c.fired ? dt(c.fired) : "now"}</span></td>
          <td>${c.rank != null ? esc(RANKS.Combat[c.rank] || c.rank) : "–"}</td><td class="num">${cr(c.wages)}<span class="sub">${nf(c.paid)} payouts</span></td></tr>`).join("") || `<tr><td colspan="4" class="empty">No NPC crew in these journals</td></tr>`}
      </tbody></table></div><p class="note">Wages are the crew's share of your earnings, logged per payout.</p>`)}
      ${panel("Carrier crew", cc.length ? `<div class="tbl"><table><tbody>${cc.map(c => `<tr><td>${esc(c.CrewName)}</td><td style="color:${c.Enabled === false ? "var(--amber)" : "var(--green)"}">${esc(prettyRole(c.CrewRole))}${c.Enabled === false ? " (off)" : ""}</td></tr>`).join("")}</tbody></table></div>` : `<p class="note">No carrier crew data.</p>`)}
    </div>
    <div class="grid g3">
      ${panel("Wingmates", v.social.wingmates.length ? `<div class="tbl"><table><tbody>${v.social.wingmates.map(w => `<tr><td>${esc(w.name)}</td><td class="num hl">${w.n}×</td><td class="num">${dt(w.last)}</td></tr>`).join("")}</tbody></table></div>` : `<p class="note">No wing activity in these journals.</p>`)}
      ${panel("Multicrew", v.social.multicrew.length ? `<div class="tbl"><table><tbody>${v.social.multicrew.map(m => `<tr><td>${esc(m.name)}<span class="sub">${m.role === "captain" ? "you joined their ship" : "joined your ship"}</span></td><td class="num hl">${m.n}×</td><td class="num">${dt(m.last)}</td></tr>`).join("")}</tbody></table></div>` : `<p class="note">No multicrew sessions in these journals.</p>`)}
      ${panel("Friends seen", v.social.friends.length ? `<div class="tbl"><table><tbody>${v.social.friends.map(f => `<tr><td>${esc(f.name)}</td><td>${esc(f.status || "")}</td><td class="num">${dt(f.last)}</td></tr>`).join("")}</tbody></table></div>` : `<p class="note">No friend status updates in these journals.</p>`)}
    </div>`;

  /* ---- Powerplay ---- */
  const P = v.pp;
  const powerplay = P ? `<div class="kpis">
      ${kpi("Power", esc(P.power || "–"), P.history.length ? `${esc(P.history.at(-1).ev.toLowerCase())}ed ${dt(P.history.at(-1).t)}` : "", "violet txt")}
      ${kpi("Rank", nf(P.rank), P.rankUps.length ? `last rank-up ${dt(P.rankUps.at(-1).t)}` : "", "pink")}
      ${kpi("Total merits", nf(P.merits), P.t ? "as of " + dt(P.t) : "", "amber")}
      ${kpi("Merits earned", nf(P.gained), `${nf(P.events)} merit awards in these journals`, "amber")}
      ${kpi("Time pledged", P.pledged != null ? nf(P.pledged / 86400) : "–", "days", "cyan", "d")}
    </div>
    <div class="panel chart"><div class="head"><h3>Merits per cycle</h3><span class="note">Cycles tick over on Thursday 07:00 UTC</span></div>
      ${weekChart(P.weeks)}</div>
    <div class="grid g2">
      ${panel("Pledge history", P.history.length ? `<div class="tbl"><table><tbody>${P.history.map(h => `<tr><td>${esc(h.ev)}${h.from ? ` <span class="sub">from ${esc(h.from)}</span>` : ""}</td><td>${esc(h.power || "")}</td><td class="num">${dt(h.t)}</td></tr>`).join("")}</tbody></table></div>` : `<p class="note">No join / leave / defect in these journals.</p>`)}
      ${panel("Rank-ups", P.rankUps.length ? `<div class="tbl"><table><tbody>${P.rankUps.slice().reverse().map(r => `<tr><td>Rank ${r.rank}</td><td class="num">${dt(r.t)}</td></tr>`).join("")}</tbody></table></div>` : `<p class="note">No rank-ups in these journals.</p>`)}
    </div>` : `<p class="note">No Powerplay data in these journals.</p>`;

  $("out").innerHTML =
    sect("overview", "Overview", overview) + sect("credits", "Credits", credits) + sect("travel", "Travel", travel) + sect("map", "Galaxy map", map) +
    sect("exploration", "Exploration", exploration) + sect("exobiology", "Exobiology", exo) + sect("surface", "Surface", surface) +
    sect("stations", "Stations", stations) + sect("fleet", "Fleet", fleet) + sect("carrier", "Fleet carrier", carrier) + sect("crew", "Crew &amp; wing", crew) + sect("powerplay", "Powerplay", powerplay) + sect("combat", "Combat", combat) +
    sect("engineering", "Engineering", engineering) + sect("materials", "Materials", materials) +
    sect("industry", "Mining &amp; misc", industry) + sect("lifetime", "Lifetime", lifetime);
  $("app").hidden = false;

  document.querySelectorAll(".seg button").forEach(b => b.onclick = () => {
    document.querySelectorAll(".seg button").forEach(x => x.classList.toggle("on", x === b));
    $("monthChart").innerHTML = monthChart(v.months, b.dataset.k);
  });
  initMap(v);
  initMatTips();
  navSpy();
}
function carrierMarketPanel(v){
  const M = v.carrierMarket;
  return panel(`Carrier market orders <span style="letter-spacing:0;text-transform:none;font-weight:400">· Market.json ${dt(M.t)}</span>`, `<div class="tbl"><table><thead><tr><th>Commodity</th><th class="num">Stock (selling)</th><th class="num">Demand (buying)</th></tr></thead><tbody>
    ${M.items.map(i => `<tr><td>${esc(i.name)}</td><td class="num hl">${i.stock ? nf(i.stock) : "–"}</td><td class="num">${i.demand ? nf(i.demand) : "–"}</td></tr>`).join("") || `<tr><td colspan="3" class="empty">No open orders</td></tr>`}</tbody></table></div>`);
}
function weekChart(weeks){
  if (!weeks.length) return `<p class="note">No merits awarded in these journals.</p>`;
  const W = 1000, H = 220, P = {l:48, r:8, t:12, b:26};
  const max = Math.max(1, ...weeks.map(w => w[1])), step = niceStep(max / 4), top = Math.ceil(max / step) * step;
  const bw = (W - P.l - P.r) / weeks.length, y = x => P.t + (H - P.t - P.b) * (1 - x / top);
  let g = ""; for (let x = 0; x <= top; x += step) g += `<line x1="${P.l}" x2="${W - P.r}" y1="${y(x)}" y2="${y(x)}" stroke="#2A2250"/><text class="axis" x="${P.l - 6}" y="${y(x) + 4}" text-anchor="end">${x >= 1000 ? nf(x / 1000) + "k" : nf(x)}</text>`;
  let lastLab = -1e9;
  const bars = weeks.map(([t, n], i) => { const x = P.l + i * bw; const lab = x - lastLab > 70 ? (lastLab = x, `<text class="axis" x="${x}" y="${H - 8}">${new Date(t).toLocaleDateString("en-GB", {day:"2-digit", month:"short", year:"2-digit"})}</text>`) : "";
    return `${lab}<rect x="${x + bw * .15}" y="${y(n)}" width="${Math.max(2, bw * .7)}" height="${H - P.b - y(n)}" rx="1" fill="#B46BFF" filter="url(#glow3)"><title>Cycle from ${dt(t)}: ${nf(n)} merits</title></rect>`; }).join("");
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Powerplay merits per cycle"><defs><filter id="glow3" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>${g}${bars}</svg>`;
}
function initMatTips(){
  let tip = $("mtip"); if (!tip){ tip = document.createElement("div"); tip.id = "mtip"; tip.className = "mtip"; document.body.appendChild(tip); }
  const show = el => {
    const sym = el.dataset.sym, d = EH.MATS[sym] || [], src = EH.sourcesFor(sym);
    tip.innerHTML = `<b>${esc(el.querySelector(".n").textContent)}</b><span class="g">${d[1] === "R" ? "Raw" : d[1] === "M" ? "Manufactured" : "Encoded"} · grade ${d[0] || "?"} · ${esc(el.querySelector(".x").textContent)}</span>
      ${src.length ? `<ul>${src.map(s => `<li>${esc(s)}</li>`).join("")}</ul>` : `<p>No known farming spot.</p>`}`;
    tip.style.display = "block";
    const r = el.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
    let x = r.left + 20, yy = r.bottom + 6;
    if (x + w > innerWidth - 8) x = innerWidth - w - 8;
    if (yy + h > innerHeight - 8) yy = r.top - h - 6;
    tip.style.left = Math.max(8, x) + "px"; tip.style.top = Math.max(8, yy) + "px";
  };
  const hide = () => { tip.style.display = "none"; };
  document.querySelectorAll(".mat[data-sym]").forEach(el => {
    el.onmouseenter = () => show(el); el.onmouseleave = hide; el.onfocus = () => show(el); el.onblur = hide;
  });
  addEventListener("scroll", hide, {passive:true});
}
function prettyShip(c){ return c ? c.replace(/_/g, " ").replace(/\b\w/g, x => x.toUpperCase()) : ""; }
function prettyRole(r){ return ({BlackMarket:"Secure warehouse",VoucherRedemption:"Redemption office",VistaGenomics:"Vista Genomics",PioneerSupplies:"Pioneer Supplies",Exploration:"Universal Cartographics",Rearm:"Rearm",Refuel:"Refuel",Repair:"Repair",Shipyard:"Shipyard",Outfitting:"Outfitting",Bartender:"Bartender",Commodities:"Commodities",Captain:"Captain",CarrierFuel:"Tritium depot"})[r] || r; }
function lineChart(series){
  const W = 1000, H = 260, P = {l:52, r:10, t:12, b:26}, GAP = 45 * 864e5;
  const all = series.flatMap(s => s.pts); if (!all.length) return `<p class="note">No credit data.</p>`;
  const x0 = Math.min(...all.map(p => p[0])), x1 = Math.max(...all.map(p => p[0])) || x0 + 1;
  const max = Math.max(1, ...all.map(p => p[1])), step = niceStep(max / 4), top = Math.ceil(max / step) * step;
  const X = t => P.l + (W - P.l - P.r) * (t - x0) / (x1 - x0 || 1), Y = v => P.t + (H - P.t - P.b) * (1 - v / top);
  let g = "";
  for (let v = 0; v <= top + 1; v += step) g += `<line x1="${P.l}" x2="${W - P.r}" y1="${Y(v)}" y2="${Y(v)}" stroke="#2A2250"/><text class="axis" x="${P.l - 6}" y="${Y(v) + 4}" text-anchor="end">${v ? cr(v) : "0"}</text>`;
  for (let y = new Date(x0).getUTCFullYear() + 1; Date.UTC(y, 0) <= x1; y++){ const x = X(Date.UTC(y, 0)); g += `<line x1="${x}" x2="${x}" y1="${P.t}" y2="${H - P.b + 4}" stroke="#2A2250" stroke-dasharray="2 3"/><text class="axis" x="${x + 3}" y="${H - 8}">${y}</text>`; }
  const lines = series.map(s => {
    const pts = s.pts.slice().sort((a, b) => a[0] - b[0]); let d = "", prev = null;
    for (const p of pts){ d += (prev == null ? "M" : "L") + X(p[0]).toFixed(1) + " " + Y(p[1]).toFixed(1); prev = p[0]; }
    const dots = pts.filter((_, i) => i % Math.ceil(pts.length / 120) === 0 || i === pts.length - 1).map(p => `<circle cx="${X(p[0]).toFixed(1)}" cy="${Y(p[1]).toFixed(1)}" r="2.2" fill="${s.color}"><title>${s.name} · ${dt(p[0])}: ${cr(p[1])} Cr</title></circle>`).join("");
    return `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" filter="url(#glow2)"/>${dots}`;
  }).join("");
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Credits over time"><defs><filter id="glow2" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>${g}${lines}</svg>`;
}
function prettyType(t){ return ({FleetCarrier:"Fleet carrier",CraterOutpost:"Surface outpost",CraterPort:"Surface port",OnFootSettlement:"Settlement",AsteroidBase:"Asteroid base",MegaShip:"Megaship",SurfaceStation:"Surface station",Bernal:"Ocellus"})[t] || t; }

function navSpy(){
  const links = [...document.querySelectorAll("#nav a")];
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) links.forEach(a => a.classList.toggle("on", a.getAttribute("href") === "#" + e.target.id)); }), {rootMargin:"-40% 0px -55% 0px"});
  document.querySelectorAll("#out section").forEach(s => io.observe(s));
}
