const idx = (x, y) => y * WIDTH + x;
const inBounds = (x, y) => x >= 0 && x < WIDTH && y >= 0 && y < HEIGHT;

function setCell(x, y, id) {
    if (!inBounds(x, y)) return;
    const i = idx(x, y);
    const el = EL_BY_ID[id];
    if (MECH[id] || MECH[grid[i]]) mechDirty = true;
    grid[i] = id;
    colorVar[i] = el.var ? Math.floor((Math.random() - 0.5) * el.var * 2) : 0; skin[i] = 0;
    lifeGrid[i] = el.life ? el.life + Math.floor(Math.random() * 15) : (ROT[id] ? 500 : 0);
    metaGrid[i] = (el.type === 'creature') ? (Math.random() < 0.5 ? 1 : 2) : 0;
    cookGrid[i] = 0; sp[i] = 0; vel[i] = 0; mix[i] = 0; hungerGrid[i] = 0; thirstGrid[i] = 0; phGrid[i] = 7;
    solutionGrid[i] = ([ID.CALCIUM_SOLUTION,ID.CARBONATE_SOLUTION,ID.SODIUM_CHLORIDE_SOLUTION,ID.COPPER_SULFATE,ID.COPPER_SULFATE_SOLUTION,ID.LIMEWATER].includes(id) ? 90 : 0);
    if (el.temp !== undefined) T[i] = el.temp;
}

function swapCells(i1, i2) {
    const tmpId = grid[i1]; grid[i1] = grid[i2]; grid[i2] = tmpId;
    const tmpVar = colorVar[i1]; colorVar[i1] = colorVar[i2]; colorVar[i2] = tmpVar;
    const tmpSk = skin[i1]; skin[i1] = skin[i2]; skin[i2] = tmpSk;
    const tmpLife = lifeGrid[i1]; lifeGrid[i1] = lifeGrid[i2]; lifeGrid[i2] = tmpLife;
    const tmpMeta = metaGrid[i1]; metaGrid[i1] = metaGrid[i2]; metaGrid[i2] = tmpMeta;
    const tmpT = T[i1]; T[i1] = T[i2]; T[i2] = tmpT;
    const tmpC = cookGrid[i1]; cookGrid[i1] = cookGrid[i2]; cookGrid[i2] = tmpC;
    const tmpS = sp[i1]; sp[i1] = sp[i2]; sp[i2] = tmpS;
    const tmpV = vel[i1]; vel[i1] = vel[i2]; vel[i2] = tmpV;
    const tmpM = mix[i1]; mix[i1] = mix[i2]; mix[i2] = tmpM;
    const tmpH = hungerGrid[i1]; hungerGrid[i1] = hungerGrid[i2]; hungerGrid[i2] = tmpH;
    const tmpTh = thirstGrid[i1]; thirstGrid[i1] = thirstGrid[i2]; thirstGrid[i2] = tmpTh;
    const tmpSol = solutionGrid[i1]; solutionGrid[i1] = solutionGrid[i2]; solutionGrid[i2] = tmpSol;
    const tmpPh = phGrid[i1]; phGrid[i1] = phGrid[i2]; phGrid[i2] = tmpPh;
    updated[i1] = 1;
    updated[i2] = 1;
}

function explode(cx, cy, radius) {
    sfx('boom', radius);
    blast(cx, cy, radius);
    for (let y = cy - radius; y <= cy + radius; y++) {
        for (let x = cx - radius; x <= cx + radius; x++) {
            if (!inBounds(x, y)) continue;
            const dist = Math.hypot(x - cx, y - cy);
            if (dist <= radius) {
                const i = idx(x, y);
                const id = grid[i];
                T[i] = Math.min(3000, T[i] + Math.max(0, (radius - dist) * 42));
                if (id === ELEMENTS.STEEL.id || id === ELEMENTS.VOID.id || id === ELEMENTS.WALL.id) continue;
                if (EL_BY_ID[id].type === 'creature') {
                    setCell(x, y, Math.random() < 0.5 ? ELEMENTS.RAW_MEAT.id : ELEMENTS.BLOOD.id);
                } else if (dist < radius * 0.7) {
                    setCell(x, y, Math.random() < 0.6 ? ELEMENTS.FIRE.id : ELEMENTS.EMPTY.id);
                } else if (Math.random() < 0.5) {
                    setCell(x, y, Math.random() < 0.5 ? ELEMENTS.SMOKE.id : ELEMENTS.FIRE.id);
                }
            }
        }
    }
}

function updateMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    mouseX = Math.floor(((clientX - rect.left) / rect.width) * WIDTH);
    mouseY = Math.floor(((clientY - rect.top) / rect.height) * HEIGHT);
    if (inBounds(mouseX, mouseY)) {
        hoverInfo();
    }
}

canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('mousedown', e => {
    updateMousePos(e);
    if (e.button === 1) { e.preventDefault(); panning = { x: e.clientX, y: e.clientY }; return; }
    paintEl = e.button === 2 ? altEl : currentEl;
    if (paintEl === TOOL.PIPETTE) {
        if (!inBounds(mouseX, mouseY)) return;
        const g = grid[idx(mouseX, mouseY)];
        if (e.button === 2) selectAlt(g); else selectElement(g);
        return;
    }
    if (planCapture && e.button === 0) { planCapture.start = { x: mouseX, y: mouseY }; return; }
    if (beginnerMode && beginnerGuide && e.button === 0) { handleBeginnerPlacement(); return; }
    if (paintEl === TOOL.FILLER && e.button === 0) { pushUndo(); floodFill(mouseX, mouseY, altEl || ID.WATER); return; }
    pushUndo();
    if (paintEl === TOOL.TOGGLE) { if (!toggleRepeater(e)) toggleSwitches(); return; }
    if (planArmed && e.button === 0 && !e.shiftKey && !e.ctrlKey) { stampPlan(planArmed, mouseX, mouseY); return; }
    if (PIECE[paintEl] && !e.shiftKey && !e.ctrlKey) { stampPiece(paintEl, mouseX, mouseY); return; }
    isDrawing = true; lastMouseX = mouseX; lastMouseY = mouseY;
    shapeMode = (e.shiftKey && e.ctrlKey) ? 'fill' : (e.shiftKey ? 'line' : (e.ctrlKey ? 'rect' : ''));
    if (shapeMode) { shapeStart = { x: mouseX, y: mouseY }; return; }
    drawBrush(mouseX, mouseY, mouseX, mouseY, paintEl);
});
window.addEventListener('mouseup', () => {
    if (planCapture && planCapture.start) { finishCapture(mouseX, mouseY); return; }
    if (isDrawing && shapeStart) {
        if (shapeMode === 'line') drawBrush(shapeStart.x, shapeStart.y, mouseX, mouseY, paintEl);
        else if (shapeMode === 'rect') fillRect(shapeStart.x, shapeStart.y, mouseX, mouseY, paintEl);
        else if (shapeMode === 'fill') floodFill(shapeStart.x, shapeStart.y, paintEl);
    }
    isDrawing = false; shapeStart = null;
});
canvas.addEventListener('mousemove', e => {
    updateMousePos(e);
    if (isDrawing && !shapeStart) { drawBrush(lastMouseX, lastMouseY, mouseX, mouseY, paintEl); lastMouseX = mouseX; lastMouseY = mouseY; }
});
canvas.addEventListener('wheel', e => {
    if (e.ctrlKey || e.metaKey) { e.preventDefault(); zoomAt(e.clientX, e.clientY, zoom * (e.deltaY < 0 ? 1.2 : 1 / 1.2)); return; }
    setBrush(brushSize + (e.deltaY < 0 ? 1 : -1));
}, { passive: false });

document.getElementById('brush-size').oninput = e => {
    brushSize = parseInt(e.target.value);
    document.getElementById('brush-val').innerText = brushSize;
};
let simSpeed = 1;
function setPaused(p) {
    isPaused = p;
    document.body.classList.toggle('paused', p);
    document.getElementById('btn-play').classList.toggle('on', !p);
    document.getElementById('btn-pause').classList.toggle('on', p);
}
document.getElementById('btn-play').onclick  = () => setPaused(false);
document.getElementById('btn-pause').onclick = () => setPaused(true);
document.getElementById('btn-step').onclick  = () => { setPaused(true); stepSimulation(); };
document.getElementById('btn-ff').onclick = () => {
    simSpeed = simSpeed === 1 ? 2 : (simSpeed === 2 ? 4 : 1);
    document.getElementById('speed-lbl').innerText = 'x' + simSpeed;
    document.getElementById('btn-ff').classList.toggle('on', simSpeed > 1);
};
function setBrush(n) {
    brushSize = Math.max(1, Math.min(25, n));
    document.getElementById('brush-size').value = brushSize;
    document.getElementById('brush-val').innerText = brushSize;
}
document.getElementById('btn-dots1').onclick = () => setBrush(2);
document.getElementById('btn-dots2').onclick = () => setBrush(9);
document.getElementById('btn-eraser').onclick = () => selectElement(ELEMENTS.EMPTY.id);
document.getElementById('btn-gravity').onclick = e => {
    gravityOn = !gravityOn;
    refreshButtons();
};
document.getElementById('btn-wind').onclick = e => {
    windDir = windDir === 0 ? 1 : (windDir === 1 ? -1 : 0);
    refreshButtons();
};
function setView(m) {
    viewMode = m;
    refreshButtons();
    document.getElementById('btn-thermal').classList.toggle('active', m !== 0);
}
document.getElementById('btn-thermal').onclick = () => setView((viewMode + 1) % 3);
document.getElementById('btn-clear').onclick = () => { pushUndo(); resetWorld(); };

