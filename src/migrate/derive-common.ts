import type { SchemaName } from '../api/index.js';
import { EXTRUSION_OPACITY } from '../cartography/index.js';
import { getTextGroupMap, type LayerGroupMap, SHORTBREAD_SCHEMA } from '../shortbread/index.js';
import {
	DEFAULT_FONT_BOLD,
	DEFAULT_FONT_REGULAR,
	DEFAULT_LABEL_STYLES,
	TEXT_TOPICS,
	topicOf as labelStyleOf,
	type IconOptions,
	type TextTopic,
	type LayerGroupOptions,
	type OsmOptions,
	type PitchAlignment,
	type SkyOptions,
	type SunOptions,
	type TextOptions,
} from '../options/index.js';
import type { HillshadeLayerSpecification } from '@maplibre/maplibre-gl-style-spec';
import type { StyleSpecification } from '../types/index.js';
import { parseRGBA } from './calibrate.js';
import { labelText, NAME_MARKER, type ProbeReading } from './evaluate.js';
import { PADDING_PER_SPACING } from '../lib/index.js';
import { colorDistance } from './math.js';
import { diagnostic } from './diagnostics.js';
import type { ReportBuilder } from './derive-report.js';
import { OVERRIDE_DISTANCE, round2, osmTarget, modelFor } from './derive-content.js';

/**
 * Step 5 of `deriveOptions` (see `derive.ts`): everything that is not a colour — label language, fonts
 * and style, icons, 3D buildings, terrain, hillshade, light, sky and projection.
 */

/**
 * How far apart the icon ratios have to spread before one multiplier is worth reporting as a
 * compromise. 15%: below that the probes broadly agree and the mean represents them.
 */
const ICON_SPREAD = 0.15;

/** Shortbread's languages, as the VersaTiles tileset carries them. */
const LANGUAGES = new Set(
	SHORTBREAD_SCHEMA.place_labels.fields.filter((f) => f.startsWith('name_')).map((f) => f.slice(5))
);

/** Probes whose label text tells the language, most telling first. */
const LANGUAGE_PROBES = [
	'label-place-city',
	'label-place-town',
	'label-place-village',
	'label-place-capital',
	'label-place-suburb',
	'label-street-primary',
];

/**
 * `layers.buildings` set to the opacity a style draws its extrusions at.
 *
 * On the target that option is the extrusion opacity outright, because in extruded mode `building-3d`
 * is the only layer in its group — flat footprints emit nothing — so the group's opacity and the
 * building opacity are the same number. `hiddenGroups` only ever writes `false`, so there is nothing
 * to overwrite here; a hidden group is left hidden, and anyway a style that hides its buildings gives
 * no extrusion to read.
 *
 * The cartographic default is left to say itself: `true` and an unset option both mean "as the
 * cartography drew it", so a style already at {@link EXTRUSION_OPACITY} writes nothing.
 */
export function withExtrusionOpacity(
	layers: LayerGroupOptions,
	readings: ReadonlyMap<string, ProbeReading>,
	features: Common['features']
): LayerGroupOptions {
	if (features.buildings !== 'extruded' || layers.buildings === false) return layers;
	const opacity = readings.get('building')?.extrusionOpacity;
	if (opacity === undefined) return layers;
	const rounded = Math.round(opacity * 20) / 20;
	if (rounded <= 0 || rounded > 1 || rounded === EXTRUSION_OPACITY) return layers;
	return { ...layers, buildings: rounded };
}

type Common = {
	content: { text?: TextOptions; icon?: IconOptions };
	features: NonNullable<OsmOptions['features']>;
	globals: Pick<OsmOptions, 'sun' | 'projection'>;
};

