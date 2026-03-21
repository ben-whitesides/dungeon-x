// NPC Dialogue System — DOM overlay with typewriter effect
// Masters: Anti-pattern #8 — DOM for text-heavy UI, Canvas for gameplay
// Masters: Anti-pattern #7 — update() advances state, render() just draws

const TYPEWRITER_SPEED = 35; // ms per character
const DIALOGUE_DATA_PATH = '../../config/npc-dialogue.json';

let dialogueData = null;

export async function loadDialogueData() {
  if (dialogueData) return dialogueData;
  const res = await fetch(DIALOGUE_DATA_PATH);
  dialogueData = await res.json();
  return dialogueData;
}

export class NPCDialogue {
  constructor() {
    this.active = false;
    this.npcId = null;
    this.lines = [];
    this.currentLine = 0;
    this.charIndex = 0;
    this.lastCharTime = 0;
    this.typewriterDone = false;
    this.overlay = null;
    this.textEl = null;
    this.nameEl = null;
    this.titleEl = null;
    this.portraitEl = null;
    this.promptEl = null;
    this._createOverlay();
  }

  _createOverlay() {
    // Create DOM overlay — lives inside game-viewport for proper scaling
    this.overlay = document.createElement('div');
    this.overlay.id = 'dialogue-overlay';
    this.overlay.style.cssText = `
      display: none;
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 180px;
      background: linear-gradient(180deg, rgba(10,8,6,0.95) 0%, rgba(20,16,12,0.98) 100%);
      border-top: 2px solid #5a3d20;
      padding: 16px 20px;
      z-index: 100;
      font-family: 'Georgia', serif;
      color: #d4c4a0;
      cursor: pointer;
      user-select: none;
      -webkit-user-select: none;
    `;

    // Portrait
    this.portraitEl = document.createElement('div');
    this.portraitEl.style.cssText = `
      position: absolute;
      left: 16px;
      top: 16px;
      width: 60px;
      height: 60px;
      background: #1a1408;
      border: 2px solid #5a3d20;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
    `;
    this.overlay.appendChild(this.portraitEl);

    // Name
    this.nameEl = document.createElement('div');
    this.nameEl.style.cssText = `
      position: absolute;
      left: 88px;
      top: 14px;
      font-size: 16px;
      font-weight: bold;
      color: #FFD700;
      letter-spacing: 1px;
    `;
    this.overlay.appendChild(this.nameEl);

    // Title
    this.titleEl = document.createElement('div');
    this.titleEl.style.cssText = `
      position: absolute;
      left: 88px;
      top: 34px;
      font-size: 11px;
      color: #888;
      font-style: italic;
      letter-spacing: 0.5px;
    `;
    this.overlay.appendChild(this.titleEl);

    // Text body
    this.textEl = document.createElement('div');
    this.textEl.style.cssText = `
      position: absolute;
      left: 88px;
      right: 20px;
      top: 56px;
      bottom: 36px;
      font-size: 14px;
      line-height: 1.6;
      color: #d4c4a0;
      overflow: hidden;
    `;
    this.overlay.appendChild(this.textEl);

    // Prompt
    this.promptEl = document.createElement('div');
    this.promptEl.style.cssText = `
      position: absolute;
      right: 20px;
      bottom: 12px;
      font-size: 11px;
      color: #666;
    `;
    this.promptEl.textContent = '▼ click to continue';
    this.overlay.appendChild(this.promptEl);

    // Click/tap to advance
    this.overlay.addEventListener('click', () => this.advance());
    this.overlay.addEventListener('touchend', (e) => { e.preventDefault(); this.advance(); });

    // Attach to viewport
    const viewport = document.getElementById('game-viewport');
    if (viewport) viewport.appendChild(this.overlay);
  }

  getAvailableNPCs(fragmentCount) {
    if (!dialogueData) return [];
    const npcs = [];
    for (const [id, npc] of Object.entries(dialogueData.npcs)) {
      const avail = npc.available;
      // Standard range check
      if (fragmentCount >= avail.min && fragmentCount <= avail.max) {
        npcs.push({ id, ...npc });
        continue;
      }
      // Elden's final appearance at fragment 10
      if (avail.final !== undefined && fragmentCount === avail.final) {
        npcs.push({ id, ...npc });
      }
    }
    return npcs;
  }

  open(npcId, fragmentCount) {
    if (!dialogueData) return false;

    const npc = dialogueData.npcs[npcId];
    const dialogue = dialogueData.dialogue[npcId];
    if (!npc || !dialogue) return false;

    // Find dialogue for this fragment count — walk down from current to find closest
    let lines = null;
    for (let f = fragmentCount; f >= 0; f--) {
      if (dialogue[String(f)]) {
        lines = dialogue[String(f)];
        break;
      }
    }
    if (!lines || lines.length === 0) return false;

    this.active = true;
    this.npcId = npcId;
    this.lines = lines;
    this.currentLine = 0;
    this.charIndex = 0;
    this.lastCharTime = 0;
    this.typewriterDone = false;

    // Set NPC info
    this.nameEl.textContent = npc.name;
    this.nameEl.style.color = npc.color || '#FFD700';
    this.titleEl.textContent = npc.title;
    this.portraitEl.textContent = npc.portrait;
    this.textEl.textContent = '';
    this.promptEl.style.display = 'none';

    this.overlay.style.display = 'block';
    return true;
  }

  advance() {
    if (!this.active) return;

    if (!this.typewriterDone) {
      // Skip typewriter — show full text
      this.textEl.textContent = this.lines[this.currentLine];
      this.typewriterDone = true;
      this.promptEl.style.display = 'block';
      this.promptEl.textContent = this.currentLine < this.lines.length - 1 ? '▼ click to continue' : '▼ click to close';
      return;
    }

    // Move to next line
    this.currentLine++;
    if (this.currentLine >= this.lines.length) {
      this.close();
      return;
    }

    // Start typewriter on next line
    this.charIndex = 0;
    this.lastCharTime = 0;
    this.typewriterDone = false;
    this.textEl.textContent = '';
    this.promptEl.style.display = 'none';
  }

  close() {
    this.active = false;
    this.overlay.style.display = 'none';
    this.npcId = null;
    this.lines = [];
  }

  // Called from game loop — advances typewriter state
  update(timestamp) {
    if (!this.active || this.typewriterDone) return;

    const line = this.lines[this.currentLine];
    if (!line) return;

    if (timestamp - this.lastCharTime >= TYPEWRITER_SPEED) {
      this.lastCharTime = timestamp;
      this.charIndex++;

      if (this.charIndex >= line.length) {
        this.textEl.textContent = line;
        this.typewriterDone = true;
        this.promptEl.style.display = 'block';
        this.promptEl.textContent = this.currentLine < this.lines.length - 1 ? '▼ click to continue' : '▼ click to close';
      } else {
        this.textEl.textContent = line.substring(0, this.charIndex);
      }
    }
  }

  // Handle keyboard input — returns true if consumed
  handleInput(code) {
    if (!this.active) return false;
    if (code === 'Space' || code === 'Enter' || code === 'Escape') {
      if (code === 'Escape') {
        this.close();
      } else {
        this.advance();
      }
      return true;
    }
    return false;
  }
}
