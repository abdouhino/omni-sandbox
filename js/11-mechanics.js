const MECH = new Uint8Array(1024), ROTORISH = new Uint8Array(1024), DISPLACE = new Uint8Array(1024);
[ID.ROTOR, ID.GEAR, ID.PIN, ID.AXLE, ID.MOTOR, ID.PISTON, ID.CHASSIS, ID.TIRE, ID.WHEELM, ID.WHEEL, ID.TRANSMISSION, ID.CLUTCH, ID.DIFFERENTIAL, ID.ENGINE_BLOCK].forEach(i => MECH[i] = 1);
ROTORISH[ID.TIRE] = 1; ROTORISH[ID.WHEELM] = 1; ROTORISH[ID.WHEEL] = 1;
MECH[ID.FLYWHEEL] = 1; ROTORISH[ID.FLYWHEEL] = 1; MECH[ID.BRAKE] = 1;
[ID.ROTOR, ID.GEAR, ID.PIN].forEach(i => ROTORISH[i] = 1);
for (const k in ELEMENTS) { const t = ELEMENTS[k].type; if (t === 'liquid' || t === 'gas' || t === 'powder' || t === 'energy') DISPLACE[ELEMENTS[k].id] = 1; }
let mechDirty = true, bodies = [], couplings = [], pinPos = [];
const mechOwner = new Int16Array(size), claim = new Int32Array(size); let claimStamp = 0;
const HINTS = {
    [ID.FLYWHEEL]: 'hint.FLYWHEEL',
    [ID.BRAKE]: 'hint.BRAKE',
    [ID.AXLE]: 'hint.AXLE',
    [ID.MOTOR]: 'hint.MOTOR',
    [ID.ROTOR]: 'hint.ROTOR',
    [ID.GEAR]: 'hint.GEAR',
    [ID.PIN]: 'hint.PIN',
    [ID.PISTON]: 'hint.PISTON',
    [ID.VENT]: 'hint.VENT',
    [ID.INJECTOR]: 'hint.INJECTOR',
    [ID.PLUG]: 'hint.PLUG',
    [ID.HALL]: 'hint.HALL',
    [ID.FUEL]: 'hint.FUEL',
    [ID.MUFFLER]: 'hint.MUFFLER', [ID.CATALYTIC]: 'hint.CATALYTIC', [ID.RADIATOR]: 'hint.RADIATOR', [ID.ALTERNATOR]: 'hint.ALTERNATOR', [ID.STARTER]: 'hint.STARTER',
    [ID.DIODE]: 'hint.DIODE', [ID.TRANSISTOR]: 'hint.TRANSISTOR', [ID.CAPACITOR]: 'hint.CAPACITOR', [ID.RESISTOR]: 'hint.RESISTOR', [ID.LED]: 'hint.LED',
    [ID.PC_MOTHERBOARD]: 'hint.PC_MOTHERBOARD', [ID.PC_CPU]: 'hint.PC_CPU', [ID.PC_GPU]: 'hint.PC_GPU', [ID.PC_RAM]: 'hint.PC_RAM', [ID.PC_SSD]: 'hint.PC_SSD', [ID.PC_HDD]: 'hint.PC_HDD', [ID.PC_PSU]: 'hint.PC_PSU', [ID.PC_FAN]: 'hint.PC_FAN', [ID.PC_HEATSINK]: 'hint.PC_HEATSINK', [ID.PC_MONITOR]: 'hint.PC_MONITOR', [ID.PC_CASE]: 'hint.PC_CASE',
    [ID.TRANSMISSION]: 'hint.TRANSMISSION', [ID.CLUTCH]: 'hint.CLUTCH', [ID.DIFFERENTIAL]: 'hint.DIFFERENTIAL', [ID.FUEL_PUMP]: 'hint.FUEL_PUMP', [ID.OIL_FILTER]: 'hint.OIL_FILTER', [ID.ENGINE_BLOCK]: 'hint.ENGINE_BLOCK', [ID.SOLAR_PANEL]: 'hint.SOLAR_PANEL', [ID.RELAY]: 'hint.RELAY', [ID.COOLANT]: 'hint.COOLANT'
};
for (const k of ['BEAKER','TEST_TUBE','BUNSEN','STIRRER','CONDENSER','GAS_COLLECTOR','FUNNEL','PH_METER','INDICATOR','CALCIUM_SOLUTION','CARBONATE_SOLUTION','PRECIPITATE','CRYSTAL_SEED','CRYSTAL','DISTILLED_WATER','AMMONIA','CITRIC_ACID','COPPER_SULFATE','SODIUM_CHLORIDE_SOLUTION','CALCIUM_CHLORIDE','LIMEWATER','CLAY','GRAVEL','LIMESTONE','BEDROCK','COPPER_ORE','IRON_ORE','FERTILE_SOIL','GROUNDWATER','BIRD','FROG','BACTERIA','ALGAE','AND_GATE','OR_GATE','NOT_GATE','XOR_GATE','CLOCK','COUNTER','MEMORY','CRANKSHAFT','CAMSHAFT','FAN_BELT','AIR_INTAKE','OIL_PUMP','LIME','IRON','COAL']) HINTS[ID[k]] = 'hint.' + k;
function emitNear(i, id) {
    const x = i % WIDTH, y = (i / WIDTH) | 0, o = (Math.random() * 4) | 0;
    for (let k = 0; k < 4; k++) { const d = (o + k) & 3, nx = x + NDX[d], ny = y + NDY[d]; if (inBounds(nx, ny) && grid[ny * WIDTH + nx] === 0) { setCell(nx, ny, id); return; } }
}
// Create a broad, contiguous-looking plume instead of a single isolated foam pixel.
function emitFoamBurst(cx, cy, amount = 4) {
    let made = 0;
    // Keep fresh foam inside the narrow outlet so it rises as one coherent tower.
    for (let n = 0; n < amount; n++) {
        let placed = false;
        for (let tries = 0; tries < 24 && !placed; tries++) {
            const dx = Math.floor(fr() * 5) - 2;
            const nx = cx + dx, ny = cy - 1 - Math.floor(fr() * 32);
            if (!inBounds(nx, ny)) continue;
            const q = idx(nx, ny);
            if (grid[q] !== ID.EMPTY) continue;
            setCell(nx, ny, ID.FOAM);
            lifeGrid[q] = 900 + Math.floor(fr() * 420);
            metaGrid[q] = 88;
            T[q] = Math.max(T[q], 36 + fr() * 12);
            placed = true; made++;
        }
    }
    return made;
}
function emitRisingBubbles(cx, cy, amount = 2) {
    let made = 0;
    for (let n = 0; n < amount; n++) {
        const dx = Math.floor(fr() * 5) - 2, dy = Math.floor(fr() * 3) - 1;
        const nx = cx + dx, ny = cy + dy;
        if (!inBounds(nx, ny)) continue;
        const q = idx(nx, ny);
        if (grid[q] !== ID.EMPTY) continue;
        setCell(nx, ny, ID.CO2);
        metaGrid[q] = 77; // CO2 bubble rising through a liquid; cleared when it reaches open air.
        lifeGrid[q] = 260 + Math.floor(fr() * 160);
        made++;
    }
    return made;
}
function findPivot(cells) {
    for (const c of cells) {
        const x = c % WIDTH, y = (c / WIDTH) | 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue; const nx = x + dx, ny = y + dy; if (!inBounds(nx, ny)) continue;
            const n = ny * WIDTH + nx, g = grid[n]; if (g === ID.AXLE || g === ID.MOTOR) return n;
        }
    }
    return -1;
}
function freeTravel(cells, own, ax, ay) {
    let n = 0;
    for (const dir of [1, -1]) for (let s = 1; s <= 14; s++) {
        let ok = true;
        for (const c of cells) {
            const x = (c % WIDTH) + ax * dir * s, y = ((c / WIDTH) | 0) + ay * dir * s;
            if (!inBounds(x, y)) { ok = false; break; }
            const p = y * WIDTH + x, g = grid[p];
            if (g !== 0 && !DISPLACE[g] && !own.has(p)) { ok = false; break; }
        }
        if (!ok) break; n++;
    }
    return n;
}
function buildBodies() {
    mechDirty = false;
    const oldW = new Map(); for (const b of bodies) if (b.kind === 'rotor') oldW.set(b.pivot, b.omega);
    bodies = []; couplings = []; mechOwner.fill(0);
    const seen = new Uint8Array(size), byPivot = new Map();
    const comp = (start, test) => {
        const out = [], st = [start]; seen[start] = 1;
        while (st.length) {
            const i = st.pop(); out.push(i); const x = i % WIDTH, y = (i / WIDTH) | 0;
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
                if (!dx && !dy) continue; const nx = x + dx, ny = y + dy; if (!inBounds(nx, ny)) continue;
                const n = ny * WIDTH + nx; if (!seen[n] && test(grid[n])) { seen[n] = 1; st.push(n); }
            }
        }
        return out;
    };
    for (let i = 0; i < size; i++) {
        const id = grid[i]; if (seen[i] || !(ROTORISH[id] || id === ID.PISTON)) continue;
        if (ROTORISH[id]) {
            const cells = comp(i, g => ROTORISH[g] === 1), pivot = findPivot(cells); if (pivot < 0) continue;
            let b = byPivot.get(pivot);
            if (!b) {
                const px = pivot % WIDTH, py = (pivot / WIDTH) | 0;
                b = { kind: 'rotor', pivot, px, py, angle: 0, omega: oldW.get(pivot) || 0, cells: [], R: 1, I: 1, gearR: 0, motor: grid[pivot] === ID.MOTOR, sliders: [], idn: bodies.length + 1, tq: 0 };
                bodies.push(b); byPivot.set(pivot, b);
            }
            for (const c of cells) {
                const x = c % WIDTH, y = (c / WIDTH) | 0, rx = x - b.px, ry = y - b.py, r = Math.hypot(rx, ry);
                b.cells.push({ rx, ry, id: grid[c], cv: colorVar[c], sk: skin[c], x, y }); b.R = Math.max(b.R, r); b.I += (r * r + 1) * (grid[c] === ID.FLYWHEEL ? 6 : 1);
                if (grid[c] === ID.GEAR) b.gearR = Math.max(b.gearR, r);
                mechOwner[c] = b.idn;
            }
        } else {
            const cells = comp(i, g => g === ID.PISTON), own = new Set(cells);
            const vt = freeTravel(cells, own, 0, 1), ht = freeTravel(cells, own, 1, 0), vertical = vt >= ht;
            const b = { kind: 'slider', cells: [], ax: vertical ? 0 : 1, ay: vertical ? 1 : 0, s: 0, v: 0, M: cells.length, idn: bodies.length + 1, link: null };
            let minP = 1e9, maxP = -1e9, minQ = 1e9, maxQ = -1e9;
            for (const c of cells) {
                const x = c % WIDTH, y = (c / WIDTH) | 0;
                b.cells.push({ rx: x, ry: y, id: ID.PISTON, cv: colorVar[c], sk: skin[c], x, y }); mechOwner[c] = b.idn;
                const along = x * b.ax + y * b.ay, across = x * b.ay + y * b.ax;
                minP = Math.min(minP, across); maxP = Math.max(maxP, across);
            }
            b.W = maxP - minP + 1;
            bodies.push(b);
        }
    }
    const PRI = { [ID.ROTOR]: 0, [ID.GEAR]: 1, [ID.PIN]: 2 };
    for (const b of bodies) if (b.kind === 'rotor') b.cells.sort((p, q) => (PRI[p.id] || 0) - (PRI[q.id] || 0));

    for (const sl of bodies) {
        if (sl.kind !== 'slider') continue;
        let best = null, bd = 24 * 24, aMin = 1e9, aMax = -1e9;
        for (const sc of sl.cells) { const ac = sc.x * sl.ay + sc.y * sl.ax; if (ac < aMin) aMin = ac; if (ac > aMax) aMax = ac; }
        for (const rb of bodies) if (rb.kind === 'rotor') for (const pc of rb.cells) if (pc.id === ID.PIN) {
            const pr = Math.hypot(pc.rx, pc.ry), pa = rb.px * sl.ay + rb.py * sl.ax, lat = pa < aMin ? aMin - pa : (pa > aMax ? pa - aMax : 0);
            if (lat > pr + 3) continue;
            let reach = 1e9;
            for (const sc of sl.cells) { const dd = Math.hypot(sc.x - rb.px, sc.y - rb.py); if (dd < reach) reach = dd; }
            if (reach > pr + 16) continue;
            for (const sc of sl.cells) { const d = (sc.x - (rb.px + pc.rx)) ** 2 + (sc.y - (rb.py + pc.ry)) ** 2; if (d < bd) { bd = d; best = { rotor: rb, pin: pc }; } }
        }
        if (best) { sl.link = best; best.rotor.sliders.push(sl); best.rotor.I += sl.M * (best.pin.rx ** 2 + best.pin.ry ** 2) * 0.5; }
    }

    for (let a = 0; a < bodies.length; a++) for (let b = a + 1; b < bodies.length; b++) {
        const A = bodies[a], B = bodies[b]; if (A.kind !== 'rotor' || B.kind !== 'rotor' || !A.gearR || !B.gearR) continue;
        let touch = false;
        for (const ca of A.cells) { if (ca.id !== ID.GEAR) continue; for (const cb of B.cells) if (cb.id === ID.GEAR && Math.abs(ca.x - cb.x) <= 2 && Math.abs(ca.y - cb.y) <= 2) { touch = true; break; } if (touch) break; }
        if (touch) couplings.push({ A, B, g: A.gearR / B.gearR });
    }
    for (const b of bodies) b.brakes = [];
    for (let i = 0; i < size; i++) {
        if (grid[i] !== ID.BRAKE) continue;
        const x = i % WIDTH, y = (i / WIDTH) | 0;
        let found = null;
        for (let dy = -2; dy <= 2 && !found; dy++) for (let dx = -2; dx <= 2; dx++) {
            const nx = x + dx, ny = y + dy;
            if (!inBounds(nx, ny)) continue;
            const o = mechOwner[ny * WIDTH + nx];
            if (o > 0) { const bb = bodies[o - 1]; if (bb && bb.kind === 'rotor') { found = bb; break; } }
        }
        if (found) found.brakes.push(i);
    }
}
function brakePowered(q) {
    const x = q % WIDTH, y = (q / WIDTH) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (!inBounds(nx, ny)) continue;
        const p = ny * WIDTH + nx;
        if (sp[p] === 9 && PASS[grid[p]]) return true;
    }
    return false;
}
function canPlace(cells, tg, own) {
    for (let j = 0; j < cells.length; j++) {
        const x = tg[2 * j], y = tg[2 * j + 1]; if (!inBounds(x, y)) return false;
        const p = y * WIDTH + x, o = mechOwner[p]; if (o === own) continue;
        const g = grid[p]; if (g === 0) continue;
        if (o !== 0) { if (g === ID.GEAR && cells[j].id === ID.GEAR) continue; return false; }
        if (DISPLACE[g]) continue; return false;
    }
    return true;
}
function displaceParticle(p) {
    const x = p % WIDTH, y = (p / WIDTH) | 0;
    for (let r = 1; r <= 3; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; const nx = x + dx, ny = y + dy; if (!inBounds(nx, ny)) continue;
        const q = ny * WIDTH + nx; if (grid[q] !== 0 || claim[q] === claimStamp || mechOwner[q] !== 0) continue;
        grid[q] = grid[p]; colorVar[q] = colorVar[p]; skin[q] = skin[p]; lifeGrid[q] = lifeGrid[p]; metaGrid[q] = metaGrid[p]; T[q] = T[p]; cookGrid[q] = cookGrid[p]; sp[q] = sp[p]; solutionGrid[q]=solutionGrid[p]; phGrid[q]=phGrid[p]; updated[q] = 1;
        return true;
    }
    return false;
}
function doPlace(cells, tg, own) {
    claimStamp++; let pushed = 0;
    for (let j = 0; j < cells.length; j++) claim[tg[2 * j + 1] * WIDTH + tg[2 * j]] = claimStamp;
    for (const c of cells) { const p = c.y * WIDTH + c.x; if (mechOwner[p] === own) { mechOwner[p] = 0; const g0 = grid[p]; if (g0 === c.id || (ROTORISH[g0] && ROTORISH[c.id])) grid[p] = 0; } }
    for (let j = 0; j < cells.length; j++) {
        const c = cells[j], tx = tg[2 * j], ty = tg[2 * j + 1], p = ty * WIDTH + tx;
        if (grid[p] !== 0 && mechOwner[p] === 0) { displaceParticle(p); pushed++; }
        grid[p] = c.id; colorVar[p] = c.cv; skin[p] = c.sk; lifeGrid[p] = 0; metaGrid[p] = 0; cookGrid[p] = 0; sp[p] = 0; solutionGrid[p]=0; phGrid[p]=7; mechOwner[p] = own;
        const dx = tx - c.x, dy = ty - c.y;
        if (dx || dy) { const m = 0.1 * (Math.abs(dx) + Math.abs(dy)); addPressureAt(tx + dx * 2, ty + dy * 2, m); addPressureAt(tx - dx * 3, ty - dy * 3, -m); }
        c.x = tx; c.y = ty;
    }
    return pushed;
}
function sliderTargets(sl, s) {
    const sh = Math.round(s), tg = new Int32Array(sl.cells.length * 2);
    for (let j = 0; j < sl.cells.length; j++) { tg[2 * j] = sl.cells[j].rx + sh * sl.ax; tg[2 * j + 1] = sl.cells[j].ry + sh * sl.ay; }
    return tg;
}
function tryMoveRotor(b, ang) {
    const c = Math.cos(ang), s = Math.sin(ang), tg = new Int32Array(b.cells.length * 2);
    for (let j = 0; j < b.cells.length; j++) { const k = b.cells[j]; tg[2 * j] = b.px + Math.round(k.rx * c - k.ry * s); tg[2 * j + 1] = b.py + Math.round(k.rx * s + k.ry * c); }
    if (!canPlace(b.cells, tg, b.idn)) return false;
    const plans = [];
    for (const sl of b.sliders) {
        const pr = sl.link.pin, sNew = (pr.rx * c - pr.ry * s - pr.rx) * sl.ax + (pr.rx * s + pr.ry * c - pr.ry) * sl.ay, t2 = sliderTargets(sl, sNew);
        if (!canPlace(sl.cells, t2, sl.idn)) return false; plans.push([sl, t2, sNew]);
    }
    const pushed = doPlace(b.cells, tg, b.idn);
    for (const [sl, t2, sNew] of plans) { doPlace(sl.cells, t2, sl.idn); sl.s = sNew; }
    b.angle = ang; b.omega *= 1 - Math.min(0.2, pushed * 0.004);
    return true;
}
function mechStep() {
    if (mechDirty) { buildBodies(); vehDirty = true; }
    pinPos.length = 0;
    if (vehDirty || ++vehTick % 24 === 0) buildVehicles();
    if (!bodies.length && !vehicles.length) return;
    const useAir = airMax >= 0.5, pAt = (x, y) => (inBounds(x, y) ? Pair[airIdx[y * WIDTH + x]] : 0);
    for (const b of bodies) {
        const n0 = b.cells.length; b.cells = b.cells.filter(c => { const p = c.y * WIDTH + c.x, g = grid[p]; return g === c.id || (mechOwner[p] === b.idn && ROTORISH[g] && ROTORISH[c.id]); });
        if (b.cells.length !== n0) for (const c of b.cells) mechOwner[c.y * WIDTH + c.x] = b.idn;
    }

    for (const b of bodies) {
        if (b.kind !== 'rotor') continue;
        const c = Math.cos(b.angle), s = Math.sin(b.angle); let tq = 0;
        if (useAir) for (const k of b.cells) {
            const cx = k.rx * c - k.ry * s, cy = k.rx * s + k.ry * c, X = b.px + Math.round(cx), Y = b.py + Math.round(cy);
            if (inBounds(X, Y)) { const a = airIdx[Y * WIDTH + X]; tq += cx * FY[a] - cy * FX[a]; }
        }
        tq *= 0.12;
        if (b.motor) {
            if (lifeGrid[b.pivot] <= 0) {
                const r = Math.ceil(b.R + 2), r2 = (b.R + 2) ** 2;
                for (let dy = -r; dy <= r && lifeGrid[b.pivot] <= 0; dy++) for (let dx = -r; dx <= r; dx++) {
                    if (dx * dx + dy * dy > r2) continue; const X = b.px + dx, Y = b.py + dy; if (!inBounds(X, Y)) continue;
                    const q = Y * WIDTH + X; if (sp[q] === 9 && PASS[grid[q]]) { lifeGrid[b.pivot] = 30; break; }
                }
            }
            if (lifeGrid[b.pivot] > 0) {
                const dir = metaGrid[b.pivot] === 1 ? -1 : 1, sf = b.omega * b.R * dir / 0.6;
                const f = sf >= 1 ? 0 : (sf < -1 ? 2 : 1 - sf);
                tq += dir * 25 * f;
                const load = f * (sf > 0 ? 1 - Math.min(1, sf) : 1);
                T[b.pivot] += 24 * load;
                if (T[b.pivot] > 320) { setCell(b.px, b.py, ID.ASH); sfx('fire'); mechDirty = true; }
            }
        }
        b.tq = tq;
    }
    for (const sl of bodies) {
        if (sl.kind !== 'slider') continue;
        let hd = 0, hn = 0, tl = 0, tn = 0, mx = -1e9, mn = 1e9;
        for (const k of sl.cells) { const d = k.x * sl.ax + k.y * sl.ay; mx = Math.max(mx, d); mn = Math.min(mn, d); }
        for (const k of sl.cells) {
            const d = k.x * sl.ax + k.y * sl.ay;
            if (d >= mx - 0.5) { hd += pAt(k.x + sl.ax * 5, k.y + sl.ay * 5); hn++; }
            if (d <= mn + 0.5) { tl += pAt(k.x - sl.ax * 5, k.y - sl.ay * 5); tn++; }
        }
        const Fp = ((tn ? tl / tn : 0) - (hn ? hd / hn : 0)) * sl.W * 0.35;
        sl.Fp = Fp;
        if (sl.link) {
            const rb = sl.link.rotor, pr = sl.link.pin, c = Math.cos(rb.angle), s = Math.sin(rb.angle);
            const cx = pr.rx * c - pr.ry * s, cy = pr.rx * s + pr.ry * c;
            rb.tq += Fp * (-cy * sl.ax + cx * sl.ay);
        } else {
            if (Math.abs(Fp) < 0.35 && Math.abs(sl.v) < 0.02) sl.v = 0; else sl.v = (sl.v + (Fp - 0.03 * sl.M * sl.s) / sl.M) * 0.92;
            const sNew = sl.s + sl.v;
            if (canPlace(sl.cells, sliderTargets(sl, sNew), sl.idn)) { doPlace(sl.cells, sliderTargets(sl, sNew), sl.idn); sl.s = sNew; } else sl.v = 0;
        }
    }

    for (const b of bodies) {
        if (b.kind !== 'rotor') continue;
        b.omega += b.tq / b.I; b.omega *= 0.997;
        if (b.brakes && b.brakes.length) {
            for (const q of b.brakes) if (grid[q] === ID.BRAKE && brakePowered(q)) { b.brkT = 30; break; }
            if (b.brkT > 0) { b.brkT--; b.omega *= 0.86; }
        }
        const wm = 2 / b.R; b.omega = Math.max(-wm, Math.min(wm, b.omega));
    }
    for (let it = 0; it < 2; it++) for (const cp of couplings) {
        const u = (cp.A.I * cp.A.omega - cp.g * cp.B.I * cp.B.omega) / (cp.A.I + cp.g * cp.g * cp.B.I);
        cp.A.omega = u; cp.B.omega = -cp.g * u;
    }
    vehicleStep();

    for (const b of bodies) {
        if (b.kind !== 'rotor' || Math.abs(b.omega) < 1e-5) continue;
        if (!tryMoveRotor(b, b.angle + b.omega)) { b.omega = 0; for (const cp of couplings) { if (cp.A === b) cp.B.omega = 0; if (cp.B === b) cp.A.omega = 0; } }
    }
    for (const b of bodies) if (b.kind === 'rotor') for (const k of b.cells) if (k.id === ID.PIN) pinPos.push([k.x, k.y]);
}

