/**
 * Extract an area-colour palette from an OpenMapTiles-schema MapLibre style.
 *
 *   npm run extract-palette                       # osm-bright: comparison table + paste-ready object
 *   npm run extract-palette -- positron           # another known OMT style, by name
 *   npm run extract-palette -- https://…/style.json
 *   npm run extract-palette -- osm-bright --json  # just the object, for piping into a file
 *   npm run extract-palette -- osm-bright --palette gray --dark
 *
 * The output is a `ColorsOptions` object, which is all you need to try a foreign palette:
 *
 *     osm({ colors: JSON.parse(readFileSync('palette.json', 'utf8')) })
 *
 * ── Why this needs a script rather than copy/paste ────────────────────────────
 *
 * Three things make reading the colours off a style by eye unreliable:
 *
 *  1. `fill-color` and `fill-opacity` are separate properties. OSM Bright's `landcover-wood` is
 *     `#6a4` at `fill-opacity: 0.1`; taken alone the colour reads as solid green and compares to
 *     our `#66AA4420` at ΔE 59, when the two are in fact the same wash (ΔE 1.8). Every extracted
 *     colour therefore has its layer's opacity folded into its alpha.
 *  2. Either property may be a `{ stops }` ramp instead of a constant (buildings, glacier).
 *  3. OMT styles use two filter dialects — legacy (`["==","class","wood"]`) and expression
 *     (`["==",["get","class"],"wood"]`) — sometimes within one style, so the class a layer draws
 *     cannot be found by string matching alone.
 *
 * ── Scope: area colours only ──────────────────────────────────────────────────
 *
 * Fills (landcover, landuse, water, buildings) map onto our colour keys one-for-one. Roads and
 * labels do not: OMT styles spread a single road class across casing/fill/bridge/tunnel/z-level
 * layers with per-zoom colour ramps, so there is no honest 1:1 reading. Those keys are reported as
 * uncovered rather than guessed at.
 */
import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, existsSync } from 'node:fs';
import { Color } from '../src/color/index.js';
import { osm } from '../src/index.js';
import { colorOptionsKeys, type ColorsOptions } from '../src/options/colors.js';
import type { Palette } from '../src/options/theme.js';

type ColorKey = keyof ColorsOptions;

const ROOT = resolve(fileURLToPath(import.meta.url), '../..') + sep;

/** Styles worth mining, so the common cases are a word rather than a URL. */
const KNOWN: Record<string, string> = {
	'osm-bright': 'https://raw.githubusercontent.com/openmaptiles/osm-bright-gl-style/master/style.json',
	positron: 'https://raw.githubusercontent.com/openmaptiles/positron-gl-style/master/style.json',
	'dark-matter': 'https://raw.githubusercontent.com/openmaptiles/dark-matter-gl-style/master/style.json',
	'maptiler-basic': 'https://raw.githubusercontent.com/openmaptiles/maptiler-basic-gl-style/master/style.json',
	'maptiler-terrain': 'https://raw.githubusercontent.com/openmaptiles/maptiler-terrain-gl-style/master/style.json',
};

/**
 * Which OMT source-layer + `class`/`subclass` value carries each of our colours.
 *
 * Keyed on the layer's *filter*, not its id: ids differ between styles for the same thing
 * (`landcover-sand` vs `landcover_sand`), while the source-layer and class value are the schema
 * and so are stable. Rules are tried in order and the first match for a key wins.
 *
 * `field: undefined` matches a layer with no class filter at all (`park`, `building`, `water`).
 */
type Rule = { layer: string; field?: 'class' | 'subclass'; values?: string[]; key: ColorKey };

