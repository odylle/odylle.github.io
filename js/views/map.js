/* ---------- Galaxy map (canvas) ---------- */
function initMap(v){
  const cv = $("galaxy"), box = $("mapbox"), ctx = cv.getContext("2d");
  const pts = v.route; if (!pts.length){ box.innerHTML = `<div class="empty">No positions in these journals.</div>`; return; }
  const t0 = pts[0][3], t1 = pts.at(-1)[3] || t0 + 1;
  const sys = v.systems.filter(s => s.pos);
  const stops = [[106,59,184],[34,228,255],[255,46,136]];
  const colAt = f => { const s = f < .5 ? 0 : 1, u = f < .5 ? f * 2 : (f - .5) * 2, a = stops[s], b = stops[s + 1]; return `rgb(${a.map((x, i) => Math.round(x + (b[i] - x) * u)).join(",")})`; };
  const cols = pts.map(p => colAt((p[3] - t0) / (t1 - t0 || 1)));
  const st = mapState = {cx:0, cz:0, s:1, line:true, W:0, H:0};

  function fit(bounds){
    const [x0, x1, z0, z1] = bounds, pad = 40;
    st.cx = (x0 + x1) / 2; st.cz = (z0 + z1) / 2;
    st.s = Math.min((st.W - pad * 2) / Math.max(x1 - x0, 50), (st.H - pad * 2) / Math.max(z1 - z0, 50));
    draw();
  }
  const routeBounds = () => { let x0 = 0, x1 = 0, z0 = 0, z1 = 0; for (const p of pts){ x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[2]); z1 = Math.max(z1, p[2]); } return [x0, x1, z0, z1]; };
  const sx = x => st.W / 2 + (x - st.cx) * st.s, sy = z => st.H / 2 - (z - st.cz) * st.s;

  function resize(){
    const r = box.getBoundingClientRect(), d = window.devicePixelRatio || 1;
    const first = !st.W; st.W = r.width; st.H = r.height;
    cv.width = r.width * d; cv.height = r.height * d; ctx.setTransform(d, 0, 0, d, 0, 0);
    first ? fit(routeBounds()) : draw();
  }
  function draw(){
    const {W, H, s} = st;
    ctx.clearRect(0, 0, W, H);
    // galaxy glow around Sagittarius A*
    const gx = sx(25), gz = sy(25900), gr = 45000 * s;
    if (gr > 4){
      const g = ctx.createRadialGradient(gx, gz, 0, gx, gz, gr);
      g.addColorStop(0, "rgba(180,107,255,.22)"); g.addColorStop(.25, "rgba(120,70,200,.10)"); g.addColorStop(1, "rgba(34,20,80,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(gx, gz, gr, 0, 7); ctx.fill();
    }
    // grid
    const raw = 90 / s; const step = niceStep(raw);
    ctx.strokeStyle = "rgba(42,34,80,.55)"; ctx.lineWidth = 1; ctx.beginPath();
    const xa = Math.floor((st.cx - W / 2 / s) / step) * step, za = Math.floor((st.cz - H / 2 / s) / step) * step;
    for (let x = xa; sx(x) < W; x += step){ ctx.moveTo(Math.round(sx(x)) + .5, 0); ctx.lineTo(Math.round(sx(x)) + .5, H); }
    for (let z = za; sy(z) > 0; z += step){ ctx.moveTo(0, Math.round(sy(z)) + .5); ctx.lineTo(W, Math.round(sy(z)) + .5); }
    ctx.stroke();
    $("scale").textContent = `grid ${nf(step)} ly`;
    // route line
    if (st.line){
      ctx.lineWidth = 1;
      for (let i = 1; i < pts.length; i++){
        const a = pts[i - 1], b = pts[i];
        if (Math.hypot(b[0] - a[0], b[2] - a[2]) > 600 && !b[5]) continue; // skip teleports (e.g. journal gaps)
        ctx.strokeStyle = b[5] ? "rgba(255,194,61,.55)" : "rgba(34,228,255,.28)";
        ctx.setLineDash(b[5] ? [4, 4] : []);
        ctx.beginPath(); ctx.moveTo(sx(a[0]), sy(a[2])); ctx.lineTo(sx(b[0]), sy(b[2])); ctx.stroke();
      }
      ctx.setLineDash([]);
    }
    // stars
    ctx.shadowBlur = 8;
    const r = Math.max(1.2, Math.min(3, s * 4));
    for (let i = 0; i < pts.length; i++){
      const x = sx(pts[i][0]), y = sy(pts[i][2]); if (x < -5 || y < -5 || x > W + 5 || y > H + 5) continue;
      ctx.fillStyle = ctx.shadowColor = cols[i]; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    }
    ctx.shadowBlur = 0;
    // reference markers
    ctx.font = "12px 'IBM Plex Mono', Consolas, monospace";
    for (const [name, p] of Object.entries(EH.REF)){
      const x = sx(p[0]), y = sy(p[2]); if (x < -50 || y < -20 || x > W + 50 || y > H + 20) continue;
      ctx.strokeStyle = ctx.fillStyle = "#FFC23D"; ctx.shadowColor = "#FFC23D"; ctx.shadowBlur = 6; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(x - 6, y); ctx.lineTo(x + 6, y); ctx.moveTo(x, y - 6); ctx.lineTo(x, y + 6); ctx.stroke();
      ctx.shadowBlur = 0; ctx.fillText(name, x + 9, y - 7);
    }
    // current position
    const last = pts.at(-1), lx = sx(last[0]), ly = sy(last[2]);
    ctx.strokeStyle = "#39FFA0"; ctx.shadowColor = "#39FFA0"; ctx.shadowBlur = 10; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(lx, ly, 9, 0, 7); ctx.stroke(); ctx.shadowBlur = 0;
  }

  // interaction
  let drag = null;
  cv.onpointerdown = e => { drag = {x:e.clientX, y:e.clientY, cx:st.cx, cz:st.cz}; cv.setPointerCapture(e.pointerId); cv.classList.add("drag"); };
  cv.onpointerup = cv.onpointercancel = () => { drag = null; cv.classList.remove("drag"); };
  cv.onpointermove = e => {
    if (drag){ st.cx = drag.cx - (e.clientX - drag.x) / st.s; st.cz = drag.cz + (e.clientY - drag.y) / st.s; draw(); $("tip").style.display = "none"; return; }
    const r = cv.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
    let best = null, bd = 10;
    for (const s of sys){ const d = Math.hypot(sx(s.pos[0]) - mx, sy(s.pos[2]) - my); if (d < bd){ bd = d; best = s; } }
    const tip = $("tip");
    if (best){
      tip.innerHTML = `<b>${esc(best.name)}</b><br>${nf(Math.hypot(...best.pos))} ly from Sol · first ${dt(best.first)}${best.visits > 1 ? ` · ${best.visits} arrivals` : ""}`;
      tip.style.display = "block";
      tip.style.left = Math.min(mx + 14, st.W - tip.offsetWidth - 8) + "px"; tip.style.top = Math.max(8, my - 44) + "px";
    } else tip.style.display = "none";
  };
  cv.onpointerleave = () => { $("tip").style.display = "none"; };
  cv.addEventListener("wheel", e => {
    e.preventDefault();
    const r = cv.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
    const wx = st.cx + (mx - st.W / 2) / st.s, wz = st.cz - (my - st.H / 2) / st.s;
    st.s = Math.min(200, Math.max(0.002, st.s * Math.exp(-e.deltaY * 0.0015)));
    st.cx = wx - (mx - st.W / 2) / st.s; st.cz = wz + (my - st.H / 2) / st.s; draw();
  }, {passive:false});
  cv.onkeydown = e => {
    const k = {ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,1],ArrowDown:[0,-1]}[e.key];
    if (k){ e.preventDefault(); st.cx += k[0] * 60 / st.s; st.cz += k[1] * 60 / st.s; draw(); }
    if (e.key === "+" || e.key === "="){ st.s *= 1.25; draw(); } if (e.key === "-"){ st.s /= 1.25; draw(); }
  };
  $("mFit").onclick = () => fit(routeBounds());
  $("mGal").onclick = () => fit([-42000, 42000, -18000, 68000]);
  $("mLine").onclick = () => { st.line = !st.line; $("mLine").style.opacity = st.line ? 1 : .5; draw(); };
  new ResizeObserver(resize).observe(box);
}
