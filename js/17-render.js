const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const BG = new Uint8Array(size * 3);
const CLOUDS = [[60, 30, 22, 6], [75, 33, 16, 5], [170, 52, 26, 7], [190, 56, 18, 5], [280, 24, 24, 6], [300, 28, 14, 4], [120, 70, 16, 4]];
(function buildBackground() {
    const sky = [[56, 118, 214], [96, 160, 236], [156, 202, 246], [226, 238, 250]];
    const hz = HEIGHT * 0.78, h1 = (a, b) => { let v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };
    const ridge = (x, seed, amp, base) => {
        let h = 0; for (let o = 0; o < 4; o++) { const f = 0.035 * (1 << o); h += Math.sin(x * f + seed * (o + 1.7)) * amp / (1 << o); }
        return Math.round(base - h);
    };
    for (let y = 0; y < HEIGHT; y++) for (let x = 0; x < WIDTH; x++) {
        const t = Math.min(1, y / hz) * 3, k = Math.min(2, Math.floor(t)), f = t - k, a = sky[k], b = sky[k + 1];
        const bay = BAYER[(x & 3) | ((y & 3) << 2)] - 7.5;
        let c = [0, 1, 2].map(q => a[q] + (b[q] - a[q]) * f);
        if (y > ridge(x, 1.3, 30, hz - 62)) c = [132, 156, 206];
        if (y > ridge(x, 4.1, 24, hz - 34)) c = [96, 122, 176];
        for (const cl of CLOUDS) { const u = (x - cl[0]) / cl[2], w = (y - cl[1]) / cl[3]; if (u * u + w * w <= 1 && y < hz - 30) c = w > 0.35 ? [206, 220, 242] : [248, 250, 255]; }
        const i = (y * WIDTH + x) * 3;
        for (let q = 0; q < 3; q++) BG[i + q] = Math.max(0, Math.min(255, Math.floor((c[q] + bay * 1.6) / 8) * 8));
    }
})();
const TCLS = new Uint8Array(1024), OPEN = new Uint8Array(1024), STY = [];
for (const k in ELEMENTS) {
    const e = ELEMENTS[k];
    TCLS[e.id] = (e.type === 'solid' || e.type === 'powder') ? 1 : (e.type === 'liquid' ? 2 : 0);
    OPEN[e.id] = (e.type === 'empty' || e.type === 'gas' || e.type === 'energy') ? 1 : 0;
}
const liqDepth = new Uint8Array(size);
let renderTick = 0;
const _STY = { SAND: [9, 24, 14, 0], DIRT: [10, 16, 16, 9], STONE: [8, 20, 20, 14], STEEL: [4, 34, 20, 3], WOOD: [5, 20, 14, 5], ASH: [8, 14, 10, 6], GUNPOWDER: [8, 16, 10, 6],
    SNOW: [4, 12, 10, 3], ICE: [4, 26, 12, 4], GLASS: [3, 30, 12, 0], COPPER: [5, 26, 16, 4], SUGAR: [3, 18, 10, 0], SALT: [3, 18, 10, 0], FLOUR: [4, 14, 10, 0] };
for (const k in _STY) if (ELEMENTS[k]) STY[ELEMENTS[k].id] = _STY[k];
const DEF_STY = [6, 18, 12, 4];
const blockNoise = (x, y) => (((x >> 1) * 73856093) ^ ((y >> 1) * 19349663)) & 255;

const imgData = ctx.createImageData(WIDTH, HEIGHT);
const pixels = imgData.data;

