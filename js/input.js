// Unified input: keyboard (WASD/arrows + J attack + I inventory + E interact)
// and touch (virtual joystick + A/B buttons). Exposes a poll-able state.

export const input = {
  move: { x: 0, y: 0 },     // normalized -1..1
  attack: false,            // edge-ish: true while held
  attackPressed: false,     // one-shot
  interact: false,
  interactPressed: false,
  inventoryPressed: false,
  dashPressed: false,       // one-shot
  anyPressed: false,        // for menus / "press to continue"
};

const keys = {};

export function initInput(canvas) {
  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
    if (keys[e.key]) return; // ignore repeat
    keys[e.key] = true;
    input.anyPressed = true;
    const k = e.key.toLowerCase();
    if (k === 'j' || e.key === ' ') input.attackPressed = true;
    if (k === 'e') input.interactPressed = true;
    if (k === 'i') input.inventoryPressed = true;
    if (k === 'k' || e.key === 'Shift') input.dashPressed = true;
  });
  window.addEventListener('keyup', (e) => { keys[e.key] = false; });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

  setupTouch(canvas);
}

function readKeyboardMove() {
  let x = 0, y = 0;
  if (keys['ArrowLeft'] || keys['a'] || keys['A']) x -= 1;
  if (keys['ArrowRight'] || keys['d'] || keys['D']) x += 1;
  if (keys['ArrowUp'] || keys['w'] || keys['W']) y -= 1;
  if (keys['ArrowDown'] || keys['s'] || keys['S']) y += 1;
  return { x, y };
}

// --- Touch joystick + buttons ---
const touch = { stickId: null, baseX: 0, baseY: 0, dx: 0, dy: 0, attack: false };

function setupTouch(canvas) {
  const stick = document.getElementById('joystick');
  const knob = document.getElementById('knob');
  const btnA = document.getElementById('btnA');
  const btnB = document.getElementById('btnB');
  if (!stick) return;

  const startStick = (e) => {
    const t = e.changedTouches ? e.changedTouches[0] : e;
    touch.stickId = e.changedTouches ? t.identifier : 'mouse';
    const rect = stick.getBoundingClientRect();
    touch.baseX = rect.left + rect.width / 2;
    touch.baseY = rect.top + rect.height / 2;
    moveStick(t);
    e.preventDefault();
  };
  const moveStick = (t) => {
    let dx = t.clientX - touch.baseX, dy = t.clientY - touch.baseY;
    const max = 46, mag = Math.hypot(dx, dy);
    if (mag > max) { dx = dx / mag * max; dy = dy / mag * max; }
    touch.dx = dx / max; touch.dy = dy / max;
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
  };
  const endStick = () => { touch.stickId = null; touch.dx = 0; touch.dy = 0; knob.style.transform = 'translate(0,0)'; };

  stick.addEventListener('touchstart', startStick, { passive: false });
  window.addEventListener('touchmove', (e) => {
    if (touch.stickId === null) return;
    for (const t of e.changedTouches) if (t.identifier === touch.stickId) { moveStick(t); e.preventDefault(); }
  }, { passive: false });
  window.addEventListener('touchend', (e) => {
    for (const t of e.changedTouches) if (t.identifier === touch.stickId) endStick();
  });

  const bindBtn = (el, on, off) => {
    if (!el) return;
    el.addEventListener('touchstart', (e) => { on(); el.classList.add('pressed'); e.preventDefault(); }, { passive: false });
    el.addEventListener('touchend', (e) => { off && off(); el.classList.remove('pressed'); e.preventDefault(); }, { passive: false });
    // mouse fallback for desktop testing
    el.addEventListener('mousedown', (e) => { on(); el.classList.add('pressed'); e.preventDefault(); });
    el.addEventListener('mouseup', () => { off && off(); el.classList.remove('pressed'); });
  };
  bindBtn(btnA, () => { touch.attack = true; input.attackPressed = true; input.anyPressed = true; }, () => { touch.attack = false; });
  bindBtn(btnB, () => { input.interactPressed = true; input.anyPressed = true; });
  bindBtn(document.getElementById('btnDash'), () => { input.dashPressed = true; input.anyPressed = true; });

  // mouse drag fallback for the stick (desktop)
  stick.addEventListener('mousedown', startStick);
  window.addEventListener('mousemove', (e) => { if (touch.stickId === 'mouse') moveStick(e); });
  window.addEventListener('mouseup', () => { if (touch.stickId === 'mouse') endStick(); });
}

// Call once per frame to compute combined state.
export function pollInput() {
  const k = readKeyboardMove();
  let x = k.x + touch.dx, y = k.y + touch.dy;
  const mag = Math.hypot(x, y);
  if (mag > 1) { x /= mag; y /= mag; }
  input.move.x = x; input.move.y = y;
  input.attack = (keys['j'] || keys['J'] || keys[' '] || touch.attack) || false;
}

// Consume one-shot flags (call after handling them).
export function clearPressed() {
  input.attackPressed = false;
  input.interactPressed = false;
  input.inventoryPressed = false;
  input.dashPressed = false;
  input.anyPressed = false;
}
