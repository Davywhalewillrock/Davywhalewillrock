#!/usr/bin/env python3
"""Generate the narration clips with Kokoro TTS and write js/timings.js.

Every cue in js/script.js becomes build/narration/<cue-id>.wav (24 kHz mono,
silence trimmed), and its length lands in js/timings.js, which the animation
timeline reads. Run tools/render.mjs afterwards to build the soundtrack.

Setup (once):
  python3 -m venv tools/.venv && tools/.venv/bin/pip install kokoro-onnx soundfile numpy
  mkdir -p tools/models && cd tools/models
  curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
  curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin

Usage: tools/.venv/bin/python tools/tts.py [--voice af_heart] [--speed 0.92] [--only cue-id,...]
"""
import argparse
import json
import pathlib
import subprocess

import numpy as np
import soundfile as sf

ROOT = pathlib.Path(__file__).resolve().parent.parent
MODELS = pathlib.Path(__file__).resolve().parent / 'models'
OUT = ROOT / 'build' / 'narration'

# Spoken-form fixes, applied only to what the voice reads (captions keep the original text).
SPOKEN = {}


def load_cues():
    code = (
        "const vm=require('vm'),fs=require('fs');const c={window:{}};vm.createContext(c);"
        "vm.runInContext(fs.readFileSync('js/script.js','utf8'),c);"
        "console.log(JSON.stringify(c.window.LESSON.scenes.flatMap(s=>s.cues.map(q=>({id:q.id,say:q.say})))))"
    )
    return json.loads(subprocess.check_output(['node', '-e', code], cwd=ROOT))


def trim(samples, sr, threshold=0.012, pad=0.04):
    loud = np.flatnonzero(np.abs(samples) > threshold)
    if loud.size == 0:
        return samples
    a = max(0, loud[0] - int(pad * sr))
    b = min(len(samples), loud[-1] + int(pad * sr))
    return samples[a:b]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--voice', default='af_heart')
    ap.add_argument('--speed', type=float, default=0.92)
    ap.add_argument('--only', default='')
    args = ap.parse_args()

    from kokoro_onnx import Kokoro
    kokoro = Kokoro(str(MODELS / 'kokoro-v1.0.onnx'), str(MODELS / 'voices-v1.0.bin'))
    OUT.mkdir(parents=True, exist_ok=True)
    timings_path = ROOT / 'js' / 'timings.js'
    durations = {}
    only = set(filter(None, args.only.split(',')))
    for cue in load_cues():
        wav = OUT / f"{cue['id']}.wav"
        if only and cue['id'] not in only and wav.exists():
            data, sr = sf.read(wav)
            durations[cue['id']] = round(len(data) / sr, 3)
            continue
        text = cue['say']
        for a, b in SPOKEN.items():
            text = text.replace(a, b)
        samples, sr = kokoro.create(text, voice=args.voice, speed=args.speed, lang='en-us')
        samples = trim(np.asarray(samples, dtype=np.float32), sr)
        sf.write(wav, samples, sr)
        durations[cue['id']] = round(len(samples) / sr, 3)
        print(f"{cue['id']:>12}  {durations[cue['id']]:6.2f}s  {cue['say']}")
    body = json.dumps(durations, indent=2)
    timings_path.write_text(
        '/* Narration clip lengths in seconds, measured by tools/tts.py. Generated file. */\n'
        f'window.CUE_DURATIONS = {body};\n'
    )
    total = sum(durations.values())
    words = sum(len(c['say'].split()) for c in load_cues())
    print(f'{len(durations)} clips, {total:.1f}s of speech, {words / total * 60:.0f} words per minute')


if __name__ == '__main__':
    main()
