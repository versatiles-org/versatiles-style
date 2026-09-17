import { checkKeys, type KnownKeys } from './keys.js';
import { colorOptionsKeys, type ColorsOptions } from './color-keys.js';
import type { ResolvedTheme } from './theme.js';
import { getPaletteColors } from '../../themes/index.js';

// Re-exported so every consumer keeps reaching them through this module, and through the barrel.
export { colorOptionsKeys, type ColorsOptions } from './color-keys.js';

export type ResolvedColors = Required<ColorsOptions>;

const COLOR_KEYS = Object.fromEntries(colorOptionsKeys.map((key) => [key, true])) as KnownKeys<ColorsOptions>;

export function resolveColors(theme: ResolvedTheme, overrides?: ColorsOptions, path = 'colors'): ResolvedColors {
	checkKeys(overrides, COLOR_KEYS, path);
	const base = getPaletteColors(theme);
	if (!overrides) return { ...base };
	const result = { ...base };
	for (const key of colorOptionsKeys) {
		const val = overrides[key];
		if (val != null) result[key] = val;
	}
	return result;
}
