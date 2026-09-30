/* Engineering materials: grades, names, caps and where to find them — consumed by js/journal/core.js */
const MATERIALS = (() => {
  // EDCD FDevIDs material.csv: symbol -> [grade, R/M/E, name]
  const MATS = {"iron":[1,"R","Iron"],"nickel":[1,"R","Nickel"],"tin":[3,"R","Tin"],"zinc":[2,"R","Zinc"],"carbon":[1,"R","Carbon"],"sulphur":[1,"R","Sulphur"],"phosphorus":[1,"R","Phosphorus"],"manganese":[2,"R","Manganese"],"selenium":[4,"R","Selenium"],"chromium":[2,"R","Chromium"],"vanadium":[2,"R","Vanadium"],"germanium":[2,"R","Germanium"],"cadmium":[3,"R","Cadmium"],"tungsten":[3,"R","Tungsten"],"arsenic":[2,"R","Arsenic"],"molybdenum":[3,"R","Molybdenum"],"niobium":[3,"R","Niobium"],"zirconium":[2,"R","Zirconium"],"mercury":[3,"R","Mercury"],"yttrium":[4,"R","Yttrium"],"tellurium":[4,"R","Tellurium"],"polonium":[4,"R","Polonium"],"technetium":[4,"R","Technetium"],"ruthenium":[4,"R","Ruthenium"],"antimony":[4,"R","Antimony"],"gridresistors":[1,"M","Grid Resistors"],"crystalshards":[1,"M","Crystal Shards"],"temperedalloys":[1,"M","Tempered Alloys"],"basicconductors":[1,"M","Basic Conductors"],"mechanicalscrap":[1,"M","Mechanical Scrap"],"heatconductionwiring":[1,"M","Heat Conduction Wiring"],"wornshieldemitters":[1,"M","Worn Shield Emitters"],"compactcomposites":[1,"M","Compact Composites"],"salvagedalloys":[1,"M","Salvaged Alloys"],"chemicalstorageunits":[1,"M","Chemical Storage Units"],"hybridcapacitors":[2,"M","Hybrid Capacitors"],"uncutfocuscrystals":[2,"M","Flawed Focus Crystals"],"heatresistantceramics":[2,"M","Heat Resistant Ceramics"],"conductivecomponents":[2,"M","Conductive Components"],"mechanicalequipment":[2,"M","Mechanical Equipment"],"heatdispersionplate":[2,"M","Heat Dispersion Plate"],"shieldemitters":[2,"M","Shield Emitters"],"filamentcomposites":[2,"M","Filament Composites"],"galvanisingalloys":[2,"M","Galvanising Alloys"],"chemicalprocessors":[2,"M","Chemical Processors"],"electrochemicalarrays":[3,"M","Electrochemical Arrays"],"focuscrystals":[3,"M","Focus Crystals"],"precipitatedalloys":[3,"M","Precipitated Alloys"],"conductiveceramics":[3,"M","Conductive Ceramics"],"mechanicalcomponents":[3,"M","Mechanical Components"],"heatexchangers":[3,"M","Heat Exchangers"],"shieldingsensors":[3,"M","Shielding Sensors"],"highdensitycomposites":[3,"M","High Density Composites"],"phasealloys":[3,"M","Phase Alloys"],"chemicaldistillery":[3,"M","Chemical Distillery"],"polymercapacitors":[4,"M","Polymer Capacitors"],"refinedfocuscrystals":[4,"M","Refined Focus Crystals"],"thermicalloys":[4,"M","Thermic Alloys"],"conductivepolymers":[4,"M","Conductive Polymers"],"configurablecomponents":[4,"M","Configurable Components"],"heatvanes":[4,"M","Heat Vanes"],"compoundshielding":[4,"M","Compound Shielding"],"fedproprietarycomposites":[4,"M","Proprietary Composites"],"protolightalloys":[4,"M","Proto Light Alloys"],"chemicalmanipulators":[4,"M","Chemical Manipulators"],"militarysupercapacitors":[5,"M","Military Supercapacitors"],"exquisitefocuscrystals":[5,"M","Exquisite Focus Crystals"],"militarygradealloys":[5,"M","Military Grade Alloys"],"biotechconductors":[5,"M","Biotech Conductors"],"improvisedcomponents":[5,"M","Improvised Components"],"protoheatradiators":[5,"M","Proto Heat Radiators"],"imperialshielding":[5,"M","Imperial Shielding"],"fedcorecomposites":[5,"M","Core Dynamics Composites"],"protoradiolicalloys":[5,"M","Proto Radiolic Alloys"],"pharmaceuticalisolators":[5,"M","Pharmaceutical Isolators"],"legacyfirmware":[1,"E","Specialised Legacy Firmware"],"encryptedfiles":[1,"E","Unusual Encrypted Files"],"bulkscandata":[1,"E","Anomalous Bulk Scan Data"],"disruptedwakeechoes":[1,"E","Atypical Disrupted Wake Echoes"],"scrambledemissiondata":[1,"E","Exceptional Scrambled Emission Data"],"shieldcyclerecordings":[1,"E","Distorted Shield Cycle Recordings"],"consumerfirmware":[2,"E","Modified Consumer Firmware"],"encryptioncodes":[2,"E","Tagged Encryption Codes"],"scanarchives":[2,"E","Unidentified Scan Archives"],"fsdtelemetry":[2,"E","Anomalous FSD Telemetry"],"archivedemissiondata":[2,"E","Irregular Emission Data"],"shieldsoakanalysis":[2,"E","Inconsistent Shield Soak Analysis"],"industrialfirmware":[3,"E","Cracked Industrial Firmware"],"symmetrickeys":[3,"E","Open Symmetric Keys"],"scandatabanks":[3,"E","Classified Scan Databanks"],"wakesolutions":[3,"E","Strange Wake Solutions"],"emissiondata":[3,"E","Unexpected Emission Data"],"shielddensityreports":[3,"E","Untypical Shield Scans "],"securityfirmware":[4,"E","Security Firmware Patch"],"encryptionarchives":[4,"E","Atypical Encryption Archives"],"encodedscandata":[4,"E","Divergent Scan Data"],"hyperspacetrajectories":[4,"E","Eccentric Hyperspace Trajectories"],"decodedemissiondata":[4,"E","Decoded Emission Data"],"shieldpatternanalysis":[4,"E","Aberrant Shield Pattern Analysis"],"embeddedfirmware":[5,"E","Modified Embedded Firmware"],"adaptiveencryptors":[5,"E","Adaptive Encryptors Capture"],"classifiedscandata":[5,"E","Classified Scan Fragment"],"dataminedwake":[5,"E","Datamined Wake Exceptions"],"compactemissionsdata":[5,"E","Abnormal Compact Emissions Data"],"shieldfrequencydata":[5,"E","Peculiar Shield Frequency Data"],"unknownenergysource":[5,"M","Sensor Fragment"],"unknownshipsignature":[3,"E","Thargoid Ship Signature"],"unknownwakedata":[4,"E","Thargoid Wake Data"],"ancientlanguagedata":[4,"E","Pattern Delta Obelisk Data"],"ancientbiologicaldata":[4,"E","Pattern Alpha Obelisk Data"],"ancientculturaldata":[4,"E","Pattern Beta Obelisk Data"],"ancienthistoricaldata":[4,"E","Pattern Gamma Obelisk Data"],"ancienttechnologicaldata":[4,"E","Pattern Epsilon Obelisk Data"],"tg_compositiondata":[3,"E","Thargoid Material Composition Data"],"tg_residuedata":[4,"E","Thargoid Residue Data"],"tg_structuraldata":[2,"E","Thargoid Structural Data"],"unknowncarapace":[2,"M","Thargoid Carapace"],"unknownenergycell":[3,"M","Thargoid Energy Cell"],"unknownorganiccircuitry":[5,"M","Thargoid Organic Circuitry"],"unknowntechnologycomponents":[4,"M","Thargoid Technological Components"],"tg_biomechanicalconduits":[3,"M","Bio-Mechanical Conduits"],"tg_propulsionelement":[5,"M","Propulsion Elements"],"tg_weaponparts":[4,"M","Weapon Parts"],"tg_wreckagecomponents":[3,"M","Wreckage Components"],"tg_shipflightdata":[3,"E","Ship Flight Data"],"tg_shipsystemsdata":[4,"E","Ship Systems Data"],"guardian_powercell":[1,"M","Guardian Power Cell"],"guardian_powerconduit":[2,"M","Guardian Power Conduit"],"guardian_techcomponent":[3,"M","Guardian Technology Component"],"guardian_sentinel_weaponparts":[3,"M","Guardian Sentinel Weapon Parts"],"guardian_sentinel_wreckagecomponents":[1,"M","Guardian Sentinel Wreckage Components"],"guardian_weaponblueprint":[4,"E","Guardian Weapon Blueprint Segment"],"guardian_moduleblueprint":[4,"E","Guardian Module Blueprint Segment"],"guardian_vesselblueprint":[5,"E","Guardian Vessel Blueprint Segment"],"rhenium":[1,"R","Rhenium"],"lead":[1,"R","Lead"],"boron":[3,"R","Boron"]};
  const MAT_CAP = [0,300,250,200,150,100];


  // Where to find engineering materials. Locations from community farming guides (Frontier forums, Inara, EDBlackbox).
  const J = "Jameson Crash Site — HIP 12099 1 B: scan the comms beacons in the SRV, relog to reset";
  const DAV = "Dav's Hope — Hyades Sector DR-V c2-23 A 5: drive the abandoned settlement and collect, relog to reset";
  const HGE = s => "High Grade Emissions signal sources" + (s ? " in " + s : "");
  const WAKE = "Scan high-energy wakes with the FSD Wake Scanner (busy stations/systems, Boom states give lots of traffic)";
  const SRV = "Surface prospecting in the SRV (outcrops, metallic meteorites) and laser mining";
  const SURF = "Surface mining — planetary deposits drop raw materials alongside the minerals";
  const SHARDS = "Crystalline shards, shot with the SRV";
  const MISSION = "Mission rewards";
  const TRADE = "Material Trader: trade up 6:1 / down 1:3 within the same family";
  const GUARDIAN = "Guardian ruins & structures (Vela / Regor sector, ~800 ly from Sol); sentinels drop weapon parts";
  const THARGOID = "Thargoid kills (scouts, interceptors), Titan wreck sites and war zones";
  const SOURCES = {
    // Raw
    _R1:[SURF, SRV, "Refine asteroids / cracked cores", MISSION], _R2:[SURF, SRV, "Refine asteroids / cracked cores", MISSION], _R3:[SURF, SRV, "Brain trees (Guardian space)", MISSION],
    _R4:["Brain trees (Guardian space, e.g. around HR 3230)", SURF, SRV + " on bodies rich in the element", MISSION],
    antimony:["Outotz LS-K d8-3 B 5 c — " + SHARDS, "Koli Discii C 6 A — crashed Anaconda cargo racks (relog)"],
    polonium:["HIP 36601 C 1 a — " + SHARDS],
    ruthenium:["HIP 36601 C 1 d — " + SHARDS, "Koli Discii C 6 A — crashed Anaconda cargo racks (relog)"],
    tellurium:["HIP 36601 C 3 b — " + SHARDS, "Koli Discii C 6 A — crashed Anaconda cargo racks (relog)"],
    technetium:["HIP 36601 C 5 a — " + SHARDS],
    yttrium:["Outotz LS-K d8-3 B 5 a — " + SHARDS],
    selenium:["LHS 417 9 E A — geological site", "HR 3230 3 A A — " + SHARDS],
    tungsten:["Koli Discii C 6 A — crashed Anaconda cargo racks (relog)"],
    zirconium:["Koli Discii C 6 A — crashed Anaconda cargo racks (relog)"],
    // Manufactured
    _M1:[DAV, "Ship salvage from destroyed NPCs", "Degraded / Encoded Emissions, Combat Aftermath"], _M2:[DAV, "Ship salvage from destroyed NPCs", "Degraded / Encoded Emissions"],
    _M3:[DAV, "Ship salvage from destroyed NPCs", HGE()], _M4:[HGE(), DAV, "Ship salvage from destroyed NPCs"], _M5:[HGE(), MISSION],
    fedcorecomposites:[HGE("Federation systems, high population, no state (e.g. LTT 3010, LP 413-18)")],
    fedproprietarycomposites:[HGE("Federation systems, high population, no state (e.g. LTT 3010, LP 413-18)")],
    imperialshielding:[HGE("Empire systems, high population, no state / election (e.g. Laguz, 21 Eridani)")],
    militarygradealloys:[HGE("War or Civil War systems, high population")],
    militarysupercapacitors:[HGE("War or Civil War systems"), MISSION],
    protoheatradiators:[HGE("Independent systems in Boom, high population")],
    protoradiolicalloys:[HGE("Independent / Alliance systems in Boom, high population")],
    protolightalloys:[HGE("Independent / Alliance systems in Boom, high population")],
    improvisedcomponents:[HGE("Independent / Alliance systems in Civil Unrest")],
    pharmaceuticalisolators:[HGE("any system in Outbreak")],
    exquisitefocuscrystals:[MISSION, "Trade up Refined Focus Crystals"], biotechconductors:[MISSION, "Trade up Configurable Components"],
    guardian_powercell:[GUARDIAN], guardian_powerconduit:[GUARDIAN], guardian_sentinel_weaponparts:[GUARDIAN], guardian_sentinel_wreckagecomponents:[GUARDIAN], guardian_techcomponent:[GUARDIAN],
    unknowncarapace:[THARGOID], unknownenergycell:[THARGOID], unknowntechnologycomponents:[THARGOID], unknownorganiccircuitry:["Thargoid interceptor hearts", THARGOID],
    unknownenergysource:["Thargoid barnacles (Sensor Fragment)"], tg_biomechanicalconduits:[THARGOID], tg_wreckagecomponents:[THARGOID], tg_weaponparts:[THARGOID], tg_propulsionelement:[THARGOID],
    // Encoded
    _E1:["Nav beacons & settlement data points", "Scanning ships (data link / KWS)", MISSION], _E2:["Scanning ships (data link / KWS)", "Settlement data points", MISSION],
    _E3:["Settlement data points", "Scanning ships", J], _E4:[J, MISSION], _E5:[J + " — then trade", MISSION],
    disruptedwakeechoes:["Scan low- and high-energy wakes", WAKE], fsdtelemetry:[WAKE], wakesolutions:[WAKE], hyperspacetrajectories:[WAKE], dataminedwake:[WAKE, "Trade across from Jameson G5 encoded"],
    consumerfirmware:[J], industrialfirmware:[J], encryptionarchives:[J], adaptiveencryptors:[J],
    embeddedfirmware:["Passenger mission rewards", "Trade across from Jameson G5 encoded"],
    classifiedscandata:["Nav beacons / data points (rare)", "Trade across from Jameson G5 encoded"],
    compactemissionsdata:["Scanning ships (rare)", "Trade across from Jameson G5 encoded"],
    shieldfrequencydata:["Scanning ship shields in combat zones (rare)", "Trade across from Jameson G5 encoded"],
    ancientbiologicaldata:["Guardian ruins — obelisks (needs a Guardian relic / artefact)"], ancientculturaldata:["Guardian ruins — obelisks"], ancienthistoricaldata:["Guardian ruins — obelisks"], ancientlanguagedata:["Guardian ruins — obelisks"], ancienttechnologicaldata:["Guardian ruins — obelisks"],
    guardian_moduleblueprint:["Guardian structures — blueprint data terminals"], guardian_weaponblueprint:["Guardian structures — blueprint data terminals"], guardian_vesselblueprint:["Guardian structures — blueprint data terminals"],
    tg_structuraldata:["Scan Thargoid structures / Titan sites"], tg_compositiondata:["Composition-scan Thargoid ships"], tg_shipflightdata:["Scan Thargoid ships"], unknownshipsignature:["Scan Thargoid ships"],
    tg_residuedata:["Thargoid structures / war zones"], tg_shipsystemsdata:["Scan Thargoid ships"], unknownwakedata:["Scan Thargoid hyperspace wakes"]
  };

  return { MATS, MAT_CAP, SOURCES, TRADE };
})();
