import Fuse from 'fuse.js';
import { MUSCLE_GROUPS, HIGH_LEVEL_GROUPS } from '../data/muscleGroups';

// Petits alias FR/EN par groupe musculaire haut niveau, pour que "pec", "épaule",
// "wrist", etc. retrouvent les exercices du bon groupe même quand ce mot n'apparaît
// pas dans le nom de l'exercice.
const GROUP_ALIASES = {
  'Pectoraux':       ['chest', 'pec', 'pecs'],
  'Dos':             ['back', 'lat', 'lats'],
  'Biceps':          ['bicep', 'biceps'],
  'Triceps':         ['tricep', 'triceps'],
  'Épaules':         ['shoulder', 'shoulders', 'delt', 'deltoid', 'deltoids', 'epaule', 'epaules'],
  'Jambes':          ['leg', 'legs', 'quad', 'quads', 'glute', 'glutes', 'hamstring', 'jambe', 'jambes'],
  'Avant-bras':      ['forearm', 'forearms', 'wrist', 'wrists', 'grip', 'avant-bras'],
  'Core · Cardio':   ['core', 'abs', 'cardio'],
};

// Plage Unicode "Combining Diacritical Marks" (0x0300-0x036F), construite à partir
// des codes pour éviter tout souci d'encodage de caractères combinants dans ce fichier.
const COMBINING_MARKS = new RegExp(`[${String.fromCharCode(0x0300)}-${String.fromCharCode(0x036f)}]`, 'g');
function stripAccents(str) {
  return str.normalize('NFD').replace(COMBINING_MARKS, '');
}

function highLevelGroupsOf(muscles) {
  const groups = new Set();
  muscles.forEach(muscle => {
    for (const [group, data] of Object.entries(HIGH_LEVEL_GROUPS)) {
      if (data.subMuscles.includes(muscle)) groups.add(group);
    }
  });
  return [...groups];
}

// Tags séparés par niveau d'implication — un muscle PRIMAIRE doit faire remonter
// l'exercice bien plus qu'un muscle simplement SECONDAIRE (ex. les épaules sont
// secondaires dans énormément d'exercices de poussée ; ça ne doit pas faire
// remonter "Bench Press" aussi haut que "Shoulder Press" pour la requête "épaule").
function searchTagsFor(exerciseName) {
  const data = MUSCLE_GROUPS[exerciseName];
  if (!data) return { primaryTags: '', secondaryTags: '' };
  const primary   = data.primary ?? [];
  const secondary = data.secondary ?? [];
  const primaryGroups   = highLevelGroupsOf(primary);
  const secondaryGroups = highLevelGroupsOf(secondary);
  const primaryAliases   = primaryGroups.flatMap(g => GROUP_ALIASES[g] ?? []);
  const secondaryAliases = secondaryGroups.flatMap(g => GROUP_ALIASES[g] ?? []);
  return {
    primaryTags:   stripAccents([...primary, ...primaryGroups, ...primaryAliases].join(' ').toLowerCase()),
    secondaryTags: stripAccents([...secondary, ...secondaryGroups, ...secondaryAliases].join(' ').toLowerCase()),
  };
}

// Construit un index de recherche pour une liste de noms d'exercices.
// À mémoriser (useMemo) côté appelant — ne pas reconstruire à chaque frappe.
export function buildSearchIndex(exerciseNames) {
  const records = exerciseNames.map(name => {
    const { primaryTags, secondaryTags } = searchTagsFor(name);
    return { name, normalizedName: stripAccents(name.toLowerCase()), primaryTags, secondaryTags };
  });
  // Uniquement sur normalizedName : les champs de tags concatènent beaucoup de
  // texte (muscles + alias), et la correspondance floue (distance d'édition) y
  // produit des faux positifs absurdes (ex. "bicep" matchait "Squat" via
  // "quadriceps" dans ses tags). Les tags sont déjà couverts précisément par la
  // passe 1 (substring) ; pas besoin d'y appliquer du flou en plus.
  const fuse = new Fuse(records, {
    keys: ['normalizedName'],
    threshold: 0.35,
    ignoreLocation: true,
    minMatchCharLength: 3,
  });
  return { records, fuse };
}

// Retourne les noms d'exercices triés par pertinence, ou null si la requête est vide
// (l'appelant décide alors d'afficher la liste complète).
//
// Deux passes : (1) correspondance exacte/préfixe/sous-chaîne sur le nom ou les tags
// de muscle (primaire > secondaire), classée déterministiquement — couvre la grande
// majorité des recherches sans bruit ; (2) recherche floue (Fuse) en complément,
// uniquement pour les noms pas déjà trouvés en passe 1 et pour des requêtes d'au
// moins 4 caractères — sert de filet de rattrapage pour les fautes de frappe sans
// ajouter de bruit sur des requêtes courtes (ex. "pec", "lat").
export function searchExercises(index, query) {
  const q = stripAccents(query.trim().toLowerCase());
  if (!q) return null;

  const scored = [];
  index.records.forEach(r => {
    let score = 0;
    if (r.normalizedName === q) score = 100;
    else if (r.normalizedName.startsWith(q)) score = 90;
    else if (r.normalizedName.includes(q)) score = 70;
    else if (r.primaryTags.includes(q)) score = 50;
    else if (r.secondaryTags.includes(q)) score = 20;
    if (score > 0) scored.push({ name: r.name, score });
  });
  scored.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

  const found = new Set(scored.map(s => s.name));
  const fuzzy = q.length >= 4
    ? index.fuse.search(q).map(r => r.item.name).filter(name => !found.has(name))
    : [];

  return [...scored.map(s => s.name), ...fuzzy];
}
