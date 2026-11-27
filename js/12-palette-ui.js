const PLANS = []; let planArmed = null, planCapture = null, planMir = false;
function ib(key, label) { return esc(label || ''); }
function refreshButtons() {
    const set = (id, key, label) => { const b = document.getElementById(id); if (!b) return; if (b.dataset.icon) b.title = label; else b.innerHTML = ib(key, label); };
    set('btn-gravity', gravityOn ? 'ui_gravity_on' : 'ui_gravity_off', t(gravityOn ? 'btn.gravityOn' : 'btn.gravityOff'));
    set('btn-wind', 'ui_wind', windDir === 0 ? t('btn.windOff') : (windDir === 1 ? t('btn.windRight') : t('btn.windLeft')));
    set('btn-thermal', ['ui_view_normal', 'ui_view_thermal', 'ui_view_pressure'][viewMode], t(['btn.viewNormal', 'btn.viewThermal', 'btn.viewPressure'][viewMode]));
    set('btn-shape', brushShape ? 'ui_square' : 'ui_circle', t(brushShape ? 'btn.square' : 'btn.circle'));
    set('btn-zoomin', '', 'Zoom +'); set('btn-zoomout', '', 'Zoom -'); set('btn-zoomreset', '', 'Reset');
    set('btn-sound', soundOn ? 'ui_sound_on' : 'ui_sound_off', t(soundOn ? 'btn.soundOn' : 'btn.soundOff'));
    set('btn-gen-world', 'ui_world', t('btn.world')); set('btn-gen-kitchen', 'ui_kitchen', t('btn.kitchen'));
    set('btn-gen-lab', 'ui_lab', t('btn.lab')); set('btn-gen-engine', 'ui_engine', t('btn.engines'));
    set('btn-undo', 'ui_undo', t('btn.undo')); set('btn-plan', 'ui_plan', t('btn.plan'));
    set('btn-save', 'ui_save', t('btn.save')); set('btn-load', 'ui_load', t('btn.load')); set('btn-clear', 'ui_clear', t('btn.clear'));
}
refreshButtons();

