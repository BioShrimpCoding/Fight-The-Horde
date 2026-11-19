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

## Discovery journal

Open **Journal** beside the quest log, from Pause, or with **B** (remappable in Settings). Reading pauses gameplay; closing returns to your previous play or pause state. If an older control setup already uses B, the journal receives an unused letter without changing existing bindings.

The **Enemies** tab reveals only encountered enemies and variants. Seeing a living enemy on screen records its identity, habitat, and abilities. Your first player defeat unlocks combat advice; five defeats complete a standard variant's field notes, while bosses require one victory. Beacon turret and Drain kills, and self-destructing missiles, do not advance player defeat counts.

**Discoveries** collects explored regions, observed deep Void hazards, visited facility rooms, Sanctuary reconstruction, and the first-clear trophy record. **Records** lets you reread completed campaign debriefs, recovered mod research, and epilogue information without revealing unfinished story content. Journal entries themselves give no passive damage bonus and occupy no quest slot.

Journal progress belongs to its save slot and is included in `.hordesave` backups. Older saves retain discoveries supported by their map, campaign, and dungeon progress. Proven guardian and Foreman victories unlock their entries without inventing historical kill counts.

## Optional world events

Five minutes of active overworld play makes the first opportunity eligible; later opportunities appear roughly every 6–9 active minutes when there is room. At most two opportunities exist, including any active encounter. Sites avoid Sanctuary, beacon stations, campaign locations, and the centers of environmental hazards. Void breaches require sector 3 or higher. These events occur within the mapped frontier, not in the deep Void or inside the facility.

Approach within 65 displayed meters to discover a site and its amber map marker. Use your interact binding at its marked control to start; only one event can be active, and it does not occupy a quest slot. Undiscovered sites do not reveal exact locations on the map; Scout Station I can add approximate search circles in explored regions. Moving horde trails can be followed before you choose to intercept.

- **Distress Signal:** Defend a survivor's transmitter for at least 90 seconds and clear three waves.
- **Supply Wreck:** Open three cargo locks, clearing each ambush before the next lock.
- **Roaming Horde:** Defeat its marked elite leader and escort.
- **Disabled Convoy:** Repair two components using parts already on site, then defend extraction for at least 60 seconds and clear three waves.
- **Void Breach:** Shoot three stationary anchors and clear their defenders, then defeat the marked guardian and its escort.

Waves warn before spawning, avoid appearing on top of the player, and queue when the normal overworld population budget is full. Event enemies scale to the site's sector and retain their biome abilities. Completion pays **35 / 65 / 100 salvage** in sectors **1–2 / 3–4 / 5–6**, plus a fixed supply bundle. Wrecks emphasize steel and fuel, breaches crystals, and convoys fuel plus **2 / 3 / 4 reloads** for the weapon equipped when the event started (pistol ammo if using melee). Material rewards go to the vault, as with quest rewards; normal combat drops are separate. Events never directly unlock weapons or blueprints.

Unstarted opportunities expire after eight active overworld minutes. Event timers freeze during pauses, maps, the journal, Manager mode, live campaign scans/defenses, and dungeon visits. Starting a live story encounter abandons an active world event so their fights cannot overlap. Leaving the event's marked 90-meter area or using its **Abandon Event** button also withdraws without a completion payout. Remaining event enemies and pending event portals are removed; already-fired attacks and temporary hazards expire normally. Ignoring or abandoning an event never damages world upgrades or campaign progress.

Event timers, queued waves, enemies, and completed-type records are retained in saves and `.hordesave` exports. Older saves receive a five-minute grace period before their first opportunity. Discovered event types and completion counts appear in the journal's **Discoveries** tab.

## Sanctuary rebuilding and weapon modifications

Talk to the responsible NPC in Sanctuary to build projects with materials from the vault (relic costs use your relic inventory). Each project has two visible stages; stage II also requires discovering a region in sector 3 or beyond. NPC quests and existing crafting remain available without rebuilding. Projects, research plans, crafted mods, and the resupply list belong only to their save slot and travel in `.hordesave` backups. Old saves start with no rebuilt projects or fabricated research.

| Project / NPC | Stage I | Stage II |
| --- | --- | --- |
| Medical Wing / Medic | Medkit crafting beside the Medic | All medkit recipes cost 15% fewer materials, rounded down, minimum one of each |
| Workshop / Mechanic | Handling mod crafting and installation | Specialization crafting and installation |
| Scout Station / Scout | Approximate event leads in discovered regions | Facility intelligence using recovered campaign clues |
| Archive / Archivist | Research plans and recovered records | Gallery of earned event and boss trophies |
| Supply Depot / Quartermaster | One-click ammo order for the equipped weapon | Saved multi-weapon shopping list with a combined cost/output preview |

Medical, Scout, and Archive stages cost **12 wood + 8 iron + 4 fiber**, then **10 steel + 6 crystal + 4 fuel**. Workshop and Depot stages cost **12 iron + 6 steel + 4 fuel**, then **16 steel + 8 crystal + 1 relic**. There is no new currency, recurring free supply generation, or passive global damage stacking.

Scout leads are dashed search circles, not discoveries or event activation. They disappear when an opportunity expires. Stage II facility intelligence currently uses the existing Continuity expedition clue once its key and the Void are discovered. The four optional mini-facilities will extend these leads in the next stage; named-rival dossiers will extend the Archive later. Neither of those encounters is added by this update.