function render() {
    renderTick++;
    for (let i = 0; i < size; i++) {
        const id = grid[i], t = T[i], p = i * 4;
        let r, g, b, sk = 0, skd = false;
        if (viewMode === 1) {
            const f = Math.max(0, Math.min(1, (t + 60) / 900));
            r = Math.min(255, f * 2.6 * 255);
            g = Math.max(0, Math.min(255, (f - 0.35) * 2.4 * 255));
            b = Math.max(0, Math.min(255, 110 - f * 260));
            if (id !== 0) { r = r * 0.85 + 25; g = g * 0.85 + 25; b = b * 0.85 + 25; }
        } else {
            const el = EL_BY_ID[id], v = colorVar[i];
            if (COOKABLE[id]) { cookColor(id, cookGrid[i]); r = _r + v; g = _g + v; b = _b + v; }
            else if (FDV[id]) { fxColor(id, i); r = _r + v; g = _g + v; b = _b + v; }
            else { r = el.color[0] + v; g = el.color[1] + v; b = el.color[2] + v; }
            sk = skin[i]; skd = id !== 0 && (sk >>> 24) === id;
            if (MIXISH[id]) {
                if ((sk >>> 24) === 255) { r = ((sk >> 16) & 255) + v; g = ((sk >> 8) & 255) + v; b = (sk & 255) + v; }
                const ck = cookGrid[i];
                if (ck > 0) { const f = (ck > 255 ? 255 : ck) / 255 * (id === I_BAKED ? 0.75 : 0.5); r += (70 - r) * f; g += (38 - g) * f; b += (18 - b) * f; }
            }
            if (skd) { r = (sk >> 16) & 255; g = (sk >> 8) & 255; b = sk & 255; }
            if (viewMode === 0 && id === ID.PC_MONITOR && metaGrid[i] === 2) {
                const sx=i%WIDTH, sy=(i/WIDTH)|0, mode=lifeGrid[i];
                if (mode >= 50) { if (sy%9===0) { r=24; g=38; b=62; } else if ((sx%17)<2 && (sy%7)<5) { r=76; g=190; b=230; } else { r=18+(sx*7%18); g=42+(sy*9%35); b=76+(sx+sy)%70; } }
                else if (mode >= 25) { const bar=(sx%19)<Math.max(2,Math.floor((mode-20)*0.65)); r=bar?60:8; g=bar?180:22; b=bar?230:48; }
                else if (mode > 0) { const line=(sy%7===0)||(sx%23<3 && sy%11<5); r=line?105:8; g=line?230:38; b=line?145:18; }
                else { r=10; g=15; b=23; }
            }
            if (viewMode === 0 && id === ID.LED && lifeGrid[i] > 0) { r=110; g=255; b=160; }
            if (viewMode===0 && id===ID.INDICATOR) { const ph=phGrid[i]; if(ph<4.5){r=225;g=45;b=75;} else if(ph<6.5){r=235;g=135;b=65;} else if(ph<8.5){r=90;g=195;b=105;} else if(ph<11){r=65;g=135;b=220;} else {r=145;g=75;b=190;} }
            if (viewMode===0 && id===ID.PH_METER) { const ph=phGrid[i]; if(ph<7){r=230;g=70;b=90;} else {r=65;g=210;b=130;} }
            if (viewMode===0 && [ID.AND_GATE,ID.OR_GATE,ID.NOT_GATE,ID.XOR_GATE,ID.MEMORY].includes(id) && lifeGrid[i]>0) { r=110;g=255;b=150; }
            if (viewMode === 0 && id === ID.FOAM) {
                const fx = i % WIDTH, fy = (i / WIDTH) | 0;
                const bubble = ((fx * 7 + fy * 11 + (lifeGrid[i] >> 3)) % 17);
                const shimmer = ((fx * 3 + fy * 5 + (renderTick >> 2)) % 29) === 0;
                if (bubble < 3 || shimmer) { r = 248; g = 255; b = 243; }
                else if (bubble < 8) { r = 198; g = 255; b = 221; }
                else if (bubble < 13) { r = 128; g = 226; b = 174; }
                else { r = 161; g = 240; b = 190; }
            }
            if (viewMode === 0) {
                const tc = TCLS[id]; liqDepth[i] = 0;
                if (id === 0) { r = 0; g = 0; b = 0; }
                else if (!skd && tc) {
                    const x = i % WIDTH, y = (i / WIDTH) | 0;
                    const up = y > 0 ? grid[i - WIDTH] : 1, dn = y < HEIGHT - 1 ? grid[i + WIDTH] : 1, lf = x > 0 ? grid[i - 1] : 1, rt = x < WIDTH - 1 ? grid[i + 1] : 1;
                    const bay = BAYER[(x & 3) | ((y & 3) << 2)] - 7.5;
                    let L = 0;
                    if (tc === 1) {
                        const st = STY[id] || DEF_STY;
                        L += bay * st[0] * 0.3;
                        if (st[3]) L += (blockNoise(x, y) / 255 - 0.5) * st[3] * 2;
                        if (id === ID.WOOD && (y & 3) === 0) L -= 9;
                        if (OPEN[up]) L += st[1]; else if (y > 1 && OPEN[grid[i - 2 * WIDTH]]) L += st[1] * 0.35;
                        if (OPEN[lf]) L += st[1] * 0.5; else if (x > 1 && OPEN[grid[i - 2]]) L += st[1] * 0.2;
                        if (y > 0 && x > 0 && OPEN[grid[i - WIDTH - 1]]) L += st[1] * 0.6;
                        if (y < HEIGHT - 1 && x < WIDTH - 1 && OPEN[grid[i + WIDTH + 1]]) L -= st[2] * 0.5;
                        if (OPEN[dn]) L -= st[2]; if (OPEN[rt]) L -= st[2] * 0.6;
                        r += L; g += L * 0.94; b += L * 0.8;
                    } else {
                        const d = OPEN[up] ? 0 : (TCLS[up] === 2 ? Math.min(250, liqDepth[i - WIDTH] + 1) : 0);
                        liqDepth[i] = d;
                        if (id === ID.LAVA) {
                            L = bay * 3 + Math.sin(x * 0.4 + y * 0.7 + renderTick * 0.12) * 18 + (blockNoise(x, y + (renderTick >> 4)) / 255 - 0.5) * 60 + (d === 0 ? 30 : 0);
                            r = r * 0.8 + L; g = g * 0.6 + L * 0.7; b = b * 0.5 + L * 0.3;
                        } else {
                            L = bay * 1.4 + Math.sin(x * 0.55 + y * 0.9 + renderTick * 0.08) * 6 - Math.min(d * 2.2, 62);
                            if (d === 0) { L += 38; r += 20; g += 28; b += 20; }
                            if (((x * 7 + y * 13 + (renderTick >> 3) * 17) & 63) === 0) L += 90;
                            r += L * 0.8 - d * 0.9; g += L * 0.95 - d * 0.5; b += L;
                        }
                    }
                }
            }
            if (id !== 0 && t > 380) {
                const f = Math.min(1, (t - 380) / 520);
                r += (255 - r) * f; g += (120 - g) * f * 0.8; b += (20 - b) * f * 0.8;
            } else if (id !== 0 && t < -30) {
                const f = Math.min(0.5, (-30 - t) / 300);
                r -= r * f; b += (255 - b) * f * 0.5;
            }
        }
        if (viewMode === 0) {
            if (sp[i] >= 6)               { r += (255 - r) * 0.75; g += (235 - g) * 0.75; b += (110 - b) * 0.6; }
            else if (skd) {
                if (sk & 1) {
                    if (id === ID.LAMP) {
                        if (lifeGrid[i] > 0) { if (b < 60) { r = 255; g = 255; b = 235; } else { r = r * 0.2 + 204; g = g * 0.2 + 192; b = b * 0.2 + 120; } }
                    } else if (id === ID.LASER) { if (lifeGrid[i] > 0) { r = r * 0.15 + 110; g = g * 0.15 + 217; b = b * 0.15 + 140; } }
                    else if (id === ID.SWITCH) { if (metaGrid[i] === 1) { const k = r / 150; r = 60 * k; g = 190 * k; b = 80 * k; } }
                    else if (id === ID.PHOTO) { r = r * 0.45 + 140; g = g * 0.45 + 139; b = b * 0.45 + 110; }
                }
            }
            else if (id === ID.LAMP)      { if (lifeGrid[i] > 0) { r = 255; g = 245; b = 170; } else { r = 120; g = 116; b = 90; } }
            else if (id === ID.LASER)     { if (lifeGrid[i] > 0) { r = 120; g = 255; b = 150; } }
            else if (id === ID.SWITCH)    { if (metaGrid[i] === 1) { r = 60; g = 190; b = 80; } else { r = 150; g = 50; b = 50; } }
            else if (id === ID.HEATER)    { if (lifeGrid[i] > 0) { r = 255; g = 110 + (renderTick & 8) * 4; b = 40; } else { r = 150; g = 70; b = 50; } }
            else if (id === ID.COOLER)    { if (lifeGrid[i] > 0) { r = 150; g = 225; b = 255; } else { r = 70; g = 120; b = 160; } }
            else if (id === ID.MAGNETRON) { if (lifeGrid[i] > 0) { r = 220; g = 130 + (renderTick & 8) * 6; b = 255; } else { r = 110; g = 70; b = 140; } }
            else if (id === ID.THERMOSTAT || id === ID.THERMOSTAT_H || id === ID.TIMER) { if (metaGrid[i] === 1) { r = 70; g = 210; b = 90; } else { r = 160; g = 60; b = 60; } }
            else if (id === ID.REPEATER)  { const m = metaGrid[i], c = [[235, 80, 70], [90, 200, 100], [80, 150, 245], [245, 205, 70]][m & 3], k = 0.6 + ((m >> 2) & 3) * 0.13; r = c[0] * k; g = c[1] * k; b = c[2] * k; if (lifeGrid[i] > 0) { r = 255; g = 255; b = 255; } }
            else if (id === ID.CONVEYOR)  { r = 96 + (((x0c(i) + (renderTick >> 2)) & 3) < 2 ? 30 : 0); g = r; b = r + 14; }
            else if (id === ID.PHOT)      { r = 255; g = 252; b = 200; }
        }
        if (viewMode === 2) {
            const a = airIdx[i], pv = Pair[a], f = Math.min(1, Math.abs(pv) / 12);
            r = r * 0.45 + (pv > 0 ? 255 * f : 0); g = g * 0.45 + (pv > 0 ? 40 * f : 80 * f); b = b * 0.45 + (pv < 0 ? 255 * f : 0) + (airBlock[a] ? 0 : 25);
        }
        pixels[p]     = r < 0 ? 0 : (r > 255 ? 255 : r);
        pixels[p + 1] = g < 0 ? 0 : (g > 255 ? 255 : g);
        pixels[p + 2] = b < 0 ? 0 : (b > 255 ? 255 : b);
        pixels[p + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);
    drawBeginnerGhost();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    drawCursor();
    ctx.stroke();
}

let lastTime = performance.now();
let frames = 0;

const scienceSeries={temp:[],pressure:[]};
let scienceTab='live';
function setScienceTab(tab) {
    scienceTab=tab;
    document.getElementById('science-live').hidden=tab!=='live';
    document.getElementById('science-chart').hidden=tab!=='live';
    document.getElementById('science-journal').hidden=tab!=='journal';
    document.getElementById('science-tools').hidden=tab!=='tools';
    for(const [id,key] of [['science-tab-live','live'],['science-tab-journal','journal'],['science-tab-tools','tools']]) document.getElementById(id).classList.toggle('active',tab===key);
    if(tab==='journal') renderScienceJournal();
}
function openScience(tab='live') { const p=document.getElementById('science-panel'); p.hidden=false; setScienceTab(tab); updateScienceConsole(); }
function closeScience() { document.getElementById('science-panel').hidden=true; }
function renderScienceJournal() {
    const box=document.getElementById('science-journal'); box.innerHTML='';
    if(!reactionJournal.length) { box.textContent='NO DISCOVERIES YET. Run an experiment to record the first reaction.'; return; }
    for(const e of reactionJournal) { const d=document.createElement('div'); d.className='journal-entry'; const title=document.createElement('b'); title.textContent=e.title+'  x'+e.count; const detail=document.createElement('div'); detail.textContent=e.detail; d.append(title,detail); box.appendChild(d); }
}
function drawScienceChart() {
    const c=document.getElementById('science-chart'); if(!c||c.hidden) return; const g=c.getContext('2d'); g.clearRect(0,0,c.width,c.height); g.fillStyle='#050505'; g.fillRect(0,0,c.width,c.height);
    g.strokeStyle='#303030'; g.lineWidth=1; for(let y=12;y<c.height;y+=16){g.beginPath();g.moveTo(0,y);g.lineTo(c.width,y);g.stroke();}
    const arr=scienceSeries.temp, max=Math.max(100,...arr); g.strokeStyle='#ffb45e'; g.beginPath(); arr.forEach((v,i)=>{const x=i*(c.width-4)/Math.max(1,arr.length-1),y=c.height-3-(Math.max(0,v)/max)*(c.height-8); if(i===0)g.moveTo(x,y);else g.lineTo(x,y);});g.stroke();
    const pr=scienceSeries.pressure, pmax=Math.max(1,...pr); g.strokeStyle='#70c8ff';g.beginPath();pr.forEach((v,i)=>{const x=i*(c.width-4)/Math.max(1,pr.length-1),y=c.height-3-(Math.max(0,v)/pmax)*(c.height-8);if(i===0)g.moveTo(x,y);else g.lineTo(x,y);});g.stroke();
    g.font='7px monospace';g.fillStyle='#ffb45e';g.fillText('TEMP',4,9);g.fillStyle='#70c8ff';g.fillText('PRESSURE',42,9);
}
function updateScienceConsole() {
    const p=document.getElementById('science-panel'); if(!p||p.hidden) return;
    if(scienceTab==='live') {
        let i=-1; if(inBounds(mouseX,mouseY)) i=idx(mouseX,mouseY); else if(inBounds(WIDTH>>1,HEIGHT>>1)) i=idx(WIDTH>>1,HEIGHT>>1);
        const id=i>=0?grid[i]:0, el=EL_BY_ID[id];
        const ph=i>=0?estimatePHAt(i%WIDTH,(i/WIDTH)|0):7;
        const pressure=i>=0?Pair[airIdx[i]]:0;
        document.getElementById('science-live').textContent=[
            'MATERIAL: '+(el?el.name:'EMPTY'),
            'PARTICLES: '+countCells(),
            'TEMPERATURE: '+(i>=0?T[i].toFixed(1):'--')+' C',
            'PRESSURE: '+pressure.toFixed(2),
            'LOCAL pH: '+ph.toFixed(1),
            'ELECTRICAL SIGNAL: '+(i>=0?sp[i]:0)+'/9',
            'CHEMICAL DISCOVERIES: '+reactionJournal.length,
            'FPS: '+(document.getElementById('hud-fps').textContent||'--'),
            '', 'GRAPH: TEMPERATURE (ORANGE) / PRESSURE (BLUE)'
        ].join('\n');
        if(i>=0 && (renderTick&7)===0) { scienceSeries.temp.push(T[i]); scienceSeries.pressure.push(Math.max(0,pressure)); if(scienceSeries.temp.length>70)scienceSeries.temp.shift(); if(scienceSeries.pressure.length>70)scienceSeries.pressure.shift(); }
        drawScienceChart();
    }
}
document.getElementById('btn-science').onclick=()=>openScience('live');
document.getElementById('btn-science-close').onclick=closeScience;
document.getElementById('science-tab-live').onclick=()=>setScienceTab('live');
document.getElementById('science-tab-journal').onclick=()=>setScienceTab('journal');
document.getElementById('science-tab-tools').onclick=()=>setScienceTab('tools');
document.getElementById('btn-gen-geology').onclick=()=>{pushUndo();generateGeologyWorld();};
document.getElementById('btn-logic-demo').onclick=()=>{pushUndo();generateLogicDemo();};
document.getElementById('btn-science-geology').onclick=()=>{pushUndo();generateGeologyWorld();};
document.getElementById('btn-science-logic-demo').onclick=()=>{pushUndo();generateLogicDemo();};
document.getElementById('btn-journal-clear').onclick=()=>{if(confirm('Clear the reaction discovery journal?')){reactionJournal=[];try{localStorage.removeItem('omni_v21_reaction_journal');}catch(e){}renderScienceJournal();}};

let simAcc = 0, simPrev = 0, simErrCount = 0;
function loop(now) {
    requestAnimationFrame(loop);
    try {
        if (isDrawing && !shapeStart && !isCreatureId(paintEl)) drawBrush(mouseX, mouseY, mouseX, mouseY, paintEl);
        // Pas de temps fixe (60 Hz) : même vitesse sur écrans 60/120/144 Hz
        const dt = simPrev ? Math.min(now - simPrev, 100) : 16.667; simPrev = now;
        simAcc += dt;
        let steps = 0;
        while (simAcc >= 16.667 && steps < 3) {
            simAcc -= 16.667; steps++;
            if (!isPaused) for (let k = 0; k < simSpeed; k++) stepSimulation();
        }
        if (simAcc > 50) simAcc = 0;
        render();
        if ((frames & 7) === 0) hoverInfo();
    } catch (e) {
        console.error('Simulation error', e);
        if (++simErrCount >= 3) { isPaused = true; try { setPaused(true); flash('Simulation error - paused'); } catch (_) {} simErrCount = 0; }
    }
    frames++;
    if (now - lastTime >= 1000) {
        document.getElementById('hud-fps').innerText = frames;
        frames = 0;
        lastTime = now;
    }
}

function toggleShape() {
    brushShape ^= 1;
    refreshButtons();
}
document.getElementById('btn-shape').onclick = toggleShape;
document.getElementById('btn-undo').onclick = undo;
document.getElementById('btn-save').onclick = openModal;
document.getElementById('btn-load').onclick = openModal;
window.addEventListener('keydown', e => {
    if (e.target && e.target.tagName === 'INPUT' && e.target.type === 'text') return;
    const k = e.key.toLowerCase();
    if (e.ctrlKey || e.metaKey) {
        if (k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
        else if (k === 'y') { e.preventDefault(); redo(); }
        else if (k === 's') { e.preventDefault(); doSave(); }
        else if (k === 'o') { e.preventDefault(); doLoad(); }
        return;
    }
    if (k === ' ') { e.preventDefault(); setPaused(!isPaused); }
    else if (k === 'f') { setPaused(true); stepSimulation(); }
    else if (e.key === 'Escape' && (planArmed || planCapture)) { planArmed = null; planCapture = null; renderPalette(''); flash(t('plan.cancelled')); }
    else if (k === 'm' && planArmed) { planMir = !planMir; flash(planMir ? t('plan.mirrorOn') : t('plan.mirrorOff')); }
    else if (k === 'r' && PIECE[currentEl]) { pieceRot = (pieceRot + (e.shiftKey ? 3 : 1)) & 3; flash(t('piece.rotated', { deg: pieceRot * 90 })); }
    else if (k === 'm' && PIECE[currentEl]) { pieceMir = !pieceMir; flash(pieceMir ? t('piece.mirrorOn') : t('piece.mirrorOff')); }
    else if (k === '[') setBrush(brushSize - 1);
    else if (k === ']') setBrush(brushSize + 1);
    else if (k === 'tab') { e.preventDefault(); toggleShape(); }
    else if (k === 'g') document.getElementById('btn-gravity').click();
    else if (k === '1' || k === '2' || k === '3') setView(+k - 1);
});
document.getElementById('btn-help').onclick = () => alert(t('ui.help').split(' · ').join('\n'));
document.getElementById('btn-diagnostics').onclick = () => { diagnosticsOn=!diagnosticsOn; const b=document.getElementById('btn-diagnostics'); b.textContent='Diagnostics: '+(diagnosticsOn?'ON':'OFF'); b.classList.toggle('active',diagnosticsOn); const panel=document.getElementById('diag-panel'); panel.hidden=!diagnosticsOn; if(diagnosticsOn) hoverInfo(); };
document.getElementById('btn-beginner').onclick = () => { beginnerMode=!beginnerMode; if(!beginnerMode) beginnerGuide=null; updateBeginnerUI(); };
document.getElementById('btn-guide-pc').onclick = () => startBeginnerGuide('pc');
document.getElementById('btn-guide-car').onclick = () => startBeginnerGuide('car');
document.getElementById('btn-guide-exit').onclick = () => { beginnerMode=false; beginnerGuide=null; updateBeginnerUI(); };
document.getElementById('btn-zoomin').onclick = () => zoomCenter(1.5);
document.getElementById('btn-zoomout').onclick = () => zoomCenter(1 / 1.5);
document.getElementById('btn-zoomreset').onclick = resetView;
document.getElementById('btn-sound').onclick = e => { soundOn = !soundOn; refreshButtons(); e.currentTarget.classList.toggle('active', !soundOn); sfx('blip'); };
document.getElementById('btn-modal-close').onclick = closeModal;
document.getElementById('save-modal').onclick = e => { if (e.target.id === 'save-modal') closeModal(); };
document.getElementById('btn-export').onclick = exportFile;
document.getElementById('btn-import').onclick = () => document.getElementById('file-import').click();
document.getElementById('file-import').onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader(); r.onload = () => importText(r.result); r.readAsText(f); e.target.value = '';
};
window.addEventListener('keydown', e => {
    if (e.target && e.target.tagName === 'INPUT' && e.target.type === 'text') return;
    if (e.key === 'Escape') closeModal();
    else if (!e.ctrlKey && !e.metaKey && (e.key === '+' || e.key === '=')) zoomCenter(1.5);
    else if (!e.ctrlKey && !e.metaKey && (e.key === '-' || e.key === '_')) zoomCenter(1 / 1.5);
    else if (!e.ctrlKey && !e.metaKey && e.key === '0') resetView();
});

setInterval(() => { if (!isPaused && countCells() > 0) writeSlot('omni_slot_auto', true); }, 30000);
window.addEventListener('beforeunload', () => { if (countCells() > 0) writeSlot('omni_slot_auto', true); });
function resetWorld() { scienceSeries.temp.length=0; scienceSeries.pressure.length=0; grid.fill(0); colorVar.fill(0); skin.fill(0); lifeGrid.fill(0); metaGrid.fill(0); T.fill(AMBIENT); cookGrid.fill(0); vel.fill(0); mix.fill(0); solutionGrid.fill(0); phGrid.fill(7); airO2.fill(1); Pair.fill(0); airMax = 0; sp.fill(0); spN.fill(0); updated.fill(0); mechOwner.fill(0); mechDirty = true; bodies = []; couplings = []; pinPos = []; vehicles = []; vehDirty = true; }
function putLine(x0, y0, x1, y1, id) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1); for (let k = 0; k <= n; k++) setCell(Math.round(x0 + (x1 - x0) * k / n), Math.round(y0 + (y1 - y0) * k / n), id); }
function putRing(cx, cy, r, id) { const n = Math.ceil(4 * Math.PI * r); for (let k = 0; k < n; k++) { const a = 2 * Math.PI * k / n; setCell(Math.round(cx + r * Math.cos(a)), Math.round(cy + r * Math.sin(a)), id); } }
function putWheel(cx, cy, r, pivot, ringId) { setCell(cx, cy, pivot); putRing(cx, cy, r, ringId); for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) putLine(cx + d[0], cy + d[1], cx + d[0] * (r - 1), cy + d[1] * (r - 1), ID.ROTOR); }

function genElectricDemo() {
    resetWorld(); const E = ID;
    putWheel(120, 110, 12, E.MOTOR, E.GEAR);
    putWheel(140, 110, 6, E.AXLE, E.GEAR);
    setCell(145, 110, E.PIN); setCell(135, 110, E.PIN);
    setCell(147, 110, E.HALL); putLine(148, 110, 154, 110, E.COPPER); setCell(155, 110, E.LAMP);
    setCell(60, 110, E.BATTERY); putLine(61, 110, 79, 110, E.COPPER); setCell(80, 110, E.SWITCH); metaGrid[idx(80, 110)] = 1; putLine(81, 110, 106, 110, E.COPPER);
    flash(t('demo.electric'));
}

function genCombustionDemo(hallDeg = 300) {
    resetWorld(); const E = ID, hx = 170, hy = 116;
    putLine(175, 75, 175, 104, E.STONE); putLine(185, 75, 185, 104, E.STONE);
    putLine(176, 75, 184, 75, E.VENT); for (let x = 176; x <= 184; x++) if (x !== 180) setCell(x, 104, E.VENT);
    for (let y = 86; y <= 88; y++) putLine(176, y, 184, y, E.PISTON); putLine(180, 89, 180, 107, E.PISTON);
    putWheel(hx, hy, 8, E.MOTOR, E.ROTOR); setCell(hx, hy - 6, E.PIN);
    const a = hallDeg * Math.PI / 180, px = Math.round(hx - 10.5 * Math.sin(a)), py = Math.round(hy - 10.5 * Math.cos(a));
    setCell(px, py, E.HALL); putLine(px, py - 1, px, 84, E.COPPER); putLine(px + 1, 84, 174, 84, E.COPPER);
    setCell(175, 84, E.INJECTOR); putLine(174, 83, 174, 78, E.COPPER); setCell(175, 78, E.PLUG);
    setCell(100, hy, E.BATTERY); putLine(101, hy, 129, hy, E.COPPER); setCell(130, hy, E.SWITCH); metaGrid[idx(130, hy)] = 1; putLine(131, hy, hx - 10, hy, E.COPPER);
    flash(t('demo.combustion'));
}

