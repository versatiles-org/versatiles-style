import type { DataDrivenPropertyValueSpecification, FormattedSpecification } from '@maplibre/maplibre-gl-style-spec';
import { Color } from '../color/index.js';
import { colorOptionsKeys } from '../options/index.js';
import type { ColorsOptions, ResolvedColors, ResolvedLayerGroups } from '../options/index.js';
import type { Palette } from '../options/index.js';
import { isDarkPalette } from '../themes/index.js';

export type ColorSet = Record<keyof ColorsOptions, Color>;

// Everything a layer-group module needs to build its layers' structure AND style.
// Built once per style; passed to every group generator.
export type LayerContext = {
	/** MapLibre source name added to every non-background layer. */
	source: string;
	/** Resolved palette colors, parsed to Color instances and keyed by ColorsOptions key. */
	c: ColorSet;
	/** Reference "background" color: ≈ white in light mode, black in dark mode. */
	bg: Color;
	/** Inverse of `bg`: ≈ black in light mode, white in dark mode. */
	fg: Color;
	/** Resolved font names. */
	fonts: { normal: string; bold: string };
	/** The resolved feature flags a layer module may read. Deliberately narrower than any schema's
	 *  `features` option: only `buildings` changes which layers are emitted, and `landcover` is a
	 *  Shortbread tileset extension applied to the finished style, not consulted here. */
	features: { buildings: 'flat' | 'extruded' };
	/** Fully-resolved per-group visibility/opacity. Each layer gates itself on its own group. */
	layers: ResolvedLayerGroups;
	/** Language-aware `text-field` expression for label/symbol layers. */
	nameField: DataDrivenPropertyValueSpecification<FormattedSpecification>;
};

/**
 * The two things about a context that only the schema knows.
 *
 * Everything else a context carries — colours, bg/fg, fonts, features, group visibility — is derived
 * from the resolved options and means the same thing for any tileset. These two do not: the source
 * name is the tileset's, and the field a localised label reads is a naming convention that differs per
 * schema (Shortbread and OpenMapTiles carry `name_de`, Protomaps `name:de`, OpenMapTiles both).
 */
export type ContextSeam = {
	/** MapLibre source name this schema's layers read from. */
	source: string;
	/** Builds the `text-field` expression for the resolved language settings. */
	nameField: (
		language: string,
		languageStrict: boolean
	) => DataDrivenPropertyValueSpecification<FormattedSpecification>;
};

/**
 * The resolved options a context is derived from — structurally what every schema's resolver returns,
 * narrowed to what the derivation reads. `ResolvedOsm` and `ResolvedOmt` both satisfy it, which is what
 * lets one derivation serve both without either schema's type leaking into the DSL.
 */
export type ContextOptions = {
	theme: Palette;
	colors: ResolvedColors;
	features: { buildings: 'flat' | 'extruded' };
	layers: ResolvedLayerGroups;
	text: { fontNormal: string; fontBold: string; language: string; languageStrict: boolean };
};

/** Build the schema-neutral part of a layer context, given the parts only the schema can supply. */
export function buildLayerContext(resolved: ContextOptions, seam: ContextSeam): LayerContext {
	const c = Object.fromEntries(colorOptionsKeys.map((key) => [key, Color.parse(resolved.colors[key])])) as ColorSet;

	// `bg` is the pure "background" reference — fully white in light mode, fully black in dark mode —
	// and `fg` is its inverse. Derived colors blend toward bg/fg (instead of absolute lighten/darken)
	// so they adapt to both light and dark palettes; keeping bg/fg pure makes those blends predictable.
	const bg = Color.parse(isDarkPalette(resolved.theme) ? '#000000' : '#ffffff');
	const fg = bg.invertLuminosity();

	return {
		source: seam.source,
		c,
		bg,
		fg,
		features: resolved.features,
		layers: resolved.layers,
		fonts: { normal: resolved.text.fontNormal, bold: resolved.text.fontBold },
		nameField: seam.nameField(resolved.text.language, resolved.text.languageStrict),
	};
}
