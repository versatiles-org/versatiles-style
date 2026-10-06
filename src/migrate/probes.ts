import type { SchemaName } from '../api/index.js';

/**
 * Probes: the schema-neutral vocabulary `deriveOptions` reads a foreign style in.
 *
 * A probe is one kind of map feature — a motorway, a forest, a city label — together with the feature
 * that stands for it in each schema's tiles. Evaluating a style's filters and paint properties against
 * that synthetic feature tells what the style draws for it, without rendering anything. Because every
 * schema spells the same feature differently (`kind: motorway`, `class: motorway`,
 * `kind_detail: motorway`), the probe is where those spellings meet.
 *
 * ── Why probe ids are Shortbread layer ids ────────────────────────────────────
 *
 * The three builders in this package emit the same layer ids for the same features, so a probe named
 * after its layer is unambiguous, and `probes.test.ts` can check each schema's feature against the
 * layer of that id in the package's own style for that schema: a probe feature that the package's own
 * `omt()` does not draw would be a typo here, not a difference of cartography. `layer` names the layer
 * where a schema's builder uses another id.
 */

export type ProbeKind = 'background' | 'fill' | 'line' | 'symbol';

export type ProbeGeometry = 'Point' | 'LineString' | 'Polygon';

export type ProbeFeature = {
	/** The source-layer this feature lives in. */
	readonly sourceLayer: string;
	/** Its properties. Symbol probes get every name field added by the evaluator. */
	readonly props: Readonly<Record<string, string | number | boolean>>;
	/** Defaults to the probe kind's natural geometry: fill → Polygon, line → LineString, symbol → Point. */
	readonly geometry?: ProbeGeometry;
	/** The id of the layer that draws this feature in the package's builder, when it is not the probe id. */
	readonly layer?: string;
};

export type Probe = {
	/** The Shortbread layer id this probe stands for. */
	readonly id: string;
	readonly kind: ProbeKind;
	/** The zoom the probe is read at: one where the feature is drawn and fully faded in. */
	readonly zoom: number;
	/**
	 * The feature per schema, or several where styles in the wild select the same thing differently —
	 * the first one a layer's filter accepts is used. A schema without one cannot tell anything about
	 * this probe.
	 */
	readonly features: Readonly<Partial<Record<SchemaName, readonly ProbeFeature[]>>>;
	/**
	 * Features a *source* schema tells apart that the target draws as one, per schema.
	 *
	 * Read separately and compared, where `features` stops at the first that matches. The two mean
	 * different things and must not share an array: `features` is alternative spellings of one thing
	 * ("styles select this differently"), `variants` is several things the target has one setting for
	 * ("the source is finer-grained than we are"). Only the second is a loss worth reporting.
	 *
	 * Shortbread's POI layer is coarser than OpenMapTiles' by design, so an OMT style that colours shops
	 * and hotels differently from restaurants has three colours for one `colors.labelPoi`, and without
	 * these two of them would never be read at all.
	 */
	readonly variants?: Readonly<Partial<Record<SchemaName, readonly ProbeFeature[]>>>;
};

type Features = Partial<Record<SchemaName, ProbeFeature | ProbeFeature[]>>;

/**
 * Properties real tiles carry on (nearly) every feature of a source-layer, which styles filter on:
 * OpenMapTiles' `intermittent: 0` and `maritime: 0`, Protomaps' `min_zoom`. A feature without them
 * would fail filters like `["==", "intermittent", 0]` that every real feature passes.
 */
