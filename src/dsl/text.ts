import type { MaplibreLayer } from '../types/index.js';
import { MAPLIBRE_TEXT_DEFAULTS, TEXT_TOPICS, topicOf, type ResolvedText, type TextTopic } from '../options/';
import { padForSpacing, scaleSymbolSpacing, scaleValue } from '../lib/';

/**
 * Groups outside `labels` whose layers carry text. POI names and stop names are drawn with their icons,
 * whose visibility lives at `layers.pois` and `layers.transit.stops`, so they cannot be read off a
 * `labels.` path.
 */
const ICON_GROUP_TOPICS: Readonly<Record<string, TextTopic>> = {
	pois: 'pois.general',
	'transit.stops': 'pois.transit',
};

/**
 * Which topic a text layer belongs to: a leaf of the text tree, named like the label groups.
 *
 * Layer modules do not set label typography. A text layer's topic follows from its `group` — the same
 * tag that `layers:` gates on — so the style a layer gets and the visibility option that controls it
 * cannot name different things. `buildLayers` applies it after gating (`applyText`).
 */
export function textTopic(group: string | undefined): TextTopic | undefined {
	if (group === undefined) return undefined;
	if (group.startsWith('labels.')) {
		const topic = group.slice('labels.'.length);
		return (TEXT_TOPICS as readonly string[]).includes(topic) ? (topic as TextTopic) : undefined;
	}
	return ICON_GROUP_TOPICS[group];
}

/** The style properties the text options own, which a layer module must not set itself. */
const OWNED = {
	layout: [
		'text-font',
		'text-max-width',
		'text-line-height',
		'text-letter-spacing',
		'text-transform',
		'text-pitch-alignment',
	],
	paint: ['text-halo-width', 'text-halo-blur'],
} as const;

/**
 * Set a text layer's typography from its topic's label style, and its pitch alignment from `text`.
 *
 * A text layer whose group has no topic would fall back to MapLibre's default font, which the
 * VersaTiles glyph server does not have, so it throws — as does a layer that already sets a property
 * the text options own, since that value would silently ignore the options. The layer's own size,
 * `symbol-spacing` and `text-padding` are the base that `scale` and `spacing` work on.
 */
export function applyText(layer: MaplibreLayer, group: string | undefined, text: ResolvedText): void {
	if (layer.type !== 'symbol') return;
	const layout = layer.layout as Record<string, unknown> | undefined;
	if (layout?.['text-field'] == null) return;
	const topic = textTopic(group);
	if (topic === undefined) {
		throw new Error(`buildLayers: text layer "${layer.id}" is in group "${group}", which has no text topic`);
	}
	const paint = (layer as { paint?: Record<string, unknown> }).paint;
	for (const [key, target] of [
		...OWNED.layout.map((key) => [key, layout] as const),
		...OWNED.paint.map((key) => [key, paint] as const),
	]) {
		if (target?.[key] !== undefined) {
			throw new Error(`buildLayers: text layer "${layer.id}" sets "${key}", which the text options own`);
		}
	}

	const style = topicOf(text, topic);
	const isLine = layout['symbol-placement'] === 'line';
	layout['text-font'] = [style.font];
	if (style.scale !== 1 && layout['text-size'] != null) {
		layout['text-size'] = scaleValue(layout['text-size'], style.scale);
	}
	if (isLine) scaleSymbolSpacing(layout, style.spacing);
	else padForSpacing(layout, 'text-padding', style.spacing);
	// MapLibre's `auto` already lays line labels on the map, so `map` writes nothing.
	if (text.pitchAlignment === 'viewport' && isLine) layout['text-pitch-alignment'] = 'viewport';
	if (style.maxWidth !== MAPLIBRE_TEXT_DEFAULTS.maxWidth) layout['text-max-width'] = style.maxWidth;
	if (style.lineHeight !== MAPLIBRE_TEXT_DEFAULTS.lineHeight) layout['text-line-height'] = style.lineHeight;
	if (style.letterSpacing !== MAPLIBRE_TEXT_DEFAULTS.letterSpacing) layout['text-letter-spacing'] = style.letterSpacing;
	if (style.transform !== MAPLIBRE_TEXT_DEFAULTS.transform) layout['text-transform'] = style.transform;
	if (style.haloWidth !== MAPLIBRE_TEXT_DEFAULTS.haloWidth || style.haloBlur !== MAPLIBRE_TEXT_DEFAULTS.haloBlur) {
		const target = ((layer as { paint?: Record<string, unknown> }).paint ??= {});
		if (style.haloWidth !== MAPLIBRE_TEXT_DEFAULTS.haloWidth) target['text-halo-width'] = style.haloWidth;
		if (style.haloBlur !== MAPLIBRE_TEXT_DEFAULTS.haloBlur) target['text-halo-blur'] = style.haloBlur;
	}
}
