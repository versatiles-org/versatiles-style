import { osm, satellite, guessSchema, type SchemaGuess } from '../api/index.js';
import type { SchemaName } from '../lib/index.js';
import { EXTRUSION_OPACITY } from '../cartography/index.js';
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
	type IconOptions,
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
	type DiscardedColor,
	type ProbeReading,
	type RGBA,
} from './evaluate.js';
import { PADDING_PER_SPACING } from '../lib/index.js';
import { colorDistance, luminance, toHex } from './math.js';
import { PROBES, type Probe } from './probes.js';
import { diagnostic, sortDiagnostics, type Diagnostic } from './diagnostics.js';
import type { Provenance, ProvenanceMap } from './provenance.js';

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
	/**
	 * What could not be carried over, could only be guessed at, or had to be chosen between.
	 *
	 * Replaces the `warnings: string[]` and `unmatched: string[]` this used to carry: a string can only
	 * be printed, where a consumer wants to group, count, suppress, translate, and put a marker beside
	 * the setting a diagnostic concerns. Sorted (see `sortDiagnostics`), so a test diff is stable.
	 */
	diagnostics: Diagnostic[];
	/**
	 * Where each derived option came from, keyed by option path.
	 *
	 * Records the thing the options cannot: `minimizeOptions` deletes a derived value that equals the
	 * target's default, so a setting read from the style and one never derived both come out absent.
	 * See `PROVENANCE_COVERS` for which options are annotated.
	 */
	provenance: ProvenanceMap;
	/** Every vector and raster source, with the schema recognised for it. */
	sources: { id: string; type: string; guess: SchemaGuess }[];
	/** Per probe the style draws: the zoom it was read at and the layers it was read from, topmost first. */
	evidence: { probe: string; zoom: number; layers: string[] }[];
};

/**
 * A report under construction.
 *
 * Filled as the pipeline learns things, never assembled at the end — which is not a style preference
 * but the fix for a class of bug: `evidence` and `unmatched` used to be written in a final block that
 * the `kind: 'unknown'` path returned before reaching, so a style that failed late reported nothing
 * about the probes it had already read. Anything that is true at the moment it is learned is recorded
 * then, and `finish` only orders what has accumulated.
 */
type ReportBuilder = Omit<GuessReport, 'provenance'> & {
	/** Input layer ids something has already read, so the rest can be reported as unread. */
	used: Set<string>;
	provenance: Record<string, Provenance>;
	say: (diagnostic: Diagnostic) => void;
	/** Record where one option came from. Later calls win, so a derivation may refine its own note. */
	note: (optionPath: string, provenance: Provenance) => void;
};

function newReport(): ReportBuilder {
	const report: ReportBuilder = {
		diagnostics: [],
		provenance: {},
		sources: [],
		evidence: [],
		used: new Set(),
		say: (diagnostic) => void report.diagnostics.push(diagnostic),
		note: (optionPath, provenance) => void (report.provenance[optionPath] = provenance),
	};
	return report;
}

/** Close a report: note the layers nothing read, drop the scratch fields, and order the diagnostics. */
function finish(builder: ReportBuilder, style?: StyleSpecification): GuessReport {
	const unread = (style?.layers ?? []).map((l) => l.id).filter((id) => !builder.used.has(id));
	if (unread.length > 0) {
		builder.say(
			diagnostic(
				'layer.unread',
				`${unread.length} layers of the style were not read`,
				{ count: unread.length },
				{ origin: { layers: unread } }
			)
		);
	}
	const { used: _used, say: _say, note: _note, ...report } = builder;
	void _used;
	void _say;
	void _note;
	// Sorted so a report reads and diffs the same way whichever derivation happened to run first.
	const provenance = Object.fromEntries(Object.entries(report.provenance).sort(([a], [b]) => a.localeCompare(b)));
	return { ...report, provenance, diagnostics: sortDiagnostics(report.diagnostics) };
}

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

/**
 * How close the runner-up palette has to sit, as a fraction of the winner's cost, before the choice
 * between them is worth reporting as a near-tie.
 *
 * 5%: OpenFreeMap's Liberty picks `colorful` at 1153.6 over `natural` at 1185.3 — 2.7% apart, which
 * is well inside what the palette-fitting can tell apart, and a choice a person might reasonably make
 * differently. A style built by these very builders scores its own palette far below the rest.
 */
const THEME_MARGIN = 0.05;

/**
 * How far apart the icon ratios have to spread before one multiplier is worth reporting as a
 * compromise. 15%: below that the probes broadly agree and the mean represents them.
 */
const ICON_SPREAD = 0.15;

