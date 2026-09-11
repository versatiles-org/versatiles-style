import { colorOptionsKeys } from './colors.js';

/*
 * The v6 names of options that existed in v5, so an unknown-key error can say what to use instead.
 * A migration aid only: without this file `checkKeys` still rejects the key and lists the known ones.
 *
 * Everything here is built on first use. `colors.ts` imports the key check, which imports this
 * module, so reading `colorOptionsKeys` at load time would run before it exists.
 */

type Hints = Readonly<Record<string, string | null>>;

/** Colour keys the rule in `v5ColorKeys` must skip: they kept their v5 name, or are new in v6. */
const NOT_RENAMED = new Set(['background', 'labelHalo', 'labelHousenumber', 'labelWater', 'siteSports']);
const GROUPS = ['nature', 'area', 'site', 'road', 'transit', 'boundary', 'label'];

let colorKeys: Readonly<Record<string, string>> | undefined;
let tables: { osm: Hints; satellite: Hints } | undefined;

/**
 * v5 colour key → v6 colour key. v6 put each key under its group and camel-cased it (`wood` →
 * `natureWood`, `streetbg` → `roadStreetBg`, `buildingbg` → `buildingBg`), so the v5 name is the v6
 * name lower-cased, without the group prefix.
 */
export function v5ColorKeys(): Readonly<Record<string, string>> {
	return (colorKeys ??= Object.fromEntries(
		colorOptionsKeys
			.filter((key) => !NOT_RENAMED.has(key))
			.map((key) => {
				const group = GROUPS.find((g) => key.startsWith(g) && /^[A-Z]/.test(key.slice(g.length)));
				return [(group ? key.slice(group.length) : key).toLowerCase(), key];
			})
			.filter(([v5, v6]) => v5 !== v6)
	));
}

function buildTables(): { osm: Hints; satellite: Hints } {
	// Valid wherever overlay-shaped options are: the top level of `osm()`, and `osmOverlay`.
	const overlay: Record<string, string> = {
		...Object.fromEntries(Object.entries(v5ColorKeys()).map(([v5, v6]) => [`colors.${v5}`, `colors.${v6}`])),
		'recolor.rotate': 'recolor.rotateHue',
		'recolor.tintColor': 'recolor.tint.color',
		'recolor.blendColor': 'recolor.blend.color',
		fonts: 'text.fontNormal and text.fontBold',
		language: 'text.language',
		languageStrict: 'text.languageStrict',
		textScale: 'layout.scale.labels',
		iconScale: 'layout.scale.icons',
		hideLabels: 'layers.labels',
	};
	const shared = {
		baseUrl: 'urls.base',
		glyphs: 'urls.glyphsPattern',
		sprite: 'urls.sprite',
		elevationTilejson: 'urls.elevation',
		terrain: 'features.terrain',
		hillshade: 'features.hillshade',
	};
	const raster = ['opacity', 'hueRotate', 'brightnessMin', 'brightnessMax', 'saturation', 'contrast'];
	return {
		osm: {
			...overlay,
			...shared,
			tiles: 'urls.osm',
			experimental: 'features.landcover and features.buildings',
			bounds: null,
		},
		satellite: {
			...Object.fromEntries(Object.entries(overlay).map(([v5, v6]) => [`osmOverlay.${v5}`, `osmOverlay.${v6}`])),
			...Object.fromEntries(raster.map((key) => [`raster${key[0].toUpperCase()}${key.slice(1)}`, `raster.${key}`])),
			...shared,
			rasterTilejson: 'urls.satellite',
			overlayTiles: 'urls.osm',
			overlay: 'osmOverlay',
			language: 'osmOverlay.text.language',
			textScale: 'osmOverlay.layout.scale.labels',
			iconScale: 'osmOverlay.layout.scale.icons',
		},
	};
}

/**
 * The v6 replacement for a v5 option name at `path` in the options of `label` (`osm` or `satellite`):
 * `null` if v6 has no replacement, `undefined` if it was never a v5 option.
 */
export function v5Hint(label: string, path: string): string | null | undefined {
	tables ??= buildTables();
	const table = label === 'osm' ? tables.osm : label === 'satellite' ? tables.satellite : undefined;
	return table && Object.hasOwn(table, path) ? table[path] : undefined;
}
