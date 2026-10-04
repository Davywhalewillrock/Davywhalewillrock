/*
 * The places each lesson is photographed in. A world is { w, h, draw(ctx, st) }
 * drawn in its own units; scenes pick camera rectangles inside it.
 * st.t is the scene clock (for small ambient motion); some worlds take extra params.
 */
'use strict';

const WORLDS = {};

function scrollItems(x0, x1, spacing, shift, fn) {
  const a = Math.floor((x0 + shift) / spacing) - 1, b = Math.ceil((x1 + shift) / spacing) + 1;
  for (let i = a; i <= b; i++) fn(i * spacing - shift, i);
}
function hillScroll(ctx, x0, x1, baseY, amp, period, seed, fill, bottom, shift) {
  ctx.beginPath();
  ctx.moveTo(x0, bottom);
  const n = 120;
  for (let i = 0; i <= n; i++) { const x = x0 + ((x1 - x0) * i) / n; ctx.lineTo(x, baseY - amp * wave((x + shift) / period, seed)); }
  ctx.lineTo(x1, bottom);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}
function stoneWall(ctx, x0, x1, y0, y1, seed) {
  const rnd = mulberry32(seed);
  ctx.fillStyle = '#a2967f';
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  const rowH = 56;
  let y = y0 + 22, row = 0;
  while (y < y1) {
    let x = x0 - (row % 2) * 55;
    while (x < x1) {
      const w = 88 + rnd() * 72;
      rr(ctx, x + 3, y + 3, w - 6, rowH - 6, 12, ['#cfc4b1', '#c3b6a2', '#d8cebe', '#bcae99'][Math.floor(rnd() * 4)]);
      x += w;
    }
    y += rowH;
    row++;
  }
  let x = x0;
  while (x < x1) {
    const w = 150 + rnd() * 90;
    rr(ctx, x + 3, y0 - 12, w - 6, 34, 8, '#e0d7c7');
    x += w;
  }
  ctx.fillStyle = lg(ctx, 0, y0, 0, y1, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(40,30,20,0.25)']]);
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
}
function flowerPot(ctx, x, y, s, plant = '#4d8a3e', bloom = '#e85d75') {
  const k = s / 100;
  bush(ctx, x, y - 70 * k, 90 * k, plant, Math.round(x), { n: 5 });
  flowers(ctx, x - 40 * k, x + 40 * k, y - 120 * k, y - 80 * k, 7, [bloom], Math.round(y), 9 * k);
  poly(ctx, [[x - 38 * k, y - 78 * k], [x + 38 * k, y - 78 * k], [x + 28 * k, y], [x - 28 * k, y]], '#c4683f');
  rr(ctx, x - 42 * k, y - 86 * k, 84 * k, 14 * k, 3 * k, '#d77a4f');
}

/* ---------- 0. busy park (the big idea) ---------- */
WORLDS.park = {
  w: 2400, h: 1600,
  kid: { x: 1840, y: 1185, h: 270 },
  clutter: [
    { x: 600, y: 760, rx: 70, ry: 380 },   // lamp post
    { x: 175, y: 520, rx: 120, ry: 400 },  // utility pole and wires
    { x: 1112, y: 1005, rx: 75, ry: 80 },  // bin
    { x: 1450, y: 925, rx: 115, ry: 110 }, // ice-cream cart
    { x: 150, y: 1240, rx: 120, ry: 230 }, // person cut by the edge
  ],
  draw(ctx, st) {
    const t = st.t || 0;
    sky(ctx, -400, -400, 2800, 900, [[0, '#86c3ea'], [1, '#dcf0f6']]);
    cloud(ctx, 430, 230, 70, 'rgba(255,255,255,0.92)');
    cloud(ctx, 1220, 150, 52, 'rgba(255,255,255,0.86)');
    cloud(ctx, 2060, 260, 64, 'rgba(255,255,255,0.92)');
    buildingRow(ctx, -300, 2700, 800, 7, ['#b7c6d3', '#adbecc', '#c3d0da'], 130, 330, 'rgba(255,255,255,0.4)');
    ctx.fillStyle = '#a9c79a';
    ctx.fillRect(-400, 796, 3200, 120);
    // utility pole and sagging wires
    rr(ctx, 164, 140, 24, 820, 6, '#5a4636');
    rr(ctx, 104, 182, 144, 15, 4, '#5a4636');
    ctx.lineCap = 'round';
    curve(ctx, [[112, 186], [1250, 470], [2700, 250]], '#2d2a28', 3.5);
    curve(ctx, [[176, 186], [1300, 430], [2700, 280]], '#2d2a28', 3.5);
    curve(ctx, [[240, 186], [1350, 500], [2700, 320]], '#2d2a28', 3.5);
    // tree line
    const rnd = mulberry32(3);
    for (let i = 0; i < 16; i++) {
      const x = -120 + i * 175 + rnd() * 60;
      roundTree(ctx, x, 872, 300 + rnd() * 140, { leaf: ['#4f8a45', '#467e3e', '#5a9850'][i % 3], trunk: '#5e4532', branches: false });
    }
    // lawn
    ctx.fillStyle = lg(ctx, 0, 840, 0, 1600, [[0, '#94c76c'], [1, '#6aa64c']]);
    ctx.fillRect(-400, 846, 3200, 900);
    grassTufts(ctx, -100, 2500, 900, 1600, 260, 'rgba(60,110,40,0.35)', 5, 26);
    // path
    ctx.beginPath();
    ctx.moveTo(-60, 1600);
    ctx.bezierCurveTo(240, 1330, 700, 1080, 1120, 900);
    ctx.lineTo(1250, 870);
    ctx.bezierCurveTo(1000, 1000, 640, 1300, 560, 1600);
    ctx.closePath();
    ctx.fillStyle = '#e4d2ab';
    ctx.fill();
    // far figures
    figure(ctx, 1010, 905, 150, { top: '#3c6e71', hair: '#2b1d14', back: true });
    figure(ctx, 430, 965, 225, { top: '#e07a5f', bottom: '#3d405b', hair: '#5b3a29', hairStyle: 'long', walk: t * 5 });
    figure(ctx, 492, 970, 232, { top: '#81b29a', bottom: '#2f3e46', hair: '#1f1a17', walk: t * 5 + 2 });
    lampPost(ctx, 1385, 910, 300);
    iceCart(ctx, 1450, 1010, 175);
    bench(ctx, 930, 1040, 240);
    // reader on the bench
    rr(ctx, 905, 925, 50, 70, 14, '#4a6fa5');
    circ(ctx, 930, 905, 21, '#c68b6e');
    ctx.beginPath(); ctx.ellipse(930, 899, 22, 18, 0, Math.PI, TAU); ctx.fillStyle = '#3a2a20'; ctx.fill();
    rr(ctx, 908, 950, 46, 28, 3, '#f3efe6');
    rr(ctx, 905, 990, 18, 50, 6, '#2e3440');
    rr(ctx, 937, 990, 18, 50, 6, '#2e3440');
    bin(ctx, 1112, 1065, 112);
    figure(ctx, 1262, 1150, 290, { top: '#ff8c42', bottom: '#264653', hair: '#2a1a12', walk: t * 6.5, face: true });
    lampPost(ctx, 600, 1120, 560);
    sign(ctx, 360, 1180, 165);
    for (let i = 0; i < 6; i++) pigeon(ctx, 980 + i * 34 + (i % 2) * 12, 1290 + (i % 3) * 22, 30, i % 2 ? 1 : -1);
    // people near the camera, one cut by the left edge
    figure(ctx, 150, 1470, 440, { top: '#c94f6d', bottom: '#2d3142', hair: '#2b1d14', hairStyle: 'bun', walk: t * 4.6 });
    figure(ctx, 760, 1480, 400, { top: '#6a4c93', bottom: '#1f2933', hair: '#3b2416', hairStyle: 'long', arms: 'phone', face: true, lookX: 0.15 });
    // the subject: a child with a red balloon
    const K = this.kid;
    const fig = figure(ctx, K.x, K.y, K.h, { kid: true, top: '#f2c230', bottom: '#2f5d8a', hair: '#3b2416', hairStyle: 'curly', arms: 'raise', face: true, look: 'up', lookX: 0.12, shoe: '#d64545' });
    balloon(ctx, fig.hand[0], fig.hand[1], 1915, 808, 44, '#e2363b', t);
  },
};

/* ---------- 1. cat on a garden wall (get closer) ---------- */
WORLDS.cat = {
  w: 2400, h: 1600,
  draw(ctx, st) {
    const t = st.t || 0;
    sky(ctx, -400, -400, 2800, 640, [[0, '#9ccff0'], [1, '#e4f3f8']]);
    cloud(ctx, 1450, 170, 58, 'rgba(255,255,255,0.92)');
    cloud(ctx, 760, 110, 40, 'rgba(255,255,255,0.85)');
    // house on the right
    ctx.fillStyle = '#efe0c3';
    ctx.fillRect(1830, 110, 900, 1000);
    rr(ctx, 1790, 70, 960, 54, 6, '#b5543a');
    rr(ctx, 1968, 300, 270, 330, 10, '#ffffff');
    rr(ctx, 1986, 318, 234, 294, 4, '#86b6d8');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(2097, 318, 12, 294);
    ctx.fillRect(1986, 459, 234, 12);
    rr(ctx, 1950, 626, 306, 22, 4, '#e8dcc6');
    rr(ctx, 1848, 110, 18, 1000, 6, '#c9c1b2');
    // garden tree on the left
    roundTree(ctx, 330, 1060, 940, { leaf: '#4b8b43', trunk: '#6b4a32' });
    // hedge and flowers
    hill(ctx, -400, 1840, 560, 26, 55, 3, '#3f6e3a', 1120);
    flowers(ctx, -300, 1810, 640, 1000, 90, ['rgba(120,170,90,0.55)'], 21, 16);
    flowers(ctx, -100, 1810, 985, 1055, 80, ['#e86a9a', '#b07cd8', '#f4d35e', '#ffffff'], 11, 12);
    // stone wall with the cat on top
    stoneWall(ctx, -400, 2800, 1055, 1320, 4);
    ctx.fillStyle = lg(ctx, 0, 1300, 0, 1600, [[0, '#86b85f'], [1, '#6a9e4b']]);
    ctx.fillRect(-400, 1310, 3200, 400);
    grassTufts(ctx, -200, 2600, 1330, 1600, 120, 'rgba(50,100,35,0.4)', 8, 26);
    flowerPot(ctx, 640, 1450, 170);
    flowerPot(ctx, 1990, 1480, 190, '#4d8a3e', '#f2b134');
    // watering can
    rr(ctx, 1560, 1360, 120, 90, 18, '#4f9a6e');
    curve(ctx, [[1680, 1400], [1740, 1350], [1770, 1300]], '#4f9a6e', 14);
    ctx.beginPath(); ctx.arc(1620, 1360, 42, Math.PI, TAU); ctx.strokeStyle = '#3f7f5a'; ctx.lineWidth = 10; ctx.stroke();
    const ph = (t + 1.3) % 4.4;
    cat(ctx, 1300, 1052, 250, { blink: ph < 0.22 ? Math.sin((ph / 0.22) * Math.PI) : 0 });
  },
};

/* ---------- 2. lone tree at sunset (rule of thirds) ---------- */
WORLDS.sunset = {
  w: 3000, h: 2000,
  draw(ctx, st) {
    const t = st.t || 0;
    sky(ctx, -600, -600, 3600, 1210, [[0, '#1f2a55'], [0.38, '#4b3e77'], [0.66, '#c35f7b'], [0.82, '#f08a5d'], [0.93, '#ffb867'], [1, '#ffd98e']]);
    for (const [x, y, w, h] of [[880, 730, 560, 20], [1660, 650, 700, 16], [2380, 780, 460, 14], [1230, 870, 400, 11], [2100, 900, 300, 9]]) ell(ctx, x, y, w / 2, h / 2, 'rgba(255,175,150,0.5)');
    sunDisc(ctx, 1480, 1046, 60, '#fff3cf', 'rgba(255,214,140,0.7)', 440);
    mountains(ctx, [[-600, 1120], [150, 1045], [650, 1090], [1100, 1012], [1600, 1082], [2050, 1030], [2600, 1095], [3600, 1050]], 'rgba(118,78,128,0.8)', 1200, 5, 0.25);
    mountains(ctx, [[-600, 1150], [400, 1112], [900, 1136], [1500, 1104], [2200, 1136], [3600, 1112]], '#5a3f5f', 1200, 9, 0.2);
    ctx.fillStyle = lg(ctx, 0, 1146, 0, 2000, [[0, '#4a3830'], [1, '#1b1613']]);
    ctx.fillRect(-600, 1148, 4200, 1000);
    ell(ctx, 2000, 1262, 760, 100, '#261d19');
    hill(ctx, -600, 3600, 1330, 30, 210, 2, '#211915', 2100);
    roundTree(ctx, 2000, 1176, 450, { leaf: '#1a1412', trunk: '#1a1412', shade: false, crown: 0.29, wide: 1.3 });
    grassTufts(ctx, 1500, 2500, 1165, 1200, 60, '#1a1412', 9, 22);
    const flap = Math.sin(t * 6) * 0.15;
    bird(ctx, 1240, 690, 16 * (1 + flap), '#2a1d2a');
    bird(ctx, 1290, 730, 12 * (1 - flap), '#2a1d2a');
    bird(ctx, 1190, 750, 10 * (1 + flap), '#2a1d2a');
  },
};

/* ---------- 3. runner on a coastal path (room to move) ---------- */
WORLDS.run = {
  w: 2400, h: 1600,
  runner: { x: 1200, y: 1010, h: 360 },
  draw(ctx, st) {
    const t = st.t || 0;
    const off = t * 1150;
    sky(ctx, -1200, -600, 3600, 740, [[0, '#8cc6ee'], [1, '#f6e6c8']]);
    sunDisc(ctx, 420, 420, 40, '#fff8de', 'rgba(255,240,200,0.6)', 260);
    cloud(ctx, 1500 - off * 0.01, 230, 52, 'rgba(255,255,255,0.9)');
    ctx.fillStyle = '#5c9fc6';
    ctx.fillRect(-1200, 720, 4800, 140);
    hillScroll(ctx, -1200, 3600, 726, 22, 150, 4, '#9cb7c5', 760, off * 0.03);
    hillScroll(ctx, -1200, 3600, 815, 38, 260, 7, '#86b36c', 1100, off * 0.22);
    scrollItems(-1200, 3600, 230, off * 0.24, (x, i) => {
      const r = mulberry32(i * 7919 + 1);
      if (r() < 0.55) roundTree(ctx, x, 840 + r() * 20, 150 + r() * 90, { leaf: r() < 0.5 ? '#5f9a52' : '#4f8746', branches: false });
    });
    ctx.fillStyle = '#7fb062';
    ctx.fillRect(-1200, 860, 4800, 140);
    // fence behind the path
    scrollItems(-1200, 3600, 240, off * 0.7, x => rr(ctx, x - 9, 880, 18, 112, 4, '#8b6a4c'));
    ctx.fillStyle = '#9a7856';
    ctx.fillRect(-1200, 902, 4800, 12);
    ctx.fillRect(-1200, 944, 4800, 12);
    // path
    ctx.fillStyle = '#dcc8a1';
    ctx.fillRect(-1200, 985, 4800, 125);
    scrollItems(-1200, 3600, 70, off, (x, i) => { const r = mulberry32(i * 31 + 7); ell(ctx, x + r() * 40, 1000 + r() * 95, 6 + r() * 6, 3 + r() * 2, 'rgba(150,125,90,0.45)'); });
    ctx.fillStyle = '#7aa95a';
    ctx.fillRect(-1200, 1108, 4800, 600);
    scrollItems(-1200, 3600, 95, off * 1.2, (x, i) => { const r = mulberry32(i * 13 + 3); grassTufts(ctx, x, x + 40, 1130 + r() * 300, 1140 + r() * 320, 2, 'rgba(50,100,35,0.5)', i, 30); });
    const R = this.runner;
    ell(ctx, R.x + 8, R.y + 4, 70, 9, 'rgba(60,45,25,0.25)');
    runner(ctx, R.x, R.y, R.h, t * TAU * 1.45);
  },
};

/* ---------- 4. pier and lighthouse (leading lines) ---------- */
WORLDS.pier = {
  w: 2400, h: 1600,
  HY: 760, VX: 1500, f: 840,
  lighthouseTop: [1500, 840 - (840 * 4.3) / 10.6],
  draw(ctx, st) {
    const t = st.t || 0;
    const { HY, VX, f } = this;
    const P = (X, Z, Y = 0) => [VX + (f * X) / Z, HY + (f * (1 - Y)) / Z];
    sky(ctx, -400, -400, 2800, HY, [[0, '#2c4a7c'], [0.45, '#8a7aa6'], [0.8, '#f29d78'], [1, '#ffd79c']]);
    for (const [x, y, w, h] of [[420, 420, 520, 18], [1100, 330, 640, 16], [1900, 460, 520, 14], [850, 560, 360, 10]]) ell(ctx, x, y, w / 2, h / 2, 'rgba(255,190,160,0.5)');
    sunDisc(ctx, 640, 728, 46, '#fff2cf', 'rgba(255,214,150,0.65)', 380);
    ctx.fillStyle = lg(ctx, 0, HY, 0, 1600, [[0, '#7383a5'], [0.25, '#4d5f87'], [1, '#26324f']]);
    ctx.fillRect(-400, HY, 3200, 900);
    const rnd = mulberry32(12);
    ctx.lineCap = 'round';
    for (let i = 0; i < 70; i++) {
      const z = 1.1 + rnd() * 11;
      const y = HY + f / z;
      const x = 640 + (rnd() - 0.5) * (300 / z + 50);
      const len = 70 / z + 8;
      const a = 0.35 + 0.35 * Math.sin(t * 3 + i * 1.7);
      line(ctx, x - len / 2, y, x + len / 2, y, `rgba(255,214,160,${a})`, Math.max(1.5, 10 / z));
    }
    const posts = [1.0, 1.32, 1.72, 2.25, 2.95, 3.85, 5.0, 6.5, 8.4, 10.0];
    for (const Z of posts) for (const X of [-0.9, 0.9]) {
      const [x0, y0] = P(X, Z, 0), [, y1] = P(X, Z, -0.6);
      ctx.fillStyle = '#3a2a20';
      ctx.fillRect(x0 - (f * 0.035) / Z, y0, (f * 0.07) / Z, y1 - y0);
    }
    poly(ctx, [P(-0.9, 1), P(-0.9, 10), P(0.9, 10), P(0.9, 1)], lg(ctx, 0, HY + f / 10, 0, HY + f, [[0, '#b99470'], [1, '#86603f']]));
    ctx.strokeStyle = 'rgba(70,48,30,0.55)';
    for (let Z = 1; Z < 10; Z *= 1.1) {
      const [x0, y0] = P(-0.9, Z), [x1] = P(0.9, Z);
      ctx.lineWidth = Math.max(1, 6 / Z);
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y0); ctx.stroke();
    }
    ctx.lineWidth = 2;
    for (let X = -0.6; X <= 0.61; X += 0.3) { const a = P(X, 1), b = P(X, 10); line(ctx, a[0], a[1], b[0], b[1], 'rgba(70,48,30,0.35)', 2); }
    lighthouse(ctx, VX, HY + f / 10.6, (f * 4.3) / 10.6, 0.8 + 0.2 * Math.sin(t * 2));
    for (const X of [-0.9, 0.9]) {
      for (const Y of [0.3, 0.56]) {
        poly(ctx, [P(X, 1, Y + 0.03), P(X, 10, Y + 0.03), P(X, 10, Y - 0.03), P(X, 1, Y - 0.03)], '#6e4c34');
      }
      for (const Z of posts) {
        const [x0, y0] = P(X, Z, 0), [, y1] = P(X, Z, 0.62);
        const w = (f * 0.07) / Z;
        ctx.fillStyle = '#58402d';
        ctx.fillRect(x0 - w / 2, y1, w, y0 - y1);
      }
    }
  },
};

