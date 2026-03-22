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
          const dungeonName = quest.name || quest.id;
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
      if (code === 'Enter' || code === 'Space') {
        // Confirmed — clear save and reload
        GameSave.clearSave();
        window.location.reload();
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

    // Confirm button
    ctx.fillStyle = '#6b2a2a';
    ctx.fillRect(W / 2 - btnW - 15, btnY, btnW, btnH);
    ctx.strokeStyle = '#C0392B';
    ctx.lineWidth = 2;
    ctx.strokeRect(W / 2 - btnW - 15, btnY, btnW, btnH);
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('ERASE & RESTART', W / 2 - btnW / 2 - 15, btnY + 28);

    // Cancel button
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(W / 2 + 15, btnY, btnW, btnH);
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    ctx.strokeRect(W / 2 + 15, btnY, btnW, btnH);
    ctx.fillStyle = '#FFD700';
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

    // Warm base — old stone showing through, lit by firelight
    ctx.fillStyle = '#2a1e14';
    ctx.fillRect(0, 0, w, h);

    // Stone patches (behind wood — exposed where planks rotted away)
    const stonePatches = [
      { x: 0, y: 180, w: 110, h: 80 },
      { x: 200, y: 420, w: 90, h: 60 },
      { x: w / 2 + 60, y: 130, w: 80, h: 70 },
      // Large bottom-right stone corner — foundation exposed
      { x: w - 260, y: h - 200, w: 260, h: 150 },
      { x: w - 180, y: h - 280, w: 180, h: 80 },
      // Top-left crumble
      { x: 0, y: 0, w: 80, h: 60 },
    ];
    for (const sp of stonePatches) {
      // Rough stone fill — warm grey lit by firelight
      ctx.fillStyle = '#3a3228';
      ctx.fillRect(sp.x, sp.y, sp.w, sp.h);

      // Individual stone blocks with slight color variation
      const blockH = 20;
      const blockW = sp.w * 0.45;
      for (let sy = sp.y; sy < sp.y + sp.h; sy += blockH) {
        const rowOffset = ((sy - sp.y) / blockH) % 2 === 0 ? 0 : blockW * 0.5;
        for (let sx = sp.x + rowOffset; sx < sp.x + sp.w; sx += blockW) {
          const bw = Math.min(blockW - 3, sp.x + sp.w - sx);
          const bh = Math.min(blockH - 3, sp.y + sp.h - sy);
          if (bw <= 0 || bh <= 0) continue;
          // Stone color variation
          const sv = seed(sx, sy);
          const r = 50 + sv * 22;
          const g = 44 + sv * 16;
          const b = 35 + sv * 12;
          ctx.fillStyle = `rgb(${r | 0}, ${g | 0}, ${b | 0})`;
          ctx.fillRect(sx + 1, sy + 1, bw, bh);
        }
        // Horizontal mortar line
        ctx.fillStyle = 'rgba(15, 10, 6, 0.7)';
        ctx.fillRect(sp.x, sy, sp.w, 3);
      }
      // Vertical mortar lines
      for (let row = 0; row < sp.h / blockH; row++) {
        const sy = sp.y + row * blockH;
        const rowOffset = row % 2 === 0 ? 0 : blockW * 0.5;
        for (let sx = sp.x + rowOffset; sx < sp.x + sp.w; sx += blockW) {
          ctx.fillStyle = 'rgba(15, 10, 6, 0.6)';
          ctx.fillRect(sx, sy, 3, blockH);
        }
      }

      // Moss/damp stains on stone
      if (sp.h > 60) {
        const mx = sp.x + seed(sp.x + 1, sp.y + 1) * sp.w * 0.5;
        const my = sp.y + sp.h * 0.6;
        const mw = 30 + seed(sp.x + 2, sp.y) * 40;
        ctx.fillStyle = 'rgba(20, 35, 15, 0.25)';
        ctx.fillRect(mx, my, mw, 15);
        ctx.fillStyle = 'rgba(25, 40, 18, 0.15)';
        ctx.fillRect(mx + 5, my - 8, mw - 10, 10);
      }

      // Edge shadow where wood meets stone
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(sp.x, sp.y, sp.w, 2);
      ctx.fillRect(sp.x, sp.y, 2, sp.h);
      ctx.fillRect(sp.x + sp.w - 2, sp.y, 2, sp.h);
      ctx.fillRect(sp.x, sp.y + sp.h - 2, sp.w, 2);
    }

    // Weathered wood planks over stone
    const plankHeight = 32;
    for (let y = 0; y < h; y += plankHeight) {
      const row = y / plankHeight;
      // Vary wood color — some planks darker, some lighter, some greenish (rot)
      const baseR = 65 + seed(row, 0) * 25;
      const baseG = 40 + seed(row, 1) * 15;
      const baseB = 20 + seed(row, 2) * 10;
      const isRotted = seed(row, 3) > 0.75;
      const isMissing = seed(row, 4) > 0.88;

      if (isMissing) continue; // Skip — stone shows through

      if (isRotted) {
        // Rotted plank — darker, greenish tint
        ctx.fillStyle = `rgb(${baseR - 10}, ${baseG + 8}, ${baseB})`;
      } else {
        ctx.fillStyle = `rgb(${baseR | 0}, ${baseG | 0}, ${baseB | 0})`;
      }
      ctx.fillRect(0, y, w, plankHeight - 1);

      // Wood grain lines — irregular
      ctx.strokeStyle = `rgba(0, 0, 0, ${isRotted ? 0.25 : 0.12})`;
      ctx.lineWidth = 1;
      for (let g = 0; g < 3; g++) {
        const gy = y + 5 + g * 9;
        ctx.beginPath();
        ctx.moveTo(0, gy);
        for (let x = 0; x < w; x += 30) {
          const wobble = Math.sin(x * 0.08 + y * 0.3 + g) * 2.5;
          ctx.lineTo(x + 15, gy + wobble);
          ctx.lineTo(x + 30, gy + wobble * 0.3);
        }
        ctx.stroke();
      }

      // Dark knots in wood
      if (seed(row, 5) > 0.5) {
        const kx = seed(row, 6) * (w - 40) + 20;
        const kr = 4 + seed(row, 7) * 5;
        ctx.beginPath();
        ctx.arc(kx, y + plankHeight / 2, kr, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(10, 6, 2, ${0.5 + seed(row, 8) * 0.3})`;
        ctx.fill();
        // Knot ring
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Rot stains — dark wet patches
      if (isRotted) {
        const rx = seed(row, 9) * w * 0.6;
        const rw = 60 + seed(row, 10) * 120;
        ctx.fillStyle = 'rgba(15, 20, 10, 0.35)';
        ctx.fillRect(rx, y + 2, rw, plankHeight - 4);
      }

      // Plank gap — wider and darker than before
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(0, y + plankHeight - 1, w, 2);
    }

    // Vertical plank joints (staggered, uneven)
    for (let row = 0; row < h / plankHeight; row++) {
      const y = row * plankHeight;
      const offset = row % 2 === 0 ? 0 : w * 0.35;
      for (let x = offset; x < w; x += w * 0.45) {
        const jitter = seed(row, x) * 6 - 3;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(x + jitter, y, 2, plankHeight);
      }
    }

    // Cracks in the wall — thin dark lines
    const cracks = [
      { x1: 120, y1: 60, x2: 135, y2: 130, x3: 128, y3: 180 },
      { x1: w - 200, y1: 200, x2: w - 185, y2: 260, x3: w - 195, y3: 300 },
      { x1: w / 2 + 80, y1: 380, x2: w / 2 + 90, y2: 430, x3: w / 2 + 75, y3: 470 },
    ];
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.lineWidth = 1;
    for (const c of cracks) {
      ctx.beginPath();
      ctx.moveTo(c.x1, c.y1);
      ctx.quadraticCurveTo(c.x2, c.y2, c.x3, c.y3);
      ctx.stroke();
      // Thin highlight next to crack
      ctx.strokeStyle = 'rgba(50, 35, 20, 0.2)';
      ctx.beginPath();
      ctx.moveTo(c.x1 + 1, c.y1);
      ctx.quadraticCurveTo(c.x2 + 1, c.y2, c.x3 + 1, c.y3);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    }

    // === Fireplace (center of back wall) ===
    const fpX = w / 2 - 80;
    const fpY = h - 200;
    const fpW = 160;
    const fpH = 150;

    // Stone hearth surround
    ctx.fillStyle = '#2a2220';
    ctx.fillRect(fpX - 12, fpY - 8, fpW + 24, fpH + 8);
    // Hearth arch (rounded top)
    ctx.beginPath();
    ctx.moveTo(fpX, fpY + fpH);
    ctx.lineTo(fpX, fpY + 20);
    ctx.quadraticCurveTo(fpX + fpW / 2, fpY - 30, fpX + fpW, fpY + 20);
    ctx.lineTo(fpX + fpW, fpY + fpH);
    ctx.closePath();
    ctx.fillStyle = '#0a0604';
    ctx.fill();
    ctx.strokeStyle = '#3d3230';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Inner stone border
    ctx.strokeStyle = '#4a3d38';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(fpX + 6, fpY + fpH);
    ctx.lineTo(fpX + 6, fpY + 26);
    ctx.quadraticCurveTo(fpX + fpW / 2, fpY - 22, fpX + fpW - 6, fpY + 26);
    ctx.lineTo(fpX + fpW - 6, fpY + fpH);
    ctx.stroke();

    // Mantle shelf
    ctx.fillStyle = '#3d2814';
    ctx.fillRect(fpX - 20, fpY - 12, fpW + 40, 8);
    ctx.fillStyle = '#5a3d1e';
    ctx.fillRect(fpX - 20, fpY - 14, fpW + 40, 3);

    // Logs
    ctx.fillStyle = '#2a1508';
    ctx.fillRect(fpX + 20, fpY + fpH - 30, 50, 12);
    ctx.fillRect(fpX + 60, fpY + fpH - 35, 55, 10);
    ctx.fillStyle = '#3d1e0a';
    ctx.fillRect(fpX + 35, fpY + fpH - 40, 45, 8);

    // Embers at base
    for (let i = 0; i < 12; i++) {
      const ex = fpX + 25 + seed(i, 100) * (fpW - 50);
      const ey = fpY + fpH - 10 - seed(i, 101) * 20;
      const er = 2 + seed(i, 102) * 3;
      const pulse = Math.sin(this.flickerPhase * 2 + i * 1.7) * 0.3 + 0.7;
      ctx.fillStyle = `rgba(255, ${80 + seed(i, 103) * 80 | 0}, 0, ${pulse * 0.6})`;
      ctx.beginPath();
      ctx.arc(ex, ey, er, 0, Math.PI * 2);
      ctx.fill();
    }

    // Fire flames (animated)
    const fireFlicker = Math.sin(this.flickerPhase * 2.5) * 8;
    // Outer flame
    const fireGrad = ctx.createRadialGradient(
      w / 2, fpY + fpH - 50 + fireFlicker * 0.3, 5,
      w / 2, fpY + fpH - 20, 50
    );
    fireGrad.addColorStop(0, 'rgba(255, 220, 50, 0.8)');
    fireGrad.addColorStop(0.4, 'rgba(255, 120, 10, 0.5)');
    fireGrad.addColorStop(1, 'rgba(255, 50, 0, 0)');
    ctx.fillStyle = fireGrad;
    ctx.beginPath();
    ctx.moveTo(fpX + 30, fpY + fpH - 10);
    ctx.quadraticCurveTo(fpX + 50 + fireFlicker, fpY + 40, w / 2, fpY + 30 + fireFlicker * 0.5);
    ctx.quadraticCurveTo(fpX + fpW - 50 - fireFlicker, fpY + 40, fpX + fpW - 30, fpY + fpH - 10);
    ctx.fill();

    // Inner bright flame
    const innerGrad = ctx.createRadialGradient(
      w / 2, fpY + fpH - 45, 3,
      w / 2, fpY + fpH - 25, 30
    );
    innerGrad.addColorStop(0, 'rgba(255, 255, 200, 0.9)');
    innerGrad.addColorStop(0.5, 'rgba(255, 200, 50, 0.4)');
    innerGrad.addColorStop(1, 'rgba(255, 120, 0, 0)');
    ctx.fillStyle = innerGrad;
    ctx.beginPath();
    ctx.ellipse(w / 2, fpY + fpH - 40 + fireFlicker * 0.3, 20, 35 + fireFlicker, 0, 0, Math.PI * 2);
    ctx.fill();

    // Fireplace warm glow on wall above — large, bright
    const hearthGlow = ctx.createRadialGradient(w / 2, fpY + 20, 20, w / 2, fpY + 20, 350);
    hearthGlow.addColorStop(0, `rgba(255, 150, 40, ${0.28 + Math.sin(this.flickerPhase * 1.5) * 0.06})`);
    hearthGlow.addColorStop(0.5, `rgba(255, 120, 20, ${0.12 + Math.sin(this.flickerPhase * 1.2) * 0.03})`);
    hearthGlow.addColorStop(1, 'rgba(255, 80, 0, 0)');
    ctx.fillStyle = hearthGlow;
    ctx.fillRect(0, 0, w, fpY + fpH);

    // === Trophy Wall (right of fireplace) ===
    this._drawTrophyWall(ctx, w, h, fpX + fpW + 40, fpY + 10);

    // Warm torch glow overlay (radial gradients on left and right) — bright
    const flicker = Math.sin(this.flickerPhase) * 0.05 + 0.22;
    const glow1 = ctx.createRadialGradient(80, 120, 15, 80, 120, 350);
    glow1.addColorStop(0, `rgba(255, 170, 50, ${flicker + 0.08})`);
    glow1.addColorStop(0.5, `rgba(255, 130, 30, ${flicker * 0.4})`);
    glow1.addColorStop(1, 'rgba(255, 100, 10, 0)');
    ctx.fillStyle = glow1;
    ctx.fillRect(0, 0, 450, 550);

    const glow2 = ctx.createRadialGradient(w - 80, 120, 15, w - 80, 120, 350);
    glow2.addColorStop(0, `rgba(255, 170, 50, ${flicker + 0.06})`);
    glow2.addColorStop(0.5, `rgba(255, 130, 30, ${flicker * 0.35})`);
    glow2.addColorStop(1, 'rgba(255, 100, 10, 0)');
    ctx.fillStyle = glow2;
    ctx.fillRect(w - 450, 0, 450, 550);

    // === Wooden ceiling beams ===
    const beamH = 12;
    const beamColor = '#3d2814';
    const beamHighlight = '#5a3d1e';
    for (let bx = 0; bx < 4; bx++) {
      const beamX = 60 + bx * (w - 120) / 3;
      // Vertical beam from top
      ctx.fillStyle = beamColor;
      ctx.fillRect(beamX - 6, 0, 12, h * 0.7);
      ctx.fillStyle = beamHighlight;
      ctx.fillRect(beamX - 6, 0, 3, h * 0.7);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(beamX + 4, 0, 2, h * 0.7);
    }
    // Horizontal beam across top
    ctx.fillStyle = beamColor;
    ctx.fillRect(0, 58, w, beamH);
    ctx.fillStyle = beamHighlight;
    ctx.fillRect(0, 58, w, 3);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, 58 + beamH - 2, w, 2);

    // === Wall decorations — old paintings and shields ===
    // Shield (left wall)
    const shieldX = 130;
    const shieldY = 140;
    ctx.fillStyle = '#3a2a18';
    ctx.beginPath();
    ctx.moveTo(shieldX, shieldY);
    ctx.lineTo(shieldX + 30, shieldY);
    ctx.lineTo(shieldX + 30, shieldY + 30);
    ctx.lineTo(shieldX + 15, shieldY + 42);
    ctx.lineTo(shieldX, shieldY + 30);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#5a3d20';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Shield cross
    ctx.strokeStyle = '#6b4e2a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(shieldX + 15, shieldY + 4);
    ctx.lineTo(shieldX + 15, shieldY + 36);
    ctx.moveTo(shieldX + 4, shieldY + 16);
    ctx.lineTo(shieldX + 26, shieldY + 16);
    ctx.stroke();

    // Old painting (right wall) — simple framed rectangle
    const paintX = w - 180;
    const paintY = 130;
    const paintW = 50;
    const paintH = 40;
    // Frame
    ctx.fillStyle = '#3d2510';
    ctx.fillRect(paintX - 4, paintY - 4, paintW + 8, paintH + 8);
    ctx.fillStyle = '#5a3818';
    ctx.fillRect(paintX - 3, paintY - 3, paintW + 6, paintH + 6);
    // Canvas (dark landscape)
    const paintGrad = ctx.createLinearGradient(paintX, paintY, paintX, paintY + paintH);
    paintGrad.addColorStop(0, '#1a2030');
    paintGrad.addColorStop(0.5, '#1a2820');
    paintGrad.addColorStop(1, '#0f1510');
    ctx.fillStyle = paintGrad;
    ctx.fillRect(paintX, paintY, paintW, paintH);
    // Hint of a moon
    ctx.fillStyle = 'rgba(200, 200, 180, 0.3)';
    ctx.beginPath();
    ctx.arc(paintX + 38, paintY + 12, 6, 0, Math.PI * 2);
    ctx.fill();

    // Second shield (right side, lower)
    const sh2X = w - 110;
    const sh2Y = 200;
    ctx.fillStyle = '#4a3420';
    ctx.beginPath();
    ctx.arc(sh2X + 14, sh2Y + 14, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#6b4e2a';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#2a1a0e';
    ctx.beginPath();
    ctx.arc(sh2X + 14, sh2Y + 14, 8, 0, Math.PI * 2);
    ctx.fill();

    // === Floor — dark wooden planks (below the bar counter line) ===
    const floorY = h - 80;
    const floorGrad = ctx.createLinearGradient(0, floorY, 0, h);
    floorGrad.addColorStop(0, '#3a2818');
    floorGrad.addColorStop(1, '#1e140c');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, floorY, w, h - floorY);
    // Plank lines on floor
    for (let fy = floorY; fy < h - 50; fy += 8) {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(0, fy, w, 1);
    }

    // Bottom bar — old dark tavern bar counter
    ctx.fillStyle = '#1e120a';
    ctx.fillRect(0, h - 50, w, 50);
    ctx.fillStyle = '#3d2a18';
    ctx.fillRect(0, h - 50, w, 4);
    ctx.fillStyle = '#5a3d20';
    ctx.fillRect(0, h - 48, w, 2);

    // Bar counter edge highlight
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

    // === Bar counter — left side ===
    const barX = 40;
    const barY = 220;
    const barW = 180;
    const barH = 120;

    // Bar counter top surface (perspective — wider at bottom)
    ctx.fillStyle = '#3d2510';
    ctx.beginPath();
    ctx.moveTo(barX, barY);
    ctx.lineTo(barX + barW, barY);
    ctx.lineTo(barX + barW + 20, barY + barH);
    ctx.lineTo(barX - 10, barY + barH);
    ctx.closePath();
    ctx.fill();

    // Bar top edge highlight
    ctx.fillStyle = '#5a3818';
    ctx.fillRect(barX, barY, barW, 4);

    // Bar front face
    ctx.fillStyle = '#2a1808';
    ctx.fillRect(barX - 10, barY + barH, barW + 30, 60);
    // Plank lines on bar front
    for (let i = 0; i < 4; i++) {
      const py = barY + barH + 12 + i * 14;
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(barX - 10, py, barW + 30, 1);
    }

    // Bottles on back shelf
    const bottleColors = ['#4a2020', '#2a4a20', '#3a2a50', '#5a4020', '#204040'];
    for (let i = 0; i < 5; i++) {
      const bx = barX + 20 + i * 30;
      const by = barY - 40;
      // Bottle body
      ctx.fillStyle = bottleColors[i];
      ctx.fillRect(bx, by, 12, 30);
      // Bottle neck
      ctx.fillStyle = bottleColors[i];
      ctx.fillRect(bx + 3, by - 10, 6, 12);
      // Cork/cap
      ctx.fillStyle = '#5a4a30';
      ctx.fillRect(bx + 4, by - 12, 4, 4);
      // Highlight
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(bx + 2, by + 2, 3, 20);
    }

    // Mugs on bar
    for (let i = 0; i < 3; i++) {
      const mx = barX + 30 + i * 50;
      const my = barY + 10;
      // Mug body
      ctx.fillStyle = '#5a3818';
      ctx.fillRect(mx, my, 18, 22);
      // Handle
      ctx.strokeStyle = '#5a3818';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(mx + 20, my + 11, 8, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
      // Ale inside
      ctx.fillStyle = '#8a6020';
      ctx.fillRect(mx + 2, my + 4, 14, 16);
      // Foam
      ctx.fillStyle = '#d4c490';
      ctx.fillRect(mx + 1, my + 2, 16, 4);
    }

    // === Aldric behind bar (simple figure) ===
    const aldricX = barX + barW / 2;
    const aldricY = barY - 20;
    // Head
    ctx.fillStyle = '#c08060';
    ctx.beginPath();
    ctx.arc(aldricX, aldricY - 30, 14, 0, Math.PI * 2);
    ctx.fill();
    // Body (apron)
    ctx.fillStyle = '#3a2a18';
    ctx.fillRect(aldricX - 16, aldricY - 16, 32, 36);
    // Apron front
    ctx.fillStyle = '#5a4a38';
    ctx.fillRect(aldricX - 10, aldricY - 10, 20, 30);

    // === Bessa's supply corner (right side) ===
    const bessaX = 530;
    const bessaY = 220;
    // Supply crates
    ctx.fillStyle = '#2a1a0e';
    ctx.fillRect(bessaX, bessaY + 20, 40, 35);
    ctx.fillRect(bessaX + 45, bessaY + 25, 35, 30);
    ctx.strokeStyle = '#3d2814';
    ctx.lineWidth = 1;
    ctx.strokeRect(bessaX, bessaY + 20, 40, 35);
    ctx.strokeRect(bessaX + 45, bessaY + 25, 35, 30);
    // Cross straps on crates
    ctx.strokeStyle = '#4a3018';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bessaX + 2, bessaY + 22);
    ctx.lineTo(bessaX + 38, bessaY + 53);
    ctx.moveTo(bessaX + 38, bessaY + 22);
    ctx.lineTo(bessaX + 2, bessaY + 53);
    ctx.stroke();

    // Shelves behind Bessa
    ctx.fillStyle = '#3d2510';
    ctx.fillRect(bessaX - 10, bessaY - 30, 110, 6);
    ctx.fillRect(bessaX - 10, bessaY - 60, 110, 6);
    // Potion bottles on shelves
    const potionColors = ['#a03030', '#3060a0', '#30a030', '#a0a030'];
    for (let i = 0; i < 4; i++) {
      const px = bessaX + i * 24;
      ctx.fillStyle = potionColors[i];
      ctx.fillRect(px, bessaY - 55, 10, 20);
      ctx.fillRect(px + 3, bessaY - 60, 4, 7);
    }

    // Bessa figure
    const bessaFigX = bessaX + 40;
    const bessaFigY = bessaY - 10;
    ctx.fillStyle = '#b08060';
    ctx.beginPath();
    ctx.arc(bessaFigX, bessaFigY - 28, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4a3028';
    ctx.fillRect(bessaFigX - 14, bessaFigY - 16, 28, 34);
    // Merchant vest
    ctx.fillStyle = '#6a4a30';
    ctx.fillRect(bessaFigX - 8, bessaFigY - 12, 16, 26);

    // === Mira at table with maps (lower left) ===
    const miraTableX = 60;
    const miraTableY = 380;
    // Table
    ctx.fillStyle = '#3d2510';
    ctx.fillRect(miraTableX, miraTableY, 100, 50);
    ctx.strokeStyle = '#5a3818';
    ctx.lineWidth = 2;
    ctx.strokeRect(miraTableX, miraTableY, 100, 50);
    // Table legs
    ctx.fillStyle = '#2a1808';
    ctx.fillRect(miraTableX + 5, miraTableY + 50, 8, 20);
    ctx.fillRect(miraTableX + 87, miraTableY + 50, 8, 20);
    // Maps / parchments on table
    ctx.fillStyle = '#4a3a28';
    ctx.fillRect(miraTableX + 10, miraTableY + 5, 30, 20);
    ctx.save();
    ctx.translate(miraTableX + 60, miraTableY + 15);
    ctx.rotate(0.15);
    ctx.fillStyle = '#3a2a18';
    ctx.fillRect(-15, -10, 30, 20);
    ctx.restore();
    // Ink stains
    ctx.fillStyle = 'rgba(20, 20, 40, 0.4)';
    ctx.beginPath();
    ctx.arc(miraTableX + 45, miraTableY + 30, 5, 0, Math.PI * 2);
    ctx.fill();

    // Mira figure (seated)
    ctx.fillStyle = '#a08060';
    ctx.beginPath();
    ctx.arc(miraTableX + 50, miraTableY - 20, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2a3a4a';
    ctx.fillRect(miraTableX + 38, miraTableY - 9, 24, 28);
    // Ink-stained hands
    ctx.fillStyle = '#90705a';
    ctx.fillRect(miraTableX + 35, miraTableY + 5, 8, 6);
    ctx.fillRect(miraTableX + 57, miraTableY + 5, 8, 6);

    // === Notice Board on back wall (center) ===
    const nbX = 330;
    const nbY = 90;
    const nbW = 120;
    const nbH = 70;
    // Board
    ctx.fillStyle = '#2a1808';
    ctx.fillRect(nbX, nbY, nbW, nbH);
    ctx.strokeStyle = '#5a3d20';
    ctx.lineWidth = 3;
    ctx.strokeRect(nbX, nbY, nbW, nbH);
    // Nails
    ctx.fillStyle = '#888';
    ctx.beginPath(); ctx.arc(nbX + 8, nbY + 8, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(nbX + nbW - 8, nbY + 8, 3, 0, Math.PI * 2); ctx.fill();
    // Pinned parchments
    const notes = [
      { x: nbX + 10, y: nbY + 16, w: 35, h: 25, rot: -0.05 },
      { x: nbX + 50, y: nbY + 14, w: 30, h: 28, rot: 0.08 },
      { x: nbX + 25, y: nbY + 40, w: 40, h: 20, rot: -0.03 },
      { x: nbX + 70, y: nbY + 38, w: 35, h: 22, rot: 0.04 },
    ];
    for (const note of notes) {
      ctx.save();
      ctx.translate(note.x + note.w / 2, note.y + note.h / 2);
      ctx.rotate(note.rot);
      ctx.fillStyle = '#4a3a28';
      ctx.fillRect(-note.w / 2, -note.h / 2, note.w, note.h);
      ctx.strokeStyle = '#3a2a18';
      ctx.lineWidth = 1;
      ctx.strokeRect(-note.w / 2, -note.h / 2, note.w, note.h);
      // Pin
      ctx.fillStyle = '#a04020';
      ctx.beginPath();
      ctx.arc(0, -note.h / 2 + 3, 3, 0, Math.PI * 2);
      ctx.fill();
      // Text lines
      ctx.fillStyle = '#1a1208';
      for (let li = 0; li < 3; li++) {
        ctx.fillRect(-note.w / 2 + 4, -note.h / 2 + 8 + li * 5, note.w - 8, 1);
      }
      ctx.restore();
    }
    // "NOTICE BOARD" label
    ctx.textAlign = 'center';
    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = '#C4A265';
    ctx.fillText('NOTICE BOARD', nbX + nbW / 2, nbY - 4);
    ctx.textAlign = 'left';

    // === Orin Vane at table (center-right, seated, arm in sling) ===
    const orinTableX = 380;
    const orinTableY = 380;
    // Table
    ctx.fillStyle = '#3d2510';
    ctx.fillRect(orinTableX, orinTableY, 80, 45);
    ctx.strokeStyle = '#5a3818';
    ctx.lineWidth = 2;
    ctx.strokeRect(orinTableX, orinTableY, 80, 45);
    // Table legs
    ctx.fillStyle = '#2a1808';
    ctx.fillRect(orinTableX + 5, orinTableY + 45, 8, 18);
    ctx.fillRect(orinTableX + 67, orinTableY + 45, 8, 18);
    // Mug on table
    ctx.fillStyle = '#5a3818';
    ctx.fillRect(orinTableX + 15, orinTableY + 8, 14, 18);
    ctx.fillStyle = '#8a6020';
    ctx.fillRect(orinTableX + 17, orinTableY + 12, 10, 12);
    ctx.fillStyle = '#d4c490';
    ctx.fillRect(orinTableX + 16, orinTableY + 10, 12, 3);
    // Orin figure (seated, facing left)
    // Head
    ctx.fillStyle = '#b08060';
    ctx.beginPath();
    ctx.arc(orinTableX + 55, orinTableY - 18, 12, 0, Math.PI * 2);
    ctx.fill();
    // Body
    ctx.fillStyle = '#4a3020';
    ctx.fillRect(orinTableX + 42, orinTableY - 6, 26, 30);
    // Leather vest
    ctx.fillStyle = '#6a4828';
    ctx.fillRect(orinTableX + 46, orinTableY - 2, 18, 22);
    // Sling (right arm bandaged across chest)
    ctx.strokeStyle = '#c0b090';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(orinTableX + 46, orinTableY - 2);
    ctx.lineTo(orinTableX + 60, orinTableY + 12);
    ctx.lineTo(orinTableX + 50, orinTableY + 18);
    ctx.stroke();
    // Left arm on table
    ctx.fillStyle = '#a07050';
    ctx.fillRect(orinTableX + 38, orinTableY + 5, 8, 6);

    // === Table Seven (Elden or empty chair) — lower right ===
    const t7X = 590;
    const t7Y = 390;
    // Small round table
    ctx.fillStyle = '#2a1a0e';
    ctx.beginPath();
    ctx.ellipse(t7X + 30, t7Y + 10, 35, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#3d2510';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Table leg
    ctx.fillStyle = '#2a1808';
    ctx.fillRect(t7X + 26, t7Y + 28, 8, 30);

    // Chair
    ctx.fillStyle = '#3d2510';
    ctx.fillRect(t7X + 50, t7Y + 20, 20, 30);
    ctx.fillRect(t7X + 52, t7Y - 5, 16, 25);

    if (fragments >= 2) {
      // Elden's ghostly figure
      ctx.globalAlpha = 0.4 + Math.sin(this.flickerPhase * 0.8) * 0.1;
      // Head (ghostly)
      ctx.fillStyle = '#8888CC';
      ctx.beginPath();
      ctx.arc(t7X + 60, t7Y - 10, 10, 0, Math.PI * 2);
      ctx.fill();
      // Body
      ctx.fillStyle = '#6666AA';
      ctx.fillRect(t7X + 50, t7Y, 20, 25);
      // Ghostly cup on table
      ctx.fillStyle = 'rgba(136, 136, 204, 0.4)';
      ctx.fillRect(t7X + 20, t7Y + 2, 10, 12);
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

    // Draw torch sconces
    this._drawTorchSconce(ctx, 50, 80);
    this._drawTorchSconce(ctx, w - 50, 80);

    // Notice board header
    ctx.textAlign = 'center';
    ctx.font = '14px monospace';
    ctx.fillStyle = '#C4A265';
    ctx.fillText('ADVENTURERS FOR HIRE', w / 2, 76);
    ctx.fillStyle = '#6b5030';
    ctx.fillText('───────────────────────────', w / 2, 88);
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
    const startY = 100;

    // Determine scroll offset to keep selected card visible
    const scrollStart = Math.max(0, Math.min(this.selectedCharacter - Math.floor(maxVisible / 2), totalCards - visibleCount));

    // Draw left arrow indicator if scrolled
    if (scrollStart > 0) {
      ctx.fillStyle = '#C4A265';
      ctx.font = 'bold 24px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('◄', startX - 20, startY + cardH / 2);
      ctx.textAlign = 'left';
    }

    // Draw visible cards + register touch hit zones
    for (let vi = 0; vi < visibleCount; vi++) {
      const ci = scrollStart + vi;
      const x = startX + vi * (cardW + gap);
      const selected = ci === this.selectedCharacter;

      if (ci < roster.length) {
        this._drawCharacterCard(ctx, roster[ci], x, startY, cardW, cardH, selected);
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
          // Use a special code we handle below
          world.input.touch.registerHitZone(x, startY, cardW, cardH, `_selectCard_${ci}`);
        }
      }
    }

    // Draw right arrow indicator if more cards to the right
    if (scrollStart + visibleCount < totalCards) {
      ctx.fillStyle = '#C4A265';
      ctx.font = 'bold 24px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('►', startX + totalW + 20, startY + cardH / 2);
      ctx.textAlign = 'left';
    }

    // Show recruited indicator on cards already in party
    for (let vi = 0; vi < visibleCount; vi++) {
      const ci = scrollStart + vi;
      const x = startX + vi * (cardW + gap);
      const charInParty = ci < roster.length && (world.party.getMembers().includes(roster[ci]) ||
        world.party.getMembers().some(m => m.name === roster[ci].name && m.class === roster[ci].class));
      if (charInParty) {
        // Draw "RECRUITED" overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(x, startY, cardW, cardH);
        ctx.fillStyle = '#4CAF50';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('✓ IN PARTY', x + cardW / 2, startY + cardH / 2);
        ctx.textAlign = 'left';
      }
    }

    // H-4: Flash "ALREADY IN PARTY" on failed recruit attempt
    if (this._recruitFailFlash && Date.now() - this._recruitFailFlash < 1000) {
      ctx.fillStyle = 'rgba(192, 57, 43, 0.8)';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('ALREADY IN PARTY!', w / 2, startY + cardH + 40);
      ctx.textAlign = 'left';
      world.needsRender = true; // Keep rendering until flash fades
    }

    // Party count indicator
    const partyCount = world.party.getMembers().length;
    ctx.textAlign = 'center';
    ctx.font = '12px monospace';
    ctx.fillStyle = partyCount >= 4 ? '#4CAF50' : '#C4A265';
    ctx.fillText(`PARTY: ${partyCount}/4`, w / 2, startY + cardH + 20);
    ctx.textAlign = 'left';

    // Bottom bar — touch-friendly buttons (use shared method for consistency)
    const buttons = this._rosterBarButtons(partyCount);
    this._drawTouchBar(ctx, w, h, world, buttons, this.focusArea === 'bar' ? this.selectedBarButton : -1);
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

    // Draw torch sconces
    this._drawTorchSconce(ctx, 50, 80);
    this._drawTorchSconce(ctx, w - 50, 80);

    ctx.textAlign = 'center';
    ctx.font = '14px monospace';
    ctx.fillStyle = '#C4A265';
    ctx.fillText('YOUR PARTY', w / 2, 76);
    ctx.fillStyle = '#6b5030';
    ctx.fillText('───────────────────', w / 2, 88);
    ctx.textAlign = 'left';

    const members = world.party.getMembers();
    const cardW = 160;
    const cardH = 380;
    const gap = 16;
    const maxCards = Math.max(members.length, 1);
    const totalW = maxCards * cardW + (maxCards - 1) * gap;
    const startX = (w - totalW) / 2;
    const startY = 100;

    if (members.length === 0) {
      ctx.textAlign = 'center';
      ctx.font = '16px monospace';
      ctx.fillStyle = '#8B7355';
      ctx.fillText('No members recruited yet.', w / 2, startY + cardH / 2);
      ctx.fillText('Go back and recruit adventurers.', w / 2, startY + cardH / 2 + 24);
      ctx.textAlign = 'left';
    } else {
      members.forEach((char, i) => {
        const isSelected = i === this.selectedPartySlot;
        const x = startX + i * (cardW + gap);
        this._drawCharacterCard(ctx, char, x, startY, cardW, cardH, isSelected);

        // Register touch zone — tap to select, tap selected to remove
        if (world.input && world.input.touch) {
          if (isSelected) {
            world.input.touch.registerHitZone(x, startY, cardW, cardH, 'Space');
          } else {
            world.input.touch.registerHitZone(x, startY, cardW, cardH, `_selectParty_${i}`);
          }
        }

        // Draw "REMOVE" hint on selected card
        if (isSelected) {
          ctx.fillStyle = 'rgba(192, 57, 43, 0.7)';
          ctx.fillRect(x, startY + cardH - 30, cardW, 30);
          ctx.fillStyle = '#FFF';
          ctx.font = 'bold 12px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('PRESS SPACE TO REMOVE', x + cardW / 2, startY + cardH - 12);
          ctx.textAlign = 'left';
        }
      });
    }

    // Party count
    ctx.textAlign = 'center';
    ctx.font = '12px monospace';
    ctx.fillStyle = members.length >= 4 ? '#4CAF50' : (members.length > 0 ? '#C4A265' : '#C0392B');
    ctx.fillText(`${members.length}/4 MEMBERS`, w / 2, startY + cardH + 20);
    ctx.textAlign = 'left';

    // Bottom bar (use shared method for consistency)
    const buttons = this._partyBarButtons(members);
    this._drawTouchBar(ctx, w, h, world, buttons, this.focusArea === 'bar' ? this.selectedBarButton : -1);
  }

  // --- Shop ---

  _renderShop(ctx, world) {
    const w = ctx.canvas.width;

    const chaModifier = this._getCHAPriceModifier(world);
    const chaLabel = this._getCHALabel(chaModifier);

    ctx.fillStyle = '#C4A265';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText("BESSA'S WARES", w / 2, 76);
    ctx.font = '12px monospace';
    ctx.fillStyle = '#FFD700';
    ctx.fillText(`Gold: ${world.gold}`, w / 2, 94);
    // CHA pricing hint
    if (chaLabel) {
      ctx.font = 'italic 11px monospace';
      ctx.fillStyle = chaModifier < 1.0 ? '#4CAF50' : '#C0392B';
      ctx.fillText(chaLabel, w / 2, 108);
    }
    ctx.textAlign = 'left';

    // Merchant inventory (left parchment panel)
    const panelW = 340;
    const panelH = 400;
    const leftX = 30;
    const rightX = w - panelW - 30;
    const panelY = 110;

    this._drawPanel(ctx, leftX, panelY, panelW, panelH, 'Merchant Wares');
    this._drawPanel(ctx, rightX, panelY, panelW, panelH, 'Your Items');

    const merchantInventory = world.merchant.getInventory();
    merchantInventory.forEach((item, i) => {
      const y = panelY + 36 + i * 22;
      const prefix = i === this.selectedMerchantItem ? '\u25B8 ' : '  ';
      const basePrice = world.merchant.getBuyPrice(item);
      const finalPrice = Math.max(1, Math.round(basePrice * chaModifier));
      ctx.fillStyle = i === this.selectedMerchantItem ? '#FFD700' : '#C4A265';
      ctx.font = '12px monospace';
      ctx.fillText(`${prefix}${item.name}`, leftX + 12, y);
      // Show modified price (with strikethrough on original if different)
      ctx.textAlign = 'right';
      if (chaModifier !== 1.0) {
        ctx.fillStyle = '#555';
        ctx.fillText(`${basePrice}g`, leftX + panelW - 55, y);
        ctx.fillStyle = chaModifier < 1.0 ? '#4CAF50' : '#C0392B';
        ctx.fillText(`${finalPrice}g`, leftX + panelW - 12, y);
      } else {
        ctx.fillStyle = '#8B7355';
        ctx.fillText(`${finalPrice}g`, leftX + panelW - 12, y);
      }
      ctx.textAlign = 'left';
    });

    const playerItems = world.inventory.getAllItems();
    playerItems.forEach((item, i) => {
      const y = panelY + 36 + i * 22;
      const prefix = i === this.selectedPlayerItem ? '▸ ' : '  ';
      const price = world.merchant.getSellPrice(item);
      ctx.fillStyle = i === this.selectedPlayerItem ? '#FFD700' : '#C4A265';
      ctx.font = '12px monospace';
      ctx.fillText(`${prefix}${item.name}`, rightX + 12, y);
      ctx.fillStyle = '#8B7355';
      ctx.textAlign = 'right';
      ctx.fillText(`${price}g`, rightX + panelW - 12, y);
      ctx.textAlign = 'left';
    });

    // Bottom bar — touch-friendly buttons
    this._drawTouchBar(ctx, w, ctx.canvas.height, world, [
      { label: 'BACK', code: 'Escape', width: 80 },
      { label: '▲', code: 'ArrowUp', width: 50 },
      { label: '▼', code: 'ArrowDown', width: 50 },
      { label: 'BUY', code: 'KeyB', width: 80 },
      { label: 'SELL', code: 'KeyV', width: 80 },
    ]);
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

    // Wooden board background
    const boardX = 60;
    const boardY = 68;
    const boardW = w - 120;
    const boardH = h - 140;

    // Board backing — dark wood
    ctx.fillStyle = '#2a1808';
    ctx.fillRect(boardX, boardY, boardW, boardH);
    ctx.strokeStyle = '#5a3d20';
    ctx.lineWidth = 4;
    ctx.strokeRect(boardX, boardY, boardW, boardH);

    // Inner border (carved look)
    ctx.strokeStyle = '#3d2510';
    ctx.lineWidth = 1;
    ctx.strokeRect(boardX + 6, boardY + 6, boardW - 12, boardH - 12);

    // Nails at corners
    const nails = [
      [boardX + 12, boardY + 12],
      [boardX + boardW - 12, boardY + 12],
      [boardX + 12, boardY + boardH - 12],
      [boardX + boardW - 12, boardY + boardH - 12],
    ];
    for (const [nx, ny] of nails) {
      ctx.fillStyle = '#888';
      ctx.beginPath();
      ctx.arc(nx, ny, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#aaa';
      ctx.beginPath();
      ctx.arc(nx - 1, ny - 1, 1, 0, Math.PI * 2);
      ctx.fill();
    }

    // Title — burned into wood
    ctx.textAlign = 'center';
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = '#0a0500';
    ctx.fillText('NOTICE BOARD', w / 2 + 1, boardY + 30);
    ctx.fillStyle = '#C4A265';
    ctx.fillText('NOTICE BOARD', w / 2, boardY + 29);

    ctx.font = '11px monospace';
    ctx.fillStyle = '#8B7355';
    ctx.fillText('~ Expeditions Available Today ~', w / 2, boardY + 46);
    ctx.textAlign = 'left';

    if (this.noticeBoardQuests.length === 0) {
      ctx.textAlign = 'center';
      ctx.font = '14px monospace';
      ctx.fillStyle = '#666';
      ctx.fillText('No expeditions posted today. Check back tomorrow.', w / 2, boardY + boardH / 2);
      ctx.textAlign = 'left';
    } else {
      // Render each quest as a pinned parchment note
      const noteMargin = 16;
      const noteX = boardX + 24;
      const noteW = boardW - 48;
      const noteGap = 12;
      const maxNoteH = Math.floor((boardH - 70 - (this.noticeBoardQuests.length - 1) * noteGap) / this.noticeBoardQuests.length);
      const noteH = Math.max(48, Math.min(maxNoteH, 120));

      for (let i = 0; i < this.noticeBoardQuests.length; i++) {
        const quest = this.noticeBoardQuests[i];
        const ny = boardY + 58 + i * (noteH + noteGap);
        const selected = i === this.selectedQuest;

        // Parchment note — slightly tilted via clipping
        ctx.save();
        const tiltAngle = (i % 2 === 0 ? -0.01 : 0.015) + (i * 0.005);
        ctx.translate(noteX + noteW / 2, ny + noteH / 2);
        ctx.rotate(tiltAngle);
        ctx.translate(-(noteX + noteW / 2), -(ny + noteH / 2));

        // Parchment background
        if (selected) {
          ctx.shadowColor = '#FFD700';
          ctx.shadowBlur = 12;
        }
        const parchGrad = ctx.createLinearGradient(noteX, ny, noteX, ny + noteH);
        parchGrad.addColorStop(0, selected ? '#4a3a22' : '#3a2a18');
        parchGrad.addColorStop(1, selected ? '#3a2a16' : '#2a1c10');
        ctx.fillStyle = parchGrad;
        ctx.fillRect(noteX, ny, noteW, noteH);
        ctx.shadowBlur = 0;

        // Border
        ctx.strokeStyle = selected ? '#FFD700' : '#5a3d20';
        ctx.lineWidth = selected ? 2 : 1;
        ctx.strokeRect(noteX, ny, noteW, noteH);

        // Pin at top center
        const pinX = noteX + noteW / 2;
        const pinY = ny - 2;
        ctx.fillStyle = '#a04020';
        ctx.beginPath();
        ctx.arc(pinX, pinY + 4, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#c06030';
        ctx.beginPath();
        ctx.arc(pinX - 1, pinY + 3, 2, 0, Math.PI * 2);
        ctx.fill();

        // Quest content
        const textX = noteX + 16;
        const textY = ny + 20;

        // Dungeon name
        ctx.font = 'bold 14px monospace';
        ctx.fillStyle = selected ? '#FFD700' : '#E8D5B0';
        ctx.fillText(quest.name, textX, textY);

        // Skull rating — draw skull symbols
        const skullStr = '\u2620'.repeat(quest.skulls) + '\u25CB'.repeat(5 - quest.skulls);
        ctx.font = '12px monospace';
        ctx.fillStyle = quest.skulls >= 4 ? '#C0392B' : (quest.skulls >= 3 ? '#F39C12' : '#8B7355');
        ctx.textAlign = 'right';
        ctx.fillText(`Danger: ${skullStr}`, noteX + noteW - 16, textY);
        ctx.textAlign = 'left';

        // Fragment + Floors
        ctx.font = '11px monospace';
        ctx.fillStyle = '#B8A070';
        ctx.fillText(`Fragment: ${quest.fragment}  |  Floors: ${quest.floors}  |  Tier ${quest.tier}`, textX, textY + 18);

        // Treasure
        ctx.fillStyle = '#9B8765';
        ctx.fillText(`Treasure: ${quest.treasure}`, textX, textY + 34);

        // Lore (italic, dimmer)
        ctx.font = 'italic 10px monospace';
        ctx.fillStyle = '#7a6a50';
        // Truncate lore to fit
        const maxLoreLen = Math.floor((noteW - 32) / 6);
        const loreText = quest.lore.length > maxLoreLen ? quest.lore.substring(0, maxLoreLen - 3) + '...' : quest.lore;
        ctx.fillText(`"${loreText}"`, textX, textY + 52);

        // Theme
        ctx.font = '10px monospace';
        ctx.fillStyle = '#6a5a40';
        ctx.fillText(quest.theme, textX, textY + 68);

        // Completed indicator
        if (world.completedDungeons && world.completedDungeons.has(quest.id)) {
          ctx.fillStyle = 'rgba(76, 175, 80, 0.15)';
          ctx.fillRect(noteX + 1, ny + 1, noteW - 2, noteH - 2);
          ctx.fillStyle = '#4CAF50';
          ctx.font = 'bold 12px monospace';
          ctx.textAlign = 'right';
          ctx.fillText('\u2713 CLEARED', noteX + noteW - 16, ny + noteH - 10);
          ctx.textAlign = 'left';
        }

        ctx.restore();
      }
    }

    // Party warning
    const partySize = world.party.getMembers().length;
    if (partySize < 4) {
      ctx.textAlign = 'center';
      ctx.font = 'bold 12px monospace';
      ctx.fillStyle = partySize <= 1 ? '#C0392B' : '#F39C12';
      const warning = partySize <= 1
        ? 'SOLO ADVENTURER — Extreme danger!'
        : `PARTY OF ${partySize} — Full party of 4 recommended.`;
      ctx.fillText(warning, w / 2, h - 60);
      ctx.textAlign = 'left';
    }

    // Register touch zones
    if (world.input && world.input.touch) {
      const touchNoteH = Math.max(48, Math.min(Math.floor((boardH - 70 - (this.noticeBoardQuests.length - 1) * noteGap) / this.noticeBoardQuests.length), 120));
      for (let i = 0; i < this.noticeBoardQuests.length; i++) {
        const ny = boardY + 58 + i * (touchNoteH + noteGap);
        const code = i === this.selectedQuest ? 'Enter' : (i < this.selectedQuest ? 'ArrowUp' : 'ArrowDown');
        world.input.touch.registerHitZone(boardX + 24, ny, boardW - 48, touchNoteH, code);
      }
    }

    // Bottom bar
    this._drawTouchBar(ctx, w, h, world, [
      { label: 'BACK', code: 'Escape', width: 100 },
      { label: '\u25B2', code: 'ArrowUp', width: 50 },
      { label: '\u25BC', code: 'ArrowDown', width: 50 },
      { label: 'EMBARK', code: 'Enter', width: 160 },
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

    // Title
    ctx.textAlign = 'center';
    ctx.fillStyle = '#C4A265';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('THE RUSTY FLAGON — Patrons', w / 2, 80);

    ctx.fillStyle = '#666';
    ctx.font = '12px monospace';
    ctx.fillText(`Sunstone Fragments: ${fragments}/10`, w / 2, 105);

    if (this.availableNPCs.length === 0) {
      ctx.fillStyle = '#555';
      ctx.font = '14px monospace';
      ctx.fillText('The tavern is quiet. No one wishes to speak.', w / 2, 200);
      ctx.textAlign = 'left';
      return;
    }

    // NPC cards
    const cardW = 180;
    const cardH = 200;
    const gap = 20;
    const totalW = this.availableNPCs.length * cardW + (this.availableNPCs.length - 1) * gap;
    const startX = (w - totalW) / 2;
    const startY = 130;

    for (let i = 0; i < this.availableNPCs.length; i++) {
      const npc = this.availableNPCs[i];
      const x = startX + i * (cardW + gap);
      const selected = i === this.selectedNPC && !this.npcDialogue.active;

      // Card background
      if (selected) {
        ctx.shadowColor = npc.color || '#FFD700';
        ctx.shadowBlur = 15;
      }
      ctx.fillStyle = selected ? '#2a1c10' : '#1a1208';
      ctx.fillRect(x, startY, cardW, cardH);
      ctx.shadowBlur = 0;

      // Border
      ctx.strokeStyle = selected ? (npc.color || '#FFD700') : '#3a2a18';
      ctx.lineWidth = selected ? 2 : 1;
      ctx.strokeRect(x, startY, cardW, cardH);

      // Portrait emoji
      ctx.textAlign = 'center';
      ctx.font = '48px serif';
      ctx.fillText(npc.portrait, x + cardW / 2, startY + 65);

      // Name
      ctx.fillStyle = npc.color || '#C4A265';
      ctx.font = 'bold 16px monospace';
      ctx.fillText(npc.name, x + cardW / 2, startY + 105);

      // Title
      ctx.fillStyle = '#777';
      ctx.font = 'italic 11px monospace';
      ctx.fillText(npc.title, x + cardW / 2, startY + 125);

      // "Talk" prompt
      if (selected) {
        ctx.fillStyle = '#C4A265';
        ctx.font = '12px monospace';
        ctx.fillText('[ ENTER to talk ]', x + cardW / 2, startY + 170);
      }
    }

    ctx.textAlign = 'left';

    // Bottom bar
    const buttons = [
      { label: 'BACK', code: 'Escape', width: 80 },
      { label: '◄', code: 'ArrowLeft', width: 50 },
      { label: '►', code: 'ArrowRight', width: 50 },
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
