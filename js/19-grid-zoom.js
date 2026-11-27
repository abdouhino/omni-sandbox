// ===== Pixel grid overlay + zoom controls =====
(function () {
    const wrap = document.getElementById('canvas-wrapper');
    const gc = document.getElementById('grid-overlay'), g = gc.getContext('2d');
    let gridOn = false, lastKey = '';
    window.isGridOn = () => gridOn;

    function setGrid(on) {
        gridOn = on; lastKey = '';
        document.getElementById('btn-grid').classList.toggle('on', on);
        if (typeof flash === 'function') flash(on ? 'Pixel grid ON (G)' : 'Pixel grid OFF (G)');
    }
    function drawGrid() {
        const wr = wrap.getBoundingClientRect(), cr = canvas.getBoundingClientRect();
        const key = [gridOn, wr.width | 0, wr.height | 0, cr.left.toFixed(1), cr.top.toFixed(1), cr.width.toFixed(1)].join();
        if (key === lastKey) return; lastKey = key;
        if (gc.width !== (wr.width | 0)) gc.width = wr.width | 0;
        if (gc.height !== (wr.height | 0)) gc.height = wr.height | 0;
        g.clearRect(0, 0, gc.width, gc.height);
        if (!gridOn) return;
        const cell = cr.width / WIDTH, ox = cr.left - wr.left, oy = cr.top - wr.top;
        // Minor lines only when cells are big enough to read; major lines every 10 cells otherwise.
        const step = cell >= 5 ? 1 : 10;
        g.save(); g.beginPath(); g.rect(Math.max(0, ox), Math.max(0, oy), Math.min(cr.width, gc.width), Math.min(cr.height, gc.height)); g.clip();
        for (let pass = 0; pass < 2; pass++) {
            g.beginPath();
            for (let x = 0; x <= WIDTH; x += step) { if ((x % 10 === 0) !== (pass === 1)) continue; const px = Math.round(ox + x * cell) + .5; g.moveTo(px, oy); g.lineTo(px, oy + cr.height); }
            for (let y = 0; y <= HEIGHT; y += step) { if ((y % 10 === 0) !== (pass === 1)) continue; const py = Math.round(oy + y * cell) + .5; g.moveTo(ox, py); g.lineTo(ox + cr.width, py); }
            g.strokeStyle = pass ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,.14)'; g.lineWidth = 1; g.stroke();
        }
        g.restore();
    }
    const zl = document.getElementById('hud-zoom');
    function tick() {
        drawGrid();
        const eff = (canvas.getBoundingClientRect().width / WIDTH);
        const txt = 'zoom x' + (zoom).toFixed(1) + ' (' + eff.toFixed(1) + ' px/cell)';
        if (zl.textContent !== txt) zl.textContent = txt;
        requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    document.getElementById('btn-zoom-in').onclick = () => zoomCenter(1.5);
    document.getElementById('btn-zoom-out').onclick = () => zoomCenter(1 / 1.5);
    document.getElementById('btn-zoom-reset').onclick = () => resetView();
    document.getElementById('btn-grid').onclick = () => setGrid(!gridOn);
    window.addEventListener('keydown', e => {
        if (e.target && e.target.tagName === 'INPUT' && e.target.type === 'text') return;
        if (!e.ctrlKey && !e.metaKey && e.key.toLowerCase() === 'g') setGrid(!gridOn);
    });
})();
