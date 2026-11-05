const canvas = document.querySelector('#arena');
const ctx = canvas.getContext('2d');
const mapCanvas = document.querySelector('#map');
const mapCtx = mapCanvas.getContext('2d');
const mapPanel = document.querySelector('#map-panel');
const mapBiomeName = document.querySelector('#map-biome-name');
const mapInstructions = document.querySelector('#map-instructions');
const crosshair = document.querySelector('.crosshair');
const gameShell = document.querySelector('.game-shell');
const adminPanel = document.querySelector('#admin-panel');
const ui = { wave: document.querySelector('#wave'), score: document.querySelector('#score'), high: document.querySelector('#high-score'), ammo: document.querySelector('#ammo'), ammoStorage: document.querySelector('#ammo-storage'), medkits: document.querySelector('#medkits'), weaponName: document.querySelector('#weapon-name'), ammoType: document.querySelector('#ammo-type'), weaponBar: document.querySelector('#weapon-bar'), health: document.querySelector('#health-bar'), healthValue: document.querySelector('#health-value'), threats: document.querySelector('#threat-count'), distance: document.querySelector('#distance'), salvage: document.querySelector('#salvage'), relics: document.querySelector('#relics'), objective: document.querySelector('#objective-text'), start: document.querySelector('#start-screen'), over: document.querySelector('#game-over'), pause: document.querySelector('#pause-screen'), final: document.querySelector('#final-score'), announcement: document.querySelector('#biome-announcement'), effects: document.querySelector('#biome-effects'), inventory: document.querySelector('#inventory-hud'), stations: document.querySelector('#sanctuary-stations'), stationOutput: document.querySelector('#station-output'), arsenal: document.querySelector('#arsenal-list'), craftDetails: document.querySelector('#craft-details'), manager: document.querySelector('#manager-mode'), managerInventory: document.querySelector('#manager-inventory') };
const debugConsoleOutput = document.querySelector('#debug-console-output');
const clearConsoleButton = document.querySelector('#clear-console');
const atlasCrystalCounter = document.querySelector('#atlas-crystals');
function gameLog(level, message, detail = '') { if (!debugConsoleOutput) return; const entry = document.createElement('div'); entry.className = 'debug-console-entry'; const now = new Date(); const time = now.toLocaleTimeString([], { hour12: false }); entry.innerHTML = `<span class="debug-console-time">${time}</span><span class="debug-console-level ${level.toLowerCase()}">${level}</span><span class="debug-console-message"></span>${detail ? '<span class="debug-console-detail"></span>' : ''}`; entry.querySelector('.debug-console-message').textContent = String(message); if (detail) entry.querySelector('.debug-console-detail').textContent = String(detail); debugConsoleOutput.append(entry); while (debugConsoleOutput.children.length > 200) debugConsoleOutput.firstElementChild.remove(); debugConsoleOutput.scrollTop = debugConsoleOutput.scrollHeight; }
window.addEventListener('error', event => gameLog('ERROR', event.message || 'Uncaught error', `${event.filename || 'unknown source'}:${event.lineno || 0}:${event.colno || 0}`));
window.addEventListener('unhandledrejection', event => { const reason = event.reason; gameLog('ERROR', reason?.message || String(reason || 'Unhandled promise rejection'), reason?.stack || 'Unhandled promise rejection'); });
clearConsoleButton?.addEventListener('click', () => { debugConsoleOutput.innerHTML = ''; gameLog('INFO', 'Diagnostic console cleared'); });
gameLog('INFO', 'Diagnostic console online');
const keys = {}; const pointer = { x: 0, y: 0, down: false }; let animation; let lastTime = 0; let adminMode = false;
let managerDrag = null;
let mapOpen = false;
const saveSlotCount = 5;
const saveSlotsKey = 'horde-save-slots';
const lastSaveSlotKey = 'horde-last-save-slot';
let currentSaveSlot = null;
const saveSlotsPanel = document.querySelector('#save-slots');
const saveSlotsTitle = document.querySelector('#save-slots-title');
const saveSlotList = document.querySelector('#save-slot-list');
const mainMenu = document.querySelector('#main-menu');
const howToPlay = document.querySelector('#how-to-play');
const continueButton = document.querySelector('[data-menu-action="continue"]');
const saveButton = document.querySelector('#save-button');
const mainMenuButton = document.querySelector('#main-menu-button');
const adminUnlockSequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'Enter'];
let adminUnlockIndex = 0;
const clipSize = 12;
const startingAmmoReserve = 15;
const stationInteractionRadius = 95;
const frostfallAuraRadius = 80;
const sanctuaryBuildStations = {
  designer: { x: -70, y: -1000 },
  manager: { x: 70, y: -1000 }
};
const placedStationRadius = 24;
const managerInventoryWidth = 280;
const beaconStationRadius = 200;
const beaconStationRingRadius = 10500;
const beaconTurretWeapons = {
  laser: { type: 'beam', damage: 1.9, cooldown: 1.65, range: 1700, color: '#b9f4ff' },
  pulseCarbine: { type: 'beam', damage: .55, cooldown: .25, color: '#d58ee0', pulseBlastRadius: 50, pulseKnockback: 400 },
  minigun: { type: 'beam', damage: .28, cooldown: .08, color: '#ffb35c' },
  grenadeLauncher: { type: 'grenade', damage: 1.25, cooldown: 1.25, radius: 105, speed: 700, color: '#ff865c' },
  shotgun: { type: 'shotgun', damage: .42, pellets: 6, spread: .55, cooldown: .82, speed: 1000, life: .65, color: '#ffd08a' }
};
const beaconModuleDefinitions = {
  pulse: { name: 'PULSE MODULE', description: 'Periodically blasts nearby enemies away from this station.' },
  drain: { name: 'DRAIN MODULE', description: 'Continuously damages enemies around this station.' },
  support: { name: 'SUPPORT MODULE', description: '+3 HP/s, +10% player damage, and +10% player attack speed per module while inside. Station turrets also gain +10% damage and attack speed per module.' }
};
const beaconModuleInteractionRadius = 45;
const beaconModuleBenchOffset = 55;
const beaconRegionRadius = 1200;
const sanctuaryTurretCount = 16;
const mapRadius = 18000;
const biomeBoundaries = [3000, 6000, 9500, 13000, 16000];
const tacticalMapZoomLevels = [.4, .6, .8, 1, 1.25, 1.5, 2];
let tacticalMapZoomIndex = 3;
function cycleTacticalMapZoom() {
  tacticalMapZoomIndex = (tacticalMapZoomIndex + 1) % tacticalMapZoomLevels.length;
}
function getTacticalMapZoom() {
  if (!mapOpen) return tacticalMapZoomLevels[tacticalMapZoomIndex];
  return Math.min(1, mapRadius / (mapRadius + Math.hypot(game.player.x, game.player.y)));
}
function getTacticalMapScale() {
  const mapDimension = mapOpen ? Math.min(mapCanvas.width, mapCanvas.height) : mapCanvas.width;
  return mapDimension / (mapRadius * 2) * getTacticalMapZoom();
}
function getTacticalMapVisibleRadius() {
  return mapRadius / getTacticalMapZoom();
}
function getMapCenter() { return mapOpen ? game.player : { x: 0, y: 0 }; }
function applyMapTransform(scale) {
  const center = getMapCenter();
  mapCtx.translate(mapCanvas.width / 2 - center.x * scale, mapCanvas.height / 2 - center.y * scale);
  mapCtx.scale(scale, scale);
}
function resizeMapCanvas() {
  const width = Math.max(220, Math.floor(mapCanvas.clientWidth));
  const height = Math.max(180, Math.floor(mapCanvas.clientHeight));
  if (mapCanvas.width !== width) mapCanvas.width = width;
  if (mapCanvas.height !== height) mapCanvas.height = height;
}
function setMapOpen(open) {
  if (mapOpen === open) return;
  mapOpen = open;
  mapPanel.classList.toggle('expanded', open);
  const canFastTravel = isAtFastTravelHub();
  mapPanel.classList.toggle('fast-travel-enabled', open && canFastTravel);
  mapInstructions.textContent = canFastTravel
    ? 'CLICK A BEACON TO TRAVEL // M OR ESC TO CLOSE'
    : 'M OR ESC TO CLOSE';
  document.body.classList.toggle('map-open', open);
  mapPanel.setAttribute('aria-modal', String(open));
  mapBiomeName.textContent = '';
  Object.keys(keys).forEach(key => { keys[key] = false; });
  pointer.down = false;
  game.radBeamActive = false;
  resizeMapCanvas();
}
const sectorRegions = [
  [{ name: 'TOXIC MARSH', color: '#65b49a', dark: '#172d2d' }, { name: 'SCORCHED WASTES', color: '#ff865c', dark: '#3b211d' }, { name: 'FROZEN PEAKS', color: '#9fd8e3', dark: '#1b2a3c' }, { name: 'ASHEN LOWLANDS', color: '#c88968', dark: '#322522' }],
  [{ name: 'THUNDER PLAINS', color: '#f2c96d', dark: '#302b1f' }, { name: 'IRONWOOD', color: '#8fc47e', dark: '#1d3026' }, { name: 'GLASS DESERT', color: '#ad7b07', dark: '#382203' }, { name: 'FROSTFALL TRENCH', color: '#82c5d7', dark: '#1b2e3b' }],
  [{ name: 'BONE ORCHARD', color: '#d7b07a', dark: '#352b25' }, { name: 'EMBER SEA', color: '#ff725e', dark: '#3b201d' }, { name: 'BLACKROOT WILDS', color: '#8fcf9d', dark: '#1c3026' }, { name: 'GRAVITY FIELDS', color: '#b69be8', dark: '#29233b' }],
  [{ name: 'STORM CITADEL', color: '#8db7ee', dark: '#202d45' }, { name: 'CRIMSON CHASM', color: '#ef6672', dark: '#3b2029' }, { name: 'NULL ICE', color: '#a9e3e6', dark: '#1c3338' }, { name: 'WRAITH MOOR', color: '#a88fd0', dark: '#292238' }],
  [{ name: 'SUNLESS VALE', color: '#bd9f7a', dark: '#30271f' }, { name: 'STARFIRE RIDGE', color: '#ff9b62', dark: '#3c251d' }, { name: 'DYING NEBULA', color: '#d58ee0', dark: '#34213b' }, { name: 'ABYSSAL SHELF', color: '#709ed0', dark: '#1d2c45' }],
  [{ name: 'VOID RIFT', color: '#ca8bea', dark: '#281b39' }, { name: 'EVENT HORIZON', color: '#ec7dc4', dark: '#3b1d35' }, { name: 'DEAD STAR', color: '#ffb067', dark: '#3b281e' }, { name: 'INFINITE DARK', color: '#809eea', dark: '#202744' }]
];
const biomes = sectorRegions[0];
const resourceTypes = [
  { key: 'wood', name: 'WOOD', color: '#c88968', weight: 12 },
  { key: 'rawIron', name: 'RAW IRON', color: '#8b8584', weight: 12 },
  { key: 'iron', name: 'IRON', color: '#d7d0c8', weight: 10 },
  { key: 'steel', name: 'STEEL', color: '#9fd8e3', weight: 0 }, 
  { key: 'stone', name: 'STONE', color: '#b9b0a8', weight: 10 },
  { key: 'fiber', name: 'FIBER', color: '#8fc47e', weight: 12 },
  { key: 'crystal', name: 'CRYSTAL', color: '#d58ee0', weight: 7 },
  { key: 'fuel', name: 'FUEL', color: '#ff865c', weight: 9 }
];
const weaponCatalog = {
  // Tier 0 (Starter)
  sidearm: { name: 'SIDEARM', ammo: 'pistolAmmo', magazine: 12, cooldown: 200, damage: 0.30, speed: 650, life: .7, pellets: 1, spread: .05, kind: 'gun' },

  // Tier 1 (Early Game)
  duelSidearm: { name: 'DUEL SIDEARM', ammo: 'pistolAmmo', magazine: 24, cooldown: 110, damage: 0.22, speed: 680, life: .7, pellets: 1, spread: .18, kind: 'gun', dualWield: true },
  smg: { name: 'SMG', ammo: 'smgAmmo', magazine: 32, cooldown: 55, damage: 0.16, speed: 700, life: .7, pellets: 1, spread: .12, kind: 'gun' },
  machete: { name: 'MACHETE', ammo: null, cooldown: 450, damage: 1.20, range: 85, meleeDuration: .28, meleeSweep: 1.9, meleeStyle: 'machete', kind: 'melee' },
  spear: { name: 'SPEAR', ammo: null, cooldown: 600, damage: 1.80, range: 145, meleeDuration: .32, meleeStyle: 'spear', kind: 'melee' },

  // Tier 2 (Mid Game)
  minigun: { name: 'MINIGUN', ammo: 'minigunAmmo', magazine: 100, cooldown: 50, damage: 0.1, speed: 750, life: .8, pellets: 1, spread: .38, kind: 'gun' },
  shotgun: { name: 'SHOTGUN', ammo: 'shells', magazine: 6, cooldown: 480, damage: 0.30, speed: 580, life: .45, pellets: 8, spread: .34, falloff: true, kind: 'gun' },
  burstRifle: { name: 'BURST RIFLE', ammo: 'rifleAmmo', magazine: 24, cooldown: 220, damage: 0.325, speed: 780, life: .8, pellets: 3, spread: .06, kind: 'gun' },
  flamethrower: { name: 'FLAMETHROWER', ammo: 'fuelCells', magazine: 160, cooldown: 40, damage: 0.02, speed: 450, life: 3.0, pellets: 2, spread: .3, bulletRadius: 6, deceleration: [25, 75], decelerationInterval: .125, vibrationAmplitude: 3, vibrationFrequency: 20, burnDuration: 3, burnDamage: .23, burnInterval: .5, kind: 'gun', pierce: true },
  sniper: { name: 'SNIPER', ammo: 'marksmanAmmo', magazine: 5, cooldown: 750, damage: 3.60, speed: 1200, life: 1, pellets: 1, spread: 0, kind: 'gun' },
  warHammer: { name: 'WAR HAMMER', ammo: null, cooldown: 850, damage: 4.20, range: 112, meleeDuration: .48, meleeSweep: 2.1, meleeStyle: 'warHammer', kind: 'melee' },

  // Tier 3 (Late Mid Game)
  laser: { name: 'LASER', ammo: 'cells', magazine: 20, cooldown: 100, damage: 0.65, speed: 1100, life: .55, pellets: 1, spread: 0.2, beam: true, kind: 'gun' },
  grenadeLauncher: { name: 'GRENADE LAUNCHER', ammo: 'grenades', magazine: 6, cooldown: 800, damage: 3.5, speed: 380, life: 1.4, pellets: 1, spread: 0, blast: 80, kind: 'gun'},
  pulseCarbine: { name: 'PULSE CARBINE', ammo: 'pulseCells', magazine: 55, cooldown: 70, damage: 1.20, speed: 180, life: 1.7, pellets: 1, spread: .22, pulseBlastRadius: 50, pulseKnockback: 400, kind: 'gun' },
  combatPistol: { name: 'COMBAT PISTOL', ammo: 'bulletClips', magazine: 17, cooldown: 200, damage: 1.25, speed: 100, life: 2.55, pellets: 1, spread: 0.2, beam: true, kind: 'gun' },

  // Tier 4 (Endgame)
  voidBatar: { name: 'VOID BATAR', ammo: 'voidChains', magazine: 200, cooldown: 30, damage: 0.45, speed: 400, life: 6, pellets: 1, spread: .15, voidBatarMotion: true, kind: 'gun' },
  laserBlade: { name: 'LASER BLADE', ammo: null, cooldown: 350, damage: 4.80, range: 115, meleeDuration: .36, meleeSweep: 2.5, meleeStyle: 'laserBlade', kind: 'melee' },
  magicGauntlet: { name: 'MAGIC GAUNTLET', ammo: 'magicGauntletAmmo', magazine: 14, cooldown: 100, damage: 1.30, speed: 440, life: .50, pellets: 1, spread: .50, kind: 'gun', oscillating: true, coneSize: .20 },
  railgun: { name: 'RAILGUN', ammo: 'slugs', magazine: 1, cooldown: 1200, damage: 18.00, speed: 1600, life: 1, pellets: 1, spread: 0, beam: true, kind: 'gun' },
  radBeam: { name: 'RAD BEAM', ammo: 'radCells', magazine: 8, range: 600, damage: 0.05, radiationDamage: .5, radiationTickInterval: .1, radiationDuration: 3, radiationSlowChance: .05, radiationSlowMultiplier: .85, kind: 'gun', continuousBeam: true },
  cosmosGauntlet: { name: 'COSMOS GAUNTLET', ammo: 'cosmosGauntletAmmo', magazine: 16, cooldown: 100, damage: 1.60, speed: 450, life: 0.8, pellets: 2, spread: .60, kind: 'gun', oscillating: true, coneSize: .25 }
};

// ==================== AMMO CRAFTING BATCHES ====================
const ammoCatalog = {
  pistolAmmo: { name: 'PISTOL AMMO', amount: 12, cost: { rawIron: 2, fuel: 1 } }, 
  shells: { name: 'SHOTGUN SHELLS', amount: 16, cost: { rawIron: 3, fuel: 2 } }, 
  minigunAmmo: { name: 'MINIGUN BELT', amount: 4, cost: { steel: 4, fuel: 2 } }, 
  rifleAmmo: { name: 'RIFLE AMMO', amount: 15, cost: { iron: 3, fuel: 2 } },
  marksmanAmmo: { name: 'MARKSMAN ROUNDS', amount: 10, cost: { steel: 4, crystal: 1 } },
  smgAmmo: { name: 'SMG AMMO', amount: 10, cost: { rawIron: 3, fuel: 2 } }, 
  cells: { name: 'LASER CELLS', amount: 10, cost: { crystal: 3, steel: 1 } }, 
  grenades: { name: 'GRENADE CASINGS', amount: 8, cost: { iron: 2, fuel: 4 } }, 
  slugs: { name: 'RAIL SLUGS', amount: 8, cost: { steel: 4, crystal: 2 } }, 
  fuelCells: { name: 'FLAME FUEL', amount: 8, cost: { fuel: 8, rawIron: 2 } }, 
  pulseCells: { name: 'PULSE CELLS', amount: 10, cost: { crystal: 4, steel: 2 } },
  bulletClips: { name: 'BULLET CLIPS', amount: 5, cost: { steel: 3, fuel: 1} }, 
  voidChains: {name:`VOID CHAINS`, amount:4, cost: {steel:6 , fuel:4 , crystal:3 } },
  radCells: { name: 'RAD CELLS', amount: 8, cost: { crystal: 2, fuel: 2, steel: 2 } },
  magicGauntletAmmo: { name: 'MAGIC GAUNTLET CLIPS', amount: 14, cost: {} },
  cosmosGauntletAmmo: { name: 'COSMOS GAUNTLET CLIPS', amount: 12, cost: {} }
};

// ==================== REBALANCED ENEMIES ====================
const enemyVariants = [
  { name: 'SKIRMISHER', hp: 0.60, speed: 1.3, radius: .85, damage: .8, contactDamage: 2, score: 80, drops: 1 },
  { name: 'HUNTER', hp: 1.20, speed: 1.08, radius: 1, damage: 1, contactDamage: 3, score: 110, drops: 2 },
  { name: 'TANK', hp: 8.00, speed: .58, radius: 1.65, damage: 1.8, contactDamage: 4, score: 240, drops: 3 },
  { name: 'ELITE', hp: 6.00, speed: 1.15, radius: 1.25, damage: 1.35, contactDamage: 28, score: 300, drops: 3 },
  { name: 'MINI-BOSS', hp: 25.00, speed: .78, radius: 2.15, damage: 2.5, contactDamage: 35, score: 750, drops: 5, boss: true }
];
const weaponRecipes = {
  // Tier 1 (Early Game - Basic Resources)
  sidearm: { name: 'SIDEARM', time: 3, cost: { iron: 2, wood: 2 }, weapon: 'sidearm' },
  machete: { name: 'MACHETE', time: 4, cost: { rawIron: 4, wood: 3 }, weapon: 'machete' },
  spear: { name: 'SPEAR', time: 4, cost: { rawIron: 3, wood: 5 }, weapon: 'spear' },
  smg: { name: 'SMG', time: 5, cost: { iron: 5, fuel: 2 }, weapon: 'smg' },
  duelSidearm: { name: 'DUEL SIDEARM', time: 6, cost: { iron: 4, wood: 3, sidearm: 1 }, weapon: 'duelSidearm' },

  // Tier 2 (Mid Game - Refined Metals & Fuel)
    minigun: { name: 'MINIGUN', time: 12, cost: { steel: 12, fuel: 6 }, weapon: 'minigun' },
  shotgun: { name: 'SHOTGUN', time: 8, cost: { steel: 5, wood: 4 }, weapon: 'shotgun' },
  burstRifle: { name: 'BURST RIFLE', time: 8, cost: { steel: 6, iron: 4 }, weapon: 'burstRifle' },
  flamethrower: { name: 'FLAMETHROWER', time: 9, cost: { steel: 4, fuel: 8 }, weapon: 'flamethrower' },
  warHammer: { name: 'WAR HAMMER', time: 9, cost: { steel: 6, stone: 8 }, weapon: 'warHammer' },
  sniper: { name: 'SNIPER', time: 10, cost: { steel: 8, crystal: 2 }, weapon: 'sniper' },

  // Tier 3 (Late Mid Game - High Steel & Crystal Integration)
  laser: { name: 'LASER', time: 12, cost: { steel: 6, crystal: 6 }, weapon: 'laser' },
  grenadeLauncher: { name: 'GRENADE LAUNCHER', time: 13, cost: { steel: 8, fuel: 8 }, weapon: 'grenadeLauncher' },
  pulseCarbine: { name: 'PULSE CARBINE', time: 14, cost: { steel: 10, crystal: 5 }, weapon: 'pulseCarbine' },
  combatPistol: { name: 'COMBAT PISTOL', time: 10, cost: { steel: 6, crystal: 3, wood: 4 }, weapon: 'combatPistol' },
  laserBlade: { name: 'LASER BLADE', time: 12, cost: { steel: 8, crystal: 4, relic: 1 }, weapon: 'laserBlade' },

  // Tier 4 (Endgame / Exotic - Relics & Atlas Crystals)
  
  voidBatar: { name: 'VOID BATAR', time: 18 , cost: { steel: 18, crystal: 20, relic: 2, atlasCrystal: 1, minigun: 1}, weapon: 'voidBatar' }, //void batar is going to have a special crafting component dropped by void rift mini bosses
  magicGauntlet: { name: 'MAGIC GAUNTLET', time: 12, cost: { crystal: 12, steel: 6, relic: 1 }, weapon: 'magicGauntlet' },
  railgun: { name: 'RAILGUN', time: 12, cost: { steel: 16, crystal: 8, relic: 2 }, weapon: 'railgun' },
  radBeam: { name: 'RAD BEAM', time: 18, cost: { steel: 4, fuel: 4, crystal: 8, railgun: 1, atlasCrystal: 1, relic: 2 }, weapon: 'radBeam' },
  cosmosGauntlet: { name: 'COSMOS GAUNTLET', time: 18, cost: { crystal: 16, steel: 8, relic: 2, atlasCrystal: 1, magicGauntlet: 1 }, weapon: 'cosmosGauntlet' }
};
const armorCatalog = {
  scoutArmor: { name: 'SCOUT ARMOR', moveMultiplier: 1.12, description: '+12% movement speed' },
  reinforcedArmor: { name: 'REINFORCED ARMOR', contactDamageReduction: .15, description: '-15% contact damage' },
  hazardArmor: { name: 'HAZARD ARMOR', hazardDamageReduction: .35, statusDamageReduction: .35, description: '-35% hazard and status damage' },
  voidArmor: { name: 'VOID ARMOR', voidDamageReduction: .30, description: '-30% Void projectile damage' }
};
const armorRecipes = {
  scoutArmor: { name: 'SCOUT ARMOR', time: 8, cost: { steelPlate: 2, fiber: 3 }, armor: 'scoutArmor' },
  reinforcedArmor: { name: 'REINFORCED ARMOR', time: 10, cost: { steelPlate: 4, stone: 3 }, armor: 'reinforcedArmor' },
  hazardArmor: { name: 'HAZARD ARMOR', time: 12, cost: { steelPlate: 6, fiber: 4, crystal: 2 }, armor: 'hazardArmor' },
  voidArmor: { name: 'VOID ARMOR', time: 18, cost: { steelPlate: 8, relic: 1, atlasCrystal: 1 }, armor: 'voidArmor' }
};
function getArmorEffects() { return armorCatalog[game.armor] || {}; }
const biomeEffectProfiles = [
  { healthRegen: 4, damageMultiplier: 1.1, enemySpeedMultiplier: 1.05 },
  { moveMultiplier: 1.25, damageMultiplier: 1.15, enemySpeedMultiplier: 1.05 },
  { fireCooldownMultiplier: .6, damageMultiplier: 1.1, moveMultiplier: .9 },
  { salvageMultiplier: 2.25, damageMultiplier: 1.1, enemySpeedMultiplier: 1.08 },
  { pulseCooldownMultiplier: .45, damageMultiplier: 1.15, enemySpeedMultiplier: 1.05 },
  { enemySpeedMultiplier: .65, damageMultiplier: 1.15, moveMultiplier: .9 },
  { moveMultiplier: 1.3, damageMultiplier: 1.15, enemySpeedMultiplier: 1.08 },
  { healthRegen: 3, damageMultiplier: 1.15, fireCooldownMultiplier: 1.1 },
  { salvageMultiplier: 2.5, damageMultiplier: 1.1, enemySpeedMultiplier: 1.1 },
  { fireCooldownMultiplier: .55, damageMultiplier: 1.15, moveMultiplier: .9 },
  { moveMultiplier: 1.28, damageMultiplier: 1.1, enemySpeedMultiplier: 1.08 },
  { pulseCooldownMultiplier: .4, damageMultiplier: 1.15, enemySpeedMultiplier: 1.08 },
  { enemySpeedMultiplier: .6, damageMultiplier: 1.15, moveMultiplier: .9 },
  { healthRegen: 4.5, damageMultiplier: 1.1, enemySpeedMultiplier: 1.08 },
  { salvageMultiplier: 2.25, damageMultiplier: 1.1, fireCooldownMultiplier: 1.1 },
  { fireCooldownMultiplier: .55, damageMultiplier: 1.15, moveMultiplier: .9 },
  { moveMultiplier: 1.3, damageMultiplier: 1.15, enemySpeedMultiplier: 1.1 },
  { pulseCooldownMultiplier: .4, damageMultiplier: 1.15, moveMultiplier: .9 },
  { healthRegen: 3.5, damageMultiplier: 1.15, enemySpeedMultiplier: 1.08 },
  { salvageMultiplier: 2.75, damageMultiplier: 1.1, enemySpeedMultiplier: 1.1 },
  { fireCooldownMultiplier: .5, damageMultiplier: 1.15, moveMultiplier: .9 },
  { moveMultiplier: 1.35, damageMultiplier: 1.15, enemySpeedMultiplier: 1.1 },
  { enemySpeedMultiplier: .55, damageMultiplier: 1.15, fireCooldownMultiplier: 1.1 },
  { pulseCooldownMultiplier: .35, damageMultiplier: 1.15, moveMultiplier: .9 }
];
const biomeHazards = [
  { name: 'ACID MIST', description: 'Corrosive fog drains health over time.', damagePerSecond: 1 },
  { name: 'SEARING HEAT', description: 'Extreme heat steadily burns the player.', damagePerSecond: 1.5 },
  { name: 'FLASH FREEZE', description: 'Freezing air slows movement and chips away at health.', damagePerSecond: 1.5 },
  { name: 'CHOKING ASH', description: 'Ash clouds damage the player over time.', damagePerSecond: 2 },
  { name: 'ARC LIGHTNING', description: 'Electrical storms periodically shock the player.', damagePerSecond: 1.5 },
  { name: 'ROOT SNARE', description: 'Living roots slow movement and cause minor damage.', damagePerSecond: 1.5 },
  { name: 'MIRAGE BURN', description: 'Reflected sunlight scorches the player.', damagePerSecond: 2 },
  { name: 'PERMAFROST', description: 'Biting cold slows the player and causes damage.', damagePerSecond: 1.5 },
  { name: 'BONE SPLINTERS', description: 'Jagged bone growths cut the player while moving.', damagePerSecond: 2 },
  { name: 'EMBER TIDE', description: 'Rising embers burn the player over time.', damagePerSecond: 2.5 },
  { name: 'BLACKROOT SPORES', description: 'Toxic spores weaken the player continuously.', damagePerSecond: 2 },
  { name: 'GRAVITY SURGE', description: 'Gravity waves slow movement and crush the player.', damagePerSecond: 2 },
  { name: 'THUNDERBOLTS', description: 'Citadel lightning strikes the player over time.', damagePerSecond: 2.5 },
  { name: 'BLOOD RAIN', description: 'Corrosive crimson rain damages the player.', damagePerSecond: 2 },
  { name: 'NULL COLD', description: 'Null energy freezes movement and drains health.', damagePerSecond: 2 },
  { name: 'WRAITH DRAIN', description: 'Phase-shifted spirits slowly drain vitality.', damagePerSecond: 2 },
  { name: 'DARKNESS', description: 'The lightless valley steadily saps health.', damagePerSecond: 1.5 },
  { name: 'STARFIRE', description: 'Falling stellar fire burns the player.', damagePerSecond: 3 },
  { name: 'NEBULA RADIATION', description: 'Cosmic radiation damages the player over time.', damagePerSecond: 2 },
  { name: 'PRESSURE CRUSH', description: 'Deep-space pressure steadily damages the player.', damagePerSecond: 2.5 },
  { name: 'VOID CORRUPTION', description: 'Reality tears drain health continuously.', damagePerSecond: 2.5 },
  { name: 'HORIZON PULL', description: 'Singularity tides crush the player over time.', damagePerSecond: 3 },
  { name: 'STAR COLLAPSE', description: 'A dying star radiates lethal heat.', damagePerSecond: 3 },
  { name: 'ENDLESS VOID', description: 'The infinite dark steadily consumes health.', damagePerSecond: 3.5 }
];
const hazardVisuals = ['acid-pool', 'fire-crater', 'ice-spikes', 'ash-vent', 'lightning-pylon', 'root-patch', 'glass-shards', 'frost-rift', 'bone-pile', 'ember-pool', 'spore-ring', 'gravity-well', 'storm-pylon', 'blood-pool', 'null-ice', 'wraith-rift', 'shadow-patch', 'starfire-crater', 'nebula-cloud', 'pressure-ring', 'void-rift', 'horizon-well', 'star-core', 'dark-pool'];
const enemyFamilies = [
  ['MIRE CRAWLER', null, null], ['CINDER HOUND', null, null], ['ICE MAW', null, null], ['ASH STALKER', null, null],
  ['THUNDER RAM', 'STRAIGHT DASH', 'dash'], ['IRONWOOD TREANT', 'DAMAGE NEGATION', 'damage-ignore'], ['MIRAGE WRAITH', 'BURNING DEATH BURST', 'death-burn'], ['FROSTBURROWER', 'FREEZING AURA', 'slow-aura'],
  ['BONE HARVESTER', 'BONE SHARD BURST', 'damage-burst'], ['EMBER SERPENT', 'DEATHBOUND FIREBALLS', 'death-fireballs'], ['SPORE BRUTE', 'BRAMBLE SNARE', 'bramble'], ['GRAVITY LEECH', 'GRAVITY WELL', 'gravity-fields-pull'],
  ['STORM KNIGHT', 'LIGHTNING SWORD', 'storm-sword'], ['BLOOD HUNTER', 'BLOOD TRAIL', 'damage-trail'], ['NULL PHANTOM', 'NULL EXPLOSION', 'death-explosion'], ['WRAITH EATER', 'WRAITH PEST', 'spawn-pest'],
  ['DUSK STAG', 'DECAY DASH', 'decay-dash'], ['STARFIRE GOLEM', 'LINGERING FIRE', 'fire-explosion'], ['NEBULA SWARM', 'NEBULA MISSILES', 'nebula-missiles'], ['PRESSURE TITAN', 'ARC PROJECTILES', 'arc-projectiles'],
  ['VOID CRAWLER', 'RIFT PORTAL', 'rift-portal'], ['HORIZON DEVOURER', 'PROJECTILE BLINK', 'projectile-teleport'], ['STAR EATER', 'DEATH EXPLOSION', 'dead-star-explosion'], ['ENDLESS SHADE', 'DARK SPIN', 'spin-attack']
];
const sectorOneMiniBossAbilities = [
  { ability: 'TOXIC BURST', effect: 'toxic-boss-burst' },
  { ability: 'SCORCHED SHOT', effect: 'scorched-boss-shot' },
  { ability: 'FROZEN AURA', effect: 'frozen-boss-aura' },
  { ability: 'ASHEN AURA', effect: 'ashen-boss-aura' }
];
const sectorOneBossAuraRadius = 150;
const sectorTwoMiniBossAbilities = [
  { ability: 'THUNDER CHARGE', effect: 'thunder-boss-aura' },
  { ability: 'IRONWOOD SHIELD', effect: 'ironwood-boss-shield' },
  { ability: 'MIRAGE EXCHANGE', effect: 'glass-boss-teleport-shot' },
  { ability: 'FROST AURA SHOT', effect: 'frost-boss-projectile' }
];
const sectorTwoBossAuraRadius = 150;
const sectorThreeMiniBossAbilities = [
  { ability: 'BONE BURST', effect: 'bone-boss-burst' },
  { ability: 'EMBER VOLLEY', effect: 'ember-boss-volley' },
  { ability: 'ORBITING BRAMBLES', effect: 'blackroot-boss-brambles' },
  { ability: 'GRAVITY AURA', effect: 'gravity-boss-aura' }
];
const sectorThreeBossAuraRadius = 250;
const blackrootBossBrambleLength = 110;
const blackrootBossBrambleRadius = 14;
const sectorFourMiniBossAbilities = [
  { ability: 'STORM STRIKE', effect: 'storm-boss-strikes' },
  { ability: 'CRIMSON TRAIL SHOTS', effect: 'crimson-boss-trails' },
  { ability: 'NULL ICE LANE', effect: 'null-boss-lane' },
  { ability: 'WRAITH GUARD', effect: 'wraith-boss-guards' }
];
const nullBossLaneLength = 250;
const nullBossLaneWidth = 50;
const sectorFiveMiniBossAbilities = [
  { ability: 'DECAY VOLLEY', effect: 'sunless-boss-volley' },
  { ability: 'STARFIRE PIERCE', effect: 'starfire-boss-pierce' },
  { ability: 'NEBULA SALVO', effect: 'nebula-boss-salvo' },
  { ability: 'ABYSSAL WAVE', effect: 'abyssal-boss-wave' }
];
const abyssalBossWaveMaxRadius = 240;
const sectorSixMiniBossAbilities = [
  { ability: 'RIFT SPAWN VOLLEY', effect: 'rift-boss-volley' },
  { ability: 'SINGULARITY SHOT', effect: 'horizon-boss-singularity' },
  { ability: 'DEAD STAR AURA', effect: 'dead-star-boss-aura' },
  { ability: 'INFINITE CHARGE', effect: 'dark-boss-charge' }
];
const deadStarBossAuraRadius = 250;
const darkBossDashCircleRadius = 38;

