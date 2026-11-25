// main.js — boot, game loop and the state machine (title / playing /
// paused / end) for Pasar Malam: Sate. In screenshot mode (?shot=...) it
// renders one fixed scene and stops the clock.

import { VIEW_W, VIEW_H } from './config.js';
import { createGameState, updateGame } from './state.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { drawGame } from './render.js';
import { parseShotQuery, buildShotState } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

const { shot, seed } = parseShotQuery(window.location.search);
const shotMode = shot !== null;

let state;
if (shotMode) {
  state = buildShotState(shot, seed);
} else {
  state = createGameState((Date.now() % 100000) | 0);
}

const audio = createAudio();
const input = createInput(state, canvas, audio);

function resizeCanvas() {
  const scale = Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H);
  canvas.width = VIEW_W;
  canvas.height = VIEW_H;
  canvas.style.width = Math.floor(VIEW_W * scale) + 'px';
  canvas.style.height = Math.floor(VIEW_H * scale) + 'px';
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function updateStatus() {
  if (!statusEl) return;
  statusEl.textContent =
    'Pasar Malam: Sate — screen=' + state.screen +
    ' score=' + state.score +
    ' served=' + state.served +
    ' remaining=' + Math.ceil(state.remaining) + 's' +
    ' heat=' + Math.round(state.heat) +
    ' tickets=' + state.tickets.length +
    (shotMode ? ' shot=' + shot + ' seed=' + seed : '');
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (!shotMode) {
    updateGame(state, dt);
    const grilling = state.grill.some((s) => s !== null);
    audio.setSizzle(state.heat, grilling && state.screen === 'playing');
  }
  drawGame(ctx, state, input, now);
  updateStatus();
  if (!shotMode) requestAnimationFrame(frame);
}

// In shot mode render once (plus one extra frame so smoke/lights settle).
if (shotMode) {
  drawGame(ctx, state, input, performance.now());
  updateStatus();
  requestAnimationFrame(() => {
    drawGame(ctx, state, input, performance.now() + 400);
    updateStatus();
    document.title = 'Pasar Malam: Sate — shot ' + shot;
  });
} else {
  requestAnimationFrame(frame);
}
