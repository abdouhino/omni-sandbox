const BX = Math.ceil(WIDTH / 8), BY = Math.ceil(HEIGHT / 8);
const blkDev = new Uint8Array(BX * BY), blkAct = new Uint8Array(BX * BY);
function diffuseHeat() {
    blkDev.fill(0);
    for (let y = 0; y < HEIGHT; y++) {
        const row = y * WIDTH, by = (y >> 3) * BX;
        for (let x = 0; x < WIDTH; x++) {
            const d = T[row + x] - AMBIENT;
            if (d > 0.05 || d < -0.05) blkDev[by + (x >> 3)] = 1;
        }
    }
    for (let by = 0; by < BY; by++) for (let bx = 0; bx < BX; bx++) {
        let a = 0;
        for (let dy = -1; dy <= 1 && !a; dy++) for (let dx = -1; dx <= 1; dx++) {
            const nx = bx + dx, ny = by + dy;
            if (nx >= 0 && nx < BX && ny >= 0 && ny < BY && blkDev[ny * BX + nx]) { a = 1; break; }
        }
        blkAct[by * BX + bx] = a;
    }
    Tn.set(T);
    for (let by = 0; by < BY; by++) for (let bx = 0; bx < BX; bx++) {
        if (!blkAct[by * BX + bx]) continue;
        const x1 = Math.min(WIDTH, bx * 8 + 8), y1 = Math.min(HEIGHT, by * 8 + 8);
        for (let y = by * 8; y < y1; y++) {
            const row = y * WIDTH;
            for (let x = bx * 8; x < x1; x++) {
                const i = row + x, id = grid[i], t = T[i], k = K[id];
                let s = 0, n;
                if (x > 0)          { n = i - 1;     s += Math.min(k, K[grid[n]]) * (T[n] - t); }
                if (x < WIDTH - 1)  { n = i + 1;     s += Math.min(k, K[grid[n]]) * (T[n] - t); }
                if (y > 0)          { n = i - WIDTH; s += Math.min(k, K[grid[n]]) * (T[n] - t); }
                if (y < HEIGHT - 1) { n = i + WIDTH; s += Math.min(k, K[grid[n]]) * (T[n] - t); }
                let v = t + s / C[id] - (t - AMBIENT) * LOSS[id];
                if (v > AMBIENT - 0.05 && v < AMBIENT + 0.05) v = AMBIENT;
                Tn[i] = v < -273 ? -273 : (v > 3000 ? 3000 : v);
            }
        }
    }
    const tmp = T; T = Tn; Tn = tmp;
}


const I_MIX = ID.MIX, I_PASTE = ID.PASTE, I_BAKED = ID.BAKED, I_OXYGEN = ID.OXYGEN, I_CO2 = ID.CO2, I_H2 = ID.HYDROGEN, I_LYE = ID.LYE, I_SODA = ID.BAKING_SODA, I_RUST = ID.RUST, I_YEAST = ID.YEAST;
const I_VINEGAR = ID.VINEGAR, I_LJ = ID.LEMON_JUICE, I_EGG = ID.EGG, I_BUTTER = ID.BUTTER, I_STEEL = ID.STEEL, I_WATER = ID.WATER, I_SW = ID.SALT_WATER, I_ACID = ID.ACID, I_SPARK = ID.SPARK, I_JUICE = ID.JUICE, I_STONE = ID.STONE;
const FOODV = [], MIXABLE = new Uint8Array(1024), MIXISH = new Uint8Array(1024), CHEMR = new Uint8Array(1024), DIFF = new Uint8Array(1024), DISS = new Float32Array(1024), DISSP = new Float32Array(1024);
const OXFREE = new Uint8Array(1024), ACIDPASS = new Uint8Array(1024), ORGANIC = new Uint8Array(1024), METAL = new Uint8Array(1024);
(function () {
    const tbl = {
        WATER: [15,0,0,0,0,0,0,0], SALT_WATER: [14,0,1,0,0,0,0,0], MILK: [12,1,0,0,1,1,0,0], JUICE: [12,3,0,0,0,0,0,0], HONEY: [3,12,0,0,0,0,0,0], SUGAR: [0,15,0,0,0,0,0,0],
        SALT: [0,0,15,0,0,0,0,0], FLOUR: [0,0,0,0,0,1,14,0], FRUIT: [11,3,0,0,0,0,0,1], OIL: [0,0,0,0,15,0,0,0], CHEESE: [2,0,1,0,6,6,0,0], MELTED_CHEESE: [2,0,1,0,6,6,0,0],
        RAW_MEAT: [6,0,0,0,2,7,0,0], COOKED_MEAT: [5,0,0,0,2,8,0,0], DOUGH: [6,0,0,0,0,2,7,0], BREAD: [2,0,0,0,0,2,11,0], LEMON_JUICE: [11,1,0,3,0,0,0,0], VINEGAR: [11,0,0,4,0,0,0,0],
        SOY_SAUCE: [9,0,4,0,0,2,0,0], EGG: [7,0,0,0,4,4,0,0], BUTTER: [2,0,1,0,12,0,0,0], RICE: [0,0,0,0,0,2,13,0], POTATO: [11,0,0,0,0,1,3,0], CARROT: [11,1,0,0,0,0,1,2],
        TOMATO: [11,1,0,1,0,0,0,2], ONION: [11,1,0,0,0,0,0,3], LEMON: [9,1,0,4,0,0,0,1], PEPPER: [0,0,0,0,0,0,0,15], COCOA: [0,4,0,0,5,0,2,4], YEAST: [2,0,0,0,0,5,2,6]
    };
    for (const k in tbl) { FOODV[ID[k]] = tbl[k]; MIXABLE[ID[k]] = 1; }
    MIXABLE[I_MIX] = 1; MIXABLE[I_PASTE] = 1;
    MIXISH[I_MIX] = 1; MIXISH[I_PASTE] = 1; MIXISH[I_BAKED] = 1;
    const dis = { SUGAR: [20, 0.02], SALT: [20, 0.03], COCOA: [25, 0.02], PEPPER: [25, 0.02], YEAST: [20, 0.02], FLOUR: [20, 0.02], LEMON: [40, 0.01], FRUIT: [50, 0.01], CHEESE: [60, 0.01],
        BREAD: [70, 0.005], BUTTER: [35, 0.05], RICE: [85, 0.008], POTATO: [85, 0.008], CARROT: [85, 0.008], TOMATO: [85, 0.008], ONION: [85, 0.008], RAW_MEAT: [85, 0.006], COOKED_MEAT: [85, 0.006] };
    for (const k in dis) { DISS[ID[k]] = dis[k][0]; DISSP[ID[k]] = dis[k][1]; CHEMR[ID[k]] = 1; }
    ['MIX', 'PASTE', 'HONEY', 'MILK', 'JUICE', 'EGG', 'VINEGAR', 'LEMON_JUICE', 'SOY_SAUCE', 'MELTED_CHEESE'].forEach(k => { DIFF[ID[k]] = 1; CHEMR[ID[k]] = 1; });
    ['LYE', 'BAKING_SODA', 'YEAST', 'STEEL', 'SPARK'].forEach(k => CHEMR[ID[k]] = 1);
    ['SODIUM', 'HYDROGEN_PEROXIDE', 'HYDROGEN','CALCIUM_SOLUTION','CARBONATE_SOLUTION','LIMEWATER','COPPER_SULFATE','COPPER_SULFATE_SOLUTION','SODIUM_CHLORIDE_SOLUTION','CRYSTAL_SEED','CRYSTAL','CITRIC_ACID','AMMONIA','LIMESTONE','LIME','IRON','CALCIUM_CHLORIDE'].forEach(k => CHEMR[ID[k]] = 1);
    ['CALCIUM_SOLUTION','CARBONATE_SOLUTION','SODIUM_CHLORIDE_SOLUTION','DISTILLED_WATER','LIMEWATER','COPPER_SULFATE','COPPER_SULFATE_SOLUTION','CALCIUM_CHLORIDE','INDICATOR'].forEach(k => MIXABLE[ID[k]] = 1);
    ['CALCIUM_CHLORIDE','COPPER_SULFATE','LIME'].forEach(k => ORGANIC[ID[k]] = 0);
    ACIDPASS[ID.CITRIC_ACID]=1; CHEMR[ID.BACTERIA]=1;
    ['GUNPOWDER', 'NITRO', 'C4', 'NUKE', 'FUSE'].forEach(k => OXFREE[ID[k]] = 1);
    ['LYE', 'BAKING_SODA', 'VINEGAR', 'LEMON_JUICE'].forEach(k => ACIDPASS[ID[k]] = 1);
    ['RAW_MEAT', 'COOKED_MEAT', 'ROTTEN_MEAT', 'PLANT', 'WOOD', 'BREAD', 'DOUGH', 'CHEESE', 'FRUIT', 'SEED'].forEach(k => ORGANIC[ID[k]] = 1);
    ['STEEL', 'COPPER', 'IRON'].forEach(k => METAL[ID[k]] = 1);
for (const k in ELEMENTS) if (ELEMENTS[k].cat === 'metals' || ELEMENTS[k].cond && ELEMENTS[k].type === 'solid') METAL[ELEMENTS[k].id] = 1;
    IGN[ID.ETHANOL] = 365; IGN[ID.HYDROGEN] = 500;
    setTh('MIX', 0.10, 3.5); setTh('PASTE', 0.05, 2.5); setTh('BAKED', 0.04, 2); setTh('BUTTER', 0.05, 2); setTh('ETHANOL', 0.10, 2.5);
    const visc = { MIX: 0.7, EGG: 0.5, SOY_SAUCE: 0.8, LYE: 0.9 };
    for (const k in visc) VISC[ID[k]] = visc[k];
    const slip = { PASTE: 0.3, BUTTER: 0.35, RICE: 0.9, YEAST: 0.8, RUST: 0.85, COCOA: 0.6, PEPPER: 0.7, POTATO: 0.7, CARROT: 0.7, TOMATO: 0.7, ONION: 0.7, LEMON: 0.7 };
    for (const k in slip) SLIP[ID[k]] = slip[k];
    HINTS[TOOL.SPOON] = 'hint.SPOON'; HINTS[ID.YEAST] = 'hint.YEAST'; HINTS[ID.BAKING_SODA] = 'hint.BAKING_SODA'; HINTS[ID.LYE] = 'hint.LYE';
})();

