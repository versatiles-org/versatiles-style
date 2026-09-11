import { SpriteConfig } from '../lib/sprites.js';
import base from './icons-base.js';
import extras from './icons-extras.js';
import icons from './icons-icons.js';

// The sheet manifest. Which icons each sheet holds lives in the three `icons-*` modules
// beside this one — one entry per icon there, so this file stays the shape of the build rather
// than a wall of data.
const config: SpriteConfig = {
	// 1x + 2x only: MapLibre fetches `base` (dpr ≤ 1) or `base@2x` (dpr > 1) and never @3x/@4x, and
	// the icons are SDF (resolution-independent), so higher ratios would be built but never used.
	ratios: [1, 2],
	spritesheets: { base, extras, icons },
};

export default config;
