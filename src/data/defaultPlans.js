export const DEFAULT_LIBRARY = [
  // ── CHEST ─────────────────────────────────────────────────────────────────
  'Bench Press', 'Incline Bench Press', 'Incline Barbell Press', 'Decline Bench Press',
  'Incline Dumbbell Press', 'Flat Dumbbell Press', 'Decline Dumbbell Press',
  'Cable Fly', 'Incline Cable Fly', 'Low Cable Fly', 'Pec Deck', 'Dumbbell Fly',
  'Chest Dips', 'Push-ups', 'Wide Push-ups', 'Diamond Push-ups',
  'Archer Push-ups', 'Chest Press Machine', 'Svend Press',

  // ── BACK ─────────────────────────────────────────────────────────────────
  'Pull-ups', 'Chin-ups', 'Neutral Grip Pull-ups', 'Wide Grip Pull-ups',
  'Barbell Row', 'Pendlay Row', 'Dumbbell Row', 'T-Bar Row',
  'Seated Cable Row', 'Lat Pulldown', 'Close Grip Lat Pulldown',
  'Straight Arm Pulldown', 'Face Pulls', 'Rack Pulls',
  'Muscle-ups', 'Australian Pull-ups', 'Meadows Row',
  'Chest Supported Row', 'Kroc Row',

  // ── LEGS ─────────────────────────────────────────────────────────────────
  'Squat', 'Front Squat', 'Goblet Squat', 'Box Squat', 'Pause Squat',
  'Leg Press', 'Hack Squat', 'Leg Extension', 'Leg Curl', 'Nordic Curls',
  'Romanian Deadlift', 'Stiff Leg Deadlift', 'Bulgarian Split Squat',
  'Walking Lunges', 'Reverse Lunges', 'Step-ups', 'Lateral Lunges',
  'Calf Raises', 'Seated Calf Raises', 'Donkey Calf Raises',
  'Pistol Squats', 'Jump Squats', 'Wall Sit', 'Sissy Squat',

  // ── SHOULDERS ────────────────────────────────────────────────────────────
  'Shoulder Press', 'Arnold Press', 'Dumbbell Shoulder Press',
  'Lateral Raises', 'Cable Lateral Raises', 'Front Raises',
  'Rear Delt Fly', 'Upright Row', 'Shrugs', 'Dumbbell Shrugs',
  'Handstand Push-ups', 'Pike Push-ups', 'Machine Shoulder Press',

  // ── BICEPS ───────────────────────────────────────────────────────────────
  'Biceps Curl', 'Hammer Curl', 'Preacher Curl', 'Concentration Curl',
  'Incline Dumbbell Curl', 'Cable Curl', 'Reverse Curl',
  'Zottman Curl', 'Spider Curl', 'Cross Body Curl',

  // ── TRICEPS ──────────────────────────────────────────────────────────────
  'Triceps Pushdown', 'Rope Pushdown', 'Overhead Triceps Extension',
  'Skull Crushers', 'Close Grip Bench', 'Dips', 'Triceps Kickback',
  'JM Press',

  // ── DEADLIFT VARIATIONS ──────────────────────────────────────────────────
  'Deadlift', 'Sumo Deadlift', 'Trap Bar Deadlift',

  // ── CORE ─────────────────────────────────────────────────────────────────
  'Plank', 'Side Plank', 'Ab Wheel', 'Hanging Leg Raise',
  'Toes to Bar', 'Dragon Flag', 'L-sit', 'V-ups', 'Bicycle Crunches',
  'Russian Twists', 'Cable Crunch', 'Decline Sit-ups', 'Dead Bug',
  'Copenhagen Plank', 'Hollow Body Hold',

  // ── CALISTHENICS ─────────────────────────────────────────────────────────
  'Planche Lean', 'Tuck Planche', 'Straddle Planche', 'Full Planche',
  'Front Lever', 'Back Lever', 'Human Flag',
  'Ring Dips', 'Ring Rows', 'Ring Muscle-ups',
  'One Arm Push-up', 'Explosive Push-ups', 'Clap Push-ups',

  // ── CARDIO / CONDITIONING ────────────────────────────────────────────────
  'Rowing Machine', 'Assault Bike', 'Jump Rope', 'Box Jumps',
  'Kettlebell Swings', 'Sled Push', 'Battle Ropes', 'Tire Flip',
  'Burpees', 'Mountain Climbers', 'Sprints', 'Stair Climber',

  // ── GRIP / AVANT-BRAS ────────────────────────────────────────────────────
  "Farmer's Walk", 'Wrist Curls', 'Reverse Wrist Curls',
  'Dumbbell Wrist Curl', 'Reverse Dumbbell Wrist Curl',
  'Behind the Back Wrist Curl', 'Wrist Extension', 'Pronation Curls',
  'Bar Hangs', 'Plate Pinch', 'Towel Pull-ups',
  'Hammer Grip Wrist Curl', 'Dumbbell Forearm Rotation',
  'Wrist Roller', 'Grippers', 'Pinch Grip Carries', 'Barbell Holds',
  'Trap Bar Farmer Walk', 'Single Arm Farmers Walk',

  // ── OLYMPIC / POWER ──────────────────────────────────────────────────────
  'Power Clean', 'Hang Clean', 'Push Press', 'Clean and Jerk', 'Snatch',

  // ── MACHINE / ISOLATION ──────────────────────────────────────────────────
  'Hip Thrust', 'Glute Bridge',
  'Hip Abduction Machine', 'Hip Adduction Machine',
  'Back Extension', 'Hyperextension', 'Leg Press Calf Raises',
];