// Keep existing hand-tuned heat profiles, but give every element a distinct
// small material-specific modifier. K = conductivity, C = heat capacity,
// LOSS = cooling to ambient. Values are game units, not engineering data.
for (const key in ELEMENTS) {
    const el = ELEMENTS[key], id = el.id;
    let hash = 0; for (let j=0;j<key.length;j++) hash = (hash*33 + key.charCodeAt(j)) >>> 0;
    if (el.heatK !== undefined) {
        // Tiny ID offsets make even otherwise similar profiles individually distinct.
        el.heatK = Number((el.heatK + (id-399)*0.0000001).toFixed(7));
        el.heatC = Number((el.heatC + (id-399)*0.000001).toFixed(6));
        el.heatLoss = Number((el.heatLoss + (id-399)*0.000000001).toFixed(9));
        K[id]=el.heatK; C[id]=el.heatC; LOSS[id]=el.heatLoss;
    } else {
        K[id] = Math.max(0.004, K[id] + ((hash % 997) + 1) * 0.000002);
        C[id] = Math.max(0.25, C[id] + (((hash >>> 4) % 991) + 1) * 0.00005);
        LOSS[id] = Math.max(0.00001, LOSS[id] + (((hash >>> 8) % 983) + 1) * 0.0000005);
    }
}

