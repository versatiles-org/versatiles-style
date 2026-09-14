import { resolveOsm, type OsmOptions } from './osm.js';
import type { OsmOverlayOptions } from './osm-overlay.js';
import { resolveSatellite, type SatelliteOptions } from './satellite.js';
import { resolveTheme, type Palette, type ResolvedTheme, type ThemeOptions } from './theme.js';
import { minimizeFonts, type FontOptions, type ResolvedFonts } from './fonts.js';
import { getOverlayLayerGroupMap, type LayerGroupMap } from '../shortbread/layer-groups-map.js';

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
 * resolving turns that `true` into the default object.
 */
function withoutDefaults(value: unknown, defaults: unknown): unknown {
	if (value === undefined) return undefined;
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
 * The theme itself is compared against `defaultPalette` — otherwise a non-default palette would
 * equal its own defaults and vanish.
 *
 * `text.fonts` is minimised on its own (`minimizeFonts`): a string or `default` in the input stands for
 * many resolved topics, so comparing it key by key against the resolved tree would keep all of it.
 */
export function minimizeThemed<T extends { theme?: ThemeOptions }>(
	options: T,
	defaultsFor: (theme: ResolvedTheme) => unknown,
	defaultPalette: Palette
): T {
	const { theme: raw, ...rest } = options;
	const theme = resolveTheme(raw, defaultPalette);
	const defaults = defaultsFor(theme) as { text?: { fonts?: ResolvedFonts } };

	const text = (rest as { text?: { fonts?: FontOptions } }).text;
	const fontDefaults = defaults.text?.fonts;
	const minimizeTheFonts = text?.fonts !== undefined && fontDefaults !== undefined;
	const fonts = minimizeTheFonts ? minimizeFonts(text.fonts, fontDefaults) : undefined;
	const withoutFonts = minimizeTheFonts ? { ...rest, text: { ...text, fonts: undefined } } : rest;

	const out = (withoutDefaults(withoutFonts, defaults) ?? {}) as T & { text?: Plain };
	if (fonts !== undefined) out.text = { ...out.text, fonts };
	return (theme === defaultPalette ? out : { theme, ...out }) as T;
}

/** The smallest `OsmOptions` that builds the same style as `options`. */
export function minimizeOsmOptions(options: OsmOptions = {}): OsmOptions {
	resolveOsm(options); // rejects unknown keys; the resolved result is not needed
	return minimizeThemed(options, (theme) => resolveOsm({ theme }), 'colorful');
}

/**
 * `layers` without the groups that `groups` does not list. A scalar on a group that is listed stays,
 * since it cascades to children that are.
 */
function withinGroups(layers: Plain, groups: LayerGroupMap): Plain {
	const out: Plain = {};
	for (const [key, value] of Object.entries(layers)) {
		const node = groups[key];
		if (node === undefined) continue;
		out[key] = isPlain(value) && !Array.isArray(node) ? withinGroups(value, node) : value;
	}
	return out;
}

/** The smallest `SatelliteOptions` that builds the same style as `options`. */
export function minimizeSatelliteOptions(options: SatelliteOptions = {}): SatelliteOptions {
	resolveSatellite(options); // rejects unknown keys; the resolved result is not needed
	const { osmOverlay, ...rest } = options;
	const out = (withoutDefaults(rest, resolveSatellite()) ?? {}) as SatelliteOptions;
	if (osmOverlay === false) return { ...out, osmOverlay: false };
	if (osmOverlay === undefined || osmOverlay === true) return out;
	// Groups the overlay draws no layer of (land, water, …) change nothing, so they go first.
	const layers = osmOverlay.layers;
	const drawn = isPlain(layers) ? withinGroups(layers, getOverlayLayerGroupMap()) : layers;
	// The overlay defaults to `gray` and its colours follow its own theme. Compare against what
	// `satellite()` itself resolves for that theme, not plain overlay defaults: it layers the imagery
	// defaults (white labels, dark halo, bold font) on top, and those must minimise away too.
	const overlay = minimizeThemed<OsmOverlayOptions>(
		{ ...osmOverlay, layers: drawn as OsmOverlayOptions['layers'] },
		(theme) => resolveSatellite({ osmOverlay: { theme } }).osmOverlay,
		'gray'
	);
	return Object.keys(overlay).length > 0 ? { ...out, osmOverlay: overlay } : out;
}
