import type { SchemaName } from '../lib/';

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
};

const f = (sourceLayer: string, props: ProbeFeature['props'] = {}, extra?: Partial<ProbeFeature>): ProbeFeature => ({
	sourceLayer,
	props,
	...extra,
});

function probe(id: string, kind: ProbeKind, zoom: number, features: Features): Probe {
	const normalized: Partial<Record<SchemaName, ProbeFeature[]>> = {};
	for (const [schema, list] of Object.entries(features) as [SchemaName, ProbeFeature | ProbeFeature[]][]) {
		normalized[schema] = (Array.isArray(list) ? list : [list]).map((feature) => ({
			...feature,
			props: {
				...DEFAULT_PROPS[schema][feature.sourceLayer],
				// labels are filtered on having a name
				...(kind === 'symbol' && { name: 'name' }),
				...feature.props,
			},
		}));
	}
	return { id, kind, zoom, features: normalized };
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

export const PROBES: readonly Probe[] = [
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
	probe('poi-amenity', 'symbol', 19, {
		shortbread: f('pois', { amenity: 'restaurant' }),
		openmaptiles: f('poi', { class: 'restaurant', subclass: 'restaurant' }, { layer: 'poi' }),
		protomaps: f('pois', { kind: 'restaurant' }, { layer: 'poi' }),
	}),
	probe('symbol-transit-bus', 'symbol', 17, {
		shortbread: f('public_transport', { kind: 'bus_stop' }),
		openmaptiles: f('poi', { class: 'bus', subclass: 'bus_stop' }),
		protomaps: f('pois', { kind: 'bus_stop' }),
	}),
];
