const canvas = document.querySelector('#arena');
const ctx = canvas.getContext('2d');
const mapCanvas = document.querySelector('#map');
const mapCtx = mapCanvas.getContext('2d');
const crosshair = document.querySelector('.crosshair');
const adminPanel = document.querySelector('#admin-panel');
const ui = { wave: document.querySelector('#wave'), score: document.querySelector('#score'), high: document.querySelector('#high-score'), ammo: document.querySelector('#ammo'), ammoStorage: document.querySelector('#ammo-storage'), medkits: document.querySelector('#medkits'), weaponName: document.querySelector('#weapon-name'), ammoType: document.querySelector('#ammo-type'), health: document.querySelector('#health-bar'), healthValue: document.querySelector('#health-value'), threats: document.querySelector('#threat-count'), distance: document.querySelector('#distance'), salvage: document.querySelector('#salvage'), relics: document.querySelector('#relics'), objective: document.querySelector('#objective-text'), start: document.querySelector('#start-screen'), over: document.querySelector('#game-over'), final: document.querySelector('#final-score'), announcement: document.querySelector('#biome-announcement'), effects: document.querySelector('#biome-effects'), inventory: document.querySelector('#inventory-hud'), stations: document.querySelector('#sanctuary-stations'), stationOutput: document.querySelector('#station-output'), arsenal: document.querySelector('#arsenal-list'), craftDetails: document.querySelector('#craft-details') };
const debugConsoleOutput = document.querySelector('#debug-console-output');
const clearConsoleButton = document.querySelector('#clear-console');
const atlasCrystalCounter = document.querySelector('#atlas-crystals');
function gameLog(level, message, detail = '') { if (!debugConsoleOutput) return; const entry = document.createElement('div'); entry.className = 'debug-console-entry'; const now = new Date(); const time = now.toLocaleTimeString([], { hour12: false }); entry.innerHTML = `<span class="debug-console-time">${time}</span><span class="debug-console-level ${level.toLowerCase()}">${level}</span><span class="debug-console-message"></span>${detail ? '<span class="debug-console-detail"></span>' : ''}`; entry.querySelector('.debug-console-message').textContent = String(message); if (detail) entry.querySelector('.debug-console-detail').textContent = String(detail); debugConsoleOutput.append(entry); while (debugConsoleOutput.children.length > 200) debugConsoleOutput.firstElementChild.remove(); debugConsoleOutput.scrollTop = debugConsoleOutput.scrollHeight; }
window.addEventListener('error', event => gameLog('ERROR', event.message || 'Uncaught error', `${event.filename || 'unknown source'}:${event.lineno || 0}:${event.colno || 0}`));
window.addEventListener('unhandledrejection', event => { const reason = event.reason; gameLog('ERROR', reason?.message || String(reason || 'Unhandled promise rejection'), reason?.stack || 'Unhandled promise rejection'); });
clearConsoleButton?.addEventListener('click', () => { debugConsoleOutput.innerHTML = ''; gameLog('INFO', 'Diagnostic console cleared'); });
gameLog('INFO', 'Diagnostic console online');
const keys = {}; const pointer = { x: 0, y: 0, down: false }; let animation; let lastTime = 0; let adminMode = true;
const clipSize = 12;
const startingAmmoStorage = 15;
const maxAmmoStorage = 25;
const stationInteractionRadius = 95;
const stationPositions = { crafting: { x: -300, y: -27 }, furnace: { x: 285, y: -27 } };
const beaconRegionRadius = 1200;
const mapRadius = 18000;
const sectorRegions = [
  [{ name: 'TOXIC MARSH', color: '#65b49a', dark: '#172d2d' }, { name: 'SCORCHED WASTES', color: '#ff865c', dark: '#3b211d' }, { name: 'FROZEN PEAKS', color: '#9fd8e3', dark: '#1b2a3c' }, { name: 'ASHEN LOWLANDS', color: '#c88968', dark: '#322522' }],
  [{ name: 'THUNDER PLAINS', color: '#f2c96d', dark: '#302b1f' }, { name: 'IRONWOOD', color: '#8fc47e', dark: '#1d3026' }, { name: 'GLASS DESERT', color: '#ad7b07', dark: '#5b3603' }, { name: 'FROSTFALL TRENCH', color: '#82c5d7', dark: '#1b2e3b' }],
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
  { key: 'steel', name: 'STEEL', color: '#9fd8e3', weight: 5 }, 
  { key: 'stone', name: 'STONE', color: '#b9b0a8', weight: 10 },
  { key: 'fiber', name: 'FIBER', color: '#8fc47e', weight: 12 },
  { key: 'crystal', name: 'CRYSTAL', color: '#d58ee0', weight: 7 },
  { key: 'fuel', name: 'FUEL', color: '#ff865c', weight: 9 }
];
const weaponCatalog = {
  // Tier 0 (Starter)
  sidearm: { name: 'SIDEARM', ammo: 'pistolAmmo', magazine: 12, cooldown: 200, damage: 0.30, speed: 650, life: .7, pellets: 1, spread: .15, kind: 'gun' },
  
  // Tier 1 (Early Game)
  duelSidearm: { name: 'DUEL SIDEARM', ammo: 'pistolAmmo', magazine: 24, cooldown: 110, damage: 0.22, speed: 680, life: .7, pellets: 1, spread: .14, kind: 'gun', dualWield: true },
  smg: { name: 'SMG', ammo: 'smgAmmo', magazine: 32, cooldown: 55, damage: 0.16, speed: 700, life: .7, pellets: 1, spread: .12, kind: 'gun' },
  machete: { name: 'MACHETE', ammo: null, cooldown: 450, damage: 1.20, range: 105, arc: .9, kind: 'melee' },
  spear: { name: 'SPEAR', ammo: null, cooldown: 600, damage: 1.80, range: 160, arc: .35, kind: 'melee' },

  // Tier 2 (Mid Game)
  shotgun: { name: 'SHOTGUN', ammo: 'shells', magazine: 6, cooldown: 480, damage: 0.30, speed: 580, life: .45, pellets: 8, spread: .34, falloff: true, kind: 'gun' },
  burstRifle: { name: 'BURST RIFLE', ammo: 'rifleAmmo', magazine: 24, cooldown: 220, damage: 0.325, speed: 780, life: .8, pellets: 3, spread: .06, kind: 'gun' },
  flamethrower: { name: 'FLAMETHROWER', ammo: 'fuelCells', magazine: 160, cooldown: 40, damage: 0.10, speed: 450, life: .40, pellets: 2, spread: .32, kind: 'gun' },
  sniper: { name: 'SNIPER', ammo: 'marksmanAmmo', magazine: 5, cooldown: 750, damage: 3.60, speed: 1200, life: 1, pellets: 1, spread: 0, kind: 'gun' },
  warHammer: { name: 'WAR HAMMER', ammo: null, cooldown: 850, damage: 4.20, range: 95, arc: .75, kind: 'melee' },

  // Tier 3 (Late Mid Game)
  minigun: { name: 'MINIGUN', ammo: 'minigunAmmo', magazine: 100, cooldown: 30, damage: 0.25, speed: 750, life: .8, pellets: 1, spread: .08, kind: 'gun' },
  laser: { name: 'LASER', ammo: 'cells', magazine: 20, cooldown: 100, damage: 0.85, speed: 1100, life: .55, pellets: 1, spread: 0, kind: 'gun' },
  grenadeLauncher: { name: 'GRENADE LAUNCHER', ammo: 'grenades', magazine: 4, cooldown: 800, damage: 3.5, speed: 380, life: 1.4, pellets: 1, spread: 0, blast: 110, kind: 'gun' },
  pulseCarbine: { name: 'PULSE CARBINE', ammo: 'pulseCells', magazine: 25, cooldown: 140, damage: 1.20, speed: 880, life: .7, pellets: 1, spread: .02, kind: 'gun' },
  laserBlade: { name: 'LASER BLADE', ammo: null, cooldown: 350, damage: 2.80, range: 105, arc: .55, kind: 'melee' },

  // Tier 4 (Exotic / Endgame)
  magicGauntlet: { name: 'MAGIC GAUNTLET', ammo: 'magicGauntletAmmo', magazine: 14, cooldown: 100, damage: 1.30, speed: 640, life: .60, pellets: 1, spread: .30, kind: 'gun', oscillating: true, coneSize: .20 },
  railgun: { name: 'RAILGUN', ammo: 'slugs', magazine: 2, cooldown: 1200, damage: 18.00, speed: 1600, life: 1, pellets: 1, spread: 0, kind: 'gun' },
  cosmosGauntlet: { name: 'COSMOS GAUNTLET', ammo: 'cosmosGauntletAmmo', magazine: 16, cooldown: 120, damage: 1.10, speed: 650, life: 0.8, pellets: 2, spread: .40, kind: 'gun', oscillating: true, coneSize: .25 }
};