const DEFAULT_PROPS: Record<SchemaName, Record<string, ProbeFeature['props']>> = {
	shortbread: {},
	openmaptiles: {
		boundary: { disputed: 0, maritime: 0 },
		poi: { rank: 1, level: 0 },
		transportation: { oneway: 0, ramp: 0 },
		water: { intermittent: 0 },
		waterway: { intermittent: 0 },
	},
	protomaps: {
		boundaries: { sort_rank: 1 },
		buildings: { sort_rank: 1 },
		landuse: { sort_rank: 1 },
		places: { min_zoom: 0 },
		pois: { min_zoom: 0 },
		roads: { min_zoom: 0, sort_rank: 1 },
		water: { min_zoom: 0, sort_rank: 1 },
	},
	// Mapbox writes its flags as the strings 'true' and 'false', and its styles filter labels on the
	// two ranks: `filterrank` (how readily a label gives way, 0–5) and `symbolrank`/`sizerank`.
	mapbox: {
		admin: { disputed: 'false', maritime: 'false', worldview: 'all' },
		airport_label: { sizerank: 1, worldview: 'all' },
		building: { extrude: 'true', underground: 'false', height: 10, min_height: 0 },
		natural_label: { filterrank: 1, sizerank: 1, worldview: 'all' },
		place_label: { filterrank: 1, worldview: 'all' },
		poi_label: { filterrank: 1, sizerank: 16 },
		road: { structure: 'none', oneway: 'false', layer: 0, len: 5000 },
		transit_stop_label: { filterrank: 1 },
	},
};

const f = (sourceLayer: string, props: ProbeFeature['props'] = {}, extra?: Partial<ProbeFeature>): ProbeFeature => ({
	sourceLayer,
	props,
	...extra,
});

function probe(id: string, kind: ProbeKind, zoom: number, features: Features, variants?: Features): Probe {
	const fill = (list: Features): Partial<Record<SchemaName, ProbeFeature[]>> => {
		const normalized: Partial<Record<SchemaName, ProbeFeature[]>> = {};
		for (const [schema, entry] of Object.entries(list) as [SchemaName, ProbeFeature | ProbeFeature[]][]) {
			normalized[schema] = (Array.isArray(entry) ? entry : [entry]).map((feature) => ({
				...feature,
				props: {
					...DEFAULT_PROPS[schema][feature.sourceLayer],
					// labels are filtered on having a name
					...(kind === 'symbol' && { name: 'name' }),
					...feature.props,
				},
			}));
		}
		return normalized;
	};
	return { id, kind, zoom, features: fill(features), ...(variants && { variants: fill(variants) }) };
}

/** A line of the road network: Shortbread `kind`, OpenMapTiles `class`/`subclass`, Protomaps `kind`/`kind_detail`. */
function road(id: string, zoom: number, sb: string, omt: [string, string?], pm: [string, string], pmLayer?: string) {
	return probe(id, 'line', zoom, {
		shortbread: f('streets', { kind: sb }),
		openmaptiles: f('transportation', omt[1] ? { class: omt[0], subclass: omt[1] } : { class: omt[0] }),
		protomaps: f('roads', { kind: pm[0], kind_detail: pm[1] }, pmLayer ? { layer: pmLayer } : undefined),
	});
}

/** A land fill: Shortbread `land`, OpenMapTiles `landcover`/`landuse`, Protomaps `landuse`. */
function land(id: string, zoom: number, sb: string, omt: ProbeFeature | undefined, pm: string | undefined): Probe {
	return probe(id, 'fill', zoom, {
		shortbread: f('land', { kind: sb }),
		...(omt && { openmaptiles: omt }),
		...(pm && { protomaps: f('landuse', { kind: pm }) }),
	});
}

/** A Mapbox road: every road, rail and path is one `road` layer, told apart by `class` and `type`. */
const mb = (cls: string, type: string = cls, extra?: Partial<ProbeFeature>): ProbeFeature =>
	f('road', { class: cls, type }, extra);
/** A Mapbox land fill: `class` is Mapbox's own grouping, `type` the OpenStreetMap value behind it. */
const mbLand = (cls: string, type: string = cls): ProbeFeature => f('landuse', { class: cls, type });
const mbPlace = (cls: string, type: string, symbolrank: number, extra: ProbeFeature['props'] = {}): ProbeFeature =>
	f('place_label', { class: cls, type, symbolrank, ...extra });

