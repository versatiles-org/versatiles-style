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
// Leaf modules, not the barrels: `getPaletteColors` is a value, and taking it from `./parts/index.js`
// — which re-exports it — closes the same runtime loop the note below this import block describes.
import { getPaletteColors } from '../themes/index.js';
import { Color } from '../color/index.js';

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
		// The derived colours go *under* the caller's, so an explicit `colors.label` still wins — and an
		// explicit `undefined` still falls through to the theme's own value, as it did when these were
		// constants merged in by `satellite()`.
		colors: resolveColors(theme, { ...overlayLabelColors(theme), ...content.colors }, `${path}.colors`),
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

/** Halo tuned for imagery: tight and hard, rather than the wide soft halo a flat basemap uses (`DEFAULT_LABEL_STYLES`). Applied by `OVERLAY_LABEL_STYLES` below. */
const HALO_WIDTH = 1;
const HALO_BLUR = 0;

/**
 * How light a label has to be to hold up over photography, and how dark its halo has to be, as OKLCh
 * lightness. The ground is an unknown photo rather than a palette colour, so this is the overlay's
 * own contract and not something a theme can be trusted to satisfy: on a flat basemap the same tokens
 * are deliberately *quiet* — POI names at 40% alpha, house numbers at 30% — which is right there and
 * illegible here.
 */
const LABEL_LIGHTNESS = 0.92;
const HALO_LIGHTNESS = 0.15;
/**
 * Water names sit a little below the other labels: they keep the theme's water hue, and pushing that
 * hue to 0.92 would wash the colour out of it, which is the whole point of drawing them differently.
 */
const WATER_LIGHTNESS = 0.85;

/**
 * A colour at a given OKLCh lightness, keeping its hue and chroma, at full alpha.
 *
 * `clamp` is a floor for labels and a ceiling for the halo, never an assignment: a palette that
 * already puts a token past the mark keeps its own value rather than being dragged back to the
 * threshold (`toner`'s white label stays `#ffffff`, not `0.92`).
 *
 * A grey has no meaningful hue — the conversion reports it as `NaN` — so it is pinned to 0, which
 * converts back to the same grey and keeps an achromatic palette achromatic.
 */
function atLightness(color: string, lightness: number, clamp: 'floor' | 'ceiling'): string {
	const [l, c, h] = Color.parse(color).opaque().to('oklch').coords;
	const target = clamp === 'floor' ? Math.max(l, lightness) : Math.min(l, lightness);
	return Color.from('oklch', [target, c, Number.isFinite(h) ? h : 0], 1)
		.to('srgb')
		.toGamut()
		.asHex();
}

/**
 * The overlay's label colours, derived from the theme rather than fixed.
 *
 * Every label-text token is lightened, not just `label`: place names, POIs, transit symbols, house
 * numbers and water names each draw from their own colour, so setting only `label` leaves most of
 * the labels in basemap grey. `labelShield` is left alone — it is the motorway shield's background,
 * not text — and so are the oneway arrows, which are tinted from `fg` and carry no text.
 *
 * Note this also lightens POI and transit *icons*, which share their label's colour token. v5 left
 * those dark; light reads better over imagery, so it is a deliberate departure.
 *
 * Only lightness and alpha are the overlay's business; hue and chroma stay the theme's. That is what
 * keeps `gray` — whose 45 colours are all exactly chroma 0 — from growing a coloured label, which a
 * hardcoded `#8FC1ED` water blue did.
 *
 * `labelWater` derives from `water`, the polygon colour, not from `labelWater`: on the basemap the
 * water name sits *on* the water and the polygon carries the "this is water" cue, so the label itself
 * is deliberately desaturated. Over imagery the label is alone and has to carry the cue, so it
 * inherits from the polygon a theme that has no water hue (`gray`, `toner`) yields a neutral label,
 * which is the correct answer for those themes rather than a missing feature.
 */
export function overlayLabelColors(theme: ResolvedTheme): ColorsOptions {
	const palette = getPaletteColors(theme);
	const label = (color: string): string => atLightness(color, LABEL_LIGHTNESS, 'floor');
	return {
		label: label(palette.label),
		labelHalo: atLightness(palette.labelHalo, HALO_LIGHTNESS, 'ceiling'),
		labelPoi: label(palette.labelPoi),
		labelSymbol: label(palette.labelSymbol),
		labelHousenumber: label(palette.labelHousenumber),
		labelWater: atLightness(palette.water, WATER_LIGHTNESS, 'floor'),
	};
}

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
