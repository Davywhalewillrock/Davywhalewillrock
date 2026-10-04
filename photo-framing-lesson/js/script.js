/*
 * Lesson content: scene order, on-screen text and narration.
 *
 * This file is the single source of truth for the words. The narration audio is
 * generated from each cue's `say` text (tools/tts.py), and the measured length of
 * every clip lands in js/timings.js, which drives the animation timeline.
 *
 * Cue timing fields (seconds, all optional):
 *   gap  pause after the cue finishes speaking (default 0.45)
 *   min  minimum time the cue occupies, for beats that need room to animate
 * Scene fields: lead (silence before the first cue), tail (hold after the last).
 */
window.LESSON = {
  title: 'Frame It Better',
  scenes: [
    {
      id: 'title', kind: 'title', chapter: 'Intro', lead: 1.6, tail: 0.8,
      cues: [
        { id: 'title-1', say: 'You already have a good camera.', gap: 0.5 },
        { id: 'title-2', say: "So let's learn the skill that makes the biggest difference: what you put in the frame, and where you put it." },
      ],
    },
    {
      id: 'idea', kind: 'idea', chapter: 'What makes a good photo?', lead: 1.0, tail: 2.2,
      kicker: 'THE BIG IDEA', title: 'What makes a good photo?',
      cues: [
        { id: 'idea-1', say: 'A good photo makes one thing obvious: where to look.', min: 3.6 },
        { id: 'idea-2', say: 'This snapshot has too much going on, so nothing stands out.', min: 4.2 },
        { id: 'idea-3', say: 'Pick one subject, get closer, and leave the clutter out.', min: 4.0 },
        { id: 'idea-4', say: 'One clear subject. Nothing distracting. Everything placed on purpose.', gap: 0.7 },
        { id: 'idea-5', say: "That's the recipe. Here are nine ways to get there." },
      ],
      notes: {
        label: 'A GOOD PHOTO HAS',
        list: ['One clear subject', 'Nothing distracting', 'Everything placed on purpose'],
      },
    },
    {
      id: 'closer', kind: 'lesson', chapter: 'Get closer', lead: 0.8, tail: 2.6,
      kicker: 'LESSON 1 OF 9', title: 'Get closer',
      cues: [
        { id: 'closer-1', say: 'Most beginners stand too far away.', min: 2.6 },
        { id: 'closer-2', say: 'When the subject is tiny, the photo has no clear point.', min: 3.6 },
        { id: 'closer-3', say: 'Walk closer, or zoom in, until your subject fills the frame.', min: 4.2 },
      ],
      notes: {
        idea: 'Fill the frame with your subject.',
        bad: 'Too far away: the cat gets lost',
        good: 'Close enough to see the whiskers',
        tip: 'Take two steps closer, then shoot again.',
      },
    },
    {
      id: 'thirds', kind: 'lesson', chapter: 'Rule of thirds', lead: 0.8, tail: 2.4,
      kicker: 'LESSON 2 OF 9', title: 'Use the rule of thirds',
      cues: [
        { id: 'thirds-1', say: "Turn on your camera's grid. It splits the frame into thirds.", min: 4.0 },
        { id: 'thirds-2', say: 'A subject dead center, with the horizon through the middle, often feels static.', min: 4.4 },
        { id: 'thirds-3', say: 'Put your subject where two lines cross, and the horizon on a line.', min: 4.4 },
        { id: 'thirds-4', say: 'Now the photo feels balanced, and more alive.' },
      ],
      notes: {
        idea: 'Place the subject on a grid line, or where two lines cross.',
        bad: 'Dead center, horizon cuts it in half',
        good: 'Tree on a crossing point, horizon on a line',
        tip: 'Turn on grid lines in your camera’s display settings.',
      },
    },
    {
      id: 'room', kind: 'lesson', chapter: 'Room to move', lead: 0.8, tail: 2.6,
      kicker: 'LESSON 3 OF 9', title: 'Leave room to move',
      cues: [
        { id: 'room-1', say: 'If your subject is moving, leave space in front of them.', min: 3.4 },
        { id: 'room-2', say: "Squeezed against the edge, they look like they're about to leave the photo.", min: 4.2 },
        { id: 'room-3', say: 'Give them room to move into. The same goes for where someone is looking.', min: 4.6 },
      ],
      notes: {
        idea: 'Leave space on the side your subject is moving or looking toward.',
        bad: 'Squeezed against the edge',
        good: 'Room to run into',
        tip: 'Pan with moving subjects and keep the space ahead of them.',
      },
    },
    {
      id: 'lines', kind: 'lesson', chapter: 'Leading lines', lead: 0.8, tail: 2.6,
      kicker: 'LESSON 4 OF 9', title: 'Follow leading lines',
      cues: [
        { id: 'lines-1', say: 'Look for lines: roads, rivers, fences, or a pier.', min: 3.2 },
        { id: 'lines-2', say: 'Here, the lines lead the eye right out of the frame.', min: 3.8 },
        { id: 'lines-3', say: 'Frame them so they start near the edge and lead straight to your subject.', min: 4.6 },
      ],
      notes: {
        idea: 'Use lines in the scene to guide the eye to your subject.',
        bad: 'The lines run out of the frame',
        good: 'The pier leads to the lighthouse',
        tip: 'Roads, rails, fences, rivers and shorelines all work.',
      },
    },
    {
      id: 'background', kind: 'lesson', chapter: 'Check the background', lead: 0.8, tail: 2.6,
      kicker: 'LESSON 5 OF 9', title: 'Check the background',
      cues: [
        { id: 'bg-1', say: 'Before you press the shutter, look behind your subject.', min: 3.2 },
        { id: 'bg-2', say: "A pole growing out of someone's head can ruin a great portrait.", min: 4.0 },
        { id: 'bg-3', say: "Don't just turn the camera. Move your feet. One step to the side can clean up the background.", min: 5.4 },
      ],
      notes: {
        idea: 'Look behind your subject before you shoot.',
        bad: 'A lamp post growing out of the head',
        good: 'One step to the side: clean background',
        tip: 'Move your feet, not just the camera.',
      },
    },
    {
      id: 'level', kind: 'lesson', chapter: 'Level horizon', lead: 0.8, tail: 2.4,
      kicker: 'LESSON 6 OF 9', title: 'Keep the horizon level',
      cues: [
        { id: 'level-1', say: 'Keep the horizon straight.', min: 2.0 },
        { id: 'level-2', say: 'Even a small tilt looks like a mistake.', min: 3.0 },
        { id: 'level-3', say: "Line it up with a grid line, or turn on your camera's electronic level.", min: 4.4 },
      ],
      notes: {
        idea: 'Keep horizons straight.',
        bad: 'Tilted 4°: looks like a mistake',
        good: 'Level horizon: calm and natural',
        tip: 'Turn on the electronic level (sometimes called a virtual horizon).',
      },
    },
    {
      id: 'frame', kind: 'lesson', chapter: 'Frame within a frame', lead: 0.8, tail: 2.6,
      kicker: 'LESSON 7 OF 9', title: 'Find a frame within the frame',
      cues: [
        { id: 'frame-1', say: 'Look for a natural frame: a doorway, a window, an arch, or branches.', min: 4.0 },
        { id: 'frame-2', say: 'On its own, this view looks a little flat.', min: 3.0 },
        { id: 'frame-3', say: 'Step back and let the arch surround it. It adds depth, and points right at your subject.', min: 5.0 },
      ],
      notes: {
        idea: 'Use doorways, windows, arches or branches to frame your subject.',
        bad: 'A nice view, but flat',
        good: 'The arch adds depth and draws you in',
        tip: 'Step back until the frame surrounds your subject.',
      },
    },
    {
      id: 'angle', kind: 'lesson', chapter: 'Change your angle', lead: 0.8, tail: 2.6,
      kicker: 'LESSON 8 OF 9', title: 'Change your angle',
      cues: [
        { id: 'angle-1', say: "Don't shoot everything from standing height.", min: 2.8 },
        { id: 'angle-2', say: 'Looking down makes kids and pets look small and far away.', min: 3.8 },
        { id: 'angle-3', say: 'Crouch down to their eye level, and the photo becomes personal.', min: 4.6 },
      ],
      notes: {
        idea: 'Get down to your subject’s eye level.',
        bad: 'From standing height: small and distant',
        good: 'At eye level: personal and engaging',
        tip: 'A tilting screen lets you shoot low without lying on the ground.',
      },
    },
    {
      id: 'center', kind: 'lesson', chapter: 'Symmetry', lead: 0.8, tail: 2.6,
      kicker: 'LESSON 9 OF 9', title: 'Center it when it’s symmetrical',
      cues: [
        { id: 'center-1', say: 'Rules are guides, not laws.', min: 2.2 },
        { id: 'center-2', say: "A symmetrical scene, like this reflection, feels unbalanced when it's off-center.", min: 4.4 },
        { id: 'center-3', say: 'So put it dead center. Center for symmetry. Thirds for everything else.', min: 4.6 },
      ],
      notes: {
        idea: 'Center the subject when the scene is symmetrical.',
        bad: 'Symmetry pushed off-center',
        good: 'Dead center: calm and strong',
        tip: 'Use the grid to check that both halves match.',
      },
    },
    {
      id: 'recap', kind: 'recap', chapter: 'The 5-second check', lead: 1.0, tail: 1.6,
      kicker: 'RECAP', title: 'The 5-second check',
      cues: [
        { id: 'recap-1', say: 'Before every shot, take five seconds.', gap: 0.6 },
        { id: 'recap-2', say: "What's my subject?", gap: 0.55 },
        { id: 'recap-3', say: 'Can I get closer?', gap: 0.55 },
        { id: 'recap-4', say: 'Where am I placing it?', gap: 0.55 },
        { id: 'recap-5', say: "What's behind it?", gap: 0.55 },
        { id: 'recap-6', say: 'Is the horizon straight, and are the edges clean?', gap: 0.6 },
        { id: 'recap-7', say: 'Then press the shutter.', min: 2.0 },
      ],
      notes: {
        list: [
          "What's my subject?",
          'Can I get closer?',
          'Where am I placing it?',
          "What's behind it?",
          'Is it level? Are the edges clean?',
        ],
      },
    },
    {
      id: 'homework', kind: 'homework', chapter: 'Homework', lead: 1.0, tail: 4.2,
      kicker: 'YOUR HOMEWORK', title: 'Shoot it three ways',
      cues: [
        { id: 'hw-1', say: 'Your homework: shoot one subject three ways. Wide, close, and from a new angle.', min: 5.6 },
        { id: 'hw-2', say: "Then compare them. You'll be surprised how fast you improve." },
      ],
    },
  ],
};