export function deriveCommon(
	style: StyleSpecification,
	readings: ReadonlyMap<string, ProbeReading>,
	schemas: ReadonlyMap<string, SchemaName>,
	fontNames: readonly string[] | undefined,
	report: ReportBuilder
): Common {
	const content: Common['content'] = {};
	const scale = deriveLabelScale(readings);
	const pitchAlignment = derivePitchAlignment(readings);
	// Merged, not spread: `deriveFonts` and `deriveHalo` both return a tree of the same topics, so a
	// shallow spread would leave whichever came last as the only one heard — the fonts of every topic
	// replaced by its halo, or the other way round.
	const text: TextOptions = mergeTextTrees(
		deriveText(readings, report) ?? {},
		scale !== undefined ? { scale } : {},
		pitchAlignment !== undefined ? { pitchAlignment } : {},
		deriveFonts(readings, fontNames, report),
		deriveLabelStyle(readings, report)
	);
	if (Object.keys(text).length > 0) content.text = text;
	const icon = deriveIcon(readings, report);
	if (icon) content.icon = icon;

	const features: Common['features'] = {};
	if (readings.get('building')?.extruded) features.buildings = 'extruded';
	if (style.terrain) {
		const exaggeration = style.terrain.exaggeration;
		features.terrain = typeof exaggeration === 'number' && exaggeration !== 1 ? { exaggeration } : true;
	}
	const hillshade = style.layers.find(
		(l): l is HillshadeLayerSpecification => l.type === 'hillshade' && l.layout?.visibility !== 'none'
	);
	if (hillshade) {
		const exaggeration = hillshade.paint?.['hillshade-exaggeration'];
		features.hillshade = typeof exaggeration === 'number' ? { exaggeration } : true;
		// It was read, so it is not unread — this layer used to be reported as untouched on every style
		// that has one, because only probe readings were counted as having used a layer.
		report.used.add(hillshade.id);
	}

	const globals: Common['globals'] = {};
	const projection = style.projection?.type;
	if (projection === undefined) globals.projection = 'mercator';
	else if (projection === 'globe' || projection === 'mercator' || projection === 'vertical-perspective') {
		globals.projection = projection;
	} else {
		report.say(
			diagnostic(
				'projection.unsupported',
				`projection ${JSON.stringify(projection)} is not supported; the default is used`,
				{ requested: String(projection) },
				{ optionPath: 'projection' }
			)
		);
	}

	if (style.light) globals.sun = deriveSun(style.light);

	if (style.sprite) {
		report.say(
			diagnostic('icons.replaced', 'icons are not carried over; the VersaTiles sprite is used', {
				sprite: style.sprite,
			})
		);
	}
	if (schemas.size > 1) {
		report.say(
			diagnostic('source.multiple', `${schemas.size} vector sources: all of them were read as one map`, {
				sources: Object.fromEntries(schemas),
			})
		);
	}
	return { content, features, globals };
}

/** The language labels are shown in: the first `name…` field a place label reads. */
function deriveText(readings: ReadonlyMap<string, ProbeReading>, report: ReportBuilder): TextOptions | undefined {
	// Every place label is read before one is chosen, where this used to return on the first: a style
	// whose city names are German and whose town names are French had no way of saying so, because the
	// second was never looked at. The first still wins — `LANGUAGE_PROBES` is in order of how telling
	// each is — but the disagreement is now reportable.
	// One walk, feeding both the decision and the conflict report. They used to be two, computing the
	// same field by different routes and disagreeing about it: the scan ignored any probe reading a
	// plain `name`, while the decision *stopped* at the first of them. So a style whose city labels are
	// local and whose town and village labels are German and French was reported as `text.language`
	// = "de" — `optionPath` and all — while the options it returned carried no language at all.
	const seen: { id: string; language?: string }[] = [];
	for (const id of LANGUAGE_PROBES) {
		const field = nameFieldOf(readings.get(id));
		if (field === undefined) continue; // no label, or one that reads no name field
		seen.push({ id, language: /^name[_:]([a-z]{2,3})$/.exec(field)?.[1] });
	}

	// `LANGUAGE_PROBES` is in order of how telling each probe is, so the first that reads a name field
	// decides — including when it reads a plain `name`, which is itself an answer: local names.
	const chosen = decide(seen[0]);

	const languages = new Map<string, string[]>();
	for (const { id, language } of seen) {
		if (language) (languages.get(language) ?? languages.set(language, []).get(language)!).push(id);
	}
	if (languages.size > 1) {
		const observed = [...languages].map(([language, probes]) => ({ language, probes }));
		// Named from the decision rather than from `observed[0]`, so the report cannot claim a language
		// the returned options do not set — which is what it did whenever the two walks disagreed, and
		// whenever the winning language turned out to be one the tiles do not carry.
		const taken = chosen?.language;
		report.say(
			diagnostic(
				'language.conflict',
				`labels are read in ${languages.size} languages (${observed.map((o) => o.language).join(', ')}); ${
					taken ? `"${taken}"` : 'the local name'
				} was taken`,
				{ chosen: taken, observed },
				{ optionPath: 'text.language' }
			)
		);
	}
	return chosen;

	function decide(first: { id: string; language?: string } | undefined): TextOptions | undefined {
		if (!first?.language) return undefined; // nothing read a name field, or it read `name`/`name:latin`
		const { language } = first;
		if (!LANGUAGES.has(language)) {
			report.say(
				diagnostic(
					'language.unavailable',
					`labels in "${language}" are not available in VersaTiles tiles; local names are used`,
					{ requested: language },
					{ optionPath: 'text.language' }
				)
			);
			return undefined;
		}
		const reading = readings.get(first.id);
		if (!reading?.label) return undefined;
		// Strict when hiding the language — in either spelling, which OpenMapTiles both carries — leaves no name.
		const fallback = labelText(
			reading.label.layer,
			reading.zoom,
			reading.probe,
			reading.label.feature,
			new Set([`name_${language}`, `name:${language}`])
		);
		return { language, ...(!fallback.includes(NAME_MARKER) && { languageStrict: true }) };
	}
}

