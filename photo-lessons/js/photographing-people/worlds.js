/*
 * Lesson 2, Photographing People: the places each portrait is taken in.
 *
 * A world is { draw(ctx, st, box) } in world units. st.t is the scene clock and
 * st.p how far the fix has gone (0 = the first try, 1 = the keeper); box is the
 * photo's rectangle in canvas pixels, used to blur things off-screen.
 * Backgrounds are painted once into cached images and blurred like a lens would.
 */
'use strict';

const WORLDS = {};

/* ---------- lens blur ---------- */
const _scratch = new Map();
function scratchCanvas(w, h) {
  const key = `${w}x${h}`;
  let c = _scratch.get(key);
  if (!c) { c = document.createElement('canvas'); c.width = w; c.height = h; _scratch.set(key, c); }
  return c;
}
const pxScale = ctx => { const m = ctx.getTransform(); return Math.hypot(m.a, m.b); };
const canBlur = ctx => 'filter' in ctx;

/** Paints something blurred by `blur` world units: drawn off-screen, then filtered back in. */
function withBlur(ctx, box, blur, paint) {
  const px = blur * pxScale(ctx);
  if (px < 0.35 || !box || !canBlur(ctx)) { paint(ctx); return; }
  const W = ctx.canvas.width, H = ctx.canvas.height;
  const pad = Math.ceil(px * 3);
  const x0 = Math.max(0, Math.floor(box.x - pad)), y0 = Math.max(0, Math.floor(box.y - pad));
  const x1 = Math.min(W, Math.ceil(box.x + box.w + pad)), y1 = Math.min(H, Math.ceil(box.y + box.h + pad));
  if (x1 <= x0 || y1 <= y0) return;
  const c = scratchCanvas(W, H), o = c.getContext('2d');
  o.setTransform(1, 0, 0, 1, 0, 0);
  o.clearRect(x0, y0, x1 - x0, y1 - y0);
  o.save();
  o.beginPath(); o.rect(x0, y0, x1 - x0, y1 - y0); o.clip();
  o.setTransform(ctx.getTransform());
  paint(o);
  o.restore();
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.filter = `blur(${px.toFixed(2)}px)`;
  ctx.drawImage(c, x0, y0, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0);
  ctx.restore();
}

/* ---------- cached backgrounds ---------- */
const BACKDROPS = {};
const BD_RES = 0.8;
function backdropImage(name) {
  const B = BACKDROPS[name];
  return cached(`pp-bd-${name}`, B.b.w * BD_RES, B.b.h * BD_RES, c => { c.scale(BD_RES, BD_RES); c.translate(-B.b.x, -B.b.y); B.paint(c); });
}
/**
 * Draws a background, optionally blurred (world units) and moved/scaled.
 * o.bake keeps a pre-blurred copy for blur that never changes; o.dx, o.dy shift it;
 * o.zoom scales it about (o.cx, o.cy); o.smear streaks it sideways (a whip pan).
 */
function backdrop(ctx, name, blur = 0, o = {}) {
  const B = BACKDROPS[name];
  let img = backdropImage(name);
  let px = blur * pxScale(ctx);
  const extra = (o.extraBlur || 0) * pxScale(ctx);
  if (o.bake && blur > 0.5) {
    const k = 0.35;
    const sharp = img;
    img = cached(`pp-bd-${name}-b${Math.round(blur)}`, B.b.w * k, B.b.h * k, c => {
      if (canBlur(c)) c.filter = `blur(${(blur * k).toFixed(2)}px)`;
      c.drawImage(sharp, 0, 0, B.b.w * k, B.b.h * k);
    });
    px = 0;
  }
  px = Math.hypot(px, extra);
  ctx.save();
  if (o.zoom && o.zoom !== 1) { ctx.translate(o.cx, o.cy); ctx.scale(o.zoom, o.zoom); ctx.translate(-o.cx, -o.cy); }
  if (px > 0.35 && canBlur(ctx)) ctx.filter = `blur(${px.toFixed(2)}px)`;
  const x = B.b.x + (o.dx || 0), y = B.b.y + (o.dy || 0);
  const sm = o.smear || 0;
  if (sm > 1) {
    const n = 7;
    for (let i = 0; i < n; i++) {
      ctx.globalAlpha = (o.alpha ?? 1) * (i === 0 ? 1 : 1 / (i + 1));
      ctx.drawImage(img, x + (i / (n - 1) - 0.5) * sm, y, B.b.w, B.b.h);
    }
  } else {
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    ctx.drawImage(img, x, y, B.b.w, B.b.h);
  }
  ctx.restore();
}

/** Out-of-focus highlights: soft discs that grow with the blur. */
function bokeh(ctx, spots, amount) {
  if (amount <= 0.02) return;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (const s of spots) {
    const r = s.r * (0.35 + 0.65 * amount);
    const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r);
    g.addColorStop(0, rgba(s.c, 0.16 * amount * s.a));
    g.addColorStop(0.8, rgba(s.c, 0.3 * amount * s.a));
    g.addColorStop(0.92, rgba(s.c, 0.22 * amount * s.a));
    g.addColorStop(1, rgba(s.c, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, TAU); ctx.fill();
  }
  ctx.restore();
}
function bokehSpots(seed, n, x0, x1, y0, y1, colors, r0 = 26, r1 = 60) {
  const rnd = mulberry32(seed);
  return Array.from({ length: n }, () => ({ x: lerp(x0, x1, rnd()), y: lerp(y0, y1, rnd()), r: lerp(r0, r1, rnd()), c: colors[Math.floor(rnd() * colors.length)], a: 0.5 + rnd() * 0.5 }));
}

