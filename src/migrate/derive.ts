import { osm } from '../api/osm.js';
import { satellite } from '../api/satellite.js';
import { guessSchema, type SchemaGuess } from '../api/guessSchema.js';
import type { SchemaName } from '../lib/schema-signatures.js';
import { getLayerGroupMap, type LayerGroupMap } from '../shortbread/layer-groups-map.js';
import { SHORTBREAD_SCHEMA } from '../shortbread/schema.js';
import { PALETTES, getPaletteColors, isDarkPalette } from '../themes/index.js';
import {
	colorOptionsKeys,
	resolveSatellite,
	type ColorsOptions,
	type LayerGroupOptions,
	type OsmOptions,
	type Palette,
	type ResolvedColors,
	type SatelliteOptions,
	type SkyOptions,
	type SunOptions,
	type TextOptions,
} from '../options/index.js';
import type { HillshadeLayerSpecification } from '@maplibre/maplibre-gl-style-spec';
import type { StyleSpecification, TileJSONSpecification, TileJSONSpecificationVector } from '../types/index.js';
import {
	calibrate,
	FULL_EVIDENCE,
	parseRGBA,
	solveColors,
	type CalibrationModel,
	type ChannelId,
} from './calibrate.js';
import {
	evaluateProperty,
	labelText,
	NAME_MARKER,
	readProbe,
	type Channel,
	type ProbeReading,
	type RGBA,
} from './evaluate.js';
import { colorDistance, luminance, toHex } from './math.js';
import { PROBES, type Probe } from './probes.js';

/**
 * `deriveOptions` — the options for `osm()` or `satellite()` that rebuild a foreign style as closely as
 * the option surface allows.
 *
 * The pipeline, each step in its own function below:
 *
 *  1. **Sources** — which schema each vector source carries (`guessSchema`), from its TileJSON when the
 *     caller has one, or else from the source-layers the style's own layers read.
 *  2. **Readings** — what the style draws for every probe (`readProbe`).
 *  3. **Kind** — a raster layer that the vector fills do not cover makes it a satellite style.
 *  4. **Colours** — a least-squares inversion of the target builder's own calibrated colour model, then
 *     the nearest palette, with overrides only where the style clearly departs from it.
 *  5. **Everything else** — hidden layer groups, label language and size, 3D buildings, terrain,
 *     hillshade, light, sky, projection.
 *
 * Synchronous and free of I/O like `osm()`: `guessOptions` is the half that downloads.
 */

export type OptionsGuess =
	| { kind: 'osm'; options: OsmOptions; report: GuessReport }
	| { kind: 'satellite'; options: SatelliteOptions; report: GuessReport }
	| { kind: 'unknown'; report: GuessReport };

export type GuessReport = {
	/** Every vector and raster source, with the schema recognised for it. */
	sources: { id: string; type: string; guess: SchemaGuess }[];
	/** Per probe the style draws: the zoom it was read at and the layers it was read from, topmost first. */
	evidence: { probe: string; zoom: number; layers: string[] }[];
	/** Layers no probe read. Not necessarily lost — only nothing here speaks for them. */
	unmatched: string[];
	/** What could not be carried over, or was carried over with a caveat. */
	warnings: string[];
};

/** Keys whose colour covers most of the map count more when choosing a palette. */
const PALETTE_WEIGHTS: Partial<Record<keyof ColorsOptions, number>> = {
	background: 4,
	land: 4,
	water: 4,
	roadStreet: 2,
	roadStreetBg: 2,
	roadTrunk: 2,
	roadMotorway: 2,
	label: 2,
	labelHalo: 2,
};

/**
 * ΔE below which a derived colour is taken to be the palette's own. It grows with the uncertainty of
 * the key's best channel: a colour only seen through a nonlinear derivation must differ by more.
 */
const OVERRIDE_DISTANCE = 3;
const overrideDistance = (residual: number) => OVERRIDE_DISTANCE + 250 * Math.sqrt(residual);

/** Shortbread's languages, as the VersaTiles tileset carries them. */
const LANGUAGES = new Set(
	SHORTBREAD_SCHEMA.place_labels.fields.filter((f) => f.startsWith('name_')).map((f) => f.slice(5))
);