const RULES: Rule[] = [
	{ layer: '', key: 'background' }, // the background layer has no source-layer

	// Natural land cover.
	{ layer: 'landcover', field: 'class', values: ['wood', 'forest'], key: 'natureWood' },
	{ layer: 'landcover', field: 'class', values: ['grass', 'grassland', 'meadow'], key: 'natureGrass' },
	{ layer: 'landcover', field: 'class', values: ['sand'], key: 'natureSand' },
	{ layer: 'landcover', field: 'class', values: ['rock', 'bare_rock', 'scree'], key: 'natureRock' },
	{ layer: 'landcover', field: 'class', values: ['wetland', 'swamp', 'marsh', 'bog'], key: 'natureWetland' },
	{ layer: 'landcover', field: 'class', values: ['farmland', 'agriculture'], key: 'natureAgriculture' },
	{ layer: 'landcover', field: 'subclass', values: ['glacier', 'ice_shelf'], key: 'glacier' },
	{ layer: 'landuse', field: 'class', values: ['farmland', 'agriculture'], key: 'natureAgriculture' },

	// Parks and managed green. OMT puts public parks in their own `park` source-layer, usually
	// unfiltered; some styles instead filter `landcover class=public_park`.
	{ layer: 'park', field: 'class', values: ['public_park', 'park', 'national_park'], key: 'naturePark' },
	{ layer: 'park', key: 'naturePark' },
	{ layer: 'landuse', field: 'class', values: ['park', 'village_green', 'recreation_ground'], key: 'naturePark' },

	// Urban land use.
	{
		layer: 'landuse',
		field: 'class',
		values: ['residential', 'suburb', 'neighbourhood'],
		key: 'areaResidential',
	},
	{ layer: 'landuse', field: 'class', values: ['commercial', 'retail'], key: 'areaCommercial' },
	{ layer: 'landuse', field: 'class', values: ['industrial', 'garages', 'quarry', 'railway'], key: 'areaIndustrial' },
	{ layer: 'landuse', field: 'class', values: ['landfill'], key: 'areaWaste' },
	{ layer: 'landuse', field: 'class', values: ['cemetery', 'grave_yard'], key: 'areaBurial' },

	// Sites.
	{ layer: 'landuse', field: 'class', values: ['hospital'], key: 'siteHospital' },
	{
		layer: 'landuse',
		field: 'class',
		values: ['school', 'university', 'college', 'kindergarten'],
		key: 'siteEducation',
	},
	{ layer: 'landuse', field: 'class', values: ['stadium', 'pitch', 'track'], key: 'siteSports' },
	{ layer: 'landuse', field: 'class', values: ['construction'], key: 'siteConstruction' },

	{ layer: 'water', key: 'water' },
	{ layer: 'building', key: 'building' }, // see pickBuilding()
];

// ── Reading a style ────────────────────────────────────────────────────────────

type StyleLayer = {
	id: string;
	type: string;
	'source-layer'?: string;
	filter?: unknown;
	paint?: Record<string, unknown>;
};

/** Take the last stop of a `{ stops }` ramp, or the value itself. Ramps are the high-zoom end. */
function flatten(value: unknown): unknown {
	if (value && typeof value === 'object' && 'stops' in value) {
		const stops = (value as { stops: [number, unknown][] }).stops;
		return stops.at(-1)?.[1];
	}
	return value;
}

/**
 * Every `class`/`subclass` value a filter tests for, across both dialects.
 *
 * Legacy filters name the field as a bare string (`["==", "class", "wood"]`); expression filters
 * wrap it (`["==", ["get", "class"], "wood"]`). `in` takes either a value list or a `["literal", […]]`.
 */
function filterValues(filter: unknown, into = new Map<string, Set<string>>()): Map<string, Set<string>> {
	if (!Array.isArray(filter)) return into;
	const [op, ...rest] = filter as unknown[];

	if (op === 'all' || op === 'any' || op === '!') {
		for (const sub of rest) filterValues(sub, into);
		return into;
	}

	if (op === '==' || op === 'in') {
		const field = typeof rest[0] === 'string' ? rest[0] : fieldOf(rest[0]);
		if (field === 'class' || field === 'subclass') {
			const raw = rest.slice(1).flatMap((v) => (Array.isArray(v) && v[0] === 'literal' ? (v[1] as string[]) : [v]));
			const set = into.get(field) ?? new Set<string>();
			for (const v of raw) if (typeof v === 'string') set.add(v);
			into.set(field, set);
		}
	}
	return into;
}

/** `["get", "class"]` → `"class"`. */
function fieldOf(node: unknown): string | undefined {
	return Array.isArray(node) && node[0] === 'get' && typeof node[1] === 'string' ? node[1] : undefined;
}