function genCarDemo() {
    resetWorld(); const E = ID, o = -90, hx = 140 + o, hy = 149, fx = 215 + o, X = x => x + o;
    for (let x = 0; x < WIDTH; x++) putLine(x, 159, x, 175, E.STONE);
    putWheel(hx, hy, 8, E.MOTOR, E.ROTOR); putRing(hx, hy, 9, E.TIRE);
    putWheel(fx, hy, 8, E.AXLE, E.ROTOR); putRing(fx, hy, 9, E.TIRE);
    setCell(hx, hy - 6, E.PIN);
    putLine(X(145), 100, X(145), 128, E.INSULATOR); putLine(X(155), 100, X(155), 128, E.INSULATOR);
    putLine(X(146), 100, X(154), 100, E.VENT); for (let x = 146; x <= 154; x++) if (x !== 150) setCell(X(x), 128, E.VENT);
    for (let y = 111; y <= 113; y++) putLine(X(146), y, X(154), y, E.PISTON); putLine(X(150), 114, X(150), 132, E.PISTON);
    const a = 60 * Math.PI / 180, px = Math.round(hx - 10.5 * Math.sin(a)), py = Math.round(hy - 10.5 * Math.cos(a));
    setCell(px, py, E.HALL); putLine(px, py - 1, px, 109, E.COPPER); putLine(px + 1, 109, X(144), 109, E.COPPER);
    setCell(X(145), 109, E.INJECTOR); putLine(X(144), 108, X(144), 103, E.COPPER); setCell(X(145), 103, E.PLUG);
    putLine(X(156), 128, X(156), 146, E.STEEL); putLine(X(157), 128, X(157), 146, E.STEEL);
    for (let y = 145; y <= 148; y++) putLine(X(156), y, X(203), y, E.STEEL);
    setCell(X(100), hy, E.BATTERY); putLine(X(101), hy, X(109), hy, E.COPPER); setCell(X(110), hy, E.SWITCH); metaGrid[idx(X(110), hy)] = 1; putLine(X(111), hy, hx - 10, hy, E.COPPER);
    flash(t('demo.car'));
}


function _groundStrip() { for (let x = 0; x < WIDTH; x++) putLine(x, 159, x, 175, ID.STONE); }

// Voiture électrique : carrosserie + batterie + roue motrice (moteur électrique) + interrupteur.
function genElectricCarDemo(size = 3, x = 60) {
    resetWorld(); _groundStrip(); const keep = brushSize; brushSize = size;
    const b = pieceCells(ID.CAR).box; stampPiece(ID.CAR, x, 159 - (b.y + b.h) - 3)  // posée 3 cases au-dessus du sol : elle tombe et touche proprement; brushSize = keep;
    flash(t(size >= 5 ? 'demo.ecar2' : 'demo.ecar'));
}

// Voiture à moteur thermique : bloc moteur + injecteur + bougie + batterie, deux roues entraînées.
function genEngineCarDemo(ox = 60) {
    resetWorld(); _groundStrip(); const E = ID, oy = 152, R = 7;
    const wheel = cx => { for (let y = -R - 1; y <= R + 1; y++) for (let x = -R - 1; x <= R + 1; x++) { const r = Math.hypot(x, y); if (r <= R + 0.4) setCell(ox + cx + x, oy + y, r >= R - 1.4 ? E.TIRE : E.ROTOR); } setCell(ox + cx, oy, E.AXLE); };
    const rect = (x0, y0, x1, y1, id) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) setCell(ox + x, oy + y, id); };
    wheel(-13); wheel(13);
    rect(-5, -1, 5, 2, E.CHASSIS);                                   // plancher
    rect(-4, -9, 4, -2, E.ENGINE_BLOCK); metaGrid[idx(ox, oy - 3)] = 99; // bloc moteur (cellule centrale = 99)
    rect(-5, -9, -5, -2, E.CHASSIS); rect(5, -9, 5, -2, E.CHASSIS);  // montants
    rect(-9, -11, 9, -11, E.CHASSIS);                                // toit / capot
    rect(-4, -10, 4, -10, E.FUEL);                                   // carburant déjà dans la chambre
    setCell(ox - 4, oy - 11, E.INJECTOR); setCell(ox + 4, oy - 11, E.PLUG);
    rect(-2, -14, 2, -13, E.BATTERY);
    for (const sgn of [-1, 1]) { setCell(ox + 3 * sgn, oy - 13, E.COPPER); setCell(ox + 4 * sgn, oy - 12, E.COPPER); }
    setCell(ox - 3, oy - 12, E.SWITCH); metaGrid[idx(ox - 3, oy - 12)] = 1;  // interrupteur (👆 pour couper)
    setCell(ox + 3, oy - 12, E.COPPER);
    flash(t('demo.engcar'));
}

const PIECE = {}, _pc = {};
const _P = {
    rect(c, x0, y0, w, h, id) { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) c.push([x0 + x, y0 + y, id]); },
    outline(c, x0, y0, x1, y1, thick, id) { for (let k = 0; k < thick; k++) { for (let x = x0 + k; x <= x1 - k; x++) { c.push([x, y0 + k, id], [x, y1 - k, id]); } for (let y = y0 + k + 1; y < y1 - k; y++) { c.push([x0 + k, y, id], [x1 - k, y, id]); } } },
    disc(c, r, id, cx = 0, cy = 0) { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.8) c.push([cx + x, cy + y, id]); },
    line(c, x0, y0, x1, y1, id) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1); for (let k = 0; k <= n; k++) c.push([Math.round(x0 + (x1 - x0) * k / n), Math.round(y0 + (y1 - y0) * k / n), id]); },
    ring(c, r, id) { const n = Math.ceil(4 * Math.PI * r); for (let k = 0; k < n; k++) { const a = 2 * Math.PI * k / n; c.push([Math.round(r * Math.cos(a)), Math.round(r * Math.sin(a)), id]); } },
    cross(c, r, id) { for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) _P.line(c, dx, dy, dx * (r - 1), dy * (r - 1), id); },
    wheel(c, r, pivot, ringId) { _P.ring(c, r, ringId); _P.cross(c, r, ringId); c.push([0, 0, pivot]); }
};
PIECE[ID.BATTERY] = s => { const c = [], w = 2 * s + 4, h = s + 3, x0 = -(w >> 1), y0 = -(h >> 1);
    _P.rect(c, x0, y0, w, h, ID.BATTERY); _P.rect(c, x0 + 1, y0 - 2, 2, 2, ID.COPPER); _P.rect(c, x0 + w - 3, y0 - 2, 2, 2, ID.COPPER); return c; };
PIECE[ID.SWITCH] = s => { const c = [], w = s + 4; _P.rect(c, -(w >> 1), 0, w, 3, ID.SWITCH); _P.rect(c, 0, -(2 + (s >> 1)), 2, 2 + (s >> 1), ID.SWITCH); return c; };
PIECE[ID.LAMP] = s => { const c = [], r = Math.max(1, Math.round(s / 2) + 1), bw = 2 * Math.max(1, r >> 1) + 1;
    _P.disc(c, r, ID.LAMP, 0, -r); _P.rect(c, -(bw >> 1), 1, bw, 2, ID.STEEL); return c; };
PIECE[ID.LASER] = s => { const c = [], w = s + 4, h = Math.max(3, Math.round(s / 2) + 2); _P.rect(c, -(w >> 1), -(h >> 1), w, h, ID.LASER); return c; };
PIECE[ID.THERMO] = s => { const c = [], h = s + 5; _P.rect(c, -1, -(h >> 1), 3, h, ID.THERMO); _P.disc(c, 2, ID.THERMO, 0, (h >> 1) + 1); return c; };
PIECE[ID.BARO] = s => { const c = []; _P.disc(c, Math.max(2, Math.round(s / 2) + 2), ID.BARO); return c; };
PIECE[ID.PHOTO] = s => { const c = [], w = s + 2; _P.rect(c, -(w >> 1), -(w >> 1), w, w, ID.PHOTO); return c; };
PIECE[ID.AXLE] = s => [[0, 0, ID.AXLE]];
PIECE[ID.ROTOR] = s => { const c = [], R = 2 * s + 2;
    for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + 0.3, ex = Math.round(R * Math.cos(a)), ey = Math.round(R * Math.sin(a)); _P.line(c, 0, 0, ex, ey, ID.ROTOR); if (s >= 6) _P.line(c, 1, 0, ex + 1, ey, ID.ROTOR); }
    c.push([0, 0, ID.AXLE]); return c; };
