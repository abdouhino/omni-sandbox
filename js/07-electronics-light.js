let sp = new Uint8Array(size), spN = new Uint8Array(size);
// Per-creature needs; saved with the world and moved with each creature.
const hungerGrid = new Uint8Array(size), thirstGrid = new Uint8Array(size);
let diagnosticsOn = false;
const DEV = new Uint8Array(1024), PASS = new Uint8Array(1024), ACC = new Uint8Array(1024), SELF = new Uint8Array(1024), EMIT = new Float32Array(1024);
DEV[ID.BATTERY] = 1; DEV[ID.THERMO] = 2; DEV[ID.BARO] = 3; DEV[ID.LAMP] = 5; DEV[ID.LASER] = 6; DEV[ID.INJECTOR] = 7; DEV[ID.PLUG] = 8; DEV[ID.HALL] = 9; DEV[ID.MOTOR] = 10; DEV[ID.ALTERNATOR] = 12; DEV[ID.LED] = 14; DEV[ID.SOLAR_PANEL] = 13;
[ID.COPPER, ID.STEEL, ID.WATER, ID.SALT_WATER, ID.BATTERY, ID.THERMO, ID.BARO, ID.PHOTO, ID.SWITCH, ID.HALL, ID.RESISTOR, ID.DIODE, ID.TRANSISTOR, ID.PCB, ID.ETHERNET, ID.ALTERNATOR, ID.LED, ID.PC_PSU, ID.FUEL_PUMP, ID.OIL_PUMP, ID.RELAY].forEach(i => PASS[i] = 1);
for (const k in ELEMENTS) if (ELEMENTS[k].cond) PASS[ELEMENTS[k].id] = 1;
[ID.COPPER, ID.STEEL, ID.WATER, ID.SALT_WATER, ID.SWITCH, ID.LAMP, ID.LASER, ID.MOTOR, ID.INJECTOR, ID.PLUG, ID.RESISTOR, ID.CAPACITOR, ID.DIODE, ID.TRANSISTOR, ID.PCB, ID.ETHERNET, ID.ALTERNATOR, ID.LED, ID.PC_PSU, ID.FUEL_PUMP, ID.OIL_PUMP, ID.RELAY].forEach(i => ACC[i] = 1);
const GATE = new Uint8Array(1024), POWERED = new Uint8Array(1024), MACH = new Uint8Array(1024);
[ID.SWITCH, ID.THERMOSTAT, ID.THERMOSTAT_H, ID.TIMER, ID.TRANSISTOR].forEach(i => GATE[i] = 1);
[ID.AND_GATE,ID.OR_GATE,ID.NOT_GATE,ID.XOR_GATE,ID.CLOCK,ID.COUNTER,ID.MEMORY].forEach(i=>{ACC[i]=1;MACH[i]=1;});
[ID.BUNSEN,ID.STIRRER,ID.CONDENSER,ID.GAS_COLLECTOR].forEach(i=>{ACC[i]=1;MACH[i]=1;});
[ID.CLOCK,ID.COUNTER,ID.MEMORY,ID.BUNSEN,ID.STIRRER,ID.CONDENSER,ID.GAS_COLLECTOR].forEach(i=>{PASS[i]=0;});
[ID.THERMOSTAT, ID.THERMOSTAT_H, ID.TIMER].forEach(i => { PASS[i] = 1; ACC[i] = 1; });
[ID.HEATER, ID.COOLER, ID.MAGNETRON, ID.CONVEYOR].forEach(i => { ACC[i] = 1; PASS[i] = 1; POWERED[i] = 30; });
[ID.PC_PSU].forEach(i => { ACC[i] = 1; PASS[i] = 1; POWERED[i] = 42; MACH[i] = 1; });
POWERED[ID.FUEL_PUMP] = 36;
[ID.LED].forEach(i => POWERED[i] = 48);
MACH[ID.BUNSEN]=1; MACH[ID.STIRRER]=1; MACH[ID.CONDENSER]=1; MACH[ID.GAS_COLLECTOR]=1; MACH[ID.CLOCK]=1; MACH[ID.COUNTER]=1; MACH[ID.MEMORY]=1; MACH[ID.AND_GATE]=1; MACH[ID.OR_GATE]=1; MACH[ID.NOT_GATE]=1; MACH[ID.XOR_GATE]=1;
MACH[ID.FAN_BELT]=1; MACH[ID.MUFFLER] = 1; MACH[ID.CATALYTIC] = 1; MACH[ID.RADIATOR] = 1; MACH[ID.AIR_INTAKE]=1; MACH[ID.OIL_PUMP]=1; MACH[ID.CAMSHAFT]=1; MACH[ID.RESISTOR] = 1; MACH[ID.CAPACITOR] = 1; MACH[ID.TURBO] = 1; MACH[ID.AIR_FILTER] = 1; MACH[ID.FUEL_TANK] = 1; MACH[ID.FUEL_PUMP] = 1; MACH[ID.OIL_FILTER] = 1; MACH[ID.ENGINE_BLOCK] = 1;
[ID.HEATER, ID.COOLER, ID.MAGNETRON, ID.CONVEYOR, ID.THERMOSTAT, ID.THERMOSTAT_H, ID.TIMER, ID.REPEATER, ID.FUEL_PUMP, ID.OIL_FILTER, ID.ENGINE_BLOCK,ID.BUNSEN,ID.STIRRER,ID.CONDENSER,ID.GAS_COLLECTOR].forEach(i => MACH[i] = 1);
[ID.SOLAR_PANEL].forEach(i => PASS[i] = 1);
[ID.RELAY].forEach(i => { PASS[i] = 1; ACC[i] = 1; GATE[i] = 1; });
[ID.FIRE, ID.LAVA, ID.TORCH, ID.SPARK, ID.PHOT].forEach(i => SELF[i] = 1);
EMIT[ID.FIRE] = 0.9; EMIT[ID.LAVA] = 1.1; EMIT[ID.TORCH] = 1.1; EMIT[ID.SPARK] = 0.9; EMIT[ID.PHOT] = 0.6;
const DIRS = [[0,0],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]];
const dirCode = (dx, dy) => DIRS.findIndex(d => d[0] === dx && d[1] === dy);

