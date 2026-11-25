// audio.js — synthesized WebAudio sounds only. No audio files.
// A sizzle loop follows the grill heat, plus flip pops, a dip blip, a
// serve chime, a thud for mistakes and a low crowd-murmur bed.

export function createAudio() {
  let ctx = null;
  let master = null;
  let sizzleGain = null;
  let murmurGain = null;
  let muted = false;

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
    // Sizzle: looping filtered noise whose gain follows grill heat.
    const sizzleBuf = noiseBuffer(ctx, 2);
    const sizzleSrc = ctx.createBufferSource();
    sizzleSrc.buffer = sizzleBuf;
    sizzleSrc.loop = true;
    const sizzleFilter = ctx.createBiquadFilter();
    sizzleFilter.type = 'bandpass';
    sizzleFilter.frequency.value = 5200;
    sizzleFilter.Q.value = 0.6;
    sizzleGain = ctx.createGain();
    sizzleGain.gain.value = 0;
    sizzleSrc.connect(sizzleFilter).connect(sizzleGain).connect(master);
    sizzleSrc.start();
    // Crowd murmur: low looping noise, very quiet.
    const murmurBuf = noiseBuffer(ctx, 3);
    const murmurSrc = ctx.createBufferSource();
    murmurSrc.buffer = murmurBuf;
    murmurSrc.loop = true;
    const murmurFilter = ctx.createBiquadFilter();
    murmurFilter.type = 'lowpass';
    murmurFilter.frequency.value = 320;
    murmurGain = ctx.createGain();
    murmurGain.gain.value = 0.035;
    murmurSrc.connect(murmurFilter).connect(murmurGain).connect(master);
    murmurSrc.start();
    return ctx;
  }

  function noiseBuffer(c, seconds) {
    const buf = c.createBuffer(1, c.sampleRate * seconds, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  function blip(freq, dur, type, vol, slideTo) {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g).connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  return {
    unlock() {
      const c = ensure();
      if (c && c.state === 'suspended') c.resume();
    },
    setMuted(m) {
      muted = m;
      if (master) master.gain.value = m ? 0 : 0.5;
    },
    // Call every frame with heat 0..100 and whether anything is grilling.
    setSizzle(heat, grilling) {
      if (!ctx || muted) return;
      const target = grilling ? 0.02 + (heat / 100) * 0.12 : 0;
      sizzleGain.gain.setTargetAtTime(target, ctx.currentTime, 0.15);
    },
    flipPop() { blip(520, 0.09, 'triangle', 0.25, 900); },
    pop() { blip(340, 0.07, 'sine', 0.2, 520); },
    dip() { blip(220, 0.16, 'sine', 0.22, 110); },
    stokeWhoosh() {
      if (!ctx || muted) return;
      const t = ctx.currentTime;
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer(ctx, 0.5);
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.setValueAtTime(400, t);
      f.frequency.exponentialRampToValueAtTime(2400, t + 0.4);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.25, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      src.connect(f).connect(g).connect(master);
      src.start(t);
      src.stop(t + 0.5);
    },
    serveChime() {
      blip(660, 0.18, 'sine', 0.25);
      setTimeout(() => blip(880, 0.22, 'sine', 0.25), 90);
      setTimeout(() => blip(1320, 0.3, 'sine', 0.18), 180);
    },
    thud() { blip(140, 0.18, 'sawtooth', 0.18, 70); },
  };
}
