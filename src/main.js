import { CANVAS_WIDTH, CANVAS_HEIGHT, LAYERS } from './core/constants.js';
import { PerformanceMonitor } from './utils/performance-monitor.js';
import { AnimationQueue } from './render/animation-queue.js';
import { SoundManager } from './audio/sound-manager.js';
import { UIRenderer } from './render/ui-renderer.js';
import { GameWorld } from './core/game-world.js';
import { loadAssets } from './render/asset-loader.js';
import { SpriteAtlas } from './render/sprite-atlas.js';
import { FirstPersonRenderer } from './render/first-person.js';
import { MinimapRenderer } from './render/minimap.js';
import { InputMapper } from './ui/input-mapper.js';
import { Character } from './character/character.js';
import { GameSave } from './core/game-save.js';
import { createItem } from './items/item-data.js';

function createCanvasStack(container) {
  const canvases = {};
  for (const name of LAYERS) {
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    canvas.dataset.layer = name;
    container.appendChild(canvas);
    canvases[name] = canvas.getContext('2d');
  }
  return canvases;
}

async function boot() {
  const viewport = document.getElementById('game-viewport');
  const layers = createCanvasStack(viewport);

  const ui = layers.ui;
  ui.fillStyle = '#0f0';
  ui.font = '16px monospace';
  ui.fillText('Loading Dungeon X...', 20, 30);

  const assets = await loadAssets();
  const atlas = new SpriteAtlas(assets);

  const world = new GameWorld(42, assets);
  // Don't call init() yet — dungeon generates when player enters from tavern

  const renderers = {
    fp: new FirstPersonRenderer(atlas),
    ui: new UIRenderer(assets),
    minimap: new MinimapRenderer()
  };
  world.renderers = renderers;

  const soundManager = new SoundManager();
  const animationQueue = new AnimationQueue();
  const performanceMonitor = new PerformanceMonitor();

  const input = new InputMapper(soundManager);
  input.attach();
  world.input = input; // Expose for touch hit zone registration

  // === Browser persistence + safety net ===
  // Request persistent storage (prevents browser eviction)
  GameSave.requestPersistence();

  // beforeunload — save on tab close/navigate away
  window.addEventListener('beforeunload', () => {
    GameSave.save(world);
  });

  // === Title Screen — always first ===
  // Title screen handles save detection internally and reports action when done
  world.stateStack.pushTitleScreen();

  world.needsRender = true;

  // Wind ambient starts after title screen → exterior transition (handled in game loop)

  ui.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  function gameLoop(timestamp) {
    performanceMonitor.beginFrame();
    const commandEvent = input.consume();
    const currentState = world.stateStack.peek();

    if (commandEvent && currentState) {
      const handled = currentState.handleInput(commandEvent, world);
      if (handled) world.needsRender = true;
    }

    // Check for state transitions (e.g., combat end, title screen)
    const activeState = world.stateStack.peek();
    if (activeState && activeState.isDone && activeState.isDone()) {
      world.stateStack.pop();
      world.needsRender = true;

      // Title screen completed — set up game flow based on action
      if (activeState.getAction) {
        const action = activeState.getAction();
        if (action === 'continue') {
          // Show character select before entering
          world.stateStack.pushCharacterSelect();
        } else if (action === 'new_game') {
          // New game — clear any existing save, push character create under exterior
          GameSave.clearSave();
          world.stateStack.pushCharacterCreate(true);
          world.stateStack.pushTavernExterior();
          setTimeout(() => soundManager.startExteriorWind(), 500);
        }
      }

      // Character select completed — handle action
      if (activeState.constructor && activeState.constructor.name === 'CharacterSelectState' && activeState.getAction) {
        const csAction = activeState.getAction();
        if (csAction === 'continue') {
          // Load save and go to exterior
          const saveData = GameSave.load();
          if (saveData && saveData.heroCharacter) {
            _restoreFromSave(world, saveData);
          }
          world.stateStack.pushTavernExterior();
          setTimeout(() => soundManager.startExteriorWind(), 500);
        } else if (csAction === 'new') {
          // Create new character — clear save
          GameSave.clearSave();
          world.stateStack.pushCharacterCreate(true);
          world.stateStack.pushTavernExterior();
          setTimeout(() => soundManager.startExteriorWind(), 500);
        } else if (csAction === 'back') {
          // Back to title screen
          world.stateStack.pushTitleScreen();
        }
      }

      // Handle specific state completion logic
      if (activeState.combat) {
        if (activeState.combat.state === 'defeat') {
          // Party wipe — show death screen, then return to tavern
          const fallenMembers = world.party.getMembers().map(m => ({
            name: m.name,
            class: m.class,
            portrait: m.portrait,
          }));
          const dName = world.dungeonName || world.dungeonType || 'Unknown Dungeon';
          const dFloor = world.floor || 1;
          world.exitDungeon(false);
          world.stateStack.clear();
          world.stateStack.pushTavern(renderers);
          world.stateStack.pushDeathScreen(fallenMembers, dName, dFloor);
          GameSave.harvestRunOnDeath(world);
        } else if (activeState.combat.state === 'victory') {
          // Build rewards object for victory screen
          const goldEarned = activeState.combat.enemies
            ? Math.max(1, Math.floor(activeState.combat.enemies.reduce((sum, e) => sum + (e.currentHP <= 0 ? e.xp : 0), 0) / 5))
            : 0;
          const totalXP = activeState.combat.enemies
            ? activeState.combat.enemies.reduce((sum, e) => sum + (e.currentHP <= 0 ? e.xp : 0), 0)
            : 0;
          const rewards = { gold: goldEarned, xp: totalXP, items: [], fragment: null };

          // Build party snapshot with level-up flags
          const partySnapshot = world.party.getMembers().map(m => {
            const leveledUp = activeState._levelUpData
              ? activeState._levelUpData.some(lu => lu.character === m)
              : false;
            return {
              name: m.name,
              class: m.class,
              portrait: m.portrait,
              currentHP: m.currentHP,
              maxHP: m.maxHP,
              currentMana: m.currentMana,
              maxMana: m.maxMana,
              leveledUp,
            };
          });

          const vName = world.dungeonName || world.dungeonType || 'Unknown Dungeon';
          const vFloor = world.floor || 1;

          // Push level-up notifications first (they stack on top)
          if (activeState._levelUpData) {
            for (const lu of activeState._levelUpData) {
              world.stateStack.pushLevelUp(lu.character, lu.oldLevel, lu.newLevel);
            }
          }
          // Push victory screen (shows after level-ups are dismissed)
          world.stateStack.pushVictoryScreen(rewards, partySnapshot, vName, vFloor);
          GameSave.harvestRunOnVictory(world);
        }
        // Victory or Fled just resumes exploration which is already on the stack
      }
    }

    // Force render during active animations (typewriter, combat anims, splash screens)
    const current = world.stateStack.peek();
    if (current && current.npcDialogue && current.npcDialogue.active) {
      world.needsRender = true;
    }
    // States with continuous animation (e.g. tavern exterior splash)
    if (current && current.animates) {
      world.needsRender = true;
    }

    if (world.needsRender) {
      // Clear all layers
      for (const name of Object.keys(layers)) {
        layers[name].clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      }

      // Render the full stack (though current states usually clear their layers)
      world.stateStack.updateAndRender(layers, world, timestamp);
      world.needsRender = false;
    }

    performanceMonitor.endFrame();
    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);
  console.log('Dungeon X — The Rusty Flagon awaits.');
}