/* ---------- 5. portrait on a city street (check the background) ---------- */
WORLDS.street = {
  w: 2400, h: 1600,
  head: [1200, 760],
  draw(ctx, st) {
    const step = st.step || 0;
    const far = -240 * step, mid = -700 * step;
    sky(ctx, -600, -400, 3000, 900, [[0, '#bcdcef'], [1, '#eef5f6']]);
    ctx.save();
    ctx.translate(far, 0);
    buildingRow(ctx, -900, 3400, 860, 21, ['#e6d6be', '#dac5a5', '#d1bea4', '#e3d2bb'], 420, 760, 'rgba(110,130,150,0.38)');
    const r2 = mulberry32(9);
    for (let i = 0; i < 14; i++) roundTree(ctx, -800 + i * 300 + r2() * 80, 900, 360 + r2() * 120, { leaf: '#7aa56a', trunk: '#6a5240', branches: false, hi: 'rgba(255,255,255,0.1)' });
    ctx.restore();
    ctx.fillStyle = '#c9c2b6';
    ctx.fillRect(-600, 880, 3600, 900);
    ctx.fillStyle = '#b5ad9f';
    for (let x = -600; x < 3000; x += 160) ctx.fillRect(x + far * 1.6, 880, 4, 900);
    ctx.save();
    ctx.translate(mid, 0);
    bush(ctx, 380, 1180, 520, '#4c7d45', 3);
    bush(ctx, 2480, 1180, 560, '#4c7d45', 6);
    roundTree(ctx, 1900, 1300, 1150, { leaf: '#3a7042', trunk: '#4a3626', hi: 'rgba(255,255,255,0.1)', lo: 'rgba(0,0,0,0.22)' });
    bush(ctx, 1900, 1240, 820, '#3c6d3f', 8);
    lampPost(ctx, 1200, 1290, 730, '#26302b');
    bin(ctx, 760, 1300, 170, '#c0392b');
    ctx.restore();
    const [hx, hy] = this.head;
    portrait(ctx, hx, hy, 120, { top: '#e0a73e', topDark: '#b8862e', hair: '#4a2618' });
  },
};

