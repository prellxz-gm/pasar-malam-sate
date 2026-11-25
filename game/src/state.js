// state.js — game state: grill slots + doneness, heat, tickets/queue,
// served plates, score/combo, shift timer and the rush wave.
//
// A skewer on the grill: { type, doneness 0..100, flipped, burnt }.
// A ticket: { id, customer, items: [{type, sauce, done}], side, sideDone,
//            patience, maxPatience }.
// The player's hand holds one thing at a time: a cooked skewer (with its
// sauce, or unsauced) or a side. Click a ticket to place what you hold.

import {
  GRILL_SLOTS, HEAT_START, HEAT_DECAY_PER_SEC, HEAT_STOKE, HEAT_FLARE_LINE,
  HEAT_COOK_RATE, HEAT_FLARE_MULT, PERFECT_LOW, PERFECT_HIGH, BURNT_AT,
  SHIFT_SECONDS, RUSH_START_REMAINING, RUSH_DURATION, MAX_TICKETS,
  SPAWN_FIRST_DELAY, SPAWN_INTERVAL_START, SPAWN_INTERVAL_END,
  PATIENCE_START, PATIENCE_END, SKEWER_TYPES, SKEWER_ORDER, SAUCE_ORDER,
  SCORE_PERFECT_SKEWER, SCORE_SIDE, TIP_MAX, BURNT_PENALTY,
  EXPIRED_PENALTY, WRONG_PENALTY, MAX_COMBO,
} from './config.js';
import { makeRng, pick, range, intRange } from './random.js';

const CUSTOMERS = [
  { name: 'Ibu Sari', skin: '#e8b98a', shirt: '#c94f6d', hair: '#2b1a12', style: 'bun' },
  { name: 'Pak Budi', skin: '#c98d5f', shirt: '#3f7a4e', hair: '#1c1c1c', style: 'cap' },
  { name: 'Dewi', skin: '#f2c9a0', shirt: '#e8a13c', hair: '#4a2c17', style: 'long' },
  { name: 'Agus', skin: '#d9a06a', shirt: '#4a6fa5', hair: '#141414', style: 'spiky' },
  { name: 'Mbak Rina', skin: '#eab98c', shirt: '#7a4a9e', hair: '#241608', style: 'bun' },
  { name: 'Kak Jo', skin: '#c98a5c', shirt: '#b8322a', hair: '#0f0f0f', style: 'cap' },
  { name: 'Nenek Ani', skin: '#e5b184', shirt: '#8a7a5a', hair: '#d8d8d8', style: 'bun' },
  { name: 'Rudi', skin: '#dba878', shirt: '#2a7a8a', hair: '#201408', style: 'spiky' },
];

export function createGameState(seed) {
  const rng = makeRng(seed || 1);
  return {
    seed: seed || 1,
    rng,
    screen: 'title', // title | playing | paused | end
    time: 0, // seconds since shift start
    remaining: SHIFT_SECONDS,
    heat: HEAT_START,
    flare: false,
    grill: Array.from({ length: GRILL_SLOTS }, () => null),
    tickets: [],
    nextTicketId: 1,
    spawnIn: SPAWN_FIRST_DELAY,
    rush: false,
    rushIn: 0,
    hand: null, // { kind: 'skewer', type, sauce, perfect } | { kind: 'side', side }
    tray: [], // served skewers placed on tickets already (for the summary)
    score: 0,
    coins: 0,
    combo: 0,
    bestCombo: 0,
    served: 0,
    perfectServed: 0,
    burntTossed: 0,
    expired: 0,
    message: '',
    messageUntil: 0,
    smokePuffs: [],
    sparkles: [],
    muted: false,
    stats: { skewersGrilled: 0, flips: 0, sauces: 0, sides: 0 },
  };
}

export function shiftProgress(state) {
  return 1 - state.remaining / SHIFT_SECONDS;
}

export function spawnInterval(state) {
  const p = shiftProgress(state);
  let base = SPAWN_INTERVAL_START + (SPAWN_INTERVAL_END - SPAWN_INTERVAL_START) * p;
  if (state.rush) base /= 2;
  return base;
}

export function makeTicket(state) {
  const rng = state.rng;
  const p = shiftProgress(state);
  const customer = pick(rng, CUSTOMERS);
  const itemCount = rng() < 0.35 + 0.3 * p ? 2 : 1;
  const items = [];
  for (let i = 0; i < itemCount; i++) {
    items.push({
      type: pick(rng, SKEWER_ORDER),
      sauce: pick(rng, SAUCE_ORDER),
      done: false,
    });
  }
  const side = rng() < 0.55 ? pick(rng, ['lontong', 'drink']) : null;
  const patience = PATIENCE_START + (PATIENCE_END - PATIENCE_START) * p;
  return {
    id: state.nextTicketId++,
    customer,
    items,
    side,
    sideDone: false,
    patience,
    maxPatience: patience,
  };
}

