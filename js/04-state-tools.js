const size = WIDTH * HEIGHT;
let grid = new Uint16Array(size);
let colorVar = new Int8Array(size);
let skin = new Uint32Array(size);
let lifeGrid = new Uint16Array(size);
let metaGrid = new Uint16Array(size);
let updated = new Uint8Array(size);
let T  = new Float32Array(size).fill(AMBIENT);
let Tn = new Float32Array(size).fill(AMBIENT);
let cookGrid = new Float32Array(size);
let vel = new Uint8Array(size);
let mix = new Uint32Array(size);
let solutionGrid = new Uint8Array(size);
let phGrid = new Float32Array(size).fill(7);
const liqCol = new Uint8Array(size);

let currentEl = ELEMENTS.SAND.id;
let brushSize = 4;
let isPaused = false;
let gravityOn = true;
let windDir = 0;
let isDrawing = false;
let mouseX = 0, mouseY = 0, lastMouseX = 0, lastMouseY = 0;

const TOOLS = {
    HEAT:    { id: 200, emoji: '🔥' },
    COOL:    { id: 201, emoji: '❄️' },
    AIR:     { id: 202, emoji: '💨' },
    VAC:     { id: 203, emoji: '🌀' },
    PIPETTE: { id: 204, emoji: '💧' },
    TOGGLE:  { id: 205, emoji: '👆' },
    SPOON:   { id: 211, emoji: '🥄' },
    LOOKUP:  { id: 912, emoji: '🔎' },
    SHOCK:   { id: 913, emoji: '⚡' },
    UNCHARGE:{ id: 914, emoji: '⏚' },
    UNBURN:  { id: 915, emoji: '🧯' },
    SMASH:   { id: 916, emoji: '✹' },
    RANDOM:  { id: 917, emoji: '🎲' },
    PAINT:   { id: 918, emoji: '▨' },
    UNPAINT: { id: 919, emoji: '□' },
    PICK:    { id: 204, emoji: '🖱' },
    MIX:     { id: 211, emoji: '≋' },
    FILLER:  { id: 920, emoji: '▦' },
    ROOM_TEMP:{ id: 921, emoji: '🌡' },
    COOK:    { id: 922, emoji: '♨' },
    INCINERATE:{ id: 923, emoji: '🔥' }
};
for (const k in TOOLS) Object.defineProperty(TOOLS[k], 'name', { get: () => t('tool.' + k), enumerable: true });
const TOOL = {}, TOOL_BY_ID = {};
for (const k in TOOLS) { TOOL[k] = TOOLS[k].id; TOOL_BY_ID[TOOLS[k].id] = TOOLS[k]; }
const defOf = id => EL_BY_ID[id] || TOOL_BY_ID[id];
const isToolId = id => TOOL_BY_ID[id] !== undefined;
const freeDrawable = id => !isToolId(id) && id !== ID.CAR;
const isCreatureId = id => !!(EL_BY_ID[id] && EL_BY_ID[id].type === 'creature');
let altEl = 0;
let viewMode = 0;
let brushShape = 0;
let paintEl = 0, shapeStart = null, shapeMode = '';
