export const DEFAULT_CONFIG = Object.freeze({
  duration: 8,
  intensity: 1,
  exposure: 1.15,
  coldLight: 3,
  lampLight: 5,
  adamX: 0,
  adamZ: 0,
  bedX: 0,
  bedZ: 0,
  nightstandX: 0,
  nightstandZ: 0,
  title: "INITIALISATION TERMINÉE",
  message: "Bienvenue, survivant.",
  quest: "Survivre à la première heure.",
  reward: 100,
  quality: "standard",
});

export const QUALITY_LEVELS = ["basse", "standard", "haute"];

export const CHARACTER_LIBRARY = [
  {
    id: "adam",
    name: "Adam Morel",
    role: "Survivant · 29 ans",
    available: true,
    model: null,
  },
  {
    id: "emma",
    name: "Emma Benali",
    role: "Infirmière · à venir",
    available: false,
    model: null,
  },
  {
    id: "victor",
    name: "Victor Renaud",
    role: "Ancien militaire · à venir",
    available: false,
    model: null,
  },
];

export function sanitizeConfig(raw = {}) {
  const result = { ...DEFAULT_CONFIG };
  const ranges = {
    duration: [4, 16],
    intensity: [0, 1.5],
    exposure: [0.5, 2],
    coldLight: [0, 8],
    lampLight: [0, 12],
    adamX: [-0.45, 0.45],
    adamZ: [-0.4, 0.4],
    bedX: [-0.3, 0.3],
    bedZ: [-0.3, 0.3],
    nightstandX: [-0.3, 0.3],
    nightstandZ: [-0.3, 0.3],
    reward: [0, 10000],
  };
  for (const [key, [min, max]] of Object.entries(ranges)) {
    if (typeof raw[key] === "number" && Number.isFinite(raw[key]))
      result[key] = Math.min(max, Math.max(min, raw[key]));
  }
  if (QUALITY_LEVELS.includes(raw.quality)) result.quality = raw.quality;
  for (const key of ["title", "message", "quest"]) {
    if (typeof raw[key] === "string") result[key] = raw[key].slice(0, 100);
  }
  return result;
}