/** Probes whose label text tells the language, most telling first. */
const LANGUAGE_PROBES = [
	'label-place-city',
	'label-place-town',
	'label-place-village',
	'label-place-capital',
	'label-place-suburb',
	'label-street-primary',
];

export function deriveOptions(
	style: StyleSpecification,
	tileJSONs: Readonly<Record<string, TileJSONSpecification>> = {}
): OptionsGuess {
	const report: GuessReport = { sources: [], evidence: [], unmatched: [], warnings: [] };
	try {
		if (!style || typeof style !== 'object' || !Array.isArray(style.layers) || typeof style.sources !== 'object') {
			throw new TypeError('not a MapLibre style: expected `sources` and `layers`');
		}
		return derive(style, tileJSONs, report);
	} catch (error) {
		report.warnings.push(`deriveOptions: ${error instanceof Error ? error.message : String(error)}`);
		return { kind: 'unknown', report };
	}
}

function derive(
	style: StyleSpecification,
	tileJSONs: Readonly<Record<string, TileJSONSpecification>>,
	report: GuessReport
): OptionsGuess {
	// ── 1. sources ──
	const schemas = new Map<string, SchemaName>();
	for (const [id, source] of Object.entries(style.sources)) {
		if (source.type !== 'vector' && source.type !== 'raster') continue;
		const guess =
			source.type === 'vector' ? guessSchema(sourceTileJSON(style, id, tileJSONs[id])) : { type: 'raster' as const };
		report.sources.push({ id, type: source.type, guess });
		if (guess.type === 'vector') {
			if (guess.schema) schemas.set(id, guess.schema);
			else report.warnings.push(`source "${id}": vector tiles of no known schema; its layers are not read`);
		}
	}

	// ── 2. readings ──
	const readings = new Map<string, ProbeReading>();
	for (const probe of PROBES) {
		const reading = readInput(style, schemas, probe);
		if (reading) readings.set(probe.id, reading);
	}

	// ── 3. kind ──
	const raster = findImagery(style, readings);
	if (schemas.size === 0 && !raster) {
		report.warnings.push('no source of a known schema and no imagery: nothing to derive options from');
		return { kind: 'unknown', report };
	}

	const common = deriveCommon(style, readings, schemas, report);
	const hasOverlay = [...readings.values()].some((r) => r.probe.kind === 'line' || r.probe.kind === 'symbol');

	let guess: OptionsGuess;
	if (raster) {
		const options: SatelliteOptions = {
			raster: raster.options,
			osmOverlay: false,
			features: pick(common.features, ['terrain', 'hillshade']),
			...common.globals,
		};
		if (hasOverlay) {
			const target = satelliteTarget();
			const fitted = fitContent(target, readings, schemas, report, 'light');
			options.osmOverlay = { theme: fitted.theme, colors: fitted.colors, layers: fitted.layers, ...common.content };
		}
		const sky = deriveSky(style.sky, satellite(options).sky);
		if (sky) options.sky = sky;
		guess = { kind: 'satellite', options: satellite.minimizeOptions(options), report };
	} else {
		const target = osmTarget();
		const mode = modeOf(readings);
		const fitted = fitContent(target, readings, schemas, report, mode);
		const options: OsmOptions = {
			theme: fitted.theme,
			colors: fitted.colors,
			layers: fitted.layers,
			...common.content,
			features: common.features,
			...common.globals,
		};
		const sky = deriveSky(style.sky, osm(options).sky);
		if (sky) options.sky = sky;
		guess = { kind: 'osm', options: osm.minimizeOptions(options), report };
	}

	// ── report ──
	const used = new Set<string>(raster ? [raster.layer] : []);
	for (const reading of readings.values()) {
		report.evidence.push({ probe: reading.probe.id, zoom: reading.zoom, layers: reading.layers });
		reading.layers.forEach((id) => used.add(id));
	}
	report.unmatched = style.layers.filter((l) => !used.has(l.id)).map((l) => l.id);
	return guess;
}

// ── sources ───────────────────────────────────────────────────────────────────

/**
 * A TileJSON to recognise a source's schema by: the caller's, when it lists `vector_layers`, or else
 * one made up from the source-layers the style reads from that source. A style rarely reads every
 * layer of its tiles, but what it reads is all of one schema, which is what `guessSchema` asks.
 */