const SECTIONS = [
    ['sec.tools', ['EMPTY','VOID','PORTAL_B','PORTAL_A','FUSE','CLONE']],
    ['sec.life',                  ['HUMAN','ZOMBIE','ANIMAL','ANT','FISH','BIRD','FROG','BACTERIA','ALGAE','SEED','PLANT','VIRUS','BLOOD']],
    ['sec.meat',    ['RAW_MEAT','COOKED_MEAT','ROTTEN_MEAT','CHICKEN','COOKED_CHICKEN','BACON','COOKED_BACON','SAUSAGE','COOKED_SAUSAGE','SALMON','COOKED_SALMON','SHRIMP','COOKED_SHRIMP','HAM']],
    ['sec.fruit',   ['FRUIT','LEMON','BANANA','ORANGE','STRAWBERRY','GRAPE','WATERMELON','PINEAPPLE','PEACH','CHERRY','BLUEBERRY','COCONUT','AVOCADO','RAISIN']],
    ['sec.veg',     ['POTATO','CARROT','TOMATO','ONION','LETTUCE','CABBAGE','BROCCOLI','CORN','PEAS','CUCUMBER','MUSHROOM','GARLIC','PUMPKIN','BEANS','BAKED_POTATO','POPCORN']],
    ['sec.dairy',   ['MILK','CHEESE','MELTED_CHEESE','EGG','BUTTER','CREAM','YOGURT','ICE_CREAM','MELTED_BUTTER','CHOCOLATE_MILK']],
    ['sec.bakery', ['PASTE','BAKED','FLOUR','DOUGH','BREAD','RICE','YEAST','BAKING_SODA','OATS','PASTA','COOKED_PASTA','TOAST','COOKIE','CAKE','CEREAL']],
    ['sec.sweets',  ['SUGAR','HONEY','COCOA','CHOCOLATE','MELTED_CHOCOLATE','CARAMEL','CANDY','MARSHMALLOW','MAPLE_SYRUP','JAM','JELLY']],
    ['sec.drinks',  ['JUICE','LEMON_JUICE','SOY_SAUCE','VINEGAR','COFFEE','TEA','ORANGE_JUICE','SODA','WINE','BEER','KETCHUP','MAYONNAISE','MUSTARD','OLIVE_OIL','TOMATO_SAUCE','HOT_SAUCE']],
    ['sec.spices',  ['SALT','PEPPER','CINNAMON','PAPRIKA','PEANUT','TOFU']],
    ['sec.solids',                          ['SAND','DIRT','CLAY','GRAVEL','STONE','LIMESTONE','BEDROCK','COPPER_ORE','IRON_ORE','COAL','FERTILE_SOIL','IRON','STEEL','WALL','SPONGE','ASH','WOOD','GLASS','ICE','SNOW','CHARRED']],
    ['sec.liquids',                         ['WATER','DISTILLED_WATER','GROUNDWATER','SALT_WATER','SODIUM_CHLORIDE_SOLUTION','COPPER_SULFATE_SOLUTION','LAVA','ACID','OIL','COOLANT','INDICATOR','CALCIUM_SOLUTION','CARBONATE_SOLUTION','LIMEWATER']],
    ['sec.gas',         ['FIRE','STEAM','SMOKE','METHANE','TORCH','CRYO','GUNPOWDER','C4','NITRO','NUKE']],
    ['sec.electric',            ['SPARK','COPPER','INSULATOR','BATTERY','SWITCH','LAMP','LASER','MIRROR','PHOT','THERMO','BARO','PHOTO','RESISTOR','CAPACITOR','DIODE','TRANSISTOR','LED','PCB','ETHERNET','SOLAR_PANEL','RELAY','AND_GATE','OR_GATE','NOT_GATE','XOR_GATE','CLOCK','COUNTER','MEMORY']],
    ['sec.machines',        ['HEATER','COOLER','MAGNETRON','THERMOSTAT','THERMOSTAT_H','TIMER','CONVEYOR','REPEATER']],
    ['sec.mechanics',               ['AXLE','MOTOR','ROTOR','GEAR','PIN','PISTON','FLYWHEEL','BRAKE','VENT','FUEL','INJECTOR','PLUG','HALL']],
    ['sec.vehicles',                        ['CAR','CHASSIS','WHEEL','WHEELM','TIRE','EXHAUST_PIPE','MUFFLER','CATALYTIC','RADIATOR','FUEL_TANK','ALTERNATOR','STARTER','BRAKE_DISC','SUSPENSION','TURBO','AIR_FILTER','TRANSMISSION','CLUTCH','DIFFERENTIAL','FUEL_PUMP','OIL_FILTER','ENGINE_BLOCK','CRANKSHAFT','CAMSHAFT','FAN_BELT','AIR_INTAKE','OIL_PUMP']],
    ['sec.computers', ['PC_CASE','PC_MOTHERBOARD','PC_CPU','PC_GPU','PC_RAM','PC_SSD','PC_HDD','PC_PSU','PC_FAN','PC_HEATSINK','PC_MONITOR','PC_KEYBOARD','PC_MOUSE']],
    ['sec.labgear', ['BEAKER','TEST_TUBE','BUNSEN','STIRRER','CONDENSER','GAS_COLLECTOR','FUNNEL','PH_METER']],
    ['sec.simtools', ['HEAT','COOL','AIR','VAC','PICK','TOGGLE','MIX','LOOKUP','SHOCK','UNCHARGE','UNBURN','SMASH','RANDOM','PAINT','UNPAINT','FILLER','ROOM_TEMP','COOK','INCINERATE']],
    ['sec.chem', ['LIME','SODIUM','HYDROGEN_PEROXIDE','SOAP','FOAM','YEAST','WATER','ACID','CITRIC_ACID','AMMONIA','VINEGAR','BAKING_SODA','LYE','SALT','CALCIUM_CHLORIDE','COPPER_SULFATE','SODIUM_CHLORIDE_SOLUTION','CALCIUM_SOLUTION','CARBONATE_SOLUTION','LIMEWATER','PRECIPITATE','CRYSTAL_SEED','CRYSTAL','OXYGEN','HYDROGEN','CO2','ETHANOL','COPPER','STEEL','RUST','SPARK']]
];

