/**
 * SpriteAtlas — central registry of loaded sprite images.
 */
export class SpriteAtlas {
  constructor(assets) {
    this.assets = assets;
  }

  get(name) {
    return this.assets.get(name) || null;
  }

  has(name) {
    return this.assets.has(name);
  }

  draw(ctx, name, x, y, w, h) {
    const img = this.assets.get(name);
    if (!img) return false;
    if (w !== undefined && h !== undefined) {
      ctx.drawImage(img, x, y, w, h);
    } else {
      ctx.drawImage(img, x, y);
    }
    return true;
  }

  drawSlice(ctx, name, sx, sy, sw, sh, dx, dy, dw, dh) {
    const img = this.assets.get(name);
    if (!img) return false;
    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
    return true;
  }
}