function sourceTileJSON(
	style: StyleSpecification,
	id: string,
	tileJSON: TileJSONSpecification | undefined
): TileJSONSpecification {
	const vectorLayers = (tileJSON as TileJSONSpecificationVector | undefined)?.vector_layers;
	if (Array.isArray(vectorLayers) && vectorLayers.length > 0) return tileJSON!;
	const used = new Set<string>();
	for (const layer of style.layers as { source?: string; 'source-layer'?: string }[]) {
		if (layer.source === id && layer['source-layer']) used.add(layer['source-layer']);
	}
	return {
		tilejson: '3.0.0',
		tiles: ['https://example.invalid/{z}/{x}/{y}'],
		vector_layers: [...used].map((layer) => ({ id: layer, fields: {} })),
	} as TileJSONSpecification;
}

/** A probe read at its own zoom, or the nearest zoom the style draws it at, within three levels. */
function readInput(
	style: StyleSpecification,
	schemas: ReadonlyMap<string, SchemaName>,
	probe: Probe
): ProbeReading | undefined {
	for (const offset of [0, 1, -1, 2, -2, 3, -3]) {
		const zoom = probe.zoom + offset;
		if (zoom < 0 || zoom > 22) continue;
		const reading = readProbe(style, schemas, probe, zoom);
		if (reading) return reading;
	}
	return undefined;
}

// ── kind ──────────────────────────────────────────────────────────────────────

const RASTER_KEYS = {
	'raster-opacity': 'opacity',
	'raster-hue-rotate': 'hueRotate',
	'raster-brightness-min': 'brightnessMin',
	'raster-brightness-max': 'brightnessMax',
	'raster-saturation': 'saturation',
	'raster-contrast': 'contrast',
} as const;

/**
 * The imagery layer of a satellite style: a visible raster layer that the vector fills do not cover.
 * A basemap that merely lays a translucent raster (an old hillshade, say) over its fills is not one.
 */
function findImagery(
	style: StyleSpecification,
	readings: ReadonlyMap<string, ProbeReading>
): { layer: string; options: SatelliteOptions['raster'] } | undefined {
	const layers = style.layers;
	const index = new Map(layers.map((l, i) => [l.id, i]));
	const empty = { type: 3 as const, id: 1, properties: {} };
	for (let i = 0; i < layers.length; i++) {
		const layer = layers[i];
		if (layer.type !== 'raster' || layer.layout?.visibility === 'none') continue;
		const opacity = evaluateProperty(layer, 'paint', 'raster-opacity', 12, empty);
		if (typeof opacity === 'number' && opacity < 0.5) continue;

		const fills = [...readings.values()].filter((r) => r.probe.kind === 'fill');
		const covering = fills.filter((r) => (index.get(r.layers[0]) ?? -1) > i);
		if (fills.length > 0 && covering.length / fills.length >= 0.25) continue;

		const options: Record<string, number> = {};
		for (const [property, key] of Object.entries(RASTER_KEYS)) {
			if (layer.paint?.[property as keyof typeof layer.paint] === undefined) continue;
			const value = evaluateProperty(layer, 'paint', property, 12, empty);
			if (typeof value === 'number') options[key] = value;
		}
		return { layer: layer.id, options };
	}
	return undefined;
}

// ── colours, theme and layer groups ─────────────────────────────────────────────

type Mode = 'light' | 'dark';

/** How to build styles of a target function, for calibration and for choosing a palette. */
type Target = {
	readonly name: 'osm' | 'satellite';
	readonly baseTheme: (mode: Mode) => Palette;
	readonly themes: (mode: Mode) => readonly Palette[];
	readonly colorsFor: (theme: Palette) => ResolvedColors;
	readonly build: (theme: Palette, colors: ResolvedColors) => StyleSpecification;
};

const SHORTBREAD_SOURCES: ReadonlyMap<string, SchemaName> = new Map([['versatiles-shortbread', 'shortbread']]);

function osmTarget(): Target {
	return {
		name: 'osm',
		baseTheme: (mode) => (mode === 'dark' ? 'colorful-dark' : 'colorful'),
		themes: (mode) => PALETTES.filter((p) => isDarkPalette(p) === (mode === 'dark')),
		colorsFor: getPaletteColors,
		build: (theme, colors) => osm({ theme, colors }),
	};
}

