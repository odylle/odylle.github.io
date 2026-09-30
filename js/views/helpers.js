/* ===== Elite History UI ===== */
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const nf = (n, d = 0) => n == null || isNaN(n) ? "–" : Number(n).toLocaleString("en-GB", {minimumFractionDigits:d, maximumFractionDigits:d});
const cr = n => { if (n == null) return "–"; const a = Math.abs(n); return a >= 1e9 ? nf(n/1e9, 2) + " B" : a >= 1e6 ? nf(n/1e6, 1) + " M" : a >= 1e3 ? nf(n/1e3, 0) + " k" : nf(n); };
const dt = t => t ? new Date(t).toLocaleDateString("en-GB", {day:"2-digit", month:"short", year:"numeric"}) : "–";
const pct = (a, b) => b ? Math.round(a / b * 100) + "%" : "–";
const hms = s => { const h = Math.floor(s/3600); return `${nf(h)} h ${Math.floor(s%3600/60)} m`; };

/* ---------- Render helpers ---------- */
const kpi = (label, value, sub, cls = "cyan", unit = "") => `<div class="kpi ${cls}"><div class="l">${label}</div><div class="v">${value}${unit ? `<small>${unit}</small>` : ""}</div>${sub ? `<div class="s">${sub}</div>` : ""}</div>`;
const kv = rows => `<dl class="kv">${rows.filter(Boolean).map(([k, v, sub, hl]) => `<dt>${k}</dt><dd${hl ? ' class="hl"' : ""}>${v}${sub ? `<small>${sub}</small>` : ""}</dd>`).join("")}</dl>`;
function hbars(rows, cls = "cyan", {secondary, fmt = nf} = {}){
  const max = Math.max(1, ...rows.map(r => r[1]));
  return `<div class="hbars">${rows.map(([name, v, v2]) => `<div class="hb ${cls}"><span class="n" title="${esc(name)}">${esc(name)}</span>
    <span class="t"><i style="width:${v / max * 100}%"></i>${secondary ? `<b style="width:${(v2 || 0) / max * 100}%"></b>` : ""}</span>
    <span class="x">${secondary ? `<em>${fmt(v2 || 0)}</em> / ` : ""}${fmt(v)}</span></div>`).join("")}</div>`;
}
const sect = (id, title, body) => `<section id="${id}"><h2>${title}</h2>${body}</section>`;
const panel = (title, body, extra = "") => `<div class="panel" ${extra}>${title ? `<h3>${title}</h3>` : ""}${body}</div>`;

function monthChart(months, key){
  const W = 1000, H = 240, P = {l:44, r:8, t:12, b:26};
  const max = Math.max(1, ...months.map(m => m[key]));
  const step = niceStep(max / 4), top = Math.ceil(max / step) * step;
  const bw = (W - P.l - P.r) / months.length;
  const y = v => P.t + (H - P.t - P.b) * (1 - v / top);
  let g = "";
  for (let v = 0; v <= top; v += step) g += `<line x1="${P.l}" x2="${W - P.r}" y1="${y(v)}" y2="${y(v)}" stroke="#2A2250" stroke-width="1"/><text class="axis" x="${P.l - 6}" y="${y(v) + 4}" text-anchor="end">${v >= 1000 ? nf(v / 1000) + "k" : nf(v)}</text>`;
  const bars = months.map((m, i) => {
    const x = P.l + i * bw, h = H - P.b - y(m[key]);
    const lab = m.k.endsWith("-01") || i === 0 ? `<text class="axis" x="${x + 1}" y="${H - 8}">${m.k.slice(0, 4)}</text><line x1="${x}" x2="${x}" y1="${P.t}" y2="${H - P.b + 4}" stroke="#2A2250" stroke-dasharray="2 3"/>` : "";
    return `${lab}${m[key] ? `<rect x="${x + bw * .15}" y="${y(m[key])}" width="${Math.max(1, bw * .7)}" height="${h}" rx="1" fill="${key === "jumps" ? "#22E4FF" : "#B46BFF"}" filter="url(#glow)"><title>${m.k}: ${nf(m.jumps)} jumps · ${nf(m.ly)} ly</title></rect>` : ""}`;
  }).join("");
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${key === "jumps" ? "Jumps" : "Light years"} per month">
    <defs><filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>${g}${bars}</svg>`;
}
function niceStep(x){ const p = Math.pow(10, Math.floor(Math.log10(x || 1))); const f = x / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; }

const RANKS = {
  Combat:["Harmless","Mostly Harmless","Novice","Competent","Expert","Master","Dangerous","Deadly","Elite"],
  Trade:["Penniless","Mostly Penniless","Peddler","Dealer","Merchant","Broker","Entrepreneur","Tycoon","Elite"],
  Explore:["Aimless","Mostly Aimless","Scout","Surveyor","Trailblazer","Pathfinder","Ranger","Pioneer","Elite"],
  Exobiologist:["Directionless","Mostly Directionless","Compiler","Collector","Cataloguer","Taxonomist","Ecologist","Geneticist","Elite"],
  Soldier:["Defenceless","Mostly Defenceless","Rookie","Soldier","Gunslinger","Warrior","Gladiator","Deadeye","Elite"],
  Empire:["None","Outsider","Serf","Master","Squire","Knight","Lord","Baron","Viscount","Count","Earl","Marquis","Duke","Prince","King"],
  Federation:["None","Recruit","Cadet","Midshipman","Petty Officer","Chief Petty Officer","Warrant Officer","Ensign","Lieutenant","Lt. Commander","Post Commander","Post Captain","Rear Admiral","Vice Admiral","Admiral"]
};
const rankName = (k, v) => { const l = RANKS[k]; if (!l) return v; if (v < l.length) return l[v]; return "Elite " + ["I","II","III","IV","V"][v - 9] ; };
