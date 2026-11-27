const undoStack = [], redoStack = [];
function snap() { return { g: grid.slice(), sol: solutionGrid.slice(), ph: phGrid.slice(), cv: colorVar.slice(), sk: skin.slice(), lf: lifeGrid.slice(), mt: metaGrid.slice(), t: T.slice(), ck: cookGrid.slice(), mx: mix.slice(), hg: hungerGrid.slice(), tg: thirstGrid.slice() }; }
function restoreSnap(s) { grid.set(s.g); if(s.sol) solutionGrid.set(s.sol); else solutionGrid.fill(0); if(s.ph) phGrid.set(s.ph); else phGrid.fill(7); colorVar.set(s.cv); skin.set(s.sk || 0); lifeGrid.set(s.lf); metaGrid.set(s.mt); T.set(s.t); cookGrid.set(s.ck); if (s.mx) mix.set(s.mx); else mix.fill(0); if (s.hg) hungerGrid.set(s.hg); else hungerGrid.fill(0); if (s.tg) thirstGrid.set(s.tg); else thirstGrid.fill(0); airO2.fill(1); vel.fill(0); Pair.fill(0); airMax = 0; sp.fill(0); mechDirty = true; }
function pushUndo() { undoStack.push(snap()); if (undoStack.length > 12) undoStack.shift(); redoStack.length = 0; }
function undo() { if (!undoStack.length) return flash(t('undo.none')); redoStack.push(snap()); restoreSnap(undoStack.pop()); flash(t('undo.done')); }
function redo() { if (!redoStack.length) return flash(t('redo.none')); undoStack.push(snap()); restoreSnap(redoStack.pop()); flash(t('redo.done')); }

function rle(a) { const o = []; let v = a[0], c = 1; for (let i = 1; i < a.length; i++) { if (a[i] === v) c++; else { o.push(v, c); v = a[i]; c = 1; } } o.push(v, c); return o; }
function unrle(o, a) { let p = 0; for (let i = 0; i < o.length; i += 2) { a.fill(o[i], p, p + o[i + 1]); p += o[i + 1]; } }
let toastTimer = 0;
function flash(msg) {
    const t = document.getElementById('toast'); t.innerText = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), msg.length > 40 ? 3600 : 1200);
}

