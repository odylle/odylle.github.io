#!/usr/bin/env node
/*
 * Builds data/blueprints.js from community data.
 *   node scripts/build-blueprints.mjs <EDEngineer checkout> <coriolis-data checkout>
 *
 *   EDEngineer   https://github.com/msarilar/EDEngineer   blueprints, engineers, costs, effects
 *   coriolis-data https://github.com/EDCD/coriolis-data   journal BlueprintName (fdname) and
 *                                                        experimental effect symbols
 * The two are joined per module type by matching each grade's ingredient list, voting across grades
 * (the display names differ between the two projects, e.g. "Increased FSD Range" vs "Increased Range").
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const [edDir, coDir] = process.argv.slice(2);
if (!edDir || !coDir) { console.error("usage: build-blueprints.mjs <EDEngineer dir> <coriolis-data dir>"); process.exit(1); }
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const json = p => JSON.parse(fs.readFileSync(p, "utf8").replace(/^﻿/, ""));

const edData = path.join(edDir, "EDEngineer/Resources/Data");
const BP = json(path.join(edData, "blueprints.json"));
const ENTRY = json(path.join(edData, "entryData.json"));
const CO_BP = json(path.join(coDir, "modifications/blueprints.json"));
const CO_SPECIAL = json(path.join(coDir, "modifications/specials.json"));

// Our material table (symbol -> [grade, R/M/E, name]) is the reference for journal symbols.
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, "data/materials.js"), "utf8") + "\nthis.MATERIALS = MATERIALS;", ctx);
const MATS = ctx.MATERIALS.MATS;
const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const byName = new Map(Object.entries(MATS).map(([sym, d]) => [norm(d[2]), sym]));
// EDEngineer names that differ from the FDevIDs display names
const ALIAS = { adaptiveencryptorscapture:"adaptiveencryptors", abnormalcompactemissiondata:"compactemissionsdata",
  untypicalshieldscans:"shielddensityreports", flawedfocuscrystals:"uncutfocuscrystals" };
const entry = new Map(ENTRY.map(e => [e.Name, e]));
const unknown = new Set();
function ingredient(name){
  const n = norm(name);
  const sym = byName.get(n) || ALIAS[n] || (MATS[entry.get(name)?.FormattedName] && entry.get(name).FormattedName);
  if (sym) return sym;
  const kind = entry.get(name)?.Kind;
  if (kind === "Material" || kind === "Data") unknown.add(name);
  return "c:" + name;                     // commodity or other non-material ingredient
}

// Journal fdname per (module type, blueprint name): match each grade's recipe against coriolis, then vote.
const recipeKey = list => list.map(([n, q]) => ingredient(n) + "x" + q).sort().join(",");
const coRecipes = new Map();       // type|grade|recipe -> [fdname]
for (const [fd, b] of Object.entries(CO_BP)) for (const mod of [].concat(b.modulename || []))
  for (const [g, x] of Object.entries(b.grades || {})) if (x.components){
    const k = norm(mod) + "|" + g + "|" + recipeKey(Object.entries(x.components));
    coRecipes.set(k, [...(coRecipes.get(k) || []), fd]);
  }
const votes = new Map();           // type|name -> Map(fd -> n)
const WEAPONS = new Set(["Beam Laser","Burst Laser","Pulse Laser","Cannon","Multi-cannon","Fragment Cannon","Plasma Accelerator","Rail Gun","Missile Rack","Mine Launcher","Torpedo Pylon"]);
for (const b of BP) if (b.Grade){
  const r = b.Grade + "|" + recipeKey(b.Ingredients.map(x => [x.Name, x.Size]));
  const hits = coRecipes.get(norm(b.Type) + "|" + r) || (WEAPONS.has(b.Type) && coRecipes.get("weapon|" + r)) || [];
  const v = votes.get(b.Type + "|" + b.Name) || new Map();
  for (const fd of hits) v.set(fd, (v.get(fd) || 0) + 1 / hits.length);
  votes.set(b.Type + "|" + b.Name, v);
}
// Ties (identical recipes, e.g. Engine vs System Focused) are broken on shared words in the names.
const words = s => new Set(s.toLowerCase().split(/[^a-z]+/).filter(w => w.length > 2));
const like = (a, b) => { const A = words(a); return [...words(b)].filter(w => A.has(w) || A.has(w.replace(/s$/, ""))).length; };
const fdFor = b => {
  const v = votes.get(b.Type + "|" + b.Name); if (!v?.size) return null;
  return [...v].map(([fd, n]) => [fd, n + 0.1 * like(b.Name, CO_BP[fd].name + " " + fd.replace(/_/g, " "))]).sort((a, c) => c[1] - a[1])[0][0];
};

const odyssey = b => ["Suit", "Weapon"].includes(b.Type) || b.Engineers.some(e => e === "@Merchant" || e === "@Bartender");
function kindOf(b){
  if (b.Engineers.includes("@Synthesis")) return "synth";
  if (b.Engineers.includes("@Technology")) return "broker";
  if (b.Type === "Unlock") return "unlock";
  if (b.Grade) return "mod";
  return "exp";
}

const engineers = [...new Set(BP.filter(b => !odyssey(b)).flatMap(b => b.Engineers).filter(e => !e.startsWith("@")))].sort();
const items = [];
let joined = 0; const unjoined = new Set();
for (const b of BP){
  if (odyssey(b)) continue;
  const k = kindOf(b);
  const fd = k === "mod" ? fdFor(b) : null;
  if (fd) joined++; else if (k === "mod") unjoined.add(b.Type + " / " + b.Name);
  const it = { k, t:b.Type, n:b.Name };
  if (b.Grade) it.g = b.Grade;
  if (fd) it.fd = fd;
  const engs = b.Engineers.filter(e => !e.startsWith("@")).map(e => engineers.indexOf(e));
  if (engs.length) it.e = engs;
  it.i = b.Ingredients.map(x => [ingredient(x.Name), x.Size]);
  if (b.Effects?.length) it.fx = b.Effects.map(x => [x.Property, x.Effect, x.IsGood ? 1 : 0]);
  items.push(it);
}

// Material trader families (symbol -> family). Guardian and Thargoid materials cannot be traded.
const families = {};
for (const e of ENTRY) if ((e.Kind === "Material" || e.Kind === "Data") && e.Group && !/guardian|thargoid/i.test(e.Group)){
  const sym = ingredient(e.Name); if (!sym.startsWith("c:")) families[sym] = e.Group;
}

// Experimental effect symbols (journal ExperimentalEffect) -> display name
const specials = Object.fromEntries(Object.entries(CO_SPECIAL).map(([k, v]) => [k.toLowerCase(), v.name]));

const rev = d => { try { return fs.readFileSync(path.join(d, ".git/HEAD"), "utf8").trim(); } catch { return "unknown"; } };
const header = `/* Generated by scripts/build-blueprints.mjs on ${new Date().toISOString().slice(0, 10)}. Do not edit by hand.
 * Sources: EDEngineer (github.com/msarilar/EDEngineer, MIT) and EDCD coriolis-data (github.com/EDCD/coriolis-data).
 * Game data is the intellectual property of Frontier Developments plc.
 * families: material symbol -> trader family (materials trade only within Raw / Manufactured / Encoded)
 * Item: k kind (mod|exp|synth|broker|unlock) · t module type · n name · g grade · fd journal BlueprintName
 *       e engineer indexes · i ingredients [material symbol | "c:"commodity, qty] · fx effects [property, effect, good]
 */
`;
const out = header + "const BLUEPRINTS = " + JSON.stringify({ engineers, specials, families, items })
  .replace(/\},\{"k"/g, '},\n{"k"').replace('"items":[', '"items":[\n') + ";\n";
fs.writeFileSync(path.join(root, "data/blueprints.js"), out);

const count = k => items.filter(i => i.k === k).length;
console.log(`items ${items.length}: mod ${count("mod")} exp ${count("exp")} synth ${count("synth")} broker ${count("broker")} unlock ${count("unlock")}`);
console.log(`journal symbol joined for ${joined}/${count("mod")} grade blueprints; engineers ${engineers.length}; ${(out.length / 1024).toFixed(0)} KB`);
if (unjoined.size) console.log("no journal symbol:", [...unjoined].join(", "));
if (unknown.size) console.log("unmapped materials:", [...unknown].join(", "));