export const PPL_PLAN = {
  type: 'ppl',
  name: 'Push Pull Legs',
  days: {
    0: { label: 'Repos', exercises: [] },
    1: { label: 'Push', exercises: ['Bench Press', 'Incline Dumbbell Press', 'Cable Fly', 'Shoulder Press', 'Lateral Raises', 'Triceps Pushdown', 'Skull Crushers'] },
    2: { label: 'Pull', exercises: ['Pull-ups', 'Barbell Row', 'Lat Pulldown', 'Biceps Curl', 'Hammer Curl'] },
    3: { label: 'Legs', exercises: ['Squat', 'Leg Press', 'Romanian Deadlift', 'Leg Curl', 'Calf Raises'] },
    4: { label: 'Push', exercises: ['Bench Press', 'Incline Barbell Press', 'Pec Deck', 'Shoulder Press', 'Front Raises', 'Close Grip Bench', 'Rope Pushdown'] },
    5: { label: 'Pull', exercises: ['Deadlift', 'Pendlay Row', 'Seated Cable Row', 'Preacher Curl', 'Concentration Curl'] },
    6: { label: 'Legs', exercises: ['Squat', 'Leg Extension', 'Leg Curl', 'Lateral Raises', 'Face Pulls'] },
  },
};

export const ARNOLD_PLAN = {
  type: 'arnold',
  name: 'Arnold Split',
  days: {
    0: { label: 'Repos', exercises: [] },
    1: { label: 'Chest + Back', exercises: ['Bench Press', 'Incline Dumbbell Press', 'Cable Fly', 'Barbell Row', 'Pull-ups', 'Lat Pulldown'] },
    2: { label: 'Épaules + Bras', exercises: ['Shoulder Press', 'Lateral Raises', 'Front Raises', 'Face Pulls', 'Biceps Curl', 'Hammer Curl', 'Triceps Pushdown', 'Skull Crushers'] },
    3: { label: 'Legs', exercises: ['Squat', 'Leg Press', 'Romanian Deadlift', 'Leg Curl', 'Calf Raises'] },
    4: { label: 'Chest + Back', exercises: ['Incline Barbell Press', 'Pec Deck', 'Dips', 'Deadlift', 'Pendlay Row', 'Seated Cable Row'] },
    5: { label: 'Épaules + Bras', exercises: ['Shoulder Press', 'Front Raises', 'Preacher Curl', 'Concentration Curl', 'Close Grip Bench', 'Rope Pushdown', 'Overhead Triceps Extension'] },
    6: { label: 'Legs', exercises: ['Squat', 'Leg Extension', 'Leg Curl', 'Romanian Deadlift', 'Calf Raises'] },
  },
};

export const CUSTOM_PLAN = {
  type: 'custom',
  name: 'Custom Split',
  days: {
    0: { label: 'Repos', exercises: [] },
    1: { label: 'Jour 1', exercises: [] },
    2: { label: 'Jour 2', exercises: [] },
    3: { label: 'Jour 3', exercises: [] },
    4: { label: 'Jour 4', exercises: [] },
    5: { label: 'Jour 5', exercises: [] },
    6: { label: 'Jour 6', exercises: [] },
  },
};

export const PLAN_TEMPLATES = { ppl: PPL_PLAN, arnold: ARNOLD_PLAN, custom: CUSTOM_PLAN };