// ==================== AMMO CRAFTING BATCHES ====================
const ammoCatalog = {
  pistolAmmo: { name: 'PISTOL AMMO', amount: 24, cost: { rawIron: 2, fuel: 1 } }, 
  shells: { name: 'SHOTGUN SHELLS', amount: 12, cost: { rawIron: 3, fuel: 2 } }, 
  minigunAmmo: { name: 'MINIGUN BELT', amount: 100, cost: { steel: 4, fuel: 3 } }, 
  rifleAmmo: { name: 'RIFLE AMMO', amount: 36, cost: { iron: 3, fuel: 2 } },
  marksmanAmmo: { name: 'MARKSMAN ROUNDS', amount: 10, cost: { steel: 4, crystal: 1 } },
  smgAmmo: { name: 'SMG AMMO', amount: 60, cost: { rawIron: 3, fuel: 2 } }, 
  cells: { name: 'LASER CELLS', amount: 30, cost: { crystal: 3, steel: 2 } }, 
  grenades: { name: 'GRENADE CASINGS', amount: 8, cost: { iron: 3, fuel: 4 } }, 
  slugs: { name: 'RAIL SLUGS', amount: 4, cost: { steel: 5, crystal: 2 } }, 
  fuelCells: { name: 'FLAME FUEL', amount: 160, cost: { fuel: 8, rawIron: 2 } }, 
  pulseCells: { name: 'PULSE CELLS', amount: 35, cost: { crystal: 4, steel: 3 } }, 
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
  shotgun: { name: 'SHOTGUN', time: 8, cost: { steel: 5, wood: 4 }, weapon: 'shotgun' },
  burstRifle: { name: 'BURST RIFLE', time: 8, cost: { steel: 6, iron: 4 }, weapon: 'burstRifle' },
  flamethrower: { name: 'FLAMETHROWER', time: 9, cost: { steel: 4, fuel: 8 }, weapon: 'flamethrower' },
  warHammer: { name: 'WAR HAMMER', time: 9, cost: { steel: 6, stone: 8 }, weapon: 'warHammer' },
  sniper: { name: 'SNIPER', time: 10, cost: { steel: 8, crystal: 2 }, weapon: 'sniper' },

  // Tier 3 (Late Mid Game - High Steel & Crystal Integration)
  minigun: { name: 'MINIGUN', time: 12, cost: { steel: 12, fuel: 6 }, weapon: 'minigun' },
  laser: { name: 'LASER', time: 12, cost: { steel: 6, crystal: 6 }, weapon: 'laser' },
  grenadeLauncher: { name: 'GRENADE LAUNCHER', time: 13, cost: { steel: 8, fuel: 8 }, weapon: 'grenadeLauncher' },
  pulseCarbine: { name: 'PULSE CARBINE', time: 14, cost: { steel: 10, crystal: 5 }, weapon: 'pulseCarbine' },
  laserBlade: { name: 'LASER BLADE', time: 13, cost: { steel: 8, crystal: 4, relic: 1 }, weapon: 'laserBlade' },

  // Tier 4 (Endgame / Exotic - Relics & Atlas Crystals)
  magicGauntlet: { name: 'MAGIC GAUNTLET', time: 15, cost: { crystal: 12, steel: 6, relic: 1 }, weapon: 'magicGauntlet' },
  railgun: { name: 'RAILGUN', time: 18, cost: { steel: 16, crystal: 8, relic: 2 }, weapon: 'railgun' },
  cosmosGauntlet: { name: 'COSMOS GAUNTLET', time: 20, cost: { crystal: 16, steel: 8, relic: 2, atlasCrystal: 1, magicGauntlet: 1 }, weapon: 'cosmosGauntlet' }
};
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
  ['MIRE CRAWLER', 'ACID BLOOD', 'acid'], ['CINDER HOUND', 'IGNITE', 'burn'], ['ICE MAW', 'FLASH FREEZE', 'slow'], ['ASH STALKER', 'SMOKE VEIL', 'evasion'],
  ['THUNDER RAM', 'ARC CHARGE', 'shock'], ['IRONWOOD TREANT', 'ROOT GRIP', 'root'], ['MIRAGE WRAITH', 'FALSE IMAGE', 'evasion'], ['FROSTBURROWER', 'PERMAFROST', 'slow'],
  ['BONE HARVESTER', 'BONE ARMOR', 'armor'], ['EMBER SERPENT', 'EMBER TRAIL', 'burn'], ['SPORE BRUTE', 'SPORE CLOUD', 'drain'], ['GRAVITY LEECH', 'GRAVITY WELL', 'pull'],
  ['STORM KNIGHT', 'CHAIN LIGHTNING', 'shock'], ['BLOOD HUNTER', 'HEMORRHAGE', 'bleed'], ['NULL PHANTOM', 'NULL FIELD', 'slow'], ['WRAITH EATER', 'LIFE DRAIN', 'drain'],
  ['DUSK STAG', 'DARKSTEP', 'evasion'], ['STARFIRE GOLEM', 'STARFIRE', 'burn'], ['NEBULA SWARM', 'RADIATION', 'drain'], ['PRESSURE TITAN', 'PRESSURE WAVE', 'pull'],
  ['VOID CRAWLER', 'REALITY TEAR', 'armor'], ['HORIZON DEVOURER', 'SINGULARITY', 'pull'], ['STAR EATER', 'SOLAR FLARE', 'shock'], ['ENDLESS SHADE', 'VOID STEP', 'evasion']
];

