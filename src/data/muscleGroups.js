// Mapping exercice → groupes musculaires anatomiques précis
// primary  = muscles principaux (utilisés pour la détection de chevauchement)
// secondary = muscles assistants (affichés à titre informatif)
//
// Zones utilisées :
//   Pectoraux (haut) / (milieu) / (bas)
//   Épaules (antérieures) / (latérales) / (postérieures)
//   Grand dorsal, Rhomboïdes, Érecteurs
//   Trapèzes (supérieurs) / (moyens)
//   Triceps (long chef) / (latéral) / (médial)
//   Biceps (chef long) / (chef court) / Brachialis
//   Avant-bras
//   Quadriceps, Ischio-jambiers, Fessiers, Mollets
//   Core (profond) / (obliques)

export const MUSCLE_GROUPS = {

  // ── PECTORAUX ──────────────────────────────────────────────────────────────
  'Bench Press':               { primary: ['Pectoraux (milieu)'],   secondary: ['Triceps (latéral)', 'Épaules (antérieures)'] },
  'Incline Bench Press':       { primary: ['Pectoraux (haut)'],     secondary: ['Triceps (latéral)', 'Épaules (antérieures)'] },
  'Incline Barbell Press':     { primary: ['Pectoraux (haut)'],     secondary: ['Triceps (latéral)', 'Épaules (antérieures)'] },
  'Decline Bench Press':       { primary: ['Pectoraux (bas)'],      secondary: ['Triceps (latéral)'] },
  'Decline Bench':             { primary: ['Pectoraux (bas)'],      secondary: ['Triceps (latéral)'] },
  'Flat Dumbbell Press':       { primary: ['Pectoraux (milieu)'],   secondary: ['Triceps (latéral)', 'Épaules (antérieures)'] },
  'Incline Dumbbell Press':    { primary: ['Pectoraux (haut)'],     secondary: ['Triceps (latéral)', 'Épaules (antérieures)'] },
  'Decline Dumbbell Press':    { primary: ['Pectoraux (bas)'],      secondary: ['Triceps (latéral)'] },
  'Dumbbell Fly':              { primary: ['Pectoraux (milieu)'],   secondary: [] },
  'Cable Fly':                 { primary: ['Pectoraux (milieu)'],   secondary: [] },
  'Incline Cable Fly':         { primary: ['Pectoraux (haut)'],     secondary: [] },
  'Low Cable Fly':             { primary: ['Pectoraux (bas)'],      secondary: [] },
  'Pec Deck':                  { primary: ['Pectoraux (milieu)'],   secondary: [] },
  'Chest Press Machine':       { primary: ['Pectoraux (milieu)'],   secondary: ['Triceps (latéral)'] },
  'Svend Press':               { primary: ['Pectoraux (milieu)'],   secondary: [] },
  'Dips':                      { primary: ['Pectoraux (bas)'],      secondary: ['Triceps (long chef)', 'Épaules (antérieures)'] },
  'Chest Dips':                { primary: ['Pectoraux (bas)'],      secondary: ['Triceps (long chef)'] },
  'Push-ups':                  { primary: ['Pectoraux (milieu)'],   secondary: ['Triceps (latéral)', 'Core (profond)'] },
  'Wide Push-ups':             { primary: ['Pectoraux (milieu)'],   secondary: ['Épaules (antérieures)'] },
  'Diamond Push-ups':          { primary: ['Pectoraux (milieu)'],   secondary: ['Triceps (latéral)'] },
  'Archer Push-ups':           { primary: ['Pectoraux (milieu)'],   secondary: ['Épaules (antérieures)'] },
  'Explosive Push-ups':        { primary: ['Pectoraux (milieu)'],   secondary: ['Triceps (latéral)'] },
  'Clap Push-ups':             { primary: ['Pectoraux (milieu)'],   secondary: ['Triceps (latéral)'] },
  'One Arm Push-up':           { primary: ['Pectoraux (milieu)'],   secondary: ['Triceps (latéral)', 'Core (profond)'] },
  'Ring Dips':                 { primary: ['Pectoraux (bas)'],      secondary: ['Triceps (long chef)'] },

  // ── DOS ────────────────────────────────────────────────────────────────────
  'Deadlift':                  { primary: ['Érecteurs', 'Ischio-jambiers'],   secondary: ['Fessiers', 'Grand dorsal', 'Trapèzes (supérieurs)'] },
  'Sumo Deadlift':             { primary: ['Fessiers', 'Quadriceps'],         secondary: ['Érecteurs', 'Ischio-jambiers'] },
  'Trap Bar Deadlift':         { primary: ['Quadriceps', 'Fessiers'],         secondary: ['Érecteurs', 'Ischio-jambiers'] },
  'Barbell Row':               { primary: ['Grand dorsal', 'Rhomboïdes'],     secondary: ['Biceps (chef long)', 'Érecteurs'] },
  'Pendlay Row':               { primary: ['Grand dorsal', 'Rhomboïdes'],     secondary: ['Biceps (chef long)', 'Érecteurs'] },
  'Dumbbell Row':              { primary: ['Grand dorsal'],                   secondary: ['Biceps (chef long)', 'Rhomboïdes'] },
  'T-Bar Row':                 { primary: ['Grand dorsal', 'Rhomboïdes'],     secondary: ['Biceps (chef long)', 'Érecteurs'] },
  'Meadows Row':               { primary: ['Grand dorsal'],                   secondary: ['Biceps (chef long)'] },
  'Chest Supported Row':       { primary: ['Rhomboïdes', 'Grand dorsal'],     secondary: ['Biceps (chef long)'] },
  'Kroc Row':                  { primary: ['Grand dorsal'],                   secondary: ['Biceps (chef long)'] },
  'Seated Cable Row':          { primary: ['Grand dorsal', 'Rhomboïdes'],     secondary: ['Biceps (chef long)'] },
  'Pull-ups':                  { primary: ['Grand dorsal'],                   secondary: ['Biceps (chef long)', 'Rhomboïdes'] },
  'Chin-ups':                  { primary: ['Grand dorsal'],                   secondary: ['Biceps (chef long)'] },
  'Neutral Grip Pull-ups':     { primary: ['Grand dorsal'],                   secondary: ['Biceps (chef long)', 'Rhomboïdes'] },
  'Wide Grip Pull-ups':        { primary: ['Grand dorsal'],                   secondary: ['Rhomboïdes'] },
  'Lat Pulldown':              { primary: ['Grand dorsal'],                   secondary: ['Biceps (chef long)'] },
  'Close Grip Lat Pulldown':   { primary: ['Grand dorsal'],                   secondary: ['Biceps (chef long)'] },
  'Neutral Grip Pulldown':     { primary: ['Grand dorsal'],                   secondary: ['Biceps (chef long)'] },
  'Straight Arm Pulldown':     { primary: ['Grand dorsal'],                   secondary: [] },
  'Australian Pull-ups':       { primary: ['Rhomboïdes', 'Grand dorsal'],     secondary: ['Biceps (chef long)'] },
  'Muscle-ups':                { primary: ['Grand dorsal', 'Pectoraux (bas)'], secondary: ['Triceps (latéral)', 'Biceps (chef long)'] },
  'Ring Rows':                 { primary: ['Rhomboïdes', 'Grand dorsal'],     secondary: ['Biceps (chef long)'] },
  'Ring Muscle-ups':           { primary: ['Grand dorsal', 'Pectoraux (bas)'], secondary: ['Triceps (long chef)'] },
  'Face Pulls':                { primary: ['Épaules (postérieures)'],         secondary: ['Rhomboïdes', 'Trapèzes (moyens)'] },
  'Rack Pulls':                { primary: ['Érecteurs', 'Grand dorsal'],      secondary: ['Trapèzes (supérieurs)'] },
  'Rowing Machine':            { primary: ['Grand dorsal'],                   secondary: ['Biceps (chef long)', 'Quadriceps'] },

  // ── ÉPAULES ────────────────────────────────────────────────────────────────
  'Shoulder Press':            { primary: ['Épaules (antérieures)'],          secondary: ['Triceps (latéral)', 'Trapèzes (supérieurs)'] },
  'Arnold Press':              { primary: ['Épaules (antérieures)'],          secondary: ['Triceps (latéral)', 'Épaules (latérales)'] },
  'Dumbbell Shoulder Press':   { primary: ['Épaules (antérieures)'],          secondary: ['Triceps (latéral)'] },
  'Machine Shoulder Press':    { primary: ['Épaules (antérieures)'],          secondary: ['Triceps (latéral)'] },
  'Lateral Raises':            { primary: ['Épaules (latérales)'],            secondary: [] },
  'Cable Lateral Raises':      { primary: ['Épaules (latérales)'],            secondary: [] },
  'Front Raises':              { primary: ['Épaules (antérieures)'],          secondary: [] },
  'Rear Delt Fly':             { primary: ['Épaules (postérieures)'],         secondary: ['Rhomboïdes'] },
  'Upright Row':               { primary: ['Épaules (latérales)'],            secondary: ['Trapèzes (supérieurs)'] },
  'Shrugs':                    { primary: ['Trapèzes (supérieurs)'],          secondary: [] },
  'Dumbbell Shrugs':           { primary: ['Trapèzes (supérieurs)'],          secondary: [] },
  'Handstand Push-ups':        { primary: ['Épaules (antérieures)'],          secondary: ['Triceps (latéral)', 'Trapèzes (supérieurs)'] },
  'Pike Push-ups':             { primary: ['Épaules (antérieures)'],          secondary: ['Triceps (latéral)'] },

  // ── BICEPS ─────────────────────────────────────────────────────────────────
  'Biceps Curl':               { primary: ['Biceps (chef long)', 'Biceps (chef court)'], secondary: [] },
  'Hammer Curl':               { primary: ['Brachialis'],                     secondary: ['Biceps (chef long)', 'Avant-bras'] },
  'Preacher Curl':             { primary: ['Biceps (chef court)'],            secondary: [] },
  'Concentration Curl':        { primary: ['Biceps (chef court)'],            secondary: [] },
  'Incline Dumbbell Curl':     { primary: ['Biceps (chef long)'],             secondary: [] },
  'Cable Curl':                { primary: ['Biceps (chef long)', 'Biceps (chef court)'], secondary: [] },
  'Reverse Curl':              { primary: ['Avant-bras'],                     secondary: ['Brachialis'] },
  'Zottman Curl':              { primary: ['Biceps (chef long)'],             secondary: ['Brachialis', 'Avant-bras'] },
  'Spider Curl':               { primary: ['Biceps (chef court)'],            secondary: [] },
  'Cross Body Curl':           { primary: ['Brachialis'],                     secondary: ['Biceps (chef long)', 'Avant-bras'] },
  'EZ Bar Curl':               { primary: ['Biceps (chef long)', 'Biceps (chef court)'], secondary: [] },
  'Barbell Curl':              { primary: ['Biceps (chef long)', 'Biceps (chef court)'], secondary: [] },

  // ── TRICEPS ────────────────────────────────────────────────────────────────
  'Triceps Pushdown':          { primary: ['Triceps (latéral)'],              secondary: ['Triceps (médial)'] },
  'Rope Pushdown':             { primary: ['Triceps (latéral)'],              secondary: ['Triceps (médial)'] },
  'Skull Crushers':            { primary: ['Triceps (long chef)'],            secondary: ['Triceps (latéral)', 'Triceps (médial)'] },
  'Overhead Triceps Extension':{ primary: ['Triceps (long chef)'],            secondary: ['Triceps (médial)'] },
  'Close Grip Bench':          { primary: ['Triceps (latéral)'],              secondary: ['Triceps (médial)', 'Pectoraux (milieu)'] },
  'JM Press':                  { primary: ['Triceps (long chef)'],            secondary: ['Triceps (médial)', 'Pectoraux (milieu)'] },
  'Triceps Kickback':          { primary: ['Triceps (latéral)'],              secondary: ['Triceps (médial)'] },
  'Triceps Kickbacks':         { primary: ['Triceps (latéral)'],              secondary: ['Triceps (médial)'] },

  // ── JAMBES ─────────────────────────────────────────────────────────────────
  'Squat':                     { primary: ['Quadriceps'],                     secondary: ['Fessiers', 'Ischio-jambiers', 'Core (profond)'] },
  'Front Squat':               { primary: ['Quadriceps'],                     secondary: ['Core (profond)', 'Érecteurs'] },
  'Goblet Squat':              { primary: ['Quadriceps'],                     secondary: ['Fessiers', 'Core (profond)'] },
  'Box Squat':                 { primary: ['Quadriceps', 'Fessiers'],         secondary: ['Ischio-jambiers'] },
  'Pause Squat':               { primary: ['Quadriceps'],                     secondary: ['Fessiers', 'Ischio-jambiers'] },
  'Hack Squat':                { primary: ['Quadriceps'],                     secondary: ['Fessiers'] },
  'Leg Press':                 { primary: ['Quadriceps'],                     secondary: ['Fessiers'] },
  'Leg Extension':             { primary: ['Quadriceps'],                     secondary: [] },
  'Leg Curl':                  { primary: ['Ischio-jambiers'],                secondary: [] },
  'Seated Leg Curl':           { primary: ['Ischio-jambiers'],                secondary: [] },
  'Lying Leg Curl':            { primary: ['Ischio-jambiers'],                secondary: [] },
  'Nordic Curls':              { primary: ['Ischio-jambiers'],                secondary: [] },
  'Nordic Hamstring Curl':     { primary: ['Ischio-jambiers'],                secondary: [] },
  'Romanian Deadlift':         { primary: ['Ischio-jambiers'],                secondary: ['Fessiers', 'Érecteurs'] },
  'Stiff Leg Deadlift':        { primary: ['Ischio-jambiers'],                secondary: ['Érecteurs'] },
  'Bulgarian Split Squat':     { primary: ['Quadriceps', 'Fessiers'],         secondary: ['Ischio-jambiers'] },
  'Walking Lunges':            { primary: ['Quadriceps', 'Fessiers'],         secondary: ['Ischio-jambiers'] },
  'Reverse Lunges':            { primary: ['Quadriceps', 'Fessiers'],         secondary: ['Ischio-jambiers'] },
  'Lateral Lunges':            { primary: ['Fessiers', 'Quadriceps'],         secondary: [] },
  'Step-ups':                  { primary: ['Quadriceps', 'Fessiers'],         secondary: [] },
  'Hip Thrust':                { primary: ['Fessiers'],                       secondary: ['Ischio-jambiers'] },
  'Glute Bridge':              { primary: ['Fessiers'],                       secondary: ['Ischio-jambiers'] },
  'Pistol Squats':             { primary: ['Quadriceps'],                     secondary: ['Fessiers', 'Core (profond)'] },
  'Jump Squats':               { primary: ['Quadriceps'],                     secondary: ['Fessiers', 'Mollets'] },
  'Wall Sit':                  { primary: ['Quadriceps'],                     secondary: [] },
  'Sissy Squat':               { primary: ['Quadriceps'],                     secondary: [] },
  'Lunges':                    { primary: ['Quadriceps', 'Fessiers'],         secondary: ['Ischio-jambiers'] },
  'Calf Raises':               { primary: ['Mollets'],                        secondary: [] },
  'Seated Calf Raises':        { primary: ['Mollets'],                        secondary: [] },
  'Donkey Calf Raises':        { primary: ['Mollets'],                        secondary: [] },

  // ── CORE ───────────────────────────────────────────────────────────────────
  'Plank':                     { primary: ['Core (profond)'],                 secondary: ['Épaules (antérieures)'] },
  'Side Plank':                { primary: ['Core (obliques)'],                secondary: ['Core (profond)'] },
  'Ab Wheel':                  { primary: ['Core (profond)'],                 secondary: ['Grand dorsal'] },
  'Hanging Leg Raise':         { primary: ['Core (profond)'],                 secondary: ['Core (obliques)'] },
  'Toes to Bar':               { primary: ['Core (profond)'],                 secondary: ['Core (obliques)'] },
  'Dragon Flag':               { primary: ['Core (profond)'],                 secondary: [] },
  'L-sit':                     { primary: ['Core (profond)'],                 secondary: ['Triceps (latéral)'] },
  'L-Sit':                     { primary: ['Core (profond)'],                 secondary: ['Triceps (latéral)'] },
  'V-ups':                     { primary: ['Core (profond)'],                 secondary: [] },
  'Bicycle Crunches':          { primary: ['Core (obliques)'],                secondary: ['Core (profond)'] },
  'Russian Twists':            { primary: ['Core (obliques)'],                secondary: [] },
  'Cable Crunch':              { primary: ['Core (profond)'],                 secondary: [] },
  'Decline Sit-ups':           { primary: ['Core (profond)'],                 secondary: [] },
  'Dead Bug':                  { primary: ['Core (profond)'],                 secondary: [] },
  'Copenhagen Plank':          { primary: ['Core (obliques)'],                secondary: [] },
  'Hollow Body Hold':          { primary: ['Core (profond)'],                 secondary: [] },
  'Hollow Hold':               { primary: ['Core (profond)'],                 secondary: [] },
  'Mountain Climbers':         { primary: ['Core (profond)'],                 secondary: ['Quadriceps'] },

  // ── GRIP / AVANT-BRAS ──────────────────────────────────────────────────────
  'Wrist Curls':               { primary: ['Avant-bras'],                     secondary: [] },
  'Reverse Wrist Curls':       { primary: ['Avant-bras'],                     secondary: [] },
  "Farmer's Walk":             { primary: ['Avant-bras', 'Trapèzes (supérieurs)'], secondary: ['Core (profond)'] },
  'Plate Pinch':               { primary: ['Avant-bras'],                     secondary: [] },
  'Bar Hangs':                 { primary: ['Avant-bras'],                     secondary: ['Grand dorsal'] },

  // ── CALISTHENICS ──────────────────────────────────────────────────────────
  'Planche Lean':              { primary: ['Épaules (antérieures)'],          secondary: ['Core (profond)', 'Pectoraux (milieu)'] },
  'Tuck Planche':              { primary: ['Épaules (antérieures)'],          secondary: ['Core (profond)', 'Pectoraux (milieu)'] },
  'Straddle Planche':          { primary: ['Épaules (antérieures)', 'Core (profond)'], secondary: ['Pectoraux (milieu)'] },
  'Full Planche':              { primary: ['Épaules (antérieures)', 'Core (profond)'], secondary: ['Pectoraux (milieu)'] },
  'Front Lever':               { primary: ['Grand dorsal', 'Core (profond)'],  secondary: ['Biceps (chef long)', 'Rhomboïdes'] },
  'Back Lever':                { primary: ['Pectoraux (milieu)', 'Érecteurs'], secondary: ['Biceps (chef long)'] },
  'Human Flag':                { primary: ['Core (obliques)', 'Épaules (latérales)'], secondary: ['Grand dorsal'] },

  // ── CARDIO / CONDITIONING ─────────────────────────────────────────────────
  'Kettlebell Swings':         { primary: ['Fessiers', 'Ischio-jambiers'],    secondary: ['Érecteurs', 'Core (profond)'] },
  'Kettlebell Swing':          { primary: ['Fessiers', 'Ischio-jambiers'],    secondary: ['Érecteurs', 'Core (profond)'] },
  'Power Clean':               { primary: ['Quadriceps', 'Fessiers'],         secondary: ['Érecteurs', 'Épaules (antérieures)'] },
  'Clean and Jerk':            { primary: ['Quadriceps', 'Épaules (antérieures)'], secondary: ['Fessiers', 'Érecteurs'] },
  'Snatch':                    { primary: ['Quadriceps', 'Épaules (antérieures)'], secondary: ['Fessiers', 'Érecteurs'] },
  'Jump Rope':                 { primary: ['Mollets'],                        secondary: ['Core (profond)'] },
  'Box Jumps':                 { primary: ['Quadriceps', 'Fessiers'],         secondary: ['Mollets'] },
  'Burpees':                   { primary: ['Core (profond)'],                 secondary: ['Pectoraux (milieu)', 'Quadriceps'] },
  'Sled Push':                 { primary: ['Quadriceps'],                     secondary: ['Fessiers', 'Érecteurs'] },
  'Battle Ropes':              { primary: ['Épaules (antérieures)'],          secondary: ['Core (obliques)'] },
  'Tire Flip':                 { primary: ['Fessiers', 'Ischio-jambiers'],    secondary: ['Érecteurs', 'Épaules (antérieures)'] },
  'Sprints':                   { primary: ['Quadriceps', 'Ischio-jambiers'],  secondary: ['Fessiers', 'Mollets'] },
  'Stair Climber':             { primary: ['Quadriceps', 'Fessiers'],         secondary: ['Mollets'] },
  'Assault Bike':              { primary: ['Quadriceps'],                     secondary: ['Épaules (antérieures)', 'Core (profond)'] },
};

