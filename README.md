# Fight-The-Horde

Open `index.html` directly in a browser to play the game.

Open **How to Play** from the main menu for a guide to controls, campaign progression, and backups. **Change Log** lists the latest additions and gameplay fixes without revealing the story ending.

Use **WASD** to move, the mouse to aim and fire, **E** to interact with stations, and **M** to open the full map. The map pauses gameplay, centers on your character, and shows names for discovered biomes when hovered. From the beacon sanctuary or a repaired beacon station, click another repaired station or the sanctuary on the map to fast travel. Sector 4 contains four ruined beacon stations, each with a 20 m radius. Repair one from its station menu using its listed resource costs to block biome effects and gain 1.5 HP/s regeneration, a crafting table, and four automated turrets.

## Quests and blueprints

Talk to sanctuary NPCs with **E**, and open the quest log with **L**. Up to three quests can be active, including the main quest. Optional quests count actions taken after acceptance; optional exploration requires discovering new biome regions, and travel counts distance walked outside the sanctuary. Timed quests count active gameplay only, not pauses, the map, Manager mode, or time offline.

**The Last Signal** is a 12-mission campaign across four chapters. Start with the Quartermaster, follow the cyan diamond on the map for field objectives, and use your interact binding at marked sites. Stay close to a mast to finish its scan. For defenses, stay inside the marked perimeter and clear each wave; retreat resets the encounter, not the mission. The campaign supplies a kit for one beacon repair. The others still use their normal repair costs.

The original NPC quests, Armourer contracts, and Bounty Board are optional. Older saves keep their gear, world state, and optional quest progress, and receive campaign credit for equivalent milestones without a second payout. Campaign progress, including ongoing scans and waves, is part of the slot and its `.hordesave` backup.

Automated beacon kills, including turret and Drain kills, do not advance player kill quests.

Only weapon and armor recipes require blueprints. Earn permanent Armourer reputation through repeatable contracts to qualify for better blueprints, then buy them with salvage (carried or banked). Reputation is never spent. Ammo, supplies, refining, construction, beacon repairs, and modules do not need blueprints. The Rad Beam blueprint cannot be purchased: the Radioactive Flatlands mini-boss has a 35% chance to unlock it on defeat. You must still craft the weapon.

Ammo storage counts full clips, not individual rounds. Crafting a Minigun Belt costs 4 steel and 2 fuel and produces one 100-round reload. The Hazmat Suit blocks radioactive environmental damage, auras, and bombardment, and prevents radioactive blindness.

For balancing in [game.js](./game.js), edit `blueprintTierCosts` for reputation thresholds, `getBlueprintSalvageCost()` for prices, and `createArmorerContract()` for repeatable quest scaling. Prices start at 10 salvage and add 1.5 times the reputation threshold, rounded up to the next multiple of five. Armourer contracts start at 90 seconds, 25 reputation, and 35 salvage; each completion adds 30 seconds, 5 reputation, and 10 salvage to the next contract.

Saves retain existing equipment, reputation, and blueprints; owning a weapon does not automatically grant its blueprint. Legacy timed quests without a saved gameplay timer restart their time allowance on migration. Legacy saves that omitted Void enemy health restore those enemies at maximum health because their previous HP cannot be recovered.

## Void epilogue

After turning in **What the Signal Woke**, open the quest log for the Archivist's Continuity Key clue. The tactical map marks a search area, not the exact portal. The Void Stalker guards the entrance: dodge its telegraphed lunge and counter while it recovers. It won't pursue you outside its territory.

The portal leads into the Continuity facility. Clear the combat rooms, read the maintenance panel to align the relays, and look for two optional supply caches. You can turn back through the pressure lock until you enter the Foreman's arena. Saving or exporting inside the facility preserves your equipment, health, supplies, room clears, and puzzle progress; loading starts at the latest visited safe checkpoint, with the arena fight reset. Death still ends the run normally.

Defeat the Foreman to unlock the **Continuity Weave** armour blueprint at the Arsenal. You can return for rematches; the blueprint and side-room caches are one-time rewards per save. Existing saves that finished the campaign already qualify for the Continuity Key.