const FDX = new Array(1024).fill(null), FDV = new Uint8Array(1024);
(function () {
    ROT[ID.RAW_MEAT] = 1;
    FOOD_DEFS.forEach(([key, name, color, type, dens, comp, o]) => {
        o = o || {}; const id = ID[key];
        FOODV[id] = comp; MIXABLE[id] = 1; CHEMR[id] = 1; ORGANIC[id] = 1;
        if (type === 'liquid') { DIFF[id] = 1; if (o.visc) VISC[id] = o.visc; }
        if (o.slip) SLIP[id] = o.slip; else if (type === 'powder') SLIP[id] = 0.7;
        const dis = o.diss || (type === 'powder' || key.indexOf('SHRIMP') >= 0 ? [85, 0.008] : null);
        if (dis && dis[1] > 0) { DISS[id] = dis[0]; DISSP[id] = dis[1]; }
        if (o.ign) IGN[id] = o.ign;
        if (o.burn) BURN[id] = o.burn;
        if (o.rot) ROT[id] = 1;
        const fx = {}; let has = false;
        ['cook', 'char', 'melt', 'set', 'boil', 'fizz', 'pop'].forEach(q => { if (o[q] !== undefined) { fx[q] = o[q]; has = true; } });
        if (has || o.spk) { fx.spk = o.spk; FDX[id] = fx; FDV[id] = (fx.cook || fx.char || fx.spk) ? 1 : 0; }
    });
    const ex = { POTATO: { cook: ['BAKED_POTATO', 70, 0.012, 100] }, CARROT: { char: 170 }, TOMATO: { cook: ['TOMATO_SAUCE', 85, 0.012, 100] }, ONION: { char: 170 },
                 RICE: { char: 200 }, SUGAR: { cook: ['CARAMEL', 160, 0.02, 100] }, BUTTER: { melt: [36, 'MELTED_BUTTER'] }, COCOA: { char: 200 }, LEMON: { char: 180 },
                 FRUIT: { cook: ['JAM', 85, 0.012, 100] }, PEPPER: { char: 220 } };
    for (const k in ex) { FDX[ID[k]] = ex[k]; FDV[ID[k]] = (ex[k].cook || ex[k].char) ? 1 : 0; }
    ['PAPRIKA', 'CINNAMON'].forEach(k => CHEMR[ID[k]] = 1);
    Object.keys(LANGS.en).filter(k => k.indexOf('hint.') === 0).forEach(k => { const key = k.slice(5); if (ID[key] !== undefined && !HINTS[ID[key]]) HINTS[ID[key]] = k; });
})();
function nearWater(x, y) {
    for (let d = 0; d < 4; d++) { const nx = x + NDX[d], ny = y + NDY[d]; if (inBounds(nx, ny)) { const n = grid[ny * WIDTH + nx]; if (n === ID.WATER || n === ID.SALT_WATER || n === I_MIX) return true; } }
    return false;
}
function foodFx(x, y, i, id, t) {
    const f = FDX[id];
    if (f.melt && t >= f.melt[0] && Math.random() < 0.08) { setCell(x, y, ID[f.melt[1]]); return true; }
    if (f.set && t <= f.set[0] && Math.random() < 0.05) { setCell(x, y, ID[f.set[1]]); return true; }
    if (f.boil && t > 100) {
        cookGrid[i] += Math.min(30, (t - 100) * 0.25) + 0.3; T[i] = 100;
        if (cookGrid[i] >= 25) { addPressureAt(x, y, 0.6); setCell(x, y, ID.STEAM); return true; }
        return false;
    }
    if (f.cook) {
        const c = f.cook;
        if (t >= c[1] && (!c[4] || nearWater(x, y))) {
            cookGrid[i] += (t - c[1] + 5) * c[2];
            if (cookGrid[i] >= c[3]) { setCell(x, y, ID[c[0]]); if (f.pop) addPressureAt(x, y, f.pop); return true; }
        } else if (cookGrid[i] > 0) cookGrid[i] = Math.max(0, cookGrid[i] - 0.1);
    } else if (f.char && t > f.char) {
        cookGrid[i] += (t - f.char) * 0.012 + 0.05;
        if (cookGrid[i] >= 60) { setCell(x, y, t > 420 && Math.random() < 0.4 ? ID.ASH : ID.CHARRED); return true; }
    } else if (cookGrid[i] > 0) cookGrid[i] = Math.max(0, cookGrid[i] - 0.1);
    if (f.fizz && t > 30 && Math.random() < 0.0008 * (t - 28)) emitNear(i, ID.CO2);
    return false;
}
function fxColor(id, i) {
    const f = FDX[id]; let c0 = EL_BY_ID[id].color, c1 = c0, k = 0;
    if (f && f.spk && (blockNoise(i % WIDTH, (i / WIDTH) | 0) & 7) === 0) c0 = f.spk;
    if (f && f.cook) { c1 = EL_BY_ID[ID[f.cook[0]]].color; k = cookGrid[i] / f.cook[3]; }
    else if (f && f.char) { c1 = ELEMENTS.CHARRED.color; k = cookGrid[i] / 60; }
    lerpC(c0, c1, k > 1 ? 1 : k);
}