/** The layer's paint colour with its own opacity folded into the alpha — see the header note. */
function effectiveColor(layer: StyleLayer): Color | undefined {
	const raw = flatten(layer.paint?.['fill-color'] ?? layer.paint?.['background-color']);
	if (typeof raw !== 'string') return undefined;
	const opacity = flatten(layer.paint?.['fill-opacity'] ?? layer.paint?.['background-opacity']);
	const alpha = typeof opacity === 'number' ? opacity : 1;
	try {
		return Color.parse(raw).fade(1 - alpha);
	} catch {
		return undefined; // a data-driven or otherwise unreadable colour; the report lists it as missing
	}
}

function matches(layer: StyleLayer, rule: Rule): boolean {
	if ((layer['source-layer'] ?? '') !== rule.layer) return false;
	if (!rule.field) return filterValues(layer.filter).size === 0;
	const values = filterValues(layer.filter).get(rule.field);
	return values !== undefined && rule.values!.some((v) => values.has(v));
}

/**
 * Of several layers matching one key, the one that best represents it.
 *
 * Two things produce duplicates. A style may draw a feature once properly and again for effect —
 * OSM Bright has `water` alongside `water-offset` (a displaced shadow) and `water-pattern` — and
 * the plain rendering is conventionally the layer named after its source-layer. Separately, a rule
 * may list several classes that we merge into one colour (`industrial`, `quarry`, `railway`), and
 * there the canonical one is whichever the rule lists first.
 */
function preferred(matched: { layer: StyleLayer; rule: Rule }[]): StyleLayer {
	const plain = matched.find(({ layer }) => layer.id === layer['source-layer']);
	if (plain) return plain.layer;
	for (const value of matched[0].rule.values ?? []) {
		const hit = matched.find(({ layer, rule }) => rule.field && filterValues(layer.filter).get(rule.field)?.has(value));
		if (hit) return hit.layer;
	}
	return matched[0].layer;
}

/**
 * OMT styles draw buildings as a base plus a lighter roof (`building` / `building-top`, or one
 * layer with a zoom ramp). Our two keys are the same split, so the roof — when there is one —
 * is `building` and the base is `buildingBg`.
 */
function pickBuilding(candidates: StyleLayer[]): { building?: Color; buildingBg?: Color } {
	const top = candidates.find((l) => /top|roof/.test(l.id));
	const base = candidates.find((l) => l !== top);
	return { building: effectiveColor(top ?? base ?? ({} as StyleLayer)), buildingBg: base && effectiveColor(base) };
}

// ── Comparison ─────────────────────────────────────────────────────────────────

/** Composite a possibly-translucent colour over the map background — both palettes use alpha. */
function overBackground(color: Color, background: Color): [number, number, number] {
	const c = color.asRGB();
	const b = background.asRGB();
	const a = c.a ?? 1;
	return [c.r * a + b.r * (1 - a), c.g * a + b.g * (1 - a), c.b * a + b.b * (1 - a)];
}