/** Blinks now and then, so the live view feels alive (deterministic in t). */
function blinkAt(t, seed = 0) {
  const period = 3.7 + (seed % 3) * 0.6;
  const ph = ((t + seed * 1.3) % period + period) % period;
  return ph < 0.16 ? Math.sin((ph / 0.16) * Math.PI) : 0;
}
/** Gentle breathing and head drift. */
const drift = (t, seed = 0) => ({ dx: Math.sin(t * 0.8 + seed) * 3, dy: Math.sin(t * 1.1 + seed * 2) * 2, roll: Math.sin(t * 0.6 + seed) * 0.012 });

/* ---------- shared scenery ---------- */
const GREENS = ['#6f9a55', '#5f8c4c', '#7da660', '#557f47', '#689452'];
function treeLine(c, x0, x1, base, seed, o = {}) {
  const rnd = mulberry32(seed);
  for (let x = x0; x < x1; x += 150 + rnd() * 90) {
    roundTree(c, x, base, (o.h || 360) + rnd() * (o.vary || 200), { leaf: (o.greens || GREENS)[Math.floor(rnd() * (o.greens || GREENS).length)], trunk: o.trunk || '#5b4a3a', hi: o.hi, lo: o.lo });
  }
}
function lawn(c, x0, x1, y0, y1, top, bottom) {
  c.fillStyle = lg(c, 0, y0, 0, y1, [[0, top], [1, bottom]]);
  c.fillRect(x0, y0, x1 - x0, y1 - y0);
}
/** A big tree trunk with bark, for a sharp background detail. */
function trunk(c, x, y0, y1, w, color = '#6b5040') {
  poly(c, [[x - w * 0.62, y1], [x - w * 0.42, y0], [x + w * 0.42, y0], [x + w * 0.62, y1]], color);
  c.strokeStyle = 'rgba(30,20,12,0.35)';
  c.lineWidth = 5;
  const rnd = mulberry32(Math.round(x));
  for (let i = 0; i < 9; i++) {
    const bx = x - w * 0.35 + rnd() * w * 0.7, by = lerp(y0, y1, rnd());
    c.beginPath(); c.moveTo(bx, by); c.quadraticCurveTo(bx + 6, by + 40, bx - 2, by + 90 + rnd() * 60); c.stroke();
  }
  c.fillStyle = 'rgba(255,240,210,0.16)';
  c.fillRect(x - w * 0.45, y0, w * 0.22, y1 - y0);
}
function canopy(c, x0, x1, yTop, yBot, seed, fill, hiFill) {
  const rnd = mulberry32(seed);
  c.beginPath();
  c.rect(x0, yTop, x1 - x0, (yBot - yTop) * 0.6);
  for (let x = x0; x <= x1; x += 70) {
    const r = 80 + rnd() * 70, y = yBot - r * 0.8 - rnd() * 60;
    c.moveTo(x + r, y); c.arc(x, y, r, 0, TAU);
  }
  c.fillStyle = fill;
  c.fill();
  if (hiFill) {
    const r2 = mulberry32(seed + 1);
    for (let i = 0; i < 26; i++) circ(c, lerp(x0, x1, r2()), lerp(yTop, yBot - 120, r2()), 30 + r2() * 50, hiFill);
  }
}
function plant(c, x, y, s, leaf = '#4f8a4a') {
  const k = s / 100;
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI / 2 + (i - 4) * 0.28;
    c.save();
    c.translate(x, y - 60 * k);
    c.rotate(a + Math.PI / 2);
    ell(c, 0, -70 * k, 22 * k, 70 * k, i % 2 ? leaf : mixHex(leaf, '#000000', 0.2));
    c.restore();
  }
  poly(c, [[x - 46 * k, y - 70 * k], [x + 46 * k, y - 70 * k], [x + 36 * k, y], [x - 36 * k, y]], '#c9b8a2');
}

/* ---------- 1. a park, for the eyes lesson and the kids ---------- */
BACKDROPS.park = {
  b: { x: -300, y: -300, w: 3300, h: 2200 },
  paint(c) {
    sky(c, -300, -300, 3000, 870, [[0, '#9fc8e6'], [0.65, '#cfe2ea'], [1, '#e9eee0']]);
    cloud(c, 280, 160, 120, 'rgba(255,255,255,0.85)');
    cloud(c, 2300, 60, 150, 'rgba(255,255,255,0.8)');
    treeLine(c, -340, 3000, 880, 11);
    lawn(c, -300, 3000, 860, 1900, '#a3c873', '#5d8c41');
    c.beginPath(); c.moveTo(380, 1900); c.bezierCurveTo(820, 1300, 1260, 1000, 1480, 870); c.lineTo(1540, 870); c.bezierCurveTo(1400, 1010, 1160, 1380, 1060, 1900); c.closePath();
    c.fillStyle = '#e4d6b8'; c.fill();
    for (let i = 0; i < 10; i++) bush(c, -240 + i * 340, 920, 200 + (i % 3) * 50, ['#4f7d3e', '#5d8b46', '#46713a'][i % 3], 30 + i);
    flowers(c, -300, 3000, 880, 1000, 90, ['#f2a3b5', '#ffffff', '#f6d36b', '#e86f6f'], 4, 10);
    // a big tree on the right: the thing a careless camera focuses on
    canopy(c, 1380, 2360, -300, 420, 7, '#4d7f3e', 'rgba(150,200,110,0.35)');
    trunk(c, 1840, 260, 1090, 120);
    ell(c, 1840, 1090, 130, 22, 'rgba(40,60,20,0.25)');
    // a bench beside it
    bench(c, 2160, 1040, 300);
    // sun flecks in the leaves become bokeh when the background blurs
    const rnd = mulberry32(3);
    for (let i = 0; i < 40; i++) circ(c, lerp(-300, 3000, rnd()), lerp(-200, 620, rnd()), 6 + rnd() * 10, 'rgba(255,250,215,0.75)');
  },
};
const PARK_BOKEH = bokehSpots(21, 26, 300, 2600, 100, 760, ['#fffbe0', '#e8f7c8', '#ffffff'], 30, 70);