function satelliteTarget(): Target {
	return {
		name: 'satellite',
		baseTheme: () => 'gray',
		// Over imagery there is no background to tell light from dark, so every palette is a candidate.
		themes: () => PALETTES,
		colorsFor: (theme) => (resolveSatellite({ osmOverlay: { theme } }).osmOverlay as { colors: ResolvedColors }).colors,
		build: (theme, colors) => satellite({ osmOverlay: { theme, colors } }),
	};
}

const models = new Map<string, CalibrationModel>();

function modelFor(target: Target, mode: Mode): CalibrationModel {
	const theme = target.baseTheme(mode);
	const key = `${target.name}:${theme}`;
	let model = models.get(key);
	if (!model) {
		model = calibrate({
			build: (colors) => target.build(theme, colors),
			defaults: target.colorsFor(theme),
			schemas: SHORTBREAD_SOURCES,
		});
		models.set(key, model);
	}
	return model;
}

/** Dark when the style's ground is: its background, or failing that its land or water. */
function modeOf(readings: ReadonlyMap<string, ProbeReading>): Mode {
	for (const id of ['background', 'land-residential', 'water-ocean']) {
		const color = readings.get(id)?.colors.color;
		if (color) return luminance(color) < 0.2 ? 'dark' : 'light';
	}
	return 'light';
}

function fitContent(
	target: Target,
	readings: ReadonlyMap<string, ProbeReading>,
	schemas: ReadonlyMap<string, SchemaName>,
	report: GuessReport,
	mode: Mode
): { theme: Palette; colors: ColorsOptions; layers: LayerGroupOptions } {
	const model = modelFor(target, mode);

	const observed = new Map<ChannelId, RGBA>();
	for (const reading of readings.values()) {
		for (const [channel, color] of Object.entries(reading.colors) as [Channel, RGBA][]) {
			observed.set(`${reading.probe.id}/${channel}`, color);
		}
	}

	// A first solve against the base palette decides the palette; a second, pulled toward that
	// palette, gives the colours. Keys nothing was observed for then stay exactly the palette's.
	const first = solveColors(model, observed, target.colorsFor(target.baseTheme(mode)));
	const share = (key: keyof ColorsOptions) => Math.min(1, (first.evidence.get(key) ?? 0) / FULL_EVIDENCE);

	let theme = target.baseTheme(mode);
	let best = Infinity;
	for (const candidate of target.themes(mode)) {
		const palette = target.colorsFor(candidate);
		let cost = 0;
		for (const key of colorOptionsKeys) {
			const weight = share(key) * (PALETTE_WEIGHTS[key] ?? 1);
			if (weight > 0) cost += weight * colorDistance(first.colors.get(key)!, parseRGBA(palette[key]));
		}
		if (cost < best) [best, theme] = [cost, candidate];
	}

	const palette = target.colorsFor(theme);
	const solved = solveColors(model, observed, palette);
	const colors: ColorsOptions = {};
	for (const key of colorOptionsKeys) {
		if ((solved.evidence.get(key) ?? 0) < FULL_EVIDENCE / 4) continue;
		const estimate = solved.colors.get(key)!;
		const distance = colorDistance(estimate, parseRGBA(palette[key]));
		if (distance > overrideDistance(solved.residual.get(key)!)) colors[key] = toHex(estimate);
	}

	return { theme, colors, layers: hiddenGroups(model, readings, schemas, report) };
}

/**
 * Layer groups the style does not draw: every probe of the group that the tiles can carry and the
 * target draws by default goes unread. A group with no such probe is left alone — silence about a
 * group is not evidence that the style hides it.
 */