export function addTicket(state) {
  if (state.tickets.length >= MAX_TICKETS) return false;
  state.tickets.push(makeTicket(state));
  return true;
}

export function firstEmptySlot(state) {
  return state.grill.findIndex((s) => s === null);
}

export function placeRawSkewer(state, type) {
  const i = firstEmptySlot(state);
  if (i < 0) {
    flashMessage(state, 'Grill penuh! / Grill is full');
    return false;
  }
  state.grill[i] = { type, doneness: 0, flipped: false, burnt: false };
  return true;
}

export function skewerStatus(slot) {
  if (!slot) return 'empty';
  if (slot.burnt || slot.doneness >= BURNT_AT) return 'burnt';
  if (slot.doneness >= PERFECT_LOW && slot.doneness <= PERFECT_HIGH) return 'perfect';
  if (slot.doneness > PERFECT_HIGH) return 'over';
  return 'raw';
}

// Click a grill slot: a perfect skewer comes off into your hand, a burnt
// one is tossed, anything else gets flipped.
export function actOnSlot(state, i) {
  const slot = state.grill[i];
  if (!slot) return 'empty';
  const status = skewerStatus(slot);
  if (status === 'burnt') {
    state.grill[i] = null;
    state.burntTossed++;
    state.combo = 0;
    state.score = Math.max(0, state.score - BURNT_PENALTY);
    flashMessage(state, 'Gosong! Dibuang (-' + BURNT_PENALTY + ')');
    return 'tossed';
  }
  if (status === 'perfect') {
    if (state.hand) {
      flashMessage(state, 'Tangan penuh! / Hand is full');
      return 'handfull';
    }
    state.grill[i] = null;
    state.hand = { kind: 'skewer', type: slot.type, sauce: null, perfect: slot.flipped };
    state.stats.skewersGrilled++;
    return 'taken';
  }
  slot.flipped = !slot.flipped;
  state.stats.flips++;
  return 'flipped';
}

export function stokeCoals(state) {
  state.heat = Math.min(100, state.heat + HEAT_STOKE);
  state.flare = state.heat >= HEAT_FLARE_LINE;
  return state.heat;
}

export function applySauce(state, sauce) {
  if (!state.hand || state.hand.kind !== 'skewer') {
    flashMessage(state, 'Pegang sate dulu! / Hold a skewer first');
    return false;
  }
  if (state.hand.sauce) {
    flashMessage(state, 'Sudah disaus / Already sauced');
    return false;
  }
  state.hand.sauce = sauce;
  state.stats.sauces++;
  return true;
}

export function takeSide(state, side) {
  if (state.hand) {
    flashMessage(state, 'Tangan penuh! / Hand is full');
    return false;
  }
  state.hand = { kind: 'side', side };
  state.stats.sides++;
  return true;
}

// Place what is in hand onto a ticket. Returns 'served' | 'placed' | 'wrong' | 'nope'.
export function serveToTicket(state, ticket) {
  if (!state.hand) return 'nope';
  if (state.hand.kind === 'skewer') {
    const want = ticket.items.find((it) => !it.done && it.type === state.hand.type);
    if (!want) {
      state.score = Math.max(0, state.score - WRONG_PENALTY);
      state.combo = 0;
      flashMessage(state, 'Bukan pesanan! / Wrong order (-' + WRONG_PENALTY + ')');
      return 'wrong';
    }
    if (want.sauce !== state.hand.sauce) {
      state.score = Math.max(0, state.score - WRONG_PENALTY);
      state.combo = 0;
      flashMessage(state, 'Saus salah! / Wrong sauce (-' + WRONG_PENALTY + ')');
      return 'wrong';
    }
    want.done = true;
    const perfect = state.hand.perfect;
    state.hand = null;
    if (perfect) state.perfectServed++;
    state.tray.push({ type: want.type, sauce: want.sauce, perfect });
    return maybeCompleteTicket(state, ticket, perfect);
  }
  // side in hand
  if (ticket.side === state.hand.side && !ticket.sideDone) {
    ticket.sideDone = true;
    state.hand = null;
    return maybeCompleteTicket(state, ticket, true);
  }
  state.score = Math.max(0, state.score - WRONG_PENALTY);
  state.combo = 0;
  flashMessage(state, 'Bukan pesanan! / Wrong side (-' + WRONG_PENALTY + ')');
  return 'wrong';
}

