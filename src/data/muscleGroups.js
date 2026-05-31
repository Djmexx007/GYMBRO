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
  'Bench Press':               { primary: ['Pectoraux (milieu)'],   secondary: ['Triceps (latéral)', 'Épaules (antérieures)'],  stabilisateur: ['Coiffe des rotateurs'] },
  'Incline Bench Press':       { primary: ['Pectoraux (haut)'],     secondary: ['Triceps (latéral)', 'Épaules (antérieures)'],  stabilisateur: ['Coiffe des rotateurs'] },
  'Incline Barbell Press':     { primary: ['Pectoraux (haut)'],     secondary: ['Triceps (latéral)', 'Épaules (antérieures)'],  stabilisateur: ['Coiffe des rotateurs'] },
  'Decline Bench Press':       { primary: ['Pectoraux (bas)'],      secondary: ['Triceps (latéral)', 'Épaules (antérieures)'],  stabilisateur: ['Coiffe des rotateurs'] },
  'Flat Dumbbell Press':       { primary: ['Pectoraux (milieu)'],   secondary: ['Triceps (latéral)', 'Épaules (antérieures)'],  stabilisateur: ['Coiffe des rotateurs'] },
  'Incline Dumbbell Press':    { primary: ['Pectoraux (haut)'],     secondary: ['Triceps (latéral)', 'Épaules (antérieures)'],  stabilisateur: ['Coiffe des rotateurs'] },
  'Decline Dumbbell Press':    { primary: ['Pectoraux (bas)'],      secondary: ['Triceps (latéral)'],                           stabilisateur: ['Coiffe des rotateurs'] },
  'Dumbbell Fly':              { primary: ['Pectoraux (milieu)'],   secondary: [] },
  'Cable Fly':                 { primary: ['Pectoraux (milieu)'],   secondary: [] },
  'Incline Cable Fly':         { primary: ['Pectoraux (haut)'],     secondary: [] },
  'Low Cable Fly':             { primary: ['Pectoraux (bas)'],      secondary: [] },
  'Pec Deck':                  { primary: ['Pectoraux (milieu)'],   secondary: [] },
  'Chest Press Machine':       { primary: ['Pectoraux (milieu)'],   secondary: ['Triceps (latéral)'] },
  'Svend Press':               { primary: ['Pectoraux (milieu)'],   secondary: [] },
  'Dips':                      { primary: ['Pectoraux (bas)'],      secondary: ['Triceps (long chef)', 'Épaules (antérieures)'],  stabilisateur: ['Coiffe des rotateurs'] },
  'Chest Dips':                { primary: ['Pectoraux (bas)'],      secondary: ['Triceps (long chef)'],                          stabilisateur: ['Coiffe des rotateurs'] },
  'Push-ups':                  { primary: ['Pectoraux (milieu)'],   secondary: ['Triceps (latéral)', 'Core (profond)'],           stabilisateur: ['Coiffe des rotateurs'] },
  'Wide Push-ups':             { primary: ['Pectoraux (milieu)'],   secondary: ['Épaules (antérieures)'] },
  'Diamond Push-ups':          { primary: ['Triceps (latéral)', 'Triceps (médial)'], secondary: ['Pectoraux (milieu)'] },
  'Archer Push-ups':           { primary: ['Pectoraux (milieu)'],   secondary: ['Épaules (antérieures)'] },
  'Explosive Push-ups':        { primary: ['Pectoraux (milieu)'],   secondary: ['Triceps (latéral)'] },
  'Clap Push-ups':             { primary: ['Pectoraux (milieu)'],   secondary: ['Triceps (latéral)'] },
  'One Arm Push-up':           { primary: ['Pectoraux (milieu)'],   secondary: ['Triceps (latéral)', 'Core (profond)'] },
  'Ring Dips':                 { primary: ['Pectoraux (bas)'],      secondary: ['Triceps (long chef)'] },

  // ── DOS ────────────────────────────────────────────────────────────────────
  'Deadlift':                  { primary: ['Érecteurs', 'Ischio-jambiers'],   secondary: ['Fessiers', 'Grand dorsal', 'Trapèzes (supérieurs)'],  stabilisateur: ['Core (profond)'] },
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
  'Pull-ups':                  { primary: ['Grand dorsal'],                   secondary: ['Biceps (chef long)', 'Rhomboïdes'],               stabilisateur: ['Coiffe des rotateurs'] },
  'Chin-ups':                  { primary: ['Grand dorsal'],                   secondary: ['Biceps (chef long)'],                             stabilisateur: ['Coiffe des rotateurs'] },
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
  'Face Pulls':                { primary: ['Épaules (postérieures)', 'Coiffe des rotateurs'], secondary: ['Rhomboïdes', 'Trapèzes (moyens)', 'Trapèzes (inférieurs)'] },
  'Rack Pulls':                { primary: ['Érecteurs', 'Grand dorsal'],      secondary: ['Trapèzes (supérieurs)'] },
  'Rowing Machine':            { primary: ['Grand dorsal'],                   secondary: ['Biceps (chef long)', 'Quadriceps'] },

  // ── ÉPAULES ────────────────────────────────────────────────────────────────
  'Shoulder Press':            { primary: ['Épaules (antérieures)'],          secondary: ['Triceps (latéral)', 'Trapèzes (supérieurs)'],     stabilisateur: ['Coiffe des rotateurs'] },
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
  'Hammer Curl':               { primary: ['Brachioradialis', 'Brachialis'],   secondary: ['Biceps (chef long)'] },
  'Preacher Curl':             { primary: ['Biceps (chef court)'],            secondary: [] },
  'Concentration Curl':        { primary: ['Biceps (chef court)'],            secondary: [] },
  'Incline Dumbbell Curl':     { primary: ['Biceps (chef long)'],             secondary: [] },
  'Cable Curl':                { primary: ['Biceps (chef long)', 'Biceps (chef court)'], secondary: [] },
  'Reverse Curl':              { primary: ['Brachioradialis', 'Brachialis'],   secondary: ['Avant-bras'] },
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

  // ── JAMBES ─────────────────────────────────────────────────────────────────
  'Squat':                     { primary: ['Quadriceps', 'Fessiers'],         secondary: ['Ischio-jambiers', 'Érecteurs', 'Core (profond)'],  stabilisateur: ['Gastrocnémien'] },
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
  'Romanian Deadlift':         { primary: ['Ischio-jambiers', 'Fessiers'],    secondary: ['Érecteurs', 'Gastrocnémien'] },
  'Stiff Leg Deadlift':        { primary: ['Ischio-jambiers'],                secondary: ['Érecteurs'] },
  'Bulgarian Split Squat':     { primary: ['Quadriceps', 'Fessiers'],         secondary: ['Ischio-jambiers'] },
  'Walking Lunges':            { primary: ['Quadriceps', 'Fessiers'],         secondary: ['Ischio-jambiers'] },
  'Reverse Lunges':            { primary: ['Quadriceps', 'Fessiers'],         secondary: ['Ischio-jambiers'] },
  'Lateral Lunges':            { primary: ['Quadriceps', 'Adducteurs'],       secondary: ['Fessiers', 'Moyen fessier'] },
  'Step-ups':                  { primary: ['Quadriceps', 'Fessiers'],         secondary: [] },
  'Hip Thrust':                { primary: ['Fessiers'],                       secondary: ['Ischio-jambiers'] },
  'Glute Bridge':              { primary: ['Fessiers'],                       secondary: ['Ischio-jambiers'] },
  'Pistol Squats':             { primary: ['Quadriceps'],                     secondary: ['Fessiers', 'Core (profond)'] },
  'Jump Squats':               { primary: ['Quadriceps'],                     secondary: ['Fessiers', 'Gastrocnémien'] },
  'Wall Sit':                  { primary: ['Quadriceps'],                     secondary: [] },
  'Sissy Squat':               { primary: ['Quadriceps'],                     secondary: [] },
  'Lunges':                    { primary: ['Quadriceps', 'Fessiers'],         secondary: ['Ischio-jambiers'] },
  'Calf Raises':               { primary: ['Gastrocnémien', 'Soléaire'],      secondary: [] },
  'Seated Calf Raises':        { primary: ['Soléaire'],                       secondary: ['Gastrocnémien'] },
  'Donkey Calf Raises':        { primary: ['Gastrocnémien', 'Soléaire'],      secondary: [] },

  // ── CORE ───────────────────────────────────────────────────────────────────
  'Plank':                     { primary: ['Core (profond)'],                 secondary: ['Épaules (antérieures)'] },
  'Side Plank':                { primary: ['Core (obliques)'],                secondary: ['Core (profond)'] },
  'Ab Wheel':                  { primary: ['Core (profond)'],                 secondary: ['Grand dorsal'] },
  'Hanging Leg Raise':         { primary: ['Core (profond)'],                 secondary: ['Core (obliques)'] },
  'Toes to Bar':               { primary: ['Core (profond)'],                 secondary: ['Core (obliques)'] },
  'Dragon Flag':               { primary: ['Core (profond)'],                 secondary: [] },
  'L-sit':                     { primary: ['Core (profond)'],                 secondary: ['Triceps (latéral)', 'Épaules (antérieures)'] },
  'V-ups':                     { primary: ['Core (profond)'],                 secondary: [] },
  'Bicycle Crunches':          { primary: ['Core (obliques)'],                secondary: ['Core (profond)'] },
  'Russian Twists':            { primary: ['Core (obliques)'],                secondary: [] },
  'Cable Crunch':              { primary: ['Core (profond)'],                 secondary: [] },
  'Decline Sit-ups':           { primary: ['Core (profond)'],                 secondary: [] },
  'Dead Bug':                  { primary: ['Core (profond)'],                 secondary: [] },
  'Copenhagen Plank':          { primary: ['Adducteurs', 'Core (obliques)'],  secondary: ['Core (profond)', 'Moyen fessier'] },
  'Hollow Body Hold':          { primary: ['Core (profond)'],                 secondary: [] },
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
  'Power Clean':               { primary: ['Quadriceps', 'Fessiers'],         secondary: ['Érecteurs', 'Épaules (antérieures)'] },
  'Clean and Jerk':            { primary: ['Quadriceps', 'Épaules (antérieures)'], secondary: ['Fessiers', 'Érecteurs'] },
  'Snatch':                    { primary: ['Quadriceps', 'Épaules (antérieures)'], secondary: ['Fessiers', 'Érecteurs'] },
  'Jump Rope':                 { primary: ['Gastrocnémien', 'Soléaire'],      secondary: ['Core (profond)'] },
  'Box Jumps':                 { primary: ['Quadriceps', 'Fessiers'],         secondary: ['Gastrocnémien', 'Ischio-jambiers'] },
  'Burpees':                   { primary: ['Core (profond)'],                 secondary: ['Pectoraux (milieu)', 'Quadriceps'] },
  'Sled Push':                 { primary: ['Quadriceps'],                     secondary: ['Fessiers', 'Érecteurs'] },
  'Battle Ropes':              { primary: ['Épaules (antérieures)'],          secondary: ['Core (obliques)'] },
  'Tire Flip':                 { primary: ['Fessiers', 'Ischio-jambiers'],    secondary: ['Érecteurs', 'Épaules (antérieures)'] },
  'Sprints':                   { primary: ['Quadriceps', 'Ischio-jambiers'],  secondary: ['Fessiers', 'Moyen fessier', 'Gastrocnémien'] },
  'Stair Climber':             { primary: ['Quadriceps', 'Fessiers'],         secondary: ['Gastrocnémien', 'Ischio-jambiers'] },
  'Assault Bike':              { primary: ['Quadriceps'],                     secondary: ['Épaules (antérieures)', 'Core (profond)'] },

  // ── PECTORAUX – Smith Machine, Variantes barbell, Calisthenics ─────────────
  'Smith Machine Bench Press':            { primary: ['Pectoraux (milieu)'],                      secondary: ['Triceps (latéral)', 'Épaules (antérieures)', 'Dentelé antérieur'] },
  'Smith Machine Incline Press':          { primary: ['Pectoraux (haut)'],                        secondary: ['Triceps (latéral)', 'Épaules (antérieures)', 'Dentelé antérieur'] },
  'Smith Machine Decline Press':          { primary: ['Pectoraux (bas)'],                         secondary: ['Triceps (latéral)', 'Épaules (antérieures)'] },
  'Floor Press':                          { primary: ['Pectoraux (milieu)'],                      secondary: ['Triceps (latéral)', 'Épaules (antérieures)'] },
  'Dumbbell Floor Press':                 { primary: ['Pectoraux (milieu)'],                      secondary: ['Triceps (latéral)', 'Épaules (antérieures)'] },
  'Cable Crossover':                      { primary: ['Pectoraux (milieu)'],                      secondary: ['Épaules (antérieures)', 'Dentelé antérieur'] },
  'High to Low Cable Fly':                { primary: ['Pectoraux (bas)'],                         secondary: ['Épaules (antérieures)', 'Dentelé antérieur'] },
  'Low to High Cable Fly':                { primary: ['Pectoraux (haut)'],                        secondary: ['Épaules (antérieures)', 'Dentelé antérieur'] },
  'Dumbbell Pullover':                    { primary: ['Grand dorsal'],                            secondary: ['Pectoraux (milieu)', 'Dentelé antérieur', 'Triceps (long chef)'] },
  'Barbell Pullover':                     { primary: ['Grand dorsal'],                            secondary: ['Pectoraux (milieu)', 'Dentelé antérieur', 'Triceps (long chef)'] },
  'Cable Pullover':                       { primary: ['Grand dorsal'],                            secondary: ['Pectoraux (milieu)', 'Dentelé antérieur'] },
  'Landmine Press':                       { primary: ['Pectoraux (haut)'],                        secondary: ['Épaules (antérieures)', 'Triceps (latéral)', 'Dentelé antérieur'] },
  'Paused Bench Press':                   { primary: ['Pectoraux (milieu)'],                      secondary: ['Triceps (latéral)', 'Épaules (antérieures)', 'Dentelé antérieur'] },
  'Board Press':                          { primary: ['Triceps (long chef)', 'Triceps (latéral)'],secondary: ['Pectoraux (milieu)', 'Épaules (antérieures)'] },
  'Spoto Press':                          { primary: ['Pectoraux (milieu)'],                      secondary: ['Triceps (latéral)', 'Épaules (antérieures)', 'Dentelé antérieur'] },
  'Larsen Press':                         { primary: ['Pectoraux (milieu)'],                      secondary: ['Triceps (latéral)', 'Core (profond)'] },
  'Guillotine Press':                     { primary: ['Pectoraux (haut)'],                        secondary: ['Épaules (antérieures)', 'Dentelé antérieur'] },
  'Wide Grip Bench Press':                { primary: ['Pectoraux (milieu)'],                      secondary: ['Épaules (antérieures)', 'Dentelé antérieur'] },
  'Competition Bench Press':              { primary: ['Pectoraux (milieu)', 'Pectoraux (bas)'],   secondary: ['Triceps (latéral)', 'Épaules (antérieures)', 'Dentelé antérieur'] },
  'Decline Push-ups':                     { primary: ['Pectoraux (bas)'],                         secondary: ['Triceps (latéral)', 'Épaules (antérieures)'] },
  'Incline Push-ups':                     { primary: ['Pectoraux (haut)'],                        secondary: ['Triceps (latéral)', 'Dentelé antérieur'] },
  'Feet Elevated Push-ups':               { primary: ['Pectoraux (haut)'],                        secondary: ['Épaules (antérieures)', 'Dentelé antérieur'] },
  'Deficit Push-ups':                     { primary: ['Pectoraux (milieu)'],                      secondary: ['Triceps (latéral)', 'Épaules (antérieures)', 'Dentelé antérieur'] },
  'Weighted Push-ups':                    { primary: ['Pectoraux (milieu)'],                      secondary: ['Triceps (latéral)', 'Épaules (antérieures)', 'Dentelé antérieur'] },
  'Ring Push-ups':                        { primary: ['Pectoraux (milieu)'],                      secondary: ['Triceps (latéral)', 'Dentelé antérieur', 'Core (profond)'] },
  'TRX Push-ups':                         { primary: ['Pectoraux (milieu)'],                      secondary: ['Triceps (latéral)', 'Dentelé antérieur', 'Core (profond)'] },
  'TRX Chest Fly':                        { primary: ['Pectoraux (milieu)'],                      secondary: ['Épaules (antérieures)', 'Dentelé antérieur', 'Core (profond)'] },
  'Hindu Push-ups':                       { primary: ['Pectoraux (milieu)'],                      secondary: ['Épaules (antérieures)', 'Dentelé antérieur', 'Érecteurs'] },
  'Dumbbell Squeeze Press':               { primary: ['Pectoraux (milieu)'],                      secondary: ['Triceps (latéral)'] },
  'Low Incline Dumbbell Press':           { primary: ['Pectoraux (haut)'],                        secondary: ['Triceps (latéral)', 'Épaules (antérieures)', 'Dentelé antérieur'] },
  'Push-up Plus':                         { primary: ['Dentelé antérieur'],                       secondary: ['Pectoraux (milieu)', 'Épaules (antérieures)'] },
  'Close Grip Incline Press':             { primary: ['Pectoraux (haut)', 'Triceps (latéral)'],   secondary: ['Épaules (antérieures)'] },
  'Plate Press':                          { primary: ['Pectoraux (milieu)'],                      secondary: ['Triceps (latéral)'] },

  // ── DOS – Smith Machine, Câbles, Haltères, Variantes ───────────────────────
  'Smith Machine Row':                    { primary: ['Grand dorsal', 'Rhomboïdes'],              secondary: ['Biceps (chef long)', 'Grand rond', 'Trapèzes (moyens)'] },
  'Single Arm Cable Row':                 { primary: ['Grand dorsal'],                            secondary: ['Biceps (chef long)', 'Grand rond', 'Rhomboïdes', 'Trapèzes (moyens)'] },
  'High Cable Row':                       { primary: ['Rhomboïdes', 'Trapèzes (moyens)'],         secondary: ['Grand dorsal', 'Biceps (chef long)', 'Grand rond'] },
  'Wide Grip Cable Row':                  { primary: ['Grand dorsal', 'Rhomboïdes'],              secondary: ['Biceps (chef long)', 'Grand rond', 'Trapèzes (moyens)'] },
  'Incline Dumbbell Row':                 { primary: ['Grand dorsal'],                            secondary: ['Biceps (chef long)', 'Grand rond', 'Rhomboïdes'] },
  'Prone Dumbbell Row':                   { primary: ['Rhomboïdes', 'Grand dorsal'],              secondary: ['Biceps (chef long)', 'Grand rond', 'Trapèzes (moyens)'] },
  'Seal Row':                             { primary: ['Rhomboïdes', 'Grand dorsal'],              secondary: ['Biceps (chef long)', 'Grand rond', 'Trapèzes (moyens)'] },
  'Gorilla Row':                          { primary: ['Grand dorsal'],                            secondary: ['Biceps (chef long)', 'Grand rond', 'Rhomboïdes', 'Core (profond)'] },
  'Landmine Row':                         { primary: ['Grand dorsal', 'Rhomboïdes'],              secondary: ['Biceps (chef long)', 'Grand rond', 'Trapèzes (moyens)', 'Core (profond)'] },
  'Single Arm Landmine Row':              { primary: ['Grand dorsal'],                            secondary: ['Biceps (chef long)', 'Grand rond', 'Core (obliques)'] },
  'Yates Row':                            { primary: ['Grand dorsal'],                            secondary: ['Biceps (chef long)', 'Grand rond', 'Rhomboïdes', 'Trapèzes (moyens)'] },
  'One Arm Machine Row':                  { primary: ['Grand dorsal'],                            secondary: ['Biceps (chef long)', 'Grand rond', 'Rhomboïdes'] },
  'Chest Supported T-Bar Row':            { primary: ['Rhomboïdes', 'Grand dorsal'],              secondary: ['Biceps (chef long)', 'Grand rond', 'Trapèzes (moyens)'] },
  'Good Mornings':                        { primary: ['Ischio-jambiers', 'Fessiers'],             secondary: ['Érecteurs', 'Grand dorsal'] },
  'Barbell Good Morning':                 { primary: ['Ischio-jambiers', 'Fessiers'],             secondary: ['Érecteurs', 'Grand dorsal'] },
  'Back Extension':                       { primary: ['Érecteurs'],                               secondary: ['Fessiers', 'Ischio-jambiers'] },
  'Hyperextension':                       { primary: ['Érecteurs'],                               secondary: ['Fessiers', 'Ischio-jambiers'] },
  '45-Degree Back Extension':             { primary: ['Érecteurs', 'Fessiers'],                   secondary: ['Ischio-jambiers'] },
  'GHD Back Extension':                   { primary: ['Ischio-jambiers', 'Fessiers'],             secondary: ['Érecteurs'] },
  'Reverse Hyperextension':               { primary: ['Fessiers', 'Ischio-jambiers'],             secondary: ['Érecteurs'] },
  'Jefferson Curl':                       { primary: ['Érecteurs'],                               secondary: ['Ischio-jambiers'] },
  'Deficit Deadlift':                     { primary: ['Fessiers', 'Ischio-jambiers', 'Quadriceps'],secondary: ['Érecteurs', 'Grand dorsal'] },
  'Block Pull':                           { primary: ['Fessiers', 'Ischio-jambiers', 'Érecteurs'],secondary: ['Grand dorsal', 'Trapèzes (supérieurs)'] },
  'Snatch Grip Deadlift':                 { primary: ['Fessiers', 'Ischio-jambiers', 'Érecteurs'],secondary: ['Grand dorsal', 'Trapèzes (supérieurs)', 'Grand rond'] },
  'Paused Deadlift':                      { primary: ['Fessiers', 'Ischio-jambiers', 'Érecteurs'],secondary: ['Quadriceps', 'Grand dorsal'] },
  'Cable Pull-Through':                   { primary: ['Fessiers', 'Ischio-jambiers'],             secondary: ['Érecteurs', 'Core (profond)'] },
  'Single Leg Romanian Deadlift':         { primary: ['Ischio-jambiers', 'Fessiers'],             secondary: ['Érecteurs', 'Moyen fessier', 'Core (profond)'] },
  'Band Pull-Apart':                      { primary: ['Épaules (postérieures)', 'Trapèzes (moyens)'],secondary: ['Rhomboïdes', 'Coiffe des rotateurs'] },
  'Smith Machine Shrugs':                 { primary: ['Trapèzes (supérieurs)'],                   secondary: ['Trapèzes (moyens)'] },
  'Cable Shrugs':                         { primary: ['Trapèzes (supérieurs)'],                   secondary: ['Trapèzes (moyens)'] },
  'Behind the Back Shrugs':               { primary: ['Trapèzes (supérieurs)'],                   secondary: ['Grand rond'] },
  'Trap Bar Shrugs':                      { primary: ['Trapèzes (supérieurs)'],                   secondary: ['Trapèzes (moyens)'] },
  'Snatch Grip Rack Pull':                { primary: ['Érecteurs', 'Grand dorsal'],               secondary: ['Trapèzes (supérieurs)', 'Grand rond', 'Épaules (postérieures)'] },
  'Belt Squat Good Morning':              { primary: ['Ischio-jambiers', 'Fessiers'],             secondary: ['Érecteurs'] },
  'Glute Ham Raise':                      { primary: ['Ischio-jambiers'],                         secondary: ['Fessiers', 'Gastrocnémien', 'Érecteurs'] },
  'Natural Glute Ham Raise':              { primary: ['Ischio-jambiers'],                         secondary: ['Fessiers', 'Gastrocnémien'] },

  // ── ÉPAULES – Push Press, Z-Press, Isolation, Coiffe des rotateurs ──────────
  'Push Press':                           { primary: ['Épaules (antérieures)', 'Épaules (latérales)'],secondary: ['Triceps (latéral)', 'Quadriceps', 'Fessiers'] },
  'Strict Press':                         { primary: ['Épaules (antérieures)', 'Épaules (latérales)'],secondary: ['Triceps (latéral)', 'Trapèzes (supérieurs)'] },
  'Z-Press':                              { primary: ['Épaules (antérieures)', 'Épaules (latérales)'],secondary: ['Triceps (latéral)', 'Core (profond)'] },
  'Bradford Press':                       { primary: ['Épaules (antérieures)', 'Épaules (latérales)'],secondary: ['Triceps (latéral)'] },
  'Behind the Neck Press':                { primary: ['Épaules (latérales)', 'Épaules (antérieures)'],secondary: ['Triceps (latéral)', 'Trapèzes (supérieurs)'] },
  'Landmine Shoulder Press':              { primary: ['Épaules (antérieures)'],                   secondary: ['Triceps (latéral)', 'Pectoraux (haut)', 'Dentelé antérieur'] },
  'Single Arm Dumbbell Press':            { primary: ['Épaules (antérieures)', 'Épaules (latérales)'],secondary: ['Triceps (latéral)', 'Core (obliques)'] },
  'Cable Shoulder Press':                 { primary: ['Épaules (antérieures)', 'Épaules (latérales)'],secondary: ['Triceps (latéral)'] },
  'Seated Dumbbell Lateral Raise':        { primary: ['Épaules (latérales)'],                     secondary: ['Coiffe des rotateurs'] },
  'Leaning Cable Lateral Raise':          { primary: ['Épaules (latérales)'],                     secondary: ['Coiffe des rotateurs'] },
  'Lying Cable Lateral Raise':            { primary: ['Épaules (latérales)'],                     secondary: ['Coiffe des rotateurs'] },
  'Incline Lateral Raise':                { primary: ['Épaules (latérales)'],                     secondary: ['Coiffe des rotateurs', 'Trapèzes (inférieurs)'] },
  'Plate Front Raise':                    { primary: ['Épaules (antérieures)'],                   secondary: [] },
  'Barbell Front Raise':                  { primary: ['Épaules (antérieures)'],                   secondary: ['Trapèzes (supérieurs)'] },
  'Cable Front Raise':                    { primary: ['Épaules (antérieures)'],                   secondary: [] },
  'Bent Over Lateral Raise':              { primary: ['Épaules (postérieures)'],                  secondary: ['Trapèzes (moyens)', 'Rhomboïdes', 'Coiffe des rotateurs'] },
  'Cable Rear Delt Fly':                  { primary: ['Épaules (postérieures)', 'Coiffe des rotateurs'],secondary: ['Rhomboïdes', 'Trapèzes (moyens)'] },
  'Reverse Pec Deck':                     { primary: ['Épaules (postérieures)'],                  secondary: ['Rhomboïdes', 'Trapèzes (moyens)', 'Coiffe des rotateurs'] },
  'Machine Rear Delt':                    { primary: ['Épaules (postérieures)'],                  secondary: ['Rhomboïdes', 'Coiffe des rotateurs'] },
  'Cuban Press':                          { primary: ['Épaules (postérieures)', 'Coiffe des rotateurs'],secondary: ['Épaules (latérales)', 'Trapèzes (moyens)'] },
  'External Shoulder Rotation':           { primary: ['Coiffe des rotateurs'],                    secondary: ['Épaules (postérieures)'] },
  'Internal Shoulder Rotation':           { primary: ['Coiffe des rotateurs'],                    secondary: [] },
  'Prone Y-Raise':                        { primary: ['Trapèzes (inférieurs)'],                   secondary: ['Épaules (postérieures)', 'Dentelé antérieur'] },
  'Prone T-Raise':                        { primary: ['Trapèzes (moyens)', 'Épaules (postérieures)'],secondary: ['Rhomboïdes'] },
  'Prone W-Raise':                        { primary: ['Coiffe des rotateurs', 'Épaules (postérieures)'],secondary: ['Trapèzes (inférieurs)', 'Rhomboïdes'] },
  'Scaption':                             { primary: ['Épaules (latérales)'],                     secondary: ['Coiffe des rotateurs', 'Dentelé antérieur'] },
  'Cable High Pull':                      { primary: ['Épaules (latérales)', 'Trapèzes (supérieurs)'],secondary: ['Biceps (chef long)', 'Épaules (postérieures)'] },
  'Log Press':                            { primary: ['Épaules (antérieures)', 'Épaules (latérales)'],secondary: ['Triceps (latéral)', 'Trapèzes (supérieurs)'] },
  'Viking Press':                         { primary: ['Épaules (antérieures)', 'Épaules (latérales)'],secondary: ['Triceps (latéral)', 'Trapèzes (supérieurs)'] },
  'Face Pull to Press':                   { primary: ['Épaules (postérieures)', 'Coiffe des rotateurs', 'Épaules (antérieures)'],secondary: ['Trapèzes (moyens)', 'Rhomboïdes'] },
  'Serratus Wall Slides':                 { primary: ['Dentelé antérieur'],                       secondary: ['Trapèzes (inférieurs)', 'Épaules (antérieures)'] },
  'Wall Slides':                          { primary: ['Dentelé antérieur', 'Trapèzes (inférieurs)'],secondary: ['Épaules (postérieures)', 'Coiffe des rotateurs'] },

  // ── BICEPS – Variantes câbles, haltères, machines ──────────────────────────
  'Alternating Dumbbell Curl':            { primary: ['Biceps (chef long)', 'Biceps (chef court)'],secondary: ['Brachialis', 'Brachioradialis'] },
  'Seated Dumbbell Curl':                 { primary: ['Biceps (chef long)', 'Biceps (chef court)'],secondary: ['Brachialis'] },
  'Drag Curl':                            { primary: ['Biceps (chef long)'],                      secondary: ['Brachialis'] },
  'High Cable Curl':                      { primary: ['Biceps (chef long)', 'Biceps (chef court)'],secondary: ['Brachialis'] },
  'Low Cable Curl':                       { primary: ['Biceps (chef long)', 'Biceps (chef court)'],secondary: ['Brachialis', 'Brachioradialis'] },
  'Bayesian Curl':                        { primary: ['Biceps (chef long)'],                      secondary: ['Brachialis'] },
  'Overhead Cable Curl':                  { primary: ['Biceps (chef long)'],                      secondary: ['Brachialis'] },
  '21s':                                  { primary: ['Biceps (chef long)', 'Biceps (chef court)'],secondary: ['Brachialis'] },
  'Machine Curl':                         { primary: ['Biceps (chef long)', 'Biceps (chef court)'],secondary: ['Brachialis'] },
  'Prone Incline Curl':                   { primary: ['Biceps (chef long)'],                      secondary: ['Brachialis', 'Brachioradialis'] },
  'Reverse EZ Bar Curl':                  { primary: ['Brachioradialis', 'Brachialis'],            secondary: ['Avant-bras'] },
  'TRX Curl':                             { primary: ['Biceps (chef long)', 'Biceps (chef court)'],secondary: ['Brachialis', 'Core (profond)'] },
  'Wide Grip Barbell Curl':               { primary: ['Biceps (chef court)'],                     secondary: ['Brachialis', 'Brachioradialis'] },
  'Narrow Grip Barbell Curl':             { primary: ['Biceps (chef long)'],                      secondary: ['Brachialis'] },
  'Seated Hammer Curl':                   { primary: ['Brachioradialis', 'Brachialis'],            secondary: ['Biceps (chef long)'] },
  'Incline Hammer Curl':                  { primary: ['Brachioradialis', 'Brachialis'],            secondary: ['Biceps (chef long)'] },
  'Cable Hammer Curl':                    { primary: ['Brachioradialis', 'Brachialis'],            secondary: ['Biceps (chef long)'] },
  'Single Arm Preacher Curl':             { primary: ['Biceps (chef court)'],                     secondary: ['Brachialis'] },

  // ── TRICEPS – Câbles, Haltères, Machines ───────────────────────────────────
  'Overhead Cable Triceps Extension':     { primary: ['Triceps (long chef)'],                     secondary: ['Triceps (médial)'] },
  'Single Arm Overhead Extension':        { primary: ['Triceps (long chef)'],                     secondary: ['Triceps (médial)'] },
  'One Arm Overhead Cable Extension':     { primary: ['Triceps (long chef)'],                     secondary: ['Triceps (médial)'] },
  'Single Arm Cable Pushdown':            { primary: ['Triceps (latéral)'],                       secondary: ['Triceps (médial)'] },
  'Reverse Grip Pushdown':                { primary: ['Triceps (médial)'],                        secondary: ['Triceps (latéral)'] },
  'Tate Press':                           { primary: ['Triceps (latéral)', 'Triceps (médial)'],   secondary: [] },
  'Rolling Triceps Extension':            { primary: ['Triceps (long chef)'],                     secondary: ['Triceps (latéral)', 'Triceps (médial)'] },
  'Lying Triceps Extension':              { primary: ['Triceps (long chef)'],                     secondary: ['Triceps (latéral)', 'Triceps (médial)'] },
  'Bench Dips':                           { primary: ['Triceps (latéral)', 'Triceps (médial)'],   secondary: ['Pectoraux (bas)', 'Épaules (antérieures)'] },
  'Weighted Dips':                        { primary: ['Pectoraux (bas)', 'Triceps (long chef)'],  secondary: ['Épaules (antérieures)', 'Grand rond'] },
  'Straight Bar Dips':                    { primary: ['Pectoraux (bas)', 'Triceps (long chef)'],  secondary: ['Épaules (antérieures)', 'Grand rond', 'Dentelé antérieur'] },
  'Single Arm Skull Crusher':             { primary: ['Triceps (long chef)'],                     secondary: ['Triceps (latéral)'] },
  'Band Pushdown':                        { primary: ['Triceps (latéral)'],                       secondary: ['Triceps (médial)'] },
  'Triceps Machine':                      { primary: ['Triceps (latéral)', 'Triceps (médial)'],   secondary: [] },
  'Smith Machine Close Grip Press':       { primary: ['Triceps (latéral)', 'Triceps (médial)'],   secondary: ['Pectoraux (milieu)'] },

  // ── JAMBES – Smith Machine, Câbles, Machines, Variantes ────────────────────
  'Smith Machine Squat':                  { primary: ['Quadriceps', 'Fessiers'],                  secondary: ['Ischio-jambiers', 'Core (profond)'] },
  'Smith Machine Lunge':                  { primary: ['Quadriceps', 'Fessiers'],                  secondary: ['Ischio-jambiers'] },
  'Smith Machine Bulgarian Split Squat':  { primary: ['Quadriceps', 'Fessiers'],                  secondary: ['Ischio-jambiers', 'Moyen fessier'] },
  'Smith Machine Hip Thrust':             { primary: ['Fessiers'],                                secondary: ['Ischio-jambiers', 'Moyen fessier'] },
  'Smith Machine Calf Raises':            { primary: ['Gastrocnémien', 'Soléaire'],               secondary: [] },
  'Machine Hack Squat':                   { primary: ['Quadriceps'],                              secondary: ['Fessiers', 'Adducteurs'] },
  'V-Squat':                              { primary: ['Quadriceps'],                              secondary: ['Fessiers'] },
  'Pendulum Squat':                       { primary: ['Quadriceps'],                              secondary: ['Fessiers', 'Adducteurs'] },
  'Belt Squat':                           { primary: ['Quadriceps', 'Fessiers'],                  secondary: ['Ischio-jambiers', 'Érecteurs'] },
  'Hip Abduction Machine':                { primary: ['Moyen fessier'],                           secondary: ['Petit fessier'] },
  'Hip Adduction Machine':                { primary: ['Adducteurs'],                              secondary: ['Moyen fessier'] },
  'Glute Kickback Machine':               { primary: ['Fessiers'],                                secondary: ['Ischio-jambiers'] },
  'Cable Hip Abduction':                  { primary: ['Moyen fessier'],                           secondary: ['Petit fessier', 'Core (profond)'] },
  'Cable Hip Adduction':                  { primary: ['Adducteurs'],                              secondary: ['Core (profond)'] },
  'Cable Kickback':                       { primary: ['Fessiers'],                                secondary: ['Ischio-jambiers'] },
  'Donkey Kicks':                         { primary: ['Fessiers'],                                secondary: ['Ischio-jambiers', 'Core (profond)'] },
  'Fire Hydrants':                        { primary: ['Moyen fessier'],                           secondary: ['Petit fessier', 'Core (profond)'] },
  'Single Leg Hip Thrust':                { primary: ['Fessiers'],                                secondary: ['Ischio-jambiers', 'Moyen fessier', 'Core (profond)'] },
  'Banded Hip Thrust':                    { primary: ['Fessiers', 'Moyen fessier'],               secondary: ['Ischio-jambiers'] },
  'Banded Glute Bridge':                  { primary: ['Fessiers', 'Moyen fessier'],               secondary: ['Ischio-jambiers'] },
  'Frog Pump':                            { primary: ['Fessiers'],                                secondary: ['Adducteurs', 'Moyen fessier'] },
  'Clamshells':                           { primary: ['Moyen fessier'],                           secondary: ['Petit fessier', 'Coiffe des rotateurs'] },
  'Side Lying Hip Abduction':             { primary: ['Moyen fessier'],                           secondary: ['Petit fessier'] },
  'Banded Monster Walk':                  { primary: ['Moyen fessier'],                           secondary: ['Quadriceps', 'Fessiers'] },
  'Lateral Band Walk':                    { primary: ['Moyen fessier'],                           secondary: ['Petit fessier', 'Fessiers'] },
  'Single Leg Press':                     { primary: ['Quadriceps', 'Fessiers'],                  secondary: ['Ischio-jambiers', 'Moyen fessier'] },
  'Single Leg Leg Extension':             { primary: ['Quadriceps'],                              secondary: [] },
  'Single Leg Leg Curl':                  { primary: ['Ischio-jambiers'],                         secondary: ['Gastrocnémien'] },
  'Hip Thrust Machine':                   { primary: ['Fessiers'],                                secondary: ['Ischio-jambiers', 'Moyen fessier'] },
  'Sumo Squat':                           { primary: ['Quadriceps', 'Adducteurs'],                secondary: ['Fessiers', 'Moyen fessier'] },
  'Zercher Squat':                        { primary: ['Quadriceps', 'Fessiers'],                  secondary: ['Érecteurs', 'Core (profond)', 'Biceps (chef long)'] },
  'Safety Bar Squat':                     { primary: ['Quadriceps', 'Fessiers'],                  secondary: ['Ischio-jambiers', 'Érecteurs'] },
  'Low Bar Squat':                        { primary: ['Fessiers', 'Quadriceps'],                  secondary: ['Ischio-jambiers', 'Érecteurs'] },
  'High Bar Squat':                       { primary: ['Quadriceps', 'Fessiers'],                  secondary: ['Ischio-jambiers', 'Érecteurs'] },
  'Overhead Squat':                       { primary: ['Quadriceps'],                              secondary: ['Fessiers', 'Érecteurs', 'Épaules (latérales)', 'Core (profond)'] },
  'Cambered Bar Squat':                   { primary: ['Quadriceps', 'Fessiers'],                  secondary: ['Érecteurs', 'Core (profond)'] },
  'Split Squat':                          { primary: ['Quadriceps', 'Fessiers'],                  secondary: ['Ischio-jambiers', 'Moyen fessier'] },
  'Curtsy Lunge':                         { primary: ['Fessiers', 'Adducteurs'],                  secondary: ['Quadriceps', 'Moyen fessier'] },
  'Jump Lunges':                          { primary: ['Quadriceps', 'Fessiers'],                  secondary: ['Ischio-jambiers', 'Gastrocnémien'] },
  'Jump Split Squats':                    { primary: ['Quadriceps', 'Fessiers'],                  secondary: ['Ischio-jambiers', 'Gastrocnémien'] },
  'Shrimp Squat':                         { primary: ['Quadriceps'],                              secondary: ['Fessiers', 'Ischio-jambiers', 'Core (profond)'] },
  'Single Leg Calf Raises':               { primary: ['Gastrocnémien', 'Soléaire'],               secondary: [] },
  'Trap Bar Romanian Deadlift':           { primary: ['Ischio-jambiers', 'Fessiers'],             secondary: ['Érecteurs'] },
  'Suitcase Deadlift':                    { primary: ['Fessiers', 'Ischio-jambiers', 'Érecteurs'],secondary: ['Core (obliques)', 'Trapèzes (supérieurs)'] },
  'Paused Romanian Deadlift':             { primary: ['Ischio-jambiers', 'Fessiers'],             secondary: ['Érecteurs'] },
  'Snatch Grip Romanian Deadlift':        { primary: ['Ischio-jambiers', 'Fessiers'],             secondary: ['Érecteurs', 'Grand rond'] },
  'Sumo Romanian Deadlift':               { primary: ['Ischio-jambiers', 'Fessiers', 'Adducteurs'],secondary: ['Érecteurs'] },
  'Staggered Stance RDL':                 { primary: ['Ischio-jambiers', 'Fessiers'],             secondary: ['Érecteurs', 'Core (profond)'] },
  'Landmine Romanian Deadlift':           { primary: ['Ischio-jambiers', 'Fessiers'],             secondary: ['Érecteurs', 'Core (obliques)'] },

  // ── CORE – Câbles, Anti-rotation, Lestés ────────────────────────────────────
  'Cable Pallof Press':                   { primary: ['Core (obliques)', 'Core (profond)'],       secondary: ['Épaules (antérieures)'] },
  'Pallof Press':                         { primary: ['Core (obliques)', 'Core (profond)'],       secondary: [] },
  'Woodchopper':                          { primary: ['Core (obliques)'],                         secondary: ['Épaules (antérieures)', 'Core (profond)'] },
  'Low to High Woodchopper':              { primary: ['Core (obliques)'],                         secondary: ['Épaules (antérieures)', 'Core (profond)'] },
  'Landmine Rotation':                    { primary: ['Core (obliques)'],                         secondary: ['Épaules (antérieures)', 'Core (profond)'] },
  'Turkish Get-up':                       { primary: ['Core (profond)'],                          secondary: ['Épaules (antérieures)', 'Quadriceps', 'Fessiers', 'Core (obliques)'] },
  'Windmill':                             { primary: ['Core (obliques)'],                         secondary: ['Épaules (latérales)', 'Ischio-jambiers', 'Core (profond)'] },
  'Suitcase Carry':                       { primary: ['Core (obliques)'],                         secondary: ['Avant-bras', 'Trapèzes (supérieurs)', 'Core (profond)'] },
  'Weighted Plank':                       { primary: ['Core (profond)'],                          secondary: ['Épaules (antérieures)', 'Fessiers'] },
  'RKC Plank':                            { primary: ['Core (profond)'],                          secondary: ['Fessiers', 'Quadriceps'] },
  'Long Lever Plank':                     { primary: ['Core (profond)'],                          secondary: ['Épaules (antérieures)', 'Fessiers'] },
  'Ab Crunch Machine':                    { primary: ['Core (profond)'],                          secondary: [] },
  'Decline Crunch':                       { primary: ['Core (profond)'],                          secondary: ['Core (obliques)'] },
  'Cable Rope Crunch':                    { primary: ['Core (profond)'],                          secondary: ['Core (obliques)'] },
  'Weighted Crunch':                      { primary: ['Core (profond)'],                          secondary: [] },
  'Reverse Crunch':                       { primary: ['Core (profond)'],                          secondary: ['Core (obliques)'] },
  'Flutter Kicks':                        { primary: ['Core (profond)'],                          secondary: ['Quadriceps'] },
  'Scissor Kicks':                        { primary: ['Core (profond)'],                          secondary: ['Adducteurs'] },
  'Leg Raise':                            { primary: ['Core (profond)'],                          secondary: ['Quadriceps'] },
  'Bench Leg Raise':                      { primary: ['Core (profond)'],                          secondary: [] },
  'Windshield Wipers':                    { primary: ['Core (obliques)'],                         secondary: ['Core (profond)', 'Adducteurs'] },
  'Stir the Pot':                         { primary: ['Core (profond)'],                          secondary: ['Épaules (antérieures)'] },
  'Bear Crawl':                           { primary: ['Core (profond)'],                          secondary: ['Épaules (antérieures)', 'Quadriceps'] },
  'Inchworm':                             { primary: ['Core (profond)'],                          secondary: ['Ischio-jambiers', 'Épaules (antérieures)'] },
  'GHD Sit-up':                           { primary: ['Core (profond)'],                          secondary: ['Quadriceps', 'Ischio-jambiers'] },
  'Crunch':                               { primary: ['Core (profond)'],                          secondary: [] },
  'Sit-up':                               { primary: ['Core (profond)'],                          secondary: ['Quadriceps'] },
  'McGill Curl-up':                       { primary: ['Core (profond)'],                          secondary: [] },
  'Anti-Rotation Press':                  { primary: ['Core (obliques)', 'Core (profond)'],       secondary: [] },
  'Plank to Downward Dog':                { primary: ['Core (profond)', 'Épaules (antérieures)'], secondary: ['Ischio-jambiers', 'Dentelé antérieur'] },

  // ── CALISTHENICS – Progressions avancées ────────────────────────────────────
  'Weighted Pull-ups':                    { primary: ['Grand dorsal'],                            secondary: ['Biceps (chef long)', 'Grand rond', 'Brachialis', 'Rhomboïdes'] },
  'Weighted Chin-ups':                    { primary: ['Grand dorsal'],                            secondary: ['Biceps (chef long)', 'Biceps (chef court)', 'Brachialis', 'Grand rond'] },
  'Archer Pull-ups':                      { primary: ['Grand dorsal'],                            secondary: ['Biceps (chef long)', 'Grand rond', 'Core (obliques)'] },
  'Archer Chin-ups':                      { primary: ['Grand dorsal'],                            secondary: ['Biceps (chef long)', 'Biceps (chef court)', 'Grand rond'] },
  'One Arm Pull-up':                      { primary: ['Grand dorsal'],                            secondary: ['Biceps (chef long)', 'Grand rond', 'Core (obliques)'] },
  'False Grip Pull-ups':                  { primary: ['Grand dorsal'],                            secondary: ['Biceps (chef long)', 'Avant-bras', 'Grand rond'] },
  'L-sit Pull-ups':                       { primary: ['Grand dorsal', 'Core (profond)'],          secondary: ['Biceps (chef long)', 'Grand rond'] },
  'L-sit Chin-ups':                       { primary: ['Grand dorsal', 'Core (profond)'],          secondary: ['Biceps (chef long)', 'Biceps (chef court)'] },
  'Tuck Front Lever':                     { primary: ['Grand dorsal', 'Core (profond)'],          secondary: ['Grand rond', 'Biceps (chef long)', 'Dentelé antérieur'] },
  'Advanced Tuck Front Lever':            { primary: ['Grand dorsal', 'Core (profond)'],          secondary: ['Grand rond', 'Dentelé antérieur', 'Biceps (chef long)'] },
  'Straddle Front Lever':                 { primary: ['Grand dorsal', 'Core (profond)'],          secondary: ['Grand rond', 'Dentelé antérieur', 'Rhomboïdes'] },
  'One Leg Front Lever':                  { primary: ['Grand dorsal', 'Core (profond)'],          secondary: ['Grand rond', 'Dentelé antérieur'] },
  'Tuck Planche Push-ups':               { primary: ['Épaules (antérieures)', 'Dentelé antérieur'],secondary: ['Pectoraux (milieu)', 'Triceps (latéral)', 'Core (profond)'] },
  'Straddle Planche Push-ups':           { primary: ['Épaules (antérieures)', 'Dentelé antérieur', 'Core (profond)'],secondary: ['Pectoraux (milieu)', 'Triceps (latéral)'] },
  'Pseudo Planche Push-ups':              { primary: ['Épaules (antérieures)', 'Dentelé antérieur'],secondary: ['Pectoraux (milieu)', 'Triceps (latéral)', 'Core (profond)'] },
  'Ring Support Hold':                    { primary: ['Épaules (antérieures)', 'Dentelé antérieur'],secondary: ['Pectoraux (milieu)', 'Triceps (latéral)', 'Core (profond)'] },
  'Skin the Cat':                         { primary: ['Grand dorsal', 'Grand rond'],              secondary: ['Biceps (chef long)', 'Épaules (postérieures)', 'Core (profond)'] },
  'German Hang':                          { primary: ['Épaules (postérieures)', 'Coiffe des rotateurs'],secondary: ['Grand dorsal', 'Grand rond'] },
  'Handstand Hold':                       { primary: ['Épaules (antérieures)', 'Épaules (latérales)'],secondary: ['Dentelé antérieur', 'Trapèzes (inférieurs)', 'Core (profond)'] },
  'Wall Walk':                            { primary: ['Épaules (antérieures)', 'Épaules (latérales)'],secondary: ['Dentelé antérieur', 'Core (profond)'] },
  'Freestanding Handstand Push-ups':      { primary: ['Épaules (antérieures)', 'Épaules (latérales)'],secondary: ['Triceps (latéral)', 'Dentelé antérieur', 'Trapèzes (inférieurs)', 'Core (profond)'] },
  'Ice Cream Maker':                      { primary: ['Grand dorsal', 'Core (profond)'],          secondary: ['Biceps (chef long)', 'Grand rond', 'Dentelé antérieur'] },
  'Single Arm Ring Row':                  { primary: ['Grand dorsal', 'Rhomboïdes'],              secondary: ['Biceps (chef long)', 'Grand rond', 'Core (obliques)'] },
  'Elbow Lever':                          { primary: ['Core (profond)', 'Épaules (antérieures)'], secondary: ['Triceps (latéral)'] },
  'Crow Stand':                           { primary: ['Core (profond)', 'Épaules (antérieures)'], secondary: ['Avant-bras', 'Triceps (latéral)'] },
  'Handstand Walk':                       { primary: ['Épaules (antérieures)', 'Épaules (latérales)'],secondary: ['Core (profond)', 'Dentelé antérieur'] },

  // ── POWERLIFTING – Variantes compétition ────────────────────────────────────
  'Competition Squat':                    { primary: ['Quadriceps', 'Fessiers'],                  secondary: ['Ischio-jambiers', 'Érecteurs', 'Core (profond)'] },
  'Wide Stance Squat':                    { primary: ['Fessiers', 'Adducteurs', 'Quadriceps'],    secondary: ['Ischio-jambiers', 'Érecteurs'] },
  'Narrow Stance Squat':                  { primary: ['Quadriceps'],                              secondary: ['Fessiers', 'Érecteurs'] },
  'Paused Front Squat':                   { primary: ['Quadriceps'],                              secondary: ['Fessiers', 'Core (profond)', 'Érecteurs'] },
  'Pause Deadlift':                       { primary: ['Fessiers', 'Ischio-jambiers', 'Érecteurs'],secondary: ['Quadriceps', 'Grand dorsal'] },
  'Deficit Sumo Deadlift':                { primary: ['Fessiers', 'Quadriceps', 'Adducteurs'],    secondary: ['Érecteurs', 'Ischio-jambiers'] },
  'Competition Deadlift':                 { primary: ['Fessiers', 'Ischio-jambiers', 'Érecteurs'],secondary: ['Grand dorsal', 'Trapèzes (supérieurs)', 'Grand rond'] },
  'Reverse Band Deadlift':                { primary: ['Fessiers', 'Ischio-jambiers', 'Érecteurs'],secondary: ['Grand dorsal', 'Trapèzes (supérieurs)'] },
  'Reverse Band Squat':                   { primary: ['Quadriceps', 'Fessiers'],                  secondary: ['Ischio-jambiers', 'Érecteurs'] },
  'Banded Squat':                         { primary: ['Quadriceps', 'Fessiers'],                  secondary: ['Moyen fessier', 'Ischio-jambiers'] },
  'Box Deadlift':                         { primary: ['Fessiers', 'Ischio-jambiers', 'Érecteurs'],secondary: ['Grand dorsal', 'Quadriceps'] },
  'JM Press Machine':                     { primary: ['Triceps (long chef)'],                     secondary: ['Triceps (médial)', 'Pectoraux (milieu)'] },
  'Banded Bench Press':                   { primary: ['Pectoraux (milieu)'],                      secondary: ['Triceps (latéral)', 'Épaules (antérieures)', 'Dentelé antérieur'] },
  'Banded Deadlift':                      { primary: ['Fessiers', 'Ischio-jambiers', 'Érecteurs'],secondary: ['Grand dorsal', 'Trapèzes (supérieurs)'] },

  // ── HALTÉROPHILIE – Olympic Lifting ─────────────────────────────────────────
  'Power Snatch':                         { primary: ['Quadriceps', 'Fessiers'],                  secondary: ['Ischio-jambiers', 'Érecteurs', 'Trapèzes (supérieurs)', 'Épaules (antérieures)'] },
  'Hang Snatch':                          { primary: ['Quadriceps', 'Fessiers'],                  secondary: ['Ischio-jambiers', 'Érecteurs', 'Trapèzes (supérieurs)', 'Épaules (antérieures)'] },
  'Hang Clean':                           { primary: ['Quadriceps', 'Fessiers'],                  secondary: ['Ischio-jambiers', 'Érecteurs', 'Trapèzes (supérieurs)'] },
  'Hang Power Clean':                     { primary: ['Quadriceps', 'Fessiers'],                  secondary: ['Ischio-jambiers', 'Érecteurs', 'Trapèzes (supérieurs)'] },
  'Clean Pull':                           { primary: ['Quadriceps', 'Fessiers'],                  secondary: ['Ischio-jambiers', 'Érecteurs', 'Trapèzes (supérieurs)'] },
  'Snatch Pull':                          { primary: ['Quadriceps', 'Fessiers'],                  secondary: ['Ischio-jambiers', 'Érecteurs', 'Trapèzes (supérieurs)', 'Grand dorsal'] },
  'Clean High Pull':                      { primary: ['Quadriceps', 'Fessiers'],                  secondary: ['Ischio-jambiers', 'Érecteurs', 'Trapèzes (supérieurs)', 'Épaules (antérieures)'] },
  'Snatch High Pull':                     { primary: ['Quadriceps', 'Fessiers'],                  secondary: ['Ischio-jambiers', 'Érecteurs', 'Trapèzes (supérieurs)', 'Épaules (antérieures)'] },
  'Snatch Balance':                       { primary: ['Quadriceps', 'Fessiers'],                  secondary: ['Érecteurs', 'Épaules (latérales)', 'Core (profond)'] },
  'Clean Deadlift':                       { primary: ['Quadriceps', 'Fessiers', 'Ischio-jambiers'],secondary: ['Érecteurs', 'Grand dorsal'] },
  'Split Jerk':                           { primary: ['Quadriceps', 'Fessiers', 'Épaules (antérieures)', 'Épaules (latérales)'],secondary: ['Triceps (latéral)', 'Érecteurs'] },
  'Push Jerk':                            { primary: ['Quadriceps', 'Épaules (antérieures)', 'Épaules (latérales)'],secondary: ['Triceps (latéral)', 'Fessiers', 'Érecteurs'] },
  'Power Jerk':                           { primary: ['Quadriceps', 'Épaules (antérieures)', 'Épaules (latérales)'],secondary: ['Fessiers', 'Triceps (latéral)'] },
  'High Hang Clean':                      { primary: ['Quadriceps', 'Fessiers'],                  secondary: ['Trapèzes (supérieurs)', 'Érecteurs'] },
  'High Hang Snatch':                     { primary: ['Quadriceps', 'Fessiers'],                  secondary: ['Trapèzes (supérieurs)', 'Érecteurs', 'Épaules (antérieures)'] },
  'Block Clean':                          { primary: ['Quadriceps', 'Fessiers'],                  secondary: ['Ischio-jambiers', 'Érecteurs', 'Trapèzes (supérieurs)'] },
  'Block Snatch':                         { primary: ['Quadriceps', 'Fessiers'],                  secondary: ['Ischio-jambiers', 'Érecteurs', 'Trapèzes (supérieurs)'] },
  'Jerk Dip':                             { primary: ['Quadriceps'],                              secondary: ['Fessiers', 'Core (profond)'] },
  'Clean + Front Squat':                  { primary: ['Quadriceps', 'Fessiers'],                  secondary: ['Érecteurs', 'Core (profond)', 'Ischio-jambiers'] },

  // ── STRONGMAN ───────────────────────────────────────────────────────────────
  'Log Clean and Press':                  { primary: ['Quadriceps', 'Fessiers', 'Épaules (antérieures)', 'Épaules (latérales)'],secondary: ['Ischio-jambiers', 'Trapèzes (supérieurs)', 'Triceps (latéral)'] },
  'Axle Bar Deadlift':                    { primary: ['Fessiers', 'Ischio-jambiers', 'Érecteurs'],secondary: ['Grand dorsal', 'Avant-bras', 'Trapèzes (supérieurs)'] },
  'Axle Bar Clean and Press':             { primary: ['Quadriceps', 'Fessiers', 'Épaules (antérieures)', 'Épaules (latérales)'],secondary: ['Ischio-jambiers', 'Triceps (latéral)', 'Trapèzes (supérieurs)', 'Avant-bras'] },
  'Yoke Walk':                            { primary: ['Quadriceps', 'Fessiers'],                  secondary: ['Érecteurs', 'Core (profond)', 'Trapèzes (supérieurs)', 'Gastrocnémien'] },
  'Atlas Stone Lift':                     { primary: ['Fessiers', 'Érecteurs'],                   secondary: ['Quadriceps', 'Ischio-jambiers', 'Biceps (chef long)', 'Core (profond)'] },
  'Atlas Stone to Box':                   { primary: ['Fessiers', 'Érecteurs'],                   secondary: ['Quadriceps', 'Ischio-jambiers', 'Biceps (chef long)', 'Core (profond)'] },
  'Keg Carry':                            { primary: ['Quadriceps', 'Fessiers'],                  secondary: ['Core (profond)', 'Érecteurs', 'Avant-bras'] },
  'Sandbag Carry':                        { primary: ['Quadriceps', 'Fessiers'],                  secondary: ['Érecteurs', 'Core (profond)', 'Avant-bras'] },
  'Sandbag to Shoulder':                  { primary: ['Fessiers', 'Érecteurs'],                   secondary: ['Quadriceps', 'Ischio-jambiers', 'Core (profond)'] },
  'Keg Toss':                             { primary: ['Quadriceps', 'Fessiers'],                  secondary: ['Érecteurs', 'Épaules (antérieures)'] },
  'Duck Walk':                            { primary: ['Quadriceps'],                              secondary: ['Fessiers', 'Adducteurs', 'Core (profond)'] },
  'Crucifix Hold':                        { primary: ['Épaules (latérales)'],                     secondary: ['Coiffe des rotateurs', 'Trapèzes (supérieurs)', 'Avant-bras'] },
  'Arm Over Arm Pull':                    { primary: ['Grand dorsal'],                            secondary: ['Biceps (chef long)', 'Grand rond', 'Avant-bras', 'Rhomboïdes'] },
  'Sled Drag':                            { primary: ['Ischio-jambiers', 'Fessiers'],             secondary: ['Érecteurs', 'Gastrocnémien'] },
  'Sled Pull':                            { primary: ['Grand dorsal', 'Biceps (chef long)'],      secondary: ['Grand rond', 'Rhomboïdes', 'Avant-bras'] },

  // ── KETTLEBELL ───────────────────────────────────────────────────────────────
  'Kettlebell Clean':                     { primary: ['Quadriceps', 'Fessiers'],                  secondary: ['Ischio-jambiers', 'Érecteurs', 'Avant-bras'] },
  'Kettlebell Snatch':                    { primary: ['Quadriceps', 'Fessiers'],                  secondary: ['Ischio-jambiers', 'Érecteurs', 'Épaules (antérieures)', 'Avant-bras'] },
  'Kettlebell Press':                     { primary: ['Épaules (antérieures)', 'Épaules (latérales)'],secondary: ['Triceps (latéral)', 'Core (profond)'] },
  'Kettlebell Jerk':                      { primary: ['Quadriceps', 'Épaules (antérieures)', 'Épaules (latérales)'],secondary: ['Fessiers', 'Triceps (latéral)'] },
  'Kettlebell Clean and Press':           { primary: ['Quadriceps', 'Fessiers', 'Épaules (antérieures)', 'Épaules (latérales)'],secondary: ['Ischio-jambiers', 'Triceps (latéral)', 'Érecteurs'] },
  'Kettlebell Goblet Squat':              { primary: ['Quadriceps'],                              secondary: ['Fessiers', 'Adducteurs', 'Core (profond)'] },
  'Kettlebell Deadlift':                  { primary: ['Fessiers', 'Ischio-jambiers'],             secondary: ['Érecteurs', 'Grand dorsal'] },
  'Kettlebell Turkish Get-up':            { primary: ['Core (profond)'],                          secondary: ['Épaules (antérieures)', 'Quadriceps', 'Fessiers', 'Core (obliques)'] },
  'Kettlebell Windmill':                  { primary: ['Core (obliques)'],                         secondary: ['Épaules (latérales)', 'Ischio-jambiers', 'Core (profond)'] },
  'Kettlebell Halo':                      { primary: ['Épaules (antérieures)', 'Épaules (latérales)'],secondary: ['Core (profond)', 'Coiffe des rotateurs'] },
  'Kettlebell Row':                       { primary: ['Grand dorsal'],                            secondary: ['Biceps (chef long)', 'Grand rond', 'Rhomboïdes'] },
  'Kettlebell Sumo Deadlift':             { primary: ['Fessiers', 'Quadriceps', 'Adducteurs'],    secondary: ['Ischio-jambiers', 'Érecteurs'] },
  'Kettlebell Front Squat':               { primary: ['Quadriceps', 'Fessiers'],                  secondary: ['Érecteurs', 'Core (profond)'] },
  'Kettlebell Lunge':                     { primary: ['Quadriceps', 'Fessiers'],                  secondary: ['Ischio-jambiers'] },
  'Kettlebell Hip Thrust':                { primary: ['Fessiers'],                                secondary: ['Ischio-jambiers', 'Moyen fessier'] },
  'Bottoms Up Press':                     { primary: ['Épaules (antérieures)', 'Épaules (latérales)'],secondary: ['Coiffe des rotateurs', 'Avant-bras'] },
  'Single Arm Kettlebell Swing':          { primary: ['Fessiers', 'Ischio-jambiers'],             secondary: ['Érecteurs', 'Core (obliques)', 'Épaules (antérieures)'] },
  'Double Kettlebell Swings':             { primary: ['Fessiers', 'Ischio-jambiers'],             secondary: ['Érecteurs', 'Core (profond)', 'Épaules (antérieures)'] },
  'Kettlebell Figure 8':                  { primary: ['Core (obliques)'],                         secondary: ['Fessiers', 'Avant-bras', 'Core (profond)'] },
  'Kettlebell Carry':                     { primary: ['Trapèzes (supérieurs)', 'Avant-bras'],     secondary: ['Core (profond)', 'Quadriceps'] },

  // ── GRIP / AVANT-BRAS – Variantes supplémentaires ───────────────────────────
  'Towel Pull-ups':                       { primary: ['Grand dorsal'],                            secondary: ['Biceps (chef long)', 'Grand rond', 'Avant-bras', 'Brachialis'] },
  'Thick Bar Curls':                      { primary: ['Biceps (chef long)', 'Biceps (chef court)'],secondary: ['Avant-bras', 'Brachialis'] },
  'Wrist Roller':                         { primary: ['Avant-bras'],                              secondary: [] },
  'Pinch Grip Carries':                   { primary: ['Avant-bras'],                              secondary: ['Trapèzes (supérieurs)'] },
  'Hub Lift':                             { primary: ['Avant-bras'],                              secondary: [] },
  'Grippers':                             { primary: ['Avant-bras'],                              secondary: [] },
  'Barbell Holds':                        { primary: ['Avant-bras'],                              secondary: ['Trapèzes (supérieurs)'] },
  'Trap Bar Farmer Walk':                 { primary: ['Avant-bras', 'Trapèzes (supérieurs)'],     secondary: ['Core (profond)', 'Quadriceps'] },
  'Offset Farmer Walk':                   { primary: ['Avant-bras', 'Trapèzes (supérieurs)'],     secondary: ['Core (obliques)', 'Core (profond)'] },

  // ── CARDIO / CONDITIONING – Variantes supplémentaires ──────────────────────
  'Ski Erg':                              { primary: ['Grand dorsal'],                            secondary: ['Core (profond)', 'Triceps (long chef)', 'Grand rond'] },
  'Concept2 Rowing':                      { primary: ['Grand dorsal', 'Quadriceps'],              secondary: ['Biceps (chef long)', 'Ischio-jambiers', 'Érecteurs', 'Grand rond', 'Trapèzes (moyens)'] },
  'Air Bike':                             { primary: ['Quadriceps'],                              secondary: ['Ischio-jambiers', 'Épaules (antérieures)', 'Core (profond)'] },
  'Echo Bike':                            { primary: ['Quadriceps'],                              secondary: ['Ischio-jambiers', 'Épaules (antérieures)', 'Core (profond)'] },
  'Treadmill Running':                    { primary: ['Quadriceps', 'Ischio-jambiers'],           secondary: ['Fessiers', 'Moyen fessier', 'Gastrocnémien'] },
  'Incline Treadmill Walk':               { primary: ['Fessiers', 'Quadriceps'],                  secondary: ['Gastrocnémien', 'Ischio-jambiers'] },
  'Elliptical':                           { primary: ['Quadriceps', 'Fessiers'],                  secondary: ['Ischio-jambiers', 'Épaules (antérieures)'] },
  'Cycling':                              { primary: ['Quadriceps'],                              secondary: ['Fessiers', 'Ischio-jambiers', 'Gastrocnémien'] },
  'Rope Climb':                           { primary: ['Grand dorsal', 'Avant-bras'],              secondary: ['Biceps (chef long)', 'Grand rond', 'Brachialis', 'Core (profond)'] },
  'Rope Slam':                            { primary: ['Core (profond)', 'Épaules (antérieures)'], secondary: ['Grand dorsal', 'Triceps (long chef)', 'Core (obliques)'] },
  'Sled Row':                             { primary: ['Grand dorsal'],                            secondary: ['Biceps (chef long)', 'Grand rond', 'Ischio-jambiers'] },
  'Double Unders':                        { primary: ['Gastrocnémien', 'Soléaire'],               secondary: ['Core (profond)', 'Épaules (antérieures)'] },
  'Sandbag Run':                          { primary: ['Quadriceps', 'Fessiers'],                  secondary: ['Core (profond)', 'Érecteurs', 'Épaules (antérieures)'] },
  'Weighted Vest Walk':                   { primary: ['Quadriceps', 'Fessiers'],                  secondary: ['Core (profond)', 'Érecteurs'] },
  'Swimming':                             { primary: ['Grand dorsal', 'Épaules (antérieures)'],   secondary: ['Quadriceps', 'Fessiers', 'Core (profond)', 'Grand rond'] },
  'Pool Running':                         { primary: ['Quadriceps', 'Ischio-jambiers'],           secondary: ['Fessiers', 'Core (profond)'] },
  'Hip Circle Squats':                    { primary: ['Moyen fessier', 'Quadriceps'],             secondary: ['Fessiers', 'Adducteurs'] },
  'Sumo Deficit Deadlift':               { primary: ['Fessiers', 'Quadriceps', 'Adducteurs'],    secondary: ['Ischio-jambiers', 'Érecteurs'] },
  'Seated Good Mornings':                 { primary: ['Érecteurs', 'Ischio-jambiers'],            secondary: ['Fessiers'] },
  'Standing Cable Crunch':                { primary: ['Core (profond)'],                          secondary: ['Core (obliques)'] },
  'Rotary Torso Machine':                 { primary: ['Core (obliques)'],                         secondary: ['Core (profond)'] },
  'Cable Oblique Crunch':                 { primary: ['Core (obliques)'],                         secondary: ['Core (profond)'] },
  'Overhead Press (Barbell)':             { primary: ['Épaules (antérieures)', 'Épaules (latérales)'],secondary: ['Triceps (latéral)', 'Trapèzes (supérieurs)', 'Dentelé antérieur'] },
  'Neutral Grip Overhead Press':          { primary: ['Épaules (antérieures)', 'Épaules (latérales)'],secondary: ['Triceps (latéral)', 'Coiffe des rotateurs'] },
  'Kettlebell Overhead Squat':            { primary: ['Quadriceps'],                              secondary: ['Fessiers', 'Érecteurs', 'Épaules (latérales)', 'Core (profond)'] },
  'Single Arm Farmers Walk':             { primary: ['Avant-bras', 'Trapèzes (supérieurs)'],     secondary: ['Core (obliques)', 'Core (profond)'] },
  'Standing Calf Raises (Machine)':       { primary: ['Gastrocnémien'],                           secondary: ['Soléaire'] },
  'Leg Press Calf Raises':                { primary: ['Gastrocnémien', 'Soléaire'],               secondary: [] },
  'Incline Treadmill Run':                { primary: ['Quadriceps', 'Fessiers', 'Ischio-jambiers'],secondary: ['Gastrocnémien', 'Moyen fessier'] },
};

