import { describe, expect, it } from 'vitest';
import { applyText, textTopic } from './text.js';
import { osm } from '../api/osm.js';
import { satellite } from '../api/satellite.js';
import { omt } from '../omt/api.js';
import { protomaps } from '../protomaps/api.js';
import type { MaplibreLayer, StyleSpecification } from '../types/index.js';
import { resolveText, TEXT_TOPICS } from '../options/index.js';

const STYLES = resolveText({
	font: 'normal_face',
	streets: { refs: { font: 'bold_face' } },
	pois: { general: { font: 'bold_face' } },
});

const textLayer = (): MaplibreLayer =>
	({ id: 't', type: 'symbol', layout: { 'text-field': ['get', 'name'] } }) as unknown as MaplibreLayer;

describe('textTopic', () => {
	it('is the label group without its `labels.` prefix', () => {
		expect(textTopic('labels.water.rivers')).toBe('water.rivers');
		expect(textTopic('labels.addresses')).toBe('addresses');
		expect(textTopic('labels.boundaries.countries')).toBe('boundaries.countries');
	});

	it('maps the two icon groups that carry names', () => {
		expect(textTopic('pois')).toBe('pois.general');
		expect(textTopic('transit.stops')).toBe('pois.transit');
	});

	it('is undefined for groups that carry no text, and for branches', () => {
		expect(textTopic(undefined)).toBeUndefined();
		expect(textTopic('markings')).toBeUndefined();
		expect(textTopic('roads.motorways')).toBeUndefined();
		expect(textTopic('labels.water')).toBeUndefined();
	});

	it('covers every topic', () => {
		const groups = [...TEXT_TOPICS.map((t) => `labels.${t}`), 'pois', 'transit.stops'];
		const topics = new Set(groups.map(textTopic).filter(Boolean));
		for (const topic of TEXT_TOPICS) expect(topics.has(topic), topic).toBe(true);
	});
});

describe('applyText', () => {
	it('sets the face its topic resolves to', () => {
		const set = (group: string) => {
			const layer = textLayer();
			applyText(layer, group, STYLES);
			return (layer.layout as Record<string, unknown>)['text-font'];
		};
		expect(set('labels.streets.refs')).toStrictEqual(['bold_face']);
		expect(set('pois')).toStrictEqual(['bold_face']);
		expect(set('labels.streets.exits')).toStrictEqual(['normal_face']);
		expect(set('transit.stops')).toStrictEqual(['normal_face']);
		expect(set('labels.places.cities')).toStrictEqual(['normal_face']);
	});

	it('leaves layers without text alone', () => {
		const icon = { id: 'i', type: 'symbol', layout: { 'icon-image': 'x' } } as unknown as MaplibreLayer;
		applyText(icon, 'markings', STYLES);
		expect(icon.layout).toStrictEqual({ 'icon-image': 'x' });
	});

	it('throws for a text layer whose group has no text topic', () => {
		expect(() => applyText(textLayer(), 'markings', STYLES)).toThrow(
			'buildLayers: text layer "t" is in group "markings", which has no text topic'
		);
		expect(() => applyText(textLayer(), undefined, STYLES)).toThrow('which has no text topic');
	});

	it('writes each property of the topic, leaving out values equal to MapLibre defaults', () => {
		const layer = textLayer();
		applyText(layer, 'labels.places.hamlets', STYLES);
		expect(layer.layout).toStrictEqual({
			'text-field': ['get', 'name'],
			'text-font': ['normal_face'],
			'text-transform': 'uppercase',
		});
		expect((layer as { paint?: unknown }).paint).toStrictEqual({ 'text-halo-width': 2, 'text-halo-blur': 1 });

		const address = textLayer();
		applyText(address, 'labels.addresses', STYLES);
		expect((address as { paint?: unknown }).paint).toBeUndefined();

		const styled = textLayer();
		const custom = resolveText({ streets: { names: { maxWidth: 8, lineHeight: 1.5, letterSpacing: 0.1 } } });
		applyText(styled, 'labels.streets.names', custom);
		expect(styled.layout).toMatchObject({ 'text-max-width': 8, 'text-line-height': 1.5, 'text-letter-spacing': 0.1 });
	});

	it('scales size and spacing from the values the layer carries', () => {
		const text = resolveText({ scale: 2, spacing: 2 });
		const line = {
			id: 'l',
			type: 'symbol',
			layout: { 'text-field': 'x', 'symbol-placement': 'line', 'text-size': 10, 'symbol-spacing': 100 },
		} as unknown as MaplibreLayer;
		applyText(line, 'labels.streets.names', text);
		expect(line.layout).toMatchObject({ 'text-size': 20, 'symbol-spacing': 200 });
		expect(line.layout).not.toHaveProperty('text-padding');

		const point = {
			id: 'p',
			type: 'symbol',
			layout: { 'text-field': 'x', 'text-size': { 0: 1 }, 'text-padding': 0 },
		} as unknown as MaplibreLayer;
		applyText(point, 'labels.boundaries.states', text);
		expect(point.layout).toMatchObject({ 'text-padding': 14 });
		expect(point.layout).not.toHaveProperty('symbol-spacing');
	});

	it('stands line labels up for a viewport pitch alignment, and leaves point labels alone', () => {
		const text = resolveText({ pitchAlignment: 'viewport' });
		const line = {
			id: 'l',
			type: 'symbol',
			layout: { 'text-field': 'x', 'symbol-placement': 'line' },
		} as unknown as MaplibreLayer;
		const point = textLayer();
		applyText(line, 'labels.water.rivers', text);
		applyText(point, 'labels.places.cities', text);
		expect(line.layout).toMatchObject({ 'text-pitch-alignment': 'viewport' });
		expect(point.layout).not.toHaveProperty('text-pitch-alignment');
	});

	it('throws for a text layer that sets a property the text options own', () => {
		for (const [parent, key] of [
			['layout', 'text-font'],
			['layout', 'text-transform'],
			['layout', 'text-letter-spacing'],
			['paint', 'text-halo-width'],
			['paint', 'text-halo-blur'],
			['layout', 'text-pitch-alignment'],
		] as const) {
			const layer = textLayer() as unknown as Record<string, Record<string, unknown>>;
			layer[parent] = { ...layer[parent], [key]: 1 };
			expect(() => applyText(layer as unknown as MaplibreLayer, 'labels.places.cities', STYLES), key).toThrow(
				`sets "${key}", which the text options own`
			);
		}
	});
});

