import { checkKeys } from './keys.js';

/**
 * A glyph name, as the glyph server publishes it: `'noto_sans_regular'`, `'fira_sans_semibold_italic'`,
 * … — or any name a custom server uses. Not checked: `osm()` does no I/O, so it cannot know which
 * faces a server has. `fetchFontFaces()` asks the server.
 */
export type FontName = string;

/** Capitalization of a label's text. */
export type TextTransform = 'none' | 'uppercase' | 'lowercase';

/**
 * How labels that follow a line — street, river and motorway names — sit in a tilted map: lying on
 * the ground (`map`, MapLibre's own behaviour for line labels) or standing up facing the viewer
 * (`viewport`). Point labels, such as places and POIs, face the viewer either way.
 */
export type PitchAlignment = 'map' | 'viewport';

/**
 * How a node of the text tree sets its labels. Every property is optional: a topic takes each one from
 * the nearest node above it that sets it, else from the style's default for that topic.
 */
export type LabelStyle = {
	/** A glyph name, e.g. `'noto_sans_regular'`. */
	font?: FontName;
	/** Multiplies the layer's own text size. Default `1`. */
	scale?: number;
	/**
	 * How far apart labels keep. Along a line it multiplies the repeat distance; at a point each step above
	 * 1 adds 14 px of collision padding. Default `1`.
	 */
	spacing?: number;
	/** Wrap width in ems. Default `10`. */
	maxWidth?: number;
	/** Line height in ems. Default `1.2`. */
	lineHeight?: number;
	/** Letter spacing in ems. Default `0`. */
	letterSpacing?: number;
	/** Capitalization. Default `'none'`, `'uppercase'` for boundaries, hamlets and districts. */
	transform?: TextTransform;
	/** Halo width in px. Default `2`; `1` for motorway exits, `0.1` for motorway refs, `0.5` for POIs, `0` for addresses. */
	haloWidth?: number;
	/** Halo blur in px. Default `1`; `0.5` for POIs, `0` for addresses. */
	haloBlur?: number;
};

export type ResolvedLabelStyle = Required<LabelStyle>;

/**
 * `text`: the label language, and a tree of label topics whose every node — the root, a group, a topic —
 * takes the same `LabelStyle` properties. `language`, `languageStrict` and `pitchAlignment` apply to
 * every label and are set on the root only.
 */
export type TextOptions = LabelStyle & {
	/** `'local'` (each feature's own name), `'user'` (the browser language), or a code such as `'de'`. Default `'local'`. */
	language?: string;
	/** Omit labels that have no name in `language`, instead of falling back to the local name. Default `false`. */
	languageStrict?: boolean;
	/** Line labels in a tilted map. Default `'map'`. */
	pitchAlignment?: PitchAlignment;
	boundaries?: LabelStyle & { countries?: LabelStyle; states?: LabelStyle };
	places?: LabelStyle & { cities?: LabelStyle; villages?: LabelStyle; hamlets?: LabelStyle; districts?: LabelStyle };
	streets?: LabelStyle & { names?: LabelStyle; refs?: LabelStyle; exits?: LabelStyle };
	water?: LabelStyle & { lakes?: LabelStyle; rivers?: LabelStyle };
	/** Names drawn with POI icons (`general`) and transit stop icons (`transit`). */
	pois?: LabelStyle & { general?: LabelStyle; transit?: LabelStyle };
	addresses?: LabelStyle;
};

/** Every topic with every `LabelStyle` property. Valid as input, where it builds the same style. */
export type ResolvedText = {
	language: string;
	languageStrict: boolean;
	pitchAlignment: PitchAlignment;
	boundaries: { countries: ResolvedLabelStyle; states: ResolvedLabelStyle };
	places: {
		cities: ResolvedLabelStyle;
		villages: ResolvedLabelStyle;
		hamlets: ResolvedLabelStyle;
		districts: ResolvedLabelStyle;
	};
	streets: { names: ResolvedLabelStyle; refs: ResolvedLabelStyle; exits: ResolvedLabelStyle };
	water: { lakes: ResolvedLabelStyle; rivers: ResolvedLabelStyle };
	pois: { general: ResolvedLabelStyle; transit: ResolvedLabelStyle };
	addresses: ResolvedLabelStyle;
};

// ── The topic tree ─────────────────────────────────────────────────────────────

