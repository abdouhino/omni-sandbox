function computerStep() {
    // Scan every 8 simulation ticks to keep the feature affordable.
    if ((stepCount & 7) !== 0) return;
    const boards = [], monitors = [];
    for (let i=0; i<size; i++) {
        const id=grid[i], m=metaGrid[i];
        if (id===ID.PC_MOTHERBOARD && m===99) boards.push(i);
        else if (id===ID.PC_MONITOR && m===98) monitors.push(i);
    }
    const nearIndex = (cx,cy,r,pred) => {
        for(let dy=-r;dy<=r;dy++) for(let dx=-r;dx<=r;dx++) { if(dx*dx+dy*dy>r*r) continue; const x=cx+dx,y=cy+dy; if(!inBounds(x,y)) continue; const n=idx(x,y); if(pred(n)) return n; }
        return -1;
    };
    const active=[];
    for(const bi of boards) {
        const bx=bi%WIDTH, by=(bi/WIDTH)|0;
        const pcCase=nearIndex(bx,by,30,n=>grid[n]===ID.PC_CASE);
        const cpu=nearIndex(bx,by,16,n=>grid[n]===ID.PC_CPU && metaGrid[n]===88);
        const gpu=nearIndex(bx,by,22,n=>grid[n]===ID.PC_GPU && metaGrid[n]===89);
        const ram=nearIndex(bx,by,19,n=>grid[n]===ID.PC_RAM);
        const storage=nearIndex(bx,by,24,n=>grid[n]===ID.PC_SSD || grid[n]===ID.PC_HDD);
        const psu=nearIndex(bx,by,27,n=>grid[n]===ID.PC_PSU && (lifeGrid[n]>0 || sp[n]>0));
        const fan=nearIndex(bx,by,15,n=>grid[n]===ID.AXLE && metaGrid[n]===93);
        const sink=nearIndex(bx,by,13,n=>grid[n]===ID.PC_HEATSINK);
        const complete=pcCase>=0 && cpu>=0 && gpu>=0 && ram>=0 && storage>=0 && psu>=0;
        // POST -> boot loader -> desktop. cookGrid on the motherboard stores boot progress.
        if (complete) cookGrid[bi]=Math.min(48,cookGrid[bi]+(storage>=0&&grid[storage]===ID.PC_SSD?1.5:0.75));
        else cookGrid[bi]=Math.max(0,cookGrid[bi]-2.0);
        let stage = !complete ? 0 : (cookGrid[bi] < 8 ? 1 : (cookGrid[bi] < 28 ? 2 : 3));
        let running=complete && stage===3;
        if(cpu>=0) {
            if(running) T[cpu]=Math.min(180,T[cpu]+(gpu>=0?0.38:0.18));
            else T[cpu]=Math.max(AMBIENT,T[cpu]-0.2);
            if(fan>=0) T[cpu]=Math.max(AMBIENT,T[cpu]-0.95);
            else if(sink>=0) T[cpu]=Math.max(AMBIENT,T[cpu]-0.42);
            if(T[cpu]>118) { running=false; stage=4; cookGrid[bi]=0; }
            lifeGrid[cpu]=running?36:(stage===1?8:0);
        }
        if(gpu>=0) {
            if(running) T[gpu]=Math.min(180,T[gpu]+0.32); else T[gpu]=Math.max(AMBIENT,T[gpu]-0.18);
            if(fan>=0 || sink>=0) T[gpu]=Math.max(AMBIENT,T[gpu]-0.5);
            if(T[gpu]>125) { running=false; stage=4; cookGrid[bi]=0; }
            lifeGrid[gpu]=running?36:0;
        }
        lifeGrid[bi]=stage===4?0:(stage===3?120:(stage===2?30:(stage===1?12:0)));
        if(running) active.push({x:bx,y:by,stage});
        if(fan>=0 && running) { const body=bodies.find(b=>b.kind==='rotor' && b.pivot===fan); if(body) body.omega=Math.max(body.omega,0.075); }
        for(let dy=-24;dy<=24;dy++) for(let dx=-30;dx<=30;dx++) { const x=bx+dx,y=by+dy; if(!inBounds(x,y)) continue; const n=idx(x,y); if(grid[n]===ID.PC_KEYBOARD || grid[n]===ID.PC_MOUSE) lifeGrid[n]=running?30:0; }
    }
    for(const mi of monitors) {
        const mx=mi%WIDTH,my=(mi/WIDTH)|0;
        let best=0,dist=48*48;
        for(const p of active) { const d=(p.x-mx)*(p.x-mx)+(p.y-my)*(p.y-my); if(d<dist){dist=d;best=p.stage;} }
        // If a motherboard is assembling but not ready, show POST/boot status as well.
        if(!best) for(const bi of boards) { const bx=bi%WIDTH,by=(bi/WIDTH)|0,d=(bx-mx)*(bx-mx)+(by-my)*(by-my); if(d<48*48) { const progress=cookGrid[bi]; best=progress>=28?3:(progress>=8?2:(progress>0?1:0)); } }
        const screenValue=best===3?60:(best===2?30:(best===1?12:0));
        for(let dy=-12;dy<=12;dy++) for(let dx=-16;dx<=16;dx++) { const x=mx+dx,y=my+dy; if(!inBounds(x,y)) continue; const n=idx(x,y); if(grid[n]===ID.PC_MONITOR && metaGrid[n]===2) lifeGrid[n]=screenValue; }
    }
}