describe('label typography in built styles', () => {
	const styles: [string, StyleSpecification][] = [
		['osm', osm()],
		['osm extruded', osm({ features: { buildings: 'extruded' } })],
		['satellite', satellite()],
		['omt', omt()],
		['protomaps', protomaps({ urls: { protomaps: 'pmtiles://https://example.org/planet.pmtiles' } })],
	];
	const layout = (layer: StyleSpecification['layers'][number]) =>
		((layer as { layout?: unknown }).layout ?? {}) as Record<string, unknown>;

	it.each(styles)('%s: a layer has text-font exactly when it renders text', (_name, style) => {
		const mismatched = style.layers
			.filter((l) => (layout(l)['text-field'] != null) !== (layout(l)['text-font'] != null))
			.map((l) => l.id);
		expect(mismatched).toEqual([]);
	});

	it.each(styles.filter(([name]) => name !== 'satellite'))(
		'%s: only motorway shields and POI names are bold',
		(_name, style) => {
			const shield = style.layers.find((l) => l.id === 'label-motorway-shield')!;
			expect(layout(shield)['text-font']).toStrictEqual(['noto_sans_bold']);
			const bold = style.layers
				.filter((l) => (layout(l)['text-font'] as string[] | undefined)?.[0] === 'noto_sans_bold')
				.map((l) => l.id)
				.filter((id) => id !== 'label-motorway-shield' && !/^poi(-|$)/.test(id));
			expect(bold).toEqual([]);
		}
	);
});

describe('textGroups', () => {
	type Tree = { [key: string]: string[] | Tree };
	const leaves = (node: Tree, path: string[] = []): [string, string[]][] =>
		Object.entries(node).flatMap(([key, child]) =>
			Array.isArray(child) ? [[[...path, key].join('.'), child] as [string, string[]]] : leaves(child, [...path, key])
		);
	const at = (tree: Tree, path: string): string[] | undefined =>
		path.split('.').reduce<unknown>((node, key) => (node as Tree | undefined)?.[key], tree) as string[] | undefined;

	const pm = { urls: { protomaps: 'pmtiles://https://example.org/planet.pmtiles' } };
	const schemas: [string, Tree, Tree, () => StyleSpecification][] = [
		['osm', osm.textGroups, osm.layerGroups, () => osm({ features: { buildings: 'extruded' } })],
		['omt', omt.textGroups, omt.layerGroups, () => omt()],
		['protomaps', protomaps.textGroups, protomaps.layerGroups, () => protomaps(pm)],
	];

	it('is memoized', () => {
		expect(osm.textGroups).toBe(osm.textGroups);
		expect(omt.textGroups).toBe(omt.textGroups);
		expect(protomaps.textGroups).toBe(protomaps.textGroups);
	});

	it('has a non-empty leaf for every topic in Shortbread', () => {
		expect(
			leaves(osm.textGroups)
				.map(([path]) => path)
				.sort()
		).toEqual([...TEXT_TOPICS].sort());
		for (const [path, ids] of leaves(osm.textGroups)) expect(ids.length, path).toBeGreaterThan(0);
	});

	it('has the same topics in every schema, except exits, which Protomaps does not label', () => {
		const paths = (tree: Tree) =>
			leaves(tree)
				.map(([path]) => path)
				.sort();
		expect(paths(omt.textGroups)).toEqual(paths(osm.textGroups));
		expect(paths(protomaps.textGroups)).toEqual(paths(osm.textGroups).filter((p) => p !== 'streets.exits'));
	});

	it.each(schemas)('%s: each topic lists the layers of the group it is named after', (_name, fonts, groups) => {
		for (const [topic, ids] of leaves(fonts)) {
			const group = topic === 'pois.general' ? 'pois' : topic === 'pois.transit' ? 'transit.stops' : `labels.${topic}`;
			const text = new Set(ids);
			expect(
				at(groups, group)?.filter((id) => text.has(id)),
				topic
			).toEqual(ids);
		}
	});

	it.each(schemas)('%s: lists every text layer of the style exactly once', (_name, fonts, _groups, build) => {
		const listed = leaves(fonts).flatMap(([, ids]) => ids);
		expect(new Set(listed).size).toBe(listed.length);
		const text = build()
			.layers.filter((l) => ((l as { layout?: Record<string, unknown> }).layout ?? {})['text-field'] != null)
			.map((l) => l.id);
		expect([...listed].sort()).toEqual([...text].sort());
	});

	it("satellite's are osm's, and name only layers the overlay draws", () => {
		expect(satellite.textGroups).toBe(osm.textGroups);
		const drawn = new Set(satellite().layers.map((l) => l.id));
		const missing = leaves(satellite.textGroups)
			.flatMap(([, ids]) => ids)
			.filter((id) => !drawn.has(id));
		expect(missing).toEqual([]);
	});
});