function generateWorld() {
    resetWorld();
    for (let x = 0; x < WIDTH; x++) {
        const groundY = Math.floor(HEIGHT * 0.65 + Math.sin(x * 0.04) * 16 + Math.cos(x * 0.1) * 6);
        const waterLevel = Math.floor(HEIGHT * 0.72);
        for (let y = 0; y < HEIGHT; y++) {
            if (y > groundY + 14) setCell(x, y, ELEMENTS.STONE.id);
            else if (y > groundY + 3) setCell(x, y, ELEMENTS.DIRT.id);
            else if (y > groundY) setCell(x, y, ELEMENTS.SAND.id);
            else if (y === groundY && groundY < waterLevel) setCell(x, y, ELEMENTS.PLANT.id);
            else if (y > waterLevel) setCell(x, y, ELEMENTS.WATER.id);
        }
        if (x > 15 && x < WIDTH - 15 && groundY < waterLevel - 6 && Math.random() < 0.04) {
            const h = 10 + Math.floor(Math.random() * 8);
            for (let ty = 1; ty <= h; ty++) setCell(x, groundY - ty, ELEMENTS.WOOD.id);
            for (let ly = -4; ly <= 2; ly++) {
                for (let lx = -5; lx <= 5; lx++) {
                    if (lx*lx + ly*ly <= 20 && grid[idx(x+lx, groundY-h+ly)] === 0) {
                        setCell(x+lx, groundY-h+ly, Math.random() < 0.1 ? ELEMENTS.FRUIT.id : ELEMENTS.PLANT.id);
                    }
                }
            }
        }
        if (groundY < waterLevel - 3 && Math.random() < 0.025) setCell(x, groundY - 2, ELEMENTS.HUMAN.id);
        if (groundY < waterLevel - 3 && Math.random() < 0.02) setCell(x, groundY - 2, ELEMENTS.ANIMAL.id);
        if (groundY > waterLevel + 5 && Math.random() < 0.03) setCell(x, waterLevel + 3, ELEMENTS.FISH.id);
    }
}
document.getElementById('btn-gen-world').onclick = () => { pushUndo(); generateWorld(); };

function generateKitchen() {
    resetWorld();

    for (let x = 20; x < WIDTH - 20; x++) {
        for (let y = HEIGHT - 15; y < HEIGHT; y++) setCell(x, y, ELEMENTS.STONE.id);
    }

    for (let x = 40; x <= 90; x++) setCell(x, HEIGHT - 25, ELEMENTS.STEEL.id);
    for (let y = HEIGHT - 45; y <= HEIGHT - 25; y++) { setCell(40, y, ELEMENTS.STEEL.id); setCell(90, y, ELEMENTS.STEEL.id); }
    for (let x = 45; x <= 85; x++) setCell(x, HEIGHT - 23, ELEMENTS.TORCH.id);
    for (let x = 42; x <= 88; x++) for (let y = HEIGHT - 22; y < HEIGHT - 15; y++) setCell(x, y, ELEMENTS.STONE.id);
    for (let x = 42; x <= 88; x++) for (let y = HEIGHT - 40; y < HEIGHT - 25; y++) setCell(x, y, ELEMENTS.OIL.id);

    for (let x = 120; x <= 180; x++) {
        for (let y = HEIGHT - 35; y < HEIGHT - 15; y++) {
            setCell(x, y, x < 140 ? ELEMENTS.RAW_MEAT.id : (x < 160 ? ELEMENTS.CHEESE.id : ELEMENTS.BREAD.id));
        }
    }

    for (let x = 58; x <= 66; x++) for (let y = HEIGHT - 33; y <= HEIGHT - 30; y++) setCell(x, y, ELEMENTS.RAW_MEAT.id);

    for (let x = 210; x <= 250; x++) setCell(x, HEIGHT - 25, ELEMENTS.STEEL.id);
    for (let y = HEIGHT - 45; y <= HEIGHT - 25; y++) { setCell(210, y, ELEMENTS.STEEL.id); setCell(250, y, ELEMENTS.STEEL.id); }
    for (let x = 215; x <= 245; x++) setCell(x, HEIGHT - 23, ELEMENTS.TORCH.id);
    for (let x = 212; x <= 248; x++) for (let y = HEIGHT - 22; y < HEIGHT - 15; y++) setCell(x, y, ELEMENTS.STONE.id);
    for (let x = 211; x <= 249; x++) for (let y = HEIGHT - 38; y < HEIGHT - 25; y++) setCell(x, y, ELEMENTS.WATER.id);
    for (let x = 225; x <= 232; x++) for (let y = HEIGHT - 30; y <= HEIGHT - 27; y++) setCell(x, y, ELEMENTS.RAW_MEAT.id);

    setCell(105, HEIGHT - 20, ELEMENTS.HUMAN.id);
    setCell(195, HEIGHT - 20, ELEMENTS.HUMAN.id);
}
document.getElementById('btn-gen-kitchen').onclick = () => { pushUndo(); generateKitchen(); };