/** Numbers that only exist to be read in a report, at a length a person can read. */
const round2 = (value: number) => Math.round(value * 100) / 100;

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
	const report = newReport();
	if (!style || typeof style !== 'object' || !Array.isArray(style.layers) || typeof style.sources !== 'object') {
		report.say(
			diagnostic('input.notAStyle', 'not a MapLibre style: expected `sources` and `layers`', {
				received: style === null ? 'null' : Array.isArray(style) ? 'array' : typeof style,
			})
		);
		return { kind: 'unknown', report: finish(report) };
	}
	try {
		return derive(style, tileJSONs, fontNames, report);
	} catch (error) {
		const cause = error instanceof Error ? error.message : String(error);
		report.say(diagnostic('input.unreadable', `the style could not be read: ${cause}`, { cause }));
		// Whatever was learned before the throw is still worth reporting, so the report is closed the
		// same way the successful paths close it.
		return { kind: 'unknown', report: finish(report, style) };
	}
}

function derive(
	style: StyleSpecification,
	tileJSONs: Readonly<Record<string, TileJSONSpecification>>,
	fontNames: readonly string[] | undefined,
	report: ReportBuilder
): OptionsGuess {
	// ── 1. sources ──
	const schemas = new Map<string, SchemaName>();
	let vectorSources = 0;
	for (const [id, source] of Object.entries(style.sources)) {
		if (source.type !== 'vector' && source.type !== 'raster') continue;
		const guess =
			source.type === 'vector' ? guessSchema(sourceTileJSON(style, id, tileJSONs[id])) : { type: 'raster' as const };
		report.sources.push({ id, type: source.type, guess });
		if (guess.type === 'vector') {
			vectorSources++;
			if (guess.schema) schemas.set(id, guess.schema);
			else {
				report.say(
					diagnostic(
						'source.schemaUnknown',
						`source "${id}" carries vector tiles of no known schema; its layers are not read`,
						{ sourceId: id },
						{ origin: { sourceId: id } }
					)
				);
			}
		}
	}

	// ── 2. readings ──
	const readings = new Map<string, ProbeReading>();
	for (const probe of PROBES) {
		const reading = readInput(style, schemas, probe);
		if (!reading) continue;
		readings.set(probe.id, reading);
		// Recorded here rather than in a final block, so a later failure still reports what was read.
		report.evidence.push({ probe: probe.id, zoom: reading.zoom, layers: reading.layers });
		reading.layers.forEach((id) => report.used.add(id));
	}

	// ── 3. kind ──
	const raster = findImagery(style, readings);
	if (raster) report.used.add(raster.layer);
	if (schemas.size === 0 && !raster) {
		report.say(
			diagnostic('schema.none', 'no source of a known schema and no imagery: nothing to derive options from', {
				vectorSources,
			})
		);
		return { kind: 'unknown', report: finish(report, style) };
	}
	// Some of the style was read and some was not, which the result alone cannot say: a style whose only
	// vector source is unreadable still comes back as a perfectly ordinary `satellite` guess.
	if (schemas.size === 0 && vectorSources > 0) {
		report.say(
			diagnostic(
				'schema.partial',
				`no vector source could be read (${vectorSources} of unknown schema); only the imagery was carried over`,
				{ vectorSources }
			)
		);
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
			layers: withExtrusionOpacity(fitted.layers, readings, common.features),
			...common.content,
			features: common.features,
			...common.globals,
		};
		const sky = deriveSky(style.sky, osm(options).sky);
		if (sky) options.sky = sky;
		guess = { kind: 'osm', options: minimizeOsmOptions(options), report };
	}

	return { ...guess, report: finish(report, style) } as OptionsGuess;
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
	report: ReportBuilder,
	mode: Mode
): { theme: Palette; colors: ColorsOptions; layers: LayerGroupOptions } {
	const model = modelFor(target, mode);

	const observed = new Map<ChannelId, RGBA>();
	for (const reading of readings.values()) {
		for (const [channel, color] of Object.entries(reading.colors) as [Channel, RGBA][]) {
			observed.set(`${reading.probe.id}/${channel}`, color);
		}
	}

	// Colours the source gave features the target cannot tell apart. Reported separately from the
	// z-order contest below: nothing here overpainted anything, the source would draw every one of
	// these, and the target has a single setting for the lot.
	for (const reading of readings.values()) {
		if (!reading.collapsed?.length) continue;
		const kept = reading.colors.text ?? reading.colors.color;
		if (!kept) continue;
		const differing = reading.collapsed.filter((c) => colorDistance(c.color, kept) > OVERRIDE_DISTANCE);
		if (differing.length === 0) continue;
		const channel: Channel = reading.colors.text ? 'text' : 'color';
		const key = model.channels.get(`${reading.probe.id}/${channel}`)?.keys[0];
		if (key === undefined) continue;
		report.say(
			diagnostic(
				'color.collapsed',
				`the style colours ${differing.length} feature kinds differently that the target draws as one (${differing
					.map((c) => c.feature)
					.join(', ')}); ${toHex(kept)} was taken`,
				{
					key,
					chosen: toHex(kept),
					observed: [
						{ feature: reading.probe.id, color: toHex(kept), layers: reading.layers },
						...differing.map((c) => ({ feature: c.feature, color: toHex(c.color), layers: c.layers })),
					],
				},
				{ optionPath: `colors.${key}`, origin: { probe: reading.probe.id } }
			)
		);
	}

	// Colours other layers drew for the same probe and channel. Reported against the colour key that
	// channel feeds, which is the setting a consumer would offer the alternatives for.
	for (const reading of readings.values()) {
		for (const [channel, groups] of Object.entries(reading.discarded ?? {}) as [Channel, DiscardedColor[]][]) {
			const kept = reading.colors[channel];
			if (!kept) continue;
			// The same threshold that decides whether a colour is worth overriding the palette with: two
			// colours that differ enough to be a conflict are exactly the two that would differ enough to
			// be written out, and a second constant would let one happen without the other. The bare
			// value, not `overrideDistance(residual)` — both colours here are direct readings, with no
			// model inversion for a residual to describe.
			const differing = groups.filter((g) => colorDistance(g.color, kept) > OVERRIDE_DISTANCE);
			if (differing.length === 0) continue;
			const key = model.channels.get(`${reading.probe.id}/${channel}`)?.keys[0];
			if (key === undefined) continue;
			report.say(
				diagnostic(
					'color.conflict',
					`${differing.length + 1} colours were drawn for ${reading.probe.id}; the topmost (${toHex(kept)}) was taken`,
					{
						key,
						chosen: toHex(kept),
						rule: 'topmost',
						observed: [
							{ color: toHex(kept), layers: reading.layers },
							...differing.map((g) => ({ color: toHex(g.color), layers: g.layers })),
						],
					},
					{ optionPath: `colors.${key}`, origin: { probe: reading.probe.id } }
				)
			);
		}
	}

	// A first solve against the base palette decides the palette; a second, pulled toward that
	// palette, gives the colours. Keys nothing was observed for then stay exactly the palette's.
	const first = solveColors(model, observed, target.colorsFor(target.baseTheme(mode)));
	const share = (key: keyof ColorsOptions) => Math.min(1, (first.evidence.get(key) ?? 0) / FULL_EVIDENCE);

	// The runner-up is kept, not just the winner: the margin between the two is the whole of what can
	// be said about how sure the palette is, and it was being computed and dropped every time.
	let theme = target.baseTheme(mode);
	let best = Infinity;
	let runnerUp: Palette | undefined;
	let runnerUpCost = Infinity;
	for (const candidate of target.themes(mode)) {
		const palette = target.colorsFor(candidate);
		let cost = 0;
		for (const key of colorOptionsKeys) {
			const weight = share(key) * (PALETTE_WEIGHTS[key] ?? 1);
			if (weight > 0) cost += weight * colorDistance(first.colors.get(key)!, parseRGBA(palette[key]));
		}
		if (cost < best) {
			[runnerUp, runnerUpCost] = [theme, best];
			[best, theme] = [cost, candidate];
		} else if (cost < runnerUpCost) {
			[runnerUp, runnerUpCost] = [candidate, cost];
		}
	}
	const margin = Number.isFinite(runnerUpCost) && best > 0 ? (runnerUpCost - best) / best : Infinity;
	if (runnerUp !== undefined && margin < THEME_MARGIN) {
		report.say(
			diagnostic(
				'theme.ambiguous',
				`"${theme}" and "${runnerUp}" fit almost equally well (within ${(margin * 100).toFixed(1)}%); "${theme}" was taken`,
				{
					chosen: theme,
					cost: round2(best),
					runnerUp,
					runnerUpCost: round2(runnerUpCost),
					margin: round2(margin),
				},
				{ optionPath: 'theme' }
			)
		);
	}

	report.note('theme', {
		origin: 'observed',
		// The margin over the runner-up, measured against the margin at which the choice stops being
		// reported as a near-tie: 0 where the two palettes score alike, 1 once the winner is clear by
		// `THEME_MARGIN` or more. Not a probability, and not comparable with a colour's evidence share —
		// it says how far this choice sits from the point where it would be flagged as ambiguous.
		confidence: Number.isFinite(margin) ? round2(Math.max(0, Math.min(1, margin / THEME_MARGIN))) : 1,
	});

	const palette = target.colorsFor(theme);
	const solved = solveColors(model, observed, palette);
	const colors: ColorsOptions = {};
	const unobserved: string[] = [];
	/** The probes that observed a key's channels, for the provenance note. */
	const fedBy = (key: keyof ColorsOptions): string[] => {
		const probes = new Set<string>();
		for (const id of observed.keys()) {
			if (model.channels.get(id)?.keys.includes(key)) probes.add(id.split('/')[0]);
		}
		return [...probes].sort();
	};
	for (const key of colorOptionsKeys) {
		const evidence = solved.evidence.get(key) ?? 0;
		if (evidence < FULL_EVIDENCE / 4) {
			// Nothing in the style spoke for this key, so the palette's own value stands. Collected rather
			// than reported one by one: on a real style this is a third of the palette, and forty-odd
			// diagnostics saying the same thing would bury the ones that differ.
			unobserved.push(key);
			report.note(`colors.${key}`, { origin: 'inherited', confidence: round2(evidence / FULL_EVIDENCE) });
			continue;
		}
		const estimate = solved.colors.get(key)!;
		const distance = colorDistance(estimate, parseRGBA(palette[key]));
		const threshold = overrideDistance(solved.residual.get(key)!);
		const confidence = round2(Math.min(1, evidence / FULL_EVIDENCE));
		if (distance > threshold) {
			colors[key] = toHex(estimate);
			report.note(`colors.${key}`, { origin: 'observed', confidence, from: fedBy(key) });
			continue;
		}
		// Observed, but the palette's own value was kept. Still `observed`: the style was read and agreed
		// with the palette, which is a different thing from never having looked.
		report.note(`colors.${key}`, { origin: 'observed', confidence, from: fedBy(key) });
		// Observed, estimated, and then discarded for sitting inside the threshold. Worth reporting only
		// when the estimate actually differed: an estimate that lands on the palette exactly is the
		// solver agreeing with it, which is the opposite of low confidence.
		if (distance > threshold / 2) {
			report.say(
				diagnostic(
					'color.lowConfidence',
					`the ${key} colour was estimated at ${toHex(estimate)} but kept at the palette's ${palette[key]}`,
					{
						key,
						estimate: toHex(estimate),
						paletteColor: palette[key],
						distance: round2(distance),
						threshold: round2(threshold),
						evidenceShare: round2(Math.min(1, evidence / FULL_EVIDENCE)),
						residual: round2(solved.residual.get(key)!),
					},
					{ optionPath: `colors.${key}` }
				)
			);
		}
	}
	if (unobserved.length > 0) {
		report.say(
			diagnostic(
				'color.unobserved',
				`${unobserved.length} of ${colorOptionsKeys.length} colours were not observed; the "${theme}" palette's values were kept`,
				{ keys: unobserved, count: unobserved.length, total: colorOptionsKeys.length }
			)
		);
	}

	return { theme, colors, layers: hiddenGroups(model, readings, schemas) };
}

