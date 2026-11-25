// render.js — all canvas drawing: the night-market stall, the grill with
// coals and smoke, skewers with doneness meters, tickets, customers, HUD,
// title and end screens. It also registers the clickable hotspots.

import {
  VIEW_W, VIEW_H, COLORS, SKEWER_TYPES, SKEWER_ORDER, SAUCES, SAUCE_ORDER,
  GRILL, SLOT_W, SLOT_GAP, GRILL_SLOTS, PERFECT_LOW, PERFECT_HIGH,
  SHIFT_SECONDS, MAX_COMBO,
} from './config.js';
import { skewerStatus } from './state.js';

// ---- layout ----
const BOARD = { x: 24, y: 84, w: 196, h: 116, gap: 12 };
const TRAY = { x: 330, y: 492, w: 620, h: 66 };
const SAUCE_POTS = { x: 24, y: 306, w: 88, h: 78, gap: 10 };
const LONTONG = { x: 24, y: 420, w: 140, h: 96 };
const HAND_BOX = { x: 176, y: 420, w: 138, h: 96 };
const COOLER = { x: 980, y: 306, w: 276, h: 96 };
const PASS = { x: 980, y: 420, w: 276, h: 96 };
const FAN = { x: 958, y: 312, w: 56, h: 56 };
const HUD = { y: 592 };

function slotRect(i) {
  const total = GRILL_SLOTS * SLOT_W + (GRILL_SLOTS - 1) * SLOT_GAP;
  const x0 = GRILL.x + (GRILL.w - total) / 2;
  return { x: x0 + i * (SLOT_W + SLOT_GAP), y: GRILL.y + 14, w: SLOT_W, h: 96 };
}

function rawRect(i) {
  const w = 112;
  const gap = 10;
  const x0 = TRAY.x + 14;
  return { x: x0 + i * (w + gap), y: TRAY.y + 18, w, h: 34 };
}

function lerpColor(c1, c2, t) {
  const a = parseInt(c1.slice(1), 16);
  const b = parseInt(c2.slice(1), 16);
  const r = Math.round(((a >> 16) & 255) + (((b >> 16) & 255) - ((a >> 16) & 255)) * t);
  const g = Math.round(((a >> 8) & 255) + (((b >> 8) & 255) - ((a >> 8) & 255)) * t);
  const bl = Math.round((a & 255) + ((b & 255) - (a & 255)) * t);
  return `rgb(${r},${g},${bl})`;
}

