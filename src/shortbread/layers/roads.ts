import type { FilterSpecification } from '@maplibre/maplibre-gl-style-spec';
import type { LayerContext } from '../context.js';
import type { MaplibreLayer, MaplibreLayerDefinition } from '../../types/index.js';
import { decorate, type StyleRules } from '../decorator.js';
import type { TaggedLayer } from '../build.js';

// Roads, paths, rail, aerialways and ferries.
//
// This is the one group whose styling is a deep wildcard cascade (tunnel/bridge/surface ×
// outline/fill/bridge-deck × type, with `*` rules that deliberately span many variants).
// Hand-inlining ~150 layers would be error-prone, so this module keeps the structure AND the
// rules colocated here and applies them with the shared cascade engine — exactly reproducing
// the original output while still owning everything road-related in one file.

// ── Layer structures (tunnel / surface / bridge levels + rail/aerialway/ferry) ──

function buildStructures(): MaplibreLayerDefinition[] {
	return (['tunnel', 'street', 'bridge'] as const).flatMap((c): MaplibreLayerDefinition[] => {
		let filter: FilterSpecification[];
		let prefix: string;
		let suffixes: string[];

		switch (c) {
			case 'tunnel':
				filter = [['==', ['get', 'tunnel'], true] as FilterSpecification];
				prefix = 'tunnel-';
				suffixes = [':outline', ''];
				break;
			case 'street':
				filter = [
					['!=', ['get', 'bridge'], true] as FilterSpecification,
					['!=', ['get', 'tunnel'], true] as FilterSpecification,
				];
				prefix = '';
				suffixes = [':outline', ''];
				break;
			case 'bridge':
				filter = [['==', ['get', 'bridge'], true] as FilterSpecification];
				prefix = 'bridge-';
				suffixes = [':bridge', ':outline', ''];
				break;
		}

		const results: MaplibreLayerDefinition[] = [];

		if (c === 'street') results.push({ id: 'bridge', type: 'fill', 'source-layer': 'bridges' });

		for (const suffix of suffixes) {
			if (suffix === ':outline')
				results.push({
					id: prefix + 'street-pedestrian-zone',
					type: 'fill',
					'source-layer': 'street_polygons',
					filter: ['all', ...filter, ['==', ['get', 'kind'], 'pedestrian']] as FilterSpecification,
				});

			for (const t of ['footway', 'steps', 'path', 'cycleway']) {
				results.push({
					id: prefix + 'way-' + t.replace(/_/g, '') + suffix,
					type: 'line',
					'source-layer': 'streets',
					filter: ['all', ...filter, ['==', ['get', 'kind'], t]] as FilterSpecification,
				});
			}

			for (const t of [
				'track',
				'pedestrian',
				'service',
				'living_street',
				'residential',
				'unclassified',
				'busway',
				'bus_guideway',
			]) {
				results.push({
					id: prefix + 'street-' + t.replace(/_/g, '') + suffix,
					type: 'line',
					'source-layer': 'streets',
					filter: ['all', ['==', ['get', 'kind'], t], ...filter] as FilterSpecification,
				});
			}

			if (suffix === '')
				for (const t of ['track', 'pedestrian', 'service', 'living_street', 'residential', 'unclassified']) {
					results.push({
						id: prefix + 'street-' + t.replace(/_/g, '') + '-bicycle',
						type: 'line',
						'source-layer': 'streets',
						filter: [
							'all',
							['==', ['get', 'kind'], t],
							['==', ['get', 'bicycle'], 'designated'],
							...filter,
						] as FilterSpecification,
					});
				}

			for (const t of ['tertiary', 'secondary', 'primary', 'trunk', 'motorway']) {
				results.push({
					id: prefix + 'street-' + t.replace(/_/g, '') + '-link' + suffix,
					type: 'line',
					'source-layer': 'streets',
					filter: ['all', ...filter, ['==', ['get', 'kind'], t], ['==', ['get', 'link'], true]] as FilterSpecification,
				});
			}

			for (const t of ['tertiary', 'secondary', 'primary', 'trunk', 'motorway']) {
				results.push({
					id: prefix + 'street-' + t.replace(/_/g, '') + suffix,
					type: 'line',
					'source-layer': 'streets',
					filter: ['all', ...filter, ['==', ['get', 'kind'], t], ['!=', ['get', 'link'], true]] as FilterSpecification,
				});
			}
		}

		for (const suffix of [':outline', ''] as const) {
			for (const t of ['tram', 'narrow_gauge', 'subway', 'light_rail', 'rail'].reverse()) {
				results.push({
					id: prefix + 'transport-' + t.replace(/_/g, '') + suffix,
					type: 'line',
					'source-layer': 'streets',
					filter: ['all', ['==', ['get', 'kind'], t], ['!', ['has', 'service']], ...filter] as FilterSpecification,
				});
				results.push({
					id: prefix + 'transport-' + t.replace(/_/g, '') + '-service' + suffix,
					type: 'line',
					'source-layer': 'streets',
					filter: ['all', ['==', ['get', 'kind'], t], ['has', 'service'], ...filter] as FilterSpecification,
				});
			}
			for (const t of ['monorail', 'funicular'].reverse()) {
				results.push({
					id: prefix + 'transport-' + t.replace(/_/g, '') + suffix,
					type: 'line',
					'source-layer': 'streets',
					filter: ['all', ['==', ['get', 'kind'], t], ...filter] as FilterSpecification,
				});
			}

			if (c === 'street') {
				for (const t of [
					'rope-tow',
					'platter',
					'j-bar',
					't-bar',
					'drag_lift',
					'chair_lift',
					'goods',
					'gondola',
					'cable_car',
				].reverse()) {
					results.push({
						id: 'aerialway-' + t.replace(/[_-]+/g, '') + suffix,
						type: 'line',
						'source-layer': 'aerialways',
						filter: ['all', ...filter, ['==', ['get', 'kind'], t]] as FilterSpecification,
					});
				}
				results.push({ id: 'transport-ferry' + suffix, type: 'line', 'source-layer': 'ferries' });
			}
		}

		return results;
	});
}

