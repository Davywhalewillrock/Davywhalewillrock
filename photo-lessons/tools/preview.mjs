// Renders still frames for review.
//   node tools/preview.mjs [--lesson frame-it-better] [--size 1920x1080] [--out build/preview] [--scene thirds] [--at 1.5,4,8] [--every 2]
// --scene picks a scene by id; --at gives times inside it (or absolute times without --scene);
// --every N samples the scene (or whole lesson) every N seconds.
import fs from 'node:fs';
import path from 'node:path';
import { openLesson, grab, root } from './page.mjs';

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => {
  if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : 'true']);
  return acc;
}, []));
const [W, H] = (args.size || '1920x1080').split('x').map(Number);
const out = path.resolve(root, args.out || 'build/preview');
fs.mkdirSync(out, { recursive: true });

const lesson = args.lesson || 'frame-it-better';
const { browser, page } = await openLesson({ lesson, width: W, height: H });
const TL = await page.evaluate(() => ({ duration: window.FL.duration, scenes: window.FL.timeline.scenes.map(s => ({ id: s.id, start: s.start, dur: s.dur, cues: s.cues.map(c => ({ id: c.id, at: c.at, end: c.end })) })) }));
let times = [];
const scene = args.scene ? TL.scenes.find(s => s.id === args.scene) : null;
if (args.scene && !scene) throw new Error(`no scene ${args.scene}; have ${TL.scenes.map(s => s.id).join(', ')}`);
const base = scene ? scene.start : 0;
const span = scene ? scene.dur : TL.duration;
if (args.keys && scene) {
  // key moments of a lesson: live view, both shutters, the move and the before/after strip
  times = await page.evaluate(id => {
    const S = window.FL.timeline.scenes.find(s => s.id === id);
    const cfg = LESSONS[S.id] || LESSONS[S.kind];
    if (!cfg) return [1, S.dur * 0.3, S.dur * 0.5, S.dur * 0.7, S.dur - 1];
    const A = lessonTimes(cfg, S);
    return [S.cues[0].at + 0.3, A.badSnap - 0.4, A.badSnap + 1.4, A.move + A.moveDur * 0.5, A.goodSnap + 1.4, A.compare + 2.6].map(t => +t.toFixed(2));
  }, scene.id);
} else if (args.at) times = args.at.split(',').map(Number);
else if (args.every) for (let t = 0.6; t < span; t += Number(args.every)) times.push(+t.toFixed(2));
else times = [span / 2];
for (const t of times) {
  const name = `${lesson}-${args.scene || 'all'}-${W}x${H}-${String(t.toFixed(2)).padStart(6, '0')}.png`;
  fs.writeFileSync(path.join(out, name), await grab(page, base + t));
  console.log(path.join(out, name));
}
if (args.timeline) console.log(JSON.stringify(TL, null, 1));
await browser.close();
