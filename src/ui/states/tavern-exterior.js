import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../../core/constants.js';

/**
 * TavernExteriorState — Atmospheric splash screen for The Rusty Flagon.
 * Dark fantasy exterior scene, Canvas 2D painted. Press any key to enter.
 * Masters pattern: State machine — enter/update/render/handleInput.
 */
export class TavernExteriorState {
  constructor(assets) {
    this.assets = assets;
    this.animates = true;     // Signal game loop to render every frame
    this.phase = 0;           // Animation phase (stars twinkle, torches flicker)
    this.promptAlpha = 0;     // Pulse alpha for "press any key"
    this.promptDir = 1;       // Pulse direction
    this.entered = false;     // Transition guard
    this.fadeIn = 0;          // Fade-in from black (0 = black, 1 = fully visible)
    this.stars = [];          // Pre-generated star positions
    this._generateStars();
  }

  _generateStars() {
    // Seeded random stars — consistent across frames
    for (let i = 0; i < 120; i++) {
      this.stars.push({
        x: (Math.sin(i * 127.1 + 311.7) * 43758.5453 % 1) * CANVAS_WIDTH,
        y: Math.abs(Math.sin(i * 269.3 + 183.1) * 28461.7321 % 1) * (CANVAS_HEIGHT * 0.35),
        size: 0.5 + Math.abs(Math.sin(i * 73.9) * 2.5 % 1) * 1.5,
        twinkleOffset: i * 1.7,
        brightness: 0.4 + Math.abs(Math.sin(i * 41.3) % 1) * 0.6,
      });
    }
  }

  update(timestamp) {
    // Delta-time normalization (60fps baseline)
    if (!this._lastTimestamp) this._lastTimestamp = timestamp;
    const dt = (timestamp - this._lastTimestamp) / 16.67;
    this._lastTimestamp = timestamp;

    this.phase += 0.02 * dt;
    if (this.phase > Math.PI * 200) this.phase -= Math.PI * 200;

    // Fade in over ~1.5 seconds
    if (this.fadeIn < 1) {
      this.fadeIn = Math.min(1, this.fadeIn + 0.015 * dt);
    }

    // Pulse the prompt text
    this.promptAlpha += 0.02 * dt * this.promptDir;
    if (this.promptAlpha >= 1) { this.promptAlpha = 1; this.promptDir = -1; }
    if (this.promptAlpha <= 0.2) { this.promptAlpha = 0.2; this.promptDir = 1; }
  }

  handleInput(input, world) {
    if (this.entered) return true;
    if (this.fadeIn < 0.5) return true; // Don't accept input during initial fade

    // Any key or click — enter the tavern
    this.entered = true;

    // Sound: stop exterior wind, play door creak, start tavern ambient
    if (world.input && world.input.soundManager) {
      world.input.soundManager.stopAllAmbient();
      world.input.soundManager.playDoorCreak();
      setTimeout(() => {
        if (world.input && world.input.soundManager) {
          world.input.soundManager.startTavernAmbient();
        }
      }, 400);
    }

    world.stateStack.pop();
    world.stateStack.pushTavern(world.renderers);
    world.needsRender = true;
    return true;
  }

