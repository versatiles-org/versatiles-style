import { v5Hint } from './v5-hints.js';

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
	const lines = unknown.map((key) => {
		const at = [...parents, key].join('.');
		const hint = v5Hint(label, at);
		if (hint === null) return `"${at}" was removed in v6`;
		if (hint !== undefined) return `"${at}" — in v6 this is "${hint}"`;
		return `"${at}" — known keys here: ${Object.keys(known).join(', ')}`;
	});
	throw new Error(
		lines.length === 1
			? `${label}: unknown option ${lines[0]}`
			: `${label}: ${lines.length} unknown options\n${lines.map((line) => `  ${line}`).join('\n')}`
	);
}