/**
 * The Mapbox feature of each probe, by probe id — Mapbox Streets v8, with Terrain v2's `landcover`.
 *
 * A table of its own rather than a fourth entry on every probe below. The other three schemas have a
 * builder in this package, and `probes.test.ts` holds each of their features to the layer of that id
 * in the package's own style; Mapbox has none (issue #137), so its features can only be held to the
 * list of Mapbox's layers and fields (`mapbox-layers.ts`) — and to Mapbox's own styles, which is what
 * they were written against. Keeping them together keeps that difference in one place.
 *
 * A probe left out is one Mapbox's tiles have no feature for: its styles cannot say anything about it,
 * and the importer leaves that setting at the theme's own.
 */
const MAPBOX: Readonly<Record<string, ProbeFeature | ProbeFeature[]>> = {
	// water has no fields: ocean, lake and river polygon are one thing to a Mapbox style
	'water-ocean': f('water'),
	'water-area': f('water'),
	'water-river': f('waterway', { class: 'river', type: 'river' }),
	'water-stream': f('waterway', { class: 'stream', type: 'stream' }),

	// `landuse` from OpenStreetMap at high zoom, `landcover` from satellite classification below it
	'land-glacier': [mbLand('glacier'), f('landcover', { class: 'snow' })],
	'land-forest': [mbLand('wood'), f('landcover', { class: 'wood' })],
	'land-grass': [mbLand('grass'), f('landcover', { class: 'grass' })],
	'land-vegetation': [mbLand('scrub'), f('landcover', { class: 'scrub' })],
	'land-park': mbLand('park'),
	'land-garden': mbLand('park', 'garden'),
	'land-agriculture': [mbLand('agriculture', 'farmland'), f('landcover', { class: 'crop' })],
	'land-sand': mbLand('sand'),
	'land-rock': mbLand('rock', 'bare_rock'),
	'land-wetland': f('landuse_overlay', { class: 'wetland', type: 'marsh' }),
	'land-residential': mbLand('residential'),
	'land-commercial': mbLand('commercial_area', 'commercial'),
	'land-industrial': mbLand('industrial'),
	'land-burial': mbLand('cemetery'),
	'land-leisure': mbLand('park', 'playground'),

	'site-hospital': mbLand('hospital'),
	'site-education': mbLand('school'),
	'site-sportscentre': mbLand('pitch'),
	'site-parking': mbLand('parking'),

	'airport-area': f('aeroway', { type: 'runway' }),
	building: f('building', { type: 'building' }),

	'street-motorway': mb('motorway'),
	'street-trunk': mb('trunk'),
	'street-primary': mb('primary'),
	'street-secondary': mb('secondary'),
	'street-tertiary': mb('tertiary'),
	'street-minor': mb('street', 'residential'),
	'street-service': mb('service'),
	'street-track': mb('track'),
	'street-pedestrian': mb('pedestrian'),
	'way-footway': mb('path', 'footway'),
	'way-cycleway': mb('path', 'cycleway'),
	'way-path': mb('path'),
	'way-steps': mb('path', 'steps'),
	'transport-rail': mb('major_rail', 'rail'),
	'transport-subway': mb('minor_rail', 'subway'),
	'transport-ferry': mb('ferry'),
	aerialway: mb('aerialway', 'aerialway:cablecar'),
	'airport-runway': f('aeroway', { type: 'runway' }, { geometry: 'LineString' }),

	// countries are level 0 and states level 1, where OpenStreetMap counts 2 and 4
	'boundary-country': f('admin', { admin_level: 0 }),
	'boundary-country-disputed': f('admin', { admin_level: 0, disputed: 'true' }),
	'boundary-state': f('admin', { admin_level: 1 }),

	'label-place-capital': mbPlace('settlement', 'city', 5, { capital: 2 }),
	'label-place-city': mbPlace('settlement', 'city', 8),
	'label-place-town': mbPlace('settlement', 'town', 11),
	'label-place-village': mbPlace('settlement', 'village', 14),
	'label-place-suburb': mbPlace('settlement_subdivision', 'suburb', 15),
	'label-boundary-state': mbPlace('state', 'state', 5),
	'label-boundary-country-large': mbPlace('country', 'country', 1),
	'label-street-primary': mb('primary', 'primary', { geometry: 'LineString' }),
	'label-street-residential': mb('street', 'residential', { geometry: 'LineString' }),
	'label-water-river': f('natural_label', { class: 'river' }, { geometry: 'LineString' }),
	'label-address-housenumber': f('housenum_label', { house_num: '12' }),
	'poi-amenity': f('poi_label', { class: 'food_and_drink', maki: 'restaurant', type: 'Restaurant' }),
	'symbol-transit-bus': f('transit_stop_label', { mode: 'bus', stop_type: 'stop', maki: 'bus' }),
};