/* ---------- 6. open sea (keep it level) ---------- */
WORLDS.sea = {
  w: 2400, h: 1600,
  draw(ctx, st) {
    const t = st.t || 0;
    sky(ctx, -900, -900, 3300, 800, [[0, '#4a98d4'], [1, '#d3eaf4']]);
    sunDisc(ctx, 1760, 300, 46, '#fffbe8', 'rgba(255,250,220,0.6)', 320);
    cloud(ctx, 620, 340, 72, 'rgba(255,255,255,0.93)');
    cloud(ctx, 1320, 210, 48, 'rgba(255,255,255,0.88)');
    cloud(ctx, 2150, 420, 40, 'rgba(255,255,255,0.85)');
    ctx.beginPath(); ctx.ellipse(560, 800, 360, 44, 0, Math.PI, TAU); ctx.fillStyle = '#7a9eae'; ctx.fill();
    ctx.beginPath(); ctx.ellipse(780, 800, 160, 26, 0, Math.PI, TAU); ctx.fillStyle = '#6c92a4'; ctx.fill();
    ctx.fillStyle = lg(ctx, 0, 800, 0, 1700, [[0, '#2f78ad'], [1, '#164673']]);
    ctx.fillRect(-900, 800, 4200, 1500);
    const rnd = mulberry32(4);
    ctx.lineCap = 'round';
    for (let i = 0; i < 90; i++) {
      const y = 810 + Math.pow(rnd(), 1.6) * 900;
      const x = -600 + rnd() * 3600 + Math.sin(t * 0.8 + i) * 6;
      const w = 20 + (y - 800) * 0.09;
      line(ctx, x, y, x + w, y, 'rgba(255,255,255,0.22)', 1.5 + (y - 800) * 0.006);
    }
    for (let i = 0; i < 40; i++) {
      const y = 806 + Math.pow(rnd(), 1.4) * 600;
      const x = 1760 + (rnd() - 0.5) * (60 + (y - 800) * 0.5);
      const a = 0.3 + 0.4 * Math.max(0, Math.sin(t * 3 + i * 2.1));
      line(ctx, x - 12, y, x + 12, y, `rgba(255,252,230,${a})`, 3);
    }
    sailboat(ctx, 1450 + Math.sin(t * 0.5) * 4, 822, 210);
    bird(ctx, 980, 520, 14, '#30485c');
    bird(ctx, 1030, 560, 10, '#30485c');
  },
};