/* ---------- 2. a city street, for headroom ---------- */
BACKDROPS.city = {
  b: { x: -300, y: -300, w: 3300, h: 2200 },
  paint(c) {
    const cols = ['#c98f6b', '#e2c6a0', '#9fb2b8', '#d9a98a', '#b9a58f', '#c7b49c'];
    let x = -300, i = 0;
    while (x < 3000) {
      const w = 360 + ((i * 137) % 5) * 70;
      c.fillStyle = cols[i % cols.length];
      c.fillRect(x, -300, w + 1, 1400);
      for (let wy = -220; wy < 560; wy += 230) {
        for (let wx = x + 50; wx < x + w - 100; wx += 150) { rr(c, wx, wy, 86, 150, 6, '#55646e'); rr(c, wx + 7, wy + 7, 72, 136, 4, '#8fa6b0'); }
      }
      // shop front with a warm window and an awning
      rr(c, x + 30, 720, w - 60, 380, 8, '#3d332c');
      rr(c, x + 50, 740, w - 100, 300, 6, ['#f3d9a4', '#f6e2bb', '#eec98f'][i % 3]);
      poly(c, [[x + 20, 690], [x + w - 20, 690], [x + w - 50, 760], [x + 50, 760]], ['#b5473b', '#2f6b5e', '#d8a13a', '#3b5a8a'][i % 4]);
      x += w; i++;
    }
    lawn(c, -300, 3000, 1100, 1900, '#9a948c', '#7a756e');
    for (let lx = 0; lx < 3000; lx += 700) lampPost(c, lx, 1150, 560);
    roundTree(c, 2050, 1160, 760, { leaf: '#5d8b46' });
  },
};
const CITY_BOKEH = bokehSpots(5, 22, 0, 2900, 650, 1100, ['#ffd98a', '#fff1c9', '#ffc070'], 28, 64);