// ── Groupes haut niveau ────────────────────────────────────────────────────────

export const HIGH_LEVEL_GROUPS = {
  Pectoraux:       { icon: '🫁', color: '#60A5FA', subMuscles: ['Pectoraux (haut)', 'Pectoraux (milieu)', 'Pectoraux (bas)', 'Dentelé antérieur'] },
  Dos:             { icon: '🔙', color: '#A78BFA', subMuscles: ['Grand dorsal', 'Rhomboïdes', 'Grand rond', 'Érecteurs', 'Trapèzes (supérieurs)', 'Trapèzes (moyens)', 'Trapèzes (inférieurs)'] },
  Biceps:          { icon: '💪', color: '#34D399', subMuscles: ['Biceps (chef long)', 'Biceps (chef court)', 'Brachialis', 'Brachioradialis'] },
  Triceps:         { icon: '🔱', color: '#FB923C', subMuscles: ['Triceps (long chef)', 'Triceps (latéral)', 'Triceps (médial)'] },
  Épaules:         { icon: '🏋️', color: '#FBBF24', subMuscles: ['Épaules (antérieures)', 'Épaules (latérales)', 'Épaules (postérieures)', 'Coiffe des rotateurs'] },
  Jambes:          { icon: '🦵', color: '#F87171', subMuscles: ['Quadriceps', 'Ischio-jambiers', 'Fessiers', 'Moyen fessier', 'Petit fessier', 'Adducteurs', 'Gastrocnémien', 'Soléaire'] },
  'Avant-bras':    { icon: '🤛', color: '#94A3B8', subMuscles: ['Avant-bras'] },
  'Core · Cardio': { icon: '⚡', color: '#E879F9', subMuscles: ['Core (profond)', 'Core (obliques)'] },
};