sectorRegions.flat().forEach((biome, index) => { biome.effects = { moveMultiplier: 1, damageMultiplier: 1, enemySpeedMultiplier: 1, fireCooldownMultiplier: 1, pulseCooldownMultiplier: 1, healthRegen: 0, salvageMultiplier: 1, hazard: { ...biomeHazards[index], visual: hazardVisuals[index], zoneDamagePerSecond: biomeHazards[index].damagePerSecond }, ...biomeEffectProfiles[index] }; });
sectorRegions.flat().forEach((biome, index) => { const family = enemyFamilies[index]; biome.enemyFamily = { name: family[0], ability: family[1], effect: family[2] }; });
function seededRandom(seed) { let value = seed >>> 0; return () => { value = (value * 1664525 + 1013904223) >>> 0; return value / 4294967296; }; }
function randomizeBiomeData(seed) { const random = seededRandom(seed); const positives = [() => ({ healthRegen: 3 + random() * 3 }), () => ({ moveMultiplier: 1.15 + random() * .25 }), () => ({ fireCooldownMultiplier: .55 + random() * .2 }), () => ({ pulseCooldownMultiplier: .35 + random() * .2 }), () => ({ salvageMultiplier: 1.75 + random() * 1.25 }), () => ({ enemySpeedMultiplier: .55 + random() * .2 })]; const negatives = [() => ({ damageMultiplier: 1.05 + random() * .1 }), () => ({ enemySpeedMultiplier: 1.05 + random() * .1 }), () => ({ moveMultiplier: .88 + random() * .07 }), () => ({ fireCooldownMultiplier: 1.05 + random() * .1 }), () => ({ pulseCooldownMultiplier: 1.05 + random() * .1 })]; sectorRegions.flat().forEach((biome, index) => { const positive = positives[Math.floor(random() * positives.length)](); const firstNegative = negatives[Math.floor(random() * negatives.length)](); const secondNegative = negatives[Math.floor(random() * negatives.length)](); const hazard = biome.effects.hazard; const sectorHazardMultiplier = .35 + Math.floor(index / 4) * .23; biome.effects = { moveMultiplier: 1, damageMultiplier: 1, enemySpeedMultiplier: 1, fireCooldownMultiplier: 1, pulseCooldownMultiplier: 1, healthRegen: 0, salvageMultiplier: 1, hazard: { ...hazard, damagePerSecond: biomeHazards[index].damagePerSecond * sectorHazardMultiplier, zoneDamagePerSecond: 3.5 + random() * 3 }, ...positive, ...firstNegative, ...secondNegative }; Object.assign(biome.effects, positive); if (index % 2 === 0) biome.effects.hazard.zoneDamagePerSecond += 1; }); }
let game = freshGame();
function freshGame() {
  const storedStationItems = JSON.parse(localStorage.getItem('horde-station-items') || '{}');
  const stationItems = { ...storedStationItems, medkit: Math.min(5, Math.max(0, Number(storedStationItems.medkit ?? 1))) };
  return { 
    active: false, 
    seed: Math.floor(Math.random() * 4294967296), 
    score: 0, 
    high: Number(localStorage.getItem('horde-high') || 0), 
    wave: 1, 
    currentSector: 0, 
    health: 100, 
    ammo: clipSize, 
    ammoStorage: startingAmmoStorage, 
    ammoReserve: { pistolAmmo: startingAmmoStorage * clipSize, magicGauntletAmmo: 6, cosmosGauntletAmmo: 6 }, 
    weapon: 'sidearm', 
    unlockedWeapons: { sidearm: true }, 
    reloadPending: false, 
    salvage: 0, 
    relics: 0, 
    atlasCrystals: 0, 
    banked: Number(localStorage.getItem('horde-salvage') || 0), 
    vault: JSON.parse(localStorage.getItem('horde-vault') || '{}'), 
    inventory: Object.fromEntries(resourceTypes.map(resource => [resource.key, 0])), 
    stationItems, 
    crafting: null, 
    stationOpen: null, 
    enemies: [], 
    bullets: [], 
    projectiles: [], 
    sparks: [], 
    gems: [], 
    drops: [], 
    nodes: [], 
    hazardZones: [], 
    discovered: new Set(['sanctuary']), 
    player: { x: 0, y: 0, angle: 0 }, 
    spawnTimer: 0, 
    voidSpawnTimer: 0, 
    fireTimer: 0, 
    pulseTimer: 0, 
    magicGauntletRechargeTimer: 5, 
    cosmosGauntletRechargeTimer: 6, 
    biomeKey: null, 
    announcementTimer: 0, 
    camera: { x: 0, y: 0 } 
  };
}
ui.high.textContent = String(game.high).padStart(6, '0');
function resize() { const ratio = window.devicePixelRatio || 1; canvas.width = canvas.clientWidth * ratio; canvas.height = canvas.clientHeight * ratio; ctx.setTransform(ratio, 0, 0, ratio, 0, 0); if (!game.active) game.player = { x: canvas.clientWidth / 2, y: canvas.clientHeight / 2, angle: 0 }; }
window.addEventListener('resize', resize); resize();
window.addEventListener('keydown', event => { keys[event.key.toLowerCase()] = true; if (event.code === 'F2' || event.key === 'F2') { event.preventDefault(); adminMode = !adminMode; adminPanel.hidden = !adminMode; } if (event.key.toLowerCase() === 'e' && game.active && !event.repeat) toggleStation(); if (event.key === ' ' && game.active) shoot(); if (event.key.toLowerCase() === 'h' && game.active && !event.repeat) useMedkit(); if (event.key.toLowerCase() === 'q' && game.active) pulse(); if (game.active && !event.repeat && /^[0-9]$/.test(event.key)) switchWeapon(Number(event.key)); }); window.addEventListener('keyup', event => keys[event.key.toLowerCase()] = false);
canvas.addEventListener('pointermove', event => { const box = canvas.getBoundingClientRect(); pointer.x = event.clientX - box.left; pointer.y = event.clientY - box.top; crosshair.style.left = `${pointer.x}px`; crosshair.style.top = `${pointer.y}px`; }); canvas.addEventListener('pointerdown', () => { pointer.down = true; if (game.active) shoot(); }); window.addEventListener('pointerup', () => pointer.down = false);
document.querySelector('#start-button').onclick = start; document.querySelector('#restart-button').onclick = start; adminPanel.hidden = !adminMode; adminPanel.querySelectorAll('[data-admin]').forEach(button => button.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); adminAction(button.dataset.admin, button.dataset.value); })); document.querySelectorAll('[data-craft]').forEach(button => button.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); openCraftDetails(button.dataset.craft); })); ui.craftDetails.addEventListener('click', event => { const closeButton = event.target.closest('[data-close-details]'); if (closeButton) { event.preventDefault(); event.stopPropagation(); ui.craftDetails.hidden = true; ui.craftDetails.innerHTML = ''; return; } const craftButton = event.target.closest('[data-craft-confirm]'); if (craftButton) { event.preventDefault(); event.stopPropagation(); craftItem(craftButton.dataset.craftConfirm); } });
function adminAction(action, value) { if (!game.active) start(); if (action === 'sector') teleportToSector(Number(value)); if (action === 'spawn') for (let i = 0; i < 20; i++) spawn(); if (action === 'refill') { game.health = 100; game.ammo = clipSize; game.ammoStorage = startingAmmoStorage; game.ammoReserve.magicGauntletAmmo = 6; game.magicGauntletRechargeTimer = 5; game.salvage = 0; game.relics = 0; } if (action === 'reset') { teleportPlayer(0, 0); game.enemies = []; game.bullets = []; game.discovered = new Set(['sanctuary']); game.biomeKey = null; } }
function teleportToSector(sector) { teleportPlayer((sector - .5) * 3000, 0); game.currentSector = sector; game.biomeKey = null; game.discovered.add(getSectorKey(sector - 1)); }
function teleportPlayer(x, y) { game.player.x = x; game.player.y = y; game.camera.x = x; game.camera.y = y; }
function start() { game = freshGame(); game.active = true; randomizeBiomeData(game.seed); game.hazardZones = generateHazardZones(); const random = seededRandom(game.seed + 17); updateInventoryUI(); updateStationButtons(); for (let i = 0; i < 140; i++) game.nodes.push({ x: (random() - .5) * mapRadius * 2, y: (random() - .5) * mapRadius * 1.5, type: random() > .5 ? 'chest' : 'scrap', taken: false }); ui.start.classList.add('hidden'); ui.over.classList.add('hidden'); lastTime = performance.now(); cancelAnimationFrame(animation); animation = requestAnimationFrame(loop); }
function switchWeapon(index) { const weaponId = ['sidearm', 'shotgun', 'minigun', 'burstRifle', 'sniper', 'smg', 'laser', 'grenadeLauncher', 'railgun', 'flamethrower', 'pulseCarbine', 'magicGauntlet', 'machete', 'warHammer', 'spear'][index - 1]; if (!weaponId || !game.unlockedWeapons[weaponId]) return; game.weapon = weaponId; game.ammo = 0; game.reloadPending = weaponCatalog[weaponId].kind !== 'melee'; updateAmmoUI(); }
function meleeAttack(weapon) { const p = game.player; game.enemies.forEach(enemy => { const distance = Math.hypot(enemy.x - p.x, enemy.y - p.y); const angle = Math.atan2(enemy.y - p.y, enemy.x - p.x); const difference = Math.atan2(Math.sin(angle - p.angle), Math.cos(angle - p.angle)); if (distance < weapon.range && Math.abs(difference) < weapon.arc) { enemy.hp = Math.max(0, enemy.hp - weapon.damage); if (enemy.hp <= 0) defeatEnemy(enemy); burst(enemy.x, enemy.y, 5, 100); } }); for (let i = 0; i < 10; i++) game.sparks.push({ x: p.x + Math.cos(p.angle) * weapon.range * .5, y: p.y + Math.sin(p.angle) * weapon.range * .5, life: .2, vx: (Math.random() - .5) * 100, vy: (Math.random() - .5) * 100 }); }
function shoot() { if (!game.active || game.fireTimer > 0) return; const weapon = weaponCatalog[game.weapon]; const p = game.player; const effects = getBiome(p.x, p.y).effects; if (weapon.kind === 'melee') { game.fireTimer = weapon.cooldown * effects.fireCooldownMultiplier; meleeAttack(weapon); return; } if (game.ammo <= 0) { game.reloadPending = true; return; } game.ammo--; if (game.ammo === 0) game.reloadPending = true; game.fireTimer = weapon.cooldown * effects.fireCooldownMultiplier; for (let i = 0; i < weapon.pellets; i++) { const angle = p.angle + (Math.random() - .5) * weapon.spread; const bullet = { x: p.x + Math.cos(angle) * 20, y: p.y + Math.sin(angle) * 20, vx: Math.cos(angle) * weapon.speed, vy: Math.sin(angle) * weapon.speed, life: weapon.life, damage: weapon.damage, blast: weapon.blast || 0, falloff: weapon.falloff, baseAngle: angle, oscillating: Boolean(weapon.oscillating), swayAmplitude: weapon.coneSize || 0, swayPhase: Math.random() * Math.PI * 2 }; game.bullets.push(bullet); } for (let i = 0; i < 4; i++) game.sparks.push({ x: p.x + Math.cos(p.angle) * 25, y: p.y + Math.sin(p.angle) * 25, life: .2, vx: Math.cos(p.angle) * 100 + (Math.random() - .5) * 100, vy: Math.sin(p.angle) * 100 + (Math.random() - .5) * 100 }); }
function useMedkit() { if (!game.active || !game.stationItems.medkit || game.health >= 100) return; game.stationItems.medkit = Math.max(0, (game.stationItems.medkit || 0) - 1); game.health = Math.min(100, game.health + 45); localStorage.setItem('horde-station-items', JSON.stringify(game.stationItems)); updateAmmoUI(); ui.stationOutput.textContent = 'MEDKIT USED // +45% VITALITY'; }
function pulse() { if (game.pulseTimer > 0) return; game.pulseTimer = 7 * getBiome(game.player.x, game.player.y).effects.pulseCooldownMultiplier; game.enemies.forEach(e => { if (e.hp && Math.hypot(e.x - game.player.x, e.y - game.player.y) < 170) { e.hp -= 2; if (e.hp <= 0) defeatEnemy(e, 50); burst(e.x, e.y, 8, 180); } }); burst(game.player.x, game.player.y, 35, 260); }
function createVoidWorm(x, y, canSplit = true) {
  const maxHp = 80.0;
  const enemy = { 
    x, y, family: 'VOID WORM', familyIndex: 24, ability: 'VOID BURROW', effect: null, 
    variant: 'COLOSSAL', boss: false, voidWorm: true, canSplit, color: '#8f7cff', r: 34, 
    speed: 72, hp: maxHp, maxHp, damage: 0, contactDamage: 10, score: 500, drops: 0, 
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
      const weaponDamage = weapon?.falloff ? weapon.damage * Math.max(.25, 1 - distance / 550) : weapon?.damage || .12;
      health = attemptedDamage > 0 && attemptedDamage <= .120001 ? Math.max(0, health - weaponDamage) : value;
    }
  });

  return enemy;
}
function createVoidWalker(x, y) {
  const maxHp = 800;
  const enemy = {
    x: x,
    y: y,
    r: 22,
    speed: 35,
    voidWalker: true,
    isAggroed: false,
    wanderAngle: Math.random() * Math.PI * 2,
    wanderTimer: 0,
    attackTimer: 3,
    maxHp: maxHp,
    color: '#9d4edd',
    family: 'VOID WALKER',
    familyIndex: 24,
    variant: 'HEAVY',
    boss: true,
    contactDamage: 20,
    score: 800,
    drops: 3
  };

  let health = maxHp;
  Object.defineProperty(enemy, 'hp', {
    configurable: true,
    get: () => health,
    set: value => {
      const attemptedDamage = health - value;
      const weapon = weaponCatalog[game.weapon];
      const distance = Math.hypot(enemy.x - game.player.x, enemy.y - game.player.y);
      const weaponDamage = weapon?.falloff ? weapon.damage * Math.max(.25, 1 - distance / 550) : weapon?.damage || .12;
      
      // Become aggressive when damaged
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
  const biome = getBiome(x, y);

  if (biome.key === 'sanctuary') return;
  
  // Centralized Void Spawning Logic
  if (biome.key === 'void') {
    if (getBiome(game.player.x, game.player.y).key !== 'void') return;

    // Check current active Void entities to prevent flooding
    const activeWorms = game.enemies.filter(enemy => enemy.voidWorm).length;
    const activeWalkers = game.enemies.filter(enemy => enemy.voidWalker).length;

    // Cap active Void bosses to 1 at a time
    if (activeWorms >= 1 || activeWalkers >= 100) return;

    // 30% chance to spawn when called
    if (Math.random() > 0.3) return;

    const spawnAngle = Math.random() * Math.PI * 2;
    const distance = 350 + Math.random() * 250; // Spawns slightly further away
    const spawnX = game.player.x + Math.cos(spawnAngle) * distance;
    const spawnY = game.player.y + Math.sin(spawnAngle) * distance;

    if (getBiome(spawnX, spawnY).key === 'void') {
      // 20% chance to spawn a Void Walker instead of a Worm
      if (Math.random() < 0.2) {
        game.enemies.push(createVoidWalker(spawnX, spawnY));
      } else {
        game.enemies.push(createVoidWorm(spawnX, spawnY)); 
      }
    }
    return;
  }

  const family = biome.enemyFamily;
  const distance = Math.hypot(x, y);
  const variantIndex = Math.random() < Math.min(.22, distance / 30000 * .22) ? 4 : Math.floor(Math.random() * 4);
  const variant = enemyVariants[variantIndex];
  const baseSpeed = 38 + game.currentSector * 10 + Math.random() * 22;
  const familyIndex = (biome.sector - 1) * 4 + Number(biome.key.split('-')[2]);
  const scaledHp = Math.ceil(variant.hp * (1 + game.currentSector * 0.15));

  const enemy = { 
    x, y, family: family.name, familyIndex, ability: family.ability, effect: family.effect, 
    variant: variant.name, boss: Boolean(variant.boss), color: biome.color, 
    r: (10 + Math.random() * 6) * variant.radius, speed: baseSpeed * variant.speed, 
    hp: scaledHp, maxHp: scaledHp, damage: variant.damage, contactDamage: variant.contactDamage, 
    score: variant.score, drops: variant.drops, abilityTimer: 1 + Math.random() * 2, 
    shieldTimer: 0, hitTimer: 0 
  };

  let health = scaledHp;
  Object.defineProperty(enemy, 'hp', {
    configurable: true,
    get: () => health,
    set: value => {
      const attemptedDamage = health - value;
      const weapon = weaponCatalog[game.weapon];
      const distance = Math.hypot(enemy.x - game.player.x, enemy.y - game.player.y);
      const weaponDamage = weapon?.falloff ? weapon.damage * Math.max(.25, 1 - distance / 550) : weapon?.damage || .12;
      health = attemptedDamage > 0 && attemptedDamage <= .120001 ? Math.max(0, health - weaponDamage) : value;
    }
  });

  game.enemies.push(enemy);
}


function defeatEnemy(enemy, bonus = 0) { if (enemy.hp > 0) return; if (enemy.voidWorm) { if (Math.random() < .33) game.atlasCrystals++; if (enemy.canSplit && Math.random() < .15) { game.enemies.push(createVoidWorm(enemy.x - 26, enemy.y, false)); game.enemies.push(createVoidWorm(enemy.x + 26, enemy.y, false)); } } dropResource(enemy.x, enemy.y, enemy.drops || 1); game.score += (enemy.score || 100) + bonus; if (enemy.boss && Math.random() < .5) game.relics++; if (Math.random() > (enemy.boss ? .35 : .72)) game.gems.push({ x: enemy.x, y: enemy.y, life: 18 }); burst(enemy.x, enemy.y, enemy.boss ? 18 : 8, enemy.boss ? 260 : 170); }
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
function reloadAmmo() { if (!game.reloadPending || game.fireTimer > 0) return; const weapon = weaponCatalog[game.weapon]; if (weapon.kind === 'melee') { game.reloadPending = false; return; } const reserve = game.ammoReserve[weapon.ammo] || 0; if (!reserve) return; const needed = weapon.magazine - game.ammo; if (needed <= 0) { game.reloadPending = false; return; } const loaded = Math.min(needed, weapon.magazine); game.ammo += loaded; game.ammoReserve[weapon.ammo] = Math.max(0, reserve - 1); game.reloadPending = false; }
function updateAmmoUI() { const weapon = weaponCatalog[game.weapon]; ui.ammo.textContent = weapon.kind === 'melee' ? 'MELEE' : game.ammo; ui.ammoStorage.textContent = weapon.kind === 'melee' ? '-' : game.ammoReserve[weapon.ammo] || 0; ui.medkits.textContent = game.stationItems.medkit || 0; ui.weaponName.textContent = weapon.name; ui.ammoType.textContent = weapon.kind === 'melee' ? 'CLOSE RANGE' : ammoCatalog[weapon.ammo].name; }
function updateAtlasCrystalUI() { if (atlasCrystalCounter) atlasCrystalCounter.textContent = String(game.atlasCrystals || 0).padStart(2, '0'); }
const baseUpdateAmmoUI = updateAmmoUI;
updateAmmoUI = function() { baseUpdateAmmoUI(); updateAtlasCrystalUI(); };
function getNearbyStation() { return Object.entries(stationPositions).find(([, position]) => Math.hypot(game.player.x - position.x, game.player.y - position.y) <= stationInteractionRadius)?.[0] || null; }
function toggleStation() { const nearbyStation = getNearbyStation(); if (!nearbyStation) return; game.stationOpen = game.stationOpen === nearbyStation ? null : nearbyStation; updateStationUI(); }
function updateStationUI() { const nearbyStation = getNearbyStation(); if (game.stationOpen && nearbyStation !== game.stationOpen) game.stationOpen = null; ui.stations.hidden = !game.stationOpen; document.querySelectorAll('[data-station]').forEach(card => { card.hidden = card.dataset.station !== game.stationOpen; }); }
function bankInventory() { let deposited = false; resourceTypes.forEach(resource => { const amount = game.inventory[resource.key]; if (!amount) return; game.vault[resource.key] = (game.vault[resource.key] || 0) + amount; game.inventory[resource.key] = 0; deposited = true; }); if (deposited) localStorage.setItem('horde-vault', JSON.stringify(game.vault)); return deposited; }
function getCraftResourceAmount(key) { 
  if (key === 'sidearm') return game.unlockedWeapons.sidearm ? 1 : 0;
  if (key === 'magicGauntlet') return game.weapon === 'magicGauntlet' ? 1 : 0;
  return key === 'relic' ? game.relics : key === 'atlasCrystal' ? game.atlasCrystals : (game.vault[key] || 0); 
}
function spendCraftResource(key, amount) { if (key === 'relic') { game.relics = Math.max(0, game.relics - amount); } else if (key === 'atlasCrystal') { game.atlasCrystals = Math.max(0, game.atlasCrystals - amount); } else { game.vault[key] = Math.max(0, (game.vault[key] || 0) - amount); } }
const stationRecipes = { 
  medkit: { name: 'MEDKIT', 
  time: 4, cost: { fiber: 4, crystal: 2 }, 
  output: { medkit: 1 } }, 
  ammoPack: { name: 'AMMO PACK', time: 5, cost: { steel: 3, fuel: 2 }, 
  output: { ammoStorage: 5 } }, 
  steelPlate: { name: 'STEEL PLATE', time: 7, cost: { steel: 5, stone: 2 }, 
  output: { steelPlate: 1 } }, 
  smeltIron: { name: 'SMELTED IRON', time: 6, cost: { rawIron: 3, fuel: 10 }, 
  output: { iron: 3 } }, 
  makeSteel: { name: 'STEEL', time: 8, cost: { iron: 2, stone: 3, fuel: 10 }, 
  output: { steel: 2 } }, 
  refineFuel: { name: 'REFINED FUEL', time: 5, cost: { wood: 2, fiber: 2, fuel: 3 }, 
  output: { fuel: 12 } }, ...weaponRecipes, ...Object.fromEntries(Object.entries(ammoCatalog).map(([key, ammo]) => [`ammo_${key}`, { name: ammo.name, time: 3, cost: ammo.cost, ammo: key, amount: ammo.amount }])) };
function openCraftDetails(recipeKey) { const recipe = stationRecipes[recipeKey]; if (!recipe) return; const costEntries = Object.entries(recipe.cost || {}); const materialRows = costEntries.map(([key, amount]) => { const resource = resourceTypes.find(item => item.key === key) || { name: key.toUpperCase() }; const owned = getCraftResourceAmount(key); const ready = owned >= amount; return `<li class="${ready ? 'ready' : 'missing'}"><span>${resource.name}</span><strong>${owned} / ${amount}</strong></li>`; }).join(''); const missing = costEntries.find(([key, amount]) => getCraftResourceAmount(key) < amount); const canCraft = !missing; ui.craftDetails.innerHTML = `
    <div class="craft-details-header">
      <strong>${recipe.name}</strong>
      <button type="button" class="detail-close" data-close-details>✕</button>
    </div>
    <div class="craft-details-body">
      <div class="craft-detail-title">REQUIRED MATERIALS</div>
      <ul class="craft-detail-list">${materialRows}</ul>
      <div class="craft-detail-actions">
        <button type="button" data-craft-confirm="${recipeKey}" ${canCraft ? '' : 'disabled'}>${canCraft ? 'CRAFT ITEM' : 'NEED MATERIALS'}</button>
      </div>
    </div>
  `; ui.craftDetails.hidden = false; }
function craftItem(recipeKey) { if (getBiome(game.player.x, game.player.y).key !== 'sanctuary' || game.crafting) return; const recipe = stationRecipes[recipeKey]; const missing = Object.entries(recipe.cost).find(([key, amount]) => getCraftResourceAmount(key) < amount); if (missing) { const shortage = missing[1] - getCraftResourceAmount(missing[0]); ui.stationOutput.textContent = `NEED ${shortage} MORE ${missing[0].toUpperCase()}`; return; } Object.entries(recipe.cost).forEach(([key, amount]) => { spendCraftResource(key, amount); }); game.crafting = { recipeKey, remaining: recipe.time, total: recipe.time }; localStorage.setItem('horde-vault', JSON.stringify(game.vault)); updateInventoryUI(); updateStationButtons(); ui.stationOutput.textContent = `CRAFTING ${recipe.name} // ${recipe.time}s`; ui.craftDetails.hidden = true; ui.craftDetails.innerHTML = ''; }
function updateCrafting(dt) { if (!game.crafting) return; game.crafting.remaining -= dt; const recipe = stationRecipes[game.crafting.recipeKey]; ui.stationOutput.textContent = `CRAFTING ${recipe.name} // ${Math.ceil(game.crafting.remaining)}s`; if (game.crafting.remaining > 0) return; if (recipe.weapon) { game.unlockedWeapons[recipe.weapon] = true; game.weapon = recipe.weapon; game.ammo = 0; game.reloadPending = weaponCatalog[recipe.weapon].kind !== 'melee'; } else if (recipe.ammo) { game.ammoReserve[recipe.ammo] = (game.ammoReserve[recipe.ammo] || 0) + recipe.amount; } else { Object.entries(recipe.output).forEach(([key, amount]) => { if (key === 'ammoStorage') game.ammoStorage = Math.min(maxAmmoStorage, game.ammoStorage + amount); else if (resourceTypes.some(resource => resource.key === key)) game.vault[key] = (game.vault[key] || 0) + amount; else if (key === 'medkit') game.stationItems[key] = Math.min(5, (game.stationItems[key] || 0) + amount); else game.stationItems[key] = (game.stationItems[key] || 0) + amount; }); } localStorage.setItem('horde-vault', JSON.stringify(game.vault)); localStorage.setItem('horde-station-items', JSON.stringify(game.stationItems)); game.crafting = null; updateInventoryUI(); updateStationButtons(); updateAmmoUI(); ui.stationOutput.textContent = `COMPLETE // ${recipe.name}`; }
function updateStationButtons() { document.querySelectorAll('[data-craft]').forEach(button => { button.disabled = Boolean(game.crafting); button.classList.toggle('crafting', Boolean(game.crafting && button.dataset.craft === game.crafting.recipeKey)); }); }
function renderArsenal() 
{ const weapons = Object.entries(weaponRecipes).map(([key, recipe]) => `<button type="button" data-craft="${key}">${recipe.name}<small>CRAFT WEAPON</small></button>`).join(''); const ammo = Object.entries(ammoCatalog).filter(([key]) => key !== 'magicGauntletAmmo' && key !== `cosmosGauntletAmmo`).map(([key, recipe]) => `<button type="button" data-craft="ammo_${key}">${recipe.name}<small>CRAFT AMMO</small></button>`).join(''); ui.arsenal.innerHTML = `<span class="station-title">ARSENAL // WEAPONS</span>${weapons}<span class="station-title">AMMO FABRICATOR</span>${ammo}`; ui.arsenal.addEventListener('click', event => { const button = event.target.closest('[data-craft]'); if (button) openCraftDetails(button.dataset.craft); }); updateStationButtons(); }
renderArsenal();
function drawBiomeHazard(biome, width, height) { if (biome.key === 'sanctuary') return; const hazard = biome.effects.hazard; const time = performance.now() / 1000; const name = hazard.name; ctx.save(); ctx.globalAlpha = .2; if (name.includes('MIST') || name.includes('ASH') || name.includes('SPORES') || name.includes('RAIN')) { ctx.fillStyle = biome.color; for (let i = 0; i < 28; i++) { const x = (i * 97 + time * 18) % width; const y = (i * 53 + time * 11) % height; ctx.beginPath(); ctx.arc(x, y, 3 + (i % 4), 0, Math.PI * 2); ctx.fill(); } } else if (name.includes('HEAT') || name.includes('EMBER') || name.includes('FIRE') || name.includes('BURN')) { ctx.strokeStyle = biome.color; ctx.lineWidth = 2; for (let i = 0; i < 18; i++) { const x = (i * 131 + time * 35) % width; const y = (i * 71 + time * 24) % height; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 12, y + 28); ctx.stroke(); } } else if (name.includes('FREEZE') || name.includes('FROST') || name.includes('COLD')) { ctx.fillStyle = biome.color; for (let i = 0; i < 24; i++) { const x = (i * 83 + time * 12) % width; const y = (i * 61 + time * 30) % height; ctx.fillRect(x, y, 2, 8); } } else if (name.includes('LIGHTNING') || name.includes('THUNDER')) { ctx.strokeStyle = biome.color; ctx.lineWidth = 3; for (let i = 0; i < 3; i++) { const x = (i * 211 + time * 7) % width; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x - 14, height * .25); ctx.lineTo(x + 8, height * .5); ctx.lineTo(x - 12, height * .78); ctx.stroke(); } } else if (name.includes('ROOT') || name.includes('BONE')) { ctx.strokeStyle = biome.color; ctx.lineWidth = 4; for (let i = 0; i < 8; i++) { const x = i * width / 7; ctx.beginPath(); ctx.moveTo(x, height); ctx.quadraticCurveTo(x + 20, height * .7, x - 8, height * .42); ctx.stroke(); } } else if (name.includes('GRAVITY') || name.includes('PRESSURE') || name.includes('HORIZON')) { ctx.strokeStyle = biome.color; ctx.lineWidth = 2; for (let radius = 70; radius < Math.max(width, height); radius += 100) { ctx.beginPath(); ctx.arc(width / 2, height / 2, radius + Math.sin(time * 2 + radius) * 8, 0, Math.PI * 2); ctx.stroke(); } } else { ctx.fillStyle = biome.color; for (let i = 0; i < 18; i++) { const x = (i * 113 + time * 20) % width; const y = (i * 67 + time * 14) % height; ctx.beginPath(); ctx.arc(x, y, 2 + i % 3, 0, Math.PI * 2); ctx.fill(); } } ctx.restore(); }
function generateHazardZones() { const zones = []; const random = seededRandom(game.seed + 71); for (let i = 0; i < 110; i++) { const x = (random() - .5) * mapRadius * 2; const y = (random() - .5) * mapRadius * 1.5; const biome = getBiome(x, y); if (biome.key === 'sanctuary' || biome.key === 'void') continue; zones.push({ x, y, radius: 90 + random() * 150, biomeKey: biome.key, color: biome.color, damagePerSecond: biome.effects.hazard.zoneDamagePerSecond * 1.6, hazard: biome.effects.hazard }); } return zones; }
function drawHazardShape(context, zone) { const visual = zone.hazard.visual; const { x, y, radius } = zone; context.beginPath(); if (visual.includes('pool') || visual.includes('crater') || visual.includes('cloud') || visual.includes('patch') || visual.includes('pile') || visual.includes('core')) context.ellipse(x, y, radius, radius * .72, .15, 0, Math.PI * 2); else if (visual.includes('spikes') || visual.includes('pylon')) { context.moveTo(x, y - radius); for (let i = 0; i < 8; i++) { const angle = -Math.PI / 2 + i * Math.PI / 4; const distance = i % 2 ? radius * .62 : radius; context.lineTo(x + Math.cos(angle) * distance, y + Math.sin(angle) * distance); } context.closePath(); } else { context.arc(x, y, radius, 0, Math.PI * 2); } }
function drawHazardZones() { if (!game.hazardZones.length) return; const biome = getBiome(game.player.x, game.player.y); const camX = game.camera.x - canvas.clientWidth / 2; const camY = game.camera.y - canvas.clientHeight / 2; const time = performance.now() / 1000; ctx.save(); ctx.translate(-camX, -camY); game.hazardZones.forEach(zone => { const radius = zone.radius; ctx.globalAlpha = zone.biomeKey === biome.key ? .34 : .12; ctx.fillStyle = zone.color; ctx.strokeStyle = zone.color; ctx.lineWidth = 3; drawHazardShape(ctx, zone); ctx.fill(); ctx.stroke(); ctx.globalAlpha *= .8; if (zone.hazard.visual.includes('ice') || zone.hazard.visual.includes('spikes')) { for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(zone.x + (i - 2) * radius / 3, zone.y + radius * .45); ctx.lineTo(zone.x + (i - 2) * radius / 4, zone.y - radius * .6); ctx.stroke(); } } else if (zone.hazard.visual.includes('lightning') || zone.hazard.visual.includes('pylon')) { ctx.beginPath(); ctx.moveTo(zone.x, zone.y - zone.radius); ctx.lineTo(zone.x - 10, zone.y - zone.radius * .25); ctx.lineTo(zone.x + 8, zone.y + zone.radius * .05); ctx.lineTo(zone.x - 4, zone.y + zone.radius); ctx.stroke(); } else { ctx.beginPath(); ctx.arc(zone.x, zone.y, radius * (.55 + Math.sin(time * 2 + zone.x) * .08), 0, Math.PI * 2); ctx.stroke(); } }); ctx.restore(); }
function drawVoidMapRegions() { const scale = mapCanvas.width / (mapRadius * 2); mapCtx.save(); mapCtx.translate(mapCanvas.width / 2, mapCanvas.height / 2); mapCtx.scale(scale, scale); mapCtx.fillStyle = '#241d3d'; mapCtx.beginPath(); mapCtx.rect(-mapRadius, -mapRadius, mapRadius * 2, mapRadius * 2); mapCtx.arc(0, 0, mapRadius, 0, Math.PI * 2, true); mapCtx.fill('evenodd'); mapCtx.restore(); }
function drawHazardMap() { drawVoidMapRegions(); if (!game.hazardZones.length) return; const scale = mapCanvas.width / (mapRadius * 2); mapCtx.save(); mapCtx.translate(mapCanvas.width / 2, mapCanvas.height / 2); mapCtx.scale(scale, scale); game.hazardZones.forEach(zone => { mapCtx.globalAlpha = .55; mapCtx.fillStyle = zone.color; mapCtx.strokeStyle = zone.color; drawHazardShape(mapCtx, zone); mapCtx.fill(); mapCtx.stroke(); }); mapCtx.restore(); }
function drawPickups() { const camX = game.camera.x - canvas.clientWidth / 2; const camY = game.camera.y - canvas.clientHeight / 2; ctx.save(); ctx.translate(-camX, -camY); game.nodes.forEach(node => { if (node.taken || node.type !== 'chest') return; ctx.fillStyle = '#d7b07a'; ctx.strokeStyle = '#ffdf91'; ctx.lineWidth = 2; ctx.fillRect(node.x - 12, node.y - 8, 24, 16); ctx.strokeRect(node.x - 12, node.y - 8, 24, 16); ctx.fillStyle = '#ffdf91'; ctx.fillRect(node.x - 2, node.y - 8, 4, 16); }); game.drops.forEach(drop => { const resource = resourceTypes.find(item => item.key === drop.type); ctx.fillStyle = resource.color; ctx.shadowBlur = 12; ctx.shadowColor = resource.color; ctx.beginPath(); ctx.moveTo(drop.x, drop.y - 8); ctx.lineTo(drop.x + 8, drop.y); ctx.lineTo(drop.x, drop.y + 8); ctx.lineTo(drop.x - 8, drop.y); ctx.fill(); ctx.shadowBlur = 0; }); ctx.restore(); }
function drawSanctuaryStations() { if (getBiome(game.player.x, game.player.y).key !== 'sanctuary') return; const camX = game.camera.x - canvas.clientWidth / 2; const camY = game.camera.y - canvas.clientHeight / 2; ctx.save(); ctx.translate(-camX, -camY); ctx.textAlign = 'center'; ctx.font = 'bold 9px Space Mono'; ctx.fillStyle = '#f9c779'; ctx.fillText('CRAFTING TABLE', -300, -82); ctx.fillText('FURNACE', 285, -82); ctx.fillStyle = '#8b5a3c'; ctx.strokeStyle = '#f9c779'; ctx.lineWidth = 3; ctx.fillRect(-360, -55, 120, 70); ctx.strokeRect(-360, -55, 120, 70); ctx.fillStyle = '#c88968'; ctx.fillRect(-350, -68, 100, 16); ctx.fillStyle = '#17131a'; ctx.fillRect(-320, -42, 40, 20); ctx.fillStyle = '#493a36'; ctx.fillRect(230, -55, 110, 70); ctx.strokeStyle = '#ff865c'; ctx.strokeRect(230, -55, 110, 70); ctx.fillStyle = '#ff865c'; ctx.beginPath(); ctx.arc(285, -20, 28, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ffd08a'; ctx.beginPath(); ctx.arc(285, -20, 16, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#b9b0a8'; ctx.fillRect(245, -70, 80, 15); ctx.restore(); }
function loop(now) { const dt = Math.min((now - lastTime) / 1000, .04); lastTime = now; updateCrafting(dt); update(dt); reloadAmmo(); updateAmmoUI(); updateBiomeAnnouncement(dt); draw(); drawHazardZones(); drawPickups(); drawSanctuaryStations(); drawMap(); drawHazardMap(); if (game.active) animation = requestAnimationFrame(loop); }
 function updateBiomeAnnouncement(dt) { const biome = getBiome(game.player.x, game.player.y); game.discovered.add(biome.key === 'sanctuary' ? 'sanctuary' : getSectorKey(Math.min(sectorRegions.length - 1, Math.floor(Math.hypot(game.player.x, game.player.y) / 3000)))); if (biome.key !== game.biomeKey) { game.biomeKey = biome.key; game.announcementTimer = 3; announceBiome(biome); updateBiomeEffects(biome); updateBiomeHazard(biome); } game.announcementTimer = Math.max(0, game.announcementTimer - dt); if (game.announcementTimer === 0) ui.announcement.classList.remove('show'); }
function updateBiomeHazard(biome) { const hazard = biome.effects.hazard; ui.effects.insertAdjacentHTML('beforeend', `<span class="biome-effect negative" title="${hazard.description}"><b>!</b>${hazard.name}</span>`); }
function updateBiomeEffects(biome) { const effects = biome.effects; const conditions = []; if (effects.healthRegen) conditions.push({ positive: true, text: `REGEN +${effects.healthRegen}/SEC`, detail: `Restores ${effects.healthRegen} health per second while outside the beacon.` }); if (effects.moveMultiplier !== 1) conditions.push({ positive: effects.moveMultiplier > 1, text: `MOVE ${effects.moveMultiplier > 1 ? '+' : ''}${Math.round((effects.moveMultiplier - 1) * 100)}%`, detail: `${effects.moveMultiplier > 1 ? 'Increases' : 'Reduces'} player movement speed by ${Math.abs(Math.round((effects.moveMultiplier - 1) * 100))}%.` }); if (effects.fireCooldownMultiplier !== 1) conditions.push({ positive: effects.fireCooldownMultiplier < 1, text: `FIRE ${effects.fireCooldownMultiplier < 1 ? '+' : '-'}${Math.round(Math.abs(1 - effects.fireCooldownMultiplier) * 100)}%`, detail: `${effects.fireCooldownMultiplier < 1 ? 'Reduces' : 'Increases'} the delay between shots by ${Math.round(Math.abs(1 - effects.fireCooldownMultiplier) * 100)}%.` }); if (effects.pulseCooldownMultiplier !== 1) conditions.push({ positive: effects.pulseCooldownMultiplier < 1, text: `PULSE ${effects.pulseCooldownMultiplier < 1 ? '+' : '-'}${Math.round(Math.abs(1 - effects.pulseCooldownMultiplier) * 100)}%`, detail: `${effects.pulseCooldownMultiplier < 1 ? 'Reduces' : 'Increases'} the pulse cooldown by ${Math.round(Math.abs(1 - effects.pulseCooldownMultiplier) * 100)}%.` }); if (effects.salvageMultiplier !== 1) conditions.push({ positive: effects.salvageMultiplier > 1, text: `SALVAGE +${Math.round((effects.salvageMultiplier - 1) * 100)}%`, detail: `Collected salvage is multiplied by ${effects.salvageMultiplier}x.` }); if (effects.enemySpeedMultiplier !== 1) conditions.push({ positive: effects.enemySpeedMultiplier < 1, text: `HORDE ${effects.enemySpeedMultiplier < 1 ? '-' : '+'}${Math.round(Math.abs(1 - effects.enemySpeedMultiplier) * 100)}% SPEED`, detail: `Enemies move ${effects.enemySpeedMultiplier < 1 ? 'slower' : 'faster'} by ${Math.round(Math.abs(1 - effects.enemySpeedMultiplier) * 100)}%.` }); if (effects.damageMultiplier !== 1) conditions.push({ positive: false, text: `DAMAGE +${Math.round((effects.damageMultiplier - 1) * 100)}%`, detail: `Enemy contact damage is increased by ${Math.round((effects.damageMultiplier - 1) * 100)}%.` }); ui.effects.innerHTML = `<span class="biome-effects-title">${biome.name} // CONDITIONS</span>${conditions.map(condition => `<span class="biome-effect ${condition.positive ? 'positive' : 'negative'}" title="${condition.detail}"><b>${condition.positive ? '+' : '-'}</b>${condition.text}</span>`).join('')}`; }
function update(dt) {
  const p = game.player;
  const dx = (keys.d ? 1 : 0) - (keys.a ? 1 : 0);
  const dy = (keys.s ? 1 : 0) - (keys.w ? 1 : 0);
  const length = Math.hypot(dx, dy) || 1;
  const movementEffects = getBiome(p.x, p.y).effects;

  p.x += dx / length * (keys.shift ? 390 : 220) * movementEffects.moveMultiplier * dt;
  p.y += dy / length * (keys.shift ? 390 : 220) * movementEffects.moveMultiplier * dt;
  p.angle = Math.atan2(pointer.y - canvas.clientHeight / 2, pointer.x - canvas.clientWidth / 2);

  game.camera.x += (p.x - game.camera.x) * Math.min(1, dt * 7);
  game.camera.y += (p.y - game.camera.y) * Math.min(1, dt * 7);

  const distance = Math.hypot(p.x, p.y);
  const safe = distance < beaconRegionRadius;
  game.currentSector = safe ? 0 : Math.min(sectorRegions.length, Math.floor(distance / 3000) + 1);

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

  if (pointer.down) shoot();

  if (safe) {
    game.health = Math.min(100, game.health + 15 * dt);
    if (game.salvage) {
      game.banked += game.salvage;
      game.salvage = 0;
      localStorage.setItem('horde-salvage', game.banked);
    }
  } else {
    if (effects.healthRegen) game.health = Math.min(100, game.health + effects.healthRegen * dt);
    if (effects.hazard) game.health -= effects.hazard.damagePerSecond * dt;
  }

  game.hazardZones.forEach(zone => {
    if (Math.hypot(p.x - zone.x, p.y - zone.y) < zone.radius) game.health -= zone.damagePerSecond * dt;
  });

  const inVoid = biome.key === 'void';
  if (inVoid) {
    game.voidSpawnTimer -= dt;
    const activeWorms = game.enemies.filter(enemy => enemy.voidWorm).length;
    
    if (game.voidSpawnTimer <= 0 && activeWorms < 1) {
      spawn();
      // Increase timer to 45–90 seconds between spawn checks
      game.voidSpawnTimer = 45 + Math.random() * 45;
    }
  } else {
    game.voidSpawnTimer = 0;
    game.spawnTimer -= dt;
    const target = safe ? 0 : 5 + game.currentSector * 3 + Math.floor(distance / 260);
    if (game.spawnTimer <= 0 && game.enemies.length < Math.min(100, target)) {
      spawn();
      game.spawnTimer = Math.max(.12, .8 - game.currentSector * .025 - distance / 4000);
    }
  }

  game.bullets.forEach(b => {
    if (b.oscillating) {
      const speed = Math.hypot(b.vx, b.vy) || 1;
      b.swayPhase = (b.swayPhase || 0) + dt * 14;
      const swayOffset = Math.sin(b.swayPhase) * (b.swayAmplitude || 0);
      const angle = b.baseAngle + swayOffset;
      b.vx = Math.cos(angle) * speed;
      b.vy = Math.sin(angle) * speed;
    }
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
  });
  game.bullets = game.bullets.filter(b => b.life > 0);

  // Consolidated Enemy Update Loop (Movement, Boundary Checks, Attacks, and Player Damage)
  // Consolidated Enemy Update Loop (Movement, Boundary Checks, Attacks, and Player Damage)
  game.enemies.forEach(e => {
    e.previousX = e.x;
    e.previousY = e.y;

    // Movement calculation
    if (e.voidWalker && !e.isAggroed) {
      // Wander in random directions without tracking the player
      e.wanderTimer = (e.wanderTimer || 0) - dt;
      if (e.wanderTimer <= 0) {
        e.wanderAngle = Math.random() * Math.PI * 2;
        e.wanderTimer = 2 + Math.random() * 3;
      }
      e.x += Math.cos(e.wanderAngle) * (e.speed * 0.6) * effects.enemySpeedMultiplier * dt;
      e.y += Math.sin(e.wanderAngle) * (e.speed * 0.6) * effects.enemySpeedMultiplier * dt;
    } else {
      // Standard aggressive tracking
      const angle = Math.atan2(p.y - e.y, p.x - e.x);
      e.x += Math.cos(angle) * e.speed * effects.enemySpeedMultiplier * dt;
      e.y += Math.sin(angle) * e.speed * effects.enemySpeedMultiplier * dt;
    }

    // Boundary constraint check (Exempt Void Walker so it can walk anywhere)
    if (!e.voidWalker) {
      const homeBiome = e.voidWorm ? 'void' : `sector-${Math.floor(e.familyIndex / 4)}-${e.familyIndex % 4}`;
      if (getBiome(e.x, e.y).key !== homeBiome) {
        e.x = e.previousX;
        e.y = e.previousY;
      }
    }

    // Void Walker attack logic
    if (e.voidWalker && e.isAggroed) {
      e.attackTimer -= dt;
      if (e.attackTimer <= 0) {
        triggerVoidShockwave(e);
        e.attackTimer = 3;
      }
    }

    // Contact damage to player
    if (Math.hypot(p.x - e.x, p.y - e.y) < e.r + 12) {
      game.health -= (e.contactDamage || 0) * effects.damageMultiplier * dt;
    }
  });
  // Bullet Collision & Explosive (AOE) Damage Loop
  game.bullets.forEach(b => game.enemies.forEach(e => {
    if (e.hp && Math.hypot(b.x - e.x, b.y - e.y) < e.r + 5) {
      if (b.blast) {
        game.enemies.forEach(target => {
          if (Math.hypot(b.x - target.x, b.y - target.y) <= b.blast) {
            target.hp = Math.max(0, target.hp - .12);
            if (target.hp <= 0) defeatEnemy(target);
          }
        });
        burst(b.x, b.y, 22, 220);
      } else {
        e.hp = Math.max(0, e.hp - .12);
        if (e.hp <= 0) defeatEnemy(e);
      }
      b.life = 0;
    }
  }));

  // Handle Enemy Projectiles
  game.projectiles.forEach(proj => {
    proj.x += proj.vx * dt;
    proj.y += proj.vy * dt;
    proj.life -= dt;
    
    // Player collision
    if (Math.hypot(game.player.x - proj.x, game.player.y - proj.y) < proj.radius + 13) {
      game.health -= proj.damage;
      proj.life = 0; // Destroy on impact
    }
  });
  game.projectiles = game.projectiles.filter(p => p.life > 0);

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
function applyEnemyAbilities(dt) { const status = game.enemyStatus || (game.enemyStatus = { burn: 0, acid: 0, bleed: 0, freeze: 0, root: 0 }); game.enemies.forEach(enemy => { const distance = Math.hypot(game.player.x - enemy.x, game.player.y - enemy.y); const contact = distance < enemy.r + 18; enemy.abilityTimer -= dt; if (contact) { if (enemy.effect === 'burn') status.burn = Math.max(status.burn, enemy.boss ? 5 : 3); if (enemy.effect === 'acid') status.acid = Math.max(status.acid, 4); if (enemy.effect === 'bleed') status.bleed = Math.max(status.bleed, 4); if (enemy.effect === 'slow') status.freeze = Math.max(status.freeze, 2.5); if (enemy.effect === 'root') status.root = Math.max(status.root, 2); } if (enemy.abilityTimer <= 0) { if (distance < 260 && enemy.effect === 'shock') { game.health -= enemy.boss ? 8 : 5; burst(enemy.x, enemy.y, 5, 90); } if (distance < 260 && enemy.effect === 'drain') { game.health -= 3; enemy.hp = Math.min(enemy.maxHp, enemy.hp + 1); } if (distance < 260 && enemy.effect === 'pull') { const angle = Math.atan2(enemy.y - game.player.y, enemy.x - game.player.x); game.player.x += Math.cos(angle) * 35; game.player.y += Math.sin(angle) * 35; } if (distance < 260 && enemy.effect === 'armor') enemy.shieldTimer = 2; if (distance < 260 && enemy.effect === 'evasion') { const angle = Math.atan2(game.player.y - enemy.y, game.player.x - enemy.x) + Math.PI / 2; enemy.x += Math.cos(angle) * 28; enemy.y += Math.sin(angle) * 28; } enemy.abilityTimer = enemy.boss ? 1.4 : 2.8; } status.burn = Math.max(0, status.burn - dt); status.acid = Math.max(0, status.acid - dt); status.bleed = Math.max(0, status.bleed - dt); status.freeze = Math.max(0, status.freeze - dt); status.root = Math.max(0, status.root - dt); if (status.burn) game.health -= 6 * dt; if (status.acid) game.health -= 4 * dt; if (status.bleed) game.health -= 3 * dt; if (status.freeze || status.root) game.health -= 1 * dt; }); }
function triggerVoidShockwave(enemy) {
    if (!enemy) return;
    const projectileCount = 12;
    const speed = 200;

    for (let i = 0; i < projectileCount; i++) {
        const angle = (Math.PI * 2 / projectileCount) * i;
        game.projectiles.push({
            x: enemy.x,
            y: enemy.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 2.5,
            radius: 6,
            damage: 8,
            color: '#9370DB'
        });
    }
}

const baseUpdate = update;
update = function(dt) { const wasEmpty = game.ammo === 0 && weaponCatalog[game.weapon].kind !== 'melee'; baseUpdate(dt); if (wasEmpty) { game.ammo = 0; game.reloadPending = true; } if (game.active) applyEnemyAbilities(dt); };
function renderEnemySystem() {
  const camX = game.camera.x - canvas.clientWidth / 2;
  const camY = game.camera.y - canvas.clientHeight / 2;

  ctx.save();
  ctx.translate(-camX, -camY);
  ctx.textAlign = 'center';

  // 1. Standard Enemies
  game.enemies.filter(enemy => !enemy.voidWorm && !enemy.voidWalker).forEach(enemy => {
    const shape = (enemy.familyIndex + enemy.variant.length) % 6;
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
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

  // 3. Void Walkers & Labels
  // 3. Void Walkers & Labels
  // 3. Void Walkers & Labels
  game.enemies.filter(enemy => enemy.voidWalker).forEach(enemy => {
    // Body & Visuals
    ctx.save();
    ctx.translate(enemy.x, enemy.y);

    const baseColor = '#9d4edd';
    const glowColor = 'rgba(157, 78, 221, 0.25)';

    const pulse = Math.sin(Date.now() * 0.006) * 3;
    ctx.beginPath();
    ctx.arc(0, 0, enemy.r + 6 + pulse, 0, Math.PI * 2);
    ctx.fillStyle = glowColor;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, 0, enemy.r, 0, Math.PI * 2);
    ctx.fillStyle = baseColor;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#e0aaff';
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

  // 4. Small Enemy Health Bars
  game.enemies.forEach(enemy => {
    if (enemy.maxHp > 1) return;
    ctx.fillStyle = '#17131a';
    ctx.fillRect(enemy.x - enemy.r, enemy.y - enemy.r - 9, enemy.r * 2, 3);
    ctx.fillStyle = enemy.color;
    ctx.fillRect(enemy.x - enemy.r, enemy.y - enemy.r - 9, enemy.r * 2 * Math.max(0, enemy.hp / Math.max(enemy.maxHp, 1)), 3);
  });

  ctx.restore();
}
const baseDraw = draw;
draw = function() { const radii = game.enemies.map(enemy => enemy.r); game.enemies.forEach(enemy => enemy.r = 0); baseDraw(); game.enemies.forEach((enemy, index) => enemy.r = radii[index]); renderEnemySystem();};
function getSectorKey(sector) { return `sector-${sector}`; }
function getVoidBiome() { return { name: 'THE VOID', color: '#0a4f44', dark: '#03040e', key: 'void', sector: sectorRegions.length + 1, animationKey: 'void', effects: { moveMultiplier: .82, damageMultiplier: 1, enemySpeedMultiplier: 1, fireCooldownMultiplier: 1, pulseCooldownMultiplier: 1, healthRegen: 0, salvageMultiplier: 1, hazard: { name: 'NO HAZARD', description: 'The Void is silent and empty.', damagePerSecond: 0, visual: null, zoneDamagePerSecond: 0 } } }; }
function getBiome(x, y) { if (Math.hypot(x, y) < beaconRegionRadius) return { name: 'BEACON SANCTUARY', color: '#f9c779', dark: '#172d2d', key: 'sanctuary', sector: 0, animationKey: 'sanctuary', effects: { moveMultiplier: 1, damageMultiplier: 1, enemySpeedMultiplier: 1, fireCooldownMultiplier: 1, pulseCooldownMultiplier: 1, healthRegen: 0, salvageMultiplier: 1, hazard: { name: 'NO HAZARD', description: 'The beacon protects you from environmental hazards.', damagePerSecond: 0 } } }; if (Math.hypot(x, y) > mapRadius) return getVoidBiome(); const angle = (Math.atan2(y, x) + Math.PI * 2) % (Math.PI * 2); const index = Math.floor(angle / (Math.PI / 2)); const sector = Math.min(sectorRegions.length - 1, Math.floor(Math.hypot(x, y) / 3000)); const biome = sectorRegions[sector][index]; return { ...biome, key: `sector-${sector}-${index}`, sectorKey: getSectorKey(sector), sector: sector + 1, animationKey: `biome-${index}` }; }
function getDiscoveryKey(x, y) { const biome = getBiome(x, y); return biome.key === 'sanctuary' ? 'sanctuary' : biome.sectorKey; }
function announceBiome(biome) { ui.announcement.textContent = biome.name; ui.announcement.style.color = biome.color; ui.announcement.className = `biome-announcement show ${biome.animationKey}`; }
function burst(x, y, amount, force) { for (let i = 0; i < amount; i++) game.sparks.push({ x, y, life: .45, vx: (Math.random() - .5) * force, vy: (Math.random() - .5) * force }); }
function updateUI(distance, safe, biome) { const sector = safe ? 0 : Math.floor(distance / 3000) + 1; const health = Math.max(0, Math.round(game.health)); if (safe && bankInventory()) updateInventoryUI(); updateStationUI(); ui.wave.textContent = String(sector).padStart(2, '0'); ui.score.textContent = String(game.score).padStart(6, '0'); ui.ammo.textContent = game.ammo; ui.health.style.width = `${health}%`; ui.healthValue.textContent = `${health}%`; ui.threats.textContent = String(game.enemies.length).padStart(2, '0'); ui.distance.textContent = `${String(Math.floor(distance / 10)).padStart(3, '0')}m`; ui.salvage.textContent = String(game.salvage).padStart(2, '0'); ui.relics.textContent = String(game.relics).padStart(2, '0'); ui.objective.textContent = safe ? 'SANCTUARY // SALVAGE BANKED' : 'RETURN TO BEACON // SALVAGE'; }
function updateInventoryUI() { ui.inventory.innerHTML = `<span class="inventory-title">CARRIED // VAULT</span>${resourceTypes.map(resource => `<span class="inventory-item" title="${resource.name}: carried / stored in sanctuary vault"><span>${resource.name}</span><strong>${game.inventory[resource.key]} / ${game.vault[resource.key] || 0}</strong></span>`).join('')}`; }
function end() { game.active = false; game.high = Math.max(game.high, game.score); localStorage.setItem('horde-high', game.high); ui.final.textContent = String(game.score).padStart(6, '0'); ui.high.textContent = String(game.high).padStart(6, '0'); ui.over.classList.remove('hidden'); }
function drawMap() { const w = mapCanvas.width, h = mapCanvas.height, scale = w / (mapRadius * 2); mapCtx.clearRect(0, 0, w, h); mapCtx.fillStyle = "#100d13"; mapCtx.fillRect(0, 0, w, h); mapCtx.save(); mapCtx.translate(w / 2, h / 2); mapCtx.scale(scale, scale); sectorRegions.forEach((regions, sector) => { const radius = (sector + 1) * 3000; mapCtx.strokeStyle = `${regions[0].color}99`; mapCtx.lineWidth = 3 / scale; mapCtx.beginPath(); mapCtx.arc(0, 0, radius, 0, Math.PI * 2); mapCtx.stroke(); }); mapCtx.strokeStyle = "#f9c779"; mapCtx.lineWidth = 7 / scale; mapCtx.beginPath(); mapCtx.arc(0, 0, beaconRegionRadius, 0, Math.PI * 2); mapCtx.stroke(); game.nodes.forEach(node => { if (!node.taken) { mapCtx.fillStyle = node.type === "relic" ? "#b9f4ff" : "#ffbe68"; mapCtx.fillRect(node.x - 30, node.y - 30, 60, 60); } }); game.enemies.forEach(enemy => { mapCtx.fillStyle = "#ff4d42"; mapCtx.fillRect(enemy.x - 35, enemy.y - 35, 70, 70); }); mapCtx.fillStyle = "#100d13ee"; mapCtx.fillRect(-mapRadius, -mapRadius, mapRadius * 2, mapRadius * 2); game.discovered.forEach(key => { if (key === "sanctuary") { mapCtx.fillStyle = "#f9c77933"; mapCtx.beginPath(); mapCtx.arc(0, 0, beaconRegionRadius, 0, Math.PI * 2); mapCtx.fill(); } else { const sector = Number(key.split("-")[1]); const inner = sector * 3000; const outer = (sector + 1) * 3000; mapCtx.fillStyle = `${sectorRegions[sector][0].color}28`; mapCtx.beginPath(); mapCtx.arc(0, 0, outer, 0, Math.PI * 2); mapCtx.arc(0, 0, inner, 0, Math.PI * 2, true); mapCtx.fill(); } }); game.nodes.forEach(node => { if (!node.taken && game.discovered.has(getDiscoveryKey(node.x, node.y))) { mapCtx.fillStyle = node.type === "relic" ? "#b9f4ff" : "#ffbe68"; mapCtx.fillRect(node.x - 30, node.y - 30, 60, 60); } }); game.enemies.forEach(enemy => { if (game.discovered.has(getDiscoveryKey(enemy.x, enemy.y))) { mapCtx.fillStyle = "#ff4d42"; mapCtx.fillRect(enemy.x - 35, enemy.y - 35, 70, 70); } }); mapCtx.fillStyle = "#f9c779"; mapCtx.beginPath(); mapCtx.arc(0, 0, 70, 0, Math.PI * 2); mapCtx.fill(); mapCtx.fillStyle = "#ffffff"; mapCtx.beginPath(); mapCtx.arc(game.player.x, game.player.y, 90, 0, Math.PI * 2); mapCtx.fill(); mapCtx.restore(); }
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
  [beaconRegionRadius, 3000, 6000, 9500, 13000].forEach((radius, i) => {
    ctx.strokeStyle = i === 0 ? '#f9c77999' : `${biome.color}28`;
    ctx.setLineDash(i ? [12, 20] : []);
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

  // Player Bullets
  game.bullets.forEach(b => {
    ctx.fillStyle = '#ffd08a';
    ctx.beginPath();
    ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
    ctx.fill();
  });

  // NEW: Enemy Projectiles (Void Walker Shockwaves)
  if (game.projectiles) {
    game.projectiles.forEach(p => {
      ctx.fillStyle = p.color || '#9d4edd';
      ctx.beginPath();
      // Supports both .radius and .r just in case
      ctx.arc(p.x, p.y, p.radius || p.r || 5, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // Enemies
  game.enemies.forEach(e => {
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(Math.atan2(game.player.y - e.y, game.player.x - e.x));
    
    // UPDATED: Use e.color if available (for the Void Walker), otherwise fallback to biome color
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
  
  ctx.fillStyle = '#ffb35c';
  ctx.fillRect(5, -3, 22, 6);
  
  ctx.fillStyle = '#3f2630';
  ctx.beginPath();
  ctx.arc(0, 0, 7, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.restore();
  ctx.restore();
}