sectorRegions.flat().forEach((biome, index) => { biome.effects = { moveMultiplier: 1, damageMultiplier: 1, enemySpeedMultiplier: 1, fireCooldownMultiplier: 1, pulseCooldownMultiplier: 1, healthRegen: 0, salvageMultiplier: 1, hazard: { ...biomeHazards[index], visual: hazardVisuals[index], zoneDamagePerSecond: biomeHazards[index].damagePerSecond }, ...biomeEffectProfiles[index] }; });
sectorRegions.flat().forEach((biome, index) => { const family = enemyFamilies[index]; biome.enemyFamily = { name: family[0], ability: family[1], effect: family[2] }; });
function hasEnemyEffect(enemy, effect) {
  return enemy.effect === effect || enemy.familyEffect === effect;
}
function seededRandom(seed) { let value = seed >>> 0; return () => { value = (value * 1664525 + 1013904223) >>> 0; return value / 4294967296; }; }
function randomizeBiomeData(seed) { const random = seededRandom(seed); const positives = [() => ({ healthRegen: 3 + random() * 3 }), () => ({ moveMultiplier: 1.15 + random() * .25 }), () => ({ fireCooldownMultiplier: .55 + random() * .2 }), () => ({ pulseCooldownMultiplier: .35 + random() * .2 }), () => ({ salvageMultiplier: 1.75 + random() * 1.25 }), () => ({ enemySpeedMultiplier: .55 + random() * .2 })]; const negatives = [() => ({ damageMultiplier: 1.05 + random() * .1 }), () => ({ enemySpeedMultiplier: 1.05 + random() * .1 }), () => ({ moveMultiplier: .88 + random() * .07 }), () => ({ fireCooldownMultiplier: 1.05 + random() * .1 }), () => ({ pulseCooldownMultiplier: 1.05 + random() * .1 })]; sectorRegions.flat().forEach((biome, index) => { const positive = positives[Math.floor(random() * positives.length)](); const firstNegative = negatives[Math.floor(random() * negatives.length)](); const secondNegative = negatives[Math.floor(random() * negatives.length)](); const hazard = biome.effects.hazard; const sectorHazardMultiplier = .35 + Math.floor(index / 4) * .23; biome.effects = { moveMultiplier: 1, damageMultiplier: 1, enemySpeedMultiplier: 1, fireCooldownMultiplier: 1, pulseCooldownMultiplier: 1, healthRegen: 0, salvageMultiplier: 1, hazard: { ...hazard, damagePerSecond: biomeHazards[index].damagePerSecond * sectorHazardMultiplier, zoneDamagePerSecond: 3.5 + random() * 3 }, ...positive, ...firstNegative, ...secondNegative }; Object.assign(biome.effects, positive); if (index % 2 === 0) biome.effects.hazard.zoneDamagePerSecond += 1; }); }
function createSanctuaryTurrets() {
  const weaponKeys = Object.keys(beaconTurretWeapons);
  return Array.from({ length: sanctuaryTurretCount }, (_, index) => {
    const angle = -Math.PI / 2 + index * Math.PI * 2 / sanctuaryTurretCount;
    return {
      x: Math.cos(angle) * beaconRegionRadius,
      y: Math.sin(angle) * beaconRegionRadius,
      weapon: weaponKeys[Math.floor(Math.random() * weaponKeys.length)],
      cooldown: 0,
      angle: angle + Math.PI
    };
  });
}
function createBeaconStations() {
  return Array.from({ length: 4 }, (_, index) => {
    const id = `sector4-${index}`;
    const angle = Math.PI / 4 + index * Math.PI / 2;
    const x = Math.cos(angle) * beaconStationRingRadius;
    const y = Math.sin(angle) * beaconStationRingRadius;
    const random = seededRandom(4104 + index * 7919);
    const repairCost = {
      fuel: 50 + Math.floor(random() * 51),
      steel: 100 + Math.floor(random() * 51),
      crystal: 20 + Math.floor(random() * 31),
      wood: 100 + Math.floor(random() * 101),
      stone: 25 + Math.floor(random() * 51),
      iron: 50 + Math.floor(random() * 26)
    };
    const station = {
      id,
      x,
      y,
      radius: beaconStationRadius,
      repairCost,
      repaired: false,
      turrets: [],
      modules: Object.fromEntries(Object.keys(beaconModuleDefinitions).map(key => [
        key,
        0
      ])),
      pulseTimer: 3,
    };
    return station;
   });
}
let game = freshGame();
function freshGame() {
  const stationItems = { medkit: 1 };
  return { 
    active: false,
    paused: false,
    seed: Math.floor(Math.random() * 4294967296), 
    score: 0, 
    high: Number(localStorage.getItem('horde-high') || 0), 
    wave: 1, 
    currentSector: 0, 
    health: 100, 
    ammo: clipSize, 
    weaponAmmo: { sidearm: clipSize },
    ammoReserve: { pistolAmmo: startingAmmoReserve * clipSize, magicGauntletAmmo: 6, cosmosGauntletAmmo: 6 }, 
    radBeamActive: false,
    radBeamDrainTimer: 0,
    weapon: 'sidearm',
    weaponSlots: ['sidearm', null, null, null],
    armor: null,
    unlockedWeapons: { sidearm: true }, 
    reloadPending: false, 
    weaponReloadPending: {},
    salvage: 0,
    relics: 0,
    atlasCrystals: 0,
    banked: 0, 
    vault: {},
    inventory: Object.fromEntries(resourceTypes.map(resource => [resource.key, 0])), 
    stationItems, 
    crafting: null, 
    stationOpen: null, 
    activeBeaconStationId: null,
    beaconStations: createBeaconStations(),
    sanctuaryTurrets: createSanctuaryTurrets(),
    craftedStations: { workbench: 1, furnace: 1 },
    startingStationsGranted: true,
    placedStations: [],
    managerMode: false,
    enemies: [], 
    bullets: [],
    beams: [],
    projectiles: [], 
    explosions: [],
    portals: [],
    enemyTrails: [],
    toxicBossZones: [],
    abyssalBossWaves: [],
    darkBossDashCircles: [],
    sparks: [], 
    gems: [], 
    drops: [], 
    nodes: [], 
    hazardZones: [],
    brambleZones: [],
    lightningStrikes: [],
    discovered: new Set(['sanctuary']), 
    player: { x: 0, y: 0, angle: 0 }, 
    spawnTimer: 0, 
    voidSpawnTimer: 0, 
    fireTimer: 0, 
    meleeAttack: null,
    pulseTimer: 0, 
    attackDisabledTimer: 0,
    decayTimer: 0,
    magicGauntletRechargeTimer: 5, 
    cosmosGauntletRechargeTimer: 6, 
    biomeKey: null, 
    biomeName: null,
    announcementTimer: 0, 
    camera: { x: 0, y: 0 } 
  };
}
ui.high.textContent = String(game.high).padStart(6, '0');
renderWeaponBar();
function resize() { const ratio = window.devicePixelRatio || 1; canvas.width = canvas.clientWidth * ratio; canvas.height = canvas.clientHeight * ratio; ctx.setTransform(ratio, 0, 0, ratio, 0, 0); if (!game.active) game.player = { x: canvas.clientWidth / 2, y: canvas.clientHeight / 2, angle: 0 }; resizeMapCanvas(); }
window.addEventListener('resize', resize); resize();
window.addEventListener('keydown', event => {
  if (game.managerMode) {
    if (event.key === 'Escape' && !event.repeat) exitManagersTable();
    event.preventDefault();
    return;
  }
  if (mapOpen) {
    event.preventDefault();
    if (!event.repeat && (event.key.toLowerCase() === 'm' || event.key === 'Escape')) {
      setMapOpen(false);
    }
    return;
  }
  if (event.key.toLowerCase() === 'm') {
    if (game.active && !event.repeat) {
      event.preventDefault();
      setMapOpen(true);
    }
    return;
  }
  if (event.key === 'Escape') { event.preventDefault(); if (!event.repeat) togglePause(); return; }
  keys[event.key.toLowerCase()] = true;
  if (event.key === adminUnlockSequence[adminUnlockIndex]) {
    adminUnlockIndex++;
    if (adminUnlockIndex === adminUnlockSequence.length) {
      adminUnlockIndex = 0;
      const code = window.prompt('ADMIN ACCESS CODE');
      if (code === 'iAmAdmin') { adminMode = true; adminPanel.hidden = false; gameLog('INFO', 'Admin panel unlocked'); }
      else { gameLog('WARN', 'Admin access denied'); }
    }
  } else { adminUnlockIndex = event.key === adminUnlockSequence[0] ? 1 : 0; }
  if (event.key.toLowerCase() === 'j' && game.active && !game.paused && !event.repeat) cycleTacticalMapZoom();
  if (event.key.toLowerCase() === 'e' && game.active && !game.paused && !event.repeat) toggleStation();
  if (event.key === ' ' && game.active && !game.paused) shoot();
  if (event.key.toLowerCase() === 'h' && game.active && !game.paused && !event.repeat) useMedkit();
  if (event.key.toLowerCase() === 'q' && game.active && !game.paused) pulse();
  if (game.active && !game.paused && !event.repeat && /^[0-9]$/.test(event.key)) switchWeapon(Number(event.key));
});
window.addEventListener('keyup', event => { if (!mapOpen && !game.managerMode) keys[event.key.toLowerCase()] = false; });
canvas.addEventListener('pointermove', event => { const box = canvas.getBoundingClientRect(); pointer.x = event.clientX - box.left; pointer.y = event.clientY - box.top; crosshair.style.left = `${pointer.x}px`; crosshair.style.top = `${pointer.y}px`; });
canvas.addEventListener('pointerdown', event => {
  if (game.managerMode) {
    beginPlacedStationDrag(event);
    return;
  }
  pointer.down = true;
  if (game.active && !game.paused) shoot();
});
window.addEventListener('pointerup', event => {
  pointer.down = false;
  game.radBeamActive = false;
  if (game.managerMode && managerDrag) finishManagerDrag(event);
});
ui.managerInventory?.addEventListener('pointerdown', event => {
  const item = event.target.closest('[data-manager-item]');
  if (!game.managerMode || !item || item.disabled) return;
  event.preventDefault();
  managerDrag = { source: 'inventory', type: item.dataset.managerItem };
});
document.querySelector('#manager-exit')?.addEventListener('click', exitManagersTable);
function getMapWorldPosition(event) {
  const rect = mapCanvas.getBoundingClientRect();
  const scale = getTacticalMapScale();
  const center = getMapCenter();
  return {
    x: ((event.clientX - rect.left) * mapCanvas.width / rect.width - mapCanvas.width / 2) / scale + center.x,
    y: ((event.clientY - rect.top) * mapCanvas.height / rect.height - mapCanvas.height / 2) / scale + center.y
  };
}
function isAtFastTravelHub() {
  return Math.hypot(game.player.x, game.player.y) < beaconRegionRadius
    || Boolean(getNearbyBeaconStation()?.repaired);
}
mapCanvas.addEventListener('pointermove', event => {
  if (!mapOpen) return;
  const { x, y } = getMapWorldPosition(event);
  const biome = getBiome(x, y);
  const biomeKey = getDiscoveryKey(x, y);
  mapBiomeName.textContent = game.discovered.has(biomeKey) ? biome.name : 'UNDISCOVERED';
});
mapCanvas.addEventListener('click', event => {
  if (!mapOpen || !isAtFastTravelHub() || event.button !== 0) return;
  const { x, y } = getMapWorldPosition(event);
  const scale = getTacticalMapScale();
  const station = game.beaconStations.find(candidate =>
    candidate.repaired
      && Math.hypot(x - candidate.x, y - candidate.y) <= candidate.radius + 10 / scale
  );
  if (station) {
    if (getNearbyBeaconStation() === station) return;
    teleportPlayer(station.x, station.y);
  } else if (Math.hypot(x, y) <= beaconRegionRadius) {
    if (Math.hypot(game.player.x, game.player.y) < beaconRegionRadius) return;
    teleportPlayer(0, 0);
  } else {
    return;
  }
  game.stationOpen = null;
  game.activeBeaconStationId = null;
  updateStationUI();
});
mapCanvas.addEventListener('pointerleave', () => { mapBiomeName.textContent = ''; });
function readSaveSlots() {
  try {
    const savedSlots = JSON.parse(localStorage.getItem(saveSlotsKey) || '[]');
    return Array.from({ length: saveSlotCount }, (_, index) => savedSlots[index] || null);
  } catch (error) {
    gameLog('ERROR', 'Unable to read save slots', error.message);
    return Array(saveSlotCount).fill(null);
  }
}
function writeSaveSlots(slots) {
  localStorage.setItem(saveSlotsKey, JSON.stringify(slots));
}
function formatSaveTime(timestamp) {
  if (!timestamp) return 'EMPTY SLOT';
  return new Date(timestamp).toLocaleString();
}
function renderSaveSlots(mode) {
  saveSlotsTitle.textContent = mode === 'new' ? 'SELECT SLOT FOR NEW GAME' : 'SELECT SAVE TO LOAD';
  saveSlotList.innerHTML = readSaveSlots().map((slot, index) => {
    const details = slot ? `SECTOR ${slot.sector || 1} // ${formatSaveTime(slot.timestamp)}` : 'EMPTY SLOT';
    const action = mode === 'new' ? 'new-slot' : 'load-slot';
    const deleteButton = slot ? `<button type="button" class="save-delete" data-save-action="delete-slot" data-save-slot="${index}" aria-label="Delete save slot ${index + 1}">DELETE</button>` : '';
    return `<div class="save-slot-row"><button type="button" class="menu-button save-slot" data-save-action="${action}" data-save-slot="${index}" ${mode === 'load' && !slot ? 'disabled' : ''}><strong>SLOT ${index + 1}</strong><small>${details}</small></button>${deleteButton}</div>`;
  }).join('');
  mainMenu.classList.add('hidden');
  saveSlotsPanel.classList.remove('hidden');
}
function showMainMenu() {
  saveSlotsPanel.classList.add('hidden');
  howToPlay.classList.add('hidden');
  mainMenu.classList.remove('hidden');
  const lastSlot = Number(localStorage.getItem(lastSaveSlotKey));
  continueButton.disabled = !Number.isInteger(lastSlot) || !readSaveSlots()[lastSlot];
}
function showHowToPlay() {
  mainMenu.classList.add('hidden');
  saveSlotsPanel.classList.add('hidden');
  howToPlay.classList.remove('hidden');
}
function returnToMainMenu() {
  if (game.active && currentSaveSlot !== null && !saveGame()) return;
  game.active = false;
  game.paused = false;
  game.managerMode = false;
  gameShell.classList.remove('manager-view');
  ui.manager.hidden = true;
  managerDrag = null;
  pointer.down = false;
  game.radBeamActive = false;
  setMapOpen(false);
  ui.pause.classList.add('hidden');
  ui.over.classList.add('hidden');
  ui.start.classList.remove('hidden');
  gameShell.classList.add('menu-state');
  showMainMenu();
}
function serializeGame() {
  const seen = new WeakSet();
  return JSON.stringify(game, (_, value) => {
    if (value instanceof Set) {
      return { __saveType: 'Set', values: [...value] };
    }
    if (value && typeof value === 'object') {
      if (seen.has(value)) return undefined;
      seen.add(value);
    }
    return value;
  });
}
function restoreGame(savedState) {
  const parsed = JSON.parse(savedState, (_, value) => value?.__saveType === 'Set' ? new Set(value.values) : value);
  const restored = { ...freshGame(), ...parsed };
  restored.active = true;
  restored.paused = false;
  restored.managerMode = false;
  restored.craftedStations = {
    workbench: Math.max(0, Math.floor(Number(parsed.craftedStations?.workbench) || 0)),
    furnace: Math.max(0, Math.floor(Number(parsed.craftedStations?.furnace) || 0))
  };
  restored.startingStationsGranted = parsed.startingStationsGranted === true;
  if (!restored.startingStationsGranted) {
    restored.craftedStations.workbench++;
    restored.craftedStations.furnace++;
    restored.startingStationsGranted = true;
  }
  restored.placedStations = Array.isArray(restored.placedStations)
    ? restored.placedStations.filter(station => station
      && ['workbench', 'furnace'].includes(station.type)
      && Number.isFinite(station.x) && Number.isFinite(station.y))
    : [];
  restored.discovered = restored.discovered instanceof Set ? restored.discovered : new Set(restored.discovered || ['sanctuary']);
  restored.bullets?.forEach(bullet => { if (Array.isArray(bullet.hitEnemies)) bullet.hitEnemies = new Set(bullet.hitEnemies); });
  return restored;
}
function saveGame(slot = currentSaveSlot) {
  if (!game.active || slot === null || slot < 0 || slot >= saveSlotCount) return false;
  try {
    const slots = readSaveSlots();
    slots[slot] = {
      timestamp: Date.now(),
      sector: game.currentSector || 1,
      state: serializeGame()
    };
    writeSaveSlots(slots);
    currentSaveSlot = slot;
    localStorage.setItem(lastSaveSlotKey, String(slot));
    gameLog('INFO', `Game saved to slot ${slot + 1}`);
    return true;
  } catch (error) {
    gameLog('ERROR', `Unable to save slot ${slot + 1}`, error.message);
    return false;
  }
}
function loadSave(slot) {
  const saved = readSaveSlots()[slot];
  if (!saved?.state) return;
  try {
    currentSaveSlot = slot;
    start(saved.state, slot);
  } catch (error) {
    gameLog('ERROR', `Unable to load save slot ${slot + 1}`, error.message);
  }
}
function handleMenuAction(action) {
  if (action === 'new') renderSaveSlots('new');
  if (action === 'load') renderSaveSlots('load');
  if (action === 'how-to-play') showHowToPlay();
  if (action === 'continue') {
    const slot = Number(localStorage.getItem(lastSaveSlotKey));
    if (Number.isInteger(slot) && readSaveSlots()[slot]) loadSave(slot);
    else renderSaveSlots('load');
  }
  if (action === 'back') showMainMenu();
  if (action === 'back-from-help') showMainMenu();
}
document.querySelectorAll('[data-menu-action]').forEach(button => button.addEventListener('click', () => handleMenuAction(button.dataset.menuAction)));
saveSlotsPanel.querySelector('[data-menu-action="back"]').addEventListener('click', event => {
  event.preventDefault();
  event.stopPropagation();
  showMainMenu();
});
saveSlotList.addEventListener('click', event => {
  const button = event.target.closest('[data-save-action]');
  if (!button) return;
  const slot = Number(button.dataset.saveSlot);
  if (button.dataset.saveAction === 'delete-slot') {
    if (!window.confirm(`Delete save slot ${slot + 1}? This cannot be undone.`)) return;
    const slots = readSaveSlots();
    slots[slot] = null;
    writeSaveSlots(slots);
    if (Number(localStorage.getItem(lastSaveSlotKey)) === slot) localStorage.removeItem(lastSaveSlotKey);
    renderSaveSlots(saveSlotsTitle.textContent.includes('NEW GAME') ? 'new' : 'load');
    return;
  }
  if (button.dataset.saveAction === 'new-slot') {
    if (readSaveSlots()[slot] && !window.confirm(`Overwrite save slot ${slot + 1}?`)) return;
    currentSaveSlot = slot;
    start();
  } else {
    loadSave(slot);
  }
});
saveButton?.addEventListener('click', () => {
  if (currentSaveSlot === null) {
    togglePause();
    renderSaveSlots('new');
    ui.start.classList.remove('hidden');
    gameShell.classList.add('menu-state');
    return;
  }
  saveGame();
  saveButton.textContent = 'GAME SAVED';
  window.setTimeout(() => { saveButton.textContent = 'SAVE GAME'; }, 1200);
});
mainMenuButton?.addEventListener('click', returnToMainMenu);
showMainMenu();
document.querySelector('#restart-button').onclick = start; adminPanel.hidden = !adminMode; adminPanel.querySelectorAll('[data-admin]').forEach(button => button.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); adminAction(button.dataset.admin, button.dataset.value); })); document.querySelectorAll('[data-craft]').forEach(button => button.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); openCraftDetails(button.dataset.craft); })); ui.craftDetails.addEventListener('click', event => { const closeButton = event.target.closest('[data-close-details]'); if (closeButton) { event.preventDefault(); event.stopPropagation(); ui.craftDetails.hidden = true; ui.craftDetails.innerHTML = ''; return; } const quantityButton = event.target.closest('[data-craft-quantity]'); if (quantityButton) { event.preventDefault(); event.stopPropagation(); openCraftDetails(ui.craftDetails.dataset.recipeKey, Number(quantityButton.dataset.craftQuantity), Number(ui.craftDetails.dataset.weaponSlot || 0)); return; } const craftButton = event.target.closest('[data-craft-confirm]'); if (craftButton) { event.preventDefault(); event.stopPropagation(); craftItem(craftButton.dataset.craftConfirm, Number(ui.craftDetails.dataset.quantity || 1), Number(ui.craftDetails.dataset.weaponSlot || 0)); } });
ui.weaponBar?.addEventListener('click', event => { const slotButton = event.target.closest('[data-weapon-slot]'); if (!slotButton) return; switchWeapon(Number(slotButton.dataset.weaponSlot)); });
ui.craftDetails.addEventListener('click', event => { const slotButton = event.target.closest('[data-craft-slot]'); if (!slotButton) return; event.preventDefault(); event.stopPropagation(); openCraftDetails(ui.craftDetails.dataset.recipeKey, Number(ui.craftDetails.dataset.quantity || 1), Number(slotButton.dataset.craftSlot)); });
function adminAction(action, value) { if (!game.active) start(); if (action === 'sector') teleportToSector(Number(value)); if (action === 'spawn') for (let i = 0; i < 20; i++) spawn(); if (action === 'refill') { game.health = 100; game.ammo = clipSize; game.ammoReserve.pistolAmmo = startingAmmoReserve * clipSize; game.ammoReserve.magicGauntletAmmo = 6; game.cosmosGauntletRechargeTimer = 6; game.magicGauntletRechargeTimer = 5; game.salvage = 0; game.relics = 0; } if (action === 'reset') { teleportPlayer(0, 0); game.enemies = []; game.bullets = []; game.discovered = new Set(['sanctuary']); game.biomeKey = null; } }
const baseAdminAction = adminAction;
adminAction = function(action, value) {
  if (action !== 'grant') return baseAdminAction(action, value);
  if (!game.active) start();
  resourceTypes.forEach(resource => { game.vault[resource.key] = (game.vault[resource.key] || 0) + 100; });
  game.relics += 10;
  game.atlasCrystals += 5;
  localStorage.setItem('horde-vault', JSON.stringify(game.vault));
  localStorage.setItem('horde-relics', game.relics);
  localStorage.setItem('horde-atlas-crystals', game.atlasCrystals);
  updateInventoryUI();
  updateAmmoUI();
  ui.stationOutput.textContent = 'ADMIN GRANT // MATERIALS +100 // RELICS +10 // ATLAS +5';
};
function getBiomeSector(distance) { return biomeBoundaries.findIndex(boundary => distance < boundary) === -1 ? sectorRegions.length - 1 : biomeBoundaries.findIndex(boundary => distance < boundary); }
function teleportToSector(sector) { const start = sector > 1 ? biomeBoundaries[sector - 2] : 0; const end = biomeBoundaries[sector - 1] || mapRadius; teleportPlayer((start + end) / 2, 0); game.currentSector = sector; game.discovered.add(getSectorKey(sector - 1)); }
function teleportPlayer(x, y) { game.player.x = x; game.player.y = y; game.camera.x = x; game.camera.y = y; game.biomeKey = null; game.biomeName = null; }
function start(savedState = null, slot = currentSaveSlot) {
  setMapOpen(false);
  game = savedState ? restoreGame(savedState) : freshGame();
  gameShell.classList.remove('manager-view');
  ui.manager.hidden = true;
  managerDrag = null;
  currentSaveSlot = slot;
  game.active = true;
  if (!savedState) {
    randomizeBiomeData(game.seed);
    game.hazardZones = generateHazardZones();
    game.enemies.push(createVoidStalker());
    const random = seededRandom(game.seed + 17);
    for (let i = 0; i < 140; i++) {
      const roll = random();
      game.nodes.push({ x: (random() - .5) * mapRadius * 2, y: (random() - .5) * mapRadius * 1.5, type: roll < .08 ? 'relic' : roll < .54 ? 'chest' : 'scrap', taken: false });
    }
  } else {
    game.hazardZones = generateHazardZones();
  }
  updateInventoryUI();
  updateStationButtons();
  gameShell.classList.remove('menu-state');
  resize();
  ui.start.classList.add('hidden');
  ui.over.classList.add('hidden');
  ui.pause.classList.add('hidden');
  lastTime = performance.now();
  cancelAnimationFrame(animation);
  animation = requestAnimationFrame(loop);
}
function togglePause() { if (!game.active) return; game.paused = !game.paused; keys.w = false; keys.a = false; keys.s = false; keys.d = false; pointer.down = false; game.radBeamActive = false; ui.pause.classList.toggle('hidden', !game.paused); }
function switchWeapon(index) {
  const weaponId = game.weaponSlots[index - 1];
  if (!weaponId || !game.unlockedWeapons[weaponId]) return;

  if (game.weapon !== weaponId) {
    game.weaponAmmo[game.weapon] = game.ammo;
    game.weaponReloadPending[game.weapon] = game.reloadPending;
    game.weapon = weaponId;
    game.ammo = game.weaponAmmo[weaponId] ?? 0;
    game.reloadPending = game.weaponReloadPending[weaponId] ?? (weaponCatalog[weaponId].kind !== 'melee');
  }

  game.radBeamActive = false;
  game.radBeamDrainTimer = 0;
  updateAmmoUI();
  renderWeaponBar();
}
function renderWeaponBar() { if (!ui.weaponBar) return; ui.weaponBar.innerHTML = game.weaponSlots.map((weaponId, index) => { const weapon = weaponId ? weaponCatalog[weaponId] : null; return `<button type="button" class="weapon-slot ${weaponId === game.weapon ? 'selected' : ''}" data-weapon-slot="${index + 1}" title="${weapon ? weapon.name : 'EMPTY SLOT'}"><b>${index + 1}</b><span>${weapon ? weapon.name : 'EMPTY'}</span></button>`; }).join(''); }
function addExplosion(x, y, radius, color = '#ff725e') {
  game.explosions.push({
    x,
    y,
    radius,
    maxRadius: radius,
    life: 0.25,      // Duration of visual effect in seconds
    maxLife: 0.25,
    color
  });
  burst(x, y, 30, 250); // Optional: keep particle sparks for extra punch
}
function meleeAttack(weapon) {
  game.meleeAttack = {
    weaponId: game.weapon,
    angle: game.player.angle,
    elapsed: 0,
    duration: weapon.meleeDuration,
    previousProgress: 0,
    hitEnemies: new Set()
  };
}
function getMeleeAttackPose(attack) {
  const weapon = weaponCatalog[attack.weaponId];
  const progress = Math.min(1, attack.elapsed / attack.duration);
  if (weapon.meleeStyle === 'spear') {
    return { style: 'spear', progress, angle: attack.angle, length: 32 + (weapon.range - 32) * Math.sin(progress * Math.PI) };
  }
  const centerOffset = (progress - .5) * weapon.meleeSweep;
  return {
    style: weapon.meleeStyle,
    progress,
    angle: attack.angle + centerOffset,
    centerOffset,
    range: weapon.range
  };
}
function pointSegmentDistance(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;
  const projection = lengthSquared ? Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSquared)) : 0;
  return Math.hypot(px - (x1 + projection * dx), py - (y1 + projection * dy));
}
function updateMeleeAttack(dt) {
  const attack = game.meleeAttack;
  if (!attack) return;

  const weapon = weaponCatalog[attack.weaponId];
  attack.elapsed = Math.min(attack.duration, attack.elapsed + dt);
  const pose = getMeleeAttackPose(attack);
  game.enemies.forEach(enemy => {
    if (enemy.defeated || enemy.shieldTimer > 0 || attack.hitEnemies.has(enemy)) return;
    const dx = enemy.x - game.player.x;
    const dy = enemy.y - game.player.y;
    const distance = Math.hypot(dx, dy);
    let hit = false;

    if (pose.style === 'spear') {
      const startX = game.player.x + Math.cos(pose.angle) * 18;
      const startY = game.player.y + Math.sin(pose.angle) * 18;
      const endX = game.player.x + Math.cos(pose.angle) * (18 + pose.length);
      const endY = game.player.y + Math.sin(pose.angle) * (18 + pose.length);
      hit = pointSegmentDistance(enemy.x, enemy.y, startX, startY, endX, endY) <= enemy.r + 10;
    } else if (distance > 0 && distance <= pose.range + enemy.r) {
      const previousOffset = (attack.previousProgress - .5) * weapon.meleeSweep;
      const sweepCenter = attack.angle + (previousOffset + pose.centerOffset) / 2;
      const sweepHalfAngle = Math.abs(pose.centerOffset - previousOffset) / 2;
      const enemyAngle = Math.atan2(dy, dx);
      const angleDifference = Math.atan2(Math.sin(enemyAngle - sweepCenter), Math.cos(enemyAngle - sweepCenter));
      const hitboxPadding = Math.asin(Math.min(1, (enemy.r + 12) / distance));
      hit = distance >= 18 && Math.abs(angleDifference) <= sweepHalfAngle + hitboxPadding;
    }

    if (!hit) return;
    attack.hitEnemies.add(enemy);
    enemy.hp = Math.max(0, enemy.hp - weapon.damage * getPlayerDamageMultiplier());
    if (enemy.hp <= 0) defeatEnemy(enemy);
    burst(enemy.x, enemy.y, 5, 100);
  });

  attack.previousProgress = pose.progress;
  if (attack.elapsed >= attack.duration) game.meleeAttack = null;
}
function drawMeleeWeapon(attack, weapon) {
  const pose = attack ? getMeleeAttackPose(attack) : { style: weapon.meleeStyle, angle: game.player.angle, length: 34, range: weapon.range };
  const relativeAngle = pose.angle - game.player.angle;
  ctx.save();
  ctx.rotate(relativeAngle);
  ctx.lineCap = 'round';

  if (pose.style === 'spear') {
    const end = 18 + pose.length;
    ctx.strokeStyle = '#c88968';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(end, 0);
    ctx.stroke();
    ctx.fillStyle = '#d7d0c8';
    ctx.beginPath();
    ctx.moveTo(end + 10, 0);
    ctx.lineTo(end - 2, -5);
    ctx.lineTo(end - 2, 5);
    ctx.closePath();
    ctx.fill();
  } else {
    const start = 22;
    const end = pose.range;
    const color = pose.style === 'laserBlade' ? '#b9f4ff' : pose.style === 'warHammer' ? '#b9b0a8' : '#d7d0c8';
    ctx.strokeStyle = color;
    ctx.lineWidth = pose.style === 'warHammer' ? 9 : pose.style === 'laserBlade' ? 6 : 5;
    if (pose.style === 'laserBlade') {
      ctx.shadowBlur = 14;
      ctx.shadowColor = '#6feaff';
    }
    ctx.beginPath();
    ctx.moveTo(start, 0);
    ctx.lineTo(end, 0);
    ctx.stroke();
    if (pose.style === 'warHammer') {
      ctx.fillStyle = '#77716c';
      ctx.fillRect(end - 4, -11, 20, 22);
    }
    if (pose.style === 'laserBlade') {
      ctx.globalAlpha = .55;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(start, -3);
      ctx.lineTo(end, -3);
      ctx.stroke();
    }
  }
  ctx.restore();
}
function fireBeam(weapon) {
  const { x, y, angle } = game.player;
  const startX = x + Math.cos(angle) * 20;
  const startY = y + Math.sin(angle) * 20;
  const length = weapon.speed * weapon.life;
  const directionX = Math.cos(angle);
  const directionY = Math.sin(angle);

  game.beams.push({
    x: startX,
    y: startY,
    angle,
    length,
    life: .2,
    maxLife: .2,
    color: weapon.name === 'RAILGUN' ? '#b9f4ff' : '#75eaff'
  });

  game.enemies.forEach(enemy => {
    if (enemy.defeated || enemy.shieldTimer > 0 || !enemy.hp) return;

    const relativeX = enemy.x - startX;
    const relativeY = enemy.y - startY;
    const alongBeam = Math.max(0, Math.min(length, relativeX * directionX + relativeY * directionY));
    const closestX = startX + directionX * alongBeam;
    const closestY = startY + directionY * alongBeam;
    if (Math.hypot(enemy.x - closestX, enemy.y - closestY) >= enemy.r + 5) return;

    enemy.hp = Math.max(0, enemy.hp - weapon.damage * getPlayerDamageMultiplier());
    if (enemy.hp <= 0) defeatEnemy(enemy);
  });
}
function updateRadBeam(dt) {
  const weapon = weaponCatalog.radBeam;
  if (game.attackDisabledTimer > 0 || game.weapon !== 'radBeam' || game.ammo <= 0) {
    game.radBeamActive = false;
    return;
  }

  const firingTime = Math.min(dt, game.ammo - game.radBeamDrainTimer);
  if (firingTime <= 0) {
    game.radBeamActive = false;
    return;
  }
  game.radBeamActive = true;

  const { x, y, angle } = game.player;
  const directionX = Math.cos(angle);
  const directionY = Math.sin(angle);
  const startX = x + directionX * 20;
  const startY = y + directionY * 20;
  const length = weapon.range;

  game.enemies.forEach(enemy => {
    if (enemy.defeated || enemy.shieldTimer > 0 || !enemy.hp) return;

    const relativeX = enemy.x - startX;
    const relativeY = enemy.y - startY;
    const alongBeam = Math.max(0, Math.min(length, relativeX * directionX + relativeY * directionY));
    const closestX = startX + directionX * alongBeam;
    const closestY = startY + directionY * alongBeam;
    if (Math.hypot(enemy.x - closestX, enemy.y - closestY) >= enemy.r + 4) return;

    enemy.hp = Math.max(0, enemy.hp - weapon.damage * firingTime * getPlayerDamageMultiplier());
    if (!(enemy.radiationTimer > 0)) enemy.radiationTickTimer = weapon.radiationTickInterval;
    enemy.radiationTimer = weapon.radiationDuration;
    if (enemy.hp <= 0) defeatEnemy(enemy);
  });

  game.radBeamDrainTimer += firingTime;
  while (game.radBeamDrainTimer >= 1 && game.ammo > 0) {
    game.ammo--;
    game.radBeamDrainTimer--;
  }
  if (game.ammo <= 0) {
    game.ammo = 0;
    game.reloadPending = true;
    game.radBeamActive = false;
  }
}
function releaseCosmosExplosion() {
  const { x, y } = game.player;
  const radius = 12 * 10;
  addExplosion(x, y, radius, '#b9f4ff');
  game.enemies.forEach(enemy => {
    if (enemy.defeated || enemy.shieldTimer > 0 || !enemy.hp || Math.hypot(enemy.x - x, enemy.y - y) > radius) return;

    enemy.hp = Math.max(0, enemy.hp - 5 * getPlayerDamageMultiplier());
    if (enemy.hp <= 0) defeatEnemy(enemy);
  });
}
function triggerPulseBlast(bullet) {
  applyPulseBlast(
    bullet.x,
    bullet.y,
    bullet.pulseBlastRadius,
    bullet.pulseKnockback,
    bullet.directionX,
    bullet.directionY
  );
}
function applyPulseBlast(x, y, radius, knockback, directionX = 0, directionY = 0) {
  addExplosion(x, y, radius, '#8db7ee');
  game.enemies.forEach(enemy => {
    if (enemy.defeated || enemy.shieldTimer > 0) return;

    const dx = enemy.x - x;
    const dy = enemy.y - y;
    const distance = Math.hypot(dx, dy);
    if (distance > radius) return;

    const pushX = distance > 0 ? dx / distance : directionX;
    const pushY = distance > 0 ? dy / distance : directionY;
    enemy.knockbackX = (enemy.knockbackX || 0) + pushX * knockback;
    enemy.knockbackY = (enemy.knockbackY || 0) + pushY * knockback;
  });
}
function decelerateBullet(bullet, dt) {
  if (!bullet.deceleration || !bullet.decelerationInterval) return;

  bullet.decelerationTimer = (bullet.decelerationTimer ?? bullet.decelerationInterval) - dt;
  let speed = Math.hypot(bullet.vx, bullet.vy);
  while (bullet.decelerationTimer <= 0 && speed > 0) {
    speed = Math.max(0, speed - bullet.deceleration);
    bullet.decelerationTimer += bullet.decelerationInterval;
  }
  if (speed === 0) {
    bullet.vx = 0;
    bullet.vy = 0;
  } else if (speed < Math.hypot(bullet.vx, bullet.vy)) {
    const scale = speed / Math.hypot(bullet.vx, bullet.vy);
    bullet.vx *= scale;
    bullet.vy *= scale;
  }
}
function vibrateBullet(bullet, dt) {
  if (!bullet.vibrationAmplitude) {
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    return;
  }

  bullet.travelX += bullet.vx * dt;
  bullet.travelY += bullet.vy * dt;
  bullet.vibrationPhase += dt * bullet.vibrationFrequency * Math.PI * 2;
  bullet.x = bullet.travelX + Math.sin(bullet.vibrationPhase) * bullet.vibrationAmplitude;
  bullet.y = bullet.travelY + Math.sin(bullet.vibrationPhase + Math.PI / 2) * bullet.vibrationAmplitude;
}
function updateVoidBatarBullet(bullet, dt) {
  const startTime = bullet.voidBatarElapsed;
  const endTime = startTime + dt;
  const initialSpeed = bullet.voidBatarInitialSpeed;
  let distance = 0;

  if (endTime > 2) {
    let target = null;
    let targetDistance = Infinity;
    game.enemies.forEach(enemy => {
      if (enemy.defeated || enemy.shieldTimer > 0 || !enemy.hp) return;
      const distanceToEnemy = Math.hypot(enemy.x - bullet.x, enemy.y - bullet.y);
      if (distanceToEnemy < targetDistance) {
        target = enemy;
        targetDistance = distanceToEnemy;
      }
    });
    if (target) {
      const angle = Math.atan2(target.y - bullet.y, target.x - bullet.x);
      bullet.directionX = Math.cos(angle);
      bullet.directionY = Math.sin(angle);
    }
  }

  const decelerationEnd = Math.min(endTime, 1);
  const decelerationStart = Math.min(startTime, 1);
  distance += initialSpeed * ((decelerationEnd - decelerationEnd ** 2 / 2) - (decelerationStart - decelerationStart ** 2 / 2));

  let time = Math.max(startTime, 2);
  while (time < endTime) {
    const speedStep = Math.floor((time - 2) / .25);
    const nextStep = 2 + (speedStep + 1) * .25;
    const segmentEnd = Math.min(endTime, nextStep);
    distance += (speedStep + 1) * 200 * (segmentEnd - time);
    time = segmentEnd;
  }

  bullet.x += bullet.directionX * distance;
  bullet.y += bullet.directionY * distance;
  bullet.voidBatarElapsed = endTime;
  const speed = endTime < 1
    ? initialSpeed * (1 - endTime)
    : endTime < 2
      ? 0
      : (Math.floor((endTime - 2) / .25) + 1) * 200/*<<change void batar accelation*/;
  bullet.vx = bullet.directionX * speed;
  bullet.vy = bullet.directionY * speed;
}
function shoot() { 
  if (!game.active || game.attackDisabledTimer > 0) return;
  const weapon = weaponCatalog[game.weapon]; 
  if (weapon.continuousBeam) {
    game.radBeamActive = game.ammo > 0;
    return;
  }
  if (game.fireTimer > 0) return;
  const p = game.player; 
  const effects = getBiome(p.x, p.y).effects; 

  if (weapon.kind === 'melee') { 
    game.fireTimer = weapon.cooldown * effects.fireCooldownMultiplier; 
    meleeAttack(weapon); 
    return; 
  } 

  if (game.ammo <= 0) { 
    game.reloadPending = true; 
    return; 
  } 
  game.ammo--; 
  if (game.ammo === 0) game.reloadPending = true; 
  game.fireTimer = weapon.cooldown * effects.fireCooldownMultiplier; 

  if (weapon.beam) {
    fireBeam(weapon);
  } else {
    for (let i = 0; i < weapon.pellets; i++) {
      const angle = p.angle + (Math.random() - .5) * weapon.spread;
      const bullet = {
        x: p.x + Math.cos(angle) * 20,
        y: p.y + Math.sin(angle) * 20,
        vx: Math.cos(angle) * weapon.speed,
        vy: Math.sin(angle) * weapon.speed,
        life: weapon.life,
        damage: weapon.damage * (effects.playerDamageMultiplier || 1),
        blast: weapon.blast || 0,
        falloff: weapon.falloff,
        baseAngle: angle,
        oscillating: Boolean(weapon.oscillating),
        swayAmplitude: weapon.coneSize || 0,
        swayPhase: Math.random() * Math.PI * 2,
        pierce: Boolean(weapon.pierce),
        hitEnemies: new Set(),
        radius: weapon.bulletRadius || 3,
        deceleration: Array.isArray(weapon.deceleration)
          ? weapon.deceleration[0] + Math.random() * (weapon.deceleration[1] - weapon.deceleration[0])
          : weapon.deceleration || 0,
        decelerationInterval: weapon.decelerationInterval || 0,
        burnDuration: weapon.burnDuration || 0,
        burnDamage: (weapon.burnDamage || 0) * (effects.playerDamageMultiplier || 1),
        burnInterval: weapon.burnInterval || 0,
        vibrationAmplitude: weapon.vibrationAmplitude || 0,
        vibrationFrequency: weapon.vibrationFrequency || 0,
        vibrationPhase: Math.random() * Math.PI * 2,
        pulseBlastRadius: weapon.pulseBlastRadius || 0,
        pulseKnockback: weapon.pulseKnockback || 0,
        travelX: p.x + Math.cos(angle) * 20,
        travelY: p.y + Math.sin(angle) * 20,
        voidBatarMotion: Boolean(weapon.voidBatarMotion),
        voidBatarElapsed: 0,
        voidBatarInitialSpeed: weapon.speed,
        directionX: Math.cos(angle),
        directionY: Math.sin(angle)
      };
      game.bullets.push(bullet);
    }
  }

  for (let i = 0; i < 4; i++) {
    game.sparks.push({ 
      x: p.x + Math.cos(p.angle) * 25, 
      y: p.y + Math.sin(p.angle) * 25, 
      life: .2, 
      vx: Math.cos(p.angle) * 100 + (Math.random() - .5) * 100, 
      vy: Math.sin(p.angle) * 100 + (Math.random() - .5) * 100 
    });
  }
}
function useMedkit() { if (!game.active || !game.stationItems.medkit || game.health >= 100) return; game.stationItems.medkit = Math.max(0, (game.stationItems.medkit || 0) - 1); game.health = Math.min(100, game.health + 45); localStorage.setItem('horde-station-items', JSON.stringify(game.stationItems)); updateAmmoUI(); ui.stationOutput.textContent = 'MEDKIT USED // +45% VITALITY'; }
function pulse() { if (game.attackDisabledTimer > 0 || game.pulseTimer > 0) return; game.pulseTimer = 7 * getBiome(game.player.x, game.player.y).effects.pulseCooldownMultiplier; game.enemies.forEach(e => { if (!e.defeated && e.shieldTimer <= 0 && e.hp && Math.hypot(e.x - game.player.x, e.y - game.player.y) < 170) { e.hp -= 2 * getPlayerDamageMultiplier(); if (e.hp <= 0) defeatEnemy(e, 50); burst(e.x, e.y, 8, 180); } }); burst(game.player.x, game.player.y, 35, 260); }
function createVoidWorm(x, y, canSplit = true) {
  const maxHp = 120.0;
  const enemy = { 
    x, y, family: 'VOID WORM', familyIndex: 24, ability: 'VOID BURROW', effect: null, 
    variant: 'COLOSSAL', boss: false, voidWorm: true, canSplit, color: '#8f7cff', r: 34, 
    speed: 200, hp: maxHp, maxHp, damage: 0, contactDamage: 10, score: 500, drops: 0, 
    abilityTimer: 1.5, shieldTimer: 0, hitTimer: 0 
  };

  let health = maxHp;
  Object.defineProperty(enemy, 'hp', {
    configurable: true,
    get: () => health,
    set: value => {
      const attemptedDamage = health - value;
      const weapon = weaponCatalog[game.weapon];
      const distance = Math.hypot(enemy.x - game.player.x, enemy.y - game.player.y);
      const weaponDamage = (weapon?.falloff ? weapon.damage * Math.max(.25, 1 - distance / 550) : weapon?.damage || .12) * getPlayerDamageMultiplier();
      health = attemptedDamage > 0 && attemptedDamage <= .120001 ? Math.max(0, health - weaponDamage) : value;
    }
  });

  return enemy;
}
function createVoidWalker(x, y) {
  const maxHp = 400;
  const enemy = {
    x: x,
    y: y,
    r: 100,
    speed: 35,
    voidWalker: true,
    isAggroed: false,
    wanderAngle: Math.random() * Math.PI * 2,
    wanderTimer: 0,
    attackTimer: 3,
    maxHp: maxHp,
    color: '#0e6b5c',
    family: 'VOID WALKER',
    familyIndex: 24,
    variant: 'HEAVY',
    boss: true,
    contactDamage: 20,
    score: 800,
    drops: 10
  };

  let health = maxHp;
  Object.defineProperty(enemy, 'hp', {
    configurable: true,
    get: () => health,
    set: value => {
      const attemptedDamage = health - value;
      const weapon = weaponCatalog[game.weapon];
      const distance = Math.hypot(enemy.x - game.player.x, enemy.y - game.player.y);
      const weaponDamage = (weapon?.falloff ? weapon.damage * Math.max(.25, 1 - distance / 550) : weapon?.damage || .12) * getPlayerDamageMultiplier();
      
      // Become aggressive when damaged
      if (attemptedDamage > 0) enemy.isAggroed = true;
      
      health = attemptedDamage > 0 && attemptedDamage <= .120001 ? Math.max(0, health - weaponDamage) : value;
    }
  });

  return enemy;
}
function createVoidStalker() {
  const orbitRadius = mapRadius + 3000;
  const orbitAngle = Math.random() * Math.PI * 2;
  const maxHp = 900;
  const enemy = {
    x: Math.cos(orbitAngle) * orbitRadius,
    y: Math.sin(orbitAngle) * orbitRadius,
    r: 120,
    speed: 280,
    voidStalker: true,
    isAggroed: false,
    orbitRadius,
    orbitAngle,
    orbitSpeed: .05,
    attackTimer: 4,
    attackFlashTimer: 0,
    maxHp,
    color: '#b34dff',
    family: 'VOID STALKER',
    familyIndex: 24,
    variant: 'THE VOID BOSS',
    boss: true,
    contactDamage: 28,
    score: 2500,
    drops: 25,
    abilityTimer: 0,
    shieldTimer: 0
  };

  let health = maxHp;
  Object.defineProperty(enemy, 'hp', {
    configurable: true,
    get: () => health,
    set: value => {
      const attemptedDamage = health - value;
      const weapon = weaponCatalog[game.weapon];
      const distance = Math.hypot(enemy.x - game.player.x, enemy.y - game.player.y);
      const weaponDamage = (weapon?.falloff ? weapon.damage * Math.max(.25, 1 - distance / 550) : weapon?.damage || .12) * getPlayerDamageMultiplier();
      if (attemptedDamage > 0) enemy.isAggroed = true;
      health = attemptedDamage > 0 && attemptedDamage <= .120001 ? Math.max(0, health - weaponDamage) : value;
    }
  });

  return enemy;
}