/* ---------- 3. a brick wall ---------- */
BACKDROPS.brick = {
  b: { x: -500, y: -500, w: 3700, h: 2700 },
  paint(c) {
    const rnd = mulberry32(5);
    c.fillStyle = '#b9a99b';
    c.fillRect(-500, -500, 3700, 2700);
    const bh = 48, bw = 136;
    let row = 0;
    for (let y = -500; y < 1900; y += bh, row++) {
      for (let x = -500 - (row % 2) * bw / 2; x < 3200; x += bw) {
        rr(c, x + 3, y + 3, bw - 6, bh - 6, 3, ['#a6533b', '#b35e42', '#9a4a35', '#ad5a3f', '#b8674a', '#93452f', '#a95a42'][Math.floor(rnd() * 7)]);
        if (rnd() < 0.3) { c.fillStyle = 'rgba(255,230,200,0.12)'; c.fillRect(x + 8, y + 8, bw * 0.4, 6); }
      }
    }
    c.fillStyle = lg(c, -500, 0, 3200, 0, [[0, 'rgba(0,0,0,0.12)'], [0.5, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.16)']]);
    c.fillRect(-500, -500, 3700, 2700);
    // a drainpipe and some ivy
    c.fillStyle = '#5e6468'; c.fillRect(2480, -500, 34, 2400);
    for (let y = -400; y < 1800; y += 300) rr(c, 2470, y, 54, 26, 4, '#4d5357');
    const iv = mulberry32(9);
    for (let i = 0; i < 160; i++) { const y = lerp(-500, 1700, iv()), x = lerp(-500, 120, iv()) + Math.sin(y / 140) * 60; ell(c, x, y, 26, 16, ['#3f6d33', '#4c7d3b', '#355f2c'][i % 3], iv() * 3); }
    c.fillStyle = '#a9a39a'; c.fillRect(-500, 1900, 3700, 300);
  },
};

/* ---------- 4. a sunny lawn with one big shady tree ---------- */
BACKDROPS.noon = {
  b: { x: -300, y: -400, w: 3800, h: 2300 },
  paint(c) {
    sky(c, -300, -400, 3500, 860, [[0, '#bfe0f6'], [1, '#f2f7f4']]);
    treeLine(c, -340, 3500, 880, 41, { greens: ['#8fb46d', '#9cbf77', '#84a964'], h: 300, vary: 150, hi: 'rgba(255,255,230,0.3)' });
    c.fillStyle = '#e9e1cf';
    for (const [x, w, h] of [[300, 420, 260], [880, 300, 200]]) c.fillRect(x, 880 - h, w, h);
    lawn(c, -300, 3500, 860, 1900, '#cfe08f', '#a2c25f');
    // hard noon shadows: small and right under things
    for (const x of [200, 700, 1250]) { bush(c, x, 930, 180, '#7ea54f', x); ell(c, x, 935, 100, 14, 'rgba(50,70,20,0.45)'); }
    // the big tree: canopy across the top right, its shade on the grass
    c.fillStyle = 'rgba(40,70,30,0.42)';
    c.beginPath(); c.ellipse(2550, 1250, 1000, 420, 0, 0, TAU); c.fill();
    trunk(c, 2900, 300, 1330, 130, '#5a4234');
    canopy(c, 1650, 3500, -400, 600, 13, '#3f6f35', 'rgba(110,160,80,0.35)');
  },
};

/* ---------- 5. a living room with a big window ---------- */
BACKDROPS.room = {
  b: { x: -400, y: -300, w: 3900, h: 2200 },
  paint(c) {
    c.fillStyle = '#c9bdae';
    c.fillRect(-400, -300, 3900, 2200);
    c.fillStyle = rg(c, 1400, 650, 100, 1300, [[0, 'rgba(255,248,236,0.75)'], [1, 'rgba(255,248,236,0)']]);
    c.fillRect(-400, -300, 3900, 2200);
    // window
    rr(c, 1030, 110, 740, 1090, 8, '#f3eee6');
    c.fillStyle = lg(c, 0, 140, 0, 1170, [[0, '#ffffff'], [0.7, '#f2f7f8'], [1, '#e3eee8']]);
    c.fillRect(1060, 140, 680, 1030);
    c.fillStyle = 'rgba(190,215,180,0.35)';
    for (const [x, y, r] of [[1150, 900, 160], [1350, 950, 200], [1620, 880, 170]]) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
    c.fillStyle = '#f3eee6';
    c.fillRect(1393, 140, 14, 1030);
    c.fillRect(1060, 560, 680, 14);
    rr(c, 1000, 1180, 800, 34, 4, '#e9e2d6');
    // curtains
    for (const [x0, x1] of [[900, 1050], [1750, 1900]]) {
      c.fillStyle = '#e6d9c5';
      c.fillRect(x0, 60, x1 - x0, 1500);
      c.fillStyle = 'rgba(120,95,70,0.14)';
      for (let x = x0 + 20; x < x1; x += 42) c.fillRect(x, 60, 12, 1500);
    }
    rr(c, 860, 40, 1080, 22, 8, '#7a6450');
    // a print on the wall, a plant, a lamp
    rr(c, 2540, 380, 380, 470, 6, '#3a332c');
    rr(c, 2565, 405, 330, 420, 3, '#f2ede4');
    c.fillStyle = lg(c, 0, 440, 0, 790, [[0, '#9fb7a8'], [1, '#d9b48d']]);
    c.fillRect(2600, 440, 260, 350);
    plant(c, 3150, 1250, 220, '#4f8a4a');
    c.fillStyle = '#6a5a4a'; c.fillRect(150, 380, 12, 900);
    ell(c, 156, 360, 110, 60, '#efe2c8');
    // shelves on the left
    for (let y = 300; y < 1100; y += 240) {
      c.fillStyle = '#8a6d52'; c.fillRect(-380, y, 640, 18);
      const rb = mulberry32(y);
      for (let x = -360; x < 220; x += 34 + rb() * 20) rr(c, x, y - 120 - rb() * 50, 26, 120 + rb() * 50, 3, ['#7b8fa6', '#c97c5d', '#e2c58f', '#6d8a6a', '#a35d5d'][Math.floor(rb() * 5)]);
    }
    // sofa back and floor
    rr(c, -400, 1150, 3900, 520, 60, '#6d8a86');
    c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(-400, 1150, 3900, 40);
    c.fillStyle = '#9c7656'; c.fillRect(-400, 1650, 3900, 300);
  },
};

/* ---------- 6. a field at sunset, seen both ways ---------- */
BACKDROPS.golden = {
  b: { x: -400, y: -300, w: 6200, h: 2200 },
  paint(c) {
    // facing away from the sun: lit, warm field under a cool sky
    sky(c, -400, -300, 2900, 880, [[0, '#7487bd'], [0.62, '#c9a9c0'], [1, '#f3c9a0']]);
    treeLine(c, -440, 2900, 900, 61, { greens: ['#8c8a45', '#9a8f48', '#7d7d3d'], h: 260, vary: 120, hi: 'rgba(255,190,110,0.3)' });
    lawn(c, -400, 2900, 880, 1900, '#e3ae5c', '#a8742f');
    grassTufts(c, -400, 2900, 900, 1880, 500, 'rgba(255,214,140,0.6)', 7, 46);
    // facing the sun: a glowing sky, the field in backlight
    const w = document.createElement('canvas');
    const k = BD_RES;
    w.width = this.b.w * k; w.height = this.b.h * k;
    const o = w.getContext('2d');
    o.scale(k, k); o.translate(-this.b.x, -this.b.y);
    sky(o, 2500, -300, 5800, 880, [[0, '#e98d55'], [0.55, '#f7b467'], [1, '#ffe2a0']]);
    o.fillStyle = rg(o, 4300, 840, 40, 1100, [[0, 'rgba(255,250,220,0.95)'], [0.25, 'rgba(255,220,150,0.55)'], [1, 'rgba(255,200,120,0)']]);
    o.fillRect(2500, -300, 3300, 2200);
    treeLine(o, 2460, 5800, 900, 67, { greens: ['#5c4127', '#674a2c', '#523a24'], h: 260, vary: 140, hi: 'rgba(0,0,0,0)', lo: 'rgba(0,0,0,0.1)' });
    circ(o, 4300, 840, 62, '#fff8e2');
    lawn(o, 2500, 5800, 880, 1900, '#7a5b30', '#3f2f1a');
    grassTufts(o, 2500, 5800, 900, 1880, 520, 'rgba(255,205,120,0.65)', 9, 46);
    o.globalCompositeOperation = 'destination-in';
    o.fillStyle = lg(o, 2600, 0, 2950, 0, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,1)']]);
    o.fillRect(2500, -300, 3300, 2200);
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.drawImage(w, 0, 0);
    c.restore();
  },
};

/* ---------- 7. looking up and looking level: sky and branches above a hedge ---------- */
BACKDROPS.updown = {
  b: { x: -300, y: -1700, w: 3300, h: 3900 },
  paint(c) {
    sky(c, -300, -1700, 3000, 300, [[0, '#6fa6d8'], [1, '#d4e6ef']]);
    cloud(c, 700, -1100, 180, 'rgba(255,255,255,0.9)');
    cloud(c, 2100, -700, 140, 'rgba(255,255,255,0.85)');
    canopy(c, -300, 900, -1700, -900, 3, '#3d6a33', 'rgba(120,170,90,0.3)');
    canopy(c, 1800, 3000, -1700, -1100, 4, '#3d6a33', 'rgba(120,170,90,0.3)');
    lampPost(c, 2200, 400, 1200);
    lawn(c, -300, 3000, 280, 2200, '#9cc56e', '#6a9a48');
    buildingRow(c, -300, 3000, 300, 8, ['#d8c8b0', '#c7b49c', '#e0d2bd'], 300, 600, 'rgba(90,110,125,0.5)');
    treeLine(c, -340, 3000, 520, 15, { h: 420, vary: 160 });
    c.fillStyle = '#3f6a35';
    c.beginPath(); c.roundRect(-300, 520, 3300, 420, 60); c.fill();
    const rnd = mulberry32(2);
    for (let i = 0; i < 140; i++) circ(c, lerp(-300, 3000, rnd()), lerp(530, 900, rnd()), 20 + rnd() * 34, ['#4c7d3e', '#3a6531', '#5a8b48'][i % 3]);
    lawn(c, -300, 3000, 900, 2200, '#8fbb63', '#5f8f40');
    flowers(c, -300, 3000, 940, 1100, 70, ['#f2a3b5', '#ffffff', '#f6d36b'], 5, 12);
  },
};

/* ---------- 8. a playground: grass up close, the park at a kid's eye level ---------- */
BACKDROPS.play = {
  b: { x: -300, y: -900, w: 3300, h: 3600 },
  paint(c) {
    sky(c, -300, -900, 3000, 520, [[0, '#a6cdea'], [1, '#e6eee2']]);
    treeLine(c, -340, 3000, 540, 23);
    // a slide and swings, soft in the distance
    c.strokeStyle = '#d65a4a'; c.lineWidth = 22;
    c.beginPath(); c.moveTo(1900, 560); c.lineTo(1960, 250); c.lineTo(2160, 250); c.lineTo(2220, 560); c.stroke();
    poly(c, [[2160, 250], [2190, 250], [2480, 540], [2440, 560]], '#f2b632');
    c.strokeStyle = '#3d6fb0'; c.lineWidth = 16;
    c.beginPath(); c.moveTo(400, 560); c.lineTo(520, 220); c.lineTo(860, 220); c.lineTo(980, 560); c.stroke();
    c.lineWidth = 4; c.strokeStyle = '#555';
    for (const x of [600, 780]) { c.beginPath(); c.moveTo(x, 220); c.lineTo(x, 420); c.stroke(); rr(c, x - 30, 420, 60, 12, 3, '#2d2d2d'); }
    lawn(c, -300, 3000, 520, 2700, '#a2c873', '#6f9f4d');
    // close-up grass, as seen looking down
    const rnd = mulberry32(17);
    grassTufts(c, -300, 3000, 1000, 2700, 1400, 'rgba(70,120,40,0.55)', 3, 60);
    grassTufts(c, -300, 3000, 1000, 2700, 900, 'rgba(190,225,130,0.5)', 4, 50);
    for (let i = 0; i < 40; i++) {
      const x = lerp(-300, 3000, rnd()), y = lerp(1100, 2600, rnd());
      for (let p = 0; p < 3; p++) circ(c, x + Math.cos(p * 2.1) * 16, y + Math.sin(p * 2.1) * 16, 16, '#5f9a45');
    }
    flowers(c, -300, 3000, 1100, 2600, 50, ['#ffffff', '#f6d36b'], 8, 16);
    // a ball and a toy bucket
    circ(c, 650, 1900, 90, '#e8503f');
    ctxStripe(c, 650, 1900, 90);
    poly(c, [[2050, 1650], [2230, 1650], [2200, 1820], [2080, 1820]], '#3d8fd1');
  },
};
function ctxStripe(c, x, y, r) {
  c.save();
  c.beginPath(); c.arc(x, y, r, 0, TAU); c.clip();
  c.fillStyle = '#ffffff';
  c.fillRect(x - r, y - r * 0.2, r * 2, r * 0.4);
  c.restore();
}
const PLAY_BOKEH = bokehSpots(31, 22, 0, 2700, -500, 500, ['#fffbe0', '#e8f7c8', '#ffffff'], 30, 70);

/* ---------- 9. a garden path, for full-body shots ---------- */
// Its horizon sits at y = 0; scenes slide it to the camera's height.
BACKDROPS.path = {
  b: { x: -300, y: -1400, w: 3000, h: 3000 },
  paint(c) {
    sky(c, -300, -1400, 2700, 0, [[0, '#9cc6e4'], [1, '#e7eee6']]);
    cloud(c, 500, -900, 140, 'rgba(255,255,255,0.85)');
    treeLine(c, -340, 2700, 10, 51, { h: 520, vary: 220 });
    lawn(c, -300, 2700, 0, 1600, '#9cc56e', '#5c8b40');
    // the path runs away to the horizon
    c.beginPath(); c.moveTo(1150, 0); c.lineTo(1250, 0); c.lineTo(1900, 1600); c.lineTo(500, 1600); c.closePath();
    c.fillStyle = lg(c, 0, 0, 0, 1600, [[0, '#d9cbb0'], [1, '#c4b190']]); c.fill();
    for (const [x, s] of [[700, 1], [1650, 1], [420, 1.6], [1980, 1.6]]) lampPost(c, x, 60 * s, 340 * s);
    for (let i = 0; i < 6; i++) bush(c, -200 + i * 520, 40, 260, ['#4f7d3e', '#5d8b46'][i % 2], 70 + i);
  },
};

/* ---------- 10. indoors for the selfie: ceiling above, a cosy wall at eye level ---------- */
BACKDROPS.selfie = {
  b: { x: -300, y: -1600, w: 3000, h: 3600 },
  paint(c) {
    c.fillStyle = lg(c, 0, -1600, 0, -300, [[0, '#d9d4cc'], [1, '#ebe6de']]);
    c.fillRect(-300, -1600, 3000, 1300);
    // a ceiling light, seen from below
    circ(c, 1200, -1050, 190, '#fff4d6');
    circ(c, 1200, -1050, 120, '#ffffff');
    c.fillStyle = rg(c, 1200, -1050, 100, 600, [[0, 'rgba(255,240,200,0.6)'], [1, 'rgba(255,240,200,0)']]);
    c.fillRect(500, -1700, 1400, 1300);
    c.fillStyle = '#c9c2b8'; c.fillRect(-300, -330, 3000, 40);
    // the wall at eye level
    c.fillStyle = '#d7cbbb'; c.fillRect(-300, -290, 3000, 2300);
    rr(c, 300, 0, 420, 520, 6, '#3a332c');
    rr(c, 325, 25, 370, 470, 3, '#f2ede4');
    c.fillStyle = lg(c, 0, 60, 0, 460, [[0, '#e0a98a'], [1, '#8fb3c4']]); c.fillRect(360, 60, 300, 400);
    c.fillStyle = '#8a6d52'; c.fillRect(1550, 380, 900, 22);
    for (let x = 1600; x < 2400; x += 48) rr(c, x, 250, 34, 130, 3, ['#7b8fa6', '#c97c5d', '#e2c58f', '#6d8a6a'][x % 4]);
    plant(c, 2250, 1500, 280);
    // string lights: bokeh behind her
    c.strokeStyle = '#6b5a4a'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(-300, 420); c.quadraticCurveTo(1200, 720, 2700, 400); c.stroke();
    for (let i = 0; i <= 16; i++) { const tt = i / 16, x = lerp(-300, 2700, tt), y = (1 - tt) * (1 - tt) * 420 + 2 * (1 - tt) * tt * 720 + tt * tt * 400; circ(c, x, y + 14, 12, '#ffe7a6'); }
  },
};
const SELFIE_BOKEH = Array.from({ length: 17 }, (_, i) => { const tt = i / 16, x = lerp(-300, 2700, tt), y = (1 - tt) * (1 - tt) * 420 + 2 * (1 - tt) * tt * 720 + tt * tt * 400; return { x, y: y + 14, r: 40, c: '#ffd98a', a: 0.9 }; });

/* ---------- the worlds ---------- */
// Each portrait world has spec(st): the person it draws, so scenes can aim focus and marks at them.
const SUBJECT = {
  eyes: { x: 1200, y: 820, s: 140 },
  headroom: { x: 1200, y: 800, s: 100 },
  wall: { x: 1150, y: 800, s: 135 },
  midday: { x0: 1000, x1: 2300, y: 820, s: 140 },
  window: { x0: 1400, x1: 2350, y: 820, s: 140 },
  golden: { x0: 1250, x1: 4050, y: 820, s: 140 },
  faceangle: { x: 1200, y0: -560, y1: 940, s: 140 },
  kids: { x: 1200, y0: 1500, y1: 300 },
  standing: { x: 1200, y: 1500, h: 900 },
  selfie: { x: 1200, y0: -480, y1: 760 },
};

/** The eyes lesson: st.focus racks from the tree behind her (0) to her near eye (1). */
WORLDS.eyes = {
  spec(st) {
    const S0 = SUBJECT.eyes, t = st.t || 0, d = drift(t, 1);
    return { x: S0.x + d.dx, y: S0.y + d.dy, s: S0.s, roll: d.roll, look: st.look || LOOKS.maya, light: LIGHTS.soft, smile: 0.35, yaw: 0.22, blink: blinkAt(t, 1) };
  },
  draw(ctx, st, box) {
    const f = st.focus ?? 1;
    backdrop(ctx, 'park', lerp(0, 16, f));
    bokeh(ctx, PARK_BOKEH, f);
    const P = this.spec(st);
    withBlur(ctx, box, lerp(8, 0, f), c => drawPortrait(c, P));
  },
};
const TREE_AF = [1840, 700];

WORLDS.headroom = {
  spec(st) {
    const S0 = SUBJECT.headroom, t = st.t || 0, d = drift(t, 2);
    return { x: S0.x + d.dx, y: S0.y + d.dy, s: S0.s, roll: d.roll, look: LOOKS.lin, light: LIGHTS.shade, smile: 0.55, blink: blinkAt(t, 2) };
  },
  draw(ctx, st) {
    backdrop(ctx, 'city', 14, { bake: true });
    bokeh(ctx, CITY_BOKEH, 1);
    drawPortrait(ctx, this.spec(st));
  },
};

/** A standing figure for the crop lesson. */
WORLDS.joints = {
  draw(ctx) {
    backdrop(ctx, 'park', 10, { bake: true, dy: 300 });
    const S0 = SUBJECT.standing;
    drawStanding(ctx, S0.x, S0.y, S0.h, { look: LOOKS.sam, light: LIGHTS.soft, smile: 0.5, legs: '#4a4f5a', shoes: '#3a2f28' });
  },
};
// the joint heights drawStanding works with, for crop lines
const JOINTS = (() => {
  const S0 = SUBJECT.standing, k = S0.h / 100;
  const hip = S0.y - 47 * k, shoulder = hip - 30 * k;
  return { top: shoulder - 23.5 * k, eyes: shoulder - 10.5 * k, neck: shoulder - 1.5 * k, elbow: shoulder + 17.5 * k, waist: hip - 3 * k, wrist: shoulder + 31 * k, hip, knee: hip + 47 * 0.52 * k, ankle: S0.y - 4.5 * k, foot: S0.y };
})();

/** The wall lesson: st.p = how far they stepped away (0 = touching the wall). */
const WALL_LIGHT = { dir: [-0.55, 0.32, 0.77], hard: 0.85, key: 1, fill: 0.34 };
WORLDS.wall = {
  spec(st) {
    const S0 = SUBJECT.wall, t = st.t || 0, d = drift(t, 3);
    return { x: S0.x + d.dx, y: S0.y + d.dy, s: S0.s, roll: d.roll, look: LOOKS.sam, light: WALL_LIGHT, smile: 0.4, blink: blinkAt(t, 3) };
  },
  shadowAt: q => [SUBJECT.wall.x + 95 + 420 * q, SUBJECT.wall.y + 30 + 520 * q],
  draw(ctx, st, box) {
    const q = clamp01(st.p ?? 0);
    const S0 = SUBJECT.wall;
    const P = this.spec(st);
    // the wall recedes and softens; the shadow slides off it
    const zoom = 1 / (1 + 0.45 * q);
    const [sx, sy] = this.shadowAt(q);
    withBlur(ctx, box, 14 * q, c => {
      backdrop(c, 'brick', 0, { zoom, cx: S0.x, cy: S0.y + 300 });
      const sh = 1 - Ease.inOut(clamp01(q * 1.6));
      if (sh > 0.01) {
        c.save();
        c.globalAlpha *= 0.62 * sh;
        drawPortrait(c, { ...P, x: sx + P.x - S0.x, y: sy + P.y - S0.y, silhouette: '#2a1209' });
        c.restore();
      }
    });
    drawPortrait(ctx, P);
  },
};

/** Midday: st.p moves her from full sun into the tree's shade. */
WORLDS.midday = {
  shadeOf: p => Ease.inOut(clamp01((p - 0.35) / 0.4)),
  spec(st) {
    const p = st.p ?? 0, S0 = SUBJECT.midday, t = st.t || 0, d = drift(t, 4);
    const shade = this.shadeOf(p);
    return { x: lerp(S0.x0, S0.x1, p) + d.dx, y: S0.y + d.dy, s: S0.s, roll: d.roll, look: st.look || LOOKS.maya, light: lerpLight(LIGHTS.midday, LIGHTS.shade, shade), squint: 0.85 * (1 - shade), smile: 0.5 * shade, blink: shade > 0.9 ? blinkAt(t, 4) : 0 };
  },
  draw(ctx, st) {
    backdrop(ctx, 'noon', 7, { bake: true });
    drawPortrait(ctx, this.spec(st));
  },
};

/** Window: st.p turns her (and the camera) from the window behind to the window beside her. */
WORLDS.window = {
  turnOf: p => Ease.inOut(clamp01((p - 0.15) / 0.7)),
  spec(st) {
    const p = st.p ?? 0, S0 = SUBJECT.window, t = st.t || 0, d = drift(t, 5);
    const turn = this.turnOf(p);
    return { x: lerp(S0.x0, S0.x1, p) + d.dx, y: S0.y + d.dy, s: S0.s, roll: d.roll, look: st.look || LOOKS.maya, light: lerpLight(LIGHTS.windowBehind, LIGHTS.window, turn), smile: lerp(0.2, 0.45, turn), yaw: -0.22 * turn, blink: blinkAt(t, 5) };
  },
  draw(ctx, st) {
    const p = st.p ?? 0, turn = this.turnOf(p);
    backdrop(ctx, 'room', 6, { bake: true });
    const x = lerp(SUBJECT.window.x0, SUBJECT.window.x1, p);
    if (turn < 1) {
      // exposing for the bright window darkens the room in the first shot...
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = `rgba(150,140,130,${0.6 * (1 - turn)})`;
      ctx.fillRect(x - 2000, -400, 4000, 2400);
      ctx.restore();
      // ...but the window itself is blown out, and glows around her
      ctx.save();
      ctx.globalAlpha *= 1 - turn;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(1060, 140, 680, 1030);
      ctx.fillStyle = 'rgba(225,225,222,0.6)';
      ctx.fillRect(1393, 140, 14, 1030);
      ctx.fillRect(1060, 560, 680, 14);
      ctx.fillStyle = rg(ctx, 1400, 650, 250, 900, [[0, 'rgba(255,255,255,0.7)'], [1, 'rgba(255,255,255,0)']]);
      ctx.fillRect(300, -400, 2200, 2200);
      ctx.restore();
    }
    drawPortrait(ctx, this.spec(st));
  },
};

/** Golden hour: st.p swings the pair around so the sun ends up behind her. */
const SUN_AT = [4300, 840];
WORLDS.golden = {
  backOf: p => Ease.inOut(clamp01((p - 0.3) / 0.5)),
  spec(st) {
    const p = st.p ?? 0, S0 = SUBJECT.golden, t = st.t || 0, d = drift(t, 6);
    const back = this.backOf(p);
    return { x: lerp(S0.x0, S0.x1, p) + d.dx, y: S0.y + d.dy, s: S0.s, roll: d.roll, look: st.look || LOOKS.ivy, light: lerpLight(LIGHTS.sunFront, { ...LIGHTS.sunBehind, dark: 0.08 }, back), squint: 0.9 * (1 - back), smile: lerp(0.1, 0.55, back), yaw: 0.12 * back, blink: back > 0.9 ? blinkAt(t, 6) : 0 };
  },
  draw(ctx, st) {
    const back = this.backOf(st.p ?? 0);
    backdrop(ctx, 'golden', 4, { bake: true, extraBlur: (st.smear || 0) * 26 });
    if (back > 0) {
      // the sun just past her shoulder
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha *= back;
      ctx.fillStyle = rg(ctx, SUN_AT[0], SUN_AT[1], 30, 520, [[0, 'rgba(255,240,200,0.9)'], [1, 'rgba(255,200,120,0)']]);
      ctx.fillRect(3600, 200, 1400, 1300);
      ctx.restore();
    }
    drawPortrait(ctx, this.spec(st));
    if (back > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha *= back * 0.55;
      for (const [k, r, a] of [[0.3, 40, 0.18], [0.55, 22, 0.22], [0.8, 60, 0.1]]) circ(ctx, lerp(SUN_AT[0], 4700, k), lerp(SUN_AT[1], 1300, k), r, `rgba(255,214,150,${a})`);
      ctx.restore();
    }
  },
};

/** Face angle: st.p raises the camera from below the chin to just above the eyes. */
WORLDS.faceangle = {
  spec(st) {
    const p = st.p ?? 0, q = Ease.inOut(p), S0 = SUBJECT.faceangle, t = st.t || 0, d = drift(t, 7);
    return { x: S0.x + d.dx, y: lerp(S0.y0, S0.y1, p) + d.dy, s: S0.s * lerp(1.06, 1, q), roll: d.roll, look: st.look || LOOKS.lin, light: LIGHTS.soft, pitch: lerp(-1.25, 0.5, q), smile: lerp(0.15, 0.5, q), gaze: [0, lerp(0.35, -0.2, q)], blink: blinkAt(t, 7) };
  },
  draw(ctx, st) {
    backdrop(ctx, 'updown', 9, { bake: true });
    drawPortrait(ctx, this.spec(st));
  },
};

/** Kids: st.p brings the camera down from standing height to the child's eye level. */
const BUBBLES = Array.from({ length: 10 }, (_, i) => { const r = mulberry32(90 + i); const side = i % 2 ? 1 : -1; return { x: 1200 + side * (260 + r() * 420), y: r() * 520, r: 26 + r() * 34, sp: 0.4 + r() * 0.5, ph: r() * 6 }; });
function drawBubble(ctx, x, y, r, a) {
  if (a <= 0.01) return;
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.fillStyle = rg(ctx, x, y, r * 0.6, r, [[0, 'rgba(255,255,255,0.05)'], [0.85, 'rgba(200,230,255,0.25)'], [1, 'rgba(255,255,255,0.55)']]);
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(255,190,230,0.45)'; ctx.lineWidth = r * 0.06;
  ctx.beginPath(); ctx.arc(x, y, r * 0.94, Math.PI * 0.1, Math.PI * 0.7); ctx.stroke();
  ell(ctx, x - r * 0.38, y - r * 0.4, r * 0.2, r * 0.12, 'rgba(255,255,255,0.85)', -0.7);
  ctx.restore();
}
WORLDS.kids = {
  playOf: p => Ease.inOut(clamp01((p - 0.4) / 0.5)),
  spec(st) {
    const p = st.p ?? 0, t = st.t || 0, q = Ease.inOut(p), S0 = SUBJECT.kids;
    const play = this.playOf(p);
    const d = drift(t * (1 + play), 8);
    return { x: S0.x + d.dx + Math.sin(t * 2.3) * 10 * play, y: lerp(S0.y0, S0.y1, p) + d.dy + Math.sin(t * 5.2) * 6 * play, s: lerp(150, 135, q), roll: d.roll + Math.sin(t * 2.3) * 0.05 * play, look: LOOKS.kai, light: LIGHTS.shade, pitch: lerp(1, 0, q), forced: play < 0.5, smile: play < 0.5 ? 0.9 : 0.6, laugh: play > 0.5 ? 0.6 + 0.4 * Math.abs(Math.sin(t * 3.1)) : 0, gaze: play > 0.5 ? [0.7, -0.4] : [0, -0.6] };
  },
  draw(ctx, st) {
    const p = st.p ?? 0, t = st.t || 0, q = Ease.inOut(p);
    backdrop(ctx, 'play', lerp(3, 12, q));
    bokeh(ctx, PLAY_BOKEH, q);
    const P = this.spec(st);
    drawPortrait(ctx, P);
    const play = this.playOf(p);
    if (play > 0) {
      const y = lerp(SUBJECT.kids.y0, SUBJECT.kids.y1, p);
      for (const b of BUBBLES) {
        const by = y - 220 + b.y - ((t * 60 * b.sp + b.ph * 40) % 700);
        drawBubble(ctx, b.x + Math.sin(t * b.sp * 2 + b.ph) * 30, by, b.r, play * clamp01((by - (y - 700)) / 200));
      }
    }
  },
};

/** Full body: st.p lowers the camera from eye level to waist height. */
WORLDS.fullbody = {
  draw(ctx, st) {
    const q = Ease.inOut(st.p ?? 0);
    const S0 = SUBJECT.standing, k = S0.h / 100;
    // the horizon sits at the camera's height: their eyes, then their waist
    const horizon = lerp(S0.y - 85 * k, S0.y - 47 * k, q);
    backdrop(ctx, 'path', 6, { bake: true, dy: horizon });
    drawStanding(ctx, S0.x, S0.y, S0.h, { look: st.look || LOOKS.lin, light: LIGHTS.soft, smile: 0.6, camHigh: 1 - q, legs: '#3d5c86' });
  },
};

/** Selfie: st.p moves the phone from low and close to high, at arm's length, facing the window. */
WORLDS.selfie = {
  spec(st) {
    const p = st.p ?? 0, q = Ease.inOut(p), S0 = SUBJECT.selfie, t = st.t || 0, d = drift(t, 9);
    return { x: S0.x + d.dx, y: lerp(S0.y0, S0.y1, p) + d.dy, s: lerp(175, 150, q), roll: d.roll - 0.03 * (1 - q), look: st.look || LOOKS.ivy, light: lerpLight(LIGHTS.ceiling, LIGHTS.window, q), pitch: lerp(-1.25, 0.5, q), distort: lerp(1, 0.12, q), smile: lerp(0.2, 0.55, q), gaze: [0.05, lerp(0.5, -0.1, q)], blink: blinkAt(t, 9) };
  },
  draw(ctx, st) {
    const q = Ease.inOut(st.p ?? 0);
    backdrop(ctx, 'selfie', lerp(5, 12, q));
    bokeh(ctx, SELFIE_BOKEH, q);
    const P = this.spec(st);
    drawPortrait(ctx, P);
    // the arm holding the phone, reaching toward the camera
    const k = P.s / 100;
    const sx = P.x + 150 * k, sy = P.y + 230 * k;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = mixHex(P.look.top, P.look.topDark, 0.3);
    ctx.lineWidth = 110 * k;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx + 120 * k, sy + 120 * k, sx + lerp(200, 260, q) * k, sy + 420 * k); ctx.stroke();
    ctx.restore();
  },
};

/* ---------- the homework's open-shade portrait ---------- */
WORLDS.hwShade = {
  draw(ctx, st) {
    backdrop(ctx, 'noon', 9, { bake: true });
    const t = st.t || 0, d = drift(t, 10);
    drawPortrait(ctx, { x: 2300 + d.dx, y: 820 + d.dy, s: 140, look: LOOKS.maya, light: LIGHTS.shade, smile: 0.55, blink: blinkAt(t, 10) });
  },
};