/* ---------- 7. view through a stone arch (frame within a frame) ---------- */
WORLDS.arch = {
  w: 2400, h: 1600,
  church: [1450, 700],
  draw(ctx, st) {
    const t = st.t || 0;
    sky(ctx, -400, -400, 2800, 880, [[0, '#3a8ad3'], [1, '#c3e4f4']]);
    cloud(ctx, 980, 420, 46, 'rgba(255,255,255,0.92)');
    cloud(ctx, 1640, 330, 34, 'rgba(255,255,255,0.88)');
    ctx.fillStyle = lg(ctx, 0, 860, 0, 1400, [[0, '#2a90b5'], [1, '#17668d']]);
    ctx.fillRect(-400, 860, 3200, 800);
    ctx.beginPath(); ctx.ellipse(700, 862, 210, 26, 0, Math.PI, TAU); ctx.fillStyle = '#8ab0bf'; ctx.fill();
    sailboat(ctx, 930 + Math.sin(t * 0.6) * 3, 930, 90);
    // hillside village
    ctx.beginPath();
    ctx.moveTo(980, 1400);
    ctx.bezierCurveTo(1100, 860, 1350, 640, 1700, 600);
    ctx.bezierCurveTo(1950, 590, 2300, 700, 2600, 760);
    ctx.lineTo(2600, 1400);
    ctx.closePath();
    ctx.fillStyle = '#c99a63';
    ctx.fill();
    const rnd = mulberry32(17);
    const houses = [];
    for (let i = 0; i < 26; i++) {
      const x = 1080 + rnd() * 1200;
      const yTop = x < 1700 ? lerp(900, 610, (x - 1080) / 620) : 600 + (x - 1700) * 0.25;
      houses.push([x, yTop + 30 + rnd() * 260, 50 + rnd() * 55, 40 + rnd() * 40]);
    }
    houses.sort((a, b) => a[1] - b[1]);
    for (const [x, y, w, h] of houses) {
      ctx.fillStyle = '#f7f4ee'; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#cfd8e3'; ctx.fillRect(x + w, y + 4, w * 0.28, h - 4);
      ctx.fillStyle = '#2f6fa3'; ctx.fillRect(x + w * 0.35, y + h * 0.45, w * 0.18, h * 0.3);
    }
    const [cx, cy] = this.church;
    ctx.fillStyle = '#fbf9f4'; ctx.fillRect(cx - 50, cy - 10, 100, 120);
    ctx.fillStyle = '#d5dde6'; ctx.fillRect(cx + 50, cy - 4, 26, 114);
    ctx.beginPath(); ctx.arc(cx, cy - 10, 46, Math.PI, TAU); ctx.fillStyle = '#2d6db5'; ctx.fill();
    ctx.fillStyle = '#fbf9f4'; ctx.fillRect(cx - 4, cy - 82, 8, 28);
    ctx.fillRect(cx - 12, cy - 74, 24, 6);
    rr(ctx, cx - 14, cy + 40, 28, 54, 12, '#2d6db5');
    bush(ctx, 1240, 1000, 120, '#c2368f', 5, { n: 4 });
    // terrace floor
    ctx.fillStyle = '#cdbb9f';
    ctx.fillRect(-400, 1330, 3200, 400);
    ctx.fillStyle = '#e4d6bf';
    ctx.fillRect(-400, 1318, 3200, 18);
    ctx.strokeStyle = 'rgba(120,100,75,0.4)';
    ctx.lineWidth = 3;
    for (let x = 500; x < 1900; x += 90) { ctx.beginPath(); ctx.moveTo(1200 + (x - 1200) * 0.6, 1336); ctx.lineTo(1200 + (x - 1200) * 1.6, 1600); ctx.stroke(); }
    // the wall and its arch (inner face first, then the front face)
    const opening = (dx, inset) => {
      ctx.moveTo(770 + inset + dx, 1700);
      ctx.lineTo(770 + inset + dx, 760);
      ctx.arc(1200 + dx, 760, 430 - inset, Math.PI, 0);
      ctx.lineTo(1630 - inset + dx, 1700);
      ctx.closePath();
    };
    ctx.beginPath(); opening(0, 0); opening(34, 34);
    ctx.fillStyle = '#6a5442'; ctx.fill('evenodd');
    ctx.beginPath(); ctx.rect(-400, -400, 3200, 2400); opening(0, 0);
    ctx.fillStyle = '#3e3129'; ctx.fill('evenodd');
    ctx.save();
    ctx.beginPath(); ctx.rect(-400, -400, 3200, 2400); opening(0, 0); ctx.clip('evenodd');
    ctx.strokeStyle = 'rgba(20,14,10,0.55)';
    ctx.lineWidth = 6;
    let row = 0;
    for (let y = -380; y < 1700; y += 74, row++) {
      ctx.beginPath(); ctx.moveTo(-400, y); ctx.lineTo(2800, y); ctx.stroke();
      for (let x = -400 + (row % 2) * 70; x < 2800; x += 140) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 74); ctx.stroke(); }
    }
    ctx.fillStyle = '#463830';
    ctx.beginPath(); ctx.arc(1200, 760, 540, Math.PI, 0); ctx.lineTo(1740, 1700); ctx.lineTo(660, 1700); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(20,14,10,0.6)';
    for (let i = 0; i <= 14; i++) {
      const a = Math.PI + (i / 14) * Math.PI;
      ctx.beginPath(); ctx.moveTo(1200 + Math.cos(a) * 430, 760 + Math.sin(a) * 430); ctx.lineTo(1200 + Math.cos(a) * 540, 760 + Math.sin(a) * 540); ctx.stroke();
    }
    for (let y = 820; y < 1700; y += 90) for (const x0 of [660, 1630]) { ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + 110, y); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(1200, 760, 540, Math.PI, 0); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = lg(ctx, 0, -400, 0, 1600, [[0, 'rgba(0,0,0,0.25)'], [0.5, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.3)']]);
    ctx.beginPath(); ctx.rect(-400, -400, 3200, 2400); opening(0, 0); ctx.fill('evenodd');
    flowerPot(ctx, 700, 1600, 260, '#3f7a3d', '#d94f8a');
  },
};

