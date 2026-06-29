import type {
	ColorsOptions,
	HillshadeOptions,
	LayoutOptions,
	OsmContentOptions,
	OsmOptions,
	RecolorOptions,
	SkyOptions,
	SpriteEntry,
	SpriteInput,
	SunOptions,
	TextOptions,
} from '../types/index.js';
import type {
	ResolvedFeatures,
	ResolvedLayout,
	ResolvedOsmOptions,
	ResolvedSky,
	ResolvedSun,
	ResolvedText,
	ResolvedTheme,
	ResolvedUrls,
} from '../types/index.js';
import type { Palette } from '../types/index.js';
import { colorOptionsKeys } from '../types/index.js';
import { getPaletteColors } from '../themes/index.js';
import { resolveUrl, basename } from '../lib/utils.js';
import { isDarkMode } from './isDarkMode.js';
import { ResolvedRecolorOptions } from '../types/resolved.js';

const DEFAULT_BASE = globalThis?.document?.location?.origin ?? 'https://tiles.versatiles.org';

const DEFAULT_FONT_NORMAL = 'noto_sans_regular';
const DEFAULT_FONT_BOLD = 'noto_sans_bold';

function resolveBase(base?: string): string {
	return base ?? DEFAULT_BASE;
}

function resolveSprite(base: string, sprite?: SpriteInput): SpriteEntry[] {
	const input = sprite ?? [{ id: 'basics', url: '/assets/sprites/basics/sprites' }];
	if (typeof input === 'string') {
		return [{ id: basename(input), url: resolveUrl(base, input) }];
	}
	return input.map(({ id, url }) => ({ id, url: resolveUrl(base, url) }));
}

export function resolveTheme(theme?: OsmContentOptions['theme']): ResolvedTheme {
	if (theme == null) return { palette: 'colorful', darkMode: false };
	if (typeof theme === 'string') return { palette: theme as Palette, darkMode: false };
	return {
		palette: theme.palette ?? 'colorful',
		darkMode: theme.darkMode === 'auto' ? isDarkMode() : (theme.darkMode ?? false),
	};
}

export function resolveColors(theme: ResolvedTheme, overrides?: ColorsOptions): Required<ColorsOptions> {
	const base = getPaletteColors(theme.palette, theme.darkMode);
	if (!overrides) return { ...base };
	const result = { ...base };
	for (const key of colorOptionsKeys) {
		const val = overrides[key];
		if (val != null) result[key] = val;
	}
	return result;
}

export function resolveRecolor(recolor?: RecolorOptions): ResolvedRecolorOptions {
	return {
		invertBrightness: recolor?.invertBrightness ?? false,
		rotateHue: recolor?.rotateHue ?? 0,
		saturate: recolor?.saturate ?? 0,
		brightness: recolor?.brightness ?? 0,
		contrast: recolor?.contrast ?? 1,
		gamma: recolor?.gamma ?? 1,
		tint: { color: recolor?.tint?.color ?? '#ff0000', amount: recolor?.tint ? (recolor?.tint?.amount ?? 0.5) : 0 },
		blend: { color: recolor?.blend?.color ?? '#ff0000', amount: recolor?.blend ? (recolor?.blend?.amount ?? 0.5) : 0 },
	};
}

export function resolveSun(sun?: SunOptions): ResolvedSun {
	return {
		direction: sun?.direction ?? 315,
		altitude: sun?.altitude ?? 45,
		color: sun?.color ?? '#ffffff',
		intensity: sun?.intensity ?? 0.5,
	};
}

export function resolveSky(sky?: SkyOptions): ResolvedSky {
	return {
		skyColor: sky?.skyColor ?? '#87CEEB',
		horizonColor: sky?.horizonColor ?? '#ffffff',
		skyHorizonBlend: sky?.skyHorizonBlend ?? 0.5,
		horizonFogBlend: sky?.horizonFogBlend ?? 0.5,
		atmosphereBlend: sky?.atmosphereBlend ?? 0,
	};
}

