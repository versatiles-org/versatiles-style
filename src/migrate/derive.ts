import { osm, satellite, guessSchema, type SchemaGuess } from '../api/index.js';
import type { SchemaName } from '../lib/index.js';
import {
	getLayerGroupMap,
	getOverlayLayerGroupMap,
	getTextGroupMap,
	type LayerGroupMap,
	SHORTBREAD_SCHEMA,
} from '../shortbread/index.js';
import { PALETTES, getPaletteColors, isDarkPalette } from '../themes/index.js';
import {
	colorOptionsKeys,
	minimizeOsmOptions,
	minimizeSatelliteOptions,
	resolveSatellite,
	DEFAULT_FONT_BOLD,
	DEFAULT_FONT_REGULAR,
	DEFAULT_LABEL_STYLES,
	TEXT_TOPICS,
	topicOf as labelStyleOf,
	type ColorsOptions,
	type TextTopic,
	type LayerGroupOptions,
	type OsmOptions,
	type Palette,
	type PitchAlignment,
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
	tileJSONs: Readonly<Record<string, TileJSONSpecification>> = {},
	fontNames?: readonly string[]
): OptionsGuess {
	const report: GuessReport = { sources: [], evidence: [], unmatched: [], warnings: [] };
	try {
		if (!style || typeof style !== 'object' || !Array.isArray(style.layers) || typeof style.sources !== 'object') {
			throw new TypeError('not a MapLibre style: expected `sources` and `layers`');
		}
		return derive(style, tileJSONs, fontNames, report);
	} catch (error) {
		report.warnings.push(`deriveOptions: ${error instanceof Error ? error.message : String(error)}`);
		return { kind: 'unknown', report };
	}
}

