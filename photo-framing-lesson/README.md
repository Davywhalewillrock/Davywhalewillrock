# Frame It Better

A narrated, animated lesson for new photographers: what makes a good photo, and where to put things in the frame. It runs about three and a half minutes.

- **`framing-lesson.mp4`** is the video: 1080p, narrated, with burned-in captions.
- **`index.html`** is the same lesson as an interactive player, with chapters, captions you can switch off, and a reference card. Open it in a browser; it needs the `js/` and `audio/` folders next to it.

Every lesson follows the same pattern. You look through a camera viewfinder at a badly framed shot, the shutter fires, and a red china-marker note shows what went wrong. Then the photographer fixes the shot (walks closer, reframes, steps sideways, crouches), takes it again, and the keeper gets a yellow loop. Each lesson ends on a strip of film with the before and after side by side.

## The lesson in brief

**What makes a good photo?** It makes one thing obvious: where to look. That takes three things: one clear subject, nothing distracting, and everything placed on purpose.

| # | Lesson | The idea | Try it |
|---|---|---|---|
| 1 | Get closer | Fill the frame with your subject. | Take two steps closer, then shoot again. |
| 2 | Use the rule of thirds | Place the subject on a grid line, or where two lines cross. Keep the horizon off the middle. | Turn on grid lines in the display settings. |
| 3 | Leave room to move | Leave space on the side your subject is moving or looking toward. | Pan with moving subjects and keep the space ahead of them. |
| 4 | Follow leading lines | Use lines in the scene to guide the eye to your subject. | Roads, rails, fences, rivers and shorelines all work. |
| 5 | Check the background | Look behind your subject before you shoot. | Move your feet, not just the camera. |
| 6 | Keep the horizon level | Keep horizons straight. | Turn on the electronic level (sometimes called a virtual horizon). |
| 7 | Find a frame within the frame | Use doorways, windows, arches or branches to frame your subject. | Step back until the frame surrounds your subject. |
| 8 | Change your angle | Get down to your subject's eye level. | A tilting screen lets you shoot low without lying on the ground. |
| 9 | Center it when it's symmetrical | Center the subject when the scene is symmetrical. Thirds for everything else. | Use the grid to check that both halves match. |

**The 5-second check, before every shot:** What's my subject? Can I get closer? Where am I placing it? What's behind it? Is the horizon straight, and are the edges clean? Then press the shutter.

**Homework:** shoot one subject three ways (wide, close, and from a new angle) and compare them.

## How it is made

Everything is drawn in code on a `<canvas>`, as a pure function of time, so the browser player and the video render produce identical frames.

| File | What it holds |
|---|---|
| `js/script.js` | The words: scene order, on-screen notes and every narration line. |
| `js/timings.js` | Generated: the measured length of each narration clip. |
| `js/engine.js` | Timeline, layouts (landscape and portrait), text, the camera viewfinder, grease-pencil marks, the film strip. |
| `js/art.js`, `js/worlds.js` | The illustrations: people, animals, landscapes, and the eleven scenes the lessons are shot in. |
| `js/scenes.js` | The choreography of each scene, anchored to the narration. |
| `js/player.js` | The web player and the hooks the video renderer uses. |
| `tools/tts.py` | Generates the narration with [Kokoro](https://github.com/thewh1teagle/kokoro-onnx) (voice `af_heart`). |
| `tools/mix.py` | Places the narration on the timeline and adds shutter clicks and the focus beep. |
| `tools/render.mjs` | Renders frames in headless Chromium and encodes the MP4 with ffmpeg. |

### Rebuilding the video

You need Node 18+, Python 3.10+, ffmpeg and Chromium (Playwright downloads one if you do not set `CHROMIUM_PATH`).

```sh
npm install
python3 -m venv tools/.venv && tools/.venv/bin/pip install kokoro-onnx soundfile numpy
mkdir -p tools/models && cd tools/models
curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
cd ../..

tools/.venv/bin/python tools/tts.py   # after editing any line in js/script.js
node tools/render.mjs                 # mixes audio/lesson-audio.mp3 and writes framing-lesson.mp4
```

To check frames without rendering the whole video, `tools/sheet.sh closer thirds` writes a contact sheet of each lesson's key moments to `build/`, and `SIZE=1080x1920 tools/sheet.sh closer` does the same for the phone layout. `node tools/render.mjs --size 1080x1920 --out framing-lesson-vertical.mp4` renders a vertical version.