function ecologyStep() {
    if(stepCount%28!==0) return;
    for(let i=0;i<size;i++) {
        const id=grid[i],x=i%WIDTH,y=(i/WIDTH)|0;
        if(id===ID.BACTERIA) {
            let food=-1,water=false;
            for(let dy=-2;dy<=2;dy++) for(let dx=-2;dx<=2;dx++) { const nx=x+dx,ny=y+dy; if(!inBounds(nx,ny)) continue; const q=idx(nx,ny); if([ID.WATER,ID.SALT_WATER,ID.GROUNDWATER].includes(grid[q])) water=true; if([ID.RAW_MEAT,ID.FRUIT,ID.PLANT,ID.BREAD].includes(grid[q])) food=q; }
            if(food>=0 && fr()<0.12) { setCell(food%WIDTH,(food/WIDTH)|0,ID.ROTTEN_MEAT); logReaction('decomposition','BIOLOGICAL DECOMPOSITION','A bacteria colony accelerated the breakdown of nearby organic material.'); }
            if(water && food>=0 && fr()<0.04) { const dx=(fr()*3|0)-1,dy=(fr()*3|0)-1,nx=x+dx,ny=y+dy; if(inBounds(nx,ny)&&grid[idx(nx,ny)]===0) setCell(nx,ny,ID.BACTERIA); }
        } else if(id===ID.ALGAE) {
            if(fr()<0.035) { const d=fr()*4|0,nx=x+NDX[d],ny=y+NDY[d]; if(inBounds(nx,ny)&&grid[idx(nx,ny)]===ID.WATER) { setCell(nx,ny,ID.ALGAE); if(fr()<0.6) emitNear(i,ID.OXYGEN); } }
            if(fr()<0.02) emitNear(i,ID.OXYGEN);
        } else if(id===ID.BIRD || id===ID.FROG) {
            let prey=-1;
            for(let dy=-3;dy<=3;dy++) for(let dx=-3;dx<=3;dx++) { const nx=x+dx,ny=y+dy; if(!inBounds(nx,ny)) continue; const q=idx(nx,ny); if(id===ID.BIRD && [ID.SEED,ID.FRUIT,ID.ANT].includes(grid[q])) prey=q; if(id===ID.FROG && [ID.ANT,ID.BACTERIA].includes(grid[q])) prey=q; }
            if(prey>=0 && fr()<0.08) setCell(prey%WIDTH,(prey/WIDTH)|0,ID.EMPTY);
        }
    }
}
function geologyStep() {
    if(stepCount%90!==0) return;
    for(let y=1;y<HEIGHT-1;y+=2) for(let x=1;x<WIDTH-1;x+=2) {
        const i=idx(x,y),id=grid[i];
        if(id===ID.GROUNDWATER) {
            for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { const nx=x+dx,ny=y+dy; if(inBounds(nx,ny)){const q=idx(nx,ny); if(grid[q]===ID.DIRT && fr()<0.012) setCell(nx,ny,ID.CLAY); } }
        } else if(id===ID.LIMESTONE) {
            const acid=findChemNearby(x,y,[ID.ACID,ID.VINEGAR],1); if(acid && fr()<0.02) { setCell(x,y,ID.EMPTY); emitNear(i,ID.CO2); logReaction('limestone-weathering','LIMESTONE WEATHERING','Acidic water slowly dissolved exposed limestone in the geology model.'); }
        } else if(id===ID.COPPER_ORE && T[i]>650 && fr()<0.0008) setCell(x,y,ID.COPPER);
        else if(id===ID.IRON_ORE && T[i]>850 && fr()<0.0008) setCell(x,y,ID.IRON);
    }
}
function generateGeologyWorld() {
    resetWorld();
    for(let x=0;x<WIDTH;x++) {
        const surface=104+Math.floor(Math.sin(x*.045)*8+Math.cos(x*.11)*4);
        for(let y=surface;y<HEIGHT;y++) {
            const r=Math.random();
            if(y>HEIGHT-8) setCell(x,y,ID.BEDROCK);
            else if(y>surface+45) setCell(x,y,r<.045?ID.IRON_ORE:(r<.07?ID.COPPER_ORE:(r<.18?ID.LIMESTONE:ID.STONE)));
            else if(y>surface+16) setCell(x,y,r<.08?ID.GRAVEL:(r<.15?ID.LIMESTONE:ID.DIRT));
            else setCell(x,y,r<.12?ID.CLAY:(r<.25?ID.FERTILE_SOIL:ID.DIRT));
        }
    }
    // Carve pockets and fill selected cave floors with groundwater.
    for(let c=0;c<14;c++) {
        const cx=18+(Math.random()*(WIDTH-36)|0),cy=122+(Math.random()*65|0),rx=4+(Math.random()*9|0),ry=3+(Math.random()*5|0);
        for(let y=cy-ry;y<=cy+ry;y++) for(let x=cx-rx;x<=cx+rx;x++) if(inBounds(x,y)&&((x-cx)*(x-cx))/(rx*rx)+((y-cy)*(y-cy))/(ry*ry)<1) setCell(x,y,Math.random()<.24?ID.GROUNDWATER:ID.EMPTY);
    }
    for(let n=0;n<40;n++) { const x=12+(Math.random()*(WIDTH-24)|0),y=60+(Math.random()*35|0); if(grid[idx(x,y)]===0) setCell(x,y,ID.PLANT); }
    flash('GEOLOGY WORLD GENERATED');
}
function generateLogicDemo() {
    resetWorld();
    // Four independent gate stations. Each input has a battery, a switch,
    // copper wiring, and an LED on the output so the logic can be observed.
    const station=(gate,gx,gy,westOn,northOn)=>{
        setCell(gx,gy,gate);
        // West input: battery -> copper -> switch -> copper -> gate.
        setCell(gx-13,gy,ID.BATTERY); setCell(gx-12,gy,ID.COPPER);
        setCell(gx-11,gy,ID.SWITCH); metaGrid[idx(gx-11,gy)]=westOn?1:0;
        for(let x=gx-10;x<gx;x++) setCell(x,gy,ID.COPPER);
        // North input: battery -> copper -> switch -> copper -> gate.
        setCell(gx,gy-13,ID.BATTERY); setCell(gx,gy-12,ID.COPPER);
        setCell(gx,gy-11,ID.SWITCH); metaGrid[idx(gx,gy-11)]=northOn?1:0;
        for(let y=gy-10;y<gy;y++) setCell(gx,y,ID.COPPER);
        // East output: gate -> copper -> LED.
        for(let x=gx+1;x<gx+10;x++) setCell(x,gy,ID.COPPER);
        setCell(gx+10,gy,ID.LED);
        // A steel base visually separates the four demonstrations.
        for(let x=gx-15;x<=gx+12;x++) setCell(x,gy+8,ID.STEEL);
    };
    station(ID.AND_GATE,78,72,true,true);
    station(ID.OR_GATE,176,72,true,false);
    station(ID.NOT_GATE,78,151,false,false);
    station(ID.XOR_GATE,176,151,true,false);
    // A separate timed circuit: clock drives a counter and a memory latch.
    setCell(260,90,ID.BATTERY); setCell(261,90,ID.COPPER); setCell(262,90,ID.CLOCK); metaGrid[idx(262,90)]=1;
    for(let x=263;x<=275;x++) setCell(x,90,ID.COPPER);
    setCell(276,90,ID.COUNTER);
    setCell(277,90,ID.COPPER); setCell(278,90,ID.LED);
    flash('LOGIC LAB READY: TEST AND / OR / NOT / XOR, CLOCK AND COUNTER');
}