function derive(
	style: StyleSpecification,
	tileJSONs: Readonly<Record<string, TileJSONSpecification>>,
	fontNames: readonly string[] | undefined,
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

	const common = deriveCommon(style, readings, schemas, fontNames, report);
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
		// The standalone function, not `satellite.minimizeOptions`: those helpers are attached only by the
		// package entry, so that the browser bundle can leave them out (see `src/browser.ts`).
		guess = { kind: 'satellite', options: minimizeSatelliteOptions(options, getOverlayLayerGroupMap), report };
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
		guess = { kind: 'osm', options: minimizeOsmOptions(options), report };
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

/** The zoom a raster layer is read at to tell whether it is imagery. */
const IMAGERY_ZOOM = 12;

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
		// imagery shows the ground up close; a raster that stops early is shading for the overview
		if (layer.maxzoom !== undefined && layer.maxzoom <= IMAGERY_ZOOM) continue;
		const opacity = evaluateProperty(layer, 'paint', 'raster-opacity', IMAGERY_ZOOM, empty);
		if (typeof opacity === 'number' && opacity < 0.5) continue;

		const fills = [...readings.values()].filter((r) => r.probe.kind === 'fill');
		const covering = fills.filter((r) => (index.get(r.layers[0]) ?? -1) > i);
		if (fills.length > 0 && covering.length / fills.length >= 0.25) continue;

		const options: Record<string, number> = {};
		for (const [property, key] of Object.entries(RASTER_KEYS)) {
			if (layer.paint?.[property as keyof typeof layer.paint] === undefined) continue;
			const value = evaluateProperty(layer, 'paint', property, IMAGERY_ZOOM, empty);
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
	/** Leaves with at least one probe the style could draw: the only ones whose visibility is known. */
	const readable = new Set<string>();

	const visit = (node: LayerGroupMap, path: string[]): boolean => {
		let allHidden = true;
		for (const [key, child] of Object.entries(node)) {
			if (path.length === 0 && key === 'icons') continue; // an alias, not a group
			const childPath = [...path, key];
			if (Array.isArray(child)) {
				const probes = PROBES.filter(
					(p) => child.includes(p.id) && model.base.has(p.id) && [...tileSchemas].some((schema) => p.features[schema])
				);
				if (probes.length > 0) readable.add(childPath.join('.'));
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

	// Collapse: a branch is hidden as a whole when at least one of its leaves is hidden and every other
	// leaf is either hidden too or has no probe to tell. `labels.water.lakes` has no probe, and lake
	// names shared a group with the river probe until `labels.water` was split, so this keeps that reading.
	const collapse = (node: LayerGroupMap, path: string[]): void => {
		for (const [key, child] of Object.entries(node)) {
			if (path.length === 0 && key === 'icons') continue;
			const childPath = [...path, key];
			const name = childPath.join('.');
			const leaves = Array.isArray(child) ? [name] : leafPaths(child, childPath);
			if (
				leaves.some((leaf) => hidden.includes(leaf)) &&
				leaves.every((leaf) => hidden.includes(leaf) || !readable.has(leaf))
			) {
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
	content: { text?: TextOptions };
	features: NonNullable<OsmOptions['features']>;
	globals: Pick<OsmOptions, 'sun' | 'projection'>;
};

function deriveCommon(
	style: StyleSpecification,
	readings: ReadonlyMap<string, ProbeReading>,
	schemas: ReadonlyMap<string, SchemaName>,
	fontNames: readonly string[] | undefined,
	report: GuessReport
): Common {
	const content: Common['content'] = {};
	const scale = deriveLabelScale(readings);
	const pitchAlignment = derivePitchAlignment(readings);
	// Merged, not spread: `deriveFonts` and `deriveHalo` both return a tree of the same topics, so a
	// shallow spread would leave whichever came last as the only one heard — the fonts of every topic
	// replaced by its halo, or the other way round.
	const text: TextOptions = mergeTextTrees(
		deriveText(readings, report) ?? {},
		scale !== undefined ? { scale } : {},
		pitchAlignment !== undefined ? { pitchAlignment } : {},
		deriveFonts(readings, fontNames, report),
		deriveHalo(readings)
	);
	if (Object.keys(text).length > 0) content.text = text;

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

/** Recursively merge `text` option trees, later trees winning leaf by leaf rather than branch by branch. */
function mergeTextTrees(...trees: TextOptions[]): TextOptions {
	const isBranch = (v: unknown): v is Record<string, unknown> =>
		typeof v === 'object' && v !== null && !Array.isArray(v);
	const out: Record<string, unknown> = {};
	for (const tree of trees) {
		for (const [key, value] of Object.entries(tree)) {
			const prev = out[key];
			out[key] = isBranch(prev) && isBranch(value) ? mergeTextTrees(prev as TextOptions, value as TextOptions) : value;
		}
	}
	return out as TextOptions;
}

/**
 * Which `text` topic each of the target's label layers belongs to — the map a probe reading is turned
 * into a topic through, since a probe is named after the layer it reads.
 */
function textTopicOfLayer(): Map<string, TextTopic> {
	const topicOf = new Map<string, TextTopic>();
	const groups = getTextGroupMap();
	for (const topic of TEXT_TOPICS) {
		const [group, leaf] = topic.split('.');
		const ids = (leaf === undefined ? groups[group] : (groups[group] as LayerGroupMap)?.[leaf]) as string[] | undefined;
		for (const id of ids ?? []) topicOf.set(id, topic);
	}
	return topicOf;
}

/** Words naming a face rather than a family. */
const FACE_WORD = /_(regular|italic|oblique|medium|book|light|thin|bold|semi_?bold|demi_?bold|black|heavy|extra_?\w+)$/;

/** `Noto Sans Bold Italic` and `noto_sans_bold` are both the family `noto_sans`. */
function fontFamily(font: string): string {
	let family = font.toLowerCase().replace(/[\s-]+/g, '_');
	while (FACE_WORD.test(family)) family = family.replace(FACE_WORD, '');
	return family;
}

/** A font counts as bold when its name says so; anything lighter, Medium included, as regular. */
const BOLD_FONT = /bold|black|heavy|demi/i;

/** A font name as the glyph server spells its id: `Open Sans Bold` → `open_sans_bold`. */
function glyphId(font: string): string {
	return font
		.toLowerCase()
		.replace(/[-_\s]+/g, ' ')
		.trim()
		.replace(/ /g, '_');
}

/** The first of the most frequent keys. */
function mostVoted<T>(votes: ReadonlyMap<T, number>): T | undefined {
	let best: T | undefined;
	let most = 0;
	for (const [key, count] of votes) {
		if (count > most) [best, most] = [key, count];
	}
	return best;
}

const vote = <T>(votes: Map<T, number>, key: T) => votes.set(key, (votes.get(key) ?? 0) + 1);

/**
 * The `font` of each `text` topic, from the fonts the style sets its labels in.
 *
 * `fontNames` are the glyph names the target's glyph server publishes, from its `font_families.json`
 * (`guessOptions` fetches them). Without them only the target's own faces, Noto Sans regular and bold,
 * are known, and every other font carries over its weight alone.
 *
 * A foreign font the glyph server also publishes is carried over as it is (`Open Sans Bold` →
 * `open_sans_bold`); one of a family the server has, in a face it has not (`Noto Sans Medium`), becomes
 * that family's regular or bold. Each topic then takes, in order:
 *
 *  1. the face most of its own probes are set in;
 *  2. for a topic no probe reads (`water.lakes`, `streets.refs`, `streets.exits`), the face of a topic in
 *     the same group that the target sets in the same weight — lake names follow river names;
 *  3. the style's most used family, in the weight the style gives the topic's role — regular or bold,
 *     as the target sets the topic;
 *  4. Noto Sans in that weight, when no font of the style is on the server — the weights still carry over.
 *
 * A label layer that sets no `text-font` is not read: MapLibre would draw it in its default font, which
 * says nothing about the style's choice. Fonts neither the server nor its families have are named in a
 * warning. Every topic is spelled out; minimising drops what equals the target's own.
 */
function deriveFonts(
	readings: ReadonlyMap<string, ProbeReading>,
	fontNames: readonly string[] | undefined,
	report: GuessReport
): TextOptions {
	const known: ReadonlySet<string> = new Set([...(fontNames ?? []), DEFAULT_FONT_REGULAR, DEFAULT_FONT_BOLD]);
	const base = modelFor(osmTarget(), 'light').base;
	const topicOf = textTopicOfLayer();
	const knownFamilies = new Set([...known].map(fontFamily));
	const roleOf = (topic: TextTopic) =>
		labelStyleOf(DEFAULT_LABEL_STYLES, topic).font === DEFAULT_FONT_BOLD ? 'bold' : 'regular';

	const weights = { regular: [0, 0], bold: [0, 0] };
	const topicFaces = new Map<TextTopic, Map<string, number>>();
	const families = new Map<string, number>();
	const lost = new Set<string>();
	for (const reading of readings.values()) {
		// A layer that sets no `text-font` gets MapLibre's default, Open Sans: the style chose no font.
		if (
			(reading.label?.layer as { layout?: Record<string, unknown> } | undefined)?.layout?.['text-font'] === undefined
		) {
			continue;
		}
		const foreign = reading.textFont?.[0];
		const own = base.get(reading.probe.id)?.textFont?.[0];
		if (!foreign || !own) continue;
		const bold = BOLD_FONT.test(foreign);
		weights[own === DEFAULT_FONT_BOLD ? 'bold' : 'regular'][bold ? 1 : 0]++;

		const family = fontFamily(foreign);
		const inFamily = `${family}_${bold ? 'bold' : 'regular'}`;
		const face = known.has(glyphId(foreign))
			? glyphId(foreign)
			: knownFamilies.has(family) && known.has(inFamily)
				? inFamily
				: undefined;
		if (face === undefined) {
			lost.add(foreign);
			continue;
		}
		vote(families, fontFamily(face));
		const topic = topicOf.get(reading.probe.id);
		if (topic) vote((topicFaces.get(topic) ?? topicFaces.set(topic, new Map()).get(topic))!, face);
	}
	if (lost.size > 0) {
		const why = fontNames ? 'the glyph server does not publish' : 'unknown without the glyph server font list';
		report.warnings.push(`fonts ${why} are not carried over (${[...lost].join(', ')}); only regular or bold is`);
	}
	const read = { regular: weights.regular[0] + weights.regular[1] > 0, bold: weights.bold[0] + weights.bold[1] > 0 };
	if (!read.regular && !read.bold) return {};
	const weightOf = (role: 'regular' | 'bold') => {
		if (!read[role]) return role;
		const [regular, bold] = weights[role];
		return bold > regular ? 'bold' : 'regular';
	};
	const family = mostVoted(families);

	const tree: Record<string, Record<string, unknown>> = {};
	for (const topic of TEXT_TOPICS) {
		const role = roleOf(topic);
		const [group, leaf] = topic.split('.');
		const sibling = () => {
			if (leaf === undefined || topicFaces.has(topic)) return undefined;
			const votes = new Map<string, number>();
			for (const other of TEXT_TOPICS) {
				if (other === topic || !other.startsWith(`${group}.`) || roleOf(other) !== role) continue;
				for (const [face, count] of topicFaces.get(other) ?? []) votes.set(face, (votes.get(face) ?? 0) + count);
			}
			return mostVoted(votes);
		};
		const inFamily = family === undefined ? undefined : `${family}_${weightOf(role)}`;
		const face =
			mostVoted(topicFaces.get(topic) ?? new Map<string, number>()) ??
			sibling() ??
			(inFamily !== undefined && known.has(inFamily) ? inFamily : undefined) ??
			(read[role] ? (weightOf(role) === 'bold' ? DEFAULT_FONT_BOLD : DEFAULT_FONT_REGULAR) : undefined);
		if (face === undefined) continue;
		if (leaf === undefined) tree[group] = { font: face };
		else (tree[group] ??= {})[leaf] = { font: face };
	}
	return tree as TextOptions;
}

/** The middle value of a non-empty list, rounded to steps of 0.05 — halo widths are px, not ratios. */
function medianPx(values: readonly number[]): number {
	const sorted = [...values].sort((a, b) => a - b);
	return Math.round(sorted[Math.floor(sorted.length / 2)] * 20) / 20;
}

/**
 * The `haloWidth` and `haloBlur` of each `text` topic, from the halos the style draws.
 *
 * Both are plain pixel values that `applyText` writes straight through — unlike `scale`, nothing
 * rescales them — so they carry over as they are read. A topic takes, in order:
 *
 *  1. the median of its own probes;
 *  2. the median over the topics the *target* haloes identically, nearest first: the rest of its own
 *     group, then any topic at all. A topic no probe reads (`water.lakes`, `streets.refs`,
 *     `streets.exits`) follows its neighbours, so lake names follow river names as they do for fonts;
 *  3. nothing — the target's own default stands.
 *
 * The median, not the mean: a style that haloes most labels at 1 and one at 4 should carry the 1, and
 * halo widths cluster on a handful of values rather than spreading.
 *
 * Step 2 pools only topics that share this one's target default, which is what keeps the target's
 * deliberate exceptions intact. `streets.refs` is haloed 0.1 because it sits on a shield, `addresses`
 * not at all — filling those from a street-name reading would erase the distinction and, worse, make a
 * round trip of the target's own style derive options it did not need: no probe reads either topic, so
 * both would take the 2 read off `streets.names` and be written out as differing from a default they
 * in fact match.
 *
 * A width of 0 counts and propagates like any other — a style that draws no halo has to say so, since
 * most topics of the target default to a 2px halo. Blur is only read where a halo is actually drawn,
 * so it falls back to 0 rather than to the target's 1: blurring a halo that is not there would write a
 * property with nothing to show for it. Every topic reached is spelled out; minimising drops what
 * equals the target's own, so a style whose halos already match writes nothing.
 */
function deriveHalo(readings: ReadonlyMap<string, ProbeReading>): TextOptions {
	const topicOf = textTopicOfLayer();
	const widths = new Map<TextTopic, number[]>();
	const blurs = new Map<TextTopic, number[]>();
	for (const reading of readings.values()) {
		if (reading.textHaloWidth === undefined) continue;
		const topic = topicOf.get(reading.probe.id);
		if (!topic) continue;
		(widths.get(topic) ?? widths.set(topic, []).get(topic)!).push(reading.textHaloWidth);
		if (reading.textHaloBlur === undefined) continue;
		(blurs.get(topic) ?? blurs.set(topic, []).get(topic)!).push(reading.textHaloBlur);
	}
	if (widths.size === 0) return {};

	const targetHalo = (topic: TextTopic) => labelStyleOf(DEFAULT_LABEL_STYLES, topic).haloWidth;

	// Readings from the topics the target haloes the same way as `topic`, its own group first. The two
	// passes are separate so a neighbour always outweighs a distant topic, however many readings each has.
	const pooled = (per: Map<TextTopic, number[]>, topic: TextTopic, group: string): number | undefined => {
		const like = (other: TextTopic) => other !== topic && targetHalo(other) === targetHalo(topic);
		for (const near of [true, false]) {
			const values: number[] = [];
			for (const other of TEXT_TOPICS) {
				if (like(other) && other.startsWith(`${group}.`) === near) values.push(...(per.get(other) ?? []));
			}
			if (values.length > 0) return medianPx(values);
		}
		return undefined;
	};

	const tree: Record<string, Record<string, unknown>> = {};
	for (const topic of TEXT_TOPICS) {
		const [group, leaf] = topic.split('.');
		const own = widths.get(topic);
		const haloWidth = own?.length ? medianPx(own) : pooled(widths, topic, group);
		if (haloWidth === undefined) continue; // nothing was read that speaks for this topic
		const ownBlur = blurs.get(topic);
		// A halo of zero width shows no blur, and is stated rather than left out: most topics of the
		// target blur their halo by 1, which would otherwise survive as a `text-halo-blur` on a label
		// with no halo to blur.
		const haloBlur = haloWidth === 0 ? 0 : ownBlur?.length ? medianPx(ownBlur) : (pooled(blurs, topic, group) ?? 0);
		const style = { haloWidth, haloBlur };
		if (leaf === undefined) tree[group] = { ...tree[group], ...style };
		else (tree[group] ??= {})[leaf] = { ...((tree[group]?.[leaf] as object | undefined) ?? {}), ...style };
	}
	return tree as TextOptions;
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

/** The probes whose labels follow a line — the only labels `text.pitchAlignment` changes. */
const LINE_LABEL_PROBES = ['label-street-primary', 'label-street-residential', 'label-water-river'];

/**
 * `viewport` when most line labels stand up in a tilted map. A pitch alignment of `auto` follows the
 * rotation alignment, whose own `auto` is `map` along a line. Zoom-dependent values are not read.
 */
function derivePitchAlignment(readings: ReadonlyMap<string, ProbeReading>): PitchAlignment | undefined {
	let viewport = 0;
	let map = 0;
	for (const id of LINE_LABEL_PROBES) {
		const layout = readings.get(id)?.label?.layer.layout as Record<string, unknown> | undefined;
		if (!layout) continue;
		let alignment = layout['text-pitch-alignment'] ?? 'auto';
		if (alignment === 'auto') alignment = layout['text-rotation-alignment'] ?? 'auto';
		if (alignment === 'viewport') viewport++;
		else if (alignment === 'map' || alignment === 'auto') map++;
	}
	return viewport > map ? 'viewport' : undefined;
}

function deriveSun(light: NonNullable<StyleSpecification['light']>): SunOptions {
	const sun: Exclude<SunOptions, true> = {};
	const position = light.position;
	// `length === 3` as well as the type check: `every` is vacuously true for a shorter array, so a
	// two-element `position` passed and `90 - position[2]` came out `NaN`. `minimizeOsmOptions` cannot
	// drop it either — `JSON.stringify(NaN)` is `"null"`, which never equals the default — so the NaN
	// reached the returned options and built a style with `light.position: [1.15, 210, null]`, which
	// MapLibre rejects. `guessOptions` promises options that build, so a malformed light is one this
	// reads nothing from rather than one it mistranslates.
	if (Array.isArray(position) && position.length === 3 && position.every((v) => typeof v === 'number')) {
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