/** Recursively merge `text` option trees, later trees winning leaf by leaf rather than branch by branch. */
function mergeTextTrees(...trees: TextOptions[]): TextOptions {
	const isBranch = (v: unknown): v is Record<string, unknown> =>
		typeof v === 'object' && v !== null && !Array.isArray(v);
	const out: Record<string, unknown> = {};
	for (const tree of trees) {
		for (const [key, value] of Object.entries(tree)) {
			const prev = out[key];
			out[key] = isBranch(prev) && isBranch(value) ? mergeTextTrees(prev as TextOptions, value as TextOptions) : value;
		}
	}
	return out as TextOptions;
}

/**
 * Which `text` topic each of the target's label layers belongs to — the map a probe reading is turned
 * into a topic through, since a probe is named after the layer it reads.
 */
function textTopicOfLayer(): Map<string, TextTopic> {
	const topicOf = new Map<string, TextTopic>();
	const groups = getTextGroupMap();
	for (const topic of TEXT_TOPICS) {
		const [group, leaf] = topic.split('.');
		const ids = (leaf === undefined ? groups[group] : (groups[group] as LayerGroupMap)?.[leaf]) as string[] | undefined;
		for (const id of ids ?? []) topicOf.set(id, topic);
	}
	return topicOf;
}

/** The `name…` field a label reading shows, or undefined where it shows none. */
function nameFieldOf(reading: ProbeReading | undefined): string | undefined {
	if (!reading?.label) return undefined;
	const shown = labelText(reading.label.layer, reading.zoom, reading.probe, reading.label.feature);
	return new RegExp(NAME_MARKER + '(name[\\w:-]*)').exec(shown)?.[1];
}

/** Words naming a face rather than a family. */
const FACE_WORD = /_(regular|italic|oblique|medium|book|light|thin|bold|semi_?bold|demi_?bold|black|heavy|extra_?\w+)$/;

/** `Noto Sans Bold Italic` and `noto_sans_bold` are both the family `noto_sans`. */
function fontFamily(font: string): string {
	let family = font.toLowerCase().replace(/[\s-]+/g, '_');
	while (FACE_WORD.test(family)) family = family.replace(FACE_WORD, '');
	return family;
}

/** A font counts as bold when its name says so; anything lighter, Medium included, as regular. */
const BOLD_FONT = /bold|black|heavy|demi/i;

/** A font name as the glyph server spells its id: `Open Sans Bold` → `open_sans_bold`. */
function glyphId(font: string): string {
	return font
		.toLowerCase()
		.replace(/[-_\s]+/g, ' ')
		.trim()
		.replace(/ /g, '_');
}

/** The first of the most frequent keys. */
function mostVoted<T>(votes: ReadonlyMap<T, number>): T | undefined {
	let best: T | undefined;
	let most = 0;
	for (const [key, count] of votes) {
		if (count > most) [best, most] = [key, count];
	}
	return best;
}

const vote = <T>(votes: Map<T, number>, key: T) => votes.set(key, (votes.get(key) ?? 0) + 1);

/**
 * The `font` of each `text` topic, from the fonts the style sets its labels in.
 *
 * `fontNames` are the glyph names the target's glyph server publishes, from its `font_families.json`
 * (`guessOptions` fetches them). Without them only the target's own faces, Noto Sans regular and bold,
 * are known, and every other font carries over its weight alone.
 *
 * A foreign font the glyph server also publishes is carried over as it is (`Open Sans Bold` →
 * `open_sans_bold`); one of a family the server has, in a face it has not (`Noto Sans Medium`), becomes
 * that family's regular or bold. Each topic then takes, in order:
 *
 *  1. the face most of its own probes are set in;
 *  2. for a topic no probe reads (`water.lakes`, `streets.refs`, `streets.exits`), the face of a topic in
 *     the same group that the target sets in the same weight — lake names follow river names;
 *  3. the style's most used family, in the weight the style gives the topic's role — regular or bold,
 *     as the target sets the topic;
 *  4. Noto Sans in that weight, when no font of the style is on the server — the weights still carry over.
 *
 * A label layer that sets no `text-font` is not read: MapLibre would draw it in its default font, which
 * says nothing about the style's choice. Fonts neither the server nor its families have are named in a
 * warning. Every topic is spelled out; minimising drops what equals the target's own.
 */