function spawn() {
  const angle = Math.random() * Math.PI * 2;
  const radius = Math.max(canvas.clientWidth, canvas.clientHeight) * .72;
  const x = game.player.x + Math.cos(angle) * radius;
  const y = game.player.y + Math.sin(angle) * radius;
  if (isInsideBeaconStation(x, y)) return;
  const biome = getBiome(x, y);

  if (biome.key === 'sanctuary') return;
  
  // Centralized Void Spawning Logic
  if (biome.key === 'void') {
    if (getBiome(game.player.x, game.player.y).key !== 'void') return;

    // Check current active Void entities to prevent flooding
    const activeWorms = game.enemies.filter(enemy => enemy.voidWorm && !enemy.defeated).length;
    const activeWalkers = game.enemies.filter(enemy => enemy.voidWalker && !enemy.defeated).length;

    // Cap active Void bosses to 1 at a time
    if (activeWorms >= 8 && activeWalkers >= 10) return;

    // 30% chance to spawn when called
    if (Math.random() > 0.3) return;

    const spawnAngle = Math.random() * Math.PI * 2;
    const distance = 350 + Math.random() * 250; // Spawns slightly further away
    const spawnX = game.player.x + Math.cos(spawnAngle) * distance;
    const spawnY = game.player.y + Math.sin(spawnAngle) * distance;

    if (getBiome(spawnX, spawnY).key === 'void' && !isInsideBeaconStation(spawnX, spawnY)) {
      // 20% chance to spawn a Void Walker instead of a Worm
      if (Math.random() < 0.2) {
        addEnemy(createVoidWalker(spawnX, spawnY));
      } else {
        addEnemy(createVoidWorm(spawnX, spawnY));
      }
    }
    return;
  }

  createBiomeEnemy(x, y, biome);
}

function createBiomeEnemy(x, y, biome, variant = null) {
  if (isInsideBeaconStation(x, y)) return null;
  const family = biome.enemyFamily;
  const distance = Math.hypot(x, y);
  const enemyVariant = variant || enemyVariants[Math.random() < Math.min(.22, distance / 30000 * .22) ? 4 : Math.floor(Math.random() * 4)];
  const baseSpeed = 38 + game.currentSector * 10 + Math.random() * 22;
  const familyIndex = (biome.sector - 1) * 4 + Number(biome.key.split('-')[2]);
  const scaledHp = Math.ceil(enemyVariant.hp * (1 + game.currentSector * 0.15));
  const sectorOneMiniBossAbility = familyIndex < sectorOneMiniBossAbilities.length && enemyVariant.boss
    ? sectorOneMiniBossAbilities[familyIndex]
    : null;
  const sectorTwoMiniBossAbility = familyIndex >= 4 && familyIndex < 8 && enemyVariant.boss
    ? sectorTwoMiniBossAbilities[familyIndex - 4]
    : null;
  const sectorThreeMiniBossAbility = familyIndex >= 8 && familyIndex < 12 && enemyVariant.boss
    ? sectorThreeMiniBossAbilities[familyIndex - 8]
    : null;
  const sectorFourMiniBossAbility = familyIndex >= 12 && familyIndex < 16 && enemyVariant.boss
    ? sectorFourMiniBossAbilities[familyIndex - 12]
    : null;
  const sectorFiveMiniBossAbility = familyIndex >= 16 && familyIndex < 20 && enemyVariant.boss
    ? sectorFiveMiniBossAbilities[familyIndex - 16]
    : null;
  const sectorSixMiniBossAbility = familyIndex >= 20 && familyIndex < 24 && enemyVariant.boss
    ? sectorSixMiniBossAbilities[familyIndex - 20]
    : null;
  const miniBossAbility = sectorOneMiniBossAbility || sectorTwoMiniBossAbility || sectorThreeMiniBossAbility || sectorFourMiniBossAbility || sectorFiveMiniBossAbility || sectorSixMiniBossAbility;
  const ability = miniBossAbility?.ability ?? family.ability;
  const effect = miniBossAbility?.effect ?? family.effect;
  const familyEffect = enemyVariant.boss && familyIndex >= 4 && familyIndex < 24 ? family.effect : null;

  const enemy = { 
    x, y, family: family.name, familyIndex, ability, effect, familyEffect,
    variant: enemyVariant.name, boss: Boolean(enemyVariant.boss), color: biome.color,
    r: (10 + Math.random() * 6) * enemyVariant.radius, speed: baseSpeed * enemyVariant.speed * (family.effect === 'nebula-missiles' ? .65 : family.effect === 'spin-attack' ? 1.5 : 1),
    hp: scaledHp, maxHp: scaledHp, damage: enemyVariant.damage, contactDamage: enemyVariant.contactDamage,
    score: enemyVariant.score, drops: enemyVariant.drops, abilityTimer: 1 + Math.random() * 2,
    dashCooldown: family.effect === 'dash' || family.effect === 'decay-dash' ? 4 : 0, dashTimer: 0, dashX: 0, dashY: 0,
    brambleCooldown: family.effect === 'bramble' ? 3 + Math.random() * 7 : 0,
    stormAttackCooldown: Math.random() * 1.5,
    stormRecovery: 0,
    stormSwingTimer: 0,
    facingAngle: Math.atan2(game.player.y - y, game.player.x - x),
    trailTimer: 0,
    pestCooldown: 0,
    pest: null,
    decayApplied: false,
    fireExplosionCooldown: 0,
    familyAbilityTimer: 1 + Math.random() * 2,
    missileCooldown: family.effect === 'nebula-missiles' ? 10 : 0,
    arcProjectileCooldown: 0,
    teleportCooldown: 0,
    spinCooldown: Math.random() * 2,
    spinTimer: 0,
    bossAbilityCooldown: effect === 'scorched-boss-shot' ? 3 : 0,
    thunderAuraTimer: 0,
    ironwoodShieldHp: effect === 'ironwood-boss-shield' ? scaledHp : 0,
    ironwoodShieldMaxHp: effect === 'ironwood-boss-shield' ? scaledHp : 0,
    brambleOrbitAngle: 0,
    nullLaneTimer: 0,
    nullSpikesTimer: 0,
    nullLaneAngle: 0,
    nullAttackCooldown: 0,
    wraithGuards: [],
    wraithPests: [],
    wraithGuardOrbitAngle: 0,
    wraithGuardRespawnCooldown: 0,
    wraithBossPestCooldown: 2,
    nebulaBurstPairsRemaining: 0,
    nebulaBurstTimer: 0,
    darkDashCooldown: 0,
    darkDashPauseTimer: 0,
    darkDashTimer: 0,
    darkDashAngle: 0,
    darkDashTrailTimer: 0,
    deadStarSpeedBuffTimer: 0,
    deadStarAuraTimer: 0,
    toxicRetaliationCooldown: 0,
    shieldTimer: 0, hitTimer: 0 
  };

  let health = scaledHp;
  Object.defineProperty(enemy, 'hp', {
    configurable: true,
    get: () => health,
    set: value => {
      const attemptedDamage = health - value;
      if (attemptedDamage > 0 && hasEnemyEffect(enemy, 'wraith-boss-guards') && enemy.wraithGuards.some(guard => !guard.defeated)) return;
      if (attemptedDamage > 0 && hasEnemyEffect(enemy, 'damage-ignore') && Math.random() < .05) return;
      const weapon = weaponCatalog[game.weapon];
      const distance = Math.hypot(enemy.x - game.player.x, enemy.y - game.player.y);
      const weaponDamage = (weapon?.falloff ? weapon.damage * Math.max(.25, 1 - distance / 550) : weapon?.damage || .12) * getPlayerDamageMultiplier();
      const previousHealth = health;
      health = attemptedDamage > 0 && attemptedDamage <= .120001 ? Math.max(0, health - weaponDamage) : value;
      if (health < previousHealth && hasEnemyEffect(enemy, 'damage-burst') && Math.random() < .5) triggerBoneOrchardHit(enemy);
      if (health < previousHealth && hasEnemyEffect(enemy, 'toxic-boss-burst') && enemy.toxicRetaliationCooldown <= 0) {
        createToxicBossZone(enemy);
        enemy.toxicRetaliationCooldown = 1;
      }
    }
  });

  addEnemy(enemy);
  if (hasEnemyEffect(enemy, 'death-fireballs')) attachEmberFireballs(enemy);
  if (enemy.effect === 'wraith-boss-guards') spawnWraithBossGuards(enemy);
  return enemy;
}

function spawnRandomBiomeElites(x, y, count) {
  const radius = Math.hypot(x, y);
  if (getBiome(x, y).key === 'void') {
    const safeRadius = Math.max(0, mapRadius - 150);
    x = radius > 0 ? x / radius * safeRadius : 0;
    y = radius > 0 ? y / radius * safeRadius : 0;
  }
  for (let i = 0; i < count; i++) {
    const familyIndex = Math.floor(Math.random() * 20);
    const sectorIndex = Math.floor(familyIndex / 4);
    const biomeIndex = familyIndex % 4;
    const angle = Math.PI * 2 * i / count;
    const spawnRadius = 45 + Math.random() * 25;
    const biome = {
      ...sectorRegions[sectorIndex][biomeIndex],
      key: `sector-${sectorIndex}-${biomeIndex}`,
      sector: sectorIndex + 1
    };
    createBiomeEnemy(
      x + Math.cos(angle) * spawnRadius,
      y + Math.sin(angle) * spawnRadius,
      biome,
      enemyVariants[3]
    );
  }
}

function fireVoidRiftMiniBossVolley(enemy) {
  const targetAngle = Math.atan2(game.player.y - enemy.y, game.player.x - enemy.x);
  for (let i = 0; i < 4; i++) {
    const angle = targetAngle + (i - 1.5) * .2;
    game.projectiles.push({
      x: enemy.x,
      y: enemy.y,
      vx: Math.cos(angle) * 145,
      vy: Math.sin(angle) * 145,
      life: 5,
      radius: 11,
      damage: 8,
      color: '#ca8bea',
      spawnElitesOnHit: true
    });
  }
}

function fireEventHorizonMiniBossProjectile(enemy) {
  const angle = Math.atan2(game.player.y - enemy.y, game.player.x - enemy.x);
  game.projectiles.push({
    x: enemy.x,
    y: enemy.y,
    vx: Math.cos(angle) * 180,
    vy: Math.sin(angle) * 180,
    life: 5,
    radius: 14,
    damage: 30,
    color: '#ec7dc4',
    singularity: true,
    singularityRadius: 135,
    pullSpeed: 85,
    damagePerSecond: 24
  });
}

function triggerDeadStarMiniBossAura(enemy) {
  game.enemies.forEach(target => {
    if (target.defeated || target.familyIndex !== 22 || Math.hypot(target.x - enemy.x, target.y - enemy.y) > deadStarBossAuraRadius) return;
    const angle = Math.atan2(game.player.y - target.y, game.player.x - target.x);
    const targetX = target.x + Math.cos(angle) * 50;
    const targetY = target.y + Math.sin(angle) * 50;
    const destinationBiome = getBiome(targetX, targetY).key;
    if (destinationBiome !== 'sanctuary' && (destinationBiome !== 'void' || target.voidWorm || target.voidWalker || target.voidStalker)) {
      target.x = targetX;
      target.y = targetY;
    }
    target.deadStarSpeedBuffTimer = 5;
  });
  enemy.deadStarAuraTimer = .75;
}

function createDarkBossDashCircle(enemy) {
  game.darkBossDashCircles.push({
    x: enemy.x,
    y: enemy.y,
    radius: darkBossDashCircleRadius,
    life: 1,
    maxLife: 1,
    damage: 8,
    hit: false
  });
}

function fireDarkBossPerpendicularProjectiles(enemy) {
  for (const offset of [-Math.PI / 2, Math.PI / 2]) {
    const angle = enemy.darkDashAngle + offset;
    game.projectiles.push({
      x: enemy.x,
      y: enemy.y,
      vx: Math.cos(angle) * 300,
      vy: Math.sin(angle) * 300,
      life: 1.8,
      radius: 8,
      damage: 6,
      color: '#809eea'
    });
  }
}

function updateDarkBossDashCircles(dt) {
  game.darkBossDashCircles.forEach(circle => {
    circle.life -= dt;
    if (!circle.hit && Math.hypot(game.player.x - circle.x, game.player.y - circle.y) < circle.radius + 13) {
      circle.hit = true;
      game.health -= circle.damage * (1 - (getArmorEffects().contactDamageReduction || 0));
    }
  });
  game.darkBossDashCircles = game.darkBossDashCircles.filter(circle => circle.life > 0);
}

function applyMinibossFamilyAbility(enemy, dt, distance) {
  if (enemy.familyEffect === 'bramble') {
    enemy.brambleCooldown = Math.max(0, enemy.brambleCooldown - dt);
    if (distance < 550 && enemy.brambleCooldown <= 0) {
      game.brambleZones.push({
        x: game.player.x,
        y: game.player.y,
        radius: 52,
        telegraphTimer: 1.5,
        active: false,
        life: 0
      });
      enemy.brambleCooldown = 10;
    }
  } else if (enemy.familyEffect === 'gravity-fields-pull') {
    enemy.familyAbilityTimer -= dt;
    if (enemy.familyAbilityTimer <= 0) {
      if (distance < 260 && Math.random() >= .75) {
        const angle = Math.atan2(enemy.y - game.player.y, enemy.x - game.player.x);
        game.player.x += Math.cos(angle) * 35;
        game.player.y += Math.sin(angle) * 35;
      }
      enemy.familyAbilityTimer = enemy.boss ? 1.4 : 2.8;
    }
  } else if (enemy.familyEffect === 'fire-explosion') {
    enemy.fireExplosionCooldown = Math.max(0, enemy.fireExplosionCooldown - dt);
    if (distance < 380 && enemy.fireExplosionCooldown <= 0) {
      triggerStarfireExplosion(enemy);
      enemy.fireExplosionCooldown = 6;
    }
  } else if (enemy.familyEffect === 'nebula-missiles') {
    enemy.missileCooldown = Math.max(0, enemy.missileCooldown - dt);
    if (distance < 650 && enemy.missileCooldown <= 0) {
      fireNebulaMissiles(enemy);
      enemy.missileCooldown = 10;
    }
  } else if (enemy.familyEffect === 'arc-projectiles') {
    enemy.arcProjectileCooldown = Math.max(0, enemy.arcProjectileCooldown - dt);
    if (distance < 600 && enemy.arcProjectileCooldown <= 0) {
      fireAbyssalProjectile(enemy);
      enemy.arcProjectileCooldown = 6;
    }
  } else if (enemy.familyEffect === 'spin-attack') {
    enemy.spinCooldown = Math.max(0, enemy.spinCooldown - dt);
    enemy.spinTimer = Math.max(0, enemy.spinTimer - dt);
    if (distance < 80 && enemy.spinCooldown <= 0) {
      game.health -= (enemy.contactDamage || 8) * (1 - (getArmorEffects().contactDamageReduction || 0));
      enemy.spinTimer = .5;
      enemy.spinCooldown = 3;
    }
  }
}

function triggerBoneOrchardHit(enemy) {
  const projectileCount = 2;
  const speed = 200;
  for (let i = 0; i < projectileCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    game.projectiles.push({
      x: enemy.x,
      y: enemy.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1.3,
      radius: 7,
      damage: 4,
      color: '#d7b07a'
    });
  }
}

function fireBoneMiniBossBurst(enemy) {
  const angle = Math.atan2(game.player.y - enemy.y, game.player.x - enemy.x);
  game.projectiles.push({
    x: enemy.x,
    y: enemy.y,
    vx: Math.cos(angle) * 150,
    vy: Math.sin(angle) * 150,
    life: 3,
    burstTimer: .75,
    burstCount: 12,
    burstSpeed: 250,
    radius: 9,
    damage: 6,
    color: '#d7b07a'
  });
}