function skewerColor(type, doneness) {
  const t = SKEWER_TYPES[type];
  if (doneness >= 100) return t.dark;
  if (doneness <= PERFECT_LOW) return lerpColor(t.raw, t.cooked, doneness / PERFECT_LOW);
  if (doneness <= PERFECT_HIGH) return t.cooked;
  return lerpColor(t.cooked, t.dark, (doneness - PERFECT_HIGH) / (100 - PERFECT_HIGH));
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawGame(ctx, state, input, nowMs) {
  const hotspots = [];
  const t = nowMs / 1000;
  drawSky(ctx, t);
  drawStall(ctx, t);
  drawOrderBoard(ctx, state, hotspots);
  drawGrill(ctx, state, hotspots, t);
  drawPrepTray(ctx, state, hotspots);
  drawSauceStation(ctx, state, hotspots);
  drawLontongBasket(ctx, state, hotspots);
  drawHandBox(ctx, state);
  drawCooler(ctx, state, hotspots);
  drawPass(ctx, state, hotspots);
  drawFan(ctx, state, hotspots);
  drawHud(ctx, state);
  drawSmoke(ctx, state);
  drawMessage(ctx, state);
  if (state.screen === 'title') drawTitle(ctx, state, hotspots);
  if (state.screen === 'paused') drawPaused(ctx, hotspots);
  if (state.screen === 'end') drawEnd(ctx, state, hotspots);
  drawMuteButton(ctx, state, hotspots);
  input.registerHotspots(hotspots);
}

// ---- background: dusk sky, stars, string lights, awning ----
function drawSky(ctx, t) {
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, COLORS.skyTop);
  g.addColorStop(0.55, COLORS.skyBottom);
  g.addColorStop(1, '#241a33');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // Stars.
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  for (let i = 0; i < 40; i++) {
    const x = (i * 317) % VIEW_W;
    const y = (i * 149) % 150;
    const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.7 + i));
    ctx.globalAlpha = tw * 0.8;
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.globalAlpha = 1;
  // Distant rooftops + moon.
  ctx.fillStyle = '#241a3d';
  ctx.fillRect(0, 210, VIEW_W, 30);
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath();
  ctx.arc(1180, 60, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f2d488';
  ctx.beginPath();
  ctx.arc(1172, 54, 6, 0, Math.PI * 2);
  ctx.arc(1188, 66, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawStall(ctx, t) {
  // Awning stripes.
  const awningH = 56;
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? COLORS.awningRed : COLORS.awningCream;
    ctx.fillRect(i * 80, 0, 80, awningH);
  }
  ctx.fillStyle = COLORS.stallWoodDark;
  ctx.fillRect(0, awningH, VIEW_W, 8);
  // String lights: two sagging wires with glowing bulbs.
  for (const wireY of [86, 118]) {
    ctx.strokeStyle = '#3a2a1a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, wireY - 14);
    for (let x = 0; x <= VIEW_W; x += 160) ctx.quadraticCurveTo(x + 80, wireY + 16, x + 160, wireY - 14);
    ctx.stroke();
    for (let i = 0; i < 16; i++) {
      const x = 40 + i * 80;
      const sag = 14 * Math.sin((x / VIEW_W) * Math.PI * 8);
      const y = wireY - 6 + sag;
      const glow = 0.75 + 0.25 * Math.sin(t * 2 + i * 1.3);
      ctx.fillStyle = `rgba(255,202,106,${0.25 * glow})`;
      ctx.beginPath();
      ctx.arc(x, y, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd98a';
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Counter band behind everything.
  ctx.fillStyle = COLORS.counter;
  ctx.fillRect(0, 560, VIEW_W, 32);
  ctx.fillStyle = COLORS.counterTop;
  ctx.fillRect(0, 560, VIEW_W, 8);
}

// ---- order board + customers ----
function drawOrderBoard(ctx, state, hotspots) {
  ctx.fillStyle = 'rgba(20,12,30,0.55)';
  roundRect(ctx, 12, 74, 880, 136, 12);
  ctx.fill();
  ctx.fillStyle = COLORS.hudText;
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('PESANAN / ORDERS', 28, 94);
  if (state.rush) {
    ctx.fillStyle = '#ff5a3c';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('★ JAM RAMAI / RUSH HOUR ★', 640, 94);
  }
  if (state.tickets.length === 0) {
    ctx.fillStyle = 'rgba(255,233,184,0.6)';
    ctx.font = '15px sans-serif';
    ctx.fillText('Menunggu pelanggan… / Waiting for customers…', 28, 150);
  }
  state.tickets.forEach((ticket, idx) => {
    const x = BOARD.x + idx * (BOARD.w + BOARD.gap);
    const y = BOARD.y + 18;
    drawTicket(ctx, state, ticket, x, y, hotspots);
  });
  // Stall sign, top right.
  ctx.fillStyle = '#2a1c10';
  roundRect(ctx, 912, 78, 344, 60, 10);
  ctx.fill();
  ctx.strokeStyle = COLORS.lightGlow;
  ctx.lineWidth = 2;
  roundRect(ctx, 912, 78, 344, 60, 10);
  ctx.stroke();
  ctx.fillStyle = COLORS.lightGlow;
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PASAR MALAM: SATE', 1084, 104);
  ctx.font = '13px sans-serif';
  ctx.fillStyle = '#f3e2c2';
  ctx.fillText('sate ayam · sapi · kambing · tahu · tempe', 1084, 126);
  ctx.textAlign = 'left';
}

function drawCustomerBust(ctx, customer, x, y, r) {
  // Shoulders.
  ctx.fillStyle = customer.shirt;
  ctx.beginPath();
  ctx.arc(x, y + r + 8, r + 4, Math.PI, 0);
  ctx.fill();
  // Head.
  ctx.fillStyle = customer.skin;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  // Hair by style.
  ctx.fillStyle = customer.hair;
  if (customer.style === 'bun') {
    ctx.beginPath();
    ctx.arc(x, y - r - 2, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y - r * 0.4, r, Math.PI, 0);
    ctx.fill();
  } else if (customer.style === 'long') {
    ctx.beginPath();
    ctx.arc(x, y - r * 0.3, r + 2, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(x - r - 2, y - r * 0.3, 5, r + 12);
    ctx.fillRect(x + r - 3, y - r * 0.3, 5, r + 12);
  } else if (customer.style === 'cap') {
    ctx.beginPath();
    ctx.arc(x, y - r * 0.35, r, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(x - r, y - r * 0.5, r * 2, 5);
  } else { // spiky
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * 6 - 4, y - r * 0.4);
      ctx.lineTo(x + i * 6, y - r - 8);
      ctx.lineTo(x + i * 6 + 4, y - r * 0.4);
      ctx.fill();
    }
  }
  // Eyes.
  ctx.fillStyle = '#1c1410';
  ctx.beginPath();
  ctx.arc(x - 5, y + 1, 1.6, 0, Math.PI * 2);
  ctx.arc(x + 5, y + 1, 1.6, 0, Math.PI * 2);
  ctx.fill();
}

function drawTicket(ctx, state, ticket, x, y, hotspots) {
  const w = BOARD.w;
  const h = BOARD.h;
  const urgent = ticket.patience / ticket.maxPatience < 0.3;
  ctx.fillStyle = COLORS.ticketBg;
  roundRect(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = urgent ? '#c22e1a' : '#b89a5a';
  ctx.lineWidth = urgent ? 3 : 1.5;
  roundRect(ctx, x, y, w, h, 8);
  ctx.stroke();
  drawCustomerBust(ctx, ticket.customer, x + 24, y + 22, 13);
  ctx.fillStyle = COLORS.ticketInk;
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(ticket.customer.name, x + 44, y + 20);
  ctx.font = '12px sans-serif';
  ctx.fillStyle = '#6a5230';
  ctx.fillText('#' + ticket.id, x + 44, y + 36);
  // Items.
  let iy = y + 56;
  for (const item of ticket.items) {
    const type = SKEWER_TYPES[item.type];
    const sauce = SAUCES[item.sauce];
    ctx.fillStyle = item.done ? '#3fae5a' : COLORS.ticketInk;
    ctx.font = (item.done ? 'bold ' : '') + '13px sans-serif';
    const mark = item.done ? '✓ ' : '○ ';
    ctx.fillText(mark + type.name + ' + ' + sauce.name, x + 12, iy);
    iy += 17;
  }
  if (ticket.side) {
    ctx.fillStyle = ticket.sideDone ? '#3fae5a' : COLORS.ticketInk;
    ctx.font = (ticket.sideDone ? 'bold ' : '') + '13px sans-serif';
    ctx.fillText((ticket.sideDone ? '✓ ' : '○ ') + (ticket.side === 'lontong' ? 'Lontong' : 'Es Teh'), x + 12, iy);
  }
  // Patience bar.
  const frac = Math.max(0, ticket.patience / ticket.maxPatience);
  ctx.fillStyle = '#d8c49a';
  roundRect(ctx, x + 10, y + h - 14, w - 20, 8, 4);
  ctx.fill();
  ctx.fillStyle = frac > 0.5 ? '#3fae5a' : frac > 0.25 ? '#e8a13c' : '#c22e1a';
  roundRect(ctx, x + 10, y + h - 14, (w - 20) * frac, 8, 4);
  ctx.fill();
  if (state.screen === 'playing') {
    hotspots.push({ x, y, w, h, action: { kind: 'ticket', ticket: ticket.id }, label: 'ticket ' + ticket.id });
  }
}

// ---- grill ----
function drawGrill(ctx, state, hotspots, t) {
  // Grill body.
  ctx.fillStyle = COLORS.grillIron;
  roundRect(ctx, GRILL.x, GRILL.y, GRILL.w, GRILL.h, 12);
  ctx.fill();
  ctx.fillStyle = '#1c1816';
  roundRect(ctx, GRILL.x + 10, GRILL.y + 10, GRILL.w - 20, GRILL.h - 20, 8);
  ctx.fill();
  // Coals with ember glow that follows heat.
  const heatFrac = state.heat / 100;
  const glow = ctx.createRadialGradient(GRILL.x + GRILL.w / 2, GRILL.y + 128, 10, GRILL.x + GRILL.w / 2, GRILL.y + 128, 320);
  glow.addColorStop(0, `rgba(255,90,26,${0.25 + 0.5 * heatFrac})`);
  glow.addColorStop(1, 'rgba(255,90,26,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(GRILL.x, GRILL.y, GRILL.w, GRILL.h);
  for (let i = 0; i < 14; i++) {
    const cx = GRILL.x + 34 + i * 42;
    const cy = GRILL.y + 128 + ((i % 2) * 10 - 5);
    const pulse = 0.6 + 0.4 * Math.sin(t * 3 + i * 1.7);
    ctx.fillStyle = heatFrac > 0.25
      ? `rgba(255,${Math.round(90 + 90 * heatFrac * pulse)},26,${0.5 + 0.4 * heatFrac})`
      : '#4a3a32';
    ctx.beginPath();
    ctx.arc(cx, cy, 11 + 3 * heatFrac * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2e211a';
    ctx.beginPath();
    ctx.arc(cx - 3, cy - 3, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  if (state.flare) {
    ctx.fillStyle = `rgba(255,180,40,${0.25 + 0.2 * Math.sin(t * 9)})`;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🔥 API BESAR! / FLARE-UP — burns fast!', GRILL.x + GRILL.w / 2, GRILL.y - 8);
    ctx.textAlign = 'left';
  }
  // Grill bars.
  ctx.strokeStyle = '#57504a';
  ctx.lineWidth = 3;
  for (let i = 0; i < 7; i++) {
    const y = GRILL.y + 34 + i * 12;
    ctx.beginPath();
    ctx.moveTo(GRILL.x + 12, y);
    ctx.lineTo(GRILL.x + GRILL.w - 12, y);
    ctx.stroke();
  }
  // Slots.
  for (let i = 0; i < GRILL_SLOTS; i++) {
    const r = slotRect(i);
    const slot = state.grill[i];
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    roundRect(ctx, r.x, r.y, r.w, r.h, 8);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,233,184,0.65)';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(i + 1), r.x + r.w / 2, r.y + r.h + 14);
    ctx.textAlign = 'left';
    if (slot) drawSkewerOnGrill(ctx, slot, r, t);
    if (state.screen === 'playing') {
      hotspots.push({ x: r.x, y: r.y - 6, w: r.w, h: r.h + 20, action: { kind: 'slot', slot: i }, label: 'grill slot ' + (i + 1) });
    }
  }
  ctx.fillStyle = 'rgba(255,233,184,0.85)';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PANGGANGAN / CHARCOAL GRILL — klik sate untuk balik / ambil', GRILL.x + GRILL.w / 2, GRILL.y + GRILL.h - 6);
  ctx.textAlign = 'left';
}

function drawSkewerOnGrill(ctx, slot, r, t) {
  const status = skewerStatus(slot);
  const cx = r.x + r.w / 2;
  const cy = r.y + 34;
  // Perfect window glow.
  if (status === 'perfect') {
    const pulse = 0.5 + 0.3 * Math.sin(t * 6);
    ctx.fillStyle = `rgba(123,228,149,${pulse})`;
    roundRect(ctx, r.x + 2, r.y + 2, r.w - 4, r.h - 4, 8);
    ctx.fill();
    ctx.fillStyle = '#1e6b2e';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PERFECT!', cx, r.y + 16);
    ctx.textAlign = 'left';
  }
  if (status === 'over') {
    ctx.fillStyle = '#ff8a5a';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CEPAT! / HURRY', cx, r.y + 16);
    ctx.textAlign = 'left';
  }
  if (status === 'burnt') {
    ctx.fillStyle = '#ff5a3c';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GOSONG / BURNT', cx, r.y + 16);
    ctx.textAlign = 'left';
  }
  // Stick + cubes.
  const color = skewerColor(slot.type, slot.doneness);
  ctx.strokeStyle = '#d8b98a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(r.x + 8, cy);
  ctx.lineTo(r.x + r.w - 8, cy);
  ctx.stroke();
  for (let k = 0; k < 3; k++) {
    const kx = r.x + 24 + k * 22;
    ctx.fillStyle = color;
    roundRect(ctx, kx - 8, cy - 9, 16, 18, 4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 1;
    roundRect(ctx, kx - 8, cy - 9, 16, 18, 4);
    ctx.stroke();
  }
  // Doneness meter with the green perfect zone.
  const mx = r.x + 6;
  const my = r.y + 62;
  const mw = r.w - 12;
  ctx.fillStyle = '#241a12';
  roundRect(ctx, mx, my, mw, 12, 6);
  ctx.fill();
  ctx.fillStyle = 'rgba(63,174,90,0.55)';
  ctx.fillRect(mx + (mw * PERFECT_LOW) / 100, my, (mw * (PERFECT_HIGH - PERFECT_LOW)) / 100, 12);
  const frac = Math.min(1, slot.doneness / 100);
  ctx.fillStyle = status === 'burnt' ? '#2b1a12' : status === 'over' ? '#ff8a5a' : status === 'perfect' ? COLORS.perfectGlow : '#ffb347';
  roundRect(ctx, mx, my, mw * frac, 12, 6);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillRect(mx + mw * frac - 1, my - 2, 2, 16);
  // Flip hint.
  if (!slot.flipped && slot.doneness > 25 && status !== 'burnt') {
    ctx.fillStyle = '#ffe9b8';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('↻ BALIK / FLIP', cx, r.y + r.h - 4);
    ctx.textAlign = 'left';
  } else if (slot.flipped) {
    ctx.fillStyle = 'rgba(255,233,184,0.7)';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✓ dibalik / flipped', cx, r.y + r.h - 4);
    ctx.textAlign = 'left';
  }
}

// ---- prep tray: raw skewers ----
function drawPrepTray(ctx, state, hotspots) {
  ctx.fillStyle = '#3a2a1a';
  roundRect(ctx, TRAY.x, TRAY.y, TRAY.w, TRAY.h, 10);
  ctx.fill();
  ctx.fillStyle = COLORS.hudText;
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('BAHAN MENTAH / RAW SKEWERS — klik untuk panggang (Z X C V B)', TRAY.x + 14, TRAY.y + 14);
  SKEWER_ORDER.forEach((type, i) => {
    const r = rawRect(i);
    const t = SKEWER_TYPES[type];
    ctx.fillStyle = t.raw;
    roundRect(ctx, r.x, r.y, r.w, r.h, 6);
    ctx.fill();
    ctx.strokeStyle = '#2e2118';
    ctx.lineWidth = 1;
    roundRect(ctx, r.x, r.y, r.w, r.h, 6);
    ctx.stroke();
    // Mini cubes on a stick.
    ctx.strokeStyle = '#8a6a3a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(r.x + 6, r.y + 17);
    ctx.lineTo(r.x + r.w - 6, r.y + 17);
    ctx.stroke();
    for (let k = 0; k < 3; k++) {
      ctx.fillStyle = t.cooked;
      roundRect(ctx, r.x + 18 + k * 26, r.y + 9, 16, 16, 3);
      ctx.fill();
    }
    ctx.fillStyle = '#ffe9b8';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(t.name, r.x + r.w / 2, r.y + r.h + 12);
    ctx.textAlign = 'left';
    if (state.screen === 'playing') {
      hotspots.push({ x: r.x, y: r.y, w: r.w, h: r.h, action: { kind: 'raw', type }, label: 'raw ' + type });
    }
  });
}

// ---- left: sauce pots + lontong + hand ----
function drawSauceStation(ctx, state, hotspots) {
  ctx.fillStyle = 'rgba(20,12,30,0.5)';
  roundRect(ctx, 12, 292, 306, 116, 10);
  ctx.fill();
  ctx.fillStyle = COLORS.hudText;
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('SAUS / SAUCE — celup sate di tangan (A S D)', 24, 310);
  SAUCE_ORDER.forEach((key, i) => {
    const s = SAUCES[key];
    const x = SAUCE_POTS.x + i * (SAUCE_POTS.w + SAUCE_POTS.gap);
    const y = SAUCE_POTS.y + 14;
    const w = SAUCE_POTS.w;
    const h = SAUCE_POTS.h - 14;
    ctx.fillStyle = '#3a2a1a';
    roundRect(ctx, x, y, w, h, 8);
    ctx.fill();
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + 16, w / 2 - 8, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = s.dark;
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + 16, w / 2 - 16, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    // Ladle.
    ctx.strokeStyle = '#c8c8c8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + w - 14, y + 10);
    ctx.lineTo(x + w - 4, y - 6);
    ctx.stroke();
    ctx.fillStyle = '#ffe9b8';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(s.name, x + w / 2, y + h - 8);
    ctx.textAlign = 'left';
    if (state.screen === 'playing') {
      hotspots.push({ x, y: y - 8, w, h: h + 8, action: { kind: 'sauce', sauce: key }, label: 'sauce ' + key });
    }
  });
}

function drawLontongBasket(ctx, state, hotspots) {
  ctx.fillStyle = 'rgba(20,12,30,0.5)';
  roundRect(ctx, 12, 414, 152, 108, 10);
  ctx.fill();
  ctx.fillStyle = COLORS.hudText;
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('LONTONG (L)', 24, 432);
  // Basket with white rice cakes.
  ctx.fillStyle = '#7a5a2a';
  roundRect(ctx, 24, 452, 128, 52, 8);
  ctx.fill();
  ctx.fillStyle = '#8a6a35';
  ctx.fillRect(24, 452, 128, 10);
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = '#f7f2e2';
    roundRect(ctx, 32 + i * 30, 438, 24, 22, 4);
    ctx.fill();
    ctx.strokeStyle = '#2e7a3c';
    ctx.lineWidth = 2;
    ctx.strokeRect(32 + i * 30, 438, 24, 22);
  }
  if (state.screen === 'playing') {
    hotspots.push({ x: 24, y: 438, w: 128, h: 66, action: { kind: 'side', side: 'lontong' }, label: 'lontong' });
  }
}

function drawHandBox(ctx, state) {
  ctx.fillStyle = 'rgba(20,12,30,0.5)';
  roundRect(ctx, HAND_BOX.x - 12, HAND_BOX.y - 6, HAND_BOX.w + 24, HAND_BOX.h + 12, 10);
  ctx.fill();
  ctx.fillStyle = COLORS.hudText;
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('DI TANGAN / IN HAND', HAND_BOX.x, HAND_BOX.y + 12);
  const hand = state.hand;
  if (!hand) {
    ctx.fillStyle = 'rgba(255,233,184,0.5)';
    ctx.font = '12px sans-serif';
    ctx.fillText('— kosong / empty —', HAND_BOX.x, HAND_BOX.y + 48);
    return;
  }
  if (hand.kind === 'skewer') {
    const t = SKEWER_TYPES[hand.type];
    ctx.fillStyle = t.cooked;
    for (let k = 0; k < 3; k++) {
      roundRect(ctx, HAND_BOX.x + 8 + k * 26, HAND_BOX.y + 34, 18, 18, 4);
      ctx.fill();
    }
    ctx.strokeStyle = '#d8b98a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(HAND_BOX.x + 2, HAND_BOX.y + 43);
    ctx.lineTo(HAND_BOX.x + 92, HAND_BOX.y + 43);
    ctx.stroke();
    ctx.fillStyle = '#ffe9b8';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(t.name + (hand.sauce ? ' + ' + SAUCES[hand.sauce].name : ' (tanpa saus)'), HAND_BOX.x, HAND_BOX.y + 76);
    if (hand.perfect) {
      ctx.fillStyle = COLORS.perfectGlow;
      ctx.fillText('★ PERFECT', HAND_BOX.x + 76, HAND_BOX.y + 76);
    }
  } else {
    ctx.fillStyle = '#ffe9b8';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(hand.side === 'lontong' ? '▣ Lontong' : '🥤 Es Teh', HAND_BOX.x, HAND_BOX.y + 48);
  }
}

// ---- right: drinks cooler + serving pass ----
function drawCooler(ctx, state, hotspots) {
  ctx.fillStyle = 'rgba(20,12,30,0.5)';
  roundRect(ctx, COOLER.x - 8, COOLER.y - 14, COOLER.w + 16, COOLER.h + 22, 10);
  ctx.fill();
  ctx.fillStyle = COLORS.hudText;
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('MINUMAN / DRINKS — Es Teh (T)', COOLER.x, COOLER.y + 2);
  // Cooler box with bottles.
  ctx.fillStyle = '#2a6a8a';
  roundRect(ctx, COOLER.x, COOLER.y + 12, COOLER.w, 66, 8);
  ctx.fill();
  ctx.fillStyle = '#7ac8e8';
  roundRect(ctx, COOLER.x + 8, COOLER.y + 18, COOLER.w - 16, 26, 6);
  ctx.fill();
  for (let i = 0; i < 3; i++) {
    const bx = COOLER.x + 30 + i * 84;
    ctx.fillStyle = '#c96a1e';
    roundRect(ctx, bx, COOLER.y + 26, 34, 44, 6);
    ctx.fill();
    ctx.fillStyle = '#f3e2c2';
    ctx.fillRect(bx + 4, COOLER.y + 38, 26, 14);
    ctx.fillStyle = '#7a3c12';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TEH', bx + 17, COOLER.y + 48);
    ctx.textAlign = 'left';
  }
  if (state.screen === 'playing') {
    hotspots.push({ x: COOLER.x, y: COOLER.y + 12, w: COOLER.w, h: 66, action: { kind: 'side', side: 'drink' }, label: 'drink' });
  }
}

function drawPass(ctx, state, hotspots) {
  const glow = state.serveHighlight;
  ctx.fillStyle = glow ? 'rgba(63,174,90,0.35)' : 'rgba(20,12,30,0.5)';
  roundRect(ctx, PASS.x - 8, PASS.y - 6, PASS.w + 16, PASS.h + 12, 10);
  ctx.fill();
  if (glow) {
    ctx.strokeStyle = COLORS.perfectGlow;
    ctx.lineWidth = 3;
    roundRect(ctx, PASS.x - 8, PASS.y - 6, PASS.w + 16, PASS.h + 12, 10);
    ctx.stroke();
  }
  ctx.fillStyle = COLORS.hudText;
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('MEJA SAJI / SERVING PASS', PASS.x, PASS.y + 12);
  // A plate on the pass.
  ctx.fillStyle = '#f7f2e2';
  ctx.beginPath();
  ctx.ellipse(PASS.x + PASS.w / 2, PASS.y + 56, 92, 26, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#b89a5a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(PASS.x + PASS.w / 2, PASS.y + 56, 92, 26, 0, 0, Math.PI * 2);
  ctx.stroke();
  // Finished plate contents when a ticket is fully assembled (serve shot).
  const done = state.tickets.find((t) => t.items.every((i) => i.done) && (!t.side || t.sideDone));
  if (done || glow) {
    for (let k = 0; k < 3; k++) {
      ctx.fillStyle = SKEWER_TYPES[done ? done.items[0].type : 'chicken'].cooked;
      roundRect(ctx, PASS.x + 66 + k * 44, PASS.y + 44, 30, 12, 4);
      ctx.fill();
    }
    ctx.fillStyle = SAUCES[done ? done.items[0].sauce : 'peanut'].color;
    ctx.beginPath();
    ctx.ellipse(PASS.x + PASS.w / 2, PASS.y + 62, 34, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f7f2e2';
    roundRect(ctx, PASS.x + 196, PASS.y + 40, 34, 22, 4);
    ctx.fill();
  }
  if (glow) {
    ctx.fillStyle = COLORS.perfectGlow;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('★ READY TO SERVE ★', PASS.x + PASS.w / 2, PASS.y + PASS.h - 2);
    ctx.textAlign = 'left';
  }
  if (state.screen === 'playing') {
    hotspots.push({ x: PASS.x - 8, y: PASS.y - 6, w: PASS.w + 16, h: PASS.h + 12, action: { kind: 'ticket', ticket: state.tickets[0] ? state.tickets[0].id : -1 }, label: 'pass' });
  }
}

// ---- fan (stoke coals) ----
function drawFan(ctx, state, hotspots) {
  ctx.fillStyle = state.heat > 80 ? '#c22e1a' : '#3f7a4e';
  roundRect(ctx, FAN.x, FAN.y, FAN.w, FAN.h, 8);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('♨', FAN.x + FAN.w / 2, FAN.y + 26);
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('KIPAS (F)', FAN.x + FAN.w / 2, FAN.y + 44);
  ctx.textAlign = 'left';
  if (state.screen === 'playing') {
    hotspots.push({ x: FAN.x, y: FAN.y, w: FAN.w, h: FAN.h, action: { kind: 'fan' }, label: 'fan' });
  }
}

// ---- HUD ----
function drawHud(ctx, state) {
  ctx.fillStyle = COLORS.hudBg;
  ctx.fillRect(0, HUD.y, VIEW_W, VIEW_H - HUD.y);
  ctx.fillStyle = '#3a2a5a';
  ctx.fillRect(0, HUD.y, VIEW_W, 3);
  ctx.fillStyle = COLORS.hudText;
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('SKOR ' + state.score, 24, HUD.y + 34);
  ctx.fillStyle = '#ffd98a';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('🪙 ' + state.coins, 24, HUD.y + 62);
  ctx.fillStyle = state.combo >= 3 ? COLORS.perfectGlow : COLORS.hudText;
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('COMBO x' + Math.max(1, state.combo) + (state.combo > 0 ? '  ★'.repeat(Math.min(state.combo, MAX_COMBO)) : ''), 220, HUD.y + 34);
  ctx.fillStyle = '#c9b8e8';
  ctx.font = '15px sans-serif';
  ctx.fillText('Disajikan: ' + state.served + '  ·  Perfect: ' + state.perfectServed + '  ·  Gosong: ' + state.burntTossed, 220, HUD.y + 62);
  // Timer, centre.
  const mm = Math.floor(state.remaining / 60);
  const ss = Math.floor(state.remaining % 60);
  const timeStr = mm + ':' + String(ss).padStart(2, '0');
  const low = state.remaining <= 30;
  ctx.fillStyle = low ? '#ff5a3c' : COLORS.hudText;
  ctx.font = 'bold 34px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('⏱ ' + timeStr, 640, HUD.y + 44);
  ctx.font = '13px sans-serif';
  ctx.fillStyle = '#c9b8e8';
  ctx.fillText(state.rush ? 'JAM RAMAI!' : 'SHIFT ' + SHIFT_SECONDS + ' DETIK', 640, HUD.y + 66);
  ctx.textAlign = 'left';
  // Heat gauge, right.
  ctx.fillStyle = COLORS.hudText;
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('PANAS ARANG / HEAT', 980, HUD.y + 22);
  const gw = 240;
  const gh = 16;
  ctx.fillStyle = '#241a12';
  roundRect(ctx, 980, HUD.y + 30, gw, gh, 8);
  ctx.fill();
  const heatGrad = ctx.createLinearGradient(980, 0, 980 + gw, 0);
  heatGrad.addColorStop(0, '#7a3c12');
  heatGrad.addColorStop(0.6, '#ff7a1a');
  heatGrad.addColorStop(1, '#ffc23d');
  ctx.fillStyle = heatGrad;
  roundRect(ctx, 980, HUD.y + 30, gw * (state.heat / 100), gh, 8);
  ctx.fill();
  ctx.fillStyle = '#ff5a3c';
  ctx.fillRect(980 + (gw * 88) / 100 - 1, HUD.y + 26, 2, gh + 8);
  ctx.fillStyle = '#c9b8e8';
  ctx.font = '12px sans-serif';
  ctx.fillText('F / kipas = stoke  ·  M = suara  ·  P = jeda', 980, HUD.y + 66);
}

// ---- smoke, message, mute ----
function drawSmoke(ctx, state) {
  for (const p of state.smokePuffs) {
    ctx.fillStyle = `rgba(200,200,220,${0.16 * p.life})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * (1.6 - p.life * 0.6), 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawMessage(ctx, state) {
  if (!state.message || state.time > state.messageUntil) return;
  ctx.font = 'bold 18px sans-serif';
  const w = ctx.measureText(state.message).width + 32;
  ctx.fillStyle = 'rgba(20,12,30,0.85)';
  roundRect(ctx, (VIEW_W - w) / 2, 566, w, 34, 17);
  ctx.fill();
  ctx.fillStyle = '#ffe9b8';
  ctx.textAlign = 'center';
  ctx.fillText(state.message, VIEW_W / 2, 589);
  ctx.textAlign = 'left';
}

function drawMuteButton(ctx, state, hotspots) {
  ctx.fillStyle = 'rgba(20,12,30,0.6)';
  roundRect(ctx, VIEW_W - 46, VIEW_H - 40, 36, 30, 6);
  ctx.fill();
  ctx.fillStyle = '#ffe9b8';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(state.muted ? '🔇' : '🔊', VIEW_W - 28, VIEW_H - 19);
  ctx.textAlign = 'left';
  hotspots.push({ x: VIEW_W - 46, y: VIEW_H - 40, w: 36, h: 30, action: { kind: 'mute' }, label: 'mute' });
}

// ---- screens ----
function drawTitle(ctx, state, hotspots) {
  ctx.fillStyle = 'rgba(12,8,24,0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#2a1c10';
  roundRect(ctx, 290, 120, 700, 470, 16);
  ctx.fill();
  ctx.strokeStyle = COLORS.lightGlow;
  ctx.lineWidth = 3;
  roundRect(ctx, 290, 120, 700, 470, 16);
  ctx.stroke();
  ctx.fillStyle = COLORS.lightGlow;
  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PASAR MALAM: SATE', 640, 190);
  ctx.fillStyle = '#f3e2c2';
  ctx.font = '18px sans-serif';
  ctx.fillText('Night-market satay grill — panggang sate sampai PERFECT,', 640, 224);
  ctx.fillText('celup saus, sajikan sebelum pelanggan pergi!', 640, 248);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffe9b8';
  ctx.font = '15px sans-serif';
  const lines = [
    '1. Klik sate mentah (atau Z X C V B) → ke panggangan.',
    '2. Klik sate di grill untuk MEMBALIK. Meter hijau = PERFECT — klik lagi untuk angkat.',
    '3. Celup ke saus (klik panci / A S D), tambah lontong (L) atau es teh (T) bila diminta.',
    '4. Klik tiket pelanggan untuk menyajikan. Combo naik tiap sajian sempurna!',
    '5. Arang mendingin — tekan F / klik kipas untuk stoke. Api terlalu besar = gosong!',
    '6. Shift 180 detik, jam ramai di tengah shift. Gosong = buang, sabar pelanggan habis = pergi.',
  ];
  lines.forEach((line, i) => ctx.fillText(line, 330, 292 + i * 26));
  // Start button.
  ctx.fillStyle = '#3fae5a';
  roundRect(ctx, 490, 470, 300, 64, 12);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('▶  MULAI JUALAN', 640, 512);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#c9b8e8';
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Enter / klik tombol · M = suara · P = jeda', 640, 560);
  ctx.textAlign = 'left';
  hotspots.push({ x: 490, y: 470, w: 300, h: 64, action: { kind: 'start' }, label: 'start' });
}

function drawPaused(ctx, hotspots) {
  ctx.fillStyle = 'rgba(12,8,24,0.7)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#ffe9b8';
  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('JEDA / PAUSED', 640, 340);
  ctx.font = '18px sans-serif';
  ctx.fillText('Tekan P / Esc untuk lanjut', 640, 380);
  ctx.textAlign = 'left';
  hotspots.push({ x: 0, y: 0, w: VIEW_W, h: VIEW_H, action: { kind: 'pause' }, label: 'resume' });
}

function drawEnd(ctx, state, hotspots) {
  ctx.fillStyle = 'rgba(12,8,24,0.78)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#2a1c10';
  roundRect(ctx, 340, 130, 600, 440, 16);
  ctx.fill();
  ctx.strokeStyle = COLORS.lightGlow;
  ctx.lineWidth = 3;
  roundRect(ctx, 340, 130, 600, 440, 16);
  ctx.stroke();
  ctx.fillStyle = COLORS.lightGlow;
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SHIFT SELESAI!', 640, 190);
  ctx.fillStyle = '#f3e2c2';
  ctx.font = '20px sans-serif';
  const perfectRate = state.served > 0 ? Math.round((state.perfectServed / Math.max(1, state.served)) * 100) : 0;
  const rows = [
    ['Skor akhir / Score', String(state.score)],
    ['Koin / Coins', String(state.coins)],
    ['Sate disajikan / Served', String(state.served)],
    ['Perfect rate', perfectRate + '%'],
    ['Combo terbaik / Best combo', 'x' + state.bestCombo],
    ['Sate gosong / Burnt tossed', String(state.burntTossed)],
    ['Pelanggan pergi / Walked away', String(state.expired)],
  ];
  rows.forEach(([label, val], i) => {
    ctx.textAlign = 'left';
    ctx.fillText(label, 400, 240 + i * 34);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffd98a';
    ctx.fillText(val, 880, 240 + i * 34);
    ctx.fillStyle = '#f3e2c2';
  });
  ctx.textAlign = 'left';
  ctx.fillStyle = '#3fae5a';
  roundRect(ctx, 490, 486, 300, 56, 12);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('↻  MAIN LAGI (R)', 640, 522);
  ctx.textAlign = 'left';
  hotspots.push({ x: 490, y: 486, w: 300, h: 56, action: { kind: 'restart' }, label: 'restart' });
}