const x0c = i => i % WIDTH;
function acceptSpark(nid, ni) { return ACC[nid] && (!GATE[nid] || metaGrid[ni] === 1); }
const MW = new Uint8Array(1024);
for (const k in ELEMENTS) { const e = ELEMENTS[k]; if (e.cat === 'food' || e.type === 'liquid' || e.type === 'creature') MW[e.id] = 1; }
function thermalPulse(i, r, dT, lim, onlyMW) {
    const cx = i % WIDTH, cy = (i / WIDTH) | 0;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > r * r + 1) continue;
        const x = cx + dx, y = cy + dy; if (!inBounds(x, y)) continue;
        const n = y * WIDTH + x; if (onlyMW && !MW[grid[n]]) continue;
        T[n] = dT > 0 ? Math.min(lim, T[n] + dT) : Math.max(lim, T[n] + dT);
    }
}
const RDX = [1, 0, -1, 0], RDY = [0, 1, 0, -1];
function repeaterTick(i) {
    const m = metaGrid[i], dir = m & 3, x = i % WIDTH, y = (i / WIDTH) | 0;
    if (lifeGrid[i] > 0) {
        if (--lifeGrid[i] === 0) {
            const ox = x + RDX[dir], oy = y + RDY[dir];
            if (inBounds(ox, oy)) {
                const o = oy * WIDTH + ox, oid = grid[o];
                if (ACC[oid] && !(GATE[oid] && metaGrid[o] !== 1)) {
                    if (POWERED[oid]) lifeGrid[o] = POWERED[oid];
                    else if (oid === ID.LAMP) lifeGrid[o] = 60; else if (oid === ID.MOTOR) lifeGrid[o] = 30; else if (oid === ID.INJECTOR || oid === ID.PLUG) lifeGrid[o] = 3;
                    if (PASS[oid] && sp[o] === 0 && spN[o] === 0) spN[o] = 9;
                }
            }
        }
        return;
    }
    const bx = x - RDX[dir], by = y - RDY[dir];
    if (inBounds(bx, by) && sp[by * WIDTH + bx] === 9 && PASS[grid[by * WIDTH + bx]]) lifeGrid[i] = 4 * (((m >> 2) & 3) + 1);
}
// --- v21: logic components -------------------------------------------------
function logicGateTick(i,id) {
    const w=i%WIDTH>0 && sp[i-1]>=7, n=i>=WIDTH && sp[i-WIDTH]>=7, e=i%WIDTH<WIDTH-1?i+1:-1;
    let out=false;
    if(id===ID.AND_GATE) out=w&&n;
    else if(id===ID.OR_GATE) out=w||n;
    else if(id===ID.NOT_GATE) out=!w;
    else if(id===ID.XOR_GATE) out=!!w!==!!n;
    if(out && e>=0 && PASS[grid[e]]) spN[e]=9;
    lifeGrid[i]=out?12:0;
}
function clockTick(i) {
    if(metaGrid[i]!==1) { lifeGrid[i]=0; return; }
    const period=45, e=i%WIDTH<WIDTH-1?i+1:-1;
    lifeGrid[i]=(stepCount%period)<5?12:0;
    if(lifeGrid[i]>0 && e>=0 && PASS[grid[e]]) spN[e]=9;
}
function counterTick(i) {
    const w=i%WIDTH>0 && sp[i-1]>=7;
    if(w && metaGrid[i]===0) { lifeGrid[i]=Math.min(65534,lifeGrid[i]+1); metaGrid[i]=1; if(lifeGrid[i]%10===0 && i%WIDTH<WIDTH-1 && PASS[grid[i+1]]) spN[i+1]=9; }
    if(!w) metaGrid[i]=0;
}
function memoryTick(i) {
    const w=i%WIDTH>0 && sp[i-1]>=7, n=i>=WIDTH && sp[i-WIDTH]>=7;
    if(w) metaGrid[i]=1; if(n) metaGrid[i]=0;
    lifeGrid[i]=metaGrid[i]?20:0;
    if(metaGrid[i] && i%WIDTH<WIDTH-1 && PASS[grid[i+1]]) spN[i+1]=9;
}

