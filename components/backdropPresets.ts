import type { BackdropTheme } from '../types';

// Plain data, deliberately free of any three.js import so the settings UI can
// list the options without pulling the renderer into its module graph.

/**
 * The photographic environments drei ships. Each is a real HDRI panorama, so
 * choosing one both lights the figure and puts it in an actual place. They are
 * fetched from the pmndrs CDN on first use, which is why every preset also
 * carries dome colours to show while the panorama loads (or if it never does).
 */
export type EnvironmentPreset =
  | 'apartment'
  | 'city'
  | 'dawn'
  | 'forest'
  | 'lobby'
  | 'night'
  | 'park'
  | 'studio'
  | 'sunset'
  | 'warehouse';

export interface BackdropPreset {
  label: string;
  hint: string;
  /** A real HDRI panorama, or null for the two hand-drawn looks. */
  environment: EnvironmentPreset | null;
  /** Softens the panorama so the figure stays readable in front of it. */
  backgroundBlur: number;
  /** Trims a bright panorama back so the figure is not the darkest thing on screen. */
  backgroundIntensity: number;
  /** Tints the rim light and the swatch in settings. */
  glow: string;
  rimIntensity: number;
  swatchFrom: string;
  swatchTo: string;

  // Procedural dome. Drawn on its own for the hand-drawn looks, and as the
  // stand-in while a panorama downloads.
  domeHigh: string;
  domeLow: string;
  glowStrength: number;
  /** Drifting scan bands. Only the futuristic look uses them. */
  bandStrength: number;

  moteCount: number;
  moteColor: string;
  /** Point size in pixels at one unit from the camera. */
  moteSize: number;
  /** 1 is a round shell of motes, lower values flatten it toward the horizon. */
  moteFlatten: number;
  /** Amplitude of each mote's idle bob. */
  moteBob: number;
  /** Constant upward drift, wrapping around the shell. */
  moteRise: number;
  /** Radians per second the whole field turns. */
  spin: number;
}

/** Shared by every preset that has no motes of its own. */
const NO_MOTES = {
  moteCount: 0,
  moteColor: '#FFFFFF',
  moteSize: 60,
  moteFlatten: 1,
  moteBob: 0,
  moteRise: 0,
  spin: 0,
};

export const BACKDROP_PRESETS: Record<BackdropTheme, BackdropPreset> = {
  nature: {
    label: 'Nature',
    hint: 'Real forest, pollen in the light',
    environment: 'forest',
    backgroundBlur: 0.18,
    backgroundIntensity: 0.9,
    glow: '#7FD98C',
    rimIntensity: 0.5,
    swatchFrom: '#3E6B45',
    swatchTo: '#0C1E14',
    domeHigh: '#0C1E14',
    domeLow: '#04100B',
    glowStrength: 0.28,
    bandStrength: 0,
    // Few, large, slowly rising motes read as pollen caught in the light.
    moteCount: 520,
    moteColor: '#CFF09A',
    moteSize: 130,
    moteFlatten: 0.5,
    moteBob: 0.9,
    moteRise: 0.35,
    spin: 0.006,
  },
  city: {
    label: 'City',
    hint: 'Real street, daylight',
    environment: 'city',
    backgroundBlur: 0.2,
    backgroundIntensity: 0.85,
    glow: '#9FB6D4',
    rimIntensity: 0.4,
    swatchFrom: '#5A6B84',
    swatchTo: '#131A26',
    domeHigh: '#161C28',
    domeLow: '#080B12',
    glowStrength: 0.2,
    bandStrength: 0,
    ...NO_MOTES,
  },
  sunset: {
    label: 'Sunset',
    hint: 'Real horizon, warm light',
    environment: 'sunset',
    backgroundBlur: 0.2,
    backgroundIntensity: 0.9,
    glow: '#FFA45C',
    rimIntensity: 0.6,
    swatchFrom: '#E0763A',
    swatchTo: '#2A1420',
    domeHigh: '#3A2030',
    domeLow: '#140A12',
    glowStrength: 0.3,
    bandStrength: 0,
    ...NO_MOTES,
  },
  dawn: {
    label: 'Dawn',
    hint: 'Real morning sky',
    environment: 'dawn',
    backgroundBlur: 0.2,
    backgroundIntensity: 0.95,
    glow: '#FFC9A8',
    rimIntensity: 0.5,
    swatchFrom: '#C9A0D0',
    swatchTo: '#1E1A2E',
    domeHigh: '#2A2740',
    domeLow: '#101020',
    glowStrength: 0.26,
    bandStrength: 0,
    ...NO_MOTES,
  },
  night: {
    label: 'Night',
    hint: 'Real city after dark',
    environment: 'night',
    backgroundBlur: 0.25,
    backgroundIntensity: 1.1,
    glow: '#6C8FD4',
    rimIntensity: 0.7,
    swatchFrom: '#1B2740',
    swatchTo: '#05070E',
    domeHigh: '#0A1020',
    domeLow: '#03050A',
    glowStrength: 0.24,
    bandStrength: 0,
    ...NO_MOTES,
  },
  studio: {
    label: 'Studio',
    hint: 'Real softbox studio',
    environment: 'studio',
    backgroundBlur: 0.1,
    backgroundIntensity: 0.8,
    glow: '#FFFFFF',
    rimIntensity: 0.3,
    swatchFrom: '#D8DCE4',
    swatchTo: '#2A2E36',
    domeHigh: '#151922',
    domeLow: '#05070B',
    glowStrength: 0.08,
    bandStrength: 0,
    ...NO_MOTES,
  },
  space: {
    label: 'Space',
    hint: 'Deep field of stars',
    // No photographic panorama fits, so this one stays hand-drawn.
    environment: null,
    backgroundBlur: 0,
    backgroundIntensity: 1,
    glow: '#5A43A0',
    rimIntensity: 0.8,
    swatchFrom: '#1A1038',
    swatchTo: '#01020A',
    domeHigh: '#01020A',
    domeLow: '#05010E',
    glowStrength: 0.22,
    bandStrength: 0,
    // Many small, near-still points read as distant stars rather than dust.
    moteCount: 1800,
    moteColor: '#FFFFFF',
    moteSize: 45,
    moteFlatten: 1,
    moteBob: 0.05,
    moteRise: 0,
    spin: 0.004,
  },
  futuristic: {
    label: 'Futuristic',
    hint: 'Blue haze and scan lines',
    environment: null,
    backgroundBlur: 0,
    backgroundIntensity: 1,
    glow: '#00BFFF',
    rimIntensity: 1.4,
    swatchFrom: '#0B2540',
    swatchTo: '#03050A',
    domeHigh: '#070C16',
    domeLow: '#03050A',
    glowStrength: 0.3,
    bandStrength: 0.018,
    moteCount: 900,
    moteColor: '#87CEFA',
    moteSize: 90,
    moteFlatten: 0.65,
    moteBob: 0.6,
    moteRise: 0,
    spin: 0.012,
  },
};

/** Photographic looks first, then the two hand-drawn ones. */
export const BACKDROP_ORDER: BackdropTheme[] = [
  'nature',
  'city',
  'sunset',
  'dawn',
  'night',
  'studio',
  'space',
  'futuristic',
];

/** Lights the figure for the hand-drawn looks, which have no panorama of their own. */
export const FALLBACK_LIGHTING_PRESET: EnvironmentPreset = 'night';