// Raccourcis d'affichage pour les noms de sub-muscles
const SHORT_LABELS = {
  'Pectoraux (haut)':        'Haut',
  'Pectoraux (milieu)':      'Milieu',
  'Pectoraux (bas)':         'Bas',
  'Dentelé antérieur':       'Dentelé',
  'Grand dorsal':            'Dorsal',
  'Rhomboïdes':              'Rhomboïdes',
  'Grand rond':              'Gd rond',
  'Érecteurs':               'Érecteurs',
  'Trapèzes (supérieurs)':   'Trap sup.',
  'Trapèzes (moyens)':       'Trap moy.',
  'Trapèzes (inférieurs)':   'Trap inf.',
  'Biceps (chef long)':      'Chef long',
  'Biceps (chef court)':     'Chef court',
  'Brachialis':              'Brachialis',
  'Brachioradialis':         'Brachio.',
  'Triceps (long chef)':     'Chef long',
  'Triceps (latéral)':       'Latéral',
  'Triceps (médial)':        'Médial',
  'Épaules (antérieures)':   'Ant.',
  'Épaules (latérales)':     'Lat.',
  'Épaules (postérieures)':  'Post.',
  'Coiffe des rotateurs':    'Coiffe',
  'Quadriceps':              'Quadris',
  'Ischio-jambiers':         'Ischios',
  'Fessiers':                'Fessiers',
  'Moyen fessier':           'Moy. fess.',
  'Petit fessier':           'Pt fess.',
  'Adducteurs':              'Adduct.',
  'Gastrocnémien':           'Gastro.',
  'Soléaire':                'Soléaire',
  'Avant-bras':              'Avant-bras',
  'Core (profond)':          'Profond',
  'Core (obliques)':         'Obliques',
};