// --- v21: laboratory machines --------------------------------------------
function labMachineTick(i,id) {
    const x=i%WIDTH,y=(i/WIDTH)|0;
    if(id===ID.BUNSEN) {
        if(metaGrid[i]!==1 || stepCount%3!==0) return;
        thermalPulse(i,5,2.4,720,false);
        if(stepCount%9===0 && inBounds(x,y-1) && grid[idx(x,y-1)]===ID.EMPTY) { setCell(x,y-1,ID.FIRE); T[idx(x,y-1)]=700; }
    } else if(id===ID.STIRRER) {
        if(metaGrid[i]!==1 || stepCount%5!==0) return;
        for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { const nx=x+dx,ny=y+dy; if(!inBounds(nx,ny)) continue; const a=idx(nx,ny), b=idx(nx,ny+1); if(grid[a] && TCLS[grid[a]]===2 && grid[b] && TCLS[grid[b]]===2 && MIXABLE[grid[a]] && MIXABLE[grid[b]]) blendCells(a,b,false); }
    } else if(id===ID.CONDENSER) {
        if(metaGrid[i]!==1 || stepCount%4!==0) return;
        for(let dy=-5;dy<=5;dy++) for(let dx=-2;dx<=2;dx++) { const nx=x+dx,ny=y+dy; if(!inBounds(nx,ny)) continue; const q=idx(nx,ny); if(grid[q]===ID.STEAM && fr()<0.12) { setCell(nx,ny,ID.WATER); T[q]=Math.min(45,T[q]); } }
    } else if(id===ID.GAS_COLLECTOR) {
        if(metaGrid[i]!==1 || stepCount%8!==0) return;
        for(let dy=-4;dy<=4;dy++) for(let dx=-4;dx<=4;dx++) { const nx=x+dx,ny=y+dy; if(!inBounds(nx,ny)) continue; const q=idx(nx,ny); if(EL_BY_ID[grid[q]]?.type==='gas' && grid[q]!==ID.FIRE && grid[q]!==ID.SMOKE && fr()<0.08) { setCell(nx,ny,ID.EMPTY); lifeGrid[i]=Math.min(65534,lifeGrid[i]+1); } }
    }
}
function machineTick(i, id) {
    if(id===ID.AND_GATE||id===ID.OR_GATE||id===ID.NOT_GATE||id===ID.XOR_GATE) { logicGateTick(i,id); return; }
    if(id===ID.CLOCK) { clockTick(i); return; }
    if(id===ID.COUNTER) { counterTick(i); return; }
    if(id===ID.MEMORY) { memoryTick(i); return; }
    if(id===ID.BUNSEN||id===ID.STIRRER||id===ID.CONDENSER||id===ID.GAS_COLLECTOR) { labMachineTick(i,id); return; }
    // PC PSU charge decays between battery/alternator pulses.
    // PC PSU charge decays between battery/alternator pulses.
    if (id === ID.PC_PSU) { if (lifeGrid[i] > 0) lifeGrid[i]--; return; }
    if (id === ID.RESISTOR) { if (sp[i] > 0 && stepCount % 5 === 0) T[i] = Math.min(260, T[i] + 0.22); return; }
    if (id === ID.CAPACITOR) {
        if (sp[i] >= 7) lifeGrid[i] = Math.min(90, lifeGrid[i] + 40);
        else if (lifeGrid[i] > 0 && --lifeGrid[i] === 0) {
            const x = i % WIDTH, y = (i / WIDTH) | 0;
            for (let k = 0; k < 4; k++) { const nx = x + (k === 0 ? 1 : k === 1 ? -1 : 0), ny = y + (k === 2 ? 1 : k === 3 ? -1 : 0); if (!inBounds(nx, ny)) continue; const n = ny * WIDTH + nx; if (PASS[grid[n]] && ACC[grid[n]]) spN[n] = 9; }
        }
        return;
    }
    if (id === ID.FUEL_TANK) {
        if (metaGrid[i] !== 99 || stepCount % 12 !== 0) return;
        // A sealed tank slowly feeds fuel vapour from its outlet when warmed.
        if (T[i] > 18 && Math.random() < 0.22) {
            const x=i%WIDTH, y=(i/WIDTH)|0;
            for (const [dx,dy] of [[1,0],[-1,0],[0,-1],[0,1]]) { const nx=x+dx, ny=y+dy; if(inBounds(nx,ny) && grid[idx(nx,ny)]===ID.EMPTY) { setCell(nx,ny,ID.FUEL); T[idx(nx,ny)]=Math.max(T[i],AMBIENT); break; } }
        }
        return;
    }
    if (id === ID.AIR_FILTER) {
        if (metaGrid[i] !== 99 || stepCount % 5 !== 0) return;
        const x=i%WIDTH, y=(i/WIDTH)|0;
        for(let dy=-3;dy<=3;dy++) for(let dx=-4;dx<=4;dx++) { const nx=x+dx, ny=y+dy; if(!inBounds(nx,ny)) continue; const n=idx(nx,ny); if(grid[n]===ID.SMOKE && Math.random()<0.08) { setCell(nx,ny,ID.ASH); T[n]=Math.max(AMBIENT,T[n]-2); } }
        return;
    }
    if (id === ID.FAN_BELT) {
        if (metaGrid[i] !== 99 || stepCount % 5 !== 0) return;
        const x=i%WIDTH,y=(i/WIDTH)|0;
        const linked=bodies.some(b=>b.kind==='rotor'&&Math.hypot(b.px-x,b.py-y)<=18&&Math.abs(b.omega)>0.035);
        if(linked) {
            for(let dy=-10;dy<=10;dy++) for(let dx=-12;dx<=12;dx++) {
                const nx=x+dx,ny=y+dy; if(!inBounds(nx,ny)) continue;
                const q=idx(nx,ny);
                if(grid[q]===ID.ENGINE_BLOCK||grid[q]===ID.PC_CPU||grid[q]===ID.PC_GPU||grid[q]===ID.COOLANT||grid[q]===ID.WATER) T[q]=Math.max(AMBIENT,T[q]-0.65);
            }
        }
        return;
    }
    if (id === ID.TURBO) {
        if (metaGrid[i] !== 99 || stepCount % 4 !== 0) return;
        const x=i%WIDTH, y=(i/WIDTH)|0;
        const spinning=bodies.some(b=>b.kind==='rotor' && Math.hypot(b.px-x,b.py-y)<=12 && Math.abs(b.omega)>0.035);
        if(spinning) { addPressureAt(x,y,0.055); T[i]=Math.min(260,T[i]+0.16); }
        return;
    }
    if (id === ID.MUFFLER) {
        if (metaGrid[i] !== 99 || stepCount % 6 !== 0) return;
        const a = airIdx[i]; Pair[a] *= 0.82;
        const x = i % WIDTH, y = (i / WIDTH) | 0;
        for (let dy = -3; dy <= 3; dy++) for (let dx = -5; dx <= 5; dx++) { const nx=x+dx, ny=y+dy; if (!inBounds(nx,ny)) continue; const n=idx(nx,ny); if (grid[n] === ID.SMOKE || grid[n] === ID.FUEL || grid[n] === ID.STEAM) { vel[n] *= 0.72; T[n] = Math.max(35, T[n] - 0.55); } }
        return;
    }
    if (id === ID.CATALYTIC) {
        if (metaGrid[i] !== 99 || T[i] < 100 || stepCount % 4 !== 0) return;
        const x=i%WIDTH, y=(i/WIDTH)|0;
        for (let dy=-4; dy<=4; dy++) for (let dx=-5; dx<=5; dx++) { const nx=x+dx, ny=y+dy; if(!inBounds(nx,ny)) continue; const n=idx(nx,ny), g=grid[n]; if ((g===ID.FUEL || g===ID.SMOKE) && Math.random()<0.16) { const tt=T[n]; setCell(nx,ny,g===ID.FUEL?ID.STEAM:ID.CO2); T[n]=Math.max(100,tt); } }
        return;
    }
    if (id === ID.RADIATOR) {
        if (metaGrid[i] !== 99 || stepCount % 3 !== 0) return;
        const x=i%WIDTH, y=(i/WIDTH)|0;
        for (let dy=-5; dy<=5; dy++) for (let dx=-6; dx<=6; dx++) { const nx=x+dx, ny=y+dy; if(!inBounds(nx,ny)) continue; const n=idx(nx,ny); if(T[n]>24) T[n]=Math.max(AMBIENT,T[n]-Math.min(2.2,(T[n]-AMBIENT)*0.05)); if(grid[n]===ID.COOLANT && T[n]>24) T[n]=Math.max(AMBIENT,T[n]-Math.min(2.6,(T[n]-AMBIENT)*0.06)); if(grid[n]===ID.WATER && T[n]>100 && Math.random()<0.04) { const tt=T[n]; setCell(nx,ny,ID.STEAM); T[n]=tt; } }
        return;
    }
    if (id === ID.FUEL_PUMP) {
        if (lifeGrid[i] > 0 && stepCount % 8 === 0) {
            const x=i%WIDTH, y=(i/WIDTH)|0;
            // Draw from a nearby tank or feed a small amount of vapour if the pump is powered.
            let tank=false;
            for(let dy=-8;dy<=8&&!tank;dy++) for(let dx=-8;dx<=8;dx++) { const nx=x+dx,ny=y+dy; if(inBounds(nx,ny)&&grid[idx(nx,ny)]===ID.FUEL_TANK&&metaGrid[idx(nx,ny)]===99){tank=true;break;} }
            if(tank) { lifeGrid[i]=Math.max(0,lifeGrid[i]-2); emitNear(i,ID.FUEL); }
        }
        return;
    }
    if (id === ID.OIL_FILTER) {
        if (metaGrid[i] !== 99 || stepCount % 8 !== 0) return;
        const x=i%WIDTH,y=(i/WIDTH)|0;
        for(let dy=-4;dy<=4;dy++) for(let dx=-5;dx<=5;dx++) { const nx=x+dx,ny=y+dy; if(!inBounds(nx,ny)) continue; const n=idx(nx,ny); if(grid[n]===ID.SMOKE&&Math.random()<0.05){setCell(nx,ny,ID.ASH);T[n]=Math.max(AMBIENT,T[n]-1);} }
        for(const b of bodies) if(b.kind==='rotor'&&Math.hypot(b.px-x,b.py-y)<12) T[b.pivot]=Math.max(AMBIENT,T[b.pivot]-0.45);
        return;
    }
    if (id === ID.ENGINE_BLOCK) {
        if (metaGrid[i] !== 99 || stepCount % 5 !== 0) return;
        const x=i%WIDTH,y=(i/WIDTH)|0; let spark=false, fuel=-1, intake=false, oilPump=false, cam=false, pump=false;
        for(let dy=-7;dy<=7;dy++) for(let dx=-8;dx<=8;dx++) { const nx=x+dx,ny=y+dy; if(!inBounds(nx,ny)) continue; const n=idx(nx,ny),g=grid[n]; if(g===ID.PLUG&&lifeGrid[n]>0) spark=true; if(g===ID.FIRE) spark=true; if(g===ID.FUEL&&fuel<0) fuel=n; if(g===ID.AIR_INTAKE&&metaGrid[n]===99) intake=true; if(g===ID.OIL_PUMP&&sp[n]>0) oilPump=true; if(g===ID.CAMSHAFT) cam=true; if(g===ID.FUEL_PUMP&&lifeGrid[n]>0) pump=true; }
        if(spark&&fuel>=0) { const fx=fuel%WIDTH,fy=(fuel/WIDTH)|0; setCell(fx,fy,ID.FIRE); T[fuel]=Math.max(650,T[fuel]); T[i]=Math.min(900,T[i]+(intake?11:14)); addPressureAt(x,y,intake?0.9:0.75); for(const b of bodies) if(b.kind==='rotor'&&Math.hypot(b.px-x,b.py-y)<14) b.omega=Math.min(1.2,b.omega+0.055+(cam?0.012:0)); }
        else T[i]=Math.max(AMBIENT,T[i]-0.12);
        if(oilPump) T[i]=Math.max(AMBIENT,T[i]-0.65); if(pump) addPressureAt(x,y,0.025);
        if(T[i]>650) { for(let dy=-3;dy<=3;dy++) for(let dx=-3;dx<=3;dx++){const nx=x+dx,ny=y+dy;if(inBounds(nx,ny)){const n=idx(nx,ny);if(grid[n]===ID.STEEL||grid[n]===ID.PISTON)T[n]=Math.max(T[n],T[i]*0.42);}} }
        return;
    }
    if (id === ID.REPEATER) { repeaterTick(i); return; }
    if (id === ID.TIMER) { if (metaGrid[i] === 1 && --lifeGrid[i] <= 0) { metaGrid[i] = 0; lifeGrid[i] = 0; } return; }
    if (id === ID.THERMOSTAT)   { if (T[i] > 9) metaGrid[i] = 1; else if (T[i] < 4) metaGrid[i] = 0; return; }
    if (id === ID.THERMOSTAT_H) { if (T[i] < 150) metaGrid[i] = 1; else if (T[i] > 190) metaGrid[i] = 0; return; }
    if (lifeGrid[i] <= 0) return; lifeGrid[i]--;
    if (id === ID.HEATER) thermalPulse(i, 4, 1.5, 260, false);
    else if (id === ID.COOLER) thermalPulse(i, 6, -2, -45, false);
    else if (id === ID.MAGNETRON) {
        thermalPulse(i, 8, 1.0, 120, true);
        if (stepCount % 6 === 0) {
            const cx = i % WIDTH, cy = (i / WIDTH) | 0;
            for (let t = 0; t < 8; t++) { const x = cx + ((Math.random() * 17) | 0) - 8, y = cy + ((Math.random() * 17) | 0) - 8;
                if (inBounds(x, y) && (grid[y * WIDTH + x] === ID.STEEL || grid[y * WIDTH + x] === ID.COPPER) && inBounds(x, y - 1) && grid[(y - 1) * WIDTH + x] === ID.EMPTY) { setCell(x, y - 1, ID.SPARK); break; } }
        }
    } else if (id === ID.CONVEYOR) {
        const x = i % WIDTH, y = (i / WIDTH) | 0;
        if (y > 0 && x < WIDTH - 1 && Math.random() < 0.3) { const a = i - WIDTH, b = a + 1; if (grid[a] !== 0 && grid[a] !== ID.CONVEYOR && grid[b] === 0) swapCells(a, b); }
    }
}
function spawnPhoton(x, y, dir, laser) {
    if (!inBounds(x, y) || grid[idx(x, y)] !== ID.EMPTY) return;
    setCell(x, y, ID.PHOT); metaGrid[idx(x, y)] = dir | (laser ? 16 : 0);
}
function electricStep() {
    spN.set(sp);
    for (let i = 0; i < size; i++) {
        const id = grid[i], s = sp[i];
        if (MACH[id]) machineTick(i, id);
        if (s === 0) {
            const d = DEV[id]; if (!d) continue;
            if (d === 1) { if (stepCount % 12 === 0) spN[i] = 9; }
            else if (d === 12) { if (stepCount % 8 === 0) { const x=i%WIDTH, y=(i/WIDTH)|0; if (metaGrid[i]===99 && bodies.some(b => b.kind === 'rotor' && Math.hypot(b.px-x,b.py-y) <= 14 && Math.abs(b.omega) > 0.025)) spN[i]=9; } }
            else if (d === 13) { if (metaGrid[i]===99 && stepCount % 18 === 0) { const x=i%WIDTH,y=(i/WIDTH)|0; let clear=true; for(let yy=y-1;yy>=Math.max(0,y-12);yy--) {const g=grid[yy*WIDTH+x]; if(g!==0&&g!==ID.STEAM&&g!==ID.SMOKE){clear=false;break;}} if(clear) spN[i]=9; } }
            else if (d === 2) { if (T[i] > 80) spN[i] = 9; }
            else if (d === 3) { if (airMax >= 0.5 && PBR[airIdx[i]] > 2) spN[i] = 9; }
            else if (d === 5 || d === 14) {
                if (lifeGrid[i] > 2) { const L = lifeGrid[i] - 2, lx = i % WIDTH, ly = (i / WIDTH) | 0;
                    for (let k = 0; k < 4; k++) { const nx = lx + (k === 0 ? 1 : k === 1 ? -1 : 0), ny = ly + (k === 2 ? 1 : k === 3 ? -1 : 0); if (!inBounds(nx, ny)) continue; const n = ny * WIDTH + nx; if (grid[n] === ID.LAMP && lifeGrid[n] < L) lifeGrid[n] = L; } }
                if (lifeGrid[i] > 0) { lifeGrid[i]--; if (Math.random() < 0.1) { const k = 1 + ((Math.random() * 8) | 0); spawnPhoton(i % WIDTH + DIRS[k][0], ((i / WIDTH) | 0) + DIRS[k][1], k); } }
            } else if (d === 6) {
                if (lifeGrid[i] > 0) { lifeGrid[i]--; const k = metaGrid[i] || 1; spawnPhoton(i % WIDTH + DIRS[k][0], ((i / WIDTH) | 0) + DIRS[k][1], k, true); }
            } else if (d === 7) { if (lifeGrid[i] > 0) { lifeGrid[i]--; emitNear(i, ID.FUEL); } }
            else if (d === 8) { if (lifeGrid[i] > 0) { lifeGrid[i]--; emitNear(i, ID.FIRE); } }
            else if (d === 9) {
                const hx = i % WIDTH, hy = (i / WIDTH) | 0;
                for (const p of pinPos) { const ex = p[0] - hx, ey = p[1] - hy; if (ex * ex + ey * ey <= 27) { spN[i] = 9; break; } }
            } else if (d === 10) { if (lifeGrid[i] > 0) lifeGrid[i]--; }
            continue;
        }
        spN[i] = s - 1;
        if (s === 9 && PASS[id] && (!GATE[id] || metaGrid[i] === 1)) {
            const x = i % WIDTH, y = (i / WIDTH) | 0;
            for (let k = 0; k < 4; k++) {
                const dx = k === 0 ? 1 : k === 1 ? -1 : 0, dy = k === 2 ? 1 : k === 3 ? -1 : 0;
                const nx = x + dx, ny = y + dy; if (!inBounds(nx, ny)) continue;
                const n = ny * WIDTH + nx, nid = grid[n];
                if (!ACC[nid]) continue;
                if (id === ID.DIODE) { const dd=metaGrid[i]&3, dxOut=[1,0,-1,0][dd], dyOut=[0,1,0,-1][dd]; if (dx!==dxOut || dy!==dyOut) continue; }
                if (nid === ID.RESISTOR) T[n] = Math.min(260, T[n] + 0.08);
                if (nid === ID.RELAY) { metaGrid[n] = metaGrid[n] ? 0 : 1; lifeGrid[n] = metaGrid[n] ? 60 : 0; if(metaGrid[n]) spN[n]=9; continue; }
                if (POWERED[nid]) { lifeGrid[n] = POWERED[nid]; if (!PASS[nid]) continue; }
                if (nid === ID.LAMP || nid === ID.LED) { lifeGrid[n] = 60; continue; }
                if (nid === ID.LASER) { lifeGrid[n] = 40; metaGrid[n] = dirCode(dx, dy); continue; }
                if (nid === ID.MOTOR) { lifeGrid[n] = 30; continue; }
                if (nid === ID.INJECTOR || nid === ID.PLUG) { lifeGrid[n] = 3; continue; }
                if (GATE[nid] && metaGrid[n] !== 1) continue;
                if (sp[n] === 0 && spN[n] === 0) spN[n] = 9;
            }
        }
    }
    const t = sp; sp = spN; spN = t;
}

