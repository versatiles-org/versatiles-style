import type { ColorsOptions, Palette } from '../options/index.js';
import { colorful } from './colorful.js';
import { gray } from './gray.js';
import { muted } from './muted.js';
import { natural } from './natural.js';
import { toner } from './toner.js';
import type { PaletteDefinition } from './types.js';

export type { PaletteDefinition } from './types.js';
export { colorful, gray, muted, natural, toner };

export const PALETTES: ReadonlyArray<Palette> = ['colorful', 'natural', 'muted', 'gray', 'toner'] as const;

const PALETTE_MAP: Record<Palette, PaletteDefinition> = { colorful, natural, muted, gray, toner };

export function getPaletteColors(palette: Palette, darkMode: boolean): Required<ColorsOptions> {
	return darkMode ? PALETTE_MAP[palette].dark : PALETTE_MAP[palette].light;
}

export function getPaletteDefinition(palette: Palette): PaletteDefinition {
	return PALETTE_MAP[palette];
}