/**
 * `layers.buildings` set to the opacity a style draws its extrusions at.
 *
 * On the target that option is the extrusion opacity outright, because in extruded mode `building-3d`
 * is the only layer in its group — flat footprints emit nothing — so the group's opacity and the
 * building opacity are the same number. `hiddenGroups` only ever writes `false`, so there is nothing
 * to overwrite here; a hidden group is left hidden, and anyway a style that hides its buildings gives
 * no extrusion to read.
 *
 * The cartographic default is left to say itself: `true` and an unset option both mean "as the
 * cartography drew it", so a style already at {@link EXTRUSION_OPACITY} writes nothing.
 */
function withExtrusionOpacity(
	layers: LayerGroupOptions,
	readings: ReadonlyMap<string, ProbeReading>,
	features: Common['features']
): LayerGroupOptions {
	if (features.buildings !== 'extruded' || layers.buildings === false) return layers;
	const opacity = readings.get('building')?.extrusionOpacity;
	if (opacity === undefined) return layers;
	const rounded = Math.round(opacity * 20) / 20;
	if (rounded <= 0 || rounded > 1 || rounded === EXTRUSION_OPACITY) return layers;
	return { ...layers, buildings: rounded };
}

/**
 * Layer groups the style does not draw: every probe of the group that the tiles can carry and the
 * target draws by default goes unread. A group with no such probe is left alone — silence about a
 * group is not evidence that the style hides it.
 *
 * Reports nothing, and takes no report. It used to warn when a group looked hidden with no vector
 * schema to judge by, which could not happen: a group is only marked hidden once a probe of it passes
 * a schema test, and with no schemas that test is vacuously false, so the list it guarded was always
 * empty. With no vector source the satellite path simply derives no layer-group options.
 */
