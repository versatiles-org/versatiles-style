import { osm, satellite } from '../api/index.js';
import type { SchemaName } from '../api/index.js';
import { getLayerGroupMap, type LayerGroupMap } from '../shortbread/index.js';
import { PALETTES, getPaletteColors, isDarkPalette } from '../themes/index.js';
import {
	colorOptionsKeys,
	resolveSatellite,
	type ColorsOptions,
	type LayerGroupOptions,
	type Palette,
	type ResolvedColors,
} from '../options/index.js';
import type { StyleSpecification } from '../types/index.js';
import {
	calibrate,
	FULL_EVIDENCE,
	parseRGBA,
	solveColors,
	type CalibrationModel,
	type ChannelId,
} from './calibrate.js';
import { type Channel, type DiscardedColor, type ProbeReading, type RGBA } from './evaluate.js';
import { colorDistance, luminance, toHex } from './math.js';
import { PROBES } from './probes.js';
import { diagnostic } from './diagnostics.js';
import type { ReportBuilder } from './derive-report.js';

/**
 * Step 4 of `deriveOptions` (see `derive.ts`): the colours, the theme they are nearest to, and the
 * layer groups the style does not draw.
 *
 * Also the two targets — how to build an `osm()` or a `satellite()` style to calibrate against — which
 * the other `derive-*.ts` modules measure a foreign style against as well.
 */

/** Keys whose colour covers most of the map count more when choosing a palette. */
const PALETTE_WEIGHTS: Partial<Record<keyof ColorsOptions, number>> = {
	background: 4,
	land: 4,
	water: 4,
	roadStreet: 2,
	roadStreetBg: 2,
	roadTrunk: 2,
	roadMotorway: 2,
	label: 2,
	labelHalo: 2,
};

/**
 * ΔE below which a derived colour is taken to be the palette's own. It grows with the uncertainty of
 * the key's best channel: a colour only seen through a nonlinear derivation must differ by more.
 */
export const OVERRIDE_DISTANCE = 3;

const overrideDistance = (residual: number) => OVERRIDE_DISTANCE + 250 * Math.sqrt(residual);

/**
 * How close the runner-up palette has to sit, as a fraction of the winner's cost, before the choice
 * between them is worth reporting as a near-tie.
 *
 * 5%: OpenFreeMap's Liberty picks `colorful` at 1153.6 over `natural` at 1185.3 — 2.7% apart, which
 * is well inside what the palette-fitting can tell apart, and a choice a person might reasonably make
 * differently. A style built by these very builders scores its own palette far below the rest.
 */
const THEME_MARGIN = 0.05;

/** Numbers that only exist to be read in a report, at a length a person can read. */
export const round2 = (value: number) => Math.round(value * 100) / 100;

type Mode = 'light' | 'dark';

/** How to build styles of a target function, for calibration and for choosing a palette. */
export type Target = {
	readonly name: 'osm' | 'satellite';
	readonly baseTheme: (mode: Mode) => Palette;
	readonly themes: (mode: Mode) => readonly Palette[];
	readonly colorsFor: (theme: Palette) => ResolvedColors;
	readonly build: (theme: Palette, colors: ResolvedColors) => StyleSpecification;
};

export const SHORTBREAD_SOURCES: ReadonlyMap<string, SchemaName> = new Map([['versatiles-shortbread', 'shortbread']]);

/** The schemas some probe names a feature for — the ones a style can be read in. */
export const READABLE: ReadonlySet<SchemaName> = new Set(
	PROBES.flatMap((probe) => Object.keys(probe.features) as SchemaName[])
);

export function osmTarget(): Target {
	return {
		name: 'osm',
		baseTheme: (mode) => (mode === 'dark' ? 'colorful-dark' : 'colorful'),
		themes: (mode) => PALETTES.filter((p) => isDarkPalette(p) === (mode === 'dark')),
		colorsFor: getPaletteColors,
		build: (theme, colors) => osm({ theme, colors }),
	};
}

export function satelliteTarget(): Target {
	return {
		name: 'satellite',
		baseTheme: () => 'gray',
		// Over imagery there is no background to tell light from dark, so every palette is a candidate.
		themes: () => PALETTES,
		colorsFor: (theme) => (resolveSatellite({ osmOverlay: { theme } }).osmOverlay as { colors: ResolvedColors }).colors,
		build: (theme, colors) => satellite({ osmOverlay: { theme, colors } }),
	};
}

