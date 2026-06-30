import { readFileSync } from 'fs';
import type { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';
import { osm } from '../../src/api/osm.js';
import { CASES } from './cases.js';
import type { Case } from './types.js';
import { evaluateStyle, backgroundColor } from './evaluate.js';
import { buildSignature, compare } from './signature.js';

// Core of the OMT↔Shortbread equivalence harness, shared by the CLI reporter (run.ts) and the
// e2e regression test. Generates the `colorful` style offline and compares every catalog case
// against style.osm-bright.json across zooms.

export interface ZoomResult {
	zoom: number;
	diffs: string[];
	ignored: string[];
}
export interface CaseResult {
	c: Case;
	zooms: ZoomResult[];
	pass: boolean;
}

const osmBrightPath = new URL('./styles/style.osm-bright.json', import.meta.url).pathname;
const tilesJsonPath = new URL('../../src/types/fixtures/tilejson/osm.json', import.meta.url).pathname;

export async function compareAll(): Promise<CaseResult[]> {
	const tilesJson = JSON.parse(readFileSync(tilesJsonPath, 'utf8')) as StyleSpecification;
	const fetchFn = async (_url: string | URL | RequestInfo) =>
		({
			ok: true,
			json: async () => tilesJson,
		}) as Response;
	// Literal tile-URL template → generated fully offline (no TileJSON fetch).
	const colorful = (await osm({
		theme: 'colorful',
		urls: { osm: 'https://example.org/tiles.json', fetch: fetchFn },
		features: { landcover: true },
	})) as StyleSpecification;
	const osmBright = JSON.parse(readFileSync(osmBrightPath, 'utf8')) as StyleSpecification;

	const results: CaseResult[] = [];
	for (const c of CASES) {
		const ignore = c.ignore ?? [];
		// A faded-in feature is still transparent at its minzoom, so only start comparing once the
		// opacity transition (minZoom → minZoom+1) has completed.
		const fromZoom = (c.minZoom ?? 0) + (c.fadeIn ? 1 : 0);
		const zr: ZoomResult[] = [];
		for (let z = 0; z <= 14; z++) {
			if (fromZoom > z) continue;
			const omtSig = buildSignature(c.omt.geom, evaluateStyle(osmBright, c.omt, z), backgroundColor(osmBright, z));
			const sbSig = buildSignature(
				c.shortbread.geom,
				evaluateStyle(colorful, c.shortbread, z),
				backgroundColor(colorful, z)
			);
			const all = compare(omtSig, sbSig);
			zr.push({
				zoom: z,
				diffs: all.filter((d) => !ignore.some((sub) => d.includes(sub))),
				ignored: all.filter((d) => ignore.some((sub) => d.includes(sub))),
			});
		}
		results.push({ c, zooms: zr, pass: zr.every((z) => z.diffs.length === 0) });
	}
	return results;
}