/* ---------- 8. dog in a park, from two heights (change your angle) ---------- */
WORLDS.dogHigh = {
  w: 2400, h: 1600,
  draw(ctx, st) {
    const t = st.t || 0;
    ctx.fillStyle = lg(ctx, 0, 0, 0, 1600, [[0, '#7fb257'], [1, '#6c9f49']]);
    ctx.fillRect(-400, -400, 3200, 2400);
    grassTufts(ctx, -200, 2600, 0, 1600, 520, 'rgba(45,95,30,0.35)', 13, 30);
    grassTufts(ctx, -200, 2600, 0, 1600, 260, 'rgba(170,215,120,0.35)', 29, 24);
    flowers(ctx, 300, 2200, 300, 1500, 26, ['#ffffff', '#f6e27a'], 5, 9);
    ell(ctx, 760, 620, 30, 14, '#c58a3c', 0.6);
    ell(ctx, 1700, 1210, 26, 12, '#b9772f', -0.4);
    ell(ctx, 1200, 1018, 150, 40, 'rgba(30,50,20,0.25)');
    dogFromAbove(ctx, 1200, 1000, 330, { t });
    circ(ctx, 1460, 1060, 30, '#d7e34a');
    curve(ctx, [[1438, 1046], [1460, 1062], [1484, 1050]], '#f4f7d8', 3);
    // the photographer's own shoes at the bottom of the frame
    for (const sx of [1020, 1380]) {
      rr(ctx, sx - 78, 1262, 156, 240, 70, '#3d4a5c');
      rr(ctx, sx - 78, 1262, 156, 60, 30, '#f2efe8');
      rr(ctx, sx - 60, 1350, 120, 12, 6, 'rgba(255,255,255,0.45)');
      for (let i = 0; i < 3; i++) line(ctx, sx - 34, 1382 + i * 22, sx + 34, 1382 + i * 22, 'rgba(255,255,255,0.55)', 6);
    }
  },
};
WORLDS.dogLow = {
  w: 2400, h: 1600,
  draw(ctx, st) {
    const t = st.t || 0;
    sky(ctx, -400, -400, 2800, 800, [[0, '#a5d3ef'], [1, '#e9f4f6']]);
    cloud(ctx, 760, 380, 54, 'rgba(255,255,255,0.92)');
    cloud(ctx, 1840, 300, 40, 'rgba(255,255,255,0.88)');
    const rnd = mulberry32(31);
    for (let i = 0; i < 18; i++) roundTree(ctx, -200 + i * 160 + rnd() * 60, 806, 150 + rnd() * 90, { leaf: ['#8fb8a0', '#7faa92'][i % 2], branches: false, shade: false });
    ctx.fillStyle = lg(ctx, 0, 800, 0, 1600, [[0, '#9cc873'], [1, '#6ea24b']]);
    ctx.fillRect(-400, 800, 3200, 900);
    grassTufts(ctx, -200, 2600, 820, 1600, 240, 'rgba(45,95,30,0.35)', 7, 40);
    flowers(ctx, -200, 2600, 1100, 1580, 22, ['#ffffff', '#f6e27a'], 15, 12);
    circ(ctx, 940, 1222, 40, '#d7e34a');
    curve(ctx, [[910, 1205], [940, 1226], [972, 1210]], '#f4f7d8', 4);
    ell(ctx, 1300, 1240, 200, 26, 'rgba(30,50,20,0.25)');
    dog(ctx, 1300, 1240, 560, { t });
  },
};