const _gearWheel = (R, pivot) => { const c = [], n = Math.max(8, Math.round(2 * Math.PI * (R + 1) / 3.5));
    _P.wheel(c, R, pivot, ID.GEAR); if (R >= 6) _P.ring(c, R - 1, ID.GEAR);
    if (R >= 5) for (const [hx, hy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) c.push([hx, hy, ID.GEAR]);
    for (let k = 0; k < n; k++) { const a = 2 * Math.PI * k / n; c.push([Math.round((R + 1) * Math.cos(a)), Math.round((R + 1) * Math.sin(a)), ID.GEAR]); } return c; };
PIECE[ID.GEAR] = s => _gearWheel(s + 3, ID.AXLE);
PIECE[ID.MOTOR] = s => _gearWheel(s + 4, ID.MOTOR);
PIECE[ID.PIN] = s => { const c = [], q = Math.max(1, Math.round(s / 3)); _P.rect(c, -(q >> 1), -(q >> 1), q, q, ID.PIN); return c; };
PIECE[ID.PISTON] = s => { const c = []; _P.rect(c, -s, 0, 2 * s + 1, 3, ID.PISTON); _P.line(c, 0, 3, 0, 4 * s + 5, ID.PISTON); if (s >= 8) _P.line(c, 1, 3, 1, 4 * s + 5, ID.PISTON); return c; };
PIECE[ID.VENT] = s => { const c = []; _P.rect(c, -s, 0, 2 * s + 1, 2, ID.VENT); return c; };
PIECE[ID.INJECTOR] = s => { const c = [], q = Math.round(s / 2) + 2; _P.rect(c, -(q >> 1), -(q >> 1), q, q, ID.INJECTOR); return c; };
PIECE[ID.PLUG] = s => { const c = []; _P.rect(c, -1, -((s + 3) >> 1), 2, s + 3, ID.PLUG); return c; };
PIECE[ID.HALL] = s => { const c = [], q = Math.round(s / 2) + 2; _P.rect(c, -(q >> 1), -(q >> 1), q, q, ID.HALL); return c; };

const _mix = (a, b, t) => { t = t < 0 ? 0 : t > 1 ? 1 : t; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; };
const _st = c => { c.st = 1; return c; }, _nb = c => { c.nb = 1; return c; };
function packSkin(id, c, st) { const cl = v => v < 0 ? 0 : v > 255 ? 255 : v | 0; return (((id << 24) | (cl(c[0]) << 16) | (cl(c[1]) << 8) | ((cl(c[2]) & 254) | (st ? 1 : 0))) >>> 0); }
const SKIN = {};
SKIN[ID.BATTERY] = q => { const { x, y, pid, b, s } = q;
    if (pid === ID.COPPER) return _mix([255, 224, 168], [176, 92, 46], y - b.y);
    const top = b.y + 2, h = b.h - 2, ry = y - top, lb = Math.floor(h * 0.4), lh = Math.max(2, Math.round(h * 0.34));
    if (ry <= 1) return _mix([214, 218, 226], [128, 134, 146], ry);
    let c = _mix([240, 74, 60], [122, 16, 26], ry / Math.max(1, h - 1));
    if (h >= 6 && ry >= lb && ry < lb + lh) {
        c = _mix([248, 244, 232], [194, 188, 172], (ry - lb) / lh);
        const my = top + lb + (lh >> 1), lx = b.x + 2, rx = b.x + b.w - 3;
        if (b.w >= 10 && lh >= 3) {
            if ((x === lx && Math.abs(y - my) <= 1) || (y === my && Math.abs(x - lx) <= 1)) c = [200, 30, 30];
            if (y === my && Math.abs(x - rx) <= 1) c = [50, 60, 120];
        }
    } else if (ry === h - 1) c = [90, 10, 16];
    return c; };
SKIN[ID.SWITCH] = q => { const { x, y, b } = q, bx1 = b.x + b.w - 1;
    if (y < 0) { const knob = y - b.y <= 1; return _st(_mix(knob ? [255, 130, 120] : [196, 62, 56], [130, 34, 34], (x + 1) * 0.6)); }
    if ((x === b.x + 1 || x === bx1 - 1) && y === 1) return [226, 228, 236];
    if ((x === 0 || x === 1) && y === 0) return [220, 176, 72];
    return _mix([128, 134, 148], [70, 76, 90], y / 2); };
SKIN[ID.LAMP] = q => { const { x, y, pid, s, b } = q, r = Math.max(1, Math.round(s / 2) + 1), cy = -r;
    if (pid === ID.STEEL) return y === 1 ? [206, 210, 220] : [108, 114, 128];
    const dx = x, dy = y - cy, d = Math.hypot(dx, dy) / (r + 0.6), hh = r >> 1;
    if (r >= 3 && y === cy + 1 && Math.abs(x) === hh) return [96, 96, 108];
    if (r >= 3 && y >= cy + 2 && Math.abs(x) === hh) return [96, 96, 108];
    if (r >= 3 && Math.abs(x) <= hh && y === (x & 1 ? cy : cy + 1) ) return _st([200, 100, 20]);
    if (r < 3 && x === 0 && y === cy) return _st([200, 100, 20]);
    if (-dx * 0.7 - dy * 0.7 > r * 0.62 && d < 0.95) return _st([255, 255, 255]);
    return _st(_mix([224, 238, 244], [112, 152, 176], d * d)); };
SKIN[ID.LASER] = q => { const { x, y, b } = q, bx1 = b.x + b.w - 1, by = b.y + (b.h >> 1);
    if (x >= bx1 - 1) return _st(_mix([70, 150, 160], [30, 70, 84], y > by ? 1 : 0));
    if (x === b.x) return [48, 52, 62];
    if (b.h >= 4 && y === b.y + 1 && ((x - b.x) % 3 === 2)) return [28, 30, 38];
    if (b.h >= 4 && y === by) return [200, 44, 44];
    return _mix([112, 122, 138], [58, 64, 76], (y - b.y) / b.h); };
SKIN[ID.THERMO] = q => { const { x, y, b } = q, h = b.h - 5 + 0, tubeBottom = b.y + b.h - 4;
    const bulbCy = tubeBottom + 2 - 1 + 1;
    if (y > tubeBottom - 1 + 0 && Math.hypot(x, y - (b.y + b.h - 3)) <= 2.6 && y >= tubeBottom - 0) {
        const hl = x <= 0 && y <= b.y + b.h - 4 + 1 && Math.hypot(x + 1, y - (b.y + b.h - 4)) < 1.1; return hl ? [255, 190, 180] : _mix([236, 58, 48], [140, 16, 20], (y - (b.y + b.h - 5)) / 4); }
    const lvl = b.y + Math.round((b.h - 5) * 0.4);
    if (x === -1) return [250, 252, 255];
    if (x === 1) return (y - b.y) % 2 === 0 ? [88, 108, 128] : [156, 176, 192];
    return y >= lvl ? [224, 40, 40] : [232, 242, 248]; };
SKIN[ID.BARO] = q => { const { x, y, s } = q, R = Math.max(2, Math.round(s / 2) + 2), r = Math.hypot(x, y), a = Math.atan2(y, x);
    if (r >= R - 0.6) return _mix([92, 98, 110], [226, 230, 238], 0.5 + 0.5 * Math.cos(a + 2.356));
    if (R >= 4) {
        const na = -0.9, nx = Math.cos(na), ny = Math.sin(na), t = Math.max(0, Math.min(R - 1.5, x * nx + y * ny)), dd = Math.hypot(x - nx * t, y - ny * t);
        if (r < 0.8) return [40, 40, 46];
        if (dd < 0.62 && x * nx + y * ny > 0) return [214, 36, 36];
        for (let k = 0; k <= 8; k++) { const ta = 2.356 + k * (4.712 / 8); if (Math.hypot(x - (R - 1.7) * Math.cos(ta), y - (R - 1.7) * Math.sin(ta)) < 0.62) return [58, 58, 66]; }
    } else if (r < 0.8) return [200, 40, 40];
    return _mix([250, 250, 242], [206, 206, 194], r / R); };
SKIN[ID.PHOTO] = q => { const { x, y, b } = q, mx = b.x + (b.w - 1) / 2, my = b.y + (b.h - 1) / 2, d = Math.hypot(x - mx, y - my) / (b.w / 2);
    if (x === b.x || y === b.y || x === b.x + b.w - 1 || y === b.y + b.h - 1) return [58, 62, 74];
    if (-(x - mx) * 0.7 - (y - my) * 0.7 > b.w * 0.2 && d < 0.8) return _st([240, 248, 255]);
    return _st(_mix([120, 180, 245], [34, 70, 150], d)); };
SKIN[ID.AXLE] = q => [214, 220, 230];
SKIN[ID.PIN] = q => _mix([236, 190, 88], [150, 108, 40], (q.y + q.x + 2) * 0.25);
SKIN[ID.ROTOR] = q => { const { x, y, pid, s } = q, R = 2 * s + 2, r = Math.hypot(x, y);
    if (pid === ID.AXLE || r < 1.5) return [220, 174, 72];
    const a = Math.atan2(y, x), k = Math.round((a - 0.3) / (Math.PI / 3)), odd = ((k % 2) + 2) % 2, t = r / R;
    if (r > R - 1.2) return [226, 74, 64];
    return odd ? _mix([116, 124, 140], [188, 196, 212], t) : _mix([164, 172, 188], [234, 240, 250], t); };
const _gearSkin = motor => q => { const { x, y, pid, b } = q, Tt = (b.w - 1) / 2, R = Tt - 1, r = Math.hypot(x, y), a = Math.atan2(y, x), L = 0.5 + 0.5 * Math.cos(a + 2.356);
    if (x === 0 && y === 0) return _nb(motor ? [255, 104, 70] : [40, 36, 34]);
    if (r <= 1.6) return _nb(_mix([186, 138, 52], [248, 208, 112], L));
    if (r >= R + 0.5) return _nb(_mix([140, 146, 160], [244, 247, 252], L));
    if ((x === 0 || y === 0) && r < R - 0.9) return _nb(_mix([96, 102, 116], [168, 174, 188], L));
    if (motor) { const sec = Math.floor((a + Math.PI) / (2 * Math.PI) * 16) & 1;
        return _nb(sec ? _mix([84, 40, 24], [150, 80, 44], L) : _mix([150, 72, 36], [236, 142, 78], L)); }
    return _nb(_mix([78, 84, 98], [214, 220, 234], L)); };
SKIN[ID.GEAR] = _gearSkin(false);
SKIN[ID.MOTOR] = _gearSkin(true);
SKIN[ID.PISTON] = q => { const { x, y, b, s } = q;
    if (y <= 2) { if (y === 0) return [238, 242, 250]; if (y === 1) return (x + s) % 2 ? [92, 96, 108] : [112, 116, 128]; return _mix([176, 182, 196], [104, 110, 124], (x + s) / (2 * s + 1)); }
    if (y >= b.y + b.h - 2) return [214, 168, 70];
    const tw = 0.82 + 0.18 * Math.sin(y * 0.8); return _mix([140, 146, 160], [244, 248, 255], x === 0 ? tw : tw * 0.5); };
SKIN[ID.VENT] = q => { const { x, y } = q; return y === 0 ? ((x & 1) ? [206, 212, 224] : [168, 174, 188]) : ((x & 1) ? [86, 90, 102] : [124, 128, 140]); };
SKIN[ID.INJECTOR] = q => { const { x, y, b } = q, by = b.y + b.h - 1;
    if (y === by) return [248, 150, 40];
    if (y === b.y) return [74, 80, 94];
    return _mix([186, 192, 206], [100, 106, 122], (x - b.x) / Math.max(1, b.w - 1)); };
SKIN[ID.PLUG] = q => { const { x, y, b } = q, n = b.h, ry = y - b.y;
    if (ry < n / 3) return ry % 2 ? [214, 210, 196] : [248, 246, 238];
    if (ry < 2 * n / 3) return x === b.x ? [206, 212, 224] : [120, 126, 140];
    return ry === n - 1 ? [255, 232, 110] : [70, 62, 62]; };
SKIN[ID.HALL] = q => { const { x, y, b } = q, mx = b.x + (b.w - 1) / 2, my = b.y + (b.h - 1) / 2;
    if (b.w >= 3 && Math.hypot(x - mx, y - my) < 0.8) return [200, 206, 218];
    return [34, 36, 44]; };

// Automotive assemblies: each palette item stamps a recognisable multi-cell part.
PIECE[ID.EXHAUST_PIPE] = s => { const c=[], L=2*s+9, h=L>>1; for(let x=-h;x<=h;x++) c.push([x,-1,ID.EXHAUST_PIPE],[x,1,ID.EXHAUST_PIPE]); _P.rect(c,-h-2,-2,2,5,ID.STEEL); _P.rect(c,h+1,-2,2,5,ID.STEEL); return c; };
PIECE[ID.MUFFLER] = s => { const c=[], w=2*s+9, h=Math.max(6,s+4), hw=w>>1, hh=h>>1; for(let y=-hh;y<=hh;y++) for(let x=-hw;x<=hw;x++) { const shell=Math.abs(x)>=hw-1 || Math.abs(y)>=hh; const baffle=(x===-2 && y>-hh+1 && y<hh-1) || (x===2 && y>-hh+1 && y<hh-1); if(shell || baffle) c.push([x,y,ID.MUFFLER]); } _P.rect(c,-hw-3,-1,4,3,ID.MUFFLER); _P.rect(c,hw-1,-1,4,3,ID.MUFFLER); c.push([0,0,ID.MUFFLER,99]); return c; };
PIECE[ID.CATALYTIC] = s => { const c=[], w=2*s+7, h=Math.max(6,s+4), hw=w>>1, hh=h>>1; for(let y=-hh;y<=hh;y++) for(let x=-hw;x<=hw;x++) if(Math.abs(x)>=hw-1 || Math.abs(y)>=hh || (((x-y)%4===0) && Math.abs(x)<hw-1)) c.push([x,y,ID.CATALYTIC]); _P.rect(c,-hw-3,-1,4,3,ID.EXHAUST_PIPE); _P.rect(c,hw-1,-1,4,3,ID.EXHAUST_PIPE); c.push([0,0,ID.CATALYTIC,99]); return c; };
PIECE[ID.RADIATOR] = s => { const c=[], w=2*s+7, h=2*s+5; _P.rect(c,-(w>>1),-(h>>1),w,h,ID.RADIATOR); for(let x=-(w>>1)+2;x<(w>>1)-1;x+=2) _P.line(c,x,-(h>>1)+1,x,(h>>1)-1,ID.STEEL); c.push([0,0,ID.RADIATOR,99]); return c; };
PIECE[ID.FUEL_TANK] = s => { const c=[], w=2*s+9,h=s+4; _P.rect(c,-(w>>1),-(h>>1),w,h,ID.FUEL_TANK); _P.rect(c,-((w>>1)-2),-(h>>1)-2,4,2,ID.STEEL); _P.rect(c,(w>>1)-3,-(h>>1)-2,4,2,ID.STEEL); c.push([0,0,ID.FUEL_TANK,99]); return c; };
PIECE[ID.ALTERNATOR] = s => { const c=[], r=s+4; _P.disc(c,r,ID.ALTERNATOR); _P.ring(c,r-1,ID.STEEL); _P.disc(c,2,ID.GEAR); c.push([0,0,ID.ALTERNATOR,99]); return c; };
PIECE[ID.STARTER] = s => { const c=[], r=s+3; _P.rect(c,-r,-2,2*r+1,5,ID.STARTER); _P.disc(c,2,ID.GEAR,r-1,0); _P.disc(c,1,ID.MOTOR,-r+1,0); c.push([-r+1,0,ID.MOTOR]); return c; };
PIECE[ID.BRAKE_DISC] = s => { const c=[], r=s+4; _P.disc(c,r,ID.BRAKE_DISC); _P.ring(c,r-2,ID.STEEL); _P.disc(c,2,ID.AXLE); for(let k=0;k<4;k++){const a=k*Math.PI/2; c.push([Math.round((r-2)*Math.cos(a)),Math.round((r-2)*Math.sin(a)),ID.BRAKE]);} return c; };
PIECE[ID.SUSPENSION] = s => { const c=[], h=2*s+6; _P.line(c,-3,-h/2,-3,h/2,ID.SUSPENSION); _P.line(c,3,-h/2,3,h/2,ID.SUSPENSION); for(let y=-h/2+1;y<h/2;y+=2) _P.line(c,-3,y,3,y+1,ID.SUSPENSION); _P.rect(c,-6,-h/2-2,13,2,ID.STEEL); _P.rect(c,-6,h/2,13,2,ID.STEEL); return c; };
PIECE[ID.TURBO] = s => { const c=[],r=s+3; _P.wheel(c,r,ID.AXLE,ID.ROTOR); _P.ring(c,r+1,ID.STEEL); _P.disc(c,2,ID.GEAR,r-2,0); c.push([r+3,0,ID.TURBO,99]); return c; };
PIECE[ID.AIR_FILTER] = s => { const c=[],w=2*s+7,h=s+4; _P.rect(c,-(w>>1),-(h>>1),w,h,ID.AIR_FILTER); _P.rect(c,-(w>>1)-2,-1,3,3,ID.EXHAUST_PIPE); _P.rect(c,(w>>1)-1,-1,3,3,ID.EXHAUST_PIPE); c.push([0,0,ID.AIR_FILTER,99]); return c; };

// Electronics building blocks.
PIECE[ID.RESISTOR] = s => { const c=[],w=Math.max(8,2*s+4),hw=w>>1; _P.line(c,-hw-3,0,-hw,0,ID.COPPER); _P.rect(c,-hw,-2,w,5,ID.RESISTOR); _P.line(c,hw,0,hw+3,0,ID.COPPER); return c; };
PIECE[ID.CAPACITOR] = s => { const c=[],h=2*s+6,hh=h>>1; _P.rect(c,-3,-hh,7,h,ID.CAPACITOR); _P.rect(c,-2,-hh-2,5,2,ID.STEEL); _P.line(c,-1,hh, -1,hh+4,ID.COPPER); _P.line(c,2,hh,2,hh+4,ID.COPPER); return c; };
PIECE[ID.DIODE] = s => { const c=[]; _P.line(c,-6,0,-3,0,ID.COPPER); _P.rect(c,-3,-2,7,5,ID.DIODE); _P.rect(c,2,-2,2,5,ID.STEEL); _P.line(c,4,0,7,0,ID.COPPER); c.push([0,0,ID.DIODE,0]); return c; };
PIECE[ID.TRANSISTOR] = s => { const c=[]; _P.rect(c,-3,-3,7,7,ID.TRANSISTOR); _P.line(c,-2,4,-2,8,ID.COPPER); _P.line(c,0,4,0,8,ID.COPPER); _P.line(c,2,4,2,8,ID.COPPER); return c; };
PIECE[ID.LED] = s => { const c=[]; _P.disc(c,3,ID.LED); _P.line(c,-1,2,-1,7,ID.COPPER); _P.line(c,1,2,1,7,ID.COPPER); return c; };
PIECE[ID.PCB] = s => { const c=[],w=2*s+12,h=s+8,hw=w>>1,hh=h>>1; _P.rect(c,-hw,-hh,w,h,ID.PCB); for(let x=-hw+2;x<hw-1;x+=4) _P.line(c,x,-hh+1,x+2,hh-1,ID.COPPER); return c; };

// Desktop PC hardware. The motherboard has a deliberate open CPU socket so parts can be fitted into it.
PIECE[ID.PC_CASE] = s => { const c=[],w=2*s+42,h=2*s+34; _P.outline(c,-w/2,-h/2,w/2,h/2,2,ID.PC_CASE); _P.rect(c,-w/2+2,h/2-3,w-4,2,ID.PC_CASE); _P.rect(c,w/2-3,-h/2+3,2,h-6,ID.STEEL); _P.disc(c,2,ID.PC_FAN,-w/2+7,0); return c; };
PIECE[ID.PC_MOTHERBOARD] = s => { const c=[],w=2*s+14,h=s+10,hw=w>>1,hh=h>>1; for(let y=-hh;y<=hh;y++) for(let x=-hw;x<=hw;x++) { if(Math.abs(x)<=4 && Math.abs(y)<=3) continue; c.push([x,y,ID.PC_MOTHERBOARD]); } for(let x=-hw+2;x<hw-2;x+=4) if(Math.abs(x)>6) _P.line(c,x,-hh+1,x+2,hh-1,ID.COPPER); c.push([-hw+2,0,ID.PC_MOTHERBOARD,99]); _P.rect(c,-hw+3,hh-2,6,2,ID.STEEL); return c; };
PIECE[ID.PC_CPU] = s => { const c=[]; _P.rect(c,-4,-3,9,7,ID.PC_CPU); _P.rect(c,-3,-2,7,5,ID.STEEL); _P.rect(c,-1,-1,3,3,ID.COPPER); c.push([0,0,ID.PC_CPU,88]); return c; };
PIECE[ID.PC_GPU] = s => { const c=[],w=2*s+10,hw=w>>1; _P.rect(c,-hw,-3,w,7,ID.PC_GPU); _P.disc(c,3,ID.PC_FAN,-hw+5,0); _P.rect(c,-hw+1,4,w-2,2,ID.COPPER); c.push([0,0,ID.PC_GPU,89]); return c; };
PIECE[ID.PC_RAM] = s => { const c=[],w=2*s+7,hw=w>>1; _P.rect(c,-hw,-2,w,5,ID.PC_RAM); for(let x=-hw+2;x<hw;x+=3) _P.rect(c,x,-1,1,3,ID.PC_CPU); _P.line(c,-hw,3,hw,3,ID.COPPER); return c; };
PIECE[ID.PC_SSD] = s => { const c=[],w=2*s+6,hw=w>>1; _P.rect(c,-hw,-3,w,7,ID.PC_SSD); _P.rect(c,-hw+2,-1,w-4,3,ID.PCB); _P.rect(c,hw, -1,3,3,ID.COPPER); return c; };
PIECE[ID.PC_HDD] = s => { const c=[],w=2*s+7,hw=w>>1; _P.rect(c,-hw,-4,w,9,ID.PC_HDD); _P.disc(c,3,ID.STEEL,0,0); _P.disc(c,1,ID.PC_CPU,0,0); _P.rect(c,hw,-1,3,3,ID.COPPER); return c; };
PIECE[ID.PC_PSU] = s => { const c=[],w=2*s+10,h=s+8,hw=w>>1,hh=h>>1; _P.rect(c,-hw,-hh,w,h,ID.PC_PSU); _P.disc(c,3,ID.STEEL,-hw+5,0); _P.rect(c,hw-3,-hh+2,2,h-4,ID.COPPER); c.push([0,0,ID.PC_PSU,90]); return c; };
PIECE[ID.PC_FAN] = s => { const c=[],r=Math.max(4,s+2); _P.wheel(c,r,ID.AXLE,ID.ROTOR); _P.ring(c,r+1,ID.PC_FAN); c.push([0,0,ID.AXLE,93]); return c; };
PIECE[ID.PC_HEATSINK] = s => { const c=[],w=2*s+10,hw=w>>1; _P.rect(c,-hw,-2,w,5,ID.PC_HEATSINK); for(let x=-hw+1;x<hw;x+=2) _P.rect(c,x,-s-3,1,s+2,ID.STEEL); return c; };
PIECE[ID.PC_MONITOR] = s => { const c=[],w=2*s+15,h=2*s+9,hw=w>>1,hh=h>>1; for(let y=-hh;y<=hh;y++) for(let x=-hw;x<=hw;x++) { const frame=Math.abs(x)>=hw-1 || Math.abs(y)>=hh-1; c.push([x,y,ID.PC_MONITOR,frame?0:2]); } _P.rect(c,-2,hh+1,5,5,ID.PC_MONITOR); _P.rect(c,-6,hh+5,13,2,ID.PC_MONITOR); c.push([0,0,ID.PC_MONITOR,98]); return c; };
PIECE[ID.PC_KEYBOARD] = s => { const c=[],w=2*s+14,hw=w>>1; _P.rect(c,-hw,-3,w,7,ID.PC_KEYBOARD); for(let y=-2;y<=1;y+=2) for(let x=-hw+2;x<hw-1;x+=3) c.push([x,y,ID.PC_CPU]); return c; };
PIECE[ID.PC_MOUSE] = s => { const c=[]; for(let y=-5;y<=5;y++) for(let x=-3;x<=3;x++) if(x*x/9+y*y/25<=1) c.push([x,y,ID.PC_MOUSE]); _P.line(c,0,-4,0,0,ID.STEEL); c.push([0,0,ID.PC_MOUSE,96]); return c; };
PIECE[ID.ETHERNET] = s => { const c=[]; _P.rect(c,-s-4,-1,2*s+9,3,ID.ETHERNET); _P.rect(c,-s-6,-2,3,5,ID.STEEL); _P.rect(c,s+3,-2,3,5,ID.STEEL); return c; };

// v19 mechanical assemblies: these are multi-cell parts with shafts/gears, not flat swatches.
PIECE[ID.TRANSMISSION] = s => { const c=[],w=2*s+18,h=2*s+12; _P.rect(c,-w/2,-h/2,w,h,ID.TRANSMISSION); _P.disc(c,s+3,ID.GEAR,-5,0); _P.disc(c,s+2,ID.GEAR,6,0); c.push([-5,0,ID.AXLE],[6,0,ID.AXLE]); _P.rect(c,-w/2-3,-2,4,4,ID.STEEL); _P.rect(c,w/2-1,-2,4,4,ID.STEEL); return c; };
PIECE[ID.CLUTCH] = s => { const c=[],r=s+5; _P.disc(c,r,ID.CLUTCH); _P.ring(c,r-1,ID.STEEL); _P.ring(c,r-3,ID.BRAKE); _P.disc(c,2,ID.AXLE); c.push([0,0,ID.AXLE]); return c; };
PIECE[ID.DIFFERENTIAL] = s => { const c=[],r=s+5; _P.disc(c,r,ID.DIFFERENTIAL); _P.ring(c,r-1,ID.GEAR); _P.disc(c,2,ID.AXLE); _P.line(c,-r-3,0,-r+1,0,ID.STEEL); _P.line(c,r-1,0,r+3,0,ID.STEEL); c.push([0,0,ID.AXLE]); return c; };
PIECE[ID.FUEL_PUMP] = s => { const c=[],w=2*s+8,h=s+7; _P.rect(c,-w/2,-h/2,w,h,ID.FUEL_PUMP); _P.disc(c,2,ID.GEAR,-2,0); _P.line(c,w/2,-1,w/2+4,-1,ID.EXHAUST_PIPE); _P.line(c,-w/2,-1,-w/2-4,-1,ID.EXHAUST_PIPE); c.push([0,0,ID.FUEL_PUMP,99]); return c; };
PIECE[ID.OIL_FILTER] = s => { const c=[],r=s+3; _P.disc(c,r,ID.OIL_FILTER); _P.rect(c,-r-3,-1,4,3,ID.STEEL); _P.rect(c,r,-1,4,3,ID.STEEL); _P.rect(c,-2,-2,5,5,ID.COPPER); c.push([0,0,ID.OIL_FILTER,99]); return c; };
PIECE[ID.ENGINE_BLOCK] = s => { const c=[],w=2*s+22,h=2*s+16; _P.rect(c,-w/2,-h/2,w,h,ID.ENGINE_BLOCK); for(let x=-w/2+4;x<w/2-2;x+=7){_P.rect(c,x,-h/2-3,4,4,ID.STEEL);_P.rect(c,x,-h/2+2,3,h-4,ID.PISTON);} _P.disc(c,4,ID.GEAR,0,h/2-2); c.push([0,h/2-2,ID.AXLE],[0,0,ID.ENGINE_BLOCK,99]); return c; };
PIECE[ID.SOLAR_PANEL] = s => { const c=[],w=2*s+14,h=s+7; _P.rect(c,-w/2,-h/2,w,h,ID.SOLAR_PANEL); for(let x=-w/2+3;x<w/2-1;x+=4) _P.line(c,x,-h/2+1,x,h/2-2,ID.COPPER); _P.line(c,-w/2+1,0,w/2-2,0,ID.STEEL); c.push([0,0,ID.SOLAR_PANEL,99]); return c; };
PIECE[ID.RELAY] = s => { const c=[]; _P.rect(c,-5,-4,11,9,ID.RELAY); _P.rect(c,-3,-2,7,5,ID.COPPER); _P.line(c,-8,0,-5,0,ID.COPPER); _P.line(c,6,0,9,0,ID.COPPER); c.push([0,0,ID.RELAY]); return c; };
// Laboratory apparatus: recognizable multi-cell silhouettes, not single-pixel swatches.
PIECE[ID.BEAKER] = s => { const c=[],w=2*s+10,h=2*s+10,hw=w>>1,hh=h>>1; _P.line(c,-hw,-hh,-hw,hh,ID.BEAKER); _P.line(c,hw,-hh,hw,hh,ID.BEAKER); _P.line(c,-hw,hh,hw,hh,ID.BEAKER); _P.line(c,-hw-2,-hh,-hw+2,-hh,ID.STEEL); _P.line(c,hw-2,-hh,hw+2,-hh,ID.STEEL); return c; };
PIECE[ID.TEST_TUBE] = s => { const c=[],h=2*s+12; _P.line(c,-2,-h/2,-2,h/2-3,ID.TEST_TUBE); _P.line(c,2,-h/2,2,h/2-3,ID.TEST_TUBE); _P.disc(c,2,ID.TEST_TUBE,0,h/2-3); _P.line(c,-3,-h/2,3,-h/2,ID.STEEL); return c; };
PIECE[ID.BUNSEN] = s => { const c=[]; _P.rect(c,-5,3,11,3,ID.BUNSEN); _P.rect(c,-2,-6,5,9,ID.STEEL); _P.line(c,0,-7,0,-14,ID.FIRE); c.push([0,0,ID.BUNSEN,0]); return c; };
PIECE[ID.STIRRER] = s => { const c=[]; _P.rect(c,-8,-4,17,9,ID.STIRRER); _P.rect(c,-5,-2,11,4,ID.COPPER); c.push([0,0,ID.STIRRER,0]); return c; };
PIECE[ID.CONDENSER] = s => { const c=[]; _P.rect(c,-3,-14,7,29,ID.CONDENSER); _P.line(c,-8,-8,-3,-8,ID.STEEL); _P.line(c,4,8,9,8,ID.STEEL); _P.line(c,-3,-12,4,12,ID.GLASS); c.push([0,0,ID.CONDENSER,0]); return c; };
PIECE[ID.GAS_COLLECTOR] = s => { const c=[]; _P.outline(c,-7,-10,7,11,1,ID.GAS_COLLECTOR); _P.rect(c,-2,-14,5,4,ID.STEEL); c.push([0,0,ID.GAS_COLLECTOR,0]); return c; };
PIECE[ID.FUNNEL] = s => { const c=[]; _P.line(c,-8,-7,8,-7,ID.FUNNEL); _P.line(c,-8,-7,0,3,ID.FUNNEL); _P.line(c,8,-7,0,3,ID.FUNNEL); _P.line(c,0,3,0,13,ID.FUNNEL); return c; };
PIECE[ID.PH_METER] = s => { const c=[]; _P.rect(c,-6,-9,13,16,ID.PH_METER); _P.rect(c,-3,-6,7,5,ID.LED); _P.line(c,0,7,0,15,ID.STEEL); c.push([0,0,ID.PH_METER,0]); return c; };
for(const gid of [ID.AND_GATE,ID.OR_GATE,ID.NOT_GATE,ID.XOR_GATE,ID.CLOCK,ID.COUNTER,ID.MEMORY]) PIECE[gid]=s=>{const c=[];_P.rect(c,-6,-5,13,11,gid);_P.line(c,-10,0,-6,0,ID.COPPER);_P.line(c,6,0,10,0,ID.COPPER);_P.rect(c,-2,-2,5,4,ID.STEEL);return c;};
PIECE[ID.CRANKSHAFT] = s => { const c=[]; _P.line(c,-13,0,13,0,ID.AXLE); _P.disc(c,4,ID.GEAR,-8,0); _P.disc(c,4,ID.GEAR,8,0); _P.rect(c,-3,-7,7,4,ID.CRANKSHAFT); _P.rect(c,-3,4,7,4,ID.CRANKSHAFT); c.push([0,0,ID.AXLE]); return c; };
PIECE[ID.CAMSHAFT] = s => { const c=[]; _P.line(c,-14,0,14,0,ID.AXLE); for(let x=-10;x<=10;x+=5) _P.disc(c,3,ID.CAMSHAFT,x,0); c.push([0,0,ID.AXLE]); return c; };
PIECE[ID.FAN_BELT] = s => { const c=[]; _P.line(c,-14,-6,14,-6,ID.FAN_BELT); _P.line(c,-14,6,14,6,ID.FAN_BELT); _P.disc(c,4,ID.AXLE,-14,0); _P.disc(c,4,ID.AXLE,14,0); c.push([0,0,ID.FAN_BELT,99]); return c; };
PIECE[ID.AIR_INTAKE] = s => { const c=[]; _P.rect(c,-9,-5,19,11,ID.AIR_INTAKE); _P.rect(c,-6,-3,13,7,ID.STEEL); _P.line(c,9,0,14,0,ID.EXHAUST_PIPE); c.push([0,0,ID.AIR_INTAKE,99]); return c; };
PIECE[ID.OIL_PUMP] = s => { const c=[]; _P.rect(c,-8,-6,17,13,ID.OIL_PUMP); _P.disc(c,4,ID.GEAR,0,0); _P.line(c,-8,0,-13,0,ID.STEEL); _P.line(c,9,0,14,0,ID.STEEL); c.push([0,0,ID.OIL_PUMP,0]); return c; };

const metal = (a,b,t) => _mix(a,b,t);
SKIN[ID.EXHAUST_PIPE] = q => q.y===q.b.y || q.y===q.b.y+q.b.h-1 ? [78,84,96] : metal([205,211,220],[92,100,114],(q.y-q.b.y)/Math.max(1,q.b.h-1));
SKIN[ID.MUFFLER] = q => { const {x,y,b}=q; if(x===b.x||x===b.x+b.w-1) return [90,98,112]; if(y===b.y||y===b.y+b.h-1) return [194,202,214]; if((x-b.x)%5===0 && (y-b.y)%3===0) return [70,77,88]; if(y===Math.floor((b.y+b.y+b.h-1)/2)) return [128,139,154]; return metal([150,158,170],[76,84,98],(x-b.x)/Math.max(1,b.w-1)); };
SKIN[ID.CATALYTIC] = q => { const {x,y,b}=q; if(y===b.y||y===b.y+b.h-1||x===b.x||x===b.x+b.w-1) return [190,198,208]; return ((x+y)&1)?[116,132,145]:[72,94,108]; };
SKIN[ID.RADIATOR] = q => { const {x,y,b}=q; if(y===b.y||y===b.y+b.h-1) return [214,222,232]; if((x-b.x)%2===0) return [76,126,150]; return [166,190,204]; };
SKIN[ID.FUEL_TANK] = q => { const {x,y,b}=q; if(y===b.y||y===b.y+b.h-1) return [175,183,194]; if((x-b.x)%6===0) return [63,73,86]; if(y===b.y+2) return [130,144,158]; return [92,104,120]; };
SKIN[ID.ALTERNATOR] = q => { const r=Math.hypot(q.x,q.y); if(r<1.4) return [220,178,82]; if(r>q.s+2) return [72,78,90]; if(Math.abs(q.x)%3===0||Math.abs(q.y)%3===0) return [205,170,94]; return [100,111,130]; };
SKIN[ID.STARTER] = q => q.pid===ID.MOTOR?[220,116,62]:q.pid===ID.GEAR?[190,166,100]:q.pid===ID.COPPER?[220,170,78]:[105,119,140];
SKIN[ID.BRAKE_DISC] = q => q.pid===ID.BRAKE?[144,58,50]:q.pid===ID.AXLE?[214,220,230]:[166,174,188];
SKIN[ID.SUSPENSION] = q => q.pid===ID.STEEL?[202,210,222]:((q.x+q.y)&1)?[70,78,92]:[190,198,210];
SKIN[ID.TURBO] = q => q.pid===ID.AXLE?[224,180,88]:q.pid===ID.ROTOR?[150,162,178]:q.pid===ID.STEEL?[205,214,224]:[178,122,70];
SKIN[ID.AIR_FILTER] = q => { const {x,y,b}=q; if(x===b.x||x===b.x+b.w-1||y===b.y||y===b.y+b.h-1) return [58,74,65]; return ((x+y)&1)?[205,184,132]:[130,150,118]; };
SKIN[ID.RESISTOR] = q => q.pid===ID.COPPER?[224,174,92]:[198,148,95];
SKIN[ID.CAPACITOR] = q => q.pid===ID.COPPER?[218,176,84]:q.pid===ID.STEEL?[218,224,232]:[42,116,178];
SKIN[ID.DIODE] = q => q.pid===ID.COPPER?[212,170,92]:q.pid===ID.STEEL?[236,238,240]:[40,46,56];
SKIN[ID.TRANSISTOR] = q => q.pid===ID.COPPER?[210,170,92]:[38,84,62];
SKIN[ID.LED] = q => q.pid===ID.COPPER?[218,172,84]:[70,190,118];
SKIN[ID.PCB] = q => q.pid===ID.COPPER?[211,153,74]:[30,105,68];
SKIN[ID.PC_CASE] = q => q.pid===ID.STEEL?[186,198,214]:q.pid===ID.PC_FAN?[48,56,70]:[65,75,92];
SKIN[ID.PC_MOTHERBOARD] = q => { const {x,y,b}=q; if(q.pid===ID.COPPER) return [202,151,72]; if(q.pid===ID.STEEL) return [180,190,202]; if(x===b.x||y===b.y||x===b.x+b.w-1||y===b.y+b.h-1) return [26,78,54]; if((x+y*2)%7===0) return [48,148,92]; return [32,112,72]; };
SKIN[ID.PC_CPU] = q => q.pid===ID.STEEL?[238,238,232]:q.pid===ID.COPPER?[202,158,78]:[174,181,190];
SKIN[ID.PC_GPU] = q => q.pid===ID.PC_FAN?[48,58,72]:q.pid===ID.COPPER?[211,164,80]:[40,58,78];
SKIN[ID.PC_RAM] = q => q.pid===ID.PC_CPU?[30,38,48]:q.pid===ID.COPPER?[220,176,82]:[30,112,72];
SKIN[ID.PC_SSD] = q => q.pid===ID.PCB?[28,106,72]:q.pid===ID.COPPER?[221,178,88]:[84,95,112];
SKIN[ID.PC_HDD] = q => q.pid===ID.STEEL?[216,222,230]:q.pid===ID.PC_CPU?[90,100,114]:[136,145,158];
SKIN[ID.PC_PSU] = q => q.pid===ID.STEEL?[150,160,174]:q.pid===ID.COPPER?[219,174,84]:[58,66,80];
SKIN[ID.PC_FAN] = q => q.pid===ID.AXLE?[220,226,236]:q.pid===ID.ROTOR?[102,121,146]:[52,64,82];
SKIN[ID.PC_HEATSINK] = q => q.pid===ID.STEEL?[208,216,226]:[142,153,170];
SKIN[ID.PC_MONITOR] = q => { const {x,y,b}=q; if(q.meta===2) return [10,16,25]; if(y===b.y||y===b.y+b.h-1||x===b.x||x===b.x+b.w-1) return [112,124,144]; return [24,32,46]; };
SKIN[ID.PC_KEYBOARD] = q => q.pid===ID.PC_CPU?[28,34,44]:q.pid===ID.STEEL?[128,142,160]:[66,76,92];
SKIN[ID.PC_MOUSE] = q => q.pid===ID.STEEL?[194,202,214]:[78,91,110];
SKIN[ID.ETHERNET] = q => q.pid===ID.STEEL?[214,178,88]:[38,136,120];
SKIN[ID.TRANSMISSION] = q => q.pid===ID.GEAR?[202,164,82]:q.pid===ID.AXLE?[220,224,232]:q.pid===ID.STEEL?[174,184,198]:[104,116,136];
SKIN[ID.CLUTCH] = q => q.pid===ID.BRAKE?[128,64,56]:q.pid===ID.STEEL?[210,216,226]:[152,120,84];
SKIN[ID.DIFFERENTIAL] = q => q.pid===ID.GEAR?[202,164,82]:q.pid===ID.AXLE?[224,230,238]:[132,142,158];
SKIN[ID.FUEL_PUMP] = q => q.pid===ID.GEAR?[214,176,92]:q.pid===ID.STEEL?[178,190,204]:[162,72,58];
SKIN[ID.OIL_FILTER] = q => q.pid===ID.COPPER?[218,168,82]:q.pid===ID.STEEL?[190,200,214]:[60,94,126];
SKIN[ID.ENGINE_BLOCK] = q => q.pid===ID.PISTON?[170,180,194]:q.pid===ID.GEAR?[212,170,84]:q.pid===ID.STEEL?[196,204,216]:[88,98,116];
SKIN[ID.SOLAR_PANEL] = q => q.pid===ID.COPPER?[220,170,84]:q.pid===ID.STEEL?[180,196,218]:(((q.x+q.y)&1)?[38,76,142]:[28,56,112]);
SKIN[ID.RELAY] = q => q.pid===ID.COPPER?[224,176,86]:[136,112,78];

const BIGGER = {}; [ID.BATTERY, ID.SWITCH, ID.LAMP, ID.LASER, ID.THERMO, ID.BARO, ID.PHOTO, ID.INJECTOR, ID.PLUG, ID.HALL, ID.VENT, ID.MUFFLER, ID.CATALYTIC, ID.RADIATOR, ID.FUEL_TANK, ID.PC_CASE, ID.PC_MOTHERBOARD, ID.PC_GPU, ID.PC_PSU, ID.PC_MONITOR, ID.TRANSMISSION, ID.DIFFERENTIAL, ID.ENGINE_BLOCK, ID.SOLAR_PANEL].forEach(i => BIGGER[i] = 1);
function buildSkin(id, cells, sz) {
    const f = SKIN[id]; if (!f) return null;
    const own = new Map(); for (const c of cells) own.set(c[0] * 4096 + c[1], c[2]);
    const b = cells.box, out = new Uint32Array(cells.length);
    cells.forEach((c, k) => {
        const x = c[0], y = c[1], pid = c[2], has = (dx, dy) => own.get((x + dx) * 4096 + y + dy) === pid;
        const lit = 1 + 0.2 * ((has(0, -1) ? 0 : 1) + (has(-1, 0) ? 0 : 1)) - 0.26 * ((has(0, 1) ? 0 : 1) + (has(1, 0) ? 0 : 1));
        const col = f({ x, y, pid, b, s: sz }), m = col.nb ? 1 : lit;
        out[k] = packSkin(pid, [col[0] * m, col[1] * m, col[2] * m], col.st);
    });
    return out;
}
let pieceRot = 0, pieceMir = false;

const VEH_ATT = {}; ['CHASSIS', 'BRAKE', 'FLYWHEEL', 'BATTERY', 'SWITCH', 'LAMP', 'LASER', 'THERMO', 'BARO', 'PHOTO', 'INJECTOR', 'PLUG', 'HALL', 'VENT', 'COPPER', 'INSULATOR', 'AXLE', 'MOTOR', 'PIN', 'PISTON', 'GEAR', 'ROTOR', 'TIRE', 'WHEELM', 'GLASS', 'STEEL', 'WOOD', 'EXHAUST_PIPE', 'MUFFLER', 'CATALYTIC', 'RADIATOR', 'FUEL_TANK', 'ALTERNATOR', 'STARTER', 'BRAKE_DISC', 'SUSPENSION', 'TURBO', 'AIR_FILTER', 'TRANSMISSION', 'CLUTCH', 'DIFFERENTIAL', 'FUEL_PUMP', 'OIL_FILTER', 'ENGINE_BLOCK','CRANKSHAFT','CAMSHAFT','FAN_BELT','AIR_INTAKE','OIL_PUMP'].forEach(k => VEH_ATT[ID[k]] = 1);
let vehicles = [], vehDirty = true, vehTick = 0;
const vstamp = new Int32Array(size); let vsId = 0;
const VEH_SEED = {}; ['CHASSIS', 'STEEL', 'INSULATOR'].forEach(k => VEH_SEED[ID[k]] = 1);
function buildVehicles() {
    vehDirty = false; const old = vehicles; vehicles = [];
    const wheels = bodies.filter(b => b.kind === 'rotor' && b.cells.some(c => c.id === ID.TIRE || c.id === ID.WHEELM));
    if (!wheels.length) return;
    const seen = new Uint8Array(size), usedB = new Set();
    for (const w of wheels) {
        if (usedB.has(w)) continue;
        const rr = Math.ceil(w.R + 3.5), seeds = [];
        for (let dy = -rr; dy <= rr; dy++) for (let dx = -rr; dx <= rr; dx++) {
            if (dx * dx + dy * dy > (w.R + 3.5) ** 2 || dy > 2) continue; const x = w.px + dx, y = w.py + dy; if (!inBounds(x, y)) continue;
            const i = y * WIDTH + x; if (VEH_SEED[grid[i]] && !seen[i]) seeds.push(i);
        }
        if (!seeds.length) continue;
        const set = new Set(seeds), st = [...seeds]; for (const i of seeds) seen[i] = 1;
        while (st.length) {
            const i = st.pop(), x = i % WIDTH, y = (i / WIDTH) | 0;
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
                if (!dx && !dy) continue; const nx = x + dx, ny = y + dy; if (!inBounds(nx, ny)) continue;
                const n = ny * WIDTH + nx; if (!seen[n] && VEH_ATT[grid[n]]) { seen[n] = 1; set.add(n); st.push(n); }
            }
        }
        const bs = [];
        for (const bd of bodies) {
            if (usedB.has(bd)) continue; let inn = false;
            for (const c of bd.cells) if (set.has(c.y * WIDTH + c.x)) { inn = true; break; }
            if (!inn && bd.kind === 'rotor') for (const i of set) {
                if (!VEH_SEED[grid[i]]) continue; const dx = i % WIDTH - bd.px, dy = ((i / WIDTH) | 0) - bd.py;
                if (dx * dx + dy * dy <= (bd.R + 3.5) ** 2) { inn = true; break; }
            }
            if (inn) { bs.push(bd); usedB.add(bd); }
        }
        const live = new Set();
        for (const bd of bs) { if (bd.kind === 'rotor') live.add(bd.pivot); for (const c of bd.cells) live.add(c.y * WIDTH + c.x); }
        const fixed = []; for (const i of set) if (!live.has(i)) fixed.push(i);
        const v = { fixed, bodies: bs, vx: 0, vy: 0, fx: 0, fy: 0 };
        for (const o of old) if (o.keys.has(seeds[0]) || o.keys.has(fixed[0])) { v.vx = o.vx; v.vy = o.vy; v.fx = o.fx; v.fy = o.fy; break; }
        v.keys = new Set(fixed); vehicles.push(v);
    }
}
function vehGather(v) {
    const L = []; vsId++;
    for (const i of v.fixed) L.push(i);
    for (const b of v.bodies) { if (b.kind === 'rotor' && (grid[b.pivot] === ID.AXLE || grid[b.pivot] === ID.MOTOR)) L.push(b.pivot); for (const c of b.cells) L.push(c.y * WIDTH + c.x); }
    for (const i of L) vstamp[i] = vsId;
    return L;
}
function vehMove(v, dx, dy) {
    const L = vehGather(v), n = L.length, tg = new Int32Array(n);
    for (let j = 0; j < n; j++) {
        const i = L[j], x = i % WIDTH + dx, y = ((i / WIDTH) | 0) + dy; if (!inBounds(x, y)) return false;
        const p = y * WIDTH + x; tg[j] = p; if (grid[p] !== 0 && !DISPLACE[grid[p]] && vstamp[p] !== vsId) return false;
    }
    const g = new Uint16Array(n), cv = new Int8Array(n), sk = new Uint32Array(n), lf = new Uint16Array(n), mt = new Uint16Array(n), tt = new Float32Array(n), ck = new Float32Array(n), s9 = new Uint8Array(n), mo = new Int16Array(n), so = new Uint8Array(n), ph = new Float32Array(n);
    for (let j = 0; j < n; j++) { const i = L[j]; g[j] = grid[i]; cv[j] = colorVar[i]; sk[j] = skin[i]; lf[j] = lifeGrid[i]; mt[j] = metaGrid[i]; tt[j] = T[i]; ck[j] = cookGrid[i]; s9[j] = sp[i]; mo[j] = mechOwner[i]; so[j]=solutionGrid[i]; ph[j]=phGrid[i]; }
    claimStamp++; for (let j = 0; j < n; j++) claim[tg[j]] = claimStamp;
    for (let j = 0; j < n; j++) { const i = L[j]; grid[i] = 0; colorVar[i] = 0; skin[i] = 0; lifeGrid[i] = 0; metaGrid[i] = 0; cookGrid[i] = 0; sp[i] = 0; solutionGrid[i]=0; phGrid[i]=7; mechOwner[i] = 0; T[i] = AMBIENT; }
    for (let j = 0; j < n; j++) {
        const p = tg[j]; if (grid[p] !== 0 && mechOwner[p] === 0) displaceParticle(p);
        grid[p] = g[j]; colorVar[p] = cv[j]; skin[p] = sk[j]; lifeGrid[p] = lf[j]; metaGrid[p] = mt[j]; T[p] = tt[j]; cookGrid[p] = ck[j]; sp[p] = s9[j]; solutionGrid[p]=so[j]; phGrid[p]=ph[j]; mechOwner[p] = mo[j]; updated[p] = 1;
    }
    const off = dy * WIDTH + dx; for (let j = 0; j < v.fixed.length; j++) v.fixed[j] += off;
    for (const b of v.bodies) {
        if (b.kind === 'rotor') { b.px += dx; b.py += dy; b.pivot = b.py * WIDTH + b.px; for (const c of b.cells) { c.x += dx; c.y += dy; } }
        else for (const c of b.cells) { c.x += dx; c.y += dy; c.rx += dx; c.ry += dy; }
    }
    v.keys = new Set(v.fixed);
    return true;
}
function vehicleStep() {
    for (const v of vehicles) {
        v.fixed = v.fixed.filter(i => grid[i] !== 0 && VEH_ATT[grid[i]]);
        const L = vehGather(v), N = L.length; if (N < 2) continue;
        const onG = (x, y) => { if (!inBounds(x, y)) return true; const p = y * WIDTH + x, g = grid[p]; return g !== 0 && !DISPLACE[g] && vstamp[p] !== vsId; };
        const contact = [];
        for (const b of v.bodies) {
            if (b.kind !== 'rotor') continue; const low = new Map();
            for (const c of b.cells) if (c.id === ID.TIRE || c.id === ID.WHEELM) { const o = low.get(c.x); if (o === undefined || c.y > o) low.set(c.x, c.y); }
            for (const [x, y] of low) if (onG(x, y + 1) || onG(x, y + 2)) { contact.push(b); break; }
        }
        let supported = contact.length > 0;
        if (!supported) for (const i of L) if (onG(i % WIDTH, ((i / WIDTH) | 0) + 1)) { supported = true; break; }
        if (contact.length) {
            const Mv = 0.2 * N + 10, maxJ = 0.03 * Mv / contact.length;
            let Jt = 0;
            for (const b of contact) {
                const m = b.I / (b.R * b.R), slip = b.omega * b.R - v.vx;
                let J = slip * (Mv * m / (Mv + m)) * 0.5;
                if (J > maxJ) J = maxJ; else if (J < -maxJ) J = -maxJ;
                Jt += J; b.omega -= J / m / b.R;
            }
            v.vx += Jt / Mv;
            v.vx *= contact.some(b => b.motor && lifeGrid[b.pivot] > 0) ? 0.9985 : (v.bodies.some(b => b.motor) ? 0.985 : 0.9965);
            v.vx -= v.vx * Math.abs(v.vx) * 0.002;
            v.vx = Math.max(-0.5, Math.min(0.5, v.vx));
        }
        if (!supported) v.vy = Math.min(1.5, v.vy + 0.12); else v.vy = 0;
        v.fy += v.vy; const sy = Math.trunc(v.fy); v.fy -= sy;
        for (let k = 0; k < sy; k++) if (!vehMove(v, 0, 1)) { v.vy = 0; v.fy = 0; break; }
        v.fx += v.vx; const sx = Math.trunc(v.fx); v.fx -= sx; const dir = Math.sign(sx);
        for (let k = 0; k < Math.abs(sx); k++) { if (vehMove(v, dir, 0) || vehMove(v, dir, -1) || vehMove(v, dir, -2)) continue; v.vx = 0; v.fx = 0; break; }
    }
}

