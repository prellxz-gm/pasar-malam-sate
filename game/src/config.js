// config.js — constants for Pasar Malam: Sate (night-market satay grill).
// Every tuning number for the grill, the tickets and the shift lives here.

export const VIEW_W = 1280;
export const VIEW_H = 720;

export const SHIFT_SECONDS = 180;
export const RUSH_START_REMAINING = 90; // rush hour begins with 90s left
export const RUSH_DURATION = 30; // seconds of doubled arrivals
export const MAX_TICKETS = 4;

// Grill: 6 skewer slots in a row over the coals.
export const GRILL_SLOTS = 6;
export const GRILL = { x: 330, y: 300, w: 620, h: 170 };
export const SLOT_W = 92;
export const SLOT_GAP = 8;

// Doneness runs 0..100. The PERFECT window is where a skewer is worth
// serving; past it the skewer burns. Flipping is required for a perfect
// serve: a skewer that was never flipped cooks unevenly.
export const PERFECT_LOW = 62;
export const PERFECT_HIGH = 84;
export const BURNT_AT = 100;

// Heat 0..100. Coals cool on their own; stoking (F / fan click) heats them
// back up. Above the flare line the coals flare and everything burns fast.
export const HEAT_START = 62;
export const HEAT_DECAY_PER_SEC = 1.6;
export const HEAT_STOKE = 22;
export const HEAT_FLARE_LINE = 88;
export const HEAT_COOK_RATE = 9.5; // doneness per second at heat 100
export const HEAT_FLARE_MULT = 2.1;

// Skewer types: raw colour, cooked colour, how long they take, price.
export const SKEWER_TYPES = {
  chicken: { name: 'Ayam', label: 'Chicken', raw: '#f2b8a0', cooked: '#c97b2d', dark: '#7a3c12', price: 120, cookMul: 1.0 },
  beef: { name: 'Sapi', label: 'Beef', raw: '#d97b7b', cooked: '#8a3b1d', dark: '#4d1c08', price: 150, cookMul: 1.15 },
  lamb: { name: 'Kambing', label: 'Lamb', raw: '#e08a8a', cooked: '#9a4a22', dark: '#571f0a', price: 160, cookMul: 1.1 },
  tofu: { name: 'Tahu', label: 'Tofu', raw: '#f7ecd2', cooked: '#e0a83c', dark: '#8a5a10', price: 100, cookMul: 0.8 },
  tempeh: { name: 'Tempe', label: 'Tempeh', raw: '#e8c98f', cooked: '#b5761f', dark: '#6e3f08', price: 100, cookMul: 0.85 },
};
export const SKEWER_ORDER = ['chicken', 'beef', 'lamb', 'tofu', 'tempeh'];

// Sauces served from the ladle pots on the left of the stall.
export const SAUCES = {
  peanut: { name: 'Kacang', label: 'Peanut', color: '#c98a3d', dark: '#8a5a1c' },
  kecap: { name: 'Kecap', label: 'Sweet Soy', color: '#5a2d12', dark: '#2e1506' },
  chilli: { name: 'Sambal', label: 'Chilli', color: '#c22e1a', dark: '#7a1508' },
};
export const SAUCE_ORDER = ['peanut', 'kecap', 'chilli'];

// Sides: lontong from the basket, drinks from the cooler.
export const SIDES = {
  lontong: { name: 'Lontong', label: 'Rice Cake', price: 40 },
  drink: { name: 'Es Teh', label: 'Iced Tea', price: 30 },
};

// Ticket pressure: arrivals start slow and quicken; patience shrinks.
export const SPAWN_FIRST_DELAY = 4;
export const SPAWN_INTERVAL_START = 13;
export const SPAWN_INTERVAL_END = 7;
export const PATIENCE_START = 55;
export const PATIENCE_END = 34;

// Scoring.
export const SCORE_PERFECT_SKEWER = 100;
export const SCORE_SIDE = 40;
export const TIP_MAX = 60;
export const BURNT_PENALTY = 25;
export const EXPIRED_PENALTY = 30;
export const WRONG_PENALTY = 10;
export const MAX_COMBO = 5;

// Night-market palette: deep indigo dusk, amber string lights, ember orange.
export const COLORS = {
  skyTop: '#171233',
  skyBottom: '#3a2350',
  stallWood: '#6b4226',
  stallWoodDark: '#4a2c17',
  awningRed: '#b8322a',
  awningCream: '#f3e2c2',
  lightGlow: '#ffca6a',
  ember: '#ff7a1a',
  emberHot: '#ffc23d',
  coal: '#3a2a22',
  coalGlow: '#ff5a1a',
  grillIron: '#2e2a28',
  counter: '#8a5a33',
  counterTop: '#a9743f',
  ticketBg: '#fff6dd',
  ticketInk: '#2e2118',
  perfect: '#3fae5a',
  perfectGlow: '#7be495',
  burnt: '#2b1a12',
  hudBg: '#1c1430',
  hudText: '#ffe9b8',
  smoke: 'rgba(200,200,220,0.16)',
};
