#!/usr/bin/env python3
"""Mix a lesson's soundtrack: narration clips placed on the timeline, plus shutter
clicks and the focus beep. Reads build/<lesson>/timeline.json (written by tools/render.mjs).

Writes build/<lesson>/audio.wav (48 kHz mono) and audio/<lesson>.mp3 (for the web player).
Usage: python tools/mix.py --lesson frame-it-better
"""
import argparse
import json
import pathlib
import subprocess

import numpy as np
import soundfile as sf

ROOT = pathlib.Path(__file__).resolve().parent.parent
SR = 48000
RNG = np.random.default_rng(7)


def upsample(x, sr):
    """Band-limited resample to SR (the narration comes out of the TTS at 24 kHz)."""
    if sr == SR:
        return x
    n = int(round(len(x) * SR / sr))
    spec = np.fft.rfft(x)
    out = np.zeros(n // 2 + 1, dtype=complex)
    out[: len(spec)] = spec
    return np.fft.irfft(out, n) * (SR / sr)


def speech_rms(x):
    frame = SR // 50
    chunks = [x[i:i + frame] for i in range(0, len(x) - frame, frame)]
    levels = np.array([np.sqrt(np.mean(c ** 2)) for c in chunks])
    active = levels[levels > levels.max() * 0.2]
    return float(np.sqrt(np.mean(active ** 2)))


def click(dur, decay, freqs, gain):
    t = np.arange(int(dur * SR)) / SR
    noise = RNG.standard_normal(len(t))
    noise = np.diff(noise, prepend=0.0)  # tilt toward the highs: a crisp mechanical tick
    body = sum(a * np.sin(2 * np.pi * f * t) for f, a in freqs)
    return gain * np.exp(-t / decay) * (0.6 * noise / 3 + body)


def shutter():
    """Two-part mechanical shutter: curtain + mirror up, then down again ~80 ms later."""
    first = click(0.06, 0.006, [(2300, 0.5), (900, 0.35)], 0.55)
    second = click(0.09, 0.011, [(1700, 0.45), (620, 0.5), (180, 0.35)], 0.75)
    out = np.zeros(int(0.2 * SR))
    out[: len(first)] += first
    k = int(0.082 * SR)
    out[k:k + len(second)] += second
    return out / np.abs(out).max() * 0.32


def beep():
    """The two-tone focus confirmation chirp."""
    out = np.zeros(int(0.16 * SR))
    for start in (0.0, 0.085):
        t = np.arange(int(0.05 * SR)) / SR
        env = np.minimum(1, np.minimum(t / 0.003, (0.05 - t) / 0.006))
        tone = np.sin(2 * np.pi * 2730 * t) * env * 0.11
        k = int(start * SR)
        out[k:k + len(tone)] += tone
    return out


def place(track, clip, t):
    k = int(round(t * SR))
    end = min(len(track), k + len(clip))
    if end > k:
        track[k:end] += clip[: end - k]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--lesson', default='frame-it-better')
    lesson = ap.parse_args().lesson
    build = ROOT / 'build' / lesson
    tl = json.loads((build / 'timeline.json').read_text())
    track = np.zeros(int((tl['duration'] + 0.5) * SR))
    target = 0.085  # speech RMS (about -21 dBFS)
    for cue in tl['cues']:
        data, sr = sf.read(build / 'narration' / f"{cue['id']}.wav")
        clip = upsample(np.asarray(data, dtype=np.float64), sr)
        clip *= target / speech_rms(clip)
        place(track, clip, cue['t'])
    sfx = {'shutter': shutter(), 'beep': beep()}
    for ev in tl['events']:
        place(track, sfx[ev['type']], ev['t'])
    peak = np.abs(track).max()
    if peak > 0.89:  # gentle safety: scale down rather than clip
        track *= 0.89 / peak
    out_wav = build / 'audio.wav'
    sf.write(out_wav, track.astype(np.float32), SR, subtype='PCM_16')
    out_mp3 = ROOT / 'audio' / f'{lesson}.mp3'
    out_mp3.parent.mkdir(exist_ok=True)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(out_wav), '-ac', '1', '-ar', '44100',
                    '-c:a', 'libmp3lame', '-b:a', '80k', str(out_mp3)], check=True)
    print(f'{len(tl["cues"])} lines, {len(tl["events"])} sound effects, {len(track) / SR:.1f}s, peak {np.abs(track).max():.2f}')
    print(out_wav)
    print(out_mp3)


if __name__ == '__main__':
    main()
