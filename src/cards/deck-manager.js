// Deck Manager — Shared party deck: ONE draw pile, discard pile, exhaust pile
// Scope Section 3: Hand & Deck Rules

import { Card } from './card.js';

export class DeckManager {
  /**
   * @param {string[]} cardIds — array of card IDs for the full shared deck
   * @param {number} seed — optional seed for deterministic shuffle (daily challenge)
   */
  constructor(cardIds, seed = null) {
    this.fullDeck = cardIds.map(id => new Card(id));
    this.drawPile = [];
    this.hand = [];
    this.discardPile = [];
    this.exhaustPile = [];
    this.maxHandSize = 10;
    this.cardsPerDraw = 5;

    // Seeded PRNG (mulberry32)
    this._seed = seed || (Date.now() ^ (Math.random() * 0xFFFFFFFF));
    this._rngState = this._seed;

    // Initialize draw pile with full deck shuffled
    this.drawPile = [...this.fullDeck];
    this.shuffle();
  }

  /**
   * Seeded PRNG — Mulberry32
   */
  _rng() {
    this._rngState |= 0;
    this._rngState = (this._rngState + 0x6D2B79F5) | 0;
    let t = Math.imul(this._rngState ^ (this._rngState >>> 15), 1 | this._rngState);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Fisher-Yates shuffle on the draw pile using seeded PRNG.
   */
  shuffle() {
    const arr = this.drawPile;
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this._rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  /**
   * Draw N cards from draw pile into hand.
   * Dead member class cards auto-discard and replace.
   * Max hand size 10.
   * @param {number} count — how many to draw
   * @param {Array} aliveMembers — alive party members (for dead member check)
   * @returns {Card[]} — cards actually added to hand
   */
  draw(count, aliveMembers) {
    const drawn = [];
    const aliveClasses = new Set((aliveMembers || []).map(m => m.class));
    let remaining = count;

    let safetyCounter = this.fullDeck.length * 3; // Prevent infinite loop if all cards are dead class
    while (remaining > 0 && --safetyCounter > 0) {
      if (this.hand.length >= this.maxHandSize) break;

      if (this.drawPile.length === 0) {
        if (this.discardPile.length === 0) break; // No cards left anywhere
        this.reshuffle();
        if (this.drawPile.length === 0) break; // Still nothing after reshuffle
      }

      const card = this.drawPile.pop();

      // Dead member handling: class cards for dead members auto-discard + replace
      if (card.cardClass !== 'neutral' && !aliveClasses.has(card.cardClass)) {
        this.discardPile.push(card);
        // Don't decrement remaining — we draw a replacement
        continue;
      }

      this.hand.push(card);
      drawn.push(card);
      remaining--;
    }

    return drawn;
  }

  /**
   * Discard a specific card from hand to discard pile.
   */
  discard(card) {
    const idx = this.hand.indexOf(card);
    if (idx >= 0) {
      this.hand.splice(idx, 1);
      this.discardPile.push(card);
      return true;
    }
    return false;
  }

  /**
   * Exhaust a card — remove from combat permanently.
   */
  exhaust(card) {
    const idx = this.hand.indexOf(card);
    if (idx >= 0) {
      this.hand.splice(idx, 1);
    }
    this.exhaustPile.push(card);
  }

  /**
   * End of turn: discard remaining hand (respect Retain), exhaust Ethereal cards.
   */
  endTurn() {
    const toKeep = [];
    for (const card of this.hand) {
      if (card.ethereal) {
        // Ethereal cards exhaust if still in hand
        this.exhaustPile.push(card);
      } else if (card.retain) {
        // Retain cards stay in hand
        toKeep.push(card);
      } else {
        this.discardPile.push(card);
      }
    }
    this.hand = toKeep;
  }

  /**
   * Reshuffle: discard pile becomes draw pile, then shuffle.
   */
  reshuffle() {
    this.drawPile = [...this.discardPile];
    this.discardPile = [];
    this.shuffle();
  }

  /**
   * Get current hand size.
   */
  getHandSize() {
    return this.hand.length;
  }

  /**
   * Get draw pile count.
   */
  getDrawCount() {
    return this.drawPile.length;
  }

  /**
   * Get discard pile count.
   */
  getDiscardCount() {
    return this.discardPile.length;
  }

  /**
   * Get exhaust pile count.
   */
  getExhaustCount() {
    return this.exhaustPile.length;
  }
}
