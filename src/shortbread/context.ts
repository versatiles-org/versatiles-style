import type { DataDrivenPropertyValueSpecification, FormattedSpecification } from '@maplibre/maplibre-gl-style-spec';
import { Color } from '../color/index.js';
import { colorOptionsKeys } from '../types/index.js';
import type { ColorsOptions, ResolvedOsmOptions } from '../types/index.js';

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
	features: ResolvedOsmOptions['features'];
	/** Language-aware `text-field` expression for label/symbol layers. */
	nameField: DataDrivenPropertyValueSpecification<FormattedSpecification>;
};

const SOURCE_NAME = 'versatiles-shortbread';

function buildNameField(
	language: string,
	languageStrict: boolean
): DataDrivenPropertyValueSpecification<FormattedSpecification> {
	if (!language || language === 'local') return ['get', 'name'];
	if (languageStrict) return ['get', 'name_' + language];
	return ['coalesce', ['get', 'name_' + language], ['get', 'name']];
}

export function buildContext(resolved: ResolvedOsmOptions): LayerContext {
	const c = Object.fromEntries(colorOptionsKeys.map((key) => [key, Color.parse(resolved.colors[key])])) as ColorSet;

	// bg ≈ white in light mode / black in dark mode; fg is its inverse.
	const bg = c.land.saturate(-1).contrast(100);
	const fg = bg.invertLuminosity();

	return {
		source: SOURCE_NAME,
		c,
		bg,
		fg,
		features: resolved.features,
		fonts: { normal: resolved.text.fontNormal, bold: resolved.text.fontBold },
		nameField: buildNameField(resolved.text.language, resolved.text.languageStrict),
	};
}