Each crafted weapon has one **Handling** and one **Specialization** slot. At the Mechanic, select a crafted weapon, inspect the trade-offs, craft its mods, and install or remove them free. A mod is owned **per weapon**, not once for the whole arsenal. Crafting or researching a mod never grants its weapon or weapon blueprint. Swapping recalculates stats from the original weapon and cannot repeatedly multiply bonuses.

| Slot | Mod | Compatibility and trade-off |
| --- | --- | --- |
| Handling | Stabilizer | Projectile weapons with spread: -25% spread, -10% firing rate |
| Handling | Quick Loader | Conventional multi-round magazines: -20% empty-magazine recovery, -15% magazine capacity, rounded down |
| Handling | Balanced Grip | Melee: -15% attack cooldown, -10% damage |
| Handling | Focus Assembly | Energy weapons, Railgun, and gauntlets: +20% reach, -10% direct damage |
| Specialization | Penetrator | Conventional single-projectile, non-beam/non-explosive guns: hit one additional enemy, -20% damage |
| Specialization | Scatter Choke | Shotgun: -30% spread, two fewer pellets |
| Specialization | Concussive Payload | Grenade Launcher / Pulse Carbine: +25% blast radius, -20% damage |
| Specialization | Lingering Flame | Flamethrower: +50% burn duration, -20% burn tick damage |
| Specialization | Heavy Edge | Melee: +25% damage, +20% attack cooldown |
| Specialization | Focused Discharge | Laser / Combat Pistol / Railgun: +20% direct damage, +25% firing cooldown |
| Specialization | Sustained Exposure | Rad Beam: +25% radiation duration, -20% direct beam damage |
| Specialization | Focused Orbit | Magic / Cosmos Gauntlets: -25% projectile cone, -15% reach |
| Specialization | Short Chain | Void Batar: +20% firing rate, -30% projectile lifetime |

Handling mods cost **4 steel + 2 crystal**. Specializations cost **8 steel + 4 crystal**, or **12 steel + 8 crystal + 1 relic** for weapons whose original crafting recipe uses relics. Advanced plans are claimed free at Archive I after deterministic milestones: **12 encountered enemy variants** for Focus Assembly, **3 completed world events** for Concussive Payload, **25 recorded player defeats** for Lingering Flame, and **20 encountered variants** for Focused Orbit. These are permanent plans in that save, not random drops; the Workshop stage and per-weapon crafting cost still apply.

Unmodified weapons retain their existing timing. The game has no separate timed reload animation: Quick Loader shortens the final-shot cooldown before the automatic reload by 20%, not every shot. It is unavailable on single-shot weapons. Reduced capacity never creates ammo: removed rounds become shared **loose rounds** for that ammo type, displayed as **R** beside full-reload reserves and consumed first on reload. Removing the mod does not refill the larger magazine.

Supply Depot orders use normal ammo recipe costs and outputs. List quantities are **crafting batches** (1–5 per weapon), and shared ammo costs/outputs are summed. All materials are checked and paid together, then the order completes after three active crafting seconds per batch. A paid order keeps its own snapshot if you edit the saved list. Saving during crafting retains paid costs and pending output; loading cannot duplicate it. Melee and self-recharging gauntlets cannot place ammo orders.

## Void epilogue

After turning in **What the Signal Woke**, open the quest log for the Archivist's Continuity Key clue. The portal lies northeast, **10,000 meters beyond the map edge** (11,800 meters from Sanctuary). The tactical map marks a search area, not the exact portal, and the Void HUD shows the signal bearing and distance. Bring ample ammo and medkits for the long journey.

Deep Void storms mark strike zones before dealing a single blast of damage. Unstable rifts show their trigger radius; approaching one starts a warning before Void enemies emerge. Both dangers become more frequent farther out. They pause while you are inside the dungeon.

The portal's Void Stalker is a near-final-boss challenge with **1,400 HP**, heavy lunges, and three phases with increasing pursuit speed and shorter recovery windows. Phase two chains two attacks before recovering; phase three chains three. Every follow-up still has its own full, locked-aim warning: keep dodging until the chain ends, then counter during recovery. Its attacks include marked rift blasts, radial volleys, aimed spread shots, crossing rift lanes, and a close-range shockwave. Sidestep the spread, move diagonally out of the crossing lanes, and retreat beyond the marked shockwave circle. The portal guardian won't pursue you outside its territory. The rare Stalker summoned by the Foreman has the same full strength and phases; the Foreman's escalating hordes remain the final challenge.

The portal leads into the Continuity facility. Clear the combat rooms, read the maintenance panel to align the relays, and look for two optional supply caches. You can turn back through the pressure lock until you enter the Foreman's arena. Saving or exporting inside the facility preserves your equipment, health, supplies, room clears, and puzzle progress; loading starts at the latest visited safe checkpoint, with the arena fight reset. Death still ends the run normally.

Defeat the Foreman to unlock the **Continuity Weave** armour blueprint at the Arsenal. You can return for rematches; the blueprint and side-room caches are one-time rewards per save. Existing saves that finished the campaign already qualify for the Continuity Key.

The Foreman is an endgame boss and horde fight. Watch for marked slams, sweeping floor lanes, projectile volleys, charges, and relay hazards. Reinforcement waves grow larger and arrive faster in later phases. They can draw from all 24 biome families and Void enemies: mini-bosses are rare, and a summoned Void Stalker is the rarest roll (at most one per fight). Purple gate outlines warn you before a wave arrives. Defeating the Foreman shuts down the remaining reinforcements.

Older saves retain guardian clears and dungeon rewards. An uncleared legacy guardian moves to the new portal location with its remaining health percentage preserved; the key's old portal marker resets to the new search area.

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