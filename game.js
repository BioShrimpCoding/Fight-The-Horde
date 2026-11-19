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
const adminOpenButton = document.querySelector('#open-admin');
const adminStatus = document.querySelector('#admin-status');
const adminBadge = document.querySelector('#admin-test-badge');
const adminReport = document.querySelector('#admin-report');
const exportRunButton = document.querySelector('#export-live-save');
const adminTestRuns = new WeakSet();
const adminInfiniteAmmoRuns = new WeakSet();
let suspendedRun = null;
let adminScenario = null;
let adminPanelOpen = false;
const ui = { wave: document.querySelector('#wave'), score: document.querySelector('#score'), high: document.querySelector('#high-score'), ammo: document.querySelector('#ammo'), ammoStorage: document.querySelector('#ammo-storage'), medkits: document.querySelector('#medkits'), weaponName: document.querySelector('#weapon-name'), ammoType: document.querySelector('#ammo-type'), weaponBar: document.querySelector('#weapon-bar'), health: document.querySelector('#health-bar'), healthValue: document.querySelector('#health-value'), threats: document.querySelector('#threat-count'), distance: document.querySelector('#distance'), salvage: document.querySelector('#salvage'), relics: document.querySelector('#relics'), objective: document.querySelector('#objective-text'), start: document.querySelector('#start-screen'), over: document.querySelector('#game-over'), pause: document.querySelector('#pause-screen'), final: document.querySelector('#final-score'), announcement: document.querySelector('#biome-announcement'), effects: document.querySelector('#biome-effects'), inventory: document.querySelector('#inventory-hud'), stations: document.querySelector('#sanctuary-stations'), stationOutput: document.querySelector('#station-output'), arsenal: document.querySelector('#arsenal-list'), craftDetails: document.querySelector('#craft-details'), manager: document.querySelector('#manager-mode'), managerInventory: document.querySelector('#manager-inventory') };
const debugConsoleOutput = document.querySelector('#debug-console-output');
const clearConsoleButton = document.querySelector('#clear-console');
const atlasCrystalCounter = document.querySelector('#atlas-crystals');
function gameLog(level, message, detail = '') { if (!debugConsoleOutput) return; const entry = document.createElement('div'); entry.className = 'debug-console-entry'; const now = new Date(); const time = now.toLocaleTimeString([], { hour12: false }); entry.innerHTML = `<span class="debug-console-time">${time}</span><span class="debug-console-level ${level.toLowerCase()}">${level}</span><span class="debug-console-message"></span>${detail ? '<span class="debug-console-detail"></span>' : ''}`; entry.querySelector('.debug-console-message').textContent = String(message); if (detail) entry.querySelector('.debug-console-detail').textContent = String(detail); debugConsoleOutput.append(entry); while (debugConsoleOutput.children.length > 200) debugConsoleOutput.firstElementChild.remove(); debugConsoleOutput.scrollTop = debugConsoleOutput.scrollHeight; }
window.addEventListener('error', event => gameLog('ERROR', event.message || 'Uncaught error', `${event.filename || 'unknown source'}:${event.lineno || 0}:${event.colno || 0}`));
window.addEventListener('unhandledrejection', event => { const reason = event.reason; gameLog('ERROR', reason?.message || String(reason || 'Unhandled promise rejection'), reason?.stack || 'Unhandled promise rejection'); });
clearConsoleButton?.addEventListener('click', () => { debugConsoleOutput.innerHTML = ''; gameLog('INFO', 'Diagnostic console cleared'); });
gameLog('INFO', 'Diagnostic console online');
const keys = {}; const pointer = { x: 0, y: 0, down: false }; let animation; let lastTime = 0; let adminMode = false; let adminInvincible = false;
let managerDrag = null;
let mapOpen = false;
const saveSlotCount = 5;
const saveSlotsKey = 'horde-save-slots';
const lastSaveSlotKey = 'horde-last-save-slot';
let currentSaveSlot = null;
const saveSlotsPanel = document.querySelector('#save-slots');
const saveSlotsTitle = document.querySelector('#save-slots-title');
const saveSlotList = document.querySelector('#save-slot-list');
const saveFileActions = document.querySelector('#save-file-actions');
const saveFileInput = document.querySelector('#save-file-input');
const saveFileStatus = document.querySelector('#save-file-status');
const saveImportPreview = document.querySelector('#save-import-preview');
const liveSaveStatus = document.querySelector('#live-save-status');
const mainMenu = document.querySelector('#main-menu');
const howToPlay = document.querySelector('#how-to-play');
const changeLog = document.querySelector('#change-log');
const questHud = document.querySelector('#quest-hud');
const questPanel = document.querySelector('#quest-panel');
const questDialog = document.querySelector('#quest-dialog');
const journalPanel = document.querySelector('#journal-panel');
const journalContent = document.querySelector('#journal-content');
const journalButton = document.querySelector('#journal-button');
const worldEventHud = document.querySelector('#world-event-hud');
const worldEventStatus = document.querySelector('#world-event-status');
const abandonEventButton = document.querySelector('#abandon-world-event');
const pauseJournalButton = document.querySelector('#pause-journal-button');
let journalView = 'enemies';
let journalOpener = null;
let journalWasPaused = false;
const continueButton = document.querySelector('[data-menu-action="continue"]');
const saveButton = document.querySelector('#save-button');
const resumeButton = document.querySelector('#resume-button');
const settingsPanel = document.querySelector('#settings-screen');
const settingsBindings = document.querySelector('#settings-bindings');
const settingsStatus = document.querySelector('#settings-status');
const settingsSwap = document.querySelector('#settings-swap');
const effectsInput = document.querySelector('#reduced-effects');
const colorInput = document.querySelector('#crosshair-color');
const sizeInput = document.querySelector('#crosshair-size');
const controlDefaults = {
  w: ['Move up', 'w'], s: ['Move down', 's'], a: ['Move left', 'a'], d: ['Move right', 'd'],
  shift: ['Sprint', 'shift'], fire: ['Fire', ' '], fireAlt: ['Alternate fire', 'mouse0'],
  pulse: ['Pulse', 'q'], interact: ['Interact', 'e'], medkit: ['Medkit', 'h'],
  map: ['Tactical map', 'm'], zoom: ['Mini-map zoom', 'j'], quests: ['Quest log', 'l'], journal: ['Discovery journal', 'b'],
  slot1: ['Weapon slot 1', '1'], slot2: ['Weapon slot 2', '2'],
  slot3: ['Weapon slot 3', '3'], slot4: ['Weapon slot 4', '4']
};
const settingsKey = 'horde-settings';
const defaultSettings = () => ({
  bindings: Object.fromEntries(Object.entries(controlDefaults).map(([action, [, key]]) => [action, key])),
  reducedEffects: false, crosshairColor: '#ffb35c', crosshairSize: 22
});
let settingsLoadError = false;
let settings = loadSettings();
let settingsOpener = null;
let bindingCapture = null;
let bindingConflict = null;
let suppressSettingsClick = false;
const heldKeyboardActions = new Map();
const mainMenuButton = document.querySelector('#main-menu-button');
const adminUnlockSequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'Enter'];
let adminUnlockIndex = 0;
const clipSize = 12;
const startingAmmoReserve = 15;
const stationInteractionRadius = 95;
const frostfallAuraRadius = 80;
const radioactiveAuraRadius = 150;
const radioactiveAuraDamagePerSecond = 18;
const radioactiveBombRadius = 240;
const sanctuaryBuildStations = {
  designer: { x: -70, y: -1000 },
  manager: { x: 70, y: -1000 }
};
const placedStationRadius = 24;
const managerInventoryWidth = 280;
const sanctuaryNpcDefinitions = [
  { id: 'quartermaster', name: 'QUARTERMASTER', role: 'SUPPLIES', color: '#ffb35c', x: -520, y: -320, lines: ['The vault is hungry. Bring back materials before the Horde strips the frontier.', 'Every expedition should pay for the next one.'] },
  { id: 'weaponsmith', name: 'WEAPONSMITH', role: 'ARSENAL', color: '#ff865c', x: -260, y: -520, lines: ['A weapon is only as good as the hands that keep it fed.', 'Bring me proof that your new hardware works.'] },
  { id: 'armorer', name: 'ARMORER', role: 'DEFENSE', color: '#9fd8e3', x: 120, y: -540, lines: ['The frontier hits harder every sector. Steel is cheaper than a funeral.', 'Come back breathing and I can make the next run safer.'] },
  { id: 'scout', name: 'SCOUT', role: 'EXPLORATION', color: '#8fc47e', x: 470, y: -330, lines: ['The map ends where your courage does.', 'Mark the safe paths before the fog takes them.'] },
  { id: 'mechanic', name: 'MECHANIC', role: 'INFRASTRUCTURE', color: '#c88968', x: 520, y: 80, lines: ['A dead beacon is just a very expensive landmark.', 'Keep the stations alive and the sanctuary can reach farther.'] },
  { id: 'medic', name: 'MEDIC', role: 'VITALS', color: '#ff8d7f', x: 270, y: 430, lines: ['No glory is worth bleeding out alone.', 'Bring me survivors, not stories about how close you came.'] },
  { id: 'archivist', name: 'ARCHIVIST', role: 'KNOWLEDGE', color: '#d58ee0', x: -180, y: 470, lines: ['Every relic is a sentence from the world before.', 'The Horde changes. We must record how.'] },
  { id: 'beaconEngineer', name: 'BEACON ENGINEER', role: 'BEACONS', color: '#8fe0ad', x: -500, y: 120, lines: ['The beacons are our lifeline beyond the sanctuary.', 'Repair one and the frontier becomes a little less final.'] }
];
const questTemplates = [
  { id: 'supply-run', npcId: 'quartermaster', title: 'SUPPLY RUN', description: 'Collect frontier materials for the sanctuary vault.', type: 'collect', target: 'any', amount: 12, reward: { salvage: 18, resources: { fuel: 4 } } },
  { id: 'tested-steel', npcId: 'weaponsmith', title: 'TESTED STEEL', description: 'Defeat enemies to test the latest arsenal.', type: 'kill', target: 'any', amount: 12, reward: { salvage: 30, ammo: { pistolAmmo: 12 } } },
  { id: 'hold-the-line', npcId: 'armorer', title: 'HOLD THE LINE', description: 'Survive outside the sanctuary long enough to validate new armor.', type: 'survive', target: 'seconds', amount: 90, armorerRepReward: 25, reward: { salvage: 35, resources: { steel: 4 } } },
  { id: 'unknown-country', npcId: 'scout', title: 'UNKNOWN COUNTRY', description: 'Discover three new biome sectors.', type: 'explore', target: 'sectors', amount: 3, reward: { salvage: 25, relics: 1 } },
  { id: 'working-order', npcId: 'mechanic', prerequisite: 'supply-run', title: 'WORKING ORDER', description: 'Complete a construction or beacon repair project.', type: 'repair', target: 'any', amount: 1, reward: { salvage: 40, resources: { steel: 8 } } },
  { id: 'first-response', npcId: 'medic', title: 'FIRST RESPONSE', description: 'Use a medkit during an expedition.', type: 'heal', target: 'medkits', amount: 1, reward: { salvage: 20, medkits: 1 } },
  { id: 'lost-records', npcId: 'archivist', prerequisite: 'unknown-country', title: 'LOST RECORDS', description: 'Recover relics from the frontier.', type: 'relic', target: 'relics', amount: 2, reward: { salvage: 28, atlasCrystals: 1 } },
  { id: 'light-the-way', npcId: 'beaconEngineer', prerequisite: 'working-order', title: 'LIGHT THE WAY', description: 'Reach a beacon station and repair it.', type: 'repairBeacon', target: 'beacon', amount: 1, reward: { salvage: 50, atlasCrystals: 2 } }
];
const campaignChapters = ['A Light in the Dark', 'The Broken Chorus', 'Beyond the Beacons', 'The Last Signal'];
const campaignMissions = [
  { id: 'provisions', chapter: 0, npcId: 'quartermaster', title: 'Packing for the Frontier', type: 'count', counter: 'collected', amount: 12, legacy: 'supply-run',
    brief: 'The old beacon network has gone quiet. Bring in enough frontier materials to put a survey team in the field.',
    objective: 'Collect 12 frontier materials.', debrief: 'That buys us a survey. The Scout has a route ready.', reward: { salvage: 18, resources: { fuel: 4 } } },
  { id: 'survey', chapter: 0, npcId: 'scout', title: 'A Route Through the Fog', type: 'survey', legacy: 'unknown-country',
    brief: 'Before we cross the outer ring, mark three biome regions. If you have already charted them, your map will do.',
    objective: 'Chart three biome regions.', debrief: 'Your map matches an old survey. An archive cache is still out there.', reward: { salvage: 20 } },
  { id: 'field-archive', chapter: 0, npcId: 'archivist', title: 'The Field Archive', type: 'sites', legacy: 'lost-records',
    sites: [{ x: 2350, y: 1450, label: 'Buried field archive' }],
    brief: 'Bring me the maintenance log from the buried field archive. That is where they kept the beacon diagrams.',
    objective: 'Recover the maintenance log at the marked archive.', debrief: 'This log calls the beacons a listening array. The Mechanic can use these diagrams to make a field kit.', reward: { salvage: 22, relics: 1 } },
  { id: 'field-kit', chapter: 1, npcId: 'mechanic', title: 'A Kit for the Outer Ring', type: 'count', counter: 'repairs', amount: 1, legacy: 'working-order',
    brief: 'Show me you can put a workshop together before I send you to the outer ring. Craft or place a station, or finish a beacon repair.',
    objective: 'Complete one construction or beacon repair project.', debrief: 'The Engineer has a restoration kit ready. It will cover one beacon, not the whole ring.', reward: { salvage: 25, resources: { steel: 8 } } },
  { id: 'first-light', chapter: 1, npcId: 'beaconEngineer', title: 'First Light', type: 'beacon', legacy: 'light-the-way',
    brief: 'Take this kit to the marked beacon. It covers the full repair. If you already have a working beacon, we can use that one.',
    objective: 'Use the kit at the marked beacon or report an already repaired beacon.', debrief: 'The beacon is answering. That voice is not a rescue call. It is the same sentence, repeated every eleven seconds.', reward: { salvage: 40, atlasCrystals: 2 } },
  { id: 'triangulation', chapter: 1, npcId: 'scout', title: 'The Broken Chorus', type: 'sites',
    sites: [{ x: 3500, y: 2750, label: 'Survey mast Alpha', scan: 4 }, { x: 3900, y: 5100, label: 'Survey mast Bravo', scan: 5 }, { x: 6900, y: 4250, label: 'Survey mast Charlie', scan: 6 }],
    brief: 'Your restored beacon picked up a voice repeating the same sentence. Read the old survey masts in order and I can find its bearing.',
    objective: 'Tune three survey masts. Stay close until each scan locks.', debrief: 'All three bearings point past the outer ring. Every time we tune a mast, the Horde turns toward it.', reward: { salvage: 55, ammo: { pistolAmmo: 4 } } },
  { id: 'beacon-siege', chapter: 2, npcId: 'beaconEngineer', title: 'Hold the Frequency', type: 'defense', waves: [3, 5, 6],
    brief: 'The beacon can hold a clean channel if we keep it transmitting. Stay in range and clear the three waves drawn to the test.',
    objective: 'Start the beacon test and clear three waves without leaving its perimeter.', debrief: 'The test held. We pulled a location from the signal, but the repeater that could reach it is missing.', reward: { salvage: 65, medkits: 2 } },
  { id: 'repeater', chapter: 2, npcId: 'mechanic', title: 'The Missing Repeater', type: 'sites',
    sites: [{ x: 9450, y: 3850, label: 'Wrecked maintenance convoy' }],
    brief: 'The convoy carrying the spare repeater never made it home. Its last position is on your map.',
    objective: 'Recover the repeater core from the convoy wreck.', debrief: 'It still has power. The factory tags say this was built to send instructions, not just listen.', reward: { salvage: 42, resources: { crystal: 8 } } },
  { id: 'uplink', chapter: 2, npcId: 'beaconEngineer', title: 'Build the Uplink', type: 'sites', beaconSite: { label: 'Beacon repeater socket', scan: 6 },
    brief: 'Seat the core at the beacon and let it handshake. Once the uplink is stable, we can follow it to the source.',
    objective: 'Install and calibrate the repeater at your beacon.', debrief: 'The signal leads to a facility called the Continuity Relay. Its access channel just opened.', reward: { salvage: 50, atlasCrystals: 1 } },
  { id: 'expedition', chapter: 3, npcId: 'scout', title: 'The Outer Expedition', type: 'sites',
    sites: [{ x: 10050, y: 8050, label: 'Expedition waystation' }, { x: 11250, y: 8800, label: 'Continuity access terminal', scan: 6 }],
    brief: 'Follow the uplink past the outer ring. Check the waystation first; it has the terminal access code.',
    objective: 'Find the access code and download the relay credentials.', debrief: 'The credentials are good. The Engineer can use them to cut the facility off from the ring.', reward: { salvage: 55, medkits: 2 } },
  { id: 'continuity', chapter: 3, npcId: 'beaconEngineer', title: 'Cut the Loop', type: 'defense', waves: [4, 6, 8],
    sites: [{ x: 11650, y: 9450, label: 'The Continuity Relay' }],
    brief: 'Use the terminal to start the shutdown. The relay will call everything it can while we replace its control signal.',
    objective: 'Start the shutdown and clear three waves at the Continuity Relay.', debrief: 'The loop is broken. The beacons are back under Sanctuary control. Take the recovered recording to the Archivist.', reward: { salvage: 100, atlasCrystals: 3 } },
  { id: 'record', chapter: 3, npcId: 'archivist', title: 'What the Signal Woke', type: 'talk',
    brief: 'The recording is intact. We finally know what the old world was trying to preserve.',
    objective: 'Hear the recovered recording and close out the expedition.',
    debrief: 'The Continuity project made the first Horde as a self-repairing workforce. When its operators stopped answering, the relay kept broadcasting the last order: rebuild, even if it meant turning the living into raw material. We stopped that order. The Horde is still out there, but now it has no one directing it.',
    reward: { banked: 150, atlasCrystals: 5 } }
];
const campaignDefenseRadius = 290;
const campaignFinaleId = 'continuity';
const worldEventTypes = {
  distress: { name: 'DISTRESS SIGNAL', minSector: 1, defense: 90, record: 'Defend a stranded survivor while their transmitter calls for extraction.' },
  wreck: { name: 'SUPPLY WRECK', minSector: 1, defense: 0, record: 'Three cargo locks draw separate ambushes. Clear each before opening the next.' },
  horde: { name: 'ROAMING HORDE', minSector: 1, defense: 0, record: 'Intercept a moving horde trail, then defeat its elite leader and escort.' },
  convoy: { name: 'DISABLED CONVOY', minSector: 1, defense: 60, record: 'Restore two components using parts on site, then defend the extraction.' },
  breach: { name: 'VOID BREACH', minSector: 3, defense: 0, record: 'Destroy three anchors and their defenders, then defeat the breach guardian.' }
};
const worldEventRadius = 900;
const bountyTemplates = [
  { id: 'bounty-horde', title: 'HORDE CLEARANCE', description: 'Defeat hostile entities in the current frontier.', type: 'kill', target: 'any', amount: 18, reward: { salvage: 28 } },
  { id: 'bounty-salvage', title: 'SALVAGE RECOVERY', description: 'Return with collected materials.', type: 'collect', target: 'any', amount: 16, reward: { salvage: 24 } },
  { id: 'bounty-expedition', title: 'DEEP EXPEDITION', description: 'Travel beyond the sanctuary perimeter.', type: 'travel', target: 'distance', amount: 3500, timeLimit: 300, reward: { salvage: 38, relics: 1 } }
];
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
const voidPortalDistance = mapRadius + 10000 * 10;
const voidPortalAngle = -Math.PI / 10;
const voidPortal = { x: Math.cos(voidPortalAngle) * voidPortalDistance, y: Math.sin(voidPortalAngle) * voidPortalDistance };
const voidSearch = { x: voidPortal.x - 450, y: voidPortal.y + 250, radius: 1800 };
const stalkerTerritory = 2400;
const stalkerMaxHealth = 1400;
const stalkerPhases = [
  { speed: 285, windup: .85, recovery: 1.5, approach: .9, combo: 1, attacks: ['lunge', 'burst', 'marks', 'fan', 'shockwave'] },
  { speed: 325, windup: .75, recovery: 1.15, approach: .65, combo: 2, attacks: ['lunge', 'marks', 'lunge', 'burst', 'cross', 'fan', 'shockwave'] },
  { speed: 360, windup: .65, recovery: .9, approach: .4, combo: 3, attacks: ['lunge', 'burst', 'marks', 'cross', 'fan', 'shockwave', 'lunge', 'cross'] }
];
const dungeonRooms = {
  entry: { name: 'Pressure Lock', w: 780, h: 480, doors: [['exit', -340, 0, 'Return to the Void'], ['works', 340, 0, 'Enter the Foundry']] },
  works: { name: 'Foundry Floor', w: 980, h: 660, enemies: [0, 0, 1, 1, 2], doors: [['entry', -440, 0, 'Pressure Lock'], ['stores', 0, -280, 'Spare Parts Vault'], ['relay', 440, 0, 'Relay Gallery']] },
  stores: { name: 'Spare Parts Vault', w: 700, h: 510, enemies: [1, 1, 2], loot: 'supplies', doors: [['works', -300, 0, 'Foundry Floor']] },
  relay: { name: 'Relay Gallery', w: 900, h: 610, doors: [['works', -400, 0, 'Foundry Floor'], ['ward', 400, 0, 'Containment Ward']] },
  ward: { name: 'Containment Ward', w: 1080, h: 700, enemies: [0, 1, 1, 2, 2, 3], doors: [['relay', -490, 0, 'Relay Gallery'], ['records', 0, -300, 'Records Annex'], ['staging', 490, 0, 'Safe Staging Room']] },
  records: { name: 'Records Annex', w: 680, h: 490, enemies: [0, 1, 2], loot: 'records', doors: [['ward', -290, 0, 'Containment Ward']] },
  staging: { name: 'Safe Staging Room', w: 720, h: 480, doors: [['ward', -310, 0, 'Containment Ward'], ['arena', 310, 0, 'Commit to the Foreman fight']] },
  arena: { name: 'Continuity Crucible', w: 1450, h: 950, doors: [['exit', -650, 0, 'Return to the Void'], ['staging', 650, 0, 'Safe Staging Room']] }
};
const dungeonOrigin = 60000;
const relayOrder = ['BLUE', 'AMBER', 'WHITE'];
const dungeonWorldFields = [
  'enemies', 'bullets', 'beams', 'projectiles', 'explosions', 'portals', 'enemyTrails', 'toxicBossZones',
  'radioactiveBombZones', 'abyssalBossWaves', 'darkBossDashCircles', 'sparks', 'gems', 'drops', 'nodes',
  'hazardZones', 'brambleZones', 'lightningStrikes'
];
const biomeBoundaries = [3000, 6000, 9500, 13000, 16000];
const tacticalMapZoomLevels = [.4, .6, .8, 1, 1.25, 1.5, 2];
let tacticalMapZoomIndex = 3;
function updateDeepVoid(dt) {
  if (game.epilogue.dungeon) return;
  const state = game.voidDangers;
  const player = game.player;
  for (const strike of state.strikes) {
    const warning = strike.timer > 0;
    strike.timer -= dt;
    if (warning && strike.timer <= 0 && Math.hypot(player.x - strike.x, player.y - strike.y) <= 135) {
      game.health -= 28 * (1 - (getArmorEffects().voidDamageReduction || 0));
    }
  }
  state.strikes = state.strikes.filter(strike => strike.timer > -.3);
  for (const rift of state.rifts) {
    rift.timer -= dt;
    if (!rift.triggered && Math.hypot(player.x - rift.x, player.y - rift.y) < 260) {
      rift.triggered = true;
      rift.timer = 1.5;
      epilogueWarning(180);
    } else if (rift.triggered && rift.timer <= 0) {
      for (let i = 0; i < 3 && game.enemies.filter(enemy => !enemy.defeated && enemy.hp > 0).length < 24; i++) {
        const angle = Math.PI * 2 * i / 3;
        const x = rift.x + Math.cos(angle) * 55;
        const y = rift.y + Math.sin(angle) * 55;
        const enemy = Math.random() < .25 ? createVoidWalker(x, y) : createVoidWorm(x, y);
        enemy.isAggroed = true;
        addEnemy(enemy);
      }
    }
  }
  state.rifts = state.rifts.filter(rift => rift.timer > 0 && Math.hypot(player.x - rift.x, player.y - rift.y) < 2200);
  const depth = Math.hypot(player.x, player.y) - mapRadius;
  if (depth < 3000) return;
  const intensity = Math.min(1, depth / 100000);
  state.stormTimer -= dt;
  state.riftTimer -= dt;
  if (state.stormTimer <= 0) {
    const bearing = Math.atan2((keys.s ? 1 : 0) - (keys.w ? 1 : 0), (keys.d ? 1 : 0) - (keys.a ? 1 : 0));
    for (let i = 0; i < 2 + Math.round(intensity * 2); i++) {
      const angle = bearing + (i - 1) * .8;
      const distance = i === 0 ? 0 : 210 + Math.random() * 200;
      state.strikes.push({ x: player.x + Math.cos(angle) * distance, y: player.y + Math.sin(angle) * distance, timer: 1.8 });
    }
    state.stormTimer = 12 - intensity * 5 + Math.random() * 4;
    epilogueWarning(390);
  }
  if (state.riftTimer <= 0 && state.rifts.length < 3) {
    const moving = keys.w || keys.s || keys.a || keys.d;
    const angle = moving
      ? Math.atan2((keys.s ? 1 : 0) - (keys.w ? 1 : 0), (keys.d ? 1 : 0) - (keys.a ? 1 : 0)) + (Math.random() - .5) * 1.4
      : Math.random() * Math.PI * 2;
    state.rifts.push({ x: player.x + Math.cos(angle) * 600, y: player.y + Math.sin(angle) * 600, timer: 45, triggered: false });
    state.riftTimer = 24 - intensity * 9 + Math.random() * 6;
  }
}
function drawDeepVoid() {
  ctx.save();
  ctx.translate(canvas.clientWidth / 2 - game.camera.x, canvas.clientHeight / 2 - game.camera.y);
  ctx.lineWidth = 3;
  ctx.font = 'bold 12px Space Mono';
  ctx.textAlign = 'center';
  for (const strike of game.voidDangers.strikes) {
    ctx.strokeStyle = '#d2adff';
    ctx.fillStyle = strike.timer > 0 ? '#aa72ff33' : settings.reducedEffects ? '#ddbbff44' : '#ddbbff99';
    ctx.setLineDash(strike.timer > 0 ? [10, 7] : []);
    ctx.beginPath();
    ctx.arc(strike.x, strike.y, 135, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (strike.timer > 0) ctx.fillText('VOID STRIKE', strike.x, strike.y - 145);
  }
  for (const rift of game.voidDangers.rifts) {
    ctx.strokeStyle = ctx.fillStyle = rift.triggered ? '#ffc486' : '#b794ff';
    ctx.setLineDash([12, 9]);
    ctx.beginPath();
    ctx.arc(rift.x, rift.y, 260, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.ellipse(rift.x, rift.y, 20, 52, .35, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillText(rift.triggered ? 'RIFT OPENING' : 'UNSTABLE RIFT', rift.x, rift.y - 70);
  }
  ctx.restore();
}
function cycleTacticalMapZoom() {
  tacticalMapZoomIndex = (tacticalMapZoomIndex + 1) % tacticalMapZoomLevels.length;
}
function getTacticalMapZoom() {
  if (!mapOpen) return tacticalMapZoomLevels[tacticalMapZoomIndex];
  const radius = hasContinuityKey() ? voidPortalDistance + voidSearch.radius : mapRadius;
  return Math.min(1, mapRadius / (radius + Math.hypot(game.player.x, game.player.y)));
}
function getTacticalMapScale() {
  const mapDimension = mapOpen ? Math.min(mapCanvas.width, mapCanvas.height) : mapCanvas.width;
  return mapDimension / (mapRadius * 2) * getTacticalMapZoom();
}
function getTacticalMapVisibleRadius() {
  return mapRadius / getTacticalMapZoom();
}
function getMapCenter() { return mapOpen || Math.hypot(game.player.x, game.player.y) > mapRadius ? game.player : { x: 0, y: 0 }; }
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
  renderWorldEventHud();
  mapPanel.classList.toggle('expanded', open);
  const canFastTravel = isAtFastTravelHub();
  mapPanel.classList.toggle('fast-travel-enabled', open && canFastTravel);
  mapPanel.classList.toggle('admin-teleport-enabled', open && isAdminTest());
  const mapBinding = settings.bindings.map;
  const closeHint = `${mapBinding === 'mouse0' ? '' : `${bindingLabel(mapBinding)} OR `}ESC TO CLOSE`;
  mapInstructions.textContent = game.epilogue.dungeon ? `FACILITY MAP // ${closeHint}` : isAdminTest()
    ? `CLICK ANYWHERE TO TELEPORT // ${closeHint}`
    : canFastTravel ? `CLICK A BEACON TO TRAVEL // ${closeHint}` : closeHint;
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
  [{ name: 'VOID RIFT', color: '#ca8bea', dark: '#281b39' }, { name: 'RADIOACTIVE FLATLANDS', color: '#e34c4c', dark: '#351313' }, { name: 'DEAD STAR', color: '#ffb067', dark: '#3b281e' }, { name: 'INFINITE DARK', color: '#809eea', dark: '#202744' }]
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
  flamethrower: { name: 'FLAMETHROWER', ammo: 'fuelCells', magazine: 160, cooldown: 40, damage: 0.02, speed: 450, life: 3.0, pellets: 3, spread: .3, bulletRadius: 6, deceleration: [25, 100], decelerationInterval: .125, vibrationAmplitude: 1.5, vibrationFrequency: 80, burnDuration: 2, burnDamage: .4, burnInterval: .2, kind: 'gun', pierce: true },
  sniper: { name: 'SNIPER', ammo: 'marksmanAmmo', magazine: 5, cooldown: 750, damage: 3.60, speed: 1200, life: 1, pellets: 1, spread: 0, kind: 'gun' },
  warHammer: { name: 'WAR HAMMER', ammo: null, cooldown: 850, damage: 4.20, range: 112, meleeDuration: .48, meleeSweep: 2.1, meleeStyle: 'warHammer', kind: 'melee' },

  // Tier 3 (Late Mid Game)
  laser: { name: 'LASER', ammo: 'cells', magazine: 20, cooldown: 100, damage: 0.65, speed: 1100, life: .55, pellets: 1, spread: 0.2, beam: true, kind: 'gun' },
  grenadeLauncher: { name: 'GRENADE LAUNCHER', ammo: 'grenades', magazine: 6, cooldown: 800, damage: 3.5, speed: 380, life: 1.4, pellets: 1, spread: 0, blast: 80, kind: 'gun'},
  pulseCarbine: { name: 'PULSE CARBINE', ammo: 'pulseCells', magazine: 55, cooldown: 70, damage: 1.20, speed: 380, life: 1.7, pellets: 1, spread: .22, pulseBlastRadius: 50, pulseKnockback: 400, kind: 'gun' },
  combatPistol: { name: 'COMBAT PISTOL', ammo: 'bulletClips', magazine: 17, cooldown: 200, damage: 1.25, speed: 100, life: 2.55, pellets: 1, spread: 0.2, beam: true, kind: 'gun' },

  // Tier 4 (Endgame)
  voidBatar: { name: 'VOID BATAR', ammo: 'voidChains', magazine: 200, cooldown: 30, damage: 0.45, speed: 400, life: 6, pellets: 1, spread: .15, voidBatarMotion: true, kind: 'gun' },
  laserBlade: { name: 'LASER BLADE', ammo: null, cooldown: 350, damage: 4.80, range: 115, meleeDuration: .36, meleeSweep: 2.5, meleeStyle: 'laserBlade', kind: 'melee' },
  magicGauntlet: { name: 'MAGIC GAUNTLET', ammo: 'magicGauntletAmmo', magazine: 14, cooldown: 100, damage: 1.30, speed: 440, life: .50, pellets: 1, spread: .50, kind: 'gun', oscillating: true, coneSize: .20 },
  railgun: { name: 'RAILGUN', ammo: 'slugs', magazine: 1, cooldown: 1200, damage: 18.00, speed: 1600, life: 1, pellets: 1, spread: 0, beam: true, kind: 'gun' },
  radBeam: { name: 'RAD BEAM', ammo: 'radCells', magazine: 8, range: 600, damage: 0.05, radiationDamage: .5, radiationTickInterval: .1, radiationDuration: 3, radiationSlowChance: .05, radiationSlowMultiplier: .85, kind: 'gun', continuousBeam: true },
  cosmosGauntlet: { name: 'COSMOS GAUNTLET', ammo: 'cosmosGauntletAmmo', magazine: 16, cooldown: 100, damage: 1.60, speed: 450, life: 0.8, pellets: 2, spread: .60, kind: 'gun', oscillating: true, coneSize: .25 }
};
const sanctuaryProjects = {
  medical: { name: 'MEDICAL WING', npc: 'medic', x: 370, y: 620,
    benefits: ['Medkit crafting beside the Medic.', '15% lower medkit material costs, rounded down; minimum one.'] },
  workshop: { name: 'WORKSHOP', npc: 'mechanic', x: 700, y: 120, industrial: true,
    benefits: ['Craft and install handling mods.', 'Craft and install specialization mods.'] },
  scout: { name: 'SCOUT STATION', npc: 'scout', x: 620, y: -470,
    benefits: ['Approximate event leads in discovered regions.', 'Facility intelligence and expedition leads.'] },
  archive: { name: 'ARCHIVE', npc: 'archivist', x: -270, y: 650,
    benefits: ['Research plans and recovered facility records.', 'Trophy gallery; space reserved for future rival dossiers.'] },
  depot: { name: 'SUPPLY DEPOT', npc: 'quartermaster', x: -680, y: -430, industrial: true,
    benefits: ['One-click ammo orders for the equipped weapon.', 'Saved multi-weapon resupply list and combined cost preview.'] }
};
const weaponModCatalog = {
  stabilizer: { name: 'STABILIZER', slot: 'handling', description: '25% less spread; 10% slower firing.' },
  quickLoader: { name: 'QUICK LOADER', slot: 'handling', description: '20% shorter empty-magazine recovery; 15% smaller magazine (rounded down).' },
  balancedGrip: { name: 'BALANCED GRIP', slot: 'handling', description: '15% shorter attack cooldown; 10% less damage.' },
  focusAssembly: { name: 'FOCUS ASSEMBLY', slot: 'handling', description: '20% more reach; 10% less direct damage.' },
  penetrator: { name: 'PENETRATOR', slot: 'specialization', description: 'Hit one additional enemy; 20% less damage.' },
  scatterChoke: { name: 'SCATTER CHOKE', slot: 'specialization', description: '30% narrower spread; two fewer pellets.' },
  concussivePayload: { name: 'CONCUSSIVE PAYLOAD', slot: 'specialization', description: '25% larger blast; 20% less damage.' },
  lingeringFlame: { name: 'LINGERING FLAME', slot: 'specialization', description: '50% longer burn; 20% less burn damage per tick.' },
  heavyEdge: { name: 'HEAVY EDGE', slot: 'specialization', description: '25% more damage; 20% longer attack cooldown.' },
  focusedDischarge: { name: 'FOCUSED DISCHARGE', slot: 'specialization', description: '20% more direct damage; 25% longer firing cooldown.' },
  sustainedExposure: { name: 'SUSTAINED EXPOSURE', slot: 'specialization', description: '25% longer radiation; 20% less direct beam damage.' },
  focusedOrbit: { name: 'FOCUSED ORBIT', slot: 'specialization', description: '25% tighter projectile cone; 15% shorter reach.' },
  shortChain: { name: 'SHORT CHAIN', slot: 'specialization', description: '20% faster firing; 30% shorter projectile lifetime.' }
};
const modResearch = {
  focusAssembly: { metric: 'encounters', target: 12, label: 'Encounter 12 enemy variants' },
  concussivePayload: { metric: 'events', target: 3, label: 'Complete 3 world events' },
  lingeringFlame: { metric: 'kills', target: 25, label: 'Record 25 player defeats in the journal' },
  focusedOrbit: { metric: 'encounters', target: 20, label: 'Encounter 20 enemy variants' }
};
function freshSanctuaryProgress() {
  return { version: 1, projects: Object.fromEntries(Object.keys(sanctuaryProjects).map(id => [id, 0])), plans: [], resupply: [] };
}
function freshWeaponMods() { return { version: 1, weapons: {}, looseAmmo: {} }; }
function weaponAcceptsMod(weaponId, modId) {
  const weapon = weaponCatalog[weaponId];
  if (!weapon || !Object.hasOwn(weaponModCatalog, modId)) return false;
  const conventional = ['sidearm', 'duelSidearm', 'smg', 'minigun', 'shotgun', 'burstRifle', 'sniper', 'grenadeLauncher', 'railgun'];
  switch (modId) {
    case 'stabilizer': return weapon.spread > 0 && !weapon.beam && !weapon.continuousBeam;
    case 'quickLoader': return conventional.includes(weaponId) && weapon.magazine > 1;
    case 'balancedGrip': case 'heavyEdge': return weapon.kind === 'melee';
    case 'focusAssembly': return ['laser', 'combatPistol', 'pulseCarbine', 'railgun', 'voidBatar', 'radBeam', 'magicGauntlet', 'cosmosGauntlet'].includes(weaponId);
    case 'penetrator': return conventional.includes(weaponId) && weapon.pellets === 1 && !weapon.beam && !weapon.blast;
    case 'scatterChoke': return weaponId === 'shotgun';
    case 'concussivePayload': return ['grenadeLauncher', 'pulseCarbine'].includes(weaponId);
    case 'lingeringFlame': return weaponId === 'flamethrower';
    case 'focusedDischarge': return ['laser', 'combatPistol', 'railgun'].includes(weaponId);
    case 'sustainedExposure': return weaponId === 'radBeam';
    case 'focusedOrbit': return ['magicGauntlet', 'cosmosGauntlet'].includes(weaponId);
    case 'shortChain': return weaponId === 'voidBatar';
    default: return false;
  }
}
function getWeaponStats(weaponId = game.weapon, run = game) {
  const weapon = { ...weaponCatalog[weaponId] };
  const mods = run.weaponMods.weapons[weaponId];
  for (const id of [mods?.handling, mods?.specialization]) {
    switch (id) {
      case 'stabilizer': weapon.spread *= .75; weapon.cooldown /= .9; break;
      case 'quickLoader': weapon.magazine = Math.max(1, Math.floor(weapon.magazine * .85)); weapon.emptyReloadMultiplier = .8; break;
      case 'balancedGrip': weapon.cooldown *= .85; weapon.damage *= .9; break;
      case 'focusAssembly':
        if (weapon.continuousBeam) weapon.range *= 1.2;
        else weapon.speed *= 1.2;
        if (weapon.voidBatarMotion) weapon.voidBatarAccelerationMultiplier = 1.2;
        weapon.damage *= .9;
        break;
      case 'penetrator': weapon.pierceHits = 2; weapon.damage *= .8; break;
      case 'scatterChoke': weapon.spread *= .7; weapon.pellets -= 2; break;
      case 'concussivePayload':
        if (weapon.blast) weapon.blast *= 1.25;
        if (weapon.pulseBlastRadius) weapon.pulseBlastRadius *= 1.25;
        weapon.damage *= .8;
        break;
      case 'lingeringFlame': weapon.burnDuration *= 1.5; weapon.burnDamage *= .8; break;
      case 'heavyEdge': weapon.damage *= 1.25; weapon.cooldown *= 1.2; break;
      case 'focusedDischarge': weapon.damage *= 1.2; weapon.cooldown *= 1.25; break;
      case 'sustainedExposure': weapon.radiationDuration *= 1.25; weapon.damage *= .8; break;
      case 'focusedOrbit': weapon.spread *= .75; weapon.coneSize *= .75; weapon.life *= .85; break;
      case 'shortChain': weapon.cooldown /= 1.2; weapon.life *= .7; break;
    }
  }
  return weapon;
}
function reachedSanctuarySectorThree(run = game) {
  return [...run.discovered].some(key => /^sector-[2-5]-[0-3]$/.test(key)) || run.discovered.has('void');
}
function sanctuaryProjectCost(id, level = game.sanctuary.projects[id]) {
  const industrial = sanctuaryProjects[id].industrial;
  return level === 0
    ? industrial ? { iron: 12, steel: 6, fuel: 4 } : { wood: 12, iron: 8, fiber: 4 }
    : industrial ? { steel: 16, crystal: 8, relic: 1 } : { steel: 10, crystal: 6, fuel: 4 };
}
function weaponModCost(weaponId, modId) {
  if (weaponModCatalog[modId].slot === 'handling') return { steel: 4, crystal: 2 };
  return weaponRecipes[weaponId].cost.relic ? { steel: 12, crystal: 8, relic: 1 } : { steel: 8, crystal: 4 };
}
function researchProgress(id, run = game) {
  const metric = modResearch[id].metric;
  if (metric === 'events') return Object.values(run.worldEvents.completed).reduce((sum, value) => sum + value, 0);
  if (metric === 'kills') return Object.values(run.journal.enemies).reduce((sum, entry) => sum + entry.kills, 0);
  return Object.keys(run.journal.enemies).length;
}
function canUseSanctuaryService(npcId) {
  const index = sanctuaryNpcDefinitions.findIndex(npc => npc.id === npcId);
  const position = index >= 0 ? getSanctuaryNpcPositions()[index] : null;
  if (game.active && !game.paused && !mapOpen && !game.managerMode && !game.epilogue.dungeon
      && !questDialog.hidden && questDialog.dataset.sourceId === npcId
      && getBiome(game.player.x, game.player.y).key === 'sanctuary' && position
      && Math.hypot(game.player.x - position.x, game.player.y - position.y) <= stationInteractionRadius) return true;
  showQuestMessage(`RETURN TO THE ${questNpcById(npcId)?.name || 'SANCTUARY CONTACT'} TO USE THIS SERVICE`);
  return false;
}
function spendSanctuaryMaterials(cost) {
  if (game.crafting) { showQuestMessage('FINISH THE CURRENT CRAFT FIRST'); return false; }
  const missing = Object.entries(cost).filter(([id, amount]) => getCraftResourceAmount(id) < amount);
  if (missing.length) {
    showQuestMessage(`NEED ${missing.map(([id, amount]) => `${amount - getCraftResourceAmount(id)} ${id.toUpperCase()}`).join(' + ')} // DEPOSIT MATERIALS IN YOUR VAULT`);
    return false;
  }
  Object.entries(cost).forEach(([id, amount]) => spendCraftResource(id, amount));
  updateInventoryUI();
  return true;
}
function upgradeSanctuaryProject(id) {
  if (!Object.hasOwn(sanctuaryProjects, id)) { showQuestMessage('UNKNOWN SANCTUARY PROJECT'); return; }
  const project = sanctuaryProjects[id];
  if (!canUseSanctuaryService(project.npc)) return;
  const level = game.sanctuary.projects[id];
  if (level >= 2) { showQuestMessage('PROJECT ALREADY COMPLETE'); return; }
  if (level === 1 && !reachedSanctuarySectorThree()) { showQuestMessage('EXPLORE SECTOR 3 BEFORE BUILDING STAGE II'); return; }
  if (!spendSanctuaryMaterials(sanctuaryProjectCost(id))) return;
  game.sanctuary.projects[id]++;
  updateQuestProgress('repair');
  renderQuestDialog(project.npc);
  showQuestMessage(`${project.name} // STAGE ${level + 1} COMPLETE`);
}
function claimModResearch(id) {
  if (!canUseSanctuaryService('archivist')) return;
  if (!Object.hasOwn(modResearch, id) || !game.sanctuary.projects.archive
      || researchProgress(id) < modResearch[id].target) { showQuestMessage('RESEARCH REQUIREMENTS NOT MET'); return; }
  if (!game.sanctuary.plans.includes(id)) game.sanctuary.plans.push(id);
  renderQuestDialog('archivist');
  showQuestMessage(`PLAN RECOVERED // ${weaponModCatalog[id].name} // WEAPON STILL REQUIRED`);
}
function weaponModRequirement(weaponId, modId) {
  if (!Object.hasOwn(weaponCatalog, weaponId) || !game.unlockedWeapons[weaponId]) return 'CRAFT THIS WEAPON FIRST';
  if (!weaponAcceptsMod(weaponId, modId)) return 'INCOMPATIBLE MOD';
  if (game.sanctuary.projects.workshop < (weaponModCatalog[modId].slot === 'handling' ? 1 : 2)) return 'UPGRADE THE WORKSHOP';
  if (Object.hasOwn(modResearch, modId) && !game.sanctuary.plans.includes(modId)) return `ARCHIVIST RESEARCH: ${modResearch[modId].label.toUpperCase()}`;
  return '';
}
function craftWeaponMod(weaponId, modId) {
  if (!canUseSanctuaryService('mechanic')) return;
  const requirement = weaponModRequirement(weaponId, modId);
  if (requirement) { showQuestMessage(requirement); return; }
  const owned = game.weaponMods.weapons[weaponId];
  if (owned?.crafted.includes(modId)) { showQuestMessage('MOD ALREADY CRAFTED FOR THIS WEAPON'); return; }
  if (!spendSanctuaryMaterials(weaponModCost(weaponId, modId))) return;
  const entry = owned || (game.weaponMods.weapons[weaponId] = { crafted: [], handling: null, specialization: null });
  entry.crafted.push(modId);
  renderQuestDialog('mechanic');
  showQuestMessage(`CRAFTED // ${weaponModCatalog[modId].name} FOR ${weaponCatalog[weaponId].name} // INSTALL FREE`);
}
function equipWeaponMod(weaponId, slot, modId) {
  if (!canUseSanctuaryService('mechanic')) return;
  const entry = game.weaponMods.weapons[weaponId];
  if (!['handling', 'specialization'].includes(slot) || !entry || !game.unlockedWeapons[weaponId]
      || game.crafting || game.sanctuary.projects.workshop < (slot === 'handling' ? 1 : 2)
      || (modId !== null && (!entry.crafted.includes(modId) || weaponModCatalog[modId]?.slot !== slot))) {
    showQuestMessage('CANNOT INSTALL THAT MOD // CHECK WORKSHOP, OWNERSHIP AND CURRENT CRAFT'); return;
  }
  entry[slot] = modId;
  const weapon = getWeaponStats(weaponId);
  if (weapon.kind !== 'melee') {
    const loaded = weaponId === game.weapon ? game.ammo : game.weaponAmmo[weaponId] || 0;
    const excess = Math.max(0, loaded - weapon.magazine);
    if (excess) game.weaponMods.looseAmmo[weapon.ammo] = (game.weaponMods.looseAmmo[weapon.ammo] || 0) + excess;
    game.weaponAmmo[weaponId] = Math.min(loaded, weapon.magazine);
    if (weaponId === game.weapon) game.ammo = game.weaponAmmo[weaponId];
  }
  updateAmmoUI();
  renderQuestDialog('mechanic');
  showQuestMessage('MOD LOADOUT UPDATED // NO AMMO OR MATERIALS GRANTED');
}
function isDepotWeapon(id, run = game) {
  return Object.hasOwn(weaponCatalog, id) && run.unlockedWeapons[id] === true
    && weaponCatalog[id].ammo && Object.keys(ammoCatalog[weaponCatalog[id].ammo].cost).length > 0;
}
function validResupplyOrders(orders, run = game) {
  return Array.isArray(orders) && orders.length <= Object.keys(weaponCatalog).length
    && new Set(orders.map(order => order?.weaponId)).size === orders.length
    && orders.every(order => order && isDepotWeapon(order.weaponId, run) && Number.isInteger(order.quantity) && order.quantity >= 1 && order.quantity <= 5);
}
function depotResupplyRecipe(orders) {
  const cost = {}, ammoOutput = {};
  for (const order of orders) {
    const ammo = weaponCatalog[order.weaponId].ammo;
    const recipe = ammoCatalog[ammo];
    for (const [id, amount] of Object.entries(recipe.cost)) cost[id] = (cost[id] || 0) + amount * order.quantity;
    ammoOutput[ammo] = (ammoOutput[ammo] || 0) + recipe.amount * order.quantity;
  }
  return { name: 'SUPPLY DEPOT ORDER', time: orders.reduce((sum, order) => sum + order.quantity * 3, 0), cost, ammoOutput };
}
function adjustResupplyOrder(weaponId, delta) {
  if (!canUseSanctuaryService('quartermaster')) return;
  if (game.sanctuary.projects.depot < 2 || !isDepotWeapon(weaponId) || ![-1, 1].includes(delta)) {
    showQuestMessage('RESUPPLY LIST REQUIRES SUPPLY DEPOT II AND A CRAFTED AMMO WEAPON'); return;
  }
  const list = game.sanctuary.resupply;
  const entry = list.find(order => order.weaponId === weaponId);
  if (entry) {
    entry.quantity = Math.min(5, entry.quantity + delta);
    if (entry.quantity <= 0) list.splice(list.indexOf(entry), 1);
  } else if (delta > 0) list.push({ weaponId, quantity: 1 });
  renderQuestDialog('quartermaster');
}
function placeResupplyOrder(equippedOnly = false) {
  if (!canUseSanctuaryService('quartermaster')) return;
  if (game.sanctuary.projects.depot < (equippedOnly ? 1 : 2)) { showQuestMessage('UPGRADE THE SUPPLY DEPOT'); return; }
  const orders = equippedOnly ? [{ weaponId: game.weapon, quantity: 1 }] : game.sanctuary.resupply.map(order => ({ ...order }));
  if (!orders.length || !validResupplyOrders(orders)) { showQuestMessage('SELECT A CRAFTED AMMO WEAPON // RECHARGING GAUNTLETS NEED NO ORDER'); return; }
  const recipe = depotResupplyRecipe(orders);
  if (!spendSanctuaryMaterials(recipe.cost)) return;
  game.crafting = { recipeKey: 'depotResupply', orders, quantity: 1, remaining: recipe.time, total: recipe.time };
  renderQuestDialog('quartermaster');
  showQuestMessage(`CRAFTING RESUPPLY // ${recipe.time}s // ALL MATERIALS PAID ONCE`);
}
function restoreSanctuaryProgress(run, parsed) {
  const plain = value => value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype;
  if (Object.hasOwn(parsed, 'sanctuary')) {
    const state = parsed.sanctuary;
    if (!plain(state) || state.version !== 1 || !plain(state.projects)
        || Object.keys(state.projects).length !== Object.keys(sanctuaryProjects).length
        || Object.keys(sanctuaryProjects).some(id => !Number.isInteger(state.projects[id]) || state.projects[id] < 0 || state.projects[id] > 2)
        || (Object.values(state.projects).includes(2) && !reachedSanctuarySectorThree(run))
        || !Array.isArray(state.plans) || new Set(state.plans).size !== state.plans.length
        || state.plans.some(id => !Object.hasOwn(modResearch, id))
        || (state.plans.length > 0 && state.projects.archive < 1)
        || !validResupplyOrders(state.resupply, run)
        || (state.resupply.length > 0 && state.projects.depot < 2)) throw new Error('Invalid Sanctuary progression');
    run.sanctuary = { version: 1, projects: { ...state.projects }, plans: [...state.plans], resupply: state.resupply.map(order => ({ ...order })) };
  }
  if (Object.hasOwn(parsed, 'weaponMods')) {
    const state = parsed.weaponMods;
    if (!plain(state) || state.version !== 1 || !plain(state.weapons) || !plain(state.looseAmmo)
        || Object.entries(state.looseAmmo).some(([id, amount]) => !Object.hasOwn(ammoCatalog, id) || !Number.isSafeInteger(amount) || amount < 0)
        || Object.entries(state.weapons).some(([id, entry]) => !Object.hasOwn(weaponCatalog, id) || run.unlockedWeapons[id] !== true
          || !plain(entry) || !Array.isArray(entry.crafted) || new Set(entry.crafted).size !== entry.crafted.length
          || entry.crafted.some(modId => !weaponAcceptsMod(id, modId))
          || entry.crafted.some(modId => run.sanctuary.projects.workshop < (weaponModCatalog[modId].slot === 'handling' ? 1 : 2)
            || (Object.hasOwn(modResearch, modId) && !run.sanctuary.plans.includes(modId)))
          || ['handling', 'specialization'].some(slot => entry[slot] !== null
            && (!entry.crafted.includes(entry[slot]) || weaponModCatalog[entry[slot]]?.slot !== slot)))) throw new Error('Invalid weapon modifications');
    run.weaponMods = { version: 1, weapons: Object.fromEntries(Object.entries(state.weapons).map(([id, entry]) =>
      [id, { crafted: [...entry.crafted], handling: entry.handling, specialization: entry.specialization }])), looseAmmo: { ...state.looseAmmo } };
  }
  if (run.crafting?.recipeKey === 'depotResupply'
      && (!validResupplyOrders(run.crafting.orders, run) || !run.crafting.orders.length
        || run.sanctuary.projects.depot < 1
        || (run.sanctuary.projects.depot < 2 && (run.crafting.orders.length !== 1 || run.crafting.orders[0].quantity !== 1))
        || !Number.isFinite(run.crafting.remaining) || run.crafting.remaining < 0
        || run.crafting.total !== depotResupplyRecipe(run.crafting.orders).time
        || run.crafting.remaining > run.crafting.total || run.crafting.quantity !== 1)) throw new Error('Invalid Supply Depot craft');
}
function sanctuaryCostLabel(cost) {
  return Object.entries(cost).map(([id, amount]) => `${amount} ${resourceTypes.find(resource => resource.key === id)?.name || id.toUpperCase()} (${getCraftResourceAmount(id)} OWNED)`).join(' + ');
}
function renderWeaponModService() {
  const owned = Object.keys(weaponCatalog).filter(id => game.unlockedWeapons[id]);
  const selected = owned.includes(questDialog.dataset.modWeapon) ? questDialog.dataset.modWeapon : game.weapon;
  questDialog.dataset.modWeapon = selected;
  const weapon = getWeaponStats(selected);
  const entry = game.weaponMods.weapons[selected];
  return `<h4>WEAPON MODIFICATIONS</h4><p>Craft once per weapon in this save. Install or remove free here. Effects are recalculated, never stacked by swapping.</p>
    <nav class="sanctuary-weapon-picker" aria-label="Weapon to modify">${owned.map(id =>
      `<button type="button" data-mod-weapon="${id}" aria-pressed="${id === selected}">${weaponCatalog[id].name}</button>`).join('')}</nav>
    <p>${weaponCatalog[selected].name} // DAMAGE ${weapon.damage.toFixed(3)} // ${weapon.continuousBeam ? `RANGE ${Math.round(weapon.range)}` : `COOLDOWN ${Math.round(weapon.cooldown)}ms`}${weapon.magazine ? ` // MAG ${weapon.magazine}` : ''}</p>
    ${['handling', 'specialization'].map(slot => `<div class="quest-card"><b>${slot.toUpperCase()} SLOT: ${weaponModCatalog[entry?.[slot]]?.name || 'EMPTY'}</b>
      ${entry?.[slot] ? `<button type="button" data-mod-remove="${slot}">REMOVE FREE</button>` : ''}
      ${Object.entries(weaponModCatalog).filter(([id, mod]) => mod.slot === slot && weaponAcceptsMod(selected, id)).map(([id, mod]) => {
        const crafted = entry?.crafted.includes(id);
        const requirement = weaponModRequirement(selected, id);
        return `<div class="sanctuary-mod-option"><strong>${mod.name}</strong><span>${mod.description}</span>
          <small>${crafted ? 'CRAFTED FOR THIS WEAPON' : sanctuaryCostLabel(weaponModCost(selected, id))}${requirement ? ` // ${requirement}` : ''}</small>
          ${crafted ? `<button type="button" data-mod-equip="${id}" ${requirement || game.crafting || entry[slot] === id ? 'disabled' : ''}>${entry[slot] === id ? 'INSTALLED' : 'INSTALL FREE'}</button>`
            : `<button type="button" data-mod-craft="${id}" ${requirement || game.crafting ? 'disabled' : ''}>CRAFT FOR THIS WEAPON</button>`}</div>`;
      }).join('') || '<span>NO COMPATIBLE MODS.</span>'}</div>`).join('')}`;
}
function renderArchiveService() {
  const research = Object.entries(modResearch).map(([id, definition]) => {
    const claimed = game.sanctuary.plans.includes(id);
    const progress = researchProgress(id);
    return `<div class="quest-card"><b>${weaponModCatalog[id].name}</b><span>${definition.label} // ${Math.min(progress, definition.target)} / ${definition.target}</span>
      <button type="button" data-research-claim="${id}" ${claimed || progress < definition.target ? 'disabled' : ''}>${claimed ? 'PLAN RECOVERED' : 'RECOVER PLAN'}</button></div>`;
  }).join('');
  const records = journalRecordCards().map(card => `<div class="quest-card"><b>${card.title}</b><span>${card.text}</span></div>`).join('');
  let gallery = '';
  if (game.sanctuary.projects.archive >= 2) {
    const trophies = [
      ...(game.epilogue.guardianCleared ? ['VOID STALKER GUARDIAN'] : []),
      ...(game.epilogue.firstClear ? ['THE LAST SHIFT'] : []),
      ...Object.entries(game.worldEvents.completed).filter(([, count]) => count > 0).map(([id, count]) => `${worldEventTypes[id].name} // ${count} CLEARED`)
    ];
    gallery = `<h4>TROPHY GALLERY</h4><p>${trophies.join('<br>') || 'No trophies recovered yet.'}</p><p>Rival dossier comparison will appear with the later named-rivals expansion.</p>`;
  }
  return `<h4>DETERMINISTIC RESEARCH</h4><p>No random mod drops. Recover each plan once when its journal milestone is met; it never grants a weapon or weapon blueprint.</p>${research}
    <h4>RECOVERED RECORDS</h4>${records || '<p>No records recovered yet.</p>'}${gallery}`;
}
function renderScoutService() {
  const leads = game.worldEvents.events.filter(event => !event.discovered && game.discovered.has(event.biomeKey));
  const leadMarkup = leads.map(event => `<div class="quest-card"><b>${worldEventTypes[event.type].name} // SECTOR ${event.sector}</b>
    <span>SEARCH NEAR ${Math.round(event.x / 500) * 50}m, ${Math.round(event.y / 500) * 50}m // APPROXIMATE, NOT ACTIVATED</span></div>`).join('');
  let facilities = '';
  if (game.sanctuary.projects.scout >= 2) {
    facilities = `<h4>FACILITY INTELLIGENCE</h4><p>${hasContinuityKey() && game.discovered.has('void')
      ? `${epilogueClue()} // SEARCH AREA: ${Math.round(voidSearch.x / 500) * 50}m, ${Math.round(voidSearch.y / 500) * 50}m`
      : 'No facility lead available. Explore the frontier and recover campaign records.'}</p>
      <p>The four optional mini-facilities will add sector-specific leads in the next expansion stage.</p>`;
  }
  return `<h4>SCOUT INTELLIGENCE</h4><p>Dashed map circles mark approximate signals only in regions you have explored. They do not discover or activate events.</p>${leadMarkup || '<p>No new signals in explored regions right now.</p>'}${facilities}`;
}
function renderDepotService() {
  const list = game.sanctuary.resupply;
  const singleCost = isDepotWeapon(game.weapon) ? sanctuaryCostLabel(depotResupplyRecipe([{ weaponId: game.weapon, quantity: 1 }]).cost) : 'RECHARGING OR MELEE WEAPON: NO AMMO ORDER';
  let shopping = '';
  if (game.sanctuary.projects.depot >= 2) {
    const preview = depotResupplyRecipe(list);
    shopping = `<h4>SAVED RESUPPLY LIST</h4><p>Quantities are crafting batches, not individual rounds. Shared ammo costs and outputs are combined. Editing the list never changes a paid order in progress.</p>
      ${Object.keys(weaponCatalog).filter(id => isDepotWeapon(id)).map(id => {
        const quantity = list.find(order => order.weaponId === id)?.quantity || 0;
        return `<div class="sanctuary-resupply-row"><span>${weaponCatalog[id].name} // ${quantity} BATCHES</span>
          <button type="button" data-depot-adjust="${id}:-1" aria-label="Remove one ${weaponCatalog[id].name} batch" ${quantity ? '' : 'disabled'}>-</button>
          <button type="button" data-depot-adjust="${id}:1" aria-label="Add one ${weaponCatalog[id].name} batch" ${quantity >= 5 ? 'disabled' : ''}>+</button></div>`;
      }).join('')}
      <p>FULL ORDER: ${list.length ? sanctuaryCostLabel(preview.cost) : 'EMPTY'} // ${preview.time}s</p>
      <p>${Object.entries(preview.ammoOutput).map(([id, amount]) => `${ammoCatalog[id].name}: ${amount} RELOADS`).join(' // ')}</p>
      <button type="button" data-depot-order="list" ${!list.length || game.crafting ? 'disabled' : ''}>CRAFT FULL ORDER</button>`;
  }
  return `<h4>AMMUNITION RESUPPLY</h4><p>Equipped: ${weaponCatalog[game.weapon].name} // ONE CRAFTING BATCH${isDepotWeapon(game.weapon) ? ` (${ammoCatalog[weaponCatalog[game.weapon].ammo].amount} RELOADS)` : ''} // ${singleCost}</p>
    <button type="button" data-depot-order="equipped" ${!isDepotWeapon(game.weapon) || game.crafting ? 'disabled' : ''}>CRAFT EQUIPPED AMMO // 3s</button>
    ${game.crafting ? '<p>CRAFT IN PROGRESS // MATERIALS ALREADY PAID</p>' : ''}${shopping}`;
}
function renderSanctuaryServices(npcId) {
  const found = Object.entries(sanctuaryProjects).find(([, project]) => project.npc === npcId);
  if (!found) return '';
  const [id, project] = found;
  const level = game.sanctuary.projects[id];
  const next = level < 2;
  const blocked = level === 1 && !reachedSanctuarySectorThree();
  let services = '';
  if (level && id === 'workshop') services = renderWeaponModService();
  if (level && id === 'archive') services = renderArchiveService();
  if (level && id === 'scout') services = renderScoutService();
  if (level && id === 'depot') services = renderDepotService();
  if (level && id === 'medical') services = `<h4>MEDICAL BENCH</h4><p>${sanctuaryCostLabel(getStationRecipe('medkit').cost)} // 4s // MAX 5 MEDKITS</p>
    <button type="button" data-medic-craft ${game.crafting || game.stationItems.medkit >= 5 ? 'disabled' : ''}>CRAFT MEDKIT</button>`;
  return `<section class="sanctuary-service" aria-label="${project.name}"><h4>${project.name} // ${level} / 2 STAGES</h4>
    ${project.benefits.map((benefit, index) => `<p>STAGE ${index + 1}${level > index ? ' COMPLETE' : ''}: ${benefit}</p>`).join('')}
    ${next ? `<p>${sanctuaryCostLabel(sanctuaryProjectCost(id))}${blocked ? ' // EXPLORE SECTOR 3 FIRST' : ''}</p>
      <button type="button" data-sanctuary-upgrade="${id}" ${blocked || game.crafting ? 'disabled' : ''}>BUILD STAGE ${level + 1}</button>` : ''}
    ${services}</section>`;
}

// ==================== AMMO CRAFTING BATCHES ====================
const ammoCatalog = {
  pistolAmmo: { name: 'PISTOL AMMO', amount: 12, cost: { rawIron: 2, fuel: 1 } }, 
  shells: { name: 'SHOTGUN SHELLS', amount: 16, cost: { rawIron: 3, fuel: 2 } }, 
  minigunAmmo: { name: 'MINIGUN BELT', amount: 1, cost: { steel: 4, fuel: 2 } },
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

// ====================Weapons====================
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
  voidArmor: { name: 'VOID ARMOR', voidDamageReduction: .30, description: '-30% Void projectile damage' },
  hazmatSuit: { name: 'HAZMAT SUIT', hazardDamageReduction: .25, radioactiveHazardDamageReduction: 1, radioactiveBlindImmunity: true, description: '-25% hazard damage; immune to radiation damage and blinding' },
  continuityWeave: { name: 'CONTINUITY WEAVE', moveMultiplier: 1.08, voidDamageReduction: .35, contactDamageReduction: .18, description: '+8% speed, -35% Void projectile damage, -18% contact damage' }
};
const armorRecipes = {
  scoutArmor: { name: 'SCOUT ARMOR', time: 8, cost: { steelPlate: 2, fiber: 3 }, armor: 'scoutArmor' },
  reinforcedArmor: { name: 'REINFORCED ARMOR', time: 10, cost: { steelPlate: 4, stone: 3 }, armor: 'reinforcedArmor' },
  hazardArmor: { name: 'HAZARD ARMOR', time: 12, cost: { steelPlate: 6, fiber: 4, crystal: 2 }, armor: 'hazardArmor' },
  voidArmor: { name: 'VOID ARMOR', time: 18, cost: { steelPlate: 8, relic: 1, atlasCrystal: 1 }, armor: 'voidArmor' },
  hazmatSuit: { name: 'HAZMAT SUIT', time: 16, cost: { steelPlate: 8, fiber: 8, crystal: 6, atlasCrystal: 1 }, armor: 'hazmatSuit' },
  continuityWeave: { name: 'CONTINUITY WEAVE', time: 20, cost: { steelPlate: 10, fiber: 8, atlasCrystal: 2 }, armor: 'continuityWeave' }
};
function getArmorEffects() { return armorCatalog[game.armor] || {}; }
function getHazardDamageReduction(armor, hazard, biomeKey) {
  if (armor.radioactiveHazardDamageReduction && (biomeKey === 'sector-5-1'
      || hazard?.name === 'RADIOACTIVE FALLOUT' || hazard?.name === 'NEBULA RADIATION')) {
    return armor.radioactiveHazardDamageReduction;
  }
  return armor.hazardDamageReduction || 0;
}
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
  { name: 'RADIOACTIVE FALLOUT', description: 'Radioactive fallout damages the player over time.', damagePerSecond: 3 },
  { name: 'STAR COLLAPSE', description: 'A dying star radiates lethal heat.', damagePerSecond: 3 },
  { name: 'ENDLESS VOID', description: 'The infinite dark steadily consumes health.', damagePerSecond: 3.5 }
];
const hazardVisuals = ['acid-pool', 'fire-crater', 'ice-spikes', 'ash-vent', 'lightning-pylon', 'root-patch', 'glass-shards', 'frost-rift', 'bone-pile', 'ember-pool', 'spore-ring', 'gravity-well', 'storm-pylon', 'blood-pool', 'null-ice', 'wraith-rift', 'shadow-patch', 'starfire-crater', 'nebula-cloud', 'pressure-ring', 'void-rift', 'radioactive-cloud', 'star-core', 'dark-pool'];
const enemyFamilies = [
  ['MIRE CRAWLER', null, null], ['CINDER HOUND', null, null], ['ICE MAW', null, null], ['ASH STALKER', null, null],
  ['THUNDER RAM', 'STRAIGHT DASH', 'dash'], ['IRONWOOD TREANT', 'DAMAGE NEGATION', 'damage-ignore'], ['MIRAGE WRAITH', 'BURNING DEATH BURST', 'death-burn'], ['FROSTBURROWER', 'FREEZING AURA', 'slow-aura'],
  ['BONE HARVESTER', 'BONE SHARD BURST', 'damage-burst'], ['EMBER SERPENT', 'DEATHBOUND FIREBALLS', 'death-fireballs'], ['SPORE BRUTE', 'BRAMBLE SNARE', 'bramble'], ['GRAVITY LEECH', 'GRAVITY WELL', 'gravity-fields-pull'],
  ['STORM KNIGHT', 'LIGHTNING SWORD', 'storm-sword'], ['BLOOD HUNTER', 'BLOOD TRAIL', 'damage-trail'], ['NULL PHANTOM', 'NULL EXPLOSION', 'death-explosion'], ['WRAITH EATER', 'WRAITH PEST', 'spawn-pest'],
  ['DUSK STAG', 'DECAY DASH', 'decay-dash'], ['STARFIRE GOLEM', 'LINGERING FIRE', 'fire-explosion'], ['NEBULA SWARM', 'NEBULA MISSILES', 'nebula-missiles'], ['PRESSURE TITAN', 'ARC PROJECTILES', 'arc-projectiles'],
  ['VOID CRAWLER', 'RIFT PORTAL', 'rift-portal'], ['GLOWING AMALGM', 'RADIOACTIVE AURA', 'radioactive-aura'], ['STAR EATER', 'DEATH EXPLOSION', 'dead-star-explosion'], ['ENDLESS SHADE', 'DARK SPIN', 'spin-attack']
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
  { ability: 'RADIOACTIVE BOMBARDMENT', effect: 'radioactive-boss-bomb' },
  { ability: 'DEAD STAR AURA', effect: 'dead-star-boss-aura' },
  { ability: 'INFINITE CHARGE', effect: 'dark-boss-charge' }
];
const deadStarBossAuraRadius = 250;
const darkBossDashCircleRadius = 38;

const journalBossAbilities = [
  ...sectorOneMiniBossAbilities, ...sectorTwoMiniBossAbilities, ...sectorThreeMiniBossAbilities,
  ...sectorFourMiniBossAbilities, ...sectorFiveMiniBossAbilities, ...sectorSixMiniBossAbilities
];
const journalFamilyAdvice = [
  'Keep moving and avoid being surrounded.', 'Leave space to retreat between attacks.',
  'Keep a clear escape route through the pack.', 'Thin the pack before it can surround you.',
  'Sidestep its straight dash.', 'Its damage negation can interrupt an otherwise clean hit.',
  'Move away from the burning burst when it dies.', 'Fight beyond its freezing aura when possible.',
  'Leave room to dodge its bone shards.', 'Watch for fireballs even after it dies.',
  'Avoid the brambles; snares make follow-up attacks harder to escape.', 'Move away from gravity wells before they pull you into danger.',
  'Keep clear of its lightning sword.', 'Do not follow directly through its damaging trail.',
  'Move away before its death explosion.', 'Deal with its pests while keeping the owner in sight.',
  'Sidestep the dash and watch for decay.', 'Avoid lingering fire after an explosion.',
  'Watch for missiles approaching separately from the swarm.', 'Leave space to dodge arcing projectiles.',
  'A kill can open a portal that brings more enemies.', 'Keep outside the radiation aura; Hazmat blocks radiation damage.',
  'Move away from its death explosion.', 'Back away when its spin attack begins.'
];
const journalEnemyCatalog = Object.fromEntries([
  ...enemyFamilies.flatMap(([name, ability], familyIndex) => enemyVariants.map((variant, variantIndex) => ({
    id: `family-${familyIndex}-${variantIndex}`, name, variant: variant.name, boss: Boolean(variant.boss),
    habitat: sectorRegions[Math.floor(familyIndex / 4)][familyIndex % 4].name,
    color: sectorRegions[Math.floor(familyIndex / 4)][familyIndex % 4].color,
    abilities: [...new Set([variant.boss ? journalBossAbilities[familyIndex].ability : ability,
      variant.boss && familyIndex >= 4 ? ability : null].filter(Boolean))],
    advice: journalFamilyAdvice[familyIndex],
    notes: variant.boss
      ? 'This mini-boss has a dedicated ability in addition to its biome hazards. Watch its attack cues.'
      : `${variant.name} variant. ${variant.contactDamage >= 25 ? 'Heavy contact damage makes close combat especially dangerous.' : 'Control spacing rather than trading contact hits.'}`
  }))),
  ...enemyVariants.filter(variant => !variant.boss).map((variant, index) => ({
    id: `sentinel-${index}`, name: 'CONTINUITY SENTINEL', variant: variant.name, boss: false,
    habitat: 'CONTINUITY FACILITY', color: '#0a4f44', abilities: [],
    advice: 'Clear the room while keeping the route back to its entrance open.',
    notes: 'Facility doors can remain sealed until all room defenders are defeated.'
  })),
  { id: 'void-worm', name: 'VOID WORM', variant: 'COLOSSAL', habitat: 'THE VOID', color: '#8f7cff', boss: false,
    abilities: ['VOID BURROW'], advice: 'Keep moving and leave room around its body.',
    notes: 'Some worms can split into smaller threats when defeated.' },
  { id: 'void-walker', name: 'VOID WALKER', variant: 'HEAVY', habitat: 'THE VOID', color: '#8f7cff', boss: false,
    abilities: ['PROJECTILE VOLLEYS'], advice: 'Strafe its volleys rather than retreating along their path.',
    notes: 'Walkers wander until provoked. Leave space before starting a fight.' },
  { id: 'void-stalker', name: 'VOID STALKER', variant: 'PORTAL GUARDIAN', habitat: 'THE VOID', color: '#b34dff', boss: true,
    abilities: ['LUNGES', 'RIFT MARKS', 'RADIAL VOLLEYS', 'SPREAD SHOTS', 'CROSSING RIFTS', 'SHOCKWAVE'],
    advice: 'Sidestep lunges and spreads, dodge crossing lanes diagonally, and leave the shockwave circle.',
    notes: 'Three health phases. Phase two chains two attacks; phase three chains three. Counter after the chain ends.' },
  { id: 'foreman', name: 'THE FOREMAN', variant: 'CONTINUITY OVERSEER', habitat: 'CONTINUITY CRUCIBLE', color: '#ff925e', boss: true,
    abilities: ['SLAMS', 'CHARGES', 'PROJECTILE VOLLEYS', 'FLOOR LANES', 'RELAY GRID', 'HORDE REINFORCEMENTS'],
    advice: 'Watch floor warnings and purple gates. Manage reinforcements without losing sight of the boss.',
    notes: 'Three health phases escalate both attacks and reinforcement waves. Victory shuts down the remaining horde.' },
  { id: 'wraith-pest', name: 'WRAITH PEST', variant: 'PEST', habitat: 'WRAITH MOOR', color: '#a88fd0', boss: false,
    abilities: ['PURSUIT'], advice: 'Watch for pests approaching while you attack their owner.',
    notes: 'Pests can be replaced while their owner remains alive.' },
  { id: 'wraith-guard', name: 'WRAITH GUARD', variant: 'GUARD', habitat: 'WRAITH MOOR', color: '#a88fd0', boss: false,
    abilities: ['ORBITING GUARD'], advice: 'Clear the orbiting guards to expose their owner.',
    notes: 'The exposed window is temporary; the owner can replace its guards.' },
  { id: 'nebula-missile', name: 'NEBULA MISSILE', variant: 'MISSILE', habitat: 'DYING NEBULA', color: '#d58ee0', boss: false,
    abilities: ['HOMING'], advice: 'Keep distance from approaching missiles.',
    notes: 'Missiles lose health over time, but can still detonate when destroyed.' }
].map(entry => [entry.id, entry]));

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
function protectGameHealth(state) {
  let health = state.health;
  Object.defineProperty(state, 'health', {
    configurable: true,
    enumerable: true,
    get() { return health; },
    set(value) { if (!adminInvincible || !adminTestRuns.has(state)) health = value; }
  });
  return state;
}
let game = freshGame();
function freshGame() {
  const stationItems = { medkit: 1 };
  return protectGameHealth({
    active: false,
    paused: false,
    elapsedTime: 0,
    seed: Math.floor(Math.random() * 4294967296), 
    score: 0, 
    high: Number(readLocalValue('horde-high')) || 0,
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
    blueprints: {},
    armorerRep: 0,
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
    questState: { active: [], completed: [], available: [], bounties: [], armorerContractsCompleted: 0, tickTimer: 0, counters: { kills: 0, collected: 0, sectors: 0, relics: 0, travel: 0, survived: 0, heals: 0, repairs: 0, beaconRepairs: 0 } },
    campaign: { completed: [], active: null, beaconId: null },
    journal: { version: 1, enemies: {}, discoveries: [] },
    worldEvents: freshWorldEvents(),
    sanctuary: freshSanctuaryProgress(),
    weaponMods: freshWeaponMods(),
    epilogue: { guardianCleared: false, portalFound: false, firstClear: false, loot: [], dungeon: null, portalRevision: 2 },
    voidDangers: { stormTimer: 7, riftTimer: 12, strikes: [], rifts: [] },
    managerMode: false,
    enemies: [], 
    bullets: [],
    beams: [],
    projectiles: [], 
    explosions: [],
    portals: [],
    enemyTrails: [],
    toxicBossZones: [],
    radioactiveBombZones: [],
    radioactiveBlindTimer: 0,
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
  });
}
function createQuestFromTemplate(template, index = 0, bounty = false) {
  const quest = {
    id: `${template.id}-${bounty ? 'bounty' : 'story'}-${index}`,
    npcId: template.npcId || null,
    title: template.title,
    description: template.description,
    type: template.type,
    target: template.target,
    prerequisite: template.prerequisite || null,
    timeLimit: template.timeLimit || null,
    armorerRepReward: template.armorerRepReward || 0,
    amount: template.amount + (bounty ? index * 4 : 0),
    progress: 0,
    reward: bounty ? { ...template.reward, salvage: (template.reward.salvage || 0) + index * 10 } : template.reward,
    bounty,
    accepted: false,
    createdAt: Date.now()
  };
  return quest;
}
function createArmorerContract(level) {
  const template = questTemplates.find(quest => quest.npcId === 'armorer');
  return {
    ...createQuestFromTemplate(template, level),
    id: `${template.id}-armorer-${level}`,
    armorerLevel: level,
    amount: template.amount + level * 30,
    armorerRepReward: template.armorerRepReward + level * 5,
    reward: { ...template.reward, salvage: template.reward.salvage + level * 10 }
  };
}
function freshWorldEvents() {
  return { version: 1, timer: 300, nextId: 1, events: [], seen: [], completed: {} };
}
function activeWorldEvent(run = game) { return run.worldEvents.events.find(event => event.active); }
function overworldEnemyLimit() {
  const distance = Math.hypot(game.player.x, game.player.y);
  return distance < beaconRegionRadius ? 0 : Math.min(100, 5 + (getBiomeSector(distance) + 1) * 3 + Math.floor(distance / 260));
}
function worldEventSiteAllowed(x, y) {
  const distance = Math.hypot(x, y);
  if (distance < beaconRegionRadius + 850 || distance > mapRadius - 850) return false;
  if (game.beaconStations.some(station => Math.hypot(x - station.x, y - station.y) < station.radius + 850)) return false;
  if (campaignMissions.some(mission => mission.sites?.some(site => Math.hypot(x - site.x, y - site.y) < 1100))) return false;
  if (game.worldEvents.events.some(event => Math.hypot(x - event.x, y - event.y) < 1500)) return false;
  return !game.hazardZones?.some(zone => Math.hypot(x - zone.x, y - zone.y) < zone.radius + 100);
}
function generateWorldEvent() {
  for (let attempt = 0; attempt < 36; attempt++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 1200 + Math.random() * 1600;
    const x = game.player.x + Math.cos(angle) * distance;
    const y = game.player.y + Math.sin(angle) * distance;
    if (!worldEventSiteAllowed(x, y)) continue;
    const biome = getBiome(x, y);
    const types = Object.keys(worldEventTypes).filter(type => worldEventTypes[type].minSector <= biome.sector);
    const type = types[Math.floor(Math.random() * types.length)];
    game.worldEvents.events.push({
      id: game.worldEvents.nextId++, type, sector: biome.sector, biomeKey: biome.key,
      x, y, originX: x, originY: y, roamTime: 0, remaining: 480,
      discovered: false, active: false, step: 0, wave: 0, waveStarted: false,
      queue: [], delay: 0, defenseLeft: worldEventTypes[type].defense, spawnSerial: 0, ammoType: 'pistolAmmo'
    });
    return true;
  }
  return false;
}
function validateWorldEvents(run) {
  const state = run.worldEvents;
  const validType = type => Object.hasOwn(worldEventTypes, type);
  if (!state || state.version !== 1 || !Number.isSafeInteger(state.nextId) || state.nextId < 1
      || !Number.isFinite(state.timer) || state.timer < 0 || state.timer > 540
      || !Array.isArray(state.events) || state.events.length > 2
      || !Array.isArray(state.seen) || state.seen.some(type => !validType(type))
      || !state.completed || Object.getPrototypeOf(state.completed) !== Object.prototype
      || Object.entries(state.completed).some(([type, count]) => !validType(type) || !Number.isSafeInteger(count) || count < 0)) {
    throw new Error('Invalid world event state');
  }
  const ids = new Set();
  for (const event of state.events) {
    if (!event || !validType(event.type) || !Number.isSafeInteger(event.id) || event.id < 1 || event.id >= state.nextId || ids.has(event.id)
        || ![event.x, event.y, event.originX, event.originY, event.roamTime].every(Number.isFinite) || event.roamTime < 0
        || Math.hypot(event.originX, event.originY) < beaconRegionRadius + 850 || Math.hypot(event.originX, event.originY) > mapRadius - 850
        || Math.hypot(event.x - event.originX, event.y - event.originY) > 140
        || !Number.isInteger(event.sector) || event.sector < worldEventTypes[event.type].minSector || event.sector > 6
        || event.sector !== getBiomeSector(Math.hypot(event.originX, event.originY)) + 1
        || !new RegExp(`^sector-${event.sector - 1}-[0-3]$`).test(event.biomeKey)
        || !Number.isFinite(event.remaining) || event.remaining < 0 || event.remaining > 480
        || typeof event.discovered !== 'boolean' || typeof event.active !== 'boolean'
        || (event.active && !event.discovered)
        || !Number.isInteger(event.step) || event.step < 0 || event.step > (event.type === 'wreck' ? 3 : event.type === 'convoy' ? 2 : 0)
        || !Number.isInteger(event.wave) || event.wave < 0 || event.wave > 3
        || typeof event.waveStarted !== 'boolean' || !Array.isArray(event.queue) || event.queue.length > 16
        || (event.queue.length > 0 && !event.waveStarted)
        || event.queue.some(variant => !Number.isInteger(variant) || variant < (event.type === 'breach' ? -2 : 0) || variant > 3)
        || !Number.isFinite(event.delay) || event.delay < 0 || event.delay > 3
        || !Number.isFinite(event.defenseLeft) || event.defenseLeft < 0 || event.defenseLeft > worldEventTypes[event.type].defense
        || !Number.isSafeInteger(event.spawnSerial) || event.spawnSerial < 0
        || !Object.hasOwn(ammoCatalog, event.ammoType)
        || (!event.active && (event.step || event.wave || event.waveStarted || event.queue.length))) {
      throw new Error('Invalid world event encounter');
    }
    ids.add(event.id);
  }
  if (state.events.filter(event => event.active).length > 1) throw new Error('Multiple active world events');
  const active = activeWorldEvent(run);
  const world = run.epilogue.dungeon?.world ?? run;
  for (const entity of [...world.enemies, ...world.portals]) {
    if (entity?.worldEventId !== undefined && entity.worldEventId !== active?.id) throw new Error('Orphaned world event entity');
  }
}
function worldEventEnemies(event) {
  return game.enemies.filter(enemy => enemy.worldEventId === event.id && enemy.hp > 0 && !enemy.defeated);
}
function removeWorldEvent(event) {
  game.worldEvents.events = game.worldEvents.events.filter(candidate => candidate !== event);
  game.enemies = game.enemies.filter(enemy => enemy.worldEventId !== event.id);
  game.portals = game.portals.filter(portal => portal.worldEventId !== event.id);
  game.projectiles = game.projectiles.filter(projectile => projectile.followTarget?.worldEventId !== event.id);
}
function abandonWorldEvent() {
  const event = activeWorldEvent();
  if (!event || game.epilogue.dungeon) return;
  removeWorldEvent(event);
  epilogueNotice('WORLD EVENT ABANDONED // NO COMPLETION REWARD');
  renderWorldEventHud();
}
function worldEventReward(event) {
  const tier = Math.floor((event.sector - 1) / 2);
  const half = [3, 5, 7][tier];
  const resources = event.type === 'breach' ? { crystal: half, steel: half }
    : event.type === 'distress' ? { fiber: half, iron: half }
    : event.type === 'wreck' ? { steel: half, fuel: half }
    : event.type === 'horde' ? { iron: half, fuel: half } : { fuel: half };
  return { salvage: [35, 65, 100][tier], resources,
    ...(event.type === 'convoy' ? { ammo: { [event.ammoType]: tier + 2 } } : {}) };
}
function completeWorldEvent(event) {
  if (!game.worldEvents.events.includes(event) || !event.active || game.health <= 0) return;
  removeWorldEvent(event);
  game.worldEvents.completed[event.type] = (game.worldEvents.completed[event.type] || 0) + 1;
  const reward = worldEventReward(event);
  rewardQuest({ reward });
  updateInventoryUI();
  updateAmmoUI();
  epilogueNotice(`${worldEventTypes[event.type].name} COMPLETE // +${reward.salvage} SALVAGE`);
  gameLog('INFO', `World event completed: ${worldEventTypes[event.type].name}`);
}
function queueWorldEventWave(event) {
  const tier = Math.floor((event.sector - 1) / 2);
  if (event.type === 'breach') event.queue = event.wave === 0 ? [-1, -1, -1, 0, 1, 0] : [-2, 1, 1];
  else {
    const count = event.type === 'horde' ? 6 + tier * 2 : 3 + event.wave + tier;
    event.queue = Array.from({ length: count }, (_, index) =>
      event.type === 'horde' && index === 0 ? 3 : event.wave === 2 && index === 0 ? 2 : index % 2);
  }
  event.waveStarted = true;
  event.delay = 1.5;
  epilogueWarning(180);
}
function spawnWorldEventEnemy(event, variant) {
  if (game.enemies.filter(enemy => enemy.hp > 0 && !enemy.defeated).length >= overworldEnemyLimit()) return false;
  for (let attempt = 0; attempt < 12; attempt++) {
    const angle = (event.spawnSerial + attempt) * 2.4;
    const radius = variant === -1 ? 190 : 400;
    const x = event.x + Math.cos(angle) * radius;
    const y = event.y + Math.sin(angle) * radius;
    if (Math.hypot(x - game.player.x, y - game.player.y) < 160 || isInsideBeaconStation(x, y)) continue;
    let enemy;
    if (variant === -1) {
      const maxHp = 4 + event.sector;
      enemy = { x, y, r: 24, speed: 0, hp: maxHp, maxHp, familyIndex: 24, family: 'BREACH ANCHOR', variant: 'ANCHOR',
        worldEventId: event.id, worldEventAnchor: true, color: '#b794ff', boss: false, effect: null,
        contactDamage: 0, damage: 0, abilityTimer: 0, shieldTimer: 0, hitTimer: 0 };
      attachEnemyHealth(enemy);
      if (!addEnemy(enemy)) return false;
    } else {
      const [sector, index] = event.biomeKey.slice(7).split('-').map(Number);
      enemy = createBiomeEnemy(x, y, {
        ...sectorRegions[sector][index], sector: event.sector, key: event.biomeKey, worldEventId: event.id
      }, enemyVariants[variant === -2 ? 3 : variant]);
      if (!enemy) return false;
      if (variant === -2) {
        enemy.maxHp *= 1.5;
        attachEnemyHealth(enemy, enemy.maxHp);
      }
      if (variant === -2 || (event.type === 'horde' && event.spawnSerial === 0)) {
        enemy.worldEventRole = variant === -2 ? 'BREACH GUARDIAN' : 'HORDE LEADER';
      }
    }
    event.spawnSerial += attempt + 1;
    return true;
  }
  return false;
}
function worldEventControl(event) {
  if (!event.active) return { x: event.x, y: event.y, label: event.type === 'horde' ? 'INTERCEPT HORDE' : 'START EVENT' };
  if (event.waveStarted) return null;
  if (event.type === 'wreck' && event.step < 3) {
    return { x: event.x + (event.step - 1) * 110, y: event.y, label: `OPEN CARGO LOCK ${event.step + 1} / 3` };
  }
  if (event.type === 'convoy' && event.step < 2) {
    return { x: event.x + (event.step ? 100 : -100), y: event.y, label: `REPAIR COMPONENT ${event.step + 1} / 2 // PARTS ON SITE` };
  }
  return null;
}
function interactWorldEvent() {
  if (game.epilogue.dungeon) return false;
  const event = game.worldEvents.events.find(candidate => {
    const control = worldEventControl(candidate);
    return candidate.discovered && control && Math.hypot(game.player.x - control.x, game.player.y - control.y) <= stationInteractionRadius;
  });
  if (!event) return false;
  if (!event.active) {
    if (activeWorldEvent() || game.campaign.active?.defending || game.campaign.active?.scan > 0) {
      epilogueNotice('FINISH OR ABANDON THE CURRENT ENCOUNTER FIRST');
      return true;
    }
    event.active = true;
    const ammo = weaponCatalog[game.weapon].ammo;
    event.ammoType = ammo && ammoCatalog[ammo] ? ammo : 'pistolAmmo';
    if (!['wreck', 'convoy'].includes(event.type)) queueWorldEventWave(event);
    epilogueNotice(`${worldEventTypes[event.type].name} STARTED // LEAVE THE AREA TO ABANDON`);
  } else {
    event.step++;
    if (event.type === 'wreck' || event.step === 2) queueWorldEventWave(event);
  }
  renderWorldEventHud();
  return true;
}
function updateWorldEvents(dt) {
  if (!game.active || game.paused || mapOpen || game.managerMode || game.epilogue.dungeon) return;
  if (game.campaign.active?.defending || game.campaign.active?.scan > 0) {
    if (activeWorldEvent()) abandonWorldEvent();
    return;
  }
  const state = game.worldEvents;
  state.timer = Math.max(0, state.timer - dt);
  for (const event of [...state.events]) {
    if (event.active && Math.hypot(game.player.x - event.x, game.player.y - event.y) > worldEventRadius) {
      abandonWorldEvent();
      continue;
    }
    if (!event.active) {
      event.remaining = Math.max(0, event.remaining - dt);
      if (!event.remaining) {
        removeWorldEvent(event);
        if (event.discovered) gameLog('INFO', `World event expired: ${worldEventTypes[event.type].name}`);
        continue;
      }
      if (event.type === 'horde') {
        event.roamTime += dt;
        event.x = event.originX + Math.sin(event.roamTime * .15) * 120;
        event.y = event.originY + (Math.cos(event.roamTime * .15) - 1) * 60;
      }
    }
    if (!event.discovered && Math.hypot(game.player.x - event.x, game.player.y - event.y) <= 650) {
      event.discovered = true;
      if (!state.seen.includes(event.type)) state.seen.push(event.type);
      gameLog('INFO', `World event discovered: ${worldEventTypes[event.type].name}`);
    }
    if (!event.active) continue;
    if (worldEventTypes[event.type].defense && (event.type !== 'convoy' || event.step === 2)) {
      event.defenseLeft = Math.max(0, event.defenseLeft - dt);
    }
    if (event.waveStarted) {
      event.delay = Math.max(0, event.delay - dt);
      if (event.delay > 0) continue;
      while (event.queue.length && spawnWorldEventEnemy(event, event.queue[0])) event.queue.shift();
      if (event.queue.length || worldEventEnemies(event).length) continue;
      event.waveStarted = false;
      event.wave++;
    }
    if (['distress', 'convoy'].includes(event.type)) {
      if (event.type === 'convoy' && event.step < 2) continue;
      const duration = worldEventTypes[event.type].defense;
      if (event.wave < 3 && event.defenseLeft <= duration * (1 - event.wave / 3)) queueWorldEventWave(event);
      else if (event.wave === 3 && !event.defenseLeft) completeWorldEvent(event);
    } else if (event.type === 'breach') {
      if (event.wave === 1) queueWorldEventWave(event);
      else if (event.wave === 2) completeWorldEvent(event);
    } else if ((event.type === 'wreck' && event.wave === 3) || (event.type === 'horde' && event.wave === 1)) completeWorldEvent(event);
  }
  if (state.timer <= 0 && state.events.length < 2) {
    if (generateWorldEvent()) state.timer = 360 + Math.random() * 180;
    else state.timer = 30;
  }
  renderWorldEventHud();
}
function renderWorldEventHud() {
  const state = game.worldEvents;
  const event = activeWorldEvent() || state.events.filter(candidate => candidate.discovered)
    .sort((a, b) => Math.hypot(game.player.x - a.x, game.player.y - a.y) - Math.hypot(game.player.x - b.x, game.player.y - b.y))[0];
  worldEventHud.hidden = !game.active || !event || Boolean(game.epilogue.dungeon) || game.paused || mapOpen || game.managerMode;
  abandonEventButton.hidden = !event?.active;
  if (!event) return;
  const control = worldEventControl(event);
  const remaining = worldEventEnemies(event).length;
  const objective = !event.active ? `${Math.ceil(Math.hypot(game.player.x - event.x, game.player.y - event.y) / 10)}m // ${Math.ceil(event.remaining)}s LEFT`
    : event.delay > 0 ? `REINFORCEMENTS IN ${Math.ceil(event.delay)}s`
    : event.queue.length ? 'REINFORCEMENTS WAITING FOR SPACE'
    : control ? control.label
    : `${event.defenseLeft > 0 ? `DEFEND ${Math.ceil(event.defenseLeft)}s // ` : ''}${remaining} HOSTILES // WAVE ${Math.min(3, event.wave + 1)}`;
  worldEventStatus.textContent = `${worldEventTypes[event.type].name} // SECTOR ${event.sector} // ${objective}`;
}
function journalEnemyId(enemy) {
  if (enemy.voidStalker) return 'void-stalker';
  if (enemy.foreman) return 'foreman';
  if (enemy.voidWorm) return 'void-worm';
  if (enemy.voidWalker) return 'void-walker';
  if (enemy.wraithGuard) return 'wraith-guard';
  if (enemy.wraithPest) return 'wraith-pest';
  if (enemy.nebulaMissile) return 'nebula-missile';
  const variant = enemyVariants.findIndex(entry => entry.name === enemy.variant);
  if (enemy.family === 'CONTINUITY SENTINEL' && variant >= 0 && variant < 4) return `sentinel-${variant}`;
  if (Number.isInteger(enemy.familyIndex) && enemy.familyIndex >= 0 && enemy.familyIndex < 24 && variant >= 0) {
    return `family-${enemy.familyIndex}-${variant}`;
  }
  return null;
}
function recordJournalEnemy(enemy, run = game) {
  const id = journalEnemyId(enemy);
  if (!id) return null;
  return run.journal.enemies[id] ??= { kills: 0 };
}
function recordJournalDiscovery(id, run = game) {
  if (!run.journal.discoveries.includes(id)) run.journal.discoveries.push(id);
}
function syncJournalDiscoveries(run = game) {
  const state = run.epilogue;
  if (state.portalFound) recordJournalDiscovery('portal', run);
  if (state.dungeon) {
    recordJournalDiscovery('facility', run);
    for (const id of [state.dungeon.room, state.dungeon.checkpoint, ...state.dungeon.cleared]) {
      recordJournalDiscovery(`room-${id}`, run);
    }
  }
  if (state.firstClear || state.loot.length) recordJournalDiscovery('facility', run);
}
function restoreJournal(run, parsed) {
  if (Object.hasOwn(parsed, 'journal')) {
    const journal = parsed.journal;
    if (!journal || journal.version !== 1 || !journal.enemies || typeof journal.enemies !== 'object'
        || Object.getPrototypeOf(journal.enemies) !== Object.prototype
        || Array.isArray(journal.enemies) || !Array.isArray(journal.discoveries)
        || journal.discoveries.some(id => !['storm', 'rift', 'portal', 'facility'].includes(id)
          && !(typeof id === 'string' && id.startsWith('room-') && Object.hasOwn(dungeonRooms, id.slice(5))))
        || Object.entries(journal.enemies).some(([id, entry]) => !Object.hasOwn(journalEnemyCatalog, id)
          || !entry || !Number.isSafeInteger(entry.kills) || entry.kills < 0
          || (entry.legacyVictory !== undefined && typeof entry.legacyVictory !== 'boolean'))) {
      throw new Error('Invalid discovery journal data');
    }
    run.journal = {
      version: 1,
      enemies: Object.fromEntries(Object.entries(journal.enemies).map(([id, entry]) => [id, {
        kills: entry.kills, ...(entry.legacyVictory ? { legacyVictory: true } : {})
      }])),
      discoveries: [...new Set(journal.discoveries)]
    };
  } else {
    run.journal = { version: 1, enemies: {}, discoveries: [] };
    if (run.epilogue.guardianCleared) run.journal.enemies['void-stalker'] = { kills: 0, legacyVictory: true };
    if (run.epilogue.firstClear) run.journal.enemies.foreman = { kills: 0, legacyVictory: true };
  }
  syncJournalDiscoveries(run);
}
function isJournalVisible(entity) {
  const radius = entity.r ?? entity.radius ?? 0;
  return Math.abs(entity.x - game.camera.x) <= canvas.clientWidth / 2 + radius
    && Math.abs(entity.y - game.camera.y) <= canvas.clientHeight / 2 + radius;
}
function updateJournalEncounters() {
  for (const enemy of game.enemies) {
    if (!enemy.defeated && enemy.hp > 0 && isJournalVisible(enemy)) recordJournalEnemy(enemy);
  }
  if (!game.epilogue.dungeon) {
    if (game.voidDangers.strikes.some(isJournalVisible)) recordJournalDiscovery('storm');
    if (game.voidDangers.rifts.some(isJournalVisible)) recordJournalDiscovery('rift');
  }
}
function journalDiscoveryCards() {
  const cards = [];
  if (game.discovered.has('sanctuary')) cards.push({ title: 'BEACON SANCTUARY', text: 'Your protected home and expedition staging area.' });
  for (const [id, project] of Object.entries(sanctuaryProjects)) {
    const level = game.sanctuary.projects[id];
    if (level) cards.push({ title: project.name, text: `Sanctuary reconstruction // stage ${level} / 2. ${project.benefits[level - 1]}` });
  }
  sectorRegions.forEach((regions, sector) => regions.forEach((region, index) => {
    if (game.discovered.has(`sector-${sector}-${index}`)) {
      cards.push({ title: region.name, text: `Sector ${sector + 1} // ${biomeHazards[sector * 4 + index].name}` });
    }
  }));
  if (game.discovered.has('void')) cards.push({ title: 'THE VOID', text: 'Beyond the mapped frontier. Prepare supplies before travelling deeper.' });
  const descriptions = {
    storm: ['VOID STRIKES', 'Environmental hazards, not Stalker attacks. Leave the marked circle before the warning ends.'],
    rift: ['UNSTABLE RIFTS', 'Approaching a rift arms an enemy ambush. Its marked radius warns you before activation.'],
    portal: ['INDIGO ARCH', 'The Continuity Key answers here. The portal remains sealed until its guardian is defeated.'],
    facility: ['CONTINUITY FACILITY', 'An underground complex with sealed rooms, relays, caches, and safe checkpoints.']
  };
  for (const id of game.journal.discoveries) {
    if (id.startsWith('room-')) cards.push({ title: dungeonRooms[id.slice(5)].name.toUpperCase(), text: 'Visited facility room.' });
    else cards.push({ title: descriptions[id][0], text: descriptions[id][1] });
  }
  for (const type of game.worldEvents.seen) {
    cards.push({ title: worldEventTypes[type].name, text: `${worldEventTypes[type].record} // COMPLETED: ${game.worldEvents.completed[type] || 0}` });
  }
  if (game.epilogue.firstClear) cards.push({ title: 'CONTINUITY WEAVE', text: 'First-clear trophy record. The armour blueprint is available at the Arsenal.' });
  return cards;
}
function journalRecordCards() {
  const cards = campaignMissions.filter(mission => game.campaign.completed.includes(mission.id))
    .map(mission => ({ title: mission.title, text: mission.debrief }));
  for (const id of game.sanctuary.plans) cards.push({
    title: `${weaponModCatalog[id].name} RESEARCH`, text: `Plan recovered from the Archivist. ${weaponModCatalog[id].description} Craft separately for each compatible weapon at the Mechanic.`
  });
  if (hasContinuityKey()) cards.push({ title: 'CONTINUITY KEY', text: epilogueClue() });
  if (game.epilogue.loot.includes('records')) cards.push({
    title: 'RECORDS ANNEX CACHE', text: 'Recovered archive cargo: two Atlas Crystals and a relic. The cache has been claimed.'
  });
  if (game.epilogue.firstClear) cards.push({
    title: 'THE LAST SHIFT', text: 'The Foreman is silent. The facility has shut down its remaining reinforcements.'
  });
  return cards;
}
function renderJournal() {
  syncJournalDiscoveries();
  for (const tab of journalPanel.querySelectorAll('[data-journal-view]')) {
    tab.setAttribute('aria-pressed', String(tab.dataset.journalView === journalView));
  }
  if (journalView === 'enemies') {
    const entries = Object.entries(game.journal.enemies);
    journalContent.innerHTML = `<p>ENCOUNTERED: ${entries.length} // Only discovered enemies are shown. Defeat standard variants five times to complete their entry; bosses need one victory.</p>`
      + entries.map(([id, entry]) => {
        const definition = journalEnemyCatalog[id];
        const defeated = entry.kills > 0 || entry.legacyVictory;
        const complete = definition.boss ? defeated : entry.kills >= 5;
        return `<article class="quest-row journal-entry"><h3><span class="journal-marker" style="--entry-color:${definition.color}" aria-hidden="true"></span>${definition.name} // ${definition.variant}</h3>
          <span>HABITAT: ${definition.habitat}</span><small>PLAYER DEFEATS: ${entry.kills} // ${complete ? 'RESEARCH COMPLETE' : defeated ? 'COMBAT NOTES UNLOCKED' : 'ENCOUNTERED'}</small>
          ${entry.legacyVictory ? '<small>Earlier victory confirmed; historical defeat count unavailable.</small>' : ''}
          <span>ABILITIES: ${definition.abilities.join(' / ') || 'CONTACT ATTACKS'}</span>
          <p>${defeated ? definition.advice : 'Defeat this enemy to unlock combat advice.'}</p>
          <p>${complete ? definition.notes : 'Further field notes remain locked.'}</p></article>`;
      }).join('') + (!entries.length ? '<p>No enemies encountered yet. Explore to begin your field research.</p>' : '');
  } else {
    const cards = journalView === 'discoveries' ? journalDiscoveryCards() : journalRecordCards();
    journalContent.innerHTML = cards.map(card => `<article class="quest-row"><h3>${card.title}</h3><p>${card.text}</p></article>`).join('')
      || '<p>No records recovered yet. Explore and complete story missions to learn more.</p>';
  }
  journalContent.scrollTop = 0;
}
function openJournal(opener = journalButton) {
  if (!game.active || journalOpener || settingsOpener || adminPanelOpen || game.managerMode || mapOpen) return;
  journalWasPaused = game.paused;
  journalOpener = opener;
  game.paused = true;
  renderWorldEventHud();
  clearControlInput();
  ui.pause.inert = true;
  questPanel.hidden = questDialog.hidden = true;
  journalPanel.hidden = false;
  renderJournal();
  document.querySelector('#journal-close').focus();
}
function closeJournal() {
  if (!journalOpener) return;
  const opener = journalOpener;
  journalPanel.hidden = true;
  journalOpener = null;
  ui.pause.inert = false;
  game.paused = journalWasPaused;
  renderWorldEventHud();
  clearControlInput();
  opener.focus();
}
function ensureQuestState() {
  if (!game.questState) game.questState = freshGame().questState;
  const state = game.questState;
  questTemplates.forEach((template, index) => {
    if (template.npcId === 'armorer') return;
    if (state.completed.some(id => id.startsWith(`${template.id}-`))) return;
    if (!state.available.some(quest => quest.id.startsWith(`${template.id}-`))) {
      state.available.push(createQuestFromTemplate(template, index));
    }
  });
  if (!state.available.some(quest => quest.npcId === 'armorer')
      && !state.active.some(quest => quest.npcId === 'armorer')) {
    state.available.push(createArmorerContract(state.armorerContractsCompleted));
  }
  bountyTemplates.forEach((template, index) => {
    if (!state.bounties.some(quest => quest.id.startsWith(`${template.id}-`))) {
      const active = state.active.find(quest => quest.id.startsWith(`${template.id}-`));
      state.bounties.push(active ? { ...active } : createQuestFromTemplate(template, index, true));
    }
  });
}
function migrateCampaign(run) {
  const { completed, counters } = run.questState;
  const beacon = run.beaconStations.find(station => station.repaired);
  run.campaign.beaconId = beacon?.id ?? null;
  run.campaign.completed = campaignMissions.filter(mission => {
    // A repaired station is required for subsequent missions even on very old saves.
    if (mission.type === 'beacon') return Boolean(beacon);
    if (mission.type === 'survey' && campaignSurveyCount(run) >= 3) return true;
    if (mission.id === 'field-kit' && run.placedStations.length > 0) return true;
    if (mission.type === 'count' && counters[mission.counter] >= mission.amount) return true;
    return mission.legacy && completed.some(id => typeof id === 'string' && id.startsWith(`${mission.legacy}-story-`));
  }).map(mission => mission.id);
}
function validateCampaign(run) {
  const { completed, active, beaconId } = run.campaign;
  const knownIds = new Set(campaignMissions.map(mission => mission.id));
  if (!Array.isArray(completed) || completed.some(id => !knownIds.has(id)) || new Set(completed).size !== completed.length
      || (beaconId !== null && !run.beaconStations.some(station => station.id === beaconId))) {
    throw new Error('Save has invalid campaign milestones');
  }
  if (active === null) return;
  const mission = campaignMissions.find(entry => !completed.includes(entry.id));
  if (!active || active.id !== mission?.id || !Number.isFinite(active.baseline)
      || !Number.isInteger(active.site) || active.site < 0 || active.site > (mission.sites?.length ?? 1)
      || !Number.isInteger(active.wave) || active.wave < 0 || active.wave > (mission.waves?.length ?? 0)
      || !Number.isFinite(active.scan) || active.scan < 0 || !Number.isFinite(active.delay) || active.delay < 0
      || typeof active.defending !== 'boolean' || typeof active.waveStarted !== 'boolean'
      || (active.scan > 0 && (mission.type !== 'sites' || active.site >= (mission.sites?.length ?? 1)))
      || (active.defending && (mission.type !== 'defense' || active.wave === mission.waves.length))) {
    throw new Error('Save has invalid active campaign progress');
  }
}
function campaignSurveyCount(run = game) {
  return [...run.discovered].filter(key => /^sector-[0-5]-[0-3]$/.test(key)).length;
}
function currentCampaignMission() {
  return campaignMissions.find(mission => !game.campaign.completed.includes(mission.id));
}
function campaignBeacon(mission) {
  const stations = game.beaconStations;
  const assigned = stations.find(station => station.id === game.campaign.beaconId);
  const repaired = stations.find(station => station.repaired);
  return assigned?.repaired ? assigned : repaired || (mission?.type === 'beacon' ? assigned || stations[0] : null);
}
function campaignReady(mission) {
  const active = game.campaign.active;
  if (!mission || active?.id !== mission.id) return false;
  if (mission.type === 'count') return game.questState.counters[mission.counter] - active.baseline >= mission.amount;
  if (mission.type === 'survey') return campaignSurveyCount() >= 3;
  if (mission.type === 'beacon') return Boolean(campaignBeacon(mission)?.repaired);
  if (mission.type === 'sites') return active.site >= (mission.sites?.length ?? 1);
  if (mission.type === 'defense') return active.wave >= mission.waves.length;
  return mission.type === 'talk';
}
function campaignFieldTarget(mission = currentCampaignMission()) {
  const active = game.campaign.active;
  if (!mission || active?.id !== mission.id || campaignReady(mission)) return null;
  if (mission.sites) return mission.sites[active.site];
  if (mission.type === 'beacon' || mission.type === 'defense' || mission.beaconSite) {
    const station = campaignBeacon(mission);
    if (!station) return null;
    return { x: station.x, y: station.y, radius: 32, ...(mission.beaconSite || { label: mission.type === 'defense' ? 'Beacon defense console' : 'Beacon repair console' }) };
  }
  return null;
}
function campaignTargetDistance(target) {
  return Math.hypot(game.player.x - target.x, game.player.y - target.y);
}
function campaignInteractionRadius(target) {
  return target.radius ?? stationInteractionRadius;
}
function campaignStatus(mission = currentCampaignMission()) {
  if (!mission) return 'CAMPAIGN COMPLETE // NETWORK ONLINE';
  const npc = questNpcById(mission.npcId).name;
  const active = game.campaign.active;
  if (!active) return `Talk to the ${npc}.`;
  if (campaignReady(mission)) return `Return to the ${npc}.`;
  if (mission.type === 'count') return `${mission.objective} ${game.questState.counters[mission.counter] - active.baseline} / ${mission.amount}`;
  if (mission.type === 'survey') return `${mission.objective} ${campaignSurveyCount()} / 3`;
  const target = campaignFieldTarget(mission);
  if (target && active.scan > 0) return `Tuning ${target.label} // ${Math.ceil(active.scan)}s remaining`;
  if (active.defending) {
    const remaining = game.enemies.filter(enemy => enemy.campaignEncounter === mission.id && enemy.hp > 0).length;
    return remaining
      ? `Wave ${active.wave + 1} / ${mission.waves.length} // ${remaining} remaining`
      : `Wave ${active.wave + 1} / ${mission.waves.length} incoming`;
  }
  if (!target) return mission.objective;
  const bearing = Math.atan2(target.y - game.player.y, target.x - game.player.x);
  const direction = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'][(Math.round(bearing / (Math.PI / 4)) + 8) % 8];
  const distance = campaignTargetDistance(target);
  return `${target.label} // ${distance <= campaignInteractionRadius(target) ? `${interactBindingLabel()} to interact` : `${direction} ${Math.ceil(distance / 10)}m`}`;
}
function activeQuestCount() {
  return game.questState.active.length + Number(Boolean(game.campaign.active));
}
function acceptCampaign(id) {
  const mission = currentCampaignMission();
  if (mission?.id !== id || game.campaign.active || getNearbyQuestSource() !== mission.npcId) return;
  if (activeQuestCount() >= 3) {
    showQuestMessage('QUEST CAPACITY FULL // COMPLETE OR ABANDON AN ACTIVE QUEST');
    return;
  }
  game.campaign.active = { id, baseline: game.questState.counters[mission.counter] || 0, site: 0, scan: 0, wave: 0, defending: false, waveStarted: false, delay: 0 };
  renderQuestDialog(mission.npcId);
  renderQuestHud();
}
function completeCampaign(id) {
  const mission = currentCampaignMission();
  if (mission?.id !== id || !campaignReady(mission) || getNearbyQuestSource() !== mission.npcId) return;
  if (mission.type === 'beacon') game.campaign.beaconId = campaignBeacon(mission).id;
  game.campaign.completed.push(id);
  if (id === 'record') {
    if (!game.epilogue.guardianCleared && !game.enemies.some(enemy => enemy.voidStalker && enemy.hp > 0)) game.enemies.push(createVoidStalker());
    epilogueNotice('CONTINUITY KEY RECOVERED // CHECK THE QUEST LOG FOR THE ARCHIVIST’S CLUE');
  }
  game.campaign.active = null;
  rewardQuest(mission);
  gameLog('INFO', `Campaign completed: ${mission.title}`);
  updateInventoryUI();
  updateAmmoUI();
  renderQuestDialog(mission.npcId);
  renderQuestHud();
}
function campaignDialogMarkup(sourceId) {
  const mission = currentCampaignMission();
  const past = mission ? campaignMissions.slice(0, campaignMissions.indexOf(mission)) : campaignMissions;
  const debrief = past.filter(entry => entry.npcId === sourceId).at(-1);
  const keyReport = sourceId === 'archivist' && hasContinuityKey() ? `<p class="campaign-debrief">${epilogueClue()}</p>` : '';
  const lastReport = (debrief ? `<p class="campaign-debrief">${debrief.debrief}</p>` : '') + keyReport;
  if (mission?.npcId !== sourceId) return lastReport;
  const active = game.campaign.active;
  const action = !active
    ? `<button type="button" data-campaign-accept="${mission.id}">ACCEPT MAIN QUEST</button>`
    : campaignReady(mission) ? `<button type="button" data-campaign-complete="${mission.id}">TURN IN MAIN QUEST</button>` : '';
  return `${lastReport}<div class="quest-card campaign-card"><small>THE LAST SIGNAL // CHAPTER ${mission.chapter + 1}: ${campaignChapters[mission.chapter]}</small><b>${mission.title}</b><span>${mission.brief}</span><small>${active ? campaignStatus(mission) : mission.objective}</small>${action}</div>`;
}
function interactCampaignSite() {
  const mission = currentCampaignMission();
  const target = campaignFieldTarget(mission);
  if (!target || campaignTargetDistance(target) > campaignInteractionRadius(target)) return false;
  const active = game.campaign.active;
  if (mission.type === 'beacon') {
    const station = campaignBeacon(mission);
    if (game.crafting?.recipeKey === `repairBeacon:${station.id}`) return false;
    finishBeaconRepair(station);
    game.campaign.beaconId = station.id;
    ui.stationOutput.textContent = 'FIELD KIT INSTALLED // BEACON ONLINE';
  } else if (mission.type === 'defense') {
    if (!active.defending) {
      active.defending = true;
      active.delay = 2;
    }
  } else if (target.scan) {
    if (!active.scan) active.scan = target.scan;
  } else {
    active.site++;
  }
  renderQuestHud();
  return true;
}
function updateCampaign(dt) {
  const mission = currentCampaignMission();
  const active = game.campaign.active;
  if (!active || (!active.scan && !active.defending)) return;
  const target = campaignFieldTarget(mission);
  if (!target) return;
  const distance = campaignTargetDistance(target);
  if (active.scan > 0) {
    const inRange = distance <= campaignInteractionRadius(target);
    active.scan = inRange ? Math.max(0, active.scan - dt) : 0;
    if (inRange && !active.scan) {
      active.site++;
      ui.stationOutput.textContent = `SCAN LOCKED // ${target.label.toUpperCase()}`;
      renderQuestHud();
    }
  } else if (distance > campaignDefenseRadius) {
    game.enemies = game.enemies.filter(enemy => enemy.campaignEncounter !== mission.id);
    active.defending = false;
    active.waveStarted = false;
    active.wave = 0;
    active.delay = 0;
    ui.stationOutput.textContent = 'TRANSMISSION LOST // RETURN TO THE CONSOLE TO RETRY';
    renderQuestHud();
  } else if (!game.enemies.some(enemy => enemy.campaignEncounter === mission.id && enemy.hp > 0)) {
    if (active.waveStarted) {
      active.wave++;
      active.waveStarted = false;
      active.defending = active.wave < mission.waves.length;
      active.delay = 3;
      renderQuestHud();
      return;
    }
    active.delay = Math.max(0, active.delay - dt);
    if (active.delay > 0) return;
    spawnCampaignWave(mission, target, active.wave);
    active.waveStarted = true;
    renderQuestHud();
  }
}
function spawnCampaignWave(mission, target, wave) {
  const count = mission.waves[wave];
  for (let index = 0; index < count; index++) {
    const angle = index * Math.PI * 2 / count + wave * .6;
    const x = target.x + Math.cos(angle) * 360;
    const y = target.y + Math.sin(angle) * 360;
    const biome = getBiome(x, y);
    const variant = enemyVariants[wave === 2 && index < 2 ? 2 : index % 2];
    const enemy = createBiomeEnemy(x, y, { ...biome, enemyFamily: { name: 'SIGNAL HORDE', ability: null, effect: null } }, variant);
    if (enemy) enemy.campaignEncounter = mission.id;
  }
}
function questNpcById(id) { return sanctuaryNpcDefinitions.find(npc => npc.id === id) || null; }
const questCounterKeys = { kill: 'kills', collect: 'collected', explore: 'sectors', survive: 'survived', travel: 'travel', relic: 'relics', heal: 'heals', repair: 'repairs', repairBeacon: 'beaconRepairs' };
function questObjectiveTotal(quest, state = game.questState) {
  return state.counters[questCounterKeys[quest.type]] || 0;
}
function questObjectiveProgress(quest) {
  return Math.max(0, questObjectiveTotal(quest) - quest.baseline);
}
function updateQuestProgress(type, amount = 1) {
  ensureQuestState();
  const counters = game.questState.counters;
  if (type === 'kill') counters.kills += amount;
  if (type === 'collect') counters.collected += amount;
  if (type === 'explore') counters.sectors += amount;
  if (type === 'survive') counters.survived += amount;
  if (type === 'travel') counters.travel += amount;
  if (type === 'relic') counters.relics += amount;
  if (type === 'heal') counters.heals += amount;
  if (type === 'repair') counters.repairs += amount;
  if (type === 'repairBeacon') counters.beaconRepairs += amount;
  game.questState.active.forEach(quest => {
    quest.progress = Math.min(quest.amount, questObjectiveProgress(quest));
  });
  renderQuestHud();
}
function expireTimedQuests(dt) {
  game.questState.active.forEach(quest => {
    if (quest.timeLimit) quest.remainingSeconds = Math.max(0, quest.remainingSeconds - dt);
  });
  const expired = game.questState.active.filter(quest => quest.timeLimit && quest.remainingSeconds <= 0);
  if (!expired.length) return;
  game.questState.active = game.questState.active.filter(quest => !expired.includes(quest));
  expired.forEach(quest => {
    gameLog('INFO', `Quest expired: ${quest.title}`);
  });
  ui.stationOutput.textContent = `QUEST EXPIRED // ${expired.map(quest => quest.title).join(', ')}`;
  if (!questDialog.hidden && questDialog.dataset.sourceId) renderQuestDialog(questDialog.dataset.sourceId);
  if (!questPanel.hidden) showQuestPanel();
  renderQuestHud();
}
function showQuestMessage(message) {
  let feedback = questDialog.querySelector('.quest-feedback');
  if (!feedback) {
    feedback = document.createElement('p');
    feedback.className = 'quest-feedback';
    feedback.setAttribute('role', 'status');
    questDialog.append(feedback);
  }
  feedback.textContent = message;
}
function acceptQuest(id) {
  ensureQuestState();
  if (activeQuestCount() >= 3) {
    showQuestMessage('QUEST CAPACITY FULL // COMPLETE OR ABANDON AN ACTIVE QUEST');
    return;
  }
  const offered = [...game.questState.available, ...game.questState.bounties].find(candidate => candidate.id === id);
  if (!offered || game.questState.active.some(candidate => candidate.id === id)) return;
  if (offered.prerequisite && !game.questState.completed.some(completed => completed.startsWith(offered.prerequisite))) return;
  const quest = { ...offered, accepted: true, progress: 0, baseline: questObjectiveTotal(offered) };
  if (quest.timeLimit) quest.remainingSeconds = quest.timeLimit;
  delete quest.expiresAt;
  game.questState.active.push(quest);
  renderQuestDialog(questNpcById(quest.npcId)?.id || 'bountyBoard');
  renderQuestHud();
}
function rewardQuest(quest) {
  const reward = quest.reward || {};
  game.salvage += reward.salvage || 0;
  game.banked += reward.banked || 0;
  game.relics += reward.relics || 0;
  game.atlasCrystals += reward.atlasCrystals || 0;
  Object.entries(reward.resources || {}).forEach(([key, amount]) => { game.vault[key] = (game.vault[key] || 0) + amount; });
  Object.entries(reward.ammo || {}).forEach(([key, amount]) => { game.ammoReserve[key] = (game.ammoReserve[key] || 0) + amount; });
  if (reward.medkits) game.stationItems.medkit = Math.min(5, (game.stationItems.medkit || 0) + reward.medkits);
}
function completeQuest(id) {
  const index = game.questState.active.findIndex(quest => quest.id === id);
  if (index < 0) return;
  const quest = game.questState.active[index];
  if (quest.progress < quest.amount) return;
  rewardQuest(quest);
  if (quest.npcId === 'armorer') game.armorerRep += quest.armorerRepReward;
  game.questState.active.splice(index, 1);
  game.questState.completed.push(quest.id);
  if (quest.bounty) {
    const template = bountyTemplates.find(candidate => quest.id.startsWith(candidate.id));
    const nextIndex = Math.min(9, (Number(quest.id.split('-').pop()) || 0) + 1);
    game.questState.bounties = game.questState.bounties.filter(candidate => candidate.id !== id);
    if (template) game.questState.bounties.push(createQuestFromTemplate(template, nextIndex, true));
  } else {
    game.questState.available = game.questState.available.filter(candidate => candidate.id !== id);
    if (quest.npcId === 'armorer') {
      game.questState.armorerContractsCompleted++;
      game.questState.available.push(createArmorerContract(game.questState.armorerContractsCompleted));
    }
  }
  writeLegacyValue('horde-vault', JSON.stringify(game.vault));
  writeLegacyValue('horde-relics', game.relics);
  writeLegacyValue('horde-atlas-crystals', game.atlasCrystals);
  updateInventoryUI();
  updateAmmoUI();
  renderQuestDialog(quest.npcId || 'bountyBoard');
  renderQuestHud();
}
function renderQuestHud() {
  if (!questHud || !game.questState) return;
  const mission = currentCampaignMission();
  const campaign = `<div class="campaign-tracker"><strong>THE LAST SIGNAL${mission ? ` // CHAPTER ${mission.chapter + 1}` : ''}</strong>${mission ? `<b>${mission.title}</b>` : ''}<span>${campaignStatus(mission)}</span></div>`;
  const sideQuests = game.questState.active.map(quest => `<div class="quest-hud-item"><span>${quest.title}</span><b>${getQuestProgressLabel(quest)}</b></div>`).join('');
  questHud.innerHTML = campaign + (sideQuests ? `<strong>OTHER ACTIVE QUESTS</strong>${sideQuests}` : '');
}
function getQuestProgressLabel(quest) {
  const progress = `${Math.floor(Math.min(quest.progress, quest.amount))} / ${quest.amount}`;
  return quest.timeLimit ? `${progress} // ${Math.ceil(quest.remainingSeconds)}s LEFT` : progress;
}
function showQuestPanel() {
  if (!questPanel) return;
  questPanel.hidden = false;
  const mission = currentCampaignMission();
  questPanel.innerHTML = `<div class="quest-panel-inner"><strong>QUEST LOG // ${activeQuestCount()} / 3 ACTIVE</strong><div class="quest-row campaign-card"><b>THE LAST SIGNAL // ${game.campaign.completed.length} / ${campaignMissions.length} MISSIONS</b>${mission ? `<span>Chapter ${mission.chapter + 1}: ${campaignChapters[mission.chapter]} / ${mission.title}</span><span>${mission.objective}</span>` : ''}<small>${campaignStatus(mission)}</small></div>${game.questState.active.map(quest => `<div class="quest-row"><b>${quest.title}</b><span>${quest.description}</span><small>${getQuestProgressLabel(quest)}</small><button data-quest-abandon="${quest.id}">ABANDON</button></div>`).join('') || '<p>No other active quests.</p>'}<button data-quest-close>CLOSE</button></div>`;
  if (hasContinuityKey()) questPanel.querySelector('.quest-panel-inner').insertAdjacentHTML('afterbegin', `<div class="quest-row campaign-card"><b>EPILOGUE // CONTINUITY KEY</b><span>${epilogueClue()}</span><small>${epilogueObjective()}</small></div>`);
}
function renderQuestDialog(sourceId) {
  if (!questDialog) return;
  const isBoard = sourceId === 'bountyBoard';
  const npc = questNpcById(sourceId);
  const sourceName = isBoard ? 'BOUNTY BOARD' : npc?.name || 'SANCTUARY CONTACT';
  const available = (isBoard ? game.questState.bounties : game.questState.available.filter(quest => quest.npcId === sourceId))
    .filter(quest => !quest.prerequisite || game.questState.completed.some(completed => completed.startsWith(quest.prerequisite)))
    .filter(quest => !game.questState.active.some(active => active.id === quest.id));
  const active = game.questState.active.filter(quest => (isBoard ? quest.bounty : quest.npcId === sourceId));
  questDialog.hidden = false;
  questDialog.dataset.sourceId = sourceId;
  questDialog.innerHTML = `<div class="quest-dialog-inner"><button type="button" class="quest-close" data-quest-close>×</button><strong>${sourceName}</strong><p>${isBoard ? 'Three contracts are pinned. Return here when the work is done.' : npc.lines[Math.floor(Math.random() * npc.lines.length)]}</p>${campaignDialogMarkup(sourceId)}${active.map(quest => `<div class="quest-card"><b>${quest.title}</b><span>${quest.description}</span><small>${getQuestProgressLabel(quest)}${quest.npcId === 'armorer' ? ` // +${quest.armorerRepReward} REP` : ''}${quest.progress >= quest.amount ? ' // READY TO TURN IN' : ''}</small>${quest.progress >= quest.amount ? `<button type="button" data-quest-complete="${quest.id}">TURN IN</button>` : ''}</div>`).join('')}${available.map(quest => `<div class="quest-card"><b>${quest.title}</b><span>${quest.description}</span><small>REWARD: ${quest.reward.salvage || 0} SALVAGE${quest.npcId === 'armorer' ? ` // +${quest.armorerRepReward} REP` : ''}</small><button type="button" data-quest-accept="${quest.id}">ACCEPT</button></div>`).join('') || '<p>NO OTHER QUESTS AVAILABLE.</p>'}</div>${sourceId === 'armorer' ? renderBlueprintShop() : ''}`;
  questDialog.insertAdjacentHTML('beforeend', renderSanctuaryServices(sourceId));
}
function getNearbyQuestSource() {
  const positions = getSanctuaryNpcPositions();
  const npc = sanctuaryNpcDefinitions
    .map((candidate, index) => {
      const position = positions[index];
      return { ...candidate, ...position, distance: Math.hypot(game.player.x - position.x, game.player.y - position.y) };
    })
    .filter(candidate => candidate.distance <= stationInteractionRadius)
    .sort((a, b) => a.distance - b.distance)[0];
  if (npc) return npc.id;
  const board = game.placedStations.find(station => station.type === 'bountyBoard' && Math.hypot(game.player.x - station.x, game.player.y - station.y) <= stationInteractionRadius);
  return board ? 'bountyBoard' : null;
}
ui.high.textContent = String(game.high).padStart(6, '0');
renderWeaponBar();
function resize() { const ratio = window.devicePixelRatio || 1; canvas.width = canvas.clientWidth * ratio; canvas.height = canvas.clientHeight * ratio; ctx.setTransform(ratio, 0, 0, ratio, 0, 0); if (!game.active) game.player = { x: canvas.clientWidth / 2, y: canvas.clientHeight / 2, angle: 0 }; resizeMapCanvas(); }
window.addEventListener('resize', resize); resize();
function validBinding(key) {
  return typeof key === 'string' && (/^mouse[0-4]$/.test(key) ||
    /^(arrow(up|down|left|right)|shift|enter|backspace|delete|home|end|page(up|down)|insert)$/.test(key) ||
    (key.length === 1 && !/[\u0000-\u001f\u007f]/.test(key)));
}
function loadSettings() {
  const defaults = defaultSettings();
  try {
    const raw = localStorage.getItem(settingsKey);
    if (raw === null) return defaults;
    const data = JSON.parse(raw);
    const entries = Object.keys(defaults.bindings).map(action => [action, data?.bindings?.[action] ?? defaults.bindings[action]]);
    if (data?.bindings?.journal === undefined && entries.some(([action, key]) => action !== 'journal' && key === defaults.bindings.journal)) {
      entries.find(([action]) => action === 'journal')[1] = [...'babcdefghijklmnopqrstuvwxyz']
        .find(key => !entries.some(([action, bound]) => action !== 'journal' && bound === key));
    }
    if (!entries.every(([, key]) => validBinding(key)) || new Set(entries.map(([, key]) => key)).size !== entries.length) {
      throw new Error('Invalid or duplicate control bindings');
    }
    return {
      bindings: Object.fromEntries(entries),
      reducedEffects: data?.reducedEffects === true,
      crosshairColor: /^#[0-9a-f]{6}$/i.test(data?.crosshairColor) ? data.crosshairColor : defaults.crosshairColor,
      crosshairSize: [16, 22, 32].includes(data?.crosshairSize) ? data.crosshairSize : defaults.crosshairSize
    };
  } catch (error) {
    settingsLoadError = true;
    gameLog('WARN', 'Unable to load settings; defaults will be used', error.message);
    return defaults;
  }
}
function bindingLabel(key) {
  if (key === ' ') return 'Space';
  if (key.startsWith('mouse')) return `Mouse ${Number(key.slice(5)) + 1}`;
  if (key.startsWith('arrow')) return `${key.slice(5).toUpperCase()} ARROW`;
  return key.toUpperCase();
}
function interactBindingLabel() { return bindingLabel(settings.bindings.interact); }
function actionForBinding(key) {
  return Object.keys(settings.bindings).find(action => settings.bindings[action] === key);
}
function clearControlInput() {
  for (const action of Object.keys(keys)) keys[action] = false;
  heldKeyboardActions.clear();
  pointer.down = false;
  game.radBeamActive = false;
}
function applyDisplaySettings() {
  gameShell.style.setProperty('--crosshair-color', settings.crosshairColor);
  gameShell.style.setProperty('--crosshair-size', `${settings.crosshairSize}px`);
}
function updateSettings(next) {
  settings = next;
  applyDisplaySettings();
  try {
    localStorage.setItem(settingsKey, JSON.stringify(settings));
    settingsLoadError = false;
    settingsStatus.textContent = 'SETTINGS SAVED';
  } catch (error) {
    settingsStatus.textContent = 'APPLIED FOR THIS SESSION // BROWSER STORAGE UNAVAILABLE';
    gameLog('WARN', 'Unable to save settings', error.message);
  }
}
function renderSettings() {
  settingsBindings.innerHTML = '';
  for (const [action, [label]] of Object.entries(controlDefaults)) {
    const row = document.createElement('div');
    const name = document.createElement('span');
    const button = document.createElement('button');
    name.textContent = label;
    button.type = 'button';
    button.className = 'menu-button';
    button.dataset.bindAction = action;
    button.textContent = bindingCapture === action ? 'PRESS INPUT...' : bindingLabel(settings.bindings[action]);
    button.setAttribute('aria-pressed', String(bindingCapture === action));
    button.setAttribute('aria-label', `${label}: ${button.textContent}`);
    row.append(name, button);
    settingsBindings.append(row);
  }
  settingsSwap.hidden = !bindingConflict;
  effectsInput.checked = settings.reducedEffects;
  colorInput.value = settings.crosshairColor;
  sizeInput.value = String(settings.crosshairSize);
}
function focusBinding(action) {
  settingsBindings.querySelector(`[data-bind-action="${action}"]`)?.focus();
}
function openSettings(opener) {
  settingsOpener = opener;
  clearControlInput();
  (game.paused ? ui.pause : ui.start).inert = true;
  settingsPanel.classList.remove('hidden');
  settingsStatus.textContent = settingsLoadError ? 'SAVED SETTINGS UNAVAILABLE // USING DEFAULTS' : '';
  renderSettings();
  document.querySelector('#settings-back').focus();
}
function closeSettings() {
  bindingCapture = bindingConflict = null;
  settingsPanel.classList.add('hidden');
  ui.pause.inert = ui.start.inert = false;
  clearControlInput();
  settingsOpener?.focus();
  settingsOpener = null;
}
function captureBinding(key) {
  if (!validBinding(key)) {
    settingsStatus.textContent = 'THAT INPUT IS RESERVED OR UNSUPPORTED // TRY ANOTHER';
    return;
  }
  const action = bindingCapture;
  bindingCapture = null;
  const other = actionForBinding(key);
  if (other && other !== action) {
    bindingConflict = { action, other, key };
    settingsStatus.textContent = `${bindingLabel(key)} IS USED FOR ${controlDefaults[other][0]} // SWAP TO CONFIRM`;
  } else {
    updateSettings({ ...settings, bindings: { ...settings.bindings, [action]: key } });
  }
  renderSettings();
  if (bindingConflict) settingsSwap.focus();
  else focusBinding(action);
}
function handleControlPress(action) {
  if (!action || !game.active || game.paused) return false;
  const held = keys[action];
  keys[action] = true;
  if (held) return true;
  if ((action === 'interact' || hasContinuityKey()) && !epilogueAudio) enableEpilogueAudio();
  if (action === 'map') setMapOpen(true);
  else if (action === 'zoom') cycleTacticalMapZoom();
  else if (action === 'interact') toggleStation();
  else if (action === 'quests') showQuestPanel();
  else if (action === 'journal') openJournal();
  else if (action === 'fire' || action === 'fireAlt') shoot();
  else if (action === 'medkit') useMedkit();
  else if (action === 'pulse') pulse();
  else if (action.startsWith('slot')) switchWeapon(Number(action.slice(4)));
  return true;
}
function isFiring() { return pointer.down || keys.fire || keys.fireAlt; }
window.addEventListener('keydown', event => {
  const key = event.key.toLowerCase();
  const action = actionForBinding(key);
  if (adminPanelOpen) {
    if (event.key === 'Escape' && !event.repeat) {
      event.preventDefault();
      closeAdminPanel();
    }
    return;
  }
  if (settingsOpener) {
    if (event.key === 'Escape') {
      event.preventDefault();
      if (event.repeat) return;
      if (bindingCapture || bindingConflict) {
        const previous = bindingCapture || bindingConflict.action;
        bindingCapture = bindingConflict = null;
        settingsStatus.textContent = 'BINDING CHANGE CANCELED';
        renderSettings();
        focusBinding(previous);
      } else closeSettings();
    } else if (bindingCapture) {
      event.preventDefault();
      if (!event.repeat) {
        if (event.ctrlKey || event.altKey || event.metaKey) settingsStatus.textContent = 'USE A SINGLE KEY OR MOUSE BUTTON';
        else captureBinding(key);
      }
    }
    return;
  }
  if (journalOpener) {
    if (event.key === 'Escape' || action === 'journal') {
      event.preventDefault();
      if (!event.repeat) closeJournal();
    } else if (event.key === 'Tab') {
      const controls = [...journalPanel.querySelectorAll('button, [tabindex="0"]')];
      const index = controls.indexOf(document.activeElement);
      if (controls.length) {
        event.preventDefault();
        controls[(index + (event.shiftKey ? -1 : 1) + controls.length) % controls.length].focus();
      }
    } else if (action && !['Enter', ' '].includes(event.key)) event.preventDefault();
    return;
  }
  if (game.managerMode) {
    if (event.key === 'Escape' && !event.repeat) exitManagersTable();
    event.preventDefault();
    return;
  }
  if (mapOpen) {
    event.preventDefault();
    if (!event.repeat && (action === 'map' || event.key === 'Escape')) {
      setMapOpen(false);
    }
    return;
  }
  if (event.key === 'Escape') {
    event.preventDefault();
    if (!event.repeat) {
      if (questDialog && !questDialog.hidden) {
        questDialog.hidden = true;
        return;
      }
      if (questPanel && !questPanel.hidden) {
        questPanel.hidden = true;
        return;
      }
      togglePause();
    }
    return;
  }
  if (event.key === adminUnlockSequence[adminUnlockIndex]) {
    adminUnlockIndex++;
    if (adminUnlockIndex === adminUnlockSequence.length) {
      adminUnlockIndex = 0;
      const code = window.prompt('ADMIN ACCESS CODE');
      if (code === 'iAmAdmin') { adminMode = true; refreshAdminRunUI(); gameLog('INFO', 'Admin test lab unlocked in Pause'); }
      else { gameLog('WARN', 'Admin access denied'); }
    }
  } else { adminUnlockIndex = event.key === adminUnlockSequence[0] ? 1 : 0; }
  if (!event.ctrlKey && !event.metaKey && !event.altKey && action && game.active && !game.paused) {
    event.preventDefault();
    if (!event.repeat) {
      heldKeyboardActions.set(event.code || key, action);
      handleControlPress(action);
    }
  }
});
questDialog?.addEventListener('click', event => {
  event.preventDefault();
  event.stopPropagation();
  const target = event.target instanceof Element
    ? event.target.closest('[data-campaign-accept], [data-campaign-complete], [data-quest-accept], [data-quest-complete], [data-buy-blueprint], [data-quest-close], [data-sanctuary-upgrade], [data-mod-weapon], [data-mod-craft], [data-mod-equip], [data-mod-remove], [data-research-claim], [data-medic-craft], [data-depot-adjust], [data-depot-order]')
    : null;
  if (!target) return;
  if (target.dataset.campaignAccept) acceptCampaign(target.dataset.campaignAccept);
  if (target.dataset.campaignComplete) completeCampaign(target.dataset.campaignComplete);
  if (target.dataset.questAccept) acceptQuest(target.dataset.questAccept);
  if (target.dataset.questComplete) completeQuest(target.dataset.questComplete);
  if (target.dataset.buyBlueprint) buyBlueprint(target.dataset.buyBlueprint);
  if (target.dataset.sanctuaryUpgrade) upgradeSanctuaryProject(target.dataset.sanctuaryUpgrade);
  if (target.dataset.modWeapon && canUseSanctuaryService('mechanic')) {
    questDialog.dataset.modWeapon = target.dataset.modWeapon;
    renderQuestDialog('mechanic');
  }
  if (target.dataset.modCraft) craftWeaponMod(questDialog.dataset.modWeapon, target.dataset.modCraft);
  if (target.dataset.modEquip) equipWeaponMod(questDialog.dataset.modWeapon, weaponModCatalog[target.dataset.modEquip]?.slot, target.dataset.modEquip);
  if (target.dataset.modRemove) equipWeaponMod(questDialog.dataset.modWeapon, target.dataset.modRemove, null);
  if (target.dataset.researchClaim) claimModResearch(target.dataset.researchClaim);
  if (target.hasAttribute('data-medic-craft') && canUseSanctuaryService('medic') && game.sanctuary.projects.medical) {
    craftItem('medkit', 1);
    renderQuestDialog('medic');
    showQuestMessage(ui.stationOutput.textContent);
  }
  if (target.dataset.depotAdjust) {
    const [weaponId, delta] = target.dataset.depotAdjust.split(':');
    adjustResupplyOrder(weaponId, Number(delta));
  }
  if (target.dataset.depotOrder) placeResupplyOrder(target.dataset.depotOrder === 'equipped');
  if (target.hasAttribute('data-quest-close')) questDialog.hidden = true;
});
questPanel?.addEventListener('click', event => {
  const target = event.target.closest('[data-quest-abandon], [data-quest-close]');
  if (!target) return;
  if (target.dataset.questAbandon) {
    game.questState.active = game.questState.active.filter(quest => quest.id !== target.dataset.questAbandon);
    renderQuestHud();
    showQuestPanel();
  } else if (target.hasAttribute('data-quest-close')) questPanel.hidden = true;
});
journalButton.addEventListener('click', () => openJournal(journalButton));
pauseJournalButton.addEventListener('click', () => openJournal(pauseJournalButton));
document.querySelector('#quest-log-button').addEventListener('click', () => {
  if (game.active && !game.paused) showQuestPanel();
});
document.querySelector('#journal-close').addEventListener('click', closeJournal);
abandonEventButton.addEventListener('click', () => {
  if (game.active && !game.paused && !mapOpen && !game.managerMode) abandonWorldEvent();
});
journalPanel.addEventListener('click', event => {
  const view = event.target.closest('[data-journal-view]')?.dataset.journalView;
  if (!['enemies', 'discoveries', 'records'].includes(view)) return;
  journalView = view;
  renderJournal();
});
window.addEventListener('keyup', event => {
  const code = event.code || event.key.toLowerCase();
  const action = heldKeyboardActions.get(code);
  heldKeyboardActions.delete(code);
  if (action && ![...heldKeyboardActions.values()].includes(action)) keys[action] = false;
});
window.addEventListener('blur', clearControlInput);
window.addEventListener('pointerdown', event => {
  suppressSettingsClick = false;
  if (settingsOpener && bindingCapture && event.pointerType !== 'touch') {
    event.preventDefault();
    event.stopPropagation();
    suppressSettingsClick = true;
    captureBinding(`mouse${event.button}`);
  } else if (mapOpen && event.button !== 0 && actionForBinding(`mouse${event.button}`) === 'map') {
    event.preventDefault();
    setMapOpen(false);
  }
}, true);
window.addEventListener('click', event => {
  if (suppressSettingsClick && event.detail > 0) {
    suppressSettingsClick = false;
    event.preventDefault();
    event.stopPropagation();
  }
}, true);
window.addEventListener('contextmenu', event => {
  if ((settingsOpener && (bindingCapture || suppressSettingsClick))
      || (game.active && event.target === canvas && actionForBinding('mouse2'))) event.preventDefault();
});
canvas.addEventListener('pointermove', event => { const box = canvas.getBoundingClientRect(); pointer.x = event.clientX - box.left; pointer.y = event.clientY - box.top; crosshair.style.left = `${pointer.x}px`; crosshair.style.top = `${pointer.y}px`; });
canvas.addEventListener('pointerdown', event => {
  if (game.managerMode) {
    beginPlacedStationDrag(event);
    return;
  }
  if (settingsOpener || mapOpen) return;
  if (event.pointerType === 'touch') {
    pointer.down = true;
    if (game.active && !game.paused) shoot();
  }
});
canvas.addEventListener('mousedown', event => {
  if (!settingsOpener && !mapOpen && !game.managerMode && handleControlPress(actionForBinding(`mouse${event.button}`))) {
    event.preventDefault();
  }
});
window.addEventListener('mouseup', event => {
  const action = actionForBinding(`mouse${event.button}`);
  if (action) keys[action] = false;
  if (!isFiring()) game.radBeamActive = false;
});
window.addEventListener('pointerup', event => {
  if (event.pointerType === 'touch') {
    pointer.down = false;
    if (!isFiring()) game.radBeamActive = false;
  }
  if (game.managerMode && managerDrag) finishManagerDrag(event);
});
window.addEventListener('pointercancel', clearControlInput);
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
  if (game.epilogue.dungeon) return;
  const { x, y } = getMapWorldPosition(event);
  const biome = getBiome(x, y);
  const biomeKey = getDiscoveryKey(x, y);
  mapBiomeName.textContent = game.discovered.has(biomeKey) ? biome.name : 'UNDISCOVERED';
});
mapCanvas.addEventListener('click', event => {
  if (!mapOpen || event.button !== 0 || game.epilogue.dungeon) return;
  const { x, y } = getMapWorldPosition(event);
  if (isAdminTest()) {
    teleportPlayer(x, y);
    game.stationOpen = null;
    game.activeBeaconStationId = null;
    setMapOpen(false);
    updateStationUI();
    return;
  }
  if (!isAtFastTravelHub()) return;
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
function readLocalValue(key) {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    gameLog('WARN', `Unable to read ${key}`, error.message);
    return null;
  }
}
function writeLegacyValue(key, value) {
  if (isAdminTest()) return;
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    gameLog('WARN', `Unable to write legacy storage key ${key}`, error.message);
  }
}
function readLocalSaveData() {
  const empty = { slots: Array(saveSlotCount).fill(null), lastSlot: null, revision: 0 };
  try {
    const saved = JSON.parse(readLocalValue(saveSlotsKey) || '[]');
    const slots = Array.isArray(saved) ? saved : saved.slots;
    if (!Array.isArray(slots)) throw new Error('Invalid save slot data');
    const last = Array.isArray(saved) ? readLocalValue(lastSaveSlotKey) : saved.lastSlot;
    return {
      slots: empty.slots.map((_, index) => slots[index] || null),
      lastSlot: last == null ? null : Number(last),
      revision: Number(saved.revision) || 0
    };
  } catch (error) {
    gameLog('ERROR', 'Unable to read save slots', error.message);
    return empty;
  }
}
function accessSaveDatabase(change) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('fight-the-horde-saves', 1);
    let blocked = false;
    request.onupgradeneeded = () => request.result.createObjectStore('saves');
    request.onerror = () => reject(request.error);
    request.onblocked = () => {
      blocked = true;
      reject(new Error('Save database is blocked by another tab'));
    };
    request.onsuccess = () => {
      const db = request.result;
      if (blocked) {
        db.close();
        return;
      }
      try {
        const transaction = db.transaction('saves', change ? 'readwrite' : 'readonly');
        const store = transaction.objectStore('saves');
        const operation = store.get('slots');
        let next;
        let failure;
        if (change) {
          operation.onsuccess = () => {
            try {
              next = change(operation.result);
              const expected = JSON.stringify(next);
              store.put(next, 'slots').onsuccess = () => {
                const verification = store.get('slots');
                verification.onsuccess = () => {
                  if (JSON.stringify(verification.result) !== expected) transaction.abort();
                };
              };
            } catch (error) {
              failure = error;
              transaction.abort();
            }
          };
        }
        transaction.oncomplete = () => {
          db.close();
          resolve(change ? next : operation.result);
        };
        transaction.onabort = () => {
          db.close();
          reject(failure || transaction.error || new Error('Save transaction aborted'));
        };
      } catch (error) {
        db.close();
        reject(error);
      }
    };
  });
}
let saveData = readLocalSaveData();
function refreshSaveData(fallback, local = readLocalSaveData()) {
  const latest = fallback && fallback.revision > local.revision ? fallback : local;
  if (latest.revision >= saveData.revision) saveData = latest;
  return latest;
}
async function syncSaveData() {
  let fallback;
  try {
    if (typeof indexedDB !== 'undefined') fallback = await accessSaveDatabase();
  } catch (error) {
    gameLog('WARN', 'Unable to read IndexedDB saves', error.message);
  }
  return refreshSaveData(fallback);
}
let savesReady = false;
const saveStorageReady = (async () => {
  try {
    await syncSaveData();
  } finally {
    savesReady = true;
  }
})();
let saveQueue = saveStorageReady;
let salvageDeposit = null;
let salvageRetryAt = 0;
let salvageSaveFailed = false;
let runSaveBaselines = new Map();
function readSaveSlots() {
  return saveData.slots;
}
function sameSave(a, b) {
  return a === b || Boolean(a && b && a.timestamp === b.timestamp && a.sector === b.sector && a.state === b.state);
}
function commitSaveData(change) {
  const pending = saveQueue.then(async () => {
    try {
      const prepare = latest => {
        if (latest.revision < saveData.revision) throw new Error('Latest saves are unavailable; retry before overwriting them');
        return { ...change(latest), revision: Math.max(Date.now(), latest.revision + 1) };
      };
      const writeDatabase = () => accessSaveDatabase(fallback => prepare(refreshSaveData(fallback)));
      const locks = globalThis.navigator?.locks;
      saveData = locks?.request
        ? await locks.request(saveSlotsKey, async () => {
          const next = prepare(await syncSaveData());
          try {
            const serialized = JSON.stringify(next);
            localStorage.setItem(saveSlotsKey, serialized);
            if (localStorage.getItem(saveSlotsKey) !== serialized) throw new Error('Stored save does not match the snapshot');
            return next;
          } catch (error) {
            gameLog('WARN', 'Local save unavailable; trying IndexedDB', error.message);
            return writeDatabase();
          }
        })
        : await writeDatabase();
      return true;
    } catch (error) {
      gameLog('ERROR', 'Unable to persist saves', error.message);
      return false;
    }
  });
  saveQueue = pending;
  return pending;
}
function formatSaveTime(timestamp) {
  if (!timestamp) return 'EMPTY SLOT';
  return new Date(timestamp).toLocaleString();
}
function renderSaveSlots(mode) {
  clearSaveImport();
  saveFileActions.hidden = mode !== 'load';
  saveFileStatus.textContent = '';
  document.querySelector('#export-all-saves').disabled = !readSaveSlots().some(Boolean);
  saveSlotsTitle.textContent = mode === 'new' ? 'SELECT SLOT FOR NEW GAME' : 'SELECT SAVE TO LOAD';
  saveSlotList.innerHTML = readSaveSlots().map((slot, index) => {
    const details = slot ? `SECTOR ${Number(slot.sector) || 1} // ${formatSaveTime(slot.timestamp)}` : 'EMPTY SLOT';
    const action = mode === 'new' ? 'new-slot' : 'load-slot';
    const deleteButton = slot ? `<button type="button" class="save-delete" data-save-action="delete-slot" data-save-slot="${index}" aria-label="Delete save slot ${index + 1}">DELETE</button>` : '';
    const exportButton = mode === 'load' && slot ? `<button type="button" class="save-delete" data-save-action="export-slot" data-save-slot="${index}" aria-label="Export save slot ${index + 1}">EXPORT</button>` : '';
    return `<div class="save-slot-row"><button type="button" class="menu-button save-slot" data-save-action="${action}" data-save-slot="${index}" ${mode === 'load' && !slot ? 'disabled' : ''}><strong>SLOT ${index + 1}</strong><small>${details}</small></button>${exportButton}${deleteButton}</div>`;
  }).join('');
  mainMenu.classList.add('hidden');
  saveSlotsPanel.classList.remove('hidden');
}
function showMainMenu() {
  clearSaveImport();
  saveSlotsPanel.classList.add('hidden');
  howToPlay.classList.add('hidden');
  changeLog.classList.add('hidden');
  mainMenu.classList.remove('hidden');
  const lastSlot = saveData.lastSlot;
  continueButton.disabled = !savesReady || !Number.isInteger(lastSlot) || !readSaveSlots()[lastSlot];
}
function showHowToPlay() {
  const label = action => bindingLabel(settings.bindings[action]);
  document.querySelector('#controls-help').textContent =
    `${['w', 'a', 's', 'd'].map(label).join(' / ')} move. Mouse aims. ${label('fire')} or ${label('fireAlt')} fires. `
    + `${label('pulse')} uses pulse, ${label('medkit')} uses a medkit, and ${label('interact')} interacts. `
    + `${label('map')} opens the tactical map, ${label('zoom')} changes mini-map zoom, and ${label('quests')} opens the quest log. ${label('journal')} opens the discovery journal. `
    + `${['slot1', 'slot2', 'slot3', 'slot4'].map(label).join(' / ')} select weapons. ${label('shift')} sprints. Esc pauses.`;
  showMenuInfo(howToPlay);
}
function showMenuInfo(panel) {
  mainMenu.classList.add('hidden');
  saveSlotsPanel.classList.add('hidden');
  howToPlay.classList.toggle('hidden', panel !== howToPlay);
  changeLog.classList.toggle('hidden', panel !== changeLog);
  panel.querySelector('.how-to-play-content').scrollTop = 0;
  panel.querySelector('.menu-info-title').focus();
}
async function returnToMainMenu() {
  if (isAdminTest()) return discardAdminTest();
  const run = game;
  if (game.active && currentSaveSlot !== null && !await saveGame()) {
    if (game === run) saveButton.textContent = 'SAVE FAILED';
    return;
  }
  if (game !== run) return;
  closeJournal();
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
function serializeGame(overrides = {}) {
  const objects = [];
  const references = new Map();
  function encode(value) {
    if (value === undefined) return { special: 'undefined' };
    if (typeof value === 'number' && (!Number.isFinite(value) || Object.is(value, -0))) {
      return { special: Object.is(value, -0) ? '-0' : String(value) };
    }
    if (value === null || ['number', 'string', 'boolean'].includes(typeof value)) return value;
    if (typeof value !== 'object') throw new Error(`Unsupported save value: ${typeof value}`);
    if (references.has(value)) return { ref: references.get(value) };
    const ref = objects.length;
    references.set(value, ref);
    const type = value instanceof Set ? 'Set' : Array.isArray(value) ? 'Array' : 'Object';
    const prototype = Object.getPrototypeOf(value);
    if (type === 'Object' && prototype !== Object.prototype && prototype !== null) {
      throw new Error('Unsupported object in save state');
    }
    const entry = { type, value: null };
    objects.push(entry);
    entry.value = type === 'Object'
      ? Object.fromEntries(Object.entries(value === game ? { ...value, ...overrides } : value)
        .map(([key, item]) => [key, encode(item)]))
      : type === 'Set' ? [...value].map(encode)
        : Array.from({ length: value.length }, (_, index) =>
          Object.hasOwn(value, index) ? encode(value[index]) : { special: 'hole' });
    return { ref };
  }
  const root = encode(game);
  return JSON.stringify({ format: 'horde-graph-v2', root, objects });
}
function deserializeGame(savedState) {
  const saved = JSON.parse(savedState, (_, value) => value?.__saveType === 'Set' ? new Set(value.values) : value);
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) throw new Error('Invalid save state');
  if (!Object.hasOwn(saved, 'format')) return saved;
  const version2 = saved.format === 'horde-graph-v2';
  if (!version2 && saved.format !== 'horde-graph-v1') throw new Error('Unsupported save format');
  const objects = saved.objects.map(entry => {
    if (entry.type === 'Set') return new Set();
    if (entry.type === 'Array') return [];
    if (entry.type === 'Object') return {};
    throw new Error('Unsupported saved object type');
  });
  function decode(value) {
    if (!value || typeof value !== 'object') return value;
    if (version2 && Object.hasOwn(value, 'special')) {
      switch (value.special) {
        case 'undefined': return undefined;
        case 'Infinity': return Infinity;
        case '-Infinity': return -Infinity;
        case 'NaN': return NaN;
        case '-0': return -0;
        default: throw new Error('Invalid special save value');
      }
    }
    if (!Number.isInteger(value.ref) || !objects[value.ref]) throw new Error('Invalid saved object reference');
    return objects[value.ref];
  }
  saved.objects.forEach((entry, index) => {
    const target = objects[index];
    if (entry.type === 'Object') {
      Object.entries(entry.value).forEach(([key, value]) => {
        Object.defineProperty(target, key, { value: decode(value), enumerable: true, writable: true, configurable: true });
      });
    } else {
      entry.value.forEach(value => {
        if (entry.type === 'Set') target.add(decode(value));
        else if (version2 && value?.special === 'hole') target.length++;
        else target.push(decode(value));
      });
    }
  });
  return decode(saved.root);
}
function restoreGame(savedState) {
  const parsed = deserializeGame(savedState);
  if (!Number.isInteger(parsed?.seed) || !Number.isFinite(parsed?.player?.x) || !Number.isFinite(parsed?.player?.y)) {
    throw new Error('Save is missing its world seed or player position');
  }
  const defaults = freshGame();
  const restored = { ...defaults, ...parsed, hazardZones: parsed.hazardZones ?? null };
  if (!restored.voidDangers || !Number.isFinite(restored.voidDangers.stormTimer) || !Number.isFinite(restored.voidDangers.riftTimer)
      || !Array.isArray(restored.voidDangers.strikes) || !Array.isArray(restored.voidDangers.rifts)
      || [...restored.voidDangers.strikes, ...restored.voidDangers.rifts].some(zone =>
        !zone || ![zone.x, zone.y, zone.timer].every(Number.isFinite))
      || restored.voidDangers.rifts.some(rift => typeof rift.triggered !== 'boolean')) throw new Error('Invalid deep Void hazard state');
  restored.active = true;
  restored.paused = false;
  restored.managerMode = false;
  restored.craftedStations = {
    workbench: Math.max(0, Math.floor(Number(parsed.craftedStations?.workbench) || 0)),
    furnace: Math.max(0, Math.floor(Number(parsed.craftedStations?.furnace) || 0)),
    bountyBoard: Math.max(0, Math.floor(Number(parsed.craftedStations?.bountyBoard) || 0))
  };
  restored.startingStationsGranted = parsed.startingStationsGranted === true;
  if (!restored.startingStationsGranted) {
    restored.craftedStations.workbench++;
    restored.craftedStations.furnace++;
    restored.startingStationsGranted = true;
  }
  restored.placedStations = Array.isArray(restored.placedStations)
    ? restored.placedStations.filter(station => station
      && ['workbench', 'furnace', 'bountyBoard'].includes(station.type)
      && Number.isFinite(station.x) && Number.isFinite(station.y))
    : [];
  restored.questState = {
    ...defaults.questState,
    ...(parsed.questState || {}),
    counters: { ...defaults.questState.counters, ...(parsed.questState?.counters || {}) },
    active: Array.isArray(parsed.questState?.active) ? parsed.questState.active.filter(Boolean) : [],
    completed: Array.isArray(parsed.questState?.completed) ? parsed.questState.completed : [],
    available: Array.isArray(parsed.questState?.available) ? parsed.questState.available.filter(Boolean) : [],
    bounties: Array.isArray(parsed.questState?.bounties) ? parsed.questState.bounties.filter(Boolean) : []
  };
  restored.questState.armorerContractsCompleted = parsed.questState?.armorerContractsCompleted
    ?? restored.questState.completed.filter(id => id.startsWith('hold-the-line-')).length;
  [...restored.questState.active, ...restored.questState.available, ...restored.questState.bounties].forEach(quest => {
    const template = [...questTemplates, ...bountyTemplates].find(candidate => quest.id.startsWith(`${candidate.id}-`));
    if (!quest.reward && template) quest.reward = template.reward;
    if (quest.npcId === 'armorer') quest.armorerRepReward ??= 25;
  });
  restored.questState.active.forEach(quest => {
    quest.baseline ??= questObjectiveTotal(quest, restored.questState) - Math.min(quest.amount, quest.progress || 0);
    if (quest.timeLimit) quest.remainingSeconds ??= quest.timeLimit;
    delete quest.expiresAt;
  });
  restored.discovered = restored.discovered instanceof Set ? restored.discovered : new Set(restored.discovered || ['sanctuary']);
  if (!Object.hasOwn(parsed, 'campaign')) migrateCampaign(restored);
  else if (!restored.campaign || typeof restored.campaign !== 'object') throw new Error('Save has invalid campaign data');
  else validateCampaign(restored);
  restored.blueprints = { ...(parsed.blueprints || {}) };
  restoreEpilogue(restored, defaults);
  restoreJournal(restored, parsed);
  restored.armorerRep = Math.max(0, Number(parsed.armorerRep) || 0);
  restored.enemies = restored.enemies.filter(Boolean);
  const savedEnemies = [...restored.enemies, ...(restored.epilogue.dungeon?.world.enemies || [])];
  savedEnemies.forEach(enemy => {
    if (enemy.wraithGuards) enemy.wraithGuards = enemy.wraithGuards.filter(Boolean);
    if (enemy.wraithPests) enemy.wraithPests = enemy.wraithPests.filter(Boolean);
    const children = [...(enemy.wraithGuards || []), ...(enemy.wraithPests || []), ...(enemy.pest ? [enemy.pest] : [])].filter(Boolean);
    children.forEach(child => {
      if (child.wraithGuard) child.guardOwner = enemy;
      if (child.wraithPest) child.pestOwner = enemy;
      const ownerGroup = restored.enemies.includes(enemy) ? restored.enemies : restored.epilogue.dungeon.world.enemies;
      if (!child.defeated && !ownerGroup.includes(child)) ownerGroup.push(child);
    });
  });
  const enemyGroups = [restored.enemies, restored.epilogue.dungeon?.world.enemies].filter(Boolean);
  enemyGroups.flat().forEach(enemy => {
    if (enemy.voidWorm || enemy.voidWalker || enemy.voidStalker
        || (Number.isInteger(enemy.familyIndex) && !enemy.wraithGuard && !enemy.wraithPest && !enemy.nebulaMissile)) {
      if (!Number.isFinite(enemy.hp)) gameLog('WARN', `Legacy save omitted enemy health; restoring maximum HP: ${enemy.family}`);
      attachEnemyHealth(enemy);
    }
  });
  restored.bullets?.forEach(bullet => { if (Array.isArray(bullet.hitEnemies)) bullet.hitEnemies = new Set(bullet.hitEnemies); });
  [...restored.projectiles, ...(restored.epilogue.dungeon?.world.projectiles || [])].forEach(projectile => {
    if (projectile?.followTarget && projectile.life === null) projectile.life = Infinity;
  });
  validateWorldEvents(restored);
  restoreSanctuaryProgress(restored, parsed);
  return protectGameHealth(restored);
}
async function saveGame(slot = currentSaveSlot) {
  if (isAdminTest()) return false;
  const run = game;
  if (salvageDeposit) await salvageDeposit;
  if (game !== run || !game.active) return false;
  return persistGame(slot);
}
async function persistGame(slot, overrides) {
  if (isAdminTest()) return false;
  if (!Number.isInteger(slot) || slot < 0 || slot >= saveSlotCount) {
    gameLog('WARN', 'Cannot save without a valid slot');
    return false;
  }
  try {
    const baselines = runSaveBaselines;
    if (!baselines.has(slot)) baselines.set(slot, readSaveSlots()[slot]);
    const entry = {
      timestamp: Date.now(),
      sector: game.currentSector || 1,
      state: serializeGame(overrides)
    };
    const saved = await commitSaveData(({ slots }) => {
      if (!sameSave(slots[slot], baselines.get(slot))) throw new Error('Save slot changed in another tab');
      return { slots: slots.map((previous, index) => index === slot ? entry : previous), lastSlot: slot };
    });
    if (saved) {
      baselines.set(slot, entry);
      gameLog('INFO', `Game saved to slot ${slot + 1}`);
    }
    return saved;
  } catch (error) {
    gameLog('ERROR', `Unable to save slot ${slot + 1}`, error.message);
    return false;
  }
}
function bankSalvage() {
  if (isAdminTest()) {
    game.banked += game.salvage;
    game.salvage = 0;
    return;
  }
  if (!game.salvage || salvageDeposit || Date.now() < salvageRetryAt) return;
  const run = game;
  const amount = run.salvage;
  salvageDeposit = persistGame(currentSaveSlot, { banked: run.banked + amount, salvage: 0 }).then(saved => {
    if (game !== run) return;
    salvageSaveFailed = !saved;
    if (saved) {
      const remainingDeposit = Math.min(amount, run.salvage);
      run.banked += remainingDeposit;
      run.salvage -= remainingDeposit;
    } else {
      salvageRetryAt = Date.now() + 5000;
    }
  }).finally(() => { salvageDeposit = null; });
  return salvageDeposit;
}
function loadSave(slot) {
  const saved = readSaveSlots()[slot];
  if (!saved?.state) return;
  try {
    start(saved.state, slot);
    return true;
  } catch (error) {
    gameLog('ERROR', `Unable to load save slot ${slot + 1}`, error.message);
    renderSaveSlots('load');
    saveSlotsTitle.textContent = `SLOT ${slot + 1} COULD NOT BE LOADED`;
    return false;
  }
}
const saveFileFormat = 'fight-the-horde-save';
const maxSaveFileSize = 50 * 1024 * 1024;
let pendingSaveImport = null;
let saveFileReadId = 0;
function clearSaveImport() {
  saveFileReadId++;
  pendingSaveImport = null;
  saveImportPreview.hidden = true;
  saveImportPreview.innerHTML = '';
}
function makeSaveBackup(kind, entries) {
  return {
    format: saveFileFormat, version: 1, kind,
    entries: entries.map(({ slot, save }) => {
      const { timestamp, sector, state } = save;
      return { slot, save: { timestamp, sector, state } };
    })
  };
}
function downloadSaveBackup(kind, entries, status, label) {
  try {
    if (!entries.length) throw new Error('No saves to export.');
    const data = new Blob([JSON.stringify(makeSaveBackup(kind, entries))], { type: 'application/json' });
    if (data.size > maxSaveFileSize) throw new Error('Backup exceeds the 50 MiB limit. Try exporting slots individually.');
    const url = URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = url;
    link.download = `horde-${label}-${new Date().toISOString().replace(/[:.]/g, '-')}.hordesave`;
    document.body.append(link);
    try { link.click(); }
    finally {
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    status.textContent = 'DOWNLOAD REQUESTED // KEEP THE FILE SOMEWHERE SAFE';
  } catch (error) {
    status.textContent = `EXPORT FAILED // ${error.message}`;
  }
}
function exportCurrentRun() {
  try {
    if (isAdminTest()) throw new Error('Disposable test runs cannot be exported.');
    if (!game.active) throw new Error('No active run to export.');
    downloadSaveBackup('slot', [{
      slot: currentSaveSlot,
      save: { timestamp: Date.now(), sector: game.currentSector || 1, state: serializeGame() }
    }], liveSaveStatus, 'current-run');
  } catch (error) {
    liveSaveStatus.textContent = `EXPORT FAILED // ${error.message}`;
  }
}
function parseSaveBackup(text) {
  const file = JSON.parse(text);
  if (file?.format !== saveFileFormat) throw new Error('Not a Fight the Horde backup.');
  if (file.version !== 1) throw new Error('Unsupported backup version.');
  if (!['slot', 'all'].includes(file.kind) || !Array.isArray(file.entries) || !file.entries.length
      || file.entries.length > saveSlotCount || (file.kind === 'slot' && file.entries.length !== 1)) {
    throw new Error('Invalid slot list.');
  }
  const seen = new Set();
  return makeSaveBackup(file.kind, file.entries.map(entry => {
    const { slot, save } = entry || {};
    if (!(file.kind === 'slot' && slot === null) && (!Number.isInteger(slot) || slot < 0 || slot >= saveSlotCount || seen.has(slot))) {
      throw new Error('Invalid or duplicate slot number.');
    }
    seen.add(slot);
    if (!Number.isSafeInteger(save?.timestamp) || save.timestamp < 0 || !Number.isFinite(new Date(save.timestamp).getTime())
        || !Number.isInteger(save.sector) || save.sector < 0 || save.sector > sectorRegions.length + 1
        || typeof save.state !== 'string') throw new Error('Invalid slot metadata.');
    let restored;
    try {
      restored = restoreGame(save.state);
      if (!Object.hasOwn(weaponCatalog, restored.weapon) || !Array.isArray(restored.weaponSlots)
          || !Array.isArray(restored.projectiles) || !Array.isArray(restored.nodes)
          || !Array.isArray(restored.beaconStations) || !Number.isFinite(restored.health)) throw new Error('Invalid game state');
      const visited = new Set();
      const values = [restored];
      while (values.length) {
        const value = values.pop();
        if (typeof value === 'string' && /[<"]/.test(value)) throw new Error('Invalid game text');
        if (!value || typeof value !== 'object' || visited.has(value)) continue;
        visited.add(value);
        if (value instanceof Set) {
          for (const item of value) values.push(item);
        } else {
          for (const [key, item] of Object.entries(value)) {
            if (/[<"]/.test(key) || ['__proto__', 'constructor', 'prototype'].includes(key)) throw new Error('Invalid game key');
            values.push(item);
          }
        }
      }
    } catch (error) {
      throw new Error(`Invalid save data${slot === null ? '' : ` in slot ${slot + 1}`}: ${error.message}`);
    }
    return { slot, save };
  }));
}
function planSaveImport(backup, slots, selectedSlot) {
  const free = new Set(slots.flatMap((save, index) => save ? [] : [index]));
  if (backup.kind === 'slot') {
    const entry = backup.entries[0];
    return [{ ...entry, target: selectedSlot ?? (free.has(entry.slot) ? entry.slot : free.values().next().value ?? entry.slot ?? 0) }];
  }
  const plan = backup.entries.map(entry => ({ ...entry, target: free.has(entry.slot) ? entry.slot : null }));
  for (const entry of plan) if (entry.target !== null) free.delete(entry.target);
  for (const entry of plan) {
    if (entry.target !== null) continue;
    entry.target = free.values().next().value ?? entry.slot;
    free.delete(entry.target);
  }
  return plan;
}
function renderSaveImport(backup, target) {
  const slots = readSaveSlots();
  const plan = planSaveImport(backup, slots, target);
  const replaced = plan.filter(entry => slots[entry.target]).map(({ target: slot }) => ({ slot, save: slots[slot] }));
  pendingSaveImport = { backup, plan, replaced, slots, busy: false };
  const select = backup.kind === 'slot' ? `<label>Destination slot<select id="save-import-target">${slots.map((save, index) =>
    `<option value="${index}" ${plan[0].target === index ? 'selected' : ''}>Slot ${index + 1}${save ? ' (occupied)' : ' (empty)'}</option>`).join('')}</select></label>` : '';
  saveImportPreview.innerHTML = `${select}${plan.map(({ target: index, slot, save }) =>
    `<p>${slot === null ? 'Current run' : `File slot ${slot + 1}`} &rarr; slot ${index + 1}${slots[index] ? ' (replace)' : ''} // Sector ${save.sector} // ${formatSaveTime(save.timestamp)}</p>`).join('')}${replaced.length
    ? '<button type="button" class="menu-button" data-import-action="backup">BACK UP SLOTS TO BE REPLACED</button>' : ''}
    <button type="button" class="menu-button" data-import-action="confirm">${replaced.length ? 'CONFIRM REPLACEMENT AND IMPORT' : 'IMPORT SAVES'}</button>
    <button type="button" class="menu-button" data-import-action="cancel">CANCEL</button>`;
  saveImportPreview.hidden = false;
}
async function applySaveImport(preview) {
  let slotsChanged = false;
  const saved = await commitSaveData(({ slots, lastSlot }) => {
    if (preview.plan.some(({ target }) => !sameSave(slots[target], preview.slots[target]))) {
      slotsChanged = true;
      throw new Error('Slots changed after import preview');
    }
    const next = slots.slice();
    for (const entry of preview.plan) next[entry.target] = entry.save;
    return { slots: next, lastSlot };
  });
  if (pendingSaveImport !== preview) return saved;
  const target = preview.backup.kind === 'slot' ? preview.plan[0].target : undefined;
  if (saved) {
    renderSaveSlots('load');
    saveFileStatus.textContent = `IMPORTED ${preview.plan.length} ${preview.plan.length === 1 ? 'SLOT' : 'SLOTS'} // READY TO LOAD`;
  } else {
    renderSaveImport(preview.backup, target);
    saveFileStatus.textContent = slotsChanged
      ? 'SLOTS CHANGED // REVIEW THE UPDATED PREVIEW'
      : 'IMPORT FAILED // BROWSER STORAGE COULD NOT VERIFY THE SAVE';
  }
  return saved;
}
async function handleMenuAction(action) {
  await saveStorageReady;
  if (['new', 'load', 'continue'].includes(action)) await syncSaveData();
  if (action === 'new') renderSaveSlots('new');
  if (action === 'load') renderSaveSlots('load');
  if (action === 'how-to-play') showHowToPlay();
  if (action === 'change-log') showMenuInfo(changeLog);
  if (action === 'continue') {
    const slot = saveData.lastSlot;
    if (Number.isInteger(slot) && readSaveSlots()[slot]) loadSave(slot);
    else renderSaveSlots('load');
  }
  if (action === 'back') showMainMenu();
  if (action === 'back-from-help' || action === 'back-from-change-log') {
    showMainMenu();
    mainMenu.querySelector(`[data-menu-action="${action === 'back-from-help' ? 'how-to-play' : 'change-log'}"]`).focus();
  }
}
document.querySelectorAll('[data-menu-action]').forEach(button => button.addEventListener('click', () => handleMenuAction(button.dataset.menuAction)));
saveSlotsPanel.querySelector('[data-menu-action="back"]').addEventListener('click', event => {
  event.preventDefault();
  event.stopPropagation();
  showMainMenu();
});
saveSlotList.addEventListener('click', async event => {
  const button = event.target.closest('[data-save-action]');
  if (!button || pendingSaveImport?.busy) return;
  const slot = Number(button.dataset.saveSlot);
  if (!Number.isInteger(slot) || slot < 0 || slot >= saveSlotCount) return;
  if (button.dataset.saveAction === 'export-slot') {
    const save = readSaveSlots()[slot];
    if (save) downloadSaveBackup('slot', [{ slot, save }], saveFileStatus, `slot-${slot + 1}`);
    return;
  }
  if (button.dataset.saveAction === 'delete-slot') {
    const expected = readSaveSlots()[slot];
    if (!window.confirm(`Delete save slot ${slot + 1}? This cannot be undone.`)) return;
    const saved = await commitSaveData(({ slots, lastSlot }) => {
      if (!sameSave(slots[slot], expected)) throw new Error('Save slot changed in another tab');
      return {
        slots: slots.map((previous, index) => index === slot ? null : previous),
        lastSlot: lastSlot === slot ? null : lastSlot
      };
    });
    const mode = saveSlotsTitle.textContent.includes('NEW GAME') ? 'new' : 'load';
    if (!saveSlotsPanel.classList.contains('hidden')) {
      renderSaveSlots(mode);
      if (!saved) saveSlotsTitle.textContent += ' // DELETE FAILED';
    }
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
document.querySelector('#export-all-saves').addEventListener('click', () => {
  downloadSaveBackup('all', readSaveSlots().flatMap((save, slot) => save ? [{ slot, save }] : []), saveFileStatus, 'all-slots');
});
document.querySelector('#import-save-file').addEventListener('click', () => {
  if (!pendingSaveImport?.busy) saveFileInput.click();
});
saveFileInput.addEventListener('change', async () => {
  const file = saveFileInput.files?.[0];
  saveFileInput.value = '';
  if (!file) return;
  clearSaveImport();
  const readId = saveFileReadId;
  saveFileStatus.textContent = 'READING BACKUP...';
  try {
    if (!/\.hordesave$/i.test(file.name)) throw new Error('Choose a .hordesave file.');
    if (file.size > maxSaveFileSize) throw new Error('Backup exceeds the 50 MiB limit.');
    const text = await file.text();
    if (readId !== saveFileReadId) return;
    const backup = parseSaveBackup(text);
    renderSaveImport(backup);
    saveFileStatus.textContent = 'REVIEW IMPORT // NO SLOTS CHANGED YET';
  } catch (error) {
    if (readId === saveFileReadId) saveFileStatus.textContent = `IMPORT FAILED // ${error.message}`;
  }
});
saveImportPreview.addEventListener('change', event => {
  if (!pendingSaveImport || pendingSaveImport.busy || event.target.id !== 'save-import-target') return;
  const target = Number(event.target.value);
  if (!Number.isInteger(target) || target < 0 || target >= saveSlotCount) return;
  renderSaveImport(pendingSaveImport.backup, target);
  saveImportPreview.querySelector('#save-import-target')?.focus();
});
saveImportPreview.addEventListener('click', event => {
  const preview = pendingSaveImport;
  const button = event.target.closest('[data-import-action]');
  if (!preview || preview.busy || !button) return;
  if (button.dataset.importAction === 'backup') {
    downloadSaveBackup('all', preview.replaced, saveFileStatus, 'before-import');
  } else if (button.dataset.importAction === 'cancel') {
    clearSaveImport();
    saveFileStatus.textContent = 'IMPORT CANCELED';
  } else if (button.dataset.importAction === 'confirm') {
    preview.busy = true;
    button.disabled = true;
    saveFileStatus.textContent = 'IMPORTING...';
    return applySaveImport(preview);
  }
});
exportRunButton.addEventListener('click', exportCurrentRun);
saveButton?.addEventListener('click', async () => {
  if (isAdminTest()) {
    liveSaveStatus.textContent = 'DISPOSABLE TEST RUN // SAVING DISABLED';
    return;
  }
  if (currentSaveSlot === null) {
    togglePause();
    renderSaveSlots('new');
    ui.start.classList.remove('hidden');
    gameShell.classList.add('menu-state');
    return;
  }
  saveButton.disabled = true;
  saveButton.textContent = 'SAVING...';
  const savingRun = game;
  const saved = await saveGame();
  if (game !== savingRun) return;
  saveButton.disabled = false;
  saveButton.textContent = saved ? 'GAME SAVED' : 'SAVE FAILED';
  window.setTimeout(() => { saveButton.textContent = 'SAVE GAME'; }, 1200);
});
for (const id of ['#main-settings-button', '#pause-settings-button']) {
  const button = document.querySelector(id);
  button.addEventListener('click', () => openSettings(button));
}
document.querySelector('#settings-back').addEventListener('click', closeSettings);
settingsBindings.addEventListener('click', event => {
  const action = event.target.closest('[data-bind-action]')?.dataset.bindAction;
  if (!Object.hasOwn(controlDefaults, action)) return;
  bindingCapture = action;
  bindingConflict = null;
  settingsStatus.textContent = `PRESS A KEY OR MOUSE BUTTON FOR ${controlDefaults[action][0]}`;
  renderSettings();
  focusBinding(action);
});
settingsSwap.addEventListener('click', () => {
  if (!bindingConflict) return;
  const { action, other, key } = bindingConflict;
  bindingConflict = null;
  updateSettings({ ...settings, bindings: { ...settings.bindings, [action]: key, [other]: settings.bindings[action] } });
  renderSettings();
  focusBinding(action);
});
document.querySelector('#settings-reset').addEventListener('click', () => {
  bindingCapture = bindingConflict = null;
  updateSettings(defaultSettings());
  renderSettings();
});
effectsInput.addEventListener('change', () => updateSettings({ ...settings, reducedEffects: effectsInput.checked }));
colorInput.addEventListener('input', () => {
  if (!/^#[0-9a-f]{6}$/i.test(colorInput.value)) return;
  gameShell.style.setProperty('--crosshair-color', colorInput.value);
});
colorInput.addEventListener('change', () => {
  if (/^#[0-9a-f]{6}$/i.test(colorInput.value)) updateSettings({ ...settings, crosshairColor: colorInput.value });
});
sizeInput.addEventListener('change', () => {
  const size = Number(sizeInput.value);
  if ([16, 22, 32].includes(size)) updateSettings({ ...settings, crosshairSize: size });
});
applyDisplaySettings();
resumeButton?.addEventListener('click', () => {
  if (game.paused) togglePause();
});
mainMenuButton?.addEventListener('click', returnToMainMenu);
showMainMenu();
saveStorageReady.then(() => {
  const lastSlot = saveData.lastSlot;
  continueButton.disabled = !Number.isInteger(lastSlot) || !readSaveSlots()[lastSlot];
});
document.querySelector('#restart-button').onclick = () => {
  if (!isAdminTest()) return start();
  start(null, null, true);
  if (adminScenario) loadAdminScenario(adminScenario);
};
document.querySelectorAll('[data-craft]').forEach(button => button.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); openCraftDetails(button.dataset.craft); })); ui.craftDetails.addEventListener('click', event => { const closeButton = event.target.closest('[data-close-details]'); if (closeButton) { event.preventDefault(); event.stopPropagation(); ui.craftDetails.hidden = true; ui.craftDetails.innerHTML = ''; return; } const quantityButton = event.target.closest('[data-craft-quantity]'); if (quantityButton) { event.preventDefault(); event.stopPropagation(); openCraftDetails(ui.craftDetails.dataset.recipeKey, Number(quantityButton.dataset.craftQuantity), Number(ui.craftDetails.dataset.weaponSlot || 0)); return; } const craftButton = event.target.closest('[data-craft-confirm]'); if (craftButton) { event.preventDefault(); event.stopPropagation(); craftItem(craftButton.dataset.craftConfirm, Number(ui.craftDetails.dataset.quantity || 1), Number(ui.craftDetails.dataset.weaponSlot || 0)); } });
ui.weaponBar?.addEventListener('click', event => { const slotButton = event.target.closest('[data-weapon-slot]'); if (!slotButton) return; switchWeapon(Number(slotButton.dataset.weaponSlot)); });
ui.craftDetails.addEventListener('click', event => { const slotButton = event.target.closest('[data-craft-slot]'); if (!slotButton) return; event.preventDefault(); event.stopPropagation(); openCraftDetails(ui.craftDetails.dataset.recipeKey, Number(ui.craftDetails.dataset.quantity || 1), Number(slotButton.dataset.craftSlot)); });
function getBiomeSector(distance) { return biomeBoundaries.findIndex(boundary => distance < boundary) === -1 ? sectorRegions.length - 1 : biomeBoundaries.findIndex(boundary => distance < boundary); }
function teleportPlayer(x, y) { game.player.x = x; game.player.y = y; game.camera.x = x; game.camera.y = y; game.biomeKey = null; game.biomeName = null; }
function start(savedState = null, slot = currentSaveSlot, testRun = false) {
  const loadedRun = savedState ? restoreGame(savedState) : freshGame();
  closeJournal();
  if (testRun) adminTestRuns.add(loadedRun);
  adminInvincible = false;
  setMapOpen(false);
  if (questDialog) questDialog.hidden = true;
  if (questPanel) questPanel.hidden = true;
  game = loadedRun;
  clearControlInput();
  liveSaveStatus.textContent = '';
  salvageRetryAt = 0;
  salvageSaveFailed = false;
  ensureQuestState();
  gameShell.classList.remove('manager-view');
  ui.manager.hidden = true;
  managerDrag = null;
  currentSaveSlot = testRun ? null : slot;
  runSaveBaselines = new Map(slot === null ? [] : [[slot, readSaveSlots()[slot]]]);
  game.active = true;
  randomizeBiomeData(game.seed);
  const overworld = game.epilogue.dungeon?.world ?? game;
  if (!savedState || overworld.hazardZones === null) overworld.hazardZones = generateHazardZones();
  if (!savedState) {
    game.enemies.push(createVoidStalker());
    const random = seededRandom(game.seed + 17);
    for (let i = 0; i < 140; i++) {
      const roll = random();
      game.nodes.push({ x: (random() - .5) * mapRadius * 2, y: (random() - .5) * mapRadius * 1.5, type: roll < .08 ? 'relic' : roll < .54 ? 'chest' : 'scrap', taken: false });
    }
  }
  updateInventoryUI();
  renderQuestHud();
  renderWorldEventHud();
  updateStationButtons();
  gameShell.classList.remove('menu-state');
  resize();
  ui.start.classList.add('hidden');
  ui.over.classList.add('hidden');
  ui.pause.classList.add('hidden');
  refreshAdminRunUI();
  lastTime = performance.now();
  cancelAnimationFrame(animation);
  animation = requestAnimationFrame(loop);
}
function togglePause() {
  if (!game.active) return;
  if (journalOpener) { closeJournal(); return; }
  game.paused = !game.paused;
  renderWorldEventHud();
  clearControlInput();
  ui.pause.classList.toggle('hidden', !game.paused);
  refreshAdminRunUI();
  if (game.paused) resumeButton?.focus();
}
function isAdminTest(run = game) { return adminTestRuns.has(run); }
function hasInfiniteAmmo() { return isAdminTest() && adminInfiniteAmmoRuns.has(game); }
function refreshAdminRunUI() {
  const test = isAdminTest();
  adminOpenButton.hidden = !adminMode;
  adminBadge.hidden = !test;
  document.querySelector('#discard-test-after-death').hidden = !test;
  saveButton.disabled = test;
  exportRunButton.disabled = test;
  mainMenuButton.textContent = test ? 'DISCARD TEST AND RETURN' : 'MAIN MENU';
  if (test) {
    saveButton.textContent = 'SAVE GAME';
    liveSaveStatus.textContent = 'DISPOSABLE TEST RUN // SAVING DISABLED';
  }
  else if (liveSaveStatus.textContent === 'DISPOSABLE TEST RUN // SAVING DISABLED') liveSaveStatus.textContent = '';
}
function openAdminPanel() {
  if (!adminMode || !game.active || !game.paused) return;
  adminPanelOpen = true;
  ui.pause.classList.add('hidden');
  adminPanel.classList.remove('hidden');
  renderAdminPanel(isAdminTest() ? 'Changes apply only to this disposable run.' : 'Your current run stays paused in memory while you test.');
  adminPanel.querySelector('[data-admin="close"]').focus();
}
function closeAdminPanel() {
  adminPanelOpen = false;
  adminPanel.classList.add('hidden');
  if (game.active && game.paused) {
    ui.pause.classList.remove('hidden');
    adminOpenButton.focus();
  }
}
async function beginAdminTest() {
  if (!adminMode || !adminPanelOpen || !game.paused || isAdminTest()) return;
  const normal = game;
  if (salvageDeposit) await salvageDeposit;
  if (game !== normal || !adminPanelOpen || !game.paused) return;
  suspendedRun = { game, slot: currentSaveSlot, baselines: runSaveBaselines, salvageRetryAt, salvageSaveFailed, saveStatus: liveSaveStatus.textContent };
  adminScenario = null;
  start(null, null, true);
  togglePause();
  openAdminPanel();
}
function discardAdminTest() {
  if (!isAdminTest() || !suspendedRun) return;
  closeAdminPanel();
  const previous = suspendedRun;
  suspendedRun = null;
  adminScenario = null;
  adminInvincible = false;
  setMapOpen(false);
  game = previous.game;
  currentSaveSlot = previous.slot;
  runSaveBaselines = previous.baselines;
  salvageRetryAt = previous.salvageRetryAt;
  salvageSaveFailed = previous.salvageSaveFailed;
  liveSaveStatus.textContent = previous.saveStatus;
  randomizeBiomeData(game.seed);
  clearControlInput();
  if (questPanel) questPanel.hidden = true;
  if (questDialog) questDialog.hidden = true;
  ui.over.classList.add('hidden');
  ui.pause.classList.remove('hidden');
  refreshAdminRunUI();
  updateInventoryUI();
  updateAmmoUI();
  renderWeaponBar();
  renderQuestHud();
  const biome = getBiome(game.player.x, game.player.y);
  updateBiomeEffects(biome);
  updateBiomeHazard(biome);
  updateUI(Math.hypot(game.player.x, game.player.y), false, biome);
  drawGameWorld();
  resumeButton.focus();
  lastTime = performance.now();
  cancelAnimationFrame(animation);
  animation = requestAnimationFrame(loop);
}
function resetAdminCombat(keepEncounter = false) {
  game.worldEvents = freshWorldEvents();
  game.enemies = keepEncounter ? game.enemies.filter(enemy => !enemy.defeated && (enemy.foreman || enemy.voidStalker)) : [];
  game.voidDangers = { stormTimer: 7, riftTimer: 12, strikes: [], rifts: [] };
  for (const key of dungeonWorldFields) {
    if (!['enemies', 'hazardZones', 'nodes'].includes(key)) game[key] = [];
  }
  game.meleeAttack = null;
  game.radBeamActive = false;
  game.enemyStatus = null;
  game.radioactiveBlindTimer = game.attackDisabledTimer = game.decayTimer = 0;
  game.spawnTimer = game.voidSpawnTimer = 0;
}
function setAdminHealth() {
  const invincible = adminInvincible;
  adminInvincible = false;
  game.health = 100;
  adminInvincible = invincible;
}
function loadAdminScenario(scenario) {
  if (!isAdminTest()) return 'Start a disposable test run first.';
  const { kind, id } = scenario;
  const missionIndex = kind === 'mission' ? campaignMissions.findIndex(mission => mission.id === id) : -1;
  if ((kind === 'mission' && missionIndex < 0) || (kind === 'room' && !Object.hasOwn(dungeonRooms, id))
      || (kind === 'foreman' && ![1, 2, 3].includes(id)) || !['mission', 'room', 'foreman', 'stalker'].includes(kind)) {
    return 'Select a valid testing scenario.';
  }
  if (game.epilogue.dungeon) leaveDungeon();
  resetAdminCombat();
  game.crafting = null;
  game.stationOpen = null;
  game.activeBeaconStationId = null;
  game.questState.active = [];
  game.campaign.active = null;
  setAdminHealth();
  if (kind === 'mission') {
    game.campaign.completed = campaignMissions.slice(0, missionIndex).map(mission => mission.id);
    game.epilogue.guardianCleared = false;
    game.epilogue.firstClear = false;
    game.epilogue.portalFound = false;
    if (game.campaign.completed.includes('first-light') && !campaignBeacon()) finishBeaconRepair(game.beaconStations[0]);
    game.campaign.beaconId = campaignBeacon()?.id ?? null;
    const contact = sanctuaryNpcDefinitions.findIndex(npc => npc.id === campaignMissions[missionIndex].npcId);
    const { x, y } = getSanctuaryNpcPositions()[contact];
    teleportPlayer(x, y);
    game.enemies.push(createVoidStalker());
  } else {
    game.campaign.completed = campaignMissions.map(mission => mission.id);
    game.epilogue.guardianCleared = kind !== 'stalker';
    game.epilogue.firstClear = false;
    game.epilogue.portalFound = true;
    teleportPlayer(voidPortal.x, voidPortal.y);
    if (kind === 'stalker') game.enemies.push(createVoidStalker());
    else {
      enterDungeon();
      const dungeon = game.epilogue.dungeon;
      const room = kind === 'foreman' ? 'arena' : id;
      const afterFoundry = !['entry', 'works'].includes(room);
      const afterRelay = ['ward', 'records', 'staging', 'arena'].includes(room);
      if (afterFoundry) dungeon.cleared.push('works');
      if (afterRelay) dungeon.relayStep = relayOrder.length;
      if (['records', 'staging', 'arena'].includes(room)) dungeon.cleared.push('ward');
      if (room === 'arena') dungeon.checkpoint = 'staging';
      switchDungeonRoom(room, room === 'arena' ? 'staging' : undefined);
      if (kind === 'foreman' && id > 1) {
        const boss = game.enemies.find(enemy => enemy.foreman);
        for (let phase = 1; phase < id; phase++) {
          boss.hp = 0;
          updateForeman(boss, 0);
        }
      }
    }
  }
  adminScenario = scenario;
  game.spawnTimer = 1;
  game.voidSpawnTimer = 3;
  if (questDialog) questDialog.hidden = true;
  if (questPanel) questPanel.hidden = true;
  updateStationUI();
  renderQuestHud();
  drawGameWorld();
  return 'Scenario loaded. Back to Pause, then Resume to test.';
}
function spawnAdminEnemy(id) {
  const { x, y } = game.player;
  const dungeon = game.epilogue.dungeon;
  const spawn = { x: x + 135, y: y + 100 };
  if (dungeon) constrainDungeonPosition(spawn);
  if (id === 'walker' || id === 'worm') {
    const enemy = id === 'walker' ? createVoidWalker(spawn.x, spawn.y) : createVoidWorm(spawn.x, spawn.y);
    if (dungeon) enemy.dungeonEnemy = true;
    return addEnemy(enemy);
  }
  const variant = enemyVariants.find(entry => entry.name === id);
  if (!variant) return null;
  const local = getBiome(spawn.x, spawn.y);
  const biome = local.enemyFamily ? local : getBiome(beaconRegionRadius + 400, 200);
  const enemy = createBiomeEnemy(spawn.x, spawn.y, biome, variant);
  if (enemy && dungeon) enemy.dungeonEnemy = true;
  return enemy;
}
function adminDiagnosticText() {
  const dungeon = game.epilogue.dungeon;
  const boss = game.enemies.find(enemy => !enemy.defeated && (enemy.foreman || enemy.voidStalker));
  return [
    'Fight the Horde - disposable test run',
    `Seed: ${game.seed} | Time: ${game.elapsedTime.toFixed(2)}s`,
    `Position: ${game.player.x.toFixed(1)}, ${game.player.y.toFixed(1)} | ${getBiome(game.player.x, game.player.y).name}`,
    `Campaign: ${currentCampaignMission()?.title ?? 'complete'}${game.campaign.active ? ' (active)' : ''}`,
    `Other active quests: ${game.questState.active.map(quest => quest.title).join(', ') || 'none'}`,
    `Dungeon: ${dungeon?.room ?? 'outside'} | Checkpoint: ${dungeon?.checkpoint ?? 'none'}`,
    `Boss: ${boss ? `${boss.family} | ${boss.foreman ? `Phase ${boss.phase}: ${boss.moveState}` : boss.huntState} | ${boss.hp.toFixed(1)} HP` : 'none'}`,
    `Health: ${game.health.toFixed(1)} | Weapon: ${weaponCatalog[game.weapon].name} | Ammo: ${getAmmoLabel()} | Invincible: ${adminInvincible ? 'on' : 'off'}`,
    `Threats: ${game.enemies.filter(enemy => !enemy.defeated).length}`
  ].join('\n');
}
function renderAdminPanel(message) {
  const test = isAdminTest();
  document.querySelector('#admin-tools').hidden = !test;
  adminPanel.querySelector('[data-admin="start"]').hidden = test;
  adminPanel.querySelector('[data-admin="discard"]').hidden = !test;
  adminPanel.querySelector('[data-admin="invincible"]').setAttribute('aria-pressed', String(adminInvincible));
  adminPanel.querySelector('[data-admin="infinite-ammo"]').setAttribute('aria-pressed', String(hasInfiniteAmmo()));
  adminReport.value = test ? adminDiagnosticText() : '';
  adminStatus.textContent = message;
}
async function copyAdminReport() {
  adminReport.value = adminDiagnosticText();
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(adminReport.value);
      if (adminPanelOpen) adminStatus.textContent = 'Bug report copied.';
      return;
    } catch (error) {
      gameLog('WARN', 'Could not copy admin diagnostics', error.message);
    }
  }
  if (adminPanelOpen) {
    adminReport.focus();
    adminReport.select();
    adminStatus.textContent = 'Clipboard unavailable. The report is selected for manual copy.';
  }
}
function adminAction(action, value, amount) {
  if (!adminMode || !adminPanelOpen || !isAdminTest() || !game.paused) return;
  let message;
  if (action === 'scenario') {
    const [kind, id] = (value || '').split(':');
    message = loadAdminScenario({ kind, id: kind === 'foreman' ? Number(id) : id });
  } else if (action === 'reset') message = adminScenario ? loadAdminScenario(adminScenario) : 'Load a scenario before resetting it.';
  else if (action === 'mission') message = loadAdminScenario({ kind: 'mission', id: value });
  else if (action === 'spawn') message = spawnAdminEnemy(value) ? 'Enemy spawned.' : 'Cannot spawn that enemy here.';
  else if (action === 'clear') {
    resetAdminCombat(true);
    message = 'Threats cleared. Scenario bosses are preserved.';
  } else if (action === 'health') {
    setAdminHealth();
    message = 'Health refilled.';
  } else if (action === 'weapon') {
    if (!Object.hasOwn(weaponCatalog, value)) message = 'Select a valid weapon.';
    else {
      const weapon = getWeaponStats(value);
      let slot = game.weaponSlots.indexOf(value);
      if (slot < 0) slot = game.weaponSlots.indexOf(null);
      if (slot < 0) slot = game.weaponSlots.indexOf(game.weapon);
      game.weaponSlots[slot] = value;
      game.unlockedWeapons[value] = true;
      switchWeapon(slot + 1);
      game.ammo = game.weaponAmmo[value] = weapon.kind === 'melee' ? 0 : weapon.magazine;
      game.reloadPending = game.weaponReloadPending[value] = false;
      message = `${weapon.name} equipped in slot ${slot + 1}.`;
    }
  } else if (action === 'ammo') {
    const weapon = getWeaponStats();
    for (const [key, recipe] of Object.entries(ammoCatalog)) game.ammoReserve[key] = Math.max(game.ammoReserve[key] || 0, recipe.amount);
    if (weapon.kind !== 'melee') game.ammo = weapon.magazine;
    game.weaponAmmo[game.weapon] = game.ammo;
    game.reloadPending = game.weaponReloadPending[game.weapon] = false;
    message = 'Magazine and ammo reserves refilled.';
  } else if (action === 'infinite-ammo') {
    if (hasInfiniteAmmo()) adminInfiniteAmmoRuns.delete(game);
    else adminInfiniteAmmoRuns.add(game);
    message = `Infinite ammo ${hasInfiniteAmmo() ? 'on' : 'off'}.`;
  } else if (action === 'invincible') {
    if (!adminInvincible) setAdminHealth();
    adminInvincible = !adminInvincible;
    message = `Invincibility ${adminInvincible ? 'on' : 'off'}.`;
  } else if (action === 'blueprint') {
    if (requiresBlueprint(value)) {
      game.blueprints[value] = true;
      message = `${getBlueprintName(value)} blueprint unlocked.`;
    } else message = 'Select a valid blueprint.';
  } else if (action === 'grant') {
    if (!Number.isInteger(amount) || amount < 1 || amount > 10000) message = 'Enter a whole amount from 1 to 10,000.';
    else if (resourceTypes.some(resource => resource.key === value)) {
      game.vault[value] = (game.vault[value] || 0) + amount;
      message = `Granted ${amount} ${value} to the vault.`;
    } else if (['salvage', 'relics', 'atlasCrystals', 'steelPlate'].includes(value)) {
      if (value === 'steelPlate') game.stationItems.steelPlate = (game.stationItems.steelPlate || 0) + amount;
      else if (value === 'salvage') game.banked += amount;
      else game[value] += amount;
      message = `Granted ${amount} ${value}.`;
    } else message = 'Select a valid material.';
  } else if (action === 'copy') return copyAdminReport();
  else return;
  updateInventoryUI();
  updateAmmoUI();
  renderAdminPanel(message);
}
function fillAdminSelect(id, entries) {
  document.querySelector(`#${id}`).innerHTML = entries.map(([value, name]) => `<option value="${value}">${name}</option>`).join('');
}
fillAdminSelect('admin-scenario', [['stalker', 'Void Stalker'], ...Object.entries(dungeonRooms).map(([id, room]) => [`room:${id}`, room.name]),
  ...[1, 2, 3].map(phase => [`foreman:${phase}`, `Foreman - Phase ${phase}`])]);
fillAdminSelect('admin-mission', campaignMissions.map(mission => [mission.id, mission.title]));
fillAdminSelect('admin-enemy', [...enemyVariants.map(enemy => [enemy.name, enemy.name]), ['walker', 'Void Walker'], ['worm', 'Void Worm']]);
fillAdminSelect('admin-weapon', Object.entries(weaponCatalog).map(([id, weapon]) => [id, weapon.name]));
fillAdminSelect('admin-blueprint', [...Object.entries(weaponRecipes), ...Object.entries(armorRecipes)].map(([key, recipe]) => [key, recipe.name]));
fillAdminSelect('admin-material', [...resourceTypes.map(resource => [resource.key, resource.name]),
  ['steelPlate', 'Steel Plate'], ['salvage', 'Banked Salvage'], ['relics', 'Relics'], ['atlasCrystals', 'Atlas Crystals']]);
adminOpenButton.addEventListener('click', openAdminPanel);
document.querySelector('#discard-test-after-death').addEventListener('click', discardAdminTest);
adminPanel.addEventListener('click', event => {
  const action = event.target.closest('[data-admin]')?.dataset.admin;
  if (action === 'start') return beginAdminTest();
  if (action === 'close') return closeAdminPanel();
  if (action === 'discard') return discardAdminTest();
  if (!action) return;
  const selectors = { scenario: 'scenario', spawn: 'enemy', weapon: 'weapon', mission: 'mission', blueprint: 'blueprint', grant: 'material' };
  const value = selectors[action] ? document.querySelector(`#admin-${selectors[action]}`).value : '';
  return adminAction(action, value, Number(document.querySelector('#admin-amount').value));
});
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
    weaponStats: weapon,
    angle: game.player.angle,
    elapsed: 0,
    duration: weapon.meleeDuration,
    previousProgress: 0,
    hitEnemies: new Set()
  };
}
function getMeleeAttackPose(attack) {
  const weapon = attack.weaponStats || getWeaponStats(attack.weaponId);
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
function projectileImpactTime(startX, startY, endX, endY, centerX, centerY, radius) {
  const x = startX - centerX;
  const y = startY - centerY;
  const dx = endX - startX;
  const dy = endY - startY;
  const c = x * x + y * y - radius * radius;
  if (c <= 0) return 0;
  const a = dx * dx + dy * dy;
  const b = x * dx + y * dy;
  if (a === 0 || b >= 0) return null;
  const discriminant = b * b - a * c;
  if (discriminant < 0) return null;
  const time = c / (-b + Math.sqrt(discriminant));
  return time <= 1 ? time : null;
}
function detonatePlayerBullet(bullet, x, y) {
  for (const enemy of game.enemies.slice()) {
    if (enemy.defeated || enemy.shieldTimer > 0 || Math.hypot(x - enemy.x, y - enemy.y) > bullet.blast) continue;
    enemy.hp = Math.max(0, enemy.hp - (bullet.damage || .12));
    if (enemy.hp <= 0) defeatEnemy(enemy);
  }
  addExplosion(x, y, bullet.blast);
}
function updateMeleeAttack(dt) {
  const attack = game.meleeAttack;
  if (!attack) return;

  const weapon = attack.weaponStats || getWeaponStats(attack.weaponId);
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
  const weapon = getWeaponStats('radBeam');
  const unlimited = hasInfiniteAmmo();
  if (game.attackDisabledTimer > 0 || game.weapon !== 'radBeam' || (!unlimited && game.ammo <= 0)) {
    game.radBeamActive = false;
    return;
  }

  const firingTime = unlimited ? dt : Math.min(dt, game.ammo - game.radBeamDrainTimer);
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

  if (unlimited) return;
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
  const accelerationMultiplier = bullet.voidBatarAccelerationMultiplier || 1;
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
    distance += (speedStep + 1) * 200 * accelerationMultiplier * (segmentEnd - time);
    time = segmentEnd;
  }

  bullet.x += bullet.directionX * distance;
  bullet.y += bullet.directionY * distance;
  bullet.voidBatarElapsed = endTime;
  const speed = endTime < 1
    ? initialSpeed * (1 - endTime)
    : endTime < 2
      ? 0
      : (Math.floor((endTime - 2) / .25) + 1) * 200 * accelerationMultiplier;
  bullet.vx = bullet.directionX * speed;
  bullet.vy = bullet.directionY * speed;
}
function shoot() { 
  if (!game.active || game.attackDisabledTimer > 0) return;
  const weapon = getWeaponStats();
  const unlimited = hasInfiniteAmmo();
  if (weapon.continuousBeam) {
    game.radBeamActive = unlimited || game.ammo > 0;
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

  if (!unlimited) {
    if (game.ammo <= 0) {
      game.reloadPending = true;
      return;
    }
    game.ammo--;
    if (game.ammo === 0) game.reloadPending = true;
  }
  game.fireTimer = weapon.cooldown * effects.fireCooldownMultiplier * (!unlimited && game.ammo === 0 ? weapon.emptyReloadMultiplier || 1 : 1);

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
        pierce: Boolean(weapon.pierce || weapon.pierceHits),
        pierceHits: weapon.pierceHits,
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
        voidBatarAccelerationMultiplier: weapon.voidBatarAccelerationMultiplier || 1,
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
function useMedkit() { if (!game.active || !game.stationItems.medkit || game.health >= 100) return; game.stationItems.medkit = Math.max(0, (game.stationItems.medkit || 0) - 1); game.health = Math.min(100, game.health + 45); updateQuestProgress('heal'); writeLegacyValue('horde-station-items', JSON.stringify(game.stationItems)); updateAmmoUI(); ui.stationOutput.textContent = 'MEDKIT USED // +45% VITALITY'; }
function pulse() { if (game.attackDisabledTimer > 0 || game.pulseTimer > 0) return; game.pulseTimer = 7 * getBiome(game.player.x, game.player.y).effects.pulseCooldownMultiplier; game.enemies.forEach(e => { if (!e.defeated && e.shieldTimer <= 0 && e.hp && Math.hypot(e.x - game.player.x, e.y - game.player.y) < 170) { e.hp -= 2 * getPlayerDamageMultiplier(); if (e.hp <= 0) defeatEnemy(e, 50); burst(e.x, e.y, 8, 180); } }); burst(game.player.x, game.player.y, 35, 260); }
function createVoidWorm(x, y, canSplit = true) {
  const maxHp = 120.0;
  const enemy = { 
    x, y, family: 'VOID WORM', familyIndex: 24, ability: 'VOID BURROW', effect: null, 
    variant: 'COLOSSAL', boss: false, voidWorm: true, canSplit, color: '#8f7cff', r: 34, 
    speed: 200, hp: maxHp, maxHp, damage: 0, contactDamage: 10, score: 500, drops: 0, 
    abilityTimer: 1.5, shieldTimer: 0, hitTimer: 0 
  };

  attachEnemyHealth(enemy, maxHp);

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

  attachEnemyHealth(enemy, maxHp);

  return enemy;
}
function createVoidStalker() {
  const maxHp = stalkerMaxHealth;
  const enemy = {
    x: voidPortal.x + 450,
    y: voidPortal.y - 180,
    r: 58,
    speed: stalkerPhases[0].speed,
    voidStalker: true,
    isAggroed: false,
    huntState: 'patrol',
    huntTimer: 0,
    huntAngle: 0,
    phase: 1,
    pattern: 0,
    comboRemaining: 0,
    attack: 'lunge',
    zones: [],
    maxHp,
    color: '#b34dff',
    family: 'VOID STALKER',
    familyIndex: 24,
    variant: 'PORTAL GUARDIAN',
    boss: true,
    contactDamage: 20,
    score: 2500,
    drops: 25,
    abilityTimer: 0,
    shieldTimer: 0
  };

  attachEnemyHealth(enemy, maxHp);

  return enemy;
}

function hasContinuityKey(run = game) { return run.campaign.completed.includes('record'); }
function epilogueClue() {
  return 'The key answers northeast of Sanctuary, roughly 10,000 meters beyond the map edge (11,800 meters from Sanctuary). Cross the deep Void and look for an indigo arch. Avoid storm marks and unstable rifts. The Stalker is its guard.';
}
function epilogueNotice(text) {
  ui.announcement.textContent = text;
  ui.announcement.className = 'biome-announcement show';
  game.announcementTimer = 4;
  ui.stationOutput.textContent = text;
}
function epilogueObjective() {
  const { dungeon, guardianCleared, portalFound, firstClear } = game.epilogue;
  if (!dungeon) return firstClear ? 'FOREMAN DEFEATED // REMATCH AVAILABLE'
    : !guardianCleared ? 'FIND AND DEFEAT THE VOID STALKER' : portalFound ? 'ENTER THE VOID PORTAL' : 'FIND THE INDIGO ARCH';
  if (dungeon.room === 'arena') {
    if (dungeon.victory) return 'THE FOREMAN IS DOWN // EXIT OR RETURN TO STAGING';
    const boss = game.enemies.find(enemy => enemy.foreman);
    return `THE FOREMAN // PHASE ${boss?.phase ?? 1} OF 3 // ${boss?.waveGates.length ? 'HORDE INCOMING' : `HORDE WAVE ${boss?.wave ?? 0}`}`;
  }
  if (dungeonRooms[dungeon.room].enemies && !dungeon.cleared.includes(dungeon.room)) return 'CLEAR THE ROOM TO OPEN THE FORWARD DOORS';
  if (dungeon.room === 'relay' && dungeon.relayStep < relayOrder.length) return 'ALIGN THE RELAYS // READ THE PANEL AT THE CENTER';
  return `${dungeonRooms[dungeon.room].name.toUpperCase()} // ${interactBindingLabel()} AT MARKED DOORS`;
}
function restoreEpilogue(run, defaults) {
  if (Object.hasOwn(run, 'epilogue') && (!run.epilogue || typeof run.epilogue !== 'object')) throw new Error('Invalid epilogue state');
  const state = run.epilogue;
  if (['guardianCleared', 'portalFound', 'firstClear'].some(key => typeof state[key] !== 'boolean')
      || !Array.isArray(state.loot) || state.loot.some(id => !['supplies', 'records'].includes(id))
      || (state.firstClear && (!hasContinuityKey(run) || !state.guardianCleared))) throw new Error('Invalid epilogue progress');
  const dungeon = state.dungeon;
  if (dungeon !== null) {
    if (!dungeon || !hasContinuityKey(run) || !state.guardianCleared || !['entry', 'staging'].includes(dungeon.checkpoint)
        || !dungeon.world || dungeonWorldFields.some(key => !Array.isArray(dungeon.world[key]) && !(key === 'hazardZones' && dungeon.world[key] === null))
        || !Array.isArray(dungeon.cleared) || dungeon.cleared.some(id => !Object.hasOwn(dungeonRooms, id) || !dungeonRooms[id].enemies)
        || !Number.isInteger(dungeon.relayStep) || dungeon.relayStep < 0 || dungeon.relayStep > relayOrder.length) throw new Error('Invalid dungeon checkpoint');
    // Keep saved supplies and health, but discard transient room and combat state.
    for (const key of dungeonWorldFields) run[key] = defaults[key];
    dungeon.room = dungeon.checkpoint;
    dungeon.victory = false;
    run.player = { x: dungeonOrigin, y: 0, angle: run.player.angle };
    run.camera = { x: dungeonOrigin, y: 0 };
    run.meleeAttack = null;
    run.radBeamActive = false;
    run.biomeKey = null;
    run.stationOpen = null;
    run.activeBeaconStationId = null;
  }
  const overworld = dungeon?.world ?? run;
  overworld.enemies = overworld.enemies.filter(Boolean);
  const previous = overworld.enemies.find(enemy => enemy.voidStalker && !enemy.defeated);
  if (state.guardianCleared) overworld.enemies = overworld.enemies.filter(enemy => !enemy.voidStalker);
  else if (previous && (state.portalRevision !== 2 || !previous.phase)) {
    const updated = createVoidStalker();
    if (Number.isFinite(previous.hp) && previous.maxHp > 0) attachEnemyHealth(updated, updated.maxHp * Math.max(.01, Math.min(1, previous.hp / previous.maxHp)));
    overworld.enemies[overworld.enemies.indexOf(previous)] = updated;
  } else if (!previous && hasContinuityKey(run) && !dungeon) {
    overworld.enemies.push(createVoidStalker());
  }
  if (state.portalRevision !== 2) {
    state.portalFound = false;
    state.portalRevision = 2;
  }
  if (state.firstClear) run.blueprints.continuityWeave = true;
}
function clearDungeonCombat() {
  for (const key of dungeonWorldFields) game[key] = [];
  game.meleeAttack = null;
  game.radBeamActive = false;
}
function enterDungeon() {
  if (game.crafting || game.campaign.active) {
    epilogueNotice('FINISH ACTIVE CRAFTING AND STORY MISSIONS BEFORE ENTERING');
    return;
  }
  const world = Object.fromEntries(dungeonWorldFields.map(key => [key, game[key]]));
  game.epilogue.dungeon = { world, checkpoint: 'entry', room: 'entry', cleared: [], relayStep: 0, victory: false };
  game.stationOpen = null;
  game.activeBeaconStationId = null;
  switchDungeonRoom('entry');
}
function leaveDungeon() {
  const { world } = game.epilogue.dungeon;
  clearDungeonCombat();
  Object.assign(game, world);
  game.epilogue.dungeon = null;
  teleportPlayer(voidPortal.x - 110, voidPortal.y);
}
function switchDungeonRoom(id, from) {
  clearDungeonCombat();
  const dungeon = game.epilogue.dungeon;
  const room = dungeonRooms[id];
  dungeon.room = id;
  syncJournalDiscoveries();
  dungeon.victory = false;
  if (id === 'entry' || id === 'staging') dungeon.checkpoint = id;
  const arrival = room.doors.find(([target]) => target === from);
  teleportPlayer(dungeonOrigin + (arrival?.[1] ?? 0) * .78, (arrival?.[2] ?? 0) * .78);
  if (id === 'arena') game.enemies.push(createForeman());
  else if (room.enemies && !dungeon.cleared.includes(id)) {
    room.enemies.forEach((variant, index) => {
      const angle = index * Math.PI * 2 / room.enemies.length;
      const x = dungeonOrigin + Math.cos(angle) * room.w * .24;
      const y = Math.sin(angle) * room.h * .24;
      const enemy = createBiomeEnemy(x, y, {
        ...getDungeonBiome(), sector: 5, key: 'sector-4-0', enemyFamily: { name: 'CONTINUITY SENTINEL', ability: null, effect: null }
      }, enemyVariants[variant]);
      enemy.dungeonEnemy = true;
    });
  }
}
function dungeonControls() {
  const dungeon = game.epilogue.dungeon;
  const room = dungeonRooms[dungeon.room];
  const controls = room.doors.map(([id, x, y, label]) => ({ id, x, y, label, kind: 'door' }));
  if (dungeon.room === 'relay' && dungeon.relayStep < relayOrder.length) {
    controls.push({ x: 0, y: -70, label: 'Read maintenance panel', kind: 'panel' });
    controls.push(...['AMBER', 'WHITE', 'BLUE'].map((id, i) => ({ id, x: (i - 1) * 170, y: 140, kind: 'relay', label: `${id} relay` })));
  }
  if (room.loot && !game.epilogue.loot.includes(room.loot)) controls.push({ id: room.loot, x: 95, y: -95, label: 'Open sealed cache', kind: 'loot' });
  return controls;
}
function dungeonDoorLocked(id) {
  const dungeon = game.epilogue.dungeon;
  if (dungeon.room === 'arena') return !dungeon.victory;
  if (dungeon.room === 'relay' && id === 'ward') return dungeon.relayStep !== relayOrder.length;
  return Boolean(dungeonRooms[dungeon.room].enemies && !dungeon.cleared.includes(dungeon.room)
    && !((dungeon.room === 'works' && id === 'entry') || (dungeon.room === 'ward' && id === 'relay')
      || (dungeon.room === 'stores' && id === 'works') || (dungeon.room === 'records' && id === 'ward')));
}
function interactEpilogue() {
  const { dungeon, guardianCleared } = game.epilogue;
  if (dungeon) {
    const control = dungeonControls().find(({ x, y }) => Math.hypot(game.player.x - dungeonOrigin - x, game.player.y - y) <= 68);
    if (!control) return true;
    if (control.kind === 'door') {
      if (dungeonDoorLocked(control.id)) epilogueNotice('SEALED // COMPLETE THIS ROOM FIRST');
      else if (control.id === 'exit') leaveDungeon();
      else switchDungeonRoom(control.id, dungeon.room);
    } else if (control.kind === 'panel') {
      epilogueNotice('MAINTENANCE ORDER // BLUE (COOLING) → AMBER (POWER) → WHITE (SIGNAL)');
    } else if (control.kind === 'relay') {
      if (control.id === relayOrder[dungeon.relayStep]) dungeon.relayStep++;
      else dungeon.relayStep = Number(control.id === relayOrder[0]);
      epilogueNotice(dungeon.relayStep === relayOrder.length ? 'RELAY ALIGNED // WARD OPEN' : `RELAY ALIGNMENT // ${dungeon.relayStep} OF 3`);
    } else if (dungeon.cleared.includes(dungeon.room)) {
      game.epilogue.loot.push(control.id);
      rewardQuest({ reward: control.id === 'supplies' ? { medkits: 2, ammo: { pistolAmmo: 4 } } : { atlasCrystals: 2, relics: 1 } });
      epilogueNotice(control.id === 'supplies' ? 'CACHE RECOVERED // MEDKITS AND PISTOL CLIPS' : 'CACHE RECOVERED // ATLAS CRYSTALS AND A RELIC');
    } else epilogueNotice('CLEAR THE ROOM BEFORE OPENING THE CACHE');
    return true;
  }
  if (!hasContinuityKey() || Math.hypot(game.player.x - voidPortal.x, game.player.y - voidPortal.y) > 85) return false;
  game.epilogue.portalFound = true;
  if (!guardianCleared) epilogueNotice('PORTAL SEALED // DEFEAT THE VOID STALKER');
  else enterDungeon();
  return true;
}
function getDungeonBiome() {
  const base = getVoidBiome();
  return { ...base, name: dungeonRooms[game.epilogue.dungeon.room].name, key: 'continuity-dungeon',
    dark: '#111820', animationKey: 'dungeon', effects: { ...base.effects, moveMultiplier: 1 } };
}
function constrainDungeonPosition(entity, room = dungeonRooms[game.epilogue.dungeon.room]) {
  const padding = entity.r ?? 14;
  entity.x = Math.max(dungeonOrigin - room.w / 2 + padding, Math.min(dungeonOrigin + room.w / 2 - padding, entity.x));
  entity.y = Math.max(-room.h / 2 + padding, Math.min(room.h / 2 - padding, entity.y));
}
let epilogueAudio;
function enableEpilogueAudio() {
  if (!window.AudioContext) return;
  try {
    epilogueAudio ??= new window.AudioContext();
  } catch (error) {
    gameLog('WARN', 'Could not start boss audio', error.message);
    return;
  }
  if (epilogueAudio.state === 'suspended') epilogueAudio.resume().catch(error => gameLog('WARN', 'Could not enable boss audio', error.message));
}
function epilogueWarning(frequency) {
  if (epilogueAudio?.state !== 'running') return;
  const oscillator = epilogueAudio.createOscillator();
  const volume = epilogueAudio.createGain();
  const now = epilogueAudio.currentTime;
  oscillator.frequency.setValueAtTime(frequency, now);
  oscillator.frequency.exponentialRampToValueAtTime(frequency * .55, now + .3);
  volume.gain.setValueAtTime(.055, now);
  volume.gain.exponentialRampToValueAtTime(.001, now + .35);
  oscillator.connect(volume);
  volume.connect(epilogueAudio.destination);
  oscillator.start(now);
  oscillator.stop(now + .35);
}
function bossCharge(enemy, dt, speed, damage) {
  const x = enemy.x;
  const y = enemy.y;
  enemy.x += Math.cos(enemy.chargeAngle) * speed * dt;
  enemy.y += Math.sin(enemy.chargeAngle) * speed * dt;
  if (game.epilogue.dungeon) constrainDungeonPosition(enemy);
  const player = game.player;
  if (!enemy.chargeHit && projectileImpactTime(x, y, enemy.x, enemy.y, player.x, player.y, enemy.r + 10) !== null) {
    enemy.chargeHit = true;
    game.health -= damage * (1 - (getArmorEffects().contactDamageReduction || 0));
  }
}
function insideStalkerTerritory(player = game.player) {
  return Math.hypot(player.x, player.y) > mapRadius && Math.hypot(player.x - voidPortal.x, player.y - voidPortal.y) <= stalkerTerritory;
}
function updateVoidStalker(enemy, dt) {
  const p = game.player;
  const inTerritory = enemy.foremanReinforcement || insideStalkerTerritory(p);
  const distance = Math.hypot(p.x - enemy.x, p.y - enemy.y);
  const facing = Math.atan2(p.y - enemy.y, p.x - enemy.x);
  const remaining = enemy.huntTimer;
  enemy.huntTimer -= dt;
  if (!inTerritory || (!enemy.foremanReinforcement && Math.hypot(enemy.x - voidPortal.x, enemy.y - voidPortal.y) > stalkerTerritory + 200)) {
    enemy.isAggroed = false;
    enemy.huntState = 'patrol';
    enemy.comboRemaining = 0;
    enemy.zones = [];
  }
  if (enemy.huntState === 'patrol') {
    if (inTerritory && (enemy.isAggroed || distance < 650)) {
      enemy.isAggroed = true;
      enemy.huntState = 'circle';
      enemy.huntTimer = 2.2;
      return;
    }
    enemy.huntAngle = (enemy.huntAngle + dt * .20) % (Math.PI * 2);
    const x = voidPortal.x + Math.cos(enemy.huntAngle) * 510;
    const y = voidPortal.y + Math.sin(enemy.huntAngle) * 510;
    const angle = Math.atan2(y - enemy.y, x - enemy.x);
    const step = Math.min(240 * dt, Math.hypot(x - enemy.x, y - enemy.y));
    enemy.x += Math.cos(angle) * step;
    enemy.y += Math.sin(angle) * step;
    return;
  }
  const nextPhase = enemy.hp <= enemy.maxHp / 3 ? 3 : enemy.hp <= enemy.maxHp * 2 / 3 ? 2 : 1;
  if (nextPhase > enemy.phase) {
    enemy.phase = nextPhase;
    enemy.pattern = 0;
    enemy.comboRemaining = 0;
    enemy.zones = [];
    enemy.huntState = 'recover';
    enemy.huntTimer = 1.2;
    epilogueNotice(`VOID STALKER // PHASE ${enemy.phase} // ${enemy.phase === 2 ? 'RIFT AWAKENING' : 'VOID FRENZY'}`);
    epilogueWarning(110);
    return;
  }
  const phase = stalkerPhases[enemy.phase - 1];
  if (enemy.huntState === 'circle') {
    const direction = facing + (distance > 400 ? .38 : distance < 190 ? 1.8 : 1.16);
    const speed = enemy.speed * phase.speed / stalkerPhases[0].speed;
    enemy.x += Math.cos(direction) * speed * dt;
    enemy.y += Math.sin(direction) * speed * dt;
    if (enemy.huntTimer <= 0 && distance < 540) {
      enemy.huntState = 'windup';
      if (!(enemy.comboRemaining > 0)) enemy.comboRemaining = phase.combo;
      enemy.attack = phase.attacks[enemy.pattern++ % phase.attacks.length];
      enemy.huntTimer = phase.windup + (['marks', 'cross', 'shockwave'].includes(enemy.attack) ? .4 : 0);
      enemy.chargeAngle = facing;
      enemy.zones = enemy.attack === 'marks' ? [-1, 0, 1].map(offset => ({
        x: p.x + Math.cos(facing + Math.PI / 2) * offset * 200,
        y: p.y + Math.sin(facing + Math.PI / 2) * offset * 200,
        radius: 120
      })) : [];
      if (enemy.attack === 'cross') {
        enemy.zones = [
          { x: p.x, y: p.y, w: 140, h: 1250 },
          { x: p.x, y: p.y, w: 1250, h: 140 }
        ];
      } else if (enemy.attack === 'shockwave') {
        enemy.zones = [{ x: enemy.x, y: enemy.y, radius: 300 }];
      }
      epilogueWarning(150);
    }
  } else if (enemy.huntState === 'windup' && enemy.huntTimer <= 0) {
    if (enemy.attack === 'lunge') {
      enemy.huntState = 'lunge';
      enemy.huntTimer = .67;
      enemy.chargeHit = false;
    } else {
      if (enemy.attack === 'burst' || enemy.attack === 'fan') {
        const fan = enemy.attack === 'fan';
        const count = fan ? 5 + enemy.phase * 2 : 12 + enemy.phase * 4;
        for (let i = 0; i < count; i++) {
          const angle = enemy.chargeAngle + (fan ? (i - (count - 1) / 2) * .14 : i * Math.PI * 2 / count);
          const speed = fan ? 720 : 520;
          game.projectiles.push({ x: enemy.x, y: enemy.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
            life: 2.2, radius: 9, damage: 19 + enemy.phase * 3, color: '#b794ff' });
        }
      } else if (enemy.zones.some(zone => zone.radius
        ? Math.hypot(p.x - zone.x, p.y - zone.y) <= zone.radius
        : Math.abs(p.x - zone.x) <= zone.w / 2 && Math.abs(p.y - zone.y) <= zone.h / 2)) {
        game.health -= 34 * (1 - (getArmorEffects().voidDamageReduction || 0));
      }
      enemy.huntState = 'impact';
      enemy.huntTimer = .22;
    }
  } else if (enemy.huntState === 'lunge') {
    bossCharge(enemy, Math.min(dt, remaining), 1050 + enemy.phase * 75, 42);
  } else if (enemy.huntState === 'recover' && enemy.huntTimer <= 0) {
    enemy.huntState = 'circle';
    enemy.huntTimer = phase.approach;
  }
  if ((enemy.huntState === 'lunge' || enemy.huntState === 'impact') && enemy.huntTimer <= 0) {
    enemy.zones = [];
    enemy.comboRemaining = Math.max(0, (enemy.comboRemaining ?? 1) - 1);
    enemy.huntState = enemy.comboRemaining > 0 ? 'circle' : 'recover';
    enemy.huntTimer = enemy.comboRemaining > 0 ? .18 : phase.recovery;
  }
}
const foremanPhases = [
  { interval: 13, waveSize: 4, limit: 9, attacks: ['slam', 'fan', 'sweep'] },
  { interval: 10, waveSize: 6, limit: 14, attacks: ['charge', 'burst', 'slam', 'charge'] },
  { interval: 7, waveSize: 8, limit: 19, attacks: ['grid', 'charge', 'cross', 'burst', 'fan'] }
];
const foremanArenaLimit = 32;
const foremanReinforcements = [
  ['skirmisher', 42], ['hunter', 30], ['tank', 13], ['elite', 9],
  ['worm', 4], ['walker', 2], ['mini-boss', 1], ['stalker', .15]
];
function rollForemanReinforcement(roll, stalkerAvailable) {
  const pool = foremanReinforcements.filter(([type]) => type !== 'stalker' || stalkerAvailable);
  let ticket = roll * pool.reduce((total, [, weight]) => total + weight, 0);
  return pool.find(([, weight]) => (ticket -= weight) < 0)[0];
}
function updateForemanHorde(enemy, dt, phase) {
  enemy.waveTimer -= dt;
  if (enemy.waveTimer > 0) return;
  const living = game.enemies.filter(add => add !== enemy && add.hp > 0 && !add.defeated).length;
  if (!enemy.waveGates.length) {
    if (living >= phase.limit) {
      enemy.waveTimer = 2;
      return;
    }
    const { w, h } = dungeonRooms.arena;
    enemy.waveGates = [-1, 1].flatMap(side => [-1, 1].map(row => ({
      x: dungeonOrigin + side * (w / 2 - 100), y: row * (h / 2 - 90)
    })));
    enemy.waveTimer = 1.15;
    epilogueWarning(125);
    return;
  }
  const gates = enemy.waveGates.filter(gate => Math.hypot(game.player.x - gate.x, game.player.y - gate.y) >= 210);
  const count = gates.length ? Math.min(phase.waveSize, phase.limit - living) : 0;
  for (let i = 0; i < count; i++) {
    const gate = gates[i % gates.length];
    const angle = i * Math.PI * .75;
    const { x, y } = { x: gate.x + Math.cos(angle) * 28, y: gate.y + Math.sin(angle) * 28 };
    const type = rollForemanReinforcement(Math.random(), !enemy.summonedStalker);
    if (type === 'stalker') {
      const stalker = createVoidStalker();
      Object.assign(stalker, { x, y, foremanReinforcement: true, isAggroed: true, huntState: 'circle', huntTimer: 2 });
      if (addEnemy(stalker)) enemy.summonedStalker = true;
    } else if (type === 'worm' || type === 'walker') {
      addEnemy(type === 'worm' ? createVoidWorm(x, y) : createVoidWalker(x, y));
    } else {
      const sector = Math.floor(Math.random() * sectorRegions.length);
      const region = Math.floor(Math.random() * sectorRegions[sector].length);
      const variant = enemyVariants.find(entry => entry.name.toLowerCase() === type);
      createBiomeEnemy(x, y, { ...sectorRegions[sector][region], sector: sector + 1, key: `sector-${sector}-${region}` }, variant);
    }
  }
  if (count > 0) enemy.wave++;
  enemy.waveGates = [];
  enemy.waveTimer = count > 0 ? phase.interval : 2;
}
function createForeman() {
  const maxHp = 660;
  const enemy = { x: dungeonOrigin, y: -125, r: 60, hp: maxHp, maxHp, family: 'THE FOREMAN',
    variant: 'CONTINUITY OVERSEER', familyIndex: 24, boss: true, foreman: true, phase: 1,
    pattern: 0, moveState: 'recover', moveTimer: 2, contactDamage: 14, color: '#ff925e', shieldTimer: 0,
    wave: 0, waveTimer: 3, waveGates: [], summonedStalker: false };
  attachEnemyHealth(enemy);
  return enemy;
}
function updateForeman(enemy, dt) {
  const player = game.player;
  if (enemy.phase < 3 && enemy.hp <= enemy.maxHp * (3 - enemy.phase) / 3) {
    enemy.phase++;
    enemy.pattern = 0;
    enemy.moveState = 'recover';
    enemy.moveTimer = 1.7;
    enemy.r = enemy.phase === 2 ? 49 : 68;
    enemy.zones = [];
    enemy.waveTimer = Math.min(enemy.waveTimer, 1.7);
    epilogueNotice(enemy.phase === 2 ? 'THE FOREMAN // CONTAINMENT BROKEN' : 'THE FOREMAN // EMERGENCY OVERRIDE');
    epilogueWarning(260);
    return;
  }
  const phase = foremanPhases[enemy.phase - 1];
  if (game.epilogue.dungeon?.room === 'arena') updateForemanHorde(enemy, dt, phase);
  const remaining = enemy.moveTimer;
  enemy.moveTimer -= dt;
  if (enemy.moveState === 'charge') {
    bossCharge(enemy, Math.min(dt, remaining), enemy.phase === 2 ? 1080 : 1160, 34);
    if (enemy.moveTimer > 0) return;
    enemy.moveState = 'recover';
    enemy.moveTimer = 1.15;
    return;
  }
  if (enemy.moveTimer > 0) {
    if (enemy.moveState === 'recover' && enemy.phase > 1 && enemy.moveTimer < .8
        && Math.hypot(player.x - enemy.x, player.y - enemy.y) > 160) {
      const direction = Math.atan2(player.y - enemy.y, player.x - enemy.x);
      enemy.x += Math.cos(direction) * 145 * dt;
      enemy.y += Math.sin(direction) * 145 * dt;
    }
    return;
  }
  if (enemy.moveState === 'windup') {
    if (enemy.attack === 'charge') {
      enemy.moveState = 'charge';
      enemy.moveTimer = .65;
      enemy.chargeHit = false;
      return;
    }
    if (enemy.attack === 'fan' || enemy.attack === 'burst') {
      const radial = enemy.attack === 'burst';
      const count = radial ? 16 : 7;
      for (let i = 0; i < count; i++) {
        const angle = enemy.chargeAngle + (radial ? i * Math.PI * 2 / count : (i - 3) * .17);
        const speed = radial ? 485 : 660;
        game.projectiles.push({ x: enemy.x, y: enemy.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
          life: 1.9, radius: 8, damage: radial ? 17 : 14, color: '#ffcb81' });
      }
    } else if (enemy.zones.some(zone => zone.radius
      ? Math.hypot(player.x - zone.x, player.y - zone.y) <= zone.radius
      : Math.abs(player.x - zone.x) <= zone.w / 2 && Math.abs(player.y - zone.y) <= zone.h / 2)) {
      game.health -= (enemy.phase === 1 ? 25 : 35) * (1 - (getArmorEffects().voidDamageReduction || 0));
    }
    enemy.moveState = 'impact';
    enemy.moveTimer = .24;
    return;
  }
  if (enemy.moveState === 'impact') {
    enemy.moveState = 'recover';
    enemy.moveTimer = enemy.phase === 3 ? .85 : 1.2;
    enemy.zones = [];
    return;
  }
  enemy.moveState = 'windup';
  enemy.attack = phase.attacks[enemy.pattern++ % phase.attacks.length];
  enemy.moveTimer = enemy.attack === 'charge' ? .72 : enemy.attack === 'cross' ? 1.15 : 1;
  enemy.chargeAngle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
  enemy.zones = [];
  if (enemy.attack === 'slam') enemy.zones.push({ x: player.x, y: player.y, radius: 138 });
  if (enemy.attack === 'sweep' || enemy.attack === 'cross') {
    const { w, h } = dungeonRooms.arena;
    enemy.zones.push({ x: player.x, y: 0, w: 156, h });
    if (enemy.attack === 'cross') enemy.zones.push({ x: dungeonOrigin, y: player.y, w, h: 140 });
  }
  if (enemy.attack === 'grid') {
    enemy.zones.push({ x: player.x, y: player.y, radius: 155 });
    for (const x of [-490, -245, 0, 245, 490]) {
      enemy.zones.push({ x: dungeonOrigin + x, y: -228, radius: 105 }, { x: dungeonOrigin + x, y: 228, radius: 105 });
    }
  }
  epilogueWarning(enemy.phase === 1 ? 340 : 210);
}
function finishForeman() {
  const state = game.epilogue;
  state.dungeon.victory = true;
  clearDungeonCombat();
  game.enemyStatus = null;
  game.decayTimer = game.attackDisabledTimer = game.radioactiveBlindTimer = 0;
  if (state.firstClear) {
    epilogueNotice('THE FOREMAN DEFEATED // REMATCH COMPLETE');
    return;
  }
  state.firstClear = true;
  game.blueprints.continuityWeave = true;
  epilogueNotice('FIRST CLEAR // CONTINUITY WEAVE BLUEPRINT UNLOCKED');
  questDialog.dataset.sourceId = '';
  questDialog.innerHTML = `<div class="quest-dialog-inner"><strong>EPILOGUE // THE LAST SHIFT</strong><p>The Foreman's voice breaks through the static: “Shift complete. You can go home now.” The remaining machinery powers down. For the first time, the Continuity facility is quiet.</p><p>Blueprint recovered: Continuity Weave. The armour can now be crafted at an Arsenal.</p><button type="button" class="quest-close" data-quest-close>CLOSE</button></div>`;
  questDialog.hidden = false;
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
  const scalingSector = biome.worldEventId ? activeWorldEvent().sector : game.currentSector;
  const baseSpeed = 38 + scalingSector * 10 + Math.random() * 22;
  const familyIndex = (biome.sector - 1) * 4 + Number(biome.key.split('-')[2]);
  const scaledHp = Math.ceil(enemyVariant.hp * (1 + scalingSector * 0.2));
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
    ...(biome.worldEventId ? { worldEventId: biome.worldEventId } : {}),
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

  attachEnemyHealth(enemy, scaledHp);
  if (!addEnemy(enemy)) return null;
  if (hasEnemyEffect(enemy, 'death-fireballs')) attachEmberFireballs(enemy);
  if (enemy.effect === 'wraith-boss-guards') spawnWraithBossGuards(enemy);
  return enemy;
}

function attachEnemyHealth(enemy, initialHealth = enemy.hp ?? enemy.maxHp) {
  let health = initialHealth;
  Object.defineProperty(enemy, 'hp', {
    configurable: true,
    enumerable: true,
    get: () => health,
    set: value => {
      if (enemy.voidStalker && !enemy.foremanReinforcement && value < health && !insideStalkerTerritory()) return;
      if (enemy.foreman && value < health && enemy.phase < 3) value = Math.max(value, enemy.maxHp * (3 - enemy.phase) / 3);
      const attemptedDamage = health - value;
      if (attemptedDamage > 0 && hasEnemyEffect(enemy, 'wraith-boss-guards') && enemy.wraithGuards.some(guard => !guard.defeated)) return;
      if (attemptedDamage > 0 && hasEnemyEffect(enemy, 'damage-ignore') && Math.random() < .05) return;
      const previousHealth = health;
      if (attemptedDamage > 0 && (enemy.voidWalker || enemy.voidStalker)) enemy.isAggroed = true;
      health = value;
      if (health < previousHealth && hasEnemyEffect(enemy, 'damage-burst') && Math.random() < .5) triggerBoneOrchardHit(enemy);
      if (health < previousHealth && hasEnemyEffect(enemy, 'toxic-boss-burst') && enemy.toxicRetaliationCooldown <= 0) {
        createToxicBossZone(enemy);
        enemy.toxicRetaliationCooldown = 1;
      }
    }
  });
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

function createRadioactiveBombTelegraph(enemy) {
  game.radioactiveBombZones.push({
    x: game.player.x,
    y: game.player.y,
    owner: enemy,
    radius: radioactiveBombRadius,
    telegraphTimer: 2,
    active: false,
    life: 0
  });
}

function updateRadioactiveEffects(dt) {
  let auraDamagePerSecond = 0;
  let bombDamagePerSecond = 0;
  let blindsPlayer = false;
  game.enemies.forEach(enemy => {
    if (!enemy.defeated && hasEnemyEffect(enemy, 'radioactive-aura')
        && Math.hypot(game.player.x - enemy.x, game.player.y - enemy.y) < radioactiveAuraRadius) {
      auraDamagePerSecond = Math.max(auraDamagePerSecond, radioactiveAuraDamagePerSecond);
      blindsPlayer = true;
    }
  });
  game.radioactiveBombZones.forEach(zone => {
    let justActivated = false;
    if (!zone.active) {
      zone.telegraphTimer -= dt;
      if (zone.telegraphTimer <= 0) {
        zone.active = true;
        zone.life = 3;
        justActivated = true;
        burst(zone.x, zone.y, 20, 240);
      }
    } else if (!justActivated) {
      zone.life -= dt;
    }
    if (!zone.active) return;
    if (Math.hypot(game.player.x - zone.x, game.player.y - zone.y) < zone.radius) {
      bombDamagePerSecond += radioactiveAuraDamagePerSecond * 2;
      blindsPlayer = true;
    }
  });
  game.radioactiveBombZones = game.radioactiveBombZones.filter(zone => !zone.active || zone.life > 0);
  const armor = getArmorEffects();
  if (blindsPlayer) {
    game.health -= (auraDamagePerSecond + bombDamagePerSecond)
      * (1 - (armor.statusDamageReduction || 0))
      * (1 - (armor.radioactiveHazardDamageReduction || 0)) * dt;
  }
  game.radioactiveBlindTimer = armor.radioactiveBlindImmunity ? 0
    : blindsPlayer ? .2 : Math.max(0, game.radioactiveBlindTimer - dt);
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
    worldEventId: owner.worldEventId,
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
  game.portals.push({ x: enemy.x, y: enemy.y, timer: 2, worldEventId: enemy.worldEventId });
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
        sector: sectorIndex + 1,
        worldEventId: portal.worldEventId
      };
      const angle = Math.random() * Math.PI * 2;
      const variant = enemyVariants[3];
      createBiomeEnemy(spawnX + Math.cos(angle) * 45, spawnY + Math.sin(angle) * 45, biome, variant);
    }
    portal.timer = 0;
  });
  game.portals = game.portals.filter(portal => portal.timer > 0);
}

function triggerDeadStarExplosion(enemy, source = 'player') {
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
    if (target.hp <= 0) defeatEnemy(target, 0, source);
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

function defeatEnemy(enemy, bonus = 0, source = 'player') {
  if (!enemy || enemy.defeated || enemy.hp > 0) return;
  if (enemy.worldEventAnchor) { enemy.defeated = true; return; }
  const journalEntry = recordJournalEnemy(enemy);
  if (journalEntry && source === 'player') journalEntry.kills++;
  enemy.defeated = true;
  if (enemy.voidStalker && !enemy.foremanReinforcement) {
    game.epilogue.guardianCleared = true;
    if (hasContinuityKey()) epilogueNotice('VOID STALKER DEFEATED // PORTAL UNSEALED');
  }
  if (enemy.foreman) {
    finishForeman();
    return;
  }
  if (enemy.dungeonEnemy) {
    if (source === 'player') updateQuestProgress('kill');
    return;
  }
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
  if (hasEnemyEffect(enemy, 'dead-star-explosion')) triggerDeadStarExplosion(enemy, source);
  if (enemy.nebulaMissile) triggerNebulaMissileDeath(enemy);
  if (enemy.wraithPest && enemy.pestOwner && !enemy.pestOwner.defeated) {
    if (enemy.wraithBossPest) {
      enemy.pestOwner.wraithPests = enemy.pestOwner.wraithPests.filter(pest => pest !== enemy);
    } else {
      enemy.pestOwner.pest = null;
      enemy.pestOwner.pestCooldown = 7;
    }
  }
  const arena = game.epilogue.dungeon?.room === 'arena';
  if (enemy.voidWorm) {
    if (!arena && Math.random() < .33) game.atlasCrystals++;
    if (enemy.canSplit && Math.random() < .15) {
      const activeWorms = game.enemies.filter(candidate => candidate.voidWorm && !candidate.defeated).length;
      const splitCount = Math.min(2, Math.max(0, 8 - activeWorms));
      for (let i = 0; i < splitCount; i++) addEnemy(createVoidWorm(enemy.x + (i ? 26 : -26), enemy.y, false));
    }
    if (arena) {
      if (source === 'player') updateQuestProgress('kill');
      return;
    }
  }
  if (!enemy.wraithPest && !enemy.nebulaMissile && !enemy.wraithGuard) dropResource(enemy.x, enemy.y, enemy.drops || 1);
  game.score += (enemy.score || 100) + bonus;
  if (enemy.boss && Math.random() < .5) {
    game.relics++;
    updateQuestProgress('relic');
  }
  if (enemy.boss && enemy.effect === 'radioactive-boss-bomb' && Math.random() < .35
      && !isBlueprintUnlocked('radBeam')) {
    game.blueprints.radBeam = true;
    ui.stationOutput.textContent = 'BLUEPRINT RECOVERED // RAD BEAM';
    ui.announcement.textContent = 'BLUEPRINT RECOVERED // RAD BEAM';
    ui.announcement.className = 'biome-announcement show';
    game.announcementTimer = 4;
    gameLog('INFO', 'Blueprint recovered: RAD BEAM');
  }
  if (source === 'player') updateQuestProgress('kill');
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
function collectDrop(drop) { game.inventory[drop.type] += drop.amount; updateQuestProgress('collect', drop.amount); drop.life = 0; }
function reloadAmmo() {
  if (hasInfiniteAmmo() || !game.reloadPending || game.fireTimer > 0) return;
  const weapon = getWeaponStats();
  if (weapon.kind === 'melee') {
    game.reloadPending = false;
    return;
  }
  const reserve = game.ammoReserve[weapon.ammo] || 0;
  const loose = game.weaponMods.looseAmmo[weapon.ammo] || 0;
  const needed = weapon.magazine - game.ammo;
  if ((!reserve && !loose) || needed <= 0) {
    if (needed <= 0) game.reloadPending = false;
    return;
  }
  const returnedRounds = Math.min(needed, loose);
  game.ammo += returnedRounds;
  if (returnedRounds) game.weaponMods.looseAmmo[weapon.ammo] -= returnedRounds;
  if (game.ammo < weapon.magazine && reserve) {
    game.ammo = weapon.magazine;
    game.ammoReserve[weapon.ammo] = reserve - 1;
  }
  if (game.weapon === 'cosmosGauntlet') releaseCosmosExplosion();
  game.reloadPending = false;
}
function getAmmoLabel() { return weaponCatalog[game.weapon].kind === 'melee' ? 'MELEE' : hasInfiniteAmmo() ? '∞' : game.ammo; }
function updateAmmoUI() { const weapon = weaponCatalog[game.weapon]; ui.ammo.textContent = getAmmoLabel(); ui.ammoStorage.textContent = weapon.kind === 'melee' ? '-' : game.ammoReserve[weapon.ammo] || 0; ui.medkits.textContent = game.stationItems.medkit || 0; ui.weaponName.textContent = weapon.name; ui.ammoType.textContent = weapon.kind === 'melee' ? 'CLOSE RANGE' : ammoCatalog[weapon.ammo].name; }
function updateAtlasCrystalUI() { if (atlasCrystalCounter) atlasCrystalCounter.textContent = String(game.atlasCrystals || 0).padStart(2, '0'); }
const baseUpdateAmmoUI = updateAmmoUI;
updateAmmoUI = function() {
  baseUpdateAmmoUI();
  const ammo = weaponCatalog[game.weapon].ammo;
  const loose = game.weaponMods.looseAmmo[ammo] || 0;
  if (loose) ui.ammoStorage.textContent = `${game.ammoReserve[ammo] || 0} + ${loose}R`;
  ui.ammoStorage.title = 'Full reloads + returned loose rounds (R)';
  updateAtlasCrystalUI();
};
function getNearbyStation() {
  const candidates = [
    ...Object.entries(sanctuaryBuildStations).map(([type, position]) => ({ type, ...position })),
    ...game.placedStations.map(station => ({
      type: station.type === 'workbench' ? 'crafting' : station.type === 'bountyBoard' ? 'bountyBoard' : 'furnace',
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
  const labels = { workbench: 'WORKBENCH', furnace: 'FURNACE', bountyBoard: 'BOUNTY BOARD' };
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
  renderWorldEventHud();
  game.stationOpen = null;
  game.activeBeaconStationId = null;
  gameShell.classList.add('manager-view');
  clearControlInput();
  ui.stations.hidden = true;
  ui.manager.hidden = false;
  renderManagerInventory();
}
function exitManagersTable() {
  if (!game.managerMode) return;
  game.managerMode = false;
  game.paused = false;
  renderWorldEventHud();
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
    updateQuestProgress('repair');
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
  if (interactEpilogue()) return;
  if (interactCampaignSite()) return;
  if (interactWorldEvent()) return;
  const questSource = getNearbyQuestSource();
  if (questSource) {
    updateStationUI();
    renderQuestDialog(questSource);
    return;
  }
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
  document.querySelectorAll('[data-station]').forEach(card => { card.hidden = card.dataset.station !== game.stationOpen; });
  const title = ui.stations.querySelector('.station-title');
  if (title) title.textContent = game.stationOpen === 'beacon-repair'
    ? 'BEACON STATION // REPAIR'
    : game.stationOpen === 'beacon-modules'
      ? 'BEACON STATION // MODULE STATION'
      : game.activeBeaconStationId ? 'BEACON STATION // CRAFTING TABLE'
        : game.stationOpen === 'designer' ? 'SANCTUARY // DESIGNER TABLE' : 'SANCTUARY // WORKSHOPS';
}
function bankInventory() { let deposited = false; resourceTypes.forEach(resource => { const amount = game.inventory[resource.key]; if (!amount) return; game.vault[resource.key] = (game.vault[resource.key] || 0) + amount; game.inventory[resource.key] = 0; deposited = true; }); if (deposited) writeLegacyValue('horde-vault', JSON.stringify(game.vault)); return deposited; }
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
const blueprintTierCosts = {
  sidearm: 0, machete: 0, spear: 0, smg: 10, duelSidearm: 15,
  shotgun: 25, burstRifle: 30, flamethrower: 35, warHammer: 40, sniper: 45,
  laser: 55, grenadeLauncher: 60, pulseCarbine: 65, combatPistol: 70, laserBlade: 75,
  magicGauntlet: 90, minigun: 95, railgun: 110, voidBatar: 130, radBeam: 150, cosmosGauntlet: 170,
  scoutArmor: 10, reinforcedArmor: 25, hazardArmor: 50, voidArmor: 90, hazmatSuit: 120
};
function getBlueprintRepCost(recipeKey) {
  return blueprintTierCosts[recipeKey] ?? 0;
}
function requiresBlueprint(recipeKey) {
  return Boolean(weaponRecipes[recipeKey] || armorRecipes[recipeKey]);
}
function getBlueprintSalvageCost(recipeKey) {
  return 10 + Math.ceil(getBlueprintRepCost(recipeKey) * 1.5 / 5) * 5;
}
function getBlueprintRequirementLabel(recipeKey) {
  if (recipeKey === 'continuityWeave') return 'BLUEPRINT REQUIRED // DEFEAT THE FOREMAN';
  return recipeKey === 'radBeam'
    ? 'BLUEPRINT REQUIRED // RADIOACTIVE MINI-BOSS DROP (35%)'
    : `BLUEPRINT REQUIRED // ARMORER: ${getBlueprintRepCost(recipeKey)} REP + ${getBlueprintSalvageCost(recipeKey)} SALVAGE`;
}
function isBlueprintUnlocked(recipeKey) {
  return !requiresBlueprint(recipeKey) || Boolean(game.blueprints?.[recipeKey]);
}
function getBlueprintName(recipeKey) {
  return stationRecipes[recipeKey]?.name || recipeKey.toUpperCase();
}
function buyBlueprint(recipeKey) {
  if (salvageDeposit) {
    showQuestMessage('BANKING SALVAGE // TRY AGAIN IN A MOMENT');
    return false;
  }
  if (!requiresBlueprint(recipeKey) || ['radBeam', 'continuityWeave'].includes(recipeKey)) {
    showQuestMessage(requiresBlueprint(recipeKey) ? getBlueprintRequirementLabel(recipeKey) : 'THIS RECIPE DOES NOT REQUIRE A BLUEPRINT');
    gameLog('WARN', `Blueprint purchase unavailable: ${recipeKey}`);
    return;
  }
  if (isBlueprintUnlocked(recipeKey)) return;
  const rep = getBlueprintRepCost(recipeKey);
  const price = getBlueprintSalvageCost(recipeKey);
  if (game.armorerRep < rep) {
    showQuestMessage(`ARMORER REP REQUIRED // ${rep}`);
    return;
  }
  if (game.salvage + game.banked < price) {
    showQuestMessage(`SALVAGE REQUIRED // ${price}`);
    return;
  }
  const carried = Math.min(game.salvage, price);
  game.salvage -= carried;
  game.banked -= price - carried;
  game.blueprints[recipeKey] = true;
  updateStationButtons();
  renderQuestDialog('armorer');
  showQuestMessage(`BLUEPRINT PURCHASED // ${getBlueprintName(recipeKey)}`);
}
function renderBlueprintShop() {
  const recipeKeys = [...Object.keys(weaponRecipes), ...Object.keys(armorRecipes)];
  const salvage = game.salvage + game.banked;
  return `<div class="quest-shop"><b>ARMORER BLUEPRINTS // REP ${game.armorerRep} // SALVAGE ${salvage}</b><p>Reputation is permanent. Purchases spend salvage only.</p>${recipeKeys.map(recipeKey => {
    const rep = getBlueprintRepCost(recipeKey);
    const price = getBlueprintSalvageCost(recipeKey);
    const owned = isBlueprintUnlocked(recipeKey);
    const dropOnly = ['radBeam', 'continuityWeave'].includes(recipeKey);
    return `<div class="blueprint-row"><span>${getBlueprintName(recipeKey)}</span><small>${owned ? 'OWNED' : dropOnly ? getBlueprintRequirementLabel(recipeKey) : `${rep} REP // ${price} SALVAGE`}</small>${owned || dropOnly ? '' : `<button type="button" data-buy-blueprint="${recipeKey}" ${game.armorerRep < rep || salvage < price ? 'disabled' : ''}>BUY</button>`}</div>`;
  }).join('')}</div>`;
}
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
function craftItem(recipeKey, requestedQuantity = 1) { if (getBiome(game.player.x, game.player.y).key !== 'sanctuary' || game.crafting) return; const recipe = stationRecipes[recipeKey]; const repeatable = !recipe.weapon && !recipe.armor; const quantity = repeatable ? Math.max(1, Math.min(5, requestedQuantity)) : 1; if (recipe.output?.medkit && (game.stationItems.medkit || 0) + quantity > 5) { ui.stationOutput.textContent = 'MEDKIT STORAGE FULL'; return; } const missing = Object.entries(recipe.cost).find(([key, amount]) => getCraftResourceAmount(key) < amount * quantity); if (missing) { const shortage = missing[1] * quantity - getCraftResourceAmount(missing[0]); ui.stationOutput.textContent = `NEED ${shortage} MORE ${missing[0].toUpperCase()}`; return; } Object.entries(recipe.cost).forEach(([key, amount]) => { spendCraftResource(key, amount * quantity); }); game.crafting = { recipeKey, quantity, remaining: recipe.time * quantity, total: recipe.time * quantity }; writeLegacyValue('horde-vault', JSON.stringify(game.vault)); updateInventoryUI(); updateStationButtons(); ui.stationOutput.textContent = `CRAFTING ${recipe.name} x${quantity} // ${recipe.time * quantity}s`; openCraftDetails(recipeKey, quantity); }
function getStationRecipe(recipeKey) {
  if (recipeKey === 'depotResupply') return game.crafting?.orders ? depotResupplyRecipe(game.crafting.orders) : null;
  if (recipeKey === 'medkit' && game.sanctuary.projects.medical >= 2) {
    const recipe = stationRecipes.medkit;
    return { ...recipe, cost: Object.fromEntries(Object.entries(recipe.cost).map(([id, amount]) =>
      [id, Math.max(1, Math.floor(amount * .85))])) };
  }
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
    },
    buildBountyBoard: {
      name: 'BOUNTY BOARD',
      time: 12,
      cost: { wood: 70, iron: 20, fiber: 25 },
      managerStationType: 'bountyBoard'
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
  writeLegacyValue('horde-beacon-stations', JSON.stringify(savedStates));
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
        if (target.enemy.hp <= 0) defeatEnemy(target.enemy, 0, 'beacon-turret');
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
    if (enemy.hp <= 0) defeatEnemy(enemy, 0, 'beacon-turret');
  });
}
function updateBeaconTurretProjectiles(dt) {
  game.projectiles.forEach(projectile => {
    if (!projectile.turretProjectile || projectile.life <= 0) return;
    const travelTime = Math.min(dt, projectile.life);
    const dx = projectile.vx * travelTime;
    const dy = projectile.vy * travelTime;
    let hit = null;
    let hitTime = Infinity;
    for (const enemy of game.enemies) {
      if (enemy.defeated || enemy.shieldTimer > 0 || enemy.hp <= 0) continue;
      const time = projectileImpactTime(projectile.x, projectile.y, projectile.x + dx, projectile.y + dy,
        enemy.x, enemy.y, enemy.r + projectile.radius);
      if (time === null || time >= hitTime) continue;
      hit = enemy;
      hitTime = time;
    }
    projectile.x += dx * (hit ? hitTime : 1);
    projectile.y += dy * (hit ? hitTime : 1);
    projectile.life -= dt;
    if (hit && projectile.explosive) {
      detonateBeaconGrenade(projectile);
      projectile.life = 0;
    } else if (hit) {
      hit.hp = Math.max(0, hit.hp - projectile.damage);
      if (hit.hp <= 0) defeatEnemy(hit, 0, 'beacon-turret');
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
        if (enemy.hp <= 0) defeatEnemy(enemy, 0, 'beacon-drain');
      });
    }
  });
}
function finishBeaconRepair(station) {
  station.repaired = true;
  createBeaconTurrets(station);
  saveBeaconStations();
  updateQuestProgress('repairBeacon');
  updateQuestProgress('repair');
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
      finishBeaconRepair(station);
      game.stationOpen = 'crafting';
      updateStationUI();
    }
  } else if (recipe.managerStationType) {
    game.craftedStations[recipe.managerStationType] =
      (game.craftedStations[recipe.managerStationType] || 0) + quantity;
    renderManagerInventory();
    updateQuestProgress('repair');
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
  } else if (recipe.ammoOutput) {
    Object.entries(recipe.ammoOutput).forEach(([id, amount]) => { game.ammoReserve[id] = (game.ammoReserve[id] || 0) + amount; });
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
  writeLegacyValue('horde-vault', JSON.stringify(game.vault));
  writeLegacyValue('horde-station-items', JSON.stringify(game.stationItems));
  const completedRecipeKey = game.crafting.recipeKey;
  game.crafting = null;
  updateInventoryUI();
  updateStationButtons();
  updateAmmoUI();
  renderWeaponBar();
  ui.stationOutput.textContent = `COMPLETE // ${recipe.name} x${quantity}`;
  if (recipe.beaconRepairId || recipe.ammoOutput) {
    ui.craftDetails.hidden = true;
    ui.craftDetails.innerHTML = '';
    if (recipe.ammoOutput && !questDialog.hidden && questDialog.dataset.sourceId === 'quartermaster') renderQuestDialog('quartermaster');
  } else {
    openCraftDetails(completedRecipeKey, 1);
  }
}
function getWeaponPrerequisite(recipe) { return recipe.weapon ? Object.keys(recipe.cost || {}).find(key => weaponCatalog[key]) || null : null; }
function getWeaponTargetSlot(recipe, requestedSlot = 0) { const prerequisite = getWeaponPrerequisite(recipe); if (prerequisite) return game.weaponSlots.indexOf(prerequisite); if (requestedSlot >= 0 && requestedSlot < game.weaponSlots.length) return requestedSlot; return game.weaponSlots.findIndex(slot => !slot); }
function openCraftDetails(recipeKey, requestedQuantity = 1, requestedSlot = 0) {
  const recipe = getStationRecipe(recipeKey);
  if (!recipe) return;
  const blueprintLocked = !isBlueprintUnlocked(recipeKey);
  const repeatable = !recipe.weapon && !recipe.armor && !recipe.beaconRepairId && !recipe.beaconModule;
  const quantity = repeatable ? Math.max(1, Math.min(5, requestedQuantity)) : 1;
  const targetSlot = getWeaponTargetSlot(recipe, requestedSlot);
  const costEntries = Object.entries(recipe.cost || {});
  const materialRows = costEntries.map(([key, amount]) => {
    const resource = resourceTypes.find(item => item.key === key) || { name: key === 'steelPlate' ? 'STEEL PLATE' : key.toUpperCase() };
    const required = amount * quantity;
    const owned = getCraftResourceAmount(key);
    return `<li class="${owned >= required ? 'ready' : 'missing'}"><span>${resource.name}</span><strong>${owned} / ${required}</strong></li>`;
  }).join('');
  const missing = costEntries.find(([key, amount]) => getCraftResourceAmount(key) < amount * quantity);
  const capacityExceeded = recipe.output?.medkit && (game.stationItems.medkit || 0) + quantity > 5;
  const canCraft = !blueprintLocked && !missing && !capacityExceeded && !game.crafting && (!recipe.weapon || targetSlot >= 0);
  const quantityControls = repeatable ? `<div class="craft-quantity-controls"><span>QUANTITY</span>${[1, 2, 3, 4, 5].map(value => `<button type="button" data-craft-quantity="${value}" class="${value === quantity ? 'selected' : ''}" ${game.crafting || blueprintLocked ? 'disabled' : ''}>${value}</button>`).join('')}</div>` : '';
  const slotControls = recipe.weapon ? `<div class="craft-slot-controls"><span>SLOT</span>${game.weaponSlots.map((slot, index) => {
    const prerequisite = getWeaponPrerequisite(recipe);
    const locked = Boolean(slot) && slot !== prerequisite;
    const selected = targetSlot === index;
    return `<button type="button" data-craft-slot="${index}" class="${selected ? 'selected' : ''}" ${locked || game.crafting || blueprintLocked ? 'disabled' : ''}>${index + 1}${slot ? ` ${weaponCatalog[slot].name}` : ' EMPTY'}</button>`;
  }).join('')}</div>` : '';
  const actionLabel = blueprintLocked ? 'BLUEPRINT REQUIRED' : game.crafting ? 'CRAFTING' : capacityExceeded ? 'STORAGE FULL' : !recipe.weapon || targetSlot >= 0 ? (canCraft ? `CRAFT x${quantity}` : 'NEED MATERIALS') : 'NO EMPTY SLOT';
  ui.craftDetails.dataset.recipeKey = recipeKey;
  ui.craftDetails.dataset.quantity = quantity;
  ui.craftDetails.dataset.weaponSlot = targetSlot;
  ui.craftDetails.innerHTML = `<div class="craft-details-header"><strong>${recipe.name}</strong><button type="button" class="detail-close" data-close-details>✕</button></div><div class="craft-details-body"><div class="craft-detail-title">${blueprintLocked ? getBlueprintRequirementLabel(recipeKey) : 'REQUIRED MATERIALS'}</div><ul class="craft-detail-list">${materialRows}</ul><div class="craft-detail-actions">${slotControls}${quantityControls}<button type="button" data-craft-confirm="${recipeKey}" ${canCraft ? '' : 'disabled'}>${actionLabel}</button></div></div>`;
  ui.craftDetails.hidden = false;
}
function craftItem(recipeKey, requestedQuantity = 1, requestedSlot = Number(ui.craftDetails.dataset.weaponSlot || 0)) {
  const recipe = getStationRecipe(recipeKey);
  if (!recipe || game.crafting) return;
  if (!isBlueprintUnlocked(recipeKey)) {
    ui.stationOutput.textContent = getBlueprintRequirementLabel(recipeKey);
    return;
  }
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
    writeLegacyValue('horde-vault', JSON.stringify(game.vault));
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
  writeLegacyValue('horde-vault', JSON.stringify(game.vault));
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
  ui.craftDetails.querySelectorAll('[data-craft-slot]').forEach(button => button.disabled = Boolean(game.crafting) || !isBlueprintUnlocked(recipeKey));
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
  game.radioactiveBombZones.forEach(zone => {
    ctx.save();
    const activeAlpha = zone.active ? .35 * Math.max(0, zone.life / 3) : .42;
    ctx.globalAlpha = activeAlpha;
    ctx.fillStyle = zone.active ? '#e34c4c' : '#ff7777';
    ctx.strokeStyle = zone.active ? '#ff7777' : '#ffd0a8';
    ctx.lineWidth = zone.active ? 4 : 5;
    ctx.beginPath();
    ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (!zone.active) {
      ctx.globalAlpha = .8;
      ctx.setLineDash([14, 10]);
      ctx.beginPath();
      ctx.arc(zone.x, zone.y, zone.radius * Math.max(.15, zone.telegraphTimer / 2), 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  });
  game.lightningStrikes.forEach(strike => {
    ctx.save();
    if (strike.struck) {
      ctx.globalAlpha = Math.max(0, strike.flashTimer / .25) * (settings.reducedEffects ? .35 : 1);
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
    if (hasEnemyEffect(enemy, 'radioactive-aura')) {
      ctx.save();
      ctx.globalAlpha = .18 + Math.sin(performance.now() / 160) * .04;
      ctx.fillStyle = '#e34c4c';
      ctx.strokeStyle = '#ff7777';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, radioactiveAuraRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
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
  if (game.epilogue.dungeon) return;
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
  for (const [id, project] of Object.entries(sanctuaryProjects)) {
    const level = game.sanctuary.projects[id];
    ctx.strokeStyle = level ? '#8fe0ad' : '#74695c';
    ctx.fillStyle = level === 2 ? '#29493d' : '#302a2c';
    ctx.lineWidth = level ? 3 : 1;
    ctx.fillRect(project.x - 55, project.y - 35, 110, 70);
    ctx.strokeRect(project.x - 55, project.y - 35, 110, 70);
    if (level) {
      ctx.fillStyle = '#8fe0ad';
      for (let window = 0; window < level + 1; window++) ctx.fillRect(project.x - 36 + window * 28, project.y - 18, 14, 14);
    }
    if (level === 2) {
      ctx.beginPath();
      ctx.moveTo(project.x - 64, project.y - 35);
      ctx.lineTo(project.x, project.y - 62);
      ctx.lineTo(project.x + 64, project.y - 35);
      ctx.stroke();
    }
    ctx.textAlign = 'center';
    ctx.font = 'bold 9px Space Mono';
    ctx.fillStyle = level ? '#8fe0ad' : '#b5a896';
    ctx.fillText(`${project.name} // ${level ? `STAGE ${level}` : 'UNBUILT'}`, project.x, project.y + 51);
    ctx.fillText(`SPEAK TO ${questNpcById(project.npc).name}`, project.x, project.y + 65);
  }
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
    const isBoard = station.type === 'bountyBoard';
    ctx.fillStyle = station.type === 'workbench' ? '#8b5a3c' : isBoard ? '#5d4778' : '#493a36';
    ctx.strokeStyle = station.type === 'workbench' ? '#f9c779' : isBoard ? '#d58ee0' : '#ff865c';
    ctx.lineWidth = 3;
    ctx.fillRect(station.x - placedStationRadius, station.y - placedStationRadius, placedStationRadius * 2, placedStationRadius * 2);
    ctx.strokeRect(station.x - placedStationRadius, station.y - placedStationRadius, placedStationRadius * 2, placedStationRadius * 2);
    ctx.fillStyle = station.type === 'workbench' ? '#c88968' : isBoard ? '#d58ee0' : '#ff865c';
    if (station.type === 'workbench') ctx.fillRect(station.x - 20, station.y - 28, 40, 7);
    else if (isBoard) ctx.fillRect(station.x - 18, station.y - 25, 36, 8);
    else {
      ctx.beginPath();
      ctx.arc(station.x, station.y, 10, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.textAlign = 'center';
    ctx.font = 'bold 8px Space Mono';
    ctx.fillStyle = '#f4eee5';
    ctx.fillText(station.type === 'workbench' ? 'WORKBENCH' : isBoard ? 'BOUNTY BOARD' : 'FURNACE', station.x, station.y + 36);
    if (Math.hypot(game.player.x - station.x, game.player.y - station.y) <= stationInteractionRadius) {
      ctx.fillText(`${interactBindingLabel()} // ${station.type === 'workbench' ? 'CRAFT' : isBoard ? 'BOUNTIES' : 'FURNACE'}`, station.x, station.y + 49);
    }
  });
  if (game.managerMode && managerDrag?.clientX !== undefined) {
    const world = managerScreenToWorld(managerDrag.clientX, managerDrag.clientY);
    ctx.globalAlpha = .65;
    const isBoard = managerDrag.type === 'bountyBoard';
    ctx.fillStyle = managerDrag.type === 'workbench' ? '#8b5a3c' : isBoard ? '#5d4778' : '#493a36';
    ctx.strokeStyle = managerDrag.type === 'workbench' ? '#f9c779' : isBoard ? '#d58ee0' : '#ff865c';
    ctx.fillRect(world.x - placedStationRadius, world.y - placedStationRadius, placedStationRadius * 2, placedStationRadius * 2);
    ctx.strokeRect(world.x - placedStationRadius, world.y - placedStationRadius, placedStationRadius * 2, placedStationRadius * 2);
    ctx.globalAlpha = 1;
  }
  Object.entries(sanctuaryBuildStations).forEach(([type, position]) => {
    if (Math.hypot(game.player.x - position.x, game.player.y - position.y) > stationInteractionRadius) return;
    ctx.textAlign = 'center';
    ctx.font = 'bold 10px Space Mono';
    ctx.fillStyle = '#f4eee5';
    ctx.fillText(`${interactBindingLabel()} // ${type === 'designer' ? 'DESIGN' : 'MANAGE'}`, position.x, position.y + 50);
  });
  ctx.restore();
}
function getSanctuaryNpcPositions(time = game.elapsedTime) {
  const positions = sanctuaryNpcDefinitions.map((npc, index) => getSanctuaryNpcPosition(npc, index, time));
  for (let pass = 0; pass < 2; pass++) {
    for (let first = 0; first < positions.length; first++) {
      for (let second = first + 1; second < positions.length; second++) {
        const dx = positions[second].x - positions[first].x;
        const dy = positions[second].y - positions[first].y;
        const distance = Math.hypot(dx, dy);
        if (distance >= 42) continue;
        const angle = distance ? Math.atan2(dy, dx) : (first + second) * Math.PI / 3;
        const push = (42 - distance) / 2;
        positions[first].x -= Math.cos(angle) * push;
        positions[first].y -= Math.sin(angle) * push;
        positions[second].x += Math.cos(angle) * push;
        positions[second].y += Math.sin(angle) * push;
      }
    }
  }
  return positions;
}
function drawSanctuaryNpcs() {
  const camX = game.camera.x - canvas.clientWidth / 2;
  const camY = game.camera.y - canvas.clientHeight / 2;
  const time = game.elapsedTime;
  const positions = getSanctuaryNpcPositions(time);
  const mission = currentCampaignMission();
  ctx.save();
  ctx.translate(-camX, -camY);
  sanctuaryNpcDefinitions.forEach((npc, index) => {
    const position = positions[index];
    const wanderX = position.x;
    const wanderY = position.y;
    ctx.fillStyle = '#17131a';
    ctx.strokeStyle = npc.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(wanderX, wanderY, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = npc.color;
    ctx.beginPath();
    ctx.arc(wanderX, wanderY - 5, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.font = 'bold 9px Space Mono';
    ctx.fillStyle = '#f4eee5';
    ctx.fillText(npc.name, wanderX, wanderY + 31);
    if (mission?.npcId === npc.id && (!game.campaign.active || campaignReady(mission))) {
      ctx.fillStyle = '#b9f4ff';
      ctx.fillText(game.campaign.active ? 'MAIN QUEST TURN-IN' : 'MAIN QUEST', wanderX, wanderY + 57);
    }
    if (Math.hypot(game.player.x - wanderX, game.player.y - wanderY) <= stationInteractionRadius) {
      ctx.fillStyle = npc.color;
      ctx.fillText(`${interactBindingLabel()} // TALK`, wanderX, wanderY + 44);
    }
  });
  for (let first = 0; first < positions.length; first++) {
    for (let second = first + 1; second < positions.length; second++) {
      if (Math.hypot(positions[first].x - positions[second].x, positions[first].y - positions[second].y) > 180) continue;
      const midpointX = (positions[first].x + positions[second].x) / 2;
      const dialogueY = Math.min(positions[first].y, positions[second].y) - 30;
      ctx.fillStyle = '#d58ee0';
      ctx.font = 'bold 8px Space Mono';
      const line = getNpcConversationLine(first, second, time);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(line, midpointX, dialogueY);
      ctx.textBaseline = 'alphabetic';
    }
  }
  ctx.restore();
}
function getNpcConversationLine(first, second, time) {
  const left = sanctuaryNpcDefinitions[first];
  const right = sanctuaryNpcDefinitions[second];
  const active = game.questState?.active || [];
  const ready = active.filter(quest => quest.progress >= quest.amount).length;
  const biome = getBiome(game.player.x, game.player.y);
  const conversations = {
    emergency: [
      'THE RUNNER LOOKS HALF-DEAD. SEND THE MEDIC.',
      'THEIR VITALS ARE LOW. KEEP A MEDKIT READY.',
      'NO MISSION IS WORTH LOSING THE RUNNER.',
      'WE SHOULD HAVE BUILT A LARGER MEDICAL STOCKPILE.'
    ],
    horde: [
      'THE HORDE IS THICKENING OUT THERE.',
      'THE TURRETS ARE FIRING AGAIN. THAT IS NEVER GOOD.',
      'COUNT THE THREATS BEFORE THE GATES OPEN.',
      'IF THEY REACH THE BEACON, WE FALL BACK TO THE INNER RING.',
      'THE NEXT WAVE WILL TEST EVERY WALL WE HAVE.'
    ],
    ready: [
      'A QUEST IS READY. SOMEONE SHOULD CALL THEM HOME.',
      'THE WORK IS DONE, BUT THE REWARD IS STILL WAITING.',
      'DO NOT FORGET TO TURN IN THAT COMPLETED CONTRACT.',
      'THE BOARD WILL HAVE ROOM FOR ANOTHER BOUNTY SOON.'
    ],
    quest: [
      'THE ACTIVE QUESTS ARE MOVING THE SANCTUARY FORWARD.',
      'THREE CONTRACTS AT ONCE IS A LOT TO CARRY.',
      'THE FRONTIER HAS A WAY OF CHANGING THE PLAN.',
      'KEEP AN EYE ON THE QUEST LOG BEFORE LEAVING.',
      'EVERY SMALL OBJECTIVE ADDS UP TO A SAFER BEACON.'
    ],
    salvage: [
      'THE VAULT NEEDS MORE MATERIALS BEFORE THE NEXT BUILD.',
      'THAT SALVAGE COULD KEEP THE FURNACE RUNNING.',
      'WE SHOULD TURN THOSE FRONTIER SCRAPS INTO SOMETHING USEFUL.',
      'THE QUARTERMASTER WILL WANT TO HEAR ABOUT THAT HAUL.'
    ],
    relic: [
      'ANOTHER RELIC MEANS ANOTHER PIECE OF THE OLD WORLD.',
      'THE ARCHIVES ARE RUNNING OUT OF EMPTY SHELVES.',
      'ATLAS CRYSTALS ARE RARE. DO NOT WASTE THEM.',
      'THE FRONTIER KEEPS GIVING UP SECRETS, ONE RELIC AT A TIME.'
    ],
    deep: [
      'THE OUTER SECTORS ARE NOT MEANT FOR CARELESS TRAVEL.',
      'EVERY BEACON WE REPAIR PUSHES THE DARKNESS BACK.',
      'THE LATER BIOMES CHANGE FASTER THAN OUR MAPS.',
      'IF THE RUNNER REACHES THE VOID, THEY SHOULD NOT GO ALONE.'
    ],
    roles: {
      'quartermaster-weaponsmith': 'SUPPLIES FIRST. FIREPOWER SECOND. BOTH ARE RUNNING LOW.',
      'armorer-medic': 'STEEL CAN STOP A HIT. THE MEDIC STILL HAS TO FIX THE REST.',
      'archivist-scout': 'THE MAP AND THE ARCHIVES SHOULD AGREE BEFORE WE TRUST EITHER.',
      'beaconEngineer-mechanic': 'ONE MORE REPAIR AND THE BEACON NETWORK WILL BREATHE AGAIN.',
      'mechanic-weaponsmith': 'THE NEXT WEAPON NEEDS BETTER PARTS, NOT JUST MORE AMMUNITION.',
      'beaconEngineer-scout': 'SHOW ME THE ROUTE AND I WILL TELL YOU WHICH BEACON CAN HOLD IT.',
      'medic-quartermaster': 'SUPPLIES KEEP PEOPLE ALIVE LONG BEFORE THE FIGHT STARTS.',
      'armorer-weaponsmith': 'YOUR GUNS BREAK. MY PLATES BEND. WE BOTH NEED BETTER STEEL.'
    },
    fallback: [
      'THE FRONTIER IS QUIET FOR THE MOMENT.',
      'DID THE SCOUT RETURN FROM THE OUTER RING?',
      'KEEP THE BEACONS LIT AND THE GATES LOCKED.',
      'WE WILL NEED MORE SUPPLIES BEFORE NIGHTFALL.',
      'THE NEXT EXPEDITION WILL BE WORSE.',
      'SANCTUARY FEELS SMALLER EVERY TIME THE MAP GROWS.',
      'SOMEONE SHOULD CHECK THE BOUNTY BOARD.',
      'I WONDER WHAT THE ARCHIVIST FOUND THIS TIME.',
      'THE HORDE NEVER STOPS LEARNING.',
      'A GOOD PATROL IS A QUIET PATROL.'
    ]
  };
  const roleKey = [left.id, right.id].sort().join('-');
  let pool = conversations.fallback;
  if (game.health <= 35) pool = conversations.emergency;
  else if (game.enemies.length >= 12) pool = conversations.horde;
  else if (ready) pool = conversations.ready;
  else if (active.length) pool = conversations.quest;
  else if (game.salvage >= 20 || Object.values(game.inventory).some(amount => amount >= 8)) pool = conversations.salvage;
  else if (game.relics > 0 || game.atlasCrystals > 0) pool = conversations.relic;
  else if (game.currentSector >= 4 || biome.key === 'void') pool = conversations.deep;
  else if (conversations.roles[roleKey]) return conversations.roles[roleKey];
  return pool[(Math.floor(time / 4) + first * 3 + second) % pool.length];
}
function getSanctuaryNpcPosition(npc, index, time = game.elapsedTime) {
  const cycleDuration = 240;
  const cycle = Math.floor(time / cycleDuration);
  const cycleProgress = (time % cycleDuration) / cycleDuration;
  const randomPoint = (salt) => {
    const value = Math.sin((cycle + salt * 17.31 + index * 41.73) * 12.9898) * 43758.5453;
    return value - Math.floor(value);
  };
  const point = (pointIndex, salt = 0) => {
    const patrolPoints = [
      { x: -650, y: -420 }, { x: -180, y: -760 }, { x: 420, y: -620 },
      { x: 760, y: -80 }, { x: 520, y: 560 }, { x: -120, y: 760 },
      { x: -700, y: 300 }, { x: -260, y: 160 }
    ];
    if (pointIndex >= 0 && pointIndex < patrolPoints.length) return patrolPoints[(pointIndex + index * 2) % patrolPoints.length];
    const angle = randomPoint(salt + 1) * Math.PI * 2;
    const radius = 120 + randomPoint(salt + 2) * (beaconRegionRadius - 360);
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
  };
  const previousCycle = cycle - 1;
  const previousRandom = (salt) => {
    const value = Math.sin((previousCycle + salt * 17.31 + index * 41.73) * 12.9898) * 43758.5453;
    return value - Math.floor(value);
  };
  const previousWander = (() => {
    const angle = previousRandom(20) * Math.PI * 2;
    const radius = 120 + previousRandom(21) * (beaconRegionRadius - 360);
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
  })();
  const patrolPoint = point(index % 4);
  const nextPatrolPoint = point((index + 1) % 4);
  const socialPair = Math.floor(index / 2);
  const socialAngle = socialPair * Math.PI / 2;
  const socialCenter = { x: Math.cos(socialAngle) * 520, y: Math.sin(socialAngle) * 520 };
  const socialOffsetAngle = socialAngle + Math.PI / 2;
  const socialOffset = index % 2 ? 75 : -75;
  const socialPoint = {
    x: socialCenter.x + Math.cos(socialOffsetAngle) * socialOffset,
    y: socialCenter.y + Math.sin(socialOffsetAngle) * socialOffset
  };
  const wanderPoint = point(-1, 20);
  const segment = cycleProgress < .2
    ? { from: previousWander, to: patrolPoint, start: 0, end: .2 }
    : cycleProgress < .4
      ? { from: patrolPoint, to: nextPatrolPoint, start: .2, end: .4 }
      : cycleProgress < .5
        ? { from: nextPatrolPoint, to: socialPoint, start: .4, end: .5 }
        : cycleProgress < .65
          ? { from: socialPoint, to: socialPoint, start: .5, end: .65 }
          : { from: socialPoint, to: wanderPoint, start: .65, end: 1 };
  const progress = Math.max(0, Math.min(1, (cycleProgress - segment.start) / (segment.end - segment.start)));
  const smoothProgress = progress * progress * (3 - 2 * progress);
  return {
    x: segment.from.x + (segment.to.x - segment.from.x) * smoothProgress,
    y: segment.from.y + (segment.to.y - segment.from.y) * smoothProgress
  };
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
      ctx.fillText(`${interactBindingLabel()} // REPAIR`, station.x, station.y + station.radius + 22);
    } else if (station.repaired) {
      const nearbyBench = getNearbyBeaconBench();
      if (nearbyBench?.station === station) {
        ctx.fillStyle = '#f4eee5';
        ctx.font = 'bold 10px Space Mono';
        ctx.fillText(`${interactBindingLabel()} // ${nearbyBench.type === 'crafting' ? 'CRAFT' : 'MODULES'}`, nearbyBench.x, nearbyBench.y + 48);
      }
    }
    ctx.restore();
  });
  ctx.restore();
}
function drawBeaconStationMapMarkers() {
  if (game.epilogue.dungeon) return;
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
  if (game.epilogue.dungeon) return;
  drawDeepVoid();
  drawBrambleZones();
  drawSectorFourEffects();
  drawHazardZones();
  drawPickups();
  drawSanctuaryBuildStations();
  drawSanctuaryNpcs();
  drawBeaconStations();
  drawCampaignSite();
  drawWorldEvents();
  drawVoidPortal();
  drawRadioactiveBlindOverlay();
}
function drawWorldEvents() {
  if (game.epilogue.dungeon) return;
  ctx.save();
  ctx.translate(canvas.clientWidth / 2 - game.camera.x, canvas.clientHeight / 2 - game.camera.y);
  ctx.font = 'bold 12px Space Mono';
  ctx.textAlign = 'center';
  for (const event of game.worldEvents.events) {
    if (!event.discovered) continue;
    ctx.strokeStyle = ctx.fillStyle = event.type === 'breach' ? '#b794ff' : '#ffc575';
    ctx.lineWidth = 2;
    if (event.active) {
      ctx.setLineDash([12, 12]);
      ctx.beginPath();
      ctx.arc(event.x, event.y, worldEventRadius, 0, Math.PI * 2);
      ctx.stroke();
      if (event.delay > 0) {
        ctx.beginPath();
        ctx.arc(event.x, event.y, 400, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillText('INCOMING // KEEP CLEAR OF THE OUTER RING', event.x, event.y - 60);
      }
      ctx.setLineDash([]);
    }
    if (event.type === 'horde') {
      for (let index = -1; index <= 1; index++) {
        ctx.beginPath();
        ctx.moveTo(event.x + index * 24 - 8, event.y - 12);
        ctx.lineTo(event.x + index * 24 + 8, event.y);
        ctx.lineTo(event.x + index * 24 - 8, event.y + 12);
        ctx.stroke();
      }
    } else if (['wreck', 'convoy'].includes(event.type)) {
      ctx.strokeRect(event.x - 34, event.y - 18, 68, 36);
      ctx.strokeRect(event.x - 20, event.y - 24, 40, 48);
    } else {
      ctx.beginPath();
      ctx.ellipse(event.x, event.y, event.type === 'breach' ? 22 : 14, 32, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(event.x, event.y, 45, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillText(`${worldEventTypes[event.type].name} // SECTOR ${event.sector}`, event.x, event.y - 42);
    const control = worldEventControl(event);
    if (control) {
      ctx.strokeRect(control.x - 12, control.y - 12, 24, 24);
      ctx.fillText(control.label, control.x, control.y + 54);
      if (Math.hypot(game.player.x - control.x, game.player.y - control.y) <= stationInteractionRadius) {
        ctx.fillText(`${interactBindingLabel()} // INTERACT`, control.x, control.y + 72);
      }
    }
  }
  for (const enemy of game.enemies) {
    if (enemy.worldEventRole && !enemy.defeated) ctx.fillText(enemy.worldEventRole, enemy.x, enemy.y - enemy.r - 16);
  }
  ctx.restore();
}
function drawWorldEventMapMarkers() {
  if (game.epilogue.dungeon) return;
  const scale = getTacticalMapScale();
  mapCtx.save();
  applyMapTransform(scale);
  mapCtx.lineWidth = 2 / scale;
  for (const event of game.worldEvents.events) {
    if (!event.discovered) {
      if (!game.sanctuary.projects.scout || !game.discovered.has(event.biomeKey)) continue;
      const x = Math.round(event.x / 500) * 500, y = Math.round(event.y / 500) * 500;
      mapCtx.strokeStyle = '#b7c58e';
      mapCtx.setLineDash([6 / scale, 4 / scale]);
      mapCtx.beginPath();
      mapCtx.arc(x, y, 500, 0, Math.PI * 2);
      mapCtx.stroke();
      mapCtx.setLineDash([]);
      if (mapOpen) {
        mapCtx.font = `${11 / scale}px Space Mono`;
        mapCtx.fillStyle = '#b7c58e';
        mapCtx.fillText('SCOUT SIGNAL // APPROXIMATE', x, y);
      }
      continue;
    }
    mapCtx.strokeStyle = mapCtx.fillStyle = event.active ? '#8fe0ad' : '#ffc575';
    mapCtx.strokeRect(event.x - 6 / scale, event.y - 6 / scale, 12 / scale, 12 / scale);
    if (mapOpen) {
      mapCtx.font = `${11 / scale}px Space Mono`;
      mapCtx.fillText(`${worldEventTypes[event.type].name} // SECTOR ${event.sector}`, event.x + 10 / scale, event.y);
    }
  }
  mapCtx.restore();
}
function drawVoidPortal() {
  if (!hasContinuityKey() || Math.hypot(game.player.x - voidPortal.x, game.player.y - voidPortal.y) > 1600) return;
  const x = voidPortal.x - game.camera.x + canvas.clientWidth / 2;
  const y = voidPortal.y - game.camera.y + canvas.clientHeight / 2;
  ctx.save();
  ctx.strokeStyle = ctx.fillStyle = game.epilogue.guardianCleared ? '#b9f4ff' : '#b794ff';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.ellipse(x, y, 34, 58, 0, Math.PI, 0);
  ctx.lineTo(x + 34, y + 32);
  ctx.moveTo(x - 34, y);
  ctx.lineTo(x - 34, y + 32);
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.font = 'bold 12px Space Mono';
  ctx.fillText('CONTINUITY PORTAL', x, y - 70);
  if (Math.hypot(game.player.x - voidPortal.x, game.player.y - voidPortal.y) <= 85) {
    ctx.fillText(`${interactBindingLabel()} // ${game.epilogue.guardianCleared ? 'ENTER' : 'INSPECT SEAL'}`, x, y + 48);
  }
  ctx.restore();
}
function drawDungeonRoom() {
  const room = dungeonRooms[game.epilogue.dungeon.room];
  ctx.fillStyle = '#172831';
  ctx.strokeStyle = '#536a80';
  ctx.lineWidth = 7;
  ctx.fillRect(dungeonOrigin - room.w / 2, -room.h / 2, room.w, room.h);
  ctx.strokeRect(dungeonOrigin - room.w / 2, -room.h / 2, room.w, room.h);
  ctx.strokeStyle = '#243b48';
  ctx.lineWidth = 1;
  for (let x = -room.w / 2 + 55; x < room.w / 2; x += 55) {
    ctx.beginPath();
    ctx.moveTo(dungeonOrigin + x, -room.h / 2);
    ctx.lineTo(dungeonOrigin + x, room.h / 2);
    ctx.stroke();
  }
  ctx.textAlign = 'center';
  ctx.font = 'bold 12px Space Mono';
  for (const control of dungeonControls()) {
    const x = dungeonOrigin + control.x;
    const y = control.y;
    const locked = control.kind === 'door' && dungeonDoorLocked(control.id);
    const palette = { BLUE: '#9dc6ff', AMBER: '#ffc575', WHITE: '#ffffff' };
    ctx.strokeStyle = ctx.fillStyle = locked ? '#ff978b' : (palette[control.id] ?? '#b9f4ff');
    ctx.lineWidth = 3;
    ctx.strokeRect(x - 16, y - 16, 32, 32);
    ctx.fillText(control.label, x, y - 23);
    if (Math.hypot(game.player.x - x, game.player.y - y) <= 68) ctx.fillText(`${interactBindingLabel()} // ${locked ? 'SEALED' : 'USE'}`, x, y + 32);
  }
}
function drawCampaignSite() {
  const target = campaignFieldTarget();
  if (!target) return;
  const active = game.campaign.active;
  const x = target.x - game.camera.x + canvas.clientWidth / 2;
  const y = target.y - game.camera.y + canvas.clientHeight / 2;
  ctx.save();
  ctx.strokeStyle = ctx.fillStyle = '#b9f4ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, 18, 0, Math.PI * 2);
  ctx.stroke();
  if (active.defending) {
    ctx.setLineDash([12, 8]);
    ctx.beginPath();
    ctx.arc(x, y, campaignDefenseRadius, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.textAlign = 'center';
  ctx.font = 'bold 12px Space Mono';
  ctx.fillText(target.label, x, y - 25);
  if (!active.scan && !active.defending && campaignTargetDistance(target) <= campaignInteractionRadius(target)) {
    ctx.fillText(`${interactBindingLabel()} // USE`, x, y + 34);
  }
  ctx.restore();
}
function drawRadioactiveBlindOverlay() {
  if (game.radioactiveBlindTimer <= 0 || getArmorEffects().radioactiveBlindImmunity) return;
  const ratio = window.devicePixelRatio || 1;
  ctx.save();
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.globalAlpha = .88 * Math.min(1, game.radioactiveBlindTimer / .2);
  ctx.fillStyle = '#180707';
  ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  ctx.restore();
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
  const dt = Math.min((now - lastTime) / 1000, .04);
  lastTime = now;
  if (mapOpen) {
    drawMap();
    drawHazardMap();
    drawBeaconStationMapMarkers();
    drawStalkerMapMarker();
    drawWorldEventMapMarkers();
    animation = requestAnimationFrame(loop);
    return;
  }
  if (game.managerMode) {
    drawManagerView();
    animation = requestAnimationFrame(loop);
    return;
  }
  if (game.paused) { animation = requestAnimationFrame(loop); return; }
  updateCrafting(dt); update(dt); reloadAmmo(); updateAmmoUI(); updateBiomeAnnouncement(dt);
  drawGameWorld();
  drawMap(); drawHazardMap(); drawBeaconStationMapMarkers(); drawStalkerMapMarker(); drawWorldEventMapMarkers();
  if (game.active) animation = requestAnimationFrame(loop);
}
function updateBiomeAnnouncement(dt) {
  const biome = getBiome(game.player.x, game.player.y);
  if (!game.epilogue.dungeon) {
    const discoveryKey = getDiscoveryKey(game.player.x, game.player.y);
    const newlyDiscovered = !game.discovered.has(discoveryKey);
    game.discovered.add(discoveryKey);
    game.discovered.add(biome.key === 'sanctuary' ? 'sanctuary' : getSectorKey(getBiomeSector(Math.hypot(game.player.x, game.player.y))));
    if (newlyDiscovered && biome.key !== 'sanctuary') updateQuestProgress('explore');
  }
  if (biome.key !== game.biomeKey || biome.name !== game.biomeName) {
    game.biomeKey = biome.key;
    game.biomeName = biome.name;
    game.announcementTimer = 3;
    announceBiome(biome);
    updateBiomeEffects(biome);
    updateBiomeHazard(biome);
  }
  game.announcementTimer = Math.max(0, game.announcementTimer - dt);
  if (game.announcementTimer === 0) ui.announcement.classList.remove('show');
}
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
  game.elapsedTime += dt;
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
  updateRadioactiveEffects(dt);
  updateAbyssalBossWaves(dt);
  const slowedByBramble = updateBrambleZones(dt);
  const p = game.player;
  const previousX = p.x;
  const previousY = p.y;
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
  if (game.epilogue.dungeon) constrainDungeonPosition(p);
  updateDeepVoid(dt);
  p.angle = Math.atan2(pointer.y - canvas.clientHeight / 2, pointer.x - canvas.clientWidth / 2);

  game.camera.x += (p.x - game.camera.x) * Math.min(1, dt * 7);
  game.camera.y += (p.y - game.camera.y) * Math.min(1, dt * 7);

  const distance = Math.hypot(p.x, p.y);
  const safe = distance < beaconRegionRadius;
  game.currentSector = safe ? 0 : getBiomeSector(distance) + 1;
  game.questState.tickTimer += dt;
  if (!safe) {
    game.questState.counters.travel += Math.hypot(p.x - previousX, p.y - previousY);
    game.questState.counters.survived += dt;
  }
  game.questState.active.forEach(quest => { quest.progress = Math.min(quest.amount, questObjectiveProgress(quest)); });
  expireTimedQuests(dt);
  if (game.questState.tickTimer >= 1) {
    game.questState.tickTimer = 0;
    renderQuestHud();
  }

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

  if (isFiring() && game.weapon === 'radBeam') updateRadBeam(dt);
  else {
    game.radBeamActive = false;
    if (isFiring()) shoot();
  }

  const insideGlassDesertHazard = game.hazardZones.some(zone => (zone.hazard?.name === 'MIRAGE BURN' || getBiome(zone.x, zone.y).name === 'GLASS DESERT') && Math.hypot(p.x - zone.x, p.y - zone.y) < zone.radius);
  const protectedByBeacon = getBeaconStationAt(p.x, p.y)?.repaired === true;

  if (safe) {
    game.health = Math.min(100, game.health + 15 * dt);
  } else {
    if (effects.healthRegen) game.health = Math.min(100, game.health + effects.healthRegen * dt);
    if (effects.hazard && !insideGlassDesertHazard) {
      const hazardDamageReduction = getHazardDamageReduction(armor, effects.hazard, biome.key);
      game.health -= effects.hazard.damagePerSecond * (1 - hazardDamageReduction) * dt;
    }
  }

  game.hazardZones.forEach(zone => {
    if (!protectedByBeacon && Math.hypot(p.x - zone.x, p.y - zone.y) < zone.radius) {
      const isGlassDesert = zone.hazard?.name === 'MIRAGE BURN' || getBiome(zone.x, zone.y).name === 'GLASS DESERT';
      
      if (isGlassDesert) {
        game.health = Math.min(100, game.health + 15 * dt); 
      } else {
        const hazardDamageReduction = getHazardDamageReduction(armor, zone.hazard, zone.biomeKey);
        game.health -= zone.damagePerSecond * (1 - hazardDamageReduction) * dt;
      }
    }
  });

  updateWorldEvents(dt);
  const inVoid = biome.key === 'void';
  if (game.epilogue.dungeon) {
    // Dungeon encounters are authored per room.
  } else if (inVoid) {
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
    if (game.spawnTimer <= 0 && game.enemies.length < overworldEnemyLimit()) {
      spawn();
      game.spawnTimer = Math.max(.12, .8 - game.currentSector * .025 - distance / 4000);
    }
  }

  const bulletPaths = [];
  game.bullets.forEach(b => {
    if (b.life <= 0) return;
    const travelTime = Math.min(dt, b.life);
    bulletPaths.push({ b, startX: b.x, startY: b.y });
    if (b.oscillating) {
      const speed = Math.hypot(b.vx, b.vy) || 1;
      b.swayPhase = (b.swayPhase || 0) + travelTime * 14;
      const swayOffset = Math.sin(b.swayPhase) * (b.swayAmplitude || 0);
      const angle = b.baseAngle + swayOffset;
      b.vx = Math.cos(angle) * speed;
      b.vy = Math.sin(angle) * speed;
    }
    if (b.voidBatarMotion) {
      updateVoidBatarBullet(b, travelTime);
    } else {
      decelerateBullet(b, travelTime);
      vibrateBullet(b, travelTime);
    }
    b.life -= dt;
  });
  game.beams.forEach(beam => beam.life -= dt);
  game.beams = game.beams.filter(beam => beam.life > 0);

  // Consolidated Enemy Update Loop (Movement, Boundary Checks, Attacks, and Player Damage)
  const ashenAuras = game.enemies
    .filter(enemy => !enemy.defeated && enemy.effect === 'ashen-boss-aura')
    .map(enemy => ({ x: enemy.x, y: enemy.y }));
  updateJournalEncounters();
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
    if (e.worldEventAnchor || wraithShieldDown) {
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
    } else if (e.voidStalker) {
      updateVoidStalker(e, dt);
    } else if (e.foreman) {
      updateForeman(e, dt);
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
        defeatEnemy(e, 0, 'self-destruct');
      } else {
        const angle = Math.atan2(p.y - e.y, p.x - e.x);
        e.x += Math.cos(angle) * e.speed * dt;
        e.y += Math.sin(angle) * e.speed * dt;
        if (Math.hypot(p.x - e.x, p.y - e.y) < e.r + 12) {
          e.hp = 0;
          defeatEnemy(e, 0, 'self-destruct');
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
    if (!e.foreman && !e.voidStalker && (e.knockbackX || e.knockbackY) && !wraithShieldDown) {
      e.x += e.knockbackX * dt;
      e.y += e.knockbackY * dt;
      const knockbackDecay = Math.exp(-5 * dt);
      e.knockbackX *= knockbackDecay;
      e.knockbackY *= knockbackDecay;
    }
    if (game.epilogue.dungeon) constrainDungeonPosition(e);

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
    // Contact damage to player
    if (Math.hypot(p.x - e.x, p.y - e.y) < e.r + 12) {
      game.health -= (e.contactDamage || 0) * effects.damageMultiplier * (1 - (armor.contactDamageReduction || 0)) * dt;
    }
  });
  updateDarkBossDashCircles(dt);

  updateMeleeAttack(dt);

  for (const { b, startX, startY } of bulletPaths) {
    const dx = b.x - startX;
    const dy = b.y - startY;
    const projectileRadius = b.radius || 5;
    const hits = [];
    for (const enemy of game.enemies) {
      if (enemy.defeated || enemy.shieldTimer > 0 || !enemy.hp || b.hitEnemies?.has(enemy)) continue;
      const bodyTime = projectileImpactTime(startX, startY, b.x, b.y, enemy.x, enemy.y, enemy.r + projectileRadius);
      if (hasEnemyEffect(enemy, 'ironwood-boss-shield') && enemy.ironwoodShieldHp > 0) {
        const facing = Math.atan2(p.y - enemy.y, p.x - enemy.x);
        const shieldRadius = Math.max(14, enemy.r * .7);
        const offset = enemy.r + shieldRadius * .35;
        const shieldTime = projectileImpactTime(startX, startY, b.x, b.y,
          enemy.x + Math.cos(facing) * offset, enemy.y + Math.sin(facing) * offset, shieldRadius + projectileRadius);
        if (shieldTime !== null && (bodyTime === null || shieldTime <= bodyTime)) {
          const angle = Math.atan2(startY + dy * shieldTime - enemy.y, startX + dx * shieldTime - enemy.x) - facing;
          if (Math.abs(Math.atan2(Math.sin(angle), Math.cos(angle))) < .9) {
            hits.push({ enemy, time: shieldTime, shield: true });
            continue;
          }
        }
      }
      if (bodyTime !== null) hits.push({ enemy, time: bodyTime });
    }
    hits.sort((a, b) => a.time - b.time);
    let stopped = false;
    for (const { enemy, time, shield } of hits) {
      if (enemy.defeated || enemy.shieldTimer > 0) continue;
      const x = startX + dx * time;
      const y = startY + dy * time;
      const damage = b.damage || .12;
      b.hitEnemies?.add(enemy);
      if (shield) {
        if (Math.random() >= .25) enemy.ironwoodShieldHp = Math.max(0, enemy.ironwoodShieldHp - damage);
      } else {
        if (b.blast) {
          detonatePlayerBullet(b, x, y);
          burst(x, y, 22, 220);
          stopped = true;
        } else {
          enemy.hp = Math.max(0, enemy.hp - damage);
          if (b.burnDuration) {
            if (!(enemy.burnTimer > 0)) {
              enemy.burnDamage = b.burnDamage;
              enemy.burnInterval = b.burnInterval;
              enemy.burnTickTimer = b.burnInterval;
            }
            enemy.burnTimer = Math.max(enemy.burnTimer || 0, b.burnDuration);
          }
          if (enemy.hp <= 0) defeatEnemy(enemy);
        }
        if (b.pulseBlastRadius && !b.blastApplied) {
          b.blastApplied = true;
          triggerPulseBlast({ ...b, x, y });
        }
      }
      if (b.pierceHits !== undefined) b.pierceHits--;
      if (!b.pierce || b.pierceHits === 0 || stopped) {
        b.life = 0;
        stopped = true;
        break;
      }
    }
    if (!stopped && b.life <= 0 && b.blast) detonatePlayerBullet(b, b.x, b.y);
  }
  game.bullets = game.bullets.filter(b => b.life > 0);

  // Update Explosions Lifetime
  if (game.explosions) {
    game.explosions.forEach(exp => exp.life -= dt);
    game.explosions = game.explosions.filter(exp => exp.life > 0);
  }

  updateBeaconTurretProjectiles(dt);

  // Handle Enemy Projectiles
  game.projectiles.forEach(proj => {
    if (proj.turretProjectile || proj.life <= 0) return;
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
    const startX = proj.x;
    const startY = proj.y;
    const travelTime = Math.min(dt, proj.life);
    if (proj.arcGravity) proj.vy += proj.arcGravity * travelTime;
    proj.x += proj.vx * travelTime;
    proj.y += proj.vy * travelTime;
    proj.life -= dt;
    if (proj.singularity) {
      const distanceToPlayer = Math.hypot(game.player.x - proj.x, game.player.y - proj.y);
      if (distanceToPlayer < proj.singularityRadius) {
        if (distanceToPlayer > 0) {
          const pullDistance = Math.min(proj.pullSpeed * dt, distanceToPlayer);
          game.player.x += (proj.x - game.player.x) / distanceToPlayer * pullDistance;
          game.player.y += (proj.y - game.player.y) / distanceToPlayer * pullDistance;
        }
      }
      if (projectileImpactTime(startX, startY, proj.x, proj.y, p.x, p.y, proj.radius + 13) !== null) {
        game.health -= proj.damagePerSecond * travelTime * (1 - (armor.voidDamageReduction || 0));
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

    let impactTime = null;
    if (!proj.frostAura && !proj.damageTrail && !proj.singularity && !proj.playerHit) {
      impactTime = projectileImpactTime(startX, startY, proj.x, proj.y, p.x, p.y, proj.radius + 13);
    }
    if (impactTime !== null) {
      const impactX = startX + (proj.x - startX) * impactTime;
      const impactY = startY + (proj.y - startY) * impactTime;
      game.health -= proj.damage * (1 - (armor.voidDamageReduction || 0));
      if (proj.burnDuration || proj.decayDuration) {
        const status = game.enemyStatus || (game.enemyStatus = { burn: 0, acid: 0, bleed: 0, freeze: 0, root: 0 });
        if (proj.burnDuration) status.burn = Math.max(status.burn, proj.burnDuration);
      }
      if (proj.decayDuration) game.decayTimer = Math.max(game.decayTimer, proj.decayDuration);
      if (proj.spawnElitesOnHit && !proj.elitesSpawned) {
        proj.elitesSpawned = true;
        spawnRandomBiomeElites(impactX, impactY, 3);
      }
      if (proj.piercePlayer) {
        proj.playerHit = true;
      } else {
        proj.x = impactX;
        proj.y = impactY;
        proj.life = 0;
      }
    }
    if (proj.split && proj.life <= 0 && !proj.hasSplit && (impactTime === null || proj.piercePlayer)) {
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
    if (proj.teleportGlassEnemyOnEnd && proj.life <= 0 && !proj.teleportResolved) {
      proj.teleportResolved = true;
      teleportNearestGlassEnemy(proj);
    }
  });
  game.projectiles = game.projectiles.filter(p => p.life > 0);

  if (!game.epilogue.dungeon) {
    updateBeaconTurrets(dt);
    updateBeaconStationModules(dt);
  }
  game.enemies = game.enemies.filter(e => e.hp > 0);
  const dungeon = game.epilogue.dungeon;
  if (dungeon) {
    if (dungeonRooms[dungeon.room].enemies && !game.enemies.length && !dungeon.cleared.includes(dungeon.room)) {
      dungeon.cleared.push(dungeon.room);
      epilogueNotice('ROOM CLEAR // FORWARD DOORS UNSEALED');
    }
  } else updateCampaign(dt);

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
      n.type === 'chest' ? openChest(n) : (n.taken = true, n.type === 'relic' ? (game.relics++, updateQuestProgress('relic')) : game.salvage += Math.round(3 * effects.salvageMultiplier));
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
    } else if (enemy.effect === 'radioactive-boss-bomb') {
      enemy.bossAbilityCooldown = Math.max(0, enemy.bossAbilityCooldown - dt);
      if (distance <= 500 && enemy.bossAbilityCooldown <= 0) {
        createRadioactiveBombTelegraph(enemy);
        enemy.bossAbilityCooldown = 8;
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
const baseUpdate = update;
update = function(dt) { const wasEmpty = !hasInfiniteAmmo() && game.ammo === 0 && weaponCatalog[game.weapon].kind !== 'melee'; baseUpdate(dt); if (wasEmpty) { game.ammo = 0; game.reloadPending = true; } if (game.active) { applyEnemyAbilities(dt); const status = game.enemyStatus; const reduction = getArmorEffects().statusDamageReduction || 0; if (status && reduction) { const statusDamagePerSecond = (status.burn > 0 ? 6 : 0) + (status.acid > 0 ? 4 : 0) + (status.bleed > 0 ? 3 : 0) + (status.freeze > 0 || status.root > 0 ? 1 : 0); game.health = Math.min(100, game.health + statusDamagePerSecond * reduction * dt); } } };
function renderEnemySystem() {
  const camX = game.camera.x - canvas.clientWidth / 2;
  const camY = game.camera.y - canvas.clientHeight / 2;

  ctx.save();
  ctx.translate(-camX, -camY);
  ctx.textAlign = 'center';

  // 1. Standard Enemies
  game.enemies.filter(enemy => !enemy.voidWorm && !enemy.voidWalker && !enemy.voidStalker && !enemy.foreman).forEach(enemy => {
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

  game.enemies.filter(enemy => enemy.voidStalker || enemy.foreman).forEach(enemy => {
    const stalker = enemy.voidStalker;
    const windup = stalker ? enemy.huntState === 'windup' : enemy.moveState === 'windup';
    const zones = enemy.zones ?? [];
    if (enemy.foreman && enemy.waveGates.length) {
      ctx.save();
      ctx.strokeStyle = '#bf9bff';
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 5]);
      for (const gate of enemy.waveGates) ctx.strokeRect(gate.x - 42, gate.y - 42, 84, 84);
      ctx.restore();
    }
    if (windup || enemy.moveState === 'impact' || (stalker && enemy.huntState === 'impact')) {
      ctx.save();
      ctx.strokeStyle = '#ffcb81';
      ctx.fillStyle = '#ff8b6140';
      ctx.lineWidth = 3;
      ctx.setLineDash([12, 9]);
      if (zones.length) {
        zones.forEach(zone => {
          if (zone.radius) {
            ctx.beginPath();
            ctx.arc(zone.x, zone.y, zone.radius, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
          } else {
            ctx.fillRect(zone.x - zone.w / 2, zone.y - zone.h / 2, zone.w, zone.h);
            ctx.strokeRect(zone.x - zone.w / 2, zone.y - zone.h / 2, zone.w, zone.h);
          }
        });
      } else if (enemy.attack === 'fan' || enemy.attack === 'burst') {
        ctx.translate(enemy.x, enemy.y);
        ctx.beginPath();
        if (enemy.attack === 'burst') ctx.arc(0, 0, enemy.r + 54, 0, 2 * Math.PI);
        else {
          ctx.moveTo(0, 0);
          const spread = stalker ? (2 + enemy.phase) * .14 : .55;
          ctx.arc(0, 0, 510, enemy.chargeAngle - spread, enemy.chargeAngle + spread);
          ctx.closePath();
        }
        ctx.fill();
        ctx.stroke();
      } else if (windup) {
        ctx.translate(enemy.x, enemy.y);
        ctx.rotate(enemy.chargeAngle);
        const range = stalker ? (1050 + enemy.phase * 75) * .67 : enemy.phase === 2 ? 702 : 754;
        const halfWidth = enemy.r + 10;
        ctx.fillRect(0, -halfWidth, range, halfWidth * 2);
        ctx.strokeRect(0, -halfWidth, range, halfWidth * 2);
      }
      ctx.restore();
    }
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.rotate(windup ? enemy.chargeAngle : Math.atan2(game.player.y - enemy.y, game.player.x - enemy.x));
    const r = enemy.r;
    const articulated = stalker || enemy.phase > 1;
    const color = windup ? '#ffd895' : stalker ? '#a688ff' : '#ff925e';
    ctx.strokeStyle = color;
    ctx.fillStyle = stalker ? '#221733' : '#35252c';
    ctx.lineWidth = 4;
    if (articulated) {
      for (const side of [-1, 1]) for (const offset of [-.6, -.15, .3]) {
        ctx.beginPath();
        ctx.moveTo(offset * r, side * r * .38);
        ctx.lineTo((offset - .15) * r, side * r * .82);
        ctx.lineTo((offset + .3) * r, side * r * 1.12);
        ctx.stroke();
      }
    }
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(r * .33, -r * .62);
    ctx.lineTo(-r * .72, -r * .68);
    ctx.lineTo(-r, 0);
    ctx.lineTo(-r * .72, r * .68);
    ctx.lineTo(r * .33, r * .62);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.fillRect(r * .25, -5, r * .45, 10);
    ctx.restore();

    ctx.save();
    ctx.textAlign = 'center';
    const barWidth = 150;
    const barY = enemy.y - enemy.r - 25;
    ctx.fillStyle = '#17131a';
    ctx.fillRect(enemy.x - barWidth / 2, barY, barWidth, 7);
    ctx.fillStyle = color;
    ctx.fillRect(enemy.x - barWidth / 2, barY, barWidth * Math.max(0, enemy.hp / enemy.maxHp), 7);
    ctx.strokeStyle = '#e0aaff';
    ctx.strokeRect(enemy.x - barWidth / 2 - .5, barY - .5, barWidth + 1, 8);
    ctx.fillStyle = '#f7e5c5';
    ctx.font = 'bold 12px Space Mono';
    ctx.fillText(stalker ? `${enemy.family} // PHASE ${enemy.phase} // ${enemy.huntState.toUpperCase()}` : `${enemy.family} // PHASE ${enemy.phase}`, enemy.x, barY - 8);
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
  const owner = enemy.pestOwner || enemy.guardOwner;
  if (owner?.worldEventId) enemy.worldEventId = owner.worldEventId;
  if (!game.epilogue.dungeon && activeWorldEvent()
      && game.enemies.filter(entry => entry.hp > 0 && !entry.defeated).length >= overworldEnemyLimit()) return null;
  if (game.epilogue.dungeon?.room === 'arena') {
    if (game.epilogue.dungeon.victory || game.enemies.filter(entry => entry.hp > 0 && !entry.defeated).length >= foremanArenaLimit) return null;
    constrainDungeonPosition(enemy);
  }
  game.enemies.push(enemy);
  return enemy;
}
function getBiome(x, y) {
  if (game.epilogue.dungeon && Math.abs(x - dungeonOrigin) < 3000) return getDungeonBiome();
  const distance = Math.hypot(x, y);
  if (distance < beaconRegionRadius) return { name: 'BEACON SANCTUARY', color: '#f9c779', dark: '#172d2d', key: 'sanctuary', sector: 0, animationKey: 'sanctuary', effects: { moveMultiplier: 1, damageMultiplier: 1, enemySpeedMultiplier: 1, fireCooldownMultiplier: 1, pulseCooldownMultiplier: 1, healthRegen: 0, salvageMultiplier: 1, hazard: { name: 'NO HAZARD', description: 'The beacon protects you from environmental hazards.', damagePerSecond: 0 } } };
  if (distance > mapRadius) return getVoidBiome();
  const angle = (Math.atan2(y, x) + Math.PI * 2) % (Math.PI * 2);
  const index = Math.floor(angle / (Math.PI / 2));
  const sector = getBiomeSector(distance);
  const biome = sectorRegions[sector][index];
  const beaconStation = getBeaconStationAt(x, y);
  if (beaconStation) {
    if (!beaconStation.repaired) {
      return {
        ...biome,
        name: 'RUINED BEACON STATION',
        color: '#f9c779',
        dark: '#241b19',
        key: `sector-${sector}-${index}`,
        sectorKey: getSectorKey(sector),
        sector: sector + 1,
        animationKey: `biome-${index}`,
        effects: biome.effects
      };
    }
    const supportModules = beaconStation.modules.support || 0;
    return {
      ...biome,
      name: 'BEACON STATION',
      color: '#f9c779',
      dark: '#17251f',
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
        healthRegen: 1.5 + supportModules * 3 + (game.campaign.completed.includes(campaignFinaleId) ? 2 : 0),
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
function updateUI(distance, safe, biome) {
  renderWorldEventHud();
  const sector = safe ? 0 : getBiomeSector(distance) + 1;
  const health = Math.max(0, Math.round(game.health));
  if (safe && bankInventory()) updateInventoryUI();
  if (safe && game.health > 0) bankSalvage();
  updateStationUI();
  ui.wave.textContent = String(sector).padStart(2, '0');
  ui.score.textContent = String(game.score).padStart(6, '0');
  ui.ammo.textContent = getAmmoLabel();
  ui.health.style.width = `${health}%`;
  ui.healthValue.textContent = `${health}%`;
  ui.threats.textContent = String(game.enemies.length).padStart(2, '0');
  ui.distance.textContent = `${String(Math.floor(distance / 10)).padStart(3, '0')}m`;
  ui.salvage.textContent = String(game.salvage).padStart(2, '0');
  ui.relics.textContent = String(game.relics).padStart(2, '0');
  if (game.epilogue.dungeon) ui.objective.textContent = epilogueObjective();
  else if (hasContinuityKey() && Math.hypot(game.player.x, game.player.y) > mapRadius) {
    const distance = Math.ceil(Math.hypot(game.player.x - voidSearch.x, game.player.y - voidSearch.y) / 10);
    const bearing = Math.atan2(voidSearch.y - game.player.y, voidSearch.x - game.player.x);
    const direction = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'][(Math.round(bearing / (Math.PI / 4)) + 8) % 8];
    ui.objective.textContent = distance < 450 ? epilogueObjective() : `CONTINUITY SIGNAL // ${direction} // ${distance}m TO SEARCH AREA`;
  }
  else if (salvageDeposit) ui.objective.textContent = 'BANKING SALVAGE...';
  else if (salvageSaveFailed && game.salvage) ui.objective.textContent = 'SALVAGE NOT BANKED // SAVE FAILED';
  else ui.objective.textContent = safe ? 'SANCTUARY // SALVAGE BANKED' : 'RETURN TO BEACON // SALVAGE';
}
function updateInventoryUI() { const armor = getArmorEffects(); ui.inventory.innerHTML = `<span class="inventory-title">ARMOR // ${armor.name || 'NONE'}</span><span class="inventory-title">CARRIED // VAULT</span>${resourceTypes.map(resource => `<span class="inventory-item" title="${resource.name}: carried / stored in sanctuary vault"><span>${resource.name}</span><strong>${game.inventory[resource.key]} / ${game.vault[resource.key] || 0}</strong></span>`).join('')}`; }
function end() { game.active = false; renderWorldEventHud(); game.high = Math.max(game.high, game.score); writeLegacyValue('horde-high', game.high); writeLegacyValue('horde-salvage', game.banked + game.salvage); writeLegacyValue('horde-relics', game.relics); writeLegacyValue('horde-atlas-crystals', game.atlasCrystals); ui.final.textContent = String(game.score).padStart(6, '0'); ui.high.textContent = String(game.high).padStart(6, '0'); ui.over.classList.remove('hidden'); }
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
  if (game.epilogue.dungeon) {
    drawDungeonMap();
    return;
  }
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
    const inner = sector === 0 ? beaconRegionRadius : biomeBoundaries[sector - 1];
    const outer = biomeBoundaries[sector] ?? mapRadius;
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
    mapCtx.arc(0, 0, biomeBoundaries[sector] ?? mapRadius, 0, Math.PI * 2);
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
  const campaignTarget = campaignFieldTarget();
  if (campaignTarget) {
    mapCtx.save();
    mapCtx.translate(campaignTarget.x, campaignTarget.y);
    mapCtx.scale(1 / scale, 1 / scale);
    mapCtx.fillStyle = '#b9f4ff';
    mapCtx.strokeStyle = '#100d13';
    mapCtx.beginPath();
    mapCtx.moveTo(0, -7);
    mapCtx.lineTo(7, 0);
    mapCtx.lineTo(0, 7);
    mapCtx.lineTo(-7, 0);
    mapCtx.closePath();
    mapCtx.fill();
    mapCtx.stroke();
    if (mapOpen) {
      mapCtx.font = 'bold 11px Space Mono';
      mapCtx.strokeText(campaignTarget.label, 12, 4);
      mapCtx.fillText(campaignTarget.label, 12, 4);
    }
    mapCtx.restore();
  }
  mapCtx.restore();
}
function drawStalkerMapMarker() {
  if (game.epilogue.dungeon) return;
  const stalker = game.enemies.find(enemy => enemy.voidStalker && !enemy.defeated);
  const scale = getTacticalMapScale();
  mapCtx.save();
  applyMapTransform(scale);
  if (hasContinuityKey()) {
    const found = game.epilogue.portalFound;
    const { x, y } = found ? voidPortal : voidSearch;
    mapCtx.lineWidth = 2 / scale;
    mapCtx.strokeStyle = '#b794ff';
    mapCtx.fillStyle = '#8056c035';
    mapCtx.setLineDash(found ? [] : [5 / scale, 4 / scale]);
    mapCtx.beginPath();
    mapCtx.arc(x, y, found ? 5 / scale : voidSearch.radius, 0, Math.PI * 2);
    mapCtx.fill();
    mapCtx.stroke();
    if (mapOpen) {
      mapCtx.fillStyle = '#e0cfff';
      mapCtx.font = `${11 / scale}px Space Mono`;
      mapCtx.fillText(found ? 'Continuity Portal' : 'Continuity Key search area', x - 5 / scale, y - 10 / scale);
    }
  }
  if (stalker && game.elapsedTime % 6 < 1.4 && Math.hypot(game.player.x - stalker.x, game.player.y - stalker.y) < 2800) {
    mapCtx.setLineDash([]);
    mapCtx.lineWidth = 1.5 / scale;
    mapCtx.strokeStyle = '#e0aaff';
    mapCtx.beginPath();
    mapCtx.arc(stalker.x, stalker.y, 7 / scale, 0, Math.PI * 2);
    mapCtx.stroke();
  }
  mapCtx.restore();
}
function drawDungeonMap() {
  const { width, height } = mapCanvas;
  const { room, checkpoint, cleared } = game.epilogue.dungeon;
  const rooms = { entry: [0, 0], works: [1, 0], relay: [2, 0], ward: [3, 0], staging: [4, 0], arena: [5, 0], stores: [1, -1], records: [3, -1] };
  const interval = width / 7;
  const point = ([column, row]) => [interval * (column + 1), height * .63 + row * height * .29];
  mapCtx.save();
  mapCtx.fillStyle = '#111820';
  mapCtx.fillRect(0, 0, width, height);
  mapCtx.strokeStyle = '#536a80';
  mapCtx.lineWidth = 2;
  for (const [id, coords] of Object.entries(rooms)) {
    const [x, y] = point(coords);
    for (const [target] of dungeonRooms[id].doors) {
      if (!rooms[target]) continue;
      const [toX, toY] = point(rooms[target]);
      mapCtx.beginPath();
      mapCtx.moveTo(x, y);
      mapCtx.lineTo(toX, toY);
      mapCtx.stroke();
    }
  }
  mapCtx.textAlign = 'center';
  mapCtx.font = `${mapOpen ? 11 : 8}px Space Mono`;
  for (const [id, coords] of Object.entries(rooms)) {
    const [x, y] = point(coords);
    mapCtx.fillStyle = id === room ? '#b9f4ff' : id === checkpoint ? '#9fe4b5' : cleared.includes(id) ? '#729a9c' : '#54667e';
    mapCtx.fillRect(x - 5, y - 5, 10, 10);
    if (mapOpen) mapCtx.fillText(dungeonRooms[id].name, x, y + 23, interval - 4);
  }
  mapCtx.fillStyle = '#b9f4ff';
  mapCtx.fillText(dungeonRooms[room].name, width / 2, height * .85);
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

  if (game.epilogue.dungeon) drawDungeonRoom();
  else {
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
  }

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
  if (!settings.reducedEffects) game.sparks.forEach(s => {
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
      if (!settings.reducedEffects) {
        ctx.fillStyle = '#ffb067';
        ctx.globalAlpha = alpha * 0.35;
        ctx.beginPath();
        ctx.arc(exp.x, exp.y, currentRadius, 0, Math.PI * 2);
        ctx.fill();
      }
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
  if (game.radBeamActive && game.weapon === 'radBeam' && (hasInfiniteAmmo() || game.ammo > 0)) {
    const directionX = Math.cos(game.player.angle);
    const directionY = Math.sin(game.player.angle);
    const startX = game.player.x + directionX * 20;
    const startY = game.player.y + directionY * 20;
    const length = getWeaponStats('radBeam').range;
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

  if (adminInvincible) {
    ctx.strokeStyle = '#42a5ff';
    ctx.lineWidth = 3;
    ctx.shadowBlur = 14;
    ctx.shadowColor = '#42a5ff';
    ctx.beginPath();
    ctx.arc(0, 0, 21, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
  
  ctx.fillStyle = '#e9dfd2';
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0, Math.PI * 2);
  ctx.fill();
  
  const heldWeapon = getWeaponStats();
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