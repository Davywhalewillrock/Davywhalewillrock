# Photo lessons

Narrated, animated lessons for new photographers. Each one is a 1080p video with burned-in captions, plus the same lesson as an interactive web player.

| Lesson | Video | Player | Length |
|---|---|---|---|
| **Frame It Better**: what makes a good photo, and where to put things in the frame | `frame-it-better.mp4` | `frame-it-better.html` | about 3½ minutes |
| **Photographing People**: where to put people, how to read the light, and which angle to shoot from | `photographing-people.mp4` | `photographing-people.html` | about 4 minutes |

The players have chapters, captions you can switch off, and a reference card. Open them in a browser; they need the `js/` and `audio/` folders next to them.

Every lesson follows the same pattern. You look through a camera viewfinder at a bad shot, the shutter fires, and a red china-marker note shows what went wrong. Then the photographer fixes it (walks closer, reframes, moves into the shade, lowers the camera), takes it again, and the keeper gets a yellow loop. Each lesson ends on a strip of film with the before and after side by side.

## Frame It Better

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

## Photographing People

**Start with the eyes.** In a portrait the eyes are the subject: focus on the eye nearest the camera (eye autofocus does this for you). Then get three things right: where you put them, the light, and the angle.

| # | Lesson | The idea | Try it |
|---|---|---|---|
| 1 | Put the eyes on the top third | Don't center the face with empty space above it: put the eyes on the top third line and let the person fill the frame. | Turn on the grid and line the eyes up with the top line. |
| 2 | Don't crop at the joints | Crop between joints (mid-thigh, mid-shin), never at the neck, elbows, wrists, knees or ankles. | Or show the whole body, with a little space under the feet. |
| 3 | Step away from the wall | Leave space between people and the background: they pop, and their shadow falls behind them. | Zoom in and use a low f-number, like f/2.8, for an even softer background. |
| 4 | Get out of the midday sun | Overhead sun means squinting and dark eye shadows. Open shade gives soft, even light. | The best shade has open sky in front of the face. |
| 5 | Turn them toward the window | With the window behind them, the face goes dark. At an angle to it, the light shapes the face and the eyes sparkle. | Switch off the room lights so the colors stay clean. |
| 6 | Put the sun behind them | Near sunset, put the low sun behind the person: the hair glows and nobody squints. | Use exposure compensation, about +1, so the face is not too dark. |
| 7 | Shoot faces from just above eye level | From below you see nostrils and a double chin. | Ask for the chin slightly forward and down. |
| 8 | Kids: get low and keep shooting | Get down to their eye level, let them play, and shoot in bursts. | Use burst mode and a fast shutter speed, like 1/500 s. |
| 9 | Lower the camera for full-body shots | From your eye level they get a big head and short legs. From waist height they look natural. | Turn the camera vertical for one standing person. |
| 10 | Take better selfies | Held low and close, the phone looks up your nose and stretches your face. | Arm's length, just above eye level, facing a window. Try the 2× lens. |

**Quick recipes:**

- **Beauty portrait:** soft window light, the camera just above eye level, the eyes on the top third.
- **Kids:** get down to their level, find open shade, shoot in bursts.
- **Full body:** camera at waist height, turned vertical, space under the feet.
- **Selfies:** phone above eye level, arm's length (or the 2× lens), face a window.

**Homework:** photograph one person in three kinds of light: open shade, a window, and the sun behind them. Talk to them while you shoot; real smiles beat "say cheese".

## How it is made

Everything is drawn in code on a `<canvas>`, as a pure function of time, so the browser player and the video render produce identical frames.

| File | What it holds |
|---|---|
| `js/<lesson>/script.js` | The words: scene order, on-screen notes and every narration line. |
| `js/<lesson>/timings.js` | Generated: the measured length of each narration clip. |
| `js/<lesson>/worlds.js` | The places each lesson is photographed in. |
| `js/<lesson>/scenes.js` | Each lesson's framing, marks and choreography, anchored to the narration, plus the scenes only that lesson has. |
| `js/photographing-people/people.js` | The parametric portrait: pose, expression, camera height, lens distortion and lighting (soft or hard, from any direction), plus a full-body figure. |
| `js/engine.js` | Shared: timeline, layouts (landscape and portrait), text, the camera viewfinder, grease-pencil marks, the film strip. |
| `js/lesson.js` | Shared: the lesson pattern (live view, shutter, fix, keeper, before/after), the title card and the homework prints. |
| `js/art.js` | Shared illustration primitives: skies, trees, people, animals, buildings. |
| `js/player.js` | The web player and the hooks the video renderer uses. |
| `tools/tts.py` | Generates the narration with [Kokoro](https://github.com/thewh1teagle/kokoro-onnx) (voice `af_heart`). |
| `tools/mix.py` | Places the narration on the timeline and adds shutter clicks and the focus beep. |
| `tools/render.mjs` | Renders frames in headless Chromium and encodes the MP4 with ffmpeg. |

### Rebuilding a video

You need Node 18+, Python 3.10+, ffmpeg and Chromium (Playwright downloads one if you do not set `CHROMIUM_PATH`).

```sh
npm install
python3 -m venv tools/.venv && tools/.venv/bin/pip install kokoro-onnx soundfile numpy
mkdir -p tools/models && cd tools/models
curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
cd ../..

tools/.venv/bin/python tools/tts.py --lesson photographing-people   # after editing any line in its script.js
node tools/render.mjs --lesson photographing-people                 # mixes audio/photographing-people.mp3, writes photographing-people.mp4
```

To check frames without rendering a whole video, `LESSON=photographing-people tools/sheet.sh window kids` writes a contact sheet of each scene's key moments to `build/`, and `SIZE=1080x1920` does the same for the phone layout. `node tools/render.mjs --lesson photographing-people --size 1080x1920 --out photographing-people-vertical.mp4` renders a vertical version.
