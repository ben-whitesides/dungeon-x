import { ITEM_ICON_MAP } from '../../render/asset-loader.js';
import { CLASS_DATA } from '../../character/class-data.js';
import { NPCDialogue, loadDialogueData } from '../npc-dialogue.js';
import { createPRNG } from '../../core/prng.js';
import { GameSave } from '../../core/game-save.js';

// Notice board data — loaded async
let noticeBoardData = null;
async function loadNoticeBoardData() {
  if (noticeBoardData) return noticeBoardData;
  const res = await fetch('../../config/notice-board.json');
  noticeBoardData = await res.json();
  return noticeBoardData;
}

// Atmosphere text by fragment count bracket
const ATMOSPHERE_TEXT = {
  0: 'The tavern is warm and busy.',
  1: 'The tavern is warm and busy.',
  2: 'The room falls quiet as you enter.',
  3: 'The room falls quiet as you enter.',
  4: 'Whispers follow you to your seat.',
  5: 'Whispers follow you to your seat.',
  6: 'The trophy wall draws stares from visitors.',
  7: 'The trophy wall draws stares from visitors.',
  8: 'The air is tense. Something watches from the shadows.',
  9: 'The air is tense. Something watches from the shadows.',
  10: 'The Sunstone fragments illuminate everything. The final descent awaits.',
};

// Class insight data for the tavern character cards
const CLASS_INSIGHTS = {
  fighter: { role: 'TANK', icon: '⚔', color: '#C0392B', desc: 'High HP, heavy armor, front-line warrior', best: 'Taking hits & dealing steady damage' },
  ranger:  { role: 'STRIKER', icon: '🏹', color: '#27AE60', desc: 'Ranged attacks, nature magic, tracking', best: 'Picking off enemies from distance' },
  mage:    { role: 'CASTER', icon: '✦', color: '#8E44AD', desc: 'Devastating spells, fragile body', best: 'Area damage & arcane destruction' },
  cleric:  { role: 'HEALER', icon: '✚', color: '#F1C40F', desc: 'Divine magic, healing, undead bane', best: 'Keeping the party alive' },
  rogue:   { role: 'SHADOW', icon: '🗡', color: '#2C3E50', desc: 'Stealth, traps, critical strikes', best: 'Sneak attacks & lockpicking' },
  paladin: { role: 'CRUSADER', icon: '⛨', color: '#D4AC0D', desc: 'Holy warrior, smites evil, heals', best: 'Smiting undead & divine protection' },
};

export class TavernState {
  constructor(assets, renderers) {
    this.assets = assets;
    this.renderers = renderers;
    this.mode = 'hub'; // hub, roster, party_select, shop, dungeon_select, notice_board, leaderboard, strider, npcs, new_game_confirm
    // Hub hotspot state
    this.hubHotspots = [];  // Populated in _renderHub
    this.selectedHotspot = 0;
    this.selectedCharacter = 0;
    this.selectedPartySlot = 0;
    this.confirmSelected = 1; // Default to CANCEL (safe choice)
    this.selectedMerchantItem = 0;
    this.selectedPlayerItem = 0;
    this.selectedDungeon = 0;
    this.selectedLeaderboardDungeon = 0;
    this.striderAvailable = false;
    this.striderDialogueIndex = 0;
    this.flickerPhase = 0;
    this.animates = true;     // Continuous render for fireplace/torch animation
    this.focusArea = 'cards'; // 'cards' or 'bar' — which row has keyboard focus
    this.selectedBarButton = 0; // Which bottom bar button is highlighted
    this.npcDialogue = new NPCDialogue();
    this.selectedNPC = 0;
    this.availableNPCs = [];
    // Notice board state
    this.noticeBoardQuests = [];
    this.selectedQuest = 0;
    // Pre-load data
    loadDialogueData().catch(() => {});
    loadNoticeBoardData().catch(() => {});
  }

  handleInput(input, world) {
    const code = input.code;

    // Touch: direct card selection (roster)
    if (code && code.startsWith('_selectCard_')) {
      const idx = parseInt(code.split('_')[2], 10);
      if (!isNaN(idx)) {
        this.selectedCharacter = idx;
        return true;
      }
    }
    // Touch: party slot selection
    if (code && code.startsWith('_selectParty_')) {
      const idx = parseInt(code.split('_')[2], 10);
      if (!isNaN(idx)) {
        this.selectedPartySlot = idx;
        return true;
      }
    }

    // === Hub mode ===
    if (this.mode === 'hub') {
      // If dialogue is active (talking to an NPC from hub), delegate input there first
      if (this.npcDialogue.active) {
        if (this.npcDialogue.handleInput(code)) return true;
        return true;
      }

      const hotspots = this._getHubHotspots(world);

      // Bar button navigation — must be checked BEFORE hotspot nav
      if (this.focusArea === 'bar') {
        const hubButtons = this._hubBarButtons(world);
        if (code === 'ArrowLeft' || code === 'KeyA') {
          this.selectedBarButton = Math.max(0, this.selectedBarButton - 1);
          return true;
        }
        if (code === 'ArrowRight' || code === 'KeyD') {
          this.selectedBarButton = Math.min(hubButtons.length - 1, this.selectedBarButton + 1);
          return true;
        }
        if (code === 'ArrowUp' || code === 'KeyW') {
          this.focusArea = 'cards';
          return true;
        }
        if (code === 'Enter' || code === 'Space') {
          const btn = hubButtons[this.selectedBarButton];
          if (btn) {
            this.focusArea = 'cards';
            return this._executeHubBarAction(btn.code, world);
          }
        }
        return true;
      }

      // Hotspot navigation (scene NPCs) — only when NOT in bar mode
      if (code === 'ArrowLeft' || code === 'KeyA') {
        this.selectedHotspot = (this.selectedHotspot - 1 + hotspots.length) % hotspots.length;
        return true;
      }
      if (code === 'ArrowRight' || code === 'KeyD') {
        this.selectedHotspot = (this.selectedHotspot + 1) % hotspots.length;
        return true;
      }
      if (code === 'ArrowUp' || code === 'KeyW') {
        this.focusArea = 'cards';
        return true;
      }
      if (code === 'ArrowDown' || code === 'KeyS') {
        this.focusArea = 'bar';
        this.selectedBarButton = 0;
        return true;
      }
      // Enter/Space activates selected hotspot
      if (code === 'Enter' || code === 'Space') {
        const spot = hotspots[this.selectedHotspot];
        if (spot) {
          this._activateHubHotspot(spot, world);
        }
        return true;
      }
      // Shortcut keys from hub
      if (code === 'KeyP') {
        this.mode = 'party_select';
        this.selectedPartySlot = 0;
        this.focusArea = 'cards';
        return true;
      }
      if (code === 'KeyR') {
        this.mode = 'roster';
        this.focusArea = 'cards';
        return true;
      }
      if (code === 'KeyQ') {
        this.mode = 'notice_board';
        this._refreshNoticeBoard(world);
        this.selectedQuest = 0;
        return true;
      }
      if (code === 'KeyN') {
        this.mode = 'npcs';
        this.availableNPCs = this.npcDialogue.getAvailableNPCs(
          (world.collectedFragments ? world.collectedFragments.size : 0)
        );
        this.selectedNPC = 0;
        return true;
      }
      return false;
    }

    if (this.mode === 'roster') {
      // Up/Down switches focus between cards and bar
      if (code === 'ArrowUp' || code === 'KeyW') {
        this.focusArea = 'cards';
        return true;
      }
      if (code === 'ArrowDown' || code === 'KeyS') {
        this.focusArea = 'bar';
        return true;
      }

      if (this.focusArea === 'bar') {
        const rosterButtons = this._rosterBarButtons(world.party.getMembers().length);
        if (code === 'ArrowLeft' || code === 'KeyA') {
          this.selectedBarButton = Math.max(0, this.selectedBarButton - 1);
          return true;
        }
        if (code === 'ArrowRight' || code === 'KeyD') {
          this.selectedBarButton = Math.min(rosterButtons.length - 1, this.selectedBarButton + 1);
          return true;
        }
        if (code === 'Enter' || code === 'Space') {
          const btn = rosterButtons[this.selectedBarButton];
          if (btn) {
            this.focusArea = 'cards';
            return this._executeBarAction(btn.code, world);
          }
        }
        return true;
      }

      // Cards area
      if (code === 'Enter') {
        if (world.party.getMembers().length > 0) {
          this.mode = 'party_select';
          this.selectedPartySlot = 0;
          this.focusArea = 'cards';
          return true;
        }
      }
      if (code === 'ArrowLeft' || code === 'KeyA') {
        this.selectedCharacter = Math.max(0, this.selectedCharacter - 1);
        return true;
      }
      if (code === 'ArrowRight' || code === 'KeyD') {
        this.selectedCharacter = Math.min(world.roster.getAll().length, this.selectedCharacter + 1);
        return true;
      }
      if (code === 'Space') {
        const roster = world.roster.getAll();
        if (this.selectedCharacter === roster.length) {
          // "Create Custom" card selected — push character create screen
          world.stateStack.pushCharacterCreate();
          return true;
        }
        const char = roster[this.selectedCharacter];
        // H-4 fix: Check if already in party — show feedback flash
        const inParty = world.party.getMembers().includes(char) ||
          world.party.getMembers().some(m => m.name === char.name && m.class === char.class);
        if (char && inParty) {
          this._recruitFailFlash = Date.now();
          return true;
        }
        if (char && world.party.addMember(char)) {
          // Only switch to party_select when party is full (4 members)
          if (world.party.getMembers().length >= 4) {
            this.mode = 'party_select';
            this.selectedPartySlot = 0;
          }
          // Otherwise stay in roster to keep recruiting
        }
        return true;
      }
      if (code === 'KeyP') {
        this.mode = 'shop';
        this._resetShopSelection();
        return true;
      }
      if (code === 'Escape') {
        this.mode = 'hub';
        this.focusArea = 'cards';
        return true;
      }
    }

    if (this.mode === 'party_select') {
      const partyMembers = world.party.getMembers();

      // Up/Down switches between card area and bottom bar
      if (code === 'ArrowUp' || code === 'KeyW') {
        this.focusArea = 'cards';
        return true;
      }
      if (code === 'ArrowDown' || code === 'KeyS') {
        this.focusArea = 'bar';
        this.selectedBarButton = Math.min(this.selectedBarButton, this._partyBarButtons(partyMembers).length - 1);
        return true;
      }

      if (this.focusArea === 'bar') {
        const buttons = this._partyBarButtons(partyMembers);
        if (code === 'ArrowLeft' || code === 'KeyA') {
          this.selectedBarButton = Math.max(0, this.selectedBarButton - 1);
          return true;
        }
        if (code === 'ArrowRight' || code === 'KeyD') {
          this.selectedBarButton = Math.min(buttons.length - 1, this.selectedBarButton + 1);
          return true;
        }
        if (code === 'Enter' || code === 'Space') {
          const btn = buttons[this.selectedBarButton];
          if (btn) {
            this.focusArea = 'cards';
            return this._executeBarAction(btn.code, world);
          }
        }
        return true;
      }

      // Cards area — Left/Right navigates party slots
      if (code === 'ArrowLeft' || code === 'KeyA') {
        this.selectedPartySlot = Math.max(0, this.selectedPartySlot - 1);
        return true;
      }
      if (code === 'ArrowRight' || code === 'KeyD') {
        this.selectedPartySlot = Math.min(partyMembers.length - 1, this.selectedPartySlot);
        if (this.selectedPartySlot < partyMembers.length - 1) this.selectedPartySlot++;
        return true;
      }
      if (code === 'Space' || code === 'Delete' || code === 'Backspace') {
        if (partyMembers.length > 0 && this.selectedPartySlot < partyMembers.length) {
          // Hero (party leader, slot 0) cannot be removed
          const memberToRemove = partyMembers[this.selectedPartySlot];
          if (world.heroCharacter && memberToRemove === world.heroCharacter) {
            this._recruitFailFlash = Date.now(); // Flash feedback — can't remove hero
            return true;
          }
          world.party.removeMember(this.selectedPartySlot);
          if (this.selectedPartySlot >= world.party.getMembers().length) {
            this.selectedPartySlot = Math.max(0, world.party.getMembers().length - 1);
          }
          if (world.party.getMembers().length === 0) {
            this.mode = 'hub';
            this.focusArea = 'cards';
          }
        }
        return true;
      }
      if (code === 'Enter') {
        if (partyMembers.length > 0) {
          this.mode = 'notice_board';
          this._refreshNoticeBoard(world);
          this.selectedQuest = 0;
          this.focusArea = 'cards';
        }
        return true;
      }
      if (code === 'KeyP') {
        this.mode = 'shop';
        this._resetShopSelection();
        this.focusArea = 'cards';
        return true;
      }
      if (code === 'Escape') {
        this.mode = 'hub';
        this.focusArea = 'cards';
        return true;
      }
    }

    if (this.mode === 'shop') {
      if (code === 'ArrowUp' || code === 'KeyW') {
        this.selectedMerchantItem = Math.max(0, this.selectedMerchantItem - 1);
        return true;
      }
      if (code === 'ArrowDown' || code === 'KeyS') {
        this.selectedMerchantItem = Math.min(world.merchant.getInventory().length - 1, this.selectedMerchantItem + 1);
        return true;
      }
      // M-4 fix: Arrow keys for player item navigation
      if (code === 'ArrowLeft' || code === 'KeyA') {
        this.selectedPlayerItem = Math.max(0, this.selectedPlayerItem - 1);
        return true;
      }
      if (code === 'ArrowRight' || code === 'KeyD') {
        const playerItems = world.inventory.getAllItems();
        this.selectedPlayerItem = Math.min(playerItems.length - 1, this.selectedPlayerItem + 1);
        return true;
      }
      if (code === 'KeyB') {
        const item = world.merchant.getInventory()[this.selectedMerchantItem];
        if (item) {
          const basePrice = world.merchant.getBuyPrice(item);
          const modifier = this._getCHAPriceModifier(world);
          const finalPrice = Math.max(1, Math.round(basePrice * modifier));
          if (world.gold >= finalPrice) {
            world.gold -= finalPrice;
            world.inventory.addItem(item);
            const idx = world.merchant.getInventory().indexOf(item);
            if (idx !== -1) world.merchant.getInventory().splice(idx, 1);
          }
        }
        return true;
      }
      if (code === 'KeyV') {
        const item = world.inventory.getAllItems()[this.selectedPlayerItem];
        if (item) {
          world.merchant.sellItem(world, item);
          // Clamp selection after selling
          const remaining = world.inventory.getAllItems().length;
          if (this.selectedPlayerItem >= remaining) {
            this.selectedPlayerItem = Math.max(0, remaining - 1);
          }
        }
        return true;
      }
      if (code === 'Escape') {
        this.mode = 'hub';
        return true;
      }
    }

    if (this.mode === 'dungeon_select') {
      // Legacy mode — redirect to notice_board
      this.mode = 'notice_board';
      this._refreshNoticeBoard(world);
      return true;
    }

    if (this.mode === 'notice_board') {
      if (code === 'ArrowUp' || code === 'KeyW') {
        this.selectedQuest = Math.max(0, this.selectedQuest - 1);
        return true;
      }
      if (code === 'ArrowDown' || code === 'KeyS') {
        this.selectedQuest = Math.min(this.noticeBoardQuests.length - 1, this.selectedQuest + 1);
        return true;
      }
      if (code === 'Enter') {
        const quest = this.noticeBoardQuests[this.selectedQuest];
        if (quest && world.party.getMembers().length > 0) {
          world.dungeonType = quest.id;
          world.dungeonName = quest.name || quest.id;
          const dungeonName = world.dungeonName;
          // Push transition screen, then exploring when it completes
          world.stateStack.pushDungeonTransition(dungeonName, () => {
            world.stateStack.pop(); // Remove transition
            world.init();
            world.enterDungeon();
            world.spawnMonsters(quest.id);
            // Place interactables
            if (world.tileMap && world.tileMap.placeInteractables) {
              world.tileMap.placeInteractables(world.rng);
            }
            world.stateStack.pushExploring(
              this.renderers.fp,
              this.renderers.minimap,
              this.renderers.ui
            );
            world.needsRender = true;
          });
        }
        return true;
      }
      if (code === 'Escape') {
        this.mode = 'hub';
        return true;
      }
    }

    if (this.mode === 'npcs') {
      // If dialogue is active, delegate to it
      if (this.npcDialogue.active) {
        if (this.npcDialogue.handleInput(code)) return true;
        // Dialogue just closed — return to NPC select
        return true;
      }

      if (code === 'ArrowLeft' || code === 'KeyA') {
        this.selectedNPC = Math.max(0, this.selectedNPC - 1);
        return true;
      }
      if (code === 'ArrowRight' || code === 'KeyD') {
        this.selectedNPC = Math.min(this.availableNPCs.length - 1, this.selectedNPC + 1);
        return true;
      }
      if (code === 'Enter' || code === 'Space') {
        const npc = this.availableNPCs[this.selectedNPC];
        if (npc) {
          const fragments = (world.collectedFragments ? world.collectedFragments.size : 0);
          this.npcDialogue.open(npc.id, fragments);
        }
        return true;
      }
      if (code === 'Escape') {
        this.mode = 'hub';
        return true;
      }
    }

    // Touch: New Game from hub
    if (code === '_hub_newgame' && this.mode === 'hub') {
      this.mode = 'new_game_confirm';
      this.confirmSelected = 1; // Default to CANCEL
      return true;
    }

    // Touch: Hub bar button for shop
    if (code === '_hub_shop' && this.mode === 'hub') {
      this.mode = 'shop';
      this._resetShopSelection();
      this.focusArea = 'cards';
      return true;
    }

    // Touch: Hub hotspot selection
    if (code && code.startsWith('_hubSpot_')) {
      const idx = parseInt(code.split('_')[2], 10);
      if (!isNaN(idx) && this.mode === 'hub') {
        this.selectedHotspot = idx;
        const hotspots = this._getHubHotspots(world);
        const spot = hotspots[idx];
        if (spot) {
          this._activateHubHotspot(spot, world);
        }
        return true;
      }
    }

    // Touch: NPC card selection
    if (code && code.startsWith('_selectNPC_')) {
      const idx = parseInt(code.split('_')[2], 10);
      if (!isNaN(idx) && this.mode === 'npcs') {
        this.selectedNPC = idx;
        const npc = this.availableNPCs[idx];
        if (npc) {
          const fragments = (world.collectedFragments ? world.collectedFragments.size : 0);
          this.npcDialogue.open(npc.id, fragments);
        }
        return true;
      }
    }

    // New Game confirmation mode
    if (this.mode === 'new_game_confirm') {
      if (code === 'ArrowLeft' || code === 'KeyA') {
        this.confirmSelected = 0; // ERASE
        return true;
      }
      if (code === 'ArrowRight' || code === 'KeyD') {
        this.confirmSelected = 1; // CANCEL
        return true;
      }
      if (code === 'Enter' || code === 'Space') {
        if (this.confirmSelected === 0) {
          // Confirmed — clear save and reload
          GameSave.clearSave();
          window.location.reload();
        } else {
          // Cancel
          this.mode = 'hub';
          this.focusArea = 'cards';
        }
        return true;
      }
      if (code === 'Escape' || code === 'Backspace') {
        this.mode = 'hub';
        this.focusArea = 'cards';
        return true;
      }
      return true; // Consume all other input
    }

    // KeyQ opens notice board (quests) from any mode
    if (code === 'KeyQ') {
      this.mode = 'notice_board';
      this._refreshNoticeBoard(world);
      this.selectedQuest = 0;
      return true;
    }

    // KeyN opens NPCs from any mode
    if (code === 'KeyN') {
      this.mode = 'npcs';
      this.availableNPCs = this.npcDialogue.getAvailableNPCs((world.collectedFragments ? world.collectedFragments.size : 0));
      this.selectedNPC = 0;
      return true;
    }

    return false;
  }

  // === Hub hotspot data ===

  _getHubHotspots(world) {
    const fragments = world.collectedFragments ? world.collectedFragments.size : 0;
    const hotspots = [
      { id: 'aldric', label: 'Aldric', sublabel: 'Barkeep', x: 80, y: 165, w: 140, h: 115, action: 'roster' },
      { id: 'bessa', label: 'Bessa', sublabel: 'Supplies', x: 520, y: 170, w: 120, h: 100, action: 'shop' },
      { id: 'mira', label: 'Mira', sublabel: 'Cartographer', x: 55, y: 345, w: 120, h: 90, action: 'talk_mira' },
      { id: 'notice_board', label: 'Notice Board', sublabel: 'Quests', x: 325, y: 80, w: 130, h: 85, action: 'notice_board' },
      { id: 'orin', label: 'Orin', sublabel: 'Sellsword', x: 375, y: 350, w: 100, h: 85, action: 'talk_orin' },
    ];
    // Elden only appears at fragments >= 2
    if (fragments >= 2) {
      hotspots.push({ id: 'elden', label: 'Elden', sublabel: 'Table Seven', x: 580, y: 370, w: 100, h: 75, action: 'talk_elden' });
    } else {
      hotspots.push({ id: 'elden_empty', label: 'Table Seven', sublabel: 'Empty', x: 580, y: 370, w: 100, h: 75, action: null });
    }
    return hotspots;
  }

  _hubBarButtons(world) {
    const partyCount = world.party.getMembers().length;
    const buttons = [
      { label: 'PARTY', code: 'KeyP', width: 80 },
      { label: 'RECRUIT', code: 'KeyR', width: 90 },
      { label: 'SHOP', code: '_hub_shop', width: 80 },
      { label: 'QUESTS', code: 'KeyQ', width: 80 },
      { label: 'TALK', code: 'KeyN', width: 80 },
      { label: 'NEW GAME', code: '_hub_newgame', width: 110 },
    ];
    if (partyCount > 0) {
      buttons[0].label = `PARTY (${partyCount})`;
    }
    return buttons;
  }

  _executeHubBarAction(code, world) {
    if (code === 'KeyP') {
      this.mode = 'party_select';
      this.selectedPartySlot = 0;
      this.focusArea = 'cards';
      return true;
    }
    if (code === 'KeyR') {
      this.mode = 'roster';
      this.focusArea = 'cards';
      return true;
    }
    if (code === '_hub_shop') {
      this.mode = 'shop';
      this._resetShopSelection();
      this.focusArea = 'cards';
      return true;
    }
    if (code === 'KeyQ') {
      this.mode = 'notice_board';
      this._refreshNoticeBoard(world);
      this.selectedQuest = 0;
      return true;
    }
    if (code === 'KeyN') {
      this.mode = 'npcs';
      this.availableNPCs = this.npcDialogue.getAvailableNPCs(
        (world.collectedFragments ? world.collectedFragments.size : 0)
      );
      this.selectedNPC = 0;
      return true;
    }
    if (code === '_hub_newgame') {
      this.mode = 'new_game_confirm';
      this.confirmSelected = 1; // Default to CANCEL
      return true;
    }
    return false;
  }

  _activateHubHotspot(spot, world) {
    if (!spot.action) return; // Empty seat, no action
    if (spot.action === 'roster') {
      this.mode = 'roster';
      this.focusArea = 'cards';
    } else if (spot.action === 'shop') {
      this.mode = 'shop';
      this._resetShopSelection();
      this.focusArea = 'cards';
    } else if (spot.action === 'notice_board') {
      this.mode = 'notice_board';
      this._refreshNoticeBoard(world);
      this.selectedQuest = 0;
    } else if (spot.action === 'talk_mira') {
      this.mode = 'npcs';
      this.availableNPCs = this.npcDialogue.getAvailableNPCs(
        (world.collectedFragments ? world.collectedFragments.size : 0)
      );
      // Select Mira
      const miraIdx = this.availableNPCs.findIndex(n => n.id === 'mira');
      this.selectedNPC = miraIdx >= 0 ? miraIdx : 0;
      if (miraIdx >= 0) {
        const fragments = world.collectedFragments ? world.collectedFragments.size : 0;
        this.npcDialogue.open('mira', fragments);
      }
    } else if (spot.action === 'talk_elden') {
      this.mode = 'npcs';
      this.availableNPCs = this.npcDialogue.getAvailableNPCs(
        (world.collectedFragments ? world.collectedFragments.size : 0)
      );
      const eldenIdx = this.availableNPCs.findIndex(n => n.id === 'elden');
      this.selectedNPC = eldenIdx >= 0 ? eldenIdx : 0;
      if (eldenIdx >= 0) {
        const fragments = world.collectedFragments ? world.collectedFragments.size : 0;
        this.npcDialogue.open('elden', fragments);
      }
    } else if (spot.action === 'talk_orin') {
      this.mode = 'npcs';
      this.availableNPCs = this.npcDialogue.getAvailableNPCs(
        (world.collectedFragments ? world.collectedFragments.size : 0)
      );
      const orinIdx = this.availableNPCs.findIndex(n => n.id === 'orin');
      this.selectedNPC = orinIdx >= 0 ? orinIdx : 0;
      if (orinIdx >= 0) {
        const fragments = world.collectedFragments ? world.collectedFragments.size : 0;
        this.npcDialogue.open('orin', fragments);
      }
    }
  }

  _rosterBarButtons(partyCount) {
    const buttons = [
      { label: '◄', code: 'ArrowLeft', width: 60 },
      { label: 'RECRUIT', code: 'Space', width: 120 },
      { label: '►', code: 'ArrowRight', width: 60 },
    ];
    if (partyCount > 0) {
      buttons.push({ label: `PARTY (${partyCount})`, code: 'Enter', width: 120 });
    }
    buttons.push({ label: 'QUESTS', code: 'KeyQ', width: 90 });
    buttons.push({ label: 'SHOP', code: 'KeyP', width: 80 });
    buttons.push({ label: 'TALK', code: 'KeyN', width: 80 });
    return buttons;
  }

  _partyBarButtons(members) {
    const buttons = [
      { label: 'BACK', code: 'Escape', width: 80 },
      { label: '◄', code: 'ArrowLeft', width: 50 },
      { label: '►', code: 'ArrowRight', width: 50 },
    ];
    if (members && members.length > 0) {
      buttons.push({ label: 'ENTER DUNGEON', code: 'Enter', width: 160 });
    }
    buttons.push({ label: 'SHOP', code: 'KeyP', width: 80 });
    return buttons;
  }

  /**
   * Command Pattern (Bob Nystrom): Execute a bar button action directly
   * without re-entering handleInput. Prevents recursive infinite loops.
   */
  _executeBarAction(code, world) {
    // Navigation: adjust selection index directly
    if (code === 'ArrowLeft' || code === 'KeyA') {
      if (this.mode === 'roster') {
        this.selectedCharacter = Math.max(0, this.selectedCharacter - 1);
      } else if (this.mode === 'party_select') {
        this.selectedPartySlot = Math.max(0, this.selectedPartySlot - 1);
      }
      return true;
    }
    if (code === 'ArrowRight' || code === 'KeyD') {
      if (this.mode === 'roster') {
        this.selectedCharacter = Math.min(world.roster.getAll().length, this.selectedCharacter + 1);
      } else if (this.mode === 'party_select') {
        const members = world.party.getMembers();
        if (this.selectedPartySlot < members.length - 1) this.selectedPartySlot++;
      }
      return true;
    }

    // Recruit (Space) — roster mode
    if (code === 'Space') {
      if (this.mode === 'roster') {
        const roster = world.roster.getAll();
        if (this.selectedCharacter === roster.length) {
          world.stateStack.pushCharacterCreate();
          return true;
        }
        const char = roster[this.selectedCharacter];
        const inParty = world.party.getMembers().includes(char) ||
          world.party.getMembers().some(m => m.name === char.name && m.class === char.class);
        if (char && inParty) {
          this._recruitFailFlash = Date.now();
          return true;
        }
        if (char && world.party.addMember(char)) {
          if (world.party.getMembers().length >= 4) {
            this.mode = 'party_select';
            this.selectedPartySlot = 0;
          }
        }
      }
      return true;
    }

    // Enter — context-dependent
    if (code === 'Enter') {
      if (this.mode === 'roster') {
        if (world.party.getMembers().length > 0) {
          this.mode = 'party_select';
          this.selectedPartySlot = 0;
          this.focusArea = 'cards';
        }
      } else if (this.mode === 'party_select') {
        if (world.party.getMembers().length > 0) {
          this.mode = 'notice_board';
          this._refreshNoticeBoard(world);
          this.selectedQuest = 0;
          this.focusArea = 'cards';
        }
      }
      return true;
    }

    // Quests / Notice Board
    if (code === 'KeyQ') {
      this.mode = 'notice_board';
      this._refreshNoticeBoard(world);
      this.selectedQuest = 0;
      return true;
    }

    // Shop
    if (code === 'KeyP') {
      this.mode = 'shop';
      this._resetShopSelection();
      this.focusArea = 'cards';
      return true;
    }

    // Talk / NPCs
    if (code === 'KeyN') {
      this.mode = 'npcs';
      this.availableNPCs = this.npcDialogue.getAvailableNPCs(
        (world.collectedFragments ? world.collectedFragments.size : 0)
      );
      this.selectedNPC = 0;
      return true;
    }

    // Back
    if (code === 'Escape') {
      if (this.mode === 'party_select') {
        this.mode = 'hub';
        this.focusArea = 'cards';
      }
      return true;
    }

    return false;
  }

