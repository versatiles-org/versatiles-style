import { Color } from '../color/index.js';
import { colorOptionsKeys, type ColorsOptions, type ResolvedColors } from '../options/index.js';
import type { SchemaName } from '../lib/schema-signatures.js';
import type { StyleSpecification } from '../types/index.js';
import { readProbe, type Channel, type ProbeReading, type RGBA } from './evaluate.js';
import { PROBES, type Probe } from './probes.js';
import { clamp01, seededRandom, solveLinear, toHex, zeros } from './math.js';

/**
 * Calibration: learning from the builder itself how its colour options turn into paint.
 *
 * `osm()` rarely paints a palette colour as-is. A river line is the water colour saturated and blended
 * toward the foreground, a label halo carries the halo colour's alpha, a casing may mix two keys. Instead
 * of restating those derivations here — where they would drift from the layer code — the builder is
 * run with perturbed and random palettes, and each probe channel's colour is fitted as an affine
 * function of the keys it turned out to depend on:
 *
 *     channel = Σₖ Aₖ · colorₖ + b          (RGBA vectors, Aₖ 4×4)
 *
 * The derivations are close to affine — blends are exactly affine, saturation nearly so — and the
 * residual of the fit says how far to trust each channel. Inverting the fit for a foreign style's
 * readings is then one least-squares solve over all keys at once (`solveColors`).
 *
 * A build takes a couple of milliseconds, so a model costs well under a second and is cached per builder.
 */

export type ColorKey = keyof ColorsOptions;

/** One channel of one probe, e.g. `street-motorway/casing`. */
export type ChannelId = `${string}/${Channel}`;

export type ChannelModel = {
	readonly keys: readonly ColorKey[];
	/** Per key, the 4×4 matrix mapping that key's RGBA to the channel's RGBA. */
	readonly A: readonly number[][][];
	readonly b: readonly number[];
	/** Mean squared residual of the fit; its inverse weighs the channel in the solve. */
	readonly residual: number;
};

export type CalibrationModel = {
	readonly channels: ReadonlyMap<ChannelId, ChannelModel>;
	/** The builder's readings with its default colours, per probe id. */
	readonly base: ReadonlyMap<string, ProbeReading>;
};

/** Builds a style for a set of colours; `schemas` names the schema of its vector source. */
export type CalibrationBuilder = {
	readonly build: (colors: ResolvedColors) => StyleSpecification;
	readonly defaults: ResolvedColors;
	readonly schemas: ReadonlyMap<string, SchemaName>;
};

const RANDOM_SAMPLES = 24;
/** A channel depending on more keys than this cannot be fitted from the samples taken. */
const MAX_KEYS = 3;

export function parseRGBA(color: string): RGBA {
	const rgb = Color.parse(color).asRGB();
	return [rgb.r / 255, rgb.g / 255, rgb.b / 255, rgb.a];
}

type Sample = { colors: RGBA[]; channels: Map<ChannelId, RGBA> };

function readAll(style: StyleSpecification, schemas: ReadonlyMap<string, SchemaName>, probes: readonly Probe[]) {
	const readings = new Map<string, ProbeReading>();
	const channels = new Map<ChannelId, RGBA>();
	for (const probe of probes) {
		const reading = readProbe(style, schemas, probe);
		if (!reading) continue;
		readings.set(probe.id, reading);
		for (const [channel, color] of Object.entries(reading.colors) as [Channel, RGBA][]) {
			channels.set(`${probe.id}/${channel}`, color);
		}
	}
	return { readings, channels };
}

function sample(builder: CalibrationBuilder, colors: RGBA[]): Sample {
	const resolved = Object.fromEntries(colorOptionsKeys.map((key, i) => [key, toHex(colors[i])])) as ResolvedColors;
	return { colors, channels: readAll(builder.build(resolved), builder.schemas, PROBES).channels };
}

/** A colour far from `color` in every component, so a dependency cannot hide in rounding. */
function perturb([r, g, b, a]: RGBA): RGBA {
	return [(r + 0.5) % 1, (g + 0.37) % 1, (b + 0.23) % 1, a > 0.6 ? a - 0.4 : a + 0.4];
}

export function calibrate(builder: CalibrationBuilder): CalibrationModel {
	const defaults = colorOptionsKeys.map((key) => parseRGBA(builder.defaults[key]));
	const baseStyle = builder.build(builder.defaults);
	const { readings: base, channels: baseChannels } = readAll(baseStyle, builder.schemas, PROBES);
	const samples: Sample[] = [{ colors: defaults, channels: baseChannels }];

	// 1. Which keys each channel depends on: change one key at a time.
	const dependencies = new Map<ChannelId, ColorKey[]>();
	colorOptionsKeys.forEach((key, i) => {
		const colors = defaults.slice();
		colors[i] = perturb(defaults[i]);
		const perturbed = sample(builder, colors);
		samples.push(perturbed);
		for (const [id, value] of perturbed.channels) {
			const before = baseChannels.get(id);
			if (before && value.every((v, c) => Math.abs(v - before[c]) < 1e-3)) continue;
			const keys = dependencies.get(id) ?? [];
			keys.push(key);
			dependencies.set(id, keys);
		}
	});

	// 2. Random palettes to fit against.
	const random = seededRandom(0x5eed);
	for (let s = 0; s < RANDOM_SAMPLES; s++) {
		const colors = defaults.map((): RGBA => [random(), random(), random(), random() < 0.5 ? 1 : 0.3 + 0.7 * random()]);
		samples.push(sample(builder, colors));
	}

	// 3. Fit each channel.
	const channels = new Map<ChannelId, ChannelModel>();
	for (const [id, keys] of dependencies) {
		if (keys.length > MAX_KEYS) continue;
		const model = fitChannel(
			id,
			keys.map((key) => colorOptionsKeys.indexOf(key)),
			samples
		);
		if (model) channels.set(id, { ...model, keys });
	}
	return { channels, base };
}

