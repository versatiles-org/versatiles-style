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

vi.stubGlobal(
	'fetch',
	vi.fn(
		async () =>
			new Response(JSON.stringify(CANNED_TILEJSON), {
				status: 200,
				headers: { 'content-type': 'application/json' },
			})
	)
);
