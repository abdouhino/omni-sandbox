
const AC = 4, AW = Math.ceil(WIDTH / AC), AH = Math.ceil(HEIGHT / AC);
let Pair = new Float32Array(AW * AH), Pn2 = new Float32Array(AW * AH);
const airBlock = new Uint8Array(AW * AH), airCnt = new Uint8Array(AW * AH), ventMask = new Uint8Array(AW * AH);
const FX = new Float32Array(AW * AH), FY = new Float32Array(AW * AH), PBR = new Float32Array(AW * AH);
const airIdx = new Uint16Array(size);
const airO2 = new Float32Array(AW * AH).fill(1), airVentF = new Uint8Array(AW * AH), airOx = new Uint8Array(AW * AH), airO2n = new Float32Array(AW * AH);
for (let i = 0; i < size; i++) airIdx[i] = (((i / WIDTH) | 0) >> 2) * AW + ((i % WIDTH) >> 2);
let airMax = 0, stepCount = 0;
const BLOCKER = new Uint8Array(1024);
[ID.STONE, ID.STEEL, ID.GLASS, ID.WALL, ID.WOOD, ID.ICE, ID.COPPER, ID.INSULATOR, ID.MIRROR, ID.PISTON].forEach(i => BLOCKER[i] = 1);
const BREAK = [];
BREAK[ID.GLASS] = [4, ID.EMPTY]; BREAK[ID.ICE] = [6, ID.SNOW]; BREAK[ID.WOOD] = [10, ID.ASH]; BREAK[ID.STONE] = [22, ID.SAND];

