let zoom = 1, panX = 0, panY = 0, panning = null;
function clampPan() {
    const w = document.getElementById('canvas-wrapper');
    const mx = Math.max(0, (canvas.offsetWidth * zoom - w.clientWidth) / 2 + 60), my = Math.max(0, (canvas.offsetHeight * zoom - w.clientHeight) / 2 + 60);
    panX = Math.max(-mx, Math.min(mx, panX)); panY = Math.max(-my, Math.min(my, panY));
}
function applyView() { clampPan(); canvas.style.transformOrigin = 'center center'; canvas.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`; }
function zoomAt(cx, cy, nz) {
    nz = Math.max(1, Math.min(16, nz));
    const r = document.getElementById('canvas-wrapper').getBoundingClientRect();
    const sx = cx - (r.left + r.width / 2), sy = cy - (r.top + r.height / 2);
    panX = sx - (nz / zoom) * (sx - panX); panY = sy - (nz / zoom) * (sy - panY);
    zoom = nz; applyView();
}
function zoomCenter(f) { const r = document.getElementById('canvas-wrapper').getBoundingClientRect(); zoomAt(r.left + r.width / 2, r.top + r.height / 2, zoom * f); }
function resetView() { zoom = 1; panX = panY = 0; applyView(); }

let touchMode = 0, lastDist = 0, lastMid = null;
const touchInfo = e => {
    const a = e.touches[0], b = e.touches[1];
    return { d: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 };
};
canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    if (e.touches.length === 1) {
        const t = e.touches[0]; touchMode = 1;
        canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: t.clientX, clientY: t.clientY, button: 0, bubbles: true }));
    } else if (e.touches.length === 2) {
        if (touchMode === 1) window.dispatchEvent(new MouseEvent('mouseup'));
        touchMode = 2; const ti = touchInfo(e); lastDist = ti.d; lastMid = { x: ti.x, y: ti.y };
    }
}, { passive: false });
canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    if (touchMode === 1 && e.touches.length === 1) {
        const t = e.touches[0];
        canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: t.clientX, clientY: t.clientY, bubbles: true }));
    } else if (touchMode === 2 && e.touches.length === 2) {
        const ti = touchInfo(e);
        zoomAt(ti.x, ti.y, zoom * (ti.d / (lastDist || ti.d)));
        panX += ti.x - lastMid.x; panY += ti.y - lastMid.y; applyView();
        lastDist = ti.d; lastMid = { x: ti.x, y: ti.y };
    }
}, { passive: false });
const touchEnd = e => {
    if (touchMode === 1) window.dispatchEvent(new MouseEvent('mouseup'));
    if (e.touches.length === 0) touchMode = 0;
};
canvas.addEventListener('touchend', touchEnd); canvas.addEventListener('touchcancel', touchEnd);
window.addEventListener('mousemove', e => { if (panning) { panX += e.clientX - panning.x; panY += e.clientY - panning.y; panning = { x: e.clientX, y: e.clientY }; applyView(); } });
window.addEventListener('mouseup', () => { panning = null; });
window.addEventListener('resize', applyView);