// ── Groupes haut niveau ────────────────────────────────────────────────────────

export const HIGH_LEVEL_GROUPS = {
  Pectoraux:       { icon: '🫁', color: '#60A5FA', subMuscles: ['Pectoraux (haut)', 'Pectoraux (milieu)', 'Pectoraux (bas)'] },
  Dos:             { icon: '🔙', color: '#A78BFA', subMuscles: ['Grand dorsal', 'Rhomboïdes', 'Érecteurs', 'Trapèzes (supérieurs)', 'Trapèzes (moyens)'] },
  Biceps:          { icon: '💪', color: '#34D399', subMuscles: ['Biceps (chef long)', 'Biceps (chef court)', 'Brachialis'] },
  Triceps:         { icon: '🔱', color: '#FB923C', subMuscles: ['Triceps (long chef)', 'Triceps (latéral)', 'Triceps (médial)'] },
  Épaules:         { icon: '🏋️', color: '#FBBF24', subMuscles: ['Épaules (antérieures)', 'Épaules (latérales)', 'Épaules (postérieures)'] },
  Jambes:          { icon: '🦵', color: '#F87171', subMuscles: ['Quadriceps', 'Ischio-jambiers', 'Fessiers', 'Mollets'] },
  'Avant-bras':    { icon: '🤛', color: '#94A3B8', subMuscles: ['Avant-bras'] },
  'Core · Cardio': { icon: '⚡', color: '#E879F9', subMuscles: ['Core (profond)', 'Core (obliques)'] },
};