function deriveFonts(
	readings: ReadonlyMap<string, ProbeReading>,
	fontNames: readonly string[] | undefined,
	report: ReportBuilder
): TextOptions {
	const known: ReadonlySet<string> = new Set([...(fontNames ?? []), DEFAULT_FONT_REGULAR, DEFAULT_FONT_BOLD]);
	const base = modelFor(osmTarget(), 'light').base;
	const topicOf = textTopicOfLayer();
	const knownFamilies = new Set([...known].map(fontFamily));
	const roleOf = (topic: TextTopic) =>
		labelStyleOf(DEFAULT_LABEL_STYLES, topic).font === DEFAULT_FONT_BOLD ? 'bold' : 'regular';

	const weights = { regular: [0, 0], bold: [0, 0] };
	const topicFaces = new Map<TextTopic, Map<string, number>>();
	/** Which probes spoke for each topic, so provenance can name them. */
	const probesOf = new Map<TextTopic, string[]>();
	const families = new Map<string, number>();
	const lost = new Set<string>();
	for (const reading of readings.values()) {
		// A layer that sets no `text-font` gets MapLibre's default, Open Sans: the style chose no font.
		if (
			(reading.label?.layer as { layout?: Record<string, unknown> } | undefined)?.layout?.['text-font'] === undefined
		) {
			continue;
		}
		const foreign = reading.textFont?.[0];
		const own = base.get(reading.probe.id)?.textFont?.[0];
		if (!foreign || !own) continue;
		const bold = BOLD_FONT.test(foreign);
		weights[own === DEFAULT_FONT_BOLD ? 'bold' : 'regular'][bold ? 1 : 0]++;

		const family = fontFamily(foreign);
		const inFamily = `${family}_${bold ? 'bold' : 'regular'}`;
		const face = known.has(glyphId(foreign))
			? glyphId(foreign)
			: knownFamilies.has(family) && known.has(inFamily)
				? inFamily
				: undefined;
		if (face === undefined) {
			lost.add(foreign);
			continue;
		}
		vote(families, fontFamily(face));
		const topic = topicOf.get(reading.probe.id);
		if (topic) {
			vote((topicFaces.get(topic) ?? topicFaces.set(topic, new Map()).get(topic))!, face);
			(probesOf.get(topic) ?? probesOf.set(topic, []).get(topic)!).push(reading.probe.id);
		}
	}
	if (lost.size > 0) {
		const why = fontNames ? 'the glyph server does not publish' : 'unknown without the glyph server font list';
		report.say(
			diagnostic(
				'font.unavailable',
				`fonts ${why} are not carried over (${[...lost].join(', ')}); only regular or bold is`,
				{ requested: [...lost], reason: fontNames ? 'not-published' : 'no-font-list' },
				{ optionPath: 'text.font' }
			)
		);
	}
	const read = { regular: weights.regular[0] + weights.regular[1] > 0, bold: weights.bold[0] + weights.bold[1] > 0 };
	if (!read.regular && !read.bold) return {};
	const weightOf = (role: 'regular' | 'bold') => {
		if (!read[role]) return role;
		const [regular, bold] = weights[role];
		return bold > regular ? 'bold' : 'regular';
	};
	const family = mostVoted(families);

	const tree: Record<string, Record<string, unknown>> = {};
	for (const topic of TEXT_TOPICS) {
		const role = roleOf(topic);
		const [group, leaf] = topic.split('.');
		const sibling = () => {
			if (leaf === undefined || topicFaces.has(topic)) return undefined;
			const votes = new Map<string, number>();
			for (const other of TEXT_TOPICS) {
				if (other === topic || !other.startsWith(`${group}.`) || roleOf(other) !== role) continue;
				for (const [face, count] of topicFaces.get(other) ?? []) votes.set(face, (votes.get(face) ?? 0) + count);
			}
			return mostVoted(votes);
		};
		const inFamily = family === undefined ? undefined : `${family}_${weightOf(role)}`;
		// Which of the four steps produced the face, recorded alongside it: they write the same option
		// and are indistinguishable afterwards, though the first is what the style asked for and the
		// last is the target's own font picked by weight alone.
		const own = mostVoted(topicFaces.get(topic) ?? new Map<string, number>());
		const fromSibling = own === undefined ? sibling() : undefined;
		const fromFamily =
			own === undefined && fromSibling === undefined && inFamily !== undefined && known.has(inFamily)
				? inFamily
				: undefined;
		const face =
			own ??
			fromSibling ??
			fromFamily ??
			(read[role] ? (weightOf(role) === 'bold' ? DEFAULT_FONT_BOLD : DEFAULT_FONT_REGULAR) : undefined);
		if (face === undefined) continue;
		if (own !== undefined) {
			const votes = [...(topicFaces.get(topic) ?? [])].sort((a, b) => b[1] - a[1]);
			if (votes.length > 1) {
				report.say(
					diagnostic(
						'font.conflict',
						`"${topic}" labels are set in ${votes.length} fonts (${votes.map(([f]) => f).join(', ')}); "${own}" was taken`,
						{ topic, chosen: own, observed: votes.map(([font, count]) => ({ font, count })) },
						{ optionPath: `text.${topic}.font`, origin: { layers: probesOf.get(topic) } }
					)
				);
			}
		}
		report.note(`text.${topic}.font`, {
			origin: own !== undefined ? 'observed' : (fromSibling ?? fromFamily) ? 'pooled' : 'default',
			...(own !== undefined && { from: probesOf.get(topic) }),
		});
		if (leaf === undefined) tree[group] = { font: face };
		else (tree[group] ??= {})[leaf] = { font: face };
	}
	return tree as TextOptions;
}

