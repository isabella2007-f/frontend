const KEY = 'toston_landing_config';

export const LANDING_DEFAULTS = {
  heroBadge:          "SABOR NATURAL 100%",
  heroTitle:          "El poder del Plátano",
  heroDescription:    "Descubre tostones, chips y delicias artesanales que redefinen el sabor de nuestra tierra. Crujientes, frescos y recolectados con amor.",
  historyTitle:       "Desde el campo hasta tu mesa",
  historyDescription: "En Tostón App celebramos la tierra. Cada plátano es seleccionado para garantizar una experiencia épica y natural.",
  ctaTitle:           "Únete a la Revolución",
  ctaDescription:     "Estamos transformando la forma en que el mundo ve al plátano.",
};

export function getLandingConfig() {
  try {
    const saved = localStorage.getItem(KEY);
    if (!saved) return { ...LANDING_DEFAULTS };
    return { ...LANDING_DEFAULTS, ...JSON.parse(saved) };
  } catch {
    return { ...LANDING_DEFAULTS };
  }
}

export function saveLandingConfig(config) {
  localStorage.setItem(KEY, JSON.stringify(config));
}

export function resetLandingConfig() {
  localStorage.removeItem(KEY);
  return { ...LANDING_DEFAULTS };
}
