import type { DataDrivenPropertyValueSpecification, FormattedSpecification } from '@maplibre/maplibre-gl-style-spec';
import { Color } from '../color/index.js';
import { colorOptionsKeys } from '../options/index.js';
import type { ColorsOptions, ResolvedOsm, ResolvedOsmFeatures, ResolvedLayerGroups } from '../options/index.js';
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
	features: ResolvedOsmFeatures;
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

/** Build the schema-neutral part of a layer context, given the parts only the schema can supply. */
export function buildLayerContext(resolved: ResolvedOsm, seam: ContextSeam): LayerContext {
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
