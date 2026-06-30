import type { Case } from './types.js';

// The OMT↔Shortbread feature correspondence catalog.
//
// Each entry declares one real-world feature in BOTH schemas. This is both the input to the
// equivalence harness and the human-readable spec the restyle works toward. Extend freely:
// every added case sharpens the definition of "colorful == OSM Bright".
//
// OMT props feed `style.osm-bright.json` (source-layers: landcover/landuse/water/waterway/
// transportation/building/boundary/place/poi/aeroway/transportation_name/…; keyed on
// class/subclass/brunnel/ramp/admin_level).
// Shortbread props feed the generated colorful style (source-layers: land/ocean/
// water_polygons/water_lines/streets/buildings/boundaries/place_labels/boundary_labels/
// street_labels/pois/…; keyed on kind + boolean bridge/tunnel/link).

export const CASES: Case[] = [
	// ── Background / land cover ──────────────────────────────────────────────────
	{
		name: 'ocean',
		band: 'landcover',
		omt: { sourceLayer: 'water', geom: 'Polygon', properties: {} },
		shortbread: { sourceLayer: 'ocean', geom: 'Polygon', properties: {} },
	},
	{
		name: 'lake / water polygon',
		band: 'water',
		omt: { sourceLayer: 'water', geom: 'Polygon', properties: {} },
		shortbread: { sourceLayer: 'water_polygons', geom: 'Polygon', properties: { kind: 'water' } },
	},
	{
		name: 'river polygon',
		band: 'water',
		omt: { sourceLayer: 'water', geom: 'Polygon', properties: {} },
		shortbread: { sourceLayer: 'water_polygons', geom: 'Polygon', properties: { kind: 'river' } },
	},
	{
		name: 'glacier',
		band: 'landcover',
		omt: { sourceLayer: 'landcover', geom: 'Polygon', properties: { subclass: 'glacier' } },
		shortbread: { sourceLayer: 'water_polygons', geom: 'Polygon', properties: { kind: 'glacier' } },
	},
	{
		name: 'wood / forest',
		band: 'landcover',
		omt: { sourceLayer: 'landcover', geom: 'Polygon', properties: { class: 'wood' } },
		shortbread: { sourceLayer: 'land', geom: 'Polygon', properties: { kind: 'forest' } },
	},
	{
		name: 'grass',
		band: 'landcover',
		omt: { sourceLayer: 'landcover', geom: 'Polygon', properties: { class: 'grass' } },
		shortbread: { sourceLayer: 'land', geom: 'Polygon', properties: { kind: 'grass' } },
	},
	{
		name: 'park',
		band: 'landcover',
		omt: { sourceLayer: 'park', geom: 'Polygon', properties: { class: 'public_park' } },
		shortbread: { sourceLayer: 'land', geom: 'Polygon', properties: { kind: 'park' } },
	},
	{
		name: 'sand / beach',
		band: 'landcover',
		omt: { sourceLayer: 'landcover', geom: 'Polygon', properties: { class: 'sand' } },
		shortbread: { sourceLayer: 'land', geom: 'Polygon', properties: { kind: 'sand' } },
	},

	// ── Landuse areas ────────────────────────────────────────────────────────────
	{
		name: 'residential area',
		band: 'landuse',
		omt: { sourceLayer: 'landuse', geom: 'Polygon', properties: { class: 'residential' } },
		shortbread: { sourceLayer: 'land', geom: 'Polygon', properties: { kind: 'residential' } },
	},
	{
		name: 'commercial area',
		band: 'landuse',
		omt: { sourceLayer: 'landuse', geom: 'Polygon', properties: { class: 'commercial' } },
		shortbread: { sourceLayer: 'land', geom: 'Polygon', properties: { kind: 'commercial' } },
	},
	{
		name: 'industrial area',
		band: 'landuse',
		omt: { sourceLayer: 'landuse', geom: 'Polygon', properties: { class: 'industrial' } },
		shortbread: { sourceLayer: 'land', geom: 'Polygon', properties: { kind: 'industrial' } },
	},
	{
		name: 'cemetery',
		band: 'landuse',
		omt: { sourceLayer: 'landuse', geom: 'Polygon', properties: { class: 'cemetery' } },
		shortbread: { sourceLayer: 'land', geom: 'Polygon', properties: { kind: 'cemetery' } },
	},
	{
		name: 'hospital area',
		band: 'landuse',
		omt: { sourceLayer: 'landuse', geom: 'Polygon', properties: { class: 'hospital' } },
		shortbread: { sourceLayer: 'sites', geom: 'Polygon', properties: { kind: 'hospital' } },
	},
	{
		name: 'school area',
		band: 'landuse',
		omt: { sourceLayer: 'landuse', geom: 'Polygon', properties: { class: 'school' } },
		shortbread: { sourceLayer: 'sites', geom: 'Polygon', properties: { kind: 'school' } },
	},

	// ── Buildings ─────────────────────────────────────────────────────────────────
	{
		name: 'building',
		band: 'buildings',
		omt: { sourceLayer: 'building', geom: 'Polygon', properties: {} },
		shortbread: { sourceLayer: 'buildings', geom: 'Polygon', properties: {} },
		zooms: [14, 15, 16, 18],
	},

	// ── Water lines ────────────────────────────────────────────────────────────────
	{
		name: 'river line',
		band: 'water',
		omt: { sourceLayer: 'waterway', geom: 'LineString', properties: { class: 'river', intermittent: 0 } },
		shortbread: { sourceLayer: 'water_lines', geom: 'LineString', properties: { kind: 'river' } },
	},
	{
		name: 'canal line',
		band: 'water',
		omt: { sourceLayer: 'waterway', geom: 'LineString', properties: { class: 'canal', intermittent: 0 } },
		shortbread: { sourceLayer: 'water_lines', geom: 'LineString', properties: { kind: 'canal' } },
	},
	{
		name: 'stream line',
		band: 'water',
		omt: { sourceLayer: 'waterway', geom: 'LineString', properties: { class: 'stream', intermittent: 0 } },
		shortbread: { sourceLayer: 'water_lines', geom: 'LineString', properties: { kind: 'stream' } },
	},

	// ── Roads: surface ──────────────────────────────────────────────────────────────
	...roadCases(),

	// ── Rail / transit / ferry / aerialway ──────────────────────────────────────────
	{
		name: 'rail',
		band: 'rail',
		omt: { sourceLayer: 'transportation', geom: 'LineString', properties: { class: 'rail' } },
		shortbread: { sourceLayer: 'streets', geom: 'LineString', properties: { kind: 'rail' } },
	},
	{
		name: 'subway / transit',
		band: 'rail',
		omt: { sourceLayer: 'transportation', geom: 'LineString', properties: { class: 'transit' } },
		shortbread: { sourceLayer: 'streets', geom: 'LineString', properties: { kind: 'subway' } },
	},
	{
		name: 'ferry',
		band: 'transit',
		omt: { sourceLayer: 'transportation', geom: 'LineString', properties: { class: 'ferry' } },
		shortbread: { sourceLayer: 'ferries', geom: 'LineString', properties: {} },
		zooms: [10, 12, 15],
		// OSM Bright's ferry teal (#6c9fb6) isn't exactly reachable from the single `water` palette
		// color; our derivation is ΔRGB≈18 off — visually imperceptible, accepted.
		ignore: ['line fill color'],
	},
	{
		name: 'cable car / aerialway',
		band: 'transit',
		omt: { sourceLayer: 'transportation', geom: 'LineString', properties: { subclass: 'cable_car' } },
		shortbread: { sourceLayer: 'aerialways', geom: 'LineString', properties: { kind: 'cable_car' } },
		zooms: [13, 15, 18],
	},

	// ── Aeroway ──────────────────────────────────────────────────────────────────────
	{
		name: 'runway',
		band: 'aeroway',
		omt: { sourceLayer: 'aeroway', geom: 'LineString', properties: { class: 'runway' } },
		shortbread: { sourceLayer: 'streets', geom: 'LineString', properties: { kind: 'runway' } },
		zooms: [12, 14, 16],
	},
	{
		name: 'taxiway',
		band: 'aeroway',
		omt: { sourceLayer: 'aeroway', geom: 'LineString', properties: { class: 'taxiway' } },
		shortbread: { sourceLayer: 'streets', geom: 'LineString', properties: { kind: 'taxiway' } },
		zooms: [13, 15, 17],
	},

	// ── Boundaries ─────────────────────────────────────────────────────────────────
	{
		name: 'country boundary',
		band: 'boundaries',
		omt: { sourceLayer: 'boundary', geom: 'LineString', properties: { admin_level: 2 } },
		shortbread: { sourceLayer: 'boundaries', geom: 'LineString', properties: { admin_level: 2 } },
		zooms: [2, 5, 8, 12],
	},
	{
		name: 'state boundary',
		band: 'boundaries',
		omt: { sourceLayer: 'boundary', geom: 'LineString', properties: { admin_level: 4 } },
		shortbread: { sourceLayer: 'boundaries', geom: 'LineString', properties: { admin_level: 4 } },
		zooms: [5, 8, 12],
	},
	{
		name: 'maritime boundary',
		band: 'boundaries',
		omt: { sourceLayer: 'boundary', geom: 'LineString', properties: { admin_level: 2, maritime: 1 } },
		shortbread: { sourceLayer: 'boundaries', geom: 'LineString', properties: { admin_level: 2, maritime: true } },
		zooms: [5, 8, 12],
	},
	{
		name: 'disputed boundary',
		band: 'boundaries',
		omt: { sourceLayer: 'boundary', geom: 'LineString', properties: { admin_level: 2, disputed: 1 } },
		shortbread: { sourceLayer: 'boundaries', geom: 'LineString', properties: { admin_level: 2, disputed: true } },
		zooms: [5, 8, 12],
	},

	// ── Place labels ─────────────────────────────────────────────────────────────────
	{
		name: 'city label',
		band: 'labels.places',
		omt: { sourceLayer: 'place', geom: 'Point', properties: { class: 'city', name: 'X', 'name:latin': 'X' } },
		shortbread: { sourceLayer: 'place_labels', geom: 'Point', properties: { kind: 'city', name: 'X' } },
		zooms: [7, 10, 12],
	},
	{
		name: 'town label',
		band: 'labels.places',
		omt: { sourceLayer: 'place', geom: 'Point', properties: { class: 'town', name: 'X' } },
		shortbread: { sourceLayer: 'place_labels', geom: 'Point', properties: { kind: 'town', name: 'X' } },
		zooms: [9, 12, 14],
	},
	{
		name: 'village label',
		band: 'labels.places',
		omt: { sourceLayer: 'place', geom: 'Point', properties: { class: 'village', name: 'X' } },
		shortbread: { sourceLayer: 'place_labels', geom: 'Point', properties: { kind: 'village', name: 'X' } },
		zooms: [11, 13, 15],
	},
	{
		name: 'suburb label',
		band: 'labels.places',
		omt: { sourceLayer: 'place', geom: 'Point', properties: { class: 'suburb', name: 'X' } },
		shortbread: { sourceLayer: 'place_labels', geom: 'Point', properties: { kind: 'suburb', name: 'X' } },
		zooms: [12, 14],
	},
	{
		name: 'capital label',
		band: 'labels.places',
		omt: { sourceLayer: 'place', geom: 'Point', properties: { class: 'city', capital: 2, name: 'X' } },
		shortbread: { sourceLayer: 'place_labels', geom: 'Point', properties: { kind: 'capital', name: 'X' } },
		zooms: [5, 8, 11],
		// OMT marks capitals with a `star_11` sprite; Shortbread has no such icon — out of scope.
		ignore: ['icon'],
	},
	{
		name: 'state label',
		band: 'labels.admin',
		omt: { sourceLayer: 'place', geom: 'Point', properties: { class: 'state', name: 'X' } },
		shortbread: { sourceLayer: 'boundary_labels', geom: 'Point', properties: { admin_level: 4, name: 'X' } },
		zooms: [5, 7],
	},
	{
		name: 'country label',
		band: 'labels.admin',
		omt: { sourceLayer: 'place', geom: 'Point', properties: { class: 'country', rank: 3, iso_a2: 'XX', name: 'X' } },
		shortbread: {
			sourceLayer: 'boundary_labels',
			geom: 'Point',
			properties: { admin_level: 2, way_area: 50000000, name: 'X' },
		},
		zooms: [3, 5],
	},

	// ── Street name labels / shields / markings ───────────────────────────────────────
	{
		name: 'street name (major road)',
		band: 'labels.streets',
		omt: {
			sourceLayer: 'transportation_name',
			geom: 'LineString',
			properties: { class: 'primary', name: 'X', 'name:latin': 'X' },
		},
		shortbread: { sourceLayer: 'street_labels', geom: 'LineString', properties: { kind: 'primary', name: 'X' } },
		zooms: [13, 15, 17],
	},
	{
		name: 'motorway shield',
		band: 'labels.streets',
		omt: { sourceLayer: 'transportation_name', geom: 'LineString', properties: { ref_length: 3, ref: 'A1' } },
		shortbread: { sourceLayer: 'street_labels', geom: 'LineString', properties: { kind: 'motorway', ref: 'A1' } },
		zooms: [14, 16, 18],
	},
	{
		name: 'oneway arrow',
		band: 'markings',
		omt: { sourceLayer: 'transportation', geom: 'LineString', properties: { oneway: 1, class: 'primary' } },
		shortbread: { sourceLayer: 'streets', geom: 'LineString', properties: { oneway: true, kind: 'primary' } },
		zooms: [16, 18],
	},

	// ── POI ──────────────────────────────────────────────────────────────────────────
	{
		name: 'poi (restaurant)',
		band: 'pois',
		omt: { sourceLayer: 'poi', geom: 'Point', properties: { class: 'restaurant', rank: 5, name: 'X' } },
		shortbread: { sourceLayer: 'pois', geom: 'Point', properties: { amenity: 'restaurant', name: 'X' } },
		zooms: [16, 18],
	},
];

