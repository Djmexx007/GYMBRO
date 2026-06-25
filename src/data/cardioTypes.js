// Types de cardio — indépendant de muscleGroups.js : les séances cardio ont une
// forme de données (durée/distance/vitesse/FC) incompatible avec le système
// poids×reps des exercices de musculation.

export const CARDIO_TYPES = [
  { key: 'running',      label: 'Course',          icon: 'walk' },
  { key: 'treadmill',    label: 'Tapis roulant',   icon: 'walk' },
  { key: 'incline_walk', label: 'Marche inclinée', icon: 'trending-up' },
  { key: 'cycling',      label: 'Vélo',            icon: 'bicycle' },
  { key: 'rowing',       label: 'Rameur',          icon: 'boat' },
  { key: 'stairs',       label: 'Escalier',        icon: 'layers' },
  { key: 'elliptical',   label: 'Elliptique',      icon: 'sync' },
  { key: 'swimming',     label: 'Natation',        icon: 'water' },
  { key: 'jump_rope',    label: 'Corde à sauter',  icon: 'remove' },
  { key: 'other',        label: 'Autre',           icon: 'ellipsis-horizontal' },
];

// Types pour lesquels les champs d'inclinaison ont un sens (masqués sinon).
export const INCLINE_CAPABLE_TYPES = ['treadmill', 'incline_walk', 'stairs'];

export function getCardioTypeLabel(key) {
  return CARDIO_TYPES.find(t => t.key === key)?.label ?? key;
}

export function getCardioTypeIcon(key) {
  return CARDIO_TYPES.find(t => t.key === key)?.icon ?? 'fitness';
}

export function isInclineCapable(key) {
  return INCLINE_CAPABLE_TYPES.includes(key);
}