/** The middle value of a non-empty list, rounded to steps of 0.05. */
function median05(values: readonly number[]): number {
	const sorted = [...values].sort((a, b) => a - b);
	return Math.round(sorted[Math.floor(sorted.length / 2)] * 20) / 20;
}

/**
 * The `LabelStyle` properties derived from what the style draws, as opposed to how it draws it.
 *
 * `font` and `scale` are not here — they are derived against the glyph server's font list and against
 * the target's own label sizes, neither of which is a property of the layer. Everything else in
 * `LABEL_STYLE_KEYS` is.
 */
const DERIVED_LABEL_KEYS = [
	'haloWidth',
	'haloBlur',
	'maxWidth',
	'lineHeight',
	'letterSpacing',
	'transform',
	'spacing',
] as const;

type DerivedLabelKey = (typeof DERIVED_LABEL_KEYS)[number];

/**
 * The label style of each `text` topic, from what the style draws: halo, wrapping, line height, letter
 * spacing, capitalization and label spacing.
 *
 * All but `spacing` are values `applyText` writes straight through — unlike `scale`, nothing rescales
 * them — so they carry over as they are read. `spacing` is a multiplier over the layer's own
 * `symbol-spacing`, so it is read as a ratio against the target's, the way `scale` is read against the
 * target's text size. A topic takes, per property, in order:
 *
 *  1. the summary of its own probes — the median, or for `transform` the most voted;
 *  2. the same over the topics the *target* gives the same default, nearest first: the rest of its own
 *     group, then any topic at all. A topic no probe reads (`water.lakes`, `streets.refs`,
 *     `streets.exits`) follows its neighbours, so lake names follow river names as they do for fonts;
 *  3. nothing — the target's own default stands.
 *
 * The median, not the mean: a style that haloes most labels at 1 and one at 4 should carry the 1, and
 * these values cluster on a handful of numbers rather than spreading.
 *
 * Step 2 pools per property, and only topics sharing this one's default for it, which is what keeps the
 * target's deliberate exceptions intact. `streets.refs` is haloed 0.1 because it sits on a shield,
 * `addresses` not at all, and country, state, hamlet and district names are uppercased where nothing
 * else is — filling those from a street-name or city-name reading would erase the distinction and,
 * worse, make a round trip of the target's own style derive options it did not need: no probe reads
 * those topics, so each would take a value off a neighbour and be written out as differing from a
 * default it in fact matches.
 *
 * A halo width of 0 counts and propagates like any other — a style that draws no halo has to say so,
 * since most topics of the target halo at 2px. Blur is only read where a halo is actually drawn, and
 * forced to 0 where the width is, rather than falling back to the target's 1: a `text-halo-blur` on a
 * label with no halo to blur has nothing to show for it. Every topic reached is spelled out; minimising
 * drops what equals the target's own, so a style that already matches writes nothing.
 */
