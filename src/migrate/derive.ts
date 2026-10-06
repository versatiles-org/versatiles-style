import { osm, satellite, guessSchema } from '../api/index.js';
import type { SchemaName } from '../api/index.js';
import { getOverlayLayerGroupMap } from '../shortbread/index.js';
import {
	minimizeOsmOptions,
	minimizeSatelliteOptions,
	type OsmOptions,
	type SatelliteOptions,
} from '../options/index.js';
import type { StyleSpecification, TileJSONSpecification, TileJSONSpecificationVector } from '../types/index.js';
import { evaluateProperty, readProbe, type ProbeReading } from './evaluate.js';
import { PROBES, type Probe } from './probes.js';
import { diagnostic } from './diagnostics.js';
import { type OptionsGuess, type ReportBuilder, newReport, finish } from './derive-report.js';
import { READABLE, osmTarget, satelliteTarget, modeOf, fitContent } from './derive-content.js';
import { withExtrusionOpacity, deriveCommon, deriveSky, pick } from './derive-common.js';
import { withLineStyles } from './derive-lines.js';

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

export type { GuessReport, OptionsGuess } from './derive-report.js';

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

export function derive(
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
			if (guess.schema && READABLE.has(guess.schema)) schemas.set(id, guess.schema);
			else {
				// Recognised is not readable: a schema is read through the probes, and one no probe names a
				// feature for would be read as a style that draws nothing at all — every group hidden.
				const what = guess.schema
					? `${guess.schema} tiles, which cannot be read yet`
					: 'vector tiles of no known schema';
				report.say(
					diagnostic(
						'source.schemaUnknown',
						`source "${id}" carries ${what}; its layers are not read`,
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
			const read = (probe: Probe, zoom: number) => readProbe(style, schemas, probe, zoom);
			const layers = withLineStyles(fitted.layers, target, fitted.theme, readings, read, report, 'osmOverlay.layers');
			options.osmOverlay = { theme: fitted.theme, colors: fitted.colors, layers, ...common.content };
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
			layers: withLineStyles(
				withExtrusionOpacity(fitted.layers, readings, common.features),
				target,
				fitted.theme,
				readings,
				(probe, zoom) => readProbe(style, schemas, probe, zoom),
				report,
				'layers'
			),
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
