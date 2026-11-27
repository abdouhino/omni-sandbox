const EL_BY_ID = Object.values(ELEMENTS).reduce((acc, el) => { acc[el.id] = el; return acc; }, {});

const AMBIENT = 20;
ELEMENTS.FIRE.temp = 600;  ELEMENTS.LAVA.temp = 1200; ELEMENTS.TORCH.temp = 750;
ELEMENTS.CRYO.temp = -196; ELEMENTS.ICE.temp = -8;    ELEMENTS.SNOW.temp = -8;
ELEMENTS.STEAM.temp = 105;

const ID = {};
for (const k in ELEMENTS) ID[k] = ELEMENTS[k].id;

// Build reversible solid/liquid/gas pairs from material names. Thresholds are
// educational game approximations; common substances use recognizable Celsius values.
const MELT_POINTS = {
  SODIUM:98, CALCIUM:842, IRON:1538, COPPER:1085, GOLD:1064, NICKEL:1455, ZINC:420,
  SILVER:962, TIN:232, LEAD:327, ALUMINUM:660, TUNGSTEN:3000, GALLIUM:30,
  SULFUR:115, STEEL:1370, BRASS:930, BRONZE:950, STERLING:890, ROSE_GOLD:1000,
  ELECTRUM:900, SOLDER:190, PYRITE:743, GLASS:700, STAINED_GLASS:700,
  PLASTIC:140, WAX:62, BRICK:900, PORCELAIN:1200, BASALT:1000, LIMESTONE:825
};
Object.assign(MELT_POINTS, {
  TUNGSTEN:3422, SULFUR:115, SODIUM_ACETATE:324, SALT:801, BORAX:743,
  POTASSIUM_SALT:770, SLAG:1150, TUFF:1050, ASH:1000, DIRT:1100,
  MUDSTONE:1200, ROCK:1200, CONCRETE:1400, RAD_GLASS:700, THERMITE:1000
});
const BOIL_POINTS = {
  HYDROGEN:-253, OXYGEN:-183, NITROGEN:-196, HELIUM:-269, NEON:-246,
  AMMONIA:-33, CHLORINE:-34, PROPANE:-42, METHANE:-162, CARBON_DIOXIDE:-57,
  ALCOHOL:78, ETHANOL:78, MERCURY:357, WATER:100, SODIUM:883, ZINC:907,
  COPPER:2562, IRON:2862, GOLD:2856, SILVER:2162, TIN:2602, LEAD:1749, ALUMINUM:2470
};
for (const key of Object.keys(ELEMENTS)) {
  const el = ELEMENTS[key];
  if (key.startsWith('MOLTEN_')) {
    const base = key.slice(7);
    const decomposesInsteadOfMelting = new Set(['COPPER_SULFATE','PYRITE','EPSOM_SALT','BAKING_SODA','ALGA','THERMITE']);
    if (ELEMENTS[base] && !decomposesInsteadOfMelting.has(base)) {
      const mp = MELT_POINTS[base] ?? 900;
      el.phase = Object.assign({}, el.phase || {}, { freezeTo: base, freezeAt: mp - 25 });
      ELEMENTS[base].phase = Object.assign({}, ELEMENTS[base].phase || {}, { meltTo: key, meltAt: mp });
    }
  }
  if (key.startsWith('LIQUID_')) {
    const base = key.slice(7);
    if (ELEMENTS[base]) {
      const bp = BOIL_POINTS[base] ?? -35;
      el.phase = Object.assign({}, el.phase || {}, { boilTo: base, boilAt: bp + 8 });
      ELEMENTS[base].phase = Object.assign({}, ELEMENTS[base].phase || {}, { condenseTo: key, condenseAt: bp - 8 });
    }
  }
  if (key.endsWith('_ICE')) {
    const base = key.slice(0, -4);
    const target = ({ SALT:'SALT_WATER', BLOOD:'BLOOD', ANTIBODY:'ANTIBODY', INFECTION:'INFECTION', SLIME:'SLIME', ACID:'ACID', JUICE:'JUICE', BROTH:'BROTH', SUGAR:'SUGAR_WATER', SELTZER:'SELTZER', DIRTY:'DIRTY_WATER', POOL:'POOL_WATER', TEA:'TEA', COFFEE:'COFFEE', NEON:'NEON', CYANIDE:'CYANIDE', ALCOHOL:'ETHANOL', CHLORINE:'LIQUID_CHLORINE', HYDROGEN:'LIQUID_HYDROGEN', OXYGEN:'LIQUID_OXYGEN', AMMONIA:'LIQUID_AMMONIA', METHANE:'LIQUID_METHANE', SODA:'SODA', BLEACH:'BLEACH', VINEGAR:'VINEGAR' })[base] || base;
    if (ELEMENTS[target]) {
      el.phase = Object.assign({}, el.phase || {}, { meltTo: target, meltAt: 1 });
      ELEMENTS[target].phase = Object.assign({}, ELEMENTS[target].phase || {}, { freezeTo: key, freezeAt: -2 });
    }
  }
  if (key.startsWith('FROZEN_')) {
    const base = key.slice(7);
    if (ELEMENTS[base]) {
      el.phase = Object.assign({}, el.phase || {}, { meltTo: base, meltAt: 2 });
      ELEMENTS[base].phase = Object.assign({}, ELEMENTS[base].phase || {}, { freezeTo: key, freezeAt: -3 });
    }
  }
}
// Explicit transitions for the standard water cycle and magma/rock cooling.
ELEMENTS.WATER.phase = Object.assign({}, ELEMENTS.WATER.phase||{}, {freezeTo:'ICE',freezeAt:-2,boilTo:'STEAM',boilAt:100});
ELEMENTS.ICE.phase = Object.assign({}, ELEMENTS.ICE.phase||{}, {meltTo:'WATER',meltAt:1});
ELEMENTS.STEAM.phase = Object.assign({}, ELEMENTS.STEAM.phase||{}, {condenseTo:'WATER',condenseAt:95});
if (ELEMENTS.MAGMA && ELEMENTS.ROCK) {
    ELEMENTS.MAGMA.phase = Object.assign({}, ELEMENTS.MAGMA.phase||{}, {freezeTo:'ROCK',freezeAt:680});
    ELEMENTS.ROCK.phase = Object.assign({}, ELEMENTS.ROCK.phase||{}, {meltTo:'MAGMA',meltAt:1150});
}
// Thermite's hot reaction product is represented as slag in this simplified sandbox.
if (ELEMENTS.MOLTEN_THERMITE && ELEMENTS.SLAG) ELEMENTS.MOLTEN_THERMITE.phase = { freezeTo:'SLAG', freezeAt:1100 };
// Pair a few existing common solids to the newly added molten variants.
Object.assign(ELEMENTS.COPPER, { density:26.88, cond:true });
Object.assign(ELEMENTS.IRON, { density:23.61, cond:true });
Object.assign(ELEMENTS.STEEL, { density:23.55, cond:true });
Object.assign(ELEMENTS.SODIUM, { density:2.904, cond:true });
Object.assign(ELEMENTS.COPPER, { heatK:0.221, heatC:0.39, heatLoss:0.0007 });
Object.assign(ELEMENTS.IRON, { heatK:0.205, heatC:0.45, heatLoss:0.0008 });
Object.assign(ELEMENTS.STEEL, { heatK:0.185, heatC:0.49, heatLoss:0.0009 });
Object.assign(ELEMENTS.SODIUM, { heatK:0.142, heatC:1.23, heatLoss:0.0011 });

