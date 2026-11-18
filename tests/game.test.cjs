const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'game.js'), 'utf8');

function createSaveLocks() {
  let queue = Promise.resolve();
  return {
    request(_name, run) {
      const result = queue.then(run);
      queue = result.catch(() => {});
      return result;
    }
  };
}

function loadGame({ storage = new Map(), indexedDB, blockLocalStorage = false, locks = createSaveLocks() } = {}) {
  const drawingCalls = [];
  const downloads = [];
  const context2d = new Proxy({}, {
    get(target, key) {
      return target[key] ?? ((...args) => drawingCalls.push([key, ...args]));
    }
  });
  class Element {
    constructor() {
      this.dataset = {};
      this.style = { setProperty(key, value) { this[key] = value; } };
      this.children = [];
      this.elements = new Map();
      this.listeners = new Map();
      const classes = new Set();
      this.classList = {
        add: value => classes.add(value),
        remove: value => classes.delete(value),
        toggle: (value, enabled) => enabled ? classes.add(value) : classes.delete(value),
        contains: value => classes.has(value)
      };
      this.clientWidth = this.width = 800;
      this.clientHeight = this.height = 600;
      this.hidden = true;
      this.innerHTML = '';
      this.textContent = '';
    }
    querySelector(selector) {
      if (!this.elements.has(selector)) this.elements.set(selector, new Element());
      return this.elements.get(selector);
    }
    querySelectorAll() { return []; }
    addEventListener(name, callback) {
      if (!this.listeners.has(name)) this.listeners.set(name, []);
      this.listeners.get(name).push(callback);
    }
    click() {
      if (this.download) downloads.push({ name: this.download, blob: blobs.get(this.href) });
      this.listeners.get('click')?.forEach(handler => handler());
    }
    append(child) { this.children.push(child); }
    focus() { document.activeElement = this; }
    setAttribute() {}
    remove() {}
    insertAdjacentHTML(position, html) { this.innerHTML += html; }
    getContext() { return context2d; }
    getBoundingClientRect() { return { left: 0, top: 0, width: 800, height: 600 }; }
  }
  const document = new Element();
  document.body = new Element();
  document.createElement = () => new Element();
  const window = new Element();
  window.devicePixelRatio = 1;
  window.setTimeout = callback => callback();
  const blobs = new Map();
  const sandbox = vm.createContext({
    document, window, Element, console, Blob,
    URL: {
      createObjectURL(blob) {
        const url = `blob:${blobs.size}`;
        blobs.set(url, blob);
        return url;
      },
      revokeObjectURL: url => blobs.delete(url)
    },
    storage, indexedDB, navigator: { locks },
    localStorage: {
      getItem: key => {
        if (blockLocalStorage) throw new Error('Storage blocked');
        return storage.get(key) ?? null;
      },
      setItem: (key, value) => {
        if (blockLocalStorage) throw new Error('Storage blocked');
        storage.set(key, String(value));
      },
      removeItem: key => storage.delete(key)
    },
    performance: { now: () => 1000 },
    requestAnimationFrame: () => 1,
    cancelAnimationFrame() {}
  });
  vm.runInContext(source, sandbox, { filename: 'game.js' });
  const run = script => vm.runInContext(script, sandbox);
  run('start();');
  return { run, drawingCalls, downloads };
}

function createSaveDatabase() {
  const records = new Map();
  let queue = Promise.resolve();
  return {
    abortWrites: false,
    corruptWrites: false,
    open() {
      const request = {};
      queueMicrotask(() => {
        request.result = {
          close() {},
          transaction: (_name, mode) => {
            const ready = queue;
            let finish;
            queue = new Promise(resolve => { finish = resolve; });
            let pendingWrite, pending = 0, aborted = false;
            function execute(handler) {
              const result = {};
              pending++;
              ready.then(() => {
                if (aborted) return;
                handler(result);
                if (aborted || --pending) return;
                if (pendingWrite) records.set(pendingWrite.key, pendingWrite.data);
                finish();
                transaction.oncomplete();
              });
              return result;
            }
            const transaction = {
              abort() {
                aborted = true;
                finish();
                transaction.onabort();
              },
              objectStore: () => ({
                get: key => execute(result => {
                  result.result = structuredClone(pendingWrite?.data ?? records.get(key));
                  result.onsuccess?.();
                }),
                put: (data, key) => execute(result => {
                  if (mode === 'readwrite' && this.abortWrites) {
                    transaction.error = new Error('Transaction aborted');
                    transaction.abort();
                  } else {
                    pendingWrite = { key, data: structuredClone(data) };
                    if (this.corruptWrites) pendingWrite.data.lastSlot = null;
                    result.onsuccess();
                  }
                })
              })
            };
            return transaction;
          }
        };
        request.onsuccess();
      });
      return request;
    }
  };
}

test('only equipment needs blueprints and locked equipment cannot be crafted', () => {
  const { run } = loadGame();
  assert.equal(run(`['medkit', 'ammo_pistolAmmo', 'buildWorkbench', 'buildBountyBoard',
    'smeltIron', 'repairBeacon:sector4-0', 'beaconModule:support'].every(isBlueprintUnlocked)`), true);
  assert.equal(run("isBlueprintUnlocked('smg')"), false);
  run("game.vault = { iron: 100, fuel: 100 }; craftItem('smg');");
  assert.equal(run('game.crafting'), null);
  assert.equal(run('game.vault.iron'), 100);
  run("openCraftDetails('radBeam');");
  assert.match(run('ui.craftDetails.innerHTML'), /MINI-BOSS DROP/);
  run("game.blueprints.smg = true; craftItem('smg');");
  assert.equal(run('game.crafting.recipeKey'), 'smg');
});

