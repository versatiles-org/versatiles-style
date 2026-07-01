import type { ColorsOptions } from '../options/index.js';

// A palette: the resolved colors for light and dark mode. Per-layer styling now lives in the
// shortbread layer modules, so palettes carry color data only.
export type PaletteDefinition = {
	light: Required<ColorsOptions>;
	dark: Required<ColorsOptions>;
};
