import { SAMPLE_PLACES, samplePlace } from '../lib/sample-places.js';
import { seededRandom } from '../../src/migrate/math.js';

/**
 * What the schema comparison renders: sample places at several zooms each.
 *
 * One zoom per place would test each place only where `schema-values` happened to sample it. The
 * schemas differ most at the edges of their zoom ranges — a kind that appears two levels later, a
 * source-layer that stops at z14 in one tileset and z15 in another — so every band is covered, from the
 * world view to overzoom.
 */

export type View = {
	/** Stable id, used for file names and as the baseline key: `<place>-z<zoom>`. */
	id: string;
	place: string;
	center: [number, number];
	zoom: number;
};

export const WIDTH = 512;
export const HEIGHT = 512;

const view = (place: string, zoom: number): View => {
	const { lon, lat } = samplePlace(place);
	return { id: `${place}-z${zoom}`, place, center: [lon, lat], zoom };
};

export const VIEWS: readonly View[] = [
	// z2–4: ocean, country borders and labels, low-zoom land
	view('world', 2),
	view('europe', 4),
	// z6–8: states, cities, motorways, large water, ice
	view('europe', 6),
	view('greenland-ice', 6),
	view('alps', 8),
	// z10–12: land use, rivers, rail, towns
	view('alps', 10),
	view('alps', 12),
	view('nevada-desert', 10),
	view('black-forest', 11),
	view('dutch-polder', 12),
	view('berlin', 10),
	// z13–14: streets, buildings, sites, airports, harbours, lifts
	view('berlin', 14),
	view('amsterdam', 14),
	view('london', 13),
	view('new-york', 14),
	view('tokyo', 14),
	view('black-forest', 13),
	view('schiphol-airport', 13),
	view('jfk-airport', 13),
	view('rotterdam-port', 13),
	view('hoover-dam', 14),
	view('zermatt-lifts', 13),
	// z15–16: footways, bridges and tunnels, addresses, one-way markings
	view('berlin', 16),
	view('amsterdam', 16),
	view('london', 15),
	view('new-york', 16),
	view('tokyo', 16),
	view('schiphol-airport', 15),
	view('hoover-dam', 16),
	view('zermatt-lifts', 15),
	// z17: overzoom, where the tilesets' maximum zooms differ
	view('berlin', 17),
	view('new-york', 17),
];

/**
 * Views at random zooms near random sample places, for what the curated list misses. Seeded, so a
 * view that shows a problem can be rendered again.
 */
export function randomViews(count: number, seed: number): View[] {
	const random = seededRandom(seed);
	return Array.from({ length: count }, (_, i) => {
		const place = SAMPLE_PLACES[Math.floor(random() * SAMPLE_PLACES.length)];
		const zoom = 3 + Math.floor(random() * 15);
		// up to half a screen off the place, so the same place gives different pictures
		const degrees = (360 / 2 ** zoom) * (WIDTH / 512) * 0.5;
		const lon = place.lon + (random() - 0.5) * degrees;
		const lat = Math.max(
			-80,
			Math.min(80, place.lat + (random() - 0.5) * degrees * Math.cos((place.lat * Math.PI) / 180))
		);
		return { id: `random-${seed}-${i}-${place.name}-z${zoom}`, place: place.name, center: [lon, lat], zoom };
	});
}

export type TileCoord = { z: number; x: number; y: number };

/**
 * The tiles a MapLibre render of `view` asks a vector source for.
 *
 * Vector tiles are 512 px, and MapLibre covers a viewport with tiles of the zoom level it is at, rounded
 * down and clamped to the source's range — above `maxzoom` it overzooms the last level. `buffer` adds a
 * margin in pixels, because labels near the edge are placed from neighbouring tiles.
 */
export function tilesForView(
	view: View,
	source: { minzoom: number; maxzoom: number },
	{ width = WIDTH, height = HEIGHT, buffer = 128 } = {}
): TileCoord[] {
	const z = Math.max(source.minzoom, Math.min(source.maxzoom, Math.floor(view.zoom)));
	const worldSize = 512 * 2 ** view.zoom;
	const [lon, lat] = view.center;
	const cx = ((lon + 180) / 360) * worldSize;
	const rad = (lat * Math.PI) / 180;
	const cy = ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * worldSize;

	const tileSize = 512 * 2 ** (view.zoom - z);
	const n = 2 ** z;
	const x0 = Math.floor((cx - width / 2 - buffer) / tileSize);
	const x1 = Math.floor((cx + width / 2 + buffer) / tileSize);
	const y0 = Math.max(0, Math.floor((cy - height / 2 - buffer) / tileSize));
	const y1 = Math.min(n - 1, Math.floor((cy + height / 2 + buffer) / tileSize));

	const tiles = new Map<string, TileCoord>();
	for (let x = x0; x <= x1; x++) {
		const wrapped = ((x % n) + n) % n; // the world repeats east–west
		for (let y = y0; y <= y1; y++) tiles.set(`${wrapped}/${y}`, { z, x: wrapped, y });
	}
	return [...tiles.values()];
}