test('construction, beacon repairs, and modules remain usable without blueprints', () => {
  const { run } = loadGame();
  run(`
    resourceTypes.forEach(resource => game.vault[resource.key] = 10000);
    game.stationOpen = 'designer';
    craftItem('buildBountyBoard');
  `);
  assert.equal(run('game.crafting.recipeKey'), 'buildBountyBoard');
  run(`
    updateCrafting(12);
    const station = game.beaconStations[0];
    game.player.x = station.x; game.player.y = station.y;
    game.stationOpen = 'beacon-repair'; game.activeBeaconStationId = station.id;
    craftItem('repairBeacon:' + station.id);
  `);
  assert.match(run('game.crafting.recipeKey'), /^repairBeacon:/);
  run(`
    updateCrafting(20);
    game.player.x = station.x + beaconModuleBenchOffset; game.player.y = station.y;
    game.stationOpen = 'beacon-modules'; game.activeBeaconStationId = station.id;
    craftItem('beaconModule:support');
  `);
  assert.equal(run('station.modules.support'), 1);
});

test('blueprint purchases spend carried/banked salvage but never reputation', () => {
  const { run } = loadGame();
  run(`
    game.armorerRep = 10; game.salvage = 5; game.banked = 100;
    const price = getBlueprintSalvageCost('smg');
    buyBlueprint('smg');
  `);
  assert.equal(run('game.armorerRep'), 10);
  assert.equal(run('game.blueprints.smg'), true);
  assert.equal(run('game.salvage + game.banked'), run('105 - price'));
  run("buyBlueprint('smg');");
  assert.equal(run('game.salvage + game.banked'), run('105 - price'));
  run("buyBlueprint('laser');");
  assert.equal(run('Boolean(game.blueprints.laser)'), false);
  run("game.armorerRep = 1000; game.banked = 0; buyBlueprint('laser');");
  assert.equal(run('Boolean(game.blueprints.laser)'), false);
  run("game.banked = 1000; buyBlueprint('radBeam');");
  assert.equal(run('Boolean(game.blueprints.radBeam)'), false);
  assert.doesNotMatch(run('renderBlueprintShop()'), /data-buy-blueprint="radBeam"/);
  assert.doesNotMatch(run('renderBlueprintShop()'), /data-buy-blueprint="ammo_/);
});

test('Armorer contracts scale and preserve their reputation reward through saves', () => {
  const { run } = loadGame();
  run(`
    const first = game.questState.available.find(quest => quest.npcId === 'armorer');
    acceptQuest(first.id);
    updateQuestProgress('survive', first.amount);
    game = restoreGame(serializeGame());
    completeQuest(first.id);
  `);
  assert.equal(run('game.armorerRep'), 25);
  assert.equal(run('game.questState.armorerContractsCompleted'), 1);
  assert.equal(run("game.questState.available.find(q => q.npcId === 'armorer').amount"), 120);
  assert.equal(run("game.questState.available.find(q => q.npcId === 'armorer').armorerRepReward"), 30);
  run(`
    const second = game.questState.available.find(q => q.npcId === 'armorer');
    acceptQuest(second.id); updateQuestProgress('survive', second.amount); completeQuest(second.id);
    for (let i = 0; i < 10; i++) ensureQuestState();
  `);
  assert.equal(run('game.armorerRep'), 55);
  assert.equal(run("game.questState.available.filter(q => q.npcId === 'armorer').length"), 1);
});

test('quests only count post-acceptance actions, including fresh exploration', () => {
  const { run } = loadGame();
  run(`
    updateQuestProgress('kill', 40);
    const killQuest = game.questState.available.find(q => q.type === 'kill');
    acceptQuest(killQuest.id);
  `);
  assert.equal(run('game.questState.active[0].progress'), 0);
  run("updateQuestProgress('kill', 3);");
  assert.equal(run('game.questState.active[0].progress'), 3);
  run(`
    game.player.x = 2000; game.player.y = 0; updateBiomeAnnouncement(0);
    const explore = game.questState.available.find(q => q.type === 'explore');
    acceptQuest(explore.id);
    game.player.x = 0; game.player.y = 0; updateBiomeAnnouncement(0);
    game.player.x = 2000; updateBiomeAnnouncement(0);
  `);
  assert.equal(run('game.questState.active[1].progress'), 0);
  run("game.player.x = 0; game.player.y = 2000; updateBiomeAnnouncement(0);");
  assert.equal(run('game.questState.active[1].progress'), 1);
  run("game.player.x = -2000; game.player.y = 0; updateBiomeAnnouncement(0);");
  assert.equal(run('game.questState.active[1].progress'), 2);
});

test('timed quests survive pauses, maps, offline time, and expire without duplicate offers', () => {
  const { run } = loadGame();
  run(`
    const timed = game.questState.bounties.find(q => q.timeLimit);
    acceptQuest(timed.id);
    expireTimedQuests(10);
    game.paused = true; loop(600000);
    game.paused = false; setMapOpen(true); loop(700000); setMapOpen(false);
    game = restoreGame(serializeGame());
  `);
  assert.equal(run('game.questState.active[0].remainingSeconds'), 290);
  run('expireTimedQuests(291); ensureQuestState();');
  assert.equal(run('game.questState.active.length'), 0);
  assert.equal(run('game.questState.bounties.length'), 3);
  run('acceptQuest(timed.id);');
  assert.equal(run('game.questState.active[0].remainingSeconds'), 300);
  assert.equal(run('game.questState.active[0].progress'), 0);
});

test('survival excludes partial time before acceptance and travel counts walking, not teleportation', () => {
  const { run } = loadGame();
  run(`
    game.player.x = 2000; game.player.y = 0;
    baseUpdate(.75);
    const armorQuest = game.questState.available.find(q => q.npcId === 'armorer');
    acceptQuest(armorQuest.id);
    baseUpdate(.25);
    game.questState.counters.travel = 10000;
    const travelQuest = game.questState.bounties.find(q => q.type === 'travel');
    acceptQuest(travelQuest.id);
  `);
  assert.equal(run('game.questState.active[0].progress'), .25);
  assert.equal(run('game.questState.active[1].progress'), 0);
  run(`
    const walkingStart = game.player.x;
    keys.d = true; baseUpdate(1); keys.d = false;
    const walked = game.player.x - walkingStart;
    teleportPlayer(game.player.x + 1000, game.player.y);
    baseUpdate(.25);
  `);
  assert.equal(run('Math.abs(game.questState.active[1].progress - walked) < 1e-8'), true);
});

test('save round trips preserve quests, enemy relationships, hit sets, and health behavior', () => {
  const { run } = loadGame();
  run(`
    const offered = game.questState.available[0];
    acceptQuest(offered.id);
    const boss = createBiomeEnemy(10500, -1000, getBiome(10500, -1000), enemyVariants[4]);
    const guard = boss.wraithGuards[0];
    game.bullets.push({ life: 1, hitEnemies: new Set([guard]) });
    const walker = createVoidWalker(19000, 0); walker.hp = 123; addEnemy(walker);
    game.armorerRep = 60; game.blueprints.laser = true;
    game = restoreGame(serializeGame()); ensureQuestState();
    const loadedBoss = game.enemies.find(enemy => enemy.effect === 'wraith-boss-guards');
    const loadedGuard = loadedBoss.wraithGuards[0];
    const loadedWalker = game.enemies.find(enemy => enemy.voidWalker);
    const healthBefore = loadedBoss.hp; loadedBoss.hp -= 1;
    renderQuestDialog('quartermaster');
  `);
  assert.equal(run('loadedBoss.hp'), run('healthBefore'));
  assert.equal(run('loadedGuard.guardOwner === loadedBoss'), true);
  assert.equal(run('game.enemies.includes(loadedGuard)'), true);
  assert.equal(run('game.bullets[0].hitEnemies.has(loadedGuard)'), true);
  assert.equal(run('loadedWalker.hp'), 123);
  run('loadedWalker.isAggroed = false; loadedWalker.hp -= 0.1;');
  assert.equal(run('loadedWalker.isAggroed'), true);
  assert.equal(run('Math.abs(loadedWalker.hp - 122.9) < 1e-8'), true);
  assert.equal(run('game.questState.available.every(Boolean)'), true);
  assert.equal(run('game.armorerRep'), 60);
  assert.equal(run('game.blueprints.laser'), true);
});

test('legacy saves repair missing offers and retain owned equipment without granting blueprints', () => {
  const { run } = loadGame();
  run(`
    const legacy = JSON.parse(JSON.stringify(game, (_, value) => value instanceof Set ? [...value] : value));
    const active = { ...legacy.questState.available[0], progress: 5 };
    delete active.baseline;
    const timed = { ...legacy.questState.bounties.find(q => q.timeLimit), progress: 10, expiresAt: 1 };
    legacy.questState.active = [active, timed];
    legacy.questState.available[0] = null;
    legacy.questState.counters.collected = 50;
    legacy.questState.bounties.push(null);
    legacy.questState.completed = ['hold-the-line-story-2'];
    delete legacy.questState.armorerContractsCompleted;
    legacy.unlockedWeapons.laser = true;
    legacy.blueprints = { smg: true }; legacy.armorerRep = 15;
    game = restoreGame(JSON.stringify(legacy)); ensureQuestState();
    renderQuestDialog('quartermaster');
    updateQuestProgress('collect', 1);
  `);
  assert.equal(run('game.questState.active[0].progress'), 6);
  assert.equal(run('game.questState.available.every(Boolean)'), true);
  assert.equal(run('game.questState.bounties.every(Boolean)'), true);
  assert.equal(run('game.unlockedWeapons.laser'), true);
  assert.equal(run('isBlueprintUnlocked("laser")'), false);
  assert.equal(run('isBlueprintUnlocked("smg")'), true);
  assert.equal(run('game.armorerRep'), 15);
  assert.equal(run('game.questState.active[1].remainingSeconds'), 300);
});

test('loading regenerates the same seeded biome conditions', () => {
  const { run } = loadGame();
  run(`
    const originalEffects = JSON.stringify(sectorRegions.map(regions => regions.map(b => b.effects)));
    const savedState = serializeGame();
    randomizeBiomeData(game.seed + 1);
    start(savedState);
  `);
  assert.equal(run('JSON.stringify(sectorRegions.map(regions => regions.map(b => b.effects)))'), run('originalEffects'));
});

test('a full slot reload preserves world state, timers, equipment, and live projectiles', async () => {
  const storage = new Map();
  const first = loadGame({ storage });
  assert.equal(await first.run(`
    currentSaveSlot = 3;
    game.player.x = 3456; game.player.y = -5432; game.health = 73;
    game.weapon = 'minigun'; game.weaponSlots[1] = 'minigun';
    game.unlockedWeapons.minigun = true; game.ammo = 36; game.ammoReserve.minigunAmmo = 5;
    game.inventory.wood = 7; game.vault.steel = 19; game.salvage = 23; game.banked = 91;
    game.discovered.add('sector-2-2');
    game.beaconStations[0].repaired = true; game.beaconStations[0].modules.drain = 2;
    const timed = game.questState.bounties.find(quest => quest.timeLimit);
    acceptQuest(timed.id); game.questState.active[0].remainingSeconds = 123.5;
    game.crafting = { recipeKey: 'ammo_minigunAmmo', remaining: 1.25, total: 3, quantity: 1 };
    game.nodes[0].taken = true;
    game.hazardZones[0].radius = 777;
    attachEmberFireballs(game.enemies[0]);
    saveGame();
  `), true);

  const second = loadGame({ storage });
  await second.run('handleMenuAction("continue")');
  assert.equal(second.run('currentSaveSlot'), 3);
  assert.equal(second.run(`
    game.player.x === 3456 && game.player.y === -5432 && game.health === 73
    && game.weaponSlots[1] === 'minigun' && game.weapon === 'minigun'
    && game.ammo === 36 && game.ammoReserve.minigunAmmo === 5
    && game.inventory.wood === 7 && game.vault.steel === 19 && game.salvage === 23 && game.banked === 91
    && game.discovered.has('sector-2-2')
    && game.beaconStations[0].repaired && game.beaconStations[0].modules.drain === 2
    && game.questState.active[0].remainingSeconds === 123.5 && game.crafting.remaining === 1.25
    && game.nodes[0].taken && game.hazardZones[0].radius === 777
    && game.projectiles.length === 2 && game.projectiles.every(proj =>
      proj.life === Infinity && proj.followTarget === game.enemies[0])
  `), true);
});

test('older graph saves recover attached fireballs and unsupported saves fail visibly', () => {
  const { run } = loadGame();
  run(`
    Object.assign(game, { projectiles: [{ followTarget: game.enemies[0], life: null }] });
    const legacy = JSON.parse(serializeGame());
    legacy.format = 'horde-graph-v1';
    start(JSON.stringify(legacy), 2);
  `);
  assert.equal(run('game.projectiles[0].life'), Infinity);
  assert.equal(run(`
    readSaveSlots()[1] = { state: '{"format":"unsupported"}' };
    loadSave(1);
  `), false);
  assert.equal(run('currentSaveSlot'), 2);
  assert.match(run('saveSlotsTitle.textContent'), /COULD NOT BE LOADED/);
});

test('a live .hordesave rescues unsaved progress without writing browser storage', async () => {
  const source = loadGame({ blockLocalStorage: true });
  source.run(`
    game.salvage = 87;
    game.vault.steel = 49;
    document.querySelector('#export-live-save').click();
  `);
  assert.equal(source.run('readSaveSlots().every(slot => slot === null)'), true);
  assert.equal(source.downloads.length, 1);
  const download = source.downloads[0];
  assert.match(download.name, /\.hordesave$/);
  const text = await download.blob.text();
  const backup = JSON.parse(text);
  assert.deepEqual(Object.keys(backup), ['format', 'version', 'kind', 'entries']);
  const target = loadGame();
  target.run('returnToMainMenu(); renderSaveSlots("load");');
  target.run('saveFileInput.files = [{ name: "rescue.hordesave", size: 200, text: () => ' + JSON.stringify(text) + ' }];');
  await target.run('saveFileInput.listeners.get("change")[0]();');
  assert.equal(target.run('pendingSaveImport.plan[0].target'), 0);
  assert.equal(target.run('readSaveSlots()[0]'), null);
  assert.equal(await target.run(`saveImportPreview.listeners.get('click')[0]({
    target: { closest: () => ({ dataset: { importAction: 'confirm' } }) }
  });`), true);
  assert.equal(target.run('game.active'), false);
  target.run('loadSave(0);');
  assert.equal(target.run('game.salvage'), 87);
  assert.equal(target.run('game.vault.steel'), 49);
});

test('bulk .hordesave imports prefer empty slots and preserve unrelated saves', async () => {
  const { run, downloads } = loadGame();
  await run(`
    currentSaveSlot = 0; game.salvage = 10; saveGame();
  `);
  await run(`
    currentSaveSlot = 1; game.salvage = 11; saveGame();
  `);
  await run(`
    currentSaveSlot = 4; game.salvage = 14; saveGame();
  `);
  run(`renderSaveSlots('load'); document.querySelector('#export-all-saves').click();`);
  assert.equal(downloads.length, 1);
  const text = await downloads[0].blob.text();
  run(`const backup = parseSaveBackup(${JSON.stringify(text)}); renderSaveImport(backup);`);
  assert.deepEqual(Array.from(run('pendingSaveImport.plan.map(entry => entry.target)')), [2, 3, 4]);
  assert.equal(run('pendingSaveImport.replaced[0].slot'), 4);
  run(`saveImportPreview.listeners.get('click')[0]({
    target: { closest: () => ({ dataset: { importAction: 'backup' } }) }
  });`);
  const replacedBackup = JSON.parse(await downloads[1].blob.text());
  assert.deepEqual(replacedBackup.entries.map(entry => entry.slot), [4]);
  assert.equal(await run('applySaveImport(pendingSaveImport)'), true);
  assert.deepEqual(Array.from(run('readSaveSlots().map(slot => deserializeGame(slot.state).salvage)')), [10, 11, 10, 11, 14]);
});

test('invalid .hordesave files cannot partially import or overwrite slots', async () => {
  const { run } = loadGame();
  await run('currentSaveSlot = 0; saveGame();');
  run(`
    const saved = readSaveSlots()[0];
    const badBackup = makeSaveBackup('all', [
      { slot: 1, save: saved },
      { slot: 2, save: { ...saved, state: '{"format":"unsupported"}' } }
    ]);
  `);
  assert.throws(() => run('parseSaveBackup(JSON.stringify(badBackup))'), /Invalid save data in slot 3/);
  assert.throws(() => run('parseSaveBackup(readSaveSlots()[0].state)'), /Not a Fight the Horde backup/);
  assert.equal(run('readSaveSlots().filter(Boolean).length'), 1);
});

test('Rad Beam is unlocked only by the radioactive mini-boss roll, without granting the weapon', () => {
  const { run } = loadGame();
  run(`
    const radBiome = getBiome(-12000, 12000);
    const missed = createBiomeEnemy(-12000, 12000, radBiome, enemyVariants[4]);
    Math.random = () => .35;
    missed.hp = 0; defeatEnemy(missed);
  `);
  assert.equal(run('Boolean(game.blueprints.radBeam)'), false);
  run(`
    const dropped = createBiomeEnemy(-12000, 12000, radBiome, enemyVariants[4]);
    Math.random = () => .349;
    dropped.hp = 0; defeatEnemy(dropped);
    const killsAfterDrop = game.questState.counters.kills;
    defeatEnemy(dropped);
  `);
  assert.equal(run('game.blueprints.radBeam'), true);
  assert.equal(run('Boolean(game.unlockedWeapons.radBeam)'), false);
  assert.equal(run('game.questState.counters.kills'), run('killsAfterDrop'));
});

test('boss relic drops count and automated turret kills do not advance kill quests', () => {
  const { run } = loadGame();
  run(`
    Math.random = () => .4;
    const enemy = createBiomeEnemy(2000, 0, getBiome(2000, 0), enemyVariants[4]);
    enemy.hp = 0; defeatEnemy(enemy, 0, 'beacon-turret');
  `);
  assert.equal(run('game.questState.counters.kills'), 0);
  assert.equal(run('game.questState.counters.relics'), 1);
});

test('NPC drawing, prompts, and interactions use the same positions and pause with gameplay', () => {
  const { run, drawingCalls } = loadGame();
  run(`
    game.elapsedTime = 135;
    const positions = getSanctuaryNpcPositions();
    game.player.x = positions[0].x; game.player.y = positions[0].y;
    drawSanctuaryNpcs();
  `);
  assert.equal(run('getNearbyQuestSource()'), 'quartermaster');
  const position = run('positions[0]');
  assert.ok(drawingCalls.some(call => call[0] === 'fillText' && call[1] === 'E // TALK'
    && call[2] === position.x && call[3] === position.y + 44));
  run('game.paused = true; loop(900000);');
  assert.equal(run('JSON.stringify(getSanctuaryNpcPositions()) === JSON.stringify(positions)'), true);
});

test('map rings follow the actual sector boundaries', () => {
  const { run, drawingCalls } = loadGame();
  run('drawMap();');
  const radii = drawingCalls.filter(call => call[0] === 'arc').map(call => call[3]);
  assert.ok(radii.includes(9500));
  assert.ok(radii.includes(13000));
  assert.ok(radii.includes(16000));
  assert.ok(!radii.includes(9000));
  assert.ok(!radii.includes(12000));
});

test('pause focuses Resume and clicking it resumes the same run without saving', () => {
  const { run } = loadGame();
  run(`
    currentSaveSlot = 0;
    game.elapsedTime = 27;
    game.player.x = 115;
    keys.d = pointer.down = true;
    togglePause();
  `);
  assert.equal(run('document.activeElement === resumeButton'), true);
  assert.equal(run('game.paused && !ui.pause.classList.contains("hidden")'), true);
  run('resumeButton.click();');
  assert.equal(run('game.paused'), false);
  assert.equal(run('ui.pause.classList.contains("hidden")'), true);
  assert.equal(run('game.elapsedTime'), 27);
  assert.equal(run('game.player.x'), 115);
  assert.equal(run('keys.d || pointer.down'), false);
  assert.equal(run('readSaveSlots()[0]'), null);
  run('resumeButton.click();');
  assert.equal(run('game.paused'), false);
});

test('settings swap conflicting bindings only on confirmation and rebind gameplay input', () => {
  const { run } = loadGame();
  run(`
    const press = (key, code) => window.listeners.get('keydown')[0]({ key, code, preventDefault() {} });
    const select = action => settingsBindings.listeners.get('click')[0]({
      target: { closest: () => ({ dataset: { bindAction: action } }) }
    });
    togglePause();
    document.querySelector('#pause-settings-button').click();
    select('w');
    press('d', 'KeyD');
  `);
  assert.equal(run('game.paused && settings.bindings.w === "w" && !settingsSwap.hidden'), true);
  run('press("Escape", "Escape");');
  assert.equal(run('settingsSwap.hidden && !settingsPanel.classList.contains("hidden")'), true);
  run('select("w"); press("d", "KeyD"); settingsSwap.click();');
  assert.equal(run('settings.bindings.w === "d" && settings.bindings.d === "w"'), true);
  run('press("Escape", "Escape"); resumeButton.click(); press("d", "KeyD");');
  assert.equal(run('keys.w && !keys.d'), true);
  run('window.listeners.get("keyup")[0]({ key: "D", code: "KeyD" });');
  assert.equal(run('keys.w'), false);
});

test('mouse bindings and display settings persist between runs and reset to defaults', () => {
  const storage = new Map();
  const first = loadGame({ storage });
  first.run(`
    returnToMainMenu();
    document.querySelector('#main-settings-button').click();
    settingsBindings.listeners.get('click')[0]({
      target: { closest: () => ({ dataset: { bindAction: 'fireAlt' } }) }
    });
    window.listeners.get('pointerdown')[0]({ button: 2, pointerType: 'mouse', preventDefault() {}, stopPropagation() {} });
    effectsInput.checked = true; effectsInput.listeners.get('change')[0]();
    colorInput.value = '#00aacc'; colorInput.listeners.get('change')[0]();
    sizeInput.value = '32'; sizeInput.listeners.get('change')[0]();
  `);
  const { run } = loadGame({ storage });
  assert.equal(run('settings.reducedEffects && settings.bindings.fireAlt === "mouse2"'), true);
  assert.equal(run('gameShell.style["--crosshair-color"]'), '#00aacc');
  assert.equal(run('gameShell.style["--crosshair-size"]'), '32px');
  run('canvas.listeners.get("mousedown")[0]({ button: 2, preventDefault() {} });');
  assert.equal(run('isFiring()'), true);
  run('window.listeners.get("mouseup")[0]({ button: 2 });');
  assert.equal(run('Boolean(isFiring())'), false);
  run('document.querySelector("#settings-reset").click();');
  assert.equal(run('settings.bindings.fireAlt === "mouse0" && !settings.reducedEffects'), true);
  assert.equal(run('gameShell.style["--crosshair-size"]'), '22px');
});

test('restart button begins a fresh run instead of parsing the click event as a save', () => {
  const { run } = loadGame();
  run("document.querySelector('#restart-button').onclick({ type: 'click' });");
  assert.equal(run('game.active'), true);
  assert.equal(run('game.elapsedTime'), 0);
  assert.equal(run('game.player.x'), 0);
  assert.equal(run('game.player.y'), 0);
});

test('small continuous and module damage is independent of equipped weapon', () => {
  const { run } = loadGame();
  run(`
    game.player.x = 0; game.player.y = 0;
    const enemy = createVoidWorm(100, 0);
    game.weapon = 'sidearm'; enemy.hp = 120; enemy.hp -= .05;
    const sidearmLoss = 120 - enemy.hp;
    game.weapon = 'railgun'; enemy.hp = 120; enemy.hp -= .05;
    const railgunLoss = 120 - enemy.hp;
    game.enemies = [enemy];
    const station = game.beaconStations[0]; station.repaired = true; station.modules.drain = 1;
    enemy.x = station.x + station.radius + 10; enemy.y = station.y;
    enemy.hp = 120; game.weapon = 'sidearm'; updateBeaconStationModules(1/60);
    const sidearmDrain = 120 - enemy.hp;
    enemy.hp = 120; game.weapon = 'railgun'; updateBeaconStationModules(1/60);
    var drainResults = { sidearmLoss, railgunLoss, sidearmDrain, railgunDrain: 120 - enemy.hp };
  `);
  assert.ok(Math.abs(run('sidearmLoss - .05') ) < 1e-8);
  assert.ok(Math.abs(run('railgunLoss - .05')) < 1e-8);
  assert.ok(Math.abs(run('sidearmDrain - 2/60')) < 1e-8);
  assert.ok(Math.abs(run('drainResults.railgunDrain - 2/60')) < 1e-8);
});

test('one minigun belt crafts and consumes one full reload at the existing cost', () => {
  const { run } = loadGame();
  run(`
    game.vault = { steel: 4, fuel: 2 };
    craftItem('ammo_minigunAmmo');
    updateCrafting(3);
    game.weapon = 'minigun'; game.ammo = 0; game.reloadPending = true;
  `);
  assert.equal(run('game.ammoReserve.minigunAmmo'), 1);
  assert.equal(run('game.vault.steel + game.vault.fuel'), 0);
  run('reloadAmmo();');
  assert.equal(run('game.ammo'), 100);
  assert.equal(run('game.ammoReserve.minigunAmmo'), 0);
});

test('Hazmat blocks radiation damage and blinding while other armor does not', () => {
  const { run } = loadGame();
  run(`
    const fallout = getBiome(-11500, 11500);
    const nebula = getBiome(-10000, -10000);
    game.enemies = [{ x: 0, y: 0, effect: 'radioactive-aura' }];
    game.radioactiveBombZones = [{ x: 0, y: 0, radius: 150, active: true, life: 3 }];
    updateRadioactiveEffects(1);
  `);
  assert.equal(run('game.health'), 46);
  assert.ok(run('game.radioactiveBlindTimer') > 0);
  run("game.armor = 'hazmatSuit'; game.health = 100; updateRadioactiveEffects(1);");
  assert.equal(run('game.health'), 100);
  assert.equal(run('game.radioactiveBlindTimer'), 0);
  run(`
    game.enemies = []; game.radioactiveBombZones = []; game.nodes = [];
    game.player.x = -11500; game.player.y = 11500;
    game.hazardZones = [{ x: game.player.x, y: game.player.y, radius: 100,
      hazard: fallout.effects.hazard, biomeKey: fallout.key, damagePerSecond: 50 }];
    update(.04);
  `);
  assert.equal(run('game.health'), 100);
  run('game.player.x = -10000; game.player.y = -10000; game.hazardZones = []; update(.04);');
  assert.equal(run('game.health'), 100);
  run('game.armor = null; update(.04);');
  assert.equal(run('nebula.effects.hazard.name'), 'NEBULA RADIATION');
  assert.ok(run('game.health < 100'));
});

test('swept player shots hit the nearest enemy before expiry; piercing hits both', () => {
  const { run } = loadGame();
  run(`
    game.nodes = []; game.hazardZones = []; game.sanctuaryTurrets = [];
    const near = { x: 22, y: 100, r: 4, hp: 10, speed: 0, shieldTimer: 0 };
    const far = { ...near, x: 44 };
    game.enemies = [far, near];
    const shot = { x: 0, y: 100, vx: 2000, vy: 0, life: .03, radius: 3, damage: 2 };
    game.bullets = [{ ...shot }];
    update(.04);
  `);
  assert.equal(run('near.hp'), 8);
  assert.equal(run('far.hp'), 10);
  run('game.bullets = [{ ...shot, pierce: true, hitEnemies: new Set() }]; update(.04);');
  assert.equal(run('near.hp'), 6);
  assert.equal(run('far.hp'), 8);
});

test('swept enemy and turret shots hit between endpoints, with no turret kill credit', () => {
  const { run } = loadGame();
  run(`
    game.nodes = []; game.hazardZones = []; game.enemies = []; game.sanctuaryTurrets = [];
    const incoming = { x: -40, y: 0, vx: 2000, vy: 0, life: 1, radius: 4, damage: 9 };
    game.projectiles = [incoming];
    update(.04);
  `);
  assert.equal(run('game.health'), 91);
  assert.equal(run('incoming.x'), -17);
  run(`
    const closeEnemy = { x: 25, y: 100, r: 4, hp: 1, shieldTimer: 0 };
    const farEnemy = { ...closeEnemy, x: 50 };
    game.enemies = [farEnemy, closeEnemy];
    game.projectiles = [{ x: 0, y: 100, vx: 2000, vy: 0, life: 1, radius: 4, damage: 2, turretProjectile: true }];
    updateBeaconTurretProjectiles(.04);
  `);
  assert.equal(run('closeEnemy.defeated'), true);
  assert.equal(run('farEnemy.hp'), 1);
  assert.equal(run('game.questState.counters.kills'), 0);
});

test('Drain kills do not advance kill quests but player kills still do', () => {
  const { run } = loadGame();
  run(`
    const station = game.beaconStations[0];
    station.repaired = true; station.modules.drain = 1;
    const enemy = { x: station.x, y: station.y, hp: 1, shieldTimer: 0 };
    game.enemies = [enemy];
    updateBeaconStationModules(1);
  `);
  assert.equal(run('enemy.defeated'), true);
  assert.equal(run('game.questState.counters.kills'), 0);
  run('defeatEnemy({ x: 0, y: 0, hp: 0 });');
  assert.equal(run('game.questState.counters.kills'), 1);
});

test('Rad Beam direct damage is consistent at different frame rates', () => {
  const { run } = loadGame();
  run(`
    game.weapon = 'radBeam'; game.player.x = 0; game.player.y = 0; game.player.angle = 0;
    const enemy = createVoidWorm(100, 0); game.enemies = [enemy];
    game.ammo = 8; game.radBeamDrainTimer = 0;
    for (let i = 0; i < 60; i++) updateRadBeam(1/60);
    const damage60fps = 120 - enemy.hp;
    enemy.hp = 120; game.ammo = 8; game.radBeamDrainTimer = 0;
    for (let i = 0; i < 30; i++) updateRadBeam(1/30);
    var radBeamResults = { damage60fps, damage30fps: 120 - enemy.hp };
  `);
  assert.ok(Math.abs(run('radBeamResults.damage60fps - .05') ) < 1e-8);
  assert.ok(Math.abs(run('radBeamResults.damage60fps - radBeamResults.damage30fps')) < 1e-8);
});

test('status-resistance armor cannot heal above maximum health', () => {
  const { run } = loadGame();
  run(`
    game.enemies = []; game.health = 100; game.armor = 'hazardArmor';
    game.enemyStatus = { burn: 5, acid: 0, bleed: 0, freeze: 0, root: 0 };
    update(.04);
  `);
  assert.ok(run('game.health <= 100'));
  assert.ok(run('game.health < 100'));
});

test('failed save reports failure and a successful save reports success', async () => {
  const { run } = loadGame();
  await run(`
    currentSaveSlot = 0;
    window.setTimeout = () => 0;
    localStorage.setItem = () => { throw new Error('Storage quota exceeded'); };
    saveButton.listeners.get('click')[0]();
  `);
  assert.equal(run('saveButton.textContent'), 'SAVE FAILED');
  await run(`
    localStorage.setItem = (key, value) => storage.set(key, String(value));
    saveButton.listeners.get('click')[0]();
  `);
  assert.equal(run('saveButton.textContent'), 'GAME SAVED');
});

test('an acknowledged but mismatched write is not reported as saved by either backend', async () => {
  const indexedDB = createSaveDatabase();
  const { run } = loadGame({ indexedDB });
  indexedDB.corruptWrites = true;
  assert.equal(await run(`
    localStorage.setItem = () => {};
    currentSaveSlot = 0;
    saveGame();
  `), false);
  assert.equal(run('readSaveSlots()[0]'), null);
});

test('IndexedDB saves and deletes slots across reloads when localStorage cannot write', async () => {
  const indexedDB = createSaveDatabase();
  const storage = new Map();
  const legacy = loadGame({ storage });
  const legacySlot = { state: legacy.run('serializeGame()'), timestamp: 1 };
  storage.set('horde-save-slots', JSON.stringify([legacySlot, legacySlot]));
  storage.set('horde-last-save-slot', '0');
  const first = loadGame({ indexedDB, storage });
  await first.run('saveStorageReady');
  assert.equal(first.run('continueButton.disabled'), false);

  assert.equal(await first.run(`
    localStorage.setItem = () => { throw new Error('Storage quota exceeded'); };
    currentSaveSlot = 1;
    game.armorerRep = 75;
    saveGame();
  `), true);

  const reloaded = loadGame({ indexedDB, blockLocalStorage: true });
  await reloaded.run('handleMenuAction("continue")');
  assert.equal(reloaded.run('currentSaveSlot'), 1);
  assert.equal(reloaded.run('game.armorerRep'), 75);
  assert.ok(reloaded.run('readSaveSlots()[0]?.state'));
  await reloaded.run(`
    window.confirm = () => true;
    renderSaveSlots('load');
    saveSlotList.listeners.get('click')[0]({
      target: { closest: () => ({ dataset: { saveAction: 'delete-slot', saveSlot: '1' } }) }
    });
  `);
  const afterDelete = loadGame({ indexedDB, storage });
  await afterDelete.run('saveStorageReady');
  assert.equal(afterDelete.run('readSaveSlots()[1]'), null);
  assert.equal(afterDelete.run('continueButton.disabled'), true);

  afterDelete.run('loadSave(0);');
  assert.equal(await afterDelete.run('game.armorerRep = 100; saveGame();'), true);
  const recovered = loadGame({ indexedDB, storage });
  await recovered.run('handleMenuAction("continue")');
  assert.equal(recovered.run('game.armorerRep'), 100);
  assert.equal(recovered.run('readSaveSlots()[1]'), null);
});

test('salvage remains carried until a save commits and survives reload after banking', async () => {
  const indexedDB = createSaveDatabase();
  const first = loadGame({ indexedDB, blockLocalStorage: true });
  indexedDB.abortWrites = true;
  await first.run(`
    currentSaveSlot = 2;
    game.salvage = 17;
    game.inventory.wood = 4;
    update(.016);
    salvageDeposit;
  `);
  first.run('update(.016)');
  assert.equal(first.run('game.salvage'), 17);
  assert.equal(first.run('game.banked'), 0);
  assert.equal(first.run('readSaveSlots()[2]'), null);
  assert.match(first.run('ui.objective.textContent'), /SAVE FAILED/);

  indexedDB.abortWrites = false;
  await first.run(`
    salvageRetryAt = 0;
    update(.016);
    salvageDeposit;
  `);
  assert.equal(first.run('game.salvage'), 0);
  assert.equal(first.run('game.banked'), 17);
  const reloaded = loadGame({ indexedDB, blockLocalStorage: true });
  await reloaded.run('handleMenuAction("continue")');
  assert.equal(reloaded.run('game.banked'), 17);
  assert.equal(reloaded.run('game.salvage'), 0);
  assert.equal(reloaded.run('game.vault.wood'), 4);
});

for (const backend of ['localStorage', 'mixed storage', 'IndexedDB without Web Locks']) {
  test(`separate tabs preserve each other's slots using ${backend}`, async () => {
    const options = {
      storage: new Map(),
      locks: backend === 'IndexedDB without Web Locks' ? null : createSaveLocks(),
      indexedDB: backend === 'localStorage' ? undefined : createSaveDatabase()
    };
    const first = loadGame({ ...options, blockLocalStorage: backend === 'mixed storage' });
    const second = loadGame(options);
    await Promise.all([first.run('saveStorageReady'), second.run('saveStorageReady')]);
    assert.deepEqual(await Promise.all([
      first.run('start(null, 0); game.salvage = 100; saveGame();'),
      second.run('start(null, 1); game.salvage = 200; saveGame();')
    ]), [true, true]);
    const reload = loadGame(options);
    await reload.run('saveStorageReady');
    assert.deepEqual(Array.from(reload.run('readSaveSlots().slice(0, 2).map(save => deserializeGame(save.state).salvage)')), [100, 200]);
  });
}

test('a stale run and import preview cannot overwrite a slot updated by another tab', async () => {
  const options = { storage: new Map(), locks: createSaveLocks() };
  const first = loadGame(options);
  const second = loadGame(options);
  second.run(`
    start(null, 0);
    renderSaveImport(makeSaveBackup('slot', [{
      slot: 0, save: { timestamp: 1, sector: 1, state: serializeGame({ salvage: 999 }) }
    }]), 0);
  `);
  assert.equal(await first.run('start(null, 0); game.salvage = 123; saveGame();'), true);
  assert.equal(await second.run('applySaveImport(pendingSaveImport);'), false);
  assert.match(second.run('saveFileStatus.textContent'), /SLOTS CHANGED/);
  assert.equal(await second.run('game.salvage = 456; saveGame();'), false);
  assert.equal(await second.run('saveGame();'), false);
  assert.equal(second.run('deserializeGame(readSaveSlots()[0].state).salvage'), 123);
});

test('ruined beacon stations do not grant protection until repaired', () => {
  const { run } = loadGame();
  run(`
    const station = game.beaconStations[0];
    const angle = (Math.atan2(station.y, station.x) + Math.PI * 2) % (Math.PI * 2);
    const biomeIndex = Math.floor(angle / (Math.PI / 2));
    const sectorBiome = sectorRegions[getBiomeSector(Math.hypot(station.x, station.y))][biomeIndex];
    const ruined = getBiome(station.x, station.y);
    station.repaired = true;
    const repaired = getBiome(station.x, station.y);
    var beaconEffects = { ruined, expected: sectorBiome.effects, repaired };
  `);
  assert.equal(run('beaconEffects.ruined.effects === beaconEffects.expected'), true);
  assert.equal(run('beaconEffects.ruined.key.startsWith("beacon-")'), false);
  assert.notEqual(run('beaconEffects.ruined.effects.hazard.name'), 'BEACON PROTECTION');
  assert.equal(run('beaconEffects.repaired.effects.healthRegen'), 1.5);
  assert.equal(run('beaconEffects.repaired.effects.hazard.damagePerSecond'), 0);
});

test('only repaired beacons block damage from overlapping hazard zones', () => {
  const { run } = loadGame();
  const result = run(`(() => {
    const station = game.beaconStations[0];
    teleportPlayer(station.x, station.y);
    game.enemies = []; game.nodes = []; game.spawnTimer = 999;
    const biome = getBiome(station.x, station.y);
    const dt = .04;
    const zone = { x: station.x, y: station.y, radius: 150, damagePerSecond: 50, hazard: biome.effects.hazard };
    function healthAfter(repaired, inZone) {
      station.repaired = repaired;
      game.hazardZones = inZone ? [zone] : [];
      game.health = 50;
      update(dt);
      return game.health;
    }
    return { ruined: healthAfter(false, false) - healthAfter(false, true),
      repaired: healthAfter(true, false) - healthAfter(true, true) };
  })()`);
  assert.equal(result.ruined, 2);
  assert.equal(result.repaired, 0);
});
