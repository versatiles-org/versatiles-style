import { readFileSync } from 'fs';
import type { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';
import { osm } from '../../src/api/osm.js';
import { CASES } from './cases.js';
import { DEFAULT_ZOOMS } from './types.js';
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

export async function compareAll(): Promise<CaseResult[]> {
	// Literal tile-URL template → generated fully offline (no TileJSON fetch).
	const colorful = (await osm({
		theme: 'colorful',
		urls: { osm: 'https://example.org/{z}/{x}/{y}' },
		features: { landcover: true }
	})) as StyleSpecification;
	const osmBright = JSON.parse(readFileSync(osmBrightPath, 'utf8')) as StyleSpecification;

	const results: CaseResult[] = [];
	for (const c of CASES) {
		const zooms = c.zooms ?? DEFAULT_ZOOMS;
		const ignore = c.ignore ?? [];
		const zr: ZoomResult[] = [];
		for (const z of zooms) {
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