function hiddenGroups(
	model: CalibrationModel,
	readings: ReadonlyMap<string, ProbeReading>,
	schemas: ReadonlyMap<string, SchemaName>
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
	content: { text?: TextOptions; icon?: IconOptions };
	features: NonNullable<OsmOptions['features']>;
	globals: Pick<OsmOptions, 'sun' | 'projection'>;
};

function deriveCommon(
	style: StyleSpecification,
	readings: ReadonlyMap<string, ProbeReading>,
	schemas: ReadonlyMap<string, SchemaName>,
	fontNames: readonly string[] | undefined,
	report: ReportBuilder
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
		deriveLabelStyle(readings, report)
	);
	if (Object.keys(text).length > 0) content.text = text;
	const icon = deriveIcon(readings, report);
	if (icon) content.icon = icon;

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
		// It was read, so it is not unread — this layer used to be reported as untouched on every style
		// that has one, because only probe readings were counted as having used a layer.
		report.used.add(hillshade.id);
	}

	const globals: Common['globals'] = {};
	const projection = style.projection?.type;
	if (projection === undefined) globals.projection = 'mercator';
	else if (projection === 'globe' || projection === 'mercator' || projection === 'vertical-perspective') {
		globals.projection = projection;
	} else {
		report.say(
			diagnostic(
				'projection.unsupported',
				`projection ${JSON.stringify(projection)} is not supported; the default is used`,
				{ requested: String(projection) },
				{ optionPath: 'projection' }
			)
		);
	}

	if (style.light) globals.sun = deriveSun(style.light);

	if (style.sprite) {
		report.say(
			diagnostic('icons.replaced', 'icons are not carried over; the VersaTiles sprite is used', {
				sprite: style.sprite,
			})
		);
	}
	if (schemas.size > 1) {
		report.say(
			diagnostic('source.multiple', `${schemas.size} vector sources: all of them were read as one map`, {
				sources: Object.fromEntries(schemas),
			})
		);
	}
	return { content, features, globals };
}