function deriveLabelStyle(readings: ReadonlyMap<string, ProbeReading>, report: ReportBuilder): TextOptions {
	const topicOf = textTopicOfLayer();
	const base = modelFor(osmTarget(), 'light').base;

	// Per property, per topic, every value read for it.
	const seen = new Map<DerivedLabelKey, Map<TextTopic, unknown[]>>();
	/** Which probes spoke for each topic, so provenance can name them. */
	const probesFor = new Map<TextTopic, string[]>();
	const record = (key: DerivedLabelKey, topic: TextTopic, value: unknown) => {
		const perTopic = seen.get(key) ?? seen.set(key, new Map()).get(key)!;
		(perTopic.get(topic) ?? perTopic.set(topic, []).get(topic)!).push(value);
	};
	for (const reading of readings.values()) {
		const topic = topicOf.get(reading.probe.id);
		if (!topic) continue;
		(probesFor.get(topic) ?? probesFor.set(topic, []).get(topic)!).push(reading.probe.id);
		if (reading.labelStyle) {
			for (const [key, value] of Object.entries(reading.labelStyle)) {
				record(key as DerivedLabelKey, topic, value);
			}
		}
		// `spacing` multiplies the target's own repeat distance, so only the ratio carries over — and
		// only where both styles place this label along a line and so state one.
		const own = base.get(reading.probe.id)?.symbolSpacing;
		if (reading.symbolSpacing !== undefined && own) record('spacing', topic, reading.symbolSpacing / own);
	}
	if (seen.size === 0) return {};

	const targetStyle = (topic: TextTopic) => labelStyleOf(DEFAULT_LABEL_STYLES, topic);
	const summarise = (key: DerivedLabelKey, values: readonly unknown[]): unknown =>
		key === 'transform'
			? mostVoted(values.reduce((v: Map<unknown, number>, s) => (vote(v, s), v), new Map()))
			: median05(values as number[]);

	// Values from the topics the target styles like `topic` for `key`, its own group first. The two
	// passes are separate so a neighbour always outweighs a distant topic, however many values each has.
	const pooled = (key: DerivedLabelKey, topic: TextTopic, group: string): unknown => {
		const perTopic = seen.get(key);
		if (!perTopic) return undefined;
		const mine = targetStyle(topic)[key as keyof typeof DEFAULT_LABEL_STYLES.addresses];
		const like = (other: TextTopic) =>
			other !== topic && targetStyle(other)[key as keyof typeof DEFAULT_LABEL_STYLES.addresses] === mine;
		for (const near of [true, false]) {
			const values: unknown[] = [];
			for (const other of TEXT_TOPICS) {
				if (like(other) && other.startsWith(`${group}.`) === near) values.push(...(perTopic.get(other) ?? []));
			}
			if (values.length > 0) return summarise(key, values);
		}
		return undefined;
	};

	const tree: Record<string, Record<string, unknown>> = {};
	for (const topic of TEXT_TOPICS) {
		const [group, leaf] = topic.split('.');
		const style: Record<string, unknown> = {};
		for (const key of DERIVED_LABEL_KEYS) {
			const own = seen.get(key)?.get(topic);
			const value = own?.length ? summarise(key, own) : pooled(key, topic, group);
			if (value !== undefined) style[key] = value;
			// The readings that were summarised away. `spacing` is a ratio against the target and lands on
			// a fresh float per probe, so it is compared at the precision it is reported at.
			if (own && own.length > 1) {
				const counts = new Map<number | string, number>();
				for (const raw of own) {
					const v = typeof raw === 'number' ? median05([raw]) : (raw as string);
					counts.set(v, (counts.get(v) ?? 0) + 1);
				}
				if (counts.size > 1) {
					const observed = [...counts].sort((a, b) => b[1] - a[1]).map(([value, count]) => ({ value, count }));
					report.say(
						diagnostic(
							'labelStyle.conflict',
							`"${topic}" labels disagree on ${key} (${observed.map((o) => o.value).join(', ')}); ${String(value)} was taken`,
							{ topic, property: key, chosen: value as number | string, observed },
							{ optionPath: `text.${topic}.${key}`, origin: { layers: probesFor.get(topic) } }
						)
					);
				}
			}
			// `pooled` is why this annotation exists: a topic no probe read takes its value from a topic
			// the target styles the same way, and the option it writes looks exactly like a first-hand
			// reading. Recorded for every topic, including the ones left at the target's own value.
			report.note(`text.${topic}.${key}`, {
				origin: own?.length ? 'observed' : value !== undefined ? 'pooled' : 'default',
				...(own?.length && { from: probesFor.get(topic) }),
			});
		}
		// Blur means nothing without a halo, in either direction: drop a blur whose width was not read,
		// and zero it where the width is zero.
		if (style.haloWidth === undefined) delete style.haloBlur;
		else if (style.haloWidth === 0) style.haloBlur = 0;
		else style.haloBlur ??= 0;
		if (Object.keys(style).length === 0) continue; // nothing was read that speaks for this topic
		if (leaf === undefined) tree[group] = { ...tree[group], ...style };
		else (tree[group] ??= {})[leaf] = { ...((tree[group]?.[leaf] as object | undefined) ?? {}), ...style };
	}
	return tree as TextOptions;
}