const _A = new Float32Array(8), _B = new Float32Array(8), _V = new Float32Array(8);
let _cr = 0, _cg = 0, _cb = 0;
function comps(i, out) {
    const id = grid[i];
    if (MIXISH[id]) {
        const m = mix[i];
        if (m === 0) { for (let k = 0; k < 8; k++) out[k] = 0; out[0] = 15; }
        else for (let k = 0; k < 8; k++) out[k] = (m >>> (k * 4)) & 15;
        return true;
    }
    const f = FOODV[id];
    if (!f) return false;
    for (let k = 0; k < 8; k++) out[k] = f[k];
    return true;
}
function cellRGB(i) {
    const id = grid[i], sk = skin[i];
    if (MIXISH[id] && (sk >>> 24) === 255) { _cr = (sk >> 16) & 255; _cg = (sk >> 8) & 255; _cb = sk & 255; }
    else { const c = EL_BY_ID[id].color; _cr = c[0]; _cg = c[1]; _cb = c[2]; }
}
function sumV(v) { let s = 0; for (let k = 0; k < 8; k++) s += v[k]; return s; }
function mixState(v, tt, ck) {
    const s = sumV(v) || 1;
    if (v[5] / s >= 0.25 && ck >= 40) return I_PASTE;
    if (v[0] / s >= 0.31) return I_MIX;
    if (v[4] / s >= 0.5 && tt >= 32) return I_MIX;
    return I_PASTE;
}
function writeMix(i, v, r, g, b, tt, ck) {
    let m = 0;
    for (let k = 0; k < 8; k++) {
        let q = v[k], f = Math.floor(q);
        if (Math.random() < q - f) f++;
        if (f > 15) f = 15;
        m |= f << (k * 4);
    }
    const x = i % WIDTH, y = (i / WIDTH) | 0, nid = mixState(v, tt, ck);
    if (grid[i] !== nid) setCell(x, y, nid);
    mix[i] = m >>> 0;
    skin[i] = (0xFF000000 | ((r & 255) << 16) | ((g & 255) << 8) | (b & 255)) >>> 0;
    T[i] = tt; cookGrid[i] = ck;
}
function blendCells(i, j, auto) {
    if (!comps(i, _A) || !comps(j, _B)) return false;
    const sa = sumV(_A) || 1, sb = sumV(_B) || 1;
    if (auto && ((_A[4] / sa > 0.6) !== (_B[4] / sb > 0.6))) return false;
    cellRGB(i); const r1 = _cr, g1 = _cg, b1 = _cb;
    cellRGB(j); const r2 = _cr, g2 = _cg, b2 = _cb;
    const wa = 1 - 0.8 * _A[0] / sa, wb = 1 - 0.8 * _B[0] / sb, ws = wa + wb;
    const r = (r1 * wa + r2 * wb) / ws, g = (g1 * wa + g2 * wb) / ws, b = (b1 * wa + b2 * wb) / ws;
    for (let k = 0; k < 8; k++) _V[k] = (_A[k] + _B[k]) * 0.5;
    const tt = (T[i] + T[j]) * 0.5, ck = (cookGrid[i] + cookGrid[j]) * 0.5;
    writeMix(i, _V, r, g, b, tt, ck);
    writeMix(j, _V, r, g, b, tt, ck);
    return true;
}
function stirAt(x, y, i) {
    const id = grid[i];
    if (!MIXABLE[id] || Math.random() < 0.5) return;
    const nx = x + ((Math.random() * 5) | 0) - 2, ny = y + ((Math.random() * 5) | 0) - 2;
    if (!inBounds(nx, ny)) return;
    const j = ny * WIDTH + nx, jd = grid[j];
    if (j === i || !MIXABLE[jd]) return;
    blendCells(i, j, false);
    const ti = EL_BY_ID[grid[i]].type, tj = EL_BY_ID[grid[j]].type;
    if ((ti === 'liquid' || ti === 'powder') && (tj === 'liquid' || tj === 'powder') && Math.random() < 0.5) swapCells(i, j);
}
function acidProduct(nid) { return METAL[nid] ? I_H2 : (nid === I_STONE ? I_CO2 : ID.SMOKE); }
function stepOxygen() {
    const n = AW * AH;
    for (let a = 0; a < n; a++) {
        const o = airO2[a];
        if (airBlock[a]) { airO2n[a] = o; continue; }
        if (airOx[a] >= 2) { airO2n[a] = 1; continue; }
        if (airVentF[a]) { airO2n[a] = o + (1 - o) * 0.3; continue; }
        const ax = a % AW;
        let s = 0, c = 0;
        if (ax > 0 && !airBlock[a - 1]) { s += airO2[a - 1]; c++; }
        if (ax < AW - 1 && !airBlock[a + 1]) { s += airO2[a + 1]; c++; }
        if (a >= AW && !airBlock[a - AW]) { s += airO2[a - AW]; c++; }
        if (a < n - AW && !airBlock[a + AW]) { s += airO2[a + AW]; c++; }
        airO2n[a] = c ? o + (s / c - o) * 0.4 : o;
    }
    airO2.set(airO2n);
}
function mixThermal(x, y, i, id, t) {
    let ck = cookGrid[i];
    if (id === I_BAKED) {
        if (t > 120) ck += (t - 110) * 0.006 + (t > 200 ? (t - 200) * 0.01 : 0);
        cookGrid[i] = ck;
        if (ck >= 255) { setCell(x, y, ID.CHARRED); return true; }
        return false;
    }
    if (id === I_PASTE && t > 8 && t < 26 && ck === 0) return false;
    const v = _A;
    comps(i, v);
    const s = sumV(v) || 1;
    const pa = airMax >= 0.5 ? Pair[airIdx[i]] : 0, bp = 100 + (pa > 40 ? 40 : (pa < -25 ? -25 : pa)) * 3;
    let changed = false;
    if (t > 55) ck += (t - 50) * 0.005;
    if (v[0] > 0 && t >= bp) {
        T[i] = bp;
        if (Math.random() < 0.003) {
            v[0] -= 1; changed = true;
            addPressureAt(x, y, 0.3);
            if (Math.random() < 0.6) emitNear(i, ID.STEAM);
        }
    } else if (v[0] === 0 && t > 140) ck += (t - 130) * 0.02;
    if (ck >= 255) { setCell(x, y, ID.CHARRED); return true; }
    if (v[6] / s >= 0.28 && v[0] / s < 0.45 && t >= 95 && ck >= 60) {
        const sk = skin[i], mm = mix[i];
        setCell(x, y, I_BAKED);
        skin[i] = sk; mix[i] = mm; T[i] = t; cookGrid[i] = ck;
        return true;
    }
    cookGrid[i] = ck;
    if (changed || mixState(v, t, ck) !== id) {
        cellRGB(i);
        writeMix(i, v, _cr, _cg, _cb, T[i], ck);
        return true;
    }
    return false;
}
function dishKey(v, s, ck, id, t) {
    const f0 = v[0] / s, f1 = v[1] / s, f2 = v[2] / s, f3 = v[3] / s, f4 = v[4] / s, f5 = v[5] / s, f6 = v[6] / s, f7 = v[7] / s;
    if (ck >= 200) return 'dish.burnt';
    if (id === I_BAKED) { if (f1 >= 0.1) return f4 >= 0.12 ? 'dish.cookie' : 'dish.cake'; return f4 >= 0.16 ? 'dish.pastry' : 'dish.bread'; }
    const cooked = ck >= 40;
    if (f4 >= 0.5) return f3 >= 0.08 ? 'dish.vinaigrette' : 'dish.fatBlend';
    if (f4 >= 0.3 && f5 >= 0.1 && f3 >= 0.02 && f0 < 0.35) return 'dish.mayo';
    if (f5 >= 0.25 && f4 >= 0.15 && f0 < 0.6) return cooked ? 'dish.scrambled' : 'dish.eggMix';
    if (f6 >= 0.28) return f0 >= 0.3 ? (cooked ? 'dish.porridge' : 'dish.batter') : 'dish.dough';
    if (f1 >= 0.45 && f0 < 0.25) return cooked ? 'dish.caramel' : 'dish.syrup';
    if (f1 >= 0.1 && f4 >= 0.1 && f7 >= 0.12) return f0 >= 0.5 ? 'dish.hotChocolate' : 'dish.chocolate';
    if (f0 >= 0.5) {
        const solids = f7 + f5 + f6;
        if (f4 >= 0.04 && f5 >= 0.04 && f1 >= 0.03 && f7 < 0.03 && f6 < 0.03) return (f5 >= 0.07 && f4 >= 0.06 && cooked) ? 'dish.custard' : 'dish.milkDrink';
        if (solids >= 0.05) {
            if (f2 >= 0.01) {
                if (!cooked) return 'dish.rawSoup';
                if (f5 >= 0.03) return 'dish.meatSoup';
                if (f6 >= 0.03) return 'dish.riceSoup';
                if (f3 >= 0.01 && f7 >= 0.03) return 'dish.tomatoSoup';
                return 'dish.vegSoup';
            }
            return cooked ? 'dish.broth' : 'dish.rawSoup';
        }
        if (f3 >= 0.012 && f1 >= 0.03) return t >= 45 ? 'dish.hotLemon' : 'dish.lemonade';
        if (f1 >= 0.04) return 'dish.sweetWater';
        if (f3 >= 0.02) return 'dish.sourWater';
    }
    return 'dish.generic';
}
function dishLabel(i) {
    const id = grid[i], v = _B, cx = i % WIDTH, cy = (i / WIDTH) | 0;
    for (let k = 0; k < 8; k++) v[k] = 0;
    let cnt = 0, ckSum = 0;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const nx = cx + dx, ny = cy + dy;
        if (!inBounds(nx, ny)) continue;
        const j = ny * WIDTH + nx, jd = grid[j];
        if (!MIXISH[jd] && !(MIXABLE[jd] && TCLS[jd] === TCLS[id])) continue;
        if (!comps(j, _A)) continue;
        for (let k = 0; k < 8; k++) v[k] += _A[k];
        ckSum += cookGrid[j]; cnt++;
    }
    if (!cnt) { comps(i, v); cnt = 1; ckSum = cookGrid[i]; }
    for (let k = 0; k < 8; k++) v[k] /= cnt;
    const s = sumV(v) || 1, ck = ckSum / cnt, key = dishKey(v, s, ck, id, T[i]);
    const order = [1, 2, 3, 4, 5, 6, 7, 0].sort((p, q) => v[q] - v[p]);
    let name = t(key, { a: t('comp.' + order[0]), b: t('comp.' + order[1]) });
    const parts = [];
    for (let k = 0; k < 3; k++) if (v[order[k]] > 0) parts.push(t('comp.' + order[k]) + ' ' + Math.round(v[order[k]] / s * 100) + '%');
    name += ' (' + parts.join(', ') + ')';
    if (ck >= 40) name += ' · ' + t('dish.cooked', { n: Math.min(100, Math.round(ck / 2.55)) });
    return name;
}
function findChemNearby(x, y, ids, radius = 1) {
    const wanted = Array.isArray(ids) ? ids : [ids];
    for (let r = 1; r <= radius; r++) {
        for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
            if (r === 1 && dx !== 0 && dy !== 0) continue;
            const nx = x + dx, ny = y + dy;
            if (!inBounds(nx, ny)) continue;
            const ni = ny * WIDTH + nx, nid = grid[ni];
            if (wanted.includes(nid)) return { x: nx, y: ny, i: ni, id: nid };
        }
    }
    return null;
}