/** The language labels are shown in: the first `name…` field a place label reads. */
function deriveText(readings: ReadonlyMap<string, ProbeReading>, report: ReportBuilder): TextOptions | undefined {
	// Every place label is read before one is chosen, where this used to return on the first: a style
	// whose city names are German and whose town names are French had no way of saying so, because the
	// second was never looked at. The first still wins — `LANGUAGE_PROBES` is in order of how telling
	// each is — but the disagreement is now reportable.
	const languages = new Map<string, string[]>();
	for (const id of LANGUAGE_PROBES) {
		const field = nameFieldOf(readings.get(id));
		const language = field === undefined ? undefined : /^name[_:]([a-z]{2,3})$/.exec(field)?.[1];
		if (language) (languages.get(language) ?? languages.set(language, []).get(language)!).push(id);
	}
	if (languages.size > 1) {
		const observed = [...languages].map(([language, probes]) => ({ language, probes }));
		report.say(
			diagnostic(
				'language.conflict',
				`labels are read in ${languages.size} languages (${observed.map((o) => o.language).join(', ')}); "${observed[0].language}" was taken`,
				{ chosen: observed[0].language, observed },
				{ optionPath: 'text.language' }
			)
		);
	}

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
			report.say(
				diagnostic(
					'language.unavailable',
					`labels in "${language}" are not available in VersaTiles tiles; local names are used`,
					{ requested: language },
					{ optionPath: 'text.language' }
				)
			);
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

/** The `name…` field a label reading shows, or undefined where it shows none. */
function nameFieldOf(reading: ProbeReading | undefined): string | undefined {
	if (!reading?.label) return undefined;
	const shown = labelText(reading.label.layer, reading.zoom, reading.probe, reading.label.feature);
	return new RegExp(NAME_MARKER + '(name[\\w:-]*)').exec(shown)?.[1];
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
	report: ReportBuilder
): TextOptions {
	const known: ReadonlySet<string> = new Set([...(fontNames ?? []), DEFAULT_FONT_REGULAR, DEFAULT_FONT_BOLD]);
	const base = modelFor(osmTarget(), 'light').base;
	const topicOf = textTopicOfLayer();
	const knownFamilies = new Set([...known].map(fontFamily));
	const roleOf = (topic: TextTopic) =>
		labelStyleOf(DEFAULT_LABEL_STYLES, topic).font === DEFAULT_FONT_BOLD ? 'bold' : 'regular';

	const weights = { regular: [0, 0], bold: [0, 0] };
	const topicFaces = new Map<TextTopic, Map<string, number>>();
	/** Which probes spoke for each topic, so provenance can name them. */
	const probesOf = new Map<TextTopic, string[]>();
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
		if (topic) {
			vote((topicFaces.get(topic) ?? topicFaces.set(topic, new Map()).get(topic))!, face);
			(probesOf.get(topic) ?? probesOf.set(topic, []).get(topic)!).push(reading.probe.id);
		}
	}
	if (lost.size > 0) {
		const why = fontNames ? 'the glyph server does not publish' : 'unknown without the glyph server font list';
		report.say(
			diagnostic(
				'font.unavailable',
				`fonts ${why} are not carried over (${[...lost].join(', ')}); only regular or bold is`,
				{ requested: [...lost], reason: fontNames ? 'not-published' : 'no-font-list' },
				{ optionPath: 'text.font' }
			)
		);
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
		// Which of the four steps produced the face, recorded alongside it: they write the same option
		// and are indistinguishable afterwards, though the first is what the style asked for and the
		// last is the target's own font picked by weight alone.
		const own = mostVoted(topicFaces.get(topic) ?? new Map<string, number>());
		const fromSibling = own === undefined ? sibling() : undefined;
		const fromFamily =
			own === undefined && fromSibling === undefined && inFamily !== undefined && known.has(inFamily)
				? inFamily
				: undefined;
		const face =
			own ??
			fromSibling ??
			fromFamily ??
			(read[role] ? (weightOf(role) === 'bold' ? DEFAULT_FONT_BOLD : DEFAULT_FONT_REGULAR) : undefined);
		if (face === undefined) continue;
		if (own !== undefined) {
			const votes = [...(topicFaces.get(topic) ?? [])].sort((a, b) => b[1] - a[1]);
			if (votes.length > 1) {
				report.say(
					diagnostic(
						'font.conflict',
						`"${topic}" labels are set in ${votes.length} fonts (${votes.map(([f]) => f).join(', ')}); "${own}" was taken`,
						{ topic, chosen: own, observed: votes.map(([font, count]) => ({ font, count })) },
						{ optionPath: `text.${topic}.font`, origin: { layers: probesOf.get(topic) } }
					)
				);
			}
		}
		report.note(`text.${topic}.font`, {
			origin: own !== undefined ? 'observed' : (fromSibling ?? fromFamily) ? 'pooled' : 'default',
			...(own !== undefined && { from: probesOf.get(topic) }),
		});
		if (leaf === undefined) tree[group] = { font: face };
		else (tree[group] ??= {})[leaf] = { font: face };
	}
	return tree as TextOptions;
}

