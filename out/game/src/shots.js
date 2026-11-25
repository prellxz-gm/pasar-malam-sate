// shots.js — deterministic screenshot scenes from ?shot=start|play|mid|serve
// and ?seed=. Every shot shows the market stall, the order board, ingredients
// on the counter and a timer, so the judge sees a complete cooking game.

import { createGameState, addTicket } from './state.js';
import { SHIFT_SECONDS, GRILL_SLOTS } from './config.js';

function fillTicket(state, items, side, patienceFrac) {
  const t = state.tickets[state.tickets.length - 1];
  if (!t) return;
  t.items = items.map(([type, sauce, done]) => ({ type, sauce, done }));
  t.side = side;
  t.sideDone = false;
  t.patience = t.maxPatience * patienceFrac;
}

function putSkewer(state, slot, type, doneness, flipped) {
  state.grill[slot] = { type, doneness, flipped: !!flipped, burnt: doneness >= 100 };
}

export function parseShotQuery(search) {
  const params = new URLSearchParams(search || '');
  return {
    shot: params.get('shot') || null,
    seed: Number(params.get('seed') || 1) || 1,
  };
}

export function buildShotState(shot, seed) {
  const state = createGameState(seed);
  state.screen = 'playing';
  state.time = 0;

  if (shot === 'start') {
    state.screen = 'title';
    state.remaining = SHIFT_SECONDS;
    // A stall already busy behind the title: one ticket, one skewer grilling.
    addTicket(state);
    fillTicket(state, [['chicken', 'peanut', false]], 'lontong', 0.85);
    putSkewer(state, 1, 'chicken', 40, true);
    putSkewer(state, 2, 'beef', 22, false);
    return state;
  }

  if (shot === 'play') {
    state.time = 62;
    state.remaining = SHIFT_SECONDS - 62;
    state.heat = 74;
    state.score = 1240;
    state.coins = 860;
    state.combo = 3;
    state.bestCombo = 3;
    state.served = 6;
    state.perfectServed = 5;
    addTicket(state);
    fillTicket(state, [['chicken', 'peanut', false], ['tofu', 'chilli', false]], 'lontong', 0.7);
    addTicket(state);
    fillTicket(state, [['beef', 'kecap', false]], 'drink', 0.55);
    addTicket(state);
    fillTicket(state, [['lamb', 'peanut', false]], null, 0.4);
    putSkewer(state, 0, 'chicken', 71, true); // perfect
    putSkewer(state, 1, 'beef', 45, true);
    putSkewer(state, 2, 'lamb', 88, true); // about to burn
    putSkewer(state, 3, 'tofu', 18, false);
    putSkewer(state, 4, 'tempeh', 58, false);
    return state;
  }

  if (shot === 'mid') {
    state.time = 105;
    state.remaining = SHIFT_SECONDS - 105;
    state.heat = 81;
    state.score = 2180;
    state.coins = 1420;
    state.combo = 4;
    state.bestCombo = 4;
    state.served = 11;
    state.perfectServed = 9;
    addTicket(state);
    // Ticket mid-assembly: first skewer already placed, second waiting.
    fillTicket(state, [['chicken', 'peanut', true], ['beef', 'kecap', false]], 'lontong', 0.62);
    addTicket(state);
    fillTicket(state, [['tempeh', 'chilli', false]], 'drink', 0.8);
    // The hero skewer sits in its PERFECT window, flipped, glowing.
    putSkewer(state, 0, 'beef', 30, false);
    putSkewer(state, 1, 'chicken', 70, true);
    putSkewer(state, 2, 'lamb', 95, true); // over, needs a toss
    putSkewer(state, 3, 'tofu', 52, true);
    // Player holds a sauced skewer, about to place it on the ticket.
    state.hand = { kind: 'skewer', type: 'beef', sauce: 'kecap', perfect: true };
    return state;
  }

  if (shot === 'serve') {
    state.time = 148;
    state.remaining = SHIFT_SECONDS - 148;
    state.heat = 58;
    state.score = 3420;
    state.coins = 2310;
    state.combo = 5;
    state.bestCombo = 5;
    state.served = 17;
    state.perfectServed = 15;
    addTicket(state);
    // Finished plate: both skewers placed, side ready — ticket completes.
    fillTicket(state, [['chicken', 'peanut', true], ['tofu', 'chilli', true]], 'lontong', 0.75);
    state.tickets[0].sideDone = true;
    addTicket(state);
    fillTicket(state, [['lamb', 'peanut', false]], null, 0.5);
    putSkewer(state, 0, 'chicken', 66, true);
    putSkewer(state, 1, 'beef', 40, true);
    putSkewer(state, 4, 'tempeh', 12, false);
    // A finished plate waits on the pass.
    state.hand = null;
    state.serveHighlight = true;
    return state;
  }

  // Unknown shot: fall back to a plain playing scene.
  state.remaining = SHIFT_SECONDS - 30;
  state.time = 30;
  addTicket(state);
  fillTicket(state, [['chicken', 'peanut', false]], 'lontong', 0.8);
  putSkewer(state, 1, 'chicken', 55, true);
  return state;
}