function stepSimulation() {
    updated.fill(0);
    buildLiquidColumns();
    diffuseHeat();
    airTick();
    electricStep();
    mechStep();
    computerStep();
    chemistryWorldStep();
    ecologyStep();
    geologyStep();
    const dirG = gravityOn ? 1 : -1;
    let activeCount = 0;

    let portalA = null, portalB = null;
    for (let i = 0; i < size; i++) {
        if (grid[i] === ELEMENTS.PORTAL_A.id && !portalA) portalA = { x: i % WIDTH, y: Math.floor(i / WIDTH) };
        if (grid[i] === ELEMENTS.PORTAL_B.id && !portalB) portalB = { x: i % WIDTH, y: Math.floor(i / WIDTH) };
        if (portalA && portalB) break;
    }

    for (let y = (gravityOn ? HEIGHT - 1 : 0); (gravityOn ? y >= 0 : y < HEIGHT); y -= dirG) {
        const leftToRight = Math.random() < 0.5;
        for (let stepX = 0; stepX < WIDTH; stepX++) {
            const x = leftToRight ? stepX : (WIDTH - 1 - stepX);
            const i = idx(x, y);
            const id = grid[i];
            if (id === ELEMENTS.EMPTY.id) continue;
            activeCount++;
            if (updated[i]) continue;

            const el = EL_BY_ID[id];

            if (ROT[id]) {
                if (lifeGrid[i] > 0) {
                    const tt = T[i];
                    if (tt > 55) {  }
                    else if (tt > 30) lifeGrid[i] = Math.max(0, lifeGrid[i] - (Math.random() < 0.3 ? 3 : 2));
                    else if (tt > 8) { if (Math.random() < 0.86) lifeGrid[i]--; }
                    else if (tt > -2 && Math.random() < 0.25) lifeGrid[i]--;

                    if ((x > 0 && grid[i - 1] === ID.ROTTEN_MEAT) || (x < WIDTH - 1 && grid[i + 1] === ID.ROTTEN_MEAT) || (y > 0 && grid[i - WIDTH] === ID.ROTTEN_MEAT) || (y < HEIGHT - 1 && grid[i + WIDTH] === ID.ROTTEN_MEAT)) lifeGrid[i] = Math.max(0, lifeGrid[i] - 3);
                }
                else if (Math.random() < 0.06) { setCell(x, y, ELEMENTS.ROTTEN_MEAT.id); continue; }
            }

            if (el.life) {
                if (lifeGrid[i] <= 1) {
                    setCell(x, y, id === ELEMENTS.FOAM.id ? ELEMENTS.SOAP.id : (id === ELEMENTS.STEAM.id && Math.random() < 0.3 ? ELEMENTS.WATER.id : ELEMENTS.EMPTY.id));
                    continue;
                }
                lifeGrid[i]--;
            }

            if (thermalReact(x, y, i, id, el)) continue;
            if (CHEMR[id]) { chemReact(x, y, i, id); if (grid[i] !== id) continue; }

            for (let nk = 0; nk < 4; nk++) {
                if (grid[i] !== id) break;
                const nx = x + NDX[nk], ny = y + NDY[nk];
                if (!inBounds(nx, ny)) continue;
                const ni = idx(nx, ny);
                const nid = grid[ni];
                const nel = EL_BY_ID[nid];

                if (id === ELEMENTS.PORTAL_A.id && portalB && nid !== ELEMENTS.EMPTY.id && nid !== ELEMENTS.PORTAL_A.id && nid !== ELEMENTS.PORTAL_B.id) {
                    const tx = portalB.x + (nx - x), ty = portalB.y + (ny - y);
                    if (inBounds(tx, ty) && grid[idx(tx, ty)] === ELEMENTS.EMPTY.id) {
                        setCell(tx, ty, nid); setCell(nx, ny, ELEMENTS.EMPTY.id);
                    }
                }

                if (id === ELEMENTS.TORCH.id && nid === ELEMENTS.EMPTY.id && Math.random() < 0.15) {
                    setCell(nx, ny, ELEMENTS.FIRE.id);
                }

                if (id === ELEMENTS.CLONE.id) {
                    if (metaGrid[i] === 0 && nid !== ELEMENTS.EMPTY.id && nid !== ELEMENTS.CLONE.id && nid !== ELEMENTS.VOID.id) {
                        metaGrid[i] = nid;
                    } else if (metaGrid[i] !== 0 && nid === ELEMENTS.EMPTY.id && Math.random() < 0.2) {
                        setCell(nx, ny, metaGrid[i]);
                    }
                }

                if (id === ELEMENTS.VOID.id && nid !== ELEMENTS.EMPTY.id && nid !== ELEMENTS.VOID.id) {
                    setCell(nx, ny, ELEMENTS.EMPTY.id);
                }

                if (id === ELEMENTS.SPONGE.id && nel.type === 'liquid' && Math.random() < 0.15) {
                    setCell(nx, ny, ELEMENTS.EMPTY.id);
                }

                if (el.hot && nel.flam && IGN[nid] < Infinity) {
                    T[ni] += (T[i] - T[ni]) * 0.25;
                }

                if (id === ELEMENTS.FLOUR.id && (nid === ELEMENTS.WATER.id || nid === ELEMENTS.MILK.id)) {
                    setCell(x, y, ELEMENTS.DOUGH.id);
                    setCell(nx, ny, ELEMENTS.EMPTY.id);
                }

                if (id === ELEMENTS.SALT.id && nid === ELEMENTS.WATER.id) {
                    setCell(x, y, ELEMENTS.EMPTY.id);
                    setCell(nx, ny, ELEMENTS.SALT_WATER.id);
                }

                if (id === ELEMENTS.ACID.id && nid !== ELEMENTS.EMPTY.id && nid !== ELEMENTS.ACID.id && nid !== ELEMENTS.GLASS.id && nid !== ELEMENTS.VOID.id && nid !== ELEMENTS.WALL.id && !ACIDPASS[nid]) {
                    if (Math.random() < 0.08) {
                        setCell(nx, ny, acidProduct(nid));
                        setCell(x, y, ELEMENTS.EMPTY.id);
                        break;
                    }
                }

                if (id === ELEMENTS.PLANT.id && nid === ELEMENTS.WATER.id && Math.random() < 0.05) {
                    setCell(nx, ny, ELEMENTS.PLANT.id);
                }
                if (id === ELEMENTS.SEED.id && (nid === ELEMENTS.WATER.id || nid === ELEMENTS.DIRT.id)) {
                    setCell(x, y, ELEMENTS.PLANT.id);
                }

                if (id === ELEMENTS.VIRUS.id && (nel.food || nel.type === 'creature' || nid === ELEMENTS.PLANT.id || nid === ELEMENTS.WOOD.id)) {
                    if (Math.random() < 0.04) setCell(nx, ny, ELEMENTS.VIRUS.id);
                }

                if (id === ELEMENTS.SPARK.id) {
                    if (nel.exp) explode(nx, ny, nel.exp);
                    if (acceptSpark(nid, ni) && sp[ni] === 0 && Math.random() < 0.6) {
                        if (nid === ID.LAMP) lifeGrid[ni] = 60; else if (nid === ID.LASER) lifeGrid[ni] = 40; else if (nid === ID.MOTOR) lifeGrid[ni] = 30; else if (nid === ID.INJECTOR || nid === ID.PLUG) lifeGrid[ni] = 3; else if (POWERED[nid]) lifeGrid[ni] = POWERED[nid]; else sp[ni] = 9;
                    }
                }

                if (el.type === 'creature') {

                    if (id === ELEMENTS.HUMAN.id && nel.food && Math.random() < 0.15) {
                        hungerGrid[i]=0; setCell(nx, ny, ELEMENTS.EMPTY.id);
                    }

                    if (id === ELEMENTS.ANIMAL.id && (nid === ELEMENTS.PLANT.id || nid === ELEMENTS.FRUIT.id) && Math.random() < 0.1) {
                        hungerGrid[i]=0; setCell(nx, ny, ELEMENTS.EMPTY.id);
                    }

                    if (id === ELEMENTS.ANT.id && (nid === ELEMENTS.SUGAR.id || nid === ELEMENTS.HONEY.id || nel.food) && Math.random() < 0.2) {
                        hungerGrid[i]=0; setCell(nx, ny, ELEMENTS.EMPTY.id);
                    }

                    if (id === ELEMENTS.FISH.id && (nel.food || nid===ID.SEED || nid===ID.ANT) && Math.random() < 0.12) { hungerGrid[i]=0; setCell(nx,ny,ID.EMPTY); }

                    if (id === ELEMENTS.ZOMBIE.id && (nid === ELEMENTS.HUMAN.id || nid === ELEMENTS.ANIMAL.id) && Math.random() < 0.15) {
                        hungerGrid[i]=0; setCell(nx, ny, Math.random() < 0.6 ? ELEMENTS.ZOMBIE.id : ELEMENTS.RAW_MEAT.id);
                    }

                    if (nid === ELEMENTS.ACID.id) {
                        setCell(x, y, ELEMENTS.BLOOD.id);
                    }
                    if (nid===ID.WATER||nid===ID.SALT_WATER) thirstGrid[i]=0;
                }
            }

            if (grid[i] !== id) continue;
            if (id === ID.PHOT) { photonStep(x, y, i); continue; }

            if (el.type === 'powder') movePowder(x, y, i, id, el, dirG);
            else if (el.type === 'liquid') moveLiquid(x, y, i, id, el, dirG);
            else if (el.type === 'gas') { if (id === ID.FOAM) moveFoam(x, y, i, dirG); else moveGas(x, y, i, id, el, dirG); }
            else if (el.type === 'energy') {
                const gy = id === ELEMENTS.SPARK.id ? y + (Math.floor(Math.random() * 3) - 1) : y - dirG;
                const gx = x + (windDir !== 0 && Math.random() < 0.6 ? windDir : (Math.floor(Math.random() * 3) - 1));
                if (inBounds(gx, gy) && grid[idx(gx, gy)] === ELEMENTS.EMPTY.id) {
                    swapCells(i, idx(gx, gy));
                }
            }
            else if (el.type === 'creature') {
                const ny = y + dirG;
                const isFish = id === ELEMENTS.FISH.id;
                // Simple ecosystem needs: hunger and thirst persist with the creature and are saved.
                if (stepCount % 24 === 0) { hungerGrid[i]=Math.min(255,hungerGrid[i]+1); if(!isFish) thirstGrid[i]=Math.min(255,thirstGrid[i]+1); }
                if (hungerGrid[i] > 235 || thirstGrid[i] > 245) {
                    setCell(x,y,id===ID.HUMAN?ID.BLOOD:ID.RAW_MEAT); continue;
                }
                // Seek nearby food or water when a need becomes strong; otherwise keep roaming.
                if ((hungerGrid[i]>35 || (!isFish && thirstGrid[i]>45)) && stepCount%6===0) {
                    let bestFood=1e9,bestWater=1e9,foodX=x,waterX=x;
                    for(let dy=-8;dy<=8;dy++) for(let dx=-8;dx<=8;dx++) { const nx=x+dx,ny2=y+dy;if(!inBounds(nx,ny2))continue;const g=grid[idx(nx,ny2)],food=EL_BY_ID[g]?.food||g===ID.FRUIT||g===ID.SUGAR||g===ID.HONEY||g===ID.SEED||g===ID.ANT;const water=g===ID.WATER||g===ID.SALT_WATER||g===ID.COOLANT;const d=dx*dx+dy*dy;
                        if(food&&d<bestFood){bestFood=d;foodX=nx;} if(water&&d<bestWater){bestWater=d;waterX=nx;}}
                    if(!isFish&&thirstGrid[i]>45 && bestWater<1e9) metaGrid[i]=waterX<x?2:1;
                    else if(hungerGrid[i]>35 && bestFood<1e9) metaGrid[i]=foodX<x?2:1;
                }

                if (!isFish && inBounds(x, ny)) {
                    const belowId = grid[idx(x, ny)];
                    if (belowId === ELEMENTS.EMPTY.id || EL_BY_ID[belowId].type === 'liquid') {
                        swapCells(i, idx(x, ny));
                        continue;
                    }
                }

                if (Math.random() < 0.35) {
                    if (hungerGrid[i] < 12 && thirstGrid[i] < 12 && stepCount % 120 === 0 && Math.random() < 0.08) { const bx=x+(Math.random()<0.5?-1:1),by=isFish?y:y-1; if(inBounds(bx,by)&&grid[idx(bx,by)]===(isFish?ID.WATER:ID.EMPTY)) setCell(bx,by,id); }
                    if (Math.random() < 0.08) metaGrid[i] = metaGrid[i] === 1 ? 2 : 1;
                    const dir = metaGrid[i] === 1 ? 1 : -1;
                    const tx = x + dir;
                    const ty = isFish ? y + (Math.floor(Math.random() * 3) - 1) : y;

                    if (inBounds(tx, ty)) {
                        const targetId = grid[idx(tx, ty)];
                        if (isFish && (targetId === ELEMENTS.WATER.id || targetId === ELEMENTS.SALT_WATER.id)) {
                            swapCells(i, idx(tx, ty));
                        } else if (!isFish && (targetId === ELEMENTS.EMPTY.id || EL_BY_ID[targetId].type === 'liquid')) {
                            swapCells(i, idx(tx, ty));
                        } else if (!isFish && inBounds(tx, y - dirG) && grid[idx(tx, y - dirG)] === ELEMENTS.EMPTY.id) {

                            swapCells(i, idx(tx, y - dirG));
                        } else {
                            metaGrid[i] = metaGrid[i] === 1 ? 2 : 1;
                        }
                    } else {
                        metaGrid[i] = metaGrid[i] === 1 ? 2 : 1;
                    }
                }
            }
        }
    }
    document.getElementById('hud-count').innerText = activeCount;
}

