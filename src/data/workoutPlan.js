// Day of week → workout split (0 = Sunday)
export const WORKOUT_SPLIT = {
  0: {
    label: 'Legs + Forearms',
    muscles: ['Legs', 'Forearms'],
    exercises: [
      'Squat',
      'Leg Press',
      'Romanian Deadlift',
      'Leg Curl',
      'Calf Raises',
      'Wrist Curls',
      'Reverse Wrist Curls',
    ],
  },
  1: {
    label: 'Chest + Triceps',
    muscles: ['Chest', 'Triceps'],
    exercises: [
      'Bench Press',
      'Incline Dumbbell Press',
      'Cable Fly',
      'Dips',
      'Triceps Pushdown',
      'Skull Crushers',
    ],
  },
  2: {
    label: 'Back + Biceps',
    muscles: ['Back', 'Biceps'],
    exercises: [
      'Deadlift',
      'Barbell Row',
      'Pull-ups',
      'Lat Pulldown',
      'Biceps Curl',
      'Hammer Curl',
    ],
  },
  3: {
    label: 'Legs + Shoulders',
    muscles: ['Legs', 'Shoulders'],
    exercises: [
      'Squat',
      'Leg Extension',
      'Leg Curl',
      'Shoulder Press',
      'Lateral Raises',
      'Front Raises',
      'Face Pulls',
    ],
  },
  4: {
    label: 'Forearms — Pump Day',
    muscles: ['Forearms'],
    exercises: [
      'Wrist Curls',
      'Reverse Wrist Curls',
      "Farmer's Walk",
      'Plate Pinch',
      'Bar Hangs',
    ],
  },
  5: {
    label: 'Chest + Triceps',
    muscles: ['Chest', 'Triceps'],
    exercises: [
      'Bench Press',
      'Incline Barbell Press',
      'Pec Deck',
      'Close Grip Bench',
      'Overhead Triceps Extension',
      'Rope Pushdown',
    ],
  },
  6: {
    label: 'Back + Biceps',
    muscles: ['Back', 'Biceps'],
    exercises: [
      'Deadlift',
      'Pendlay Row',
      'Pull-ups',
      'Seated Cable Row',
      'Preacher Curl',
      'Concentration Curl',
    ],
  },
};

export function getTodayWorkout() {
  const day = new Date().getDay();
  return WORKOUT_SPLIT[day];
}
