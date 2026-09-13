/**
 * The places this repo samples real tiles at — shared by `npm run schema-values`, which reads their
 * field values, and `npm run schema-compare`, which renders them in all three schemas.
 *
 * Chosen to exercise different class vocabularies rather than to be representative of anything: low
 * zooms for the classes that only exist there, cities for the built environment, and deliberate
 * extremes (ice, desert, polder) for the natural classes a European city tile will never contain. `z` is
 * the zoom `schema-values` samples a place at; the comparison renders each place at several.
 */
export type SamplePlace = { name: string; z: number; lon: number; lat: number };

export const SAMPLE_PLACES: readonly SamplePlace[] = [
	{ name: 'world', z: 2, lon: 10, lat: 50 },
	{ name: 'europe', z: 5, lon: 10, lat: 50 },
	{ name: 'greenland-ice', z: 6, lon: -45, lat: 72 },
	{ name: 'alps', z: 10, lon: 7.7, lat: 45.9 },
	{ name: 'nevada-desert', z: 10, lon: -115.5, lat: 37.0 },
	{ name: 'berlin', z: 14, lon: 13.4, lat: 52.52 },
	{ name: 'amsterdam', z: 14, lon: 4.9, lat: 52.37 },
	{ name: 'london', z: 14, lon: -0.12, lat: 51.5 },
	{ name: 'new-york', z: 14, lon: -74.0, lat: 40.71 },
	{ name: 'tokyo', z: 14, lon: 139.7, lat: 35.69 },
	{ name: 'black-forest', z: 13, lon: 8.2, lat: 48.5 },
	{ name: 'dutch-polder', z: 13, lon: 5.5, lat: 52.6 },
	// Feature-specific spots, added because the twelve above covered their layers too thinly to write a
	// filter from — `aeroway` had seven features in total, none of them a taxiway. A sample is only
	// evidence for what it contains, so when a module's layer comes up thin, extend this list rather than
	// fall back to the published schema.
	{ name: 'schiphol-airport', z: 13, lon: 4.76, lat: 52.31 },
	{ name: 'jfk-airport', z: 13, lon: -73.78, lat: 40.64 },
	{ name: 'rotterdam-port', z: 13, lon: 4.36, lat: 51.91 },
	{ name: 'hoover-dam', z: 14, lon: -114.737, lat: 36.016 },
	// A ski resort: the only place aerialways and funiculars occur in any number.
	{ name: 'zermatt-lifts', z: 13, lon: 7.748, lat: 46.02 },
];

export function samplePlace(name: string): SamplePlace {
	const place = SAMPLE_PLACES.find((p) => p.name === name);
	if (!place) throw new Error(`sample-places: unknown place "${name}"`);
	return place;
}

/** Slippy-map tile containing a coordinate. */
export function tileOf(z: number, lon: number, lat: number): { z: number; x: number; y: number } {
	const n = 2 ** z;
	const x = Math.floor(((lon + 180) / 360) * n);
	const rad = (lat * Math.PI) / 180;
	const y = Math.floor(((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n);
	return { z, x, y };
}
