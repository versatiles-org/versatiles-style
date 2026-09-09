// `Color` comes from ./parse.js, not ./abstract.js: importing it from there is what installs
// `Color.parse` and the `Color.HSL/HSV/RGB` statics. See the note in parse.ts.
export { Color } from './parse.js';

export type { RandomColorOptions } from './random.js';
export type { HSL } from './hsl.js';
export type { HSV } from './hsv.js';
export type { RGB } from './rgb.js';
export { applyRecolor, calculateDarkModeColors } from './recolor.js';