// ── Moteur de fatigue ─────────────────────────────────────────────────────────
//
// Chaque exercice contribue à la charge musculaire selon trois niveaux :
//   primary       → 1.00  (moteur principal du mouvement)
//   secondary     → 0.50  (synergiste / assistant)
//   stabilisateur → 0.25  (stabilisation articulaire passive)
//
// Un muscle est en surcharge quand sa charge cumulée atteint OVERLOAD_THRESHOLD.
// Cette valeur équivaut à deux exercices ciblant ce muscle en primary.

export const FATIGUE_WEIGHTS = {
  primary:       1.00,
  secondary:     0.50,
  stabilisateur: 0.25,
};

export const OVERLOAD_THRESHOLD = 2.0;

// ── Accesseurs ────────────────────────────────────────────────────────────────

export function getPrimary(exercise)       { return MUSCLE_GROUPS[exercise]?.primary        ?? []; }
export function getSecondary(exercise)     { return MUSCLE_GROUPS[exercise]?.secondary      ?? []; }
export function getStabilisateur(exercise) { return MUSCLE_GROUPS[exercise]?.stabilisateur  ?? []; }

// ── muscleCounts ──────────────────────────────────────────────────────────────
// Retourne un Map<muscle, charge> cumulant les contributions pondérées de
// chaque exercice (primary=1.0 / secondary=0.5 / stabilisateur=0.25).