/** The same dog from ground level, looking up against the sky (homework's "new angle"). */
WORLDS.dogWorm = {
  w: 2400, h: 1600,
  draw(ctx, st) {
    const t = st.t || 0;
    sky(ctx, -400, -400, 2800, 1500, [[0, '#4f9fdc'], [1, '#d4ecf6']]);
    sunDisc(ctx, 520, 360, 50, '#fffbe8', 'rgba(255,250,220,0.6)', 300);
    cloud(ctx, 1750, 330, 80, 'rgba(255,255,255,0.93)');
    cloud(ctx, 900, 210, 46, 'rgba(255,255,255,0.88)');
    const rnd = mulberry32(5);
    for (let i = 0; i < 14; i++) roundTree(ctx, -200 + i * 210 + rnd() * 60, 1262, 90 + rnd() * 50, { leaf: '#8fb8a0', branches: false, shade: false });
    ctx.fillStyle = '#86b866';
    ctx.fillRect(-400, 1250, 3200, 500);
    dog(ctx, 1240, 1480, 980, { t });
    circ(ctx, 700, 1450, 90, '#d7e34a');
    curve(ctx, [[630, 1410], [700, 1458], [772, 1420]], '#f4f7d8', 8);
    // tall blades of grass right in front of the lens
    ctx.lineCap = 'round';
    for (let i = 0; i < 70; i++) {
      const x = -300 + rnd() * 3000, h = 120 + rnd() * 260, lean = (rnd() - 0.5) * 120;
      curve(ctx, [[x, 1620], [x + lean * 0.4, 1620 - h * 0.6], [x + lean, 1620 - h]], i % 3 ? '#4f8a3c' : '#3f7a31', 14 + rnd() * 10);
    }
  },
};

