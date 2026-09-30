/* ===== CMDR History: Blueprints — browser, craftability, engineering plan, trader suggestions ===== */
const BP = (() => {
  const B = BLUEPRINTS, MATS = EH.MATS, FAM = B.families;
  const KINDS = { ship:"Ship modules", synth:"Synthesis", broker:"Tech broker", unlock:"Engineer unlocks" };
  const kindGroup = k => k === "mod" || k === "exp" ? "ship" : k;
  const STORE = "cmdr-history:plan";
  // Outfitting categories for ship modules
  const CATS = { core:"Core internals", optional:"Optional internals", hardpoint:"Hardpoints", utility:"Utility mounts" };
  const CAT_OF = {};
  for (const t of ["Armour","Power Plant","Thrusters","Frame Shift Drive","Life Support","Power Distributor","Sensors"]) CAT_OF[t] = "core";
  for (const t of ["Shield Generator","Shield Cell Bank","Hull Reinforcement Package","Frame Shift Drive Interdictor","Fuel Scoop","Refinery","Auto Field-Maintenance Unit",
    "Collector Limpet Controller","Fuel Transfer Limpet Controller","Hatch Breaker Limpet Controller","Prospector Limpet Controller","Surface Scanner"]) CAT_OF[t] = "optional";
  for (const t of ["Beam Laser","Burst Laser","Pulse Laser","Cannon","Multi-cannon","Fragment Cannon","Plasma Accelerator","Rail Gun","Missile Rack","Mine Launcher","Torpedo Pylon"]) CAT_OF[t] = "hardpoint";
  for (const t of ["Shield Booster","Heat Sink Launcher","Chaff Launcher","Electronic Countermeasure","Point Defence","Manifest Scanner","Kill Warrant Scanner","Wake Scanner"]) CAT_OF[t] = "utility";
  const catOf = r => CAT_OF[r.t] || "optional";
  const special = sym => /^(guardian|tg_|unknown|ancient)/.test(sym);

  // Recipes: one per (kind, module type, name), grades keyed 1-5 (0 for ungraded items)
  const recipes = new Map();
  for (const it of B.items){
    const key = `${it.k}|${it.t}|${it.n}`;
    let r = recipes.get(key);
    if (!r){ r = {key, k:it.k, t:it.t, n:it.n, fd:it.fd, grades:{}}; recipes.set(key, r); }
    r.grades[it.g || 0] = it;
    if (it.fd) r.fd = it.fd;
  }
  const kindOrder = { mod:0, exp:1, synth:2, broker:3, unlock:4 };
  // group by module type; within a type, grade blueprints first, then experimentals
  const catRank = r => ["core", "optional", "hardpoint", "utility"].indexOf(kindGroup(r.k) === "ship" ? catOf(r) : "");
  const list = [...recipes.values()].sort((a, b) => kindGroup(a.k).localeCompare(kindGroup(b.k)) || catRank(a) - catRank(b) || a.t.localeCompare(b.t) || kindOrder[a.k] - kindOrder[b.k] || a.n.localeCompare(b.n));
  for (const r of list){
    r.gs = Object.keys(r.grades).map(Number).sort((a, b) => a - b);
    r.engs = [...new Set(r.gs.flatMap(g => r.grades[g].e || []))].map(i => B.engineers[i]);
    r.hay = [r.t, r.n, ...r.engs, ...r.gs.flatMap(g => r.grades[g].i.map(([s]) => matName(s)))].join(" ").toLowerCase();
  }

  function matName(s){ return s.startsWith("c:") ? s.slice(2) : MATS[s]?.[2] || s; }
  const matGrade = s => MATS[s]?.[0] || 0;

  // Module type from a Loadout item symbol, to resolve generic blueprint names (Weapon_Sturdy, Misc_Shielded …)
  const ITEM_TYPES = [["pulselaserburst","Burst Laser"],["pulselaser","Pulse Laser"],["beamlaser","Beam Laser"],["multicannon","Multi-cannon"],["slugshot","Fragment Cannon"],
    ["plasmaaccelerator","Plasma Accelerator"],["railgun","Rail Gun"],["missilerack","Missile Rack"],["minelauncher","Mine Launcher"],["torppylon","Torpedo Pylon"],["cannon","Cannon"],
    ["hyperdrive","Frame Shift Drive"],["engine","Thrusters"],["powerdistributor","Power Distributor"],["powerplant","Power Plant"],["shieldgenerator","Shield Generator"],
    ["shieldbooster","Shield Booster"],["shieldcellbank","Shield Cell Bank"],["hullreinforcement","Hull Reinforcement Package"],["armour","Armour"],["sensors","Sensors"],
    ["fsdinterdictor","Frame Shift Drive Interdictor"],["fuelscoop","Fuel Scoop"],["lifesupport","Life Support"],["heatsinklauncher","Heat Sink Launcher"],["chafflauncher","Chaff Launcher"],
    ["electroniccountermeasure","Electronic Countermeasure"],["plasmapointdefence","Point Defence"],["cloudscanner","Wake Scanner"],["crimescanner","Kill Warrant Scanner"],
    ["cargoscanner","Manifest Scanner"],["refinery","Refinery"],["detailedsurfacescanner","Surface Scanner"],["repairer","Auto Field-Maintenance Unit"],
    ["dronecontrol_collection","Collector Limpet Controller"],["dronecontrol_fueltransfer","Fuel Transfer Limpet Controller"],["dronecontrol_prospector","Prospector Limpet Controller"],
    ["dronecontrol_resourcesiphon","Hatch Breaker Limpet Controller"]];
  const typeOf = item => ITEM_TYPES.find(([k]) => item.includes(k))?.[1];
  function recipeForFitted(m){
    const fd = (m.eng.bp || "").toLowerCase(), type = typeOf(m.item);
    const hits = list.filter(r => r.k === "mod" && (r.fd || "").toLowerCase() === fd);
    return hits.find(r => r.t === type) || hits[0];
  }

  let V = null, state = { q:"", kind:"ship", cat:"all", craftable:false, unlocked:false, open:new Set(), types:new Set() }, plan = load();

  function load(){
    try { return (JSON.parse(localStorage.getItem(STORE)) || []).map(p => ({ qty:1, src:[], ...p })); } catch { return []; }
  }
  // One entry per blueprint + grade range + rolls; adding the same again raises the module count.
  function addToPlan(key, from, to, rolls, qty = 1, src = null){
    const p = plan.find(x => x.key === key && x.from === from && x.to === to && x.rolls === rolls);
    if (p){ if (src && p.src.includes(src)) return; p.qty += qty; if (src) p.src.push(src); }
    else plan.push({ key, from, to, rolls, qty, src:src ? [src] : [] });
  }
  const planQty = key => plan.filter(p => p.key === key).reduce((a, p) => a + p.qty, 0);
  const plannedSrc = src => plan.some(p => p.src.includes(src));
  function save(){ try { localStorage.setItem(STORE, JSON.stringify(plan)); } catch {} }

  const have = s => s.startsWith("c:") ? null : (V.inv?.[s] || 0);
  function craftable(item){
    let n = Infinity;
    for (const [s, q] of item.i){ const h = have(s); if (h == null) return null; n = Math.min(n, Math.floor(h / q)); }
    return n === Infinity ? 0 : n;
  }
  function engState(name, g){
    const e = V.engineers.find(x => x.name === name);
    if (!e || e.progress !== "Unlocked") return e?.progress === "Invited" || e?.progress === "Known" ? "known" : "locked";
    return !g || (e.rank || 0) >= g ? "ok" : "low";
  }
  const anyEngineer = (r, g) => (r.k !== "mod" && r.k !== "exp") || !r.grades[g].e || r.grades[g].e.some(i => engState(B.engineers[i], g) === "ok");

  /* ---------- plan maths ---------- */
  function needs(){
    const need = new Map();
    for (const p of plan){
      const r = recipes.get(p.key); if (!r) continue;
      for (const g of r.gs) if (g >= p.from && g <= p.to) for (const [s, q] of r.grades[g].i) need.set(s, (need.get(s) || 0) + q * p.rolls * p.qty);
    }
    return [...need].map(([s, n]) => ({ s, n, h:have(s), name:matName(s), g:matGrade(s) }))
      .map(x => ({ ...x, short:x.h == null ? null : Math.max(0, x.n - x.h) }))
      .sort((a, b) => (b.short || 0) - (a.short || 0) || a.name.localeCompare(b.name));
  }
  // Greedy trader plan: cover each shortfall from surplus, same family first, then the rest of its category (6:1 extra).
  function trades(rows){
    const need = new Map(rows.map(r => [r.s, r.n]));
    const surplus = new Map(Object.entries(V.inv || {}).filter(([s]) => FAM[s]).map(([s, h]) => [s, h - (need.get(s) || 0)]).filter(([, n]) => n > 0));
    const out = [];
    for (const r of rows){
      if (!r.short || !FAM[r.s]) continue;
      let left = r.short;
      const cat = MATS[r.s][1];
      const cands = [...surplus.keys()].filter(d => d !== r.s && MATS[d]?.[1] === cat).map(d => {
        const same = FAM[d] === FAM[r.s], dg = matGrade(d) - r.g;
        const yieldPer = (dg >= 0 ? 3 ** dg : 1 / 6 ** -dg) / (same ? 1 : 6);
        return { d, same, yieldPer, score:(same ? 10 : 0) + surplus.get(d) / ([0,300,250,200,150,100][matGrade(d)] || 300) };
      }).sort((a, b) => b.score - a.score);
      for (const c of cands){
        if (left <= 0) break;
        const avail = surplus.get(c.d); if (!avail) continue;
        const use = Math.min(avail, Math.ceil(left / c.yieldPer)), got = Math.floor(use * c.yieldPer + 1e-9);
        if (!got) continue;
        surplus.set(c.d, avail - use); left -= got;
        out.push({ from:c.d, use, to:r.s, got, same:c.same });
      }
      if (left > 0) out.push({ to:r.s, missing:left });
    }
    return out;
  }

  /* ---------- rendering ---------- */
  const pill = (r, g) => {
    const it = r.grades[g], c = craftable(it), ok = anyEngineer(r, g);
    const cls = c == null ? "na" : c > 0 ? (ok ? "ok" : "warn") : "no";
    return `<span class="gp ${cls}" title="${g ? "Grade " + g + ": " : ""}${c == null ? "needs commodities" : c + " roll" + (c === 1 ? "" : "s") + " possible"}${ok ? "" : " · no unlocked engineer at this grade"}">${g ? "G" + g : r.k === "exp" ? "Exp" : "Qty"}<b>${c == null ? "–" : c}</b></span>`;
  };
  function unlockTag(name){
    const e = V.engineers.find(x => x.name === name), st = e?.progress || "Not known";
    return `<span class="eng ${st === "Unlocked" ? "ok" : st === "Invited" || st === "Known" ? "low" : ""}">${esc(st)}${e?.rank ? " · G" + e.rank : ""}</span>`;
  }
  function ingredients(it){
    return it.i.map(([s, q]) => {
      const h = have(s), cls = h == null ? "" : h >= q ? "ok" : "no";
      return `<span class="ing ${cls}" ${s.startsWith("c:") ? "" : `data-sym="${esc(s)}" tabindex="0"`}>${esc(matName(s))} <b>${q}</b>${h == null ? "" : `<small>${nf(h)}</small>`}</span>`;
    }).join("");
  }
  function detail(r){
    const rows = r.gs.map(g => {
      const it = r.grades[g];
      const engs = (it.e || []).map(i => { const n = B.engineers[i], st = engState(n, g); return `<span class="eng ${st}" title="${{ok:"Unlocked at this grade",low:"Unlocked, rank too low",known:"Known, not unlocked",locked:"Not unlocked"}[st]}">${esc(n)}</span>`; }).join("");
      const fx = (it.fx || []).map(([p, e, good]) => `<span class="fx ${good ? "good" : "bad"}">${esc(p)} ${esc(e)}</span>`).join("");
      return `<tr><td class="gcol">${g ? "G" + g : ""}</td><td><div class="ings">${ingredients(it)}</div>${fx ? `<div class="fxs">${fx}</div>` : ""}</td><td><div class="engs">${engs || '<span class="sub">—</span>'}</div></td></tr>`;
    }).join("");
    const graded = r.gs[0] > 0, max = r.gs.at(-1);
    const sel = (id, v) => `<select data-f="${id}" aria-label="${id}">${r.gs.map(g => `<option ${g === v ? "selected" : ""}>${g}</option>`).join("")}</select>`;
    const inPlan = planQty(r.key);
    return `<div class="bp-detail">
      <div class="tbl"><table><thead><tr><th>${graded ? "Grade" : ""}</th><th>Ingredients <span class="sub">need · have</span></th><th>Engineers</th></tr></thead><tbody>${rows}</tbody></table></div>
      <div class="bp-add" data-key="${esc(r.key)}">${r.k === "mod" || r.k === "exp" ? `<input type="number" min="1" max="99" value="1" data-f="qty" aria-label="Modules"> modules, ` : ""}${graded ? `grades ${sel("from", r.gs[0])} to ${sel("to", max)}, ` : ""}
        <input type="number" min="1" max="99" value="1" data-f="rolls" aria-label="Rolls"> ${graded ? "rolls per grade" : "times"}
        <button class="btn small" type="button" data-act="pin">Add to plan</button>${inPlan ? `<span class="sub">${inPlan} already planned</span>` : ""}</div>
    </div>`;
  }
  function rowHtml(r){
    const open = state.open.has(r.key), inPlan = planQty(r.key);
    return `<div class="bp-row${open ? " open" : ""}" data-key="${esc(r.key)}">
      <button class="bp-head" type="button" aria-expanded="${open}"><span class="bp-n">${esc(r.n)}${r.k === "exp" ? ' <span class="chip">experimental</span>' : ""}${inPlan ? ` <span class="chip pin">planned${inPlan > 1 ? " ×" + inPlan : ""}</span>` : ""}</span>
      <span class="gps">${r.k === "unlock" ? unlockTag(r.n) : r.gs.map(g => pill(r, g)).join("")}</span></button>${open ? detail(r) : ""}</div>`;
  }
  const canCraft = r => r.gs.some(g => craftable(r.grades[g]) > 0 && anyEngineer(r, g));
  function renderList(){
    const q = state.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const ship = state.kind === "ship";
    const rows = list.filter(r => kindGroup(r.k) === state.kind && (!ship || state.cat === "all" || catOf(r) === state.cat)
      && q.every(w => r.hay.includes(w))
      && (!state.craftable || canCraft(r))
      && (!state.unlocked || r.gs.some(g => anyEngineer(r, g))));
    $("bpCats").hidden = !ship;
    $("bpCats").querySelectorAll("button").forEach(b => b.classList.toggle("on", b.dataset.c === state.cat));
    let html = "";
    if (state.kind === "unlock"){
      html = `<p class="note">Lists the contribution each engineer asks for. Invitation requirements (ranks, referrals, missions) aren't included.</p>` + rows.map(rowHtml).join("");
    } else {
      // collapsible module-type groups; searching or filtering opens them all
      const auto = q.length > 0 || state.craftable, groups = new Map();
      for (const r of rows){ const k = (ship ? catOf(r) + "|" : "") + r.t; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r); }
      let lastCat = "";
      for (const [k, rs] of groups){
        const t = rs[0].t, cat = ship ? catOf(rs[0]) : "";
        if (ship && state.cat === "all" && cat !== lastCat){ html += `<div class="bp-cat">${CATS[cat]}</div>`; lastCat = cat; }
        const open = auto || state.types.has(t), n = rs.length, c = rs.filter(canCraft).length, pl = rs.filter(r => plan.some(p => p.key === r.key)).length;
        html += `<div class="bp-group${open ? " open" : ""}"><button class="bp-type" type="button" data-type="${esc(t)}" aria-expanded="${open}">
          <span>${esc(t)}</span><span class="bp-meta">${n} blueprint${n === 1 ? "" : "s"}${c ? ` · <b class="c">${c} craftable</b>` : ""}${pl ? ` · <b class="p">${pl} planned</b>` : ""}</span></button>
          ${open ? `<div class="bp-rows">${rs.map(rowHtml).join("")}</div>` : ""}</div>`;
      }
    }
    $("bpList").innerHTML = html || `<div class="empty">No blueprints match.</div>`;
    $("bpCount").textContent = `${nf(rows.length)} blueprint${rows.length === 1 ? "" : "s"}`;
  }
  function renderPlan(){
    const rows = needs(), tr = trades(rows), short = rows.filter(r => r.short).length;
    const pinRows = plan.map((p, i) => { const r = recipes.get(p.key); if (!r) return "";
      return `<li><span class="pl-n"><b>${esc(r.n)}</b> <span class="sub">${esc(r.k === "unlock" ? "unlock" : r.t)}${r.gs[0] ? ` · G${p.from}${p.to !== p.from ? "–" + p.to : ""}` : ""}${p.rolls > 1 ? ` · ${p.rolls} rolls/grade` : ""}</span></span>
        <span class="qty" title="Modules"><button type="button" data-act="qty" data-i="${i}" data-d="-1" aria-label="One fewer">−</button><b>${p.qty}</b><button type="button" data-act="qty" data-i="${i}" data-d="1" aria-label="One more">+</button></span>
        <button class="x" type="button" data-act="unpin" data-i="${i}" aria-label="Remove">×</button></li>`; }).join("");
    $("bpPlan").innerHTML = !plan.length ? `<p class="note">Open a blueprint and add it to the plan to see the materials you need, what you're short of, and what to trade for it.</p>` : `
      <ul class="plan">${pinRows}</ul>
      <div class="plan-sum ${short ? "short" : "done"}">${short ? `Short on ${short} of ${rows.length} materials` : `You have everything for this plan`}</div>
      <div class="tbl"><table><thead><tr><th>Material</th><th class="num">Need</th><th class="num">Have</th><th class="num">Short</th></tr></thead><tbody>
        ${rows.map(r => `<tr class="${r.short ? "no" : "ok"}"><td><span ${r.s.startsWith("c:") ? "" : `data-sym="${esc(r.s)}" tabindex="0" class="msym"`}>${esc(r.name)}</span>${r.g ? ` <span class="sub">G${r.g}</span>` : ""}</td><td class="num">${nf(r.n)}</td><td class="num">${r.h == null ? "–" : nf(r.h)}</td><td class="num">${r.short == null ? "?" : r.short ? nf(r.short) : "✓"}</td></tr>`).join("")}
      </tbody></table></div>
      ${tr.length ? `<h3 style="margin-top:14px">Material trader</h3><ul class="trades">${tr.map(t => t.missing
        ? `<li class="miss">${nf(t.missing)} × ${esc(matName(t.to))} <span class="sub">not enough surplus, farm it</span></li>`
        : `<li>${nf(t.use)} × ${esc(matName(t.from))} <span class="arr">→</span> ${nf(t.got)} × ${esc(matName(t.to))}${t.same ? "" : ' <span class="sub">cross-family</span>'}</li>`).join("")}</ul>
        <p class="note">Trades use surplus only (stock beyond what the plan needs): up a grade 6:1, down a grade 1:3, and 6:1 extra when changing family. Guardian and Thargoid materials can't be traded.</p>` : ""}
      <button class="btn small violet" type="button" data-act="clear" style="margin-top:12px">Clear plan</button>`;
  }
  function renderFitted(){
    const el = $("bpFitted"); if (!el) return;
    const ships = (V.fitted || []).map(f => ({ f, mods:f.modules.filter(m => m.eng) })).filter(x => x.mods.length)
      .sort((a, b) => b.mods.length - a.mods.length);
    el.innerHTML = !ships.length ? `<p class="note">No engineered modules in the Loadout events of these journals.</p>` : `<div class="fit-grid">${ships.map(({ f, mods }) => {
      const todo = mods.filter(m => { const r = recipeForFitted(m); return r && !(m.eng.level >= r.gs.at(-1) && m.eng.quality >= 1); }), open = todo.length;
      const unplanned = todo.filter(m => !plannedSrc(f.id + "|" + m.slot)).length;
      return panel(`${esc(f.label || f.typeName)} <span class="hsub">${esc(f.typeName)}${f.ident ? " · " + esc(f.ident) : ""}</span>`, `
      <p class="note">${mods.length} of ${f.modules.filter(m => /^(hpt|int)_/.test(m.item) || /armour/.test(m.item)).length} modules engineered · ${open ? `${open} not maxed` : "all maxed"} · loadout ${dt(f.t)}
        ${unplanned > 1 ? `<button class="linkbtn" type="button" data-act="shipall">Plan all ${unplanned}</button>` : ""}</p>
      <ul class="fitmods">${mods.map(m => { const r = recipeForFitted(m), max = r?.gs.at(-1), lvl = m.eng.level;
        const done = lvl >= max && m.eng.quality >= 1, planned = r && plannedSrc(f.id + "|" + m.slot);
        return `<li><div class="fm-n"><b>${esc(r ? r.n : m.eng.bp)}</b>${m.eng.exp ? ` <span class="chip">${esc(m.eng.exp)}</span>` : ""}<span class="sub">${esc(r ? r.t : prettyItem(m.item))} · ${esc(m.slot)}</span></div>
          <div class="fm-g"><span class="pips">${[1,2,3,4,5].map(i => `<i class="${i <= lvl ? "on" : ""}"></i>`).join("")}</span><span class="sub">G${lvl} · ${Math.round((m.eng.quality || 0) * 100)}%</span></div>
          <div class="fm-a">${done ? '<span class="sub">maxed</span>' : !r ? "" : planned ? '<span class="chip pin">planned</span>'
            : `<button class="btn small" type="button" data-act="finish" data-src="${esc(f.id + "|" + m.slot)}" data-key="${esc(r.key)}" data-from="${lvl >= max ? max : lvl + 1}" data-to="${max}" title="${lvl >= max ? "Reroll to 100% at G" + max : "Add G" + (lvl + 1) + "–G" + max + " to the plan"}">${lvl >= max ? "Reroll" : "To G" + max}</button>`}</div></li>`; }).join("")}</ul>`);
    }).join("")}</div>`;
  }
  const prettyItem = s => s.replace(/^(hpt|int)_/, "").replace(/_/g, " ");

  function render(){ renderList(); renderPlan(); }

  function init(v){
    V = v;
    const box = $("bp"); if (!box) return;
    const inv = v.inv ? `Materials as of your last login (${dt(v.invAt)}) plus ${nf(v.invDeltas)} change${v.invDeltas === 1 ? "" : "s"} since.` : "No Materials event in these journals, so craftability can't be calculated.";
    box.innerHTML = `
      <p class="note">${inv} Grade pills show how many rolls you can afford right now: <span class="gp ok">G<b>n</b></span> craftable, <span class="gp warn">G<b>n</b></span> affordable but no unlocked engineer at that grade, <span class="gp no">G<b>0</b></span> short on materials.</p>
      <div class="bp-layout">
        <div class="panel bp-browser">
          <div class="bp-tools">
            <input type="search" id="bpQ" placeholder="Search module, blueprint, engineer or material…" aria-label="Search blueprints" value="${esc(state.q)}">
            <div class="seg" id="bpKind">${Object.entries(KINDS).map(([k, l]) => `<button type="button" data-k="${k}" class="${k === state.kind ? "on" : ""}">${l}</button>`).join("")}</div>
            <label class="tog"><input type="checkbox" id="bpCraft" ${state.craftable ? "checked" : ""}> Craftable now</label>
            <label class="tog"><input type="checkbox" id="bpUnl" ${state.unlocked ? "checked" : ""}> Unlocked engineers</label>
            <span class="sub" id="bpCount"></span>
          </div>
          <div class="bp-cats" id="bpCats"><div class="seg">${[["all", "All"], ...Object.entries(CATS)].map(([c, l]) => `<button type="button" data-c="${c}" class="${c === state.cat ? "on" : ""}">${l}</button>`).join("")}</div>
            <button class="linkbtn" type="button" data-act="expand">Expand all</button><button class="linkbtn" type="button" data-act="collapse">Collapse all</button></div>
          <div id="bpList" class="bp-list"></div>
        </div>
        <div class="bp-side">
          ${panel("Engineering plan", `<div id="bpPlan"></div>`)}
        </div>
      </div>`;
    let t; $("bpQ").oninput = e => { clearTimeout(t); t = setTimeout(() => { state.q = e.target.value; renderList(); }, 120); };
    $("bpKind").onclick = e => { const b = e.target.closest("button"); if (!b) return; state.kind = b.dataset.k; box.querySelectorAll("#bpKind button").forEach(x => x.classList.toggle("on", x === b)); renderList(); };
    $("bpCats").onclick = e => { const b = e.target.closest("button[data-c]"); if (!b) return; state.cat = b.dataset.c; renderList(); };
    $("bpCraft").onchange = e => { state.craftable = e.target.checked; renderList(); };
    $("bpUnl").onchange = e => { state.unlocked = e.target.checked; renderList(); };
    const onClick = e => {
      const grp = e.target.closest(".bp-type[data-type]");
      if (grp){ const t = grp.dataset.type; state.types.has(t) ? state.types.delete(t) : state.types.add(t); renderList(); return; }
      const head = e.target.closest(".bp-head");
      if (head){ const key = head.parentElement.dataset.key; state.open.has(key) ? state.open.delete(key) : state.open.add(key); renderList(); return; }
      const a = e.target.closest("[data-act]"); if (!a) return;
      if (a.dataset.act === "pin"){
        const w = a.closest(".bp-add"), key = w.dataset.key, r = recipes.get(key);
        let from = +(w.querySelector('[data-f="from"]')?.value || r.gs[0]), to = +(w.querySelector('[data-f="to"]')?.value || r.gs.at(-1));
        if (from > to) [from, to] = [to, from];
        const num = f => Math.max(1, Math.min(99, +(w.querySelector(`[data-f="${f}"]`)?.value) || 1));
        addToPlan(key, from, to, num("rolls"), num("qty"));
      } else if (a.dataset.act === "unpin") plan.splice(+a.dataset.i, 1);
      else if (a.dataset.act === "qty"){
        const p = plan[+a.dataset.i]; p.qty += +a.dataset.d;
        if (p.qty < p.src.length) p.src.length = Math.max(0, p.qty);       // fewer modules than linked fitted ones: unlink the last
        if (p.qty < 1) plan.splice(+a.dataset.i, 1);
      }
      else if (a.dataset.act === "clear") plan = [];
      else if (a.dataset.act === "expand" || a.dataset.act === "collapse"){
        state.types = a.dataset.act === "expand" ? new Set(list.filter(r => kindGroup(r.k) === state.kind).map(r => r.t)) : new Set();
        renderList(); return;
      }
      else if (a.dataset.act === "finish") addToPlan(a.dataset.key, +a.dataset.from, +a.dataset.to, 1, 1, a.dataset.src);
      else if (a.dataset.act === "shipall")
        a.closest(".panel").querySelectorAll('[data-act="finish"]').forEach(b => addToPlan(b.dataset.key, +b.dataset.from, +b.dataset.to, 1, 1, b.dataset.src));
      save(); render(); renderFitted();
    };
    box.onclick = onClick;
    if ($("bpFitted")) $("bpFitted").onclick = onClick;
    renderFitted(); render();
  }
  return { init, recipes, list, needs, trades, craftable };
})();