function photonStep(x, y, i) {
    const laser = metaGrid[i] & 16;
    let d = metaGrid[i] & 15; if (!d) { d = 1 + ((Math.random() * 8) | 0); metaGrid[i] = d | laser; }
    let dx = DIRS[d][0], dy = DIRS[d][1], cx = x, cy = y, ci = i;
    for (let s = 0; s < 3; s++) {
        let nx = cx + dx, ny = cy + dy;
        if (!inBounds(nx, ny)) { setCell(cx, cy, ID.EMPTY); return; }
        let ni = ny * WIDTH + nx, nid = grid[ni];
        if (nid === ID.GLASS) {
            let k = 0; while (k++ < 40 && inBounds(nx, ny) && grid[ny * WIDTH + nx] === ID.GLASS) { nx += dx; ny += dy; }
            if (!inBounds(nx, ny) || grid[ny * WIDTH + nx] !== ID.EMPTY) { setCell(cx, cy, ID.EMPTY); return; }
            ni = ny * WIDTH + nx; nid = ID.EMPTY;
        }
        if (nid === ID.EMPTY || nid === ID.PHOT) { swapCells(ci, ni); cx = nx; cy = ny; ci = ni; continue; }
        if (nid === ID.MIRROR) {
            let rx = false, ry = false;
            if (dx && dy) {
                rx = inBounds(cx + dx, cy) && grid[cy * WIDTH + cx + dx] !== ID.EMPTY;
                ry = inBounds(cx, cy + dy) && grid[(cy + dy) * WIDTH + cx] !== ID.EMPTY;
                if (!rx && !ry) rx = ry = true;
            } else if (dx) rx = true; else ry = true;
            if (rx) dx = -dx; if (ry) dy = -dy;
            metaGrid[ci] = dirCode(dx, dy) | laser; continue;
        }

        // Seuls les photons de LASER chauffent et détruisent ce qu'ils touchent (LED / lampe : aucun effet).
        if (laser) {
            const PROT = nid === ID.WALL || nid === ID.BEDROCK || nid === ID.BORDER || nid === ID.EWALL || nid === ID.LASER;
            if (!PROT) {
                T[ni] = Math.min(3000, T[ni] + 40);
                if (Math.random() < 0.35) setCell(nx, ny, ID.EMPTY);
            }
        }
        if (nid === ID.PHOTO && sp[ni] === 0) sp[ni] = 9;
        setCell(cx, cy, ID.EMPTY); return;
    }
}