/* ---------- 9. boathouse reflected in a still lake (symmetry) ---------- */
WORLDS.lake = {
  w: 2400, h: 1600,
  drawAbove(ctx) {
    sky(ctx, -600, -600, 3000, 802, [[0, '#86aed4'], [0.72, '#e3ccc6'], [1, '#f6d6bc']]);
    const peak = mountains(ctx, [[-600, 720], [150, 600], [700, 480], [1200, 300], [1700, 480], [2250, 600], [3000, 720]], '#8b9dbb', 805, 3, 0.16);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(peak[0][0], 805);
    for (const [x, y] of peak) ctx.lineTo(x, y);
    ctx.lineTo(peak[peak.length - 1][0], 805);
    ctx.closePath();
    ctx.clip();
    ctx.beginPath();
    ctx.moveTo(800, 380);
    for (let x = 800; x <= 1600; x += 40) ctx.lineTo(x, 400 + Math.abs(Math.sin(x * 0.05)) * 60 + Math.abs(x - 1200) * -0.15);
    ctx.lineTo(1600, 0); ctx.lineTo(800, 0); ctx.closePath();
    ctx.fillStyle = '#f4f2f2';
    ctx.fill();
    ctx.restore();
    mountains(ctx, [[-600, 760], [300, 650], [800, 700], [1200, 640], [1600, 700], [2100, 650], [3000, 760]], '#5f7891', 805, 8, 0.12);
    const rnd = mulberry32(44);
    for (let i = 0; i < 26; i++) {
      const d = 120 + i * 30 + rnd() * 20;
      const h = 130 + rnd() * 110;
      pine(ctx, 1200 - 260 - d, 806, h, '#2f4a3c');
      pine(ctx, 1200 + 260 + d + (rnd() - 0.5) * 16, 806, h * (0.94 + rnd() * 0.12), '#2f4a3c');
    }
    boathouse(ctx, 1200, 806, 360);
  },
  draw(ctx, st) {
    this.drawAbove(ctx, st);
    ctx.save();
    ctx.beginPath(); ctx.rect(-600, 806, 3600, 1200); ctx.clip();
    ctx.translate(0, 1612);
    ctx.scale(1, -1);
    this.drawAbove(ctx, st);
    ctx.restore();
    ctx.fillStyle = 'rgba(38,68,98,0.38)';
    ctx.fillRect(-600, 806, 3600, 1200);
    const t = st.t || 0;
    const rnd = mulberry32(8);
    for (let i = 0; i < 46; i++) {
      const y = 815 + Math.pow(rnd(), 1.5) * 800;
      const x = -400 + rnd() * 3200 + Math.sin(t * 0.6 + i) * 5;
      line(ctx, x, y, x + 40 + (y - 806) * 0.12, y, 'rgba(255,255,255,0.13)', 2 + (y - 806) * 0.004);
    }
  },
};

/* ---------- characters that live with their worlds ---------- */
function boathouse(ctx, x, y, w) {
  const k = w / 100;
  rr(ctx, x - 92 * k, y - 7 * k, 184 * k, 6 * k, 1 * k, '#6b4a32');
  for (const dx of [-84, -60, 60, 84]) rr(ctx, x + dx * k - 1.4 * k, y - 4 * k, 2.8 * k, 6 * k, 0, '#3b2a20');
  ctx.fillStyle = '#b23b30';
  ctx.beginPath();
  ctx.moveTo(x - 40 * k, y - 6 * k);
  ctx.lineTo(x - 40 * k, y - 46 * k);
  ctx.lineTo(x, y - 72 * k);
  ctx.lineTo(x + 40 * k, y - 46 * k);
  ctx.lineTo(x + 40 * k, y - 6 * k);
  ctx.closePath();
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = 'rgba(70,15,10,0.35)';
  ctx.lineWidth = 0.8 * k;
  for (let dx = -38; dx <= 38; dx += 4) { ctx.beginPath(); ctx.moveTo(x + dx * k, y - 75 * k); ctx.lineTo(x + dx * k, y); ctx.stroke(); }
  ctx.restore();
  for (const side of [-1, 1]) {
    poly(ctx, [[x, y - 77 * k], [x + side * 48 * k, y - 43 * k], [x + side * 48 * k, y - 38 * k], [x, y - 71 * k]], '#3a3f47');
    poly(ctx, [[x, y - 71 * k], [x + side * 46 * k, y - 39 * k], [x + side * 44 * k, y - 37 * k], [x, y - 68.5 * k]], '#f3efe6');
  }
  rr(ctx, x - 16 * k, y - 34 * k, 32 * k, 29 * k, 1 * k, '#f3efe6');
  rr(ctx, x - 13 * k, y - 31 * k, 26 * k, 26 * k, 0, '#2b1d18');
  line(ctx, x - 13 * k, y - 31 * k, x + 13 * k, y - 5 * k, 'rgba(243,239,230,0.6)', 1.2 * k);
  line(ctx, x + 13 * k, y - 31 * k, x - 13 * k, y - 5 * k, 'rgba(243,239,230,0.6)', 1.2 * k);
  for (const side of [-1, 1]) {
    rr(ctx, x + side * 28 * k - 6 * k, y - 36 * k, 12 * k, 12 * k, 1 * k, '#f3efe6');
    rr(ctx, x + side * 28 * k - 4.5 * k, y - 34.5 * k, 9 * k, 9 * k, 0, '#30424f');
    line(ctx, x + side * 28 * k, y - 34.5 * k, x + side * 28 * k, y - 25.5 * k, '#f3efe6', 0.8 * k);
  }
  circ(ctx, x, y - 52 * k, 6 * k, '#f3efe6');
  circ(ctx, x, y - 52 * k, 4.6 * k, '#30424f');
}

