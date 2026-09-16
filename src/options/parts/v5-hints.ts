import { colorOptionsKeys } from '.';

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
		fonts: 'text.font',
		language: 'text.language',
		languageStrict: 'text.languageStrict',
		textScale: 'text.scale',
		iconScale: 'icon.scale',
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
			textScale: 'osmOverlay.text.scale',
			iconScale: 'osmOverlay.icon.scale',
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

/**
 * The replacement for an option name that only existed before 6.0.0 was released, at `path` in the
 * options of `label` — or `undefined`. Shaped like `v5Hint`, but not a v5 name, so the error does not
 * point at the v5 migration guide.
 *
 * `layout` was split into `text` (label scale, spacing, pitch alignment) and `icon`; `text.fonts` became
 * a `font` on each node of the text tree, whose `default` is simply the node's own `font`.
 */
export function preReleaseHint(label: string, path: string): string | undefined {
	const prefix = label === 'satellite' ? 'osmOverlay.' : '';
	if (label !== 'osm' && label !== 'satellite' && label !== 'omt' && label !== 'protomaps') return undefined;
	if (!path.startsWith(prefix)) return undefined;
	const at = path.slice(prefix.length);
	if (at === 'layout') {
		return `${prefix}text.scale, ${prefix}text.spacing, ${prefix}text.pitchAlignment, ${prefix}icon.scale and ${prefix}icon.spacing`;
	}
	if (at === 'text.fonts') return `${prefix}text.font, on the root or on any group or topic of ${prefix}text`;
	if (at.startsWith('text.') && at.endsWith('.default')) return `${prefix}${at.slice(0, -'default'.length)}font`;
	return undefined;
}