function fireEmberMiniBossVolley(enemy) {
  const projectileCount = 8;
  const ringRadius = enemy.r + 35;
  for (let i = 0; i < projectileCount; i++) {
    const angle = i * Math.PI * 2 / projectileCount;
    game.projectiles.push({
      x: enemy.x + Math.cos(angle) * ringRadius,
      y: enemy.y + Math.sin(angle) * ringRadius,
      vx: 0,
      vy: 0,
      life: 4,
      volleyTimer: .65,
      volleyOwner: enemy,
      volleyOffsetX: Math.cos(angle) * ringRadius,
      volleyOffsetY: Math.sin(angle) * ringRadius,
      radius: 8,
      damage: 6,
      burnDuration: 3,
      color: '#ff725e'
    });
  }
}

function fireSunlessMiniBossVolley(enemy) {
  const targetAngle = Math.atan2(game.player.y - enemy.y, game.player.x - enemy.x);
  const spreadAngles = [-.36, -.12, .12, .36];
  spreadAngles.forEach(offset => {
    const angle = targetAngle + offset;
    game.projectiles.push({
      x: enemy.x,
      y: enemy.y,
      vx: Math.cos(angle) * 340,
      vy: Math.sin(angle) * 340,
      life: 3,
      radius: 8,
      damage: 6,
      decayDuration: 3,
      color: '#b7a56a'
    });
  });
}

function fireStarfireMiniBossProjectile(enemy) {
  const angle = Math.atan2(game.player.y - enemy.y, game.player.x - enemy.x);
  game.projectiles.push({
    x: enemy.x,
    y: enemy.y,
    vx: Math.cos(angle) * 360,
    vy: Math.sin(angle) * 360,
    life: 3,
    radius: enemy.r,
    damage: 10,
    burnDuration: 3,
    color: '#ff9b62',
    piercePlayer: true
  });
}

function fireDyingNebulaMiniBossPair(enemy) {
  const awayAngle = Math.atan2(enemy.y - game.player.y, enemy.x - game.player.x);
  const halfGap = 25 * Math.PI / 180;
  for (const offset of [-halfGap, halfGap]) {
    const angle = awayAngle + offset;
    game.projectiles.push({
      x: enemy.x,
      y: enemy.y,
      vx: Math.cos(angle) * 120,
      vy: Math.sin(angle) * 120,
      life: 4,
      radius: 8,
      damage: 8,
      color: '#d58ee0',
      redirectTimer: 1.5,
      redirectSpeed: 700
    });
  }
}

function createAbyssalBossWave(enemy) {
  game.abyssalBossWaves.push({
    owner: enemy,
    x: enemy.x,
    y: enemy.y,
    radius: 20,
    life: 4,
    maxLife: 4,
    damagePerSecond: 12
  });
}

function updateAbyssalBossWaves(dt) {
  game.abyssalBossWaves.forEach(wave => {
    wave.life -= dt;
    wave.x = wave.owner.defeated ? wave.x : wave.owner.x;
    wave.y = wave.owner.defeated ? wave.y : wave.owner.y;
    const growth = 1 - Math.max(0, wave.life) / wave.maxLife;
    wave.radius = 20 + (abyssalBossWaveMaxRadius - 20) * growth;
    if (Math.hypot(game.player.x - wave.x, game.player.y - wave.y) < wave.radius) {
      game.health -= wave.damagePerSecond * dt;
    }
  });
  game.abyssalBossWaves = game.abyssalBossWaves.filter(wave => wave.life > 0);
}

function distanceToSegment(x, y, startX, startY, endX, endY) {
  const segmentX = endX - startX;
  const segmentY = endY - startY;
  const lengthSquared = segmentX * segmentX + segmentY * segmentY;
  const projection = lengthSquared
    ? Math.max(0, Math.min(1, ((x - startX) * segmentX + (y - startY) * segmentY) / lengthSquared))
    : 0;
  return Math.hypot(x - (startX + projection * segmentX), y - (startY + projection * segmentY));
}

function createToxicBossZone(enemy) {
  game.toxicBossZones.push({
    x: enemy.x,
    y: enemy.y,
    radius: 75,
    life: 1.5,
    maxLife: 1.5,
    damagePerSecond: 8
  });
}

function teleportNearestGlassEnemy(projectile) {
  const nearestEnemy = game.enemies
    .filter(enemy => !enemy.defeated && enemy.familyIndex === 6)
    .sort((a, b) => Math.hypot(a.x - projectile.x, a.y - projectile.y) - Math.hypot(b.x - projectile.x, b.y - projectile.y))[0];
  if (!nearestEnemy) return;
  nearestEnemy.x = projectile.x;
  nearestEnemy.y = projectile.y;
  burst(projectile.x, projectile.y, 8, 120);
}

function attachEmberFireballs(enemy) {
  for (const offset of [-1, 1]) {
    game.projectiles.push({
      x: enemy.x,
      y: enemy.y,
      vx: 0,
      vy: 0,
      life: Infinity,
      radius: 10,
      damage: 8,
      color: '#ff725e',
      followTarget: enemy,
      followOffset: offset
    });
  }
}

function launchEmberFireballs(enemy) {
  const angleToPlayer = Math.atan2(game.player.y - enemy.y, game.player.x - enemy.x);
  game.projectiles.filter(projectile => projectile.followTarget === enemy).forEach(projectile => {
    const angle = angleToPlayer + projectile.followOffset * .12;
    const speed = 380;
    projectile.vx = Math.cos(angle) * speed;
    projectile.vy = Math.sin(angle) * speed;
    projectile.life = 2;
    projectile.burnDuration = 3;
    projectile.followTarget = null;
  });
}

function triggerNullIceExplosion(enemy) {
  const radius = 150;
  addExplosion(enemy.x, enemy.y, radius, '#a9e3e6');
  if (Math.hypot(game.player.x - enemy.x, game.player.y - enemy.y) <= radius) {
    game.health -= 10;
    game.attackDisabledTimer = 4;
  }
}

function createWraithPest(owner, bossSpawn = false) {
  const angle = Math.random() * Math.PI * 2;
  const pest = {
    x: owner.x + Math.cos(angle) * (owner.r + 18),
    y: owner.y + Math.sin(angle) * (owner.r + 18),
    family: 'WRAITH PEST',
    familyIndex: owner.familyIndex,
    ability: null,
    effect: null,
    variant: 'PEST',
    boss: false,
    wraithPest: true,
    wraithBossPest: bossSpawn,
    pestOwner: owner,
    color: '#a88fd0',
    r: 7,
    speed: 170,
    hp: 1,
    maxHp: 1,
    damage: 1,
    contactDamage: 2,
    score: 10,
    drops: 0,
    shieldTimer: 0,
    hitTimer: 0
  };
  if (!addEnemy(pest)) return;
  if (bossSpawn) {
    owner.wraithPests.push(pest);
  } else {
    owner.pest = pest;
  }
}

function updateWraithPestSpawns(dt) {
  game.enemies.forEach(enemy => {
    if (!hasEnemyEffect(enemy, 'spawn-pest') || enemy.defeated) return;
    enemy.pestCooldown = Math.max(0, enemy.pestCooldown - dt);
    if ((!enemy.pest || enemy.pest.defeated) && enemy.pestCooldown === 0) createWraithPest(enemy);
  });
}

function spawnWraithBossGuards(owner) {
  owner.wraithGuards = [];
  if (isInsideBeaconStation(owner.x, owner.y)) return;
  for (let i = 0; i < 3; i++) {
    const guard = {
      x: owner.x,
      y: owner.y,
      family: 'WRAITH GUARD',
      familyIndex: owner.familyIndex,
      ability: null,
      effect: null,
      variant: 'GUARD',
      boss: false,
      wraithGuard: true,
      guardOwner: owner,
      guardIndex: i,
      color: '#b8a1e8',
      r: 8,
      speed: 0,
      hp: 1,
      maxHp: 1,
      damage: 0,
      contactDamage: 0,
      score: 10,
      drops: 0,
      shieldTimer: 0,
      hitTimer: 0
    };
    if (addEnemy(guard)) owner.wraithGuards.push(guard);
  }
}

function updateWraithBossGuards(dt) {
  game.enemies.forEach(enemy => {
    if (enemy.effect !== 'wraith-boss-guards' || enemy.defeated) return;
    const guardsAlive = enemy.wraithGuards.some(guard => !guard.defeated);
    if (guardsAlive) {
      enemy.wraithGuardRespawnCooldown = 20;
      enemy.wraithGuardOrbitAngle = (enemy.wraithGuardOrbitAngle + dt * 1.2) % (Math.PI * 2);
      return;
    }
    enemy.wraithBossPestCooldown = Math.max(0, enemy.wraithBossPestCooldown - dt);
    if (enemy.wraithBossPestCooldown <= 0) {
      createWraithPest(enemy, true);
      enemy.wraithBossPestCooldown = 2;
    }
    enemy.wraithGuardRespawnCooldown = Math.max(0, enemy.wraithGuardRespawnCooldown - dt);
    if (enemy.wraithGuardRespawnCooldown <= 0) spawnWraithBossGuards(enemy);
  });
}

function updateLightningStrikes(dt) {
  game.lightningStrikes.forEach(strike => {
    if (!strike.struck) {
      strike.warningTimer -= dt;
      if (strike.warningTimer <= 0) {
        strike.struck = true;
        strike.flashTimer = .25;
        if (Math.hypot(game.player.x - strike.x, game.player.y - strike.y) < strike.radius) {
          game.health -= strike.damage * (1 - (getArmorEffects().hazardDamageReduction || 0));
        }
        burst(strike.x, strike.y, 12, 180);
      }
    } else {
      strike.flashTimer -= dt;
    }
  });
  game.lightningStrikes = game.lightningStrikes.filter(strike => !strike.struck || strike.flashTimer > 0);
}

function spawnNebulaMissile(owner) {
  const missile = {
    x: owner.x,
    y: owner.y,
    family: 'NEBULA MISSILE',
    familyIndex: owner.familyIndex,
    ability: null,
    effect: null,
    variant: 'MISSILE',
    boss: false,
    nebulaMissile: true,
    color: '#d58ee0',
    r: 8,
    speed: 220,
    hp: 4,
    maxHp: 4,
    damage: 0,
    contactDamage: 0,
    score: 5,
    drops: 0,
    damageOverTimeTimer: 0,
    shieldTimer: 0,
    hitTimer: 0
  };
  addEnemy(missile);
}

function triggerNebulaMissileDeath(missile) {
  const radius = 48;
  addExplosion(missile.x, missile.y, radius, '#d58ee0');
  if (Math.hypot(game.player.x - missile.x, game.player.y - missile.y) < radius) game.health -= 5;
}

function fireNebulaMissiles(enemy) {
  spawnNebulaMissile(enemy);
  spawnNebulaMissile(enemy);
}

function fireAbyssalProjectile(enemy) {
  const angle = Math.atan2(game.player.y - enemy.y, game.player.x - enemy.x);
  const speed = 155;
  game.projectiles.push({
    x: enemy.x,
    y: enemy.y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    life: 2.5,
    radius: 8,
    maxRadius: 24,
    damage: 7,
    color: '#709ed0',
    grows: true,
    arcGravity: 95
  });
}

function triggerStarfireExplosion(enemy) {
  const x = enemy.x;
  const y = enemy.y;
  const radius = 80;
  addExplosion(x, y, radius, '#ff9b62');
  if (Math.hypot(game.player.x - x, game.player.y - y) < radius) game.health -= 10;
  game.enemyTrails.push({ x, y, radius: 68, life: 2, maxLife: 2, damagePerSecond: 8, color: '#ff9b62' });
}

function createRiftPortal(enemy) {
  game.portals.push({ x: enemy.x, y: enemy.y, timer: 2 });
}

function updateRiftPortals(dt) {
  game.portals.forEach(portal => {
    portal.timer -= dt;
    if (portal.timer > 0) return;

    const inwardDistance = Math.hypot(portal.x, portal.y);
    const spawnX = portal.x - portal.x / inwardDistance * 180;
    const spawnY = portal.y - portal.y / inwardDistance * 180;
    for (let i = 0; i < 3; i++) {
      const familyIndex = Math.floor(Math.random() * 20);
      const sectorIndex = Math.floor(familyIndex / 4);
      const biomeIndex = familyIndex % 4;
      const biome = {
        ...sectorRegions[sectorIndex][biomeIndex],
        key: `sector-${sectorIndex}-${biomeIndex}`,
        sector: sectorIndex + 1
      };
      const angle = Math.random() * Math.PI * 2;
      const variant = enemyVariants[3];
      createBiomeEnemy(spawnX + Math.cos(angle) * 45, spawnY + Math.sin(angle) * 45, biome, variant);
    }
    portal.timer = 0;
  });
  game.portals = game.portals.filter(portal => portal.timer > 0);
}

function triggerDeadStarExplosion(enemy) {
  const health = enemy.maxHp;
  const damage = health;
  const radius = 80;
  addExplosion(enemy.x, enemy.y, radius, '#ffb067');
  if (Math.hypot(game.player.x - enemy.x, game.player.y - enemy.y) <= radius) {
    game.health -= damage;
  }
  game.enemies.forEach(target => {
    if (target === enemy || target.defeated || !hasEnemyEffect(target, 'dead-star-explosion')) return;
    if (Math.hypot(target.x - enemy.x, target.y - enemy.y) > radius) return;
    target.hp = Math.max(0, target.hp - damage);
    if (target.hp <= 0) defeatEnemy(target);
  });
}


function triggerGlassDesertDeath(enemy) {
  const angleToPlayer = Math.atan2(game.player.y - enemy.y, game.player.x - enemy.x);
  const spread = .28;
  for (let i = -1; i <= 1; i++) {
    const angle = angleToPlayer + i * spread;
    const speed = 360;
    game.projectiles.push({
      x: enemy.x,
      y: enemy.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 2,
      radius: 9,
      damage: 5,
      color: '#ff865c',
      burnDuration: 3
    });
  }
}

function defeatEnemy(enemy, bonus = 0) {
  if (!enemy || enemy.defeated || enemy.hp > 0) return;
  enemy.defeated = true;
  if (enemy.wraithGuard && enemy.guardOwner && !enemy.guardOwner.defeated
      && enemy.guardOwner.wraithGuards.every(guard => guard.defeated)) {
    enemy.guardOwner.wraithGuardRespawnCooldown = 20;
  }
  if (enemy.effect === 'wraith-boss-guards') {
    enemy.wraithGuards.forEach(guard => {
      guard.defeated = true;
      guard.hp = 0;
    });
  }
  if (hasEnemyEffect(enemy, 'death-burn')) triggerGlassDesertDeath(enemy);
  if (hasEnemyEffect(enemy, 'death-fireballs')) launchEmberFireballs(enemy);
  if (hasEnemyEffect(enemy, 'death-explosion')) triggerNullIceExplosion(enemy);
  if (hasEnemyEffect(enemy, 'rift-portal') && Math.random() < .05) createRiftPortal(enemy);
  if (hasEnemyEffect(enemy, 'dead-star-explosion')) triggerDeadStarExplosion(enemy);
  if (enemy.nebulaMissile) triggerNebulaMissileDeath(enemy);
  if (enemy.wraithPest && enemy.pestOwner && !enemy.pestOwner.defeated) {
    if (enemy.wraithBossPest) {
      enemy.pestOwner.wraithPests = enemy.pestOwner.wraithPests.filter(pest => pest !== enemy);
    } else {
      enemy.pestOwner.pest = null;
      enemy.pestOwner.pestCooldown = 7;
    }
  }
  if (enemy.voidWorm) {
    if (Math.random() < .33) game.atlasCrystals++;
    if (enemy.canSplit && Math.random() < .15) {
      const activeWorms = game.enemies.filter(candidate => candidate.voidWorm && !candidate.defeated).length;
      const splitCount = Math.min(2, Math.max(0, 8 - activeWorms));
      for (let i = 0; i < splitCount; i++) addEnemy(createVoidWorm(enemy.x + (i ? 26 : -26), enemy.y, false));
    }
  }
  if (!enemy.wraithPest && !enemy.nebulaMissile && !enemy.wraithGuard) dropResource(enemy.x, enemy.y, enemy.drops || 1);
  game.score += (enemy.score || 100) + bonus;
  if (enemy.boss && Math.random() < .5) game.relics++;
  if (Math.random() > (enemy.boss ? .35 : .72)) game.gems.push({ x: enemy.x, y: enemy.y, life: 18 });
  burst(enemy.x, enemy.y, enemy.boss ? 18 : 8, enemy.boss ? 260 : 170);
}
function randomResource() {
  const totalWeight = resourceTypes.reduce((sum, item) => sum + item.weight, 0);
  let randomNum = Math.random() * totalWeight;

  for (const resource of resourceTypes) {
    if (randomNum < resource.weight) {
      return resource;
    }
    randomNum -= resource.weight;
  }
  return resourceTypes[0];
}

function dropResource(x, y, amount = 1) { const resource = randomResource(); game.drops.push({ x, y, type: resource.key, amount, life: 24 }); }
function openChest(node) { node.taken = true; for (let i = 0; i < 3; i++) dropResource(node.x, node.y, 2 + Math.floor(Math.random() * 4)); game.salvage += 2; burst(node.x, node.y, 18, 190); }
function collectDrop(drop) { game.inventory[drop.type] += drop.amount; drop.life = 0; }
function reloadAmmo() {
  if (!game.reloadPending || game.fireTimer > 0) return;
  const weapon = weaponCatalog[game.weapon];
  if (weapon.kind === 'melee') {
    game.reloadPending = false;
    return;
  }
  const reserve = game.ammoReserve[weapon.ammo] || 0;
  const needed = weapon.magazine - game.ammo;
  if (!reserve || needed <= 0) {
    if (needed <= 0) game.reloadPending = false;
    return;
  }
  game.ammo += Math.min(needed, weapon.magazine);
  game.ammoReserve[weapon.ammo] = Math.max(0, reserve - 1);
  if (game.weapon === 'cosmosGauntlet') releaseCosmosExplosion();
  game.reloadPending = false;
}
function updateAmmoUI() { const weapon = weaponCatalog[game.weapon]; ui.ammo.textContent = weapon.kind === 'melee' ? 'MELEE' : game.ammo; ui.ammoStorage.textContent = weapon.kind === 'melee' ? '-' : game.ammoReserve[weapon.ammo] || 0; ui.medkits.textContent = game.stationItems.medkit || 0; ui.weaponName.textContent = weapon.name; ui.ammoType.textContent = weapon.kind === 'melee' ? 'CLOSE RANGE' : ammoCatalog[weapon.ammo].name; }
function updateAtlasCrystalUI() { if (atlasCrystalCounter) atlasCrystalCounter.textContent = String(game.atlasCrystals || 0).padStart(2, '0'); }
const baseUpdateAmmoUI = updateAmmoUI;
updateAmmoUI = function() { baseUpdateAmmoUI(); updateAtlasCrystalUI(); };
function getNearbyStation() {
  const candidates = [
    ...Object.entries(sanctuaryBuildStations).map(([type, position]) => ({ type, ...position })),
    ...game.placedStations.map(station => ({
      type: station.type === 'workbench' ? 'crafting' : 'furnace',
      x: station.x,
      y: station.y
    }))
  ];
  return candidates
    .map(candidate => ({ ...candidate, distance: Math.hypot(game.player.x - candidate.x, game.player.y - candidate.y) }))
    .filter(candidate => candidate.distance <= stationInteractionRadius)
    .sort((a, b) => a.distance - b.distance)[0]?.type || null;
}
function renderManagerInventory() {
  const items = document.querySelector('#manager-items');
  if (!items) return;
  const labels = { workbench: 'WORKBENCH', furnace: 'FURNACE' };
  items.innerHTML = Object.entries(labels).map(([type, label]) => {
    const count = game.craftedStations[type] || 0;
    return `<button type="button" class="manager-item" data-manager-item="${type}" ${count ? '' : 'disabled'}><span>${label}</span><strong>× ${count}</strong></button>`;
  }).join('');
}
function getManagerViewTransform() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const inventoryWidth = ui.managerInventory?.getBoundingClientRect().width || managerInventoryWidth;
  const leftMargin = Math.min(110, width * .18);
  const viewWidth = Math.max(100, width - inventoryWidth - leftMargin);
  return {
    centerX: leftMargin + viewWidth / 2,
    centerY: height / 2,
    scale: Math.min(viewWidth / (beaconRegionRadius * 2 + 120), height / (beaconRegionRadius * 2 + 120))
  };
}
function managerScreenToWorld(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const view = getManagerViewTransform();
  return {
    x: ((clientX - rect.left) - view.centerX) / view.scale,
    y: ((clientY - rect.top) - view.centerY) / view.scale
  };
}
function enterManagersTable() {
  if (game.managerMode || !game.active || game.paused) return;
  game.managerMode = true;
  game.paused = true;
  game.stationOpen = null;
  game.activeBeaconStationId = null;
  gameShell.classList.add('manager-view');
  keys.w = keys.a = keys.s = keys.d = keys.shift = false;
  pointer.down = false;
  ui.stations.hidden = true;
  ui.manager.hidden = false;
  renderManagerInventory();
}
function exitManagersTable() {
  if (!game.managerMode) return;
  game.managerMode = false;
  game.paused = false;
  gameShell.classList.remove('manager-view');
  managerDrag = null;
  ui.manager.hidden = true;
  lastTime = performance.now();
}
function beginPlacedStationDrag(event) {
  const world = managerScreenToWorld(event.clientX, event.clientY);
  const station = [...game.placedStations].reverse().find(candidate =>
    Math.hypot(world.x - candidate.x, world.y - candidate.y) <= placedStationRadius
  );
  if (station) {
    event.preventDefault();
    managerDrag = { source: 'placed', id: station.id, type: station.type };
  }
}
function canPlaceStation(x, y, ignoreId = null) {
  if (Math.hypot(x, y) > beaconRegionRadius - placedStationRadius) return false;
  const fixedPositions = Object.values(sanctuaryBuildStations);
  if (fixedPositions.some(position => Math.hypot(x - position.x, y - position.y) < placedStationRadius * 2 + 12)) return false;
  return !game.placedStations.some(station =>
    station.id !== ignoreId && Math.hypot(x - station.x, y - station.y) < placedStationRadius * 2 + 12
  );
}
function finishManagerDrag(event) {
  event.preventDefault();
  const drag = managerDrag;
  managerDrag = null;
  const rect = ui.managerInventory.getBoundingClientRect();
  const droppedInInventory = event.clientX >= rect.left && event.clientX <= rect.right
    && event.clientY >= rect.top && event.clientY <= rect.bottom;
  if (drag.source === 'placed') {
    const station = game.placedStations.find(candidate => candidate.id === drag.id);
    if (!station) return;
    if (droppedInInventory) {
      game.placedStations = game.placedStations.filter(candidate => candidate.id !== station.id);
      game.craftedStations[station.type] = (game.craftedStations[station.type] || 0) + 1;
    } else {
      const world = managerScreenToWorld(event.clientX, event.clientY);
      if (!canPlaceStation(world.x, world.y, station.id)) return;
      station.x = world.x;
      station.y = world.y;
    }
  } else {
    const world = managerScreenToWorld(event.clientX, event.clientY);
    if (droppedInInventory || !game.craftedStations[drag.type] || !canPlaceStation(world.x, world.y)) return;
    game.craftedStations[drag.type]--;
    game.placedStations.push({
      id: `${Date.now()}-${Math.random()}`,
      type: drag.type,
      x: world.x,
      y: world.y
    });
  }
  renderManagerInventory();
}
window.addEventListener('pointermove', event => {
  if (!managerDrag) return;
  managerDrag.clientX = event.clientX;
  managerDrag.clientY = event.clientY;
});
function getBeaconStationAt(x, y) { return game.beaconStations.find(station => Math.hypot(x - station.x, y - station.y) <= station.radius) || null; }
function getNearbyBeaconStation() { return getBeaconStationAt(game.player.x, game.player.y); }
function getNearbyBeaconBench() {
  return game.beaconStations
    .filter(station => station.repaired)
    .flatMap(station => [
      { station, type: 'crafting', x: station.x - beaconModuleBenchOffset, y: station.y },
      { station, type: 'beacon-modules', x: station.x + beaconModuleBenchOffset, y: station.y }
    ])
    .map(bench => ({ ...bench, distance: Math.hypot(game.player.x - bench.x, game.player.y - bench.y) }))
    .filter(bench => bench.distance <= beaconModuleInteractionRadius)
    .sort((a, b) => a.distance - b.distance)[0] || null;
}
function toggleStation() {
  const nearbyStation = getNearbyStation();
  if (nearbyStation === 'manager') {
    enterManagersTable();
    return;
  }
  if (nearbyStation) {
    game.activeBeaconStationId = null;
    game.stationOpen = game.stationOpen === nearbyStation ? null : nearbyStation;
  } else {
    const beaconStation = getNearbyBeaconStation();
    if (!beaconStation) return;
    game.activeBeaconStationId = beaconStation.id;
    const bench = beaconStation.repaired ? getNearbyBeaconBench() : null;
    if (beaconStation.repaired && (!bench || bench.station !== beaconStation)) return;
    const nextMenu = beaconStation.repaired ? bench.type : 'beacon-repair';
    game.stationOpen = game.stationOpen === nextMenu ? null : nextMenu;
  }
  if (!game.stationOpen) game.activeBeaconStationId = null;
  updateStationUI();
}
function updateStationUI() {
  const activeBeaconStation = game.beaconStations.find(station => station.id === game.activeBeaconStationId);
  const nearbyBeaconStation = getNearbyBeaconStation();
  const beaconMenuOpen = game.stationOpen === 'beacon-repair'
    || (['crafting', 'beacon-modules'].includes(game.stationOpen) && activeBeaconStation);
  if (beaconMenuOpen && (!activeBeaconStation || activeBeaconStation !== nearbyBeaconStation)) {
    game.stationOpen = null;
    game.activeBeaconStationId = null;
  } else if (game.stationOpen === 'beacon-repair' && activeBeaconStation?.repaired) {
    game.stationOpen = 'crafting';
  } else if (activeBeaconStation && (game.stationOpen === 'crafting' || game.stationOpen === 'beacon-modules')) {
    const bench = getNearbyBeaconBench();
    if (!bench || bench.station !== activeBeaconStation || bench.type !== game.stationOpen) {
      game.stationOpen = null;
      game.activeBeaconStationId = null;
    }
  }
  const nearbyStation = getNearbyStation();
  if (game.stationOpen && !beaconMenuOpen && nearbyStation !== game.stationOpen) game.stationOpen = null;
  const repairButton = document.querySelector('[data-station="beacon-repair"] [data-craft]');
  if (activeBeaconStation && repairButton) repairButton.dataset.craft = `repairBeacon:${activeBeaconStation.id}`;
  ui.stations.hidden = !game.stationOpen;
  ui.stations.classList.toggle('beacon-menu', Boolean(game.activeBeaconStationId));
  adminPanel.hidden = !adminMode || Boolean(game.stationOpen);
  document.querySelectorAll('[data-station]').forEach(card => { card.hidden = card.dataset.station !== game.stationOpen; });
  const title = ui.stations.querySelector('.station-title');
  if (title) title.textContent = game.stationOpen === 'beacon-repair'
    ? 'BEACON STATION // REPAIR'
    : game.stationOpen === 'beacon-modules'
      ? 'BEACON STATION // MODULE STATION'
      : game.activeBeaconStationId ? 'BEACON STATION // CRAFTING TABLE'
        : game.stationOpen === 'designer' ? 'SANCTUARY // DESIGNER TABLE' : 'SANCTUARY // WORKSHOPS';
}
function bankInventory() { let deposited = false; resourceTypes.forEach(resource => { const amount = game.inventory[resource.key]; if (!amount) return; game.vault[resource.key] = (game.vault[resource.key] || 0) + amount; game.inventory[resource.key] = 0; deposited = true; }); if (deposited) localStorage.setItem('horde-vault', JSON.stringify(game.vault)); return deposited; }
function getCraftResourceAmount(key) { if (weaponCatalog[key]) return game.unlockedWeapons[key] ? 1 : 0; if (key === 'relic') return game.relics; if (key === 'atlasCrystal') return game.atlasCrystals; if (key === 'steelPlate') return game.stationItems.steelPlate || 0; return game.vault[key] || 0; }
function spendCraftResource(key, amount) { if (weaponCatalog[key]) return; if (key === 'relic') game.relics = Math.max(0, game.relics - amount); else if (key === 'atlasCrystal') game.atlasCrystals = Math.max(0, game.atlasCrystals - amount); else if (key === 'steelPlate') game.stationItems.steelPlate = Math.max(0, (game.stationItems.steelPlate || 0) - amount); else game.vault[key] = Math.max(0, (game.vault[key] || 0) - amount); }
const stationRecipes = { 
  medkit: { name: 'MEDKIT', 
  time: 4, cost: { fiber: 4, crystal: 2 }, 
  output: { medkit: 1 } }, 
  steelPlate: { name: 'STEEL PLATE', time: 7, cost: { steel: 5, stone: 2 }, 
  output: { steelPlate: 1 } }, 
  smeltIron: { name: 'SMELTED IRON', time: 6, cost: { rawIron: 3, fuel: 10 }, 
  output: { iron: 3 } }, 
  makeSteel: { name: 'STEEL', time: 8, cost: { iron: 2, stone: 3, fuel: 10 }, 
  output: { steel: 2 } }, 
  refineFuel: { name: 'REFINED FUEL', time: 5, cost: { wood: 2, fiber: 2, fuel: 3 }, 
  output: { fuel: 12 } }, ...weaponRecipes, ...armorRecipes, ...Object.fromEntries(Object.entries(ammoCatalog).map(([key, ammo]) => [`ammo_${key}`, { name: ammo.name, time: 3, cost: ammo.cost, ammo: key, amount: ammo.amount }])) };
function openCraftDetails(recipeKey, requestedQuantity = 1) { const recipe = stationRecipes[recipeKey]; if (!recipe) return; const repeatable = !recipe.weapon && !recipe.armor; const quantity = repeatable ? Math.max(1, Math.min(5, requestedQuantity)) : 1; const costEntries = Object.entries(recipe.cost || {}); const materialRows = costEntries.map(([key, amount]) => { const resource = resourceTypes.find(item => item.key === key) || { name: key === 'steelPlate' ? 'STEEL PLATE' : key.toUpperCase() }; const required = amount * quantity; const owned = getCraftResourceAmount(key); const ready = owned >= required; return `<li class="${ready ? 'ready' : 'missing'}"><span>${resource.name}</span><strong>${owned} / ${required}</strong></li>`; }).join(''); const missing = costEntries.find(([key, amount]) => getCraftResourceAmount(key) < amount * quantity); const capacityExceeded = recipe.output?.medkit && (game.stationItems.medkit || 0) + quantity > 5; const canCraft = !missing && !capacityExceeded && !game.crafting; const quantityControls = repeatable ? `<div class="craft-quantity-controls"><span>QUANTITY</span>${[1, 2, 3, 4, 5].map(value => `<button type="button" data-craft-quantity="${value}" class="${value === quantity ? 'selected' : ''}" ${game.crafting ? 'disabled' : ''}>${value}</button>`).join('')}</div>` : ''; const actionLabel = game.crafting ? 'CRAFTING' : capacityExceeded ? 'STORAGE FULL' : canCraft ? `CRAFT x${quantity}` : 'NEED MATERIALS'; ui.craftDetails.dataset.recipeKey = recipeKey; ui.craftDetails.dataset.quantity = quantity; ui.craftDetails.innerHTML = `
    <div class="craft-details-header">
      <strong>${recipe.name}</strong>
      <button type="button" class="detail-close" data-close-details>✕</button>
    </div>
    <div class="craft-details-body">
      <div class="craft-detail-title">REQUIRED MATERIALS</div>
      <ul class="craft-detail-list">${materialRows}</ul>
      <div class="craft-detail-actions">
        ${quantityControls}
        <button type="button" data-craft-confirm="${recipeKey}" ${canCraft ? '' : 'disabled'}>${actionLabel}</button>
      </div>
    </div>
  `; ui.craftDetails.hidden = false; }