/** What Mapbox tells apart that the target draws as one — see `Probe.variants`. */
const MAPBOX_VARIANTS: Readonly<Record<string, ProbeFeature[]>> = {
	'poi-amenity': [
		f('poi_label', { class: 'store_like', maki: 'shop', type: 'Supermarket' }),
		f('poi_label', { class: 'lodging', maki: 'lodging', type: 'Hotel' }),
		f('poi_label', { class: 'park_like', maki: 'park', type: 'Park' }),
	],
};

const SCHEMA_PROBES: readonly Probe[] = [
	probe('background', 'background', 14, {}),

	// ── water ──
	probe('water-ocean', 'fill', 8, {
		shortbread: f('ocean'),
		openmaptiles: f('water', { class: 'ocean' }),
		protomaps: f('water', { kind: 'ocean' }),
	}),
	probe('water-area', 'fill', 12, {
		shortbread: f('water_polygons', { kind: 'water' }),
		openmaptiles: f('water', { class: 'lake' }),
		protomaps: f('water', { kind: 'lake' }),
	}),
	probe('water-river', 'line', 14, {
		shortbread: f('water_lines', { kind: 'river' }),
		openmaptiles: f('waterway', { class: 'river' }),
		protomaps: f('water', { kind: 'river' }, { geometry: 'LineString' }),
	}),
	probe('water-stream', 'line', 15, {
		shortbread: f('water_lines', { kind: 'stream' }),
		openmaptiles: f('waterway', { class: 'stream' }),
		protomaps: f('water', { kind: 'stream' }, { geometry: 'LineString' }),
	}),

	// ── land ──
	probe('land-glacier', 'fill', 10, {
		shortbread: f('water_polygons', { kind: 'glacier' }),
		openmaptiles: f('landcover', { class: 'ice', subclass: 'glacier' }),
		protomaps: f('landuse', { kind: 'glacier' }),
	}),
	land('land-forest', 12, 'forest', f('landcover', { class: 'wood', subclass: 'forest' }), 'forest'),
	land('land-grass', 14, 'grass', f('landcover', { class: 'grass', subclass: 'grass' }), 'grass'),
	land('land-vegetation', 14, 'scrub', f('landcover', { class: 'grass', subclass: 'scrub' }), 'scrub'),
	land('land-park', 14, 'park', f('landcover', { class: 'grass', subclass: 'park' }), 'park'),
	land('land-garden', 14, 'garden', f('landcover', { class: 'grass', subclass: 'garden' }), 'garden'),
	land('land-agriculture', 14, 'farmland', f('landcover', { class: 'farmland', subclass: 'farmland' }), 'farmland'),
	land('land-sand', 14, 'sand', f('landcover', { class: 'sand', subclass: 'sand' }), 'sand'),
	land('land-rock', 14, 'bare_rock', f('landcover', { class: 'rock', subclass: 'bare_rock' }), 'bare_rock'),
	land('land-wetland', 14, 'marsh', f('landcover', { class: 'wetland', subclass: 'marsh' }), 'wetland'),
	land('land-residential', 14, 'residential', f('landuse', { class: 'residential' }), 'residential'),
	land('land-commercial', 14, 'commercial', f('landuse', { class: 'commercial' }), 'commercial'),
	land('land-industrial', 14, 'industrial', f('landuse', { class: 'industrial' }), 'industrial'),
	land('land-burial', 15, 'cemetery', f('landuse', { class: 'cemetery' }), 'cemetery'),
	land('land-leisure', 14, 'playground', f('landuse', { class: 'playground' }), 'playground'),
	land('land-waste', 14, 'landfill', undefined, undefined),

	// ── sites ──
	probe('site-hospital', 'fill', 16, {
		shortbread: f('sites', { kind: 'hospital' }),
		openmaptiles: f('landuse', { class: 'hospital' }),
		protomaps: f('landuse', { kind: 'hospital' }),
	}),
	probe('site-education', 'fill', 16, {
		shortbread: f('sites', { kind: 'school' }),
		openmaptiles: f('landuse', { class: 'school' }),
		protomaps: f('landuse', { kind: 'school' }),
	}),
	probe('site-sportscentre', 'fill', 16, {
		shortbread: f('sites', { kind: 'sports_centre' }),
		openmaptiles: f('landuse', { class: 'pitch' }, { layer: 'site-sports' }),
		protomaps: f('landuse', { kind: 'pitch' }, { layer: 'site-sports' }),
	}),
	probe('site-dangerarea', 'fill', 16, {
		shortbread: f('sites', { kind: 'danger_area' }),
		openmaptiles: f('landuse', { class: 'military' }, { layer: 'site-danger' }),
		protomaps: f('landuse', { kind: 'military' }, { layer: 'site-danger' }),
	}),
	probe('site-parking', 'fill', 16, { shortbread: f('sites', { kind: 'parking' }) }),
	probe('site-prison', 'fill', 16, { shortbread: f('sites', { kind: 'prison' }) }),
	probe('site-construction', 'fill', 16, { shortbread: f('sites', { kind: 'construction' }) }),

	// ── airport, buildings ──
	probe('airport-area', 'fill', 15, {
		shortbread: f('street_polygons', { kind: 'runway' }),
		openmaptiles: f('aeroway', { class: 'runway' }),
		protomaps: f('landuse', { kind: 'runway' }),
	}),
	probe('building', 'fill', 16, {
		shortbread: f('buildings'),
		openmaptiles: f('building'),
		protomaps: f('buildings', { kind: 'building' }),
	}),

	// ── roads ──
	road('street-motorway', 14, 'motorway', ['motorway'], ['highway', 'motorway']),
	road('street-trunk', 14, 'trunk', ['trunk'], ['highway', 'trunk']),
	road('street-primary', 14, 'primary', ['primary'], ['major_road', 'primary']),
	road('street-secondary', 14, 'secondary', ['secondary'], ['major_road', 'secondary']),
	road('street-tertiary', 15, 'tertiary', ['tertiary'], ['major_road', 'tertiary']),
	road('street-minor', 16, 'residential', ['minor'], ['minor_road', 'residential'], 'street-residential'),
	road('street-service', 17, 'service', ['service'], ['minor_road', 'service']),
	road('street-track', 17, 'track', ['track'], ['path', 'track']),
	road('street-pedestrian', 17, 'pedestrian', ['path', 'pedestrian'], ['path', 'pedestrian']),
	road('way-footway', 17, 'footway', ['path', 'footway'], ['path', 'footway']),
	road('way-cycleway', 17, 'cycleway', ['path', 'cycleway'], ['path', 'cycleway']),
	road('way-path', 17, 'path', ['path', 'path'], ['path', 'path']),
	road('way-steps', 17, 'steps', ['path', 'steps'], ['path', 'steps']),
	road('transport-rail', 16, 'rail', ['rail', 'rail'], ['rail', 'rail']),
	road('transport-subway', 16, 'subway', ['transit', 'subway'], ['rail', 'subway']),
	probe('transport-ferry', 'line', 12, {
		shortbread: f('ferries', { kind: 'ferry' }),
		openmaptiles: f('transportation', { class: 'ferry' }),
		protomaps: f('roads', { kind: 'ferry' }),
	}),
	probe('aerialway', 'line', 15, {
		shortbread: f('aerialways', { kind: 'cable_car' }),
		openmaptiles: f('transportation', { class: 'aerialway', subclass: 'cable_car' }),
		protomaps: f('roads', { kind: 'aerialway', kind_detail: 'cable_car' }),
	}),
	probe('airport-runway', 'line', 15, {
		shortbread: f('streets', { kind: 'runway' }),
		openmaptiles: f('aeroway', { class: 'runway' }, { geometry: 'LineString' }),
		protomaps: f('roads', { kind: 'aeroway', kind_detail: 'runway' }),
	}),

	// ── boundaries ──
	probe('boundary-country', 'line', 8, {
		shortbread: f('boundaries', { admin_level: 2 }),
		openmaptiles: f('boundary', { admin_level: 2 }),
		protomaps: f('boundaries', { kind: 'country', kind_detail: 2 }),
	}),
	probe('boundary-country-disputed', 'line', 8, {
		shortbread: f('boundaries', { admin_level: 2, disputed: true }),
		openmaptiles: f('boundary', { admin_level: 2, disputed: 1 }),
		protomaps: f('boundaries', { kind: 'country', kind_detail: 2, disputed: true }),
	}),
	probe('boundary-state', 'line', 8, {
		shortbread: f('boundaries', { admin_level: 4 }),
		openmaptiles: f('boundary', { admin_level: 4 }),
		protomaps: f('boundaries', { kind: 'region', kind_detail: 4 }),
	}),

	// ── labels ──
	probe('label-place-capital', 'symbol', 8, {
		shortbread: f('place_labels', { kind: 'capital', population: 3000000 }),
		openmaptiles: f('place', { class: 'city', capital: 2, rank: 1 }),
		protomaps: [
			f('places', { kind: 'city', capital: 2, population_rank: 15 }),
			f('places', { kind: 'locality', kind_detail: 'city', capital: 'yes', population_rank: 15 }),
		],
	}),
	probe('label-place-city', 'symbol', 10, {
		shortbread: f('place_labels', { kind: 'city', population: 500000 }),
		openmaptiles: f('place', { class: 'city', rank: 5 }),
		protomaps: [
			f('places', { kind: 'city', population_rank: 11 }),
			f('places', { kind: 'locality', kind_detail: 'city', population_rank: 11 }),
		],
	}),
	probe('label-place-town', 'symbol', 12, {
		shortbread: f('place_labels', { kind: 'town', population: 20000 }),
		openmaptiles: f('place', { class: 'town', rank: 10 }),
		protomaps: [
			f('places', { kind: 'town', population_rank: 8 }),
			f('places', { kind: 'locality', kind_detail: 'town', population_rank: 8 }),
		],
	}),
	probe('label-place-village', 'symbol', 14, {
		shortbread: f('place_labels', { kind: 'village', population: 1000 }),
		openmaptiles: f('place', { class: 'village', rank: 15 }),
		protomaps: [
			f('places', { kind: 'village', population_rank: 5 }),
			f('places', { kind: 'locality', kind_detail: 'village', population_rank: 5 }),
		],
	}),
	probe('label-place-suburb', 'symbol', 14, {
		shortbread: f('place_labels', { kind: 'suburb' }),
		openmaptiles: f('place', { class: 'suburb' }),
		protomaps: [f('places', { kind: 'suburb' }), f('places', { kind: 'neighbourhood', kind_detail: 'suburb' })],
	}),
	probe('label-boundary-state', 'symbol', 7, {
		shortbread: f('boundary_labels', { admin_level: 4, way_area: 10000000 }),
		openmaptiles: f('place', { class: 'state' }),
		protomaps: f('places', { kind: 'region' }),
	}),
	probe('label-boundary-country-large', 'symbol', 4, {
		shortbread: f('boundary_labels', { admin_level: 2, way_area: 1000000000 }),
		openmaptiles: f('place', { class: 'country', rank: 1 }),
		protomaps: f('places', { kind: 'country', population_rank: 15 }),
	}),
	probe('label-street-primary', 'symbol', 16, {
		shortbread: f('street_labels', { kind: 'primary' }, { geometry: 'LineString' }),
		openmaptiles: f('transportation_name', { class: 'primary' }, { geometry: 'LineString' }),
		protomaps: f(
			'roads',
			{ kind: 'major_road', kind_detail: 'primary' },
			{ geometry: 'LineString', layer: 'label-street-majorroad' }
		),
	}),
	probe('label-street-residential', 'symbol', 17, {
		shortbread: f('street_labels', { kind: 'residential' }, { geometry: 'LineString' }),
		openmaptiles: f('transportation_name', { class: 'minor' }, { geometry: 'LineString', layer: 'label-street-minor' }),
		protomaps: f(
			'roads',
			{ kind: 'minor_road', kind_detail: 'residential' },
			{ geometry: 'LineString', layer: 'label-street-minorroad' }
		),
	}),
	probe('label-water-river', 'symbol', 15, {
		shortbread: f('water_lines_labels', { kind: 'river' }, { geometry: 'LineString' }),
		openmaptiles: f('waterway', { class: 'river' }, { geometry: 'LineString' }),
		protomaps: f('water', { kind: 'river' }, { geometry: 'LineString' }),
	}),
	probe('label-address-housenumber', 'symbol', 18, {
		shortbread: f('addresses', { housenumber: '12' }),
		openmaptiles: f('housenumber', { housenumber: '12' }),
		protomaps: f('buildings', { kind: 'address', addr_housenumber: '12' }),
	}),
	probe(
		'poi-amenity',
		'symbol',
		19,
		{
			shortbread: f('pois', { amenity: 'restaurant' }),
			openmaptiles: f('poi', { class: 'restaurant', subclass: 'restaurant' }, { layer: 'poi' }),
			protomaps: f('pois', { kind: 'restaurant' }, { layer: 'poi' }),
		},
		{
			// A shop, a hotel and a park are three `class` values in OpenMapTiles and three layers in the
			// target — all drawn in the one `labelPoi` colour. A style that tells them apart has to be
			// asked about each, or the difference is never read.
			openmaptiles: [
				f('poi', { class: 'shop', subclass: 'supermarket' }, { layer: 'poi' }),
				f('poi', { class: 'lodging', subclass: 'hotel' }, { layer: 'poi' }),
				f('poi', { class: 'park', subclass: 'park' }, { layer: 'poi' }),
			],
		}
	),
	probe('symbol-transit-bus', 'symbol', 17, {
		shortbread: f('public_transport', { kind: 'bus_stop' }),
		openmaptiles: f('poi', { class: 'bus', subclass: 'bus_stop' }),
		protomaps: f('pois', { kind: 'bus_stop' }),
	}),
];

/** Every probe, with its Mapbox feature added where Mapbox's tiles have one. */
export const PROBES: readonly Probe[] = SCHEMA_PROBES.map((base) => {
	const feature = MAPBOX[base.id];
	if (!feature) return base;
	const variants = MAPBOX_VARIANTS[base.id];
	const own = probe(base.id, base.kind, base.zoom, { mapbox: feature }, variants && { mapbox: variants });
	return {
		...base,
		features: { ...base.features, ...own.features },
		...((base.variants || own.variants) && { variants: { ...base.variants, ...own.variants } }),
	};
});
