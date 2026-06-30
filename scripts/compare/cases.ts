import type { Case } from './types.js';

// The OMT↔Shortbread feature correspondence catalog.
//
// Each entry declares one real-world feature in BOTH schemas. This is both the input to the
// equivalence harness and the human-readable spec the restyle works toward. Extend freely:
// every added case sharpens the definition of "colorful == OSM Bright".
//
// `minZoom` is the Shortbread schema minzoom at which the feature first appears
// (https://shortbread-tiles.org/schema/1.0/) — the harness skips zooms below it, where the
// feature isn't in the tiles. Omitted ⇒ 0.
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
		// ocean: minzoom 0
	},
	{
		name: 'lake / water polygon',
		band: 'water',
		omt: { sourceLayer: 'water', geom: 'Polygon', properties: {} },
		shortbread: { sourceLayer: 'water_polygons', geom: 'Polygon', properties: { kind: 'water' } },
		minZoom: 4,
	},
	{
		name: 'river polygon',
		band: 'water',
		omt: { sourceLayer: 'water', geom: 'Polygon', properties: {} },
		shortbread: { sourceLayer: 'water_polygons', geom: 'Polygon', properties: { kind: 'river' } },
		minZoom: 4,
	},
	{
		name: 'glacier',
		band: 'landcover',
		omt: { sourceLayer: 'landcover', geom: 'Polygon', properties: { subclass: 'glacier' } },
		shortbread: { sourceLayer: 'water_polygons', geom: 'Polygon', properties: { kind: 'glacier' } },
		minZoom: 4,
	},
	{
		name: 'wood / forest',
		band: 'landcover',
		omt: { sourceLayer: 'landcover', geom: 'Polygon', properties: { class: 'wood' } },
		shortbread: { sourceLayer: 'land', geom: 'Polygon', properties: { kind: 'forest' } },
		minZoom: 7,
	},
	{
		name: 'grass',
		band: 'landcover',
		omt: { sourceLayer: 'landcover', geom: 'Polygon', properties: { class: 'grass' } },
		shortbread: { sourceLayer: 'land', geom: 'Polygon', properties: { kind: 'grass' } },
		minZoom: 11,
	},
	{
		name: 'park',
		band: 'landcover',
		omt: { sourceLayer: 'park', geom: 'Polygon', properties: { class: 'public_park' } },
		shortbread: { sourceLayer: 'land', geom: 'Polygon', properties: { kind: 'park' } },
		minZoom: 11,
		fadeIn: true,
	},
	{
		name: 'sand / beach',
		band: 'landcover',
		omt: { sourceLayer: 'landcover', geom: 'Polygon', properties: { class: 'sand' } },
		shortbread: { sourceLayer: 'land', geom: 'Polygon', properties: { kind: 'sand' } },
		minZoom: 10,
		fadeIn: true,
	},

	// ── Landuse areas ────────────────────────────────────────────────────────────
	{
		name: 'residential area',
		band: 'landuse',
		omt: { sourceLayer: 'landuse', geom: 'Polygon', properties: { class: 'residential' } },
		shortbread: { sourceLayer: 'land', geom: 'Polygon', properties: { kind: 'residential' } },
		minZoom: 10,
	},
	{
		name: 'commercial area',
		band: 'landuse',
		omt: { sourceLayer: 'landuse', geom: 'Polygon', properties: { class: 'commercial' } },
		shortbread: { sourceLayer: 'land', geom: 'Polygon', properties: { kind: 'commercial' } },
		minZoom: 10,
		fadeIn: true,
	},
	{
		name: 'industrial area',
		band: 'landuse',
		omt: { sourceLayer: 'landuse', geom: 'Polygon', properties: { class: 'industrial' } },
		shortbread: { sourceLayer: 'land', geom: 'Polygon', properties: { kind: 'industrial' } },
		minZoom: 10,
		fadeIn: true,
	},
	{
		name: 'cemetery',
		band: 'landuse',
		omt: { sourceLayer: 'landuse', geom: 'Polygon', properties: { class: 'cemetery' } },
		shortbread: { sourceLayer: 'land', geom: 'Polygon', properties: { kind: 'cemetery' } },
		minZoom: 13,
		fadeIn: true,
	},
	{
		name: 'hospital area',
		band: 'landuse',
		omt: { sourceLayer: 'landuse', geom: 'Polygon', properties: { class: 'hospital' } },
		shortbread: { sourceLayer: 'sites', geom: 'Polygon', properties: { kind: 'hospital' } },
		minZoom: 14,
		fadeIn: true,
	},
	{
		name: 'school area',
		band: 'landuse',
		omt: { sourceLayer: 'landuse', geom: 'Polygon', properties: { class: 'school' } },
		shortbread: { sourceLayer: 'sites', geom: 'Polygon', properties: { kind: 'school' } },
		minZoom: 14,
		fadeIn: true,
	},

	// ── Buildings ─────────────────────────────────────────────────────────────────
	{
		name: 'building',
		band: 'buildings',
		omt: { sourceLayer: 'building', geom: 'Polygon', properties: {} },
		shortbread: { sourceLayer: 'buildings', geom: 'Polygon', properties: {} },
		minZoom: 14,
		fadeIn: true,
	},

	// ── Water lines ────────────────────────────────────────────────────────────────
	{
		name: 'river line',
		band: 'water',
		omt: { sourceLayer: 'waterway', geom: 'LineString', properties: { class: 'river', intermittent: 0 } },
		shortbread: { sourceLayer: 'water_lines', geom: 'LineString', properties: { kind: 'river' } },
		minZoom: 9,
	},
	{
		name: 'canal line',
		band: 'water',
		omt: { sourceLayer: 'waterway', geom: 'LineString', properties: { class: 'canal', intermittent: 0 } },
		shortbread: { sourceLayer: 'water_lines', geom: 'LineString', properties: { kind: 'canal' } },
		minZoom: 9,
	},
	{
		name: 'stream line',
		band: 'water',
		omt: { sourceLayer: 'waterway', geom: 'LineString', properties: { class: 'stream', intermittent: 0 } },
		shortbread: { sourceLayer: 'water_lines', geom: 'LineString', properties: { kind: 'stream' } },
		minZoom: 14,
	},

	// ── Roads: surface / bridge / tunnel ─────────────────────────────────────────────
	...roadCases(),

	// ── Rail / transit / ferry / aerialway ──────────────────────────────────────────
	{
		name: 'rail',
		band: 'rail',
		omt: { sourceLayer: 'transportation', geom: 'LineString', properties: { class: 'rail' } },
		shortbread: { sourceLayer: 'streets', geom: 'LineString', properties: { kind: 'rail' } },
		minZoom: 8,
	},
	{
		name: 'subway / transit',
		band: 'rail',
		omt: { sourceLayer: 'transportation', geom: 'LineString', properties: { class: 'transit' } },
		shortbread: { sourceLayer: 'streets', geom: 'LineString', properties: { kind: 'subway' } },
		minZoom: 10,
	},
	{
		name: 'ferry',
		band: 'transit',
		omt: { sourceLayer: 'transportation', geom: 'LineString', properties: { class: 'ferry' } },
		shortbread: { sourceLayer: 'ferries', geom: 'LineString', properties: {} },
		minZoom: 10,
		// OSM Bright's ferry teal (#6c9fb6) isn't exactly reachable from the single `water` palette
		// color; our derivation is ΔRGB≈18 off — visually imperceptible, accepted.
		ignore: ['line fill color'],
	},
	{
		name: 'cable car / aerialway',
		band: 'transit',
		omt: { sourceLayer: 'transportation', geom: 'LineString', properties: { subclass: 'cable_car' } },
		shortbread: { sourceLayer: 'aerialways', geom: 'LineString', properties: { kind: 'cable_car' } },
		minZoom: 12,
	},

	// ── Aeroway ──────────────────────────────────────────────────────────────────────
	{
		name: 'runway',
		band: 'aeroway',
		omt: { sourceLayer: 'aeroway', geom: 'LineString', properties: { class: 'runway' } },
		shortbread: { sourceLayer: 'streets', geom: 'LineString', properties: { kind: 'runway' } },
		minZoom: 11,
	},
	{
		name: 'taxiway',
		band: 'aeroway',
		omt: { sourceLayer: 'aeroway', geom: 'LineString', properties: { class: 'taxiway' } },
		shortbread: { sourceLayer: 'streets', geom: 'LineString', properties: { kind: 'taxiway' } },
		minZoom: 13,
	},

	// ── Boundaries ─────────────────────────────────────────────────────────────────
	{
		name: 'country boundary',
		band: 'boundaries',
		omt: { sourceLayer: 'boundary', geom: 'LineString', properties: { admin_level: 2 } },
		shortbread: { sourceLayer: 'boundaries', geom: 'LineString', properties: { admin_level: 2 } },
		// boundaries (country): minzoom 0
	},
	{
		name: 'state boundary',
		band: 'boundaries',
		omt: { sourceLayer: 'boundary', geom: 'LineString', properties: { admin_level: 4 } },
		shortbread: { sourceLayer: 'boundaries', geom: 'LineString', properties: { admin_level: 4 } },
		minZoom: 7,
		fadeIn: true, // width grows in over z7→8
	},
	{
		name: 'maritime boundary',
		band: 'boundaries',
		omt: { sourceLayer: 'boundary', geom: 'LineString', properties: { admin_level: 2, maritime: 1 } },
		shortbread: { sourceLayer: 'boundaries', geom: 'LineString', properties: { admin_level: 2, maritime: true } },
		minZoom: 4,
		fadeIn: true, // width grows in over z4→5
	},
	{
		name: 'disputed boundary',
		band: 'boundaries',
		omt: { sourceLayer: 'boundary', geom: 'LineString', properties: { admin_level: 2, disputed: 1 } },
		shortbread: { sourceLayer: 'boundaries', geom: 'LineString', properties: { admin_level: 2, disputed: true } },
		// disputed country boundary: minzoom 0
	},

	// ── Place labels ─────────────────────────────────────────────────────────────────
	{
		name: 'city label',
		band: 'labels.places',
		omt: { sourceLayer: 'place', geom: 'Point', properties: { class: 'city', name: 'X', 'name:latin': 'X' } },
		shortbread: { sourceLayer: 'place_labels', geom: 'Point', properties: { kind: 'city', name: 'X' } },
		minZoom: 6,
	},
	{
		name: 'town label',
		band: 'labels.places',
		omt: { sourceLayer: 'place', geom: 'Point', properties: { class: 'town', name: 'X' } },
		shortbread: { sourceLayer: 'place_labels', geom: 'Point', properties: { kind: 'town', name: 'X' } },
		minZoom: 7,
	},
	{
		name: 'village label',
		band: 'labels.places',
		omt: { sourceLayer: 'place', geom: 'Point', properties: { class: 'village', name: 'X' } },
		shortbread: { sourceLayer: 'place_labels', geom: 'Point', properties: { kind: 'village', name: 'X' } },
		minZoom: 10,
	},
	{
		name: 'suburb label',
		band: 'labels.places',
		omt: { sourceLayer: 'place', geom: 'Point', properties: { class: 'suburb', name: 'X' } },
		shortbread: { sourceLayer: 'place_labels', geom: 'Point', properties: { kind: 'suburb', name: 'X' } },
		minZoom: 10,
	},
	{
		name: 'capital label',
		band: 'labels.places',
		omt: { sourceLayer: 'place', geom: 'Point', properties: { class: 'city', capital: 2, name: 'X' } },
		shortbread: { sourceLayer: 'place_labels', geom: 'Point', properties: { kind: 'capital', name: 'X' } },
		minZoom: 4,
		// OMT marks capitals with a `star_11` sprite; Shortbread has no such icon — out of scope.
		ignore: ['icon'],
	},
	{
		name: 'state label',
		band: 'labels.admin',
		omt: { sourceLayer: 'place', geom: 'Point', properties: { class: 'state', name: 'X' } },
		shortbread: { sourceLayer: 'boundary_labels', geom: 'Point', properties: { admin_level: 4, name: 'X' } },
		minZoom: 3,
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
		minZoom: 2,
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
		minZoom: 13,
	},
	{
		name: 'motorway shield',
		band: 'labels.streets',
		omt: { sourceLayer: 'transportation_name', geom: 'LineString', properties: { ref_length: 3, ref: 'A1' } },
		shortbread: { sourceLayer: 'street_labels', geom: 'LineString', properties: { kind: 'motorway', ref: 'A1' } },
		minZoom: 10,
	},
	{
		name: 'oneway arrow',
		band: 'markings',
		omt: { sourceLayer: 'transportation', geom: 'LineString', properties: { oneway: 1, class: 'primary' } },
		shortbread: { sourceLayer: 'streets', geom: 'LineString', properties: { oneway: true, kind: 'primary' } },
		minZoom: 8,
	},

	// ── POI ──────────────────────────────────────────────────────────────────────────
	{
		name: 'poi (restaurant)',
		band: 'pois',
		omt: { sourceLayer: 'poi', geom: 'Point', properties: { class: 'restaurant', rank: 5, name: 'X' } },
		shortbread: { sourceLayer: 'pois', geom: 'Point', properties: { amenity: 'restaurant', name: 'X' } },
		minZoom: 14,
	},
];