export function resolveText(text?: TextOptions): ResolvedText {
	let language = text?.language ?? 'local';
	if (language === 'user') {
		language = (typeof navigator !== 'undefined' ? navigator.language?.split('-')[0] : undefined) ?? 'local';
	}
	return {
		language,
		languageStrict: text?.languageStrict ?? false,
		fontNormal: text?.fontNormal ?? DEFAULT_FONT_NORMAL,
		fontBold: text?.fontBold ?? DEFAULT_FONT_BOLD,
	};
}

export function resolveLayout(layout?: LayoutOptions): ResolvedLayout {
	const scale = layout?.scale;
	const spacing = layout?.spacing;
	const labelScale = (typeof scale === 'number' ? scale : scale?.labels) ?? 1;
	const iconScale = (typeof scale === 'number' ? scale : scale?.icons) ?? 1;
	const labelSpacing = (typeof spacing === 'number' ? spacing : spacing?.labels) ?? 1;
	const iconSpacing = (typeof spacing === 'number' ? spacing : spacing?.icons) ?? 1;
	return {
		labels: { scale: labelScale, spacing: labelSpacing },
		icons: { scale: iconScale, spacing: iconSpacing },
	};
}

function resolveTerrainFeature(terrain?: boolean | { exaggeration?: number }): ResolvedFeatures['terrain'] {
	if (!terrain) return false;
	return { exaggeration: (typeof terrain === 'object' ? terrain.exaggeration : undefined) ?? 1.0 };
}

function resolveHillshadeFeature(hillshade?: HillshadeOptions): ResolvedFeatures['hillshade'] {
	if (!hillshade) return false;
	const h = typeof hillshade === 'object' ? hillshade : {};
	return {
		exaggeration: h.exaggeration ?? 0.1,
		shadowColor: h.shadowColor ?? '#000000',
		highlightColor: h.highlightColor ?? '#ffffff',
		accentColor: h.accentColor ?? '#000000',
		anchor: h.anchor ?? 'map',
	};
}

export function resolveFeatures(features?: OsmOptions['features']): ResolvedFeatures {
	return {
		terrain: resolveTerrainFeature(features?.terrain),
		hillshade: resolveHillshadeFeature(features?.hillshade),
		landcover: features?.landcover ?? false,
		buildings: features?.buildings ?? 'flat',
	};
}

export function resolveOsmUrls(base: string, urls?: OsmOptions['urls']): ResolvedUrls {
	return {
		base,
		osm: urls?.osm ?? resolveUrl(base, '/tiles/osm/{z}/{x}/{y}'),
		elevation: urls?.elevation ?? resolveUrl(base, '/tiles/elevation/{z}/{x}/{y}'),
		glyphsPattern: resolveUrl(base, urls?.glyphsPattern ?? '/assets/glyphs/{fontstack}/{range}.pbf'),
		sprite: resolveSprite(base, urls?.sprite),
	};
}

export function resolveOsmContentOptions(content: OsmContentOptions, urls: ResolvedUrls): ResolvedOsmOptions {
	const theme = resolveTheme(content.theme);
	return {
		urls,
		features: { terrain: false, hillshade: false, landcover: false, buildings: 'flat' },
		sun: resolveSun(),
		sky: resolveSky(),
		theme,
		layers: content.layers ?? {},
		text: resolveText(content.text),
		layout: resolveLayout(content.layout),
		colors: resolveColors(theme, content.colors),
		recolor: resolveRecolor(content.recolor),
	};
}

export function resolveOsmOptions(options?: OsmOptions): ResolvedOsmOptions {
	const base = resolveBase(options?.urls?.base);
	const urls = resolveOsmUrls(base, options?.urls);
	const theme = resolveTheme(options?.theme);

	return {
		urls,
		features: resolveFeatures(options?.features),
		sun: resolveSun(options?.sun),
		sky: resolveSky(options?.sky),
		theme,
		layers: options?.layers ?? {},
		text: resolveText(options?.text),
		layout: resolveLayout(options?.layout),
		colors: resolveColors(theme, options?.colors),
		recolor: resolveRecolor(options?.recolor),
	};
}