/**
 * The text topics, by group. The groups and their children are the label groups of `layers.labels`,
 * plus `pois`, whose two topics are the names drawn with POI and transit-stop icons.
 */
export const TEXT_GROUPS = {
	boundaries: ['countries', 'states'],
	places: ['cities', 'villages', 'hamlets', 'districts'],
	streets: ['names', 'refs', 'exits'],
	water: ['lakes', 'rivers'],
	pois: ['general', 'transit'],
} as const;

type Groups = typeof TEXT_GROUPS;
type GroupName = keyof Groups;

/** A leaf of the text tree: `'water.rivers'`, `'pois.transit'`, …, or `'addresses'`. */
export type TextTopic = { [G in GroupName]: `${G}.${Groups[G][number]}` }[GroupName] | 'addresses';

/** A value per text topic, in the shape of the text tree. */
export type TopicTree<T> = { [G in GroupName]: { [L in Groups[G][number]]: T } } & { addresses: T };

/** Every text topic, groups first. */
export const TEXT_TOPICS: readonly TextTopic[] = [
	...Object.entries(TEXT_GROUPS).flatMap(([group, leaves]) => leaves.map((leaf) => `${group}.${leaf}` as TextTopic)),
	'addresses',
];

/** The value `f` gives for each topic, as a topic tree. */
export function mapTopics<T>(f: (topic: TextTopic) => T): TopicTree<T> {
	const out = {} as Record<string, unknown>;
	for (const [group, leaves] of Object.entries(TEXT_GROUPS)) {
		out[group] = Object.fromEntries(leaves.map((leaf) => [leaf, f(`${group}.${leaf}` as TextTopic)]));
	}
	out.addresses = f('addresses');
	return out as TopicTree<T>;
}

/** A topic's value in a topic tree — `ResolvedText` is one. */
export function topicOf<T>(tree: TopicTree<T>, topic: TextTopic): T {
	if (topic === 'addresses') return tree.addresses;
	const [group, leaf] = topic.split('.') as [GroupName, string];
	return (tree[group] as Record<string, T>)[leaf];
}

// ── Defaults ───────────────────────────────────────────────────────────────────

export const DEFAULT_FONT_REGULAR = 'noto_sans_regular';
export const DEFAULT_FONT_BOLD = 'noto_sans_bold';

/**
 * MapLibre's own defaults of the properties the text options write. A resolved value equal to one of
 * these is left out of the style, so a default style does not carry six extra properties per text layer.
 */
export const MAPLIBRE_TEXT_DEFAULTS = {
	maxWidth: 10,
	lineHeight: 1.2,
	letterSpacing: 0,
	transform: 'none',
	haloWidth: 0,
	haloBlur: 0,
} as const satisfies Partial<ResolvedLabelStyle>;

/** What a topic sets differently from the common defaults in `DEFAULT_LABEL_STYLES`. */
const TOPIC_DEFAULTS: Partial<Record<TextTopic, LabelStyle>> = {
	'boundaries.countries': { transform: 'uppercase' },
	'boundaries.states': { transform: 'uppercase' },
	'places.hamlets': { transform: 'uppercase' },
	'places.districts': { transform: 'uppercase' },
	'streets.refs': { font: DEFAULT_FONT_BOLD, haloWidth: 0.1 },
	'streets.exits': { haloWidth: 1 },
	'pois.general': { font: DEFAULT_FONT_BOLD, haloWidth: 0.5, haloBlur: 0.5 },
	addresses: { haloWidth: 0, haloBlur: 0 },
};

/** The label style of every topic in `osm()`, `omt()` and `protomaps()`. */
export const DEFAULT_LABEL_STYLES: TopicTree<ResolvedLabelStyle> = mapTopics((topic) => ({
	font: DEFAULT_FONT_REGULAR,
	scale: 1,
	spacing: 1,
	...MAPLIBRE_TEXT_DEFAULTS,
	haloWidth: 2,
	haloBlur: 1,
	...TOPIC_DEFAULTS[topic],
}));

// ── Resolving ──────────────────────────────────────────────────────────────────

/** The `LabelStyle` properties, in the order they are documented. */
export const LABEL_STYLE_KEYS = [
	'font',
	'scale',
	'spacing',
	'maxWidth',
	'lineHeight',
	'letterSpacing',
	'transform',
	'haloWidth',
	'haloBlur',
] as const satisfies readonly (keyof LabelStyle)[];