/** The middle value of a non-empty list, rounded to steps of 0.05. */
function median05(values: readonly number[]): number {
	const sorted = [...values].sort((a, b) => a - b);
	return Math.round(sorted[Math.floor(sorted.length / 2)] * 20) / 20;
}

/**
 * The `LabelStyle` properties derived from what the style draws, as opposed to how it draws it.
 *
 * `font` and `scale` are not here — they are derived against the glyph server's font list and against
 * the target's own label sizes, neither of which is a property of the layer. Everything else in
 * `LABEL_STYLE_KEYS` is.
 */
const DERIVED_LABEL_KEYS = [
	'haloWidth',
	'haloBlur',
	'maxWidth',
	'lineHeight',
	'letterSpacing',
	'transform',
	'spacing',
] as const;

type DerivedLabelKey = (typeof DERIVED_LABEL_KEYS)[number];

/**
 * The label style of each `text` topic, from what the style draws: halo, wrapping, line height, letter
 * spacing, capitalization and label spacing.
 *
 * All but `spacing` are values `applyText` writes straight through — unlike `scale`, nothing rescales
 * them — so they carry over as they are read. `spacing` is a multiplier over the layer's own
 * `symbol-spacing`, so it is read as a ratio against the target's, the way `scale` is read against the
 * target's text size. A topic takes, per property, in order:
 *
 *  1. the summary of its own probes — the median, or for `transform` the most voted;
 *  2. the same over the topics the *target* gives the same default, nearest first: the rest of its own
 *     group, then any topic at all. A topic no probe reads (`water.lakes`, `streets.refs`,
 *     `streets.exits`) follows its neighbours, so lake names follow river names as they do for fonts;
 *  3. nothing — the target's own default stands.
 *
 * The median, not the mean: a style that haloes most labels at 1 and one at 4 should carry the 1, and
 * these values cluster on a handful of numbers rather than spreading.
 *
 * Step 2 pools per property, and only topics sharing this one's default for it, which is what keeps the
 * target's deliberate exceptions intact. `streets.refs` is haloed 0.1 because it sits on a shield,
 * `addresses` not at all, and country, state, hamlet and district names are uppercased where nothing
 * else is — filling those from a street-name or city-name reading would erase the distinction and,
 * worse, make a round trip of the target's own style derive options it did not need: no probe reads
 * those topics, so each would take a value off a neighbour and be written out as differing from a
 * default it in fact matches.
 *
 * A halo width of 0 counts and propagates like any other — a style that draws no halo has to say so,
 * since most topics of the target halo at 2px. Blur is only read where a halo is actually drawn, and
 * forced to 0 where the width is, rather than falling back to the target's 1: a `text-halo-blur` on a
 * label with no halo to blur has nothing to show for it. Every topic reached is spelled out; minimising
 * drops what equals the target's own, so a style that already matches writes nothing.
 */