const _carGeo = s => { const R = s + 3, h2 = Math.round(1.65 * R); return { R, h2, W: h2 + R + 2, top: -(R + 3), cab: R - 1 }; };
const _carBody = (c, s) => { const { R, h2, W, top, cab } = _carGeo(s);
    for (let y = top; y <= 1; y++) for (let x = -W; x <= W; x++) {
        if (Math.abs(x) >= W - 1 && y <= top + 1) continue;
        if (Math.hypot(x - h2, y) <= R + 2 || Math.hypot(x + h2, y) <= R + 2) continue;
        c.push([x, y, ID.CHASSIS]);
    }
    for (let j = 1; j <= cab; j++) { const hw = W - 9 - j; for (let x = -3 - hw; x <= -3 + hw; x++) c.push([x, top - j, ID.CHASSIS]); }
};
const _wheelCells = (c, R, cx, cy, pivot) => {
    for (let y = -R - 1; y <= R + 1; y++) for (let x = -R - 1; x <= R + 1; x++) { const r = Math.hypot(x, y); if (r <= R + 0.4) c.push([cx + x, cy + y, r >= R - 1.4 ? ID.TIRE : ID.ROTOR]); }
    c.push([cx, cy, pivot]);
};
PIECE[ID.CHASSIS] = s => { const c = []; _carBody(c, s); return c; };
PIECE[ID.WHEEL] = s => { const c = []; _wheelCells(c, s + 3, 0, 0, ID.AXLE); return c; };
PIECE[ID.WHEELM] = s => { const c = []; _wheelCells(c, s + 3, 0, 0, ID.MOTOR); return c; };
PIECE[ID.CAR] = s => { const c = [], { R, h2, top } = _carGeo(s); _carBody(c, s);
    _wheelCells(c, R, -h2, 0, ID.MOTOR); _wheelCells(c, R, h2, 0, ID.AXLE);
    _P.rect(c, -2, -(R + 2), 5, 2, ID.BATTERY);
    for (let x = -1; x >= -h2; x--) c.push(x === -5 ? [x, top, ID.SWITCH, 1] : [x, top, ID.COPPER]);
    c.push([-h2, -(R + 2), ID.COPPER]);
    return c; };
