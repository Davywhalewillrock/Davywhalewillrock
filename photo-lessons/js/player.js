/*
 * Web player: plays the lesson on the canvas with the narration track,
 * chapters, captions and keyboard control. Also exposes window.FL, the hook
 * the video renderer (tools/render.mjs) uses to draw exact frames.
 */
'use strict';
(function () {
  const AUDIO_URL = LESSON.audio;
  const POSTER_T = LESSON.poster ?? 3.6;
  const TL = finishTimeline(buildTimeline(LESSON, window.CUE_DURATIONS || {}));
  const canvas = document.getElementById('stage');
  const ctx = canvas.getContext('2d');
  const $ = id => document.getElementById(id);
  const ui = {
    screen: $('screen'), big: $('bigPlay'), bigLabel: $('bigPlayLabel'), play: $('playBtn'), scrub: $('scrub'),
    ticks: $('ticks'), time: $('time'), cc: $('ccBtn'), mute: $('muteBtn'), full: $('fullBtn'),
    chapters: $('chapters'), notice: $('notice'), now: $('nowPlaying'),
  };
  let L = makeLayout(1920, 1080);
  let renderMode = false;
  let captions = true;
  let dirty = true;

  /* ---------- clock and audio ---------- */
  const clock = { playing: false, starting: false, base: 0, startedAt: 0, ended: false, poster: true };
  // Narration plays through Web Audio (sample-accurate sync). Pages opened straight
  // from disk cannot fetch() files, so those fall back to a plain <audio> element.
  const audio = { mode: null, state: 'idle', ctx: null, buffer: null, source: null, gain: null, el: null, muted: false };

  function now() {
    if (!clock.playing) return clock.base;
    if (audio.source) return clock.base + (audio.ctx.currentTime - clock.startedAt);
    return clock.base + (performance.now() - clock.startedAt) / 1000;
  }
  async function loadWebAudio() {
    const AC = window.AudioContext || window.webkitAudioContext;
    audio.ctx = audio.ctx || new AC();
    if (audio.ctx.resume) audio.ctx.resume();
    const res = await fetch(AUDIO_URL);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.arrayBuffer();
    audio.buffer = await new Promise((ok, fail) => {
      const p = audio.ctx.decodeAudioData(data, ok, fail);
      if (p && p.then) p.then(ok, fail);
    });
    audio.gain = audio.ctx.createGain();
    audio.gain.gain.value = audio.muted ? 0 : 1;
    audio.gain.connect(audio.ctx.destination);
    audio.mode = 'webaudio';
  }
  function loadElement() {
    return new Promise((ok, fail) => {
      const el = new Audio();
      el.preload = 'auto';
      el.muted = audio.muted;
      el.addEventListener('canplay', () => ok(el), { once: true });
      el.addEventListener('error', () => fail(new Error('audio element failed')), { once: true });
      el.src = AUDIO_URL;
      el.load();
    }).then(el => { audio.el = el; audio.mode = 'element'; });
  }
  async function loadAudio() {
    if (audio.state !== 'idle') return;
    audio.state = 'loading';
    try {
      if (location.protocol === 'file:') throw new Error('fetch is unavailable for local files');
      await loadWebAudio();
      audio.state = 'ready';
    } catch (err) {
      try {
        await loadElement();
        audio.state = 'ready';
      } catch (err2) {
        audio.state = 'failed';
        ui.notice.hidden = false;
        ui.notice.textContent = 'The narration could not load, so the lesson plays silently with captions.';
        captions = true;
        syncButtons();
      }
    }
  }
  function startSource() {
    if (audio.state !== 'ready') return false;
    if (audio.mode === 'element') {
      audio.el.currentTime = Math.min(clock.base, (audio.el.duration || TL.duration) - 0.01);
      const p = audio.el.play();
      if (p && p.catch) p.catch(() => {});
      clock.startedAt = performance.now();
      return true;
    }
    if (audio.ctx.state === 'suspended') audio.ctx.resume();
    const src = audio.ctx.createBufferSource();
    src.buffer = audio.buffer;
    src.connect(audio.gain);
    src.start(0, Math.min(clock.base, audio.buffer.duration - 0.01));
    audio.source = src;
    clock.startedAt = audio.ctx.currentTime;
    return true;
  }
  function stopSource() {
    if (audio.el) audio.el.pause();
    if (audio.source) { try { audio.source.stop(); } catch (e) { /* already stopped */ } audio.source.disconnect(); audio.source = null; }
  }
  /** Keeps the clock on the <audio> element's position (only needed in fallback mode). */
  function resync() {
    if (audio.mode !== 'element' || !clock.playing || audio.el.paused || audio.el.seeking) return;
    const drift = audio.el.currentTime - now();
    if (Math.abs(drift) > 0.12) clock.base += drift;
  }
  async function play() {
    if (clock.playing || clock.starting) return;
    clock.starting = true;
    clock.poster = false;
    ui.big.hidden = true;
    if (clock.ended || clock.base >= TL.duration - 0.05) { clock.base = 0; clock.ended = false; }
    if (audio.state === 'idle' || audio.state === 'loading') {
      ui.screen.classList.add('is-loading');
      const wait = loadAudio();
      await Promise.race([wait, new Promise(r => setTimeout(r, 8000))]);
      ui.screen.classList.remove('is-loading');
    }
    clock.starting = false;
    clock.playing = true;
    if (!startSource()) clock.startedAt = performance.now();
    syncButtons();
  }
  function pause() {
    if (!clock.playing) return;
    clock.base = Math.min(now(), TL.duration);
    clock.playing = false;
    stopSource();
    syncButtons();
    dirty = true;
  }
  function toggle() { clock.playing ? pause() : play(); }
  function seek(T) {
    const was = clock.playing;
    if (was) pause();
    clock.base = clamp(T, 0, TL.duration);
    clock.ended = false;
    clock.poster = false;
    ui.big.hidden = true;
    dirty = true;
    if (was) play();
  }

  /* ---------- layout ---------- */
  function fit() {
    if (renderMode) return;
    const box = ui.screen.getBoundingClientRect();
    const portrait = box.width < 640;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = portrait ? Math.round(Math.min(1080, box.width * dpr)) : Math.round(Math.min(1920, Math.max(960, box.width * dpr)));
    const H = portrait ? Math.round((W * 16) / 9) : Math.round((W * 9) / 16);
    ui.screen.classList.toggle('is-portrait', portrait);
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W;
      canvas.height = H;
      L = makeLayout(W, H);
      dirty = true;
    }
  }

  /* ---------- UI ---------- */
  const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  function buildChapters() {
    ui.scrub.max = TL.duration.toFixed(2);
    ui.ticks.innerHTML = '';
    ui.chapters.innerHTML = '';
    TL.scenes.forEach((s, i) => {
      if (i > 0) {
        const tick = document.createElement('span');
        tick.className = 'tick';
        tick.style.left = `${(s.start / TL.duration) * 100}%`;
        ui.ticks.appendChild(tick);
      }
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chapter';
      b.dataset.index = i;
      const num = s.kind === 'lesson' ? String(s.kicker.match(/\d+/)[0]).padStart(2, '0') : '';
      b.innerHTML = `<span class="ch-num">${num}</span><span class="ch-title"></span><span class="ch-time">${fmt(s.start)}</span>`;
      b.querySelector('.ch-title').textContent = s.chapter;
      b.addEventListener('click', () => {
        seek(s.start + 0.02);
        play();
        const box = ui.screen.getBoundingClientRect();
        if (box.top < 0 || box.bottom > window.innerHeight) ui.screen.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      li.appendChild(b);
      ui.chapters.appendChild(li);
    });
  }
  let lastScene = -1;
  function syncUI(T) {
    if (document.activeElement !== ui.scrub) ui.scrub.value = T.toFixed(2);
    ui.scrub.style.setProperty('--fill', `${(T / TL.duration) * 100}%`);
    ui.time.textContent = `${fmt(T)} / ${fmt(TL.duration)}`;
    const S = sceneAt(TL, T);
    if (S.index !== lastScene) {
      lastScene = S.index;
      ui.chapters.querySelectorAll('.chapter').forEach(b => b.setAttribute('aria-current', Number(b.dataset.index) === S.index ? 'true' : 'false'));
      ui.now.textContent = S.chapter;
    }
  }
  function syncButtons() {
    ui.play.setAttribute('aria-label', clock.playing ? 'Pause' : 'Play');
    ui.play.dataset.state = clock.playing ? 'playing' : 'paused';
    ui.cc.setAttribute('aria-pressed', String(captions));
    ui.mute.setAttribute('aria-pressed', String(audio.muted));
    ui.mute.setAttribute('aria-label', audio.muted ? 'Unmute narration' : 'Mute narration');
    dirty = true;
  }

  ui.big.addEventListener('click', play);
  ui.play.addEventListener('click', toggle);
  canvas.addEventListener('click', () => { if (!clock.poster) toggle(); });
  ui.scrub.addEventListener('input', () => seek(Number(ui.scrub.value)));
  ui.cc.addEventListener('click', () => { captions = !captions; syncButtons(); });
  ui.mute.addEventListener('click', () => {
    audio.muted = !audio.muted;
    if (audio.gain) audio.gain.gain.value = audio.muted ? 0 : 1;
    if (audio.el) audio.el.muted = audio.muted;
    syncButtons();
  });
  ui.full.addEventListener('click', () => {
    const el = ui.screen;
    try {
      if (document.fullscreenElement) document.exitFullscreen();
      else if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
    } catch (e) { /* fullscreen is optional */ }
  });
  document.addEventListener('keydown', e => {
    if (e.target.closest && e.target.closest('input, textarea')) return;
    if (e.code === 'Space' || e.key === 'k') { e.preventDefault(); clock.poster ? play() : toggle(); }
    else if (e.key === 'ArrowRight') { seek(now() + 5); }
    else if (e.key === 'ArrowLeft') { seek(now() - 5); }
    else if (e.key === 'c') { captions = !captions; syncButtons(); }
  });
  window.addEventListener('resize', () => { fit(); });
  document.addEventListener('fullscreenchange', () => setTimeout(fit, 60));

  /* ---------- loop ---------- */
  function frame() {
    if (!renderMode) {
      resync();
      let T = now();
      if (clock.playing && T >= TL.duration) { pause(); clock.base = TL.duration; clock.ended = true; T = TL.duration; }
      if (clock.playing || dirty) {
        renderAt(ctx, L, TL, clock.poster ? POSTER_T : T, { subtitles: captions && !clock.poster, progress: false });
        syncUI(T);
        dirty = false;
      }
      requestAnimationFrame(frame);
    }
  }

  const fontsReady = (document.fonts && document.fonts.load)
    ? Promise.all(FONT_FACES.map(f => document.fonts.load(f).catch(() => null))).then(() => document.fonts.ready)
    : Promise.resolve();
  fontsReady.then(() => { _wrapCache.clear(); _cache.clear(); dirty = true; });

  buildChapters();
  fit();
  syncButtons();
  ui.bigLabel.textContent = `Play the lesson · ${fmt(TL.duration)}`;
  requestAnimationFrame(frame);

  /* ---------- hooks for the offline renderer ---------- */
  window.FL = {
    timeline: TL,
    duration: TL.duration,
    events: () => collectEvents(TL),
    ready: () => fontsReady,
    setup(W, H) {
      renderMode = true;
      canvas.width = W;
      canvas.height = H;
      L = makeLayout(W, H);
      _cache.clear();
      _wrapCache.clear();
    },
    frame(T, opts = {}) { renderAt(ctx, L, TL, T, { subtitles: opts.subtitles !== false, progress: opts.progress !== false }); },
  };
})();
