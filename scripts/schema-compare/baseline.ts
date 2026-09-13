import type { Overlap } from './groups.js';
import { shareDifferences } from './score.js';

/**
 * Results, and how a run compares with the accepted baseline.
 *
 * There is no absolute pass mark. The tilesets genuinely differ — Protomaps carries no bridge polygons,
 * OpenMapTiles no parking sites, all three are built from OSM on different days — so some difference
 * is right, and the question a run answers is whether a change made it *worse*. `--save-baseline`
 * records what is accepted, a `note` per view can say why, and every later run is held to it.
 */

export const SCHEMAS = ['shortbread', 'omt', 'protomaps'] as const;
export type Schema = (typeof SCHEMAS)[number];

export const PAIRS = [
	['shortbread', 'omt'],
	['shortbread', 'protomaps'],
	['omt', 'protomaps'],
] as const satisfies readonly (readonly [Schema, Schema])[];
export type PairId = `${Schema}~${Schema}`;
export const pairId = ([a, b]: readonly [Schema, Schema]) => `${a}~${b}` as PairId;

export type ViewResult = {
	view: string;
	/** False when a tile or glyph could not be loaded for some schema: the view is then not scored. */
	complete: boolean;
	failures: string[];
	/** Share of differing pixels per pair, labels and icons off. */
	geometry: Partial<Record<PairId, number>>;
	/** The same with labels and icons. Placement makes this noisier. */
	full: Partial<Record<PairId, number>>;
	/** Area share per colour class and schema, from the sentinel-palette render. */
	classes: Partial<Record<Schema, Record<string, number>>>;
	/** `--by-group` only: per leaf layer group, how the area it draws alone overlaps between schemas. */
	groups?: Record<string, Partial<Record<PairId, Overlap>>>;
	/** Why the differences of this view are accepted; kept from the baseline when it is saved again. */
	note?: string;
};

export type Results = {
	/** The upstream each schema's cache was filled from. */
	builds: Partial<Record<Schema, string>>;
	views: ViewResult[];
};

export const TOLERANCE = {
	/** Differing pixels may grow by this share before it counts as a regression. */
	geometry: 0.02,
	full: 0.04,
	/** A class's share may drift apart between two schemas by this much. */
	classes: 0.03,
};

export type Finding = { view: string; kind: 'regression' | 'improvement'; message: string };

const percent = (v: number) => `${(v * 100).toFixed(1)} %`;

/** What got worse, and what got better, since the baseline. Incomplete views are not judged. */
export function compareToBaseline(current: Results, baseline: Results): Finding[] {
	const findings: Finding[] = [];
	const accepted = new Map(baseline.views.map((v) => [v.view, v]));

	for (const view of current.views) {
		const base = accepted.get(view.view);
		if (!base || !view.complete || !base.complete) continue;

		for (const pass of ['geometry', 'full'] as const) {
			for (const pair of PAIRS.map(pairId)) {
				const now = view[pass][pair];
				const then = base[pass][pair];
				if (now === undefined || then === undefined) continue;
				const message = `${pass} ${pair}: ${percent(then)} → ${percent(now)} differing pixels`;
				if (now > then + TOLERANCE[pass]) findings.push({ view: view.view, kind: 'regression', message });
				else if (now < then - TOLERANCE[pass]) findings.push({ view: view.view, kind: 'improvement', message });
			}
		}

		for (const [a, b] of PAIRS) {
			const [nowA, nowB, thenA, thenB] = [view.classes[a], view.classes[b], base.classes[a], base.classes[b]];
			if (!nowA || !nowB || !thenA || !thenB) continue;
			const then = new Map(shareDifferences(thenA, thenB, 0).map((d) => [d.name, d.delta]));
			const now = new Map(shareDifferences(nowA, nowB, 0).map((d) => [d.name, d.delta]));
			for (const name of new Set([...then.keys(), ...now.keys()])) {
				const [before, after] = [then.get(name) ?? 0, now.get(name) ?? 0];
				const message = `"${name}" ${a} vs ${b}: ${percent(before)} → ${percent(after)} apart`;
				if (after > before + TOLERANCE.classes) findings.push({ view: view.view, kind: 'regression', message });
				else if (after < before - TOLERANCE.classes) {
					findings.push({ view: view.view, kind: 'improvement', message });
				}
			}
		}
	}
	return findings;
}

/** A baseline to save: the current results, keeping the notes the previous baseline had. */
export function nextBaseline(current: Results, previous: Results | undefined): Results {
	const notes = new Map((previous?.views ?? []).map((v) => [v.view, v.note]));
	return {
		...current,
		views: current.views.map((v) => ({ ...v, ...(notes.get(v.view) && { note: notes.get(v.view) }) })),
	};
}