const K = new Float32Array(1024), C = new Float32Array(1024), LOSS = new Float32Array(1024);
for (const k in ELEMENTS) {
    const el = ELEMENTS[k];
    let kk = 0.06, cc = 2, ll = 0.0015;
    switch (el.type) {
        case 'empty':   kk = 0.03; cc = 1;   ll = 0.02;  break;
        case 'gas': case 'energy': kk = 0.04; cc = 0.8; ll = 0.03; break;
        case 'powder':  kk = 0.05; cc = 1.5; break;
        case 'liquid':  kk = 0.10; cc = 3;   break;
        case 'creature':kk = 0.07; cc = 3;   break;
    }
    K[el.id] = kk; C[el.id] = cc; LOSS[el.id] = ll;
    if (el.heatK !== undefined) { K[el.id] = el.heatK; C[el.id] = el.heatC; LOSS[el.id] = el.heatLoss; }
}
function setTh(name, k, c, l) { const id = ID[name]; K[id] = k; C[id] = c; if (l !== undefined) LOSS[id] = l; }
setTh('WATER', 0.12, 4); setTh('SALT_WATER', 0.12, 4); setTh('MILK', 0.10, 3.5); setTh('JUICE', 0.10, 3.5);
setTh('OIL', 0.12, 2);  setTh('LAVA', 0.008, 8, 0.00002); setTh('CRYO', 0.10, 3);
setTh('STEEL', 0.20, 1.2, 0.002); setTh('STONE', 0.06, 2.5); setTh('WOOD', 0.015, 2);
setTh('GLASS', 0.05, 2); setTh('ICE', 0.10, 2); setTh('TORCH', 0.20, 1);
setTh('FIRE', 0.10, 0.7, 0.005);
setTh('COPPER', 0.22, 1.2, 0.002); setTh('MIRROR', 0.08, 2); setTh('LAMP', 0.04, 1.5);
setTh('RAW_MEAT', 0.07, 3); setTh('COOKED_MEAT', 0.07, 3); setTh('CHARRED', 0.05, 2);
setTh('INSULATOR', 0.004, 2); setTh('HEATER', 0.3, 1.2); setTh('COOLER', 0.3, 1.2); setTh('MAGNETRON', 0.05, 1.5); setTh('THERMOSTAT', 0.15, 1.5); setTh('THERMOSTAT_H', 0.15, 1.5); setTh('TIMER', 0.05, 1.5); setTh('CONVEYOR', 0.05, 2); setTh('REPEATER', 0.05, 2);
setTh('BREAD', 0.03, 1.5); setTh('DOUGH', 0.05, 2);  setTh('PLANT', 0.04, 2);
setTh('COOLANT', 0.14, 4.4, 0.0008);
setTh('SODIUM', 0.18, 1.0, 0.001); setTh('HYDROGEN_PEROXIDE', 0.09, 3.4, 0.001); setTh('SOAP', 0.08, 3.2, 0.001); setTh('FOAM', 0.012, 1.8, 0.0008);
setTh('DISTILLED_WATER',0.12,4); setTh('GROUNDWATER',0.12,4); setTh('COPPER_SULFATE_SOLUTION',0.11,3.8); setTh('CALCIUM_SOLUTION',0.11,3.8); setTh('CARBONATE_SOLUTION',0.11,3.8); setTh('SODIUM_CHLORIDE_SOLUTION',0.12,4); setTh('LIMEWATER',0.11,3.6); setTh('CRYSTAL',0.06,1.8); setTh('PRECIPITATE',0.05,1.6); setTh('BUNSEN',0.2,1.2);

