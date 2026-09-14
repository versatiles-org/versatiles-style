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
