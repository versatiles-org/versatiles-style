import { resolveOsm, type OsmOptions } from './osm.js';
import type { OsmOverlayOptions } from './osm-overlay.js';
import { resolveSatellite, type SatelliteOptions } from './satellite.js';
import {
	DEFAULT_BASE,
	LABEL_STYLE_KEYS,
	resolveHillshade,
	resolveLayerGroups,
	resolveOsmUrls,
	resolveRecolor,
	resolveSatelliteUrls,
	resolveSun,
	resolveTerrain,
	resolveText,
	resolveTheme,
	TEXT_GROUPS,
	TEXT_TOPICS,
	topicOf,
	type LayerGroupOptions,
	type Palette,
	type RecolorOptions,
	type ResolvedText,
	type ResolvedTheme,
	type TextOptions,
	type TextTopic,
	type ThemeOptions,
} from './parts/index.js';
import { Color } from '../color/index.js';
// Type-only, and deliberately so: a *value* imported from a schema would make the option layer
// depend on `shortbread`, which depends on `dsl`, which depends back on these options — one edge
// that fuses half the package into a single cycle. The overlay's group map is therefore passed in
// by the caller (`src/api/satellite.ts`), which already knows about schemas.
import type { LayerGroupMap } from '../shortbread/index.js';

type Plain = Record<string, unknown>;

/** A plain object literal — not an array, not a class instance such as `Color`, which is a value. */
function isPlain(value: unknown): value is Plain {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
	const proto = Object.getPrototypeOf(value);
	return proto === Object.prototype || proto === null;
}