// Expanded material categories from the supplied reference list.
SECTIONS.push(
    ["sec.extraLiquids", ["SUGAR_WATER", "SELTZER", "DIRTY_WATER", "POOL_WATER", "MUD", "MAGMA", "MOLTEN_GLASS", "SLIME", "LIQUID_AMMONIA", "LAMP_OIL", "MOLTEN_STAINED_GLASS", "MOLTEN_PLASTIC", "MELTED_WAX", "LIQUID_CHLORINE", "SAP", "MELTED_CHOCOLATE", "LIQUID_HYDROGEN", "LIQUID_OXYGEN", "LIQUID_NITROGEN", "LIQUID_HELIUM", "SLAKED_LIME", "MOLTEN_THERMITE", "SLAG", "LIQUID_NEON", "MOLTEN_SLAG", "MOLTEN_DIRT", "MOLTEN_RAD_GLASS", "MOLTEN_SALT", "LIQUID_PROPANE", "LIQUID_METHANE", "MOLTEN_BRICK", "MOLTEN_BAKING_SODA", "MOLTEN_BORAX", "MOLTEN_EPSOM_SALT", "MOLTEN_POTASSIUM_SALT", "SLUSH", "MOLTEN_ASH", "MOLTEN_ALGA", "MOLTEN_TUFF", "PERFUME", "FROZEN_VINEGAR"]],
    ["sec.extraPowders", ["WET_SAND", "ROCK", "MUDSTONE", "PACKED_SAND", "PACKED_SNOW", "LATTICE", "CEMENT", "DUST", "BONE", "ANTIPOWDER", "TINDER", "SAWDUST", "HAIL", "CLAY_SOIL", "BRICK", "PAPER", "CLONE_POWDER", "CELLULOSE", "DRY_ICE", "NITROGEN_ICE", "PORCELAIN", "PARTICLEBOARD", "THERMITE", "DIAMOND", "GOLD_COIN", "GLASS_SHARD", "BRICK_RUBBLE", "BAKED_CLAY", "FEATHER", "GLITTER", "BEAD", "COLOR_SAND", "EMBER", "FW_EMBER", "SALT_ICE", "SUGAR_ICE", "SELTZER_ICE", "DIRTY_ICE", "POOL_ICE", "BLOOD_ICE", "ANTIBODY_ICE", "INFECTION_ICE", "SLIME_ICE", "ANTIICE", "ACID_ICE", "JUICE_ICE", "ALCOHOL_ICE", "CHLORINE_ICE", "HYDROGEN_ICE", "OXYGEN_ICE", "POISON_ICE", "RAD_SHARD", "CLAY_SHARD", "BROTH_ICE", "FROZEN_INK", "TEA_ICE", "NEON_ICE", "CYANIDE_ICE", "FROZEN_NITRO", "CRUMB", "COFFEE_GROUND", "NUT", "NUT_MEAT", "TUFF", "AMBER", "PORCELAIN_SHARD", "AMMONIA_ICE", "METHANE_ICE", "SODA_ICE", "BLEACH_ICE", "COFFEE_ICE"]],
    ["sec.extraPlants", ["DEAD_PLANT", "FROZEN_PLANT", "GRASS", "SAPLING", "SEEDS", "GRASS_SEED", "WHEAT_SEED", "STRAW", "POLLEN", "FLOWER_SEED", "PISTIL", "PETAL", "TREE_BRANCH", "VINE", "BAMBOO", "BAMBOO_PLANT", "MUSHROOM_SPORE", "MUSHROOM_STALK", "MUSHROOM_GILL", "MUSHROOM_CAP", "HYPHAE", "MYCELIUM", "LICHEN", "CORN_SEED", "POTATO_SEED", "FIBER", "PINECONE", "EVERGREEN", "CACTUS", "MULCH", "PUMPKIN_SEED"]],
    ["sec.extraSolids", ["CONCRETE", "RAD_GLASS", "ECLONER", "SLOW_CLONER", "WIRE", "DNA", "SUPERHEATER", "FREEZER", "UDDER", "BONE_MARROW", "ANTIMOLTEN", "ANTIFIRE", "ANTIFLUID", "ANTIGAS", "STAINED_GLASS", "RAINBOW", "BORDER", "RUINS", "BURNER", "BUBBLE", "GLUE", "FLOATING_CLONER", "PERMAFROST", "PLASTIC", "WAX", "INCENSE", "INSULATION", "FROZEN_YOGURT", "BASALT", "SPRAY_PAINT", "LED_R", "LED_G", "LED_B", "OXIDIZED_COPPER", "FIREWORK", "TESLA_COIL", "SHOCKER", "PRESSURE_PLATE", "PRIMORDIAL_SOUP", "BALLOON", "CONFETTI", "PARTY_POPPER", "ROCK_WALL", "RIME", "EWALL", "SENSOR", "PIPE", "COFFEE_BEAN", "SKIN", "HAIR", "WARP", "UNKNOWN"]],
    ["sec.extraReactive", ["BOMB", "GRAY_GOO", "MALWARE", "ICE_NINE", "STRANGE_MATTER", "ANTIMATTER", "DIOXIN", "POISON", "CYANIDE", "FALLOUT", "TNT", "GRENADE", "DYNAMITE", "H_BOMB", "DIRTY_BOMB", "EMP_BOMB", "NITROGLYCERIN", "GREEK_FIRE", "STICKY_BOMB", "COLD_BOMB", "HOT_BOMB", "ELECTRO_BOMB", "WATER_BOMB", "ANTIMATTER_BOMB", "SMOKE_GRENADE", "LANDMINE", "CLUSTER_BOMB", "ARMAGEDDON"]],
    ["sec.extraEnergy", ["PLASMA", "SUN", "ROCKET", "LIGHT", "BALL", "STATIC", "RADIATION", "NEUTRON", "PROTON", "EXPLOSION", "N_EXPLOSION", "SUPERNOVA", "POP", "POSITRON", "FLASHBANG", "FLASH", "FIREBALL", "LIQUID_LIGHT", "LIGHTNING", "GOD_RAY", "HEAT_RAY"]],
    ["sec.extraGases", ["COLD_FIRE", "NITROGEN", "HELIUM", "ANESTHESIA", "PROPANE", "ACID_GAS", "POISON_GAS", "NEON", "SMOG", "STENCH", "FRAGRANCE", "OZONE", "CLOUD", "RAIN_CLOUD", "SNOW_CLOUD", "HAIL_CLOUD", "ACID_CLOUD", "PYROCUMULUS", "FIRE_CLOUD", "COLOR_SMOKE", "SULFUR_GAS", "RAD_STEAM", "RAD_CLOUD", "GALLIUM_GAS", "ALCOHOL_GAS", "MERCURY_GAS", "SODIUM_GAS", "CYANIDE_GAS", "THUNDER_CLOUD", "LIQUID_STENCH"]],
    ["sec.extraFood", ["FROZEN_MEAT", "CHOCOLATE", "SODA", "BROTH", "CHOCOLATE_MILK", "FRUIT_MILK", "YOGURT", "YOLK", "HARD_YOLK", "GRAPE", "CORN", "POPCORN", "ROOT", "TOAST", "WHEAT", "CANDY", "CARAMEL", "MOLASSES", "KETCHUP", "PILK", "EGGNOG", "GINGERBREAD", "BEANS", "MELTED_BUTTER", "BATTER", "ROTTEN_CHEESE", "HERB", "LETTUCE", "BAKED_POTATO", "BAKED_BATTER", "ICE_CREAM", "CREAM", "TEA", "NUT_MILK", "SAUCE", "PUMPKIN", "MASHED_POTATO", "NUT_BUTTER", "JELLY", "COFFEE", "MAYO"]],
    ["sec.extraLife", ["CELL", "CANCER", "PLAGUE", "FLEA", "TERMITE", "WORM", "FLY", "FIREFLY", "BEE", "STINK_BUG", "DEAD_BUG", "BODY", "HEAD", "RAT", "FROZEN_FROG", "TADPOLE", "SLUG", "SNAIL", "HOMUNCULUS", "SNAKE", "LOOPY", "FROZEN_WORM", "FROZEN_FISH"]],
    ["sec.extraChemicals", ["NEUTRAL_ACID", "SODIUM_ACETATE", "BLEACH", "CHLORINE", "DYE", "INK", "VACCINE", "ANTIBODY", "INFECTION", "ANTIDOTE", "QUICKLIME", "SULFUR", "BORAX", "EPSOM_SALT", "POTASSIUM_SALT"]],
    ["sec.extraMetals", ["GOLD", "NICKEL", "ZINC", "SILVER", "TIN", "LEAD", "ALUMINUM", "TUNGSTEN", "MOLTEN_TUNGSTEN", "BRASS", "BRONZE", "STERLING", "GALLIUM", "MOLTEN_GALLIUM", "ROSE_GOLD", "ELECTRUM", "SOLDER", "MOLTEN_COPPER", "MOLTEN_GOLD", "MOLTEN_IRON", "PYRITE", "MOLTEN_TIN", "MERCURY", "CALCIUM", "AMALGAM", "MOLTEN_ALUMINUM", "MOLTEN_ZINC", "MOLTEN_SULFUR", "URANIUM", "MOLTEN_URANIUM", "METAL_SCRAP", "MOLTEN_NICKEL", "MOLTEN_SILVER", "MOLTEN_LEAD", "MOLTEN_BRASS", "MOLTEN_BRONZE", "MOLTEN_STERLING", "MOLTEN_STEEL", "MOLTEN_ROSE_GOLD", "MOLTEN_ELECTRUM", "MOLTEN_SOLDER", "MOLTEN_PYRITE", "SOLID_MERCURY", "MOLTEN_SODIUM", "MOLTEN_CALCIUM", "MOLTEN_AMALGAM", "MOLTEN_COPPER_SULFATE", "MOLTEN_SODIUM_ACETATE", "MOLTEN_METAL_SCRAP"]]
);
// Keep the visible sidebar sections aligned with corrected physical categories.
const _extraPowders = SECTIONS.find(q => q[0] === 'sec.extraPowders');
const _extraSolids = SECTIONS.find(q => q[0] === 'sec.extraSolids');
const _extraMetals = SECTIONS.find(q => q[0] === 'sec.extraMetals');
const _extraLiquids = SECTIONS.find(q => q[0] === 'sec.extraLiquids');
if (_extraPowders && _extraSolids) {
    for (const k of ['ROCK','MUDSTONE']) { _extraPowders[1] = _extraPowders[1].filter(v => v !== k); if (!_extraSolids[1].includes(k)) _extraSolids[1].push(k); }
}
if (_extraMetals && _extraLiquids) {
    for (const k of ['MOLTEN_SULFUR','MOLTEN_COPPER_SULFATE','MOLTEN_SODIUM_ACETATE','MOLTEN_PYRITE','MOLTEN_EPSOM_SALT','MOLTEN_BAKING_SODA','MOLTEN_BORAX','MOLTEN_POTASSIUM_SALT','MOLTEN_SALT']) {
        _extraMetals[1] = _extraMetals[1].filter(v => v !== k);
        if (ELEMENTS[k] && !_extraLiquids[1].includes(k)) _extraLiquids[1].push(k);
    }
}