// ── Style rules (colocated) ────────────────────────────────────────────────────

function buildRules(ctx: LayerContext): StyleRules {
	const { c, bg, fg } = ctx;
	return {
		bridge: { color: c.land.blend(0.02, fg), fillAntialias: true, opacity: 0.8 },

		'{tunnel-,bridge-,}street-*:outline': { color: c.roadStreetBg, lineJoin: 'round' },
		'{tunnel-,bridge-,}street-*': { color: c.roadStreet, lineJoin: 'round' },
		'tunnel-street-*:outline': { color: c.roadStreet.blend(0.13, fg) },
		'tunnel-street-*': { color: c.roadStreet.blend(0.03, fg) },
		'bridge-street-*:outline': { color: c.roadStreet.blend(0.15, fg) },

		'{tunnel-,}{street,way}-*': { lineCap: 'round' },
		'{tunnel-,}{street,way}-*:outline': { lineCap: 'round' },
		'bridge-{street,way}-*': { lineCap: 'butt' },
		'bridge-{street,way}-*:outline': { lineCap: 'butt' },

		'bridge-{street,way}-*:bridge': {
			lineCap: 'butt',
			lineJoin: 'round',
			color: c.land.blend(0.02, fg),
			fillAntialias: true,
			opacity: 0.5,
		},
		'bridge-street-motorway:bridge': { size: { 5: 0, 6: 3, 10: 7, 14: 7, 16: 20, 18: 53, 19: 118, 20: 235 } },
		'bridge-street-trunk:bridge': { size: { 7: 0, 8: 3, 10: 6, 14: 8, 16: 17, 18: 50, 19: 104, 20: 202 } },
		'bridge-street-primary:bridge': { size: { 8: 0, 9: 1, 10: 6, 14: 8, 16: 17, 18: 50, 19: 104, 20: 202 } },
		'bridge-street-secondary:bridge': {
			size: { 11: 3, 14: 7, 16: 11, 18: 42, 19: 95, 20: 193 },
			opacity: { 11: 0, 12: 1 },
		},
		'bridge-street-motorway-link:bridge': { minzoom: 12, size: { 12: 3, 14: 4, 16: 10, 18: 20, 20: 56 } },
		'bridge-street-{trunk,primary,secondary}-link:bridge': {
			minzoom: 13,
			size: { 12: 3, 14: 4, 16: 10, 18: 20, 20: 56 },
		},
		'bridge-street-{tertiary,tertiary-link,unclassified,residential,livingstreet,pedestrian}*:bridge': {
			size: { 12: 3, 14: 4, 16: 8, 18: 36, 19: 90, 20: 179 },
			opacity: { 12: 0, 13: 1 },
		},
		'bridge-street-{service,track}:bridge': {
			size: { 14: 3, 16: 6, 18: 25, 19: 67, 20: 134 },
			opacity: { 14: 0, 15: 1 },
		},
		'bridge-way-*:bridge': { size: { 15: 0, 16: 7, 18: 10, 19: 17, 20: 31 }, minzoom: 15 },

		'{bridge-,}street-motorway{-link,}:outline': { color: c.roadMotorwayBg },
		'{bridge-,}street-motorway{-link,}': { color: c.roadMotorway },
		'{bridge-,}street-{trunk,primary,secondary}{-link,}:outline': { color: c.roadTrunkBg },
		'{bridge-,}street-{trunk,primary,secondary}{-link,}': { color: c.roadTrunk },
		'tunnel-street-motorway{-link,}:outline': { color: c.roadMotorwayBg.blend(0.05, bg), lineDasharray: [1, 0.3] },
		'tunnel-street-motorway{-link,}': { color: c.roadMotorway.blend(0.1, bg), lineCap: 'butt' },
		'tunnel-street-{trunk,primary,secondary}{-link,}:outline': {
			color: c.roadTrunkBg.blend(0.05, bg),
			lineDasharray: [1, 0.3],
		},
		'tunnel-street-{trunk,primary,secondary}{-link,}': { color: c.roadTrunk.blend(0.1, bg), lineCap: 'butt' },

		'{bridge-,tunnel-,}street-motorway:outline': {
			size: { 5: 0, 6: 2, 10: 5, 14: 5, 16: 14, 18: 38, 19: 84, 20: 168 },
		},
		'{bridge-,tunnel-,}street-motorway': {
			size: { 5: 0, 6: 1, 10: 4, 14: 4, 16: 12, 18: 36, 19: 80, 20: 160 },
			opacity: { 5: 0, 6: 1 },
		},
		'{bridge-,tunnel-,}street-trunk:outline': { size: { 6: 0, 7: 2, 10: 4, 14: 6, 16: 12, 18: 36, 19: 74, 20: 144 } },
		'{bridge-,tunnel-,}street-trunk': {
			size: { 6: 0, 7: 1, 10: 3, 14: 5, 16: 10, 18: 34, 19: 70, 20: 140 },
			opacity: { 6: 0, 7: 1 },
		},
		'{bridge-,tunnel-,}street-primary:outline': { size: { 8: 0, 9: 1, 10: 4, 14: 6, 16: 12, 18: 36, 19: 74, 20: 144 } },
		'{bridge-,tunnel-,}street-primary': {
			size: { 8: 0, 9: 2, 10: 3, 14: 5, 16: 10, 18: 34, 19: 70, 20: 140 },
			opacity: { 8: 0, 9: 1 },
		},
		'{bridge-,tunnel-,}street-secondary:outline': {
			size: { 11: 2, 14: 5, 16: 8, 18: 30, 19: 68, 20: 138 },
			opacity: { 11: 0, 12: 1 },
		},
		'{bridge-,tunnel-,}street-secondary': {
			size: { 11: 1, 14: 4, 16: 6, 18: 28, 19: 64, 20: 130 },
			opacity: { 11: 0, 12: 1 },
		},

		'{bridge-,tunnel-,}street-motorway-link:outline': { minzoom: 12, size: { 12: 2, 14: 3, 16: 7, 18: 14, 20: 40 } },
		'{bridge-,tunnel-,}street-motorway-link': { minzoom: 12, size: { 12: 1, 14: 2, 16: 5, 18: 12, 20: 38 } },
		'{bridge-,tunnel-,}street-{trunk,primary,secondary}-link:outline': {
			minzoom: 13,
			size: { 12: 2, 14: 3, 16: 7, 18: 14, 20: 40 },
		},
		'{bridge-,tunnel-,}street-{trunk,primary,secondary}-link': {
			minzoom: 13,
			size: { 12: 1, 14: 2, 16: 5, 18: 12, 20: 38 },
		},

		'{bridge-,tunnel-,}street-{tertiary,tertiary-link,unclassified,residential,livingstreet,pedestrian}*:outline': {
			size: { 12: 2, 14: 3, 16: 6, 18: 26, 19: 64, 20: 128 },
			opacity: { 12: 0, 13: 1 },
		},
		'{bridge-,tunnel-,}street-{tertiary,tertiary-link,unclassified,residential,livingstreet,pedestrian}*': {
			size: { 12: 1, 14: 2, 16: 5, 18: 24, 19: 60, 20: 120 },
			opacity: { 12: 0, 13: 1 },
		},

		'{bridge-,tunnel-,}street-track:outline': {
			size: { 14: 2, 16: 4, 18: 18, 19: 48, 20: 96 },
			opacity: { 14: 0, 15: 1 },
		},
		'{bridge-,tunnel-,}street-track': { size: { 14: 1, 16: 3, 18: 16, 19: 44, 20: 88 }, opacity: { 14: 0, 15: 1 } },

		'{bridge-,tunnel-,}street-{service,busway,busguideway}:outline': {
			size: { 14: 1, 16: 3, 18: 12, 19: 32, 20: 48 },
			opacity: { 15: 0, 16: 1 },
			color: c.roadStreetBg.blend(0.3, bg),
		},
		'{bridge-,tunnel-,}street-{service,busway,busguideway}': {
			size: { 14: 1, 16: 2, 18: 10, 19: 28, 20: 40 },
			opacity: { 15: 0, 16: 1 },
			color: c.roadStreet.blend(0.03, fg),
		},

		'{bridge-,tunnel-,}way-*:outline': { size: { 15: 0, 16: 5, 18: 7, 19: 12, 20: 22 }, minzoom: 15 },
		'{bridge-,tunnel-,}way-*': { size: { 15: 0, 16: 4, 18: 6, 19: 10, 20: 20 }, minzoom: 15 },
		'{bridge-,}way-{footway,path,steps}:outline': { color: c.transitFoot.blend(0.1, fg) },
		'{bridge-,}way-{footway,path,steps}': { color: c.transitFoot.blend(0.02, bg) },
		'tunnel-way-{footway,path,steps}:outline': { color: c.transitFoot.blend(0.1, fg).saturate(-0.5) },
		'tunnel-way-{footway,path,steps}': { color: c.transitFoot.blend(0.02, fg).saturate(-0.5), lineDasharray: [1, 0.2] },
		'{bridge-,}way-cycleway:outline': { color: c.transitCycle.blend(0.1, fg) },
		'{bridge-,}way-cycleway': { color: c.transitCycle },
		'tunnel-way-cycleway:outline': { color: c.transitCycle.blend(0.1, fg).saturate(-0.5) },
		'tunnel-way-cycleway': { color: c.transitCycle.blend(0.02, fg).saturate(-0.5), lineDasharray: [1, 0.2] },

		'{bridge-,tunnel-,}street-{tertiary,tertiary-link,unclassified,residential,livingstreet,pedestrian}-bicycle': {
			lineJoin: 'round',
			lineCap: 'round',
			color: c.transitCycle,
		},

		'street-pedestrian': {
			size: { 12: 1, 14: 2, 16: 5, 18: 24, 19: 60, 20: 120 },
			opacity: { 13: 0, 14: 1 },
			color: c.transitFoot,
		},
		'street-pedestrian-zone': { color: c.transitFoot.blend(0.02, bg).fade(0.75), opacity: { 14: 0, 15: 1 } },

		'{tunnel-,bridge-,}transport-{rail,lightrail}:outline': {
			color: c.transitRail,
			minzoom: 8,
			size: { 8: 1, 13: 1, 15: 1, 20: 14 },
		},
		'{tunnel-,bridge-,}transport-{rail,lightrail}': {
			color: c.transitRail.blend(0.25, bg),
			minzoom: 14,
			size: { 14: 0, 15: 1, 20: 10 },
			lineDasharray: [2, 2],
		},
		'{tunnel-,bridge-,}transport-{rail,lightrail}-service:outline': {
			color: c.transitRail,
			minzoom: 14,
			size: { 14: 0, 15: 1, 16: 1, 20: 14 },
		},
		'{tunnel-,bridge-,}transport-{rail,lightrail}-service': {
			color: c.transitRail.blend(0.25, bg),
			minzoom: 15,
			size: { 15: 0, 16: 1, 20: 10 },
			lineDasharray: [2, 2],
		},

		'{tunnel-,bridge-,}transport-subway:outline': {
			color: c.transitSubway,
			size: { 11: 0, 12: 1, 15: 3, 16: 3, 18: 6, 19: 8, 20: 10 },
		},
		'{tunnel-,bridge-,}transport-subway': {
			color: c.transitSubway.blend(0.25, bg),
			size: { 11: 0, 12: 1, 15: 2, 16: 2, 18: 5, 19: 6, 20: 8 },
			lineDasharray: [2, 2],
		},

		'{tunnel-,bridge-,}transport-{tram,narrowgauge,funicular,monorail}:outline': {
			minzoom: 15,
			color: c.transitRail,
			size: { 15: 0, 16: 5, 18: 7, 20: 20 },
			lineDasharray: [0.1, 0.5],
		},
		'{tunnel-,bridge-,}transport-{tram,narrowgauge,funicular,monorail}': {
			minzoom: 13,
			size: { 13: 0, 16: 1, 17: 2, 18: 3, 20: 5 },
			color: c.transitRail,
		},

		'{bridge-,}transport-rail:outline': { opacity: { 8: 0, 9: 1 } },
		'{bridge-,}transport-rail': { opacity: { 14: 0, 15: 1 } },
		'{bridge-,}transport-{lightrail,subway}:outline': { opacity: { 11: 0, 12: 1 } },
		'{bridge-,}transport-{lightrail,subway}': { opacity: { 14: 0, 15: 1 } },

		'tunnel-transport-rail:outline': { opacity: { 8: 0, 9: 0.3 } },
		'tunnel-transport-rail': { opacity: { 14: 0, 15: 0.3 } },
		'tunnel-transport-{lightrail,subway}:outline': { opacity: { 11: 0, 12: 0.5 } },
		'tunnel-transport-{lightrail,subway}': { opacity: { 14: 0, 15: 1 } },

		'transport-ferry': {
			minzoom: 10,
			color: c.water.blend(0.1, fg),
			size: { 10: 1, 13: 2, 14: 3, 16: 4, 17: 6 },
			opacity: { 10: 0, 11: 1 },
			lineDasharray: [1, 1],
		},
	} as unknown as StyleRules;
}