function maybeCompleteTicket(state, ticket, perfect) {
  const allItems = ticket.items.every((it) => it.done);
  const sideOk = !ticket.side || ticket.sideDone;
  if (!allItems || !sideOk) return 'placed';
  // Ticket complete: score it.
  const tip = Math.round((ticket.patience / ticket.maxPatience) * TIP_MAX);
  const base = ticket.items.reduce((s, it) => s + SKEWER_TYPES[it.type].price, 0)
    + (ticket.side ? 40 : 0);
  state.combo = Math.min(MAX_COMBO, state.combo + 1);
  state.bestCombo = Math.max(state.bestCombo, state.combo);
  const gained = (base + (perfect ? SCORE_PERFECT_SKEWER : 0) + tip) * state.combo;
  state.score += gained;
  state.coins += base + tip;
  state.served++;
  state.tickets = state.tickets.filter((t) => t.id !== ticket.id);
  state.sparkles.push({ x: 0, y: 0, t: 0 }); // marker, render draws at pass
  flashMessage(state, 'Terima kasih! +' + gained + ' (combo x' + state.combo + ')');
  return 'served';
}

export function flashMessage(state, text) {
  state.message = text;
  state.messageUntil = state.time + 2.2;
}

export function updateGame(state, dt) {
  if (state.screen !== 'playing') return;
  state.time += dt;
  state.remaining = Math.max(0, SHIFT_SECONDS - state.time);

  // Rush hour: starts with 90s left, lasts 30s.
  if (!state.rush && state.remaining <= RUSH_START_REMAINING && state.remaining > RUSH_START_REMAINING - RUSH_DURATION) {
    state.rush = true;
    flashMessage(state, 'JAM RAMAI! / RUSH HOUR — pelanggan berdatangan!');
  }
  if (state.rush && state.remaining <= RUSH_START_REMAINING - RUSH_DURATION) {
    state.rush = false;
  }

  // Heat decays; flare cools back down faster.
  state.heat = Math.max(0, state.heat - HEAT_DECAY_PER_SEC * dt * (state.flare ? 2.2 : 1));
  state.flare = state.heat >= HEAT_FLARE_LINE;

  // Grill: doneness rises with heat. Flare burns much faster.
  const rate = (state.heat / 100) * HEAT_COOK_RATE * (state.flare ? HEAT_FLARE_MULT : 1);
  for (const slot of state.grill) {
    if (!slot) continue;
    slot.doneness = Math.min(110, slot.doneness + rate * SKEWER_TYPES[slot.type].cookMul * dt);
    if (slot.doneness >= BURNT_AT) slot.burnt = true;
  }

  // Spawn customers.
  state.spawnIn -= dt;
  if (state.spawnIn <= 0) {
    if (addTicket(state)) {
      state.spawnIn = spawnInterval(state) * range(state.rng, 0.8, 1.25);
    } else {
      state.spawnIn = 3; // queue full: try again soon
    }
  }

  // Patience drains; an expired ticket walks away angry.
  for (const ticket of [...state.tickets]) {
    ticket.patience -= dt;
    if (ticket.patience <= 0) {
      state.tickets = state.tickets.filter((t) => t.id !== ticket.id);
      state.expired++;
      state.combo = 0;
      state.score = Math.max(0, state.score - EXPIRED_PENALTY);
      flashMessage(state, ticket.customer.name + ' pergi! / Walked away (-' + EXPIRED_PENALTY + ')');
    }
  }

  // Smoke wisps drift up from the grill.
  if (state.rng() < dt * 6) {
    state.smokePuffs.push({
      x: 380 + state.rng() * 520,
      y: 330,
      r: 8 + state.rng() * 10,
      vy: 22 + state.rng() * 18,
      life: 1,
    });
  }
  for (const p of state.smokePuffs) {
    p.y -= p.vy * dt;
    p.life -= dt * 0.35;
  }
  state.smokePuffs = state.smokePuffs.filter((p) => p.life > 0 && p.y > 120);
  for (const s of state.sparkles) s.t += dt;
  state.sparkles = state.sparkles.filter((s) => s.t < 1.2);

  if (state.remaining <= 0) {
    state.screen = 'end';
  }
}

export function startShift(state) {
  const fresh = createGameState(state.seed);
  Object.assign(state, fresh, { screen: 'playing', muted: state.muted });
}