export function muscleCounts(exercises) {
  const loads = new Map();
  const add = (muscles, w) =>
    muscles?.forEach(m => loads.set(m, (loads.get(m) ?? 0) + w));

  exercises.forEach(ex => {
    const d = MUSCLE_GROUPS[ex];
    if (!d) return;
    add(d.primary,       FATIGUE_WEIGHTS.primary);
    add(d.secondary,     FATIGUE_WEIGHTS.secondary);
    add(d.stabilisateur, FATIGUE_WEIGHTS.stabilisateur);
  });

  return loads;
}

// ── getConflictingExercises ───────────────────────────────────────────────────
// Retourne le Set des exercices dont au moins un muscle (tous niveaux confondus)
// dépasse OVERLOAD_THRESHOLD dans la charge cumulée de la séance.

export function getConflictingExercises(exercises) {
  const loads = muscleCounts(exercises);
  const conflicting = new Set();

  exercises.forEach(ex => {
    const d = MUSCLE_GROUPS[ex];
    if (!d) return;
    const all = [
      ...(d.primary       ?? []),
      ...(d.secondary     ?? []),
      ...(d.stabilisateur ?? []),
    ];
    if (all.some(m => (loads.get(m) ?? 0) >= OVERLOAD_THRESHOLD)) {
      conflicting.add(ex);
    }
  });

  return conflicting;
}

