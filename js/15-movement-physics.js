// Angle of repose per powder: 0 = normal (45 deg), 1 = cohesive/steep, 2 = free-flowing (flatter), 3 = very flat (round beads)
const REPOSE = new Uint8Array(1024);
(function () {
    const set = (lvl, names) => names.split(' ').forEach(k => { if (ID[k] !== undefined) REPOSE[ID[k]] = lvl; });
    set(1, 'FLOUR COCOA DOUGH SNOW PACKED_SNOW DIRT CLAY CLAY_SOIL FERTILE_SOIL PASTE BUTTER CEMENT WET_SAND PACKED_SAND LIME QUICKLIME ASH DUST MULCH SAWDUST CELLULOSE COFFEE_GROUND PEPPER PAPRIKA CINNAMON CRUMB TINDER STRAW FIBER PARTICLEBOARD');
    set(2, 'SAND SALT SUGAR COLOR_SAND BAKING_SODA GUNPOWDER SEED SEEDS CORN OATS BORAX EPSOM_SALT POTASSIUM_SALT FALLOUT SULFUR COAL');
    set(3, 'BEAD GLITTER RICE');
})();
const NDX = [0, 0, -1, 1], NDY = [-1, 1, 0, 0];
function movePowder(x, y, i, id, el, dirG) {
    const ny = y + dirG;
    if (inBounds(x, ny)) {
        const bi = ny * WIDTH + x, belowId = grid[bi], belowEl = EL_BY_ID[belowId];
        let handled = false;
        if (belowId === 0) {
            // Each grain gets its own random fall speed so a poured block breaks
            // up into ragged streaks instead of dropping as one rigid slab.
            let n = 1 + (vel[i] >> 3) + (vel[i] > 1 && Math.random() < 0.4 ? 1 : 0), ti = bi;
            if (n > 3) n = 3;
            for (let k = 1; k < n; k++) {
                const yy = ny + dirG * k;
                if (yy < 0 || yy >= HEIGHT) break;
                const ci = yy * WIDTH + x;
                if (grid[ci] !== 0) break;
                ti = ci;
            }
            swapCells(i, ti);
            if (vel[ti] < 24) vel[ti]++;
            handled = true;
        } else if ((belowEl.type === 'liquid' || belowEl.type === 'gas') && el.density > belowEl.density) {
            if (belowEl.type === 'gas' || Math.random() < VISC[belowId] * 0.8 + 0.15) { swapCells(i, bi); if (vel[bi] > 3) vel[bi] = 3; }
            handled = true;
        }
        if (!handled) {
            const fv = vel[i];
            if (fv) {
                const fr = FRAG[belowId], brk = BREAK[belowId];
                if (fr && brk && fv * el.density >= fr && Math.random() < 0.6) { setCell(x, ny, brk[1]); if (belowId === GLASS_ID) sfx('glass'); }
                vel[i] = 0;
            }
            // Pâtes : dures et rigides crues (tas raides), de plus en plus molles à mesure qu'elles cuisent.
            let slipP = SLIP[id], rp = REPOSE[id];
            if (id === ID.PASTA) {
                const soft = Math.min(1, cookGrid[i] / 90);
                slipP = 0.08 + 0.7 * soft; rp = soft > 0.75 ? 2 : 1;
            } else if (id === ID.COOKED_PASTA) { slipP = 0.92; rp = 2; }
            if (Math.random() < slipP) {
                const dir = Math.random() < 0.5 ? -1 : 1;
                for (let q = 0; q < 2; q++) {
                    const sd = q ? -dir : dir, tx = x + sd;
                    if (tx < 0 || tx >= WIDTH) continue;
                    const di = ny * WIDTH + tx, did = grid[di];
                    if (did === 0 || (TCLS[did] === 2 && el.density > EL_BY_ID[did].density)) {
                        // Cohesive powders only slide when the target is a real drop (2 cells deep): steeper piles.
                        if (rp === 1) {
                            const yy = ny + dirG;
                            if (yy < 0 || yy >= HEIGHT || grid[yy * WIDTH + tx] !== 0) continue;
                        }
                        let dest = di;
                        // Free-flowing powders keep sliding along the slope: flatter piles.
                        if (rp >= 2) {
                            const extra = rp === 2 ? 1 : 5, keep = rp === 2 ? 0.6 : 0.9;
                            for (let e = 1; e <= extra; e++) {
                                const ex = tx + sd * e;
                                if (ex < 0 || ex >= WIDTH || grid[ny * WIDTH + ex] !== 0 || Math.random() > keep) break;
                                dest = ny * WIDTH + ex;
                            }
                        }
                        swapCells(i, dest); break;
                    }
                }
            }
        }
    }
    
}
function moveLiquid(x, y, i, id, el, dirG) {
    let mob = VISC[id];
    if (id === LAVA_ID) { const tl = T[i]; mob = 0.12 + (tl < 650 ? 0 : (tl > 1300 ? 1 : (tl - 650) / 650)) * 0.43; }
    else if (THV[id]) { mob *= 1 + Math.max(-0.4, Math.min(2.5, (T[i] - AMBIENT) / THV[id])); if (mob > 1) mob = 1; }
    if (mob < 1 && fr() > mob) return;
    if (x > 0 && x < WIDTH - 1 && y > 0 && y < HEIGHT - 1 && grid[i - 1] === id && grid[i + 1] === id && grid[i - WIDTH] === id && grid[i + WIDTH] === id && fr() < 0.75) {
        const dz = T[i] - T[i + dirG * WIDTH];
        if (dz < 0.8 && dz > -0.8) return;
    }
    const ny = y + dirG;
    let moved = false;
    if (inBounds(x, ny)) {
        const bi = ny * WIDTH + x, belowId = grid[bi], belowEl = EL_BY_ID[belowId];
        if (belowId === 0) {
            let n = 1 + (vel[i] >> 3), ti = bi;
            if (n > 3) n = 3;
            for (let k = 1; k < n; k++) {
                const yy = ny + dirG * k;
                if (yy < 0 || yy >= HEIGHT) break;
                const ci = yy * WIDTH + x;
                if (grid[ci] !== 0) break;
                ti = ci;
            }
            swapCells(i, ti);
            if (vel[ti] < 24) vel[ti]++;
            moved = true;
        } else if ((belowEl.type === 'liquid' || belowEl.type === 'gas') && el.density > belowEl.density) {
            if (belowEl.type === 'gas' || fr() < 0.3 + 0.7 * VISC[belowId]) { swapCells(i, bi); if (vel[bi] > 3) vel[bi] = 3; moved = true; }
        } else if (belowEl.type === 'liquid') {
            const dT = T[i] - T[bi];
            if ((dT > 0.8 || dT < -0.8) && el.density - belowEl.density > -0.3 && fr() < 0.5) {
                let ta = T[i] - AMBIENT, tb = T[bi] - AMBIENT;
                ta = ta > 300 ? 300 : (ta < -100 ? -100 : ta); tb = tb > 300 ? 300 : (tb < -100 ? -100 : tb);
                if (el.density - ta * EXPAN[id] > belowEl.density - tb * EXPAN[belowId] + 0.004) { swapCells(i, bi); moved = true; }
            }
        }
        if (!moved) {
            const sd = fr() < 0.5 ? -1 : 1, rb = ny * WIDTH;
            let tx = x + sd;
            if (tx >= 0 && tx < WIDTH && grid[rb + tx] === 0) { swapCells(i, rb + tx); moved = true; }
            else { tx = x - sd; if (tx >= 0 && tx < WIDTH && grid[rb + tx] === 0) { swapCells(i, rb + tx); moved = true; } }
        }
    }
    if (!moved) {
        const fv = vel[i];
        vel[i] = 0;
        // Splash: a liquid that lands after a long fall throws itself up and sideways as a droplet.
        if (fv >= 9 && fr() < Math.min(0.55, (fv - 8) * 0.06)) {
            const sx = fr() < 0.5 ? -1 : 1, up = -dirG;
            for (let tries = 0; tries < 3; tries++) {
                const tx = x + sx * (1 + ((fr() * 3) | 0)) * (tries === 2 ? -1 : 1), ty = y + up * (1 + ((fr() * 3) | 0));
                if (tx < 0 || tx >= WIDTH || ty < 0 || ty >= HEIGHT) continue;
                if (grid[ty * WIDTH + tx] === 0) { swapCells(i, ty * WIDTH + tx); return; }
            }
        }
        const dir = windDir !== 0 && fr() < 0.7 ? windDir : (fr() < 0.5 ? -1 : 1);
        const uy = -dirG;
        const dep = liqCol[i] > 0 ? liqCol[i] - 1 : 0;
        let placed = false;
        const n1 = x + dir;
        if (n1 >= 0 && n1 < WIDTH && grid[y * WIDTH + n1] === 0) { swapCells(i, y * WIDTH + n1); placed = true; }
        else if (dep < 3 || fr() < 0.3) {
            let rng = Math.max(1, Math.round(el.disp * mob)) + ((dep > 16 ? 16 : dep) >> 2) + (fv >> 2);
            if (rng > 12) rng = 12;
            for (let step = 1; step <= rng; step++) {
                const tx = x + dir * step;
                if (tx < 0 || tx >= WIDTH) break;
                const ti = y * WIDTH + tx, tid = grid[ti];
                if (tid === 0) { swapCells(i, ti); placed = true; break; }
                else if (tid !== id) break;
            }
        }
        if (!placed && dep >= 2 && fr() < 0.2) {
            const ty = y + uy * dep, ts = ty * WIDTH + x;
            if (ty + uy >= 0 && ty + uy < HEIGHT && TCLS[grid[ts]] === 2 && grid[ts + uy * WIDTH] === 0) {
                for (let step = 1; step <= 6; step++) {
                    const tx = x + dir * step;
                    if (tx < 0 || tx >= WIDTH || grid[y * WIDTH + tx] !== id) break;
                    const mi = y * WIDTH + tx, k2 = liqCol[mi] > 0 ? liqCol[mi] - 1 : 0, yy = y + uy * (k2 + 1);
                    if (k2 + 1 < dep && yy >= 0 && yy < HEIGHT && grid[yy * WIDTH + tx] === 0) { swapCells(ts, yy * WIDTH + tx); break; }
                }
            }
        }
    }
    
}
function moveFoam(x, y, i, dirG) {
    const up = -dirG;
    if (((stepCount + i) & 1) !== 0) return; // foam rises more slowly than a gas so the column remains visible.
    const mouthY = 145;
    // Keep foam in the narrow glass outlet moving almost straight upward.
    if (metaGrid[i] === 88 && y >= mouthY) {
        const ny = y + up;
        if (inBounds(x, ny) && grid[idx(x, ny)] === ID.EMPTY) { swapCells(i, idx(x, ny)); return; }
        const side = fr() < 0.5 ? -1 : 1;
        for (const dx of [side, -side]) {
            const nx = x + dx;
            if (inBounds(nx, ny) && grid[idx(nx, ny)] === ID.EMPTY) { swapCells(i, idx(nx, ny)); return; }
        }
        return;
    }
    // Above the outlet, the foam head gently spreads sideways.
    const side = fr() < 0.5 ? -1 : 1;
    const dirs = fr() < 0.62
        ? [[0,up],[side,up],[-side,up],[side,0],[-side,0]]
        : [[side,up],[-side,up],[0,up],[side,0],[-side,0]];
    for (const d of dirs) {
        const nx = x + d[0], ny = y + d[1];
        if (!inBounds(nx, ny)) continue;
        const ni = idx(nx, ny), nid = grid[ni];
        if (nid === ID.EMPTY) { swapCells(i, ni); return; }
        if ((nid === ID.STEAM || nid === ID.SMOKE || nid === ID.OXYGEN) && fr() < 0.22) { swapCells(i, ni); return; }
    }
}
function moveGas(x, y, i, id, el, dirG) {
    let d = (id === ID.CO2 && metaGrid[i] === 77) ? -2.4 : el.density;
    if (id === ID.CO2 && metaGrid[i] === 77) {
        const above = y > 0 ? grid[i - WIDTH] : ID.EMPTY;
        if (above === ID.EMPTY || TCLS[above] !== 2) { metaGrid[i] = 0; d = el.density; }
    }
    if (d < 0) { const tg = T[i] - AMBIENT; if (tg > 0) d -= (tg > 800 ? 800 : tg) * 0.0015; }
    let p = (d < 0 ? -d : d) * 0.2 + 0.45;
    if (p > 1) p = 1;
    const gx = x + (windDir !== 0 && fr() < 0.6 ? windDir : (Math.floor(fr() * 3) - 1));
    const gy = (d !== 0 && fr() < p) ? (d < 0 ? y - dirG : y + dirG) : y;
    if ((gx !== x || gy !== y) && inBounds(gx, gy)) {
        const gi = gy * WIDTH + gx, gid = grid[gi];
        if (gid === 0) swapCells(i, gi);
        else if (gid !== id) {
            const tel = EL_BY_ID[gid];
            if (tel.type === 'gas') {
                if (gy === y) { if (fr() < 0.2) swapCells(i, gi); }
                else if ((d < 0 ? tel.density > el.density : tel.density < el.density) && fr() < 0.5) swapCells(i, gi);
            } else if (tel.type === 'liquid' && gy !== y && (d < 0 || d > tel.density) && fr() < 0.3) swapCells(i, gi);
        }
    }
    
}
let _rs = 2463534242;
function fr() { _rs ^= _rs << 13; _rs ^= _rs >>> 17; _rs ^= _rs << 5; return (_rs >>> 0) / 4294967296; }
function buildLiquidColumns() {
    if (gravityOn) {
        for (let i = 0; i < WIDTH; i++) liqCol[i] = TCLS[grid[i]] === 2 ? 1 : 0;
        for (let i = WIDTH; i < size; i++) liqCol[i] = TCLS[grid[i]] === 2 ? (liqCol[i - WIDTH] < 255 ? liqCol[i - WIDTH] + 1 : 255) : 0;
    } else {
        for (let i = size - WIDTH; i < size; i++) liqCol[i] = TCLS[grid[i]] === 2 ? 1 : 0;
        for (let i = size - WIDTH - 1; i >= 0; i--) liqCol[i] = TCLS[grid[i]] === 2 ? (liqCol[i + WIDTH] < 255 ? liqCol[i + WIDTH] + 1 : 255) : 0;
    }
}