function fitChannel(id: ChannelId, keyIndices: number[], samples: Sample[]): Omit<ChannelModel, 'keys'> | undefined {
	const rows: { x: number[]; y: RGBA }[] = [];
	for (const s of samples) {
		const y = s.channels.get(id);
		if (!y) continue;
		rows.push({ x: [...keyIndices.flatMap((k) => s.colors[k]), 1], y });
	}
	const n = keyIndices.length * 4 + 1;
	if (rows.length < n + 4) return undefined;

	// Normal equations, shared by the four output components; a little ridge keeps them regular.
	const XtX = zeros(n, n);
	for (const { x } of rows) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) XtX[i][j] += x[i] * x[j];
	for (let i = 0; i < n - 1; i++) XtX[i][i] += 1e-6;

	const weights: number[][] = [];
	let squared = 0;
	for (let c = 0; c < 4; c++) {
		const rhs = new Array<number>(n).fill(0);
		for (const { x, y } of rows) for (let i = 0; i < n; i++) rhs[i] += x[i] * y[c];
		const w = solveLinear(
			XtX.map((row) => row.slice()),
			rhs
		);
		weights.push(w);
		for (const { x, y } of rows) {
			let predicted = 0;
			for (let i = 0; i < n; i++) predicted += w[i] * x[i];
			squared += (clamp01(predicted) - y[c]) ** 2;
		}
	}

	const A = keyIndices.map((_, k) => weights.map((w) => w.slice(k * 4, k * 4 + 4)));
	const b = weights.map((w) => w[n - 1]);
	return { A, b, residual: squared / (rows.length * 4) };
}

/**
 * How much a channel counts: the inverse of its fit residual, floored so that an exactly affine channel
 * (a palette colour painted as-is) outweighs a merely close one (a saturated variant) about twentyfold
 * rather than infinitely.
 */
function channelWeight(channel: ChannelModel): number {
	return 1 / (channel.residual + 1e-5);
}

/** Evidence (see `solveColors`) at which a key counts as fully observed: one exact channel gives ~4·10⁵. */
export const FULL_EVIDENCE = 1e4;

export type SolvedColors = {
	/** The estimated RGBA per key; the prior where nothing was observed. */
	readonly colors: ReadonlyMap<ColorKey, RGBA>;
	/** How much the observations said about each key, 0 for none. */
	readonly evidence: ReadonlyMap<ColorKey, number>;
	/** Per key, the fit residual of its best observed channel: how exactly the estimate can be trusted. */
	readonly residual: ReadonlyMap<ColorKey, number>;
};

/**
 * The palette that best explains `observed` under `model`: a weighted least-squares solve over every
 * key's RGBA at once, pulled gently toward `prior` so that keys nothing was observed for stay there.
 */
export function solveColors(
	model: CalibrationModel,
	observed: ReadonlyMap<ChannelId, RGBA>,
	prior: ResolvedColors
): SolvedColors {
	const K = colorOptionsKeys.length;
	const n = K * 4;
	const M = zeros(n, n);
	const rhs = new Array<number>(n).fill(0);
	const evidence = new Array<number>(K).fill(0);
	const residual = new Array<number>(K).fill(Infinity);

	for (const [id, value] of observed) {
		const channel = model.channels.get(id);
		if (!channel) continue;
		const weight = channelWeight(channel);
		const indices = channel.keys.map((key) => colorOptionsKeys.indexOf(key));
		const target = value.map((v, c) => v - channel.b[c]);

		indices.forEach((ki, a) => {
			const Aa = channel.A[a];
			// evidence: how strongly this channel moves with the key
			let gain = 0;
			for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) gain += Aa[r][c] ** 2;
			evidence[ki] += weight * gain;
			residual[ki] = Math.min(residual[ki], channel.residual);

			for (let i = 0; i < 4; i++) {
				for (let r = 0; r < 4; r++) rhs[ki * 4 + i] += weight * Aa[r][i] * target[r];
				indices.forEach((kj, b) => {
					const Ab = channel.A[b];
					for (let j = 0; j < 4; j++) {
						let sum = 0;
						for (let r = 0; r < 4; r++) sum += Aa[r][i] * Ab[r][j];
						M[ki * 4 + i][kj * 4 + j] += weight * sum;
					}
				});
			}
		});
	}

	const PRIOR = 1;
	colorOptionsKeys.forEach((key, k) => {
		const p = parseRGBA(prior[key]);
		for (let i = 0; i < 4; i++) {
			M[k * 4 + i][k * 4 + i] += PRIOR;
			rhs[k * 4 + i] += PRIOR * p[i];
		}
	});

	const x = solveLinear(M, rhs);
	const colors = new Map<ColorKey, RGBA>();
	const evidenceByKey = new Map<ColorKey, number>();
	const residualByKey = new Map<ColorKey, number>();
	colorOptionsKeys.forEach((key, k) => {
		colors.set(key, [clamp01(x[k * 4]), clamp01(x[k * 4 + 1]), clamp01(x[k * 4 + 2]), clamp01(x[k * 4 + 3])]);
		evidenceByKey.set(key, evidence[k]);
		residualByKey.set(key, residual[k]);
	});
	return { colors, evidence: evidenceByKey, residual: residualByKey };
}
