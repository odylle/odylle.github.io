/* ===== CMDR History core: journal parsing + aggregation (no DOM) ===== */
const EH = (() => {
  const EVENTS = new Set([
    "Commander","LoadGame","FSDJump","CarrierJump","CarrierJumpRequest","StartJump","Location","FuelScoop",
    "Scan","FSSDiscoveryScan","FSSAllBodiesFound","SAAScanComplete","SAASignalsFound","FSSBodySignals",
    "ScanOrganic","SellOrganicData","MultiSellExplorationData","SellExplorationData","CodexEntry",
    "Touchdown","Liftoff","Disembark","LaunchSRV","Docked","ApproachSettlement",
    "MiningRefined","ProspectedAsteroid","AsteroidCracked","LaunchDrone","MaterialCollected",
    "Loadout","ShipyardSwap","ShipyardNew","SetUserShipName","Died","Interdicted","EscapeInterdiction",
    "Statistics","Rank","Progress","Screenshot",
    "UnderAttack","Bounty","FactionKillBond","RedeemVoucher","MissionCompleted","MarketSell","MarketBuy",
    "ShipyardBuy","ShipyardSell","ModuleBuy","ModuleBuyAndStore","ModuleSell","ModuleSellRemote","Repair","RepairAll","RefuelAll","RefuelPartial","BuyAmmo","BuyDrones","PayFines","PayBounties",
    "StoredShips","EngineerProgress","EngineerCraft","Materials","MaterialTrade",
    "MaterialDiscarded","Synthesis","TechnologyBroker","EngineerContribution","ScientificResearch",
    "CarrierStats","CarrierFinance","CarrierBankTransfer","CarrierDepositFuel","CarrierLocation","CarrierBuy",
    "Cargo","CargoTransfer","CrewHire","CrewFire","CrewAssign","NpcCrewPaidWage","NpcCrewRank","CrewMemberJoins","JoinACrew",
    "Powerplay","PowerplayJoin","PowerplayLeave","PowerplayDefect","PowerplayRank","PowerplayMerits","PowerplaySalary",
    "WingJoin","WingAdd","WingLeave","Friends"
  ]);

  const CATALOG = EXO_VALUES;
  const { MATS, MAT_CAP, SOURCES, TRADE } = MATERIALS;

  function sourcesFor(sym){
    const d = MATS[sym]; const out = [...(SOURCES[sym] || [])];
    const special = /^(guardian|tg_|unknown|ancient)/.test(sym);
    if (d && !special){ for (const x of SOURCES["_" + d[1] + d[0]] || []) if (!out.some(o => o.startsWith(x) || x.startsWith(o.split(" — ")[0] + " —"))) out.push(x); }
    if (d && !special) out.push(TRADE);
    return out.slice(0, 6);
  }
  const REF = { Sol:[0,0,0], "Sagittarius A*":[25.21875,-20.90625,25899.96875], Colonia:[-9530.5,-910.28125,19808.125], "Beagle Point":[-1111.5625,-134.21875,65269.75] };

  // "Journal.220901213300.01.log" (pre-Odyssey) and "Journal.2022-09-22T203540.01.log"
  function fileKey(name){
    let m = name.match(/Journal\.(\d{4})-(\d\d)-(\d\d)T(\d{6})\.(\d+)\.log$/);
    if (m) return `${m[1]}${m[2]}${m[3]}${m[4]}.${m[5].padStart(3,"0")}`;
    m = name.match(/Journal\.(\d{12})\.(\d+)\.log$/);
    if (m) return `20${m[1]}.${m[2].padStart(3,"0")}`;
    return "0" + name;
  }
  const isJournal = n => /^Journal\..+\.log$/i.test(n);

  function newAgg(fid, name){
    return {
      fid, name, files:0, first:null, last:null,
      jumps:0, ly:0, fuelUsed:0, longest:null, farthest:null, months:new Map(),
      systems:new Map(), route:[], lastPos:null, lastSys:null,
      carrierJumps:0, carrierLy:0, carrierRequests:0,
      arrivalStars:new Map(), scooped:0, scoops:0,
      bodies:new Map(), fss:new Map(), allFound:new Set(),
      mapped:new Map(), bio:new Map(), geo:new Map(),
      organic:[], samples:0, orgSold:{value:0,bonus:0,count:0,firstLogged:0}, soldValue:new Map(),
      explSold:{earnings:0,systems:0,bodies:0,sales:0},
      codex:{total:0,fresh:0,sub:new Map(),regions:new Set(),newList:[]},
      landings:0, landed:new Map(), liftoffs:0, footfalls:new Map(), srv:0,
      docks:0, stations:new Map(), settlements:new Map(),
      refined:new Map(), prospected:0, cracked:0, drones:new Map(), matsCollected:0,
      ships:new Map(), shipTypes:new Map(), curShip:null,
      deaths:0, interdicted:0, escaped:0, screenshots:0,
      stats:null, rank:null, progress:null, credits:null,
      creditSeries:[], wealthSeries:[], carrierSeries:[],
      income:new Map(), spend:new Map(), tradeProfit:0,
      loadoutValue:new Map(), storedShips:null, soldShips:new Set(),
      bounties:{n:0, cr:0, byTarget:new Map(), byFaction:new Map()}, bonds:{n:0, cr:0}, underAttack:0, killers:[],
      engineers:new Map(), crafts:0, craftsByBp:new Map(), craftsByEng:new Map(), craftLevels:new Map(), experimentals:new Map(),
      materials:null, matTrades:0, lockerLine:null, inv:null, invAt:null, invDeltas:0, fitted:new Map(),
      carrier:null, carrierJumpList:[], carrierFuel:0, carrierLoc:null,
      cargo:null, carrierMoves:new Map(), commodityNames:new Map(), marketTrades:[], companion:{},
      crew:new Map(), multicrew:new Map(),
      pp:null, ppHistory:[], ppMerits:[], ppRankUps:[],
      wings:0, wingmates:new Map(), friends:new Map()
    };
  }

  const bkey = (addr,id) => addr + ":" + id;
  // Live material inventory: the Materials snapshot (written at every login) plus every change after it.
  function adj(A, name, n){
    if (!A.inv || !name || !n) return;
    const sym = String(name).toLowerCase(), cap = MAT_CAP[MATS[sym]?.[0]] || 300;
    A.inv.set(sym, Math.max(0, Math.min(cap, (A.inv.get(sym) || 0) + n))); A.invDeltas++;
  }
  const inc = (m,k,n=1) => m.set(k,(m.get(k)||0)+n);
  const dist3 = (a,b) => Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);

  function ship(A, id){
    if (id == null) return null;
    let s = A.ships.get(id);
    if (!s){ s = {id, type:null, name:"", ident:"", jumps:0, ly:0, maxJump:0, landings:0}; A.ships.set(id,s); }
    return s;
  }
  function setPos(A, e, isJump){
    if (!e.StarPos) return;
    let s = A.systems.get(e.SystemAddress);
    if (!s){ s = {name:e.StarSystem, pos:e.StarPos, visits:0, first:e.timestamp, last:e.timestamp}; A.systems.set(e.SystemAddress, s); }
    if (isJump) s.visits++;
    s.last = e.timestamp;
    A.lastPos = e.StarPos; A.lastSys = e.StarSystem;
  }

  function ingest(A, e){
    const t = e.timestamp;
    if (t){ if (!A.first || t < A.first) A.first = t; if (!A.last || t > A.last) A.last = t; }
    switch (e.event){
      case "LoadGame":
        A.credits = {v:e.Credits, t};
        if (e.Credits != null) A.creditSeries.push([Date.parse(t), e.Credits]);
        if (e.Ship && e.Ship_Localised) A.shipTypes.set(e.Ship.toLowerCase(), e.Ship_Localised);
        if (e.ShipID != null){ const s = ship(A,e.ShipID); s.type = e.Ship?.toLowerCase(); if (e.ShipName) s.name = e.ShipName; if (e.ShipIdent) s.ident = e.ShipIdent; A.curShip = e.ShipID; }
        break;
      case "Loadout": {
        const s = ship(A,e.ShipID); s.type = e.Ship?.toLowerCase(); if (e.ShipName) s.name = e.ShipName; if (e.ShipIdent) s.ident = e.ShipIdent;
        if (e.MaxJumpRange > s.maxJump) s.maxJump = e.MaxJumpRange; A.curShip = e.ShipID;
        A.loadoutValue.set(e.ShipID, {hull:e.HullValue || 0, modules:e.ModulesValue || 0, rebuy:e.Rebuy || 0, t, jump:e.MaxJumpRange, cargo:e.CargoCapacity});
        A.fitted.set(e.ShipID, {id:e.ShipID, t, type:e.Ship?.toLowerCase(), name:e.ShipName, ident:e.ShipIdent, modules:(e.Modules || []).map(m => ({slot:m.Slot, item:(m.Item || "").toLowerCase(),
          eng:m.Engineering && {bp:m.Engineering.BlueprintName, level:m.Engineering.Level, quality:m.Engineering.Quality, engineer:m.Engineering.Engineer,
            exp:m.Engineering.ExperimentalEffect && (m.Engineering.ExperimentalEffect_Localised || m.Engineering.ExperimentalEffect)}}))});
        break; }
      case "ShipyardSwap": if (e.ShipType_Localised) A.shipTypes.set(e.ShipType.toLowerCase(), e.ShipType_Localised); ship(A,e.ShipID).type = e.ShipType.toLowerCase(); A.curShip = e.ShipID; break;
      case "ShipyardNew": if (e.ShipType_Localised) A.shipTypes.set(e.ShipType.toLowerCase(), e.ShipType_Localised); ship(A,e.NewShipID).type = e.ShipType.toLowerCase(); A.curShip = e.NewShipID; break;
      case "SetUserShipName": { const s = ship(A,e.ShipID); s.name = e.UserShipName || s.name; s.ident = e.UserShipId || s.ident; if (e.Ship) s.type = e.Ship.toLowerCase(); break; }

      case "FSDJump": {
        const d = +e.JumpDist || 0;
        A.jumps++; A.ly += d; A.fuelUsed += +e.FuelUsed || 0;
        const m = t.slice(0,7); const mo = A.months.get(m) || {jumps:0, ly:0}; mo.jumps++; mo.ly += d; A.months.set(m, mo);
        if (!A.longest || d > A.longest.d) A.longest = {d, from:A.lastSys, to:e.StarSystem, t};
        if (e.StarPos){
          const fs = Math.hypot(...e.StarPos);
          if (!A.farthest || fs > A.farthest.d) A.farthest = {d:fs, name:e.StarSystem, t};
          A.route.push([e.StarPos[0], e.StarPos[1], e.StarPos[2], Date.parse(t)/1000|0, e.SystemAddress]);
        }
        const s = ship(A, A.curShip); if (s){ s.jumps++; s.ly += d; }
        setPos(A, e, true);
        break; }
      case "CarrierJump":
        A.carrierJumps++;
        if (A.lastPos && e.StarPos) A.carrierLy += dist3(A.lastPos, e.StarPos);
        setPos(A, e, true);
        if (e.StarPos) A.route.push([e.StarPos[0], e.StarPos[1], e.StarPos[2], Date.parse(t)/1000|0, e.SystemAddress, 1]);
        break;
      case "CarrierJumpRequest": A.carrierRequests++; A.carrierJumpList.push({t, system:e.SystemName, addr:e.SystemAddress, dep:e.DepartureTime}); break;
      case "Location": setPos(A, e, false); break;
      case "StartJump": if (e.JumpType === "Hyperspace" && e.StarClass) inc(A.arrivalStars, e.StarClass); break;
      case "FuelScoop": A.scooped += +e.Scooped || 0; A.scoops++; break;

      case "Scan": {
        if (!e.StarType && !e.PlanetClass) break;       // belt clusters, rings
        const k = bkey(e.SystemAddress, e.BodyID);
        let b = A.bodies.get(k);
        if (!b){
          b = { name:e.BodyName, system:e.StarSystem, addr:e.SystemAddress, id:e.BodyID, t,
                kind: e.StarType ? "star" : "planet",
                cls: e.StarType || e.PlanetClass, sub:e.Subclass, lum:e.Luminosity,
                terra: e.TerraformState || "", landable: !!e.Landable, atmo: e.Atmosphere || "",
                grav: e.SurfaceGravity, temp: e.SurfaceTemperature, radius: e.Radius, mass: e.MassEM, smass: e.StellarMass,
                dist: e.DistanceFromArrivalLS, rings: (e.Rings||[]).filter(r => !/Belt/i.test(r.Name)).length,
                volc: e.Volcanism || "", wasDisc: e.WasDiscovered, wasMapped: e.WasMapped, wasFoot: e.WasFootfalled,
                nav: e.ScanType === "NavBeaconDetail", detailed: e.ScanType === "Detailed" };
          A.bodies.set(k, b);
        } else {
          if (e.ScanType === "Detailed") b.detailed = true;
          if (b.grav == null && e.SurfaceGravity != null) b.grav = e.SurfaceGravity;
          if (!b.atmo && e.Atmosphere) b.atmo = e.Atmosphere;
        }
        break; }
      case "FSSDiscoveryScan": { const p = A.fss.get(e.SystemAddress); if (!p || e.BodyCount > p.bodies) A.fss.set(e.SystemAddress, {name:e.SystemName, bodies:e.BodyCount, nonBodies:e.NonBodyCount}); break; }
      case "FSSAllBodiesFound": A.allFound.add(e.SystemAddress); break;
      case "SAAScanComplete": if (!A.mapped.has(bkey(e.SystemAddress,e.BodyID))) A.mapped.set(bkey(e.SystemAddress,e.BodyID), {name:e.BodyName, probes:e.ProbesUsed, target:e.EfficiencyTarget, t}); break;
      case "FSSBodySignals": case "SAASignalsFound": {
        const k = bkey(e.SystemAddress, e.BodyID);
        for (const s of e.Signals || []){
          const ty = s.Type_Localised || s.Type;
          if (/Biological/i.test(s.Type)) A.bio.set(k, Math.max(A.bio.get(k)||0, s.Count));
          if (/Geological/i.test(s.Type)) A.geo.set(k, Math.max(A.geo.get(k)||0, s.Count));
        }
        break; }

      case "ScanOrganic":
        if (e.ScanType === "Analyse"){
          A.organic.push({ genus:e.Genus_Localised || e.Genus, species:e.Species_Localised || e.Species,
                           variant:e.Variant_Localised || "", key:bkey(e.SystemAddress, e.Body), t });
        } else A.samples++;
        break;
      case "SellOrganicData":
        for (const b of e.BioData || []){
          A.orgSold.value += b.Value || 0; A.orgSold.bonus += b.Bonus || 0; A.orgSold.count++;
          if (b.Bonus > 0) A.orgSold.firstLogged++;
          const sp = b.Species_Localised || b.Species; if (sp) A.soldValue.set(sp, Math.max(A.soldValue.get(sp)||0, b.Value||0));
        }
        break;
      case "MultiSellExplorationData":
        A.explSold.earnings += e.TotalEarnings || 0; A.explSold.sales++;
        for (const d of e.Discovered || []){ A.explSold.systems++; A.explSold.bodies += d.NumBodies || 0; }
        break;
      case "SellExplorationData":
        A.explSold.earnings += e.TotalEarnings || 0; A.explSold.sales++; A.explSold.systems += (e.Systems||[]).length; break;
      case "CodexEntry":
        A.codex.total++;
        if (e.IsNewEntry){ A.codex.fresh++; A.codex.newList.push({name:e.Name_Localised || e.Name, sub:e.SubCategory_Localised, region:e.Region_Localised, system:e.System, t}); }
        if (e.SubCategory_Localised) inc(A.codex.sub, e.SubCategory_Localised);
        if (e.Region_Localised) A.codex.regions.add(e.Region_Localised);
        break;

      case "Touchdown":
        if (e.PlayerControlled !== false && e.OnPlanet !== false && !e.OnStation){
          A.landings++; inc(A.landed, bkey(e.SystemAddress, e.BodyID));
          const s = ship(A, A.curShip); if (s) s.landings++;
        }
        break;
      case "Liftoff": if (e.PlayerControlled !== false) A.liftoffs++; break;
      case "Disembark":
        if (e.OnPlanet && !e.OnStation) inc(A.footfalls, bkey(e.SystemAddress, e.BodyID));
        break;
      case "LaunchSRV": A.srv++; break;
      case "Docked": {
        A.docks++;
        const k = e.MarketID || (e.StationName + "@" + e.StarSystem);
        const st = A.stations.get(k) || {name:e.StationName, type:e.StationType || "Unknown", system:e.StarSystem, count:0, first:t};
        st.count++; st.last = t; A.stations.set(k, st);
        break; }
      case "ApproachSettlement": if (!A.settlements.has(e.Name)) A.settlements.set(e.Name, {body:e.BodyName, t}); break;

      case "MiningRefined": inc(A.refined, e.Type_Localised || e.Type); break;
      case "ProspectedAsteroid": A.prospected++; break;
      case "AsteroidCracked": A.cracked++; break;
      case "LaunchDrone": inc(A.drones, e.Type); break;
      case "MaterialCollected": A.matsCollected += e.Count || 1; adj(A, e.Name, e.Count || 1); break;
      case "MaterialDiscarded": adj(A, e.Name, -(e.Count || 1)); break;
      case "Synthesis": case "TechnologyBroker": for (const m of e.Materials || []) adj(A, m.Name, -(m.Count || 0)); break;
      case "EngineerContribution": if (e.Type === "Materials") adj(A, e.Material, -(e.Quantity || 0)); break;
      case "ScientificResearch": adj(A, e.Name, -(e.Count || 0)); break;

      case "Died":
        A.deaths++;
        A.killers.push({t, name:e.KillerName_Localised || e.KillerName || (e.Killers || []).map(k => k.Name).join(", ") || "Unknown", ship:e.KillerShip || ""});
        break;
      case "UnderAttack": A.underAttack++; break;
      case "Bounty": {
        const r = e.TotalReward ?? e.Reward ?? 0; A.bounties.n++; A.bounties.cr += r;
        inc(A.bounties.byTarget, e.Target_Localised || prettyCode(e.Target));
        if (e.VictimFaction) inc(A.bounties.byFaction, e.VictimFaction_Localised || e.VictimFaction);
        break; }
      case "FactionKillBond": A.bonds.n++; A.bonds.cr += e.Reward || 0; break;
      case "RedeemVoucher": inc(A.income, ({bounty:"Bounty vouchers", CombatBond:"Combat bonds", codex:"Codex vouchers", settlement:"Settlement vouchers", scannable:"Data vouchers", trade:"Trade vouchers"})[e.Type] || "Vouchers: " + e.Type, e.Amount || 0); break;
      case "MissionCompleted": if (e.Reward) inc(A.income, "Mission rewards", e.Reward); for (const m of e.MaterialsReward || []) adj(A, m.Name, m.Count || 0); break;
      case "MarketSell": A.marketTrades.push({m:e.MarketID, k:(e.Type || "").toLowerCase(), n:e.Count, dir:"in"}); if (e.Type_Localised) A.commodityNames.set(e.Type.toLowerCase(), e.Type_Localised); inc(A.income, "Commodity sales", e.TotalSale || 0); A.tradeProfit += (e.TotalSale || 0) - (e.AvgPricePaid || 0) * (e.Count || 0); break;
      case "MarketBuy": A.marketTrades.push({m:e.MarketID, k:(e.Type || "").toLowerCase(), n:e.Count, dir:"out"}); if (e.Type_Localised) A.commodityNames.set(e.Type.toLowerCase(), e.Type_Localised); inc(A.spend, "Commodities bought", e.TotalCost || 0); break;
      case "ShipyardBuy": inc(A.spend, "Ships bought", e.ShipPrice || 0); break;
      case "ShipyardSell": inc(A.income, "Ships sold", e.ShipPrice || 0); A.soldShips.add(e.SellShipID); A.ships.delete(e.SellShipID); break;
      case "ModuleBuy": case "ModuleBuyAndStore": inc(A.spend, "Modules bought", e.BuyPrice || 0); if (e.SellPrice) inc(A.income, "Modules sold", e.SellPrice); break;
      case "ModuleSell": case "ModuleSellRemote": inc(A.income, "Modules sold", e.SellPrice || 0); break;
      case "Repair": case "RepairAll": inc(A.spend, "Repairs", e.Cost || 0); break;
      case "RefuelAll": case "RefuelPartial": inc(A.spend, "Fuel", e.Cost || 0); break;
      case "BuyAmmo": case "BuyDrones": inc(A.spend, "Ammo & limpets", e.Cost ?? e.TotalCost ?? 0); break;
      case "PayFines": case "PayBounties": inc(A.spend, "Fines & bounties", e.Amount || 0); break;
      case "StoredShips": A.storedShips = e; break;
      case "EngineerProgress":
        for (const g of e.Engineers || [e]) if (g.Engineer) A.engineers.set(g.EngineerID || g.Engineer, {name:g.Engineer, progress:g.Progress || A.engineers.get(g.EngineerID)?.progress, rank:g.Rank ?? A.engineers.get(g.EngineerID)?.rank, rp:g.RankProgress});
        break;
      case "EngineerCraft":
        A.crafts++; inc(A.craftsByBp, prettyBp(e.BlueprintName)); if (e.Engineer) inc(A.craftsByEng, e.Engineer); inc(A.craftLevels, e.Level);
        if (e.ApplyExperimentalEffect && e.ExperimentalEffect_Localised) inc(A.experimentals, e.ExperimentalEffect_Localised);
        for (const m of e.Ingredients || []) adj(A, m.Name, -(m.Count || 0));
        break;
      case "Materials": A.materials = e; A.inv = new Map(["Raw","Manufactured","Encoded"].flatMap(c => (e[c] || []).map(m => [m.Name.toLowerCase(), m.Count]))); A.invAt = t; A.invDeltas = 0; break;
      case "MaterialTrade": A.matTrades++; adj(A, e.Paid?.Material, -(e.Paid?.Quantity || 0)); adj(A, e.Received?.Material, e.Received?.Quantity || 0); break;
      case "CarrierStats":
        A.carrier = e;
        if (e.Finance) A.carrierSeries.push([Date.parse(t), e.Finance.CarrierBalance]);
        break;
      case "CarrierFinance": A.carrierSeries.push([Date.parse(t), e.CarrierBalance]); break;
      case "CarrierBankTransfer":
        A.carrierSeries.push([Date.parse(t), e.CarrierBalance]);
        if (e.Deposit) inc(A.spend, "Carrier bank deposits", e.Deposit); if (e.Withdraw) inc(A.income, "Carrier bank withdrawals", e.Withdraw);
        break;
      case "CarrierBuy": inc(A.spend, "Fleet carrier", e.Price || 0); break;
      case "CarrierDepositFuel": A.carrierFuel += e.Amount || 0; break;
      case "CarrierLocation": A.carrierLoc = {system:e.StarSystem, t}; break;

      case "Cargo": if (e.Vessel === "Ship" && e.Inventory) A.cargo = e; break;
      case "CargoTransfer":
        for (const x of e.Transfers || []){
          const k = (x.Type || "").toLowerCase(); if (x.Type_Localised) A.commodityNames.set(k, x.Type_Localised);
          const m = A.carrierMoves.get(k) || {in:0, out:0};
          if (x.Direction === "tocarrier") m.in += x.Count; else if (x.Direction === "toship" || x.Direction === "tosrv") m.out += x.Count;
          A.carrierMoves.set(k, m);
        }
        break;

      case "CrewHire": { const c = crewOf(A, e.CrewID, e.Name); c.hired = t; c.cost = e.Cost; c.faction = e.Faction; c.rank = e.CombatRank; break; }
      case "CrewFire": crewOf(A, e.CrewID, e.Name).fired = t; break;
      case "CrewAssign": { const c = crewOf(A, e.CrewID, e.Name); c.role = e.Role; c.roleT = t; break; }
      case "NpcCrewPaidWage": { const c = crewOf(A, e.NpcCrewId, e.NpcCrewName); c.wages += e.Amount || 0; c.paid++; c.lastPaid = t; if (!c.first) c.first = t; break; }
      case "NpcCrewRank": crewOf(A, e.NpcCrewId, e.NpcCrewName).rank = e.RankCombat; break;
      case "CrewMemberJoins": { const m = A.multicrew.get(e.Crew) || {n:0, role:"crew"}; m.n++; m.last = t; A.multicrew.set(e.Crew, m); break; }
      case "JoinACrew": { const m = A.multicrew.get(e.Captain) || {n:0, role:"captain"}; m.n++; m.last = t; A.multicrew.set(e.Captain, m); break; }

      case "Powerplay": A.pp = e; break;
      case "PowerplayJoin": case "PowerplayLeave": case "PowerplayDefect":
        A.ppHistory.push({t, ev:e.event.replace("Powerplay", ""), power:e.Power || e.ToPower, from:e.FromPower}); break;
      case "PowerplayRank": A.ppRankUps.push({t, rank:e.Rank, power:e.Power}); break;
      case "PowerplayMerits": A.ppMerits.push([Date.parse(t), e.MeritsGained || 0, e.TotalMerits]); break;

      case "WingJoin": A.wings++; for (const o of e.Others || []) wingmate(A, o.Name || o, t); break;
      case "WingAdd": wingmate(A, e.Name, t); break;
      case "Friends": { const f = A.friends.get(e.Name) || {name:e.Name, n:0}; f.status = e.Status; f.last = t; f.n++; A.friends.set(e.Name, f); break; }
      case "Interdicted": A.interdicted++; break;
      case "EscapeInterdiction": A.escaped++; break;
      case "Screenshot": A.screenshots++; break;
      case "Statistics":
        if (!A.stats || t >= A.stats.timestamp) A.stats = e;
        if (e.Bank_Account?.Current_Wealth != null) A.wealthSeries.push([Date.parse(t), e.Bank_Account.Current_Wealth]);
        break;
      case "Rank": if (!A.rank || t >= A.rank.timestamp) A.rank = e; break;
      case "Progress": if (!A.progress || t >= A.progress.timestamp) A.progress = e; break;
    }
  }

  // Parse one journal file's text into the per-commander aggregates.
  function ingestText(aggs, text){
    let cur = null, n = 0;
    let i = 0;
    const len = text.length;
    while (i < len){
      let j = text.indexOf("\n", i); if (j < 0) j = len;
      const p = text.indexOf('"event":"', i);
      if (p > -1 && p < j){
        const q = text.indexOf('"', p + 9);
        const ev = text.slice(p + 9, q);
        if (ev === "ShipLocker"){ if (cur && j - i > 120) cur.lockerLine = text.slice(i, j); }
        else if (EVENTS.has(ev)){
          let e; try { e = JSON.parse(text.slice(i, j)); } catch { e = null; }
          if (e){
            if (ev === "Commander" || (ev === "LoadGame" && e.FID)){
              const fid = e.FID || e.Name || e.Commander;
              if (!aggs.has(fid)) aggs.set(fid, newAgg(fid, e.Name || e.Commander));
              if (cur !== aggs.get(fid)){ cur = aggs.get(fid); cur.files++; }
            }
            if (cur){ ingest(cur, e); n++; }
          }
        }
      }
      i = j + 1;
    }
    return n;
  }

  function crewOf(A, id, name){ let c = A.crew.get(id); if (!c){ c = {id, name, wages:0, paid:0}; A.crew.set(id, c); } if (name) c.name = name; return c; }
  function wingmate(A, name, t){ if (!name) return; const w = A.wingmates.get(name) || {name, n:0}; w.n++; w.last = t; A.wingmates.set(name, w); }
  function prettyCode(c){ return (c || "Unknown").replace(/_/g, " ").replace(/\b\w/g, x => x.toUpperCase()); }
  function prettyBp(b){ return (b || "Unknown").replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2"); }
  // Companion files written next to the journals (Cargo.json, ShipLocker.json, Market.json …).
  function ingestCompanion(aggs, name, text){
    let o; try { o = JSON.parse(text); } catch { return false; }
    const key = name.replace(/\.json$/i, "");
    let A = null; for (const a of aggs.values()) if (!A || (a.last || "") > (A.last || "")) A = a;   // belongs to the most recently played commander
    if (!A || !o || !o.timestamp) return false;
    A.companion[key] = o; return true;
  }
  const genusOf = sp => (sp || "").split(" ")[0];
  const shipName = (A, s) => (s.name || "").replace(/\.$/, "").trim();
  const shipType = (A, code) => A.shipTypes.get(code) || (code || "Unknown").replace(/_/g," ").replace(/\b\w/g, c => c.toUpperCase());

  const STAR_NAMES = { O:"O (blue-white)",B:"B (blue-white)",A:"A (blue-white)",F:"F (white)",G:"G (white-yellow)",K:"K (yellow-orange)",M:"M (red dwarf)",
    L:"L (brown dwarf)",T:"T (brown dwarf)",Y:"Y (brown dwarf)",TTS:"T Tauri",AeBe:"Herbig Ae/Be",N:"Neutron star",H:"Black hole",SupermassiveBlackHole:"Supermassive black hole",
    W:"Wolf-Rayet",WN:"Wolf-Rayet",WNC:"Wolf-Rayet",WC:"Wolf-Rayet",WO:"Wolf-Rayet",C:"Carbon star",CN:"Carbon star",CJ:"Carbon star",CH:"Carbon star",CHd:"Carbon star",MS:"S-type",S:"S-type" };
  function starGroup(c){
    if (!c) return "Unknown";
    if (/^D/.test(c)) return "White dwarf";
    if (/Giant|SuperGiant/i.test(c)) return "Giant / supergiant";
    return STAR_NAMES[c] || c;
  }

  function finalize(A){
    const bodies = [...A.bodies.values()];
    const planets = bodies.filter(b => b.kind === "planet"), stars = bodies.filter(b => b.kind === "star");
    const disc = b => b.wasDisc === false && !b.nav;
    const byClass = new Map(), starTypes = new Map();
    for (const p of planets){ const c = byClass.get(p.cls) || {n:0, disc:0, terra:0}; c.n++; if (disc(p)) c.disc++; if (p.terra === "Terraformable") c.terra++; byClass.set(p.cls, c); }
    for (const s of stars){ const g = starGroup(s.cls); const c = starTypes.get(g) || {n:0, disc:0}; c.n++; if (disc(s)) c.disc++; starTypes.set(g, c); }

    // First-discovered systems: the arrival star (distance 0) was undiscovered.
    const sysDisc = new Set(stars.filter(s => disc(s) && (s.dist === 0 || s.dist == null)).map(s => s.addr));

    const mappedList = [...A.mapped.entries()].map(([k,m]) => ({k, ...m, body:A.bodies.get(k)}));
    const firstMapped = mappedList.filter(m => m.body && m.body.wasMapped === false).length;
    const efficient = mappedList.filter(m => m.probes <= m.target).length;

    const landedBodies = [...A.landed.keys()].map(k => A.bodies.get(k)).filter(Boolean);
    const footBodies = [...A.footfalls.keys()];
    const firstFoot = footBodies.filter(k => A.bodies.get(k)?.wasFoot === false).length;
    const maxBy = (arr, f) => arr.reduce((m, x) => (f(x) != null && (m == null || f(x) > f(m))) ? x : m, null);
    const minBy = (arr, f) => arr.reduce((m, x) => (f(x) != null && (m == null || f(x) < f(m))) ? x : m, null);

    // Exobiology
    const sp = new Map();
    for (const o of A.organic){
      const s = sp.get(o.species) || {species:o.species, genus:o.genus, n:0, variants:new Set(), bodies:new Set(), first:o.t};
      s.n++; if (o.variant) s.variants.add(o.variant.split(" - ")[1] || o.variant); s.bodies.add(o.key); sp.set(o.species, s);
    }
    const catalogued = new Set(Object.entries(CATALOG).flatMap(([g,o]) => Object.keys(o).map(n => g + " " + n)));
    const extra = [...sp.values()].filter(s => !catalogued.has(s.species));
    const genera = Object.keys(CATALOG).map(g => {
      const known = Object.keys(CATALOG[g]);
      const found = known.map(n => {
        const full = g + " " + n, s = sp.get(full);
        return { name:n, full, value:CATALOG[g][n], n:s?.n || 0, variants:s ? [...s.variants].sort() : [], first:s?.first };
      });
      return { genus:g, known:known.length, found:found.filter(f => f.n).length, samples:found.reduce((a,f)=>a+f.n,0), species:found };
    });
    if (extra.length) genera.push({ genus:"Other", other:true, known:extra.length, found:extra.length, samples:extra.reduce((a,s)=>a+s.n,0),
      species:extra.map(s => ({ name:s.species, full:s.species, value:A.soldValue.get(s.species) || null, n:s.n, variants:[...s.variants].sort(), first:s.first })) });
    let estValue = 0; for (const o of A.organic){ const g = genusOf(o.species), n = o.species.split(" ").slice(1).join(" "); estValue += CATALOG[g]?.[n] || A.soldValue.get(o.species) || 0; }
    const bioBodies = [...A.bio.entries()];
    const bioSignals = bioBodies.reduce((a,[,n]) => a + n, 0);
    const bioBodiesDone = new Set(A.organic.map(o => o.key));
    const bioComplete = bioBodies.filter(([k,n]) => [...sp.values()].filter(s => s.bodies.has(k)).length >= n).length;
    const topBio = bioBodies.sort((a,b) => b[1]-a[1]).slice(0,8).map(([k,n]) => ({name:A.bodies.get(k)?.name || k, n, done:[...sp.values()].filter(s => s.bodies.has(k)).length}));

    const notable = [
      ["Earth-like worlds", b => b.cls === "Earthlike body"],
      ["Water worlds", b => b.cls === "Water world"],
      ["Ammonia worlds", b => b.cls === "Ammonia world"],
      ["Terraformable", b => b.terra === "Terraformable"],
      ["Gas giants w/ life", b => /based life/.test(b.cls)],
      ["Neutron stars", b => b.cls === "N"],
      ["Black holes", b => b.cls === "H" || b.cls === "SupermassiveBlackHole"],
      ["White dwarfs", b => b.kind === "star" && /^D/.test(b.cls)],
      ["Wolf-Rayet", b => b.kind === "star" && /^W/.test(b.cls)],
      ["Ringed bodies", b => b.rings > 0],
      ["Landable w/ atmosphere", b => b.landable && b.atmo],
    ].map(([label, f]) => { const xs = bodies.filter(f); return {label, n:xs.length, disc:xs.filter(disc).length}; });

    const landable = planets.filter(p => p.landable);
    const records = [
      ["Largest planet", maxBy(planets, p => p.radius), b => `${fmtN(b.radius/1000)} km radius`],
      ["Heaviest landable", maxBy(landable, p => p.grav), b => `${(b.grav/9.80665).toFixed(2)} g`],
      ["Hottest landable", maxBy(landable, p => p.temp), b => `${fmtN(b.temp)} K`],
      ["Coldest body", minBy(planets, p => p.temp), b => `${fmtN(b.temp)} K`],
      ["Farthest from arrival", maxBy(bodies, p => p.dist), b => `${fmtN(b.dist)} ls`],
      ["Heaviest star", maxBy(stars, s => s.smass), b => `${b.smass.toFixed(2)} M☉`],
    ].filter(r => r[1]).map(([label, b, f]) => ({label, name:b.name, val:f(b)}));

    const biggestSys = [...A.fss.values()].sort((a,b) => b.bodies - a.bodies)[0];

    // Month series (fill gaps)
    const monthKeys = [...A.months.keys()].sort();
    const months = [];
    if (monthKeys.length){
      let [y,m] = monthKeys[0].split("-").map(Number); const [ly,lm] = monthKeys.at(-1).split("-").map(Number);
      while (y < ly || (y === ly && m <= lm)){ const k = `${y}-${String(m).padStart(2,"0")}`; months.push({k, ...(A.months.get(k) || {jumps:0, ly:0})}); if (++m > 12){ m = 1; y++; } }
    }

    const ships = [...A.ships.values()].filter(s => (s.jumps || s.landings) && !/suit|taxi|srv|^\$/i.test(s.type || "")).map(s => ({...s, typeName:shipType(A, s.type), label:shipName(A, s)})).sort((a,b) => b.ly - a.ly);
    const stations = [...A.stations.values()];
    const stTypes = new Map(); for (const s of stations) inc(stTypes, s.type);

    const sysList = [...A.systems.values()];
    const topSys = sysList.filter(s => s.visits > 1).sort((a,b) => b.visits - a.visits).slice(0,6);

    // ---- Credits & fleet
    const fleetMap = new Map();
    const SS = A.storedShips;
    if (SS){
      for (const x of SS.ShipsHere || []) fleetMap.set(x.ShipID, {id:x.ShipID, type:x.ShipType_Localised || shipType(A, x.ShipType?.toLowerCase()), name:(x.Name || "").replace(/\.$/, ""), where:SS.StationName + " · " + SS.StarSystem, value:x.Value, hot:x.Hot});
      for (const x of SS.ShipsRemote || []) fleetMap.set(x.ShipID, {id:x.ShipID, type:x.ShipType_Localised || shipType(A, x.ShipType?.toLowerCase()), name:(x.Name || "").replace(/\.$/, ""), where:x.InTransit ? "In transit" : [x.StarSystem].filter(Boolean).join(""), value:x.ShipValue ?? x.Value, hot:x.Hot});
    }
    for (const [id, s] of A.ships) if (!fleetMap.has(id) && !A.soldShips.has(id) && s.type && !/suit|taxi|srv|^\$/i.test(s.type)) fleetMap.set(id, {id, type:shipType(A, s.type), name:shipName(A, s), where:"—", value:0});
    const fleet = [...fleetMap.values()].filter(f => !A.soldShips.has(f.id) && !/\bSRV\b|suit|taxi|^\$/i.test(f.type || "")).map(f => {
      const lv = A.loadoutValue.get(f.id); const s = A.ships.get(f.id);
      const value = lv ? lv.hull + lv.modules : f.value || 0;
      return {...f, name:f.name || (s ? shipName(A, s) : ""), hull:lv?.hull, modules:lv?.modules, rebuy:lv?.rebuy, value, jump:lv?.jump || s?.maxJump, cargo:lv?.cargo, current:f.id === A.curShip};
    }).sort((a, b) => b.value - a.value);
    if (A.curShip != null){ const c = fleet.find(f => f.id === A.curShip); if (c) c.where = A.lastSys ? "Current ship · " + A.lastSys : "Current ship"; }
    const fleetValue = fleet.reduce((a, f) => a + (f.value || 0), 0);
    const income = new Map(A.income);
    if (A.explSold.earnings) income.set("Exploration data", A.explSold.earnings);
    if (A.orgSold.value) income.set("Exobiology data", A.orgSold.value + A.orgSold.bonus);

    // ---- Materials
    const mats = {Raw:[], Manufactured:[], Encoded:[]};
    if (A.materials) for (const cat of ["Raw","Manufactured","Encoded"]) for (const m of A.materials[cat] || []){
      const d = MATS[m.Name.toLowerCase()] || [0, cat[0], m.Name_Localised || prettyCode(m.Name)];
      const sym = m.Name.toLowerCase();
      mats[cat].push({sym, name:m.Name_Localised || d[2], grade:d[0], count:A.inv?.get(sym) ?? m.Count, cap:MAT_CAP[d[0]] || 300});
    }
    // materials picked up after the snapshot that it did not list yet
    if (A.inv) for (const [sym, count] of A.inv){
      const d = MATS[sym]; if (!d || !count) continue;
      const cat = {R:"Raw", M:"Manufactured", E:"Encoded"}[d[1]];
      if (!mats[cat].some(m => m.sym === sym)) mats[cat].push({sym, name:d[2], grade:d[0], count, cap:MAT_CAP[d[0]] || 300});
    }
    for (const cat in mats) mats[cat].sort((a, b) => a.grade - b.grade || a.name.localeCompare(b.name));
    let locker = null;
    const lockerSrc = A.companion.ShipLocker && (!A.lockerLine || A.companion.ShipLocker.timestamp >= (A.lockerLine.match(/"timestamp":"([^"]+)"/) || [])[1]) ? JSON.stringify(A.companion.ShipLocker) : A.lockerLine;
    if (lockerSrc){ try { const L = JSON.parse(lockerSrc); locker = {t:L.timestamp, cats:["Items","Components","Consumables","Data"].map(k => ({k, list:(L[k] || []).map(x => ({name:x.Name_Localised || prettyCode(x.Name), count:x.Count})).sort((a, b) => b.count - a.count)}))}; } catch {} }

    // ---- Carrier
    const cj = A.carrierJumpList.map((j, i, arr) => {
      const a = A.systems.get(arr[i - 1]?.addr), b = A.systems.get(j.addr);
      return {...j, ly: a?.pos && b?.pos ? dist3(a.pos, b.pos) : null};
    });

    // ---- Cargo (ship): Cargo.json wins if newer than last journal Cargo event
    const cargoEv = A.companion.Cargo && A.companion.Cargo.Vessel === "Ship" && (!A.cargo || A.companion.Cargo.timestamp >= A.cargo.timestamp) ? A.companion.Cargo : A.cargo;
    const cargo = cargoEv ? {t:cargoEv.timestamp, fromFile:cargoEv === A.companion.Cargo, total:(cargoEv.Inventory || []).reduce((a, x) => a + x.Count, 0),
      items:(cargoEv.Inventory || []).map(x => ({name:x.Name_Localised || A.commodityNames.get(x.Name) || prettyCode(x.Name), count:x.Count, stolen:x.Stolen, mission:x.MissionID})).sort((a, b) => b.count - a.count),
      capacity:A.loadoutValue.get(A.curShip)?.cargo} : null;

    // ---- Carrier cargo: journal-tracked movements only (the journal has no carrier inventory)
    const cid = A.carrier?.CarrierID;
    const moves = new Map([...A.carrierMoves].map(([k, v]) => [k, {...v}]));
    let traded = 0;
    if (cid) for (const tr of A.marketTrades) if (tr.m === cid){ const m = moves.get(tr.k) || {in:0, out:0}; m[tr.dir] += tr.n; moves.set(tr.k, m); traded++; }
    const carrierCargo = { reported:A.carrier?.SpaceUsage?.Cargo, reportedAt:A.carrier?.timestamp, traded,
      rows:[...moves].map(([k, m]) => ({name:A.commodityNames.get(k) || prettyCode(k), in:m.in, out:m.out, net:m.in - m.out})).sort((a, b) => b.net - a.net || b.in - a.in) };
    const mk = A.companion.Market;
    const carrierMarket = mk && cid && mk.MarketID === cid ? {t:mk.timestamp, items:(mk.Items || []).filter(i => i.Stock || i.Demand).map(i => ({name:i.Name_Localised || i.Name, stock:i.Stock, demand:i.Demand, buy:i.BuyPrice, sell:i.SellPrice}))} : null;

    // ---- Crew
    const crew = [...A.crew.values()].sort((a, b) => (a.fired ? 1 : 0) - (b.fired ? 1 : 0) || (b.lastPaid || "").localeCompare(a.lastPaid || ""));

    // ---- Powerplay: merits per week (cycle ticks Thursday 07:00 UTC)
    const weekOf = ms => { const d = new Date(ms - 7 * 36e5); const back = (d.getUTCDay() + 3) % 7; return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - back, 7); };
    const weeks = new Map(); for (const [ms, g] of A.ppMerits){ const w = weekOf(ms); weeks.set(w, (weeks.get(w) || 0) + g); }
    const pp = (A.pp || A.ppMerits.length) ? { power:A.pp?.Power, rank:A.pp?.Rank, merits:A.pp?.Merits ?? A.ppMerits.at(-1)?.[2], pledged:A.pp?.TimePledged, t:A.pp?.timestamp,
      history:A.ppHistory, rankUps:A.ppRankUps, gained:A.ppMerits.reduce((a, m) => a + m[1], 0), events:A.ppMerits.length,
      weeks:[...weeks].sort((a, b) => a[0] - b[0]), series:A.ppMerits.filter(m => m[2] != null).map(m => [m[0], m[2]]) } : null;

    const social = { wings:A.wings, wingmates:[...A.wingmates.values()].sort((a, b) => b.n - a.n), friends:[...A.friends.values()].sort((a, b) => (b.last || "").localeCompare(a.last || "")), multicrew:[...A.multicrew].map(([name, m]) => ({name, ...m})) };

    return {
      fleet, fleetValue, income:[...income.entries()].filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]), spend:[...A.spend.entries()].filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]), tradeProfit:A.tradeProfit,
      creditSeries:A.creditSeries, wealthSeries:A.wealthSeries, carrierSeries:A.carrierSeries.sort((a, b) => a[0] - b[0]),
      bounties:{n:A.bounties.n, cr:A.bounties.cr, byTarget:[...A.bounties.byTarget.entries()].sort((a, b) => b[1] - a[1]), byFaction:[...A.bounties.byFaction.entries()].sort((a, b) => b[1] - a[1])},
      bonds:A.bonds, underAttack:A.underAttack, killers:A.killers,
      engineers:[...A.engineers.values()].sort((a, b) => (b.rank || 0) - (a.rank || 0) || String(a.progress).localeCompare(String(b.progress)) || a.name.localeCompare(b.name)),
      crafts:A.crafts, craftsByBp:[...A.craftsByBp.entries()].sort((a, b) => b[1] - a[1]), craftsByEng:[...A.craftsByEng.entries()].sort((a, b) => b[1] - a[1]),
      craftLevels:[...A.craftLevels.entries()].sort((a, b) => a[0] - b[0]), experimentals:[...A.experimentals.entries()].sort((a, b) => b[1] - a[1]),
      mats, matsAt:A.materials?.timestamp, matTrades:A.matTrades, locker,
      inv:A.inv ? Object.fromEntries(A.inv) : null, invAt:A.invAt, invDeltas:A.invDeltas,
      fitted:[...A.fitted.values()].filter(f => !A.soldShips.has(f.id) && !/suit|taxi|srv|^\$/i.test(f.type || "")).map(f => ({...f, typeName:shipType(A, f.type), label:shipName(A, f)})),
      cargo, carrierCargo, carrierMarket, crew, pp, social,
      carrier:A.carrier, carrierJumpList:cj, carrierFuel:A.carrierFuel, carrierLoc:A.carrierLoc,
      A, cmdr:A.name, fid:A.fid, first:A.first, last:A.last, files:A.files,
      jumps:A.jumps, ly:A.ly, avgJump: A.jumps ? A.ly / A.jumps : 0, fuelUsed:A.fuelUsed, scooped:A.scooped, scoops:A.scoops,
      longest:A.longest, farthest:A.farthest, months, systemsVisited:A.systems.size, topSys,
      carrierJumps:A.carrierJumps, carrierLy:A.carrierLy, carrierRequests:A.carrierRequests,
      arrivalStars:[...A.arrivalStars.entries()].map(([c,n]) => [starGroup(c), n]).reduce((m,[g,n]) => (m.set(g,(m.get(g)||0)+n), m), new Map()),
      bodiesScanned:bodies.length, planets:planets.length, stars:stars.length,
      discovered:bodies.filter(disc).length, discPlanets:planets.filter(disc).length, discStars:stars.filter(disc).length,
      sysDiscovered:sysDisc.size, honked:A.fss.size, allFound:A.allFound.size, biggestSys,
      byClass:[...byClass.entries()].sort((a,b) => b[1].n - a[1].n), starTypes:[...starTypes.entries()].sort((a,b) => b[1].n - a[1].n),
      mapped:A.mapped.size, firstMapped, efficient, notable, records,
      organic:A.organic.length, samples:A.samples, speciesFound:sp.size, genera,
      variants:[...sp.values()].reduce((a,s) => a + s.variants.size, 0), estValue,
      orgSold:A.orgSold, explSold:A.explSold, bioSignals, bioBodies:A.bio.size, bioBodiesDone:bioBodiesDone.size, bioComplete, topBio,
      geoSignals:[...A.geo.values()].reduce((a,n) => a+n, 0),
      codex:{total:A.codex.total, fresh:A.codex.fresh, sub:[...A.codex.sub.entries()].sort((a,b)=>b[1]-a[1]), regions:[...A.codex.regions].sort(), newList:A.codex.newList.slice(-12).reverse()},
      landings:A.landings, landedBodies:landedBodies.length, uniqueLanded:A.landed.size, footfalls:A.footfalls.size, firstFoot, srv:A.srv,
      heaviestLanding: maxBy(landedBodies, b => b.grav), hottestLanding: maxBy(landedBodies, b => b.temp), mostLanded:[...A.landed.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5).map(([k,n]) => ({name:A.bodies.get(k)?.name || "Unknown body", n})),
      docks:A.docks, stationsUnique:stations.length, stTypes:[...stTypes.entries()].sort((a,b)=>b[1]-a[1]),
      topStations:stations.sort((a,b)=>b.count-a.count).slice(0,10), settlements:A.settlements.size,
      refined:[...A.refined.entries()].sort((a,b)=>b[1]-a[1]), refinedTotal:[...A.refined.values()].reduce((a,n)=>a+n,0), prospected:A.prospected, cracked:A.cracked, drones:A.drones, matsCollected:A.matsCollected,
      ships, deaths:A.deaths, interdicted:A.interdicted, escaped:A.escaped, screenshots:A.screenshots,
      stats:A.stats, rank:A.rank, progress:A.progress, credits:A.credits,
      route:A.route, systems:sysList
    };
  }
  function fmtN(n){ return n == null ? "–" : Math.round(n).toLocaleString("en-GB"); }

  return { EVENTS, CATALOG, REF, MATS, ingestCompanion, sourcesFor, fileKey, isJournal, newAgg, ingest, ingestText, finalize, starGroup };
})();