function deriveLabelStyle(readings: ReadonlyMap<string, ProbeReading>, report: ReportBuilder): TextOptions {
	const topicOf = textTopicOfLayer();
	const base = modelFor(osmTarget(), 'light').base;

	// Per property, per topic, every value read for it.
	const seen = new Map<DerivedLabelKey, Map<TextTopic, unknown[]>>();
	/** Which probes spoke for each topic, so provenance can name them. */
	const probesFor = new Map<TextTopic, string[]>();
	const record = (key: DerivedLabelKey, topic: TextTopic, value: unknown) => {
		const perTopic = seen.get(key) ?? seen.set(key, new Map()).get(key)!;
		(perTopic.get(topic) ?? perTopic.set(topic, []).get(topic)!).push(value);
	};
	for (const reading of readings.values()) {
		const topic = topicOf.get(reading.probe.id);
		if (!topic) continue;
		(probesFor.get(topic) ?? probesFor.set(topic, []).get(topic)!).push(reading.probe.id);
		if (reading.labelStyle) {
			for (const [key, value] of Object.entries(reading.labelStyle)) {
				record(key as DerivedLabelKey, topic, value);
			}
		}
		// `spacing` multiplies the target's own repeat distance, so only the ratio carries over — and
		// only where both styles place this label along a line and so state one.
		const own = base.get(reading.probe.id)?.symbolSpacing;
		if (reading.symbolSpacing !== undefined && own) record('spacing', topic, reading.symbolSpacing / own);
	}
	if (seen.size === 0) return {};

	const targetStyle = (topic: TextTopic) => labelStyleOf(DEFAULT_LABEL_STYLES, topic);
	const summarise = (key: DerivedLabelKey, values: readonly unknown[]): unknown =>
		key === 'transform'
			? mostVoted(values.reduce((v: Map<unknown, number>, s) => (vote(v, s), v), new Map()))
			: median05(values as number[]);

	// Values from the topics the target styles like `topic` for `key`, its own group first. The two
	// passes are separate so a neighbour always outweighs a distant topic, however many values each has.
	const pooled = (key: DerivedLabelKey, topic: TextTopic, group: string): unknown => {
		const perTopic = seen.get(key);
		if (!perTopic) return undefined;
		const mine = targetStyle(topic)[key as keyof typeof DEFAULT_LABEL_STYLES.addresses];
		const like = (other: TextTopic) =>
			other !== topic && targetStyle(other)[key as keyof typeof DEFAULT_LABEL_STYLES.addresses] === mine;
		for (const near of [true, false]) {
			const values: unknown[] = [];
			for (const other of TEXT_TOPICS) {
				if (like(other) && other.startsWith(`${group}.`) === near) values.push(...(perTopic.get(other) ?? []));
			}
			if (values.length > 0) return summarise(key, values);
		}
		return undefined;
	};

	const tree: Record<string, Record<string, unknown>> = {};
	for (const topic of TEXT_TOPICS) {
		const [group, leaf] = topic.split('.');
		const style: Record<string, unknown> = {};
		for (const key of DERIVED_LABEL_KEYS) {
			const own = seen.get(key)?.get(topic);
			const value = own?.length ? summarise(key, own) : pooled(key, topic, group);
			if (value !== undefined) style[key] = value;
			// The readings that were summarised away. `spacing` is a ratio against the target and lands on
			// a fresh float per probe, so it is compared at the precision it is reported at.
			if (own && own.length > 1) {
				const counts = new Map<number | string, number>();
				for (const raw of own) {
					const v = typeof raw === 'number' ? median05([raw]) : (raw as string);
					counts.set(v, (counts.get(v) ?? 0) + 1);
				}
				if (counts.size > 1) {
					const observed = [...counts].sort((a, b) => b[1] - a[1]).map(([value, count]) => ({ value, count }));
					report.say(
						diagnostic(
							'labelStyle.conflict',
							`"${topic}" labels disagree on ${key} (${observed.map((o) => o.value).join(', ')}); ${String(value)} was taken`,
							{ topic, property: key, chosen: value as number | string, observed },
							{ optionPath: `text.${topic}.${key}`, origin: { layers: probesFor.get(topic) } }
						)
					);
				}
			}
			// `pooled` is why this annotation exists: a topic no probe read takes its value from a topic
			// the target styles the same way, and the option it writes looks exactly like a first-hand
			// reading. Recorded for every topic, including the ones left at the target's own value.
			report.note(`text.${topic}.${key}`, {
				origin: own?.length ? 'observed' : value !== undefined ? 'pooled' : 'default',
				...(own?.length && { from: probesFor.get(topic) }),
			});
		}
		// Blur means nothing without a halo, in either direction: drop a blur whose width was not read,
		// and zero it where the width is zero.
		if (style.haloWidth === undefined) delete style.haloBlur;
		else if (style.haloWidth === 0) style.haloBlur = 0;
		else style.haloBlur ??= 0;
		if (Object.keys(style).length === 0) continue; // nothing was read that speaks for this topic
		if (leaf === undefined) tree[group] = { ...tree[group], ...style };
		else (tree[group] ??= {})[leaf] = { ...((tree[group]?.[leaf] as object | undefined) ?? {}), ...style };
	}
	return tree as TextOptions;
}

