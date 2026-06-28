import { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';
import { normalizeAttribution } from '../lib/utils.js';

const maxzoom = 14;

// The base style skeleton: version, metadata, glyph/sprite defaults and the Shortbread vector
// source. osm() overrides the glyph/sprite/tile URLs from resolved options and fills in `layers`.
export function getShortbreadTemplate(): StyleSpecification {
	return {
		version: 8,
		name: 'versatiles',
		metadata: {
			license: 'https://creativecommons.org/publicdomain/zero/1.0/',
		},
		glyphs: 'https://tiles.versatiles.org/assets/glyphs/{fontstack}/{range}.pbf',
		sprite: [{ id: 'basics', url: 'https://tiles.versatiles.org/assets/sprites/basics/sprites' }],
		sources: {
			'versatiles-shortbread': {
				attribution: normalizeAttribution(
					'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
				),
				tiles: ['https://tiles.versatiles.org/tiles/osm/{z}/{x}/{y}'],
				type: 'vector',
				scheme: 'xyz',
				bounds: [-180, -85.0511287798066, 180, 85.0511287798066],
				minzoom: 0,
				maxzoom,
			},
		},
		layers: [],
	};
}