/** The same dog seen from standing height: big upturned face, foreshortened body. */
function dogFromAbove(ctx, x, y, s, o = {}) {
  const k = s / 100;
  const tan = '#c98b4a', white = '#f7f1e6';
  // body stretching away from the camera (up the frame)
  ell(ctx, x, y - 58 * k, 27 * k, 26 * k, tan);
  ell(ctx, x - 20 * k, y - 66 * k, 12 * k, 16 * k, tan);
  ell(ctx, x + 20 * k, y - 66 * k, 12 * k, 16 * k, tan);
  ctx.beginPath(); ctx.ellipse(x, y - 58 * k, 30 * k, 26 * k, 0, 0, TAU);
  shade(ctx, x, y - 60 * k, 30 * k, 'rgba(255,255,255,0.12)', 'rgba(70,30,0,0.2)', -0.6);
  curve(ctx, [[x + 14 * k, y - 80 * k], [x + 30 * k, y - 92 * k], [x + 40 * k + Math.sin((o.t || 0) * 9) * 4 * k, y - 86 * k]], tan, 6 * k);
  // front paws close to the camera
  for (const side of [-1, 1]) {
    rr(ctx, x + side * 10 * k - 5.5 * k, y - 14 * k, 11 * k, 14 * k, 5 * k, white);
    ell(ctx, x + side * 10 * k, y - 1 * k, 8 * k, 5 * k, white);
  }
  dogHead(ctx, x, y - 34 * k, k * 1.18, { lookUp: true });
}

function dogHead(ctx, x, y, k, o = {}) {
  const tan = '#c98b4a', brown = '#7c4a25', white = '#f7f1e6', nose = '#2a2220';
  rr(ctx, x - 15 * k, y + 16.5 * k, 30 * k, 5.2 * k, 2.4 * k, '#d23c3c');
  circ(ctx, x, y + 23.5 * k, 2.8 * k, '#f2c14e');
  ell(ctx, x, y, 20 * k, 18 * k, tan);
  ell(ctx, x, y + 9 * k, 17 * k, 11 * k, tan);
  poly(ctx, [[x - 2 * k, y - 17 * k], [x + 2 * k, y - 17 * k], [x + 6 * k, y + 6 * k], [x - 6 * k, y + 6 * k]], white);
  ell(ctx, x, y + 13 * k, 12 * k, 8.6 * k, white);
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x + side * 14 * k, y - 14 * k);
    ctx.bezierCurveTo(x + side * 27 * k, y - 15 * k, x + side * 30 * k, y + 1 * k, x + side * 28 * k, y + 15 * k);
    ctx.quadraticCurveTo(x + side * 25 * k, y + 21 * k, x + side * 20 * k, y + 15 * k);
    ctx.bezierCurveTo(x + side * 18 * k, y + 7 * k, x + side * 16 * k, y - 3 * k, x + side * 14 * k, y - 14 * k);
    ctx.fillStyle = brown;
    ctx.fill();
  }
  const gy = o.lookUp ? -1.6 : 0;
  for (const side of [-1, 1]) {
    ell(ctx, x + side * 8.4 * k, y - 8 * k, 2.6 * k, 1.6 * k, '#e3b57f');
    circ(ctx, x + side * 8.4 * k, y - 1 * k, 3.4 * k, '#3a2416');
    circ(ctx, x + side * 8.4 * k + 1.1 * k, y - 2.3 * k + gy * k, 1.15 * k, '#ffffff');
  }
  ell(ctx, x, y + 8 * k, 5.2 * k, 3.7 * k, nose);
  ell(ctx, x - 1.4 * k, y + 6.8 * k, 1.6 * k, 0.9 * k, 'rgba(255,255,255,0.45)');
  ctx.lineCap = 'round';
  curve(ctx, [[x, y + 11.5 * k], [x, y + 14.5 * k]], nose, 1 * k);
  curve(ctx, [[x - 6.5 * k, y + 15 * k], [x - 3 * k, y + 16.4 * k], [x, y + 14.5 * k]], nose, 1 * k);
  curve(ctx, [[x, y + 14.5 * k], [x + 3 * k, y + 16.4 * k], [x + 6.5 * k, y + 15 * k]], nose, 1 * k);
  ell(ctx, x + 0.8 * k, y + 19.5 * k, 3.9 * k, 5.4 * k, '#e8707a');
  curve(ctx, [[x + 0.8 * k, y + 16.5 * k], [x + 0.8 * k, y + 22 * k]], '#c9505c', 0.7 * k);
}