const models = new Map<string, CalibrationModel>();

export function modelFor(target: Target, mode: Mode): CalibrationModel {
	const theme = target.baseTheme(mode);
	const key = `${target.name}:${theme}`;
	let model = models.get(key);
	if (!model) {
		model = calibrate({
			build: (colors) => target.build(theme, colors),
			defaults: target.colorsFor(theme),
			schemas: SHORTBREAD_SOURCES,
		});
		models.set(key, model);
	}
	return model;
}

/** Dark when the style's ground is: its background, or failing that its land or water. */
export function modeOf(readings: ReadonlyMap<string, ProbeReading>): Mode {
	for (const id of ['background', 'land-residential', 'water-ocean']) {
		const color = readings.get(id)?.colors.color;
		if (color) return luminance(color) < 0.2 ? 'dark' : 'light';
	}
	return 'light';
}

export function fitContent(
	target: Target,
	readings: ReadonlyMap<string, ProbeReading>,
	schemas: ReadonlyMap<string, SchemaName>,
	report: ReportBuilder,
	mode: Mode
): { theme: Palette; colors: ColorsOptions; layers: LayerGroupOptions } {
	const model = modelFor(target, mode);

	const observed = new Map<ChannelId, RGBA>();
	for (const reading of readings.values()) {
		for (const [channel, color] of Object.entries(reading.colors) as [Channel, RGBA][]) {
			observed.set(`${reading.probe.id}/${channel}`, color);
		}
	}

	// Colours the source gave features the target cannot tell apart. Reported separately from the
	// z-order contest below: nothing here overpainted anything, the source would draw every one of
	// these, and the target has a single setting for the lot.
	for (const reading of readings.values()) {
		if (!reading.collapsed?.length) continue;
		const kept = reading.colors.text ?? reading.colors.color;
		if (!kept) continue;
		const differing = reading.collapsed.filter((c) => colorDistance(c.color, kept) > OVERRIDE_DISTANCE);
		if (differing.length === 0) continue;
		const channel: Channel = reading.colors.text ? 'text' : 'color';
		const key = model.channels.get(`${reading.probe.id}/${channel}`)?.keys[0];
		if (key === undefined) continue;
		report.say(
			diagnostic(
				'color.collapsed',
				`the style colours ${differing.length} feature kinds differently that the target draws as one (${differing
					.map((c) => c.feature)
					.join(', ')}); ${toHex(kept)} was taken`,
				{
					key,
					chosen: toHex(kept),
					observed: [
						{ feature: reading.probe.id, color: toHex(kept), layers: reading.layers },
						...differing.map((c) => ({ feature: c.feature, color: toHex(c.color), layers: c.layers })),
					],
				},
				{ optionPath: `colors.${key}`, origin: { probe: reading.probe.id } }
			)
		);
	}

	// Colours other layers drew for the same probe and channel. Reported against the colour key that
	// channel feeds, which is the setting a consumer would offer the alternatives for.
	for (const reading of readings.values()) {
		for (const [channel, groups] of Object.entries(reading.discarded ?? {}) as [Channel, DiscardedColor[]][]) {
			const kept = reading.colors[channel];
			if (!kept) continue;
			// The same threshold that decides whether a colour is worth overriding the palette with: two
			// colours that differ enough to be a conflict are exactly the two that would differ enough to
			// be written out, and a second constant would let one happen without the other. The bare
			// value, not `overrideDistance(residual)` — both colours here are direct readings, with no
			// model inversion for a residual to describe.
			const differing = groups.filter((g) => colorDistance(g.color, kept) > OVERRIDE_DISTANCE);
			if (differing.length === 0) continue;
			const key = model.channels.get(`${reading.probe.id}/${channel}`)?.keys[0];
			if (key === undefined) continue;
			report.say(
				diagnostic(
					'color.conflict',
					`${differing.length + 1} colours were drawn for ${reading.probe.id}; the topmost (${toHex(kept)}) was taken`,
					{
						key,
						chosen: toHex(kept),
						rule: 'topmost',
						observed: [
							{ color: toHex(kept), layers: reading.layers },
							...differing.map((g) => ({ color: toHex(g.color), layers: g.layers })),
						],
					},
					{ optionPath: `colors.${key}`, origin: { probe: reading.probe.id } }
				)
			);
		}
	}

	// A first solve against the base palette decides the palette; a second, pulled toward that
	// palette, gives the colours. Keys nothing was observed for then stay exactly the palette's.
	const first = solveColors(model, observed, target.colorsFor(target.baseTheme(mode)));
	const share = (key: keyof ColorsOptions) => Math.min(1, (first.evidence.get(key) ?? 0) / FULL_EVIDENCE);

	// The runner-up is kept, not just the winner: the margin between the two is the whole of what can
	// be said about how sure the palette is, and it was being computed and dropped every time.
	let theme = target.baseTheme(mode);
	let best = Infinity;
	let runnerUp: Palette | undefined;
	let runnerUpCost = Infinity;
	for (const candidate of target.themes(mode)) {
		const palette = target.colorsFor(candidate);
		let cost = 0;
		for (const key of colorOptionsKeys) {
			const weight = share(key) * (PALETTE_WEIGHTS[key] ?? 1);
			if (weight > 0) cost += weight * colorDistance(first.colors.get(key)!, parseRGBA(palette[key]));
		}
		if (cost < best) {
			[runnerUp, runnerUpCost] = [theme, best];
			[best, theme] = [cost, candidate];
		} else if (cost < runnerUpCost) {
			[runnerUp, runnerUpCost] = [candidate, cost];
		}
	}
	const margin = Number.isFinite(runnerUpCost) && best > 0 ? (runnerUpCost - best) / best : Infinity;
	if (runnerUp !== undefined && margin < THEME_MARGIN) {
		report.say(
			diagnostic(
				'theme.ambiguous',
				`"${theme}" and "${runnerUp}" fit almost equally well (within ${(margin * 100).toFixed(1)}%); "${theme}" was taken`,
				{
					chosen: theme,
					cost: round2(best),
					runnerUp,
					runnerUpCost: round2(runnerUpCost),
					margin: round2(margin),
				},
				{ optionPath: 'theme' }
			)
		);
	}

	report.note('theme', {
		origin: 'observed',
		// The margin over the runner-up, measured against the margin at which the choice stops being
		// reported as a near-tie: 0 where the two palettes score alike, 1 once the winner is clear by
		// `THEME_MARGIN` or more. Not a probability, and not comparable with a colour's evidence share —
		// it says how far this choice sits from the point where it would be flagged as ambiguous.
		confidence: Number.isFinite(margin) ? round2(Math.max(0, Math.min(1, margin / THEME_MARGIN))) : 1,
	});

	const palette = target.colorsFor(theme);
	const solved = solveColors(model, observed, palette);
	const colors: ColorsOptions = {};
	const unobserved: string[] = [];
	/** The probes that observed a key's channels, for the provenance note. */
	const fedBy = (key: keyof ColorsOptions): string[] => {
		const probes = new Set<string>();
		for (const id of observed.keys()) {
			if (model.channels.get(id)?.keys.includes(key)) probes.add(id.split('/')[0]);
		}
		return [...probes].sort();
	};
	for (const key of colorOptionsKeys) {
		const evidence = solved.evidence.get(key) ?? 0;
		if (evidence < FULL_EVIDENCE / 4) {
			// Nothing in the style spoke for this key, so the palette's own value stands. Collected rather
			// than reported one by one: on a real style this is a third of the palette, and forty-odd
			// diagnostics saying the same thing would bury the ones that differ.
			unobserved.push(key);
			report.note(`colors.${key}`, { origin: 'inherited', confidence: round2(evidence / FULL_EVIDENCE) });
			continue;
		}
		const estimate = solved.colors.get(key)!;
		const distance = colorDistance(estimate, parseRGBA(palette[key]));
		const threshold = overrideDistance(solved.residual.get(key)!);
		const confidence = round2(Math.min(1, evidence / FULL_EVIDENCE));
		if (distance > threshold) {
			colors[key] = toHex(estimate);
			report.note(`colors.${key}`, { origin: 'observed', confidence, from: fedBy(key) });
			continue;
		}
		// Observed, but the palette's own value was kept. Still `observed`: the style was read and agreed
		// with the palette, which is a different thing from never having looked.
		report.note(`colors.${key}`, { origin: 'observed', confidence, from: fedBy(key) });
		// Observed, estimated, and then discarded for sitting inside the threshold. Worth reporting only
		// when the estimate actually differed: an estimate that lands on the palette exactly is the
		// solver agreeing with it, which is the opposite of low confidence.
		if (distance > threshold / 2) {
			report.say(
				diagnostic(
					'color.lowConfidence',
					`the ${key} colour was estimated at ${toHex(estimate)} but kept at the palette's ${palette[key]}`,
					{
						key,
						estimate: toHex(estimate),
						paletteColor: palette[key],
						distance: round2(distance),
						threshold: round2(threshold),
						evidenceShare: round2(Math.min(1, evidence / FULL_EVIDENCE)),
						residual: round2(solved.residual.get(key)!),
					},
					{ optionPath: `colors.${key}` }
				)
			);
		}
	}
	if (unobserved.length > 0) {
		report.say(
			diagnostic(
				'color.unobserved',
				`${unobserved.length} of ${colorOptionsKeys.length} colours were not observed; the "${theme}" palette's values were kept`,
				{ keys: unobserved, count: unobserved.length, total: colorOptionsKeys.length }
			)
		);
	}

	return { theme, colors, layers: hiddenGroups(model, readings, schemas) };
}

