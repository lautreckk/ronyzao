// Doze - Design System
// Based on "12 Week Year" & "One Thing" methodologies

export const Colors = {
  // Primary Palette
  deepNavy: '#0A192F',       // Backgrounds, headers
  paperWhite: '#F8F9FA',     // Content areas
  goldenAmber: '#FFC107',    // "One Thing" highlights
  sageGreen: '#81C784',      // Success, health

  // Supporting Colors
  slate: '#64748B',          // Secondary text
  lightSlate: '#94A3B8',     // Muted text
  darkNavy: '#061122',       // Darker variant
  ivory: '#FFFEF9',          // Pure white variant

  // Semantic Colors
  success: '#81C784',
  warning: '#FFC107',
  error: '#EF5350',
  info: '#4FC3F7',

  // Pillar Colors
  pillarPhysical: '#EF5350',     // Saúde Física
  pillarMental: '#AB47BC',       // Saúde Mental
  pillarSpiritual: '#5C6BC0',    // Saúde Espiritual
  pillarEducation: '#26A69A',    // Educação
  pillarFinance: '#66BB6A',      // Finanças
  pillarFamily: '#EC407A',       // Família
  pillarBusiness: '#42A5F5',     // Negócios
};

export const Typography = {
  // Font Families (using system fonts that approximate the desired look)
  heading: 'serif',           // For manifesto/book feel
  body: 'System',             // Clean sans-serif

  // Font Sizes
  sizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },

  // Font Weights
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
};

// Pillars of Life (7 fixed areas)
export const PILLARS = [
  {
    id: 'business',
    name: 'Negócios',
    icon: 'briefcase',
    color: Colors.pillarBusiness
  },
  {
    id: 'physical',
    name: 'Saúde Física',
    icon: 'fitness',
    color: Colors.pillarPhysical
  },
  {
    id: 'mental',
    name: 'Saúde Mental',
    icon: 'psychology',
    color: Colors.pillarMental
  },
  {
    id: 'spiritual',
    name: 'Saúde Espiritual',
    icon: 'self-improvement',
    color: Colors.pillarSpiritual
  },
  {
    id: 'education',
    name: 'Educação',
    icon: 'school',
    color: Colors.pillarEducation
  },
  {
    id: 'finance',
    name: 'Finanças',
    icon: 'account-balance',
    color: Colors.pillarFinance
  },
  {
    id: 'family',
    name: 'Família',
    icon: 'people',
    color: Colors.pillarFamily
  },
] as const;

export type PillarId = typeof PILLARS[number]['id'];