/**
 * A multiplier over the target's own value, in steps of 0.05, or `undefined` when it lands within 10%
 * of 1. Below that the evidence is a handful of layers whose sizes ramp differently from the target's,
 * and the ratio says more about where the ramps cross than about the style.
 *
 * The geometric mean, not the median. A ratio's centre is multiplicative — halving and doubling should
 * cancel — and with the two or three samples there are to average, `median05` would pick the upper of
 * an even pair rather than anything between them: for OpenFreeMap's Liberty it chose the POI ratio of
 * 1.29 outright and drew transit icons 39% too large, where the mean of 1.1 splits the difference.
 */
function deriveFactor(ratios: readonly { ratio: number }[]): number | undefined {
	if (ratios.length === 0) return undefined;
	const logs = ratios.reduce((sum, { ratio }) => sum + Math.log(ratio), 0);
	const factor = Math.round(Math.exp(logs / ratios.length) * 20) / 20;
	return Math.abs(factor - 1) >= 0.1 ? factor : undefined;
}

/**
 * `icon`: how much bigger the style draws its icons than the target, and how much further apart.
 *
 * Both are multipliers over the target's own values rather than properties of their own, so both are
 * read as a ratio against the same probe read off the target, the way `text.scale` is. `scale` compares
 * `icon-size`; `spacing` compares `icon-padding`, which `applyIcon` shifts by a fixed step per unit
 * rather than multiplying, so the ratio is recovered from the difference.
 *
 * Only the two probes that draw an icon in both styles can speak — POI names and transit stops — and
 * only where both state a size. A layer with no `icon-image` reads the spec default of 1, which would
 * otherwise turn a place label's small dot icon into evidence about a target layer that draws no icon
 * at all. The icons themselves are not carried over (the target's sprite is used), so this is about the
 * size at which that sprite is drawn.
 *
 * `icon.spacing` has a second half that no probe reaches: along a line `applyIcon` scales
 * `symbol-spacing` instead, on layers that draw an icon and no text — oneway arrows and road markings.
 * Nothing probes those, so a style that spaces its markings unusually still carries over at 1.
 */
function deriveIcon(readings: ReadonlyMap<string, ProbeReading>, report: ReportBuilder): IconOptions | undefined {
	const base = modelFor(osmTarget(), 'light').base;
	const scales: { probe: string; ratio: number }[] = [];
	const spacings: { probe: string; ratio: number }[] = [];
	for (const reading of readings.values()) {
		const own = base.get(reading.probe.id);
		// Sizes ramp with zoom, so a ratio only means something between readings taken at the same one.
		if (!own || reading.zoom !== own.zoom) continue;
		if (reading.iconSize !== undefined && own.iconSize) {
			scales.push({ probe: reading.probe.id, ratio: reading.iconSize / own.iconSize });
		}
		if (reading.iconPadding !== undefined && own.iconPadding !== undefined) {
			spacings.push({
				probe: reading.probe.id,
				ratio: 1 + (reading.iconPadding - own.iconPadding) / PADDING_PER_SPACING,
			});
		}
	}
	const scale = deriveFactor(scales);
	const spacing = deriveFactor(spacings);
	// One multiplier serves every icon, so probes that scale differently from the target cannot all be
	// satisfied: Liberty draws flat POI icons where the target ramps them, and its transit icons at a
	// different ratio again, which the geometric mean can only split.
	for (const [option, ratios, chosen] of [
		['scale', scales, scale],
		['spacing', spacings, spacing],
	] as const) {
		if (ratios.length < 2 || chosen === undefined) continue;
		const spread = Math.max(...ratios.map((r) => r.ratio)) / Math.min(...ratios.map((r) => r.ratio));
		if (spread < 1 + ICON_SPREAD) continue;
		report.say(
			diagnostic(
				'icon.conflict',
				`icons are ${option === 'scale' ? 'sized' : 'spaced'} inconsistently relative to the target (${ratios
					.map((r) => r.ratio.toFixed(2))
					.join(', ')}); ${chosen} was taken`,
				{
					option,
					chosen,
					observed: ratios.map((r) => ({ probe: r.probe, ratio: round2(r.ratio) })),
				},
				{ optionPath: `icon.${option}` }
			)
		);
	}
	// A factor inside the dead band is not "nothing was read" — the ratios were computed and found too
	// close to 1 to be a choice, which provenance records as observed with the target's own value.
	report.note('icon.scale', { origin: scales.length > 0 ? 'observed' : 'default' });
	report.note('icon.spacing', { origin: spacings.length > 0 ? 'observed' : 'default' });
	if (scale === undefined && spacing === undefined) return undefined;
	return { ...(scale !== undefined && { scale }), ...(spacing !== undefined && { spacing }) };
}