// v21 scientific log: records actual in-simulation discoveries, not a preset list.
let reactionJournal = [];
try { const saved = JSON.parse(localStorage.getItem('omni_v21_reaction_journal') || '[]'); if (Array.isArray(saved)) reactionJournal = saved.slice(0,60); } catch(e) {}
function logReaction(key, title, detail) {
    if (!key) return;
    let entry = reactionJournal.find(q => q.key === key);
    if (entry) { entry.count = Math.min(9999, (entry.count || 1) + 1); entry.last = Date.now(); }
    else { reactionJournal.unshift({ key, title, detail, count:1, last:Date.now() }); reactionJournal = reactionJournal.slice(0,60); }
    try { localStorage.setItem('omni_v21_reaction_journal', JSON.stringify(reactionJournal)); } catch(e) {}
}
function estimatePHAt(cx, cy, radius=6) {
    let acid=0, base=0, neutral=0;
    for(let dy=-radius;dy<=radius;dy++) for(let dx=-radius;dx<=radius;dx++) {
        if(dx*dx+dy*dy>radius*radius) continue;
        const x=cx+dx,y=cy+dy; if(!inBounds(x,y)) continue;
        const i=idx(x,y), id=grid[i], amount=Math.max(0.08,(solutionGrid[i]||70)/100);
        if(id===ID.ACID) acid+=4.0*amount; else if(id===ID.VINEGAR||id===ID.LEMON_JUICE||id===ID.CITRIC_ACID) acid+=1.5*amount;
        else if(id===ID.LYE) base+=4.0*amount; else if(id===ID.AMMONIA||id===ID.LIMEWATER||id===ID.CARBONATE_SOLUTION) base+=1.4*amount;
        else if(id===ID.WATER||id===ID.DISTILLED_WATER||id===ID.SALT_WATER) neutral+=0.12;
    }
    const ph=7+3.3*Math.log10((base+0.04)/(acid+0.04));
    return Math.max(0,Math.min(14,ph+(neutral?0:0)));
}
function emitPrecipitate(i, count=4) {
    for(let n=0;n<count;n++) emitNear(i,ID.PRECIPITATE);
    sfx('blip',0.5);
}
function chemistryWorldStep() {
    if((stepCount&15)!==0) return;
    for(let i=0;i<size;i++) {
        const id=grid[i];
        if(id===ID.INDICATOR || id===ID.PH_METER) {
            const ph=estimatePHAt(i%WIDTH,(i/WIDTH)|0,6); phGrid[i]=ph;
            if(id===ID.INDICATOR) metaGrid[i]=ph<4.5?1:(ph<6.5?2:(ph<8.5?3:(ph<11?4:5)));
            else lifeGrid[i]=Math.round(ph*10);
        }
        if((id===ID.SODIUM_CHLORIDE_SOLUTION || id===ID.COPPER_SULFATE_SOLUTION) && T[i]>85 && (stepCount%32===0) && solutionGrid[i]>5) {
            solutionGrid[i]=Math.max(0,solutionGrid[i]-2); if(fr()<0.16) emitNear(i,ID.CRYSTAL_SEED);
        }
        if(id===ID.CRYSTAL_SEED && stepCount%16===0) {
            const nearby=findChemNearby(i%WIDTH,(i/WIDTH)|0,[ID.SALT_WATER,ID.SODIUM_CHLORIDE_SOLUTION,ID.COPPER_SULFATE_SOLUTION],2);
            if(nearby && fr()<0.06) { setCell(nearby.x,nearby.y,ID.CRYSTAL); T[nearby.i]=Math.min(45,T[nearby.i]); logReaction('crystallization','CRYSTAL GROWTH','A crystal seed formed a visible crystal in a concentrated solution.'); }
        }
        if(id===ID.CRYSTAL && T[i]>75 && fr()<0.03) setCell(i%WIDTH,(i/WIDTH)|0,ID.SALT);
    }
}

