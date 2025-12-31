/**
 * Model-Based Theme System
 * Dynamic color schemes for each model based on their clothing and personality
 */

import { ModelId } from '@/types/models';

// Color palette interface for model themes
export interface ModelColorPalette {
  // Gradient backgrounds
  gradientStart: string;
  gradientMiddle: string;
  gradientEnd: string;
  
  // Primary colors
  primary: string;
  primaryDark: string;
  accent: string;
  
  // Surface colors
  surface: string;
  surfaceVariant: string;
  cardBackground: string;
  
  // Interactive elements
  buttonPrimary: string;
  buttonSecondary: string;
  
  // Special effects
  glow: string;
  shimmer: string;
}

// Model theme definitions based on their clothing colors and personality
export const MODEL_COLOR_SCHEMES: Record<ModelId, { light: ModelColorPalette; dark: ModelColorPalette }> = {
  // Maya - Elegant and sophisticated (Beautiful teal/turquoise outfit)
  model1: {
    light: {
      gradientStart: '#f0fdfa',      // Soft teal-white (matching teal outfit)
      gradientMiddle: '#ccfbf1',     // Light teal mint
      gradientEnd: '#99f6e4',        // Soft turquoise
      primary: '#0d9488',           // Teal 600 (matching outfit)
      primaryDark: '#0f766e',       // Deep teal
      accent: '#14b8a6',            // Teal accent
      surface: '#f0fdfa',           // Teal-white surface
      surfaceVariant: '#ccfbf1',     // Light teal variant
      cardBackground: '#ffffff',     // White cards
      buttonPrimary: '#0d9488',      // Teal buttons
      buttonSecondary: '#ccfbf1',    // Light teal secondary
      glow: '#14b8a6',              // Teal glow
      shimmer: '#5eead4',           // Teal shimmer
    },
    dark: {
      gradientStart: '#042f2e',      // Deep dark teal
      gradientMiddle: '#134e4a',     // Medium dark teal
      gradientEnd: '#115e59',        // Rich dark teal
      primary: '#5eead4',           // Light teal
      primaryDark: '#2dd4bf',       // Bright teal
      accent: '#7dd3fc',            // Light cyan accent
      surface: '#042f2e',           // Dark teal surface
      surfaceVariant: '#134e4a',     // Dark teal variant
      cardBackground: '#134e4a',     // Dark teal cards
      buttonPrimary: '#14b8a6',      // Teal buttons
      buttonSecondary: '#134e4a',    // Dark teal secondary
      glow: '#5eead4',              // Light teal glow
      shimmer: '#2dd4bf',           // Bright teal shimmer
    },
  },

  // Alex - Orangish theme
  model2: {
    light: {
      gradientStart: '#fff9f0',      // Soft warm white
      gradientMiddle: '#ffe4cc',     // Warm peach
      gradientEnd: '#ffcc99',        // Rich warm orange-peach
      primary: '#f97316',            // Orange 500
      primaryDark: '#c2410c',        // Deep orange
      accent: '#fb923c',             // Orange accent
      surface: '#fff8f1',            // Warm light surface
      surfaceVariant: '#ffedd5',     // Light orange variant
      cardBackground: '#ffffff',     // White cards
      buttonPrimary: '#f97316',      // Orange buttons
      buttonSecondary: '#ffedd5',    // Light orange secondary
      glow: '#fb923c',               // Orange glow
      shimmer: '#fed7aa',            // Light orange shimmer
    },
    dark: {
      gradientStart: '#3d2817',      // Rich warm brown (complementing orange jacket)
      gradientMiddle: '#5c3a20',     // Medium warm brown with orange undertones
      gradientEnd: '#7a4d2a',        // Warmer lighter brown
      primary: '#f97316',            // Orange
      primaryDark: '#ea580c',        // Deep orange
      accent: '#fb923c',             // Orange accent
      surface: '#2d1810',            // Dark orange surface
      surfaceVariant: '#3d2415',     // Dark variant
      cardBackground: '#3d2415',     // Dark orange cards
      buttonPrimary: '#f97316',      // Orange buttons
      buttonSecondary: '#3d2415',    // Dark secondary
      glow: '#fb923c',               // Orange glow
      shimmer: '#f97316',            // Orange shimmer
    },
  },

  // Sam - Purple/Violet theme (swapped with Riley)
  model3: {
    light: {
      gradientStart: '#f8f4ff',      // Soft light purple (like the reference image)
      gradientMiddle: '#f0e6ff',     // Light lavender
      gradientEnd: '#e9d5ff',        // Medium light purple
      primary: '#8b5cf6',            // Violet
      primaryDark: '#7c3aed',        // Deep violet
      accent: '#a855f7',             // Purple accent
      surface: '#f3e8ff',            // Very light purple surface
      surfaceVariant: '#ede9fe',     // Light purple variant
      cardBackground: '#ffffff',     // White cards
      buttonPrimary: '#8b5cf6',      // Violet buttons
      buttonSecondary: '#ede9fe',    // Light purple secondary
      glow: '#a855f7',               // Purple glow
      shimmer: '#d8b4fe',            // Light purple shimmer
    },
    dark: {
      gradientStart: '#2a1a3e',      // Rich dark purple (atmospheric)
      gradientMiddle: '#3d2555',     // Medium dark purple
      gradientEnd: '#4c1d95',        // Deep purple
      primary: '#a855f7',            // Bright purple
      primaryDark: '#7c3aed',        // Deep purple
      accent: '#c084fc',             // Bright purple accent
      surface: '#1e1420',            // Dark purple surface
      surfaceVariant: '#2d1b32',     // Dark variant
      cardBackground: '#2d1b32',     // Dark purple cards
      buttonPrimary: '#a855f7',      // Purple buttons
      buttonSecondary: '#2d1b32',    // Dark secondary
      glow: '#c084fc',               // Purple glow
      shimmer: '#a855f7',            // Purple shimmer
    },
  },

  // Jordan - Beige/Neutral theme (matching the tan jacket)
  model4: {
    light: {
      gradientStart: '#faf9f6',      // Soft warm white
      gradientMiddle: '#f5f2eb',     // Light beige
      gradientEnd: '#ede6d3',        // Warm beige (matching jacket)
      primary: '#8b7355',            // Warm brown (matching jacket tone)
      primaryDark: '#6b5b47',        // Deep warm brown
      accent: '#a0916b',             // Light brown accent
      surface: '#faf9f6',            // Light beige surface
      surfaceVariant: '#f5f2eb',     // Light beige variant
      cardBackground: '#ffffff',     // White cards
      buttonPrimary: '#8b7355',      // Brown buttons
      buttonSecondary: '#f5f2eb',    // Light beige secondary
      glow: '#a0916b',               // Brown glow
      shimmer: '#ede6d3',            // Beige shimmer
    },
    dark: {
      gradientStart: '#2a251f',      // Rich dark brown (complementing beige)
      gradientMiddle: '#3d352b',     // Medium warm brown
      gradientEnd: '#4f4538',        // Lighter warm brown
      primary: '#a0916b',            // Light brown
      primaryDark: '#8b7355',        // Medium brown
      accent: '#b8a882',             // Light brown accent
      surface: '#2a251f',            // Dark brown surface
      surfaceVariant: '#3d352b',     // Dark variant
      cardBackground: '#3d352b',     // Dark brown cards
      buttonPrimary: '#a0916b',      // Brown buttons
      buttonSecondary: '#3d352b',    // Dark secondary
      glow: '#b8a882',               // Light brown glow
      shimmer: '#a0916b',            // Brown shimmer
    },
  },

  // Taylor - Vibrant and energetic (Bright orange jacket with blue jeans)
  model5: {
    light: {
      gradientStart: '#fff7ed',      // Soft orange-white (matching bright jacket)
      gradientMiddle: '#ffedd5',     // Light orange cream
      gradientEnd: '#fed7aa',        // Warm orange peach
      primary: '#ea580c',            // Orange 600 (matching jacket)
      primaryDark: '#c2410c',        // Deep orange
      accent: '#f97316',             // Bright orange accent
      surface: '#fff8f1',            // Orange-white surface
      surfaceVariant: '#ffedd5',     // Light orange variant
      cardBackground: '#ffffff',     // White cards
      buttonPrimary: '#ea580c',      // Orange buttons
      buttonSecondary: '#ffedd5',    // Light orange secondary
      glow: '#f97316',               // Orange glow
      shimmer: '#fb923c',            // Orange shimmer
    },
    dark: {
      gradientStart: '#1b0f08',      // Near-black orange for depth (less brown)
      gradientMiddle: '#7c2d12',     // Saturated orange-700
      gradientEnd: '#ea580c',        // Orange-600 highlight edge
      primary: '#ff8a3d',            // Punchier orange primary for dark
      primaryDark: '#f97316',        // Bright orange
      accent: '#1e3a8a',             // Denim blue accent (matches jeans)
      surface: '#140c08',            // Very dark orange surface
      surfaceVariant: '#20130b',     // Darker variant for layers
      cardBackground: '#20130b',     // Card background
      buttonPrimary: '#f97316',      // Orange buttons
      buttonSecondary: '#20130b',    // Dark secondary
      glow: '#ffb266',               // Warm orange glow
      shimmer: '#ffa366',            // Orange shimmer for motion
    },
  },

  // Riley - Pinkish theme (swapped with Sam)
  model6: {
    light: {
      gradientStart: '#fef7f7',      // Soft rose white
      gradientMiddle: '#fdf2f8',     // Light rose
      gradientEnd: '#fbcfe8',        // Soft pink
      primary: '#ec4899',            // Pink 500
      primaryDark: '#db2777',        // Deep pink
      accent: '#f472b6',             // Pink accent
      surface: '#fff7fb',            // Very light pink surface
      surfaceVariant: '#fde6f2',     // Light pink variant
      cardBackground: '#ffffff',     // White cards
      buttonPrimary: '#ec4899',      // Pink buttons
      buttonSecondary: '#fde6f2',    // Light pink secondary
      glow: '#f472b6',               // Pink glow
      shimmer: '#fbcfe8',            // Light pink shimmer
    },
    dark: {
      gradientStart: '#2a1520',      // Rich dark rose
      gradientMiddle: '#3d1f2e',     // Medium dark pink
      gradientEnd: '#4a1e35',        // Deep rose
      primary: '#f472b6',            // Bright pink
      primaryDark: '#db2777',        // Deep pink
      accent: '#fb7185',             // Pink accent
      surface: '#1c0f16',            // Dark pink surface
      surfaceVariant: '#311825',     // Dark variant
      cardBackground: '#311825',     // Dark pink cards
      buttonPrimary: '#f472b6',      // Pink buttons
      buttonSecondary: '#311825',    // Dark secondary
      glow: '#fb7185',               // Pink glow
      shimmer: '#f472b6',            // Pink shimmer
    },
  },
};

// Helper function to get model color palette
export function getModelColorPalette(modelId: ModelId, colorScheme: 'light' | 'dark'): ModelColorPalette {
  return MODEL_COLOR_SCHEMES[modelId][colorScheme];
}

// Helper function to create gradient style string
export function getModelGradient(modelId: ModelId, colorScheme: 'light' | 'dark'): string {
  const palette = getModelColorPalette(modelId, colorScheme);
  return `linear-gradient(135deg, ${palette.gradientStart} 0%, ${palette.gradientMiddle} 50%, ${palette.gradientEnd} 100%)`;
}