  render(layers, world) {
    const ctx = layers.ui || layers;
    ctx.save();

    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // === Night sky ===
    const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.45);
    skyGrad.addColorStop(0, '#050510');
    skyGrad.addColorStop(0.4, '#0a0a20');
    skyGrad.addColorStop(0.7, '#0f0f2a');
    skyGrad.addColorStop(1, '#151525');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H * 0.45);

    // Moon glow (upper right)
    const moonX = W * 0.78;
    const moonY = H * 0.12;
    const moonGlow = ctx.createRadialGradient(moonX, moonY, 5, moonX, moonY, 80);
    moonGlow.addColorStop(0, 'rgba(200, 210, 230, 0.15)');
    moonGlow.addColorStop(0.5, 'rgba(100, 110, 140, 0.06)');
    moonGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = moonGlow;
    ctx.fillRect(moonX - 80, moonY - 80, 160, 160);
    // Moon disc
    ctx.fillStyle = 'rgba(200, 210, 230, 0.6)';
    ctx.beginPath();
    ctx.arc(moonX, moonY, 12, 0, Math.PI * 2);
    ctx.fill();
    // Crescent shadow
    ctx.fillStyle = '#0a0a18';
    ctx.beginPath();
    ctx.arc(moonX + 5, moonY - 2, 10, 0, Math.PI * 2);
    ctx.fill();

    // === Stars ===
    for (const star of this.stars) {
      const twinkle = Math.sin(this.phase * 1.5 + star.twinkleOffset) * 0.3 + 0.7;
      const alpha = star.brightness * twinkle * this.fadeIn;
      ctx.fillStyle = `rgba(220, 225, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // === Distant horizon buildings (far background, very dark) ===
    ctx.fillStyle = '#0a0910';
    // Distant church/tower silhouette
    ctx.fillRect(W * 0.06, H * 0.34, 18, H * 0.08);
    ctx.beginPath();
    ctx.moveTo(W * 0.06, H * 0.34);
    ctx.lineTo(W * 0.06 + 9, H * 0.30);
    ctx.lineTo(W * 0.06 + 18, H * 0.34);
    ctx.fill();
    // Distant rooftops
    ctx.fillStyle = '#08080e';
    ctx.fillRect(W * 0.10, H * 0.38, 40, H * 0.04);
    ctx.beginPath();
    ctx.moveTo(W * 0.10, H * 0.38);
    ctx.lineTo(W * 0.12, H * 0.35);
    ctx.lineTo(W * 0.14, H * 0.38);
    ctx.fill();
    // Right side distant buildings
    ctx.fillStyle = '#0b0a10';
    ctx.fillRect(W * 0.88, H * 0.36, 35, H * 0.06);
    ctx.beginPath();
    ctx.moveTo(W * 0.88, H * 0.36);
    ctx.lineTo(W * 0.90, H * 0.32);
    ctx.lineTo(W * 0.88 + 35, H * 0.36);
    ctx.fill();
    ctx.fillRect(W * 0.93, H * 0.37, 25, H * 0.05);

    // === Moonlight volumetric rays ===
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (let ri = 0; ri < 5; ri++) {
      const rayX = moonX - 40 + ri * 25;
      const rayW = 8 + ri * 3;
      const rayAlpha = 0.015 + Math.sin(this.phase * 0.3 + ri * 1.5) * 0.005;
      const rayGrad = ctx.createLinearGradient(rayX, moonY + 20, rayX - 30, H * 0.6);
      rayGrad.addColorStop(0, `rgba(160, 170, 200, ${rayAlpha})`);
      rayGrad.addColorStop(0.5, `rgba(120, 130, 160, ${rayAlpha * 0.5})`);
      rayGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = rayGrad;
      ctx.beginPath();
      ctx.moveTo(rayX, moonY + 20);
      ctx.lineTo(rayX + rayW, moonY + 20);
      ctx.lineTo(rayX - 30 + rayW, H * 0.6);
      ctx.lineTo(rayX - 30, H * 0.6);
      ctx.fill();
    }
    ctx.restore();

    // === Ground / horizon ===
    const groundY = H * 0.42;
    const groundGrad = ctx.createLinearGradient(0, groundY, 0, H);
    groundGrad.addColorStop(0, '#151510');
    groundGrad.addColorStop(0.3, '#1a1510');
    groundGrad.addColorStop(1, '#0a0806');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, groundY, W, H - groundY);

    // === Neighboring buildings — ancient village silhouettes ===

    // Left building — crumbling stone cottage, partially collapsed roof
    const lb1X = W * 0.02;
    const lb1W = W * 0.14;
    const lb1Top = groundY - H * 0.08;
    const lb1Bot = groundY + H * 0.12;
    ctx.fillStyle = '#121010';
    ctx.fillRect(lb1X, lb1Top, lb1W, lb1Bot - lb1Top);
    // Damaged roof — uneven peak
    ctx.fillStyle = '#0e0c0a';
    ctx.beginPath();
    ctx.moveTo(lb1X - 5, lb1Top);
    ctx.lineTo(lb1X + lb1W * 0.35, lb1Top - 25);
    ctx.lineTo(lb1X + lb1W * 0.6, lb1Top - 18); // broken section
    ctx.lineTo(lb1X + lb1W + 5, lb1Top);
    ctx.closePath();
    ctx.fill();
    // Cracked stone texture
    for (let sy = lb1Top; sy < lb1Bot; sy += 12) {
      ctx.fillStyle = 'rgba(5, 4, 3, 0.5)';
      ctx.fillRect(lb1X, sy, lb1W, 1);
    }
    // One dark window
    ctx.fillStyle = '#060504';
    ctx.fillRect(lb1X + lb1W * 0.3, lb1Top + 15, 16, 14);
    ctx.strokeStyle = '#1a1408';
    ctx.lineWidth = 1;
    ctx.strokeRect(lb1X + lb1W * 0.3, lb1Top + 15, 16, 14);

    // Far left ruin — just a wall fragment
    ctx.fillStyle = '#0f0d0b';
    ctx.fillRect(W * -0.02, groundY - H * 0.03, W * 0.06, H * 0.08);
    // Jagged top (broken wall)
    ctx.fillStyle = '#151510';
    ctx.beginPath();
    ctx.moveTo(W * -0.02, groundY - H * 0.03);
    ctx.lineTo(W * 0.01, groundY - H * 0.05);
    ctx.lineTo(W * 0.03, groundY - H * 0.035);
    ctx.lineTo(W * 0.04, groundY - H * 0.03);
    ctx.closePath();
    ctx.fill();

    // Right building — taller, narrow, leaning slightly
    const rb1X = W * 0.82;
    const rb1W = W * 0.12;
    const rb1Top = groundY - H * 0.12;
    const rb1Bot = groundY + H * 0.14;
    // Lean effect — skew the building slightly
    ctx.save();
    ctx.transform(1, 0, -0.03, 1, 0, 0);
    ctx.fillStyle = '#13110f';
    ctx.fillRect(rb1X, rb1Top, rb1W, rb1Bot - rb1Top);
    // Steep roof
    ctx.fillStyle = '#0d0b09';
    ctx.beginPath();
    ctx.moveTo(rb1X - 4, rb1Top);
    ctx.lineTo(rb1X + rb1W * 0.5, rb1Top - 35);
    ctx.lineTo(rb1X + rb1W + 4, rb1Top);
    ctx.closePath();
    ctx.fill();
    // Stone lines
    for (let sy = rb1Top; sy < rb1Bot; sy += 14) {
      ctx.fillStyle = 'rgba(5, 4, 3, 0.4)';
      ctx.fillRect(rb1X, sy, rb1W, 1);
    }
    // Tiny window with faint orange light
    ctx.fillStyle = '#0a0806';
    ctx.fillRect(rb1X + rb1W * 0.35, rb1Top + 20, 12, 10);
    const tinyGlow = ctx.createRadialGradient(rb1X + rb1W * 0.35 + 6, rb1Top + 25, 1, rb1X + rb1W * 0.35 + 6, rb1Top + 25, 15);
    tinyGlow.addColorStop(0, 'rgba(200, 120, 40, 0.15)');
    tinyGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = tinyGlow;
    ctx.fillRect(rb1X + rb1W * 0.2, rb1Top + 10, 30, 30);
    ctx.restore();

    // Far right structure — low stone wall / fence remnant
    ctx.fillStyle = '#100e0c';
    ctx.fillRect(W * 0.95, groundY + H * 0.02, W * 0.08, H * 0.06);
    ctx.fillStyle = '#0c0a08';
    ctx.fillRect(W * 0.96, groundY + H * 0.02, W * 0.02, H * 0.04);

    // === Shrubbery and wild growth ===

    // Overgrown bushes along buildings — dark, wild, unkempt
    const bushPositions = [
      { x: lb1X + lb1W - 5, y: lb1Bot - 8, w: 25, h: 18 },
      { x: lb1X - 3, y: lb1Bot - 5, w: 18, h: 14 },
      { x: rb1X - 15, y: rb1Bot - 10, w: 22, h: 16 },
      { x: rb1X + rb1W - 8, y: rb1Bot - 6, w: 20, h: 15 },
      { x: W * 0.18, y: groundY + H * 0.06, w: 30, h: 20 },
      { x: W * 0.72, y: groundY + H * 0.08, w: 28, h: 18 },
      { x: W * 0.35, y: groundY + H * 0.12, w: 22, h: 14 },
      { x: W * 0.60, y: groundY + H * 0.10, w: 25, h: 16 },
    ];
    for (const bush of bushPositions) {
      const sv = Math.abs(Math.sin(bush.x * 73.1 + bush.y * 199.3) * 43758.5 % 1);
      // Dark green-brown base
      ctx.fillStyle = `rgb(${12 + sv * 8 | 0}, ${18 + sv * 10 | 0}, ${8 + sv * 5 | 0})`;
      ctx.beginPath();
      ctx.ellipse(bush.x + bush.w / 2, bush.y + bush.h / 2, bush.w / 2, bush.h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      // Darker shadow underneath
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.ellipse(bush.x + bush.w / 2, bush.y + bush.h * 0.7, bush.w / 2.5, bush.h / 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Scraggly grass tufts along the ground
    ctx.strokeStyle = 'rgba(20, 30, 12, 0.4)';
    ctx.lineWidth = 1;
    for (let gi = 0; gi < 20; gi++) {
      const gx = (Math.sin(gi * 47.3 + 11.7) * 43758.5 % 1) * W;
      const gy = groundY + H * 0.02 + Math.abs(Math.sin(gi * 73.1) * H * 0.15);
      if (Math.abs(gx - W / 2) < 60) continue; // skip path area
      for (let b = 0; b < 3; b++) {
        ctx.beginPath();
        ctx.moveTo(gx + b * 3, gy);
        ctx.lineTo(gx + b * 3 - 2 + Math.sin(gi + b) * 3, gy - 6 - Math.random() * 4);
        ctx.stroke();
      }
    }

    // === Old gnarled trees (foreground, framing the scene) ===

    // Left tree — old twisted oak, next to the tavern door
    const treeL = { x: W / 2 - 110, y: groundY + H * 0.06 };
    // Trunk
    ctx.fillStyle = '#1a1410';
    ctx.fillRect(treeL.x, treeL.y, 14, H * 0.22);
    // Trunk bark texture
    ctx.strokeStyle = 'rgba(30, 22, 14, 0.6)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(treeL.x + 2, treeL.y + i * 12);
      ctx.quadraticCurveTo(treeL.x + 7 + Math.sin(i) * 3, treeL.y + i * 12 + 6, treeL.x + 12, treeL.y + i * 12 + 12);
      ctx.stroke();
    }
    // Branches
    ctx.strokeStyle = '#1a1410';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(treeL.x + 7, treeL.y - 5);
    ctx.quadraticCurveTo(treeL.x - 20, treeL.y - 30, treeL.x - 35, treeL.y - 25);
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(treeL.x + 7, treeL.y + 5);
    ctx.quadraticCurveTo(treeL.x + 30, treeL.y - 20, treeL.x + 45, treeL.y - 30);
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(treeL.x + 10, treeL.y + 15);
    ctx.quadraticCurveTo(treeL.x + 35, treeL.y + 5, treeL.x + 50, treeL.y - 5);
    ctx.stroke();
    // Sparse leaf clusters (dark, barely visible — it's night)
    const leafClusters = [
      { x: treeL.x - 30, y: treeL.y - 30, r: 18 },
      { x: treeL.x + 40, y: treeL.y - 28, r: 15 },
      { x: treeL.x - 15, y: treeL.y - 15, r: 12 },
      { x: treeL.x + 48, y: treeL.y - 8, r: 14 },
    ];
    for (const lc of leafClusters) {
      ctx.fillStyle = 'rgba(12, 22, 10, 0.7)';
      ctx.beginPath();
      ctx.arc(lc.x, lc.y, lc.r, 0, Math.PI * 2);
      ctx.fill();
      // Darker inner leaves
      ctx.fillStyle = 'rgba(8, 16, 6, 0.5)';
      ctx.beginPath();
      ctx.arc(lc.x + 2, lc.y + 2, lc.r * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Right tree — taller, dead/dying, right of tavern door
    const treeR = { x: W / 2 + 80, y: groundY + H * 0.03 };
    ctx.fillStyle = '#18120e';
    ctx.fillRect(treeR.x, treeR.y, 12, H * 0.28);
    // Bark
    ctx.strokeStyle = 'rgba(28, 20, 12, 0.5)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.moveTo(treeR.x + 1, treeR.y + i * 10);
      ctx.lineTo(treeR.x + 11, treeR.y + i * 10 + 5);
      ctx.stroke();
    }
    // Bare branches — skeletal
    ctx.strokeStyle = '#18120e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(treeR.x + 6, treeR.y);
    ctx.quadraticCurveTo(treeR.x + 30, treeR.y - 25, treeR.x + 40, treeR.y - 40);
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(treeR.x + 6, treeR.y + 10);
    ctx.quadraticCurveTo(treeR.x - 25, treeR.y - 10, treeR.x - 30, treeR.y - 25);
    ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(treeR.x + 38, treeR.y - 35);
    ctx.lineTo(treeR.x + 50, treeR.y - 45);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(treeR.x - 25, treeR.y - 18);
    ctx.lineTo(treeR.x - 35, treeR.y - 30);
    ctx.stroke();
    // One sparse leaf cluster
    ctx.fillStyle = 'rgba(10, 20, 8, 0.5)';
    ctx.beginPath();
    ctx.arc(treeR.x + 35, treeR.y - 35, 10, 0, Math.PI * 2);
    ctx.fill();

    // === Shrubs flanking the doorway (at building base, left and right of door) ===
    const doorLeftX = W / 2 - 25; // door left edge
    const doorRightX = W / 2 + 25; // door right edge
    const shrubBaseY = H * 0.58 - 5; // building bottom (bldgBot defined later)
    const fgShrubs = [
      // Left of door
      { x: doorLeftX - 55, y: shrubBaseY - 12, w: 35, h: 22 },
      { x: doorLeftX - 30, y: shrubBaseY - 6, w: 25, h: 16 },
      { x: doorLeftX - 75, y: shrubBaseY - 8, w: 28, h: 18 },
      // Right of door
      { x: doorRightX + 15, y: shrubBaseY - 10, w: 32, h: 20 },
      { x: doorRightX + 40, y: shrubBaseY - 6, w: 28, h: 16 },
      { x: doorRightX + 60, y: shrubBaseY - 14, w: 35, h: 22 },
    ];
    for (const sh of fgShrubs) {
      // Main bush shape
      ctx.fillStyle = 'rgba(14, 24, 10, 0.8)';
      ctx.beginPath();
      ctx.ellipse(sh.x + sh.w / 2, sh.y + sh.h / 2, sh.w / 2, sh.h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      // Highlight top
      ctx.fillStyle = 'rgba(18, 30, 14, 0.4)';
      ctx.beginPath();
      ctx.ellipse(sh.x + sh.w / 2, sh.y + sh.h * 0.3, sh.w / 2.5, sh.h / 3, 0, 0, Math.PI * 2);
      ctx.fill();
      // Shadow base
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.ellipse(sh.x + sh.w / 2, sh.y + sh.h * 0.8, sh.w / 2.2, sh.h / 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // === Old stone path — cracked, mossy, ancient ===
    const pathCX = W / 2;
    const pathTopW = 80;
    const pathBotW = 260;
    const pathTop = H * 0.58;
    const pathBot = H;

    ctx.fillStyle = '#1e1a16';
    ctx.beginPath();
    ctx.moveTo(pathCX - pathTopW / 2, pathTop);
    ctx.lineTo(pathCX + pathTopW / 2, pathTop);
    ctx.lineTo(pathCX + pathBotW / 2, pathBot);
    ctx.lineTo(pathCX - pathBotW / 2, pathBot);
    ctx.closePath();
    ctx.fill();

    // Cobblestone texture
    for (let py = pathTop; py < pathBot; py += 12) {
      const t = (py - pathTop) / (pathBot - pathTop);
      const rowW = pathTopW + (pathBotW - pathTopW) * t;
      const rowX = pathCX - rowW / 2;
      const stoneW = 14 + t * 8;
      const offset = (Math.floor((py - pathTop) / 12) % 2) * stoneW * 0.5;
      for (let px = rowX + offset; px < rowX + rowW - stoneW * 0.5; px += stoneW) {
        const sv = Math.abs(Math.sin(px * 127.1 + py * 311.7) * 43758.5453 % 1);
        const r = 25 + sv * 15;
        const g = 22 + sv * 12;
        const b = 18 + sv * 8;
        ctx.fillStyle = `rgb(${r | 0}, ${g | 0}, ${b | 0})`;
        const sw = Math.min(stoneW - 2, rowX + rowW - px - 1);
        if (sw > 2) {
          ctx.fillRect(px + 1, py + 1, sw, 10);
        }
      }
      // Mortar line
      ctx.fillStyle = 'rgba(10, 8, 5, 0.6)';
      ctx.fillRect(rowX, py, rowW, 1.5);
    }

    // === Tavern building — old world stone & timber fortress ===
    const bldgX = W * 0.15;
    const bldgW = W * 0.70;
    const bldgTop = H * 0.10;
    const bldgBot = H * 0.58;
    const bldgH = bldgBot - bldgTop;
    const splitY = bldgTop + bldgH * 0.55; // stone/timber split

    // === Lower half: heavy stone masonry ===
    const stoneGrad = ctx.createLinearGradient(bldgX, splitY, bldgX, bldgBot);
    stoneGrad.addColorStop(0, '#2a2520');
    stoneGrad.addColorStop(0.5, '#22201c');
    stoneGrad.addColorStop(1, '#1a1814');
    ctx.fillStyle = stoneGrad;
    ctx.fillRect(bldgX, splitY, bldgW, bldgBot - splitY);

    // Large irregular stone blocks — lower half
    const stoneH = 20;
    for (let sy = splitY; sy < bldgBot; sy += stoneH) {
      const row = Math.floor((sy - splitY) / stoneH);
      const baseBlockW = 45 + (row % 3) * 10;
      const rowOff = (row % 2) * baseBlockW * 0.4;
      for (let sx = bldgX + rowOff; sx < bldgX + bldgW; sx += baseBlockW) {
        const sv = Math.abs(Math.sin(sx * 73.1 + sy * 199.3) * 43758.5 % 1);
        const sw = Math.min(baseBlockW - 3, bldgX + bldgW - sx - 2);
        if (sw <= 4) continue;
        const r = 30 + sv * 18;
        const g = 28 + sv * 15;
        const b = 24 + sv * 10;
        ctx.fillStyle = `rgb(${r | 0}, ${g | 0}, ${b | 0})`;
        ctx.fillRect(sx + 1.5, sy + 1.5, sw, stoneH - 3);
        // Highlight edge (top-left)
        ctx.fillStyle = `rgba(255, 255, 255, ${0.02 + sv * 0.02})`;
        ctx.fillRect(sx + 1.5, sy + 1.5, sw, 1);
        ctx.fillRect(sx + 1.5, sy + 1.5, 1, stoneH - 3);
      }
      // Dark mortar lines
      ctx.fillStyle = 'rgba(5, 4, 3, 0.7)';
      ctx.fillRect(bldgX, sy, bldgW, 2);
    }

    // Stone foundation base — thicker, darker
    ctx.fillStyle = '#141210';
    ctx.fillRect(bldgX - 8, bldgBot - 6, bldgW + 16, 8);
    ctx.fillStyle = '#1e1a16';
    ctx.fillRect(bldgX - 4, bldgBot - 3, bldgW + 8, 5);

    // === Upper half: timber frame with plaster/wattle fill ===
    const upperGrad = ctx.createLinearGradient(bldgX, bldgTop, bldgX, splitY);
    upperGrad.addColorStop(0, '#2e2820');
    upperGrad.addColorStop(1, '#28231c');
    ctx.fillStyle = upperGrad;
    ctx.fillRect(bldgX, bldgTop, bldgW, splitY - bldgTop);

    // Plaster/daub panels between timbers
    const panelW = bldgW / 5;
    for (let px = bldgX; px < bldgX + bldgW; px += panelW) {
      const pw = Math.min(panelW, bldgX + bldgW - px);
      const sv = Math.abs(Math.sin(px * 47.3) * 43758.5 % 1);
      const shade = 35 + sv * 10;
      ctx.fillStyle = `rgb(${shade + 5 | 0}, ${shade + 2 | 0}, ${shade - 3 | 0})`;
      ctx.fillRect(px + 4, bldgTop + 4, pw - 8, splitY - bldgTop - 8);
    }

    // Heavy timber beams — vertical
    ctx.fillStyle = '#1a1208';
    for (let tx = bldgX; tx <= bldgX + bldgW; tx += panelW) {
      ctx.fillRect(tx - 4, bldgTop - 2, 8, splitY - bldgTop + 4);
    }
    // Horizontal beam at split
    ctx.fillStyle = '#1e1408';
    ctx.fillRect(bldgX - 10, splitY - 5, bldgW + 20, 10);
    // Horizontal beam at top of upper
    ctx.fillRect(bldgX - 6, bldgTop - 4, bldgW + 12, 8);
    // Diagonal braces in each panel
    ctx.strokeStyle = '#1a1208';
    ctx.lineWidth = 4;
    for (let i = 0; i < 5; i++) {
      const px = bldgX + i * panelW;
      if (i % 2 === 0) {
        ctx.beginPath();
        ctx.moveTo(px + 6, bldgTop + 6);
        ctx.lineTo(px + panelW - 6, splitY - 8);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(px + panelW - 6, bldgTop + 6);
        ctx.lineTo(px + 6, splitY - 8);
        ctx.stroke();
      }
    }

    // === Steep thatched roof ===
    const roofPeak = bldgTop - 100;
    const roofOverhang = 30;

    // Roof fill — dark thatch
    ctx.fillStyle = '#18140e';
    ctx.beginPath();
    ctx.moveTo(bldgX - roofOverhang, bldgTop);
    ctx.lineTo(W / 2, roofPeak);
    ctx.lineTo(bldgX + bldgW + roofOverhang, bldgTop);
    ctx.closePath();
    ctx.fill();

    // Thatch texture — horizontal lines with slight variation
    for (let i = 0; i < 18; i++) {
      const t = (i + 1) / 19;
      const ly = roofPeak + (bldgTop - roofPeak) * t;
      const leftX = bldgX - roofOverhang + (W / 2 - bldgX + roofOverhang) * (1 - t);
      const rightX = bldgX + bldgW + roofOverhang - (bldgX + bldgW + roofOverhang - W / 2) * (1 - t);
      const sv = Math.abs(Math.sin(i * 31.7) * 43758.5 % 1);
      ctx.strokeStyle = `rgba(${25 + sv * 10 | 0}, ${20 + sv * 8 | 0}, ${14 + sv * 6 | 0}, 0.5)`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(leftX + 2, ly);
      ctx.lineTo(rightX - 2, ly);
      ctx.stroke();
    }

    // Roof edge beam
    ctx.strokeStyle = '#2a1c10';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(bldgX - roofOverhang, bldgTop + 1);
    ctx.lineTo(W / 2, roofPeak);
    ctx.lineTo(bldgX + bldgW + roofOverhang, bldgTop + 1);
    ctx.stroke();

    // Chimney — right side
    const chimX = bldgX + bldgW * 0.78;
    const chimW = 28;
    const chimTop = roofPeak + 20;
    const chimBot = bldgTop + 15;
    ctx.fillStyle = '#252018';
    ctx.fillRect(chimX, chimTop, chimW, chimBot - chimTop);
    // Chimney stones
    for (let cy = chimTop; cy < chimBot; cy += 8) {
      ctx.fillStyle = 'rgba(5, 4, 3, 0.4)';
      ctx.fillRect(chimX, cy, chimW, 1);
    }
    // Chimney cap
    ctx.fillStyle = '#1e1810';
    ctx.fillRect(chimX - 4, chimTop - 4, chimW + 8, 6);
    // Smoke wisps
    for (let si = 0; si < 3; si++) {
      const smokeX = chimX + chimW / 2 + Math.sin(this.phase * 0.5 + si * 2) * 8;
      const smokeY = chimTop - 15 - si * 18 + Math.sin(this.phase * 0.3 + si) * 4;
      const smokeAlpha = 0.06 - si * 0.015;
      if (smokeAlpha > 0) {
        ctx.fillStyle = `rgba(150, 150, 160, ${smokeAlpha})`;
        ctx.beginPath();
        ctx.ellipse(smokeX, smokeY, 8 + si * 5, 4 + si * 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // === Weathervane on roof peak ===
    ctx.strokeStyle = '#3d2814';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W / 2, roofPeak);
    ctx.lineTo(W / 2, roofPeak - 22);
    ctx.stroke();
    // Crossbar
    ctx.beginPath();
    ctx.moveTo(W / 2 - 12, roofPeak - 18);
    ctx.lineTo(W / 2 + 12, roofPeak - 18);
    ctx.stroke();
    // Arrow
    ctx.fillStyle = '#4a3018';
    ctx.beginPath();
    ctx.moveTo(W / 2 + 12, roofPeak - 18);
    ctx.lineTo(W / 2 + 18, roofPeak - 20);
    ctx.lineTo(W / 2 + 12, roofPeak - 16);
    ctx.fill();

    // === Ivy / moss on tavern walls ===
    const ivyColor = 'rgba(15, 28, 10, 0.5)';
    // Left wall ivy
    for (let iv = 0; iv < 6; iv++) {
      const ix = bldgX + Math.abs(Math.sin(iv * 47.3) * bldgW * 0.15);
      const iy = splitY + iv * 15 + Math.abs(Math.sin(iv * 73.1) * 20);
      const iw = 12 + Math.abs(Math.sin(iv * 31.7) * 18);
      const ih = 10 + Math.abs(Math.sin(iv * 91.3) * 12);
      ctx.fillStyle = ivyColor;
      ctx.beginPath();
      ctx.ellipse(ix + iw / 2, iy + ih / 2, iw / 2, ih / 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Right wall ivy
    for (let iv = 0; iv < 5; iv++) {
      const ix = bldgX + bldgW - 30 - Math.abs(Math.sin(iv * 53.7) * 25);
      const iy = splitY + 5 + iv * 18;
      ctx.fillStyle = ivyColor;
      ctx.beginPath();
      ctx.ellipse(ix, iy, 10 + iv * 2, 7 + iv, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // === Moss patches on stone foundation ===
    ctx.fillStyle = 'rgba(18, 32, 12, 0.35)';
    ctx.fillRect(bldgX + 10, bldgBot - 15, 30, 8);
    ctx.fillRect(bldgX + bldgW - 50, bldgBot - 12, 25, 6);
    ctx.fillStyle = 'rgba(20, 35, 14, 0.25)';
    ctx.fillRect(bldgX + bldgW * 0.4, bldgBot - 10, 35, 5);

    // === Cracks in stone wall ===
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bldgX + bldgW * 0.25, splitY + 10);
    ctx.lineTo(bldgX + bldgW * 0.27, splitY + 35);
    ctx.lineTo(bldgX + bldgW * 0.24, splitY + 55);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bldgX + bldgW * 0.7, splitY + 20);
    ctx.lineTo(bldgX + bldgW * 0.72, splitY + 50);
    ctx.stroke();

    // === Door ===
    const doorW = 50;
    const doorH = 80;
    const doorX = W / 2 - doorW / 2;
    const doorY = bldgBot - doorH;

    // Door frame
    ctx.fillStyle = '#2a1a0e';
    ctx.fillRect(doorX - 6, doorY - 6, doorW + 12, doorH + 6);
    // Door arch
    ctx.beginPath();
    ctx.moveTo(doorX - 6, doorY + doorH);
    ctx.lineTo(doorX - 6, doorY + 10);
    ctx.quadraticCurveTo(doorX + doorW / 2, doorY - 16, doorX + doorW + 6, doorY + 10);
    ctx.lineTo(doorX + doorW + 6, doorY + doorH);
    ctx.closePath();
    ctx.fillStyle = '#1a0e06';
    ctx.fill();
    ctx.strokeStyle = '#3d2814';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Door wood
    ctx.fillStyle = '#2a1808';
    ctx.fillRect(doorX, doorY + 10, doorW, doorH - 10);
    // Door planks
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1;
    for (let dx = doorX + 12; dx < doorX + doorW; dx += 13) {
      ctx.beginPath();
      ctx.moveTo(dx, doorY + 12);
      ctx.lineTo(dx, doorY + doorH);
      ctx.stroke();
    }
    // Door handle
    ctx.fillStyle = '#6b5030';
    ctx.beginPath();
    ctx.arc(doorX + doorW - 12, doorY + doorH / 2 + 10, 3, 0, Math.PI * 2);
    ctx.fill();

    // Warm light spilling from door cracks
    const doorGlow = ctx.createRadialGradient(
      W / 2, doorY + doorH * 0.6, 5,
      W / 2, doorY + doorH * 0.6, 120
    );
    doorGlow.addColorStop(0, `rgba(255, 160, 40, ${0.12 + Math.sin(this.phase * 1.3) * 0.03})`);
    doorGlow.addColorStop(0.5, 'rgba(255, 120, 20, 0.04)');
    doorGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = doorGlow;
    ctx.fillRect(W / 2 - 120, doorY - 20, 240, doorH + 80);

    // Light line under door
    ctx.fillStyle = `rgba(255, 180, 60, ${0.3 + Math.sin(this.phase * 2) * 0.1})`;
    ctx.fillRect(doorX + 2, doorY + doorH - 3, doorW - 4, 3);

    // === Windows (warm light) ===
    const winW = 36;
    const winH = 32;
    const windows = [
      { x: bldgX + bldgW * 0.18, y: bldgTop + bldgH * 0.25 },
      { x: bldgX + bldgW * 0.75, y: bldgTop + bldgH * 0.25 },
      { x: bldgX + bldgW * 0.18, y: bldgTop + bldgH * 0.55 },
      { x: bldgX + bldgW * 0.75, y: bldgTop + bldgH * 0.55 },
    ];
    for (let wi = 0; wi < windows.length; wi++) {
      const win = windows[wi];
      const flicker = Math.sin(this.phase * 2.5 + wi * 1.9) * 0.08;

      // Window recess
      ctx.fillStyle = '#0a0604';
      ctx.fillRect(win.x - 2, win.y - 2, winW + 4, winH + 4);

      // Warm light fill
      const winGrad = ctx.createRadialGradient(
        win.x + winW / 2, win.y + winH / 2, 2,
        win.x + winW / 2, win.y + winH / 2, winW
      );
      winGrad.addColorStop(0, `rgba(255, 200, 80, ${0.7 + flicker})`);
      winGrad.addColorStop(0.5, `rgba(255, 140, 30, ${0.5 + flicker})`);
      winGrad.addColorStop(1, `rgba(200, 80, 10, ${0.2 + flicker})`);
      ctx.fillStyle = winGrad;
      ctx.fillRect(win.x, win.y, winW, winH);

      // Window frame (cross)
      ctx.fillStyle = '#1a1008';
      ctx.fillRect(win.x + winW / 2 - 1, win.y, 2, winH);
      ctx.fillRect(win.x, win.y + winH / 2 - 1, winW, 2);

      // Frame border
      ctx.strokeStyle = '#3d2814';
      ctx.lineWidth = 2;
      ctx.strokeRect(win.x - 1, win.y - 1, winW + 2, winH + 2);

      // Light spill onto ground below windows
      const spillGlow = ctx.createRadialGradient(
        win.x + winW / 2, bldgBot + 20, 5,
        win.x + winW / 2, bldgBot + 20, 60
      );
      spillGlow.addColorStop(0, `rgba(255, 160, 40, ${0.08 + flicker * 0.3})`);
      spillGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = spillGlow;
      ctx.fillRect(win.x - 30, bldgBot - 10, winW + 60, 80);
    }

    // === Torches flanking entrance ===
    const torchPositions = [
      { x: doorX - 30, y: doorY + 10 },
      { x: doorX + doorW + 30, y: doorY + 10 },
    ];
    for (const torch of torchPositions) {
      // Bracket
      ctx.fillStyle = '#3d2814';
      ctx.fillRect(torch.x - 3, torch.y, 6, 25);
      ctx.fillStyle = '#5a3d1e';
      ctx.fillRect(torch.x - 5, torch.y + 20, 10, 6);

      const flicker = Math.sin(this.phase * 3 + torch.x) * 4;
      const flameH = 16 + flicker;

      // Torch glow
      const torchGlow = ctx.createRadialGradient(
        torch.x, torch.y - 10, 3,
        torch.x, torch.y - 10, 80
      );
      torchGlow.addColorStop(0, `rgba(255, 160, 40, ${0.2 + Math.sin(this.phase * 2 + torch.x) * 0.05})`);
      torchGlow.addColorStop(0.5, 'rgba(255, 100, 10, 0.05)');
      torchGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = torchGlow;
      ctx.fillRect(torch.x - 80, torch.y - 80, 160, 160);

      // Outer flame
      ctx.fillStyle = 'rgba(255, 120, 20, 0.7)';
      ctx.beginPath();
      ctx.ellipse(torch.x, torch.y - 6, 7, flameH, 0, 0, Math.PI * 2);
      ctx.fill();

      // Inner flame
      ctx.fillStyle = 'rgba(255, 220, 80, 0.8)';
      ctx.beginPath();
      ctx.ellipse(torch.x, torch.y - 4, 4, flameH * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Core
      ctx.fillStyle = 'rgba(255, 255, 200, 0.9)';
      ctx.beginPath();
      ctx.ellipse(torch.x, torch.y - 2, 2, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // === Hanging sign: "THE RUSTY FLAGON" ===
    const signCX = W / 2;
    const signY = bldgTop - 10;
    const signW = 200;
    const signH = 40;

    // Chain links from roof peak
    ctx.strokeStyle = '#4a3d30';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(signCX - signW / 3, bldgTop - 50);
    ctx.lineTo(signCX - signW / 3, signY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(signCX + signW / 3, bldgTop - 50);
    ctx.lineTo(signCX + signW / 3, signY);
    ctx.stroke();

    // Sign board
    ctx.fillStyle = '#2a1a0e';
    ctx.fillRect(signCX - signW / 2, signY, signW, signH);
    ctx.strokeStyle = '#5a3d20';
    ctx.lineWidth = 2;
    ctx.strokeRect(signCX - signW / 2, signY, signW, signH);
    // Inner border
    ctx.strokeStyle = '#1a0e06';
    ctx.lineWidth = 1;
    ctx.strokeRect(signCX - signW / 2 + 3, signY + 3, signW - 6, signH - 6);

    // Sign text
    ctx.textAlign = 'center';
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = '#0a0500';
    ctx.fillText('THE RUSTY FLAGON', signCX + 1, signY + 26);
    ctx.fillStyle = '#FFD700';
    ctx.fillText('THE RUSTY FLAGON', signCX, signY + 25);

    // === Scattered stones and puddles along path ===
    // Small stones
    ctx.fillStyle = '#1a1612';
    for (let si = 0; si < 8; si++) {
      const sx = W / 2 - 100 + Math.abs(Math.sin(si * 97.3) * 200);
      const sy = H * 0.62 + Math.abs(Math.sin(si * 43.1) * H * 0.25);
      if (Math.abs(sx - W / 2) < 40) continue;
      ctx.beginPath();
      ctx.ellipse(sx, sy, 3 + Math.abs(Math.sin(si * 71.3)) * 4, 2 + Math.abs(Math.sin(si * 53.7)) * 2, Math.sin(si) * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Puddles reflecting moonlight
    for (let pi = 0; pi < 3; pi++) {
      const px = W * 0.2 + pi * W * 0.25 + Math.sin(pi * 47) * 30;
      const py = H * 0.65 + pi * 20;
      if (Math.abs(px - W / 2) < 60) continue;
      const pw = 20 + pi * 8;
      const ph = 5 + pi * 2;
      // Puddle
      ctx.fillStyle = 'rgba(10, 12, 18, 0.6)';
      ctx.beginPath();
      ctx.ellipse(px, py, pw, ph, 0, 0, Math.PI * 2);
      ctx.fill();
      // Moonlight reflection
      ctx.fillStyle = `rgba(150, 160, 190, ${0.06 + Math.sin(this.phase * 0.8 + pi) * 0.02})`;
      ctx.beginPath();
      ctx.ellipse(px + 3, py - 1, pw * 0.4, ph * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // === Path lantern (ground level, left of path) ===
    const lanternX = W / 2 - 70;
    const lanternY = H * 0.68;
    // Post
    ctx.fillStyle = '#2a1a0e';
    ctx.fillRect(lanternX - 2, lanternY - 20, 4, 22);
    // Lantern housing
    ctx.fillStyle = '#3d2814';
    ctx.fillRect(lanternX - 5, lanternY - 28, 10, 10);
    // Lantern light
    const lanternFlick = Math.sin(this.phase * 2.8) * 0.04;
    ctx.fillStyle = `rgba(255, 180, 60, ${0.6 + lanternFlick})`;
    ctx.fillRect(lanternX - 3, lanternY - 26, 6, 6);
    // Lantern glow on ground
    const lGlow = ctx.createRadialGradient(lanternX, lanternY, 3, lanternX, lanternY, 50);
    lGlow.addColorStop(0, `rgba(255, 160, 40, ${0.1 + lanternFlick})`);
    lGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = lGlow;
    ctx.fillRect(lanternX - 50, lanternY - 40, 100, 80);

    // === Ground fog / mist ===
    for (let fi = 0; fi < 8; fi++) {
      const fogX = (fi * W / 6) + Math.sin(this.phase * 0.5 + fi * 2.1) * 30;
      const fogY = H * 0.6 + fi * 15 + Math.sin(this.phase * 0.3 + fi) * 8;
      const fogW = 120 + fi * 20;
      const fogH = 25 + fi * 5;
      const fogAlpha = 0.04 + Math.sin(this.phase * 0.4 + fi * 1.3) * 0.015;
      const fogGrad = ctx.createRadialGradient(
        fogX + fogW / 2, fogY + fogH / 2, 5,
        fogX + fogW / 2, fogY + fogH / 2, fogW / 2
      );
      fogGrad.addColorStop(0, `rgba(180, 180, 200, ${fogAlpha})`);
      fogGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = fogGrad;
      ctx.fillRect(fogX, fogY, fogW, fogH);
    }

    // === Dark vignette ===
    const vignetteGrad = ctx.createRadialGradient(W / 2, H / 2, W * 0.25, W / 2, H / 2, W * 0.7);
    vignetteGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignetteGrad.addColorStop(1, 'rgba(0, 0, 0, 0.6)');
    ctx.fillStyle = vignetteGrad;
    ctx.fillRect(0, 0, W, H);

    // === Title text ===
    ctx.textAlign = 'center';

    // Main title — ornate styling with shadow
    ctx.font = 'bold 36px monospace';
    ctx.fillStyle = '#0a0500';
    ctx.fillText('THE RUSTY FLAGON', W / 2 + 2, H * 0.78 + 2);
    ctx.fillStyle = '#FFD700';
    ctx.fillText('THE RUSTY FLAGON', W / 2, H * 0.78);

    // Decorative line
    ctx.fillStyle = '#5a3d20';
    ctx.fillRect(W / 2 - 140, H * 0.78 + 8, 280, 1);

    // Subtitle
    ctx.font = '12px monospace';
    ctx.fillStyle = '#8B7355';
    ctx.fillText('Est. the Aureate Age, Year of the Broken Sun', W / 2, H * 0.78 + 24);

    // "Press any key" prompt with pulse
    ctx.font = '14px monospace';
    ctx.fillStyle = `rgba(196, 162, 101, ${this.promptAlpha})`;
    ctx.fillText('Press any key to enter', W / 2, H * 0.92);

    ctx.textAlign = 'left';

    // === Fade-in overlay ===
    if (this.fadeIn < 1) {
      ctx.fillStyle = `rgba(0, 0, 0, ${1 - this.fadeIn})`;
      ctx.fillRect(0, 0, W, H);
    }

    ctx.restore();
  }
}