function generateLab() {
    resetWorld();
    for (let x = 30; x < WIDTH - 30; x++) {
        setCell(x, HEIGHT - 10, ELEMENTS.STEEL.id);
        setCell(x, 20, ELEMENTS.STEEL.id);
    }

    const tanks = [50, 120, 190, 260];
    const liquids = [ELEMENTS.ACID.id, ELEMENTS.NITRO.id, ELEMENTS.CRYO.id, ELEMENTS.LAVA.id];
    tanks.forEach((tx, idxT) => {
        for (let x = tx; x <= tx + 40; x++) setCell(x, 120, ELEMENTS.GLASS.id);
        for (let y = 70; y <= 120; y++) { setCell(tx, y, ELEMENTS.GLASS.id); setCell(tx + 40, y, ELEMENTS.GLASS.id); }
        for (let x = tx + 2; x <= tx + 38; x++) for (let y = 85; y < 120; y++) setCell(x, y, liquids[idxT]);
    });

    // Elephant-toothpaste demo vessel: wide reservoir, narrow neck and open outlet.
    for (let y = 170; y <= 196; y++) { setCell(13, y, ID.GLASS); setCell(31, y, ID.GLASS); }
    for (let x = 13; x <= 31; x++) setCell(x, 196, ID.GLASS);
    for (let y = 145; y <= 173; y++) { setCell(19, y, ID.GLASS); setCell(25, y, ID.GLASS); }
    for (let x = 15; x <= 29; x++) for (let y = 187; y <= 193; y++) setCell(x, y, ID.HYDROGEN_PEROXIDE);
    for (let x = 18; x <= 26; x++) setCell(x, 185, ID.SOAP);
    setCell(22, 184, ID.YEAST);
    setCell(33,178,ID.PH_METER); setCell(33,185,ID.BEAKER); setCell(33,184,ID.INDICATOR);

    // Small open fizzing beaker: vinegar + baking soda -> rising CO2 bubbles.
    for (let y = 174; y <= 195; y++) { setCell(62, y, ID.GLASS); setCell(76, y, ID.GLASS); }
    for (let x = 62; x <= 76; x++) setCell(x, 195, ID.GLASS);
    for (let x = 64; x <= 74; x++) for (let y = 188; y <= 193; y++) setCell(x, y, ID.VINEGAR);
    for (let x = 67; x <= 71; x++) setCell(x, 187, ID.BAKING_SODA);

    // Small sodium/water interaction station. It is an in-game visual model only.
    for (let y = 166; y <= 195; y++) { setCell(40, y, ID.GLASS); setCell(49, y, ID.GLASS); }
    for (let x = 40; x <= 49; x++) setCell(x, 195, ID.GLASS);
    for (let x = 42; x <= 47; x++) for (let y = 187; y <= 194; y++) setCell(x, y, ID.WATER);
    setCell(45, 186, ID.SODIUM);
    setCell(82,181,ID.BUNSEN); setCell(86,181,ID.CONDENSER); metaGrid[idx(86,181)]=1;
}
document.getElementById('btn-gen-lab').onclick = () => { pushUndo(); generateLab(); };