  /**
   * Refresh the notice board quests based on daily seed + fragment gating.
   * Uses world.rng (daily PRNG) to pick 2-3 available dungeons.
   */
  _refreshNoticeBoard(world) {
    if (!noticeBoardData) {
      this.noticeBoardQuests = [];
      return;
    }
    const fragments = world.collectedFragments ? world.collectedFragments.size : 0;
    // Filter dungeons by fragment requirement
    const available = noticeBoardData.dungeons.filter(d => fragments >= d.requiredFragments);
    if (available.length === 0) {
      this.noticeBoardQuests = available;
      return;
    }
    // Use a daily seed to shuffle and pick 2-3
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const seedHash = createPRNG(0).hashString(dateStr);
    const dailyRng = createPRNG(seedHash);
    const shuffled = dailyRng.shuffle(available);
    const count = Math.min(shuffled.length, fragments >= 5 ? 3 : 2);
    this.noticeBoardQuests = shuffled.slice(0, count);
  }

  /**
   * CHA-based price modifier for Bessa the Merchant.
   * Uses the party's highest CHA score.
   */
  _getCHAPriceModifier(world) {
    const members = world.party.getMembers();
    let maxCHA = 10; // Default if no party
    for (const m of members) {
      const cha = m.stats ? m.stats.cha : 10;
      if (cha > maxCHA) maxCHA = cha;
    }
    if (maxCHA >= 19) return 0.70;
    if (maxCHA >= 16) return 0.80;
    if (maxCHA >= 13) return 0.90;
    if (maxCHA >= 10) return 1.00;
    return 1.20; // CHA 8-9
  }

  _getCHALabel(modifier) {
    if (modifier <= 0.70) return 'Bessa beams — "Best friend pricing! 30% off!"';
    if (modifier <= 0.80) return 'Bessa nods — "Good discount. 20% off."';
    if (modifier <= 0.90) return 'Bessa eyes your party... "10% discount."';
    if (modifier >= 1.20) return 'Bessa frowns — "Surcharge. 20% extra."';
    return '';
  }

  _resetShopSelection() {
    this.selectedMerchantItem = 0;
    this.selectedPlayerItem = 0;
  }

  _renderNewGameConfirm(ctx, world) {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, W, H);

    // Confirmation box
    const boxW = 400;
    const boxH = 180;
    const boxX = (W - boxW) / 2;
    const boxY = (H - boxH) / 2;

    ctx.fillStyle = '#1a1208';
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeStyle = '#C0392B';
    ctx.lineWidth = 3;
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#C0392B';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('NEW GAME', W / 2, boxY + 35);

    ctx.fillStyle = '#CCC';
    ctx.font = '14px monospace';
    ctx.fillText('This will erase all progress.', W / 2, boxY + 65);
    ctx.fillText('Are you sure?', W / 2, boxY + 85);

    // Buttons
    const btnW = 140;
    const btnH = 44;
    const btnY = boxY + 110;
    const sel = this.confirmSelected || 1;

    // Confirm button (ERASE)
    const eraseSelected = sel === 0;
    ctx.fillStyle = eraseSelected ? '#8b3a3a' : '#6b2a2a';
    ctx.fillRect(W / 2 - btnW - 15, btnY, btnW, btnH);
    ctx.strokeStyle = eraseSelected ? '#FFD700' : '#C0392B';
    ctx.lineWidth = eraseSelected ? 3 : 2;
    ctx.strokeRect(W / 2 - btnW - 15, btnY, btnW, btnH);
    ctx.fillStyle = eraseSelected ? '#FFD700' : '#FFF';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('ERASE & RESTART', W / 2 - btnW / 2 - 15, btnY + 28);

    // Cancel button
    const cancelSelected = sel === 1;
    ctx.fillStyle = cancelSelected ? '#3a3a3a' : '#2a2a2a';
    ctx.fillRect(W / 2 + 15, btnY, btnW, btnH);
    ctx.strokeStyle = cancelSelected ? '#FFD700' : '#555';
    ctx.lineWidth = cancelSelected ? 3 : 2;
    ctx.strokeRect(W / 2 + 15, btnY, btnW, btnH);
    ctx.fillStyle = cancelSelected ? '#FFD700' : '#CCC';
    ctx.fillText('CANCEL', W / 2 + btnW / 2 + 15, btnY + 28);

    // Touch zones
    if (world.input && world.input.touch) {
      world.input.touch.registerHitZone(W / 2 - btnW - 15, btnY, btnW, btnH, 'Enter');
      world.input.touch.registerHitZone(W / 2 + 15, btnY, btnW, btnH, 'Escape');
    }

    ctx.fillStyle = '#888';
    ctx.font = '11px monospace';
    ctx.fillText('ENTER: Confirm   ESC: Cancel', W / 2, boxY + boxH - 10);