/** The label size relative to the target's: the median ratio over every label read, in steps of 0.05. */
function deriveLabelScale(readings: ReadonlyMap<string, ProbeReading>): number | undefined {
	const base = modelFor(osmTarget(), 'light').base;
	const ratios: number[] = [];
	for (const reading of readings.values()) {
		const own = base.get(reading.probe.id);
		if (reading.textSize && own?.textSize && reading.zoom === own.zoom) ratios.push(reading.textSize / own.textSize);
	}
	if (ratios.length === 0) return undefined;
	ratios.sort((a, b) => a - b);
	const median = ratios[Math.floor(ratios.length / 2)];
	const scale = Math.round(median * 20) / 20;
	return Math.abs(scale - 1) >= 0.1 ? scale : undefined;
}

/** The probes whose labels follow a line — the only labels `text.pitchAlignment` changes. */
const LINE_LABEL_PROBES = ['label-street-primary', 'label-street-residential', 'label-water-river'];

/**
 * `viewport` when most line labels stand up in a tilted map. A pitch alignment of `auto` follows the
 * rotation alignment, whose own `auto` is `map` along a line. Zoom-dependent values are not read.
 */
function derivePitchAlignment(readings: ReadonlyMap<string, ProbeReading>): PitchAlignment | undefined {
	let viewport = 0;
	let map = 0;
	for (const id of LINE_LABEL_PROBES) {
		const layout = readings.get(id)?.label?.layer.layout as Record<string, unknown> | undefined;
		if (!layout) continue;
		let alignment = layout['text-pitch-alignment'] ?? 'auto';
		if (alignment === 'auto') alignment = layout['text-rotation-alignment'] ?? 'auto';
		if (alignment === 'viewport') viewport++;
		else if (alignment === 'map' || alignment === 'auto') map++;
	}
	return viewport > map ? 'viewport' : undefined;
}

function deriveSun(light: NonNullable<StyleSpecification['light']>): SunOptions {
	const sun: Exclude<SunOptions, true> = {};
	const position = light.position;
	// `length === 3` as well as the type check: `every` is vacuously true for a shorter array, so a
	// two-element `position` passed and `90 - position[2]` came out `NaN`. `minimizeOsmOptions` cannot
	// drop it either — `JSON.stringify(NaN)` is `"null"`, which never equals the default — so the NaN
	// reached the returned options and built a style with `light.position: [1.15, 210, null]`, which
	// MapLibre rejects. `guessOptions` promises options that build, so a malformed light is one this
	// reads nothing from rather than one it mistranslates.
	if (Array.isArray(position) && position.length === 3 && position.every((v) => typeof v === 'number')) {
		sun.direction = position[1] as number;
		sun.altitude = 90 - (position[2] as number);
	}
	if (light.anchor === 'map' || light.anchor === 'viewport') sun.anchor = light.anchor;
	if (typeof light.color === 'string') sun.color = light.color;
	if (typeof light.intensity === 'number') sun.intensity = light.intensity;
	return sun;
}

const SKY_KEYS = {
	'sky-color': 'skyColor',
	'horizon-color': 'horizonColor',
	'fog-color': 'fogColor',
	'sky-horizon-blend': 'skyHorizonBlend',
	'horizon-fog-blend': 'horizonFogBlend',
	'fog-ground-blend': 'fogGroundBlend',
	'atmosphere-blend': 'atmosphereBlend',
} as const;

/**
 * The sky values that differ from what the target builds anyway. `osm()` derives its sky from the
 * palette, so copying every value would pin a sky that no longer follows the colours.
 */
export function deriveSky(
	sky: StyleSpecification['sky'] | undefined,
	built: StyleSpecification['sky'] | undefined
): SkyOptions | undefined {
	if (!sky) return undefined;
	const out: Record<string, unknown> = {};
	for (const [property, key] of Object.entries(SKY_KEYS)) {
		const value = (sky as Record<string, unknown>)[property];
		const own = (built as Record<string, unknown> | undefined)?.[property];
		if (value !== undefined && !sameValue(value, own)) out[key] = value;
	}
	return Object.keys(out).length > 0 ? (out as SkyOptions) : undefined;
}

/** Equal, or two colours no one could tell apart. */
function sameValue(a: unknown, b: unknown): boolean {
	if (JSON.stringify(a) === JSON.stringify(b)) return true;
	if (typeof a !== 'string' || typeof b !== 'string') return false;
	try {
		return colorDistance(parseRGBA(a), parseRGBA(b)) <= OVERRIDE_DISTANCE;
	} catch {
		return false;
	}
}

export function pick<T extends object, K extends keyof T>(object: T, keys: K[]): Pick<T, K> {
	return Object.fromEntries(keys.filter((key) => object[key] !== undefined).map((key) => [key, object[key]])) as Pick<
		T,
		K
	>;
}