const _paint = (ry, h) => _mix([244, 88, 80], [132, 18, 30], ry / Math.max(1, h - 1));
const _carSkin = q => { const { x, y, pid, s } = q, { R, h2, W, top, cab } = _carGeo(s), cx = x < 0 ? -h2 : h2;
    if (pid === ID.TIRE || pid === ID.ROTOR || pid === ID.AXLE || pid === ID.MOTOR) return _wheelSkin(pid === ID.MOTOR)({ x: x - cx, y, pid, s, b: { w: 2 * (R + 1) + 1 } });
    if (pid === ID.BATTERY) return y === top + 1 ? [250, 200, 60] : _mix([60, 64, 78], [30, 32, 42], 1);
    if (pid === ID.COPPER) return [150, 84, 44];
    if (pid === ID.SWITCH) return _st([150, 50, 50]);
    if (y < top) {
        const j = top - y, hw = W - 9 - j;
        if (j < cab && Math.abs(x + 3) <= hw - 1 && Math.abs(x + 3) !== 0) return _mix([200, 232, 250], [84, 132, 184], (j - 1) / cab) && (((x + y) % 6 + 6) % 6 < 2 ? [232, 246, 255] : _mix([176, 218, 244], [84, 132, 184], (j - 1) / cab));
        return _paint(0, 4);
    }
    const H = R + 5, ry = y - top;
    if (y >= 0) return [58, 62, 72];
    if (x >= W - 2 && ry > 2 && ry < H - 3) return [255, 240, 150];
    if (x <= -W + 2 && ry > 2 && ry < H - 3) return [226, 30, 30];
    if (x === 0 && ry > 1) return [104, 16, 26];
    if (ry === Math.round(H * 0.5) && Math.abs(x) < W - 2) return [246, 244, 238];
    return _paint(ry, H); };
