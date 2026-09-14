import { checkKeys } from './keys.js';
import type { KnownFontName } from './font-names.js';

/**
 * A glyph name, as the glyph server publishes it: `'noto_sans_regular'`, `'fira_sans_semibold_italic'`,
 * … — or any name a custom server uses. Not checked: `osm()` does no I/O, so it cannot know which
 * faces a server has. The VersaTiles faces autocomplete (`KnownFontName`); `string & {}` keeps any other
 * string valid without collapsing the union into plain `string`, which would lose the suggestions.
 */
export type FontName = KnownFontName | (string & {});

/**
 * The font topics, by group. The groups and their children are the label groups of `layers.labels`,
 * plus `pois`, whose two topics are the names drawn with POI and transit-stop icons.
 */
export const FONT_GROUPS = {
	boundaries: ['countries', 'states'],
	places: ['cities', 'villages', 'districts'],
	streets: ['names', 'refs', 'exits'],
	water: ['lakes', 'rivers'],
	pois: ['general', 'transit'],
} as const;

type Groups = typeof FONT_GROUPS;
type GroupName = keyof Groups;

/** A leaf of the font tree: `'water.rivers'`, `'pois.transit'`, …, or `'addresses'`. */
export type FontTopic = { [G in GroupName]: `${G}.${Groups[G][number]}` }[GroupName] | 'addresses';

type FontGroup<G extends GroupName> = FontName | ({ default?: FontName } & { [L in Groups[G][number]]?: FontName });

/**
 * `text.fonts`: a glyph name for every label, or a tree that sets groups and topics. A string sets
 * everything below it, an object only the children it names, and `default` the children the same
 * object does not name. What is left unset keeps the style's own font.
 */
export type FontOptions =
	FontName | ({ default?: FontName; addresses?: FontName } & { [G in GroupName]?: FontGroup<G> });

/** Every topic resolved to a glyph name. Valid as input, where it builds the same style. */
export type ResolvedFonts = { [G in GroupName]: { [L in Groups[G][number]]: FontName } } & { addresses: FontName };

/** Every topic set in one face. */
export function uniformFonts(font: FontName): ResolvedFonts {
	const out = { addresses: font } as Record<string, unknown>;
	for (const [group, leaves] of Object.entries(FONT_GROUPS)) {
		out[group] = Object.fromEntries(leaves.map((leaf) => [leaf, font]));
	}
	return out as ResolvedFonts;
}

function fontName(value: unknown, path: string): FontName | undefined {
	if (value === undefined) return undefined;
	if (typeof value !== 'string' || value === '') {
		throw new Error(`${path}: expected a font name string, got ${JSON.stringify(value)}`);
	}
	return value;
}

/** An object node, a string node, or nothing — with anything else rejected. */
function node(value: unknown, path: string): { font?: FontName; children?: Record<string, unknown> } {
	if (value === undefined) return {};
	if (typeof value === 'string') return { font: fontName(value, path) };
	if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
		const children = value as Record<string, unknown>;
		return { font: fontName(children.default, `${path}.default`), children };
	}
	throw new Error(`${path}: expected a font name string or an object, got ${JSON.stringify(value)}`);
}

/**
 * Resolve `text.fonts` against the target's own fonts. Per topic: its own value, else the nearest
 * `default` or string above it, else `fallback`.
 */
export function resolveFonts(fonts: FontOptions | undefined, fallback: ResolvedFonts, path = 'fonts'): ResolvedFonts {
	const root = node(fonts, path);
	if (root.children) {
		checkKeys(
			root.children,
			{ default: true, addresses: true, boundaries: true, places: true, streets: true, water: true, pois: true },
			path
		);
	}
	const out = {
		addresses: fontName(root.children?.addresses, `${path}.addresses`) ?? root.font ?? fallback.addresses,
	} as Record<string, unknown>;
	for (const [group, leaves] of Object.entries(FONT_GROUPS) as [GroupName, readonly string[]][]) {
		const g = node(root.children?.[group], `${path}.${group}`);
		if (g.children) {
			checkKeys(g.children, Object.fromEntries(['default', ...leaves].map((key) => [key, true])), `${path}.${group}`);
		}
		const inherited = g.font ?? root.font;
		const fallbackGroup = fallback[group] as Record<string, FontName>;
		out[group] = Object.fromEntries(
			leaves.map((leaf) => [
				leaf,
				fontName(g.children?.[leaf], `${path}.${group}.${leaf}`) ?? inherited ?? fallbackGroup[leaf],
			])
		);
	}
	return out as ResolvedFonts;
}

