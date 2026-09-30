/* ===== CMDR History: state, loading and boot (load last) ===== */
let views = [], V = null, mapState = null;

/* ---------- Loading ---------- */
const IDB = {
  db(){ return new Promise((res, rej) => { const r = indexedDB.open("elite-history", 1); r.onupgradeneeded = () => r.result.createObjectStore("h"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); },
  async get(k){ try { const d = await this.db(); return await new Promise(res => { const q = d.transaction("h").objectStore("h").get(k); q.onsuccess = () => res(q.result); q.onerror = () => res(null); }); } catch { return null; } },
  async set(k, v){ try { const d = await this.db(); d.transaction("h", "readwrite").objectStore("h").put(v, k); } catch {} }
};

const COMPANIONS = /^(Cargo|ShipLocker|Market)\.json$/i;
async function processFiles(files, label){
  const companions = files.filter(f => COMPANIONS.test(f.name));
  files = files.filter(f => EH.isJournal(f.name)).sort((a, b) => EH.fileKey(a.name) < EH.fileKey(b.name) ? -1 : 1);
  if (!files.length){ status("No Journal.*.log files found in that selection."); return; }
  setBusy(true);
  const aggs = new Map(); const t0 = performance.now(); let bytes = 0;
  for (let i = 0; i < files.length; i++){
    const text = await files[i].text(); bytes += files[i].size;
    EH.ingestText(aggs, text);
    $("progress").style.width = ((i + 1) / files.length * 100) + "%";
    if (i % 8 === 0){ status(`Parsing ${i + 1} / ${files.length}…`); await new Promise(r => setTimeout(r)); }
  }
  for (const f of companions) EH.ingestCompanion(aggs, f.name, await f.text());
  views = [...aggs.values()].map(EH.finalize).sort((a, b) => b.jumps - a.jumps);
  if (!views.length){ status("Journals read, but no commander data found."); setBusy(false); return; }
  const secs = ((performance.now() - t0) / 1000).toFixed(1);
  status(`<i class="live"></i>${files.length} journals · ${nf(bytes / 1048576, 1)} MB · ${secs}s${label ? " · " + esc(label) : ""}`, true);
  $("cmdrSel").innerHTML = views.length > 1 ? `<select id="cmdrPick" aria-label="Commander">${views.map((v, i) => `<option value="${i}">CMDR ${esc(v.cmdr)}</option>`).join("")}</select>` : "";
  if (views.length > 1) $("cmdrPick").onchange = e => show(views[+e.target.value]);
  $("loader").classList.add("compact");
  setBusy(false);
  show(views[0]);
}
function status(html, raw){ $("status").innerHTML = raw ? html : esc(html); }
function setBusy(b){ $("pick").disabled = b; $("rescan").disabled = b; }

async function filesFromHandle(h){
  const out = [];
  for await (const [name, entry] of h.entries()) if (entry.kind === "file" && (EH.isJournal(name) || COMPANIONS.test(name))) out.push(await entry.getFile());
  return out;
}
$("pick").onclick = async () => {
  if (!window.showDirectoryPicker){ $("files").click(); return; }
  try {
    const h = await window.showDirectoryPicker({id:"ed-journals", mode:"read"});
    IDB.set("dir", h); $("rescan").hidden = false; $("rescan").textContent = `Rescan “${h.name}”`;
    await processFiles(await filesFromHandle(h), h.name);
  } catch (e){ if (e.name !== "AbortError") status("Could not open folder: " + e.message); setBusy(false); }
};
$("rescan").onclick = async () => {
  const h = await IDB.get("dir"); if (!h) return;
  try {
    if ((await h.queryPermission({mode:"read"})) !== "granted" && (await h.requestPermission({mode:"read"})) !== "granted") return status("Read permission was not granted.");
    await processFiles(await filesFromHandle(h), h.name);
  } catch (e){ status("Rescan failed: " + e.message + " — use Open journal folder."); setBusy(false); }
};
$("files").onchange = e => processFiles([...e.target.files], "");
document.addEventListener("dragover", e => { e.preventDefault(); $("loader").classList.add("drop"); });
document.addEventListener("dragleave", e => { if (!e.relatedTarget) $("loader").classList.remove("drop"); });
document.addEventListener("drop", e => { e.preventDefault(); $("loader").classList.remove("drop"); processFiles([...e.dataTransfer.files], "dropped files"); });
(async () => {
  if (!window.showDirectoryPicker) $("pick").textContent = "Select journal folder";
  const h = await IDB.get("dir");
  if (h && h.name){ $("rescan").hidden = false; $("rescan").textContent = `Rescan “${h.name}”`; }
})();

/* ---------- Views: History / Engineering (hash routed, one parse for both) ---------- */
const NAV = {
  history:[["Commander", [["overview","Overview"],["credits","Credits"]]],
    ["Journey", [["travel","Travel"],["map","Map"],["exploration","Exploration"],["exobiology","Exobiology"],["surface","Surface"],["stations","Stations"]]],
    ["Fleet", [["fleet","Fleet"],["carrier","Carrier"],["crew","Crew"]]],
    ["Activity", [["powerplay","Powerplay"],["combat","Combat"],["engineering","Engineering"],["industry","Mining"]]],
    ["Records", [["lifetime","Lifetime"]]]],
  engineering:[["Workshop", [["blueprints","Blueprints"],["fitted","Fitted"]]],
    ["Contacts", [["engineers","Engineers"]]],
    ["Inventory", [["materials","Materials"]]]]
};
const viewFromHash = () => location.hash.startsWith("#/engineering") ? "engineering" : "history";
let curView = null;
function setView(name, scroll = true){
  const changed = curView !== name; curView = name;
  $("out").hidden = name !== "history"; $("eng").hidden = name !== "engineering";
  document.querySelectorAll(".viewbar [data-view]").forEach(a => { const on = a.dataset.view === name; a.classList.toggle("on", on); a.setAttribute("aria-selected", on); });
  $("nav").innerHTML = NAV[name].map(([g, items]) => `<span class="grp">${g}</span>` + items.map(([id, l]) => `<a href="#${id}">${l}</a>`).join("")).join("");
  document.title = name === "engineering" ? `Engineering · ${APP.name}` : APP.name;
  navSpy(name === "history" ? $("out") : $("eng"));
  if (scroll && changed && $("app").getBoundingClientRect().top < 0) $("app").scrollIntoView({block:"start"});
}
// Section links scroll without touching the hash, which holds the view.
$("nav").addEventListener("click", e => {
  const a = e.target.closest("a[href^='#']"); if (!a) return;
  e.preventDefault(); document.getElementById(a.getAttribute("href").slice(1))?.scrollIntoView({block:"start"});
});
addEventListener("hashchange", () => { if (!$("app").hidden && (!location.hash || location.hash.startsWith("#/"))) setView(viewFromHash()); });

/* ---------- Version footer ---------- */
$("ver").innerHTML = `${esc(APP.name)} v${esc(APP.version)} · ${esc(APP.released)} · <a href="${APP.repo}/blob/main/CHANGELOG.md" target="_blank" rel="noopener">changelog</a> · <a href="${APP.repo}" target="_blank" rel="noopener">source</a>`;