/**
 * Restore world state from a save data object.
 */
function _restoreFromSave(world, saveData) {
  // Rebuild roster from save
  world.roster.characters = [];
  if (saveData.roster) {
    for (const charData of saveData.roster) {
      const char = new Character(charData.name, charData.class, charData.level);
      // Restore full state
      char.xp = charData.xp || 0;
      char.portrait = charData.portrait || char.portrait;
      char.isCustom = charData.isCustom || false;
      if (charData.baseStats) char.baseStats = { ...charData.baseStats };
      if (charData.levelBonuses) char.levelBonuses = { ...charData.levelBonuses };
      char.calculateFinalStats();
      char.maxHP = charData.maxHP || char.calculateMaxHP();
      char.currentHP = charData.currentHP || char.maxHP;
      char.maxMana = charData.maxMana || char.calculateMaxMana();
      char.currentMana = charData.currentMana || char.maxMana;
      if (charData.equipment) {
        char.equipment = {
          weapon: charData.equipment.weapon ? { ...charData.equipment.weapon } : null,
          armor: charData.equipment.armor ? { ...charData.equipment.armor } : null,
          shield: charData.equipment.shield ? { ...charData.equipment.shield } : null,
          accessory: charData.equipment.accessory ? { ...charData.equipment.accessory } : null,
        };
        char.calculateFinalStats();
      }
      world.roster.add(char);
    }
  }
  world.roster.save();

  // Find and set hero character
  if (saveData.heroCharacter) {
    const heroData = saveData.heroCharacter;
    world.heroCharacter = world.roster.getAll().find(
      c => c.name === heroData.name && c.class === heroData.class
    ) || null;
  }

  // Restore party composition
  if (saveData.party) {
    world.party.members = [];
    for (const pm of saveData.party) {
      const char = world.roster.getAll().find(
        c => c.name === pm.name && c.class === pm.class
      );
      if (char) {
        world.party.addMember(char);
      }
    }
  }

  // Restore world state
  world.gold = saveData.gold || 50;
  world.completedDungeons = new Set(saveData.completedDungeons || []);
  world.collectedFragments = new Set(saveData.collectedFragments || []);

  // Restore inventory items
  if (saveData.inventory) {
    for (const itemData of saveData.inventory) {
      try {
        world.inventory.addItem(createItem(itemData.id));
      } catch (e) {
        // Item may not exist in item-data, skip
      }
    }
  }

  console.log('Game restored from save. Hero:', world.heroCharacter?.name);
}

document.addEventListener('DOMContentLoaded', boot);

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js')
    .then((registration) => {
      console.log('Service Worker registered:', registration.scope);
    })
    .catch((error) => {
      console.log('Service Worker registration failed:', error);
    });
}