function addPressureAt(x, y, v) {
    if (!inBounds(x, y)) return;
    let a = airIdx[y * WIDTH + x];
    if (airBlock[a]) {
        const ax = a % AW, ay = (a / AW) | 0;
        if (ax > 0 && !airBlock[a - 1]) a -= 1; else if (ax < AW - 1 && !airBlock[a + 1]) a += 1;
        else if (ay > 0 && !airBlock[a - AW]) a -= AW; else if (ay < AH - 1 && !airBlock[a + AW]) a += AW; else return;
    }
    Pair[a] = Math.max(-80, Math.min(80, Pair[a] + v));
    const m = Math.abs(Pair[a]); if (m > airMax) airMax = m;
}
function blast(cx, cy, radius) {
    const amt = Math.min(70, radius * 1.1), r = Math.ceil(radius / AC) + 1, ax0 = cx >> 2, ay0 = cy >> 2;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        const ax = ax0 + dx, ay = ay0 + dy;
        if (ax < 0 || ay < 0 || ax >= AW || ay >= AH) continue;
        const d = Math.hypot(dx, dy); if (d > r) continue;
        const a = ay * AW + ax; if (airBlock[a]) continue;
        Pair[a] = Math.min(80, Pair[a] + amt * (1 - d / (r + 1)));
        if (Pair[a] > airMax) airMax = Pair[a];
    }
}
const airReg = new Int32Array(AW * AH), airQ = new Int32Array(AW * AH), airTgt = new Float32Array(AW * AH), airSeal = new Uint8Array(AW * AH);
const airOpen = new Uint16Array(AW * AH), airGas = new Uint16Array(AW * AH), airHeat = new Float32Array(AW * AH);
function labelAirRegions() {
    airReg.fill(0);
    let rid = 0;
    for (let s0 = 0; s0 < airBlock.length; s0++) {
        if (airBlock[s0] || airReg[s0]) continue;
        rid++;
        let head = 0, tail = 0, open = 0, heat = 0, gas = 0, vented = false;
        airQ[tail++] = s0; airReg[s0] = rid;
        while (head < tail) {
            const a = airQ[head++], ax = a % AW, ay = (a / AW) | 0;
            open += airOpen[a]; heat += airHeat[a]; gas += airGas[a];
            if (ventMask[a] || ax === 0 || ay === 0 || ax === AW - 1 || ay === AH - 1) vented = true;
            let n;
            if (ax > 0)      { n = a - 1;  if (!airBlock[n] && !airReg[n]) { airReg[n] = rid; airQ[tail++] = n; } }
            if (ax < AW - 1) { n = a + 1;  if (!airBlock[n] && !airReg[n]) { airReg[n] = rid; airQ[tail++] = n; } }
            if (ay > 0)      { n = a - AW; if (!airBlock[n] && !airReg[n]) { airReg[n] = rid; airQ[tail++] = n; } }
            if (ay < AH - 1) { n = a + AW; if (!airBlock[n] && !airReg[n]) { airReg[n] = rid; airQ[tail++] = n; } }
        }
        const sealed = !vented && open >= 12;
        let tg = 0;
        if (sealed) {
            const avg = heat / open;
            tg = (avg > 0 ? avg * 0.01 + avg * avg * 0.00004 : avg * 0.01) + (gas / open) * 25;
            if (tg > 45) tg = 45; else if (tg < -8) tg = -8;
        }
        for (let k = 0; k < tail; k++) {
            const a = airQ[k];
            airVentF[a] = vented ? 1 : 0;
            if (sealed) {
                let v = Pair[a] + tg - airTgt[a];
                v = v > 80 ? 80 : (v < -80 ? -80 : v);
                Pair[a] = v; airTgt[a] = tg; airSeal[a] = 1;
                const m = v < 0 ? -v : v; if (m > airMax) airMax = m;
            } else { airTgt[a] = 0; airSeal[a] = 0; }
        }
    }
}
function updateAirBlocks() {
    airCnt.fill(0);
    ventMask.fill(0);
    airOpen.fill(0); airGas.fill(0); airHeat.fill(0); airOx.fill(0);
    for (let i = 0; i < size; i++) {
        const g = grid[i], a = airIdx[i];
        if (BLOCKER[g]) airCnt[a]++;
        else if (g === ID.VENT) ventMask[a] = 1;
        if (OPEN[g]) { airOpen[a]++; airHeat[a] += T[i] - AMBIENT; if (GASID[g]) airGas[a]++; if (g === I_OXYGEN) airOx[a]++; }
    }
    for (let a = 0; a < airBlock.length; a++) airBlock[a] = airCnt[a] >= 4 ? 1 : 0;
    labelAirRegions();
    stepOxygen();
}
function airStep() {
    let mx = 0;
    for (let ay = 0; ay < AH; ay++) for (let ax = 0; ax < AW; ax++) {
        const a = ay * AW + ax;
        if (airBlock[a]) { Pn2[a] = 0; continue; }
        const p = Pair[a]; let s = 0, n = 0;
        if (ax > 0)      { if (!airBlock[a - 1])  { s += Pair[a - 1];  n++; } } else n++;
        if (ax < AW - 1) { if (!airBlock[a + 1])  { s += Pair[a + 1];  n++; } } else n++;
        if (ay > 0)      { if (!airBlock[a - AW]) { s += Pair[a - AW]; n++; } } else n++;
        if (ay < AH - 1) { if (!airBlock[a + AW]) { s += Pair[a + AW]; n++; } } else n++;
        let v = n ? p + (s / n - p) * 0.4 : p;
        v *= ventMask[a] ? 0.9 : 0.9993; if (v > -0.02 && v < 0.02 && !airSeal[a]) v = 0;
        Pn2[a] = v; const av = v < 0 ? -v : v; if (av > mx) mx = av;
    }
    const t = Pair; Pair = Pn2; Pn2 = t; airMax = mx;
}
function pressureForces() {
    if (airMax < 0.5) return;
    for (let ay = 0; ay < AH; ay++) for (let ax = 0; ax < AW; ax++) {
        const a = ay * AW + ax, p = Pair[a];
        const l = ax > 0 && !airBlock[a - 1] ? Pair[a - 1] : p, r = ax < AW - 1 && !airBlock[a + 1] ? Pair[a + 1] : p;
        const u = ay > 0 && !airBlock[a - AW] ? Pair[a - AW] : p, d = ay < AH - 1 && !airBlock[a + AW] ? Pair[a + AW] : p;
        FX[a] = (l - r) * 0.5; FY[a] = (u - d) * 0.5;
        PBR[a] = Math.max(Math.abs(p), Math.abs(ax > 0 ? Pair[a - 1] : 0), Math.abs(ax < AW - 1 ? Pair[a + 1] : 0),
                          Math.abs(ay > 0 ? Pair[a - AW] : 0), Math.abs(ay < AH - 1 ? Pair[a + AW] : 0));
    }
    for (let y = 0; y < HEIGHT; y++) for (let x = 0; x < WIDTH; x++) {
        const i = y * WIDTH + x, id = grid[i];
        if (!id || updated[i]) continue;
        const a = airIdx[i], el = EL_BY_ID[id];
        if (el.type === 'creature') { if (Math.abs(Pair[a]) > 14) setCell(x, y, Math.random() < 0.5 ? ID.RAW_MEAT : ID.BLOOD); continue; }
        if (el.type === 'solid') { const br = BREAK[id]; if (br && PBR[a] > br[0] && Math.random() < 0.15) { setCell(x, y, br[1]); if (id === ID.GLASS) sfx('glass'); } continue; }
        if (el.type === 'energy') continue;
        const fx = FX[a], fy = FY[a], mag = Math.abs(fx) + Math.abs(fy), thr = 0.35 + Math.max(0, el.density) * 0.06;
        if (mag < thr || Math.random() > Math.min(1, (mag - thr) / 5 + 0.15)) continue;
        let dx = 0, dy = 0;
        if (Math.abs(fx) >= Math.abs(fy)) dx = fx > 0 ? 1 : -1; else dy = fy > 0 ? 1 : -1;
        const nx = x + dx, ny = y + dy;
        if (!inBounds(nx, ny)) continue;
        const ni = ny * WIDTH + nx, nid = grid[ni];
        if (nid === 0 || (el.type === 'gas' && EL_BY_ID[nid].type === 'gas')) swapCells(i, ni);
    }
}
function airTick() {
    if ((stepCount++ & 3) === 0) updateAirBlocks();
    if (airMax > 0) airStep();
    pressureForces();
}

