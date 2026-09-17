import {
	DEFAULT_FONT_BOLD,
	DEFAULT_LABEL_STYLES,
	mapTopics,
	topicOf,
	checkKeys,
	resolveColors,
	resolveLayerGroups,
	resolveIcon,
	resolveRecolor,
	resolveText,
	resolveTheme,
	type ColorsOptions,
	type LayerGroupOptions,
	type IconOptions,
	type Palette,
	type RecolorOptions,
	type ResolvedColors,
	type ResolvedLayerGroups,
	type ResolvedIcon,
	type ResolvedRecolor,
	type ResolvedText,
	type ResolvedTheme,
	type ResolvedLabelStyle,
	type TextOptions,
	type TopicTree,
	type ThemeOptions,
} from './parts/index.js';

export type OsmOverlayOptions = {
	theme?: ThemeOptions;
	layers?: boolean | number | LayerGroupOptions;
	text?: TextOptions;
	icon?: IconOptions;
	colors?: ColorsOptions;
	recolor?: RecolorOptions;
};

export type ResolvedOsmOverlay = {
	theme: ResolvedTheme;
	layers: ResolvedLayerGroups;
	text: ResolvedText;
	icon: ResolvedIcon;
	colors: ResolvedColors;
	recolor: ResolvedRecolor;
};

export function resolveOsmOverlay(
	content: OsmOverlayOptions,
	defaultPalette?: Palette,
	path = 'osmOverlay',
	labelDefaults?: TopicTree<ResolvedLabelStyle>
): ResolvedOsmOverlay {
	checkKeys(content, { theme: true, layers: true, text: true, icon: true, colors: true, recolor: true }, path);
	const theme = resolveTheme(content.theme, defaultPalette, `${path}.theme`);
	return {
		theme,
		layers: resolveLayerGroups(content.layers, `${path}.layers`),
		text: resolveText(content.text, `${path}.text`, labelDefaults),
		icon: resolveIcon(content.icon, `${path}.icon`),
		colors: resolveColors(theme, content.colors, `${path}.colors`),
		recolor: resolveRecolor(content.recolor, `${path}.recolor`),
	};
}

/**
 * The overlay's own defaults, which sit here rather than beside the overlay code in
 * `src/features/satellite-overlay.ts` for one structural reason: **options must not import features.**
 *
 * They did, briefly, and the result was not a lint error but a temporal-dead-zone crash halfway across
 * the package — `mapTopics is not a function`, thrown from a module-level initialiser, because the
 * options barrel was still evaluating when the features barrel called back into it. Keeping the
 * dependency one-way (features → options) is what stops that from being possible.
 */

/** Halo tuned for imagery: tight and hard, rather than the wide soft halo used on a flat basemap (`OVERLAY_LABEL_STYLES`). */
const HALO_WIDTH = 1;
const HALO_BLUR = 0;

/**
 * The option defaults that give the overlay its imagery treatment, overridable by the caller.
 *
 * Every label-text token is lightened, not just `label`: place names, POIs, transit symbols, house
 * numbers and water names each draw from their own colour, so setting only `label` leaves most of
 * the labels in basemap grey. `labelShield` is left alone — it is the motorway shield's background,
 * not text — and so are the oneway arrows, which are tinted from `fg` and carry no text.
 *
 * Note this also whitens POI and transit *icons*, which share their label's colour token. v5 left
 * those dark; white reads better over imagery, so it is a deliberate departure.
 */
export const OVERLAY_DEFAULTS = {
	/** White on black reads over both bright and dark ground; the basemap's dark-on-white does not. */
	colors: {
		label: '#ffffff',
		labelHalo: '#000000',
		labelPoi: '#ffffff',
		labelSymbol: '#ffffff',
		labelHousenumber: '#ffffff',
		/**
		 * Lake and river names are the one label that is not plain white: a water blue keeps the cue
		 * that says "this is water, not a town", and still clears the halo comfortably (11.9:1 against
		 * the black halo, where the basemap's dark slate managed 2.9:1 and vanished).
		 */
		labelWater: '#8FC1ED',
	},
} as const;

/**
 * The overlay's label styles: every topic bold, as v5 set every symbol layer, so labels hold up against
 * a busy photo; and a tight, hard halo — 1 px, no blur — rather than the wide soft halo used on a flat
 * basemap. A topic drawn without a halo (house numbers) stays without one.
 */
export const OVERLAY_LABEL_STYLES: TopicTree<ResolvedLabelStyle> = mapTopics((topic) => {
	const style = topicOf(DEFAULT_LABEL_STYLES, topic);
	return {
		...style,
		font: DEFAULT_FONT_BOLD,
		...(style.haloWidth > 0 && { haloWidth: HALO_WIDTH, haloBlur: HALO_BLUR }),
	};
});