// Raccourcis d'affichage pour les noms de sub-muscles
const SHORT_LABELS = {
  'Pectoraux (haut)':        'Haut',
  'Pectoraux (milieu)':      'Milieu',
  'Pectoraux (bas)':         'Bas',
  'Grand dorsal':            'Dorsal',
  'Rhomboïdes':              'Rhomboïdes',
  'Érecteurs':               'Érecteurs',
  'Trapèzes (supérieurs)':   'Trap sup.',
  'Trapèzes (moyens)':       'Trap moy.',
  'Biceps (chef long)':      'Chef long',
  'Biceps (chef court)':     'Chef court',
  'Brachialis':              'Brachialis',
  'Triceps (long chef)':     'Chef long',
  'Triceps (latéral)':       'Latéral',
  'Triceps (médial)':        'Médial',
  'Épaules (antérieures)':   'Ant.',
  'Épaules (latérales)':     'Lat.',
  'Épaules (postérieures)':  'Post.',
  'Quadriceps':              'Quadris',
  'Ischio-jambiers':         'Ischios',
  'Fessiers':                'Fessiers',
  'Mollets':                 'Mollets',
  'Avant-bras':              'Avant-bras',
  'Core (profond)':          'Profond',
  'Core (obliques)':         'Obliques',
};