function craftItem(recipeKey, requestedQuantity = 1) { if (getBiome(game.player.x, game.player.y).key !== 'sanctuary' || game.crafting) return; const recipe = stationRecipes[recipeKey]; const repeatable = !recipe.weapon && !recipe.armor; const quantity = repeatable ? Math.max(1, Math.min(5, requestedQuantity)) : 1; if (recipe.output?.medkit && (game.stationItems.medkit || 0) + quantity > 5) { ui.stationOutput.textContent = 'MEDKIT STORAGE FULL'; return; } const missing = Object.entries(recipe.cost).find(([key, amount]) => getCraftResourceAmount(key) < amount * quantity); if (missing) { const shortage = missing[1] * quantity - getCraftResourceAmount(missing[0]); ui.stationOutput.textContent = `NEED ${shortage} MORE ${missing[0].toUpperCase()}`; return; } Object.entries(recipe.cost).forEach(([key, amount]) => { spendCraftResource(key, amount * quantity); }); game.crafting = { recipeKey, quantity, remaining: recipe.time * quantity, total: recipe.time * quantity }; localStorage.setItem('horde-vault', JSON.stringify(game.vault)); updateInventoryUI(); updateStationButtons(); ui.stationOutput.textContent = `CRAFTING ${recipe.name} x${quantity} // ${recipe.time * quantity}s`; openCraftDetails(recipeKey, quantity); }
function getStationRecipe(recipeKey) {
  const buildRecipes = {
    buildWorkbench: {
      name: 'WORKBENCH',
      time: 8,
      cost: { wood: 50, stone: 10, fiber: 20 },
      managerStationType: 'workbench'
    },
    buildFurnace: {
      name: 'FURNACE',
      time: 10,
      cost: { stone: 50, iron: 10, fuel: 20 },
      managerStationType: 'furnace'
    }
  };
  if (buildRecipes[recipeKey]) return buildRecipes[recipeKey];
  if (recipeKey.startsWith('repairBeacon:')) {
    const stationId = recipeKey.slice('repairBeacon:'.length);
    const station = game.beaconStations.find(candidate => candidate.id === stationId && !candidate.repaired);
    return station ? { name: 'BEACON STATION REPAIR', time: 20, cost: station.repairCost, beaconRepairId: station.id } : null;
  }
  if (recipeKey.startsWith('beaconModule:')) {
    const moduleKey = recipeKey.slice('beaconModule:'.length);
    const station = game.beaconStations.find(candidate => candidate.id === game.activeBeaconStationId && candidate.repaired);
    const definition = beaconModuleDefinitions[moduleKey];
    if (!station || !definition) return null;
    const craftedCount = Object.values(station.modules).reduce((total, count) => total + count, 0);
    return {
      name: definition.name,
      description: definition.description,
      time: 0,
      cost: { steel: 150 + craftedCount * 75, crystal: 75 + craftedCount * 40 },
      beaconModule: true,
      beaconStationId: station.id,
      moduleKey
    };
  }
  return stationRecipes[recipeKey] || null;
}
function saveBeaconStations() {
  const savedStates = Object.fromEntries(game.beaconStations.map(station => [
    station.id,
    {
      repaired: station.repaired,
      weapons: station.turrets.map(turret => turret.weapon),
      modules: station.modules
    }
  ]));
  localStorage.setItem('horde-beacon-stations', JSON.stringify(savedStates));
}
function createBeaconTurrets(station, weapons = []) {
  const turretSlots = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const weaponKeys = Object.keys(beaconTurretWeapons);
  station.turrets = turretSlots.map(([offsetX, offsetY], index) => {
    const savedWeapon = weapons[index];
    const weapon = weaponKeys.includes(savedWeapon)
      ? savedWeapon
      : weaponKeys[Math.floor(Math.random() * weaponKeys.length)];
    return { x: station.x + offsetX * station.radius, y: station.y + offsetY * station.radius, weapon, cooldown: 0, angle: 0 };
  });
}
function updateBeaconTurrets(dt) {
  const turretGroups = [
    { turrets: game.sanctuaryTurrets, station: null },
    ...game.beaconStations
      .filter(station => station.repaired)
      .map(station => ({ turrets: station.turrets, station }))
  ];
  turretGroups.forEach(({ turrets, station }) => {
    const supportMultiplier = station ? 1 + (station.modules.support || 0) * .1 : 1;
    turrets.forEach(turret => {
      turret.cooldown = Math.max(0, turret.cooldown - dt);
      const weapon = beaconTurretWeapons[turret.weapon];
      const range = weapon.range || 850;
      const target = game.enemies
        .filter(enemy => !enemy.defeated && enemy.shieldTimer <= 0 && enemy.hp > 0)
        .map(enemy => ({ enemy, distance: Math.hypot(enemy.x - turret.x, enemy.y - turret.y) }))
        .filter(candidate => candidate.distance <= range)
        .sort((a, b) => a.distance - b.distance)[0];
      if (!target) return;
      const angle = Math.atan2(target.enemy.y - turret.y, target.enemy.x - turret.x);
      const angleDifference = Math.atan2(Math.sin(angle - turret.angle), Math.cos(angle - turret.angle));
      turret.angle += Math.sign(angleDifference) * Math.min(Math.abs(angleDifference), 8 * dt);
      if (turret.cooldown > 0) return;
      if (weapon.type === 'beam') {
        target.enemy.hp = Math.max(0, target.enemy.hp - weapon.damage * supportMultiplier);
        if (target.enemy.hp <= 0) defeatEnemy(target.enemy);
        if (weapon.pulseBlastRadius) {
          applyPulseBlast(
            target.enemy.x,
            target.enemy.y,
            weapon.pulseBlastRadius,
            weapon.pulseKnockback,
            Math.cos(angle),
            Math.sin(angle)
          );
        }
        game.beams.push({
          x: turret.x,
          y: turret.y,
          angle,
          length: target.distance,
          color: weapon.color,
          life: .12,
          maxLife: .12
        });
      } else if (weapon.type === 'grenade') {
        game.projectiles.push({
          x: turret.x,
          y: turret.y,
          vx: Math.cos(angle) * weapon.speed,
          vy: Math.sin(angle) * weapon.speed,
          life: 1.3,
          radius: 11,
          damage: weapon.damage * supportMultiplier,
          blastRadius: weapon.radius,
          color: weapon.color,
          turretProjectile: true,
          explosive: true
        });
      } else if (weapon.type === 'shotgun') {
        for (let pellet = 0; pellet < weapon.pellets; pellet++) {
          const pelletAngle = angle + (Math.random() - .5) * weapon.spread;
          game.projectiles.push({
            x: turret.x,
            y: turret.y,
            vx: Math.cos(pelletAngle) * weapon.speed,
            vy: Math.sin(pelletAngle) * weapon.speed,
            life: weapon.life,
            radius: 5,
            damage: weapon.damage * supportMultiplier,
            color: weapon.color,
            turretProjectile: true
          });
        }
      }
      turret.cooldown = weapon.cooldown / supportMultiplier;
    });
  });
}
function detonateBeaconGrenade(projectile) {
  addExplosion(projectile.x, projectile.y, projectile.blastRadius, projectile.color);
  game.enemies.forEach(enemy => {
    if (enemy.defeated || enemy.shieldTimer > 0) return;
    if (Math.hypot(enemy.x - projectile.x, enemy.y - projectile.y) > projectile.blastRadius) return;
    enemy.hp = Math.max(0, enemy.hp - projectile.damage);
    if (enemy.hp <= 0) defeatEnemy(enemy);
  });
}
function updateBeaconTurretProjectiles(dt) {
  game.projectiles.forEach(projectile => {
    if (!projectile.turretProjectile || projectile.life <= 0) return;
    projectile.x += projectile.vx * dt;
    projectile.y += projectile.vy * dt;
    projectile.life -= dt;
    const hit = game.enemies.find(enemy =>
      !enemy.defeated && enemy.shieldTimer <= 0 && enemy.hp > 0
      && Math.hypot(enemy.x - projectile.x, enemy.y - projectile.y) < enemy.r + projectile.radius
    );
    if (hit && projectile.explosive) {
      detonateBeaconGrenade(projectile);
      projectile.life = 0;
    } else if (hit) {
      hit.hp = Math.max(0, hit.hp - projectile.damage);
      if (hit.hp <= 0) defeatEnemy(hit);
      projectile.life = 0;
    } else if (projectile.explosive && projectile.life <= 0) {
      detonateBeaconGrenade(projectile);
    }
  });
}
function updateBeaconStationModules(dt) {
  game.beaconStations.forEach(station => {
    if (!station.repaired) return;
    const pulseCount = station.modules.pulse || 0;
    if (pulseCount > 0) {
      station.pulseTimer -= dt;
      if (station.pulseTimer <= 0) {
        const radius = station.radius + 100 + (pulseCount - 1) * 25;
        const fallbackAngle = Math.random() * Math.PI * 2;
        applyPulseBlast(station.x, station.y, radius, 500 * pulseCount, Math.cos(fallbackAngle), Math.sin(fallbackAngle));
        station.pulseTimer = Math.max(2, 5 - (pulseCount - 1) * .5);
      }
    }

    const drainCount = station.modules.drain || 0;
    if (drainCount > 0) {
      const radius = station.radius + 100;
      game.enemies.forEach(enemy => {
        if (enemy.defeated || enemy.shieldTimer > 0 || enemy.hp <= 0
            || Math.hypot(enemy.x - station.x, enemy.y - station.y) > radius) return;
        enemy.hp = Math.max(0, enemy.hp - 2 * drainCount * dt);
        if (enemy.hp <= 0) defeatEnemy(enemy);
      });
    }
  });
}
function updateCrafting(dt) {
  if (!game.crafting) return;
  game.crafting.remaining -= dt;
  const recipe = getStationRecipe(game.crafting.recipeKey);
  if (!recipe) {
    game.crafting = null;
    return;
  }
  const quantity = game.crafting.quantity || 1;
  ui.stationOutput.textContent = `CRAFTING ${recipe.name} x${quantity} // ${Math.ceil(game.crafting.remaining)}s`;
  if (game.crafting.remaining > 0) return;
  if (recipe.beaconRepairId) {
    const station = game.beaconStations.find(candidate => candidate.id === recipe.beaconRepairId);
    if (station) {
      station.repaired = true;
      createBeaconTurrets(station);
      saveBeaconStations();
      game.stationOpen = 'crafting';
      updateStationUI();
    }
  } else if (recipe.managerStationType) {
    game.craftedStations[recipe.managerStationType] =
      (game.craftedStations[recipe.managerStationType] || 0) + quantity;
    renderManagerInventory();
  } else if (recipe.weapon) {
    game.unlockedWeapons[recipe.weapon] = true;
    game.weaponSlots[game.crafting.weaponSlot] = recipe.weapon;
    game.weaponAmmo[game.weapon] = game.ammo;
    game.weaponReloadPending[game.weapon] = game.reloadPending;
    game.weapon = recipe.weapon;
    game.ammo = 0;
    game.reloadPending = weaponCatalog[recipe.weapon].kind !== 'melee';
    game.weaponAmmo[recipe.weapon] = game.ammo;
    game.weaponReloadPending[recipe.weapon] = game.reloadPending;
  } else if (recipe.armor) {
    game.armor = recipe.armor;
  } else if (recipe.ammo) {
    game.ammoReserve[recipe.ammo] = (game.ammoReserve[recipe.ammo] || 0) + recipe.amount * quantity;
  } else {
    Object.entries(recipe.output).forEach(([key, amount]) => {
      const outputAmount = amount * quantity;
      if (resourceTypes.some(resource => resource.key === key)) game.vault[key] = (game.vault[key] || 0) + outputAmount;
      else if (key === 'medkit') game.stationItems[key] = Math.min(5, (game.stationItems[key] || 0) + outputAmount);
      else game.stationItems[key] = (game.stationItems[key] || 0) + outputAmount;
    });
  }
  localStorage.setItem('horde-vault', JSON.stringify(game.vault));
  localStorage.setItem('horde-station-items', JSON.stringify(game.stationItems));
  const completedRecipeKey = game.crafting.recipeKey;
  game.crafting = null;
  updateInventoryUI();
  updateStationButtons();
  updateAmmoUI();
  renderWeaponBar();
  ui.stationOutput.textContent = `COMPLETE // ${recipe.name} x${quantity}`;
  if (recipe.beaconRepairId) {
    ui.craftDetails.hidden = true;
    ui.craftDetails.innerHTML = '';
  } else {
    openCraftDetails(completedRecipeKey, 1);
  }
}
function getWeaponPrerequisite(recipe) { return recipe.weapon ? Object.keys(recipe.cost || {}).find(key => weaponCatalog[key]) || null : null; }
function getWeaponTargetSlot(recipe, requestedSlot = 0) { const prerequisite = getWeaponPrerequisite(recipe); if (prerequisite) return game.weaponSlots.indexOf(prerequisite); if (requestedSlot >= 0 && requestedSlot < game.weaponSlots.length) return requestedSlot; return game.weaponSlots.findIndex(slot => !slot); }
function openCraftDetails(recipeKey, requestedQuantity = 1, requestedSlot = 0) { const recipe = getStationRecipe(recipeKey); if (!recipe) return; const repeatable = !recipe.weapon && !recipe.armor && !recipe.beaconRepairId && !recipe.beaconModule; const quantity = repeatable ? Math.max(1, Math.min(5, requestedQuantity)) : 1; const targetSlot = getWeaponTargetSlot(recipe, requestedSlot); const costEntries = Object.entries(recipe.cost || {}); const materialRows = costEntries.map(([key, amount]) => { const resource = resourceTypes.find(item => item.key === key) || { name: key === 'steelPlate' ? 'STEEL PLATE' : key.toUpperCase() }; const required = amount * quantity; const owned = getCraftResourceAmount(key); return `<li class="${owned >= required ? 'ready' : 'missing'}"><span>${resource.name}</span><strong>${owned} / ${required}</strong></li>`; }).join(''); const missing = costEntries.find(([key, amount]) => getCraftResourceAmount(key) < amount * quantity); const capacityExceeded = recipe.output?.medkit && (game.stationItems.medkit || 0) + quantity > 5; const canCraft = !missing && !capacityExceeded && !game.crafting && (!recipe.weapon || targetSlot >= 0); const quantityControls = repeatable ? `<div class="craft-quantity-controls"><span>QUANTITY</span>${[1, 2, 3, 4, 5].map(value => `<button type="button" data-craft-quantity="${value}" class="${value === quantity ? 'selected' : ''}" ${game.crafting ? 'disabled' : ''}>${value}</button>`).join('')}</div>` : ''; const slotControls = recipe.weapon ? `<div class="craft-slot-controls"><span>SLOT</span>${game.weaponSlots.map((slot, index) => { const prerequisite = getWeaponPrerequisite(recipe); const locked = Boolean(slot) && slot !== prerequisite; const selected = targetSlot === index; return `<button type="button" data-craft-slot="${index}" class="${selected ? 'selected' : ''}" ${locked || game.crafting ? 'disabled' : ''}>${index + 1}${slot ? ` ${weaponCatalog[slot].name}` : ' EMPTY'}</button>`; }).join('')}</div>` : ''; const actionLabel = game.crafting ? 'CRAFTING' : capacityExceeded ? 'STORAGE FULL' : !recipe.weapon || targetSlot >= 0 ? (canCraft ? `CRAFT x${quantity}` : 'NEED MATERIALS') : 'NO EMPTY SLOT'; ui.craftDetails.dataset.recipeKey = recipeKey; ui.craftDetails.dataset.quantity = quantity; ui.craftDetails.dataset.weaponSlot = targetSlot; ui.craftDetails.innerHTML = `<div class="craft-details-header"><strong>${recipe.name}</strong><button type="button" class="detail-close" data-close-details>✕</button></div><div class="craft-details-body"><div class="craft-detail-title">REQUIRED MATERIALS</div><ul class="craft-detail-list">${materialRows}</ul><div class="craft-detail-actions">${slotControls}${quantityControls}<button type="button" data-craft-confirm="${recipeKey}" ${canCraft ? '' : 'disabled'}>${actionLabel}</button></div></div>`; ui.craftDetails.hidden = false; }
function craftItem(recipeKey, requestedQuantity = 1, requestedSlot = Number(ui.craftDetails.dataset.weaponSlot || 0)) {
  const recipe = getStationRecipe(recipeKey);
  if (!recipe || game.crafting) return;
  const beaconStation = game.beaconStations.find(station => station.id === game.activeBeaconStationId);
  const nearbyBeaconBench = getNearbyBeaconBench();
  const atBeaconTable = game.stationOpen === 'crafting' && beaconStation?.repaired
    && nearbyBeaconBench?.station === beaconStation && nearbyBeaconBench.type === 'crafting';
  const atBeaconModuleStation = game.stationOpen === 'beacon-modules' && beaconStation?.repaired
    && nearbyBeaconBench?.station === beaconStation && nearbyBeaconBench.type === 'beacon-modules';
  const atBeaconRepair = recipe.beaconRepairId && game.stationOpen === 'beacon-repair'
    && getNearbyBeaconStation()?.id === recipe.beaconRepairId;
  if (recipe.managerStationType && game.stationOpen !== 'designer') return;
  if (getBiome(game.player.x, game.player.y).key !== 'sanctuary'
      && !atBeaconTable && !atBeaconModuleStation && !atBeaconRepair) return;
  if (recipe.beaconModule && (!atBeaconModuleStation || recipe.beaconStationId !== beaconStation.id)) return;
  const repeatable = !recipe.weapon && !recipe.armor && !recipe.beaconRepairId && !recipe.beaconModule;
  const quantity = repeatable ? Math.max(1, Math.min(5, requestedQuantity)) : 1;
  const weaponSlot = recipe.weapon ? getWeaponTargetSlot(recipe, requestedSlot) : -1;
  if (recipe.weapon && weaponSlot < 0) {
    ui.stationOutput.textContent = 'NO EMPTY WEAPON SLOT';
    return;
  }
  if (recipe.output?.medkit && (game.stationItems.medkit || 0) + quantity > 5) {
    ui.stationOutput.textContent = 'MEDKIT STORAGE FULL';
    return;
  }
  const missing = Object.entries(recipe.cost).find(([key, amount]) => getCraftResourceAmount(key) < amount * quantity);
  if (missing) {
    const shortage = missing[1] * quantity - getCraftResourceAmount(missing[0]);
    ui.stationOutput.textContent = `NEED ${shortage} MORE ${missing[0].toUpperCase()}`;
    return;
  }
  Object.entries(recipe.cost).forEach(([key, amount]) => spendCraftResource(key, amount * quantity));
  if (recipe.beaconModule) {
    beaconStation.modules[recipe.moduleKey]++;
    saveBeaconStations();
    localStorage.setItem('horde-vault', JSON.stringify(game.vault));
    updateInventoryUI();
    updateStationButtons();
    ui.stationOutput.textContent = `INSTALLED // ${recipe.name} x${beaconStation.modules[recipe.moduleKey]}`;
    const biome = getBiome(game.player.x, game.player.y);
    updateBiomeEffects(biome);
    updateBiomeHazard(biome);
    ui.craftDetails.hidden = true;
    ui.craftDetails.innerHTML = '';
    return;
  }
  game.crafting = { recipeKey, quantity, weaponSlot, remaining: recipe.time * quantity, total: recipe.time * quantity };
  localStorage.setItem('horde-vault', JSON.stringify(game.vault));
  updateInventoryUI();
  updateStationButtons();
  ui.stationOutput.textContent = `CRAFTING ${recipe.name} x${quantity} // ${recipe.time * quantity}s`;
  openCraftDetails(recipeKey, quantity, weaponSlot);
}
function updateStationButtons() { document.querySelectorAll('[data-craft]').forEach(button => { button.disabled = Boolean(game.crafting); button.classList.toggle('crafting', Boolean(game.crafting && button.dataset.craft === game.crafting.recipeKey)); }); }
function renderArsenal() 
{ const weapons = Object.entries(weaponRecipes).map(([key, recipe]) => `<button type="button" data-craft="${key}">${recipe.name}<small>CRAFT WEAPON</small></button>`).join(''); const armor = Object.entries(armorRecipes).map(([key, recipe]) => `<button type="button" data-craft="${key}">${recipe.name}<small>${armorCatalog[recipe.armor].description}</small></button>`).join(''); const ammo = Object.entries(ammoCatalog).filter(([key]) => key !== 'magicGauntletAmmo' && key !== `cosmosGauntletAmmo`).map(([key, recipe]) => `<button type="button" data-craft="ammo_${key}">${recipe.name}<small>CRAFT AMMO</small></button>`).join(''); ui.arsenal.innerHTML = `<span class="station-title">ARSENAL // WEAPONS</span>${weapons}<span class="station-title">ARMOR // EQUIP ONE</span>${armor}<span class="station-title">AMMO FABRICATOR</span>${ammo}`; ui.arsenal.addEventListener('click', event => { const button = event.target.closest('[data-craft]'); if (button) openCraftDetails(button.dataset.craft); }); updateStationButtons(); }
renderArsenal();
const renderCraftDetails = openCraftDetails;
openCraftDetails = function(recipeKey, requestedQuantity = 1, requestedSlot = 0) {
  renderCraftDetails(recipeKey, requestedQuantity, requestedSlot);
  const recipe = stationRecipes[recipeKey];
  if (!recipe?.weapon || getWeaponPrerequisite(recipe)) return;
  ui.craftDetails.querySelectorAll('[data-craft-slot]').forEach(button => button.disabled = Boolean(game.crafting));
};
const renderModuleCraftDetails = openCraftDetails;
openCraftDetails = function(recipeKey, requestedQuantity = 1, requestedSlot = 0) {
  renderModuleCraftDetails(recipeKey, requestedQuantity, requestedSlot);
  const recipe = getStationRecipe(recipeKey);
  if (!recipe?.beaconModule) return;
  const title = ui.craftDetails.querySelector('.craft-detail-title');
  title?.insertAdjacentHTML('beforebegin', `<div class="module-description">${recipe.description}<br>INSTALLED: ${game.beaconStations.find(station => station.id === recipe.beaconStationId).modules[recipe.moduleKey]}</div>`);
};
function drawBiomeHazard(biome, width, height) { if (biome.key === 'sanctuary' || biome.key.startsWith('beacon-')) return; const hazard = biome.effects.hazard; const time = performance.now() / 1000; const name = hazard.name; ctx.save(); ctx.globalAlpha = .2; if (name.includes('MIST') || name.includes('ASH') || name.includes('SPORES') || name.includes('RAIN')) { ctx.fillStyle = biome.color; for (let i = 0; i < 28; i++) { const x = (i * 97 + time * 18) % width; const y = (i * 53 + time * 11) % height; ctx.beginPath(); ctx.arc(x, y, 3 + (i % 4), 0, Math.PI * 2); ctx.fill(); } } else if (name.includes('HEAT') || name.includes('EMBER') || name.includes('FIRE') || name.includes('BURN')) { ctx.strokeStyle = biome.color; ctx.lineWidth = 2; for (let i = 0; i < 18; i++) { const x = (i * 131 + time * 35) % width; const y = (i * 71 + time * 24) % height; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 12, y + 28); ctx.stroke(); } } else if (name.includes('FREEZE') || name.includes('FROST') || name.includes('COLD')) { ctx.fillStyle = biome.color; for (let i = 0; i < 24; i++) { const x = (i * 83 + time * 12) % width; const y = (i * 61 + time * 30) % height; ctx.fillRect(x, y, 2, 8); } } else if (name.includes('LIGHTNING') || name.includes('THUNDER')) { ctx.strokeStyle = biome.color; ctx.lineWidth = 3; for (let i = 0; i < 3; i++) { const x = (i * 211 + time * 7) % width; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x - 14, height * .25); ctx.lineTo(x + 8, height * .5); ctx.lineTo(x - 12, height * .78); ctx.stroke(); } } else if (name.includes('ROOT') || name.includes('BONE')) { ctx.strokeStyle = biome.color; ctx.lineWidth = 4; for (let i = 0; i < 8; i++) { const x = i * width / 7; ctx.beginPath(); ctx.moveTo(x, height); ctx.quadraticCurveTo(x + 20, height * .7, x - 8, height * .42); ctx.stroke(); } } else if (name.includes('GRAVITY') || name.includes('PRESSURE') || name.includes('HORIZON')) { ctx.strokeStyle = biome.color; ctx.lineWidth = 2; for (let radius = 70; radius < Math.max(width, height); radius += 100) { ctx.beginPath(); ctx.arc(width / 2, height / 2, radius + Math.sin(time * 2 + radius) * 8, 0, Math.PI * 2); ctx.stroke(); } } else { ctx.fillStyle = biome.color; for (let i = 0; i < 18; i++) { const x = (i * 113 + time * 20) % width; const y = (i * 67 + time * 14) % height; ctx.beginPath(); ctx.arc(x, y, 2 + i % 3, 0, Math.PI * 2); ctx.fill(); } } ctx.restore(); }
function generateHazardZones() { const zones = []; const random = seededRandom(game.seed + 71); for (let i = 0; i < 110; i++) { const x = (random() - .5) * mapRadius * 2; const y = (random() - .5) * mapRadius * 1.5; const biome = getBiome(x, y); if (biome.key === 'sanctuary' || biome.key === 'void' || biome.key.startsWith('beacon-')) continue; zones.push({ x, y, radius: 90 + random() * 150, biomeKey: biome.key, color: biome.color, damagePerSecond: biome.effects.hazard.zoneDamagePerSecond * 1.6, hazard: biome.effects.hazard }); } return zones; }
function drawHazardShape(context, zone) {
  const visual = zone.hazard?.visual || 'pool';
  const { x, y, radius } = zone;
  context.beginPath();
  if (visual.includes('pool') || visual.includes('crater') || visual.includes('cloud') || visual.includes('patch') || visual.includes('pile') || visual.includes('core')) context.ellipse(x, y, radius, radius * .72, .15, 0, Math.PI * 2);
  else if (visual.includes('spikes') || visual.includes('pylon')) {
    context.moveTo(x, y - radius);
    for (let i = 0; i < 8; i++) {
      const angle = -Math.PI / 2 + i * Math.PI / 4;
      const distance = i % 2 ? radius * .62 : radius;
      context.lineTo(x + Math.cos(angle) * distance, y + Math.sin(angle) * distance);
    }
    context.closePath();
  } else context.arc(x, y, radius, 0, Math.PI * 2);
}
function drawBrambleZones() {
  if (!game.brambleZones.length) return;
  const camX = game.camera.x - canvas.clientWidth / 2;
  const camY = game.camera.y - canvas.clientHeight / 2;
  ctx.save();
  ctx.translate(-camX, -camY);
  game.brambleZones.forEach(zone => {
    ctx.save();
    ctx.globalAlpha = zone.active ? .75 : .5 + Math.sin(performance.now() / 90) * .2;
    ctx.strokeStyle = zone.active ? '#8fc47e' : '#d7b07a';
    ctx.fillStyle = zone.active ? '#315a3544' : '#d7b07a22';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (zone.active) {
      for (let i = 0; i < 8; i++) {
        const angle = i * Math.PI / 4;
        ctx.beginPath();
        ctx.moveTo(zone.x + Math.cos(angle) * 12, zone.y + Math.sin(angle) * 12);
        ctx.lineTo(zone.x + Math.cos(angle) * (zone.radius + 8), zone.y + Math.sin(angle) * (zone.radius + 8));
        ctx.stroke();
      }
    }
    ctx.restore();
  });
  ctx.restore();
}
function drawSectorFourEffects() {
  const camX = game.camera.x - canvas.clientWidth / 2;
  const camY = game.camera.y - canvas.clientHeight / 2;
  ctx.save();
  ctx.translate(-camX, -camY);
  game.lightningStrikes.forEach(strike => {
    ctx.save();
    if (strike.struck) {
      ctx.globalAlpha = Math.max(0, strike.flashTimer / .25);
      ctx.strokeStyle = '#d9faff';
      ctx.shadowBlur = 18;
      ctx.shadowColor = '#8bdff0';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(strike.x, strike.y - 180);
      ctx.lineTo(strike.x - 12, strike.y - 95);
      ctx.lineTo(strike.x + 10, strike.y - 35);
      ctx.lineTo(strike.x, strike.y);
      ctx.stroke();
    } else {
      ctx.globalAlpha = .65;
      ctx.fillStyle = '#f6ed9833';
      ctx.strokeStyle = '#f6ed98';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(strike.x, strike.y, strike.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  });
  game.portals.forEach(portal => {
    ctx.save();
    ctx.globalAlpha = Math.min(1, portal.timer);
    ctx.strokeStyle = '#ca8bea';
    ctx.fillStyle = '#ca8bea33';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(portal.x, portal.y, 42, 24, performance.now() / 500, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  });
  game.enemyTrails.forEach(trail => {
    ctx.save();
    ctx.globalAlpha = Math.max(0, trail.life / trail.maxLife) * .65;
    ctx.fillStyle = trail.color || '#ef6672';
    ctx.beginPath();
    ctx.arc(trail.x, trail.y, trail.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
  game.toxicBossZones.forEach(zone => {
    ctx.save();
    ctx.globalAlpha = .45 * zone.life / zone.maxLife;
    ctx.fillStyle = '#8fbf3f';
    ctx.strokeStyle = '#b7dc61';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  });
  game.abyssalBossWaves.forEach(wave => {
    ctx.save();
    ctx.globalAlpha = .32 * wave.life / wave.maxLife;
    ctx.fillStyle = '#709ed0';
    ctx.strokeStyle = '#b9d5f2';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  });
  game.darkBossDashCircles.forEach(circle => {
    ctx.save();
    ctx.globalAlpha = .6 * circle.life / circle.maxLife;
    ctx.fillStyle = '#809eea55';
    ctx.strokeStyle = '#a9bdff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  });
  game.projectiles.filter(projectile => projectile.singularity).forEach(projectile => {
    ctx.save();
    ctx.globalAlpha = .22;
    ctx.fillStyle = '#ec7dc4';
    ctx.strokeStyle = '#f3a5dc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(projectile.x, projectile.y, projectile.singularityRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.globalAlpha = .9;
    ctx.beginPath();
    ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
  game.enemies.forEach(enemy => {
    if (enemy.effect === 'dead-star-boss-aura' && enemy.deadStarAuraTimer > 0) {
      ctx.save();
      ctx.globalAlpha = .22 * enemy.deadStarAuraTimer / .75;
      ctx.fillStyle = '#ffb067';
      ctx.strokeStyle = '#ffdf91';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, deadStarBossAuraRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    if (enemy.effect === 'dark-boss-charge' && enemy.darkDashPauseTimer > 0) {
      ctx.save();
      ctx.globalAlpha = .65;
      ctx.strokeStyle = '#a9bdff';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.r + 18, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    if (enemy.effect === 'frozen-boss-aura' || enemy.effect === 'ashen-boss-aura') {
      ctx.save();
      ctx.globalAlpha = .2 + Math.sin(performance.now() / 180) * .04;
      ctx.fillStyle = enemy.effect === 'frozen-boss-aura' ? '#8bd9f2' : '#d8a75d';
      ctx.strokeStyle = ctx.fillStyle;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, sectorOneBossAuraRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    if (hasEnemyEffect(enemy, 'spin-attack') && enemy.spinTimer > 0) {
      ctx.save();
      ctx.globalAlpha = enemy.spinTimer / .5;
      ctx.strokeStyle = '#809eea';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, 80, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    if (!hasEnemyEffect(enemy, 'storm-sword') || enemy.stormSwingTimer <= 0) return;
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.rotate(enemy.facingAngle);
    ctx.strokeStyle = '#8db7ee';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(enemy.r, -18);
    ctx.lineTo(enemy.r + 52, 0);
    ctx.lineTo(enemy.r, 18);
    ctx.stroke();
    ctx.restore();
  });
  ctx.restore();
}
function drawHazardZones() { if (!game.hazardZones.length) return; const biome = getBiome(game.player.x, game.player.y); const camX = game.camera.x - canvas.clientWidth / 2; const camY = game.camera.y - canvas.clientHeight / 2; const time = performance.now() / 1000; ctx.save(); ctx.translate(-camX, -camY); game.hazardZones.forEach(zone => { const radius = zone.radius; ctx.globalAlpha = zone.biomeKey === biome.key ? .34 : .12; ctx.fillStyle = zone.color; ctx.strokeStyle = zone.color; ctx.lineWidth = 3; drawHazardShape(ctx, zone); ctx.fill(); ctx.stroke(); ctx.globalAlpha *= .8; if (zone.hazard.visual.includes('ice') || zone.hazard.visual.includes('spikes')) { for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(zone.x + (i - 2) * radius / 3, zone.y + radius * .45); ctx.lineTo(zone.x + (i - 2) * radius / 4, zone.y - radius * .6); ctx.stroke(); } } else if (zone.hazard.visual.includes('lightning') || zone.hazard.visual.includes('pylon')) { ctx.beginPath(); ctx.moveTo(zone.x, zone.y - zone.radius); ctx.lineTo(zone.x - 10, zone.y - zone.radius * .25); ctx.lineTo(zone.x + 8, zone.y + zone.radius * .05); ctx.lineTo(zone.x - 4, zone.y + zone.radius); ctx.stroke(); } else { ctx.beginPath(); ctx.arc(zone.x, zone.y, radius * (.55 + Math.sin(time * 2 + zone.x) * .08), 0, Math.PI * 2); ctx.stroke(); } }); ctx.restore(); }
function drawVoidMapRegions() {
  const scale = getTacticalMapScale();
  const center = getMapCenter();
  mapCtx.save();
  applyMapTransform(scale);
  mapCtx.fillStyle = '#241d3d';
  mapCtx.beginPath();
  mapCtx.rect(center.x - mapCanvas.width / (2 * scale), center.y - mapCanvas.height / (2 * scale), mapCanvas.width / scale, mapCanvas.height / scale);
  mapCtx.arc(0, 0, mapRadius, 0, Math.PI * 2, true);
  mapCtx.fill('evenodd');
  mapCtx.restore();
}
function drawHazardMap() {
  drawVoidMapRegions();
  if (!game.hazardZones.length) return;
  const scale = getTacticalMapScale();
  mapCtx.save();
  applyMapTransform(scale);
  game.hazardZones.forEach(zone => {
    if (!game.discovered.has(getDiscoveryKey(zone.x, zone.y))) return;
    mapCtx.globalAlpha = .55;
    mapCtx.fillStyle = zone.color;
    mapCtx.strokeStyle = zone.color;
    drawHazardShape(mapCtx, zone);
    mapCtx.fill();
    mapCtx.stroke();
  });
  mapCtx.restore();
}
function drawPickups() { const camX = game.camera.x - canvas.clientWidth / 2; const camY = game.camera.y - canvas.clientHeight / 2; ctx.save(); ctx.translate(-camX, -camY); game.nodes.forEach(node => { if (node.taken || node.type !== 'chest') return; ctx.fillStyle = '#d7b07a'; ctx.strokeStyle = '#ffdf91'; ctx.lineWidth = 2; ctx.fillRect(node.x - 12, node.y - 8, 24, 16); ctx.strokeRect(node.x - 12, node.y - 8, 24, 16); ctx.fillStyle = '#ffdf91'; ctx.fillRect(node.x - 2, node.y - 8, 4, 16); }); game.drops.forEach(drop => { const resource = resourceTypes.find(item => item.key === drop.type); ctx.fillStyle = resource.color; ctx.shadowBlur = 12; ctx.shadowColor = resource.color; ctx.beginPath(); ctx.moveTo(drop.x, drop.y - 8); ctx.lineTo(drop.x + 8, drop.y); ctx.lineTo(drop.x, drop.y + 8); ctx.lineTo(drop.x - 8, drop.y); ctx.fill(); ctx.shadowBlur = 0; }); ctx.restore(); }
function drawSanctuaryBuildStations() {
  const camX = game.camera.x - canvas.clientWidth / 2;
  const camY = game.camera.y - canvas.clientHeight / 2;
  ctx.save();
  ctx.translate(-camX, -camY);
  Object.entries(sanctuaryBuildStations).forEach(([type, position]) => {
    const designer = type === 'designer';
    const color = designer ? '#8f7cff' : '#8fe0ad';
    ctx.fillStyle = '#493a36';
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.fillRect(position.x - 26, position.y - 17, 52, 34);
    ctx.strokeRect(position.x - 26, position.y - 17, 52, 34);
    ctx.fillStyle = designer ? '#b9a8ff' : '#8fe0ad';
    ctx.fillRect(position.x - 22, position.y - 21, 44, 6);
    if (!designer) {
      ctx.beginPath();
      ctx.arc(position.x, position.y, 8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.textAlign = 'center';
    ctx.font = 'bold 9px Space Mono';
    ctx.fillStyle = color;
    ctx.fillText(designer ? 'DESIGNER TABLE' : 'MANAGERS TABLE', position.x, position.y + 32);
  });
  game.placedStations.forEach(station => {
    if (game.managerMode && managerDrag?.source === 'placed' && managerDrag.id === station.id) return;
    ctx.fillStyle = station.type === 'workbench' ? '#8b5a3c' : '#493a36';
    ctx.strokeStyle = station.type === 'workbench' ? '#f9c779' : '#ff865c';
    ctx.lineWidth = 3;
    ctx.fillRect(station.x - placedStationRadius, station.y - placedStationRadius, placedStationRadius * 2, placedStationRadius * 2);
    ctx.strokeRect(station.x - placedStationRadius, station.y - placedStationRadius, placedStationRadius * 2, placedStationRadius * 2);
    ctx.fillStyle = station.type === 'workbench' ? '#c88968' : '#ff865c';
    if (station.type === 'workbench') ctx.fillRect(station.x - 20, station.y - 28, 40, 7);
    else {
      ctx.beginPath();
      ctx.arc(station.x, station.y, 10, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.textAlign = 'center';
    ctx.font = 'bold 8px Space Mono';
    ctx.fillStyle = '#f4eee5';
    ctx.fillText(station.type === 'workbench' ? 'WORKBENCH' : 'FURNACE', station.x, station.y + 36);
    if (Math.hypot(game.player.x - station.x, game.player.y - station.y) <= stationInteractionRadius) {
      ctx.fillText(`E // ${station.type === 'workbench' ? 'CRAFT' : 'FURNACE'}`, station.x, station.y + 49);
    }
  });
  if (game.managerMode && managerDrag?.clientX !== undefined) {
    const world = managerScreenToWorld(managerDrag.clientX, managerDrag.clientY);
    ctx.globalAlpha = .65;
    ctx.fillStyle = managerDrag.type === 'workbench' ? '#8b5a3c' : '#493a36';
    ctx.strokeStyle = managerDrag.type === 'workbench' ? '#f9c779' : '#ff865c';
    ctx.fillRect(world.x - placedStationRadius, world.y - placedStationRadius, placedStationRadius * 2, placedStationRadius * 2);
    ctx.strokeRect(world.x - placedStationRadius, world.y - placedStationRadius, placedStationRadius * 2, placedStationRadius * 2);
    ctx.globalAlpha = 1;
  }
  Object.entries(sanctuaryBuildStations).forEach(([type, position]) => {
    if (Math.hypot(game.player.x - position.x, game.player.y - position.y) > stationInteractionRadius) return;
    ctx.textAlign = 'center';
    ctx.font = 'bold 10px Space Mono';
    ctx.fillStyle = '#f4eee5';
    ctx.fillText(`E // ${type === 'designer' ? 'DESIGN' : 'MANAGE'}`, position.x, position.y + 50);
  });
  ctx.restore();
}
function drawBeaconStations() {
  const camX = game.camera.x - canvas.clientWidth / 2;
  const camY = game.camera.y - canvas.clientHeight / 2;
  ctx.save();
  ctx.translate(-camX, -camY);
  game.sanctuaryTurrets.forEach(turret => {
    const color = beaconTurretWeapons[turret.weapon].color;
    ctx.fillStyle = '#17131a';
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(turret.x, turret.y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.save();
    ctx.translate(turret.x, turret.y);
    ctx.rotate(turret.angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(22, 0);
    ctx.stroke();
    ctx.restore();
  });
  game.beaconStations.forEach(station => {
    ctx.save();
    ctx.globalAlpha = station.repaired ? .5 : .35;
    ctx.fillStyle = station.repaired ? '#8fe0ad18' : '#ff865c12';
    ctx.strokeStyle = station.repaired ? '#8fe0ad' : '#ff865c';
    ctx.lineWidth = 3;
    ctx.setLineDash(station.repaired ? [] : [12, 9]);
    ctx.beginPath();
    ctx.arc(station.x, station.y, station.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.font = 'bold 12px Space Mono';
    ctx.fillStyle = station.repaired ? '#8fe0ad' : '#ffb35c';
    ctx.fillText(station.repaired ? 'BEACON STATION' : 'RUINED BEACON', station.x, station.y - station.radius - 22);
    if (station.repaired) {
      ctx.fillStyle = '#8b5a3c';
      ctx.strokeStyle = '#f9c779';
      ctx.lineWidth = 3;
      ctx.fillRect(station.x - beaconModuleBenchOffset - 20, station.y - 16, 40, 32);
      ctx.strokeRect(station.x - beaconModuleBenchOffset - 20, station.y - 16, 40, 32);
      ctx.fillStyle = '#c88968';
      ctx.fillRect(station.x - beaconModuleBenchOffset - 17, station.y - 20, 34, 7);
      ctx.fillStyle = '#8b5a3c';
      ctx.strokeStyle = '#8fe0ad';
      ctx.fillRect(station.x + beaconModuleBenchOffset - 20, station.y - 16, 40, 32);
      ctx.strokeRect(station.x + beaconModuleBenchOffset - 20, station.y - 16, 40, 32);
      ctx.fillStyle = '#8fe0ad';
      ctx.beginPath();
      ctx.arc(station.x + beaconModuleBenchOffset, station.y - 2, 8, 0, Math.PI * 2);
      ctx.fill();
      station.turrets.forEach(turret => {
        const color = beaconTurretWeapons[turret.weapon].color;
        ctx.fillStyle = '#17131a';
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.fillRect(turret.x - 14, turret.y - 14, 28, 28);
        ctx.strokeRect(turret.x - 14, turret.y - 14, 28, 28);
        ctx.save();
        ctx.translate(turret.x, turret.y);
        ctx.rotate(turret.angle);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(21, 0);
        ctx.stroke();
        ctx.restore();
      });
      ctx.fillStyle = '#f9c779';
      ctx.font = 'bold 9px Space Mono';
      ctx.fillText('CRAFTING TABLE', station.x - beaconModuleBenchOffset, station.y + 31);
      ctx.fillStyle = '#8fe0ad';
      ctx.fillText('MODULE STATION', station.x + beaconModuleBenchOffset, station.y + 31);
    } else {
      ctx.strokeStyle = '#ff865c';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(station.x, station.y, 30, .2, Math.PI * 1.15);
      ctx.stroke();
      ctx.fillStyle = '#c88968';
      ctx.fillRect(station.x - 14, station.y - 12, 24, 24);
    }
    if (!station.repaired && getNearbyBeaconStation() === station) {
      ctx.fillStyle = '#f4eee5';
      ctx.font = 'bold 10px Space Mono';
      ctx.fillText('E // REPAIR', station.x, station.y + station.radius + 22);
    } else if (station.repaired) {
      const nearbyBench = getNearbyBeaconBench();
      if (nearbyBench?.station === station) {
        ctx.fillStyle = '#f4eee5';
        ctx.font = 'bold 10px Space Mono';
        ctx.fillText(`E // ${nearbyBench.type === 'crafting' ? 'CRAFT' : 'MODULES'}`, nearbyBench.x, nearbyBench.y + 48);
      }
    }
    ctx.restore();
  });
  ctx.restore();
}
function drawBeaconStationMapMarkers() {
  if (!game.discovered.has(getSectorKey(3))) return;
  const scale = getTacticalMapScale();
  mapCtx.save();
  applyMapTransform(scale);
  game.beaconStations.forEach(station => {
    const color = station.repaired ? '#8fe0ad' : '#ff865c';
    mapCtx.fillStyle = color;
    mapCtx.globalAlpha = .2;
    mapCtx.beginPath();
    mapCtx.arc(station.x, station.y, station.radius, 0, Math.PI * 2);
    mapCtx.fill();
    mapCtx.globalAlpha = .7;
    mapCtx.strokeStyle = color;
    mapCtx.lineWidth = 3 / scale;
    mapCtx.beginPath();
    mapCtx.arc(station.x, station.y, station.radius, 0, Math.PI * 2);
    mapCtx.stroke();
    mapCtx.globalAlpha = 1;
  });
  mapCtx.restore();
}
function drawGameWorld() {
  draw();
  drawBrambleZones();
  drawSectorFourEffects();
  drawHazardZones();
  drawPickups();
  drawSanctuaryBuildStations();
  drawBeaconStations();
}
function drawManagerView() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const view = getManagerViewTransform();
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#172d2d';
  ctx.fillRect(0, 0, width, height);
  ctx.save();
  ctx.translate(view.centerX, view.centerY);
  ctx.scale(view.scale, view.scale);
  ctx.translate(game.camera.x - width / 2, game.camera.y - height / 2);
  drawGameWorld();
  ctx.restore();
}
function loop(now) {
  if (mapOpen) {
    drawMap();
    drawHazardMap();
    drawBeaconStationMapMarkers();
    drawStalkerMapMarker();
    animation = requestAnimationFrame(loop);
    return;
  }
  if (game.managerMode) {
    drawManagerView();
    animation = requestAnimationFrame(loop);
    return;
  }
  if (game.paused) { animation = requestAnimationFrame(loop); return; }
  const dt = Math.min((now - lastTime) / 1000, .04);
  lastTime = now;
  updateCrafting(dt); update(dt); reloadAmmo(); updateAmmoUI(); updateBiomeAnnouncement(dt);
  drawGameWorld();
  drawMap(); drawHazardMap(); drawBeaconStationMapMarkers(); drawStalkerMapMarker();
  if (game.active) animation = requestAnimationFrame(loop);
}
function updateBiomeAnnouncement(dt) { const biome = getBiome(game.player.x, game.player.y); game.discovered.add(getDiscoveryKey(game.player.x, game.player.y)); game.discovered.add(biome.key === 'sanctuary' ? 'sanctuary' : getSectorKey(getBiomeSector(Math.hypot(game.player.x, game.player.y)))); if (biome.key !== game.biomeKey || biome.name !== game.biomeName) { game.biomeKey = biome.key; game.biomeName = biome.name; game.announcementTimer = 3; announceBiome(biome); updateBiomeEffects(biome); updateBiomeHazard(biome); } game.announcementTimer = Math.max(0, game.announcementTimer - dt); if (game.announcementTimer === 0) ui.announcement.classList.remove('show'); }
function updateBiomeHazard(biome) { const hazard = biome.effects.hazard; ui.effects.querySelector('.biome-hazard-effect')?.remove(); ui.effects.insertAdjacentHTML('beforeend', `<span class="biome-effect negative biome-hazard-effect" title="${hazard.description}"><b>!</b>${hazard.name}</span>`); }
function updateBiomeEffects(biome) { const effects = biome.effects; const conditions = []; if (effects.healthRegen) conditions.push({ positive: true, text: `REGEN +${effects.healthRegen}/SEC`, detail: biome.key.startsWith('beacon-') ? `Restores ${effects.healthRegen} health per second inside this beacon station.` : `Restores ${effects.healthRegen} health per second while outside the beacon.` }); if (effects.moveMultiplier !== 1) conditions.push({ positive: effects.moveMultiplier > 1, text: `MOVE ${effects.moveMultiplier > 1 ? '+' : ''}${Math.round((effects.moveMultiplier - 1) * 100)}%`, detail: `${effects.moveMultiplier > 1 ? 'Increases' : 'Reduces'} player movement speed by ${Math.abs(Math.round((effects.moveMultiplier - 1) * 100))}%.` }); if (effects.fireCooldownMultiplier !== 1) conditions.push({ positive: effects.fireCooldownMultiplier < 1, text: `FIRE ${effects.fireCooldownMultiplier < 1 ? '+' : '-'}${Math.round(Math.abs(1 - effects.fireCooldownMultiplier) * 100)}%`, detail: `${effects.fireCooldownMultiplier < 1 ? 'Reduces' : 'Increases'} the delay between shots by ${Math.round(Math.abs(1 - effects.fireCooldownMultiplier) * 100)}%.` }); if (effects.pulseCooldownMultiplier !== 1) conditions.push({ positive: effects.pulseCooldownMultiplier < 1, text: `PULSE ${effects.pulseCooldownMultiplier < 1 ? '+' : '-'}${Math.round(Math.abs(1 - effects.pulseCooldownMultiplier) * 100)}%`, detail: `${effects.pulseCooldownMultiplier < 1 ? 'Reduces' : 'Increases'} the pulse cooldown by ${Math.round(Math.abs(1 - effects.pulseCooldownMultiplier) * 100)}%.` }); if (effects.salvageMultiplier !== 1) conditions.push({ positive: effects.salvageMultiplier > 1, text: `SALVAGE +${Math.round((effects.salvageMultiplier - 1) * 100)}%`, detail: `Collected salvage is multiplied by ${effects.salvageMultiplier}x.` }); if (effects.enemySpeedMultiplier !== 1) conditions.push({ positive: effects.enemySpeedMultiplier < 1, text: `HORDE ${effects.enemySpeedMultiplier < 1 ? '-' : '+'}${Math.round(Math.abs(1 - effects.enemySpeedMultiplier) * 100)}% SPEED`, detail: `Enemies move ${effects.enemySpeedMultiplier < 1 ? 'slower' : 'faster'} by ${Math.round(Math.abs(1 - effects.enemySpeedMultiplier) * 100)}%.` }); if (effects.damageMultiplier !== 1) conditions.push({ positive: false, text: `DAMAGE +${Math.round((effects.damageMultiplier - 1) * 100)}%`, detail: `Enemy contact damage is increased by ${Math.round((effects.damageMultiplier - 1) * 100)}%.` }); ui.effects.innerHTML = `<span class="biome-effects-title">${biome.name} // CONDITIONS</span>${conditions.map(condition => `<span class="biome-effect ${condition.positive ? 'positive' : 'negative'}" title="${condition.detail}"><b>${condition.positive ? '+' : '-'}</b>${condition.text}</span>`).join('')}`; }
const renderBiomeEffects = updateBiomeEffects;
updateBiomeEffects = function(biome) {
  renderBiomeEffects(biome);
  const damageBonus = biome.effects.playerDamageMultiplier || 1;
  if (damageBonus > 1) {
    const percent = Math.round((damageBonus - 1) * 100);
    ui.effects.insertAdjacentHTML('beforeend', `<span class="biome-effect positive" title="Increases player attack damage by ${percent}% while inside this beacon station."><b>+</b>PLAYER DAMAGE +${percent}%</span>`);
  }
};
function updateBrambleZones(dt) {
  let slowsPlayer = false;
  game.brambleZones.forEach(zone => {
    let justActivated = false;
    if (!zone.active) {
      zone.telegraphTimer -= dt;
      if (zone.telegraphTimer <= 0) {
        zone.active = true;
        zone.life = 3;
        justActivated = true;
        burst(zone.x, zone.y, 8, 100);
      }
    }
    if (zone.active) {
      if (!justActivated) zone.life -= dt;
      if (Math.hypot(game.player.x - zone.x, game.player.y - zone.y) < zone.radius) {
        game.health -= 8 * dt;
        slowsPlayer = true;
      }
    }
  });
  game.brambleZones = game.brambleZones.filter(zone => !zone.active || zone.life > 0);
  return slowsPlayer;
}

function update(dt) {
  game.attackDisabledTimer = Math.max(0, game.attackDisabledTimer - dt);
  game.decayTimer = Math.max(0, game.decayTimer - dt);
  if (game.decayTimer > 0) game.health -= 4 * (1 - (getArmorEffects().statusDamageReduction || 0)) * dt;
  updateRiftPortals(dt);
  updateWraithPestSpawns(dt);
  updateWraithBossGuards(dt);
  updateLightningStrikes(dt);
  game.enemyTrails.forEach(trail => {
    trail.life -= dt;
    if (Math.hypot(game.player.x - trail.x, game.player.y - trail.y) < trail.radius) {
      game.health -= trail.damagePerSecond * dt;
    }
  });
  game.enemyTrails = game.enemyTrails.filter(trail => trail.life > 0);
  game.toxicBossZones.forEach(zone => {
    zone.life -= dt;
    if (Math.hypot(game.player.x - zone.x, game.player.y - zone.y) < zone.radius) {
      game.health -= zone.damagePerSecond * dt;
    }
  });
  game.toxicBossZones = game.toxicBossZones.filter(zone => zone.life > 0);
  updateAbyssalBossWaves(dt);
  const slowedByBramble = updateBrambleZones(dt);
  const p = game.player;
  const dx = (keys.d ? 1 : 0) - (keys.a ? 1 : 0);
  const dy = (keys.s ? 1 : 0) - (keys.w ? 1 : 0);
  const length = Math.hypot(dx, dy) || 1;
  const movementEffects = getBiome(p.x, p.y).effects;
  const armor = getArmorEffects();
  const slowedByFrostfallAura = game.enemies.some(enemy => !enemy.defeated && hasEnemyEffect(enemy, 'slow-aura') && Math.hypot(p.x - enemy.x, p.y - enemy.y) < frostfallAuraRadius)
    || game.projectiles.some(projectile => projectile.frostAura && projectile.life > 0 && Math.hypot(p.x - projectile.x, p.y - projectile.y) < projectile.frostAuraRadius);
  const inFrozenMiniBossAura = game.enemies.some(enemy => !enemy.defeated && enemy.effect === 'frozen-boss-aura' && Math.hypot(p.x - enemy.x, p.y - enemy.y) < sectorOneBossAuraRadius);
  const enemySlowMultiplier = (slowedByFrostfallAura ? .75 : 1) * (inFrozenMiniBossAura ? .85 : 1) * (slowedByBramble ? .5 : 1) * (game.attackDisabledTimer > 0 ? .5 : 1);
  if (inFrozenMiniBossAura) game.health -= 6 * (1 - (armor.hazardDamageReduction || 0)) * dt;

  p.x += dx / length * (keys.shift ? 390 : 220) * movementEffects.moveMultiplier * (armor.moveMultiplier || 1) * enemySlowMultiplier * dt;
  p.y += dy / length * (keys.shift ? 390 : 220) * movementEffects.moveMultiplier * (armor.moveMultiplier || 1) * enemySlowMultiplier * dt;
  p.angle = Math.atan2(pointer.y - canvas.clientHeight / 2, pointer.x - canvas.clientWidth / 2);

  game.camera.x += (p.x - game.camera.x) * Math.min(1, dt * 7);
  game.camera.y += (p.y - game.camera.y) * Math.min(1, dt * 7);

  const distance = Math.hypot(p.x, p.y);
  const safe = distance < beaconRegionRadius;
  game.currentSector = safe ? 0 : getBiomeSector(distance) + 1;

  const biome = getBiome(p.x, p.y);
  const effects = biome.effects;

  game.fireTimer = Math.max(0, game.fireTimer - dt * 1000);
  game.pulseTimer = Math.max(0, game.pulseTimer - dt);

  game.magicGauntletRechargeTimer = Math.max(0, game.magicGauntletRechargeTimer - dt);
  if (game.weapon === 'magicGauntlet' && game.magicGauntletRechargeTimer <= 0) {
    const reserve = game.ammoReserve.magicGauntletAmmo || 0;
    if (reserve < 6) game.ammoReserve.magicGauntletAmmo = Math.min(6, reserve + 2);
    game.magicGauntletRechargeTimer = 5;
  }

  game.cosmosGauntletRechargeTimer = Math.max(0, game.cosmosGauntletRechargeTimer - dt);
  if (game.weapon === 'cosmosGauntlet' && game.cosmosGauntletRechargeTimer <= 0) {
    const reserve = game.ammoReserve.cosmosGauntletAmmo || 0;
    if (reserve < 6) game.ammoReserve.cosmosGauntletAmmo = Math.min(6, reserve + 2);
    game.cosmosGauntletRechargeTimer = 6;
  }

  if ((pointer.down || keys[' ']) && game.weapon === 'radBeam') updateRadBeam(dt);
  else {
    game.radBeamActive = false;
    if (pointer.down || keys[' ']) shoot();
  }

  const insideGlassDesertHazard = game.hazardZones.some(zone => (zone.hazard?.name === 'MIRAGE BURN' || getBiome(zone.x, zone.y).name === 'GLASS DESERT') && Math.hypot(p.x - zone.x, p.y - zone.y) < zone.radius);
  const insideBeaconStation = Boolean(getBeaconStationAt(p.x, p.y));

  if (safe) {
    game.health = Math.min(100, game.health + 15 * dt);
    if (game.salvage) {
      game.banked += game.salvage;
      game.salvage = 0;
      localStorage.setItem('horde-salvage', game.banked);
    }
  } else {
    if (effects.healthRegen) game.health = Math.min(100, game.health + effects.healthRegen * dt);
    if (effects.hazard && !insideGlassDesertHazard) game.health -= effects.hazard.damagePerSecond * (1 - (armor.hazardDamageReduction || 0)) * dt;
  }

  game.hazardZones.forEach(zone => {
    if (!insideBeaconStation && Math.hypot(p.x - zone.x, p.y - zone.y) < zone.radius) {
      const isGlassDesert = zone.hazard?.name === 'MIRAGE BURN' || getBiome(zone.x, zone.y).name === 'GLASS DESERT';
      
      if (isGlassDesert) {
        game.health = Math.min(100, game.health + 15 * dt); 
      } else {
        game.health -= zone.damagePerSecond * (1 - (armor.hazardDamageReduction || 0)) * dt;
      }
    }
  });

  const inVoid = biome.key === 'void';
  if (inVoid) {
    game.voidSpawnTimer -= dt;
    const activeWorms = game.enemies.filter(enemy => enemy.voidWorm && !enemy.defeated).length;
    const activeWalkers = game.enemies.filter(enemy => enemy.voidWalker && !enemy.defeated).length;
    
    if (game.voidSpawnTimer <= 0 && (activeWorms < 8 || activeWalkers < 10)) {
      spawn();
      // Increase timer to 45–90 seconds between spawn checks
      game.voidSpawnTimer = 45 + Math.random() * 45;
    }
  } else {
    game.voidSpawnTimer = 0;
    game.spawnTimer -= dt * (insideGlassDesertHazard ? 2 : 1);
    const target = safe ? 0 : 5 + game.currentSector * 3 + Math.floor(distance / 260);
    if (game.spawnTimer <= 0 && game.enemies.length < Math.min(100, target)) {
      spawn();
      game.spawnTimer = Math.max(.12, .8 - game.currentSector * .025 - distance / 4000);
    }
  }

  // Bullet Movement, Sway, Range Expiry, and AOE Detonation
  game.bullets.forEach(b => {
    if (b.oscillating) {
      const speed = Math.hypot(b.vx, b.vy) || 1;
      b.swayPhase = (b.swayPhase || 0) + dt * 14;
      const swayOffset = Math.sin(b.swayPhase) * (b.swayAmplitude || 0);
      const angle = b.baseAngle + swayOffset;
      b.vx = Math.cos(angle) * speed;
      b.vy = Math.sin(angle) * speed;
    }
    if (b.voidBatarMotion) {
      updateVoidBatarBullet(b, dt);
    } else {
      decelerateBullet(b, dt);
      vibrateBullet(b, dt);
    }
    b.life -= dt;

    // Trigger AOE explosion if explosive bullet reaches end of life without hitting target
    if (b.life <= 0 && b.blast && !b.exploded) {
      b.exploded = true;
      game.enemies.forEach(target => {
        if (!target.defeated && target.shieldTimer <= 0 && Math.hypot(b.x - target.x, b.y - target.y) <= b.blast) {
          target.hp = Math.max(0, target.hp - (b.damage || .12));
          if (target.hp <= 0) defeatEnemy(target);
        }
      });
      if (typeof addExplosion === 'function') {
        addExplosion(b.x, b.y, b.blast);
      }
    }
  });
  game.bullets = game.bullets.filter(b => b.life > 0);
  game.beams.forEach(beam => beam.life -= dt);
  game.beams = game.beams.filter(beam => beam.life > 0);

  // Consolidated Enemy Update Loop (Movement, Boundary Checks, Attacks, and Player Damage)
  const ashenAuras = game.enemies
    .filter(enemy => !enemy.defeated && enemy.effect === 'ashen-boss-aura')
    .map(enemy => ({ x: enemy.x, y: enemy.y }));
  game.enemies.forEach(e => {
    e.deadStarSpeedBuffTimer = Math.max(0, (e.deadStarSpeedBuffTimer || 0) - dt);
    const localEnemySpeedMultiplier = effects.enemySpeedMultiplier
      * (ashenAuras.some(aura => Math.hypot(e.x - aura.x, e.y - aura.y) < sectorOneBossAuraRadius) ? 1.1 : 1)
      * (e.deadStarSpeedBuffTimer > 0 ? 1.75 : 1);
    const wraithShieldDown = e.effect === 'wraith-boss-guards' && !e.wraithGuards.some(guard => !guard.defeated);
    if (e.burnTimer > 0) {
      const burnTime = Math.min(dt, e.burnTimer);
      e.burnTimer = Math.max(0, e.burnTimer - dt);
      if (!e.defeated) {
        e.burnTickTimer -= burnTime;
        while (e.burnTickTimer <= 0 && e.hp > 0) {
          e.hp = Math.max(0, e.hp - e.burnDamage);
          e.burnTickTimer += e.burnInterval;
          if (e.hp <= 0) {
            defeatEnemy(e);
            return;
          }
        }
      }
    }
    if (!e.defeated && e.radiationTimer > 0) {
      const radiationTime = Math.min(dt, e.radiationTimer);
      e.radiationTimer = Math.max(0, e.radiationTimer - dt);
      e.radiationTickTimer -= radiationTime;
      while (e.radiationTickTimer <= 0 && e.hp > 0) {
        e.hp = Math.max(0, e.hp - weaponCatalog.radBeam.radiationDamage);
        e.radiationTickTimer += weaponCatalog.radBeam.radiationTickInterval;
        if (typeof e.speed === 'number' && Math.random() < weaponCatalog.radBeam.radiationSlowChance) {
          e.speed *= weaponCatalog.radBeam.radiationSlowMultiplier;
        }
        if (e.hp <= 0) {
          defeatEnemy(e);
          return;
        }
      }
    }
    e.toxicRetaliationCooldown = Math.max(0, (e.toxicRetaliationCooldown || 0) - dt);
    e.attackFlashTimer = Math.max(0, (e.attackFlashTimer || 0) - dt);
    e.shieldTimer = Math.max(0, (e.shieldTimer || 0) - dt);
    e.stormAttackCooldown = Math.max(0, (e.stormAttackCooldown || 0) - dt);
    e.stormRecovery = Math.max(0, (e.stormRecovery || 0) - dt);
    e.stormSwingTimer = Math.max(0, (e.stormSwingTimer || 0) - dt);
    e.spinTimer = Math.max(0, (e.spinTimer || 0) - dt);
    e.previousX = e.x;
    e.previousY = e.y;

    // Movement calculation
    if (wraithShieldDown) {
      e.x = e.previousX;
      e.y = e.previousY;
    } else if (e.effect === 'null-boss-lane' && (e.nullLaneTimer > 0 || e.nullSpikesTimer > 0)) {
      e.facingAngle = e.nullLaneAngle;
    } else if (e.wraithGuard && e.guardOwner && !e.guardOwner.defeated) {
      const owner = e.guardOwner;
      const angle = owner.wraithGuardOrbitAngle + e.guardIndex * Math.PI * 2 / 3;
      const orbitRadius = owner.r + 58;
      e.x = owner.x + Math.cos(angle) * orbitRadius;
      e.y = owner.y + Math.sin(angle) * orbitRadius;
    } else if (e.voidStalker && !e.isAggroed) {
      const playerDistance = Math.hypot(p.x, p.y);
      if (Math.hypot(p.x - e.x, p.y - e.y) <= 250 || playerDistance >= 30000) {
        e.isAggroed = true;
      } else {
        e.orbitAngle += e.orbitSpeed * dt;
        e.x = Math.cos(e.orbitAngle) * e.orbitRadius;
        e.y = Math.sin(e.orbitAngle) * e.orbitRadius;
      }
    }
    else if (e.voidStalker && e.isAggroed) {
      const angle = Math.atan2(p.y - e.y, p.x - e.x);
      const distance = Math.hypot(p.x - e.x, p.y - e.y);
      const chaseSpeed = distance > 250 ? 900 : e.speed;
      const travel = Math.min(distance, chaseSpeed * dt);
      e.x += Math.cos(angle) * travel;
      e.y += Math.sin(angle) * travel;
    }
    else if (e.voidWalker && !e.isAggroed) {
      // Wander in random directions without tracking the player
      e.wanderTimer = (e.wanderTimer || 0) - dt;
      if (e.wanderTimer <= 0) {
        e.wanderAngle = Math.random() * Math.PI * 2;
        e.wanderTimer = 2 + Math.random() * 3;
      }
      e.x += Math.cos(e.wanderAngle) * (e.speed * 0.6) * localEnemySpeedMultiplier * dt;
      e.y += Math.sin(e.wanderAngle) * (e.speed * 0.6) * localEnemySpeedMultiplier * dt;
    } else if (e.nebulaMissile) {
      e.damageOverTimeTimer += dt;
      if (e.damageOverTimeTimer >= .5) {
        e.hp = Math.max(0, e.hp - 1);
        e.damageOverTimeTimer -= .5;
      }
      if (e.hp <= 0) {
        defeatEnemy(e);
      } else {
        const angle = Math.atan2(p.y - e.y, p.x - e.x);
        e.x += Math.cos(angle) * e.speed * dt;
        e.y += Math.sin(angle) * e.speed * dt;
        if (Math.hypot(p.x - e.x, p.y - e.y) < e.r + 12) {
          e.hp = 0;
          defeatEnemy(e);
        }
      }
    } else if (hasEnemyEffect(e, 'projectile-teleport')) {
      e.teleportCooldown = Math.max(0, e.teleportCooldown - dt);
      const nearbyProjectile = [...game.bullets, ...game.projectiles].some(projectile => Math.hypot(projectile.x - e.x, projectile.y - e.y) < 20);
      if (nearbyProjectile && e.teleportCooldown <= 0) {
        const angle = Math.atan2(p.y - e.y, p.x - e.x);
        const distance = Math.hypot(p.x - e.x, p.y - e.y);
        const teleportDistance = Math.min(80, distance);
        e.x += Math.cos(angle) * teleportDistance;
        e.y += Math.sin(angle) * teleportDistance;
        e.teleportCooldown = 7;
        burst(e.previousX, e.previousY, 10, 120);
        burst(e.x, e.y, 10, 120);
      } else {
        const angle = Math.atan2(p.y - e.y, p.x - e.x);
        e.x += Math.cos(angle) * e.speed * localEnemySpeedMultiplier * dt;
        e.y += Math.sin(angle) * e.speed * localEnemySpeedMultiplier * dt;
      }
    } else if (hasEnemyEffect(e, 'decay-dash')) {
      e.dashCooldown = Math.max(0, e.dashCooldown - dt);
      if (e.dashTimer > 0) {
        const dashTime = Math.min(dt, e.dashTimer);
        e.x += e.dashX * e.speed * 3 * localEnemySpeedMultiplier * dashTime;
        e.y += e.dashY * e.speed * 3 * localEnemySpeedMultiplier * dashTime;
        e.dashTimer -= dashTime;
        if (Math.hypot(p.x - e.x, p.y - e.y) < e.r + 18 && !e.decayApplied) {
          game.decayTimer = Math.max(game.decayTimer, 3);
          e.decayApplied = true;
        }
      } else {
        const angle = Math.atan2(p.y - e.y, p.x - e.x);
        const distance = Math.hypot(p.x - e.x, p.y - e.y);
        if (distance > 180 && distance < 420 && e.dashCooldown <= 0) {
          e.dashX = Math.cos(angle);
          e.dashY = Math.sin(angle);
          e.dashTimer = .35;
          e.dashCooldown = 4;
          e.decayApplied = false;
        } else {
          e.x += Math.cos(angle) * e.speed * localEnemySpeedMultiplier * dt;
          e.y += Math.sin(angle) * e.speed * localEnemySpeedMultiplier * dt;
        }
      }
    } else if (e.effect === 'dark-boss-charge') {
      e.darkDashCooldown = Math.max(0, (e.darkDashCooldown || 0) - dt);
      if (e.darkDashPauseTimer > 0) {
        e.darkDashPauseTimer = Math.max(0, e.darkDashPauseTimer - dt);
      } else if (e.darkDashTimer > 0) {
        const dashTime = Math.min(dt, e.darkDashTimer);
        const targetAngle = Math.atan2(p.y - e.y, p.x - e.x);
        const angleDelta = Math.atan2(
          Math.sin(targetAngle - e.darkDashAngle),
          Math.cos(targetAngle - e.darkDashAngle)
        );
        e.darkDashAngle += Math.max(-.8 * dashTime, Math.min(.8 * dashTime, angleDelta));
        e.facingAngle = e.darkDashAngle;
        e.x += Math.cos(e.darkDashAngle) * e.speed * 2.5 * localEnemySpeedMultiplier * dashTime;
        e.y += Math.sin(e.darkDashAngle) * e.speed * 2.5 * localEnemySpeedMultiplier * dashTime;
        e.darkDashTrailTimer += dashTime;
        while (e.darkDashTrailTimer >= .25) {
          createDarkBossDashCircle(e);
          fireDarkBossPerpendicularProjectiles(e);
          e.darkDashTrailTimer -= .25;
        }
        e.darkDashTimer = Math.max(0, e.darkDashTimer - dashTime);
        if (e.darkDashTimer === 0) {
          e.darkDashCooldown = 10;
          e.darkDashTrailTimer = 0;
        }
      } else {
        const angle = Math.atan2(p.y - e.y, p.x - e.x);
        const playerDistance = Math.hypot(p.x - e.x, p.y - e.y);
        if (playerDistance < 700 && e.darkDashCooldown <= 0) {
          e.darkDashAngle = angle;
          e.darkDashPauseTimer = .3;
          e.darkDashTimer = 2;
          e.darkDashTrailTimer = 0;
        } else {
          e.facingAngle = angle;
          e.x += Math.cos(angle) * e.speed * localEnemySpeedMultiplier * dt;
          e.y += Math.sin(angle) * e.speed * localEnemySpeedMultiplier * dt;
        }
      }
    } else if (hasEnemyEffect(e, 'storm-sword')) {
      const angle = Math.atan2(p.y - e.y, p.x - e.x);
      const distance = Math.hypot(p.x - e.x, p.y - e.y);
      if (e.stormRecovery <= 0 && distance < 230 && e.stormAttackCooldown <= 0 && Math.abs(Math.atan2(Math.sin(angle - e.facingAngle), Math.cos(angle - e.facingAngle))) < .7) {
        e.facingAngle = angle;
        e.stormRecovery = .65;
        e.stormSwingTimer = .35;
        e.stormAttackCooldown = 2.4;
        if (distance < 125) {
          game.health -= (e.contactDamage || 8) * 1.5 * effects.damageMultiplier * (1 - (armor.contactDamageReduction || 0));
          e.attackFlashTimer = .25;
        }
      } else if (e.stormRecovery <= 0) {
        e.facingAngle = angle;
        e.x += Math.cos(angle) * e.speed * localEnemySpeedMultiplier * dt;
        e.y += Math.sin(angle) * e.speed * localEnemySpeedMultiplier * dt;
      }
    } else if (hasEnemyEffect(e, 'dash')) {
      e.dashCooldown = Math.max(0, e.dashCooldown - dt);
      if (e.dashTimer > 0 || e.dashCooldown === 0) {
        if (e.dashTimer <= 0) {
          const angle = Math.atan2(p.y - e.y, p.x - e.x);
          e.dashX = Math.cos(angle);
          e.dashY = Math.sin(angle);
          e.dashTimer = .4;
          e.dashCooldown = 4;
        }
        const dashTime = Math.min(dt, e.dashTimer);
        e.x += e.dashX * e.speed * 3 * localEnemySpeedMultiplier * dashTime;
        e.y += e.dashY * e.speed * 3 * localEnemySpeedMultiplier * dashTime;
        e.dashTimer -= dashTime;
      } else {
        const angle = Math.atan2(p.y - e.y, p.x - e.x);
        e.x += Math.cos(angle) * e.speed * localEnemySpeedMultiplier * dt;
        e.y += Math.sin(angle) * e.speed * localEnemySpeedMultiplier * dt;
      }
    } else {
      // Standard aggressive tracking
      const angle = Math.atan2(p.y - e.y, p.x - e.x);
      e.x += Math.cos(angle) * e.speed * localEnemySpeedMultiplier * dt;
      e.y += Math.sin(angle) * e.speed * localEnemySpeedMultiplier * dt;
    }

    const destinationBiome = getBiome(e.x, e.y).key;
    const isVoidEntity = e.voidWorm || e.voidWalker || e.voidStalker;
    if (destinationBiome === 'void' && !isVoidEntity) {
      e.x = e.previousX;
      e.y = e.previousY;
    }
    if ((e.knockbackX || e.knockbackY) && !wraithShieldDown) {
      e.x += e.knockbackX * dt;
      e.y += e.knockbackY * dt;
      const knockbackDecay = Math.exp(-5 * dt);
      e.knockbackX *= knockbackDecay;
      e.knockbackY *= knockbackDecay;
    }

    if (hasEnemyEffect(e, 'damage-trail') && Math.hypot(e.x - e.previousX, e.y - e.previousY) > 1) {
      e.trailTimer -= dt;
      if (e.trailTimer <= 0) {
        game.enemyTrails.push({ x: e.previousX, y: e.previousY, radius: 22, life: 2, maxLife: 2, damagePerSecond: 12 });
        e.trailTimer = .18;
      }
    }

    // Void Walker attack logic
    if (e.voidWalker && e.isAggroed) {
      e.attackTimer -= dt;
      if (e.attackTimer <= 0) {
        triggerVoidShockwave(e);
        e.attackFlashTimer = .45;
        e.attackTimer = 3;
      }
    }
    if (e.voidStalker && e.isAggroed) {
      e.attackTimer -= dt;
      if (e.attackTimer <= 0) {
        triggerVoidStalkerAttack(e);
        e.attackFlashTimer = .5;
        e.attackTimer = 5;
      }
    }

    // Contact damage to player
    if (Math.hypot(p.x - e.x, p.y - e.y) < e.r + 12) {
      game.health -= (e.contactDamage || 0) * effects.damageMultiplier * (1 - (armor.contactDamageReduction || 0)) * dt;
    }
  });
  updateDarkBossDashCircles(dt);

  updateMeleeAttack(dt);

  // Bullet Collision & Explosive (AOE) Damage Loop
  game.bullets.forEach(b => game.enemies.forEach(e => {
    if (b.life <= 0 || e.defeated || e.shieldTimer > 0 || !e.hp) return;
    if (hasEnemyEffect(e, 'ironwood-boss-shield') && e.ironwoodShieldHp > 0) {
      const angleToPlayer = Math.atan2(game.player.y - e.y, game.player.x - e.x);
      const shieldRadius = Math.max(14, e.r * .7);
      const shieldX = e.x + Math.cos(angleToPlayer) * (e.r + shieldRadius * .35);
      const shieldY = e.y + Math.sin(angleToPlayer) * (e.r + shieldRadius * .35);
      const shotAngle = Math.atan2(b.y - e.y, b.x - e.x);
      const inShieldArc = Math.abs(Math.atan2(Math.sin(shotAngle - angleToPlayer), Math.cos(shotAngle - angleToPlayer))) < .9;
      if (inShieldArc && Math.hypot(b.x - shieldX, b.y - shieldY) < shieldRadius + 5) {
        if (Math.random() >= .25) e.ironwoodShieldHp = Math.max(0, e.ironwoodShieldHp - (b.damage || .12));
        if (!b.pierce) b.life = 0;
        return;
      }
    }
    if (Math.hypot(b.x - e.x, b.y - e.y) >= e.r + 5) return;
    {
      if (b.hitEnemies && b.hitEnemies.has(e)) return;
      if (b.hitEnemies) b.hitEnemies.add(e);

      if (b.blast) {
        game.enemies.forEach(target => {
          if (!target.defeated && target.shieldTimer <= 0 && Math.hypot(b.x - target.x, b.y - target.y) <= b.blast) {
            target.hp = Math.max(0, target.hp - (b.damage || .12));
            if (target.hp <= 0) defeatEnemy(target);
          }
        });
        burst(b.x, b.y, 22, 220);
        if (typeof addExplosion === 'function') {
          addExplosion(b.x, b.y, b.blast);
        }
      } else {
        e.hp = Math.max(0, e.hp - (b.damage || .12));
        if (b.burnDuration) {
          if (!(e.burnTimer > 0)) {
            e.burnDamage = b.burnDamage;
            e.burnInterval = b.burnInterval;
            e.burnTickTimer = b.burnInterval;
          }
          e.burnTimer = Math.max(e.burnTimer || 0, b.burnDuration);
        }
        if (e.hp <= 0) defeatEnemy(e);
      }
      if (b.pulseBlastRadius && !b.blastApplied) {
        b.blastApplied = true;
        triggerPulseBlast(b);
      }

      if (!b.pierce) {
        b.life = 0;
      }
    }
  }));

  // Update Explosions Lifetime
  if (game.explosions) {
    game.explosions.forEach(exp => exp.life -= dt);
    game.explosions = game.explosions.filter(exp => exp.life > 0);
  }

  updateBeaconTurretProjectiles(dt);

  // Handle Enemy Projectiles
  game.projectiles.forEach(proj => {
    if (proj.turretProjectile) return;
    if (proj.followTarget) {
      if (!proj.followTarget.defeated) {
        proj.x = proj.followTarget.x + proj.followOffset * (proj.followTarget.r + 12);
        proj.y = proj.followTarget.y - (proj.followTarget.r + 12);
        return;
      }
      launchEmberFireballs(proj.followTarget);
    }
    if (proj.volleyTimer !== undefined && !proj.volleyLaunched) {
      if (proj.volleyOwner && !proj.volleyOwner.defeated) {
        proj.x = proj.volleyOwner.x + proj.volleyOffsetX;
        proj.y = proj.volleyOwner.y + proj.volleyOffsetY;
      }
      proj.volleyTimer -= dt;
      if (proj.volleyTimer <= 0) {
        const angle = Math.atan2(game.player.y - proj.y, game.player.x - proj.x);
        const speed = 320;
        proj.vx = Math.cos(angle) * speed;
        proj.vy = Math.sin(angle) * speed;
        proj.volleyLaunched = true;
      } else {
        proj.life -= dt;
        return;
      }
    }
    if (proj.burstTimer !== undefined && !proj.burstTriggered) {
      proj.burstTimer -= dt;
      if (proj.burstTimer <= 0) {
        proj.burstTriggered = true;
        for (let i = 0; i < proj.burstCount; i++) {
          const angle = i * Math.PI * 2 / proj.burstCount;
          game.projectiles.push({
            x: proj.x,
            y: proj.y,
            vx: Math.cos(angle) * proj.burstSpeed,
            vy: Math.sin(angle) * proj.burstSpeed,
            life: 2.5,
            radius: 7,
            damage: proj.damage,
            color: proj.color
          });
        }
        burst(proj.x, proj.y, 12, 150);
        proj.life = 0;
        return;
      }
    }
    if (proj.redirectTimer !== undefined) {
      proj.redirectTimer -= dt;
      if (proj.redirectTimer <= 0 && !proj.redirected) {
        const redirectSpread = proj.redirectSpeed ? 0 : (Math.random() - .5) * .25;
        const angle = Math.atan2(game.player.y - proj.y, game.player.x - proj.x) + redirectSpread;
        const speed = proj.redirectSpeed || Math.hypot(proj.vx, proj.vy);
        proj.vx = Math.cos(angle) * speed;
        proj.vy = Math.sin(angle) * speed;
        proj.redirected = true;
      }
    }
    if (proj.arcGravity) proj.vy += proj.arcGravity * dt;
    proj.x += proj.vx * dt;
    proj.y += proj.vy * dt;
    proj.life -= dt;
    if (proj.singularity) {
      const distanceToPlayer = Math.hypot(game.player.x - proj.x, game.player.y - proj.y);
      if (distanceToPlayer < proj.singularityRadius) {
        if (distanceToPlayer > 0) {
          const pullDistance = Math.min(proj.pullSpeed * dt, distanceToPlayer);
          game.player.x += (proj.x - game.player.x) / distanceToPlayer * pullDistance;
          game.player.y += (proj.y - game.player.y) / distanceToPlayer * pullDistance;
        }
        if (Math.hypot(game.player.x - proj.x, game.player.y - proj.y) < proj.radius + 13) {
          game.health -= proj.damagePerSecond * dt * (1 - (getArmorEffects().voidDamageReduction || 0));
        }
      }
    }
    if (proj.damageTrail) {
      proj.trailTimer -= dt;
      if (proj.trailTimer <= 0) {
        game.enemyTrails.push({
          x: proj.x,
          y: proj.y,
          radius: 24,
          life: 2,
          maxLife: 2,
          damagePerSecond: 12,
          color: proj.color
        });
        proj.trailTimer = .1;
      }
    }
    if (proj.grows) {
      const growth = 1 - Math.max(0, proj.life) / 2.5;
      proj.radius = 8 + (proj.maxRadius - 8) * growth;
    }

    if (proj.split && proj.life <= 0 && !proj.hasSplit) {
      proj.hasSplit = true;
      for (let i = 0; i < 8; i++) {
        const angle = Math.atan2(proj.vy, proj.vx) + (i - 3.5) * .08;
        game.projectiles.push({
          x: proj.x,
          y: proj.y,
          vx: Math.cos(angle) * 1000,
          vy: Math.sin(angle) * 1000,
          life: 3,
          radius: 7,
          damage: 6,
          color: '#00fff2',
          redirectTimer: 1
        });
      }
    }
    
    // Player collision
    if (!proj.frostAura && !proj.damageTrail && !proj.singularity && !proj.playerHit && (proj.volleyTimer === undefined || proj.volleyLaunched) && Math.hypot(game.player.x - proj.x, game.player.y - proj.y) < proj.radius + 13) {
      game.health -= proj.damage * (1 - (getArmorEffects().voidDamageReduction || 0));
      if (proj.burnDuration || proj.decayDuration) {
        const status = game.enemyStatus || (game.enemyStatus = { burn: 0, acid: 0, bleed: 0, freeze: 0, root: 0 });
        if (proj.burnDuration) status.burn = Math.max(status.burn, proj.burnDuration);
      }
      if (proj.decayDuration) game.decayTimer = Math.max(game.decayTimer, proj.decayDuration);
      if (proj.spawnElitesOnHit && !proj.elitesSpawned) {
        proj.elitesSpawned = true;
        spawnRandomBiomeElites(proj.x, proj.y, 3);
      }
      if (proj.piercePlayer) {
        proj.playerHit = true;
      } else {
        proj.life = 0;
      }
    }
    if (proj.teleportGlassEnemyOnEnd && proj.life <= 0 && !proj.teleportResolved) {
      proj.teleportResolved = true;
      teleportNearestGlassEnemy(proj);
    }
  });
  game.projectiles = game.projectiles.filter(p => p.life > 0);

  updateBeaconTurrets(dt);
  updateBeaconStationModules(dt);
  game.enemies = game.enemies.filter(e => e.hp > 0);

  game.gems.forEach(g => {
    const angle = Math.atan2(p.y - g.y, p.x - g.x);
    if (Math.hypot(p.x - g.x, p.y - g.y) < 130) {
      g.x += Math.cos(angle) * 190 * dt;
      g.y += Math.sin(angle) * 190 * dt;
    }
    g.life -= dt;
    if (Math.hypot(p.x - g.x, p.y - g.y) < 18) {
      game.salvage += Math.round(effects.salvageMultiplier);
      g.life = 0;
    }
  });
  game.gems = game.gems.filter(g => g.life > 0);

  game.nodes.forEach(n => {
    if (!n.taken && Math.hypot(p.x - n.x, p.y - n.y) < 22) {
      n.type === 'chest' ? openChest(n) : (n.taken = true, n.type === 'relic' ? game.relics++ : game.salvage += Math.round(3 * effects.salvageMultiplier));
      burst(n.x, n.y, 14, 150);
    }
  });

  game.drops.forEach(drop => {
    const angle = Math.atan2(p.y - drop.y, p.x - drop.x);
    if (Math.hypot(p.x - drop.x, p.y - drop.y) < 110) {
      drop.x += Math.cos(angle) * 200 * dt;
      drop.y += Math.sin(angle) * 200 * dt;
    }
    drop.life -= dt;
    if (Math.hypot(p.x - drop.x, p.y - drop.y) < 20) collectDrop(drop);
  });
  game.drops = game.drops.filter(drop => drop.life > 0);

  game.sparks.forEach(s => {
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.life -= dt;
  });
  game.sparks = game.sparks.filter(s => s.life > 0);

  if (game.score >= game.wave * 1200) game.wave++;

  updateUI(distance, safe, biome);
  updateInventoryUI();

  if (game.health <= 0) end();
}
function applyEnemyAbilities(dt) {
  const status = game.enemyStatus || (game.enemyStatus = { burn: 0, acid: 0, bleed: 0, freeze: 0, root: 0 });
  game.enemies.forEach(enemy => {
    const distance = Math.hypot(game.player.x - enemy.x, game.player.y - enemy.y);
    const contact = distance < enemy.r + 18;
    enemy.abilityTimer -= dt;
    if (contact) {
      if (hasEnemyEffect(enemy, 'burn')) status.burn = Math.max(status.burn, enemy.boss ? 5 : 3);
      if (hasEnemyEffect(enemy, 'acid')) status.acid = Math.max(status.acid, 4);
      if (hasEnemyEffect(enemy, 'bleed')) status.bleed = Math.max(status.bleed, 4);
      if (hasEnemyEffect(enemy, 'slow')) status.freeze = Math.max(status.freeze, 2.5);
      if (hasEnemyEffect(enemy, 'root')) status.root = Math.max(status.root, 2);
    }
    if (enemy.effect === 'rift-boss-volley') {
      enemy.bossAbilityCooldown = Math.max(0, enemy.bossAbilityCooldown - dt);
      if (distance < 800 && enemy.bossAbilityCooldown <= 0) {
        fireVoidRiftMiniBossVolley(enemy);
        enemy.bossAbilityCooldown = 8;
      }
    } else if (enemy.effect === 'horizon-boss-singularity') {
      enemy.bossAbilityCooldown = Math.max(0, enemy.bossAbilityCooldown - dt);
      if (distance < 850 && enemy.bossAbilityCooldown <= 0) {
        fireEventHorizonMiniBossProjectile(enemy);
        enemy.bossAbilityCooldown = 5;
      }
    } else if (enemy.effect === 'dead-star-boss-aura') {
      enemy.deadStarAuraTimer = Math.max(0, enemy.deadStarAuraTimer - dt);
      enemy.bossAbilityCooldown = Math.max(0, enemy.bossAbilityCooldown - dt);
      if (enemy.bossAbilityCooldown <= 0) {
        triggerDeadStarMiniBossAura(enemy);
        enemy.bossAbilityCooldown = 12;
      }
    } else if (enemy.effect === 'sunless-boss-volley') {
      enemy.bossAbilityCooldown = Math.max(0, enemy.bossAbilityCooldown - dt);
      if (distance < 800 && enemy.bossAbilityCooldown <= 0) {
        fireSunlessMiniBossVolley(enemy);
        enemy.bossAbilityCooldown = 3;
      }
    } else if (enemy.effect === 'starfire-boss-pierce') {
      enemy.bossAbilityCooldown = Math.max(0, enemy.bossAbilityCooldown - dt);
      if (distance < 800 && enemy.bossAbilityCooldown <= 0) {
        fireStarfireMiniBossProjectile(enemy);
        enemy.bossAbilityCooldown = 6;
      }
    } else if (enemy.effect === 'nebula-boss-salvo') {
      if (enemy.nebulaBurstPairsRemaining > 0) {
        enemy.nebulaBurstTimer -= dt;
        if (enemy.nebulaBurstTimer <= 0) {
          fireDyingNebulaMiniBossPair(enemy);
          enemy.nebulaBurstPairsRemaining--;
          if (enemy.nebulaBurstPairsRemaining > 0) {
            enemy.nebulaBurstTimer = .3;
          } else {
            enemy.bossAbilityCooldown = 8;
          }
        }
      } else {
        enemy.bossAbilityCooldown = Math.max(0, enemy.bossAbilityCooldown - dt);
        if (distance < 800 && enemy.bossAbilityCooldown <= 0) {
          fireDyingNebulaMiniBossPair(enemy);
          enemy.nebulaBurstPairsRemaining = 3;
          enemy.nebulaBurstTimer = .3;
        }
      }
    } else if (enemy.effect === 'abyssal-boss-wave') {
      enemy.bossAbilityCooldown = Math.max(0, enemy.bossAbilityCooldown - dt);
      if (enemy.bossAbilityCooldown <= 0) {
        createAbyssalBossWave(enemy);
        enemy.bossAbilityCooldown = 8;
      }
    } else if (enemy.effect === 'null-boss-lane') {
      enemy.nullAttackCooldown = Math.max(0, enemy.nullAttackCooldown - dt);
      if (enemy.nullLaneTimer > 0) {
        enemy.nullLaneTimer = Math.max(0, enemy.nullLaneTimer - dt);
        if (enemy.nullLaneTimer === 0) enemy.nullSpikesTimer = 1;
      } else if (enemy.nullSpikesTimer > 0) {
        enemy.nullSpikesTimer = Math.max(0, enemy.nullSpikesTimer - dt);
        const relativeX = game.player.x - enemy.x;
        const relativeY = game.player.y - enemy.y;
        const forward = relativeX * Math.cos(enemy.nullLaneAngle) + relativeY * Math.sin(enemy.nullLaneAngle);
        const side = -relativeX * Math.sin(enemy.nullLaneAngle) + relativeY * Math.cos(enemy.nullLaneAngle);
        if (forward >= 0 && forward <= nullBossLaneLength && Math.abs(side) <= nullBossLaneWidth / 2) {
          game.health -= 12 * (1 - (getArmorEffects().statusDamageReduction || 0)) * dt;
          game.attackDisabledTimer = Math.max(game.attackDisabledTimer, 4);
        }
      } else if (distance < 850 && enemy.nullAttackCooldown <= 0) {
        enemy.nullLaneAngle = Math.atan2(game.player.y - enemy.y, game.player.x - enemy.x);
        enemy.nullLaneTimer = .75;
        enemy.nullAttackCooldown = 8;
      }
    } else if (enemy.effect === 'storm-boss-strikes') {
      enemy.bossAbilityCooldown = Math.max(0, enemy.bossAbilityCooldown - dt);
      if (enemy.bossAbilityCooldown <= 0) {
        for (let i = 0; i < 3; i++) {
          const angle = Math.random() * Math.PI * 2;
          const distanceFromBoss = Math.sqrt(Math.random()) * 250;
          game.lightningStrikes.push({
            x: enemy.x + Math.cos(angle) * distanceFromBoss,
            y: enemy.y + Math.sin(angle) * distanceFromBoss,
            radius: 45,
            warningTimer: 1,
            struck: false,
            flashTimer: 0,
            damage: 15
          });
        }
        enemy.bossAbilityCooldown = 2;
      }
    } else if (enemy.effect === 'crimson-boss-trails') {
      enemy.bossAbilityCooldown = Math.max(0, enemy.bossAbilityCooldown - dt);
      if (distance < 800 && enemy.bossAbilityCooldown <= 0) {
        const targetAngle = Math.atan2(game.player.y - enemy.y, game.player.x - enemy.x);
        for (let i = 0; i < 3; i++) {
          const angle = targetAngle + (Math.random() - .5) * .8;
          const speed = 300 + Math.random() * 400;
          game.projectiles.push({
            x: enemy.x,
            y: enemy.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 3.5,
            radius: 8,
            damage: 0,
            color: '#ef6672',
            damageTrail: true,
            trailTimer: 0
          });
        }
        enemy.bossAbilityCooldown = 3;
      }
    } else if (enemy.effect === 'bone-boss-burst') {
      enemy.bossAbilityCooldown = Math.max(0, enemy.bossAbilityCooldown - dt);
      if (distance < 700 && enemy.bossAbilityCooldown <= 0) {
        fireBoneMiniBossBurst(enemy);
        enemy.bossAbilityCooldown = 4;
      }
    } else if (enemy.effect === 'ember-boss-volley') {
      enemy.bossAbilityCooldown = Math.max(0, enemy.bossAbilityCooldown - dt);
      if (distance < 700 && enemy.bossAbilityCooldown <= 0) {
        fireEmberMiniBossVolley(enemy);
        enemy.bossAbilityCooldown = 6;
      }
    } else if (enemy.effect === 'blackroot-boss-brambles') {
      enemy.brambleOrbitAngle = (enemy.brambleOrbitAngle + dt * .8) % (Math.PI * 2);
      for (let i = 0; i < 3; i++) {
        const angle = enemy.brambleOrbitAngle + i * Math.PI * 2 / 3;
        const centerX = enemy.x + Math.cos(angle) * (enemy.r + blackrootBossBrambleLength / 2);
        const centerY = enemy.y + Math.sin(angle) * (enemy.r + blackrootBossBrambleLength / 2);
        const tangentAngle = angle + Math.PI / 2;
        const halfLength = blackrootBossBrambleLength / 2;
        const startX = centerX - Math.cos(tangentAngle) * halfLength;
        const startY = centerY - Math.sin(tangentAngle) * halfLength;
        const endX = centerX + Math.cos(tangentAngle) * halfLength;
        const endY = centerY + Math.sin(tangentAngle) * halfLength;
        if (distanceToSegment(game.player.x, game.player.y, startX, startY, endX, endY) < blackrootBossBrambleRadius + 12) {
          game.health -= 14 * (1 - (getArmorEffects().contactDamageReduction || 0)) * dt;
          break;
        }
      }
    } else if (enemy.effect === 'gravity-boss-aura') {
      if (distance < sectorThreeBossAuraRadius && distance > enemy.r) {
        const pullStrength = 24 * dt;
        game.player.x -= (game.player.x - enemy.x) / distance * pullStrength;
        game.player.y -= (game.player.y - enemy.y) / distance * pullStrength;
      }
    } else if (enemy.effect === 'thunder-boss-aura') {
      if (distance < sectorTwoBossAuraRadius) {
        enemy.thunderAuraTimer += dt;
        if (enemy.thunderAuraTimer >= 2) {
          const angle = Math.atan2(game.player.y - enemy.y, game.player.x - enemy.x);
          game.projectiles.push({
            x: enemy.x,
            y: enemy.y,
            vx: Math.cos(angle) * 720,
            vy: Math.sin(angle) * 720,
            life: 1.5,
            radius: 9,
            damage: 12,
            color: '#b6f3ff'
          });
          enemy.thunderAuraTimer = 0;
        }
      } else {
        enemy.thunderAuraTimer = 0;
      }
    } else if (enemy.effect === 'glass-boss-teleport-shot') {
      enemy.bossAbilityCooldown = Math.max(0, enemy.bossAbilityCooldown - dt);
      if (distance < 700 && enemy.bossAbilityCooldown <= 0) {
        const angle = Math.atan2(game.player.y - enemy.y, game.player.x - enemy.x);
        game.projectiles.push({
          x: enemy.x,
          y: enemy.y,
          vx: Math.cos(angle) * 300,
          vy: Math.sin(angle) * 300,
          life: 3,
          radius: 9,
          damage: 8,
          color: '#e9bc78',
          teleportGlassEnemyOnEnd: true
        });
        enemy.bossAbilityCooldown = 3;
      }
    } else if (enemy.effect === 'frost-boss-projectile') {
      enemy.bossAbilityCooldown = Math.max(0, enemy.bossAbilityCooldown - dt);
      if (distance < 700 && enemy.bossAbilityCooldown <= 0) {
        const angle = Math.atan2(game.player.y - enemy.y, game.player.x - enemy.x);
        game.projectiles.push({
          x: enemy.x,
          y: enemy.y,
          vx: Math.cos(angle) * 260,
          vy: Math.sin(angle) * 260,
          life: 3,
          radius: 9,
          damage: 6,
          color: '#8bd9f2',
          frostAura: true,
          frostAuraRadius: frostfallAuraRadius
        });
        enemy.bossAbilityCooldown = 1;
      }
    } else if (enemy.effect === 'scorched-boss-shot') {
      enemy.bossAbilityCooldown = Math.max(0, enemy.bossAbilityCooldown - dt);
      if (distance < 700 && enemy.bossAbilityCooldown <= 0) {
        const angle = Math.atan2(game.player.y - enemy.y, game.player.x - enemy.x);
        const speed = 320;
        game.projectiles.push({
          x: enemy.x,
          y: enemy.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 3,
          radius: 8,
          damage: 8,
          color: '#ff9b55'
        });
        enemy.bossAbilityCooldown = 3;
      }
    } else if (enemy.effect === 'bramble') {
      enemy.brambleCooldown -= dt;
      if (distance < 550 && enemy.brambleCooldown <= 0) {
        game.brambleZones.push({
          x: game.player.x,
          y: game.player.y,
          radius: 52,
          telegraphTimer: 1.5,
          active: false,
          life: 0
        });
        enemy.brambleCooldown = 10;
      }
    } else if (enemy.effect === 'fire-explosion') {
      enemy.fireExplosionCooldown = Math.max(0, enemy.fireExplosionCooldown - dt);
      if (distance < 380 && enemy.fireExplosionCooldown <= 0) {
        triggerStarfireExplosion(enemy);
        enemy.fireExplosionCooldown = 6;
      }
    } else if (enemy.effect === 'nebula-missiles') {
      enemy.missileCooldown = Math.max(0, enemy.missileCooldown - dt);
      if (distance < 650 && enemy.missileCooldown <= 0) {
        fireNebulaMissiles(enemy);
        enemy.missileCooldown = 10;
      }
    } else if (enemy.effect === 'arc-projectiles') {
      enemy.arcProjectileCooldown = Math.max(0, enemy.arcProjectileCooldown - dt);
      if (distance < 600 && enemy.arcProjectileCooldown <= 0) {
        fireAbyssalProjectile(enemy);
        enemy.arcProjectileCooldown = 6;
      }
    } else if (enemy.effect === 'spin-attack') {
      enemy.spinCooldown = Math.max(0, enemy.spinCooldown - dt);
      enemy.spinTimer = Math.max(0, enemy.spinTimer - dt);
      if (distance < 80 && enemy.spinCooldown <= 0) {
        game.health -= (enemy.contactDamage || 8) * (1 - (getArmorEffects().contactDamageReduction || 0));
        enemy.spinTimer = .5;
        enemy.spinCooldown = 3;
      }
    } else if (enemy.abilityTimer <= 0) {
      if (distance < 260 && enemy.effect === 'shock') {
        game.health -= enemy.boss ? 8 : 5;
        burst(enemy.x, enemy.y, 5, 90);
      }
      if (distance < 260 && enemy.effect === 'drain') {
        game.health -= 3;
        enemy.hp = Math.min(enemy.maxHp, enemy.hp + 1);
      }
      if (distance < 260 && (enemy.effect === 'pull' || (enemy.effect === 'gravity-fields-pull' && Math.random() >= .75))) {
        const angle = Math.atan2(enemy.y - game.player.y, enemy.x - game.player.x);
        game.player.x += Math.cos(angle) * 35;
        game.player.y += Math.sin(angle) * 35;
      }
      if (distance < 260 && enemy.effect === 'armor') enemy.shieldTimer = 2;
      if (distance < 260 && enemy.effect === 'evasion') {
        const angle = Math.atan2(game.player.y - enemy.y, game.player.x - enemy.x) + Math.PI / 2;
        enemy.x += Math.cos(angle) * 28;
        enemy.y += Math.sin(angle) * 28;
      }
      enemy.abilityTimer = enemy.boss ? 1.4 : 2.8;
    }
    if (enemy.familyEffect) applyMinibossFamilyAbility(enemy, dt, distance);
  });
  status.burn = Math.max(0, status.burn - dt);
  status.acid = Math.max(0, status.acid - dt);
  status.bleed = Math.max(0, status.bleed - dt);
  status.freeze = Math.max(0, status.freeze - dt);
  status.root = Math.max(0, status.root - dt);
  if (status.burn) game.health -= 6 * dt;
  if (status.acid) game.health -= 4 * dt;
  if (status.bleed) game.health -= 3 * dt;
  if (status.freeze || status.root) game.health -= 1 * dt;
}
function triggerVoidShockwave(enemy) {
    if (!enemy) return;
    const projectileCount = 35;
    const speed = 350;

    for (let i = 0; i < projectileCount; i++) {
        const angle = (Math.PI * 2 / projectileCount) * i;
        game.projectiles.push({
            x: enemy.x,
            y: enemy.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 2,
            radius:15,
            damage: 8,
            color: '#9370DB'
        });
    }
}
function triggerVoidStalkerAttack(enemy) {
  const projectileCount = 10;
  const speed = 700;
  for (let i = 0; i < projectileCount; i++) {
    const angle = (Math.PI * 2 / projectileCount) * i;
    game.projectiles.push({
      x: enemy.x,
      y: enemy.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1.2,
      radius: 11,
      damage: 7,
      color: '#00fff2',
      split: true
    });
  }
}

const baseUpdate = update;
update = function(dt) { const wasEmpty = game.ammo === 0 && weaponCatalog[game.weapon].kind !== 'melee'; baseUpdate(dt); if (wasEmpty) { game.ammo = 0; game.reloadPending = true; } if (game.active) { applyEnemyAbilities(dt); const status = game.enemyStatus; const reduction = getArmorEffects().statusDamageReduction || 0; if (status && reduction) game.health += (status.burn * 6 + status.acid * 4 + status.bleed * 3 + (status.freeze || status.root)) * reduction * dt; } };
function renderEnemySystem() {
  const camX = game.camera.x - canvas.clientWidth / 2;
  const camY = game.camera.y - canvas.clientHeight / 2;

  ctx.save();
  ctx.translate(-camX, -camY);
  ctx.textAlign = 'center';

  // 1. Standard Enemies
  game.enemies.filter(enemy => !enemy.voidWorm && !enemy.voidWalker && !enemy.voidStalker).forEach(enemy => {
    const shape = (enemy.familyIndex + enemy.variant.length) % 6;
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    if (enemy.effect === 'null-boss-lane' && (enemy.nullLaneTimer > 0 || enemy.nullSpikesTimer > 0)) {
      ctx.save();
      ctx.rotate(enemy.nullLaneAngle);
      ctx.globalAlpha = enemy.nullSpikesTimer > 0 ? .9 : .5;
      ctx.fillStyle = enemy.nullSpikesTimer > 0 ? '#b9f4ff99' : '#f7e5c566';
      ctx.strokeStyle = enemy.nullSpikesTimer > 0 ? '#e5fcff' : '#f7e5c5';
      ctx.lineWidth = 3;
      ctx.fillRect(0, -nullBossLaneWidth / 2, nullBossLaneLength, nullBossLaneWidth);
      ctx.strokeRect(0, -nullBossLaneWidth / 2, nullBossLaneLength, nullBossLaneWidth);
      if (enemy.nullSpikesTimer > 0) {
        ctx.fillStyle = '#e5fcff';
        for (let x = 14; x < nullBossLaneLength; x += 28) {
          ctx.beginPath();
          ctx.moveTo(x - 9, -nullBossLaneWidth / 2);
          ctx.lineTo(x, -nullBossLaneWidth / 2 - 16);
          ctx.lineTo(x + 9, -nullBossLaneWidth / 2);
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(x - 9, nullBossLaneWidth / 2);
          ctx.lineTo(x, nullBossLaneWidth / 2 + 16);
          ctx.lineTo(x + 9, nullBossLaneWidth / 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }
    if (hasEnemyEffect(enemy, 'slow-aura')) {
      ctx.save();
      ctx.fillStyle = '#82c5d733';
      ctx.strokeStyle = '#82c5d777';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, frostfallAuraRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    if (enemy.effect === 'thunder-boss-aura') {
      ctx.save();
      ctx.fillStyle = '#8bdff022';
      ctx.strokeStyle = '#8bdff077';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, sectorTwoBossAuraRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    if (enemy.effect === 'gravity-boss-aura') {
      ctx.save();
      ctx.fillStyle = '#9d7be522';
      ctx.strokeStyle = '#c3a5ff77';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, sectorThreeBossAuraRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.strokeStyle = enemy.color;
    ctx.fillStyle = `${enemy.color}55`;
    ctx.lineWidth = enemy.boss ? 4 : 2;
    ctx.globalAlpha = enemy.boss ? 0.95 : 0.82;

    ctx.beginPath();
    if (shape === 0) {
      ctx.arc(0, 0, enemy.r + 8, 0, Math.PI * 2);
    } else if (shape === 1) {
      ctx.moveTo(0, -enemy.r - 8);
      ctx.lineTo(enemy.r + 8, enemy.r + 4);
      ctx.lineTo(-enemy.r - 8, enemy.r + 4);
      ctx.closePath();
    } else if (shape === 2) {
      ctx.rect(-enemy.r - 7, -enemy.r - 7, (enemy.r + 7) * 2, (enemy.r + 7) * 2);
    } else if (shape === 3) {
      for (let i = 0; i < 8; i++) {
        const angle = i * Math.PI / 4;
        const radius = i % 2 ? enemy.r * 0.72 : enemy.r + 9;
        ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
      }
      ctx.closePath();
    } else if (shape === 4) {
      ctx.ellipse(0, 0, enemy.r + 10, enemy.r + 2, 0, 0, Math.PI * 2);
    } else {
      ctx.moveTo(-enemy.r - 8, 0);
      ctx.lineTo(0, -enemy.r - 10);
      ctx.lineTo(enemy.r + 8, 0);
      ctx.lineTo(0, enemy.r + 10);
      ctx.closePath();
    }
    ctx.fill();
    ctx.stroke();
    if (enemy.effect === 'wraith-boss-guards' && enemy.wraithGuards.some(guard => !guard.defeated)) {
      ctx.save();
      ctx.globalAlpha = .35;
      ctx.strokeStyle = '#c9b8ff';
      ctx.fillStyle = '#c9b8ff22';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, enemy.r + 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    if (enemy.effect === 'blackroot-boss-brambles') {
      ctx.save();
      ctx.strokeStyle = '#9bbf55';
      ctx.lineWidth = blackrootBossBrambleRadius * 2;
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const angle = enemy.brambleOrbitAngle + i * Math.PI * 2 / 3;
        const centerX = Math.cos(angle) * (enemy.r + blackrootBossBrambleLength / 2);
        const centerY = Math.sin(angle) * (enemy.r + blackrootBossBrambleLength / 2);
        const tangentAngle = angle + Math.PI / 2;
        const halfLength = blackrootBossBrambleLength / 2;
        ctx.beginPath();
        ctx.moveTo(centerX - Math.cos(tangentAngle) * halfLength, centerY - Math.sin(tangentAngle) * halfLength);
        ctx.lineTo(centerX + Math.cos(tangentAngle) * halfLength, centerY + Math.sin(tangentAngle) * halfLength);
        ctx.stroke();
      }
      ctx.restore();
    }
    if (enemy.effect === 'ironwood-boss-shield' && enemy.ironwoodShieldHp > 0) {
      ctx.save();
      ctx.rotate(Math.atan2(game.player.y - enemy.y, game.player.x - enemy.x));
      ctx.fillStyle = '#7f9a66';
      ctx.strokeStyle = '#d1dda2';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(enemy.r + 6, -enemy.r * .8);
      ctx.lineTo(enemy.r + 20, -enemy.r * .6);
      ctx.lineTo(enemy.r + 20, enemy.r * .6);
      ctx.lineTo(enemy.r + 6, enemy.r * .8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();

    ctx.globalAlpha = 1;
    ctx.fillStyle = '#f7e5c5';
    ctx.font = `${enemy.boss ? 'bold 11px' : '9px'} Space Mono`;
    ctx.fillText(`${enemy.family} // ${enemy.variant}`, enemy.x, enemy.y - enemy.r - 18);

    if (enemy.maxHp > 1) {
      ctx.fillStyle = '#17131a';
      ctx.fillRect(enemy.x - enemy.r, enemy.y - enemy.r - 9, enemy.r * 2, 3);
      ctx.fillStyle = enemy.boss ? '#ffcf70' : enemy.color;
      ctx.fillRect(enemy.x - enemy.r, enemy.y - enemy.r - 9, enemy.r * 2 * Math.max(0, enemy.hp / enemy.maxHp), 3);
    }
    if (enemy.effect === 'ironwood-boss-shield' && enemy.ironwoodShieldMaxHp > 0 && enemy.ironwoodShieldHp > 0) {
      const shieldBarY = enemy.y - enemy.r - 4;
      ctx.fillStyle = '#17131a';
      ctx.fillRect(enemy.x - enemy.r, shieldBarY, enemy.r * 2, 3);
      ctx.fillStyle = '#b5d68b';
      ctx.fillRect(enemy.x - enemy.r, shieldBarY, enemy.r * 2 * (enemy.ironwoodShieldHp / enemy.ironwoodShieldMaxHp), 3);
    }
  });

  // 2. Void Worms & Labels
  game.enemies.filter(enemy => enemy.voidWorm).forEach(enemy => {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.rotate(Math.atan2(game.player.y - enemy.y, game.player.x - enemy.x));
    ctx.strokeStyle = '#0e6b5c';
    ctx.fillStyle = '#03040e';
    ctx.lineWidth = 2;
    for (let i = 0; i < 7; i++) {
      const offset = i * 11;
      const radius = i === 0 ? 20 : 15;
      ctx.beginPath();
      ctx.arc(-offset, 0, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-offset - 4, -radius);
      ctx.lineTo(-offset - 12, -radius - 8);
      ctx.moveTo(-offset - 4, radius);
      ctx.lineTo(-offset - 12, radius + 8);
      ctx.stroke();
    }
    ctx.restore();

    const barWidth = 82;
    const barY = enemy.y - 48;
    ctx.fillStyle = '#17131a';
    ctx.fillRect(enemy.x - barWidth / 2, barY, barWidth, 5);
    ctx.fillStyle = '#0e6b5c';
    ctx.fillRect(enemy.x - barWidth / 2, barY, barWidth * Math.max(0, enemy.hp / enemy.maxHp), 5);
    ctx.fillStyle = '#f7e5c5';
    ctx.font = 'bold 10px Space Mono';
    ctx.fillText(`${enemy.family} // ${enemy.variant}`, enemy.x, barY - 7);
  });

  // 3. Void Stalker
  game.enemies.filter(enemy => enemy.voidStalker).forEach(enemy => {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.rotate(Date.now() * .0004);
    const pulse = Math.sin(Date.now() * .006) * 8;
    ctx.shadowBlur = 24;
    ctx.shadowColor = '#0e6b5c';
    ctx.strokeStyle = '#0e6b5c';
    ctx.fillStyle = '#17131a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, enemy.r + pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI / 4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * 35, Math.sin(angle) * 35);
      ctx.lineTo(Math.cos(angle) * (enemy.r + 18), Math.sin(angle) * (enemy.r + 18));
      ctx.stroke();
    }
    ctx.fillStyle = enemy.isAggroed ? '#49a797' : '#49a797';
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.textAlign = 'center';
    const barWidth = 150;
    const barY = enemy.y - enemy.r - 25;
    ctx.fillStyle = '#17131a';
    ctx.fillRect(enemy.x - barWidth / 2, barY, barWidth, 7);
    ctx.fillStyle = '#b34dff';
    ctx.fillRect(enemy.x - barWidth / 2, barY, barWidth * Math.max(0, enemy.hp / enemy.maxHp), 7);
    ctx.strokeStyle = '#e0aaff';
    ctx.strokeRect(enemy.x - barWidth / 2 - .5, barY - .5, barWidth + 1, 8);
    ctx.fillStyle = '#f7e5c5';
    ctx.font = 'bold 12px Space Mono';
    ctx.fillText(`${enemy.family} // ${enemy.variant}`, enemy.x, barY - 8);
    ctx.restore();
  });

  // 4. Void Walkers & Labels
  game.enemies.filter(enemy => enemy.voidWalker).forEach(enemy => {
    // Body & Visuals
    ctx.save();
    ctx.translate(enemy.x, enemy.y);

    const baseColor = '#0e6b5c';
    if (enemy.attackFlashTimer > 0) {
      const glowColor = 'rgba(157, 78, 221, 0.34)';
      const pulse = Math.sin(Date.now() * 0.012) * 6;
      ctx.beginPath();
      ctx.arc(0, 0, enemy.r + 14 + pulse, 0, Math.PI * 2);
      ctx.fillStyle = glowColor;
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(0, 0, enemy.r, 0, Math.PI * 2);
    ctx.fillStyle = baseColor;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#408075';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, enemy.r * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = '#110022';
    ctx.fill();
    ctx.restore();

    // Health Bar & Name Tag
    ctx.save();
    ctx.textAlign = 'center';

    const barWidth = 36;
    const barHeight = 4;
    const barX = enemy.x - barWidth / 2;
    const barY = enemy.y - enemy.r - 14;

    // Label
    ctx.fillStyle = '#f7e5c5';
    ctx.font = 'bold 9px Space Mono';
    ctx.fillText(`${enemy.family} // ${enemy.variant}`, enemy.x, barY - 4);

    // Health Bar Background
    ctx.fillStyle = '#17131a';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // Health Bar Fill
    const hpRatio = Math.max(0, Math.min(1, enemy.hp / enemy.maxHp));
    ctx.fillStyle = '#9d4edd';
    ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight);

    // Health Bar Border
    ctx.strokeStyle = '#e0aaff';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX - 0.5, barY - 0.5, barWidth + 1, barHeight + 1);

    ctx.restore();
  });

  // 5. Small Enemy Health Bars
  game.enemies.forEach(enemy => {
    if (enemy.maxHp > 1) return;
    ctx.fillStyle = '#17131a';
    ctx.fillRect(enemy.x - enemy.r, enemy.y - enemy.r - 9, enemy.r * 2, 3);
    ctx.fillStyle = enemy.color;
    ctx.fillRect(enemy.x - enemy.r, enemy.y - enemy.r - 9, enemy.r * 2 * Math.max(0, enemy.hp / Math.max(enemy.maxHp, 1)), 3);
  });

  game.enemies.forEach(enemy => {
    if (!(enemy.burnTimer > 0) || enemy.defeated) return;
    ctx.strokeStyle = '#ff865c';
    ctx.lineWidth = 3;
    ctx.globalAlpha = .8;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.r + 10, 0, Math.PI * 2);
    ctx.stroke();
  });
  game.enemies.forEach(enemy => {
    if (!(enemy.radiationTimer > 0) || enemy.defeated) return;
    ctx.strokeStyle = '#ff263f';
    ctx.lineWidth = 2;
    ctx.globalAlpha = .8;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.r + 14, 0, Math.PI * 2);
    ctx.stroke();
  });
  ctx.globalAlpha = 1;

  ctx.restore();
}
const baseDraw = draw;
draw = function() { const radii = game.enemies.map(enemy => enemy.r); game.enemies.forEach(enemy => enemy.r = 0); baseDraw(); game.enemies.forEach((enemy, index) => enemy.r = radii[index]); renderEnemySystem();};
function getSectorKey(sector) { return `sector-${sector}`; }
function getVoidBiome() { return { name: 'THE VOID', color: '#0a4f44', dark: '#03040e', key: 'void', sector: sectorRegions.length + 1, animationKey: 'void', effects: { moveMultiplier: .82, damageMultiplier: 1, enemySpeedMultiplier: 1, fireCooldownMultiplier: 1, pulseCooldownMultiplier: 1, healthRegen: 0, salvageMultiplier: 1, hazard: { name: 'NO HAZARD', description: 'The Void is silent and empty.', damagePerSecond: 0, visual: null, zoneDamagePerSecond: 0 } } }; }
function isInsideBeaconStation(x, y) { return Boolean(getBeaconStationAt(x, y)); }
function getPlayerDamageMultiplier() {
  return getBiome(game.player.x, game.player.y).effects.playerDamageMultiplier || 1;
}
function addEnemy(enemy) {
  if (!enemy || isInsideBeaconStation(enemy.x, enemy.y)) return null;
  game.enemies.push(enemy);
  return enemy;
}
function getBiome(x, y) {
  const distance = Math.hypot(x, y);
  if (distance < beaconRegionRadius) return { name: 'BEACON SANCTUARY', color: '#f9c779', dark: '#172d2d', key: 'sanctuary', sector: 0, animationKey: 'sanctuary', effects: { moveMultiplier: 1, damageMultiplier: 1, enemySpeedMultiplier: 1, fireCooldownMultiplier: 1, pulseCooldownMultiplier: 1, healthRegen: 0, salvageMultiplier: 1, hazard: { name: 'NO HAZARD', description: 'The beacon protects you from environmental hazards.', damagePerSecond: 0 } } };
  if (distance > mapRadius) return getVoidBiome();
  const angle = (Math.atan2(y, x) + Math.PI * 2) % (Math.PI * 2);
  const index = Math.floor(angle / (Math.PI / 2));
  const sector = getBiomeSector(distance);
  const biome = sectorRegions[sector][index];
  const beaconStation = getBeaconStationAt(x, y);
  if (beaconStation) {
    const supportModules = beaconStation.repaired ? beaconStation.modules.support || 0 : 0;
    return {
      ...biome,
      name: beaconStation.repaired ? 'BEACON STATION' : 'RUINED BEACON STATION',
      color: '#f9c779',
      dark: beaconStation.repaired ? '#17251f' : '#241b19',
      key: `beacon-${beaconStation.id}`,
      sectorKey: getSectorKey(sector),
      sector: sector + 1,
      animationKey: 'sanctuary',
      effects: {
        ...biome.effects,
        moveMultiplier: 1,
        damageMultiplier: 1,
        enemySpeedMultiplier: 1,
        fireCooldownMultiplier: 1 / (1 + supportModules * .1),
        pulseCooldownMultiplier: 1,
        healthRegen: 1.5 + supportModules * 3,
        playerDamageMultiplier: 1 + supportModules * .1,
        salvageMultiplier: 1,
        hazard: {
          ...biome.effects.hazard,
          name: 'BEACON PROTECTION',
          description: 'This beacon station blocks the surrounding biome effects.',
          damagePerSecond: 0,
          zoneDamagePerSecond: 0
        }
      }
    };
  }
  return { ...biome, key: `sector-${sector}-${index}`, sectorKey: getSectorKey(sector), sector: sector + 1, animationKey: `biome-${index}` };
}
function getDiscoveryKey(x, y) {
  const biome = getBiome(x, y);
  if (biome.key === 'sanctuary' || biome.key === 'void') return biome.key;
  const angle = (Math.atan2(y, x) + Math.PI * 2) % (Math.PI * 2);
  const biomeIndex = Math.floor(angle / (Math.PI / 2));
  return `${biome.sectorKey}-${biomeIndex}`;
}
function announceBiome(biome) {
  ui.announcement.textContent = biome.name;
  ui.announcement.style.color = biome.color;
  ui.announcement.className = 'biome-announcement';
  void ui.announcement.offsetWidth;
  ui.announcement.className = `biome-announcement show ${biome.animationKey}`;
}
function burst(x, y, amount, force) { for (let i = 0; i < amount; i++) game.sparks.push({ x, y, life: .45, vx: (Math.random() - .5) * force, vy: (Math.random() - .5) * force }); }
function updateUI(distance, safe, biome) { const sector = safe ? 0 : getBiomeSector(distance) + 1; const health = Math.max(0, Math.round(game.health)); if (safe && bankInventory()) updateInventoryUI(); updateStationUI(); ui.wave.textContent = String(sector).padStart(2, '0'); ui.score.textContent = String(game.score).padStart(6, '0'); ui.ammo.textContent = game.ammo; ui.health.style.width = `${health}%`; ui.healthValue.textContent = `${health}%`; ui.threats.textContent = String(game.enemies.length).padStart(2, '0'); ui.distance.textContent = `${String(Math.floor(distance / 10)).padStart(3, '0')}m`; ui.salvage.textContent = String(game.salvage).padStart(2, '0'); ui.relics.textContent = String(game.relics).padStart(2, '0'); ui.objective.textContent = safe ? 'SANCTUARY // SALVAGE BANKED' : 'RETURN TO BEACON // SALVAGE'; }
function updateInventoryUI() { const armor = getArmorEffects(); ui.inventory.innerHTML = `<span class="inventory-title">ARMOR // ${armor.name || 'NONE'}</span><span class="inventory-title">CARRIED // VAULT</span>${resourceTypes.map(resource => `<span class="inventory-item" title="${resource.name}: carried / stored in sanctuary vault"><span>${resource.name}</span><strong>${game.inventory[resource.key]} / ${game.vault[resource.key] || 0}</strong></span>`).join('')}`; }
function end() { game.active = false; game.high = Math.max(game.high, game.score); localStorage.setItem('horde-high', game.high); localStorage.setItem('horde-salvage', game.banked + game.salvage); localStorage.setItem('horde-relics', game.relics); localStorage.setItem('horde-atlas-crystals', game.atlasCrystals); ui.final.textContent = String(game.score).padStart(6, '0'); ui.high.textContent = String(game.high).padStart(6, '0'); ui.over.classList.remove('hidden'); }
function drawVoidBatarProjectile(bullet) {
  ctx.save();
  ctx.translate(bullet.x, bullet.y);
  ctx.rotate(Math.atan2(bullet.directionY, bullet.directionX));
  ctx.fillStyle = '#b9f4ff';
  ctx.shadowBlur = 6;
  ctx.shadowColor = '#8f7cff';
  ctx.beginPath();
  ctx.moveTo(7, 0);
  ctx.lineTo(-4, -1.5);
  ctx.lineTo(-2, 0);
  ctx.lineTo(-4, 1.5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
function drawMap() {
  const w = mapCanvas.width;
  const h = mapCanvas.height;
  const scale = getTacticalMapScale();
  const visibleRadius = getTacticalMapVisibleRadius();
  const center = getMapCenter();
  mapCtx.clearRect(0, 0, w, h);
  mapCtx.fillStyle = '#100d13';
  mapCtx.fillRect(0, 0, w, h);
  mapCtx.save();
  applyMapTransform(scale);
  mapCtx.fillStyle = '#100d13ee';
  mapCtx.fillRect(center.x - visibleRadius, center.y - visibleRadius, visibleRadius * 2, visibleRadius * 2);
  if (game.discovered.has('sanctuary')) {
    mapCtx.fillStyle = '#f9c77933';
    mapCtx.beginPath();
    mapCtx.arc(0, 0, beaconRegionRadius, 0, Math.PI * 2);
    mapCtx.fill();
  }
  sectorRegions.forEach((regions, sector) => {
    const inner = sector === 0 ? beaconRegionRadius : sector * 3000;
    const outer = (sector + 1) * 3000;
    regions.forEach((biome, index) => {
      if (!game.discovered.has(`${getSectorKey(sector)}-${index}`)) return;
      const start = index * Math.PI / 2;
      const end = start + Math.PI / 2;
      mapCtx.fillStyle = `${biome.color}38`;
      mapCtx.beginPath();
      mapCtx.arc(0, 0, outer, start, end);
      if (inner > 0) mapCtx.arc(0, 0, inner, end, start, true);
      else mapCtx.lineTo(0, 0);
      mapCtx.closePath();
      mapCtx.fill();
    });
  });
  sectorRegions.forEach((regions, sector) => {
    mapCtx.strokeStyle = `${regions[0].color}99`;
    mapCtx.lineWidth = 3 / scale;
    mapCtx.beginPath();
    mapCtx.arc(0, 0, (sector + 1) * 3000, 0, Math.PI * 2);
    mapCtx.stroke();
  });
  mapCtx.strokeStyle = '#f9c779';
  mapCtx.lineWidth = 7 / scale;
  mapCtx.beginPath();
  mapCtx.arc(0, 0, beaconRegionRadius, 0, Math.PI * 2);
  mapCtx.stroke();
  game.nodes.forEach(node => {
    if (node.taken || !game.discovered.has(getDiscoveryKey(node.x, node.y))) return;
    mapCtx.fillStyle = node.type === 'relic' ? '#b9f4ff' : '#ffbe68';
    mapCtx.fillRect(node.x - 30, node.y - 30, 60, 60);
  });
  game.enemies.forEach(enemy => {
    if (enemy.voidStalker || !game.discovered.has(getDiscoveryKey(enemy.x, enemy.y))) return;
    mapCtx.fillStyle = '#ff4d42';
    mapCtx.fillRect(enemy.x - 35, enemy.y - 35, 70, 70);
  });
  mapCtx.save();
  mapCtx.translate(game.player.x, game.player.y);
  mapCtx.rotate(game.player.angle + Math.PI / 2);
  const markerSize = 9 / scale;
  mapCtx.fillStyle = '#ff4d42';
  mapCtx.strokeStyle = '#fff4e8';
  mapCtx.lineWidth = 1 / scale;
  mapCtx.beginPath();
  mapCtx.moveTo(0, -markerSize);
  mapCtx.lineTo(markerSize * .72, markerSize * .75);
  mapCtx.lineTo(0, markerSize * .4);
  mapCtx.lineTo(-markerSize * .72, markerSize * .75);
  mapCtx.closePath();
  mapCtx.fill();
  mapCtx.stroke();
  mapCtx.restore();
  mapCtx.restore();
}
function drawStalkerMapMarker() {
  const stalker = game.enemies.find(enemy => enemy.voidStalker && !enemy.defeated);
  if (!stalker) return;
  const scale = getTacticalMapScale();
  mapCtx.save();
  applyMapTransform(scale);
  mapCtx.fillStyle = '#d78cff';
  mapCtx.beginPath();
  mapCtx.arc(stalker.x, stalker.y, 4 / scale, 0, Math.PI * 2);
  mapCtx.fill();
  mapCtx.restore();
}
function draw() {
  const w = canvas.clientWidth,
    h = canvas.clientHeight,
    biome = getBiome(game.player.x, game.player.y);

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = biome.dark;
  ctx.fillRect(0, 0, w, h);

  const camX = game.camera.x - w / 2,
    camY = game.camera.y - h / 2;

  ctx.save();
  ctx.translate(-camX, -camY);

  // Grid
  ctx.strokeStyle = `${biome.color}18`;
  for (let x = -mapRadius; x < mapRadius; x += 160) {
    ctx.beginPath();
    ctx.moveTo(x, -mapRadius);
    ctx.lineTo(x, mapRadius);
    ctx.stroke();
  }
  for (let y = -mapRadius; y < mapRadius; y += 160) {
    ctx.beginPath();
    ctx.moveTo(-mapRadius, y);
    ctx.lineTo(mapRadius, y);
    ctx.stroke();
  }

  // Beacon Rings
  [beaconRegionRadius, ...biomeBoundaries].forEach((radius, i) => {
    ctx.strokeStyle = i === 0 ? '#f9c77999' : `${biome.color}28`;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();
  });

  // Cardinal Lines
  ctx.setLineDash([]);
  ctx.lineWidth = 3;
  ctx.strokeStyle = `${biome.color}55`;
  [0, Math.PI / 2, Math.PI, Math.PI * 1.5].forEach(angle => {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(angle) * mapRadius, Math.sin(angle) * mapRadius);
    ctx.stroke();
  });
  ctx.setLineDash([]);

  // Nodes (Relics & Gems)
  game.nodes.forEach(n => {
    if (n.taken) return;
    ctx.fillStyle = n.type === 'relic' ? '#b9f4ff' : '#ffbe68';
    ctx.shadowBlur = 14;
    ctx.shadowColor = ctx.fillStyle;
    ctx.beginPath();
    ctx.arc(n.x, n.y, n.type === 'relic' ? 7 : 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  });

  game.gems.forEach(g => {
    ctx.fillStyle = '#ffcc70';
    ctx.beginPath();
    ctx.moveTo(g.x, g.y - 5);
    ctx.lineTo(g.x + 5, g.y);
    ctx.lineTo(g.x, g.y + 5);
    ctx.lineTo(g.x - 5, g.y);
    ctx.fill();
  });

  // Sparks
  game.sparks.forEach(s => {
    ctx.fillStyle = `rgba(255,${100 + s.life * 200},70,${s.life * 4})`;
    ctx.fillRect(s.x, s.y, 3, 3);
  });

  // AOE Explosions Visual Effects
  if (game.explosions) {
    game.explosions.forEach(exp => {
      const progress = 1 - (exp.life / exp.maxLife);
      const currentRadius = exp.maxRadius * progress;
      const alpha = exp.life / exp.maxLife;

      ctx.save();
      // Expanding outer shockwave ring
      ctx.strokeStyle = exp.color || '#ff725e';
      ctx.lineWidth = 4;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(exp.x, exp.y, currentRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Inner flash fill
      ctx.fillStyle = '#ffb067';
      ctx.globalAlpha = alpha * 0.35;
      ctx.beginPath();
      ctx.arc(exp.x, exp.y, currentRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  // Player Bullets
  game.bullets.forEach(b => {
    if (b.voidBatarMotion) {
      drawVoidBatarProjectile(b);
    } else {
      ctx.fillStyle = b.burnDuration ? '#ff865c' : '#ffd08a';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius || 3, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  game.beams.forEach(beam => {
    ctx.save();
    ctx.globalAlpha = beam.life / beam.maxLife;
    ctx.strokeStyle = beam.color;
    ctx.lineWidth = 5;
    ctx.shadowBlur = 16;
    ctx.shadowColor = beam.color;
    ctx.beginPath();
    ctx.moveTo(beam.x, beam.y);
    ctx.lineTo(beam.x + Math.cos(beam.angle) * beam.length, beam.y + Math.sin(beam.angle) * beam.length);
    ctx.stroke();
    ctx.restore();
  });
  if (game.radBeamActive && game.weapon === 'radBeam' && game.ammo > 0) {
    const directionX = Math.cos(game.player.angle);
    const directionY = Math.sin(game.player.angle);
    const startX = game.player.x + directionX * 20;
    const startY = game.player.y + directionY * 20;
    const length = weaponCatalog.radBeam.range;
    ctx.save();
    ctx.strokeStyle = '#ff263f';
    ctx.lineWidth = 6;
    ctx.shadowBlur = 18;
    ctx.shadowColor = '#ff263f';
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(startX + directionX * length, startY + directionY * length);
    ctx.stroke();
    ctx.restore();
  }

  // Enemy Projectiles (Void Walker Shockwaves)
  if (game.projectiles) {
    game.projectiles.forEach(p => {
      if (p.frostAura) {
        ctx.fillStyle = '#82c5d733';
        ctx.strokeStyle = '#82c5d777';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.frostAuraRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.fillStyle = p.color || '#9d4edd';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius || p.r || 5, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // Enemies
  game.enemies.filter(e => !e.voidStalker).forEach(e => {
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(Math.atan2(game.player.y - e.y, game.player.x - e.x));
    
    ctx.fillStyle = e.color || biome.color; 
    
    ctx.beginPath();
    ctx.moveTo(e.r + 4, 0);
    ctx.lineTo(-e.r, -e.r);
    ctx.lineTo(-e.r * .55, 0);
    ctx.lineTo(-e.r, e.r);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  });

  // Center Beacon Station
  ctx.strokeStyle = '#f9c779';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 35, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#f9c779';
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, Math.PI * 2);
  ctx.fill();

  // Player
  const p = game.player;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle);
  
  ctx.fillStyle = '#e9dfd2';
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0, Math.PI * 2);
  ctx.fill();
  
  const heldWeapon = weaponCatalog[game.weapon];
  if (heldWeapon.kind === 'melee') {
    drawMeleeWeapon(game.meleeAttack, heldWeapon);
  } else {
    ctx.fillStyle = '#ffb35c';
    ctx.fillRect(5, -3, 22, 6);
  }
  
  ctx.fillStyle = '#3f2630';
  ctx.beginPath();
  ctx.arc(0, 0, 7, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.restore();
  ctx.restore();
}