function applyTool(x, y, i, id) {
    if (id === TOOL.HEAT) T[i] = Math.min(3000, T[i] + 15);
    else if (id === TOOL.COOL) T[i] = Math.max(-273, T[i] - 15);
    else if (id === TOOL.AIR) addPressureAt(x, y, 0.15);
    else if (id === TOOL.VAC) addPressureAt(x, y, -0.15);
    else if (id === TOOL.SPOON) stirAt(x, y, i);
    else if (id === TOOL.SHOCK) { if (grid[i] === ID.EMPTY) setCell(x,y,ID.SPARK); else { sp[i] = 9; T[i] = Math.min(3000,T[i]+18); } }
    else if (id === TOOL.UNCHARGE) { sp[i]=0; spN[i]=0; lifeGrid[i]=0; }
    else if (id === TOOL.UNBURN) { cookGrid[i]=0; if (grid[i]===ID.FIRE) setCell(x,y,ID.SMOKE); else if (grid[i]===ID.CHARRED && ID.WOOD!==undefined) setCell(x,y,ID.WOOD); }
    else if (id === TOOL.SMASH) { const el=EL_BY_ID[grid[i]]; if (el && el.fragile) setCell(x,y,ID.GLASS_SHARD!==undefined?ID.GLASS_SHARD:ID.DUST); else if (el && (el.type==='solid'||el.type==='powder') && grid[i]!==ID.WALL) setCell(x,y,ID.DUST!==undefined?ID.DUST:ID.ASH); }
    else if (id === TOOL.RANDOM) { const ids=Object.keys(ELEMENTS).map(k=>ELEMENTS[k].id).filter(v=>v!==0 && v<900); if(ids.length) setCell(x,y,ids[(Math.random()*ids.length)|0]); }
    else if (id === TOOL.LOOKUP) { const e=EL_BY_ID[grid[i]]; flash(e ? `${e.name} | ${e.type} | density ${e.density} | ${T[i].toFixed(1)} C | K ${K[grid[i]].toFixed(3)} | C ${C[grid[i]].toFixed(2)}` : 'EMPTY'); }
    else if (id === TOOL.PAINT) { if (grid[i]!==ID.EMPTY) colorVar[i]=Math.min(24,Math.max(-24,colorVar[i]+3)); }
    else if (id === TOOL.UNPAINT) { colorVar[i]=0; skin[i]=0; }
    else if (id === TOOL.ROOM_TEMP) { T[i]=AMBIENT; cookGrid[i]=0; }
    else if (id === TOOL.COOK) { T[i]=Math.max(T[i],105); cookGrid[i]+=4; }
    else if (id === TOOL.INCINERATE) { if (grid[i]!==ID.EMPTY) { T[i]=Math.max(T[i],900); if (EL_BY_ID[grid[i]].flam || EL_BY_ID[grid[i]].exp) cookGrid[i]=Math.max(1,cookGrid[i]); else setCell(x,y,ID.FIRE); } }
}
function placeCell(x, y, id) {
    if (!inBounds(x, y)) return;
    const i = idx(x, y);
    if (isToolId(id)) { applyTool(x, y, i, id); return; }
    if (!freeDrawable(id)) return;
    if (id === 0 || grid[i] === 0) setCell(x, y, id);
}
function drawBrush(x0, y0, x1, y1, id) {
    const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
    const single = isCreatureId(id), r = single ? 1 : brushSize - 1;
    for (let s = 0; s <= steps; s++) {
        const cx = Math.round(x0 + (x1 - x0) * (s / steps)), cy = Math.round(y0 + (y1 - y0) * (s / steps));
        for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
            if (brushShape === 1 || dx * dx + dy * dy <= r * r + r) {
                if (!single || Math.random() < 0.25) placeCell(cx + dx, cy + dy, id);
            }
        }
    }
}
function fillRect(x0, y0, x1, y1, id) {
    if (!freeDrawable(id)) return;
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) placeCell(x, y, id);
}
function floodFill(sx, sy, id) {
    if (!freeDrawable(id) || !inBounds(sx, sy)) return;
    const target = grid[idx(sx, sy)]; if (target === id) return;
    const seen = new Uint8Array(size), stack = [idx(sx, sy)]; let n = 0;
    seen[stack[0]] = 1;
    while (stack.length && n < 60000) {
        const i = stack.pop(), x = i % WIDTH, y = (i / WIDTH) | 0; n++;
        setCell(x, y, id);
        if (x > 0 && !seen[i - 1] && grid[i - 1] === target) { seen[i - 1] = 1; stack.push(i - 1); }
        if (x < WIDTH - 1 && !seen[i + 1] && grid[i + 1] === target) { seen[i + 1] = 1; stack.push(i + 1); }
        if (y > 0 && !seen[i - WIDTH] && grid[i - WIDTH] === target) { seen[i - WIDTH] = 1; stack.push(i - WIDTH); }
        if (y < HEIGHT - 1 && !seen[i + WIDTH] && grid[i + WIDTH] === target) { seen[i + WIDTH] = 1; stack.push(i + WIDTH); }
    }
}
function drawCursor() {
    const r = isCreatureId(currentEl) ? 1 : brushSize - 0.5;
    if (planCapture) { if (planCapture.start) ctx.rect(Math.min(planCapture.start.x, mouseX) + 0.5, Math.min(planCapture.start.y, mouseY) + 0.5, Math.abs(mouseX - planCapture.start.x), Math.abs(mouseY - planCapture.start.y)); else ctx.rect(mouseX, mouseY, 1, 1); }
    else if (planArmed) ctx.rect(mouseX - (planArmed.w >> 1), mouseY - planArmed.h + 1, planArmed.w, planArmed.h);
    else if (PIECE[currentEl] && !isDrawing) { const b = pieceCells(currentEl).box; ctx.rect(mouseX + b.x, mouseY + b.y, b.w, b.h); }
    else if (brushShape === 1) ctx.rect(mouseX + 0.5 - r, mouseY + 0.5 - r, 2 * r, 2 * r);
    else ctx.arc(mouseX + 0.5, mouseY + 0.5, r, 0, Math.PI * 2);
    if (isDrawing && shapeStart) {
        if (shapeMode === 'line') { ctx.moveTo(shapeStart.x + 0.5, shapeStart.y + 0.5); ctx.lineTo(mouseX + 0.5, mouseY + 0.5); }
        else if (shapeMode === 'rect') ctx.rect(Math.min(shapeStart.x, mouseX) + 0.5, Math.min(shapeStart.y, mouseY) + 0.5, Math.abs(mouseX - shapeStart.x), Math.abs(mouseY - shapeStart.y));
    }
}
function hoverInfo() {
    if (!inBounds(mouseX, mouseY)) return;
    const hi = idx(mouseX, mouseY), hid = grid[hi];
    let fs = COOKABLE[hid] ? foodState(hid, cookGrid[hi]) : '';
    if (!fs && FDX[hid] && FDV[hid] && cookGrid[hi] > 0.5) fs = t('food.cooking', { n: Math.min(100, Math.round(cookGrid[hi] / (FDX[hid].cook ? FDX[hid].cook[3] : 60) * 100)) });
    if (hid === ID.SWITCH) fs = metaGrid[hi] ? t('hover.on') : t('hover.off'); else if (hid === ID.AXLE || hid === ID.MOTOR) { const bd = bodies.find(q => q.pivot === hi); fs = bd ? t('hover.rpm', { n: Math.round(bd.omega * 3600 / (2 * Math.PI)) }) : t('hover.noMovingPart'); } else if (hid === ID.LAMP || hid === ID.LED || hid === ID.PC_MONITOR) fs = lifeGrid[hi] > 0 ? t('hover.lit') : t('hover.unlit'); else if (sp[hi] >= 6) fs = t('hover.live');
    const hoverEl = EL_BY_ID[hid];
    document.getElementById('hud-hover').innerText = (hid ? (MIXISH[hid] ? dishLabel(hi) : hoverEl.name) : t('hud.empty')).toUpperCase() + ', Temp: ' + T[hi].toFixed(1) + ' C, Life: ' + lifeGrid[hi] + ', Pressure: ' + Pair[airIdx[hi]].toFixed(2) + (hoverEl ? ', Heat K: ' + K[hid].toFixed(3) + ', Heat C: ' + C[hid].toFixed(2) + (hoverEl.phase ? ', Phase thresholds: ' + Object.entries(hoverEl.phase).filter(([k])=>k.endsWith('At')).map(([k,v])=>k.replace('At','')+' '+v+'C').join(' / ') : '') : '') + (fs ? ', ' + fs : '');
    updateDiagnostics(hi, hid);
}
function updateDiagnostics(i, id) {
    const panel=document.getElementById('diag-panel');
    if(!panel) return;
    panel.hidden=!diagnosticsOn;
    if(!diagnosticsOn) return;
    const x=i%WIDTH,y=(i/WIDTH)|0, pressure=Pair[airIdx[i]], signal=sp[i], lines=[];
    lines.push('OBJECT: '+(id?(EL_BY_ID[id]?.name||'UNKNOWN'):'EMPTY'));
    lines.push('TEMP: '+T[i].toFixed(1)+' C    PRESSURE: '+pressure.toFixed(2));
    lines.push('ELECTRIC: '+(signal>0?'PULSE '+signal+'/9':'NO SIGNAL')+'    LIFE/TIMER: '+lifeGrid[i]);
    lines.push('SIM: '+document.getElementById('hud-fps').textContent+' FPS   ACTIVE CELLS: '+document.getElementById('hud-count').textContent);
    const isPC=[ID.PC_CASE,ID.PC_MOTHERBOARD,ID.PC_CPU,ID.PC_GPU,ID.PC_RAM,ID.PC_SSD,ID.PC_HDD,ID.PC_PSU,ID.PC_MONITOR].includes(id);
    if(isPC) {
        const near=(r,pred)=>{for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){if(dx*dx+dy*dy>r*r)continue;const nx=x+dx,ny=y+dy;if(inBounds(nx,ny)){const n=idx(nx,ny);if(pred(n))return n;}}return -1;};
        const board=near(30,n=>grid[n]===ID.PC_MOTHERBOARD&&metaGrid[n]===99);
        if(board>=0) {
            const bx=board%WIDTH,by=(board/WIDTH)|0;
            const nearBoard=(r,pred)=>{for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){if(dx*dx+dy*dy>r*r)continue;const nx=bx+dx,ny=by+dy;if(inBounds(nx,ny)){const n=idx(nx,ny);if(pred(n))return n;}}return -1;};
            const cpu=nearBoard(16,n=>grid[n]===ID.PC_CPU&&metaGrid[n]===88),gpu=nearBoard(22,n=>grid[n]===ID.PC_GPU&&metaGrid[n]===89);
            const ram=nearBoard(19,n=>grid[n]===ID.PC_RAM),storage=nearBoard(24,n=>grid[n]===ID.PC_SSD||grid[n]===ID.PC_HDD),psu=nearBoard(27,n=>grid[n]===ID.PC_PSU&&(lifeGrid[n]>0||sp[n]>0));
            let ramModules=0; for(let dy=-19;dy<=19;dy++)for(let dx=-19;dx<=19;dx++){if(dx*dx+dy*dy>19*19)continue;const nx=bx+dx,ny=by+dy;if(inBounds(nx,ny)&&grid[idx(nx,ny)]===ID.PC_RAM)ramModules++;}
            const progress=cookGrid[board],status=progress>=28?'DESKTOP READY':progress>=8?'BOOT LOADER':progress>0?'BIOS / POST':'POWER OFF / INCOMPLETE';
            lines.push('PC STATUS: '+status+' ('+Math.round(progress/48*100)+'%)');
            lines.push('PARTS: CPU '+(cpu>=0?'OK':'MISSING')+' | GPU '+(gpu>=0?'OK':'MISSING')+' | RAM '+(ram>=0?'OK':'MISSING'));
            lines.push('STORAGE '+(storage>=0?(grid[storage]===ID.PC_SSD?'SSD':'HDD'):'MISSING')+' | PSU '+(psu>=0?'POWERED':'NO POWER'));
            lines.push('RAM: '+ramModules+' MODULE(S) · '+(ramModules*8)+' GB SIMULATED');
            if(cpu>=0) lines.push('CPU TEMP: '+T[cpu].toFixed(1)+' C'+(T[cpu]>95?' — THERMAL WARNING':''));
            if(gpu>=0) lines.push('GPU TEMP: '+T[gpu].toFixed(1)+' C'+(T[gpu]>100?' — THERMAL WARNING':''));
        }
    }
    if([ID.AXLE,ID.MOTOR,ID.GEAR,ID.ALTERNATOR,ID.ENGINE_BLOCK,ID.TRANSMISSION,ID.DIFFERENTIAL,ID.CLUTCH,ID.TURBO].includes(id)) {
        const body=bodies.find(b=>b.kind==='rotor'&&(b.pivot===i||Math.hypot(b.px-x,b.py-y)<4));
        if(body) lines.push('ROTATION: '+Math.round(body.omega*60/(2*Math.PI)*60)+' RPM    ANGULAR SPEED: '+body.omega.toFixed(3));
        const engine=nearbyEngineAt(x,y); if(engine>=0) lines.push('ENGINE BLOCK: '+T[engine].toFixed(1)+' C');
    }
    if(id===ID.SOLAR_PANEL) lines.push('OUTPUT: CONSTANT LIGHT — '+(signal>0?'GENERATING':'WAITING FOR CLEAR SKY'));
    if(id===ID.PH_METER || id===ID.INDICATOR) lines.push('LOCAL pH: '+estimatePHAt(x,y).toFixed(1));
    if(id===ID.BUNSEN || id===ID.STIRRER || id===ID.CONDENSER || id===ID.GAS_COLLECTOR) lines.push('DEVICE: '+(metaGrid[i]?'ACTIVE':'OFF')+(id===ID.GAS_COLLECTOR?'  COLLECTED GAS: '+lifeGrid[i]:''));  
    panel.textContent=lines.join('\n');
}
function nearbyEngineAt(x,y) { for(let dy=-8;dy<=8;dy++)for(let dx=-8;dx<=8;dx++){const nx=x+dx,ny=y+dy;if(inBounds(nx,ny)){const n=idx(nx,ny);if(grid[n]===ID.ENGINE_BLOCK&&metaGrid[n]===99)return n;}}return -1; }
function toolIcon(t) {
    const c = document.createElement('canvas'); c.width = c.height = 48;
    const g = c.getContext('2d'); g.fillStyle = '#b9bec9'; g.fillRect(0, 0, 48, 48);
    g.font = '30px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t.emoji, 24, 26);
    return c.toDataURL();
}