// ── Helpers ────────────────────────────────────────────────────────────────────

export function getPrimary(exercise) {
  return MUSCLE_GROUPS[exercise]?.primary ?? [];
}

export function getSecondary(exercise) {
  return MUSCLE_GROUPS[exercise]?.secondary ?? [];
}

// Retourne un Map muscle → nombre d'exercices ciblant ce muscle (primary)
export function muscleCounts(exercises) {
  const counts = new Map();
  exercises.forEach(ex => {
    getPrimary(ex).forEach(m => {
      counts.set(m, (counts.get(m) ?? 0) + 1);
    });
  });
  return counts;
}

// Retourne le Set des exercices ayant un muscle primaire qui apparaît 2+ fois
export function getConflictingExercises(exercises) {
  const counts = muscleCounts(exercises);
  const conflicting = new Set();
  exercises.forEach(ex => {
    if (getPrimary(ex).some(m => (counts.get(m) ?? 0) >= 2)) {
      conflicting.add(ex);
    }
  });
  return conflicting;
}

// Retourne les muscles en conflit pour un exercice donné dans une liste
export function getConflictMuscles(exercise, allExercises) {
  const counts = muscleCounts(allExercises);
  return getPrimary(exercise).filter(m => (counts.get(m) ?? 0) >= 2);
}

