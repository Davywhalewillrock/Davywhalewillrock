// Opens the lesson in headless Chromium, ready for frame-exact rendering.
// Google Fonts are cached locally (with curl) and served through request routing,
// so renders are deterministic and work without a browser proxy setup.
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const root = path.resolve(here, '..');

const FONT_CSS = 'https://fonts.googleapis.com/css2?family=Archivo:wght@600;800&family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&family=DM+Mono:wght@400;500&family=Permanent+Marker&display=swap';
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';

export function ensureFonts(cacheDir = path.join(here, '.font-cache')) {
  fs.mkdirSync(cacheDir, { recursive: true });
  const cssPath = path.join(cacheDir, 'fonts.css');
  if (!fs.existsSync(cssPath)) execFileSync('curl', ['-sSf', '-A', UA, FONT_CSS, '-o', cssPath]);
  const css = fs.readFileSync(cssPath, 'utf8');
  const map = new Map();
  for (const url of new Set(css.match(/https:\/\/fonts\.gstatic\.com[^)\s]+/g) || [])) {
    const file = path.join(cacheDir, url.replace('https://fonts.gstatic.com/', '').replace(/\//g, '_'));
    if (!fs.existsSync(file)) execFileSync('curl', ['-sSf', url, '-o', file]);
    map.set(url, file);
  }
  return { css, map };
}

export async function openLesson({ lesson = 'frame-it-better', width = 1920, height = 1080 } = {}) {
  const fonts = ensureFonts();
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.route('https://fonts.googleapis.com/**', r => r.fulfill({ status: 200, contentType: 'text/css', body: fonts.css }));
  await page.route('https://fonts.gstatic.com/**', r => {
    const file = fonts.map.get(r.request().url());
    if (!file) return r.abort();
    return r.fulfill({ status: 200, contentType: 'font/woff2', body: fs.readFileSync(file), headers: { 'access-control-allow-origin': '*' } });
  });
  page.on('pageerror', e => console.error('page error:', e.message));
  page.on('console', m => { if (m.type() === 'error') console.error('console:', m.text()); });
  await page.goto(pathToFileURL(path.join(root, `${lesson}.html`)).href);
  await page.waitForFunction(() => window.FL);
  await page.evaluate(() => window.FL.ready());
  await page.evaluate(([w, h]) => window.FL.setup(w, h), [width, height]);
  return { browser, page };
}

/** Renders frame T and returns it as a Buffer (PNG or JPEG). */
export async function grab(page, T, type = 'png', quality = 0.92) {
  const data = await page.evaluate(([t, ty, q]) => {
    window.FL.frame(t);
    return document.getElementById('stage').toDataURL(ty === 'png' ? 'image/png' : 'image/jpeg', q);
  }, [T, type, quality]);
  return Buffer.from(data.slice(data.indexOf(',') + 1), 'base64');
}
