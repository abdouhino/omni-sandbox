// ===== v23 UI wiring =====
(function initUI() {
    const U = {
        pause: ['.........', '.##...##.', '.##...##.', '.##...##.', '.##...##.', '.##...##.', '.##...##.', '.##...##.'],
        play:  ['#......', '###....', '#####..', '#######', '#######', '#####..', '###....', '#......'],
        step:  ['##...', '.##..', '..##.', '...##', '..##.', '.##..', '##...'],
        minus: ['########', '########'],
        plus:  ['...##...', '...##...', '...##...', '########', '########', '...##...', '...##...', '...##...'],
        undo:  ['...#......', '..##......', '.########.', '..##....##', '...#.....#', '.........#', '........##', '.#######..'],
        trash: ['...###...', '#########', '.#######.', '.#.#.#.#.', '.#.#.#.#.', '.#.#.#.#.', '.#.#.#.#.', '.#.#.#.#.', '.#######.'],
        save:  ['#########', '#.#####.#', '#.#####.#', '#.......#', '#.......#', '#.#####.#', '#.#####.#', '#.#####.#', '#########'],
        zoomin: ['..#####...', '.#.....#..', '#...#...#.', '#..###..#.', '#...#...#.', '.#.....#..', '..#####...', '.......##.', '........##'],
        zoomout:['..#####...', '.#.....#..', '#.......#.', '#..###..#.', '#.......#.', '.#.....#..', '..#####...', '.......##.', '........##'],
        grid:  ['#########', '#...#...#', '#...#...#', '#...#...#', '#########', '#...#...#', '#...#...#', '#...#...#', '#########'],
        help:  ['..####..', '.##..##.', '.##..##.', '....##..', '...##...', '...##...', '........', '...##...'],
        gear:  ['....#....', '.##.#.##.', '.#######.', '..##.##..', '####.####', '..##.##..', '.#######.', '.##.#.##.', '....#....']
    };
    U.redo = U.undo.map(r => Array.from(r).reverse().join(''));
    const svg = rows => {
        const h = rows.length, w = Math.max(...rows.map(r => r.length)); let r = '';
        rows.forEach((row, y) => { for (let x = 0; x < row.length; x++) if (row[x] === '#') r += `<rect x="${x}" y="${y}" width="1" height="1"/>`; });
        return `<svg viewBox="0 0 ${w} ${h}" width="${w * 2}" height="${h * 2}" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`;
    };
    document.querySelectorAll('[data-icon]').forEach(b => { b.innerHTML = svg(U[b.dataset.icon]); });

    document.getElementById('btn-redo').onclick = redo;
    document.getElementById('btn-brush-minus').onclick = () => setBrush(brushSize - 1);
    document.getElementById('btn-brush-plus').onclick = () => setBrush(brushSize + 1);
    const more = document.getElementById('more'), gear = document.getElementById('btn-settings');
    gear.onclick = e => { e.stopPropagation(); more.classList.toggle('open'); };
    document.addEventListener('click', e => { if (more.classList.contains('open') && !more.contains(e.target) && !gear.contains(e.target)) more.classList.remove('open'); });
    const xy = document.getElementById('hud-xy');
    canvas.addEventListener('mousemove', () => { xy.textContent = 'x' + mouseX + ',y' + mouseY; });
    document.body.classList.toggle('paused', isPaused);
    if (window.ResizeObserver) new ResizeObserver(() => resizeCanvas()).observe(document.getElementById('canvas-wrapper'));
    refreshButtons(); applyStaticText(); renderPalette(document.getElementById('search-box').value);
})();
requestAnimationFrame(loop);

