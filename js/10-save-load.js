const SLOT_COUNT = 5; let currentSlot = 1;
function packWorld() {
    return { v: 4, g: rle(grid), sol:rle(solutionGrid), ph:rle(Int16Array.from(phGrid, v=>Math.round(v*10))), lf: rle(lifeGrid), mt: rle(metaGrid), sk: rle(skin), mx: rle(mix), hg: rle(hungerGrid), tg: rle(thirstGrid),
             t: rle(Int16Array.from(T, v => Math.round(v))), ck: rle(Int16Array.from(cookGrid, v => Math.round(v))) };
}
function unpackWorld(s) {
    if (!s || !['g', 'lf', 'mt', 't', 'ck'].every(k => Array.isArray(s[k]))) throw new Error('invalid save');
    unrle(s.g, grid); unrle(s.lf, lifeGrid); unrle(s.mt, metaGrid);
    if(s.sol) unrle(s.sol, solutionGrid); else solutionGrid.fill(0);
    if(s.ph) { const p10=new Int16Array(size); unrle(s.ph,p10); for(let q=0;q<size;q++) phGrid[q]=p10[q]/10; } else phGrid.fill(7);
    const t16 = new Int16Array(size); unrle(s.t, t16); T.set(t16);
    const c16 = new Int16Array(size); unrle(s.ck, c16); cookGrid.set(c16);
    if (s.cv) unrle(s.cv, colorVar);
    else for (let i = 0; i < size; i++) { const el = EL_BY_ID[grid[i]]; colorVar[i] = el && el.var ? Math.floor((Math.random() - 0.5) * el.var * 2) : 0; }
    if (s.sk) unrle(s.sk, skin); else skin.fill(0);
    if (s.mx) unrle(s.mx, mix); else mix.fill(0);
    if (s.hg) unrle(s.hg, hungerGrid); else hungerGrid.fill(0); if (s.tg) unrle(s.tg, thirstGrid); else thirstGrid.fill(0);
    airO2.fill(1);
    for (let i = 0; i < size; i++) {
        if (!EL_BY_ID[grid[i]]) { grid[i] = 0; lifeGrid[i] = 0; metaGrid[i] = 0; skin[i] = 0; colorVar[i] = 0; }
        else if (grid[i] === ID.CLONE && metaGrid[i] && !EL_BY_ID[metaGrid[i]]) metaGrid[i] = 0;
    }
    vel.fill(0); Pair.fill(0); airMax = 0; sp.fill(0); updated.fill(0); mechDirty = true;
}
function makeThumb() {
    const c = document.createElement('canvas'); c.width = 136; c.height = 84;
    c.getContext('2d').drawImage(canvas, 0, 0, 136, 84); return c.toDataURL('image/jpeg', 0.6);
}
function countCells() { let n = 0; for (let i = 0; i < size; i++) if (grid[i]) n++; return n; }
const slotKey = n => 'omni_slot_' + n;
function writeSlot(key, quiet) {
    try {
        localStorage.setItem(key, JSON.stringify({ date: Date.now(), count: countCells(), thumb: makeThumb(), data: packWorld() }));
        return true;
    } catch (e) { if (!quiet) flash(t('save.full')); return false; }
}
function saveSlot(n) { if (writeSlot(slotKey(n))) { currentSlot = n; sfx('blip'); flash(t('save.done', { n })); renderSlots(); } }
function loadKey(key, label) {
    try {
        const s = JSON.parse(localStorage.getItem(key)); if (!s) return flash(t('save.empty'));
        const before = snap(); unpackWorld(s.data); undoStack.push(before); if (undoStack.length > 12) undoStack.shift(); redoStack.length = 0;
        sfx('blip'); flash(t('save.loaded', { label }));
    } catch (e) { flash(t('save.loadFail')); }
}
function loadSlot(n) { currentSlot = n; loadKey(slotKey(n), t('slot.n', { n })); }
function doSave() { saveSlot(currentSlot); }
function doLoad() { loadSlot(currentSlot); }
function renderSlots() {
    const box = document.getElementById('slots'); box.innerHTML = '';
    const keys = [['omni_slot_auto', t('slot.auto'), 0]];
    for (let n = 1; n <= SLOT_COUNT; n++) keys.push([slotKey(n), t('slot.n', { n }), n]);
    keys.forEach(([key, label, n]) => {
        let s = null; try { s = JSON.parse(localStorage.getItem(key)); } catch (e) {}
        const div = document.createElement('div'); div.className = 'slot' + (n === currentSlot ? ' cur' : '');
        div.innerHTML = (s ? `<img src="${esc(s.thumb)}" alt="">` : '<div class="noimg"></div>') +
            `<div class="meta"><b>${esc(label)}</b><br>${s ? esc(new Date(s.date).toLocaleString()) + '<br>' + esc(t('slot.particles', { n: s.count })) : esc(t('slot.empty'))}</div><div class="acts"></div>`;
        const acts = div.querySelector('.acts');
        const mk = (txt, fn, cls) => { const b = document.createElement('button'); b.className = 'pbtn' + (cls ? ' ' + cls : ''); b.textContent = txt; b.onclick = fn; acts.appendChild(b); };
        if (n > 0) mk(t('slot.saveHere'), () => saveSlot(n));
        if (s) mk(t('slot.load'), () => { loadKey(key, label); if (n > 0) currentSlot = n; closeModal(); });
        if (s && n > 0) mk(t('slot.delete'), () => { localStorage.removeItem(key); renderSlots(); }, 'danger');
        box.appendChild(div);
    });
}
function openModal() { renderSlots(); document.getElementById('save-modal').classList.add('show'); }
function closeModal() { document.getElementById('save-modal').classList.remove('show'); }
function exportFile() {
    const blob = new Blob([JSON.stringify({ app: 'omni-sandbox', date: Date.now(), data: packWorld() })], { type: 'application/json' });
    const a = document.createElement('a'), d = new Date(), p = v => String(v).padStart(2, '0');
    a.href = URL.createObjectURL(blob); a.download = `omni-sandbox-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.json`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    flash(t('save.exported'));
}
function importText(text) {
    try { const o = JSON.parse(text), before = snap(); unpackWorld(o.data || o); undoStack.push(before); if (undoStack.length > 12) undoStack.shift(); redoStack.length = 0; flash(t('save.imported')); closeModal(); }
    catch (e) { flash(t('save.invalid')); }
}