function chemReact(x, y, i, id) {
    // Visible solution precipitation: clear solutions turn cloudy and a solid settles.
    if(id===ID.CALCIUM_SOLUTION || id===ID.CARBONATE_SOLUTION) {
        const other=findChemNearby(x,y,id===ID.CALCIUM_SOLUTION?ID.CARBONATE_SOLUTION:ID.CALCIUM_SOLUTION,1);
        if(other && fr()<0.22) { setCell(x,y,ID.DISTILLED_WATER); setCell(other.x,other.y,ID.DISTILLED_WATER); emitPrecipitate(i,5+(fr()*4|0)); logReaction('precipitation','WHITE PRECIPITATE','Calcium ions and carbonate ions formed an insoluble white solid in the aqueous model.'); }
        return;
    }
    if(id===ID.LIMEWATER) {
        const co2=findChemNearby(x,y,ID.CO2,2); if(co2 && fr()<0.2) { setCell(co2.x,co2.y,ID.EMPTY); setCell(x,y,ID.PRECIPITATE); emitPrecipitate(i,3); logReaction('limewater-co2','LIMEWATER TEST','Carbon dioxide made limewater cloudy as a carbonate precipitate formed.'); }
        return;
    }
    if(id===ID.COPPER_SULFATE) {
        const w=findChemNearby(x,y,[ID.WATER,ID.DISTILLED_WATER],1);
        if(w && fr()<0.06) { setCell(x,y,ID.EMPTY); setCell(w.x,w.y,ID.COPPER_SULFATE_SOLUTION); solutionGrid[w.i]=Math.min(100,(solutionGrid[w.i]||40)+18); logReaction('copper-sulfate-dissolving','BLUE COPPER SULFATE SOLUTION','Blue copper sulfate crystals dissolved into water in the simplified solution model.'); }
        return;
    }
    if(id===ID.CALCIUM_CHLORIDE) {
        const w=findChemNearby(x,y,[ID.WATER,ID.DISTILLED_WATER],1);
        if(w && fr()<0.06) { setCell(x,y,ID.EMPTY); setCell(w.x,w.y,ID.CALCIUM_SOLUTION); solutionGrid[w.i]=Math.min(100,(solutionGrid[w.i]||35)+18); T[w.i]=Math.max(T[w.i],32); logReaction('calcium-chloride-dissolving','CALCIUM SALT DISSOLVES','The solid salt entered the aqueous phase and warmed the solution slightly in the model.'); }
        return;
    }
    if(id===ID.CITRIC_ACID) {
        const w=findChemNearby(x,y,[ID.WATER,ID.DISTILLED_WATER],1);
        if(w && fr()<0.08) { setCell(x,y,ID.EMPTY); setCell(w.x,w.y,ID.ACID); solutionGrid[w.i]=Math.min(100,(solutionGrid[w.i]||35)+12); logReaction('citric-acid-dissolving','ACIDIC SOLUTION','Citric acid dissolved and shifted the local pH toward acidic.'); }
        return;
    }
    if(id===ID.LIME) {
        const w=findChemNearby(x,y,[ID.WATER,ID.DISTILLED_WATER],1);
        if(w && fr()<0.08) { setCell(x,y,ID.EMPTY); setCell(w.x,w.y,ID.LIMEWATER); solutionGrid[w.i]=Math.min(100,(solutionGrid[w.i]||40)+18); T[w.i]=Math.max(T[w.i],72); logReaction('lime-slaking','LIME + WATER','The solid lime hydrated into a strongly alkaline slurry and released heat in the model.'); }
        return;
    }
    if((id===ID.SODIUM_CHLORIDE_SOLUTION || id===ID.COPPER_SULFATE_SOLUTION) && T[i]>85 && fr()<0.012) { emitNear(i,ID.CRYSTAL); solutionGrid[i]=Math.max(0,solutionGrid[i]-1); return; }

    // Sodium-water: a stylized in-game flash, heat, gas and pressure effect.
    // Educational sandbox effect only; it is not a real-world procedure.
    if (id === ID.SODIUM) {
        const water = findChemNearby(x, y, [ID.WATER, ID.SALT_WATER], 1);
        if (water) {
            setCell(x, y, ID.LYE);
            T[i] = Math.max(T[i], 145);
            T[water.i] = Math.max(T[water.i], 110);
            emitNear(i, I_H2);
            emitNear(water.i, ID.STEAM);
            const dirs = [[0,-1],[-1,0],[1,0],[0,1]];
            for (let n = 0; n < 4; n++) {
                const d = dirs[(n + (fr()*4|0)) & 3], nx = x + d[0], ny = y + d[1];
                if (inBounds(nx, ny) && grid[idx(nx,ny)] === ID.EMPTY) {
                    const flame = fr() < 0.45;
                    setCell(nx, ny, flame ? ID.FIRE : ID.STEAM);
                    T[idx(nx,ny)] = flame ? 880 : 150;
                }
            }
            addPressureAt(x, y, 1.4);
            logReaction('sodium-water','SODIUM + WATER','The simulation produced heat, hydrogen, steam and a strongly basic solution.');
        }
        return;
    }

    // Elephant toothpaste: catalase speeds peroxide decomposition. Soap traps
    // oxygen bubbles, creating a rising, expanding foam column in the sandbox.
    if (id === ID.HYDROGEN_PEROXIDE) {
        const catalyst = findChemNearby(x, y, [ID.YEAST, ID.POTATO, ID.BLOOD], 12);
        const soap = findChemNearby(x, y, ID.SOAP, 12);
        const hotDecomposition = T[i] >= 120;
        const catalysed = !!(catalyst && soap);
        if ((catalysed || hotDecomposition) && fr() < (catalysed ? 0.22 : 0.012)) {
            setCell(x, y, ID.WATER);
            T[i] = Math.max(T[i], catalysed ? 44 : 90);
            emitNear(i, I_OXYGEN);
            if (catalysed) {
                const ox = catalyst.x, oy = catalyst.y - 1;
                emitFoamBurst(ox, oy, 4 + (fr() * 5 | 0));
                if (fr() < 0.28) emitRisingBubbles(ox, oy, 1);
                addPressureAt(ox, oy, 0.025);
                logReaction('elephant-toothpaste','ELEPHANT TOOTHPASTE','Catalysed peroxide decomposition released oxygen; soap trapped the gas as rising foam.');
            } else emitNear(i, I_OXYGEN);
        }
        return;
    }

    // Hydrogen + oxygen + spark -> a brief steam flash and pressure pulse.
    if (id === ID.HYDROGEN) {
        const oxygen = findChemNearby(x, y, ID.OXYGEN, 1);
        const spark = findChemNearby(x, y, ID.SPARK, 2);
        if (oxygen && spark && fr() < 0.32) {
            setCell(x, y, ID.STEAM);
            T[i] = Math.max(T[i], 650);
            setCell(oxygen.x, oxygen.y, ID.EMPTY);
            addPressureAt(x, y, 1.2);
            emitNear(i, ID.STEAM);
        }
        return;
    }

    const d = (fr() * 4) | 0, nx = x + NDX[d], ny = y + NDY[d];
    if (!inBounds(nx, ny)) return;
    const j = ny * WIDTH + nx, nid = grid[j];
    if (nid === ID.EMPTY) return;
    if (DISSP[id] !== 0) {
        if (id === I_BUTTER && T[i] >= 35 && fr() < 0.05) { comps(i, _V); cellRGB(i); writeMix(i, _V, _cr, _cg, _cb, T[i], 0); return; }
        if (T[i] >= DISS[id] && TCLS[nid] === 2 && MIXABLE[nid] && fr() < DISSP[id]) { blendCells(i, j, false); return; }
    }
    if (DIFF[id]) {
        if (MIXABLE[nid] && TCLS[nid] === 2 && (nid !== id || MIXISH[id]) && fr() < 0.003) blendCells(i, j, true);
        return;
    }
    switch (id) {
        case I_SODA: {
            // Vinegar / lemon juice + baking soda -> fizzing CO2 bubbles.
            if (nid === I_ACID || nid === I_VINEGAR || nid === I_LJ || nid === ID.CITRIC_ACID) {
                setCell(nx, ny, nid === I_ACID ? I_SW : I_WATER);
                setCell(x, y, ID.WATER);
                logReaction('vinegar-bicarb','VINEGAR + BAKING SODA','Carbon dioxide bubbles were released in the liquid.');
                emitRisingBubbles(x, y, 3 + (fr() * 4 | 0));
                addPressureAt(x, y, 0.025);
            } else if (MIXISH[nid] && comps(j, _V) && _V[3] >= 2) {
                _V[3] -= 2; cellRGB(j); writeMix(j, _V, _cr, _cg, _cb, T[j], cookGrid[j]);
                setCell(x, y, ID.WATER); emitRisingBubbles(x, y, 2 + (fr() * 3 | 0));
            }
            return;
        }
        case I_LYE: {
            if (nid === I_ACID || nid === I_VINEGAR || nid === I_LJ || nid === ID.CITRIC_ACID) {
                setCell(x, y, I_SW); setCell(nx, ny, ID.WATER);
                T[i] = Math.max(T[i], 34); T[j] = Math.max(T[j], 34); logReaction('neutralization','ACID + BASE','The local pH moved toward neutral while the mixture warmed.'); return;
            }
            if ((ORGANIC[nid] || EL_BY_ID[nid].type === 'creature') && fr() < 0.02) { setCell(nx, ny, ID.EMPTY); if (fr() < 0.25) setCell(x, y, I_WATER); }
            return;
        }
        case I_YEAST: {
            const t0 = T[i];
            if (t0 > 60) { if (fr() < 0.05) setCell(x, y, ID.EMPTY); return; }
            if (t0 < 20 || t0 > 45 || fr() > 0.01) return;
            if (nid === I_JUICE) { setCell(nx, ny, ID.ETHANOL); emitNear(i, I_CO2); logReaction('fermentation','FERMENTATION','Yeast converted sugars into ethanol and carbon dioxide.'); }
            else if (MIXISH[nid] && comps(j, _V) && _V[1] >= 2) { _V[1] -= 1; cellRGB(j); writeMix(j, _V, _cr, _cg, _cb, T[j], cookGrid[j]); emitNear(j, I_CO2); }
            return;
        }
        case I_STEEL: {
            if (((nid === I_WATER || nid === I_SW) && fr() < (nid === I_SW ? 0.00075 : 0.00012)) || (nid === I_ACID && fr() < 0.0012)) { setCell(x, y, I_RUST); logReaction('steel-corrosion','STEEL CORROSION','The exposed steel surface slowly oxidized in the moisture model.'); }
            return;
        }
        case ID.IRON: {
            if (((nid === I_WATER || nid === I_SW) && fr() < (nid === I_SW ? 0.00095 : 0.00018)) || (nid === I_ACID && fr() < 0.0016)) { setCell(x,y,ID.RUST); logReaction('iron-corrosion','IRON CORROSION','Moisture or acidic contact slowly converted exposed iron into rust-like oxide in the model.'); }
            return;
        }
        case I_SPARK: {
            if ((nid === I_WATER || nid === I_SW) && fr() < 0.04) {
                setCell(nx, ny, fr() < 0.67 ? I_H2 : I_OXYGEN);
                addPressureAt(nx, ny, 0.002);
            }
            return;
        }
        case ID.COPPER: {
            if ((nid===ID.WATER||nid===ID.SALT_WATER||nid===ID.ACID) && fr() < (nid===ID.SALT_WATER?0.0009:(nid===ID.ACID?0.0008:0.00012))) { setCell(x,y,ID.RUST); colorVar[i]=6; logReaction('copper-corrosion','COPPER CORROSION','Copper changed gradually in the simplified aqueous corrosion model.'); }
            return;
        }
    }
}

