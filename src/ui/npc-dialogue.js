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
      bottom: 8px;
      left: 8px;
      right: 8px;
      height: 180px;
      background: linear-gradient(180deg, rgba(10,8,6,0.97) 0%, rgba(20,16,12,0.99) 100%);
      border: 2px solid #FFD700;
      border-radius: 4px;
      padding: 0;
      z-index: 100;
      font-family: 'Georgia', serif;
      color: #d4c4a0;
      cursor: pointer;
      user-select: none;
      -webkit-user-select: none;
      box-shadow: 0 0 20px rgba(255, 215, 0, 0.15), inset 0 0 30px rgba(0, 0, 0, 0.5);
    `;

    // Inner border accent
    const innerBorder = document.createElement('div');
    innerBorder.style.cssText = `
      position: absolute;
      top: 3px;
      left: 3px;
      right: 3px;
      bottom: 3px;
      border: 1px solid rgba(255, 215, 0, 0.2);
      border-radius: 2px;
      pointer-events: none;
    `;
    this.overlay.appendChild(innerBorder);

    // Corner ornaments (CSS pseudo-element simulation with small divs)
    const corners = [
      { top: '-1px', left: '-1px', borderTop: '2px solid #C4A265', borderLeft: '2px solid #C4A265' },
      { top: '-1px', right: '-1px', borderTop: '2px solid #C4A265', borderRight: '2px solid #C4A265' },
      { bottom: '-1px', left: '-1px', borderBottom: '2px solid #C4A265', borderLeft: '2px solid #C4A265' },
      { bottom: '-1px', right: '-1px', borderBottom: '2px solid #C4A265', borderRight: '2px solid #C4A265' },
    ];
    for (const c of corners) {
      const corner = document.createElement('div');
      corner.style.cssText = `position: absolute; width: 12px; height: 12px; pointer-events: none;`;
      for (const [k, v] of Object.entries(c)) corner.style[k] = v;
      this.overlay.appendChild(corner);
    }

    // --- Name plate bar (dark bar across top with gold text) ---
    this.namePlate = document.createElement('div');
    this.namePlate.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 32px;
      background: linear-gradient(90deg, rgba(30,20,10,0.95) 0%, rgba(20,14,8,0.9) 50%, rgba(30,20,10,0.95) 100%);
      border-bottom: 1px solid #5a3d20;
      display: flex;
      align-items: center;
      padding: 0 16px;
      gap: 12px;
    `;
    this.overlay.appendChild(this.namePlate);

    // Portrait (inside name plate, small 28x28)
    this.portraitEl = document.createElement('div');
    this.portraitEl.style.cssText = `
      width: 48px;
      height: 48px;
      min-width: 48px;
      background: #1a0e06;
      border: 2px solid #5a3d20;
      border-radius: 3px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      position: absolute;
      left: 12px;
      top: 38px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);
    `;
    this.overlay.appendChild(this.portraitEl);

    // Name (gold text on dark bar)
    this.nameEl = document.createElement('div');
    this.nameEl.style.cssText = `
      font-size: 14px;
      font-weight: bold;
      color: #FFD700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
    `;
    this.namePlate.appendChild(this.nameEl);

    // Title (beside name, muted)
    this.titleEl = document.createElement('div');
    this.titleEl.style.cssText = `
      font-size: 10px;
      color: #777;
      font-style: italic;
      letter-spacing: 0.5px;
      margin-top: 1px;
    `;
    this.namePlate.appendChild(this.titleEl);

    // Text body — offset for portrait on left
    this.textEl = document.createElement('div');
    this.textEl.style.cssText = `
      position: absolute;
      left: 72px;
      right: 20px;
      top: 40px;
      bottom: 32px;
      font-size: 14px;
      line-height: 1.6;
      color: #d4c4a0;
      overflow: hidden;
    `;
    this.overlay.appendChild(this.textEl);

    // Typewriter cursor (blinking bar)
    this.cursorEl = document.createElement('span');
    this.cursorEl.style.cssText = `
      display: inline;
      color: #C4A265;
      animation: dialogue-cursor-blink 0.8s step-end infinite;
    `;
    this.cursorEl.textContent = '|';
    // Inject keyframes for cursor blink
    if (!document.getElementById('dialogue-cursor-style')) {
      const style = document.createElement('style');
      style.id = 'dialogue-cursor-style';
      style.textContent = `
        @keyframes dialogue-cursor-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    // Prompt bar at bottom
    this.promptBar = document.createElement('div');
    this.promptBar.style.cssText = `
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      height: 28px;
      background: rgba(15, 10, 5, 0.8);
      border-top: 1px solid #3a2a18;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding: 0 16px;
    `;
    this.overlay.appendChild(this.promptBar);

    // Prompt text
    this.promptEl = document.createElement('div');
    this.promptEl.style.cssText = `
      font-size: 11px;
      color: #666;
      font-family: monospace;
    `;
    this.promptEl.textContent = 'SPACE / TAP to continue';
    this.promptBar.appendChild(this.promptEl);

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
    this.titleEl.textContent = '— ' + npc.title;
    this.portraitEl.textContent = npc.portrait;
    this.portraitEl.style.borderColor = npc.color || '#5a3d20';
    this.textEl.textContent = '';
    this.textEl.appendChild(this.cursorEl);
    this.cursorEl.style.display = 'inline';
    this.promptBar.style.display = 'none';

    this.overlay.style.display = 'block';
    return true;
  }

  advance() {
    if (!this.active) return;

    if (!this.typewriterDone) {
      // Skip typewriter — show full text
      this.textEl.textContent = this.lines[this.currentLine];
      this.cursorEl.style.display = 'none';
      this.typewriterDone = true;
      this.promptBar.style.display = 'flex';
      this.promptEl.textContent = this.currentLine < this.lines.length - 1 ? 'SPACE / TAP to continue' : 'SPACE / TAP to close';
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
    this.textEl.appendChild(this.cursorEl);
    this.cursorEl.style.display = 'inline';
    this.promptBar.style.display = 'none';
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
        this.cursorEl.style.display = 'none';
        this.typewriterDone = true;
        this.promptBar.style.display = 'flex';
        this.promptEl.textContent = this.currentLine < this.lines.length - 1 ? 'SPACE / TAP to continue' : 'SPACE / TAP to close';
      } else {
        this.textEl.textContent = line.substring(0, this.charIndex);
        this.textEl.appendChild(this.cursorEl);
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
