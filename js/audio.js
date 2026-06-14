// Procedural sound via Web Audio — no asset files. Tiny synth + named SFX.
let ctx = null, master = null;
let volume = 0.5, lastVol = 0.5;

export function initAudio() {
  const stored = parseFloat(localStorage.getItem('shardfall.vol'));
  if (!isNaN(stored)) volume = stored;
  if (volume > 0) lastVol = volume;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = volume;
    master.connect(ctx.destination);
  } catch (_) { ctx = null; }
}
export function resumeAudio() { if (ctx && ctx.state === 'suspended') ctx.resume(); }
function apply() { if (master) master.gain.value = volume; }
export function getVolume() { return volume; }
export function setVolume(v) {
  volume = Math.max(0, Math.min(1, v));
  if (volume > 0) lastVol = volume;
  localStorage.setItem('shardfall.vol', String(volume));
  apply();
}
export function isMuted() { return volume <= 0; }
export function toggleMute() { volume = volume > 0 ? 0 : lastVol; localStorage.setItem('shardfall.vol', String(volume)); apply(); return isMuted(); }

function tone(freq, dur, type = 'square', vol = 0.3, slideTo = null) {
  if (!ctx || volume <= 0) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur);
}
function noise(dur, vol = 0.3, filterFreq = 1000) {
  if (!ctx || volume <= 0) return;
  const t = ctx.currentTime;
  const n = ctx.createBufferSource();
  const buf = ctx.createBuffer(1, Math.max(1, ctx.sampleRate * dur), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  n.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filterFreq;
  const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  n.connect(f); f.connect(g); g.connect(master); n.start(t); n.stop(t + dur);
}
const seq = (notes, type = 'square', step = 70, vol = 0.28) =>
  notes.forEach((f, i) => setTimeout(() => tone(f, 0.18, type, vol), i * step));

export const SFX = {
  swing:   () => noise(0.10, 0.22, 1800),
  hit:     () => tone(420, 0.08, 'square', 0.22, 180),
  crit:    () => { tone(720, 0.1, 'square', 0.3, 220); noise(0.1, 0.18, 2600); },
  die:     () => tone(300, 0.22, 'sawtooth', 0.22, 70),
  hurt:    () => { tone(170, 0.18, 'sawtooth', 0.3, 60); noise(0.12, 0.22, 480); },
  level:   () => seq([523, 659, 784, 1047], 'square'),
  pickup:  () => tone(880, 0.1, 'triangle', 0.25, 1320),
  coin:    () => { tone(988, 0.06, 'square', 0.22); setTimeout(() => tone(1319, 0.08, 'square', 0.22), 55); },
  shoot:   () => tone(300, 0.09, 'sawtooth', 0.12, 130),
  boss:    () => { tone(75, 0.7, 'sawtooth', 0.4, 38); noise(0.7, 0.18, 280); },
  shard:   () => seq([659, 988, 1319, 1568], 'triangle', 110, 0.3),
  descend: () => tone(440, 0.3, 'sine', 0.2, 170),
  shrine:  () => seq([784, 1047, 1319], 'sine', 90, 0.2),
  forge:   () => { noise(0.08, 0.3, 900); setTimeout(() => tone(660, 0.12, 'square', 0.25), 70); },
  ngplus:  () => seq([392, 523, 659, 784, 1047], 'square', 90, 0.3),
  dash:    () => noise(0.16, 0.22, 2400),
  potion:  () => seq([523, 784, 1047], 'sine', 60, 0.25),
  bomb:    () => { tone(120, 0.35, 'sawtooth', 0.4, 50); noise(0.35, 0.3, 700); },
  burn:    () => noise(0.06, 0.08, 1600),
  buff:    () => seq([392, 494, 587, 784], 'triangle', 70, 0.26),
  blocked: () => tone(180, 0.12, 'square', 0.2, 120),
};