const TRANSFORMS: readonly TextTransform[] = ['none', 'uppercase', 'lowercase'];
const PITCH_ALIGNMENTS: readonly PitchAlignment[] = ['map', 'viewport'];

type Node = Record<string, unknown>;

const keySet = (keys: readonly string[]): Record<string, true> => Object.fromEntries(keys.map((key) => [key, true]));

/** Reject a `LabelStyle` value of the wrong type. */
function checkStyleValue(key: (typeof LABEL_STYLE_KEYS)[number], value: unknown, path: string): void {
	if (value === undefined) return;
	const expected =
		key === 'font'
			? typeof value === 'string' && value !== ''
				? undefined
				: 'a font name string'
			: key === 'transform'
				? TRANSFORMS.includes(value as TextTransform)
					? undefined
					: `one of ${TRANSFORMS.join(', ')}`
				: typeof value === 'number' && Number.isFinite(value)
					? undefined
					: 'a number';
	if (expected !== undefined) throw new Error(`${path}: expected ${expected}, got ${JSON.stringify(value)}`);
}

/** A node of the text tree, checked: an object with only `known` keys and well-typed style values. */
function textNode(value: unknown, known: readonly string[], path: string): Node | undefined {
	if (value === undefined) return undefined;
	if (value === null || typeof value !== 'object' || Array.isArray(value)) {
		throw new Error(`${path}: expected an object, got ${JSON.stringify(value)}`);
	}
	checkKeys(value as Node, keySet(known) as never, path);
	for (const key of LABEL_STYLE_KEYS) checkStyleValue(key, (value as Node)[key], `${path}.${key}`);
	return value as Node;
}

/**
 * Resolve `text`. Each topic property comes from the nearest node that sets it — the topic, its group,
 * the root — else from `defaults`, which is `DEFAULT_LABEL_STYLES` or the satellite overlay's own.
 */
export function resolveText(
	text?: TextOptions,
	path = 'text',
	defaults: TopicTree<ResolvedLabelStyle> = DEFAULT_LABEL_STYLES
): ResolvedText {
	const root = textNode(
		text,
		['language', 'languageStrict', 'pitchAlignment', ...LABEL_STYLE_KEYS, ...Object.keys(TEXT_GROUPS), 'addresses'],
		path
	);
	const pitchAlignment = text?.pitchAlignment ?? 'map';
	if (!PITCH_ALIGNMENTS.includes(pitchAlignment)) {
		throw new Error(
			`${path}.pitchAlignment: unknown value "${String(pitchAlignment)}". Valid values: ${PITCH_ALIGNMENTS.join(', ')}.`
		);
	}

	const nodes = new Map<string, Node | undefined>();
	nodes.set('addresses', textNode(root?.addresses, LABEL_STYLE_KEYS, `${path}.addresses`));
	for (const [group, leaves] of Object.entries(TEXT_GROUPS)) {
		const groupNode = textNode(root?.[group], [...LABEL_STYLE_KEYS, ...leaves], `${path}.${group}`);
		nodes.set(group, groupNode);
		for (const leaf of leaves) {
			nodes.set(`${group}.${leaf}`, textNode(groupNode?.[leaf], LABEL_STYLE_KEYS, `${path}.${group}.${leaf}`));
		}
	}

	const styles = mapTopics((topic): ResolvedLabelStyle => {
		const group = topic.split('.')[0];
		const chain = [nodes.get(topic), topic === group ? undefined : nodes.get(group), root];
		const fallback = topicOf(defaults, topic);
		return Object.fromEntries(
			LABEL_STYLE_KEYS.map((key) => [key, chain.find((node) => node?.[key] !== undefined)?.[key] ?? fallback[key]])
		) as ResolvedLabelStyle;
	});

	return {
		language: text?.language ?? 'local',
		languageStrict: text?.languageStrict ?? false,
		pitchAlignment,
		...styles,
	};
}

/**
 * The language labels are drawn in: `'user'` becomes the browser's language (`'de'` for `de-AT`), or
 * `'local'` where there is no browser. Every other value is returned as it is.
 */
export function labelLanguage(language: string): string {
	if (language !== 'user') return language;
	return (typeof navigator !== 'undefined' ? navigator.language?.split('-')[0] : undefined) || 'local';
}