SKIN[ID.CHASSIS] = _carSkin; SKIN[ID.CAR] = _carSkin;
function _wheelSkin(motor) { return q => { const { x, y, pid, b } = q, R = (b.w - 1) / 2 - 1, r = Math.hypot(x, y), a = Math.atan2(y, x), L = 0.5 + 0.5 * Math.cos(a + 2.356);
    if (x === 0 && y === 0) return _nb(motor ? [255, 110, 60] : [48, 44, 42]);
    if (pid === ID.TIRE) { const blk = Math.floor((a + Math.PI) / (2 * Math.PI) * 18) & 1; return _nb(r > R - 0.6 ? (blk ? [24, 24, 28] : [52, 52, 58]) : [36, 36, 42]); }
    if (r <= 1.7) return _nb(_mix([186, 138, 52], [248, 208, 112], L));
    const t = (((a / (2 * Math.PI)) * 5) % 1 + 1) % 1, spoke = t < 0.14 || t > 0.86;
    return _nb(spoke ? _mix([110, 116, 130], [190, 196, 212], L) : _mix([196, 202, 214], [240, 244, 250], L)); }; }
SKIN[ID.WHEEL] = _wheelSkin(false); SKIN[ID.WHEELM] = _wheelSkin(true);
HINTS[ID.CAR] = 'hint.CAR';
HINTS[ID.CHASSIS] = 'hint.CHASSIS';
HINTS[ID.WHEEL] = 'hint.WHEEL';
HINTS[ID.HEATER] = 'hint.HEATER';
HINTS[ID.COOLER] = 'hint.COOLER';
HINTS[ID.MAGNETRON] = 'hint.MAGNETRON';
HINTS[ID.THERMOSTAT] = 'hint.THERMOSTAT';
HINTS[ID.THERMOSTAT_H] = 'hint.THERMOSTAT_H';
HINTS[ID.REPEATER] = 'hint.REPEATER';
HINTS[ID.TIMER] = 'hint.TIMER';
HINTS[ID.CONVEYOR] = 'hint.CONVEYOR';
HINTS[ID.TIRE] = 'hint.TIRE';
HINTS[ID.WHEELM] = 'hint.WHEELM';
for (const id of [ID.EXHAUST_PIPE, ID.CATALYTIC, ID.RADIATOR, ID.FUEL_TANK, ID.ALTERNATOR, ID.STARTER, ID.BRAKE_DISC, ID.SUSPENSION, ID.TURBO, ID.AIR_FILTER, ID.RESISTOR, ID.CAPACITOR, ID.DIODE, ID.TRANSISTOR, ID.LED, ID.PCB, ID.PC_CASE, ID.PC_MOTHERBOARD, ID.PC_CPU, ID.PC_GPU, ID.PC_RAM, ID.PC_SSD, ID.PC_HDD, ID.PC_PSU, ID.PC_FAN, ID.PC_HEATSINK, ID.PC_MONITOR, ID.PC_KEYBOARD, ID.PC_MOUSE, ID.ETHERNET]) if (!HINTS[id]) HINTS[id] = 'hint.piece';
function pieceCells(id) {
    const key = id + ':' + brushSize + ':' + pieceRot + ':' + (pieceMir ? 1 : 0); if (_pc[key]) return _pc[key];
    const sz = BIGGER[id] ? Math.round(brushSize * 1.3) + 2 : brushSize;
    const m = new Map(); for (const p of PIECE[id](sz)) m.set(p[0] * 4096 + p[1], p);
    const cells = [...m.values()]; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const [x, y] of cells) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    cells.box = { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }; cells.sk = buildSkin(id, cells, sz);
    if (pieceMir) for (const c of cells) { c[0] = -c[0]; if (c[2] === ID.MOTOR) c[3] = c[3] ? 0 : 1; }
    for (let r = 0; r < pieceRot; r++) for (const c of cells) { const x = c[0]; c[0] = -c[1]; c[1] = x; }
    x0 = 1e9; y0 = 1e9; x1 = -1e9; y1 = -1e9;
    for (const [x, y] of cells) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    cells.box = { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }; return (_pc[key] = cells);
}
function stampPiece(id, cx, cy) {
    let n = 0;
    const pc = pieceCells(id);
    for (let k = 0; k < pc.length; k++) {
        const [dx, dy, pid] = pc[k], x = cx + dx, y = cy + dy; if (!inBounds(x, y)) continue;
        const g = grid[idx(x, y)]; if (g !== 0 && !DISPLACE[g]) continue;
        setCell(x, y, pid); if (pc.sk) skin[idx(x, y)] = pc.sk[k]; if (pc[k][3] !== undefined) metaGrid[idx(x, y)] = pc[k][3]; n++;
    }
    flash(n ? t('piece.placed', { name: EL_BY_ID[id].name, size: brushSize }) : t('noRoom'));
    return n;
}