function hiddenGroups(
	model: CalibrationModel,
	readings: ReadonlyMap<string, ProbeReading>,
	schemas: ReadonlyMap<string, SchemaName>,
	report: GuessReport
): LayerGroupOptions {
	const tileSchemas = new Set(schemas.values());
	const layers: Record<string, unknown> = {};
	const hidden: string[] = [];

	const visit = (node: LayerGroupMap, path: string[]): boolean => {
		let allHidden = true;
		for (const [key, child] of Object.entries(node)) {
			if (path.length === 0 && key === 'icons') continue; // an alias, not a group
			const childPath = [...path, key];
			if (Array.isArray(child)) {
				const probes = PROBES.filter(
					(p) => child.includes(p.id) && model.base.has(p.id) && [...tileSchemas].some((schema) => p.features[schema])
				);
				const isHidden = probes.length > 0 && probes.every((p) => !readings.has(p.id));
				if (isHidden) hidden.push(childPath.join('.'));
				else allHidden = false;
			} else if (!visit(child, childPath)) {
				allHidden = false;
			}
		}
		return allHidden;
	};
	visit(getLayerGroupMap(), []);

	// Collapse: a branch whose every leaf is hidden is hidden as a whole.
	const collapse = (node: LayerGroupMap, path: string[]): void => {
		for (const [key, child] of Object.entries(node)) {
			if (path.length === 0 && key === 'icons') continue;
			const childPath = [...path, key];
			const name = childPath.join('.');
			const leaves = Array.isArray(child) ? [name] : leafPaths(child, childPath);
			if (leaves.every((leaf) => hidden.includes(leaf))) {
				setPath(layers, childPath, false);
			} else if (!Array.isArray(child)) {
				collapse(child, childPath);
			}
		}
	};
	collapse(getLayerGroupMap(), []);

	if (hidden.length > 0 && tileSchemas.size === 0) report.warnings.push('layer groups could not be read');
	return layers as LayerGroupOptions;
}

function leafPaths(node: LayerGroupMap, path: string[]): string[] {
	return Object.entries(node).flatMap(([key, child]) =>
		Array.isArray(child) ? [[...path, key].join('.')] : leafPaths(child, [...path, key])
	);
}

function setPath(target: Record<string, unknown>, path: string[], value: unknown): void {
	let node = target;
	for (const key of path.slice(0, -1)) node = (node[key] ??= {}) as Record<string, unknown>;
	node[path.at(-1)!] = value;
}

// ── text, layout, features and globals ─────────────────────────────────────────

type Common = {
	content: { text?: TextOptions; layout?: OsmOptions['layout'] };
	features: NonNullable<OsmOptions['features']>;
	globals: Pick<OsmOptions, 'sun' | 'projection'>;
};

function deriveCommon(
	style: StyleSpecification,
	readings: ReadonlyMap<string, ProbeReading>,
	schemas: ReadonlyMap<string, SchemaName>,
	report: GuessReport
): Common {
	const content: Common['content'] = {};
	const text = deriveText(readings, report);
	if (text) content.text = text;
	const scale = deriveLabelScale(readings);
	if (scale !== undefined) content.layout = { scale: { labels: scale } };

	const features: Common['features'] = {};
	if (readings.get('building')?.extruded) features.buildings = 'extruded';
	if (style.terrain) {
		const exaggeration = style.terrain.exaggeration;
		features.terrain = typeof exaggeration === 'number' && exaggeration !== 1 ? { exaggeration } : true;
	}
	const hillshade = style.layers.find(
		(l): l is HillshadeLayerSpecification => l.type === 'hillshade' && l.layout?.visibility !== 'none'
	);
	if (hillshade) {
		const exaggeration = hillshade.paint?.['hillshade-exaggeration'];
		features.hillshade = typeof exaggeration === 'number' ? { exaggeration } : true;
	}

	const globals: Common['globals'] = {};
	const projection = style.projection?.type;
	if (projection === undefined) globals.projection = 'mercator';
	else if (projection === 'globe' || projection === 'mercator' || projection === 'vertical-perspective') {
		globals.projection = projection;
	} else report.warnings.push(`projection ${JSON.stringify(projection)} is not supported; using the default`);

	if (style.light) globals.sun = deriveSun(style.light);

	const fonts = new Set<string>();
	for (const reading of readings.values()) reading.textFont?.forEach((font) => fonts.add(font));
	const foreign = [...fonts].filter((font) => !/^noto_sans_/.test(font));
	if (foreign.length > 0) {
		report.warnings.push(`fonts are not carried over (${foreign.join(', ')}); VersaTiles glyphs are used`);
	}
	if (style.sprite) report.warnings.push('icons are not carried over; the VersaTiles sprite is used');
	if (schemas.size > 1) report.warnings.push('more than one vector source: all were read as one map');
	return { content, features, globals };
}