/** CIE76 ΔE. ~2.3 is a just-noticeable difference on large flat areas such as these fills. */
function deltaE(a: [number, number, number], b: [number, number, number]): number {
	const lab = ([r, g, bl]: [number, number, number]): [number, number, number] => {
		const lin = (v: number) => (v / 255 <= 0.04045 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4);
		const [R, G, B] = [lin(r), lin(g), lin(bl)];
		const k = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
		const [X, Y, Z] = [
			k((0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047),
			k(0.2126 * R + 0.7152 * G + 0.0722 * B),
			k((0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883),
		];
		return [116 * Y - 16, 500 * (X - Y), 200 * (Y - Z)];
	};
	const [A, B] = [lab(a), lab(b)];
	return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]);
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function loadStyle(source: string): Promise<{ label: string; style: { layers: StyleLayer[] } }> {
	const url = KNOWN[source] ?? source;
	if (!/^https?:/.test(url)) {
		const file = resolve(ROOT, url);
		if (!existsSync(file)) throw new Error(`No such style: ${source}`);
		return { label: url.replace(ROOT, ''), style: JSON.parse(readFileSync(file, 'utf8')) };
	}
	const response = await fetch(url);
	if (!response.ok) throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
	return { label: source in KNOWN ? source : url, style: await response.json() };
}

async function main(): Promise<void> {
	// `npm run … -- positron` strips the separator, `npx tsx … -- positron` does not; skip a bare one.
	const args = process.argv.slice(2).filter((a) => a !== '--');
	const VALUE_FLAGS = new Set(['palette']);
	const flags = new Map<string, string | true>();
	const positional: string[] = [];
	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (!arg.startsWith('--')) {
			positional.push(arg);
			continue;
		}
		const name = arg.slice(2);
		flags.set(name, VALUE_FLAGS.has(name) ? (args[++i] ?? '') : true);
	}
	const source = positional[0] ?? 'osm-bright';

	const { label, style } = await loadStyle(source);
	const areas = style.layers.filter((l) => l.type === 'fill' || l.type === 'background');

	// Collect every candidate per key, so genuine ambiguity can be reported rather than hidden.
	const candidates = new Map<ColorKey, { layer: StyleLayer; rule: Rule }[]>();
	for (const rule of RULES) {
		for (const layer of areas) {
			if (!matches(layer, rule)) continue;
			candidates.set(rule.key, [...(candidates.get(rule.key) ?? []), { layer, rule }]);
		}
	}

	const extracted: Partial<Record<ColorKey, string>> = {};
	const ambiguous: string[] = [];
	for (const [key, layers] of candidates) {
		if (key === 'building') continue; // handled below
		const readable = layers.filter(({ layer }) => effectiveColor(layer) !== undefined);
		if (readable.length === 0) continue;
		const chosen = preferred(readable);
		extracted[key] = effectiveColor(chosen)!.asHex();
		if (new Set(readable.map(({ layer }) => effectiveColor(layer)!.asHex())).size > 1) {
			const others = readable.filter(({ layer }) => layer !== chosen).map(({ layer }) => layer.id);
			ambiguous.push(`${key}: took ${chosen.id}, ignored ${others.join(', ')}`);
		}
	}
	const buildings = pickBuilding((candidates.get('building') ?? []).map(({ layer }) => layer));
	if (buildings.building) extracted.building = buildings.building.asHex();
	if (buildings.buildingBg) extracted.buildingBg = buildings.buildingBg.asHex();

	if (flags.has('json')) {
		console.log(JSON.stringify(extracted, null, 2));
		return;
	}

	// Compare against what we ship, so the report says what would actually change.
	const palette = (flags.get('palette') ?? 'colorful') as Palette;
	const current = osm.colors(palette, flags.has('dark')) as Record<string, string>;
	const background = Color.parse(current.background);

	console.log(`Palette extracted from ${label} — compared with \`${palette}${flags.has('dark') ? ' dark' : ''}\`.`);
	console.log(`ΔE is measured on the colours as seen, i.e. composited over the map background.\n`);
	console.log(`${'key'.padEnd(20)} ${'extracted'.padEnd(12)} ${'ours'.padEnd(12)} ΔE`);
	for (const key of colorOptionsKeys) {
		const hex = extracted[key];
		if (!hex) continue;
		const ours = current[key];
		const d = deltaE(overBackground(Color.parse(hex), background), overBackground(Color.parse(ours), background));
		console.log(`${key.padEnd(20)} ${hex.padEnd(12)} ${ours.padEnd(12)} ${d.toFixed(1)}`);
	}

	if (ambiguous.length) {
		console.log(`\nSeveral layers matched one key:`);
		for (const line of ambiguous) console.log(`  ${line}`);
	}

	const missing = colorOptionsKeys.filter((k) => !(k in extracted));
	console.log(`\nNot covered by this style (${missing.length} of ${colorOptionsKeys.length}) — roads and labels`);
	console.log(`have no 1:1 equivalent in an OMT style, see the note at the top of this file:`);
	console.log(`  ${missing.join(', ')}`);

	console.log(`\nPaste into \`osm({ colors: … })\`:`);
	console.log(JSON.stringify(extracted, null, 2));
}

await main();
