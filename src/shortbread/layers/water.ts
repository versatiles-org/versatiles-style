import type { FilterSpecification } from '@maplibre/maplibre-gl-style-spec';
import type { LayerContext } from '../context.js';
import * as b from '../build.js';

// Inland water: rivers/canals/streams/ditches (lines), water polygons, dams and piers.
// These sit ABOVE the land fills (which is why ocean lives in the landcover band instead).

// OSM Bright waterway line widths (base ~1.2–1.3). river is wider and starts earlier.
const LINE_SIZES: Record<string, b.ExpStops> = {
	river: { base: 1.2, stops: { 10: 0.8, 20: 6 } },
	canal: { base: 1.3, stops: { 13: 0.5, 20: 6 } },
	stream: { base: 1.3, stops: { 13: 0.5, 20: 6 } },
	ditch: { base: 1.3, stops: { 13: 0.5, 20: 2 } },
};

export function* water(ctx: LayerContext): Generator<b.TaggedLayer> {
	const { c, fg } = ctx;
	// OSM Bright draws waterway lines in a slightly deeper blue than the water fill (#a0c8f0).
	// Blend toward `fg` (pure black in light mode / white in dark mode) instead of an absolute
	// darken, so the line stays a contrasting deeper tone in both light and dark palettes.
	const waterLine = c.water.saturate(0.5).blend(0.07, fg);
	const pierKinds: FilterSpecification = ['in', ['get', 'kind'], ['literal', ['pier', 'breakwater', 'groyne']]];

	const layers: b.TaggedLayer[] = [
		// flowing water (lines)
		...(['river', 'canal', 'stream', 'ditch'] as const).map((kind) =>
			b.line('water-' + kind, {
				sourceLayer: 'water_lines',
				filter: [
					'all',
					['==', ['get', 'kind'], kind],
					['!=', ['get', 'tunnel'], true],
					['!=', ['get', 'bridge'], true],
				],
				color: waterLine,
				lineCap: 'round',
				lineJoin: 'round',
				size: LINE_SIZES[kind],
				group: 'water.rivers',
			})
		),
		// water polygons (OSM Bright renders water at full opacity, no zoom fade-in)
		b.fill('water-area', {
			sourceLayer: 'water_polygons',
			filter: ['==', ['get', 'kind'], 'water'],
			color: c.water,
			group: 'water.lakes',
		}),
		b.fill('water-area-river', {
			sourceLayer: 'water_polygons',
			filter: ['==', ['get', 'kind'], 'river'],
			color: c.water,
			group: 'water.rivers',
		}),
		b.fill('water-area-small', {
			sourceLayer: 'water_polygons',
			filter: ['in', ['get', 'kind'], ['literal', ['reservoir', 'basin', 'dock']]],
			color: c.water,
			group: 'water.lakes',
		}),
		// dam
		b.fill('water-dam-area', {
			sourceLayer: 'dam_polygons',
			filter: ['==', ['get', 'kind'], 'dam'],
			color: c.land,
			opacity: { 12: 0, 13: 1 },
			group: 'water.piers',
		}),
		b.line('water-dam', {
			sourceLayer: 'dam_lines',
			filter: ['==', ['get', 'kind'], 'dam'],
			color: c.water,
			lineCap: 'round',
			lineJoin: 'round',
			group: 'water.piers',
		}),
		// pier
		b.fill('water-pier-area', {
			sourceLayer: 'pier_polygons',
			filter: pierKinds,
			color: c.land,
			opacity: { 12: 0, 13: 1 },
			group: 'water.piers',
		}),
		b.line('water-pier', {
			sourceLayer: 'pier_lines',
			filter: pierKinds,
			color: c.land,
			lineCap: 'round',
			lineJoin: 'round',
			group: 'water.piers',
		}),
	];

	yield* b.gate(ctx.layers, ...layers);
}