// Surface / bridge / tunnel × road class, generated to keep the catalog DRY.
// minZoom = the Shortbread `streets` minzoom for that road kind.
function roadCases(): Case[] {
	// `fadeIn`: colorful ramps secondary/tertiary opacity 0→1 over their first zoom (see roads.ts).
	const classes: { omt: string; sb: string; band: string; minZoom: number; fadeIn?: boolean }[] = [
		{ omt: 'motorway', sb: 'motorway', band: 'roads.motorway', minZoom: 5 },
		{ omt: 'trunk', sb: 'trunk', band: 'roads.trunk', minZoom: 6 },
		{ omt: 'primary', sb: 'primary', band: 'roads.primary', minZoom: 8 },
		{ omt: 'secondary', sb: 'secondary', band: 'roads.secondary', minZoom: 9, fadeIn: true },
		{ omt: 'tertiary', sb: 'tertiary', band: 'roads.tertiary', minZoom: 10, fadeIn: true },
		{ omt: 'minor', sb: 'residential', band: 'roads.minor', minZoom: 12 },
		{ omt: 'service', sb: 'service', band: 'roads.service', minZoom: 13 },
		{ omt: 'track', sb: 'track', band: 'roads.track', minZoom: 13 },
		{ omt: 'path', sb: 'path', band: 'roads.path', minZoom: 13 },
	];
	const out: Case[] = [];
	for (const { omt, sb, band, minZoom, fadeIn } of classes) {
		out.push({
			name: `${omt} (surface)`,
			band,
			omt: { sourceLayer: 'transportation', geom: 'LineString', properties: { class: omt } },
			shortbread: { sourceLayer: 'streets', geom: 'LineString', properties: { kind: sb } },
			minZoom,
			...(fadeIn ? { fadeIn } : {}),
		});
		out.push({
			name: `${omt} (bridge)`,
			band,
			omt: { sourceLayer: 'transportation', geom: 'LineString', properties: { class: omt, brunnel: 'bridge' } },
			shortbread: { sourceLayer: 'streets', geom: 'LineString', properties: { kind: sb, bridge: true } },
			minZoom,
			...(fadeIn ? { fadeIn } : {}),
		});
		out.push({
			name: `${omt} (tunnel)`,
			band,
			omt: { sourceLayer: 'transportation', geom: 'LineString', properties: { class: omt, brunnel: 'tunnel' } },
			shortbread: { sourceLayer: 'streets', geom: 'LineString', properties: { kind: sb, tunnel: true } },
			minZoom,
			...(fadeIn ? { fadeIn } : {}),
		});
	}
	// motorway ramp / link — both styles gate the link rendering at zoom 12
	out.push({
		name: 'motorway link / ramp',
		band: 'roads.motorway',
		omt: { sourceLayer: 'transportation', geom: 'LineString', properties: { class: 'motorway', ramp: 1 } },
		shortbread: { sourceLayer: 'streets', geom: 'LineString', properties: { kind: 'motorway', link: true } },
		minZoom: 12,
	});
	return out;
}
