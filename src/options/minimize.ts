import { resolveOsm, type OsmOptions } from './osm.js';
import type { OsmOverlayOptions } from './osm-overlay.js';
import { resolveSatellite, type SatelliteOptions } from './satellite.js';
import { resolveTheme, type Palette, type ResolvedTheme, type ThemeOptions } from './theme.js';

type Plain = Record<string, unknown>;

/** A plain object literal — not an array, not a class instance such as `Color`, which is a value. */
function isPlain(value: unknown): value is Plain {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
	const proto = Object.getPrototypeOf(value);
	return proto === Object.prototype || proto === null;
}

/**
 * `value` minus everything equal to `defaults`, recursively; `undefined` when nothing is left.
 *
 * `true` counts as the default of a `boolean | object` option whose default is enabled, because
 * resolving turns that `true` into the default object. Functions (a custom `urls.fetch`) have no
 * default to equal and are kept.
 */
function withoutDefaults(value: unknown, defaults: unknown): unknown {
	if (value === undefined) return undefined;
	if (typeof value === 'function') return value;
	if (value === true && isPlain(defaults)) return undefined;
	if (isPlain(value)) {
		const base = isPlain(defaults) ? defaults : {};
		const out: Plain = {};
		for (const [key, entry] of Object.entries(value)) {
			const rest = withoutDefaults(entry, base[key]);
			if (rest !== undefined) out[key] = rest;
		}
		return Object.keys(out).length > 0 ? out : undefined;
	}
	return JSON.stringify(value) === JSON.stringify(defaults) ? undefined : value;
}

/**
 * Minimise an options object that carries a `theme`.
 *
 * Colours depend on the theme, so everything else is compared against the defaults of *this* theme.
 * The theme itself is compared against `defaultPalette` in light mode — otherwise a non-default
 * palette would equal its own defaults and vanish. `darkMode: 'auto'` is kept as written, since
 * resolving it would freeze whatever mode the machine happens to be in.
 */
function minimizeThemed<T extends { theme?: ThemeOptions }>(
	options: T,
	defaultsFor: (theme: ResolvedTheme) => unknown,
	defaultPalette: Palette
): T {
	const { theme: raw, ...rest } = options;
	const theme = resolveTheme(raw, defaultPalette);
	const out = (withoutDefaults(rest, defaultsFor(theme)) ?? {}) as T;

	const darkMode = typeof raw === 'object' && raw.darkMode === 'auto' ? 'auto' : theme.darkMode;
	let minimalTheme: ThemeOptions | undefined;
	if (darkMode !== false) {
		minimalTheme = theme.palette === defaultPalette ? { darkMode } : { palette: theme.palette, darkMode };
	} else if (theme.palette !== defaultPalette) {
		minimalTheme = theme.palette;
	}
	return (minimalTheme === undefined ? out : { theme: minimalTheme, ...out }) as T;
}

/** The smallest `OsmOptions` that builds the same style as `options`. */
export function minimizeOsmOptions(options: OsmOptions = {}): OsmOptions {
	return minimizeThemed(options, (theme) => resolveOsm({ theme }), 'colorful');
}

/** The smallest `SatelliteOptions` that builds the same style as `options`. */
export function minimizeSatelliteOptions(options: SatelliteOptions = {}): SatelliteOptions {
	const { osmOverlay, ...rest } = options;
	const out = (withoutDefaults(rest, resolveSatellite()) ?? {}) as SatelliteOptions;
	if (osmOverlay === false) return { ...out, osmOverlay: false };
	if (osmOverlay === undefined || osmOverlay === true) return out;
	// The overlay defaults to `gray` and its colours follow its own theme. Compare against what
	// `satellite()` itself resolves for that theme, not plain overlay defaults: it layers the imagery
	// defaults (white labels, dark halo, bold font) on top, and those must minimise away too.
	const overlay = minimizeThemed<OsmOverlayOptions>(
		osmOverlay,
		(theme) => resolveSatellite({ osmOverlay: { theme } }).osmOverlay,
		'gray'
	);
	return Object.keys(overlay).length > 0 ? { ...out, osmOverlay: overlay } : out;
}
