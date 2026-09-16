import {
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
} from './parts/';

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
