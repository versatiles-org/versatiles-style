import { preReleaseHint, v5Hint } from './v5-hints.js';
import { reportIssue, reportIssues, type OptionIssue } from './issues.js';

/** Exactly the keys of the object part of `T`, each mapped to `true`. */
export type KnownKeys<T> = { readonly [K in keyof Required<Extract<NonNullable<T>, object>>]-?: true };

/**
 * Reject keys that `value` — the options object at `path` — does not have in its type.
 *
 * Unknown keys used to be ignored, so a v5 option (`osm({ textScale: 2 })`), a typo or a renamed colour
 * key built the default style without a word. TypeScript catches that in typed code, but not in plain
 * JavaScript, untyped UI bindings, or options loaded from JSON or a URL.
 *
 * Each resolver checks only its own object and passes `path` on to the resolvers it calls, so nesting
 * needs no second copy of the option tree. TypeScript makes `known` list exactly the keys of the
 * options type, so the check cannot drift from it. `path` starts with the function the options were
 * given to (`osm`, `satellite.osmOverlay.colors`), which labels the error. Keys set to `undefined`
 * carry no intent and are not checked.
 */
export function checkKeys<T>(value: T, known: NoInfer<KnownKeys<T>>, path: string): void {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) return;
	const unknown = Object.entries(value)
		.filter(([key, entry]) => entry !== undefined && !Object.hasOwn(known, key))
		.map(([key]) => key);
	if (unknown.length === 0) return;

	const [label, ...parents] = path.split('.');
	// Only point at the migration guide when a key really is a v5 name — for a plain typo the guide
	// has nothing to say, and the list of known keys is the more useful answer.
	let sawV5 = false;
	const issues = unknown.map((key): OptionIssue => {
		const at = [...parents, key].join('.');
		const hint = v5Hint(label, at);
		if (hint !== undefined) sawV5 = true;
		if (hint === null) return { path: at, message: `"${at}" was removed in v6` };
		if (hint !== undefined) return { path: at, message: `"${at}" — in v6 this is "${hint}"`, suggestion: hint };
		const renamed = preReleaseHint(label, at);
		if (renamed !== undefined) return { path: at, message: `"${at}" — this is now "${renamed}"`, suggestion: renamed };
		return { path: at, message: `"${at}" — known keys here: ${Object.keys(known).join(', ')}` };
	});
	const lines = issues.map((issue) => issue.message);
	const guide = sawV5 ? '\nSee "Migration from v5" in API_DESIGN.md.' : '';
	reportIssues(
		issues,
		lines.length === 1
			? `${label}: unknown option ${lines[0]}${guide}`
			: `${label}: ${lines.length} unknown options\n${lines.map((line) => `  ${line}`).join('\n')}${guide}`
	);
}

/**
 * Reject a non-finite number anywhere in `value`, naming where it sits.
 *
 * `NaN` and the infinities are JSON-serialised as `null`, so one that survives resolution reaches the
 * built style as `null` and MapLibre rejects the style: `"raster-opacity": null`,
 * `light.position: [1.15, 210, null]`, `terrain.exaggeration: null`, or an `interpolate` ramp with
 * `null` outputs. None of that names the option that caused it.
 *
 * A caller reaches this without doing anything unusual: `parseFloat('')` on an empty input field,
 * `Number(undefined)` from an unset config key, or arithmetic on either. Called at the top of a
 * resolver, before the defaults are filled in, so the path points at the caller's own key.
 */
export function checkFinite(value: unknown, path: string): void {
	if (typeof value === 'number' && !Number.isFinite(value)) {
		// Reported, not thrown, when collecting — and the walk below still runs, so a second bad number
		// in a sibling key is found in the same pass.
		reportIssue({ path, message: `expected a finite number, got ${value}` });
	}
	if (value && typeof value === 'object' && !Array.isArray(value)) {
		for (const [key, child] of Object.entries(value)) checkFinite(child, `${path}.${key}`);
	}
}