const swatchCache = {};
function makeSwatch(el) {
    const c = document.createElement('canvas'); c.width = c.height = 16;
    const g = c.getContext('2d');
    let s = el.id * 9301 + 49297; const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    const cl = v => Math.max(0, Math.min(255, v));
    const px = (x, y, k = 0) => { g.fillStyle = `rgb(${cl(el.color[0]+k)},${cl(el.color[1]+k)},${cl(el.color[2]+k)})`; g.fillRect(x, y, 1, 1); };
    const nz = () => Math.floor((rnd() - 0.5) * (el.var || 8) * 2);
    g.fillStyle = '#b9bec9'; g.fillRect(0, 0, 16, 16);
    if (el.type === 'liquid') {
        for (let y = 5; y < 16; y++) for (let x = 0; x < 16; x++) px(x, y, nz() + (y === 5 ? 35 : 0));
        for (let x = 0; x < 16; x += 2) px(x, 4, 25);
    } else if (el.type === 'powder') {
        for (let y = 4; y < 16; y++) { const hw = Math.floor((y - 4) * 0.7) + 1; for (let x = 8 - hw; x < 8 + hw; x++) if (x >= 0 && x < 16) px(x, y, nz() + (x < 8 ? 18 : -12)); }
    } else if (el.type === 'gas') {
        for (let n = 0; n < 9; n++) { const bx = 1 + Math.floor(rnd() * 12), by = 1 + Math.floor(rnd() * 12);
            for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) if (!(dx + dy === 0 || dx + dy === 4)) px(bx + dx, by + dy, nz() + 10); }
    } else {
        for (let y = 2; y < 14; y++) for (let x = 2; x < 14; x++) px(x, y, nz() + (y === 2 || x === 2 ? 30 : (y === 13 || x === 13 ? -35 : 0)));
    }
    return c.toDataURL();
}