/**
 * A multiplier over the target's own value, in steps of 0.05, or `undefined` when it lands within 10%
 * of 1. Below that the evidence is a handful of layers whose sizes ramp differently from the target's,
 * and the ratio says more about where the ramps cross than about the style.
 *
 * The geometric mean, not the median. A ratio's centre is multiplicative — halving and doubling should
 * cancel — and with the two or three samples there are to average, `median05` would pick the upper of
 * an even pair rather than anything between them: for OpenFreeMap's Liberty it chose the POI ratio of
 * 1.29 outright and drew transit icons 39% too large, where the mean of 1.1 splits the difference.
 */
function deriveFactor(ratios: readonly { ratio: number }[]): number | undefined {
	if (ratios.length === 0) return undefined;
	const logs = ratios.reduce((sum, { ratio }) => sum + Math.log(ratio), 0);
	const factor = Math.round(Math.exp(logs / ratios.length) * 20) / 20;
	return Math.abs(factor - 1) >= 0.1 ? factor : undefined;
}

/**
 * `icon`: how much bigger the style draws its icons than the target, and how much further apart.
 *
 * Both are multipliers over the target's own values rather than properties of their own, so both are
 * read as a ratio against the same probe read off the target, the way `text.scale` is. `scale` compares
 * `icon-size`; `spacing` compares `icon-padding`, which `applyIcon` shifts by a fixed step per unit
 * rather than multiplying, so the ratio is recovered from the difference.
 *
 * Only the two probes that draw an icon in both styles can speak — POI names and transit stops — and
 * only where both state a size. A layer with no `icon-image` reads the spec default of 1, which would
 * otherwise turn a place label's small dot icon into evidence about a target layer that draws no icon
 * at all. The icons themselves are not carried over (the target's sprite is used), so this is about the
 * size at which that sprite is drawn.
 *
 * `icon.spacing` has a second half that no probe reaches: along a line `applyIcon` scales
 * `symbol-spacing` instead, on layers that draw an icon and no text — oneway arrows and road markings.
 * Nothing probes those, so a style that spaces its markings unusually still carries over at 1.
 */
function deriveIcon(readings: ReadonlyMap<string, ProbeReading>, report: ReportBuilder): IconOptions | undefined {
	const base = modelFor(osmTarget(), 'light').base;
	const scales: { probe: string; ratio: number }[] = [];
	const spacings: { probe: string; ratio: number }[] = [];
	for (const reading of readings.values()) {
		const own = base.get(reading.probe.id);
		// Sizes ramp with zoom, so a ratio only means something between readings taken at the same one.
		if (!own || reading.zoom !== own.zoom) continue;
		if (reading.iconSize !== undefined && own.iconSize) {
			scales.push({ probe: reading.probe.id, ratio: reading.iconSize / own.iconSize });
		}
		if (reading.iconPadding !== undefined && own.iconPadding !== undefined) {
			spacings.push({
				probe: reading.probe.id,
				ratio: 1 + (reading.iconPadding - own.iconPadding) / PADDING_PER_SPACING,
			});
		}
	}
	const scale = deriveFactor(scales);
	const spacing = deriveFactor(spacings);
	// One multiplier serves every icon, so probes that scale differently from the target cannot all be
	// satisfied: Liberty draws flat POI icons where the target ramps them, and its transit icons at a
	// different ratio again, which the geometric mean can only split.
	for (const [option, ratios, chosen] of [
		['scale', scales, scale],
		['spacing', spacings, spacing],
	] as const) {
		if (ratios.length < 2 || chosen === undefined) continue;
		const spread = Math.max(...ratios.map((r) => r.ratio)) / Math.min(...ratios.map((r) => r.ratio));
		if (spread < 1 + ICON_SPREAD) continue;
		report.say(
			diagnostic(
				'icon.conflict',
				`icons are ${option === 'scale' ? 'sized' : 'spaced'} inconsistently relative to the target (${ratios
					.map((r) => r.ratio.toFixed(2))
					.join(', ')}); ${chosen} was taken`,
				{
					option,
					chosen,
					observed: ratios.map((r) => ({ probe: r.probe, ratio: round2(r.ratio) })),
				},
				{ optionPath: `icon.${option}` }
			)
		);
	}
	// A factor inside the dead band is not "nothing was read" — the ratios were computed and found too
	// close to 1 to be a choice, which provenance records as observed with the target's own value.
	report.note('icon.scale', { origin: scales.length > 0 ? 'observed' : 'default' });
	report.note('icon.spacing', { origin: spacings.length > 0 ? 'observed' : 'default' });
	if (scale === undefined && spacing === undefined) return undefined;
	return { ...(scale !== undefined && { scale }), ...(spacing !== undefined && { spacing }) };
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