// ── Group tagging (mirrors the old groups.ts road membership) ──────────────────

function roadGroup(id: string): string | undefined {
	if (id.startsWith('aerialway-')) return 'transit.aerialways';
	const s = id.replace(/^(tunnel-|bridge-)/, '');
	if (s.startsWith('transport-ferry')) return 'transit.ferries';
	if (s.startsWith('transport-')) return 'transit.rail';
	if (id === 'bridge') return 'roads.motorways';
	if (s.startsWith('way-')) return 'roads.paths';
	if (s.startsWith('street-')) {
		let t = s.slice('street-'.length).replace(/(:outline|:bridge)$/, '');
		t = t.replace(/-(link|bicycle|zone)$/, '');
		switch (t) {
			case 'motorway':
			case 'trunk':
				return 'roads.motorways';
			case 'primary':
			case 'secondary':
			case 'tertiary':
				return 'roads.highways';
			case 'residential':
			case 'livingstreet':
			case 'unclassified':
				return 'roads.streets.residential';
			case 'service':
				return 'roads.streets.service';
			case 'pedestrian':
				return 'roads.streets.pedestrian';
			case 'track':
				return 'roads.streets.track';
			case 'busway':
			case 'busguideway':
				return 'roads.streets.bus';
		}
	}
	return undefined;
}

export function* roads(ctx: LayerContext): Generator<TaggedLayer> {
	const structures = buildStructures() as MaplibreLayer[];
	// decorate mutates matched layers in place; we keep ALL structures (unstyled aerialways etc.).
	decorate(structures, buildRules(ctx));
	for (const layer of structures) {
		yield { layer, group: roadGroup(layer.id) };
	}
}