    ctx.textAlign = 'left';
  }

  render(layers, world) {
    const ctx = layers.ui || layers;
    ctx.save(); // H-5 fix: isolate render context

    // Clear touch hit zones each frame
    if (world.input && world.input.touch) {
      world.input.touch.clearHitZones();
    }

    // Cache fragment info for background rendering (no game state mutation)
    this._fragmentCount = world.collectedFragments ? world.collectedFragments.size : 0;
    this._collectedSet = world.collectedFragments || new Set();

    this._drawWoodBackground(ctx, world);
    this._drawTavernTitle(ctx, world);

    if (this.mode === 'hub') {
      this._renderHub(ctx, world);
    } else if (this.mode === 'roster') {
      this._renderRoster(ctx, world);
    } else if (this.mode === 'party_select') {
      this._renderPartySelect(ctx, world);
    } else if (this.mode === 'shop') {
      this._renderShop(ctx, world);
    } else if (this.mode === 'dungeon_select' || this.mode === 'notice_board') {
      this._renderNoticeBoard(ctx, world);
    } else if (this.mode === 'strider') {
      this._renderStrider(ctx, world);
    } else if (this.mode === 'npcs') {
      this._renderNPCs(ctx, world);
    } else if (this.mode === 'new_game_confirm') {
      this._renderNewGameConfirm(ctx, world);
    }
    ctx.restore(); // H-5 fix: restore context state
  }

  // --- Background & Decorations ---

  _drawWoodBackground(ctx, world) {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;

    // Seeded pseudo-random for consistent weathering per frame
    const _seed = (x, y) => Math.sin(x * 127.1 + y * 311.7) * 43758.5453 % 1;
    const seed = (x, y) => Math.abs(_seed(x, y));

    // === 3D PERSPECTIVE CONSTANTS ===
    // Vanishing point at center-top for depth illusion
    const vpX = w / 2;
    const vpY = 60;
    // Back wall boundaries (where walls meet)
    const backWallTop = 75;
    const backWallBottom = 320;
    const backWallLeft = 140;
    const backWallRight = w - 140;
    // Floor starts at back wall bottom, extends to canvas bottom
    const floorTop = backWallBottom;
    const floorBottom = h - 50; // leave room for bar counter

    // === DARK BASE FILL ===
    ctx.fillStyle = '#1a120c';
    ctx.fillRect(0, 0, w, h);

    // === CEILING (dark, receding into depth) ===
    ctx.save();
    const ceilGrad = ctx.createLinearGradient(0, 0, 0, backWallTop + 20);
    ceilGrad.addColorStop(0, '#1a100a');
    ceilGrad.addColorStop(1, '#2a1c12');
    ctx.fillStyle = ceilGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(w, 0);
    ctx.lineTo(backWallRight, backWallTop);
    ctx.lineTo(backWallLeft, backWallTop);
    ctx.closePath();
    ctx.fill();

    // Ceiling planks receding toward vanishing point
    for (let i = 0; i < 8; i++) {
      const t = i / 8;
      const leftX = t * backWallLeft;
      const rightX = w - t * (w - backWallRight);
      const topY = t * backWallTop;
      ctx.strokeStyle = `rgba(60, 40, 20, ${0.15 + t * 0.1})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(leftX, topY);
      ctx.lineTo(rightX, topY);
      ctx.stroke();
    }
    ctx.restore();

    // === LEFT WALL (angling inward) ===
    ctx.save();
    const leftWallGrad = ctx.createLinearGradient(0, 0, backWallLeft, 0);
    leftWallGrad.addColorStop(0, '#3a2818');
    leftWallGrad.addColorStop(0.5, '#4a3520');
    leftWallGrad.addColorStop(1, '#3d2a18');
    ctx.fillStyle = leftWallGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(backWallLeft, backWallTop);
    ctx.lineTo(backWallLeft, backWallBottom);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    // Stone/timber texture on left wall
    const leftBlockH = 28;
    const leftBlockW = 45;
    for (let row = 0; row < 18; row++) {
      for (let col = 0; col < 4; col++) {
        const baseY = row * leftBlockH;
        const baseX = col * leftBlockW + (row % 2 === 0 ? 0 : leftBlockW * 0.5);
        // Calculate perspective-adjusted position on left wall
        const wallT = baseY / h;
        const xOff = wallT * 0 + (1 - wallT) * 0;
        const actualX = baseX + xOff;
        if (actualX > backWallLeft) continue;
        const sv = seed(row * 4 + col, 50);
        const r = 58 + sv * 28;
        const g = 42 + sv * 18;
        const b = 28 + sv * 12;
        ctx.fillStyle = `rgb(${r | 0}, ${g | 0}, ${b | 0})`;
        ctx.fillRect(actualX + 1, baseY + 1, Math.min(leftBlockW - 2, backWallLeft - actualX), leftBlockH - 2);
        // Mortar line
        ctx.fillStyle = 'rgba(15, 10, 6, 0.5)';
        ctx.fillRect(actualX, baseY, Math.min(leftBlockW, backWallLeft - actualX), 2);
        ctx.fillRect(actualX, baseY, 2, leftBlockH);
      }
    }

    // Left wall timber beams (vertical, perspective)
    for (let i = 0; i < 3; i++) {
      const bx = 20 + i * 45;
      if (bx > backWallLeft - 10) break;
      ctx.fillStyle = '#2a1a0e';
      ctx.fillRect(bx, 0, 10, h);
      ctx.fillStyle = '#3d2510';
      ctx.fillRect(bx, 0, 3, h);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(bx + 8, 0, 2, h);
    }
    ctx.restore();

    // === RIGHT WALL (angling inward) ===
    ctx.save();
    const rightWallGrad = ctx.createLinearGradient(backWallRight, 0, w, 0);
    rightWallGrad.addColorStop(0, '#3d2a18');
    rightWallGrad.addColorStop(0.5, '#4a3520');
    rightWallGrad.addColorStop(1, '#3a2818');
    ctx.fillStyle = rightWallGrad;
    ctx.beginPath();
    ctx.moveTo(w, 0);
    ctx.lineTo(backWallRight, backWallTop);
    ctx.lineTo(backWallRight, backWallBottom);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();

    // Stone texture on right wall
    for (let row = 0; row < 18; row++) {
      for (let col = 0; col < 4; col++) {
        const baseY = row * 28;
        const baseX = backWallRight + col * 45 + (row % 2 === 0 ? 0 : 22);
        if (baseX >= w) continue;
        const sv = seed(row * 4 + col + 100, 60);
        const r = 55 + sv * 28;
        const g = 40 + sv * 18;
        const b = 26 + sv * 12;
        ctx.fillStyle = `rgb(${r | 0}, ${g | 0}, ${b | 0})`;
        ctx.fillRect(baseX + 1, baseY + 1, Math.min(43, w - baseX - 1), 26);
        ctx.fillStyle = 'rgba(15, 10, 6, 0.5)';
        ctx.fillRect(baseX, baseY, Math.min(45, w - baseX), 2);
        ctx.fillRect(baseX, baseY, 2, 28);
      }
    }

    // Right wall timber beams
    for (let i = 0; i < 3; i++) {
      const bx = w - 30 - i * 45;
      if (bx < backWallRight + 10) break;
      ctx.fillStyle = '#2a1a0e';
      ctx.fillRect(bx, 0, 10, h);
      ctx.fillStyle = '#3d2510';
      ctx.fillRect(bx, 0, 3, h);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(bx + 8, 0, 2, h);
    }
    ctx.restore();

    // === BACK WALL (center, stone masonry with mortar) ===
    ctx.save();
    const backGrad = ctx.createLinearGradient(backWallLeft, 0, backWallRight, 0);
    backGrad.addColorStop(0, '#3d3028');
    backGrad.addColorStop(0.3, '#5a4a3a');
    backGrad.addColorStop(0.5, '#5d4d3d');
    backGrad.addColorStop(0.7, '#5a4a3a');
    backGrad.addColorStop(1, '#3d3028');
    ctx.fillStyle = backGrad;
    ctx.fillRect(backWallLeft, backWallTop, backWallRight - backWallLeft, backWallBottom - backWallTop);

    // Stone blocks on back wall
    const bwBlockH = 22;
    const bwBlockW = 48;
    for (let row = 0; row < Math.ceil((backWallBottom - backWallTop) / bwBlockH); row++) {
      const sy = backWallTop + row * bwBlockH;
      const rowOff = row % 2 === 0 ? 0 : bwBlockW * 0.5;
      for (let sx = backWallLeft + rowOff; sx < backWallRight; sx += bwBlockW) {
        const bw = Math.min(bwBlockW - 3, backWallRight - sx);
        const bh = Math.min(bwBlockH - 3, backWallBottom - sy);
        if (bw <= 0 || bh <= 0) continue;
        const sv = seed(sx, sy);
        const r = 70 + sv * 25;
        const g = 58 + sv * 18;
        const b = 45 + sv * 14;
        ctx.fillStyle = `rgb(${r | 0}, ${g | 0}, ${b | 0})`;
        ctx.fillRect(sx + 1, sy + 1, bw, bh);
      }
      // Horizontal mortar
      ctx.fillStyle = 'rgba(20, 14, 8, 0.6)';
      ctx.fillRect(backWallLeft, sy, backWallRight - backWallLeft, 3);
    }
    // Vertical mortar
    for (let row = 0; row < Math.ceil((backWallBottom - backWallTop) / bwBlockH); row++) {
      const sy = backWallTop + row * bwBlockH;
      const rowOff = row % 2 === 0 ? 0 : bwBlockW * 0.5;
      for (let sx = backWallLeft + rowOff; sx < backWallRight; sx += bwBlockW) {
        ctx.fillStyle = 'rgba(20, 14, 8, 0.5)';
        ctx.fillRect(sx, sy, 3, bwBlockH);
      }
    }

    // Back wall corner shadows (depth where walls meet)
    const leftCorner = ctx.createLinearGradient(backWallLeft, 0, backWallLeft + 30, 0);
    leftCorner.addColorStop(0, 'rgba(0, 0, 0, 0.5)');
    leftCorner.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = leftCorner;
    ctx.fillRect(backWallLeft, backWallTop, 30, backWallBottom - backWallTop);

    const rightCorner = ctx.createLinearGradient(backWallRight - 30, 0, backWallRight, 0);
    rightCorner.addColorStop(0, 'rgba(0, 0, 0, 0)');
    rightCorner.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
    ctx.fillStyle = rightCorner;
    ctx.fillRect(backWallRight - 30, backWallTop, 30, backWallBottom - backWallTop);
    ctx.restore();

    // === 3D PERSPECTIVE FLOOR (wooden planks converging to vanishing point) ===
    ctx.save();
    // Floor base with warm gradient
    const flGrad = ctx.createLinearGradient(0, floorTop, 0, floorBottom);
    flGrad.addColorStop(0, '#3a2818');
    flGrad.addColorStop(0.5, '#4a3520');
    flGrad.addColorStop(1, '#2a1c10');
    ctx.fillStyle = flGrad;
    ctx.beginPath();
    ctx.moveTo(backWallLeft, floorTop);
    ctx.lineTo(backWallRight, floorTop);
    ctx.lineTo(w, floorBottom);
    ctx.lineTo(0, floorBottom);
    ctx.closePath();
    ctx.fill();

    // Floor planks with perspective (lines converging toward vpX, vpY)
    const plankCount = 14;
    for (let i = 0; i <= plankCount; i++) {
      const t = i / plankCount;
      // At back wall
      const backX = backWallLeft + t * (backWallRight - backWallLeft);
      // At front
      const frontX = t * w;
      ctx.strokeStyle = `rgba(20, 12, 6, ${0.4 + t * 0.1})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(backX, floorTop);
      ctx.lineTo(frontX, floorBottom);
      ctx.stroke();
    }

    // Horizontal plank joints (cross-lines), more spaced at back, closer at front
    for (let i = 1; i < 8; i++) {
      const t = i / 8;
      // Perspective: closer lines are more spaced
      const pt = t * t; // quadratic for perspective compression
      const yy = floorTop + pt * (floorBottom - floorTop);
      // Width expands from back to front
      const leftEdge = backWallLeft + (0 - backWallLeft) * pt;
      const rightEdge = backWallRight + (w - backWallRight) * pt;
      ctx.strokeStyle = 'rgba(20, 12, 6, 0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(leftEdge, yy);
      ctx.lineTo(rightEdge, yy);
      ctx.stroke();
    }

    // Wood grain on floor planks (subtle horizontal lines)
    for (let i = 0; i < 12; i++) {
      const t = (i + 0.5) / 12;
      const pt = t * t;
      const yy = floorTop + pt * (floorBottom - floorTop);
      const leftEdge = backWallLeft + (0 - backWallLeft) * pt;
      const rightEdge = backWallRight + (w - backWallRight) * pt;
      ctx.strokeStyle = `rgba(80, 55, 30, ${0.08 + seed(i, 200) * 0.06})`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(leftEdge, yy);
      for (let sx = leftEdge; sx < rightEdge; sx += 40) {
        const wobble = Math.sin(sx * 0.05 + i * 2) * 1.5;
        ctx.lineTo(sx + 20, yy + wobble);
      }
      ctx.stroke();
    }

    // Floor shadow at back wall base (depth transition)
    const floorShadow = ctx.createLinearGradient(0, floorTop, 0, floorTop + 30);
    floorShadow.addColorStop(0, 'rgba(0, 0, 0, 0.4)');
    floorShadow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = floorShadow;
    ctx.fillRect(backWallLeft - 20, floorTop, backWallRight - backWallLeft + 40, 30);
    ctx.restore();

    // === FIREPLACE (center of back wall, 3D stone surround) ===
    const fpX = w / 2 - 80;
    const fpY = backWallTop + 60;
    const fpW = 160;
    const fpH = backWallBottom - fpY;

    // Stone hearth surround — 3D frame with depth
    // Outer stone frame
    ctx.fillStyle = '#3a2e26';
    ctx.fillRect(fpX - 18, fpY - 12, fpW + 36, fpH + 16);
    // Inner depth shadow (recessed hearth)
    ctx.fillStyle = '#2a2220';
    ctx.fillRect(fpX - 12, fpY - 6, fpW + 24, fpH + 10);

    // Stone blocks around fireplace
    const fpStoneH = 18;
    const fpStoneW = 28;
    // Left column of stones
    for (let i = 0; i < Math.ceil(fpH / fpStoneH) + 1; i++) {
      const sy = fpY - 12 + i * fpStoneH;
      const sv = seed(i, 300);
      ctx.fillStyle = `rgb(${55 + sv * 20 | 0}, ${45 + sv * 15 | 0}, ${38 + sv * 10 | 0})`;
      ctx.fillRect(fpX - 17, sy + 1, fpStoneW - 2, fpStoneH - 2);
      // Right column
      ctx.fillStyle = `rgb(${52 + sv * 22 | 0}, ${43 + sv * 16 | 0}, ${36 + sv * 11 | 0})`;
      ctx.fillRect(fpX + fpW - 10, sy + 1, fpStoneW - 2, fpStoneH - 2);
    }
    // Top lintel stones
    for (let i = 0; i < 5; i++) {
      const sx = fpX - 12 + i * (fpW + 24) / 5;
      const sv = seed(i, 310);
      ctx.fillStyle = `rgb(${58 + sv * 18 | 0}, ${48 + sv * 14 | 0}, ${40 + sv * 10 | 0})`;
      ctx.fillRect(sx + 1, fpY - 11, (fpW + 24) / 5 - 2, 14);
    }

    // Hearth arch (rounded top, deep black interior)
    ctx.beginPath();
    ctx.moveTo(fpX + 4, fpY + fpH);
    ctx.lineTo(fpX + 4, fpY + 30);
    ctx.quadraticCurveTo(fpX + fpW / 2, fpY - 10, fpX + fpW - 4, fpY + 30);
    ctx.lineTo(fpX + fpW - 4, fpY + fpH);
    ctx.closePath();
    ctx.fillStyle = '#060402';
    ctx.fill();

    // Inner arch glow edge
    ctx.strokeStyle = '#4a3d30';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(fpX + 6, fpY + fpH);
    ctx.lineTo(fpX + 6, fpY + 32);
    ctx.quadraticCurveTo(fpX + fpW / 2, fpY - 6, fpX + fpW - 6, fpY + 32);
    ctx.lineTo(fpX + fpW - 6, fpY + fpH);
    ctx.stroke();

    // Mantle shelf with 3D depth
    ctx.fillStyle = '#3d2814';
    ctx.fillRect(fpX - 24, fpY - 16, fpW + 48, 10);
    // Mantle top highlight
    ctx.fillStyle = '#6a4a28';
    ctx.fillRect(fpX - 24, fpY - 18, fpW + 48, 3);
    // Mantle bottom shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(fpX - 24, fpY - 6, fpW + 48, 3);
    // Mantle depth (front face)
    ctx.fillStyle = '#4a3018';
    ctx.fillRect(fpX - 24, fpY - 16, fpW + 48, 2);

    // Candles on mantle
    for (let i = 0; i < 3; i++) {
      const cx = fpX - 10 + i * (fpW / 2 + 15);
      ctx.fillStyle = '#c0b080';
      ctx.fillRect(cx, fpY - 28, 5, 12);
      // Flame
      const flick = Math.sin(this.flickerPhase * 3 + i * 2.5) * 1.5;
      ctx.fillStyle = `rgba(255, 200, 50, ${0.7 + Math.sin(this.flickerPhase * 2 + i) * 0.2})`;
      ctx.beginPath();
      ctx.ellipse(cx + 2.5, fpY - 32 + flick, 2.5, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      // Candle glow
      const candleGlow = ctx.createRadialGradient(cx + 2.5, fpY - 30, 2, cx + 2.5, fpY - 30, 20);
      candleGlow.addColorStop(0, 'rgba(255, 180, 50, 0.15)');
      candleGlow.addColorStop(1, 'rgba(255, 150, 30, 0)');
      ctx.fillStyle = candleGlow;
      ctx.fillRect(cx - 18, fpY - 50, 42, 40);
    }

    // Logs in fireplace
    ctx.fillStyle = '#2a1508';
    ctx.fillRect(fpX + 20, fpY + fpH - 28, 50, 14);
    ctx.fillRect(fpX + 60, fpY + fpH - 33, 55, 12);
    ctx.fillStyle = '#3d1e0a';
    ctx.fillRect(fpX + 35, fpY + fpH - 38, 45, 10);
    // Log bark texture
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(fpX + 22 + i * 12, fpY + fpH - 27);
      ctx.lineTo(fpX + 22 + i * 12, fpY + fpH - 15);
      ctx.stroke();
    }

    // Embers at base
    for (let i = 0; i < 16; i++) {
      const ex = fpX + 25 + seed(i, 100) * (fpW - 50);
      const ey = fpY + fpH - 8 - seed(i, 101) * 18;
      const er = 1.5 + seed(i, 102) * 3;
      const pulse = Math.sin(this.flickerPhase * 2 + i * 1.7) * 0.3 + 0.7;
      ctx.fillStyle = `rgba(255, ${80 + seed(i, 103) * 100 | 0}, 0, ${pulse * 0.7})`;
      ctx.beginPath();
      ctx.arc(ex, ey, er, 0, Math.PI * 2);
      ctx.fill();
    }

    // Fire flames (animated) — larger, more vibrant
    const fireFlicker = Math.sin(this.flickerPhase * 2.5) * 8;
    // Outer flame
    const fireGrad = ctx.createRadialGradient(
      w / 2, fpY + fpH - 50 + fireFlicker * 0.3, 8,
      w / 2, fpY + fpH - 15, 55
    );
    fireGrad.addColorStop(0, 'rgba(255, 230, 60, 0.85)');
    fireGrad.addColorStop(0.3, 'rgba(255, 150, 20, 0.6)');
    fireGrad.addColorStop(0.7, 'rgba(255, 80, 10, 0.3)');
    fireGrad.addColorStop(1, 'rgba(255, 50, 0, 0)');
    ctx.fillStyle = fireGrad;
    ctx.beginPath();
    ctx.moveTo(fpX + 25, fpY + fpH - 8);
    ctx.quadraticCurveTo(fpX + 45 + fireFlicker, fpY + 50, w / 2, fpY + 35 + fireFlicker * 0.5);
    ctx.quadraticCurveTo(fpX + fpW - 45 - fireFlicker, fpY + 50, fpX + fpW - 25, fpY + fpH - 8);
    ctx.fill();

    // Inner bright flame
    const innerGrad = ctx.createRadialGradient(
      w / 2, fpY + fpH - 42, 4,
      w / 2, fpY + fpH - 22, 32
    );
    innerGrad.addColorStop(0, 'rgba(255, 255, 210, 0.95)');
    innerGrad.addColorStop(0.4, 'rgba(255, 210, 60, 0.5)');
    innerGrad.addColorStop(1, 'rgba(255, 120, 0, 0)');
    ctx.fillStyle = innerGrad;
    ctx.beginPath();
    ctx.ellipse(w / 2, fpY + fpH - 38 + fireFlicker * 0.3, 22, 38 + fireFlicker, 0, 0, Math.PI * 2);
    ctx.fill();

    // God-rays from fireplace (vertical light streaks)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 5; i++) {
      const rayX = fpX + 25 + i * (fpW - 50) / 4;
      const rayFlicker = Math.sin(this.flickerPhase * 1.3 + i * 1.8) * 0.02 + 0.03;
      const rayGrad = ctx.createLinearGradient(rayX, fpY + 30, rayX, fpY - 60);
      rayGrad.addColorStop(0, `rgba(255, 180, 60, ${rayFlicker})`);
      rayGrad.addColorStop(1, 'rgba(255, 150, 40, 0)');
      ctx.fillStyle = rayGrad;
      ctx.fillRect(rayX - 4, fpY - 60, 8, 90);
    }
    ctx.restore();

    // Fireplace warm glow on entire room — large, warm
    const hearthGlow = ctx.createRadialGradient(w / 2, fpY + fpH / 2, 30, w / 2, fpY + fpH / 2, 400);
    hearthGlow.addColorStop(0, `rgba(255, 160, 50, ${0.22 + Math.sin(this.flickerPhase * 1.5) * 0.05})`);
    hearthGlow.addColorStop(0.4, `rgba(255, 120, 30, ${0.10 + Math.sin(this.flickerPhase * 1.2) * 0.03})`);
    hearthGlow.addColorStop(1, 'rgba(255, 80, 0, 0)');
    ctx.fillStyle = hearthGlow;
    ctx.fillRect(0, 0, w, h);

    // === Trophy Wall (right of fireplace) ===
    this._drawTrophyWall(ctx, w, h, fpX + fpW + 40, fpY + 10);

    // === TORCH SCONCES on side walls ===
    const torchPositions = [
      { x: 60, y: 140 },
      { x: 60, y: 320 },
      { x: w - 60, y: 140 },
      { x: w - 60, y: 320 },
    ];
    for (let ti = 0; ti < torchPositions.length; ti++) {
      const torch = torchPositions[ti];
      // Sconce bracket
      ctx.fillStyle = '#3a2a1a';
      ctx.fillRect(torch.x - 3, torch.y, 6, 16);
      // Torch stick
      ctx.fillStyle = '#5a3818';
      ctx.fillRect(torch.x - 2, torch.y - 14, 4, 16);
      // Flame
      const tFlick = Math.sin(this.flickerPhase * 3.2 + ti * 1.9) * 2;
      ctx.fillStyle = `rgba(255, 190, 50, ${0.75 + Math.sin(this.flickerPhase * 2.5 + ti) * 0.15})`;
      ctx.beginPath();
      ctx.ellipse(torch.x, torch.y - 18 + tFlick, 4, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      // Bright core
      ctx.fillStyle = 'rgba(255, 255, 200, 0.6)';
      ctx.beginPath();
      ctx.ellipse(torch.x, torch.y - 16 + tFlick, 2, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Warm torch glow overlay (radial gradients from each torch)
    const flicker = Math.sin(this.flickerPhase) * 0.04 + 0.18;
    for (const torch of torchPositions) {
      const glow = ctx.createRadialGradient(torch.x, torch.y, 10, torch.x, torch.y, 280);
      glow.addColorStop(0, `rgba(255, 170, 50, ${flicker + 0.06})`);
      glow.addColorStop(0.4, `rgba(255, 130, 30, ${flicker * 0.3})`);
      glow.addColorStop(1, 'rgba(255, 100, 10, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(
        Math.max(0, torch.x - 280), Math.max(0, torch.y - 280),
        Math.min(560, w), Math.min(560, h)
      );
    }

    // === CEILING RAFTERS (3D perspective beams) ===
    ctx.save();
    // Main horizontal beam across back wall top
    ctx.fillStyle = '#2a1a0e';
    ctx.beginPath();
    ctx.moveTo(backWallLeft - 5, backWallTop - 2);
    ctx.lineTo(backWallRight + 5, backWallTop - 2);
    ctx.lineTo(backWallRight + 5, backWallTop + 10);
    ctx.lineTo(backWallLeft - 5, backWallTop + 10);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#3d2510';
    ctx.fillRect(backWallLeft - 5, backWallTop - 2, backWallRight - backWallLeft + 10, 3);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(backWallLeft - 5, backWallTop + 8, backWallRight - backWallLeft + 10, 2);

    // Perspective rafters from back wall to front
    for (let i = 0; i < 5; i++) {
      const t = (i + 0.5) / 5;
      const backX = backWallLeft + t * (backWallRight - backWallLeft);
      // Rafters spread outward toward viewer
      const frontX = t * w;
      ctx.strokeStyle = '#2a1a0e';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(backX, backWallTop + 4);
      ctx.lineTo(frontX, 0);
      ctx.stroke();
      // Highlight on rafter
      ctx.strokeStyle = '#3d2510';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(backX - 2, backWallTop + 2);
      ctx.lineTo(frontX - 2, 0);
      ctx.stroke();
    }

    // Second horizontal beam (closer to viewer)
    const midBeamY = 40;
    ctx.fillStyle = '#2a1a0e';
    ctx.fillRect(0, midBeamY, w, 12);
    ctx.fillStyle = '#3d2510';
    ctx.fillRect(0, midBeamY, w, 3);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, midBeamY + 10, w, 2);
    ctx.restore();

    // === WALL DECORATIONS ===
    // Shield (left wall)
    ctx.save();
    const shieldX = 50;
    const shieldY = 180;
    ctx.fillStyle = '#4a3420';
    ctx.beginPath();
    ctx.moveTo(shieldX, shieldY);
    ctx.lineTo(shieldX + 32, shieldY);
    ctx.lineTo(shieldX + 32, shieldY + 32);
    ctx.lineTo(shieldX + 16, shieldY + 44);
    ctx.lineTo(shieldX, shieldY + 32);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#6b4e2a';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Shield cross
    ctx.strokeStyle = '#8a6830';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(shieldX + 16, shieldY + 4);
    ctx.lineTo(shieldX + 16, shieldY + 38);
    ctx.moveTo(shieldX + 4, shieldY + 18);
    ctx.lineTo(shieldX + 28, shieldY + 18);
    ctx.stroke();
    ctx.restore();

    // Arched window (right wall, perspective-skewed)
    ctx.save();
    // Position within the angled right wall
    const winX = w - 95;
    const winY = 140;
    const winW = 38;
    const winH = 55;
    // Skew slightly to match wall angle
    ctx.transform(1, 0.05, 0, 1, 0, 0);
    // Window frame (stone)
    ctx.fillStyle = '#5a4a3a';
    ctx.fillRect(winX - 5, winY - 5, winW + 10, winH + 10);
    ctx.fillStyle = '#4a3a2a';
    ctx.fillRect(winX - 3, winY - 3, winW + 6, winH + 6);
    // Arch top
    ctx.beginPath();
    ctx.moveTo(winX - 5, winY);
    ctx.quadraticCurveTo(winX + winW / 2, winY - 18, winX + winW + 5, winY);
    ctx.fillStyle = '#5a4a3a';
    ctx.fill();
    // Night sky through window
    const skyGrad = ctx.createLinearGradient(winX, winY, winX, winY + winH);
    skyGrad.addColorStop(0, '#0a0a1a');
    skyGrad.addColorStop(0.4, '#0e1020');
    skyGrad.addColorStop(1, '#141828');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(winX, winY, winW, winH);
    // Arch sky
    ctx.beginPath();
    ctx.moveTo(winX, winY);
    ctx.quadraticCurveTo(winX + winW / 2, winY - 14, winX + winW, winY);
    ctx.fillStyle = '#0a0a1a';
    ctx.fill();
    // Moon
    ctx.fillStyle = 'rgba(200, 210, 230, 0.6)';
    ctx.beginPath();
    ctx.arc(winX + winW - 10, winY + 8, 5, 0, Math.PI * 2);
    ctx.fill();
    // Stars
    ctx.fillStyle = 'rgba(220, 220, 240, 0.5)';
    for (let si = 0; si < 5; si++) {
      const sx = winX + 4 + seed(si, 800) * (winW - 8);
      const sy = winY + 2 + seed(si, 801) * (winH * 0.5);
      ctx.fillRect(sx, sy, 1.5, 1.5);
    }
    // Window mullion (cross bar)
    ctx.fillStyle = '#3d2a18';
    ctx.fillRect(winX + winW / 2 - 2, winY, 4, winH);
    ctx.fillRect(winX, winY + winH / 2 - 2, winW, 4);
    // Moonlight glow into room
    const moonGlow = ctx.createRadialGradient(winX + winW / 2, winY + winH / 2, 5, winX + winW / 2, winY + winH / 2, 80);
    moonGlow.addColorStop(0, 'rgba(180, 190, 220, 0.06)');
    moonGlow.addColorStop(1, 'rgba(180, 190, 220, 0)');
    ctx.fillStyle = moonGlow;
    ctx.fillRect(winX - 60, winY - 40, winW + 120, winH + 80);
    ctx.restore();

    // Round shield (right wall — repositioned for angle)
    ctx.save();
    const sh2X = w - 60;
    const sh2Y = 280;
    ctx.transform(1, 0.04, 0, 1, 0, 0);
    ctx.fillStyle = '#4a3420';
    ctx.beginPath();
    ctx.arc(sh2X, sh2Y, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#6b4e2a';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#2a1a0e';
    ctx.beginPath();
    ctx.arc(sh2X, sh2Y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // === ATMOSPHERIC HAZE / SMOKE near ceiling ===
    ctx.save();
    const hazeGrad = ctx.createLinearGradient(0, 0, 0, 120);
    hazeGrad.addColorStop(0, 'rgba(80, 65, 45, 0.12)');
    hazeGrad.addColorStop(0.5, 'rgba(70, 55, 35, 0.06)');
    hazeGrad.addColorStop(1, 'rgba(60, 45, 25, 0)');
    ctx.fillStyle = hazeGrad;
    ctx.fillRect(0, 0, w, 120);
    // Wisps of smoke
    for (let i = 0; i < 4; i++) {
      const sx = 100 + i * 180 + Math.sin(this.flickerPhase * 0.3 + i * 1.5) * 15;
      const sy = 25 + Math.sin(this.flickerPhase * 0.2 + i) * 8;
      const smokeGrad = ctx.createRadialGradient(sx, sy, 5, sx, sy, 50);
      smokeGrad.addColorStop(0, 'rgba(90, 75, 55, 0.06)');
      smokeGrad.addColorStop(1, 'rgba(80, 65, 45, 0)');
      ctx.fillStyle = smokeGrad;
      ctx.fillRect(sx - 50, sy - 30, 100, 60);
    }
    ctx.restore();

    // === DUST MOTES floating in firelight ===
    ctx.save();
    for (let i = 0; i < 20; i++) {
      const baseX = seed(i, 500) * w;
      const baseY = seed(i, 501) * (h - 100) + 50;
      const driftX = Math.sin(this.flickerPhase * 0.4 + i * 2.3) * 8;
      const driftY = Math.sin(this.flickerPhase * 0.3 + i * 1.7) * 5;
      const mx = baseX + driftX;
      const my = baseY + driftY;
      const distToFire = Math.sqrt((mx - w / 2) ** 2 + (my - (fpY + fpH / 2)) ** 2);
      const brightness = Math.max(0, 1 - distToFire / 350);
      if (brightness > 0.05) {
        ctx.fillStyle = `rgba(255, 210, 140, ${brightness * 0.15})`;
        ctx.beginPath();
        ctx.arc(mx, my, 1 + seed(i, 502) * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    // === Bottom bar — old dark tavern bar counter ===
    ctx.fillStyle = '#1e120a';
    ctx.fillRect(0, h - 50, w, 50);
    ctx.fillStyle = '#3d2a18';
    ctx.fillRect(0, h - 50, w, 4);
    ctx.fillStyle = '#5a3d20';
    ctx.fillRect(0, h - 48, w, 2);
    ctx.fillStyle = 'rgba(90, 60, 30, 0.5)';
    ctx.fillRect(0, h - 46, w, 1);

    // === TASK 3: Atmosphere overlay based on fragment count ===
    const fragments = this._fragmentCount || 0;
    if (fragments >= 2 && fragments <= 3) {
      // Slightly dimmer, cooler
      ctx.fillStyle = 'rgba(0, 10, 30, 0.08)';
      ctx.fillRect(0, 0, w, h);
    } else if (fragments >= 4 && fragments <= 5) {
      // Darker edges, shadowed areas — "Strider effect"
      ctx.fillStyle = 'rgba(0, 5, 20, 0.15)';
      ctx.fillRect(0, 0, w, h);
      // Darker edge vignette
      const vig = ctx.createRadialGradient(w / 2, h / 2, w * 0.2, w / 2, h / 2, w * 0.55);
      vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
      vig.addColorStop(1, 'rgba(0, 0, 20, 0.2)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, w, h);
    } else if (fragments >= 6 && fragments <= 7) {
      // Trophy wall area glows prominently — handled in trophy wall drawing
      ctx.fillStyle = 'rgba(0, 5, 15, 0.10)';
      ctx.fillRect(0, 0, w, h);
    } else if (fragments >= 8 && fragments <= 9) {
      // Cold, tense, blue-ish tint, aggressive flicker
      ctx.fillStyle = 'rgba(0, 10, 40, 0.22)';
      ctx.fillRect(0, 0, w, h);
      // Cold vignette
      const vig = ctx.createRadialGradient(w / 2, h / 2, w * 0.15, w / 2, h / 2, w * 0.5);
      vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
      vig.addColorStop(1, 'rgba(0, 10, 40, 0.3)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, w, h);
    } else if (fragments >= 10) {
      // Ethereal — fragments illuminate the room
      const ethereal = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w * 0.5);
      const pulse = Math.sin(this.flickerPhase * 0.8) * 0.03 + 0.06;
      ethereal.addColorStop(0, `rgba(255, 230, 100, ${pulse})`);
      ethereal.addColorStop(0.5, `rgba(200, 180, 80, ${pulse * 0.5})`);
      ethereal.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = ethereal;
      ctx.fillRect(0, 0, w, h);
    }
  }

  /**
   * Trophy Wall — displays collected Sunstone fragments.
   * Empty slots are dark outlines, collected ones glow.
   * Glow intensity increases with fragment count.
   */
  _drawTrophyWall(ctx, canvasW, canvasH, startX, startY) {
    if (!noticeBoardData) return;
    const fragments = this._fragmentCount;
    const fragmentIds = noticeBoardData.fragmentIds || [];
    const fragmentNames = noticeBoardData.fragmentNames || [];

    const cols = 5;
    const rows = 2;
    const slotSize = 22;
    const slotGap = 6;
    const totalW = cols * slotSize + (cols - 1) * slotGap;
    const totalH = rows * slotSize + (rows - 1) * slotGap;

    // Wooden backing plaque
    const plaqueX = startX - 8;
    const plaqueY = startY - 24;
    const plaqueW = totalW + 16;
    const plaqueH = totalH + 44;
    ctx.fillStyle = '#1e1408';
    ctx.fillRect(plaqueX, plaqueY, plaqueW, plaqueH);
    ctx.strokeStyle = '#3d2814';
    ctx.lineWidth = 2;
    ctx.strokeRect(plaqueX, plaqueY, plaqueW, plaqueH);

    // Plaque title
    ctx.textAlign = 'center';
    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = '#8B7355';
    ctx.fillText('SUNSTONE', startX + totalW / 2, startY - 10);
    ctx.textAlign = 'left';

    // Glow intensity based on total fragments
    const glowIntensity = fragments / 10;

    // Overall glow behind collected fragments
    if (fragments > 0) {
      const glowCX = startX + totalW / 2;
      const glowCY = startY + totalH / 2;
      const glow = ctx.createRadialGradient(glowCX, glowCY, 5, glowCX, glowCY, 60 + fragments * 8);
      const alpha = 0.05 + glowIntensity * 0.2;
      glow.addColorStop(0, `rgba(255, 220, 80, ${alpha})`);
      glow.addColorStop(1, 'rgba(255, 180, 40, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(glowCX - 80, glowCY - 60, 160, 120);
    }

    // Draw 10 fragment slots
    for (let i = 0; i < 10; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const sx = startX + col * (slotSize + slotGap);
      const sy = startY + row * (slotSize + slotGap);
      const fragId = fragmentIds[i];
      const collected = this._collectedSet && this._collectedSet.has(fragId);

      if (collected) {
        // Glowing collected fragment
        const pulse = Math.sin(this.flickerPhase * 1.5 + i * 0.7) * 0.15 + 0.85;
        const fragAlpha = 0.6 + glowIntensity * 0.4;

        // Fragment glow
        const fragGlow = ctx.createRadialGradient(
          sx + slotSize / 2, sy + slotSize / 2, 2,
          sx + slotSize / 2, sy + slotSize / 2, slotSize
        );
        fragGlow.addColorStop(0, `rgba(255, 220, 80, ${fragAlpha * pulse})`);
        fragGlow.addColorStop(0.6, `rgba(255, 180, 40, ${fragAlpha * pulse * 0.4})`);
        fragGlow.addColorStop(1, 'rgba(255, 140, 20, 0)');
        ctx.fillStyle = fragGlow;
        ctx.fillRect(sx - 6, sy - 6, slotSize + 12, slotSize + 12);

        // Crystal shape
        ctx.fillStyle = `rgba(255, 230, 100, ${0.8 * pulse})`;
        ctx.beginPath();
        ctx.moveTo(sx + slotSize / 2, sy + 2);
        ctx.lineTo(sx + slotSize - 3, sy + slotSize / 2);
        ctx.lineTo(sx + slotSize / 2, sy + slotSize - 2);
        ctx.lineTo(sx + 3, sy + slotSize / 2);
        ctx.closePath();
        ctx.fill();

        // Inner highlight
        ctx.fillStyle = `rgba(255, 255, 220, ${0.5 * pulse})`;
        ctx.beginPath();
        ctx.arc(sx + slotSize / 2, sy + slotSize / 2, 4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Empty slot — dark outline
        ctx.fillStyle = '#0a0604';
        ctx.beginPath();
        ctx.moveTo(sx + slotSize / 2, sy + 2);
        ctx.lineTo(sx + slotSize - 3, sy + slotSize / 2);
        ctx.lineTo(sx + slotSize / 2, sy + slotSize - 2);
        ctx.lineTo(sx + 3, sy + slotSize / 2);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#2a1a0e';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }

  _drawTavernTitle(ctx, world) {
    const w = ctx.canvas.width;

    // Carved wooden sign
    const signW = 340;
    const signH = 48;
    const signX = (w - signW) / 2;
    const signY = 8;

    // Sign background
    ctx.fillStyle = '#2a1a0e';
    ctx.fillRect(signX, signY, signW, signH);
    ctx.strokeStyle = '#4a3018';
    ctx.lineWidth = 3;
    ctx.strokeRect(signX, signY, signW, signH);

    // Inner border (carved look)
    ctx.strokeStyle = '#1a0e06';
    ctx.lineWidth = 1;
    ctx.strokeRect(signX + 4, signY + 4, signW - 8, signH - 8);

    // Title text — golden with shadow
    ctx.textAlign = 'center';
    ctx.font = 'bold 22px monospace';
    ctx.fillStyle = '#0a0500';
    ctx.fillText('THE RUSTY FLAGON', w / 2 + 1, signY + 31);
    ctx.fillStyle = '#FFD700';
    ctx.fillText('THE RUSTY FLAGON', w / 2, signY + 30);

    // Subtitle
    ctx.font = '11px monospace';
    ctx.fillStyle = '#8B7355';
    ctx.fillText('~ Est. the Aureate Age, Year of the Broken Sun ~', w / 2, signY + 44);

    // Atmosphere text — subtle mood indicator based on fragment count
    const fragments = this._fragmentCount || 0;
    const atmosText = ATMOSPHERE_TEXT[fragments] || ATMOSPHERE_TEXT[0];
    const atmosAlpha = 0.4 + Math.sin(this.flickerPhase * 0.3) * 0.1;
    ctx.font = 'italic 10px monospace';
    ctx.fillStyle = `rgba(196, 162, 101, ${atmosAlpha})`;
    ctx.fillText(atmosText, w / 2, signY + 58);

    ctx.textAlign = 'left';
  }

  _drawTorchSconce(ctx, x, y) {
    // Wall bracket
    ctx.fillStyle = '#3d2814';
    ctx.fillRect(x - 3, y, 6, 20);
    ctx.fillStyle = '#5a3d1e';
    ctx.fillRect(x - 6, y + 16, 12, 6);

    // Flame (animated flicker)
    const flicker = Math.sin(this.flickerPhase * 3 + x) * 3;
    const flameH = 14 + flicker;

    // Outer flame glow
    ctx.fillStyle = 'rgba(255, 120, 20, 0.6)';
    ctx.beginPath();
    ctx.ellipse(x, y - 4, 8, flameH, 0, 0, Math.PI * 2);
    ctx.fill();

    // Inner flame
    ctx.fillStyle = 'rgba(255, 220, 80, 0.8)';
    ctx.beginPath();
    ctx.ellipse(x, y - 2, 4, flameH * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // White hot core
    ctx.fillStyle = 'rgba(255, 255, 200, 0.9)';
    ctx.beginPath();
    ctx.ellipse(x, y, 2, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- Hub View (tavern interior scene) ---

  _renderHub(ctx, world) {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    const fragments = this._fragmentCount || 0;
    const hotspots = this._getHubHotspots(world);

    // Seeded pseudo-random for consistent details
    const seed = (x, y) => Math.abs(Math.sin(x * 127.1 + y * 311.7) * 43758.5453 % 1);

    // === Helper: draw a shaped bottle (narrow neck, wide body, cork) ===
    const drawBottle = (bx, by, bh, bw, color, hasHighlight) => {
      const neckH = bh * 0.3;
      const neckW = bw * 0.35;
      const bodyH = bh * 0.7;
      const bodyTop = by + neckH;
      // Cork
      ctx.fillStyle = '#6a5a3a';
      ctx.fillRect(bx + bw / 2 - neckW / 2 + 0.5, by - 3, neckW - 1, 4);
      // Neck
      ctx.fillStyle = color;
      ctx.fillRect(bx + bw / 2 - neckW / 2, by, neckW, neckH + 2);
      // Body (rounded via arcs)
      ctx.beginPath();
      ctx.moveTo(bx + bw / 2 - neckW / 2, bodyTop);
      ctx.quadraticCurveTo(bx - 1, bodyTop + 2, bx, bodyTop + bodyH * 0.3);
      ctx.lineTo(bx, bodyTop + bodyH - 3);
      ctx.quadraticCurveTo(bx, bodyTop + bodyH, bx + 3, bodyTop + bodyH);
      ctx.lineTo(bx + bw - 3, bodyTop + bodyH);
      ctx.quadraticCurveTo(bx + bw, bodyTop + bodyH, bx + bw, bodyTop + bodyH - 3);
      ctx.lineTo(bx + bw, bodyTop + bodyH * 0.3);
      ctx.quadraticCurveTo(bx + bw + 1, bodyTop + 2, bx + bw / 2 + neckW / 2, bodyTop);
      ctx.closePath();
      ctx.fill();
      // Glass highlight (diagonal streak)
      if (hasHighlight) {
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(bx + 2, bodyTop + 3);
        ctx.lineTo(bx + 4, bodyTop + 3);
        ctx.lineTo(bx + 4, bodyTop + bodyH - 4);
        ctx.lineTo(bx + 2, bodyTop + bodyH - 4);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    };

    // === Helper: draw a proper tankard (wider top, handle, foam) ===
    const drawTankard = (mx, my, tw, th) => {
      // Body — slight taper (wider at top)
      ctx.fillStyle = '#4a2e14';
      ctx.beginPath();
      ctx.moveTo(mx + 2, my);
      ctx.lineTo(mx + tw - 2, my);
      ctx.lineTo(mx + tw - 4, my + th);
      ctx.lineTo(mx + 4, my + th);
      ctx.closePath();
      ctx.fill();
      // Metal bands
      ctx.strokeStyle = '#8a7050';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(mx + 1, my + 4); ctx.lineTo(mx + tw - 1, my + 4);
      ctx.moveTo(mx + 3, my + th - 3); ctx.lineTo(mx + tw - 3, my + th - 3);
      ctx.stroke();
      // Inner liquid
      ctx.fillStyle = '#6a4a18';
      ctx.fillRect(mx + 3, my + 2, tw - 6, 4);
      // Foam top
      ctx.fillStyle = '#d4c890';
      ctx.beginPath();
      ctx.ellipse(mx + tw / 2, my + 1, tw / 2 - 1, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      // Handle
      ctx.strokeStyle = '#5a3818';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(mx + tw + 2, my + th / 2, 6, -Math.PI * 0.6, Math.PI * 0.6);
      ctx.stroke();
      // Highlight on body
      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      ctx.fillRect(mx + 2, my + 1, 3, th - 2);
    };

    // === Helper: draw a proportioned NPC figure ===
    const drawNPC = (x, y, opts) => {
      const { headColor, bodyColor, vestColor, headR, bodyW, bodyH, arms, sling, seated,
        npcType, holdingItem } = {
        headColor: '#c08060', bodyColor: '#3a2a18', vestColor: null,
        headR: 11, bodyW: 24, bodyH: 32, arms: true, sling: false, seated: false,
        npcType: 'generic', holdingItem: null,
        ...opts
      };
      // Soft elliptical floor shadow
      ctx.save();
      const shadowGrad = ctx.createRadialGradient(x, y + bodyH + 6, 2, x, y + bodyH + 6, bodyW * 0.8);
      shadowGrad.addColorStop(0, 'rgba(0,0,0,0.22)');
      shadowGrad.addColorStop(0.7, 'rgba(0,0,0,0.08)');
      shadowGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = shadowGrad;
      ctx.beginPath();
      ctx.ellipse(x, y + bodyH + 6, bodyW * 0.8, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Legs (if standing)
      if (!seated) {
        // Trousers
        ctx.fillStyle = '#2a1a10';
        const legW = bodyW * 0.28;
        const legH = bodyH * 0.42;
        const legGap = bodyW * 0.08;
        ctx.fillRect(x - legGap - legW, y + bodyH - 4, legW, legH);
        ctx.fillRect(x + legGap, y + bodyH - 4, legW, legH);
        // Knee highlight
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.fillRect(x - legGap - legW + 1, y + bodyH + 4, legW - 2, 4);
        ctx.fillRect(x + legGap + 1, y + bodyH + 4, legW - 2, 4);
        // Boots (shaped)
        ctx.fillStyle = '#1a0e06';
        const bootW = legW + 3;
        const bootH = 6;
        // Left boot
        ctx.beginPath();
        ctx.moveTo(x - legGap - legW - 1, y + bodyH - 4 + legH);
        ctx.lineTo(x - legGap + 3, y + bodyH - 4 + legH);
        ctx.lineTo(x - legGap + 3, y + bodyH - 4 + legH + bootH);
        ctx.lineTo(x - legGap - legW - 2, y + bodyH - 4 + legH + bootH);
        ctx.closePath();
        ctx.fill();
        // Right boot
        ctx.beginPath();
        ctx.moveTo(x + legGap - 1, y + bodyH - 4 + legH);
        ctx.lineTo(x + legGap + bootW - 1, y + bodyH - 4 + legH);
        ctx.lineTo(x + legGap + bootW, y + bodyH - 4 + legH + bootH);
        ctx.lineTo(x + legGap - 2, y + bodyH - 4 + legH + bootH);
        ctx.closePath();
        ctx.fill();
        // Boot highlight
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(x - legGap - legW, y + bodyH - 4 + legH, 2, bootH);
        ctx.fillRect(x + legGap, y + bodyH - 4 + legH, 2, bootH);
      }

      // Torso — slightly tapered shape
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.moveTo(x - bodyW / 2, y);
      ctx.lineTo(x + bodyW / 2, y);
      ctx.lineTo(x + bodyW / 2 - 1, y + bodyH);
      ctx.lineTo(x - bodyW / 2 + 1, y + bodyH);
      ctx.closePath();
      ctx.fill();

      // Waist/belt area
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(x - bodyW / 2 + 1, y + bodyH - 6, bodyW - 2, 4);
      // Belt buckle
      ctx.fillStyle = '#8a7040';
      ctx.fillRect(x - 3, y + bodyH - 6, 6, 4);

      // Vest/clothing detail overlay
      if (vestColor) {
        ctx.fillStyle = vestColor;
        // V-neck shape for vest/apron
        ctx.beginPath();
        ctx.moveTo(x - bodyW / 2 + 3, y + 2);
        ctx.lineTo(x, y + 8);
        ctx.lineTo(x + bodyW / 2 - 3, y + 2);
        ctx.lineTo(x + bodyW / 2 - 3, y + bodyH - 8);
        ctx.lineTo(x - bodyW / 2 + 3, y + bodyH - 8);
        ctx.closePath();
        ctx.fill();
      }

      // Clothing texture lines (stitching)
      ctx.strokeStyle = 'rgba(0,0,0,0.12)';
      ctx.lineWidth = 0.5;
      // Vertical center seam
      ctx.beginPath();
      ctx.moveTo(x, y + 6); ctx.lineTo(x, y + bodyH - 6);
      ctx.stroke();

      // Shoulders (rounded)
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.ellipse(x - bodyW / 2 - 2, y + 5, 5, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x + bodyW / 2 + 2, y + 5, 5, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Arms
      if (arms && !sling) {
        // Upper arms (body color — sleeves)
        ctx.fillStyle = bodyColor;
        ctx.fillRect(x - bodyW / 2 - 6, y + 4, 7, 12);
        ctx.fillRect(x + bodyW / 2 - 1, y + 4, 7, 12);
        // Forearms (skin)
        ctx.fillStyle = headColor;
        ctx.fillRect(x - bodyW / 2 - 6, y + 15, 6, 12);
        ctx.fillRect(x + bodyW / 2, y + 15, 6, 12);
        // Hands
        ctx.beginPath();
        ctx.arc(x - bodyW / 2 - 3, y + 28, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + bodyW / 2 + 3, y + 28, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      if (sling) {
        // Good arm with sleeve
        ctx.fillStyle = bodyColor;
        ctx.fillRect(x - bodyW / 2 - 6, y + 4, 7, 12);
        ctx.fillStyle = headColor;
        ctx.fillRect(x - bodyW / 2 - 6, y + 15, 6, 12);
        ctx.beginPath();
        ctx.arc(x - bodyW / 2 - 3, y + 28, 3, 0, Math.PI * 2);
        ctx.fill();
        // Sling — cloth wrap across chest
        ctx.fillStyle = '#c0b090';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x - bodyW / 2 + 2, y + 2);
        ctx.quadraticCurveTo(x + bodyW / 4, y + 10, x + bodyW / 2 + 2, y + 4);
        ctx.lineTo(x + bodyW / 2 + 2, y + 8);
        ctx.quadraticCurveTo(x + bodyW / 4, y + 18, x + 2, y + 22);
        ctx.lineTo(x - 2, y + 22);
        ctx.quadraticCurveTo(x + bodyW / 4 - 4, y + 14, x - bodyW / 2 + 2, y + 6);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
        // Injured arm tucked in sling
        ctx.fillStyle = headColor;
        ctx.beginPath();
        ctx.arc(x + 4, y + 18, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Neck
      ctx.fillStyle = headColor;
      ctx.fillRect(x - 4, y - 7, 8, 9);
      // Collar
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.moveTo(x - bodyW / 2 + 2, y);
      ctx.lineTo(x - 5, y - 2);
      ctx.lineTo(x, y + 1);
      ctx.lineTo(x + 5, y - 2);
      ctx.lineTo(x + bodyW / 2 - 2, y);
      ctx.lineTo(x + bodyW / 2 - 2, y + 3);
      ctx.lineTo(x - bodyW / 2 + 2, y + 3);
      ctx.closePath();
      ctx.fill();

      // Head
      ctx.fillStyle = headColor;
      ctx.beginPath();
      ctx.arc(x, y - headR - 5, headR, 0, Math.PI * 2);
      ctx.fill();

      // --- Per-NPC face and hair ---
      const headCY = y - headR - 5;

      if (npcType === 'aldric') {
        // Bald / very short stubble top
        ctx.fillStyle = 'rgba(30, 20, 10, 0.25)';
        ctx.beginPath();
        ctx.arc(x, headCY - 1, headR - 1, Math.PI * 1.1, Math.PI * 1.9);
        ctx.fill();
        // Eyes (small dark dots)
        ctx.fillStyle = '#1a1008';
        ctx.beginPath(); ctx.arc(x - 4, headCY - 1, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + 4, headCY - 1, 1.5, 0, Math.PI * 2); ctx.fill();
        // Bushy eyebrows
        ctx.fillStyle = '#3a2a18';
        ctx.fillRect(x - 6, headCY - 4, 5, 2);
        ctx.fillRect(x + 1, headCY - 4, 5, 2);
        // Thick beard
        ctx.fillStyle = '#3a2818';
        ctx.beginPath();
        ctx.moveTo(x - 6, headCY + 3);
        ctx.quadraticCurveTo(x - 7, headCY + 12, x, headCY + 14);
        ctx.quadraticCurveTo(x + 7, headCY + 12, x + 6, headCY + 3);
        ctx.closePath();
        ctx.fill();
        // Mustache
        ctx.fillStyle = '#3a2818';
        ctx.beginPath();
        ctx.ellipse(x, headCY + 4, 5, 2.5, 0, 0, Math.PI);
        ctx.fill();
        // Nose
        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        ctx.beginPath(); ctx.arc(x, headCY + 2, 2, 0, Math.PI * 2); ctx.fill();
      } else if (npcType === 'bessa') {
        // Eyes peer from under hood — barely visible
        ctx.fillStyle = '#1a1008';
        ctx.beginPath(); ctx.arc(x - 3, headCY, 1.3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + 3, headCY, 1.3, 0, Math.PI * 2); ctx.fill();
        // Eye glint
        ctx.fillStyle = 'rgba(200,180,140,0.3)';
        ctx.beginPath(); ctx.arc(x - 2.5, headCY - 0.5, 0.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + 3.5, headCY - 0.5, 0.5, 0, Math.PI * 2); ctx.fill();
        // Thin lips
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(x - 3, headCY + 4);
        ctx.quadraticCurveTo(x, headCY + 5.5, x + 3, headCY + 4);
        ctx.stroke();
      } else if (npcType === 'mira') {
        // Hair tied back (auburn)
        ctx.fillStyle = '#6a3020';
        ctx.beginPath();
        ctx.arc(x, headCY - 1, headR, Math.PI * 1.15, Math.PI * 1.85);
        ctx.fill();
        // Hair bun at back
        ctx.beginPath();
        ctx.arc(x + headR - 2, headCY - 3, 5, 0, Math.PI * 2);
        ctx.fill();
        // Side hair strands
        ctx.fillRect(x - headR + 1, headCY - 3, 3, 8);
        // Eyes
        ctx.fillStyle = '#1a1008';
        ctx.beginPath(); ctx.arc(x - 3, headCY - 1, 1.3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + 3, headCY - 1, 1.3, 0, Math.PI * 2); ctx.fill();
        // Glasses (small round spectacles)
        ctx.strokeStyle = '#8a7a5a';
        ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.arc(x - 3, headCY - 1, 3, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(x + 3, headCY - 1, 3, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x, headCY - 1); ctx.lineTo(x, headCY - 1); ctx.stroke();
        // Small nose
        ctx.fillStyle = 'rgba(0,0,0,0.06)';
        ctx.beginPath(); ctx.arc(x, headCY + 2, 1.5, 0, Math.PI * 2); ctx.fill();
        // Slight smile
        ctx.strokeStyle = 'rgba(0,0,0,0.12)';
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.arc(x, headCY + 3, 3, 0.2, Math.PI - 0.2);
        ctx.stroke();
      } else if (npcType === 'orin') {
        // Messy dark hair
        ctx.fillStyle = '#2a1a0a';
        ctx.beginPath();
        ctx.arc(x, headCY - 2, headR + 1, Math.PI * 0.9, Math.PI * 2.1);
        ctx.fill();
        // Wild strands sticking up
        ctx.strokeStyle = '#2a1a0a';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x - 5, headCY - headR); ctx.lineTo(x - 7, headCY - headR - 4);
        ctx.moveTo(x, headCY - headR - 1); ctx.lineTo(x + 1, headCY - headR - 5);
        ctx.moveTo(x + 4, headCY - headR); ctx.lineTo(x + 6, headCY - headR - 3);
        ctx.stroke();
        // Eyes (slightly narrowed — tough look)
        ctx.fillStyle = '#1a1008';
        ctx.fillRect(x - 5, headCY - 1, 3, 2);
        ctx.fillRect(x + 2, headCY - 1, 3, 2);
        // Scar on face
        ctx.strokeStyle = '#905040';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x - 5, headCY - 4);
        ctx.lineTo(x - 1, headCY + 4);
        ctx.stroke();
        // Stubble
        ctx.fillStyle = 'rgba(30, 20, 10, 0.15)';
        ctx.fillRect(x - 5, headCY + 3, 10, 5);
        // Nose
        ctx.fillStyle = 'rgba(0,0,0,0.07)';
        ctx.beginPath(); ctx.arc(x, headCY + 2, 1.5, 0, Math.PI * 2); ctx.fill();
      } else if (npcType === 'elden') {
        // Ghost — glowing eyes, wispy features
        ctx.fillStyle = 'rgba(180, 180, 255, 0.7)';
        ctx.beginPath(); ctx.arc(x - 3, headCY - 1, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + 3, headCY - 1, 1.5, 0, Math.PI * 2); ctx.fill();
        // Faint hair outline
        ctx.strokeStyle = 'rgba(130, 130, 200, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, headCY - 2, headR, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
      } else {
        // Generic NPC — basic hair and eyes
        ctx.fillStyle = 'rgba(30, 20, 10, 0.5)';
        ctx.beginPath();
        ctx.arc(x, headCY - 2, headR - 1, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1a1008';
        ctx.beginPath(); ctx.arc(x - 3, headCY - 1, 1.2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + 3, headCY - 1, 1.2, 0, Math.PI * 2); ctx.fill();
      }

      // Held item (drawn last so it's on top)
      if (holdingItem === 'mug') {
        // Aldric wiping a mug — held in right hand area
        ctx.fillStyle = '#4a2e14';
        ctx.fillRect(x + bodyW / 2 + 1, y + 20, 8, 10);
        ctx.fillStyle = '#d4c890';
        ctx.beginPath();
        ctx.ellipse(x + bodyW / 2 + 5, y + 20, 4, 2, 0, 0, Math.PI * 2);
        ctx.fill();
        // Cloth on mug
        ctx.fillStyle = '#c8c0a8';
        ctx.fillRect(x + bodyW / 2 - 2, y + 22, 6, 6);
      }
      if (holdingItem === 'quill') {
        // Mira holding a quill — from right hand downward
        ctx.strokeStyle = '#2a1a0a';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x + bodyW / 2 + 3, y + 22);
        ctx.lineTo(x + bodyW / 2 + 8, y + 10);
        ctx.stroke();
        // Feather
        ctx.fillStyle = '#c0b090';
        ctx.beginPath();
        ctx.moveTo(x + bodyW / 2 + 8, y + 10);
        ctx.lineTo(x + bodyW / 2 + 14, y + 4);
        ctx.lineTo(x + bodyW / 2 + 10, y + 6);
        ctx.closePath();
        ctx.fill();
      }
    };

    // === Helper: draw a 3D table with shadow, wood grain, and optional candle ===
    const drawTable = (tx, ty, tw, th, hasCandle) => {
      // Floor shadow (soft gradient)
      ctx.save();
      const tShadow = ctx.createRadialGradient(tx + tw / 2, ty + th + 20, 4, tx + tw / 2, ty + th + 20, tw * 0.7);
      tShadow.addColorStop(0, 'rgba(0,0,0,0.18)');
      tShadow.addColorStop(0.7, 'rgba(0,0,0,0.06)');
      tShadow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = tShadow;
      ctx.beginPath();
      ctx.ellipse(tx + tw / 2, ty + th + 20, tw * 0.65, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Table legs (back two, darker)
      ctx.fillStyle = '#2a1808';
      ctx.fillRect(tx + 6, ty + th, 6, 18);
      ctx.fillRect(tx + tw - 12, ty + th, 6, 18);
      // Leg highlights
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      ctx.fillRect(tx + 6, ty + th, 2, 18);
      ctx.fillRect(tx + tw - 12, ty + th, 2, 18);

      // Table top — 3D trapezoid (wider at front)
      ctx.fillStyle = '#4a3018';
      ctx.beginPath();
      ctx.moveTo(tx - 2, ty + th);
      ctx.lineTo(tx + tw + 2, ty + th);
      ctx.lineTo(tx + tw - 4, ty);
      ctx.lineTo(tx + 4, ty);
      ctx.closePath();
      ctx.fill();
      // Wood grain on table top
      ctx.strokeStyle = 'rgba(80,55,25,0.25)';
      ctx.lineWidth = 0.5;
      for (let gi = 0; gi < 4; gi++) {
        const gy = ty + 1 + gi * (th / 4);
        ctx.beginPath();
        ctx.moveTo(tx + 6, gy);
        ctx.quadraticCurveTo(tx + tw / 2, gy + seed(gi, tx) * 3 - 1, tx + tw - 6, gy);
        ctx.stroke();
      }
      // Scratches / wear marks
      ctx.strokeStyle = 'rgba(0,0,0,0.08)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(tx + 15, ty + 3); ctx.lineTo(tx + 35, ty + 5);
      ctx.moveTo(tx + 45, ty + 2); ctx.lineTo(tx + 60, ty + 6);
      ctx.stroke();

      // Top surface highlight
      ctx.fillStyle = '#5a3d20';
      ctx.fillRect(tx + 2, ty, tw - 4, 4);
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      ctx.fillRect(tx + 4, ty, tw - 8, 2);

      // Front face
      ctx.fillStyle = '#3d2510';
      ctx.fillRect(tx - 2, ty + th - 4, tw + 4, 6);
      // Front legs (lighter, in front)
      ctx.fillStyle = '#3d2510';
      ctx.fillRect(tx + 4, ty + th, 6, 20);
      ctx.fillRect(tx + tw - 10, ty + th, 6, 20);

      // Candle on table
      if (hasCandle) {
        const cx = tx + tw / 2;
        // Candle holder (small dish)
        ctx.fillStyle = '#6a5a3a';
        ctx.beginPath();
        ctx.ellipse(cx, ty - 1, 5, 2, 0, 0, Math.PI * 2);
        ctx.fill();
        // Wax body with drip
        ctx.fillStyle = '#c8be90';
        ctx.fillRect(cx - 2, ty - 12, 4, 11);
        // Wax drip
        ctx.beginPath();
        ctx.moveTo(cx + 2, ty - 6);
        ctx.quadraticCurveTo(cx + 3.5, ty - 3, cx + 2.5, ty - 1);
        ctx.lineTo(cx + 1.5, ty - 1);
        ctx.quadraticCurveTo(cx + 2, ty - 4, cx + 1, ty - 6);
        ctx.closePath();
        ctx.fill();
        // Wick
        ctx.strokeStyle = '#2a2a2a';
        ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(cx, ty - 12); ctx.lineTo(cx, ty - 15); ctx.stroke();
        // Flame
        const flick = Math.sin(this.flickerPhase * 3.5 + tx) * 1.5;
        ctx.fillStyle = `rgba(255, 200, 50, ${0.8 + Math.sin(this.flickerPhase * 2.5 + tx) * 0.15})`;
        ctx.beginPath();
        ctx.moveTo(cx, ty - 22 + flick);
        ctx.quadraticCurveTo(cx - 3, ty - 17 + flick, cx, ty - 14);
        ctx.quadraticCurveTo(cx + 3, ty - 17 + flick, cx, ty - 22 + flick);
        ctx.closePath();
        ctx.fill();
        // Inner flame (brighter core)
        ctx.fillStyle = `rgba(255, 240, 150, ${0.6 + Math.sin(this.flickerPhase * 4 + tx) * 0.2})`;
        ctx.beginPath();
        ctx.moveTo(cx, ty - 20 + flick);
        ctx.quadraticCurveTo(cx - 1.5, ty - 17 + flick, cx, ty - 15);
        ctx.quadraticCurveTo(cx + 1.5, ty - 17 + flick, cx, ty - 20 + flick);
        ctx.closePath();
        ctx.fill();
        // Candle glow on surroundings
        const cGlow = ctx.createRadialGradient(cx, ty - 14, 2, cx, ty - 10, 35);
        cGlow.addColorStop(0, 'rgba(255, 180, 50, 0.12)');
        cGlow.addColorStop(1, 'rgba(255, 150, 30, 0)');
        ctx.fillStyle = cGlow;
        ctx.fillRect(cx - 35, ty - 44, 70, 55);
      }
    };

    // === Atmospheric haze near ceiling (smoke layer) ===
    const hazeGrad = ctx.createLinearGradient(0, 60, 0, 180);
    hazeGrad.addColorStop(0, 'rgba(60, 45, 30, 0.12)');
    hazeGrad.addColorStop(0.5, 'rgba(60, 45, 30, 0.06)');
    hazeGrad.addColorStop(1, 'rgba(60, 45, 30, 0)');
    ctx.fillStyle = hazeGrad;
    ctx.fillRect(0, 60, w, 120);

    // === Warm fireplace light on floor (left-center glow) ===
    const floorGlow = ctx.createRadialGradient(200, 440, 20, 200, 440, 220);
    floorGlow.addColorStop(0, 'rgba(255, 140, 40, 0.06)');
    floorGlow.addColorStop(0.6, 'rgba(255, 120, 30, 0.03)');
    floorGlow.addColorStop(1, 'rgba(255, 100, 20, 0)');
    ctx.fillStyle = floorGlow;
    ctx.fillRect(0, 300, 500, 280);

    // === Dust motes in the light ===
    const phase = this.flickerPhase || 0;
    ctx.fillStyle = 'rgba(255, 220, 150, 0.2)';
    for (let d = 0; d < 8; d++) {
      const dx = 100 + seed(d, 1) * 350 + Math.sin(phase * 0.3 + d * 2.1) * 15;
      const dy = 120 + seed(d, 2) * 200 + Math.cos(phase * 0.2 + d * 1.7) * 10;
      const ds = 1 + seed(d, 3) * 1.5;
      ctx.beginPath();
      ctx.arc(dx, dy, ds, 0, Math.PI * 2);
      ctx.fill();
    }

    // === Bar counter — left side (3D perspective) ===
    const barX = 40;
    const barY = 220;
    const barW = 180;
    const barH = 120;

    // Bar shadow on floor (soft)
    ctx.save();
    const barShadow = ctx.createRadialGradient(barX + barW / 2, barY + barH + 55, 10, barX + barW / 2, barY + barH + 55, barW * 0.65);
    barShadow.addColorStop(0, 'rgba(0,0,0,0.18)');
    barShadow.addColorStop(0.7, 'rgba(0,0,0,0.06)');
    barShadow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = barShadow;
    ctx.beginPath();
    ctx.ellipse(barX + barW / 2, barY + barH + 55, barW * 0.65, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Bar front face (3D — wider at bottom)
    ctx.fillStyle = '#2a1808';
    ctx.beginPath();
    ctx.moveTo(barX - 10, barY + barH);
    ctx.lineTo(barX + barW + 20, barY + barH);
    ctx.lineTo(barX + barW + 25, barY + barH + 60);
    ctx.lineTo(barX - 15, barY + barH + 60);
    ctx.closePath();
    ctx.fill();
    // Plank lines on bar front with slight variation
    for (let i = 0; i < 4; i++) {
      const py = barY + barH + 10 + i * 14;
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(barX - 12, py);
      ctx.quadraticCurveTo(barX + barW / 2, py + seed(i, 88) * 2 - 1, barX + barW + 25, py);
      ctx.stroke();
    }
    // Bar front wood grain (vertical grain texture)
    for (let i = 0; i < 5; i++) {
      const gx = barX - 5 + i * 42;
      ctx.strokeStyle = 'rgba(60, 40, 20, 0.12)';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(gx, barY + barH + 3);
      ctx.quadraticCurveTo(gx + seed(i, 33) * 4 - 2, barY + barH + 30, gx + 1, barY + barH + 58);
      ctx.stroke();
    }
    // Metal foot rail
    ctx.strokeStyle = '#5a4a3a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(barX - 10, barY + barH + 45);
    ctx.lineTo(barX + barW + 20, barY + barH + 45);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(barX - 10, barY + barH + 44);
    ctx.lineTo(barX + barW + 20, barY + barH + 44);
    ctx.stroke();

    // Bar counter top surface (perspective — wider at bottom)
    ctx.fillStyle = '#4a3018';
    ctx.beginPath();
    ctx.moveTo(barX, barY);
    ctx.lineTo(barX + barW, barY);
    ctx.lineTo(barX + barW + 20, barY + barH);
    ctx.lineTo(barX - 10, barY + barH);
    ctx.closePath();
    ctx.fill();

    // Wood grain on bar top
    ctx.strokeStyle = 'rgba(80,55,25,0.2)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 6; i++) {
      const gy = barY + 8 + i * 18;
      ctx.beginPath();
      ctx.moveTo(barX + 2, gy);
      ctx.quadraticCurveTo(barX + barW / 2, gy + seed(i, 44) * 3 - 1, barX + barW + 15, gy + 20);
      ctx.stroke();
    }

    // Wet ring stains on bar surface
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(barX + 55, barY + 30, 8, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(barX + 120, barY + 50, 7, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(barX + 85, barY + 70, 6, 0, Math.PI * 2); ctx.stroke();

    // Subtle reflection on bar surface
    const barReflect = ctx.createLinearGradient(barX, barY, barX, barY + 12);
    barReflect.addColorStop(0, 'rgba(255,220,150,0.05)');
    barReflect.addColorStop(1, 'rgba(255,220,150,0)');
    ctx.fillStyle = barReflect;
    ctx.fillRect(barX, barY, barW, 12);

    // Bar top edge highlight
    ctx.fillStyle = '#6a4a28';
    ctx.fillRect(barX, barY, barW, 5);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(barX, barY, barW, 2);
    // Bar top inner edge
    ctx.fillStyle = '#5a3818';
    ctx.fillRect(barX, barY + 5, barW, 2);

    // Metal tap/spigot on the bar
    const tapX = barX + barW - 30;
    const tapY = barY + 2;
    ctx.fillStyle = '#7a6a50';
    ctx.fillRect(tapX, tapY, 4, 14); // vertical pipe
    ctx.fillStyle = '#8a7a60';
    ctx.fillRect(tapX - 4, tapY, 12, 3); // top plate
    ctx.fillStyle = '#6a5a40';
    ctx.fillRect(tapX + 4, tapY + 6, 8, 3); // handle
    // Tap highlight
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(tapX, tapY, 1.5, 14);

    // Back shelf (behind bar)
    ctx.fillStyle = '#3d2510';
    ctx.fillRect(barX + 10, barY - 50, barW - 20, 6);
    ctx.fillRect(barX + 10, barY - 85, barW - 20, 6);
    // Shelf edge highlight
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fillRect(barX + 10, barY - 50, barW - 20, 1.5);
    ctx.fillRect(barX + 10, barY - 85, barW - 20, 1.5);
    // Shelf brackets (iron)
    ctx.fillStyle = '#3a3030';
    for (const bx of [barX + 25, barX + barW / 2, barX + barW - 30]) {
      ctx.fillRect(bx, barY - 50, 4, 12);
      ctx.fillRect(bx, barY - 85, 4, 12);
      // Bracket highlight
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(bx, barY - 50, 1.5, 12);
      ctx.fillStyle = '#3a3030';
    }

    // Bottles on shelf (proper shaped bottles)
    const bottleColors = ['#5a1818', '#1a4a18', '#3a1a50', '#5a4018', '#1a3a3a', '#5a2020', '#204a20'];
    const bottleWidths = [10, 9, 11, 10, 9, 10, 8];
    const bottleHeights = [20, 24, 18, 22, 20, 19, 23];
    for (let i = 0; i < 7; i++) {
      const bx = barX + 16 + i * 22;
      const row = i < 4 ? 0 : 1;
      const by = row === 0 ? barY - 80 : barY - 45;
      const bh = bottleHeights[i];
      const bwid = bottleWidths[i];
      drawBottle(bx, by, bh, bwid, bottleColors[i], true);
    }

    // Tankards on bar top (proper shaped)
    for (let i = 0; i < 3; i++) {
      const mx = barX + 30 + i * 50;
      const my = barY + 10;
      drawTankard(mx, my, 14, 18);
      // Tiny shadow under mug
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      ctx.beginPath();
      ctx.ellipse(mx + 7, my + 19, 8, 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // === Aldric behind bar (barkeep — apron, bald, beard, wiping mug) ===
    const aldricX = barX + barW / 2;
    const aldricY = barY - 30;
    drawNPC(aldricX, aldricY, {
      headColor: '#c08060', bodyColor: '#3a2a18', vestColor: '#d0c8b0',
      headR: 12, bodyW: 28, bodyH: 34, seated: false,
      npcType: 'aldric', holdingItem: 'mug'
    });
    // Aldric's towel over shoulder
    ctx.fillStyle = '#c8c0a8';
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(aldricX + 14, aldricY);
    ctx.lineTo(aldricX + 18, aldricY + 2);
    ctx.lineTo(aldricX + 16, aldricY + 18);
    ctx.lineTo(aldricX + 12, aldricY + 16);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // Apron strings (tied at back)
    ctx.strokeStyle = '#b8b098';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(aldricX - 14, aldricY + 12);
    ctx.quadraticCurveTo(aldricX - 18, aldricY + 16, aldricX - 16, aldricY + 20);
    ctx.stroke();

    // === Bessa's supply corner (right side) ===
    const bessaX = 530;
    const bessaY = 220;

    // Supply crates (3D with slats and metal brackets)
    // Back crate
    ctx.fillStyle = '#2a1a0e';
    ctx.fillRect(bessaX, bessaY + 18, 42, 38);
    // Wooden slat lines
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 0.6;
    for (let s = 0; s < 4; s++) {
      ctx.beginPath();
      ctx.moveTo(bessaX + 2, bessaY + 24 + s * 9);
      ctx.lineTo(bessaX + 40, bessaY + 24 + s * 9);
      ctx.stroke();
    }
    // Slat gaps (darker lines between planks)
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 0.5;
    for (let v = 0; v < 3; v++) {
      ctx.beginPath();
      ctx.moveTo(bessaX + 12 + v * 12, bessaY + 18);
      ctx.lineTo(bessaX + 12 + v * 12, bessaY + 56);
      ctx.stroke();
    }
    // Metal corner brackets
    ctx.fillStyle = '#5a5048';
    ctx.fillRect(bessaX - 1, bessaY + 17, 6, 6); // TL
    ctx.fillRect(bessaX + 37, bessaY + 17, 6, 6); // TR
    ctx.fillRect(bessaX - 1, bessaY + 50, 6, 6); // BL
    ctx.fillRect(bessaX + 37, bessaY + 50, 6, 6); // BR
    // Bracket highlight
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(bessaX - 1, bessaY + 17, 2, 6);
    ctx.fillRect(bessaX + 37, bessaY + 17, 2, 6);
    // Crate top
    ctx.fillStyle = '#3d2510';
    ctx.fillRect(bessaX - 1, bessaY + 16, 44, 4);

    // Front crate (slightly open)
    ctx.fillStyle = '#2a1a0e';
    ctx.fillRect(bessaX + 42, bessaY + 24, 38, 32);
    // Slat lines
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 0.6;
    for (let s = 0; s < 3; s++) {
      ctx.beginPath();
      ctx.moveTo(bessaX + 44, bessaY + 30 + s * 9);
      ctx.lineTo(bessaX + 78, bessaY + 30 + s * 9);
      ctx.stroke();
    }
    // Metal brackets on front crate
    ctx.fillStyle = '#5a5048';
    ctx.fillRect(bessaX + 41, bessaY + 23, 5, 5);
    ctx.fillRect(bessaX + 75, bessaY + 23, 5, 5);
    ctx.fillRect(bessaX + 41, bessaY + 51, 5, 5);
    ctx.fillRect(bessaX + 75, bessaY + 51, 5, 5);
    // Lid slightly ajar (angled)
    ctx.fillStyle = '#3d2510';
    ctx.save();
    ctx.translate(bessaX + 42, bessaY + 22);
    ctx.rotate(-0.12);
    ctx.fillRect(0, 0, 40, 4);
    ctx.restore();
    // Dark interior visible through gap
    ctx.fillStyle = '#0a0604';
    ctx.fillRect(bessaX + 43, bessaY + 24, 36, 5);

    // Cross straps (leather, not just lines)
    ctx.strokeStyle = '#5a3d1e';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(bessaX + 2, bessaY + 20);
    ctx.lineTo(bessaX + 40, bessaY + 54);
    ctx.moveTo(bessaX + 40, bessaY + 20);
    ctx.lineTo(bessaX + 2, bessaY + 54);
    ctx.stroke();
    // Strap highlights
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(bessaX + 3, bessaY + 19);
    ctx.lineTo(bessaX + 41, bessaY + 53);
    ctx.stroke();

    // Shelves behind Bessa (with depth shadow and grain)
    for (const shelfY of [bessaY - 30, bessaY - 65]) {
      ctx.fillStyle = '#4a3018';
      ctx.fillRect(bessaX - 10, shelfY, 110, 7);
      // Wood grain on shelf
      ctx.strokeStyle = 'rgba(80,55,25,0.2)';
      ctx.lineWidth = 0.4;
      ctx.beginPath();
      ctx.moveTo(bessaX - 8, shelfY + 3);
      ctx.quadraticCurveTo(bessaX + 45, shelfY + 4, bessaX + 98, shelfY + 3);
      ctx.stroke();
      // Shelf edge highlight
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      ctx.fillRect(bessaX - 10, shelfY, 110, 1.5);
      // Depth shadow under shelf
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(bessaX - 10, shelfY + 7, 110, 3);
    }

    // Potion bottles (proper flask shapes with wax seals and glow)
    const potionColors = ['#7a1818', '#184870', '#186a18', '#7a6018'];
    const potionShapes = [
      { w: 11, h: 24, round: true },
      { w: 10, h: 20, round: false },
      { w: 12, h: 22, round: true },
      { w: 9, h: 18, round: false },
    ];
    for (let i = 0; i < 4; i++) {
      const px = bessaX + 2 + i * 24;
      const py = bessaY - 58;
      const ps = potionShapes[i];
      const pc = potionColors[i];

      if (ps.round) {
        // Round flask shape
        const neckW = ps.w * 0.3;
        const neckH = ps.h * 0.25;
        // Neck
        ctx.fillStyle = pc;
        ctx.fillRect(px + ps.w / 2 - neckW / 2, py, neckW, neckH);
        // Round body
        ctx.beginPath();
        ctx.arc(px + ps.w / 2, py + neckH + ps.w / 2, ps.w / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Standard bottle
        drawBottle(px, py, ps.h, ps.w, pc, true);
      }

      // Cork / wax seal
      ctx.fillStyle = i % 2 === 0 ? '#8a2020' : '#6a5a3a';
      ctx.fillRect(px + ps.w / 2 - 2, py - 3, 4, 4);
      // Tiny wax drip
      if (i % 2 === 0) {
        ctx.beginPath();
        ctx.arc(px + ps.w / 2 + 2, py - 1, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Small label on some
      if (i === 1 || i === 3) {
        ctx.fillStyle = '#c8b888';
        ctx.fillRect(px + 2, py + 10, ps.w - 4, 6);
        ctx.strokeStyle = '#8a7a5a';
        ctx.lineWidth = 0.3;
        ctx.strokeRect(px + 2, py + 10, ps.w - 4, 6);
      }

      // Glass highlight
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(px + 1, py + 4, 2, ps.h - 6);

      // Potion glow (subtle colored light on shelf)
      const glowSize = 14 + Math.sin(phase * 1.5 + i * 2) * 2;
      const pGlow = ctx.createRadialGradient(px + ps.w / 2, py + ps.h / 2, 2, px + ps.w / 2, py + ps.h / 2, glowSize);
      const pr = parseInt(pc.slice(1, 3), 16);
      const pg = parseInt(pc.slice(3, 5), 16);
      const pb = parseInt(pc.slice(5, 7), 16);
      pGlow.addColorStop(0, `rgba(${pr}, ${pg}, ${pb}, 0.18)`);
      pGlow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = pGlow;
      ctx.fillRect(px - 10, py - 8, ps.w + 20, ps.h + 16);
    }

    // Misc bottles on lower shelf
    const lowerBottleColors = ['#3a2a50', '#4a3a18', '#1a3a2a'];
    for (let i = 0; i < 3; i++) {
      const lbx = bessaX + 4 + i * 28;
      drawBottle(lbx, bessaY - 24, 16 + seed(i, 77) * 6, 8, lowerBottleColors[i], true);
    }

    // Bessa figure (hooded, merchant with clasps)
    const bessaFigX = bessaX + 45;
    const bessaFigY = bessaY - 16;
    drawNPC(bessaFigX, bessaFigY, {
      headColor: '#b08060', bodyColor: '#3a2820', vestColor: '#4a3828',
      headR: 10, bodyW: 22, bodyH: 30, seated: false,
      npcType: 'bessa'
    });
    // Deep hood (drawn over head)
    ctx.fillStyle = '#2a1c14';
    ctx.beginPath();
    ctx.moveTo(bessaFigX - 14, bessaFigY - 8);
    ctx.quadraticCurveTo(bessaFigX - 16, bessaFigY - 22, bessaFigX, bessaFigY - 28);
    ctx.quadraticCurveTo(bessaFigX + 16, bessaFigY - 22, bessaFigX + 14, bessaFigY - 8);
    ctx.closePath();
    ctx.fill();
    // Hood edge highlight
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(bessaFigX - 13, bessaFigY - 8);
    ctx.quadraticCurveTo(bessaFigX, bessaFigY - 27, bessaFigX + 13, bessaFigY - 8);
    ctx.stroke();
    // Hood drape sides
    ctx.fillStyle = '#2a1c14';
    ctx.fillRect(bessaFigX - 14, bessaFigY - 8, 5, 14);
    ctx.fillRect(bessaFigX + 9, bessaFigY - 8, 5, 14);
    // Cloak clasps (two metal circles at chest)
    ctx.fillStyle = '#8a7a5a';
    ctx.beginPath(); ctx.arc(bessaFigX - 5, bessaFigY + 4, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(bessaFigX + 5, bessaFigY + 4, 2.5, 0, Math.PI * 2); ctx.fill();
    // Clasp highlights
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath(); ctx.arc(bessaFigX - 5.5, bessaFigY + 3.5, 1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(bessaFigX + 4.5, bessaFigY + 3.5, 1, 0, Math.PI * 2); ctx.fill();
    // Chain between clasps
    ctx.strokeStyle = '#8a7a5a';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(bessaFigX - 3, bessaFigY + 4);
    ctx.quadraticCurveTo(bessaFigX, bessaFigY + 7, bessaFigX + 3, bessaFigY + 4);
    ctx.stroke();

    // === Mira at table with maps (lower left) ===
    const miraTableX = 60;
    const miraTableY = 380;
    drawTable(miraTableX, miraTableY, 100, 45, true);

    // Maps / parchments on table (with curled edges)
    // Main map (large, slightly curled)
    ctx.fillStyle = '#5a4a32';
    ctx.beginPath();
    ctx.moveTo(miraTableX + 8, miraTableY + 8);
    ctx.lineTo(miraTableX + 40, miraTableY + 6);
    ctx.quadraticCurveTo(miraTableX + 42, miraTableY + 14, miraTableX + 40, miraTableY + 26);
    ctx.lineTo(miraTableX + 8, miraTableY + 28);
    ctx.quadraticCurveTo(miraTableX + 6, miraTableY + 20, miraTableX + 8, miraTableY + 8);
    ctx.closePath();
    ctx.fill();
    // Map lines (terrain markings)
    ctx.strokeStyle = '#3a2a18';
    ctx.lineWidth = 0.4;
    ctx.beginPath();
    ctx.moveTo(miraTableX + 12, miraTableY + 14);
    ctx.lineTo(miraTableX + 36, miraTableY + 12);
    ctx.moveTo(miraTableX + 14, miraTableY + 20);
    ctx.lineTo(miraTableX + 32, miraTableY + 19);
    ctx.stroke();
    // X mark on map
    ctx.strokeStyle = '#8a2020';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(miraTableX + 24, miraTableY + 13); ctx.lineTo(miraTableX + 28, miraTableY + 17);
    ctx.moveTo(miraTableX + 28, miraTableY + 13); ctx.lineTo(miraTableX + 24, miraTableY + 17);
    ctx.stroke();

    // Second parchment (angled, smaller)
    ctx.save();
    ctx.translate(miraTableX + 60, miraTableY + 14);
    ctx.rotate(0.15);
    ctx.fillStyle = '#4a3a22';
    ctx.beginPath();
    ctx.moveTo(-15, -10);
    ctx.lineTo(14, -10);
    ctx.quadraticCurveTo(16, -4, 14, 10);
    ctx.lineTo(-14, 10);
    ctx.quadraticCurveTo(-16, -2, -15, -10);
    ctx.closePath();
    ctx.fill();
    // Text lines on scroll
    ctx.fillStyle = '#1a1208';
    ctx.fillRect(-11, -6, 18, 0.8);
    ctx.fillRect(-11, -2, 14, 0.8);
    ctx.fillRect(-11, 2, 16, 0.8);
    ctx.fillRect(-11, 6, 10, 0.8);
    ctx.restore();

    // Ink well (proper 3D pot)
    ctx.fillStyle = '#1a1a2a';
    ctx.beginPath();
    ctx.moveTo(miraTableX + 79, miraTableY + 10);
    ctx.lineTo(miraTableX + 89, miraTableY + 10);
    ctx.lineTo(miraTableX + 88, miraTableY + 20);
    ctx.lineTo(miraTableX + 80, miraTableY + 20);
    ctx.closePath();
    ctx.fill();
    // Ink well rim
    ctx.fillStyle = '#2a2a40';
    ctx.beginPath();
    ctx.ellipse(miraTableX + 84, miraTableY + 10, 6, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Ink surface
    ctx.fillStyle = '#0a0a18';
    ctx.beginPath();
    ctx.ellipse(miraTableX + 84, miraTableY + 10, 4, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Shadow under table items
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    ctx.beginPath();
    ctx.ellipse(miraTableX + 24, miraTableY + 30, 18, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Mira figure (seated, blue scholar's tunic with belt, holding quill)
    const miraX = miraTableX + 50;
    const miraY = miraTableY - 12;
    drawNPC(miraX, miraY, {
      headColor: '#a08060', bodyColor: '#1e3040', vestColor: '#2a3a4a',
      headR: 10, bodyW: 22, bodyH: 26, seated: true,
      npcType: 'mira', holdingItem: 'quill'
    });

    // === Notice Board on back wall (center) — weathered oak ===
    const nbX = 330;
    const nbY = 90;
    const nbW = 120;
    const nbH = 70;
    // Board shadow on wall (layered)
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(nbX + 5, nbY + 5, nbW, nbH);
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.fillRect(nbX + 3, nbY + 3, nbW, nbH);

    // Board body (weathered wood)
    ctx.fillStyle = '#2a1808';
    ctx.fillRect(nbX, nbY, nbW, nbH);
    // Vertical planks
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.lineWidth = 0.6;
    for (let p = 1; p < 4; p++) {
      ctx.beginPath();
      ctx.moveTo(nbX + p * (nbW / 4), nbY + 2);
      ctx.lineTo(nbX + p * (nbW / 4), nbY + nbH - 2);
      ctx.stroke();
    }
    // Wood grain on board
    ctx.strokeStyle = 'rgba(60,40,20,0.15)';
    ctx.lineWidth = 0.4;
    for (let g = 0; g < 5; g++) {
      const gy = nbY + 8 + g * 13;
      ctx.beginPath();
      ctx.moveTo(nbX + 3, gy);
      ctx.quadraticCurveTo(nbX + nbW / 2, gy + seed(g, 55) * 3, nbX + nbW - 3, gy);
      ctx.stroke();
    }
    // Knot in wood
    ctx.fillStyle = '#1e1206';
    ctx.beginPath();
    ctx.ellipse(nbX + 28, nbY + 52, 4, 3, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(40,25,10,0.3)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.ellipse(nbX + 28, nbY + 52, 6, 4.5, 0.3, 0, Math.PI * 2);
    ctx.stroke();
    // Second knot
    ctx.fillStyle = '#1e1206';
    ctx.beginPath();
    ctx.ellipse(nbX + 95, nbY + 25, 3, 2.5, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Frame (thicker, aged)
    ctx.strokeStyle = '#5a3d20';
    ctx.lineWidth = 3;
    ctx.strokeRect(nbX, nbY, nbW, nbH);
    // Inner frame bevel
    ctx.strokeStyle = '#3d2510';
    ctx.lineWidth = 1;
    ctx.strokeRect(nbX + 3, nbY + 3, nbW - 6, nbH - 6);
    // Frame corner bolts (metallic)
    for (const [nx, ny] of [[nbX + 6, nbY + 6], [nbX + nbW - 6, nbY + 6], [nbX + 6, nbY + nbH - 6], [nbX + nbW - 6, nbY + nbH - 6]]) {
      ctx.fillStyle = '#777';
      ctx.beginPath(); ctx.arc(nx, ny, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#999';
      ctx.beginPath(); ctx.arc(nx - 0.5, ny - 0.5, 1.5, 0, Math.PI * 2); ctx.fill();
      // Bolt slot
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.moveTo(nx - 1.5, ny - 1.5); ctx.lineTo(nx + 1.5, ny + 1.5); ctx.stroke();
    }

    // Pinned parchments (varied sizes, some overlapping, curled edges)
    const notes = [
      { x: nbX + 10, y: nbY + 14, w: 38, h: 28, rot: -0.05, hasWax: true },
      { x: nbX + 52, y: nbY + 12, w: 28, h: 30, rot: 0.08, hasWax: false },
      { x: nbX + 22, y: nbY + 38, w: 42, h: 22, rot: -0.03, hasWax: false },
      { x: nbX + 68, y: nbY + 35, w: 32, h: 25, rot: 0.04, hasWax: true },
      { x: nbX + 84, y: nbY + 14, w: 26, h: 20, rot: -0.02, hasWax: false },
    ];
    for (let ni = 0; ni < notes.length; ni++) {
      const note = notes[ni];
      ctx.save();
      ctx.translate(note.x + note.w / 2, note.y + note.h / 2);
      ctx.rotate(note.rot);
      // Parchment shadow
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(-note.w / 2 + 2, -note.h / 2 + 2, note.w, note.h);
      // Parchment body with curled bottom edge
      ctx.fillStyle = '#5a4a32';
      ctx.beginPath();
      ctx.moveTo(-note.w / 2, -note.h / 2);
      ctx.lineTo(note.w / 2, -note.h / 2);
      ctx.lineTo(note.w / 2, note.h / 2 - 3);
      ctx.quadraticCurveTo(note.w / 2 - 4, note.h / 2 + 2, note.w / 2 - 8, note.h / 2);
      ctx.lineTo(-note.w / 2 + 5, note.h / 2);
      ctx.quadraticCurveTo(-note.w / 2 + 1, note.h / 2 + 1, -note.w / 2, note.h / 2 - 2);
      ctx.closePath();
      ctx.fill();
      // Inner parchment (lighter center)
      ctx.fillStyle = '#4a3a22';
      ctx.fillRect(-note.w / 2 + 2, -note.h / 2 + 2, note.w - 4, note.h - 5);
      // Aged edge staining
      ctx.fillStyle = 'rgba(40, 30, 15, 0.15)';
      ctx.fillRect(-note.w / 2, -note.h / 2, note.w, 2);
      ctx.fillRect(-note.w / 2, -note.h / 2, 2, note.h);
      ctx.fillRect(note.w / 2 - 2, -note.h / 2, 2, note.h);

      // Pin (iron nail)
      ctx.fillStyle = '#888';
      ctx.beginPath();
      ctx.arc(0, -note.h / 2 + 3, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#aaa';
      ctx.beginPath();
      ctx.arc(-0.5, -note.h / 2 + 2.5, 1.2, 0, Math.PI * 2);
      ctx.fill();

      // Wax seal on some
      if (note.hasWax) {
        const sealX = seed(ni, 77) * 10 - 5;
        const sealY = note.h / 2 - 8;
        ctx.fillStyle = '#8a2020';
        ctx.beginPath(); ctx.arc(sealX, sealY, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#a03030';
        ctx.beginPath(); ctx.arc(sealX - 0.5, sealY - 0.5, 2.5, 0, Math.PI * 2); ctx.fill();
        // Stamp impression
        ctx.strokeStyle = '#6a1010';
        ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(sealX - 2, sealY); ctx.lineTo(sealX + 2, sealY); ctx.stroke();
      }

      // Text lines (varied length)
      ctx.fillStyle = '#1a1208';
      const lineCount = Math.floor(note.h / 6) - 1;
      for (let li = 0; li < lineCount; li++) {
        const lw = note.w - 10 - seed(li + note.x, note.y) * 14;
        if (lw > 4) {
          ctx.fillRect(-note.w / 2 + 5, -note.h / 2 + 8 + li * 5, lw, 0.8);
        }
      }
      ctx.restore();
    }
    // "NOTICE BOARD" label
    ctx.textAlign = 'center';
    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = '#000';
    ctx.fillText('NOTICE BOARD', nbX + nbW / 2 + 1, nbY - 3);
    ctx.fillStyle = '#C4A265';
    ctx.fillText('NOTICE BOARD', nbX + nbW / 2, nbY - 4);
    ctx.textAlign = 'left';

    // === Orin Vane at table (center-right, seated, arm in sling) ===
    const orinTableX = 380;
    const orinTableY = 380;
    drawTable(orinTableX, orinTableY, 80, 42, true);
    // Tankard on table
    drawTankard(orinTableX + 15, orinTableY + 6, 12, 16);
    // Shadow under tankard
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    ctx.beginPath();
    ctx.ellipse(orinTableX + 21, orinTableY + 23, 7, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Orin figure (seated, arm in sling, leather armor with stitching)
    const orinX = orinTableX + 55;
    const orinY = orinTableY - 10;
    drawNPC(orinX, orinY, {
      headColor: '#b08060', bodyColor: '#4a3020', vestColor: '#5a3818',
      headR: 11, bodyW: 24, bodyH: 28, sling: true, seated: true,
      npcType: 'orin'
    });
    // Leather armor stitching on Orin
    ctx.strokeStyle = 'rgba(160,120,60,0.3)';
    ctx.lineWidth = 0.5;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(orinX - 10, orinY + 4); ctx.lineTo(orinX - 10, orinY + 22);
    ctx.moveTo(orinX + 10, orinY + 4); ctx.lineTo(orinX + 10, orinY + 22);
    ctx.stroke();
    ctx.setLineDash([]);
    // Armor shoulder pauldron (left — visible one)
    ctx.fillStyle = '#5a3818';
    ctx.beginPath();
    ctx.ellipse(orinX - 14, orinY + 3, 7, 5, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(160,120,60,0.2)';
    ctx.lineWidth = 0.4;
    ctx.stroke();

    // === Table Seven (Elden or empty chair) — lower right ===
    const t7X = 590;
    const t7Y = 390;

    // Round table with soft shadow
    ctx.save();
    const t7Shadow = ctx.createRadialGradient(t7X + 30, t7Y + 38, 4, t7X + 30, t7Y + 38, 35);
    t7Shadow.addColorStop(0, 'rgba(0,0,0,0.16)');
    t7Shadow.addColorStop(0.7, 'rgba(0,0,0,0.05)');
    t7Shadow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = t7Shadow;
    ctx.beginPath();
    ctx.ellipse(t7X + 30, t7Y + 38, 35, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Table leg (turned wood with decorative rings)
    ctx.fillStyle = '#2a1808';
    ctx.fillRect(t7X + 26, t7Y + 20, 8, 22);
    // Leg detail rings
    ctx.fillStyle = '#3d2510';
    ctx.fillRect(t7X + 25, t7Y + 25, 10, 2);
    ctx.fillRect(t7X + 25, t7Y + 34, 10, 2);
    // Leg highlight
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fillRect(t7X + 26, t7Y + 20, 2, 22);

    // Table top (ellipse)
    ctx.fillStyle = '#3d2510';
    ctx.beginPath();
    ctx.ellipse(t7X + 30, t7Y + 10, 35, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4a3018';
    ctx.beginPath();
    ctx.ellipse(t7X + 30, t7Y + 8, 33, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    // Wood grain on round table
    ctx.strokeStyle = 'rgba(80,55,25,0.15)';
    ctx.lineWidth = 0.4;
    ctx.beginPath();
    ctx.ellipse(t7X + 30, t7Y + 8, 20, 8, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(t7X + 30, t7Y + 8, 10, 4, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Chair (3D with slats)
    ctx.fillStyle = '#3d2510';
    ctx.fillRect(t7X + 52, t7Y + 18, 18, 28);
    // Chair seat highlight
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    ctx.fillRect(t7X + 52, t7Y + 18, 18, 3);
    // Chair back (with vertical slats)
    ctx.fillStyle = '#4a3018';
    ctx.fillRect(t7X + 53, t7Y - 8, 16, 28);
    ctx.strokeStyle = '#3d2510';
    ctx.lineWidth = 0.8;
    // Slat dividers
    ctx.beginPath();
    ctx.moveTo(t7X + 58, t7Y - 6); ctx.lineTo(t7X + 58, t7Y + 18);
    ctx.moveTo(t7X + 64, t7Y - 6); ctx.lineTo(t7X + 64, t7Y + 18);
    ctx.stroke();
    // Chair back top rail
    ctx.fillStyle = '#5a3d20';
    ctx.fillRect(t7X + 52, t7Y - 8, 18, 3);

    if (fragments >= 2) {
      // Elden's ghostly figure — ethereal, translucent
      const eldenAlpha = 0.35 + Math.sin(this.flickerPhase * 0.8) * 0.1;
      ctx.globalAlpha = eldenAlpha;
      drawNPC(t7X + 62, t7Y - 4, {
        headColor: '#8888CC', bodyColor: '#6666AA', vestColor: '#7777BB',
        headR: 9, bodyW: 18, bodyH: 24, seated: true,
        npcType: 'elden'
      });
      // Ghostly aura (pulsing)
      const ghostGlow = ctx.createRadialGradient(t7X + 62, t7Y + 5, 5, t7X + 62, t7Y + 5, 45);
      ghostGlow.addColorStop(0, 'rgba(130, 130, 200, 0.18)');
      ghostGlow.addColorStop(0.5, 'rgba(130, 130, 200, 0.06)');
      ghostGlow.addColorStop(1, 'rgba(130, 130, 200, 0)');
      ctx.fillStyle = ghostGlow;
      ctx.fillRect(t7X + 17, t7Y - 40, 90, 90);
      // Ghostly tankard on table
      ctx.fillStyle = 'rgba(136, 136, 204, 0.4)';
      ctx.fillRect(t7X + 20, t7Y + 2, 10, 12);
      ctx.fillStyle = 'rgba(170, 170, 230, 0.3)';
      ctx.beginPath();
      ctx.ellipse(t7X + 25, t7Y + 2, 5, 2, 0, 0, Math.PI * 2);
      ctx.fill();
      // Wispy particles around Elden
      ctx.fillStyle = 'rgba(150, 150, 220, 0.25)';
      for (let ep = 0; ep < 4; ep++) {
        const epx = t7X + 52 + Math.sin(phase * 0.5 + ep * 1.8) * 18;
        const epy = t7Y - 10 + Math.cos(phase * 0.4 + ep * 2.3) * 15;
        ctx.beginPath();
        ctx.arc(epx, epy, 1 + seed(ep, 99) * 1, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;
    }

    // === Hotspot indicators (NPC labels + selection highlight) ===
    for (let i = 0; i < hotspots.length; i++) {
      const spot = hotspots[i];
      const isSelected = i === this.selectedHotspot && this.focusArea !== 'bar';

      // Selection glow
      if (isSelected) {
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 3]);
        ctx.strokeRect(spot.x - 4, spot.y - 4, spot.w + 8, spot.h + 8);
        ctx.setLineDash([]);

        // Glow effect
        const glow = ctx.createRadialGradient(
          spot.x + spot.w / 2, spot.y + spot.h / 2, 10,
          spot.x + spot.w / 2, spot.y + spot.h / 2, 60
        );
        glow.addColorStop(0, 'rgba(255, 215, 0, 0.08)');
        glow.addColorStop(1, 'rgba(255, 215, 0, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(spot.x - 30, spot.y - 30, spot.w + 60, spot.h + 60);
      }

      // Label above hotspot
      ctx.textAlign = 'center';
      ctx.font = isSelected ? 'bold 12px monospace' : '11px monospace';
      ctx.fillStyle = '#000';
      ctx.fillText(spot.label, spot.x + spot.w / 2 + 1, spot.y - 8);
      ctx.fillStyle = isSelected ? '#FFD700' : '#C4A265';
      ctx.fillText(spot.label, spot.x + spot.w / 2, spot.y - 9);

      // Sublabel
      if (isSelected) {
        ctx.font = '10px monospace';
        ctx.fillStyle = '#8B7355';
        ctx.fillText(spot.sublabel, spot.x + spot.w / 2, spot.y + spot.h + 14);
      }

      // Register touch zone
      if (world.input && world.input.touch) {
        world.input.touch.registerHitZone(spot.x, spot.y, spot.w, spot.h, `_hubSpot_${i}`);
      }
    }

    // === Party indicator (top right) ===
    const partyCount = world.party.getMembers().length;
    ctx.textAlign = 'right';
    ctx.font = '12px monospace';
    ctx.fillStyle = partyCount > 0 ? '#4CAF50' : '#8B7355';
    ctx.fillText(`Party: ${partyCount}/4`, w - 20, 78);
    ctx.textAlign = 'left';

    // === Gold indicator ===
    ctx.textAlign = 'right';
    ctx.font = '12px monospace';
    ctx.fillStyle = '#FFD700';
    ctx.fillText(`Gold: ${world.gold}`, w - 20, 94);
    ctx.textAlign = 'left';

    // === Bottom bar ===
    const buttons = this._hubBarButtons(world);
    this._drawTouchBar(ctx, w, h, world, buttons, this.focusArea === 'bar' ? this.selectedBarButton : -1);
  }

  // --- Roster Screen (main landing) ---

  _renderRoster(ctx, world) {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    const roster = world.roster.getAll();

    // Dark parchment background overlay
    ctx.fillStyle = 'rgba(15, 8, 3, 0.75)';
    ctx.fillRect(0, 60, w, h - 110);
    // Top edge line — worn parchment border
    ctx.strokeStyle = '#5a3d20';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20, 62);
    ctx.lineTo(w - 20, 62);
    ctx.stroke();
    // Bottom edge
    ctx.beginPath();
    ctx.moveTo(20, h - 52);
    ctx.lineTo(w - 20, h - 52);
    ctx.stroke();
    // Corner ornaments
    const cornerSize = 12;
    const ornamentColor = '#6b4e2a';
    ctx.strokeStyle = ornamentColor;
    ctx.lineWidth = 2;
    // Top-left
    ctx.beginPath(); ctx.moveTo(20, 62 + cornerSize); ctx.lineTo(20, 62); ctx.lineTo(20 + cornerSize, 62); ctx.stroke();
    // Top-right
    ctx.beginPath(); ctx.moveTo(w - 20 - cornerSize, 62); ctx.lineTo(w - 20, 62); ctx.lineTo(w - 20, 62 + cornerSize); ctx.stroke();
    // Bottom-left
    ctx.beginPath(); ctx.moveTo(20, h - 52 - cornerSize); ctx.lineTo(20, h - 52); ctx.lineTo(20 + cornerSize, h - 52); ctx.stroke();
    // Bottom-right
    ctx.beginPath(); ctx.moveTo(w - 20 - cornerSize, h - 52); ctx.lineTo(w - 20, h - 52); ctx.lineTo(w - 20, h - 52 - cornerSize); ctx.stroke();

    // Draw torch sconces
    this._drawTorchSconce(ctx, 50, 80);
    this._drawTorchSconce(ctx, w - 50, 80);

    // Header with decorative border
    ctx.textAlign = 'center';
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = '#000';
    ctx.fillText('ADVENTURERS FOR HIRE', w / 2 + 1, 83);
    ctx.fillStyle = '#E8D5B0';
    ctx.fillText('ADVENTURERS FOR HIRE', w / 2, 82);
    // Decorative divider
    ctx.fillStyle = '#6b5030';
    ctx.fillText('═══════════════════════════', w / 2, 96);
    ctx.textAlign = 'left';

    // Party count indicator (top right area)
    const partyCount = world.party.getMembers().length;
    const partyBadgeX = w - 120;
    const partyBadgeY = 72;
    ctx.fillStyle = 'rgba(20, 12, 6, 0.9)';
    ctx.fillRect(partyBadgeX, partyBadgeY, 100, 24);
    ctx.strokeStyle = partyCount >= 4 ? '#4CAF50' : '#C4A265';
    ctx.lineWidth = 1;
    ctx.strokeRect(partyBadgeX, partyBadgeY, 100, 24);
    ctx.textAlign = 'center';
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = partyCount >= 4 ? '#4CAF50' : '#C4A265';
    ctx.fillText(`PARTY ${partyCount}/4`, partyBadgeX + 50, partyBadgeY + 16);
    ctx.textAlign = 'left';

    // Character cards — scrollable window of up to 4 visible
    const cardW = 160;
    const cardH = 380;
    const gap = 16;
    const maxVisible = 4;
    const totalCards = roster.length + 1; // +1 for "Create Custom"
    const visibleCount = Math.min(maxVisible, totalCards);
    const totalW = visibleCount * cardW + (visibleCount - 1) * gap;
    const startX = (w - totalW) / 2;
    const startY = 106;

    // Determine scroll offset to keep selected card visible
    const scrollStart = Math.max(0, Math.min(this.selectedCharacter - Math.floor(maxVisible / 2), totalCards - visibleCount));

    // Draw left arrow indicator if scrolled — pulsing chevron
    if (scrollStart > 0) {
      const pulse = 0.6 + 0.4 * Math.sin(Date.now() / 400);
      ctx.globalAlpha = pulse;
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 28px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('◄', startX - 24, startY + cardH / 2);
      ctx.textAlign = 'left';
      ctx.globalAlpha = 1;
      world.needsRender = true;
    }

    // Draw visible cards + register touch hit zones
    for (let vi = 0; vi < visibleCount; vi++) {
      const ci = scrollStart + vi;
      const x = startX + vi * (cardW + gap);
      const selected = ci === this.selectedCharacter;

      if (ci < roster.length) {
        const char = roster[ci];
        // Check if this is the hero character
        const isHero = world.heroCharacter && (char === world.heroCharacter ||
          (char.name === world.heroCharacter.name && char.class === world.heroCharacter.class));
        this._drawRosterCard(ctx, char, x, startY, cardW, cardH, selected, isHero);
      } else {
        this._drawCustomCard(ctx, x, startY, cardW, cardH, selected);
      }

      // Register touch zone for this card
      if (world.input && world.input.touch) {
        if (ci === this.selectedCharacter) {
          // Tapping selected card = recruit (Space)
          world.input.touch.registerHitZone(x, startY, cardW, cardH, 'Space');
        } else {
          // Tapping unselected card = select it (arrow key to that index)
          world.input.touch.registerHitZone(x, startY, cardW, cardH, `_selectCard_${ci}`);
        }
      }
    }

    // Draw right arrow indicator if more cards to the right — pulsing chevron
    if (scrollStart + visibleCount < totalCards) {
      const pulse = 0.6 + 0.4 * Math.sin(Date.now() / 400);
      ctx.globalAlpha = pulse;
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 28px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('►', startX + totalW + 24, startY + cardH / 2);
      ctx.textAlign = 'left';
      ctx.globalAlpha = 1;
      world.needsRender = true;
    }

    // Show recruited indicator on cards already in party
    for (let vi = 0; vi < visibleCount; vi++) {
      const ci = scrollStart + vi;
      const x = startX + vi * (cardW + gap);
      const charInParty = ci < roster.length && (world.party.getMembers().includes(roster[ci]) ||
        world.party.getMembers().some(m => m.name === roster[ci].name && m.class === roster[ci].class));
      if (charInParty) {
        // Draw "IN PARTY" overlay with shield icon
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(x, startY, cardW, cardH);
        // Green banner across center
        ctx.fillStyle = 'rgba(39, 174, 96, 0.85)';
        ctx.fillRect(x, startY + cardH / 2 - 18, cardW, 36);
        ctx.strokeStyle = '#2ECC71';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, startY + cardH / 2 - 18, cardW, 36);
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 13px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('✓ IN PARTY', x + cardW / 2, startY + cardH / 2 + 5);
        ctx.textAlign = 'left';
      }
    }

    // H-4: Flash "ALREADY IN PARTY" on failed recruit attempt
    if (this._recruitFailFlash && Date.now() - this._recruitFailFlash < 1000) {
      const flashAge = Date.now() - this._recruitFailFlash;
      const flashAlpha = Math.max(0, 1 - flashAge / 1000);
      ctx.globalAlpha = flashAlpha;
      // Red banner flash
      ctx.fillStyle = 'rgba(192, 57, 43, 0.9)';
      ctx.fillRect(w / 2 - 160, startY + cardH + 26, 320, 32);
      ctx.strokeStyle = '#E74C3C';
      ctx.lineWidth = 2;
      ctx.strokeRect(w / 2 - 160, startY + cardH + 26, 320, 32);
      ctx.fillStyle = '#FFF';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('⚠ ALREADY IN PARTY!', w / 2, startY + cardH + 47);
      ctx.textAlign = 'left';
      ctx.globalAlpha = 1;
      world.needsRender = true; // Keep rendering until flash fades
    }

    // Bottom bar — touch-friendly buttons (use shared method for consistency)
    const buttons = this._rosterBarButtons(partyCount);
    this._drawTouchBar(ctx, w, h, world, buttons, this.focusArea === 'bar' ? this.selectedBarButton : -1);
  }

  // --- Roster Card (enhanced character card with class colors, hero badge) ---
  _drawRosterCard(ctx, char, x, y, w, h, selected, isHero) {
    const classInfo = CLASS_INSIGHTS[char.class] || CLASS_INSIGHTS.fighter;
    const classData = CLASS_DATA[char.class];

    // Class color mapping for border accent
    const classColors = {
      fighter: '#C0392B', ranger: '#27AE60', mage: '#8E44AD',
      cleric: '#F1C40F', rogue: '#2C3E50', paladin: '#D4AC0D'
    };
    const classColor = classColors[char.class] || '#C4A265';

    // Card background — dark parchment with class-tinted edge
    if (selected) {
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 24;
    }
    ctx.fillStyle = selected ? '#3a2a18' : '#2a1c10';
    ctx.fillRect(x, y, w, h);
    ctx.shadowBlur = 0;

    // Card border — gold when selected, class-colored accent otherwise
    ctx.strokeStyle = selected ? '#FFD700' : '#5a3d20';
    ctx.lineWidth = selected ? 3 : 2;
    ctx.strokeRect(x, y, w, h);

    // Inner border (double-line frame)
    ctx.strokeStyle = selected ? 'rgba(255, 215, 0, 0.3)' : 'rgba(90, 61, 32, 0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 4, y + 4, w - 8, h - 8);

    // Class color accent — thin strip at top of card
    ctx.fillStyle = classColor;
    ctx.fillRect(x + 5, y + 5, w - 10, 3);

    // Portrait — BIG (fills card width)
    const portraitSize = w - 20;
    const portraitX = x + 10;
    const portraitY = y + 14;
    const portrait = char.portrait ? this.assets.get(char.portrait) : null;

    // Portrait frame background
    ctx.fillStyle = '#1a0e06';
    ctx.fillRect(portraitX - 2, portraitY - 2, portraitSize + 4, portraitSize + 4);

    if (portrait) {
      ctx.drawImage(portrait, portraitX, portraitY, portraitSize, portraitSize);
    } else {
      // Fallback — class-colored silhouette with icon
      const grad = ctx.createLinearGradient(portraitX, portraitY, portraitX, portraitY + portraitSize);
      grad.addColorStop(0, classColor);
      grad.addColorStop(1, '#1a0e06');
      ctx.fillStyle = grad;
      ctx.fillRect(portraitX, portraitY, portraitSize, portraitSize);
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(portraitX, portraitY, portraitSize, portraitSize);
      ctx.fillStyle = '#FFF';
      ctx.font = '60px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(classInfo.icon, portraitX + portraitSize / 2, portraitY + portraitSize / 2 + 20);
      ctx.textAlign = 'left';
    }

    // Portrait frame border
    ctx.strokeStyle = selected ? '#FFD700' : '#6b4e2a';
    ctx.lineWidth = 2;
    ctx.strokeRect(portraitX - 2, portraitY - 2, portraitSize + 4, portraitSize + 4);

    // Role badge (top-right corner of portrait)
    const badgeW = 64;
    const badgeH = 20;
    const badgeX = portraitX + portraitSize - badgeW + 2;
    const badgeY = portraitY;
    ctx.fillStyle = classColor;
    ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
    // Badge border
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${classInfo.icon} ${classInfo.role}`, badgeX + badgeW / 2, badgeY + 14);
    ctx.textAlign = 'left';

    // Hero badge (top-left corner of portrait)
    if (isHero) {
      const heroBW = 50;
      const heroBH = 20;
      ctx.fillStyle = '#FFD700';
      ctx.fillRect(portraitX, portraitY, heroBW, heroBH);
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 1;
      ctx.strokeRect(portraitX, portraitY, heroBW, heroBH);
      ctx.fillStyle = '#1a0e06';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('★ HERO', portraitX + heroBW / 2, portraitY + 14);
      ctx.textAlign = 'left';
    }

    // Character name with text shadow
    const nameY = portraitY + portraitSize + 18;
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.fillText(char.name, x + w / 2 + 1, nameY + 1);
    ctx.fillStyle = selected ? '#FFD700' : '#E8D5B0';
    ctx.fillText(char.name, x + w / 2, nameY);

    // Class + Level with class color
    ctx.font = '11px monospace';
    ctx.fillStyle = classColor;
    ctx.fillText(`${classData.name} · L${char.level}`, x + w / 2, nameY + 16);
    ctx.textAlign = 'left';

    // HP bar (enhanced with gradient fill)
    const barStartY = nameY + 26;
    const barX = x + 12;
    const barW = w - 24;
    const barH = 8;
    const barGap = 16;

    this._drawEnhancedBar(ctx, barX, barStartY, barW, barH, 'HP',
      char.currentHP, char.maxHP, '#600', '#22AA22', '#33DD33');

    // Mana bar
    if (char.maxMana > 0) {
      this._drawEnhancedBar(ctx, barX, barStartY + barGap, barW, barH, 'MP',
        char.currentMana, char.maxMana, '#224', '#3355CC', '#5577EE');
    }

    // Key stats row
    const statsY = barStartY + barGap * 2 + 8;
    ctx.font = 'bold 11px monospace';

    const stats = [
      { label: 'STR', val: char.stats.str },
      { label: 'DEX', val: char.stats.dex },
      { label: 'CON', val: char.stats.con },
    ];
    const stats2 = [
      { label: 'INT', val: char.stats.int },
      { label: 'WIS', val: char.stats.wis },
      { label: 'CHA', val: char.stats.cha },
    ];

    stats.forEach((s, i) => {
      const sx = barX + i * (barW / 3);
      const highlight = s.val >= 14 ? '#E8D5B0' : '#9B8765';
      ctx.fillStyle = '#000';
      ctx.fillText(`${s.label}:${s.val}`, sx + 1, statsY + 1);
      ctx.fillStyle = highlight;
      ctx.fillText(`${s.label}:${s.val}`, sx, statsY);
    });
    stats2.forEach((s, i) => {
      const sx = barX + i * (barW / 3);
      const highlight = s.val >= 14 ? '#E8D5B0' : '#9B8765';
      ctx.fillStyle = '#000';
      ctx.fillText(`${s.label}:${s.val}`, sx + 1, statsY + 15);
      ctx.fillStyle = highlight;
      ctx.fillText(`${s.label}:${s.val}`, sx, statsY + 14);
    });

    // AC + Weapon
    const infoY = statsY + 30;
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#000';
    ctx.fillText(`AC:${char.getAC()} | ${char.getWeaponDamage()}`, x + w / 2 + 1, infoY + 1);
    ctx.fillStyle = '#C4A265';
    ctx.fillText(`AC:${char.getAC()} | ${char.getWeaponDamage()}`, x + w / 2, infoY);

    // "Best at" insight
    ctx.font = '10px monospace';
    ctx.fillStyle = '#000';
    ctx.fillText(classInfo.best, x + w / 2 + 1, infoY + 15);
    ctx.fillStyle = '#9B8765';
    ctx.fillText(classInfo.best, x + w / 2, infoY + 14);
    ctx.textAlign = 'left';
  }

  // --- Enhanced stat bar with gradient fill ---
  _drawEnhancedBar(ctx, x, y, w, h, label, current, max, bgColor, fillColor, fillHighlight) {
    const pct = Math.max(0, Math.min(1, current / max));

    // Label
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = '#000';
    ctx.fillText(label, x + 1, y);
    ctx.fillStyle = '#C4A265';
    ctx.fillText(label, x, y - 1);

    // Value
    ctx.textAlign = 'right';
    ctx.fillStyle = '#000';
    ctx.fillText(`${current}/${max}`, x + w + 1, y);
    ctx.fillStyle = '#C4A265';
    ctx.fillText(`${current}/${max}`, x + w, y - 1);
    ctx.textAlign = 'left';

    // Bar background
    ctx.fillStyle = bgColor;
    ctx.fillRect(x, y + 2, w, h);

    // Gradient fill
    if (pct > 0) {
      const grad = ctx.createLinearGradient(x, y + 2, x, y + 2 + h);
      grad.addColorStop(0, fillHighlight);
      grad.addColorStop(1, fillColor);
      ctx.fillStyle = grad;
      ctx.fillRect(x, y + 2, w * pct, h);
    }

    // Bar border
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y + 2, w, h);

    // Subtle shine line at top of fill
    if (pct > 0.05) {
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(x + 1, y + 3, w * pct - 2, 2);
    }
  }

  _drawCharacterCard(ctx, char, x, y, w, h, selected) {
    const classInfo = CLASS_INSIGHTS[char.class] || CLASS_INSIGHTS.fighter;
    const classData = CLASS_DATA[char.class];

    // Card background — parchment
    if (selected) {
      // Golden glow behind selected card
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 20;
    }
    ctx.fillStyle = selected ? '#3a2a18' : '#2a1c10';
    ctx.fillRect(x, y, w, h);
    ctx.shadowBlur = 0;

    // Card border
    ctx.strokeStyle = selected ? '#FFD700' : '#5a3d20';
    ctx.lineWidth = selected ? 3 : 2;
    ctx.strokeRect(x, y, w, h);

    // Inner border (double-line frame)
    ctx.strokeStyle = selected ? 'rgba(255, 215, 0, 0.3)' : 'rgba(90, 61, 32, 0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 4, y + 4, w - 8, h - 8);

    // Portrait — BIG (fills card width)
    const portraitSize = w - 20;
    const portraitX = x + 10;
    const portraitY = y + 10;
    const portrait = char.portrait ? this.assets.get(char.portrait) : null;

    // Portrait frame background
    ctx.fillStyle = '#1a0e06';
    ctx.fillRect(portraitX - 2, portraitY - 2, portraitSize + 4, portraitSize + 4);

    if (portrait) {
      ctx.drawImage(portrait, portraitX, portraitY, portraitSize, portraitSize);
    } else {
      // Fallback silhouette
      ctx.fillStyle = classInfo.color;
      ctx.fillRect(portraitX, portraitY, portraitSize, portraitSize);
      ctx.fillStyle = '#000';
      ctx.font = '60px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(classInfo.icon, portraitX + portraitSize / 2, portraitY + portraitSize / 2 + 20);
      ctx.textAlign = 'left';
    }

    // Portrait frame border
    ctx.strokeStyle = selected ? '#FFD700' : '#6b4e2a';
    ctx.lineWidth = 2;
    ctx.strokeRect(portraitX - 2, portraitY - 2, portraitSize + 4, portraitSize + 4);

    // Role badge (top-right corner of portrait)
    const badgeW = 60;
    const badgeH = 18;
    ctx.fillStyle = classInfo.color;
    ctx.fillRect(portraitX + portraitSize - badgeW + 2, portraitY, badgeW, badgeH);
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(classInfo.role, portraitX + portraitSize - badgeW / 2 + 2, portraitY + 13);
    ctx.textAlign = 'left';

    // Character name
    const nameY = portraitY + portraitSize + 18;
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = selected ? '#FFD700' : '#E8D5B0';
    ctx.textAlign = 'center';
    ctx.fillText(char.name, x + w / 2, nameY);

    // Class + Level
    ctx.font = '11px monospace';
    ctx.fillStyle = classInfo.color;
    ctx.fillText(`${classData.name} · L${char.level}`, x + w / 2, nameY + 16);
    ctx.textAlign = 'left';

    // Stat bars (compact)
    const barStartY = nameY + 28;
    const barX = x + 12;
    const barW = w - 24;
    const barH = 6;
    const barGap = 14;

    // HP bar
    this._drawStatBar(ctx, barX, barStartY, barW, barH, 'HP', char.currentHP, char.maxHP, '#a00', '#0a0');

    // Mana bar
    if (char.maxMana > 0) {
      this._drawStatBar(ctx, barX, barStartY + barGap, barW, barH, 'MP', char.currentMana, char.maxMana, '#224', '#44f');
    }

    // Key stats row
    const statsY = barStartY + barGap * 2 + 6;
    ctx.font = 'bold 11px monospace';

    const stats = [
      { label: 'STR', val: char.stats.str },
      { label: 'DEX', val: char.stats.dex },
      { label: 'CON', val: char.stats.con },
    ];
    const stats2 = [
      { label: 'INT', val: char.stats.int },
      { label: 'WIS', val: char.stats.wis },
      { label: 'CHA', val: char.stats.cha },
    ];

    stats.forEach((s, i) => {
      const sx = barX + i * (barW / 3);
      const highlight = s.val >= 14 ? '#E8D5B0' : '#9B8765';
      ctx.fillStyle = '#000';
      ctx.fillText(`${s.label}:${s.val}`, sx + 1, statsY + 1);
      ctx.fillStyle = highlight;
      ctx.fillText(`${s.label}:${s.val}`, sx, statsY);
    });
    stats2.forEach((s, i) => {
      const sx = barX + i * (barW / 3);
      const highlight = s.val >= 14 ? '#E8D5B0' : '#9B8765';
      ctx.fillStyle = '#000';
      ctx.fillText(`${s.label}:${s.val}`, sx + 1, statsY + 15);
      ctx.fillStyle = highlight;
      ctx.fillText(`${s.label}:${s.val}`, sx, statsY + 14);
    });

    // AC + Weapon
    const infoY = statsY + 30;
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#000';
    ctx.fillText(`AC:${char.getAC()} | ${char.getWeaponDamage()}`, x + w / 2 + 1, infoY + 1);
    ctx.fillStyle = '#C4A265';
    ctx.fillText(`AC:${char.getAC()} | ${char.getWeaponDamage()}`, x + w / 2, infoY);

    // "Best at" insight
    ctx.font = '10px monospace';
    ctx.fillStyle = '#000';
    ctx.fillText(classInfo.best, x + w / 2 + 1, infoY + 15);
    ctx.fillStyle = '#9B8765';
    ctx.fillText(classInfo.best, x + w / 2, infoY + 14);
    ctx.textAlign = 'left';
  }

  _drawStatBar(ctx, x, y, w, h, label, current, max, bgColor, fillColor) {
    const pct = Math.max(0, Math.min(1, current / max));

    // Label
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = '#000';
    ctx.fillText(label, x + 1, y);
    ctx.fillStyle = '#C4A265';
    ctx.fillText(label, x, y - 1);

    // Value
    ctx.textAlign = 'right';
    ctx.fillStyle = '#000';
    ctx.fillText(`${current}/${max}`, x + w + 1, y);
    ctx.fillStyle = '#C4A265';
    ctx.fillText(`${current}/${max}`, x + w, y - 1);
    ctx.textAlign = 'left';

    // Bar background
    ctx.fillStyle = bgColor;
    ctx.fillRect(x, y + 2, w, h);

    // Bar fill
    ctx.fillStyle = fillColor;
    ctx.fillRect(x, y + 2, w * pct, h);

    // Bar border
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y + 2, w, h);
  }

  _drawCustomCard(ctx, x, y, w, h, selected) {
    // Card background
    if (selected) {
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 20;
    }
    ctx.fillStyle = selected ? '#2a2a30' : '#1c1c22';
    ctx.fillRect(x, y, w, h);
    ctx.shadowBlur = 0;

    // Card border (dashed style via segments)
    ctx.strokeStyle = selected ? '#FFD700' : '#5a5a6a';
    ctx.lineWidth = selected ? 3 : 2;
    ctx.setLineDash([8, 4]);
    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);

    // Large "+" icon
    const centerX = x + w / 2;
    const centerY = y + h / 2 - 40;
    const plusSize = 36;

    ctx.fillStyle = selected ? '#FFD700' : '#6a6a7a';
    ctx.fillRect(centerX - 4, centerY - plusSize, 8, plusSize * 2);
    ctx.fillRect(centerX - plusSize, centerY - 4, plusSize * 2, 8);

    // Circle around plus
    ctx.beginPath();
    ctx.arc(centerX, centerY, plusSize + 12, 0, Math.PI * 2);
    ctx.strokeStyle = selected ? '#FFD700' : '#5a5a6a';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Text
    ctx.textAlign = 'center';
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#000';
    ctx.fillText('Create', centerX + 1, centerY + plusSize + 36);
    ctx.fillStyle = selected ? '#FFD700' : '#9a9aaa';
    ctx.fillText('Create', centerX, centerY + plusSize + 35);

    ctx.font = '12px monospace';
    ctx.fillStyle = '#000';
    ctx.fillText('Custom Hero', centerX + 1, centerY + plusSize + 54);
    ctx.fillStyle = selected ? '#C4A265' : '#6a6a7a';
    ctx.fillText('Custom Hero', centerX, centerY + plusSize + 53);

    ctx.font = '10px monospace';
    ctx.fillStyle = selected ? '#8B7355' : '#4a4a5a';
    ctx.fillText('Choose class, name', centerX, centerY + plusSize + 74);
    ctx.fillText('& portrait', centerX, centerY + plusSize + 88);
    ctx.textAlign = 'left';
  }

  // --- Touch Button Bar ---

  _drawTouchBar(ctx, canvasW, canvasH, world, buttons, highlightIdx = -1) {
    const barH = 50;
    const barY = canvasH - barH;
    const gap = 8;
    const totalW = buttons.reduce((sum, b) => sum + b.width, 0) + (buttons.length - 1) * gap;
    let x = (canvasW - totalW) / 2;

    // Bar background
    ctx.fillStyle = 'rgba(10, 6, 3, 0.85)';
    ctx.fillRect(0, barY, canvasW, barH);
    ctx.fillStyle = '#3d2814';
    ctx.fillRect(0, barY, canvasW, 2);

    for (const btn of buttons) {
      const btnH = 46;
      const btnY = barY + (barH - btnH) / 2;

      // Button background — highlight if focused
      const isFocused = this.focusArea === 'bar' && buttons.indexOf(btn) === highlightIdx;
      ctx.fillStyle = isFocused ? '#4a3018' : '#2a1a0e';
      ctx.fillRect(x, btnY, btn.width, btnH);
      ctx.strokeStyle = isFocused ? '#FFD700' : '#5a3d20';
      ctx.lineWidth = isFocused ? 2 : 1;
      ctx.strokeRect(x, btnY, btn.width, btnH);

      // Button text
      ctx.fillStyle = '#C4A265';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(btn.label, x + btn.width / 2, btnY + btnH / 2 + 4);
      ctx.textAlign = 'left';

      // Register touch hit zone
      if (world.input && world.input.touch) {
        world.input.touch.registerHitZone(x, btnY, btn.width, btnH, btn.code);
      }

      x += btn.width + gap;
    }
  }

  // --- Party Select ---

  _renderPartySelect(ctx, world) {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    const members = world.party.getMembers();
    const roster = world.roster.getAll();

    // Dark parchment background overlay
    ctx.fillStyle = 'rgba(15, 8, 3, 0.75)';
    ctx.fillRect(0, 60, w, h - 110);
    // Border edges
    ctx.strokeStyle = '#5a3d20';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(20, 62); ctx.lineTo(w - 20, 62); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(20, h - 52); ctx.lineTo(w - 20, h - 52); ctx.stroke();

    // Draw torch sconces
    this._drawTorchSconce(ctx, 50, 80);
    this._drawTorchSconce(ctx, w - 50, 80);

    // Header
    ctx.textAlign = 'center';
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = '#000';
    ctx.fillText('YOUR PARTY', w / 2 + 1, 83);
    ctx.fillStyle = '#E8D5B0';
    ctx.fillText('YOUR PARTY', w / 2, 82);
    ctx.fillStyle = '#6b5030';
    ctx.fillText('═══════════════════════════', w / 2, 96);
    ctx.textAlign = 'left';

    // --- SPLIT VIEW LAYOUT ---
    // Left side: 4 party slots (large cards)
    // Right side: roster reference list (smaller cards)
    const leftPanelW = Math.min(460, w * 0.55);
    const rightPanelW = w - leftPanelW - 40;
    const leftX = 15;
    const rightX = leftPanelW + 25;
    const panelTop = 104;

    // === LEFT PANEL: Party Slots ===
    // Panel background
    ctx.fillStyle = 'rgba(20, 12, 6, 0.6)';
    ctx.fillRect(leftX, panelTop, leftPanelW, h - panelTop - 60);
    ctx.strokeStyle = '#5a3d20';
    ctx.lineWidth = 1;
    ctx.strokeRect(leftX, panelTop, leftPanelW, h - panelTop - 60);

    // Panel title
    ctx.fillStyle = '#2a1a0e';
    ctx.fillRect(leftX + 1, panelTop + 1, leftPanelW - 2, 20);
    ctx.fillStyle = '#C4A265';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`PARTY FORMATION · ${members.length}/4`, leftX + leftPanelW / 2, panelTop + 14);
    ctx.textAlign = 'left';

    // 4 party slots — 2x2 grid or single row depending on width
    const slotGap = 10;
    const slotsPerRow = 2;
    const slotW = Math.floor((leftPanelW - slotGap * 3) / slotsPerRow);
    const slotH = Math.floor((h - panelTop - 100) / 2);
    const slotStartY = panelTop + 28;

    for (let slot = 0; slot < 4; slot++) {
      const row = Math.floor(slot / slotsPerRow);
      const col = slot % slotsPerRow;
      const sx = leftX + slotGap + col * (slotW + slotGap);
      const sy = slotStartY + row * (slotH + slotGap);
      const isActive = slot === this.selectedPartySlot;
      const member = members[slot] || null;

      if (member) {
        // --- Filled slot ---
        const classInfo = CLASS_INSIGHTS[member.class] || CLASS_INSIGHTS.fighter;
        const classData = CLASS_DATA[member.class];
        const classColors = {
          fighter: '#C0392B', ranger: '#27AE60', mage: '#8E44AD',
          cleric: '#F1C40F', rogue: '#2C3E50', paladin: '#D4AC0D'
        };
        const classColor = classColors[member.class] || '#C4A265';

        // Card background with glow on active
        if (isActive) {
          ctx.shadowColor = '#FFD700';
          ctx.shadowBlur = 18;
        }
        ctx.fillStyle = isActive ? '#3a2a18' : '#2a1c10';
        ctx.fillRect(sx, sy, slotW, slotH);
        ctx.shadowBlur = 0;

        // Card border
        ctx.strokeStyle = isActive ? '#FFD700' : '#5a3d20';
        ctx.lineWidth = isActive ? 3 : 2;
        ctx.strokeRect(sx, sy, slotW, slotH);

        // Inner border
        ctx.strokeStyle = isActive ? 'rgba(255, 215, 0, 0.3)' : 'rgba(90, 61, 32, 0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(sx + 3, sy + 3, slotW - 6, slotH - 6);

        // Class color accent strip
        ctx.fillStyle = classColor;
        ctx.fillRect(sx + 4, sy + 4, slotW - 8, 3);

        // Slot number badge (top-left)
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(sx + 6, sy + 10, 22, 18);
        ctx.strokeStyle = '#6b4e2a';
        ctx.lineWidth = 1;
        ctx.strokeRect(sx + 6, sy + 10, 22, 18);
        ctx.fillStyle = '#C4A265';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${slot + 1}`, sx + 17, sy + 24);
        ctx.textAlign = 'left';

        // Portrait
        const pSize = Math.min(slotW - 24, slotH - 120);
        const pX = sx + (slotW - pSize) / 2;
        const pY = sy + 10;
        const portrait = member.portrait ? this.assets.get(member.portrait) : null;

        ctx.fillStyle = '#1a0e06';
        ctx.fillRect(pX - 2, pY - 2, pSize + 4, pSize + 4);

        if (portrait) {
          ctx.drawImage(portrait, pX, pY, pSize, pSize);
        } else {
          const grad = ctx.createLinearGradient(pX, pY, pX, pY + pSize);
          grad.addColorStop(0, classColor);
          grad.addColorStop(1, '#1a0e06');
          ctx.fillStyle = grad;
          ctx.fillRect(pX, pY, pSize, pSize);
          ctx.fillStyle = 'rgba(0,0,0,0.4)';
          ctx.fillRect(pX, pY, pSize, pSize);
          ctx.fillStyle = '#FFF';
          ctx.font = `${Math.floor(pSize * 0.5)}px monospace`;
          ctx.textAlign = 'center';
          ctx.fillText(classInfo.icon, pX + pSize / 2, pY + pSize / 2 + Math.floor(pSize * 0.15));
          ctx.textAlign = 'left';
        }

        ctx.strokeStyle = isActive ? '#FFD700' : '#6b4e2a';
        ctx.lineWidth = 2;
        ctx.strokeRect(pX - 2, pY - 2, pSize + 4, pSize + 4);

        // Role badge on portrait
        const rbW = 56;
        const rbH = 16;
        ctx.fillStyle = classColor;
        ctx.fillRect(pX + pSize - rbW + 2, pY, rbW, rbH);
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(classInfo.role, pX + pSize - rbW / 2 + 2, pY + 12);
        ctx.textAlign = 'left';

        // Name
        const nameBaseY = pY + pSize + 14;
        ctx.font = 'bold 13px monospace';
        ctx.fillStyle = '#000';
        ctx.textAlign = 'center';
        ctx.fillText(member.name, sx + slotW / 2 + 1, nameBaseY + 1);
        ctx.fillStyle = isActive ? '#FFD700' : '#E8D5B0';
        ctx.fillText(member.name, sx + slotW / 2, nameBaseY);

        // Class + Level
        ctx.font = '10px monospace';
        ctx.fillStyle = classColor;
        ctx.fillText(`${classData.name} · L${member.level}`, sx + slotW / 2, nameBaseY + 14);
        ctx.textAlign = 'left';

        // HP bar
        const bX = sx + 10;
        const bW = slotW - 20;
        const bY = nameBaseY + 22;
        this._drawEnhancedBar(ctx, bX, bY, bW, 7, 'HP',
          member.currentHP, member.maxHP, '#600', '#22AA22', '#33DD33');

        // MP bar
        if (member.maxMana > 0) {
          this._drawEnhancedBar(ctx, bX, bY + 14, bW, 7, 'MP',
            member.currentMana, member.maxMana, '#224', '#3355CC', '#5577EE');
        }

        // "REMOVE" hint on active card
        if (isActive) {
          const removeY = sy + slotH - 26;
          ctx.fillStyle = 'rgba(192, 57, 43, 0.8)';
          ctx.fillRect(sx + 4, removeY, slotW - 8, 22);
          ctx.strokeStyle = '#E74C3C';
          ctx.lineWidth = 1;
          ctx.strokeRect(sx + 4, removeY, slotW - 8, 22);
          ctx.fillStyle = '#FFF';
          ctx.font = 'bold 10px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('SPACE TO REMOVE', sx + slotW / 2, removeY + 15);
          ctx.textAlign = 'left';
        }

        // Register touch zone
        if (world.input && world.input.touch) {
          if (isActive) {
            world.input.touch.registerHitZone(sx, sy, slotW, slotH, 'Space');
          } else {
            world.input.touch.registerHitZone(sx, sy, slotW, slotH, `_selectParty_${slot}`);
          }
        }
      } else {
        // --- Empty slot (dashed outline) ---
        ctx.fillStyle = isActive ? 'rgba(40, 30, 16, 0.6)' : 'rgba(20, 14, 8, 0.4)';
        ctx.fillRect(sx, sy, slotW, slotH);

        ctx.strokeStyle = isActive ? '#FFD700' : '#4a3520';
        ctx.lineWidth = isActive ? 2 : 1;
        ctx.setLineDash([8, 6]);
        ctx.strokeRect(sx, sy, slotW, slotH);
        ctx.setLineDash([]);

        // Slot number
        ctx.fillStyle = isActive ? '#FFD700' : '#6b5030';
        ctx.font = 'bold 24px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${slot + 1}`, sx + slotW / 2, sy + slotH / 2 - 16);

        // "Empty Slot" text
        ctx.font = '12px monospace';
        ctx.fillStyle = isActive ? '#C4A265' : '#6b5030';
        ctx.fillText('Empty Slot', sx + slotW / 2, sy + slotH / 2 + 10);

        // Hint text
        ctx.font = '10px monospace';
        ctx.fillStyle = '#4a3520';
        ctx.fillText('Recruit from roster', sx + slotW / 2, sy + slotH / 2 + 28);
        ctx.textAlign = 'left';
      }
    }

    // === RIGHT PANEL: Roster Reference ===
    ctx.fillStyle = 'rgba(20, 12, 6, 0.6)';
    ctx.fillRect(rightX, panelTop, rightPanelW, h - panelTop - 60);
    ctx.strokeStyle = '#5a3d20';
    ctx.lineWidth = 1;
    ctx.strokeRect(rightX, panelTop, rightPanelW, h - panelTop - 60);

    // Panel title
    ctx.fillStyle = '#2a1a0e';
    ctx.fillRect(rightX + 1, panelTop + 1, rightPanelW - 2, 20);
    ctx.fillStyle = '#C4A265';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('AVAILABLE ROSTER', rightX + rightPanelW / 2, panelTop + 14);
    ctx.textAlign = 'left';

    // Mini roster list (compact cards)
    const listTop = panelTop + 28;
    const rowH = 44;
    const listPad = 6;
    const maxListVisible = Math.floor((h - panelTop - 100) / rowH);

    if (roster.length === 0) {
      ctx.fillStyle = '#6b5030';
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('No adventurers available', rightX + rightPanelW / 2, listTop + 40);
      ctx.textAlign = 'left';
    } else {
      for (let ri = 0; ri < Math.min(roster.length, maxListVisible); ri++) {
        const char = roster[ri];
        const ry = listTop + ri * rowH;
        const classInfo = CLASS_INSIGHTS[char.class] || CLASS_INSIGHTS.fighter;
        const classColors = {
          fighter: '#C0392B', ranger: '#27AE60', mage: '#8E44AD',
          cleric: '#F1C40F', rogue: '#2C3E50', paladin: '#D4AC0D'
        };
        const classColor = classColors[char.class] || '#C4A265';

        // Check if in party
        const inParty = members.includes(char) ||
          members.some(m => m.name === char.name && m.class === char.class);

        // Row background
        ctx.fillStyle = inParty ? 'rgba(39, 174, 96, 0.15)' : 'rgba(30, 20, 10, 0.5)';
        ctx.fillRect(rightX + listPad, ry, rightPanelW - listPad * 2, rowH - 4);
        ctx.strokeStyle = inParty ? 'rgba(39, 174, 96, 0.4)' : '#3a2a18';
        ctx.lineWidth = 1;
        ctx.strokeRect(rightX + listPad, ry, rightPanelW - listPad * 2, rowH - 4);

        // Class color dot
        ctx.fillStyle = classColor;
        ctx.beginPath();
        ctx.arc(rightX + listPad + 12, ry + (rowH - 4) / 2, 5, 0, Math.PI * 2);
        ctx.fill();

        // Mini portrait
        const miniSize = 30;
        const miniX = rightX + listPad + 22;
        const miniY = ry + 3;
        const portrait = char.portrait ? this.assets.get(char.portrait) : null;

        ctx.fillStyle = '#1a0e06';
        ctx.fillRect(miniX, miniY, miniSize, miniSize);
        if (portrait) {
          ctx.drawImage(portrait, miniX, miniY, miniSize, miniSize);
        } else {
          ctx.fillStyle = classColor;
          ctx.font = '18px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(classInfo.icon, miniX + miniSize / 2, miniY + miniSize / 2 + 6);
          ctx.textAlign = 'left';
        }
        ctx.strokeStyle = '#4a3520';
        ctx.lineWidth = 1;
        ctx.strokeRect(miniX, miniY, miniSize, miniSize);

        // Name + class
        const textX = miniX + miniSize + 8;
        ctx.font = 'bold 11px monospace';
        ctx.fillStyle = inParty ? '#4CAF50' : '#E8D5B0';
        ctx.fillText(char.name, textX, ry + 15);

        ctx.font = '9px monospace';
        ctx.fillStyle = classColor;
        ctx.fillText(`${classInfo.role} · L${char.level}`, textX, ry + 28);

        // In party indicator
        if (inParty) {
          ctx.fillStyle = '#4CAF50';
          ctx.font = 'bold 9px monospace';
          ctx.textAlign = 'right';
          ctx.fillText('✓ PARTY', rightX + rightPanelW - listPad - 4, ry + 22);
          ctx.textAlign = 'left';
        }

        // Dim if in party
        if (inParty) {
          ctx.fillStyle = 'rgba(0,0,0,0.3)';
          ctx.fillRect(rightX + listPad, ry, rightPanelW - listPad * 2, rowH - 4);
        }
      }

      // "More..." indicator if roster is longer than visible
      if (roster.length > maxListVisible) {
        ctx.fillStyle = '#6b5030';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`+ ${roster.length - maxListVisible} more...`, rightX + rightPanelW / 2, listTop + maxListVisible * rowH + 12);
        ctx.textAlign = 'left';
      }
    }

    // Bottom bar (use shared method for consistency)
    const buttons = this._partyBarButtons(members);
    this._drawTouchBar(ctx, w, h, world, buttons, this.focusArea === 'bar' ? this.selectedBarButton : -1);
  }

  // --- Shop ---

  _renderShop(ctx, world) {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;

    const chaModifier = this._getCHAPriceModifier(world);
    const chaLabel = this._getCHALabel(chaModifier);

    // --- Dark parchment overlay (matching roster style) ---
    ctx.fillStyle = 'rgba(15, 8, 3, 0.75)';
    ctx.fillRect(0, 60, w, h - 110);
    // Top edge line
    ctx.strokeStyle = '#5a3d20';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(20, 62); ctx.lineTo(w - 20, 62); ctx.stroke();
    // Bottom edge
    ctx.beginPath(); ctx.moveTo(20, h - 52); ctx.lineTo(w - 20, h - 52); ctx.stroke();
    // Corner ornaments
    const cornerSize = 12;
    ctx.strokeStyle = '#6b4e2a';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(20, 62 + cornerSize); ctx.lineTo(20, 62); ctx.lineTo(20 + cornerSize, 62); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w - 20 - cornerSize, 62); ctx.lineTo(w - 20, 62); ctx.lineTo(w - 20, 62 + cornerSize); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(20, h - 52 - cornerSize); ctx.lineTo(20, h - 52); ctx.lineTo(20 + cornerSize, h - 52); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w - 20 - cornerSize, h - 52); ctx.lineTo(w - 20, h - 52); ctx.lineTo(w - 20, h - 52 - cornerSize); ctx.stroke();

    // Torch sconces
    this._drawTorchSconce(ctx, 50, 80);
    this._drawTorchSconce(ctx, w - 50, 80);

    // --- Bessa portrait area (top-left) ---
    const portraitX = 30;
    const portraitY = 70;
    const portraitSize = 44;
    // Portrait frame
    ctx.fillStyle = '#1a0e06';
    ctx.fillRect(portraitX, portraitY, portraitSize, portraitSize);
    ctx.strokeStyle = '#8B7355';
    ctx.lineWidth = 2;
    ctx.strokeRect(portraitX, portraitY, portraitSize, portraitSize);
    // Silhouette (simple merchant figure)
    ctx.fillStyle = '#3d2510';
    ctx.fillRect(portraitX + 2, portraitY + 2, portraitSize - 4, portraitSize - 4);
    ctx.fillStyle = '#6b5030';
    // Head
    ctx.beginPath();
    ctx.arc(portraitX + portraitSize / 2, portraitY + 14, 8, 0, Math.PI * 2);
    ctx.fill();
    // Body
    ctx.beginPath();
    ctx.moveTo(portraitX + portraitSize / 2 - 10, portraitY + portraitSize - 4);
    ctx.lineTo(portraitX + portraitSize / 2, portraitY + 22);
    ctx.lineTo(portraitX + portraitSize / 2 + 10, portraitY + portraitSize - 4);
    ctx.closePath();
    ctx.fill();

    // Bessa flavor quote
    ctx.font = 'italic 10px monospace';
    ctx.fillStyle = '#8B7355';
    ctx.textAlign = 'left';
    const bessaQuotes = [
      '"Fine wares, fair prices..."',
      '"You break it, you buy it."',
      '"Bessa has what you need."',
      '"Steel and potions, friend."',
    ];
    const quoteIdx = Math.floor((Date.now() / 8000)) % bessaQuotes.length;
    ctx.fillText(bessaQuotes[quoteIdx], portraitX + portraitSize + 8, portraitY + 16);

    // --- Gold display (top-center, prominent) ---
    const goldBoxW = 140;
    const goldBoxH = 28;
    const goldBoxX = w / 2 - goldBoxW / 2;
    const goldBoxY = 68;
    ctx.fillStyle = 'rgba(20, 12, 6, 0.9)';
    ctx.fillRect(goldBoxX, goldBoxY, goldBoxW, goldBoxH);
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 1;
    ctx.strokeRect(goldBoxX, goldBoxY, goldBoxW, goldBoxH);
    // Coin icon (small circle)
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(goldBoxX + 16, goldBoxY + goldBoxH / 2, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#B8860B';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('G', goldBoxX + 16, goldBoxY + goldBoxH / 2 + 3);
    // Gold amount
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${world.gold} Gold`, goldBoxX + goldBoxW / 2 + 10, goldBoxY + goldBoxH / 2 + 5);
    ctx.textAlign = 'left';

    // --- CHA discount indicator (below gold) ---
    let headerBottom = goldBoxY + goldBoxH + 4;
    if (chaLabel) {
      ctx.font = 'italic 10px monospace';
      ctx.fillStyle = chaModifier < 1.0 ? '#4CAF50' : '#C0392B';
      ctx.textAlign = 'center';
      ctx.fillText(chaLabel, w / 2, headerBottom + 10);
      ctx.textAlign = 'left';
      headerBottom += 16;
    }

    // --- Panel layout ---
    const panelGap = 12;
    const panelY = headerBottom + 8;
    const panelBottomMargin = 60; // room for touch bar
    const panelH = h - panelY - panelBottomMargin;
    const availW = w - 60; // 30px margin each side
    const panelW = Math.floor((availW - panelGap) / 2);
    const leftX = 30;
    const rightX = leftX + panelW + panelGap;

    // --- Left panel: BESSA'S WARES ---
    this._drawPanel(ctx, leftX, panelY, panelW, panelH, "BESSA'S WARES");

    // --- Right panel: YOUR PACK ---
    this._drawPanel(ctx, rightX, panelY, panelW, panelH, 'YOUR PACK');

    // --- Item type icons ---
    const typeIcons = {
      weapon: '\u2694',  // crossed swords
      armor: '\u{1F6E1}',   // shield (fallback)
      shield: '\u{1F6E1}',
      accessory: '\u2726', // star
      potion: '\u2697',   // alembic
      scroll: '\u{1F4DC}',
      key: '\u{1F511}',
    };
    const typeIconsFallback = {
      weapon: 'WPN',
      armor: 'ARM',
      shield: 'SHD',
      accessory: 'ACC',
      potion: 'POT',
      scroll: 'SCR',
      key: 'KEY',
    };

    // --- Stat summary helper ---
    const getStatSummary = (item) => {
      if (!item.stats || Object.keys(item.stats).length === 0) return '';
      return Object.entries(item.stats).map(([k, v]) => `${k.toUpperCase()}${v > 0 ? '+' : ''}${v}`).join(' ');
    };

    // --- Price comparison helper: compare item to currently equipped ---
    const getComparisonText = (item) => {
      if (!item.stats || Object.keys(item.stats).length === 0) return null;
      const slot = item.getSlot ? item.getSlot() : null;
      if (!slot) return null;
      const members = world.party.getMembers();
      if (members.length === 0) return null;
      // Compare against first party member's equipped item in same slot
      const leader = members[0];
      const equipped = leader.getEquippedItem ? leader.getEquippedItem(slot) : null;
      if (!equipped || !equipped.stats) return { text: 'NEW', color: '#4CAF50' };
      // Sum stat values for comparison
      let itemTotal = 0;
      let equippedTotal = 0;
      for (const [k, v] of Object.entries(item.stats)) { itemTotal += v; }
      for (const [k, v] of Object.entries(equipped.stats)) { equippedTotal += v; }
      if (itemTotal > equippedTotal) return { text: '\u25B2 UPGRADE', color: '#4CAF50' };
      if (itemTotal < equippedTotal) return { text: '\u25BC DOWNGRADE', color: '#C0392B' };
      return { text: '= SAME', color: '#8B7355' };
    };

    // --- Render merchant items (left panel) ---
    const merchantInventory = world.merchant.getInventory();
    const itemCardH = 32;
    const listPadX = 8;
    const listStartY = panelY + 28;
    const maxVisible = Math.floor((panelH - 36) / itemCardH);

    merchantInventory.forEach((item, i) => {
      if (i >= maxVisible) return;
      const cardY = listStartY + i * itemCardH;
      const isSelected = i === this.selectedMerchantItem;
      const cardX = leftX + listPadX;
      const cardW = panelW - listPadX * 2;

      // Card background
      ctx.fillStyle = isSelected ? 'rgba(60, 40, 15, 0.9)' : 'rgba(30, 18, 8, 0.6)';
      ctx.fillRect(cardX, cardY, cardW, itemCardH - 2);

      // Selected gold border
      if (isSelected) {
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        ctx.strokeRect(cardX, cardY, cardW, itemCardH - 2);
      } else {
        ctx.strokeStyle = '#3d2510';
        ctx.lineWidth = 1;
        ctx.strokeRect(cardX, cardY, cardW, itemCardH - 2);
      }

      // Type icon
      const iconLabel = typeIconsFallback[item.type] || '???';
      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = '#6b5030';
      ctx.textAlign = 'center';
      ctx.fillText(iconLabel, cardX + 18, cardY + 12);

      // Item name
      ctx.font = isSelected ? 'bold 11px monospace' : '11px monospace';
      ctx.fillStyle = isSelected ? '#FFD700' : '#C4A265';
      ctx.textAlign = 'left';
      ctx.fillText(item.name, cardX + 36, cardY + 12);

      // Stats line (smaller, below name)
      const statStr = getStatSummary(item);
      if (statStr) {
        ctx.font = '9px monospace';
        ctx.fillStyle = '#8B7355';
        ctx.fillText(statStr, cardX + 36, cardY + 24);
      }

      // Price display (right side)
      const basePrice = world.merchant.getBuyPrice(item);
      const finalPrice = Math.max(1, Math.round(basePrice * chaModifier));
      ctx.textAlign = 'right';
      if (chaModifier !== 1.0) {
        // Strikethrough on original price
        ctx.fillStyle = '#555';
        ctx.font = '9px monospace';
        const origText = `${basePrice}g`;
        const origX = cardX + cardW - 42;
        const origY = cardY + 12;
        ctx.fillText(origText, origX, origY);
        // Strikethrough line
        const origWidth = ctx.measureText(origText).width;
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(origX - origWidth, origY - 3);
        ctx.lineTo(origX, origY - 3);
        ctx.stroke();
        // Discounted price
        ctx.fillStyle = chaModifier < 1.0 ? '#4CAF50' : '#C0392B';
        ctx.font = 'bold 11px monospace';
        ctx.fillText(`${finalPrice}g`, cardX + cardW - 6, cardY + 12);
      } else {
        ctx.fillStyle = '#8B7355';
        ctx.font = '11px monospace';
        ctx.fillText(`${finalPrice}g`, cardX + cardW - 6, cardY + 12);
      }

      // Affordability indicator
      if (finalPrice > world.gold) {
        ctx.fillStyle = 'rgba(192, 57, 43, 0.3)';
        ctx.fillRect(cardX + 1, cardY + 1, cardW - 2, itemCardH - 4);
      }

      ctx.textAlign = 'left';

      // Touch hit zone for selecting this merchant item
      if (world.input && world.input.touch) {
        world.input.touch.registerHitZone(cardX, cardY, cardW, itemCardH - 2,
          i === this.selectedMerchantItem ? 'KeyB' : (i < this.selectedMerchantItem ? 'ArrowUp' : 'ArrowDown'));
      }
    });

    // Empty state for merchant
    if (merchantInventory.length === 0) {
      ctx.font = 'italic 11px monospace';
      ctx.fillStyle = '#6b5030';
      ctx.textAlign = 'center';
      ctx.fillText('Sold out!', leftX + panelW / 2, listStartY + 20);
      ctx.textAlign = 'left';
    }

    // --- Render player items (right panel) ---
    const playerItems = world.inventory.getAllItems();
    playerItems.forEach((item, i) => {
      if (i >= maxVisible) return;
      const cardY = listStartY + i * itemCardH;
      const isSelected = i === this.selectedPlayerItem;
      const cardX = rightX + listPadX;
      const cardW = panelW - listPadX * 2;

      // Card background
      ctx.fillStyle = isSelected ? 'rgba(60, 40, 15, 0.9)' : 'rgba(30, 18, 8, 0.6)';
      ctx.fillRect(cardX, cardY, cardW, itemCardH - 2);

      // Selected gold border
      if (isSelected) {
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        ctx.strokeRect(cardX, cardY, cardW, itemCardH - 2);
      } else {
        ctx.strokeStyle = '#3d2510';
        ctx.lineWidth = 1;
        ctx.strokeRect(cardX, cardY, cardW, itemCardH - 2);
      }

      // Type icon
      const iconLabel = typeIconsFallback[item.type] || '???';
      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = '#6b5030';
      ctx.textAlign = 'center';
      ctx.fillText(iconLabel, cardX + 18, cardY + 12);

      // Item name
      ctx.font = isSelected ? 'bold 11px monospace' : '11px monospace';
      ctx.fillStyle = isSelected ? '#FFD700' : '#C4A265';
      ctx.textAlign = 'left';
      ctx.fillText(item.name, cardX + 36, cardY + 12);

      // Stats line
      const statStr = getStatSummary(item);
      if (statStr) {
        ctx.font = '9px monospace';
        ctx.fillStyle = '#8B7355';
        ctx.fillText(statStr, cardX + 36, cardY + 24);
      }

      // Sell price (right side)
      const price = world.merchant.getSellPrice(item);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#8B7355';
      ctx.font = '11px monospace';
      ctx.fillText(`${price}g`, cardX + cardW - 6, cardY + 12);
      ctx.textAlign = 'left';

      // Touch hit zone for selecting this player item
      if (world.input && world.input.touch) {
        world.input.touch.registerHitZone(cardX, cardY, cardW, itemCardH - 2,
          i === this.selectedPlayerItem ? 'KeyV' : (i < this.selectedPlayerItem ? 'ArrowLeft' : 'ArrowRight'));
      }
    });

    // Empty state for player pack
    if (playerItems.length === 0) {
      ctx.font = 'italic 11px monospace';
      ctx.fillStyle = '#6b5030';
      ctx.textAlign = 'center';
      ctx.fillText('Pack is empty', rightX + panelW / 2, listStartY + 20);
      ctx.textAlign = 'left';
    }

    // --- Selected item detail popup (below panels) ---
    const selectedMItem = merchantInventory[this.selectedMerchantItem];
    const selectedPItem = playerItems[this.selectedPlayerItem];
    const detailItem = selectedMItem || selectedPItem;
    if (detailItem) {
      const detailY = panelY + panelH + 2;
      const detailH = 28;
      const detailX = 30;
      const detailW = w - 60;

      ctx.fillStyle = 'rgba(20, 12, 6, 0.85)';
      ctx.fillRect(detailX, detailY, detailW, detailH);
      ctx.strokeStyle = '#5a3d20';
      ctx.lineWidth = 1;
      ctx.strokeRect(detailX, detailY, detailW, detailH);

      // Detail text: name + stats + comparison
      ctx.font = 'bold 10px monospace';
      ctx.fillStyle = '#E8D5B0';
      ctx.textAlign = 'left';
      const detailName = detailItem.name;
      const detailStats = getStatSummary(detailItem);
      ctx.fillText(detailName, detailX + 8, detailY + 12);

      if (detailStats) {
        ctx.font = '10px monospace';
        ctx.fillStyle = '#8B7355';
        ctx.fillText(detailStats, detailX + 8 + ctx.measureText(detailName + '  ').width, detailY + 12);
      }

      // Price comparison indicator
      if (selectedMItem) {
        const comparison = getComparisonText(selectedMItem);
        if (comparison) {
          ctx.font = 'bold 10px monospace';
          ctx.fillStyle = comparison.color;
          ctx.textAlign = 'right';
          ctx.fillText(comparison.text, detailX + detailW - 8, detailY + 12);
          ctx.textAlign = 'left';
        }
      }

      // Type label at bottom of detail
      if (detailItem.type) {
        ctx.font = '9px monospace';
        ctx.fillStyle = '#6b5030';
        ctx.fillText(detailItem.type.toUpperCase(), detailX + 8, detailY + 24);
      }
    }

    // --- Bottom bar — touch-friendly buttons ---
    const buttons = [
      { label: 'BACK', code: 'Escape', width: 70 },
      { label: '\u25C0 PREV', code: 'ArrowLeft', width: 65 },
      { label: '\u25B2', code: 'ArrowUp', width: 42 },
      { label: '\u25BC', code: 'ArrowDown', width: 42 },
      { label: 'NEXT \u25B6', code: 'ArrowRight', width: 65 },
      { label: 'BUY', code: 'KeyB', width: 70 },
      { label: 'SELL', code: 'KeyV', width: 70 },
    ];
    this._drawTouchBar(ctx, w, h, world, buttons, this.focusArea === 'bar' ? this.selectedBarButton : -1);
  }

  _drawPanel(ctx, x, y, w, h, title) {
    // Dark panel with border
    ctx.fillStyle = 'rgba(20, 12, 6, 0.85)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#5a3d20';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    // Title bar
    ctx.fillStyle = '#2a1a0e';
    ctx.fillRect(x + 1, y + 1, w - 2, 22);
    ctx.fillStyle = '#C4A265';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(title, x + w / 2, y + 16);
    ctx.textAlign = 'left';
  }

  // --- Dungeon Select ---

  _renderDungeonSelect(ctx, world) {
    const w = ctx.canvas.width;

    ctx.textAlign = 'center';
    ctx.font = '14px monospace';
    ctx.fillStyle = '#C4A265';
    ctx.fillText('NOTICE BOARD — EXPEDITIONS AVAILABLE', w / 2, 76);
    ctx.textAlign = 'left';

    const dungeons = [
      { name: 'Whispering Crypts', desc: 'Ancient burial grounds haunted by undead', floors: 5, danger: '★★☆' },
      { name: 'Goblin Warrens', desc: 'Twisted tunnels ruled by goblin clans', floors: 3, danger: '★☆☆' },
    ];

    dungeons.forEach((dungeon, i) => {
      const y = 100 + i * 100;
      const selected = i === this.selectedDungeon;

      // Parchment card for each dungeon
      ctx.fillStyle = selected ? '#3a2a18' : '#2a1c10';
      ctx.fillRect(80, y, w - 160, 80);
      ctx.strokeStyle = selected ? '#FFD700' : '#5a3d20';
      ctx.lineWidth = selected ? 2 : 1;
      ctx.strokeRect(80, y, w - 160, 80);

      const prefix = selected ? '▸ ' : '  ';
      ctx.font = 'bold 16px monospace';
      ctx.fillStyle = selected ? '#FFD700' : '#C4A265';
      ctx.fillText(prefix + dungeon.name, 100, y + 24);

      ctx.font = '12px monospace';
      ctx.fillStyle = '#8B7355';
      ctx.fillText(dungeon.desc, 100, y + 44);
      ctx.fillText(`Floors: ${dungeon.floors}  |  Danger: ${dungeon.danger}`, 100, y + 62);
    });

    // Register touch zones for dungeon entries
    if (world.input && world.input.touch) {
      dungeons.forEach((dungeon, i) => {
        const y = 100 + i * 100;
        world.input.touch.registerHitZone(80, y, w - 160, 80, i === this.selectedDungeon ? 'Enter' : (i < this.selectedDungeon ? 'ArrowUp' : 'ArrowDown'));
      });
    }

    // M-2 fix: Solo party warning
    const partySize = world.party.getMembers().length;
    if (partySize < 4) {
      ctx.textAlign = 'center';
      ctx.font = 'bold 13px monospace';
      ctx.fillStyle = partySize <= 1 ? '#C0392B' : '#F39C12';
      const warning = partySize <= 1
        ? '⚠ SOLO ADVENTURER — Extreme danger! Recruit more allies.'
        : `⚠ PARTY OF ${partySize} — Full party of 4 recommended.`;
      ctx.fillText(warning, w / 2, 320);
      ctx.textAlign = 'left';
    }

    // Bottom bar — touch-friendly buttons
    this._drawTouchBar(ctx, w, ctx.canvas.height, world, [
      { label: 'BACK', code: 'Escape', width: 100 },
      { label: 'SELECT DUNGEON', code: 'Enter', width: 200 },
    ]);
  }

  // --- Notice Board (replaces dungeon_select) ---

  _renderNoticeBoard(ctx, world) {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;

    // Ensure quests are loaded
    if (this.noticeBoardQuests.length === 0 && noticeBoardData) {
      this._refreshNoticeBoard(world);
    }

    const fragments = world.collectedFragments ? world.collectedFragments.size : 0;
    const partySize = world.party.getMembers().length;
    const partyReady = partySize > 0;

    // --- Dark parchment overlay (matching roster/shop style) ---
    ctx.fillStyle = 'rgba(15, 8, 3, 0.75)';
    ctx.fillRect(0, 60, w, h - 110);
    // Top edge line
    ctx.strokeStyle = '#5a3d20';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(20, 62); ctx.lineTo(w - 20, 62); ctx.stroke();
    // Bottom edge
    ctx.beginPath(); ctx.moveTo(20, h - 52); ctx.lineTo(w - 20, h - 52); ctx.stroke();
    // Corner ornaments
    const cornerSize = 12;
    ctx.strokeStyle = '#6b4e2a';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(20, 62 + cornerSize); ctx.lineTo(20, 62); ctx.lineTo(20 + cornerSize, 62); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w - 20 - cornerSize, 62); ctx.lineTo(w - 20, 62); ctx.lineTo(w - 20, 62 + cornerSize); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(20, h - 52 - cornerSize); ctx.lineTo(20, h - 52); ctx.lineTo(20 + cornerSize, h - 52); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w - 20 - cornerSize, h - 52); ctx.lineTo(w - 20, h - 52); ctx.lineTo(w - 20, h - 52 - cornerSize); ctx.stroke();

    // Torch sconces
    this._drawTorchSconce(ctx, 50, 80);
    this._drawTorchSconce(ctx, w - 50, 80);

    // Board area
    const boardX = 30;
    const boardY = 68;
    const boardW = w - 60;
    const boardH = h - 140;

    // Board backing — dark wood with grain
    const woodGrad = ctx.createLinearGradient(boardX, boardY, boardX, boardY + boardH);
    woodGrad.addColorStop(0, '#2a1808');
    woodGrad.addColorStop(0.3, '#321e0c');
    woodGrad.addColorStop(0.7, '#2a1808');
    woodGrad.addColorStop(1, '#1e1206');
    ctx.fillStyle = woodGrad;
    ctx.fillRect(boardX, boardY, boardW, boardH);

    // Wood grain lines
    ctx.strokeStyle = 'rgba(90, 61, 32, 0.3)';
    ctx.lineWidth = 1;
    for (let gy = boardY + 8; gy < boardY + boardH - 4; gy += 12) {
      ctx.beginPath();
      ctx.moveTo(boardX + 4, gy);
      ctx.lineTo(boardX + boardW - 4, gy + (Math.sin(gy * 0.1) * 2));
      ctx.stroke();
    }

    // Board border — outer frame
    ctx.strokeStyle = '#5a3d20';
    ctx.lineWidth = 4;
    ctx.strokeRect(boardX, boardY, boardW, boardH);
    // Inner border (carved look)
    ctx.strokeStyle = '#3d2510';
    ctx.lineWidth = 1;
    ctx.strokeRect(boardX + 6, boardY + 6, boardW - 12, boardH - 12);

    // Nails at corners and midpoints
    const nails = [
      [boardX + 12, boardY + 12],
      [boardX + boardW - 12, boardY + 12],
      [boardX + 12, boardY + boardH - 12],
      [boardX + boardW - 12, boardY + boardH - 12],
      [boardX + boardW / 2, boardY + 8],
      [boardX + boardW / 2, boardY + boardH - 8],
    ];
    for (const [nx, ny] of nails) {
      ctx.fillStyle = '#666';
      ctx.beginPath();
      ctx.arc(nx, ny, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#999';
      ctx.beginPath();
      ctx.arc(nx - 1, ny - 1, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // --- Title — THE NOTICE BOARD with decorative elements ---
    ctx.textAlign = 'center';
    // Shadow
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = '#0a0500';
    ctx.fillText('\u2550\u2550 THE NOTICE BOARD \u2550\u2550', w / 2 + 1, boardY + 28);
    // Main title
    ctx.fillStyle = '#C4A265';
    ctx.fillText('\u2550\u2550 THE NOTICE BOARD \u2550\u2550', w / 2, boardY + 27);

    // Subtitle
    ctx.font = '10px monospace';
    ctx.fillStyle = '#8B7355';
    ctx.fillText('~ Expeditions Available Today ~', w / 2, boardY + 42);

    // Fragment counter badge (top-right of board)
    const badgeX = boardX + boardW - 80;
    const badgeY = boardY + 14;
    ctx.fillStyle = 'rgba(20, 10, 5, 0.8)';
    ctx.fillRect(badgeX, badgeY, 68, 20);
    ctx.strokeStyle = fragments >= 10 ? '#FFD700' : '#5a3d20';
    ctx.lineWidth = 1;
    ctx.strokeRect(badgeX, badgeY, 68, 20);
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = fragments >= 10 ? '#FFD700' : '#C4A265';
    ctx.textAlign = 'center';
    ctx.fillText(`\u2726 ${fragments}/10`, badgeX + 34, badgeY + 14);

    // Party readiness indicator (top-left of board)
    const partyBadgeX = boardX + 14;
    const partyBadgeY = boardY + 14;
    ctx.fillStyle = 'rgba(20, 10, 5, 0.8)';
    ctx.fillRect(partyBadgeX, partyBadgeY, 90, 20);
    ctx.strokeStyle = partyReady ? '#4CAF50' : '#C0392B';
    ctx.lineWidth = 1;
    ctx.strokeRect(partyBadgeX, partyBadgeY, 90, 20);
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = partyReady ? '#4CAF50' : '#C0392B';
    ctx.textAlign = 'center';
    if (partyReady) {
      ctx.fillText(`\u2694 Party: ${partySize}/4`, partyBadgeX + 45, partyBadgeY + 14);
    } else {
      ctx.fillText('\u26A0 No Party!', partyBadgeX + 45, partyBadgeY + 14);
    }
    ctx.textAlign = 'left';

    // --- Quest list area ---
    const questAreaY = boardY + 50;
    const questAreaH = boardH - 100;
    const noteGap = 8;

    if (this.noticeBoardQuests.length === 0) {
      ctx.textAlign = 'center';
      ctx.font = 'italic 13px monospace';
      ctx.fillStyle = '#666';
      ctx.fillText('The board is bare. No expeditions posted today.', w / 2, boardY + boardH / 2 - 10);
      ctx.font = '11px monospace';
      ctx.fillStyle = '#555';
      ctx.fillText('Check back tomorrow.', w / 2, boardY + boardH / 2 + 10);
      ctx.textAlign = 'left';
    } else {
      // Calculate note sizes — selected quest gets expanded detail view
      const numQuests = this.noticeBoardQuests.length;
      const selectedExpandExtra = 44;
      const totalGaps = (numQuests - 1) * noteGap;
      const baseNoteH = Math.floor((questAreaH - totalGaps - selectedExpandExtra) / numQuests);
      const noteH = Math.max(52, Math.min(baseNoteH, 90));
      const selectedNoteH = noteH + selectedExpandExtra;

      const noteX = boardX + 18;
      const noteW = boardW - 36;

      for (let i = 0; i < numQuests; i++) {
        const quest = this.noticeBoardQuests[i];
        const selected = i === this.selectedQuest;
        const isCleared = world.completedDungeons && world.completedDungeons.has(quest.id);
        const hasFragment = world.collectedFragments && world.collectedFragments.has(quest.id);
        const thisNoteH = selected ? selectedNoteH : noteH;

        // Calculate Y position accounting for expanded selected card
        let ny = questAreaY;
        for (let j = 0; j < i; j++) {
          ny += (j === this.selectedQuest ? selectedNoteH : noteH) + noteGap;
        }

        // Parchment note — slightly tilted
        ctx.save();
        const tiltAngle = (i % 2 === 0 ? -0.008 : 0.012) + (i * 0.003);
        ctx.translate(noteX + noteW / 2, ny + thisNoteH / 2);
        ctx.rotate(tiltAngle);
        ctx.translate(-(noteX + noteW / 2), -(ny + thisNoteH / 2));

        // Glow for selected
        if (selected) {
          ctx.shadowColor = '#FFD700';
          ctx.shadowBlur = 14;
        }

        // Parchment background gradient
        const parchGrad = ctx.createLinearGradient(noteX, ny, noteX, ny + thisNoteH);
        if (selected) {
          parchGrad.addColorStop(0, '#4a3a22');
          parchGrad.addColorStop(0.5, '#3d2e18');
          parchGrad.addColorStop(1, '#352816');
        } else {
          parchGrad.addColorStop(0, '#3a2a18');
          parchGrad.addColorStop(1, '#2a1c10');
        }
        ctx.fillStyle = parchGrad;
        ctx.fillRect(noteX, ny, noteW, thisNoteH);
        ctx.shadowBlur = 0;

        // Border — gold for selected
        ctx.strokeStyle = selected ? '#FFD700' : '#5a3d20';
        ctx.lineWidth = selected ? 2 : 1;
        ctx.strokeRect(noteX, ny, noteW, thisNoteH);

        // Cleared overlay tint
        if (isCleared) {
          ctx.fillStyle = 'rgba(76, 175, 80, 0.08)';
          ctx.fillRect(noteX + 1, ny + 1, noteW - 2, thisNoteH - 2);
        }

        // Pin at top-center
        const pinX = noteX + noteW / 2;
        const pinY = ny - 1;
        ctx.fillStyle = '#8a3018';
        ctx.beginPath();
        ctx.arc(pinX, pinY + 4, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#b84828';
        ctx.beginPath();
        ctx.arc(pinX - 1, pinY + 3, 2, 0, Math.PI * 2);
        ctx.fill();

        // --- Quest card content ---
        const textX = noteX + 14;
        let textY = ny + 18;

        // Row 1: Dungeon name (bold) + skull rating (right-aligned)
        ctx.font = 'bold 13px monospace';
        ctx.fillStyle = selected ? '#FFD700' : '#E8D5B0';
        ctx.fillText(quest.name, textX, textY);

        // Skull icons
        const skullStr = '\u2620'.repeat(quest.skulls) + '\u25CB'.repeat(5 - quest.skulls);
        ctx.font = '11px monospace';
        ctx.fillStyle = quest.skulls >= 4 ? '#C0392B' : (quest.skulls >= 3 ? '#F39C12' : '#8B7355');
        ctx.textAlign = 'right';
        ctx.fillText(skullStr, noteX + noteW - 14, textY);
        ctx.textAlign = 'left';

        // Row 2: Fragment name + floors + tier + status badges
        textY += 16;
        ctx.font = '10px monospace';
        ctx.fillStyle = '#B8A070';
        const floorInfo = `Floors: ${quest.floors}  |  Tier ${quest.tier}`;
        ctx.fillText(floorInfo, textX, textY);

        // Recommended level range
        const levelMin = Math.max(1, (quest.tier - 1) * 2 + 1);
        const levelMax = quest.tier * 3;
        ctx.fillStyle = '#8B7355';
        ctx.fillText(`Lv.${levelMin}-${levelMax}`, textX + 160, textY);

        // Status badges on the right
        ctx.textAlign = 'right';
        if (isCleared) {
          ctx.font = 'bold 10px monospace';
          ctx.fillStyle = '#4CAF50';
          ctx.fillText('\u2713 CLEARED', noteX + noteW - 14, textY);
        } else if (hasFragment) {
          ctx.font = 'bold 10px monospace';
          ctx.fillStyle = '#8E44AD';
          ctx.fillText('\u2726 FRAGMENT', noteX + noteW - 14, textY);
        }
        ctx.textAlign = 'left';

        // Row 3: Lore quote (truncated)
        textY += 15;
        ctx.font = 'italic 10px monospace';
        ctx.fillStyle = '#7a6a50';
        const maxLoreLen = Math.floor((noteW - 28) / 6);
        const loreText = quest.lore.length > maxLoreLen ? quest.lore.substring(0, maxLoreLen - 3) + '...' : quest.lore;
        ctx.fillText(`"${loreText}"`, textX, textY);

        // --- Expanded detail view for selected quest ---
        if (selected) {
          // Separator line
          textY += 10;
          ctx.strokeStyle = 'rgba(196, 162, 101, 0.3)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(noteX + 10, textY);
          ctx.lineTo(noteX + noteW - 10, textY);
          ctx.stroke();

          // Fragment reward
          textY += 14;
          ctx.font = '10px monospace';
          ctx.fillStyle = '#C4A265';
          ctx.fillText(`\u2726 Fragment: ${quest.fragment}`, textX, textY);

          // Treasure
          ctx.fillStyle = '#9B8765';
          const maxTreasLen = Math.floor((noteW - 28) / 6);
          const truncTreas = quest.treasure.length > maxTreasLen ? quest.treasure.substring(0, maxTreasLen - 3) + '...' : quest.treasure;
          ctx.fillText(`\u2737 Treasure: ${truncTreas}`, textX, textY + 14);

          // Theme / monster environment
          ctx.fillStyle = '#6a5a40';
          const maxThemeLen = Math.floor((noteW - 28) / 6);
          const truncTheme = quest.theme.length > maxThemeLen ? quest.theme.substring(0, maxThemeLen - 3) + '...' : quest.theme;
          ctx.fillText(`\u25C6 ${truncTheme}`, textX, textY + 28);
        }

        ctx.restore();
      }

      // --- Register touch hit zones for quest cards ---
      if (world.input && world.input.touch) {
        let touchY = questAreaY;
        for (let i = 0; i < numQuests; i++) {
          const thisH = i === this.selectedQuest ? selectedNoteH : noteH;
          const code = i === this.selectedQuest ? 'Enter' : (i < this.selectedQuest ? 'ArrowUp' : 'ArrowDown');
          world.input.touch.registerHitZone(noteX, touchY, noteW, thisH, code);
          touchY += thisH + noteGap;
        }
      }
    }

    // --- Party readiness warning (below board, above touch bar) ---
    const warningY = boardY + boardH + 4;
    ctx.textAlign = 'center';
    if (!partyReady) {
      ctx.font = 'bold 12px monospace';
      ctx.fillStyle = '#C0392B';
      ctx.fillText('\u26A0 NO PARTY FORMED \u2014 Recruit adventurers before embarking!', w / 2, warningY);
    } else if (partySize < 4) {
      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = '#F39C12';
      ctx.fillText(`\u2694 PARTY OF ${partySize} \u2014 Full party of 4 recommended`, w / 2, warningY);
    } else {
      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = '#4CAF50';
      ctx.fillText('\u2694 Party ready \u2014 Choose your expedition', w / 2, warningY);
    }
    ctx.textAlign = 'left';

    // --- EMBARK button + bottom bar ---
    const embarkLabel = partyReady ? '\u2694 EMBARK' : 'EMBARK (no party)';
    this._drawTouchBar(ctx, w, h, world, [
      { label: 'BACK', code: 'Escape', width: 80 },
      { label: '\u25B2', code: 'ArrowUp', width: 44 },
      { label: '\u25BC', code: 'ArrowDown', width: 44 },
      { label: embarkLabel, code: 'Enter', width: 180 },
    ]);
  }

  isStriderAvailable(world) {
    const fragmentsCollected = world.collectedFragments.size;
    const dungeonsCompleted = world.completedDungeons.size;
    return fragmentsCollected >= 2 || dungeonsCompleted >= 5;
  }

  _renderStrider(ctx, world) {
    const w = ctx.canvas.width;
    const centerX = w / 2;
    const startY = 80;

    ctx.textAlign = 'center';
    ctx.fillStyle = '#C0C0C0';
    ctx.font = 'bold 18px monospace';
    ctx.fillText('STRIDER — The Wanderer', centerX, startY);

    ctx.fillStyle = '#8B7355';
    ctx.font = '13px monospace';
    const lines = [
      'Ah, seeker of the lost light. The Sunstone calls to you...',
      'Three thousand years ago, a mage shattered the source of all light.',
      'Now its fragments whisper from the shadows of these ancient dungeons.',
      '',
      `You have found ${world.collectedFragments.size} fragments.`,
      'Each one carries a piece of the consciousness of Dorevus the Unmoored.',
    ];
    lines.forEach((line, i) => {
      ctx.fillText(line, centerX, startY + 40 + i * 24);
    });
    ctx.textAlign = 'left';

    ctx.textAlign = 'center';
    ctx.font = '13px monospace';
    ctx.fillStyle = '#C4A265';
    ctx.fillText('SPACE: Continue    ESC: Back', w / 2, ctx.canvas.height - 20);
    ctx.textAlign = 'left';
  }

  _renderNPCs(ctx, world) {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    const fragments = (world.collectedFragments ? world.collectedFragments.size : 0);

    // Refresh available NPCs
    this.availableNPCs = this.npcDialogue.getAvailableNPCs(fragments);

    // --- Dark parchment overlay (matching roster/shop style) ---
    ctx.fillStyle = 'rgba(15, 8, 3, 0.75)';
    ctx.fillRect(0, 60, w, h - 110);
    // Top edge line
    ctx.strokeStyle = '#5a3d20';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(20, 62); ctx.lineTo(w - 20, 62); ctx.stroke();
    // Bottom edge
    ctx.beginPath(); ctx.moveTo(20, h - 52); ctx.lineTo(w - 20, h - 52); ctx.stroke();
    // Corner ornaments
    const cornerSize = 12;
    ctx.strokeStyle = '#6b4e2a';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(20, 62 + cornerSize); ctx.lineTo(20, 62); ctx.lineTo(20 + cornerSize, 62); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w - 20 - cornerSize, 62); ctx.lineTo(w - 20, 62); ctx.lineTo(w - 20, 62 + cornerSize); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(20, h - 52 - cornerSize); ctx.lineTo(20, h - 52); ctx.lineTo(20 + cornerSize, h - 52); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w - 20 - cornerSize, h - 52); ctx.lineTo(w - 20, h - 52); ctx.lineTo(w - 20, h - 52 - cornerSize); ctx.stroke();

    // Torch sconces
    this._drawTorchSconce(ctx, 50, 80);
    this._drawTorchSconce(ctx, w - 50, 80);

    // NPC descriptions for cards (keyed by npc id)
    const npcDescs = {
      aldric: { short: 'Tavern owner. Knows everyone.', long: 'Been pouring drinks for twenty years. Sees everything, says just enough. If something happened in this tavern, Aldric knows.', icon: 'tankard' },
      mira: { short: 'Maps the depths below.', long: 'Her maps have saved more lives than any sword. She charts what others fear to remember — every passage, every dead end.', icon: 'compass' },
      elden: { short: 'A flickering presence.', long: 'No one sits at table seven. No one living, anyway. Elden speaks in riddles and half-truths, but his warnings have weight.', icon: 'ghost' },
      orin: { short: 'Scarred veteran. Still sharp.', long: 'Former sellsword with more scars than stories he\'ll tell. Knows the dungeons by the wounds they gave him. His advice cuts deep.', icon: 'sword' },
      bessa: { short: 'Deals in survival.', long: 'Every potion, blade, and charm passes through Bessa\'s hands first. Fair prices — if she likes you. Steep ones if she doesn\'t.', icon: 'coin' },
    };

    // --- Header with count ---
    ctx.textAlign = 'center';
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = '#000';
    ctx.fillText('AVAILABLE PATRONS', w / 2 + 1, 83);
    ctx.fillStyle = '#E8D5B0';
    ctx.fillText('AVAILABLE PATRONS', w / 2, 82);
    // Count badge
    ctx.font = '11px monospace';
    ctx.fillStyle = '#8B7355';
    ctx.fillText(`${this.availableNPCs.length} soul${this.availableNPCs.length !== 1 ? 's' : ''} present  ·  Fragments: ${fragments}/10`, w / 2, 98);
    // Divider
    ctx.fillStyle = '#6b5030';
    ctx.fillText('═══════════════════════════', w / 2, 110);

    if (this.availableNPCs.length === 0) {
      ctx.fillStyle = '#555';
      ctx.font = '14px monospace';
      ctx.fillText('The tavern is quiet. No one wishes to speak.', w / 2, 200);
      ctx.textAlign = 'left';
      return;
    }

    // --- NPC cards ---
    const cardW = 150;
    const cardH = 220;
    const gap = 12;
    const maxCards = this.availableNPCs.length;
    const totalW = maxCards * cardW + (maxCards - 1) * gap;
    const startX = Math.max(30, (w - totalW) / 2);
    const startY = 120;

    for (let i = 0; i < this.availableNPCs.length; i++) {
      const npc = this.availableNPCs[i];
      const desc = npcDescs[npc.id] || { short: npc.title, long: '', icon: 'default' };
      const x = startX + i * (cardW + gap);
      const selected = i === this.selectedNPC && !this.npcDialogue.active;

      // Card background with subtle gradient
      const cardGrad = ctx.createLinearGradient(x, startY, x, startY + cardH);
      if (selected) {
        cardGrad.addColorStop(0, '#3a2510');
        cardGrad.addColorStop(1, '#2a1808');
      } else {
        cardGrad.addColorStop(0, '#1e1408');
        cardGrad.addColorStop(1, '#140e06');
      }
      ctx.fillStyle = cardGrad;
      ctx.fillRect(x, startY, cardW, cardH);

      // Selected glow
      if (selected) {
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 12;
      }
      // Border — gold for selected, muted for others
      ctx.strokeStyle = selected ? '#FFD700' : '#3a2a18';
      ctx.lineWidth = selected ? 2.5 : 1;
      ctx.strokeRect(x, startY, cardW, cardH);
      ctx.shadowBlur = 0;

      // Inner border accent for selected
      if (selected) {
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 3, startY + 3, cardW - 6, cardH - 6);
      }

      // --- Portrait silhouette area ---
      const portraitSize = 48;
      const portraitX = x + (cardW - portraitSize) / 2;
      const portraitY = startY + 14;
      // Portrait background
      ctx.fillStyle = '#1a0e06';
      ctx.fillRect(portraitX, portraitY, portraitSize, portraitSize);
      ctx.fillStyle = '#2d1a0a';
      ctx.fillRect(portraitX + 2, portraitY + 2, portraitSize - 4, portraitSize - 4);
      // Portrait frame
      ctx.strokeStyle = selected ? (npc.color || '#FFD700') : '#5a3d20';
      ctx.lineWidth = selected ? 2 : 1;
      ctx.strokeRect(portraitX, portraitY, portraitSize, portraitSize);

      // Draw distinct silhouette per NPC identity
      const cx = portraitX + portraitSize / 2;
      const cy = portraitY + portraitSize / 2;
      ctx.fillStyle = selected ? (npc.color || '#6b5030') : '#4a3520';

      if (desc.icon === 'tankard') {
        // Aldric — tankard silhouette
        ctx.fillRect(cx - 8, cy - 10, 16, 18);
        ctx.fillRect(cx + 8, cy - 6, 5, 10);
        ctx.fillRect(cx - 10, cy + 8, 20, 3);
      } else if (desc.icon === 'compass') {
        // Mira — compass/map silhouette
        ctx.beginPath();
        ctx.arc(cx, cy, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1a0e06';
        ctx.beginPath();
        ctx.arc(cx, cy, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = selected ? (npc.color || '#6b5030') : '#4a3520';
        // Compass needle
        ctx.beginPath();
        ctx.moveTo(cx, cy - 10); ctx.lineTo(cx + 3, cy); ctx.lineTo(cx, cy + 10); ctx.lineTo(cx - 3, cy);
        ctx.closePath(); ctx.fill();
      } else if (desc.icon === 'ghost') {
        // Elden — ghostly figure
        ctx.globalAlpha = selected ? 0.8 : 0.5;
        ctx.beginPath();
        ctx.arc(cx, cy - 6, 8, Math.PI, 0);
        ctx.lineTo(cx + 8, cy + 10);
        ctx.quadraticCurveTo(cx + 4, cy + 6, cx, cy + 10);
        ctx.quadraticCurveTo(cx - 4, cy + 6, cx - 8, cy + 10);
        ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 1.0;
      } else if (desc.icon === 'sword') {
        // Orin — crossed swords
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(0.5);
        ctx.fillRect(-2, -14, 4, 24);
        ctx.fillRect(-6, 8, 12, 3);
        ctx.restore();
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(-0.5);
        ctx.fillRect(-2, -14, 4, 24);
        ctx.fillRect(-6, 8, 12, 3);
        ctx.restore();
      } else if (desc.icon === 'coin') {
        // Bessa — gold coins stack
        ctx.beginPath(); ctx.ellipse(cx - 4, cy + 4, 10, 6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1a0e06';
        ctx.beginPath(); ctx.ellipse(cx - 4, cy + 2, 8, 4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = selected ? (npc.color || '#6b5030') : '#4a3520';
        ctx.beginPath(); ctx.ellipse(cx + 2, cy - 2, 10, 6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1a0e06';
        ctx.beginPath(); ctx.ellipse(cx + 2, cy - 4, 8, 4, 0, 0, Math.PI * 2); ctx.fill();
      } else {
        // Default — head + body silhouette
        ctx.beginPath(); ctx.arc(cx, cy - 6, 8, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(cx - 10, cy + 14); ctx.lineTo(cx, cy + 2); ctx.lineTo(cx + 10, cy + 14); ctx.closePath(); ctx.fill();
      }

      // --- Name ---
      ctx.textAlign = 'center';
      ctx.fillStyle = selected ? '#FFD700' : (npc.color || '#C4A265');
      ctx.font = 'bold 13px monospace';
      ctx.fillText(npc.name, x + cardW / 2, startY + 80);

      // --- Title/role ---
      ctx.fillStyle = '#777';
      ctx.font = 'italic 10px monospace';
      ctx.fillText(npc.title, x + cardW / 2, startY + 95);

      // --- Short description ---
      ctx.fillStyle = '#5a5040';
      ctx.font = '9px monospace';
      ctx.fillText(desc.short, x + cardW / 2, startY + 112);

      // --- Expanded description for selected ---
      if (selected) {
        // Expanded text area
        ctx.fillStyle = '#8B7355';
        ctx.font = '10px monospace';
        const words = desc.long.split(' ');
        let line = '';
        let lineY = startY + 130;
        const maxLineW = cardW - 16;
        for (const word of words) {
          const test = line + (line ? ' ' : '') + word;
          if (ctx.measureText(test).width > maxLineW && line) {
            ctx.fillText(line, x + cardW / 2, lineY);
            line = word;
            lineY += 14;
            if (lineY > startY + cardH - 32) break;
          } else {
            line = test;
          }
        }
        if (line && lineY <= startY + cardH - 32) {
          ctx.fillText(line, x + cardW / 2, lineY);
        }

        // "Talk" prompt with pulsing
        const pulse = 0.7 + 0.3 * Math.sin(this.flickerPhase * 2);
        ctx.fillStyle = `rgba(196, 162, 101, ${pulse})`;
        ctx.font = 'bold 11px monospace';
        ctx.fillText('[ ENTER to talk ]', x + cardW / 2, startY + cardH - 10);
      }

      // Touch hit zone for each NPC card
      if (world.input && world.input.touch) {
        if (selected) {
          world.input.touch.registerHitZone(x, startY, cardW, cardH, 'Enter');
        } else {
          world.input.touch.registerHitZone(x, startY, cardW, cardH, `_selectNPC_${i}`);
        }
      }
    }

    ctx.textAlign = 'left';

    // Bottom bar
    const buttons = [
      { label: 'BACK', code: 'Escape', width: 80 },
      { label: '◄', code: 'ArrowLeft', width: 50 },
      { label: '►', code: 'ArrowRight', width: 50 },
      { label: 'TALK', code: 'Enter', width: 70 },
    ];
    this._drawTouchBar(ctx, w, h, world, buttons, -1);
  }

  // Update method — called from game loop for animation + typewriter
  update(timestamp) {
    // Delta-time normalization (60fps baseline)
    if (!this._lastTimestamp) this._lastTimestamp = timestamp;
    const dt = (timestamp - this._lastTimestamp) / 16.67;
    this._lastTimestamp = timestamp;

    // Animate flickerPhase (moved from render)
    this.flickerPhase = (this.flickerPhase + 0.05 * dt) % (Math.PI * 2);

    if (this.npcDialogue.active) {
      this.npcDialogue.update(timestamp);
    }
  }
}