const LC = 8, LW = Math.ceil(WIDTH / LC), LH = Math.ceil(HEIGHT / LC);
let LA = new Float32Array(LW * LH), LB = new Float32Array(LW * LH), lightMap = LA;
function buildLight() {
    LA.fill(0);
    for (let y = 0; y < HEIGHT; y++) {
        const row = y * WIDTH, lr = (y / LC | 0) * LW;
        for (let x = 0; x < WIDTH; x++) {
            const i = row + x, id = grid[i]; if (!id) continue;
            let e = EMIT[id];
            if (id === ID.LAMP) e = lifeGrid[i] > 0 ? 2.4 : 0;
            else if (id === ID.LASER) e = lifeGrid[i] > 0 ? 1 : 0;
            else if (id === ID.LED) e = lifeGrid[i] > 0 ? 1.5 : 0;
            else if (sp[i] >= 6) e = Math.max(e, 0.5);
            else { const t = T[i]; if (t > 500) e = Math.max(e, Math.min(1, (t - 500) / 700)); }
            if (e > 0) LA[lr + (x / LC | 0)] += e;
        }
    }
    let A = LA, B = LB;
    for (let it = 0; it < 12; it++) {
        for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) {
            const j = y * LW + x, c = A[j];
            const l = x > 0 ? A[j - 1] : c, r = x < LW - 1 ? A[j + 1] : c, u = y > 0 ? A[j - LW] : c, d = y < LH - 1 ? A[j + LW] : c;
            B[j] = (c * 0.4 + (l + r + u + d) * 0.15) * 0.995;
        }
        const t = A; A = B; B = t;
    }
    lightMap = A;
}
const LX0 = new Uint8Array(WIDTH), LX1 = new Uint8Array(WIDTH), LFX = new Float32Array(WIDTH);
const LY0 = new Uint8Array(HEIGHT), LY1 = new Uint8Array(HEIGHT), LFY = new Float32Array(HEIGHT);
(function () {
    const f = (n, W, a0, a1, af) => { for (let p = 0; p < n; p++) { const g = (p + 0.5) / LC - 0.5, g0 = Math.floor(g); a0[p] = Math.max(0, g0); a1[p] = Math.min(W - 1, g0 + 1); af[p] = g - g0; } };
    f(WIDTH, LW, LX0, LX1, LFX); f(HEIGHT, LH, LY0, LY1, LFY);
})();
function sampleLight(x, y) {
    const ya = LY0[y] * LW, yb = LY1[y] * LW, xa = LX0[x], xb = LX1[x], fx = LFX[x], fy = LFY[y], m = lightMap;
    const v = ((m[ya + xa] * (1 - fx) + m[ya + xb] * fx) * (1 - fy) + (m[yb + xa] * (1 - fx) + m[yb + xb] * fx) * fy) * 1.3;
    return v > 1.5 ? 1.5 : v;
}
function toggleRepeater(e) {
    const r = Math.max(1, brushSize - 1); let n = 0, m = 0;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > r * r + r) continue;
        const tx = mouseX + dx, ty = mouseY + dy; if (!inBounds(tx, ty)) continue;
        const i = idx(tx, ty); if (grid[i] === ID.DIODE) { m = (metaGrid[i] + 1) & 3; metaGrid[i] = m; n++; continue; } if (grid[i] !== ID.REPEATER) continue;
        m = metaGrid[i]; m = e.shiftKey ? ((m & 3) | ((((m >> 2) + 1) & 3) << 2)) : ((m & 12) | (((m & 3) + 1) & 3)); metaGrid[i] = m; lifeGrid[i] = 0; n++;
    }
    if (n) { sfx('click'); const hitD=grid[idx(mouseX,mouseY)]===ID.DIODE; flash(hitD ? t('diode.info',{dir:t('dir.'+(m&3))}) : t('repeater.info', { dir: t('dir.' + (m & 3)), delay: ((m >> 2) & 3) + 1 })); }
    return n > 0;
}
function toggleSwitches() {
    const r = Math.max(1, brushSize - 1); let state = -1, n = 0;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > r * r + r) continue;
        const tx = mouseX + dx, ty = mouseY + dy; if (!inBounds(tx, ty)) continue;
        const i = idx(tx, ty);
        if ([ID.SWITCH,ID.TIMER,ID.TRANSISTOR,ID.RELAY,ID.BUNSEN,ID.STIRRER,ID.CONDENSER,ID.GAS_COLLECTOR,ID.CLOCK].includes(grid[i])) { if (state < 0) state = metaGrid[i] ? 0 : 1; metaGrid[i] = state; if (grid[i] === ID.TIMER) lifeGrid[i] = state ? 900 : 0; if (grid[i] === ID.RELAY) lifeGrid[i] = state ? 60 : 0; if([ID.BUNSEN,ID.STIRRER,ID.CONDENSER,ID.GAS_COLLECTOR].includes(grid[i])) lifeGrid[i]=state?1:0; n++; }
    }
    if (n) { const st = [], seen = new Set();
        for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (inBounds(mouseX + dx, mouseY + dy) && grid[idx(mouseX + dx, mouseY + dy)] === ID.SWITCH) st.push(idx(mouseX + dx, mouseY + dy));
        while (st.length) { const i = st.pop(); if (seen.has(i)) continue; seen.add(i); metaGrid[i] = state; const x = i % WIDTH, y = (i / WIDTH) | 0;
            for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (inBounds(x + ax, y + ay) && grid[idx(x + ax, y + ay)] === ID.SWITCH) st.push(idx(x + ax, y + ay)); } }
    if (n) sfx('click');
    flash(n ? t('switch.state', { state: state ? t('hover.on') : t('hover.off') }) : t('switch.none'));
}