/** The glyph name a topic resolves to. */
export function fontOf(fonts: ResolvedFonts, topic: FontTopic): FontName {
	if (topic === 'addresses') return fonts.addresses;
	const [group, leaf] = topic.split('.') as [GroupName, string];
	return (fonts[group] as Record<string, FontName>)[leaf];
}

// ── Minimising ─────────────────────────────────────────────────────────────────

type Candidate = { value: unknown; cost: number };

/** The cheaper candidate; on a tie the earlier one, so simpler shapes win. */
const cheaper = (a: Candidate | undefined, b: Candidate): Candidate => (a === undefined || b.cost < a.cost ? b : a);

/** The distinct faces in a list, in first-seen order: the only values a `default` could usefully take. */
const faces = (values: FontName[]): FontName[] => [...new Set(values)];

/**
 * The smallest group node that resolves to `resolved` under `inherited` (the root's `default`, if any)
 * and `fallback`. `undefined` value with cost 0 means the group is left out.
 */
function minimizeGroup(
	leaves: readonly string[],
	resolved: Record<string, FontName>,
	fallback: Record<string, FontName>,
	inherited: FontName | undefined
): Candidate {
	const values = leaves.map((leaf) => resolved[leaf]);
	if (leaves.every((leaf) => resolved[leaf] === (inherited ?? fallback[leaf]))) return { value: undefined, cost: 0 };

	let best: Candidate | undefined;
	if (faces(values).length === 1) best = { value: values[0], cost: 1 };
	for (const groupDefault of [undefined, ...faces(values)]) {
		const node: Record<string, FontName> = groupDefault === undefined ? {} : { default: groupDefault };
		for (const leaf of leaves) {
			if (resolved[leaf] !== (groupDefault ?? inherited ?? fallback[leaf])) node[leaf] = resolved[leaf];
		}
		best = cheaper(best, { value: node, cost: Object.keys(node).length });
	}
	return best!;
}

/**
 * The smallest `text.fonts` that resolves to the same fonts as `fonts` against `fallback`, or
 * `undefined` when those are `fallback`'s own. Size is the number of glyph names it spells out; every
 * shape `resolveFonts` accepts is a candidate, so the result is never larger than the input.
 */
export function minimizeFonts(fonts: FontOptions | undefined, fallback: ResolvedFonts): FontOptions | undefined {
	const resolved = resolveFonts(fonts, fallback);
	const all = [
		resolved.addresses,
		...Object.keys(FONT_GROUPS).flatMap((g) => Object.values(resolved[g as GroupName] as Record<string, FontName>)),
	];

	// A single string first, so it wins a tie with `{ default: … }`.
	let best: Candidate | undefined = faces(all).length === 1 ? { value: all[0], cost: 1 } : undefined;
	for (const rootDefault of [undefined, ...faces(all)]) {
		const node: Record<string, unknown> = rootDefault === undefined ? {} : { default: rootDefault };
		let cost = rootDefault === undefined ? 0 : 1;
		for (const [group, leaves] of Object.entries(FONT_GROUPS) as [GroupName, readonly string[]][]) {
			const g = minimizeGroup(
				leaves,
				resolved[group] as Record<string, FontName>,
				fallback[group] as Record<string, FontName>,
				rootDefault
			);
			if (g.value !== undefined) node[group] = g.value;
			cost += g.cost;
		}
		if (resolved.addresses !== (rootDefault ?? fallback.addresses)) {
			node.addresses = resolved.addresses;
			cost += 1;
		}
		best = cheaper(best, { value: cost === 0 ? undefined : node, cost });
	}
	return best!.value as FontOptions | undefined;
}