/** The language labels are shown in: the first `name…` field a place label reads. */
function deriveText(readings: ReadonlyMap<string, ProbeReading>, report: GuessReport): TextOptions | undefined {
	for (const id of LANGUAGE_PROBES) {
		const reading = readings.get(id);
		if (!reading?.label) continue;
		const { layer, feature } = reading.label;
		const shown = labelText(layer, reading.zoom, reading.probe, feature);
		const field = new RegExp(NAME_MARKER + '(name[\\w:-]*)').exec(shown)?.[1];
		if (!field) continue;

		const language = /^name[_:]([a-z]{2,3})$/.exec(field)?.[1];
		if (!language) return undefined; // `name`, or a transliteration such as `name:latin`
		if (!LANGUAGES.has(language)) {
			report.warnings.push(`labels in "${language}" are not available in VersaTiles tiles; local names are used`);
			return undefined;
		}
		// Strict when hiding the language — in either spelling, which OpenMapTiles both carries — leaves no name.
		const fallback = labelText(
			layer,
			reading.zoom,
			reading.probe,
			feature,
			new Set([`name_${language}`, `name:${language}`])
		);
		return { language, ...(!fallback.includes(NAME_MARKER) && { languageStrict: true }) };
	}
	return undefined;
}

/** The label size relative to the target's: the median ratio over every label read, in steps of 0.05. */
function deriveLabelScale(readings: ReadonlyMap<string, ProbeReading>): number | undefined {
	const base = modelFor(osmTarget(), 'light').base;
	const ratios: number[] = [];
	for (const reading of readings.values()) {
		const own = base.get(reading.probe.id);
		if (reading.textSize && own?.textSize && reading.zoom === own.zoom) ratios.push(reading.textSize / own.textSize);
	}
	if (ratios.length === 0) return undefined;
	ratios.sort((a, b) => a - b);
	const median = ratios[Math.floor(ratios.length / 2)];
	const scale = Math.round(median * 20) / 20;
	return Math.abs(scale - 1) >= 0.1 ? scale : undefined;
}

function deriveSun(light: NonNullable<StyleSpecification['light']>): SunOptions {
	const sun: Exclude<SunOptions, true> = {};
	const position = light.position;
	if (Array.isArray(position) && position.every((v) => typeof v === 'number')) {
		sun.direction = position[1] as number;
		sun.altitude = 90 - (position[2] as number);
	}
	if (light.anchor === 'map' || light.anchor === 'viewport') sun.anchor = light.anchor;
	if (typeof light.color === 'string') sun.color = light.color;
	if (typeof light.intensity === 'number') sun.intensity = light.intensity;
	return sun;
}

const SKY_KEYS = {
	'sky-color': 'skyColor',
	'horizon-color': 'horizonColor',
	'fog-color': 'fogColor',
	'sky-horizon-blend': 'skyHorizonBlend',
	'horizon-fog-blend': 'horizonFogBlend',
	'fog-ground-blend': 'fogGroundBlend',
	'atmosphere-blend': 'atmosphereBlend',
} as const;

/**
 * The sky values that differ from what the target builds anyway. `osm()` derives its sky from the
 * palette, so copying every value would pin a sky that no longer follows the colours.
 */
function deriveSky(
	sky: StyleSpecification['sky'] | undefined,
	built: StyleSpecification['sky'] | undefined
): SkyOptions | undefined {
	if (!sky) return undefined;
	const out: Record<string, unknown> = {};
	for (const [property, key] of Object.entries(SKY_KEYS)) {
		const value = (sky as Record<string, unknown>)[property];
		const own = (built as Record<string, unknown> | undefined)?.[property];
		if (value !== undefined && !sameValue(value, own)) out[key] = value;
	}
	return Object.keys(out).length > 0 ? (out as SkyOptions) : undefined;
}

/** Equal, or two colours no one could tell apart. */
function sameValue(a: unknown, b: unknown): boolean {
	if (JSON.stringify(a) === JSON.stringify(b)) return true;
	if (typeof a !== 'string' || typeof b !== 'string') return false;
	try {
		return colorDistance(parseRGBA(a), parseRGBA(b)) <= OVERRIDE_DISTANCE;
	} catch {
		return false;
	}
}

function pick<T extends object, K extends keyof T>(object: T, keys: K[]): Pick<T, K> {
	return Object.fromEntries(keys.filter((key) => object[key] !== undefined).map((key) => [key, object[key]])) as Pick<
		T,
		K
	>;
}