const IGN = new Float32Array(1024).fill(Infinity);
const ignTable = { FUSE: 220, WOOD: 320, PLANT: 300, FLOUR: 420, SUGAR: 260, OIL: 480, FUEL: 300, METHANE: 450,
                   GUNPOWDER: 270, NITRO: 210, C4: 380, BREAD: 300, COOKED_MEAT: 480, CHARRED: 520, HONEY: 350 };
for (const k in ignTable) IGN[ID[k]] = ignTable[k];

const BURN = new Float32Array(1024);
BURN[ID.WOOD] = 500; BURN[ID.PLANT] = 160; BURN[ID.FUSE] = 40;
for (const key in ELEMENTS) {
    const el = ELEMENTS[key], id = el.id;
    if ((el.flam > 0 || el.exp) && IGN[id] === Infinity) {
        IGN[id] = el.ign !== undefined ? el.ign : (el.type === 'gas' ? 230 : (el.type === 'liquid' ? 285 : 340));
    }
    if (el.flam > 0 && BURN[id] === 0) BURN[id] = 24 + ((id * 17) % 82);
}

const COOKABLE = new Uint8Array(1024), ROT = new Uint8Array(1024);
[ID.RAW_MEAT, ID.COOKED_MEAT, ID.DOUGH, ID.BREAD].forEach(i => COOKABLE[i] = 1);

