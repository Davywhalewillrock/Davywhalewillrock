/*
 * Lesson 2, Photographing People: scene order, on-screen text and narration.
 *
 * The narration audio is generated from each cue's `say` text (tools/tts.py), and
 * the measured length of every clip lands in timings.js next to this file.
 * Cue fields: gap (pause after the line), min (minimum time the cue occupies).
 * Scene fields: lead (silence before the first cue), tail (hold after the last).
 */
window.LESSON = {
  title: 'Photographing People',
  audio: 'audio/photographing-people.mp3',
  scenes: [
    {
      id: 'title', kind: 'title', chapter: 'Intro', lead: 1.6, tail: 0.8,
      cues: [
        { id: 'title-1', say: 'The photos we treasure most are photos of people.', gap: 0.5 },
        { id: 'title-2', say: "Let's learn where to put them, how to read the light, and which angle to shoot from." },
      ],
    },
    {
      id: 'eyes', kind: 'eyes', chapter: 'Start with the eyes', lead: 1.0, tail: 2.2,
      kicker: 'THE BIG IDEA', title: 'Start with the eyes',
      cues: [
        { id: 'eyes-1', say: 'In a portrait, the eyes are the subject.', min: 3.0 },
        { id: 'eyes-2', say: 'Miss the focus, and the whole photo feels wrong.', min: 3.4 },
        { id: 'eyes-3', say: 'Focus on the eye nearest the camera. Most cameras can find it for you, with eye autofocus.', min: 5.4 },
        { id: 'eyes-4', say: 'Then get three things right: where you put them, the light, and the angle.' },
      ],
      notes: {
        idea: 'Focus on the eye nearest the camera.',
        bad: 'Focus on the background: soft face',
        good: 'Sharp eyes, soft background',
        label: 'THEN GET THREE THINGS RIGHT',
        list: ['Where you put them', 'The light', 'The angle'],
      },
    },
    {
      id: 'headroom', kind: 'lesson', chapter: 'Eyes on the top third', lead: 0.8, tail: 2.4,
      kicker: 'WHERE TO PUT THEM · 1 OF 10', title: 'Put the eyes on the top third',
      cues: [
        { id: 'head-1', say: 'Beginners often put the face right in the middle of the frame.', min: 3.6 },
        { id: 'head-2', say: 'That leaves a big empty space above the head.', min: 3.2 },
        { id: 'head-3', say: 'Instead, put the eyes on the top third line, and let the person fill the frame.', min: 4.6 },
      ],
      notes: {
        idea: 'Put the eyes on the top third line.',
        bad: 'Face in the middle, empty space above',
        good: 'Eyes on the top line, person fills the frame',
        tip: 'Turn on the grid and line the eyes up with the top line.',
      },
    },
    {
      id: 'joints', kind: 'lesson', chapter: 'Crop between joints', lead: 0.8, tail: 2.4,
      kicker: 'WHERE TO PUT THEM · 2 OF 10', title: 'Don’t crop at the joints',
      cues: [
        { id: 'joints-1', say: 'When you crop a person, watch where the edge of the frame falls.', min: 3.6 },
        { id: 'joints-2', say: 'Cut right at the knees, ankles or wrists, and people look chopped off.', min: 4.0 },
        { id: 'joints-3', say: 'Crop between the joints, like mid-thigh, or show the whole body, feet and all.', min: 4.6 },
      ],
      notes: {
        idea: 'Crop between joints, never right at them.',
        bad: 'Cut at the knees: chopped off',
        good: 'Cropped mid-thigh: looks natural',
        tip: 'Or show the whole body, with a little space under the feet.',
      },
    },
    {
      id: 'wall', kind: 'lesson', chapter: 'Step away from the wall', lead: 0.8, tail: 2.4,
      kicker: 'WHERE TO PUT THEM · 3 OF 10', title: 'Step away from the wall',
      cues: [
        { id: 'wall-1', say: "Don't stand people right against a wall.", min: 2.6 },
        { id: 'wall-2', say: 'They look flat, and their shadow sticks to the background.', min: 3.6 },
        { id: 'wall-3', say: 'Bring them a few steps forward. The background softens, and they pop out of the picture.', min: 5.0 },
      ],
      notes: {
        idea: 'Leave space between people and the background.',
        bad: 'Against the wall: flat, with a hard shadow',
        good: 'A few steps out: soft background, the person pops',
        tip: 'Zoom in and use a low f-number, like f/2.8, for an even softer background.',
      },
    },
    {
      id: 'midday', kind: 'lesson', chapter: 'Out of the midday sun', lead: 0.8, tail: 2.4,
      kicker: 'READ THE LIGHT · 4 OF 10', title: 'Get out of the midday sun',
      cues: [
        { id: 'sun-1', say: 'Bright midday sun is the hardest light for faces.', min: 3.0 },
        { id: 'sun-2', say: 'It casts dark shadows under the eyes and nose, and makes everyone squint.', min: 4.0 },
        { id: 'sun-3', say: 'Move into open shade, under a tree or beside a building. The light turns soft and even.', min: 5.0 },
      ],
      notes: {
        idea: 'Keep harsh overhead sun off faces.',
        bad: 'Midday sun: squinting, dark eye shadows',
        good: 'Open shade: soft, even light',
        tip: 'The best shade has open sky in front of the face.',
      },
    },
    {
      id: 'window', kind: 'lesson', chapter: 'Window light', lead: 0.8, tail: 2.4,
      kicker: 'READ THE LIGHT · 5 OF 10', title: 'Turn them toward the window',
      cues: [
        { id: 'win-1', say: 'Indoors, a window is the best light you have.', min: 2.8 },
        { id: 'win-2', say: 'With the window behind them, the face goes dark.', min: 3.2 },
        { id: 'win-3', say: 'Turn them toward the window, at an angle. Soft light shapes the face, and the eyes sparkle.', min: 5.0 },
      ],
      notes: {
        idea: 'Turn the face toward the window.',
        bad: 'Window behind: face in shadow',
        good: 'Window at an angle: soft light, bright eyes',
        tip: 'Switch off the room lights so the colors stay clean.',
      },
    },
    {
      id: 'golden', kind: 'lesson', chapter: 'Sun behind them', lead: 0.8, tail: 2.4,
      kicker: 'READ THE LIGHT · 6 OF 10', title: 'Put the sun behind them',
      cues: [
        { id: 'gold-1', say: 'Near sunset, the light turns warm and low.', min: 2.8 },
        { id: 'gold-2', say: 'Facing straight into it, people squint into the glare.', min: 3.4 },
        { id: 'gold-3', say: 'Turn them so the sun is behind them, and brighten the exposure. Their hair glows, and the face stays soft.', min: 5.6 },
      ],
      notes: {
        idea: 'Low sun behind a person makes the hair glow.',
        bad: 'Facing the sun: squinting into the glare',
        good: 'Sun behind: glowing hair, soft face',
        tip: 'Use exposure compensation, about +1, so the face is not too dark.',
      },
    },
    {
      id: 'faceangle', kind: 'lesson', chapter: 'Faces: just above eye level', lead: 0.8, tail: 2.4,
      kicker: 'CHOOSE THE ANGLE · 7 OF 10', title: 'Shoot faces from just above eye level',
      cues: [
        { id: 'face-1', say: 'For faces, camera height matters.', min: 2.4 },
        { id: 'face-2', say: 'From below, you look up the nose and under the chin.', min: 3.4 },
        { id: 'face-3', say: 'Raise the camera just above their eyes, and ask them to bring the chin slightly forward and down.', min: 5.2 },
      ],
      notes: {
        idea: 'Hold the camera just above eye level.',
        bad: 'From below: nostrils and a double chin',
        good: 'Just above: clean jawline, bright eyes',
        tip: 'Ask for the chin slightly forward and down. It flatters every face.',
      },
    },
    {
      id: 'kids', kind: 'lesson', chapter: 'Kids: get low', lead: 0.8, tail: 2.4,
      kicker: 'CHOOSE THE ANGLE · 8 OF 10', title: 'Kids: get low and keep shooting',
      cues: [
        { id: 'kid-1', say: "Kids rarely hold a pose, so don't ask them to.", min: 2.8 },
        { id: 'kid-2', say: 'From standing height, with a forced smile, the photo feels stiff.', min: 3.6 },
        { id: 'kid-3', say: 'Get down to their eye level, let them play, and shoot in bursts. One frame will catch the moment.', min: 6.0 },
      ],
      notes: {
        idea: 'Shoot kids at their eye level, mid-play.',
        bad: 'From above, with a forced smile',
        good: 'Eye level, real laughter',
        tip: 'Use burst mode and a fast shutter speed, like 1/500 s.',
      },
    },
    {
      id: 'fullbody', kind: 'lesson', chapter: 'Full body: lower the camera', lead: 0.8, tail: 2.4,
      kicker: 'CHOOSE THE ANGLE · 9 OF 10', title: 'Lower the camera for full-body shots',
      cues: [
        { id: 'body-1', say: 'For a full-body photo, turn the camera vertical.', min: 3.0 },
        { id: 'body-2', say: 'Shooting down from your own eye level gives them a big head and short legs.', min: 4.0 },
        { id: 'body-3', say: 'Lower the camera to their waist, and leave a little space under the feet.', min: 4.4 },
      ],
      notes: {
        idea: 'Shoot full-body photos from waist height.',
        bad: 'From eye level: big head, short legs',
        good: 'From waist height: natural proportions',
        tip: 'Turn the camera vertical for one standing person.',
      },
    },
    {
      id: 'selfie', kind: 'lesson', chapter: 'Better selfies', lead: 0.8, tail: 2.4,
      kicker: 'CHOOSE THE ANGLE · 10 OF 10', title: 'Take better selfies',
      cues: [
        { id: 'self-1', say: 'The same ideas work for selfies.', min: 2.4 },
        { id: 'self-2', say: 'Held low and close, the phone looks up your nose and stretches your face.', min: 4.0 },
        { id: 'self-3', say: "Hold it at arm's length, just above eye level, and face a window.", min: 4.4 },
      ],
      notes: {
        idea: 'Phone at arm’s length, just above eye level, facing the light.',
        bad: 'Low and close: up the nose, stretched face',
        good: 'Arm’s length, above eye level, window light',
        tip: 'Try the 2× lens: it flatters faces more than the wide one.',
      },
    },
    {
      id: 'recap', kind: 'recap', chapter: 'Quick recipes', lead: 1.0, tail: 2.4,
      kicker: 'RECAP', title: 'Quick recipes',
      cues: [
        { id: 'rec-1', say: "Here's your cheat sheet.", gap: 0.5 },
        { id: 'rec-2', say: 'A beautiful portrait: soft window light, the camera just above eye level, and the eyes on the top third.', gap: 0.6 },
        { id: 'rec-3', say: 'Kids: get low, find shade, and shoot in bursts.', gap: 0.6 },
        { id: 'rec-4', say: 'Full body: lower the camera, and turn it vertical.', gap: 0.6 },
        { id: 'rec-5', say: 'Selfies: phone up, arm out, and face the light.' },
      ],
      recipes: [
        { title: 'BEAUTY PORTRAIT', lines: ['Soft window light', 'Camera just above eye level', 'Eyes on the top third'] },
        { title: 'KIDS', lines: ['Get down to their level', 'Find open shade', 'Shoot in bursts'] },
        { title: 'FULL BODY', lines: ['Camera at waist height', 'Turn it vertical', 'Space under the feet'] },
        { title: 'SELFIES', lines: ['Phone above eye level', 'Arm’s length, or 2×', 'Face a window'] },
      ],
    },
    {
      id: 'homework', kind: 'homework', chapter: 'Homework', lead: 1.0, tail: 4.2,
      kicker: 'YOUR HOMEWORK', title: 'One face, three lights',
      cues: [
        { id: 'hw-1', say: 'Your homework: photograph one person in three kinds of light. Open shade, a window, and the sun behind them.', min: 6.6 },
        { id: 'hw-2', say: "Talk to them while you shoot. Real smiles beat 'say cheese' every time." },
      ],
    },
  ],
};
