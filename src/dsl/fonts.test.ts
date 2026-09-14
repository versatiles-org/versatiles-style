import { describe, expect, it } from 'vitest';
import { applyFont, FONT_TOPICS, fontTopic } from './fonts.js';
import { osm } from '../api/osm.js';
import { satellite } from '../api/satellite.js';
import { omt } from '../omt/api.js';
import { protomaps } from '../protomaps/api.js';
import type { MaplibreLayer, StyleSpecification } from '../types/index.js';

const FONTS = { normal: 'normal_face', bold: 'bold_face' };

const textLayer = (): MaplibreLayer =>
	({ id: 't', type: 'symbol', layout: { 'text-field': ['get', 'name'] } }) as unknown as MaplibreLayer;

describe('fontTopic', () => {
	it('is the label group without its `labels.` prefix', () => {
		expect(fontTopic('labels.water.rivers')).toBe('water.rivers');
		expect(fontTopic('labels.addresses')).toBe('addresses');
		expect(fontTopic('labels.boundaries.countries')).toBe('boundaries.countries');
	});

	it('maps the two icon groups that carry names', () => {
		expect(fontTopic('pois')).toBe('pois.general');
		expect(fontTopic('transit.stops')).toBe('pois.transit');
	});

	it('is undefined for groups that carry no text, and for branches', () => {
		expect(fontTopic(undefined)).toBeUndefined();
		expect(fontTopic('markings')).toBeUndefined();
		expect(fontTopic('roads.motorways')).toBeUndefined();
		expect(fontTopic('labels.water')).toBeUndefined();
	});

	it('covers every topic', () => {
		const groups = [...FONT_TOPICS.map((t) => `labels.${t}`), 'pois', 'transit.stops'];
		const topics = new Set(groups.map(fontTopic).filter(Boolean));
		for (const topic of FONT_TOPICS) expect(topics.has(topic), topic).toBe(true);
	});
});

describe('applyFont', () => {
	it('sets the bold face for motorway refs and POI names, the normal face everywhere else', () => {
		const set = (group: string) => {
			const layer = textLayer();
			applyFont(layer, group, FONTS);
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
		applyFont(icon, 'markings', FONTS);
		expect(icon.layout).toStrictEqual({ 'icon-image': 'x' });
	});

	it('throws for a text layer whose group has no font topic', () => {
		expect(() => applyFont(textLayer(), 'markings', FONTS)).toThrow(
			'buildLayers: text layer "t" is in group "markings", which has no font topic'
		);
		expect(() => applyFont(textLayer(), undefined, FONTS)).toThrow('which has no font topic');
	});
});

describe('text-font in built styles', () => {
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

describe('fontGroups', () => {
	type Tree = { [key: string]: string[] | Tree };
	const leaves = (node: Tree, path: string[] = []): [string, string[]][] =>
		Object.entries(node).flatMap(([key, child]) =>
			Array.isArray(child) ? [[[...path, key].join('.'), child] as [string, string[]]] : leaves(child, [...path, key])
		);
	const at = (tree: Tree, path: string): string[] | undefined =>
		path.split('.').reduce<unknown>((node, key) => (node as Tree | undefined)?.[key], tree) as string[] | undefined;

	const pm = { urls: { protomaps: 'pmtiles://https://example.org/planet.pmtiles' } };
	const schemas: [string, Tree, Tree, () => StyleSpecification][] = [
		['osm', osm.fontGroups, osm.layerGroups, () => osm({ features: { buildings: 'extruded' } })],
		['omt', omt.fontGroups, omt.layerGroups, () => omt()],
		['protomaps', protomaps.fontGroups, protomaps.layerGroups, () => protomaps(pm)],
	];

	it('is memoized', () => {
		expect(osm.fontGroups).toBe(osm.fontGroups);
		expect(omt.fontGroups).toBe(omt.fontGroups);
		expect(protomaps.fontGroups).toBe(protomaps.fontGroups);
	});

	it('has a non-empty leaf for every topic in Shortbread', () => {
		expect(
			leaves(osm.fontGroups)
				.map(([path]) => path)
				.sort()
		).toEqual([...FONT_TOPICS].sort());
		for (const [path, ids] of leaves(osm.fontGroups)) expect(ids.length, path).toBeGreaterThan(0);
	});

	it('has the same topics in every schema, except exits, which Protomaps does not label', () => {
		const paths = (tree: Tree) =>
			leaves(tree)
				.map(([path]) => path)
				.sort();
		expect(paths(omt.fontGroups)).toEqual(paths(osm.fontGroups));
		expect(paths(protomaps.fontGroups)).toEqual(paths(osm.fontGroups).filter((p) => p !== 'streets.exits'));
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
		expect(satellite.fontGroups).toBe(osm.fontGroups);
		const drawn = new Set(satellite().layers.map((l) => l.id));
		const missing = leaves(satellite.fontGroups)
			.flatMap(([, ids]) => ids)
			.filter((id) => !drawn.has(id));
		expect(missing).toEqual([]);
	});
});