// Analyse complète d'une journée : coverage par groupe ciblé + bonus muscles
// targetGroupNames = string[] e.g. ['Pectoraux', 'Triceps']
export function analyzeDayMuscles(exercises, targetGroupNames = []) {
  const counts = muscleCounts(exercises);
  const result = {};

  for (const [groupName, groupData] of Object.entries(HIGH_LEVEL_GROUPS)) {
    const isTargeted = targetGroupNames.includes(groupName);

    const subDetails = groupData.subMuscles.map(sm => {
      const count = counts.get(sm) ?? 0;
      let status;
      if (count === 0)      status = isTargeted ? 'under' : 'none';
      else if (count >= 3)  status = 'over';
      else                  status = isTargeted ? 'good' : 'bonus';
      return { name: sm, shortName: SHORT_LABELS[sm] ?? sm, count, status };
    });

    const hasAnyHit = subDetails.some(s => s.count > 0);
    const hasOver   = subDetails.some(s => s.status === 'over');
    const hasUnder  = isTargeted && subDetails.some(s => s.status === 'under');

    let groupStatus;
    if (hasOver)                          groupStatus = 'over';
    else if (hasUnder)                    groupStatus = 'partial';
    else if (isTargeted && hasAnyHit)     groupStatus = 'good';
    else if (!isTargeted && hasAnyHit)    groupStatus = 'bonus';
    else                                  groupStatus = 'none';

    result[groupName] = { ...groupData, isTargeted, subDetails, groupStatus, hasAnyHit };
  }

  return result;
}
