import { vi } from 'vitest';

// Style generation now downloads TileJSON documents (any `*.json` source URL) at build
// time. Unit tests must stay offline and deterministic, so we stub the global `fetch`
// with a canned TileJSON whose `tiles[]` are relative — exercising the relative-path
// rewrite that resolves them against the fetched document URL.
//
// Tests that need to assert fetch behaviour can pass an explicit `fetch` option to
// osm()/satellite()/guessStyle() (or re-stub the global), bypassing this default.
const CANNED_TILEJSON = {
	tilejson: '3.0.0',
	tiles: ['{z}/{x}/{y}'],
	minzoom: 0,
	maxzoom: 14,
};

// `inlineSources` now rejects a vector source whose TileJSON lists no `vector_layers`, so one
// canned document can no longer stand in for every URL: served to the OSM source, a raster-shaped
// TileJSON is exactly the mismatch that check exists to catch. Vector-ness is keyed off the URL,
// which is how the real endpoints differ — `/tiles/osm-vector/` and `/tiles/landcover-vector/` are the
// vector tilesets, elevation and satellite are raster.
function cannedTileJSON(url: string): Record<string, unknown> {
	if (url.includes('/osm-vector/')) {
		return { ...CANNED_TILEJSON, vector_layers: [{ id: 'water_polygons', fields: {} }] };
	}
	if (url.includes('/landcover-vector/')) {
		return { ...CANNED_TILEJSON, maxzoom: 10, vector_layers: [{ id: 'landcover', fields: { kind: 'String' } }] };
	}
	return CANNED_TILEJSON;
}

vi.stubGlobal(
	'fetch',
	vi.fn(async (input: RequestInfo | URL) => {
		const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
		return new Response(JSON.stringify(cannedTileJSON(url)), {
			status: 200,
			headers: { 'content-type': 'application/json' },
		});
	})
);