const paletteList = document.getElementById('palette-list');
function toolHud() { document.getElementById('hud-el').innerText = t('hud.toolLine', { a: defOf(currentEl).name, b: defOf(altEl).name }); }
function selectElement(id) {
    if (typeof planArmed !== 'undefined' && planArmed) { planArmed = null; }
    currentEl = id;
    document.querySelectorAll('.tile').forEach(b => b.classList.toggle('active', +b.dataset.id === id));
    toolHud();
    if (HINTS[id]) flash(t(HINTS[id]));
    document.getElementById('btn-eraser').classList.toggle('on', id === ELEMENTS.EMPTY.id);
}
function selectAlt(id) {
    altEl = id;
    document.querySelectorAll('.tile').forEach(b => b.classList.toggle('alt', +b.dataset.id === id));
    toolHud();
}
let activeCat = 0;
const CAT_SHORT = { 'sec.tools': 'Tools', 'sec.life': 'Life', 'sec.meat': 'Meat & Fish', 'sec.fruit': 'Fruits', 'sec.veg': 'Vegetables', 'sec.dairy': 'Dairy & Eggs', 'sec.bakery': 'Bakery & Grains', 'sec.sweets': 'Sweets', 'sec.drinks': 'Drinks & Sauces', 'sec.spices': 'Spices & Misc', 'sec.solids': 'Solids', 'sec.liquids': 'Liquids', 'sec.gas': 'Gas / Energy', 'sec.electric': 'Electricity', 'sec.machines': 'Machines', 'sec.mechanics': 'Mechanics', 'sec.vehicles': 'Vehicles', 'sec.computers': 'Computers', 'sec.labgear': 'Lab Gear', 'sec.simtools': 'Sim tools', 'sec.chem': 'Chemistry', 'sec.ingredients': 'Ingredients', "sec.extraLife": "life", "sec.extraFood": "food", "sec.extraPlants": "plants", "sec.extraGases": "gases", "sec.extraLiquids": "liquids", "sec.extraChemicals": "chemicals", "sec.extraMetals": "metals", "sec.extraPowders": "powders", "sec.extraSolids": "solids", "sec.extraEnergy": "energy", "sec.extraReactive": "reactive" };