The Foreman is an endgame boss and horde fight. Watch for marked slams, sweeping floor lanes, projectile volleys, charges, and relay hazards. Reinforcement waves grow larger and arrive faster in later phases. They can draw from all 24 biome families and Void enemies: mini-bosses are rare, and a summoned Void Stalker is the rarest roll (at most one per fight). Purple gate outlines warn you before a wave arrives. Defeating the Foreman shuts down the remaining reinforcements.

## Settings

Open **Settings** from the main menu or pause menu. Select a control and press a keyboard key or mouse button to rebind it. If that input is in use, confirm the swap to keep both actions bound. **Esc** cancels a rebind or goes back; it remains reserved for pause and resume. If the tactical map is bound to the primary mouse button, use **Esc** to close the map so primary clicks can still select travel destinations.

**Reduced Effects** hides decorative sparks and reduces flash intensity without changing damage or removing attack warnings. You can also customize crosshair color and size. Settings apply immediately, are stored separately from save slots in the current browser, and can be restored with **Reset to Defaults**.

## Admin Test Lab

After using the existing admin unlock, open **Pause → Admin Test Lab → Start Disposable Run**. Your current run stays paused in memory. Load the Void Stalker, any dungeon room, or a specific Foreman phase; **Reset Scenario** restarts that setup without wiping the test loadout. You can also spawn enemies, clear threats without removing scenario bosses, refill health or ammo separately, toggle invincibility, jump to a campaign mission, and grant selected blueprints or materials.

The diagnostics report includes the seed, position, quests, dungeon checkpoint, and boss phase. Use **Copy Bug Report** or copy from the report field manually. Disposable runs cannot save or export. Use **Discard Test and Return** to resume your original run; don't refresh the page if it has unsaved progress.

Under **Combat**, select any weapon and choose **Equip Weapon** to use it immediately, without crafting or a blueprint. Ranged weapons come with a full magazine. The weapon uses its existing slot or an empty slot; if all four slots are full, it replaces the currently equipped weapon.

Toggle **Infinite Ammo** under **Combat** to fire without spending ammo or reloading, even with an empty magazine. It works with the Rad Beam too. Turning it off restores normal ammo use without changing what was in your magazine or reserves.

## Browser saves

Press **Esc** to pause. Choose **Resume Game** or press **Esc** again to return to the run. The same menu offers **Save Game**, **Export Current Run**, and **Main Menu**.

Save slots use localStorage when possible and fall back to IndexedDB if the browser rejects a write. The game loads the newest saved slot list from either store, including the last-used slot. Returning to the sanctuary with salvage automatically saves the current slot before moving that salvage into the bank. If neither store can commit the save, the salvage stays carried and the game displays a warning. Keep the page open and retry; unsaved progress cannot survive a refresh.

The game reads back each save before reporting success. Saves preserve the current hazard layout, active timers and projectiles, and shared references between gameplay objects. They resume normal gameplay rather than restoring the pause or map screens. Older saves still load. Browser saves are local to the current browser profile and site; clearing site data can remove both stores.

Tabs coordinate save writes so saving to one slot does not erase another tab's slots. If another tab changes the slot you are playing, the game rejects another save from the older run. Use **Export Current Run** to preserve its progress without replacing the newer save.

For an offline backup, open **Load Save** and choose **Export** beside a slot or **Back Up All Slots**. From the pause menu, **Export Current Run** downloads even unsaved progress without writing to browser storage. Keep the `.hordesave` file somewhere safe.

Use **Load Save → Import Save File** to preview a backup. Imports prefer empty slots; for a single save, you can choose its destination. If a replacement is needed, the preview lists the affected slots and offers to back them up before you confirm. Unrelated slots are left alone, and importing never automatically launches a run. Backups contain slot data only, not browser-wide scores or settings. Only supported `.hordesave` files up to 50 MiB are accepted.

Run regression tests with `node --test tests/game.test.cjs` and check syntax with `node --check game.js`. The tests use a lightweight DOM/Canvas stub; they do not replace browser playtesting.