function thermalReact(x, y, i, id, el) {
    const t = T[i];

    // Generic phase-change model for the expanded materials. This uses a short
    // dwell timer so a one-frame temperature spike does not instantly change state.
    if (el.phase) {
        const p = el.phase;
        let to = null, threshold = 0, mode = '';
        if (p.boilTo && t >= p.boilAt) { to = p.boilTo; threshold = p.boilAt; mode = 'boil'; }
        else if (p.meltTo && t >= p.meltAt) { to = p.meltTo; threshold = p.meltAt; mode = 'melt'; }
        else if (p.freezeTo && t <= p.freezeAt) { to = p.freezeTo; threshold = p.freezeAt; mode = 'freeze'; }
        else if (p.condenseTo && t <= p.condenseAt) { to = p.condenseTo; threshold = p.condenseAt; mode = 'condense'; }
        if (to && ID[to] !== undefined) {
            const delta = Math.abs(t - threshold);
            cookGrid[i] = Math.min(90, cookGrid[i] + 0.08 + Math.min(3.2, delta * 0.004));
            const dwell = mode === 'boil' ? 24 : mode === 'melt' ? 34 : mode === 'freeze' ? 28 : 22;
            if (cookGrid[i] >= dwell) {
                const target = ID[to];
                setCell(x, y, target);
                T[i] = threshold + (mode === 'melt' || mode === 'boil' ? 2 : -2);
                cookGrid[i] = 0;
                if (typeof logReaction === 'function') logReaction('phase-' + mode, 'PHASE CHANGE', el.name + ' changed state into ' + ELEMENTS[to].name + ' in the thermal model.');
                return true;
            }
        } else if (cookGrid[i] > 0) cookGrid[i] = Math.max(0, cookGrid[i] - 0.35);
    }

    if (id === ID.TORCH) { T[i] = 750; return false; }
    if (id === ID.CRYO) {
        if (t > -196) {
            cookGrid[i] += (t + 196) * 0.25 + 0.2;
            T[i] = -196;
            if (cookGrid[i] >= 60) { setCell(x, y, ID.EMPTY); T[i] = -120; return true; }
        }
        return false;
    }
    if (id === ID.FIRE) {
        const fa = airIdx[i];
        if (!airBlock[fa]) {
            const o = airO2[fa] - 0.004;
            airO2[fa] = o < 0 ? 0 : o;
            if (o < 0.12 && Math.random() < 0.25) { setCell(x, y, Math.random() < 0.5 ? ID.SMOKE : ID.EMPTY); return true; }
        }
        const fd = (Math.random() * 4) | 0, fx = fd === 2 ? x - 1 : (fd === 3 ? x + 1 : x), fy = fd === 0 ? y - 1 : (fd === 1 ? y + 1 : y);
        if (inBounds(fx, fy)) {
            const fn = grid[fy * WIDTH + fx];
            if (fn === I_CO2 && Math.random() < 0.35) { setCell(x, y, ID.EMPTY); return true; }
            if (fn === I_OXYGEN && Math.random() < 0.5) { setCell(fx, fy, ID.FIRE); T[fy * WIDTH + fx] = 900; T[i] = 900; return false; }
        }
        if (t < 220) { const fr0 = Math.random(); setCell(x, y, fr0 < 0.22 ? ID.SMOKE : (fr0 < 0.4 ? I_CO2 : ID.EMPTY)); T[i] = t; return true; }
        return false;
    }

    if (BURN[id] && cookGrid[i] > 0) {
        const ba = airIdx[i];
        if (!airBlock[ba]) { if (airO2[ba] < 0.1) { cookGrid[i] = 0; return false; } airO2[ba] -= 0.0015; }
        cookGrid[i]++;
        T[i] = Math.max(t, 560);
        const d = Math.floor(Math.random() * 4);
        const ni = d === 0 ? i - WIDTH : d === 1 ? i + WIDTH : d === 2 ? i - 1 : i + 1;
        const nx = d === 2 ? x - 1 : d === 3 ? x + 1 : x, ny = d === 0 ? y - 1 : d === 1 ? y + 1 : y;
        if (inBounds(nx, ny)) {
            const nid = grid[ni];
            if (nid === ID.WATER || nid === ID.SALT_WATER) { cookGrid[i] = 0; T[i] = 100; return false; }
            if (nid === ID.EMPTY && Math.random() < 0.6) setCell(nx, ny, ID.FIRE);
        }
        if (cookGrid[i] > BURN[id]) { setCell(x, y, Math.random() < 0.5 ? ID.ASH : ID.EMPTY); return true; }
        return false;
    }

    if (t > IGN[id] && (OXFREE[id] || airBlock[airIdx[i]] || airO2[airIdx[i]] > 0.15) && Math.random() < (el.flam || 0.05) * (1 + Math.min(3, (t - IGN[id]) / 120))) {
        if (el.exp) explode(x, y, OXFREE[id] || airBlock[airIdx[i]] ? el.exp : Math.max(2, Math.round(el.exp * (0.45 + 0.55 * Math.min(1, airO2[airIdx[i]])))));
        else if (BURN[id]) { cookGrid[i] = 1; T[i] = Math.max(t, 560); return false; }
        else { if (id === ID.FUEL) addPressureAt(x, y, 4); setCell(x, y, ID.FIRE); }
        return true;
    }

    if (el.type === 'creature') {
        if (t > 62) {
            cookGrid[i] += (t - 60) * 0.02;
            if (cookGrid[i] >= 60) {
                const burnt = t > 220;
                setCell(x, y, burnt ? ID.CHARRED : ID.COOKED_MEAT);
                if (!burnt) cookGrid[i] = 130;
                return true;
            }
        } else if (t < -25) { setCell(x, y, ID.ICE); return true; }
        else if (cookGrid[i] > 0) cookGrid[i] -= 0.2;
        return false;
    }

    if (FDX[id] && foodFx(x, y, i, id, t)) return true;

    switch (id) {
        case ID.WATER: case ID.SALT_WATER: case ID.MILK: case ID.JUICE: case ID.COOLANT: {
            const salt = id === ID.SALT_WATER, coolant = id === ID.COOLANT, fp = coolant ? -35 : (salt ? -2 : 0), pa = airMax >= 0.5 ? Pair[airIdx[i]] : 0;
            const bp = (coolant ? 125 : (salt ? 102 : 100)) + (pa > 40 ? 40 : (pa < -25 ? -25 : pa)) * 3;
            if (t > bp) {
                cookGrid[i] += Math.min(30, (t - bp) * 0.25) + 0.3;
                T[i] = bp;
                if (cookGrid[i] >= 25) { addPressureAt(x, y, coolant ? 0.55 : 0.8); setCell(x, y, salt && Math.random() < 0.3 ? ID.SALT : ID.STEAM); return true; }
            } else if (t < fp && (id === ID.WATER || salt || coolant)) {
                cookGrid[i] += Math.min(30, (fp - t) * 0.25) + 0.3;
                T[i] = fp;
                if (cookGrid[i] >= 18) { setCell(x, y, ID.ICE); T[i] = fp - 1; return true; }
            } else {
                if (cookGrid[i] > 0) cookGrid[i] = Math.max(0, cookGrid[i] - 0.5);
                if (id === ID.WATER && t > 45 && Math.random() < (t - 45) * 0.00003) {
                    const uy = gravityOn ? y - 1 : y + 1;
                    if (inBounds(x, uy) && grid[uy * WIDTH + x] === ID.EMPTY) { setCell(x, y, ID.STEAM); T[i] = t - 2; return true; }
                }
            }
            return false;
        }
        case ID.ICE: case ID.SNOW:
            if (t > 0) {
                cookGrid[i] += Math.min(30, t * 0.25) + 0.3;
                T[i] = 0;
                if (cookGrid[i] >= (id === ID.ICE ? 20 : 8)) { setCell(x, y, ID.WATER); T[i] = 1; return true; }
            } else if (cookGrid[i] > 0) cookGrid[i] -= 0.3;
            return false;
        case ID.STEAM:
            {
                const pa = airMax >= 0.5 ? Pair[airIdx[i]] : 0;
                if (t < 70 + (pa > 40 ? 40 : (pa < -25 ? -25 : pa)) * 3 && Math.random() < 0.006) { setCell(x, y, ID.WATER); T[i] = t + 10; return true; }
            }
            return false;
        case ID.GLASS:
            if ((t > 180 || t < -15) && Math.random() < 0.08) {
                const d = Math.floor(Math.random() * 4), nx = d === 2 ? x - 1 : d === 3 ? x + 1 : x, ny = d === 0 ? y - 1 : d === 1 ? y + 1 : y;
                if (inBounds(nx, ny)) {
                    const ni = ny * WIDTH + nx, nid = grid[ni];
                    if ((t > 180 && QUENCH[nid] && T[ni] < t - 200) || (t < -15 && TCLS[nid] === 2 && T[ni] > t + 220)) { setCell(x, y, ID.EMPTY); sfx('glass'); return true; }
                }
            }
            return false;
        case ID.LAVA: {
            // Lava should stay molten for a while. It only crusts over after
            // sustained cooling, or much faster when directly quenched by a
            // cold liquid/ice cell. cookGrid is used here as a cooling timer.
            let coldContact = false;
            const neighbours = [i - WIDTH, i + WIDTH, i - 1, i + 1];
            for (let n = 0; n < 4; n++) {
                const ni = neighbours[n];
                if (ni < 0 || ni >= size) continue;
                if ((n === 2 && x === 0) || (n === 3 && x === WIDTH - 1)) continue;
                const nid = grid[ni];
                if (QUENCH[nid] && T[ni] < 100 && t - T[ni] > 350) { coldContact = true; break; }
            }

            let coolingRate = 0;
            if (t < 250) coolingRate = 2.0;
            else if (t < 350) coolingRate = 0.8;
            else if (t < 450) coolingRate = 0.2;

            if (coldContact && t < 1050) coolingRate += 2.5;
            if (coolingRate > 0) cookGrid[i] = Math.min(600, cookGrid[i] + coolingRate);
            else cookGrid[i] = Math.max(0, cookGrid[i] - 1.5);

            // 300 cooling points prevents one brief temperature dip from
            // instantly turning a whole pool into stone.
            if (cookGrid[i] >= 300) { setCell(x, y, ID.STONE); return true; }
            return false;
        }
        case ID.STONE:
            if (t > 1150 && Math.random() < 0.02) { setCell(x, y, ID.LAVA); return true; }
            return false;
        case ID.SAND:
            if (t > 1000 && Math.random() < 0.03) { setCell(x, y, ID.GLASS); return true; }
            return false;
        case ID.OIL:
            if (t > 230 && Math.random() < 0.004 && y > 0 && grid[i - WIDTH] === ID.EMPTY) setCell(x, y - 1, ID.SMOKE);
            return false;

        case I_MIX: case I_PASTE: case I_BAKED: return mixThermal(x, y, i, id, t);
        case I_EGG:
            if (t > 68) { comps(i, _A); cellRGB(i); writeMix(i, _A, _cr, _cg, _cb, t, 50); return true; }
            return false;

        case ID.RAW_MEAT: case ID.COOKED_MEAT: {
            let p = cookGrid[i];
            if (t >= 55 && p < 140) p += (t - 50) * 0.012;
            if (t > 170) p += (t - 170) * 0.01;
            cookGrid[i] = p;
            if (id === ID.RAW_MEAT && p >= 120) { setCell(x, y, ID.COOKED_MEAT); cookGrid[i] = p; return true; }
            if (p >= 255) { setCell(x, y, ID.CHARRED); return true; }
            return false;
        }

        case ID.DOUGH:
            if (t >= 90) {
                cookGrid[i] += (t - 85) * 0.012;
                if (cookGrid[i] >= 100) { setCell(x, y, ID.BREAD); cookGrid[i] = 100; return true; }
            }
            return false;
        case ID.BREAD: {
            let p = Math.max(100, cookGrid[i]);
            if (t > 190) p += (t - 190) * 0.01;
            cookGrid[i] = p;
            if (p >= 255) { setCell(x, y, ID.CHARRED); return true; }
            return false;
        }

        case ID.CHEESE:
            if (t >= 62 && Math.random() < 0.1) { setCell(x, y, ID.MELTED_CHEESE); return true; }
            return false;
        case ID.MELTED_CHEESE:
            if (t < 45 && Math.random() < 0.05) { setCell(x, y, ID.CHEESE); return true; }
            if (t > 220) {
                cookGrid[i] += (t - 220) * 0.02;
                if (cookGrid[i] >= 40) { setCell(x, y, ID.CHARRED); return true; }
            }
            return false;
    }
    return false;
}