const SHORT_TOOL = { HEAT:'Heat', COOL:'Cool', AIR:'Air', VAC:'Vacuum', PIPETTE:'Pipette', PICK:'Pick', TOGGLE:'Interact', SPOON:'Spoon', MIX:'Mix', LOOKUP:'Lookup', SHOCK:'Shock',
    UNCHARGE:'Uncharge', UNBURN:'Unburn', SMASH:'Smash', RANDOM:'Random', PAINT:'Paint', UNPAINT:'Unpaint', FILLER:'Filler', ROOM_TEMP:'RoomTemp', COOK:'Cook', INCINERATE:'Incinerate' };
const RAINBOW = 'linear-gradient(90deg,#ff9ab0,#ffd98a,#a6ff9a,#8fd8ff,#c9a3ff)';
const TSTY = { PICK:[RAINBOW,1], MIX:['#e8dcb0',1], HEAT:['#ff0000'], COOL:['#0000ff'], LOOKUP:['#5c9a9a'], SHOCK:['#ffff00',1], PAINT:[RAINBOW,1], SMASH:['#777777'] };
// Small-caps look: first letter of each word bigger, spaces removed (like the reference UI)
function scHTML(name, keepSpaces) {
    return String(name).split(/(\s+)/).map(w => /^\s+$/.test(w) ? (keepSpaces ? ' ' : '') : (w ? '<span class="sc">' + esc(Array.from(w)[0]) + '</span>' + esc(Array.from(w).slice(1).join('')) : '')).join('');
}
function renderToolRow() {
    const row = document.getElementById('toolrow'); row.innerHTML = '';
    const list = [['EMPTY', 'Erase', '#ffaaff', 1], ['PICK'], ['MIX'], ['HEAT'], ['COOL'], ['LOOKUP'], ['SHOCK'], ['PAINT'], ['SMASH']];
    for (const [k, short, bg, dk] of list) {
        const el = k === 'EMPTY' ? ELEMENTS.EMPTY : TOOLS[k]; if (!el) continue;
        const btn = document.createElement('button');
        btn.className = 'tile' + (el.id === currentEl ? ' active' : '') + (el.id === altEl ? ' alt' : '');
        btn.dataset.id = el.id; btn.title = el.name;
        btn.innerHTML = scHTML(LANG === 'en' ? (short || SHORT_TOOL[k]) : el.name);
        const st = TSTY[k];
        btn.style.background = bg || st[0]; btn.style.setProperty('--bd', 'rgba(0,0,0,.7)');
        if (dk || (st && st[1])) btn.classList.add('dk');
        btn.onclick = () => selectElement(el.id);
        btn.oncontextmenu = ev => { ev.preventDefault(); selectAlt(el.id); };
        row.appendChild(btn);
    }
}
const catLabel = k => (LANG === 'en' && CAT_SHORT[k]) || t(k);
const fgFor = c => ((c[0] * 299 + c[1] * 587 + c[2] * 114) / 1000 > 135 ? '#000' : '#fff');
function renderPalette(filter = '') {
    const q = filter.toLowerCase().trim();
    renderToolRow();
    const side = document.getElementById('sidebar');
    const hasPlans = PLANS.length > 0;
    if (activeCat === -1 && !hasPlans) activeCat = 0;
    side.innerHTML = '';
    const addTab = (label, i) => {
        const b = document.createElement('button');
        b.className = 'cat' + (i === activeCat && !q ? ' on' : ''); b.innerHTML = scHTML(label.charAt(0).toUpperCase() + label.slice(1), true);
        b.onclick = () => { activeCat = i; document.getElementById('search-box').value = ''; renderPalette(''); };
        side.appendChild(b);
    };
    if (hasPlans) addTab('Plans', -1);
    SECTIONS.forEach(([title], n) => addTab(catLabel(title), n));

    paletteList.innerHTML = '';
    const planTiles = () => PLANS.filter(p => p.name.toLowerCase().includes(q)).forEach(p => {
        const b = document.createElement('button'); b.className = 'tile' + (planArmed === p ? ' active' : '');
        b.title = p.builtin ? p.name : p.name + t('pal.deleteTip');
        b.style.background = '#2b4c7e'; b.style.setProperty('--bd', '#12233f'); b.innerHTML = scHTML(p.name);
        b.onclick = () => armPlan(p);
        b.oncontextmenu = ev => { ev.preventDefault(); if (!p.builtin && confirm(t('pal.deleteConfirm', { name: p.name }))) { PLANS.splice(PLANS.indexOf(p), 1); savePlans(); if (planArmed === p) planArmed = null; renderPalette(''); } };
        paletteList.appendChild(b);
    });
    const elTiles = keys => keys.forEach(k => {
        const el = ELEMENTS[k] || TOOLS[k]; if (!el || !el.name.toLowerCase().includes(q)) return;
        const col = el.color || [95, 95, 105];
        const btn = document.createElement('button');
        const isTool = !ELEMENTS[k] && TOOLS[k];
        btn.className = 'tile' + (el.id === currentEl ? ' active' : '') + (el.id === altEl ? ' alt' : '');
        btn.dataset.id = el.id; btn.title = el.name;
        btn.innerHTML = scHTML((isTool && LANG === 'en' && SHORT_TOOL[k]) || el.name);
        if (isTool && TSTY[k]) { btn.style.background = TSTY[k][0]; btn.style.setProperty('--bd', 'rgba(0,0,0,.7)'); if (TSTY[k][1]) btn.classList.add('dk'); }
        else {
            btn.style.background = `rgb(${col[0]},${col[1]},${col[2]})`;
            btn.style.setProperty('--bd', `rgb(${col[0] * .42 | 0},${col[1] * .42 | 0},${col[2] * .42 | 0})`);
            if (fgFor(col) === '#000') btn.classList.add('dk');
        }
        btn.onclick = () => selectElement(el.id);
        btn.oncontextmenu = ev => { ev.preventDefault(); selectAlt(el.id); };
        paletteList.appendChild(btn);
    });
    if (q) { planTiles(); const seen = new Set(); SECTIONS.forEach(([, keys]) => elTiles(keys.filter(k => !seen.has(k) && seen.add(k)))); }
    else if (activeCat === -1) planTiles();
    else elTiles(SECTIONS[activeCat][1]);
}
renderPalette();
document.getElementById('search-box').oninput = e => renderPalette(e.target.value);