// Beginner assembly ghosts. The ghost uses the same PIECE geometry as the real stamp,
// so its footprint follows the current brush size and matches the component being placed.
let beginnerMode = false;
let beginnerGuide = null;
const BEGINNER_BLUEPRINTS = {
    pc: [
        {id:ID.PC_CASE,x:160,y:105,label:'PC CASE',desc:'Start with the open tower case. The remaining components fit inside this outline.'},
        {id:ID.PC_MOTHERBOARD,x:167,y:105,label:'MOTHERBOARD',desc:'Place the motherboard inside the case. Keep the open CPU socket near the middle.'},
        {id:ID.PC_CPU,x:167,y:105,label:'CPU',desc:'Place the processor directly into the open socket in the centre of the motherboard.'},
        {id:ID.PC_HEATSINK,x:153,y:94,label:'CPU HEATSINK',desc:'Fit the heatsink over the CPU to remove heat while the computer runs.'},
        {id:ID.PC_RAM,x:166,y:92,label:'RAM',desc:'Place the RAM module along the upper edge of the motherboard.'},
        {id:ID.PC_GPU,x:148,y:120,label:'GRAPHICS CARD',desc:'Place the GPU along the lower expansion-slot side of the motherboard.'},
        {id:ID.PC_SSD,x:167,y:87,label:'SSD STORAGE',desc:'Install the boot drive near the upper-right area of the case.'},
        {id:ID.PC_PSU,x:176,y:120,label:'POWER SUPPLY',desc:'Place the PSU in the lower-right area of the case.'},
        {id:ID.BATTERY,x:190,y:120,kind:'cell',label:'POWER SOURCE',desc:'Place a battery just outside the PSU edge. It represents the external power source for this build.'},
        {id:ID.COPPER,x:188,y:120,kind:'wire',allowReplace:true,path:[[187,120],[188,120],[189,120]],label:'PSU POWER CABLE',desc:'Connect the battery to the PSU with this short copper cable. Click anywhere on the ghost cable.'},
        {id:ID.PC_FAN,x:146,y:105,label:'CASE FAN',desc:'Install a cooling fan inside the left side of the case.'},
        {id:ID.PC_MONITOR,x:197,y:105,label:'MONITOR',desc:'Place the screen beside the tower. It will show the boot sequence when the PC is ready.'},
        {id:ID.PC_KEYBOARD,x:169,y:128,label:'KEYBOARD',desc:'Place the keyboard in front of the monitor.'},
        {id:ID.PC_MOUSE,x:179,y:128,label:'MOUSE',desc:'Place the mouse beside the keyboard. The PC assembly is now complete.'}
    ],
    car: [
        {id:ID.CHASSIS,x:170,y:145,label:'CAR CHASSIS',desc:'Place the main body first. The two wheel arches define the wheel positions.'},
        {id:ID.WHEELM,x:158,y:145,label:'DRIVE WHEEL',desc:'Fit the powered wheel into the left wheel arch. This is the wheel that receives motor power.'},
        {id:ID.WHEEL,x:182,y:145,label:'FREE WHEEL',desc:'Fit the second wheel into the right wheel arch.'},
        {id:ID.ENGINE_BLOCK,x:165,y:111,label:'ENGINE BLOCK',desc:'Place the engine above the front engine bay, clear of the body shell.'},
        {id:ID.RADIATOR,x:143,y:111,label:'RADIATOR',desc:'Place the radiator at the front of the engine bay.'},
        {id:ID.AIR_FILTER,x:188,y:106,label:'AIR FILTER',desc:'Place the air filter beside the engine intake.'},
        {id:ID.FUEL_TANK,x:198,y:128,label:'FUEL TANK',desc:'Place the fuel tank toward the rear of the chassis.'},
        {id:ID.FUEL_PUMP,x:214,y:111,label:'FUEL PUMP',desc:'Place the fuel pump close to the tank and fuel line.'},
        {id:ID.TRANSMISSION,x:170,y:164,label:'TRANSMISSION',desc:'Place the gearbox underneath the centre of the car.'},
        {id:ID.CLUTCH,x:150,y:164,label:'CLUTCH',desc:'Place the clutch beside the transmission input.'},
        {id:ID.DIFFERENTIAL,x:195,y:163,label:'DIFFERENTIAL',desc:'Place the differential near the driven axle.'},
        {id:ID.ALTERNATOR,x:145,y:128,label:'ALTERNATOR',desc:'Place the alternator near the engine. It is part of the charging system.'},
        {id:ID.STARTER,x:185,y:128,label:'STARTER MOTOR',desc:'Place the starter close to the engine block.'},
        {id:ID.EXHAUST_PIPE,x:138,y:136,label:'EXHAUST PIPE',desc:'Begin the exhaust route at the engine outlet.'},
        {id:ID.CATALYTIC,x:120,y:136,label:'CATALYTIC CONVERTER',desc:'Place the catalytic converter in line with the exhaust pipe.'},
        {id:ID.MUFFLER,x:102,y:136,label:'MUFFLER',desc:'Finish the exhaust with the muffler. Keep its inlet and outlet aligned with the exhaust route.'},
        {id:ID.BATTERY,x:170,y:127,kind:'cell',label:'CAR BATTERY',desc:'Place the battery on the upper engine-bay area.'},
        {id:ID.COPPER,x:148,y:127,kind:'wire',path:[[170,127],[166,127],[162,127],[158,127],[154,127],[150,127],[148,127],[148,131],[148,135],[148,139],[148,143]],label:'POWER CABLE',desc:'Route copper from the battery around the left side of the car, ending close to the powered wheel.'}
    ]
};
for (const guide of Object.values(BEGINNER_BLUEPRINTS)) for (const step of guide) {
    if (!step.kind) step.kind = PIECE[step.id] ? 'piece' : 'cell';
}
function currentBeginnerSteps(){ return beginnerGuide ? BEGINNER_BLUEPRINTS[beginnerGuide.type] : []; }
function updateBeginnerUI(){
    const panel=document.getElementById('beginner-panel'), toggle=document.getElementById('btn-beginner');
    if(!panel||!toggle) return;
    panel.hidden=!beginnerMode;
    toggle.textContent='Beginner: '+(beginnerMode?'ON':'OFF'); toggle.classList.toggle('active',beginnerMode);
    document.getElementById('btn-guide-pc').classList.toggle('active',!!beginnerGuide&&beginnerGuide.type==='pc');
    document.getElementById('btn-guide-car').classList.toggle('active',!!beginnerGuide&&beginnerGuide.type==='car');
    if(!beginnerMode) return;
    const progress=document.getElementById('beginner-progress'), stepBox=document.getElementById('beginner-step'), desc=document.getElementById('beginner-instruction');
    if(!beginnerGuide){ progress.textContent='BEGINNER MODE ENABLED'; stepBox.textContent='Choose PC GUIDE or CAR GUIDE'; desc.textContent='Ghost blueprints show component locations. Choose a build guide to begin placing parts one step at a time.'; return; }
    const steps=currentBeginnerSteps(), n=beginnerGuide.step;
    if(n>=steps.length){ progress.textContent='100% · '+steps.length+' / '+steps.length+' PARTS'; stepBox.textContent='BUILD COMPLETE!'; desc.textContent='All guided parts have been placed. Turn on the simulation and use Diagnostics to inspect your assembly.'; return; }
    const st=steps[n]; progress.textContent='STEP '+String(n+1).padStart(2,'0')+' / '+steps.length+' · '+Math.round(n/steps.length*100)+'%';
    stepBox.textContent='PLACE: '+st.label;
    desc.textContent=st.desc+' Click the highlighted green ghost location in the world to place it.';
}
function selectBeginnerElement(id){
    const section=SECTIONS.findIndex(([,keys])=>keys.some(k=>ELEMENTS[k]&&ELEMENTS[k].id===id));
    if(section>=0&&activeCat!==section){activeCat=section;renderPalette('');}
    selectElement(id);
}
function startBeginnerGuide(type){
    beginnerMode=true; beginnerGuide={type,step:0};
    setBrush(4);
    const first=currentBeginnerSteps()[0]; if(first) selectBeginnerElement(first.id);
    updateBeginnerUI();
    flash(type==='pc'?'PC BUILD GUIDE STARTED':'CAR BUILD GUIDE STARTED');
}
function guidePathCells(path){
    const out=[];
    if(path.length===1) return [[path[0][0],path[0][1]]];
    for(let k=1;k<path.length;k++){
        const a=path[k-1],b=path[k],steps=Math.max(Math.abs(b[0]-a[0]),Math.abs(b[1]-a[1]));
        for(let j=0;j<=steps;j++){const x=Math.round(a[0]+(b[0]-a[0])*j/Math.max(1,steps)),y=Math.round(a[1]+(b[1]-a[1])*j/Math.max(1,steps));out.push([x,y]);}
    }
    return [...new Map(out.map(q=>[q[0]+','+q[1],q])).values()];
}
function guideClickDistance(st){
    if(st.kind==='wire') return Math.min(...guidePathCells(st.path).map(([x,y])=>Math.hypot(mouseX-x,mouseY-y)));
    if(st.kind==='piece' && PIECE[st.id]) {
        const b=pieceCells(st.id).box, left=st.x+b.x, top=st.y+b.y, right=left+b.w-1, bottom=top+b.h-1;
        const dx=Math.max(left-mouseX,0,mouseX-right), dy=Math.max(top-mouseY,0,mouseY-bottom);
        return Math.hypot(dx,dy);
    }
    return Math.hypot(mouseX-st.x,mouseY-st.y);
}
function handleBeginnerPlacement(){
    const steps=currentBeginnerSteps(), st=steps[beginnerGuide.step];
    if(!st){flash('GUIDE COMPLETE');return;}
    const tolerance=st.kind==='piece'?3:5;
    if(guideClickDistance(st)>tolerance){flash('CLICK THE GREEN GHOST: '+st.label);return;}
    pushUndo();
    let placed=0;
    if(st.kind==='piece') placed=stampPiece(st.id,st.x,st.y);
    else if(st.kind==='cell'){
        const i=idx(st.x,st.y); if(grid[i]===st.id) placed=1; else if(grid[i]===0||DISPLACE[grid[i]]){setCell(st.x,st.y,st.id);placed=1;}
    } else if(st.kind==='wire'){
        for(const [x,y] of guidePathCells(st.path)) if(inBounds(x,y)){const i=idx(x,y);if(grid[i]===ID.COPPER){placed++;continue;}if(grid[i]===0||(st.allowReplace&&grid[i]===ID.PC_CASE)){setCell(x,y,ID.COPPER);placed++;}}
    }
    if(placed>0){
        beginnerGuide.step++;
        const next=steps[beginnerGuide.step]; if(next) selectBeginnerElement(next.id);
        updateBeginnerUI();
        if(beginnerGuide.step>=steps.length) flash('BEGINNER BUILD COMPLETE!');
        else flash('NEXT: '+next.label);
    } else flash('NO ROOM — CLEAR THE GHOST LOCATION');
}
function drawBeginnerGhost(){
    if(!beginnerMode||!beginnerGuide) return;
    const steps=currentBeginnerSteps(); if(!steps.length) return;
    ctx.save(); ctx.imageSmoothingEnabled=false;
    for(let n=beginnerGuide.step;n<Math.min(steps.length,beginnerGuide.step+1);n++){
        const st=steps[n], active=true;
        ctx.globalAlpha=0.38;
        ctx.fillStyle=active?'#72ffad':'#53cfff';
        if(st.kind==='piece'&&PIECE[st.id]){
            const pc=pieceCells(st.id); for(const c of pc) ctx.fillRect(st.x+c[0],st.y+c[1],1,1);
            ctx.globalAlpha=active?0.95:0.3; ctx.strokeStyle=active?'#8dffb7':'#52cfff'; ctx.lineWidth=1; ctx.setLineDash(active?[2,1]:[1,3]);
            ctx.strokeRect(st.x+pc.box.x-1,st.y+pc.box.y-1,pc.box.w+2,pc.box.h+2);
        } else if(st.kind==='wire'){
            const cells=guidePathCells(st.path); ctx.globalAlpha=active?0.85:0.2; ctx.fillStyle=active?'#8dffb7':'#52cfff';
            for(const [x,y] of cells) ctx.fillRect(x,y,1,1);
            ctx.strokeStyle=active?'#8dffb7':'#52cfff'; ctx.lineWidth=1; ctx.setLineDash([2,2]); ctx.beginPath(); ctx.moveTo(st.path[0][0]+0.5,st.path[0][1]+0.5); for(let k=1;k<st.path.length;k++)ctx.lineTo(st.path[k][0]+0.5,st.path[k][1]+0.5); ctx.stroke();
        } else {
            ctx.globalAlpha=active?0.85:0.25; ctx.fillStyle=active?'#8dffb7':'#52cfff'; ctx.fillRect(st.x-2,st.y-2,5,5);
            ctx.globalAlpha=active?1:0.35; ctx.strokeStyle=active?'#8dffb7':'#52cfff'; ctx.lineWidth=1; ctx.setLineDash([2,2]); ctx.strokeRect(st.x-4,st.y-4,9,9);
        }
        if(active){ ctx.globalAlpha=1; ctx.fillStyle='#aaffc5'; ctx.font='6px "Silkscreen", monospace'; ctx.fillText(st.label,Math.max(1,Math.min(WIDTH-70,st.x-24)),Math.max(7,st.y-(st.kind==='piece'?pieceCells(st.id).box.h/2+4:8))); }
    }
    ctx.restore();
}
for (const id in PIECE) if (!HINTS[id]) HINTS[id] = 'hint.piece';

function PB() { this.m = new Map(); }
PB.prototype.put = function (x, y, id, meta) { this.m.set(x + ',' + y, [x, y, id, meta]); return this; };
PB.prototype.rect = function (x0, y0, x1, y1, id, meta) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.put(x, y, id, meta); return this; };
PB.prototype.outline = function (x0, y0, x1, y1, t, id) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (x - x0 < t || x1 - x < t || y - y0 < t || y1 - y < t) this.put(x, y, id); return this; };
PB.prototype.plan = function (nameKey, hintKey) {
    const cs = [...this.m.values()]; let mx = 1e9, my = 1e9, Mx = -1e9, My = -1e9;
    for (const c of cs) { mx = Math.min(mx, c[0]); my = Math.min(my, c[1]); Mx = Math.max(Mx, c[0]); My = Math.max(My, c[1]); }
    return { get name() { return t(nameKey); }, get hint() { return t(hintKey, { name: t(nameKey) }); }, builtin: true, w: Mx - mx + 1, h: My - my + 1, cells: cs.map(c => [c[0] - mx, c[1] - my, c[2], c[3]]) };
};
function planFridge(nameKey, thick) {
    const c = new PB(), E = ID;
    c.outline(0, 0, 21, 25, 2, E.INSULATOR); c.rect(2, 14, 19, 15, E.INSULATOR);
    c.rect(3, 2, 18, 1 + thick, E.COOLER);
    c.rect(3, 20, 4, 21, E.BATTERY); c.rect(5, 21, 19, 21, E.COPPER); c.rect(19, 3, 19, 20, E.COPPER);
    c.put(19, 9, E.THERMOSTAT);
    return c.plan(nameKey, 'plan.fridge.hint');
}
function planMicrowave() {
    const c = new PB(), E = ID;
    c.outline(0, 4, 25, 17, 2, E.INSULATOR); c.rect(10, 6, 15, 7, E.MAGNETRON);
    c.rect(12, 1, 12, 5, E.COPPER); c.rect(13, 1, 15, 1, E.COPPER); c.put(16, 1, E.TIMER); c.put(17, 1, E.COPPER); c.rect(18, 0, 19, 1, E.BATTERY);
    return c.plan('plan.microwave', 'plan.microwave.hint');
}
function planOven() {
    const c = new PB(), E = ID;
    c.outline(0, 4, 27, 21, 2, E.INSULATOR); c.rect(4, 18, 24, 19, E.HEATER);
    c.rect(24, 1, 24, 17, E.COPPER); c.put(24, 15, E.THERMOSTAT_H); c.rect(25, 0, 26, 1, E.BATTERY);
    return c.plan('plan.oven', 'plan.oven.hint');
}
function planConveyor() {
    const c = new PB(), E = ID;
    c.rect(3, 4, 20, 4, E.CONVEYOR); c.put(2, 4, E.COPPER); c.rect(0, 3, 1, 4, E.BATTERY); c.rect(3, 5, 3, 8, E.STEEL); c.rect(20, 5, 20, 8, E.STEEL);
    return c.plan('plan.conveyor', 'plan.conveyor.hint');
}
function planClock() {
    const c = new PB(), E = ID;
    c.outline(2, 0, 19, 9, 1, E.COPPER); c.put(8, 0, E.REPEATER, 12);
    c.put(20, 4, E.LAMP); c.rect(9, -3, 10, -2, E.BATTERY); c.put(9, -1, E.SWITCH, 0);
    return c.plan('plan.clock', 'plan.clock.hint');
}
PLANS.push(planFridge('plan.fridge', 2), planFridge('plan.freezer', 4), planMicrowave(), planOven(), planConveyor(), planClock());
try { const sv = JSON.parse(localStorage.getItem('omni_plans') || '[]'); for (const p of sv) PLANS.push(p); } catch (e) { }
renderPalette('');
function savePlans() { try { localStorage.setItem('omni_plans', JSON.stringify(PLANS.filter(p => !p.builtin))); } catch (e) { } }
function armPlan(p) { planArmed = p; planCapture = null; renderPalette(document.getElementById('search-box').value); flash(t('plan.armed', { name: p.name })); if (p.hint) setTimeout(() => flash(p.hint), 1800); }
function stampPlan(p, cx, cy) {
    const x0 = cx - (p.w >> 1), y0 = cy - p.h + 1; let n = 0;
    for (const [dx, dy, id, meta] of p.cells) {
        const x = x0 + (planMir ? p.w - 1 - dx : dx), y = y0 + dy; if (!inBounds(x, y)) continue;
        const i = idx(x, y), g = grid[i]; if (g !== 0 && !DISPLACE[g]) continue;
        setCell(x, y, id); if (meta !== undefined && meta !== null) metaGrid[i] = meta; n++;
    }
    flash(n ? t('plan.placed', { name: p.name }) : t('noRoom'));
}
function finishCapture(x1, y1) {
    const s = planCapture.start; planCapture = null;
    const ax = Math.min(s.x, x1), ay = Math.min(s.y, y1), bx = Math.max(s.x, x1), by = Math.max(s.y, y1), cells = [];
    for (let y = ay; y <= by; y++) for (let x = ax; x <= bx; x++) { if (!inBounds(x, y)) continue; const i = idx(x, y), g = grid[i]; if (g !== 0) cells.push([x - ax, y - ay, g, metaGrid[i] || undefined]); }
    if (!cells.length) { flash(t('plan.emptyZone')); return; }
    const name = (window.prompt(t('plan.promptName'), t('plan.defaultName')) || '').trim(); if (!name) { flash(t('plan.cancelled')); return; }
    PLANS.push({ name, builtin: false, w: bx - ax + 1, h: by - ay + 1, cells }); savePlans(); renderPalette(''); flash(t('plan.saved', { name, n: cells.length }));
}
document.getElementById('btn-plan').onclick = () => { planCapture = planCapture ? null : {}; planArmed = null; flash(planCapture ? t('plan.capture') : t('plan.cancelled')); };

let demoIdx = 0;
document.getElementById('btn-gen-engine').onclick = () => { pushUndo(); const d = demoIdx++ % 6; [genEngineCarDemo, genElectricCarDemo, () => genElectricCarDemo(5, 50), genCombustionDemo, genElectricDemo, genCarDemo][d](); };
selectAlt(0);
resetWorld();
document.getElementById('hud-hover').innerText = t('hud.empty');

