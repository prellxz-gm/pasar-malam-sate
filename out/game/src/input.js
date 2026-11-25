// input.js — keyboard + mouse input for the satay stall.
// The renderer registers clickable hotspots (rect + action) every frame;
// this module turns pointer/key events into game actions.

import { placeRawSkewer, actOnSlot, stokeCoals, applySauce, takeSide, serveToTicket, startShift } from './state.js';
import { SKEWER_ORDER, SAUCE_ORDER } from './config.js';

export function createInput(state, canvas, audio) {
  const input = {
    hotspots: [], // [{x,y,w,h,action,label}] rebuilt by the renderer each frame
    mouse: { x: 0, y: 0 },
    registerHotspots(list) { input.hotspots = list; },
  };

  function canvasPos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  function doAction(action) {
    if (!action) return;
    audio.unlock();
    switch (action.kind) {
      case 'start': startShift(state); audio.serveChime(); break;
      case 'restart': startShift(state); break;
      case 'raw': placeRawSkewer(state, action.type); audio.pop(); break;
      case 'slot': {
        const r = actOnSlot(state, action.slot);
        if (r === 'taken') audio.pop();
        if (r === 'flipped') audio.flipPop();
        if (r === 'tossed') audio.thud();
        break;
      }
      case 'fan': stokeCoals(state); audio.stokeWhoosh(); break;
      case 'sauce': if (applySauce(state, action.sauce)) audio.dip(); break;
      case 'side': if (takeSide(state, action.side)) audio.pop(); break;
      case 'ticket': {
        const ticket = state.tickets.find((t) => t.id === action.ticket);
        if (ticket) {
          const r = serveToTicket(state, ticket);
          if (r === 'served') audio.serveChime();
          else if (r === 'wrong') audio.thud();
          else if (r === 'placed') audio.pop();
        }
        break;
      }
      case 'mute': state.muted = !state.muted; audio.setMuted(state.muted); break;
      case 'pause': togglePause(state); break;
      default: break;
    }
  }

  function togglePause(state) {
    if (state.screen === 'playing') state.screen = 'paused';
    else if (state.screen === 'paused') state.screen = 'playing';
  }

  canvas.addEventListener('pointermove', (e) => {
    input.mouse = canvasPos(e);
  });

  canvas.addEventListener('pointerdown', (e) => {
    const p = canvasPos(e);
    input.mouse = p;
    // Topmost hotspot wins: search from the end (last registered = on top).
    for (let i = input.hotspots.length - 1; i >= 0; i--) {
      const h = input.hotspots[i];
      if (p.x >= h.x && p.x <= h.x + h.w && p.y >= h.y && p.y <= h.y + h.h) {
        doAction(h.action);
        return;
      }
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    const k = e.key.toLowerCase();
    if (k === 'm') { state.muted = !state.muted; audio.setMuted(state.muted); return; }
    if (state.screen === 'title') {
      if (k === 'enter' || k === ' ') { doAction({ kind: 'start' }); e.preventDefault(); }
      return;
    }
    if (state.screen === 'end') {
      if (k === 'r' || k === 'enter' || k === ' ') { doAction({ kind: 'restart' }); e.preventDefault(); }
      return;
    }
    if (k === 'p' || k === 'escape') { togglePause(state); return; }
    if (state.screen !== 'playing') return;
    if (k >= '1' && k <= '6') { doAction({ kind: 'slot', slot: Number(k) - 1 }); return; }
    if (k === 'f') { doAction({ kind: 'fan' }); return; }
    if (k === ' ') { // Space: take the first perfect skewer, else flip the first raw one
      const idx = state.grill.findIndex((s) => s && s.doneness >= 62 && s.doneness <= 84);
      if (idx >= 0) doAction({ kind: 'slot', slot: idx });
      else {
        const raw = state.grill.findIndex((s) => s && s.doneness < 62);
        if (raw >= 0) doAction({ kind: 'slot', slot: raw });
      }
      e.preventDefault();
      return;
    }
    // Sauce keys: A peanut, S kecap, D chilli. L lontong, T iced tea.
    if (k === 'a') doAction({ kind: 'sauce', sauce: 'peanut' });
    if (k === 's') doAction({ kind: 'sauce', sauce: 'kecap' });
    if (k === 'd') doAction({ kind: 'sauce', sauce: 'chilli' });
    if (k === 'l') doAction({ kind: 'side', side: 'lontong' });
    if (k === 't') doAction({ kind: 'side', side: 'drink' });
    // Raw skewer keys: Z X C V B = chicken beef lamb tofu tempeh
    const rawKeys = { z: 'chicken', x: 'beef', c: 'lamb', v: 'tofu', b: 'tempeh' };
    if (rawKeys[k]) doAction({ kind: 'raw', type: rawKeys[k] });
  });

  return input;
}

// Hit-test helper the renderer uses to know the mouse is over a hotspot.
export function hotspotAt(input, x, y) {
  for (let i = input.hotspots.length - 1; i >= 0; i--) {
    const h = input.hotspots[i];
    if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) return h;
  }
  return null;
}