// Surface / bridge / tunnel × road class, generated to keep the catalog DRY.
function roadCases(): Case[] {
	const classes: { omt: string; sb: string; band: string }[] = [
		{ omt: 'motorway', sb: 'motorway', band: 'roads.motorway' },
		{ omt: 'trunk', sb: 'trunk', band: 'roads.trunk' },
		{ omt: 'primary', sb: 'primary', band: 'roads.primary' },
		{ omt: 'secondary', sb: 'secondary', band: 'roads.secondary' },
		{ omt: 'tertiary', sb: 'tertiary', band: 'roads.tertiary' },
		{ omt: 'minor', sb: 'residential', band: 'roads.minor' },
		{ omt: 'service', sb: 'service', band: 'roads.service' },
		{ omt: 'track', sb: 'track', band: 'roads.track' },
		{ omt: 'path', sb: 'path', band: 'roads.path' },
	];
	const out: Case[] = [];
	for (const { omt, sb, band } of classes) {
		out.push({
			name: `${omt} (surface)`,
			band,
			omt: { sourceLayer: 'transportation', geom: 'LineString', properties: { class: omt } },
			shortbread: { sourceLayer: 'streets', geom: 'LineString', properties: { kind: sb } },
			zooms: [8, 12, 14, 16, 18],
		});
		out.push({
			name: `${omt} (bridge)`,
			band,
			omt: { sourceLayer: 'transportation', geom: 'LineString', properties: { class: omt, brunnel: 'bridge' } },
			shortbread: { sourceLayer: 'streets', geom: 'LineString', properties: { kind: sb, bridge: true } },
			zooms: [14, 16, 18],
		});
		out.push({
			name: `${omt} (tunnel)`,
			band,
			omt: { sourceLayer: 'transportation', geom: 'LineString', properties: { class: omt, brunnel: 'tunnel' } },
			shortbread: { sourceLayer: 'streets', geom: 'LineString', properties: { kind: sb, tunnel: true } },
			zooms: [14, 16, 18],
		});
	}
	// motorway ramp / link
	out.push({
		name: 'motorway link / ramp',
		band: 'roads.motorway',
		omt: { sourceLayer: 'transportation', geom: 'LineString', properties: { class: 'motorway', ramp: 1 } },
		shortbread: { sourceLayer: 'streets', geom: 'LineString', properties: { kind: 'motorway', link: true } },
		zooms: [13, 15, 17],
	});
	return out;
}
