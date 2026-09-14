import type { MaplibreLayer } from '../types/index.js';
import type { LayerContext } from './context.js';

/**
 * Which font a text layer is set in: a leaf of the font tree, named like the label groups.
 *
 * Layer modules do not choose fonts. A text layer's topic follows from its `group` — the same tag that
 * `layers:` gates on — so the font a layer gets and the visibility option that controls it cannot name
 * different things. `buildLayers` sets `text-font` from it after gating.
 */
export const FONT_TOPICS = [
	'boundaries.countries',
	'boundaries.states',
	'places.cities',
	'places.villages',
	'places.districts',
	'streets.names',
	'streets.refs',
	'streets.exits',
	'water.lakes',
	'water.rivers',
	'pois.general',
	'pois.transit',
	'addresses',
] as const;

export type FontTopic = (typeof FONT_TOPICS)[number];

/**
 * Groups outside `labels` whose layers carry text. POI names and stop names are drawn with their icons,
 * whose visibility lives at `layers.pois` and `layers.transit.stops`, so they cannot be read off a
 * `labels.` path.
 */
const ICON_GROUP_TOPICS: Readonly<Record<string, FontTopic>> = {
	pois: 'pois.general',
	'transit.stops': 'pois.transit',
};

/** The font topic of a layer group, or `undefined` for a group that carries no text. */
export function fontTopic(group: string | undefined): FontTopic | undefined {
	if (group === undefined) return undefined;
	if (group.startsWith('labels.')) {
		const topic = group.slice('labels.'.length);
		return (FONT_TOPICS as readonly string[]).includes(topic) ? (topic as FontTopic) : undefined;
	}
	return ICON_GROUP_TOPICS[group];
}

/** Topics set in the bold face; every other topic uses the normal one. */
const BOLD_TOPICS: ReadonlySet<FontTopic> = new Set(['streets.refs', 'pois.general']);

/** The face a topic is set in. */
function fontFor(fonts: LayerContext['fonts'], topic: FontTopic): string {
	return BOLD_TOPICS.has(topic) ? fonts.bold : fonts.normal;
}

/**
 * Set `text-font` on a text layer from its group's topic. A text layer whose group has no topic would
 * fall back to MapLibre's default font, which the VersaTiles glyph server does not have, so it throws.
 */
export function applyFont(layer: MaplibreLayer, group: string | undefined, fonts: LayerContext['fonts']): void {
	if (layer.type !== 'symbol') return;
	const layout = layer.layout as Record<string, unknown> | undefined;
	if (layout?.['text-field'] == null) return;
	const topic = fontTopic(group);
	if (topic === undefined) {
		throw new Error(`buildLayers: text layer "${layer.id}" is in group "${group}", which has no font topic`);
	}
	layout['text-font'] = [fontFor(fonts, topic)];
}