// ── getConflictMuscles ────────────────────────────────────────────────────────
// Retourne les muscles de l'exercice (tous niveaux) dont la charge cumulée
// dans allExercises atteint ou dépasse OVERLOAD_THRESHOLD.

export function getConflictMuscles(exercise, allExercises) {
  const loads = muscleCounts(allExercises);
  const d = MUSCLE_GROUPS[exercise];
  if (!d) return [];
  return [
    ...(d.primary       ?? []),
    ...(d.secondary     ?? []),
    ...(d.stabilisateur ?? []),
  ].filter(m => (loads.get(m) ?? 0) >= OVERLOAD_THRESHOLD);
}

// ── analyzeDayMuscles ─────────────────────────────────────────────────────────
// Analyse complète d'une journée : charge pondérée par sous-muscle et statut
// par groupe musculaire ciblé.
//
// Retourne pour chaque groupe HIGH_LEVEL_GROUPS :
//   subDetails[]  → { name, shortName, load, status }
//     status : 'none' | 'under' | 'good' | 'bonus' | 'over'
//   groupStatus   → 'none' | 'partial' | 'good' | 'bonus' | 'over'
//   hasAnyHit     → boolean

export function analyzeDayMuscles(exercises, targetGroupNames = []) {
  const loads = muscleCounts(exercises);
  const result = {};

  for (const [groupName, groupData] of Object.entries(HIGH_LEVEL_GROUPS)) {
    const isTargeted = targetGroupNames.includes(groupName);

    const subDetails = groupData.subMuscles.map(sm => {
      const load = loads.get(sm) ?? 0;
      let status;
      if (load === 0)                      status = isTargeted ? 'under' : 'none';
      else if (load >= OVERLOAD_THRESHOLD) status = 'over';
      else                                 status = isTargeted ? 'good'  : 'bonus';
      return { name: sm, shortName: SHORT_LABELS[sm] ?? sm, load, status };
    });

    const hasAnyHit = subDetails.some(s => s.load > 0);
    const hasOver   = subDetails.some(s => s.status === 'over');
    const hasUnder  = isTargeted && subDetails.some(s => s.status === 'under');

    let groupStatus;
    if (hasOver)                        groupStatus = 'over';
    else if (hasUnder)                  groupStatus = 'partial';
    else if (isTargeted && hasAnyHit)   groupStatus = 'good';
    else if (!isTargeted && hasAnyHit)  groupStatus = 'bonus';
    else                                groupStatus = 'none';

    result[groupName] = { ...groupData, isTargeted, subDetails, groupStatus, hasAnyHit };
  }

  return result;
}