const COLOR = /^\s*(#|rgba?\()/i;

/**
 * Whether two option values build the same thing. Colours compare by value: `<input type="color">`
 * writes `#bfd9f2` where a palette says `#BFD9F2`, and both parse to the same colour.
 */
function sameValue(a: unknown, b: unknown): boolean {
	if (typeof a === 'string' && typeof b === 'string' && a !== b && COLOR.test(a) && COLOR.test(b)) {
		try {
			return Color.parse(a).asHex() === Color.parse(b).asHex();
		} catch {
			return false;
		}
	}
	return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * What each `boolean | object` option that is off by default resolves to when set to `true`. A value
 * equal to it is written as `true`, and only what differs from it is kept otherwise.
 *
 * The annotation below marks the IIFE side-effect-free, so a bundle that never uses the minimizer
 * drops these three resolver calls: they are module-level work, and a bundler must otherwise assume
 * running them matters. Do not quote that annotation in prose — Rollup scans every comment for the
 * token, cannot attach one it finds mid-sentence to a call, and warns while stripping the comment.
 */
const ENABLED = /*#__PURE__*/ (() => ({
	features: { terrain: resolveTerrain(true), hillshade: resolveHillshade(true) },
	sun: resolveSun(true),
}))();

/**
 * `value` minus everything equal to `defaults`, recursively; `undefined` when nothing is left.
 *
 * `true` counts as the default of a `boolean | object` option whose default is enabled, because
 * resolving turns that `true` into the default object. For one that is off by default, `enabled` is
 * what `true` resolves to (see `ENABLED`).
 */
function withoutDefaults(value: unknown, defaults: unknown, enabled?: unknown): unknown {
	if (value === undefined) return undefined;
	if (value === true && isPlain(defaults)) return undefined;
	if (isPlain(value)) {
		if (!isPlain(defaults) && isPlain(enabled)) return withoutDefaults(value, enabled) ?? true;
		const base = isPlain(defaults) ? defaults : {};
		const on = isPlain(enabled) ? enabled : {};
		const out: Plain = {};
		for (const [key, entry] of Object.entries(value)) {
			const rest = withoutDefaults(entry, base[key], on[key]);
			if (rest !== undefined) out[key] = rest;
		}
		return Object.keys(out).length > 0 ? out : undefined;
	}
	return sameValue(value, defaults) ? undefined : value;
}

/** `out`'s keys in the order `source` has them, so a minimised object reads like its input. */
function inOrderOf<T extends object>(source: object, out: Plain): T {
	const keys = [...Object.keys(source), ...Object.keys(out)];
	return Object.fromEntries([...new Set(keys)].filter((key) => key in out).map((key) => [key, out[key]])) as T;
}

/** The schema-specific parts `minimizeThemed` needs beyond the defaults. */
export type MinimizeParts = {
	/** The schema's `urls` resolver, so that resolved, absolute URLs collapse back to `urls.base`. */
	resolveUrls?(urls: Plain): object;
	/** The layer groups that draw anything, when that is not all of them (the satellite overlay). */
	layerGroups?: LayerGroupMap;
};

/**
 * Minimise an options object that carries a `theme`.
 *
 * Colours depend on the theme, so everything else is compared against the defaults of *this* theme.
 * The theme itself is compared against `defaultPalette` — otherwise a non-default palette would
 * equal its own defaults and vanish.
 *
 * `text` is minimised on its own (`minimizeText`): a value on a group or the root stands for many resolved
 * topics, so comparing it key by key against the resolved tree would keep all of it. `recolor.tint` and
 * `recolor.blend` (`minimizeMix`), `layers` (`minimizeLayers`) and `urls` (`minimizeUrls`) are too.
 */
export function minimizeThemed<T extends { theme?: ThemeOptions }>(
	options: T,
	defaultsFor: (theme: ResolvedTheme) => unknown,
	defaultPalette: Palette,
	parts: MinimizeParts = {}
): T {
	const { theme: raw, ...rest } = options;
	const theme = resolveTheme(raw, defaultPalette);
	const defaults = defaultsFor(theme) as { text?: ResolvedText };
	const input = rest as { text?: TextOptions; recolor?: RecolorOptions; layers?: unknown; urls?: unknown };

	const text = defaults.text && minimizeText(input.text, defaults.text);
	const recolor = input.recolor;
	const tint = minimizeMix(recolor, 'tint');
	const blend = minimizeMix(recolor, 'blend');
	const layers = minimizeLayers(input.layers, parts.layerGroups);
	const urls = parts.resolveUrls ? minimizeUrls(input.urls, parts.resolveUrls) : undefined;

	const remaining = {
		...rest,
		...(defaults.text && { text: undefined }),
		...(recolor !== undefined && { recolor: { ...recolor, tint: undefined, blend: undefined } }),
		layers: undefined,
		...(parts.resolveUrls && { urls: undefined }),
	};
	const out = (withoutDefaults(remaining, defaults, ENABLED) ?? {}) as Plain & { recolor?: Plain };
	if (text !== undefined) out.text = text;
	if (tint !== undefined) out.recolor = { ...out.recolor, tint };
	if (blend !== undefined) out.recolor = { ...out.recolor, blend };
	if (layers !== undefined) out.layers = layers;
	if (urls !== undefined) out.urls = urls;
	return inOrderOf<T>(options, theme === defaultPalette ? out : { theme, ...out });
}

/**
 * `recolor.tint` or `recolor.blend`, minimised: `undefined` when it has no effect.
 *
 * These cannot be compared against the resolved defaults key by key. A missing `amount` resolves to 0
 * when the whole object is missing, but to 0.5 when the object is there — so dropping `amount: 0`
 * turns the tint on, and dropping `{}` turns it off. An amount of 0 or less changes nothing whatever
 * the colour, so the object goes entirely; otherwise the amount is always written, and the colour
 * unless it is the default.
 */
function minimizeMix(recolor: RecolorOptions | undefined, key: 'tint' | 'blend'): RecolorOptions[typeof key] {
	if (recolor?.[key] === undefined) return undefined;
	const { color, amount } = resolveRecolor({ [key]: recolor[key] })[key];
	if (!(amount > 0)) return undefined;
	return sameValue(color, resolveRecolor()[key].color) ? { amount } : { color, amount };
}

type StyleValue = string | number;

/**
 * `text` in its smallest spelling, or `undefined` when it resolves to `defaults`.
 *
 * Each `LabelStyle` property is minimised on its own. The defaults differ between topics — bold refs,
 * uppercase boundaries — so this is a search rather than a collapse: for each value the root could take,
 * each group takes the value that leaves the fewest of its topics to spell out, and every topic that
 * still differs is written. The cheapest spelling wins; on a tie, the one that sets less higher up.
 * `language`, `languageStrict` and `pitchAlignment` are plain root values.
 */
function minimizeText(text: TextOptions | undefined, defaults: ResolvedText): TextOptions | undefined {
	if (text === undefined) return undefined;
	const resolved = resolveText(text, 'text', defaults);
	const root: Plain = {};
	for (const key of ['language', 'languageStrict', 'pitchAlignment'] as const) {
		if (resolved[key] !== defaults[key]) root[key] = resolved[key];
	}
	const groupNodes: Record<string, Plain> = {};
	const topicNodes: Partial<Record<TextTopic, Plain>> = {};

	for (const key of LABEL_STYLE_KEYS) {
		const valueOf = (topic: TextTopic): StyleValue => topicOf(resolved, topic)[key];
		const defaultOf = (topic: TextTopic): StyleValue => topicOf(defaults, topic)[key];
		const topicsOf = (group: string, leaves: readonly string[]) =>
			leaves.map((leaf) => `${group}.${leaf}` as TextTopic);
		const candidates = (topics: readonly TextTopic[]) => [undefined, ...new Set(topics.map(valueOf))];
		const differs = (topic: TextTopic, above: StyleValue | undefined) => valueOf(topic) !== (above ?? defaultOf(topic));

		let best: { rootValue?: StyleValue; groupValues: Map<string, StyleValue | undefined>; cost: number } | undefined;
		for (const rootValue of candidates(TEXT_TOPICS)) {
			const groupValues = new Map<string, StyleValue | undefined>();
			let cost = (rootValue === undefined ? 0 : 1) + (differs('addresses', rootValue) ? 1 : 0);
			for (const [group, leaves] of Object.entries(TEXT_GROUPS)) {
				const topics = topicsOf(group, leaves);
				let groupBest = { value: undefined as StyleValue | undefined, cost: Infinity };
				for (const groupValue of candidates(topics)) {
					const groupCost =
						(groupValue === undefined ? 0 : 1) + topics.filter((t) => differs(t, groupValue ?? rootValue)).length;
					if (groupCost < groupBest.cost) groupBest = { value: groupValue, cost: groupCost };
				}
				groupValues.set(group, groupBest.value);
				cost += groupBest.cost;
			}
			if (best === undefined || cost < best.cost) best = { rootValue, groupValues, cost };
		}

		const { rootValue, groupValues } = best!;
		if (rootValue !== undefined) root[key] = rootValue;
		if (differs('addresses', rootValue)) (topicNodes.addresses ??= {})[key] = valueOf('addresses');
		for (const [group, leaves] of Object.entries(TEXT_GROUPS)) {
			const groupValue = groupValues.get(group);
			if (groupValue !== undefined) (groupNodes[group] ??= {})[key] = groupValue;
			for (const topic of topicsOf(group, leaves)) {
				if (differs(topic, groupValue ?? rootValue)) (topicNodes[topic] ??= {})[key] = valueOf(topic);
			}
		}
	}

	for (const [group, leaves] of Object.entries(TEXT_GROUPS)) {
		const node: Plain = { ...groupNodes[group] };
		for (const leaf of leaves) {
			const topicNode = topicNodes[`${group}.${leaf}` as TextTopic];
			if (topicNode !== undefined) node[leaf] = topicNode;
		}
		if (Object.keys(node).length > 0) root[group] = node;
	}
	if (topicNodes.addresses !== undefined) root.addresses = topicNodes.addresses;
	return Object.keys(root).length > 0 ? (root as TextOptions) : undefined;
}

type GroupScalar = boolean | number;
type GroupTree = { [key: string]: GroupScalar | GroupTree };

/**
 * `layers` in its smallest spelling: resolved, then every branch whose groups all hold the same value
 * collapsed to that value, then every group left visible dropped. `{ labels: false }` resolves to
 * thirteen `false` leaves and comes back as `{ labels: false }`.
 *
 * `icons` is left out. It is only a fallback for `pois`, `markings` and `transit.stops`, which the
 * resolved tree always sets, so its own resolved value changes nothing — and writing it would hide
 * those groups wherever the output leaves them unset.
 *
 * `drawn` limits this to the groups that draw anything: a group the satellite overlay drops neither
 * blocks a collapse nor is written.
 */
function minimizeLayers(layers: unknown, drawn?: LayerGroupMap): unknown {
	if (layers === undefined) return undefined;
	const { icons: _alias, ...resolved } = resolveLayerGroups(layers as LayerGroupOptions) as unknown as GroupTree;
	const collapsed = collapseGroups(resolved, drawn);
	if (typeof collapsed !== 'object') return collapsed === true ? undefined : collapsed;
	return withoutVisible(collapsed);
}

function collapseGroups(node: GroupTree, drawn?: LayerGroupMap): GroupScalar | GroupTree {
	const out: GroupTree = {};
	for (const [key, child] of Object.entries(node)) {
		const groups = drawn?.[key];
		if (drawn !== undefined && groups === undefined) continue;
		out[key] = typeof child === 'object' ? collapseGroups(child, Array.isArray(groups) ? undefined : groups) : child;
	}
	const [first, ...others] = Object.values(out);
	const uniform = first !== undefined && typeof first !== 'object' && others.every((value) => value === first);
	return uniform ? first : out;
}

/** A group left out of an object is visible, since no scalar above it cascades down. */
function withoutVisible(node: GroupTree): GroupTree | undefined {
	const out: GroupTree = {};
	for (const [key, child] of Object.entries(node)) {
		const rest = typeof child === 'object' ? withoutVisible(child) : child === true ? undefined : child;
		if (rest !== undefined) out[key] = rest;
	}
	return Object.keys(out).length > 0 ? out : undefined;
}

/** A base no real URL has, to read each URL's default path off. */
/**
 * A base no caller would use, resolved once so that each URL key reveals the path it takes under a
 * base. The trailing slash is load-bearing: `startsWith(PROBE_BASE)` without it also matches a
 * caller-supplied `https://probe.invalid.example.com/…`, which would propose a nonsense base. Nothing
 * unsafe followed — every candidate base is re-resolved and compared below, so a bogus one is
 * discarded rather than believed — but the loose prefix test is what CodeQL's
 * `js/incomplete-url-substring-sanitization` flags, and it is right that the boundary belongs here.
 *
 * The separator is kept out of `PROBE_BASE` itself so that `slice(PROBE_BASE.length)` still leaves the
 * leading `/` on the path; folding it in would move it into the base and emit `urls.base` with a
 * trailing slash.
 */
const PROBE_BASE = 'https://probe.invalid';
const PROBE_PREFIX = `${PROBE_BASE}/`;

/**
 * `urls` as the fewest keys that resolve to the same URLs.
 *
 * Resolved URLs are absolute, so comparing them against the defaults keeps every one that is not on
 * the default base. Instead, each URL that is its default path under some base proposes that base,
 * and the base that leaves the fewest keys wins — written as `urls.base`, or left out when it is the
 * default base. A URL that still differs is kept in the caller's spelling when that resolves the same.
 */
function minimizeUrls(urls: unknown, resolveUrls: (urls: Plain) => object): Plain | undefined {
	if (!isPlain(urls)) return undefined;
	const resolveWith = (options: Plain): Plain | undefined => {
		try {
			return resolveUrls(options) as Plain;
		} catch {
			return undefined;
		}
	};
	const resolved = resolveUrls(urls) as Plain;
	const probe = resolveWith({ base: PROBE_BASE }) ?? {};

	const bases = new Set([DEFAULT_BASE, ...(typeof urls.base === 'string' ? [urls.base] : [])]);
	for (const [key, url] of Object.entries(resolved)) {
		const fallback = probe[key];
		if (typeof url !== 'string' || typeof fallback !== 'string' || !fallback.startsWith(PROBE_PREFIX)) continue;
		const path = fallback.slice(PROBE_BASE.length);
		if (url.endsWith(path) && url.length > path.length) bases.add(url.slice(0, -path.length));
	}

	let best: Plain | undefined;
	for (const base of bases) {
		const defaults = resolveWith({ base });
		if (defaults === undefined) continue;
		const out: Plain = base === DEFAULT_BASE ? {} : { base };
		for (const [key, url] of Object.entries(resolved)) {
			if (sameValue(url, defaults[key])) continue;
			const own = urls[key];
			out[key] = own !== undefined && sameValue(resolveWith({ base, [key]: own })?.[key], url) ? own : url;
		}
		if (best === undefined || Object.keys(out).length < Object.keys(best).length) best = out;
	}
	return best !== undefined && Object.keys(best).length > 0 ? best : undefined;
}

/** The smallest `OsmOptions` that builds the same style as `options`. */
export function minimizeOsmOptions(options: OsmOptions = {}): OsmOptions {
	resolveOsm(options); // rejects unknown keys; the resolved result is not needed
	return minimizeThemed(options, (theme) => resolveOsm({ theme }), 'colorful', { resolveUrls: resolveOsmUrls });
}

/** The smallest `SatelliteOptions` that builds the same style as `options`. */
export function minimizeSatelliteOptions(
	options: SatelliteOptions = {},
	/** Supplies the overlay's layer-group map. A function, so it is only built if an overlay is given. */
	overlayGroups: () => LayerGroupMap
): SatelliteOptions {
	resolveSatellite(options); // rejects unknown keys; the resolved result is not needed
	const { osmOverlay, urls: rawUrls, ...rest } = options;
	const out = (withoutDefaults(rest, resolveSatellite(), ENABLED) ?? {}) as Plain;
	const urls = minimizeUrls(rawUrls, resolveSatelliteUrls);
	if (urls !== undefined) out.urls = urls;
	if (osmOverlay === false) out.osmOverlay = false;
	if (isPlain(osmOverlay)) {
		// The overlay defaults to `gray` and its colours follow its own theme. Compare against what
		// `satellite()` itself resolves for that theme, not plain overlay defaults: it layers the imagery
		// defaults (white labels, dark halo, bold font) on top, and those must minimise away too.
		const overlay = minimizeThemed<OsmOverlayOptions>(
			osmOverlay,
			(theme) => resolveSatellite({ osmOverlay: { theme } }).osmOverlay,
			'gray',
			{ layerGroups: overlayGroups() }
		);
		if (Object.keys(overlay).length > 0) out.osmOverlay = overlay;
	}
	return inOrderOf<SatelliteOptions>(options, out);
}
