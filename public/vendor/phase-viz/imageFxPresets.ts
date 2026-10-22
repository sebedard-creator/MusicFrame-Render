import type { ImageFxPreset, ImageFxSettings } from '../store';

export const IMAGE_FX_PRESETS: Record<ImageFxPreset, Omit<ImageFxSettings, 'preset'>> = {
  clean: {
    glow: 0.22,
    blur: 0.06,
    rgbShift: 0.06,
    noise: 0.03,
    distortion: 0.04,
    pulse: 0.16,
  },
  glitch: {
    glow: 0.34,
    blur: 0.18,
    rgbShift: 0.62,
    noise: 0.54,
    distortion: 0.5,
    pulse: 0.42,
  },
  dreamy: {
    glow: 0.72,
    blur: 0.34,
    rgbShift: 0.16,
    noise: 0.12,
    distortion: 0.2,
    pulse: 0.48,
  },
  dark: {
    glow: 0.18,
    blur: 0.1,
    rgbShift: 0.12,
    noise: 0.28,
    distortion: 0.18,
    pulse: 0.26,
  },
  vhs: {
    glow: 0.3,
    blur: 0.24,
    rgbShift: 0.46,
    noise: 0.42,
    distortion: 0.36,
    pulse: 0.3,
  },
};

export const IMAGE_FX_PRESET_LABELS: { value: ImageFxPreset; label: string }[] = [
  { value: 'clean', label: 'Clean' },
  { value: 'glitch', label: 'Glitch' },
  { value: 'dreamy', label: 'Dreamy' },
  { value: 'dark', label: 'Dark' },
  { value: 'vhs', label: 'VHS' },
];

