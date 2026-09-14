import { checkKeys } from './keys.js';

/**
 * A glyph name, as the glyph server publishes it: `'noto_sans_regular'`, `'fira_sans_semibold_italic'`,
 * … — or any name a custom server uses. Not checked: `osm()` does no I/O, so it cannot know which
 * faces a server has.
 */
export type FontName = string;

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