const LAVA_ID = ID.LAVA, GLASS_ID = ID.GLASS;
const QUENCH = new Uint8Array(1024);
[ID.WATER, ID.SALT_WATER, ID.ICE, ID.SNOW, ID.CRYO, ID.MILK, ID.JUICE, ID.BLOOD, ID.COOLANT].forEach(i => QUENCH[i] = 1);
const GASID = new Uint8Array(1024);
for (const k in ELEMENTS) if (ELEMENTS[k].type === 'gas') GASID[ELEMENTS[k].id] = 1;
const VISC = new Float32Array(1024).fill(1), THV = new Float32Array(1024), EXPAN = new Float32Array(1024), SLIP = new Float32Array(1024).fill(1), FRAG = new Float32Array(1024);
(function () {
    const dens = { MILK: 3.05, JUICE: 3.1, BLOOD: 3.2, ACID: 3.3, HONEY: 4.2, MELTED_CHEESE: 4.1, FRUIT: 2.8 };
    for (const k in dens) ELEMENTS[k].density = dens[k];
    const visc = { LAVA: 0.22, HONEY: 0.1, MELTED_CHEESE: 0.2, OIL: 0.65, BLOOD: 0.55, MILK: 0.9, JUICE: 0.9, ACID: 0.95, NITRO: 0.8, SALT_WATER: 0.95 };
    for (const k in visc) VISC[ID[k]] = visc[k];
    const thv = { HONEY: 60, OIL: 150, MELTED_CHEESE: 120 };
    for (const k in thv) THV[ID[k]] = thv[k];
    const slip = { DIRT: 0.55, FLOUR: 0.45, ASH: 0.5, SNOW: 0.35, GUNPOWDER: 0.8, ROTTEN_MEAT: 0.5, FRUIT: 0.7, SEED: 0.8, NUKE: 0.45, DOUGH: 0.3 };
    for (const k in slip) SLIP[ID[k]] = slip[k];
    for (const k in ELEMENTS) if (ELEMENTS[k].type === 'liquid') EXPAN[ELEMENTS[k].id] = 0.0015;
    // Each added liquid/powder receives its own flow and granular behavior.
    for (const key in ELEMENTS) {
        const el=ELEMENTS[key], id=el.id;
        if (el.visc !== undefined) VISC[id]=el.visc;
        if (el.thv !== undefined) THV[id]=el.thv;
        if (el.expan !== undefined) EXPAN[id]=el.expan;
        if (el.slip !== undefined) SLIP[id]=el.slip;
        if (el.frag !== undefined) FRAG[id]=el.frag;
    }
    EXPAN[ID.LAVA] = 0.0003; EXPAN[ID.HONEY] = 0.0008; EXPAN[ID.MELTED_CHEESE] = 0.0008;
    FRAG[ID.GLASS] = 80; FRAG[ID.ICE] = 140;
})();
let _r = 0, _g = 0, _b = 0;
function lerpC(a, b, f) {
    f = f < 0 ? 0 : (f > 1 ? 1 : f);
    _r = a[0] + (b[0] - a[0]) * f; _g = a[1] + (b[1] - a[1]) * f; _b = a[2] + (b[2] - a[2]) * f;
}
function cookColor(id, p) {
    if (id === ID.RAW_MEAT)         lerpC(ELEMENTS.RAW_MEAT.color, ELEMENTS.COOKED_MEAT.color, p / 120);
    else if (id === ID.COOKED_MEAT) lerpC(ELEMENTS.COOKED_MEAT.color, ELEMENTS.CHARRED.color, (p - 140) / 115);
    else if (id === ID.DOUGH)       lerpC(ELEMENTS.DOUGH.color, ELEMENTS.BREAD.color, p / 100);
    else                            lerpC(ELEMENTS.BREAD.color, ELEMENTS.CHARRED.color, (p - 100) / 155);
}
function foodState(id, p) {
    if (id === ID.RAW_MEAT)   return p < 25 ? t('food.raw') : t('food.mid', { n: Math.round(p / 1.2) });
    if (id === ID.COOKED_MEAT)return p < 170 ? t('food.done') : (p < 220 ? t('food.over') : t('food.almostBurnt'));
    if (id === ID.DOUGH)      return t('food.cooking', { n: Math.round(p) });
    if (id === ID.BREAD)      return p < 160 ? t('food.golden') : t('food.burning');
    return '';
}

