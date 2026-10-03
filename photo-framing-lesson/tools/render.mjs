// Renders the lesson to an MP4 with its narration.
//   node tools/render.mjs [--size 1920x1080] [--fps 30] [--workers 3] [--out framing-lesson.mp4] [--from 0] [--to 999] [--no-audio]
// Steps: export the timeline → mix the soundtrack (tools/mix.py) → render frames on
// several pages in parallel, each piping JPEG frames into its own x264 encoder →
// join the segments and add the audio.
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { openLesson, root } from './page.mjs';

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => {
  if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : 'true']);
  return acc;
}, []));
const [W, H] = (args.size || '1920x1080').split('x').map(Number);
const fps = Number(args.fps || 30);
const workers = Number(args.workers || 3);
const out = path.resolve(root, args.out || 'framing-lesson.mp4');
const build = path.join(root, 'build');
fs.mkdirSync(build, { recursive: true });

// 1. timeline and soundtrack
const { browser, page } = await openLesson({ width: W, height: H });
const tl = await page.evaluate(() => {
  const TL = window.FL.timeline;
  return {
    duration: TL.duration,
    cues: TL.scenes.flatMap(s => s.cues.map(c => ({ id: c.id, t: +(s.start + c.at).toFixed(4) }))),
    events: window.FL.events().map(e => ({ ...e, t: +e.t.toFixed(4) })),
  };
});
fs.writeFileSync(path.join(build, 'timeline.json'), JSON.stringify(tl, null, 1));
console.log(`timeline: ${tl.duration.toFixed(2)}s, ${tl.cues.length} lines, ${tl.events.length} sound effects`);
const audio = args['no-audio'] ? null : path.join(build, 'lesson-audio.wav');
if (audio) {
  const venv = path.join(root, 'tools', '.venv', 'bin', 'python');
  execFileSync(fs.existsSync(venv) ? venv : 'python3', [path.join(root, 'tools', 'mix.py')], { stdio: 'inherit' });
}
await browser.close();

// 2. frames → segments
const from = Math.max(0, Number(args.from || 0));
const to = Math.min(tl.duration, Number(args.to || tl.duration));
const first = Math.round(from * fps), last = Math.floor(to * fps - 1e-6);
const total = last - first + 1;
const per = Math.ceil(total / workers);
const t0 = Date.now();
let done = 0;

async function renderSegment(index, a, b) {
  const { browser: br, page: pg } = await openLesson({ width: W, height: H });
  const file = path.join(build, `segment-${index}.mp4`);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-tune', 'animation', '-pix_fmt', 'yuv420p', '-r', String(fps), file], { stdio: ['pipe', 'inherit', 'inherit'] });
  const closed = new Promise((ok, fail) => ff.on('close', code => (code === 0 ? ok() : fail(new Error(`ffmpeg exited ${code}`)))));
  for (let f = a; f <= b; f++) {
    const data = await pg.evaluate(t => { window.FL.frame(t); return document.getElementById('stage').toDataURL('image/jpeg', 0.95); }, f / fps);
    const buf = Buffer.from(data.slice(data.indexOf(',') + 1), 'base64');
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    done++;
    if (done % 300 === 0) {
      const s = (Date.now() - t0) / 1000;
      console.log(`${done}/${total} frames, ${(done / s).toFixed(1)} fps, ~${Math.round((total - done) / (done / s))}s left`);
    }
  }
  ff.stdin.end();
  await closed;
  await br.close();
  return file;
}
const jobs = [];
for (let i = 0; i < workers; i++) {
  const a = first + i * per, b = Math.min(last, a + per - 1);
  if (a <= b) jobs.push(renderSegment(i, a, b));
}
const segments = await Promise.all(jobs);
console.log(`rendered ${total} frames in ${((Date.now() - t0) / 1000).toFixed(0)}s`);

// 3. join and add sound
const list = path.join(build, 'segments.txt');
fs.writeFileSync(list, segments.map(f => `file '${f}'`).join('\n'));
const mux = ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list];
if (audio) mux.push('-ss', String(first / fps), '-t', String(total / fps), '-i', audio, '-c:a', 'aac', '-b:a', '160k', '-ac', '2', '-ar', '48000');
mux.push('-c:v', 'copy', '-movflags', '+faststart', out);
execFileSync('ffmpeg', mux, { stdio: 'inherit' });
for (const f of segments) fs.unlinkSync(f);
console.log(out);