/**
 * Layer groups the style does not draw: every probe of the group that the tiles can carry and the
 * target draws by default goes unread. A group with no such probe is left alone — silence about a
 * group is not evidence that the style hides it.
 *
 * Reports nothing, and takes no report. It used to warn when a group looked hidden with no vector
 * schema to judge by, which could not happen: a group is only marked hidden once a probe of it passes
 * a schema test, and with no schemas that test is vacuously false, so the list it guarded was always
 * empty. With no vector source the satellite path simply derives no layer-group options.
 */
export function hiddenGroups(
	model: CalibrationModel,
	readings: ReadonlyMap<string, ProbeReading>,
	schemas: ReadonlyMap<string, SchemaName>
): LayerGroupOptions {
	const tileSchemas = new Set(schemas.values());
	const layers: Record<string, unknown> = {};
	const hidden: string[] = [];
	/** Leaves with at least one probe the style could draw: the only ones whose visibility is known. */
	const readable = new Set<string>();

	const visit = (node: LayerGroupMap, path: string[]): boolean => {
		let allHidden = true;
		for (const [key, child] of Object.entries(node)) {
			if (path.length === 0 && key === 'icons') continue; // an alias, not a group
			const childPath = [...path, key];
			if (Array.isArray(child)) {
				const probes = PROBES.filter(
					(p) => child.includes(p.id) && model.base.has(p.id) && [...tileSchemas].some((schema) => p.features[schema])
				);
				if (probes.length > 0) readable.add(childPath.join('.'));
				const isHidden = probes.length > 0 && probes.every((p) => !readings.has(p.id));
				if (isHidden) hidden.push(childPath.join('.'));
				else allHidden = false;
			} else if (!visit(child, childPath)) {
				allHidden = false;
			}
		}
		return allHidden;
	};
	visit(getLayerGroupMap(), []);

	// Collapse: a branch is hidden as a whole when at least one of its leaves is hidden and every other
	// leaf is either hidden too or has no probe to tell. `labels.water.lakes` has no probe, and lake
	// names shared a group with the river probe until `labels.water` was split, so this keeps that reading.
	const collapse = (node: LayerGroupMap, path: string[]): void => {
		for (const [key, child] of Object.entries(node)) {
			if (path.length === 0 && key === 'icons') continue;
			const childPath = [...path, key];
			const name = childPath.join('.');
			const leaves = Array.isArray(child) ? [name] : leafPaths(child, childPath);
			if (
				leaves.some((leaf) => hidden.includes(leaf)) &&
				leaves.every((leaf) => hidden.includes(leaf) || !readable.has(leaf))
			) {
				setPath(layers, childPath, false);
			} else if (!Array.isArray(child)) {
				collapse(child, childPath);
			}
		}
	};
	collapse(getLayerGroupMap(), []);

	return layers as LayerGroupOptions;
}

function leafPaths(node: LayerGroupMap, path: string[]): string[] {
	return Object.entries(node).flatMap(([key, child]) =>
		Array.isArray(child) ? [[...path, key].join('.')] : leafPaths(child, [...path, key])
	);
}

export function setPath(target: Record<string, unknown>, path: string[], value: unknown): void {
	let node = target;
	for (const key of path.slice(0, -1)) node = (node[key] ??= {}) as Record<string, unknown>;
	node[path.at(-1)!] = value;
}
