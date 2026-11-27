// ===== Tutorial / challenges =====
(function () {
    const KEY = 'omni_challenges_v1';
    const panel = document.getElementById('challenges'), list = document.getElementById('ch-list');
    let done = new Set(), seen = false;
    try { const s = JSON.parse(localStorage.getItem(KEY) || '{}'); done = new Set(s.done || []); seen = !!s.seen; } catch (e) {}
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ done: [...done], seen: true })); } catch (e) {} };

    // Each challenge is checked against the live world every few hundred ms.
    const CH = [
        { id: 'draw',  title: 'Draw something', hint: 'Pick a material in the list on the right (try Sand), then click and drag on the canvas.', test: c => c.total >= 80 },
        { id: 'sand',  title: 'Build a sand pile', hint: 'Select Sand and pour from above. Wheel over the canvas changes the brush size.', test: c => c.n(ID.SAND) >= 300 },
        { id: 'water', title: 'Add some water', hint: 'Open the Liquids category and pick Water. Try dropping it from high up to see it splash.', test: c => c.n(ID.WATER) >= 150 },
        { id: 'boil',  title: 'Boil water into steam', hint: 'Draw water, then pick the red Heat tool at the top and hold it over the water.', test: c => c.n(ID.STEAM) >= 3 },
        { id: 'ice',   title: 'Freeze water into ice', hint: 'Use the blue Cool tool on water. Cooling it below 0 C turns it to ice.', test: c => c.n(ID.ICE) >= 5 },
        { id: 'fire',  title: 'Start a fire', hint: 'Place Wood or Plant, then add Fire (Gas / Energy category) or use the Heat tool.', test: c => c.n(ID.FIRE) >= 15 },
        { id: 'led',   title: 'Light an LED', hint: 'Place a Battery, link it with Copper wire to an LED (Electricity category). Touch every piece in a line.', test: c => c.ledLit },
        { id: 'zoom',  title: 'Zoom in and show the pixel grid', hint: 'Use the magnifier + button (or Ctrl + mouse wheel) to zoom, and the grid button (or G) for the pixel grid. Middle-click and drag to pan.', test: c => zoom >= 3 && window.isGridOn && window.isGridOn() }
    ];

    function census() {
        const cnt = new Map(); let total = 0, ledLit = false;
        for (let i = 0; i < size; i++) {
            const v = grid[i]; if (!v) continue;
            total++; cnt.set(v, (cnt.get(v) || 0) + 1);
            if ((v === ID.LED || v === ID.LAMP) && lifeGrid[i] > 0) ledLit = true;
        }
        return { total, ledLit, n: id => cnt.get(id) || 0 };
    }
    function render() {
        const cur = CH.find(c => !done.has(c.id));
        list.innerHTML = CH.map(c => `<div class="ch-item${done.has(c.id) ? ' done' : ''}${cur === c ? ' cur' : ''}"><span class="ck">${done.has(c.id) ? '✓' : ''}</span><div><div class="tt">${c.title}</div><div class="hh">${c.hint}</div></div></div>`).join('');
        document.getElementById('ch-title').textContent = `CHALLENGES ${done.size}/${CH.length}`;
        document.getElementById('ch-bar-fill').style.width = (done.size / CH.length * 100) + '%';
        document.getElementById('btn-challenges').classList.toggle('on', !panel.hidden);
    }
    function check() {
        if (typeof isPaused !== 'undefined' && document.hidden) return;
        const c = census(); let changed = false;
        for (const ch of CH) if (!done.has(ch.id) && ch.test(c)) {
            done.add(ch.id); changed = true;
            if (typeof flash === 'function') flash('Challenge complete: ' + ch.title);
            if (typeof sfx === 'function') sfx('blip');
        }
        if (changed) { save(); render(); if (done.size === CH.length && typeof flash === 'function') setTimeout(() => flash('All challenges complete! Keep experimenting.'), 2200); }
    }
    function toggle(show) { panel.hidden = show === undefined ? !panel.hidden : !show; render(); }
    document.getElementById('btn-challenges').onclick = () => toggle();
    document.getElementById('ch-close').onclick = () => toggle(false);
    document.getElementById('ch-reset').onclick = () => { done = new Set(); save(); render(); };
    render();
    if (!seen) { toggle(true); save(); }   // first launch: open the guide
    setInterval(check, 500);
    window.omniChallenges = { check, done: () => [...done] };
})();
