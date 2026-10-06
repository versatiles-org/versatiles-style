import { getLinePreset } from '../themes/index.js';
import { lineDefaults, type LayerGroupOptions, type Palette } from '../options/index.js';
import type { StyleSpecification } from '../types/index.js';
import { readProbe, type ProbeReading } from './evaluate.js';
import { type Probe } from './probes.js';
import { diagnostic } from './diagnostics.js';
import type { ReportBuilder } from './derive-report.js';
import { type Target, SHORTBREAD_SOURCES, setPath } from './derive-content.js';

/**
 * The line styles of `deriveOptions` (see `derive.ts`): which borders and paths a style dashes, and how
 * much wider or narrower than ours it draws them.
 */

/** The line groups of `layers`, each with the probes that read its line — the first one drawn speaks. */
const LINE_GROUPS: readonly (readonly [group: string, leaf: string, probes: readonly string[]])[] = [
	['boundaries', 'country', ['boundary-country']],
	['boundaries', 'state', ['boundary-state']],
	['boundaries', 'disputed', ['boundary-country-disputed']],
	['roads', 'footway', ['way-footway']],
	['roads', 'steps', ['way-steps']],
	['roads', 'paths', ['way-path', 'way-cycleway']],
];

/** How far two dash lengths may differ, in line widths, and still be the same pattern. */
const DASH_TOLERANCE = 0.05;

const sameDash = (a: readonly number[] | undefined, b: readonly number[] | undefined): boolean =>
	a === undefined || b === undefined
		? a === b
		: a.length === b.length && a.every((length, index) => Math.abs(length - b[index]) <= DASH_TOLERANCE);

/** How much a width has to differ from the target's, as a ratio, before it is worth writing. */
const WIDTH_TOLERANCE = 1.2;

/** The zooms a line's width is compared at, from the zoom its probe was read at. */
const WIDTH_ZOOM_OFFSETS = [0, 2, 4];

/**
 * How wide the style draws a line, as a multiple of how wide the target draws it.
 *
 * At several zooms, and the middle ratio taken: a width is a ramp, and two ramps of different shape
 * agree at one zoom and differ at the next — our state border and Bing's are both 1px at z8, where the
 * probe is read, and 2px against 1px at z10. One zoom would have called them the same.
 */
function widthRatio(
	reading: ProbeReading,
	read: (probe: Probe, zoom: number) => ProbeReading | undefined,
	own: StyleSpecification
): number | undefined {
	const ratios: number[] = [];
	for (const offset of WIDTH_ZOOM_OFFSETS) {
		const zoom = reading.zoom + offset;
		if (zoom > 20) continue;
		const theirs = read(reading.probe, zoom)?.lineWidth;
		const ours = readProbe(own, SHORTBREAD_SOURCES, reading.probe, zoom)?.lineWidth;
		if (theirs && ours) ratios.push(theirs / ours);
	}
	if (ratios.length === 0) return undefined;
	ratios.sort((a, b) => a - b);
	return ratios[Math.floor(ratios.length / 2)];
}

/**
 * `layers` with `dashed` and `width` set on the borders and paths the style draws differently from
 * the target.
 *
 * "Differently from the target" is judged the way the colours are: the same probes are read off the
 * target built with the chosen theme, so a theme that already draws its paths solid, or its state
 * borders half as wide, has nothing written — and a style built by these very builders comes back as
 * its theme alone. Where the two differ, the style's pattern is written out, or `false` for a solid
 * line; the target's own pattern for `true` is not something a foreign style can ask for. A width is
 * written as the multiple of the style's *default* width it comes to, which is what the option is —
 * the theme's own multiple times the ratio to the target built with it — and only where that ratio is
 * clearly not 1 ({@link WIDTH_TOLERANCE}): two maps rarely share a ramp to the pixel.
 *
 * A group the style does not draw is left as `hiddenGroups` made it: how a hidden line is drawn is
 * not a setting.
 */
export function withLineStyles(
	layers: LayerGroupOptions,
	target: Target,
	theme: Palette,
	readings: ReadonlyMap<string, ProbeReading>,
	read: (probe: Probe, zoom: number) => ProbeReading | undefined,
	report: ReportBuilder,
	optionPath: string
): LayerGroupOptions {
	const out = structuredClone(layers) as Record<string, unknown>;
	const usual = lineDefaults(getLinePreset(theme));
	let own: StyleSpecification | undefined;
	for (const [group, leaf, probes] of LINE_GROUPS) {
		const reading = probes.map((id) => readings.get(id)).find((r) => r !== undefined);
		if (!reading) continue;
		const branch = out[group];
		if (
			branch === false ||
			(branch && typeof branch === 'object' && (branch as Record<string, unknown>)[leaf] === false)
		) {
			continue;
		}
		own ??= target.build(theme, target.colorsFor(theme));
		const drawn = readProbe(own, SHORTBREAD_SOURCES, reading.probe, reading.zoom);
		if (!drawn) continue; // the target does not draw this line here, so there is nothing to set

		const style: { dashed?: boolean | number[]; width?: number } = {};
		const dashed = reading.lineDash?.map((length) => Math.round(length * 100) / 100);
		if (!sameDash(dashed, drawn.lineDash)) {
			style.dashed = dashed ?? false;
			if (reading.lineDashByZoom && dashed) {
				report.say(
					diagnostic(
						'line.dashByZoom',
						`the dash of ${group}.${leaf} changes with zoom; the pattern at z${reading.zoom} was taken`,
						{ zoom: reading.zoom, dashed },
						{
							optionPath: `${optionPath}.${group}.${leaf}.dashed`,
							origin: { probe: reading.probe.id, layers: reading.layers },
						}
					)
				);
			}
		}
		const ratio = widthRatio(reading, read, own);
		if (ratio !== undefined && (ratio > WIDTH_TOLERANCE || ratio < 1 / WIDTH_TOLERANCE)) {
			// to the nearest twentieth: a ratio of two ramps read at three zooms is no finer than that
			const width = Math.round(usual[`${group}.${leaf}`].width * ratio * 20) / 20;
			if (width > 0) style.width = width;
		}
		if (Object.keys(style).length > 0) setPath(out, [group, leaf], style);
	}
	return out as LayerGroupOptions;
}
