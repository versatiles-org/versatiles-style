import { describe, expect, it } from 'vitest';
import type { StyleSpecification } from '../types/index.js';
import { labelText, NAME_MARKER, readProbe } from './evaluate.js';
import { PROBES } from './probes.js';

const probe = (id: string) => PROBES.find((p) => p.id === id)!;
const OMT = new Map([['omt', 'openmaptiles' as const]]);

function style(layers: unknown[]): StyleSpecification {
	return { version: 8, sources: { omt: { type: 'vector', url: 'https://example.org/tiles.json' } }, layers } as never;
}

const round = (color?: number[]) => color?.map((v) => Math.round(v * 100) / 100);

describe('readProbe', () => {
	it('reads the topmost background, with its opacity', () => {
		const s = style([
			{ id: 'a', type: 'background', paint: { 'background-color': '#ff0000' } },
			{ id: 'b', type: 'background', paint: { 'background-color': '#0000ff', 'background-opacity': 0.5 } },
			{ id: 'slot', type: 'background', paint: { 'background-opacity': 0 } },
		]);
		const reading = readProbe(s, OMT, probe('background'));
		expect(reading?.layers).toEqual(['b']);
		expect(round(reading?.colors.color)).toEqual([0, 0, 1, 0.5]);
	});

	it('evaluates legacy filters, data-driven colours and zoom functions', () => {
		const s = style([
			{
				id: 'water',
				type: 'fill',
				source: 'omt',
				'source-layer': 'water',
				filter: ['all', ['==', 'intermittent', 0], ['!=', 'brunnel', 'tunnel']],
				paint: {
					'fill-color': ['match', ['get', 'class'], 'lake', '#00ff00', '#000000'],
					'fill-opacity': {
						stops: [
							[10, 0],
							[12, 0.5],
						],
					},
				},
			},
		]);
		expect(round(readProbe(s, OMT, probe('water-area'))?.colors.color)).toEqual([0, 1, 0, 0.5]);
		expect(readProbe(s, OMT, probe('water-area'), 10)).toBeUndefined();
	});

	it('skips hidden layers, layers outside their zoom range and other sources', () => {
		const layer = { type: 'fill', 'source-layer': 'water', paint: { 'fill-color': '#fff' } };
		const s = style([
			{ ...layer, id: 'hidden', source: 'omt', layout: { visibility: 'none' } },
			{ ...layer, id: 'later', source: 'omt', minzoom: 13 },
			{ ...layer, id: 'earlier', source: 'omt', maxzoom: 12 },
			{ ...layer, id: 'elsewhere', source: 'other' },
		]);
		expect(readProbe(s, OMT, probe('water-area'))).toBeUndefined();
	});

	it('reads a fill outline from the fill below, or from fill-outline-color', () => {
		const fill = (id: string, color: string, extra = {}) => ({
			id,
			type: 'fill',
			source: 'omt',
			'source-layer': 'building',
			paint: { 'fill-color': color, ...extra },
		});
		const two = readProbe(style([fill('under', '#000'), fill('top', '#fff')]), OMT, probe('building'));
		expect(two?.layers).toEqual(['top', 'under']);
		expect(round(two?.colors.outline)).toEqual([0, 0, 0, 1]);

		const one = readProbe(style([fill('top', '#fff', { 'fill-outline-color': '#f00' })]), OMT, probe('building'));
		expect(round(one?.colors.outline)).toEqual([1, 0, 0, 1]);
	});

	it('reads the colour beneath a pattern, and a pattern alone as drawn without colour', () => {
		const water = { type: 'fill', source: 'omt', 'source-layer': 'water' };
		const both = style([
			{ ...water, id: 'water', paint: { 'fill-color': '#00f' } },
			{ ...water, id: 'pattern', paint: { 'fill-pattern': 'wave' } },
		]);
		expect(round(readProbe(both, OMT, probe('water-area'))?.colors.color)).toEqual([0, 0, 1, 1]);

		const alone = readProbe(
			style([{ ...water, id: 'pattern', paint: { 'fill-pattern': 'wave' } }]),
			OMT,
			probe('water-area')
		);
		expect(alone).toMatchObject({ layers: ['pattern'], colors: {} });
	});

	it('flags extruded buildings', () => {
		const s = style([
			{
				id: 'b3d',
				type: 'fill-extrusion',
				source: 'omt',
				'source-layer': 'building',
				paint: { 'fill-extrusion-color': '#888' },
			},
		]);
		expect(readProbe(s, OMT, probe('building'))?.extruded).toBe(true);
	});

	it('reads a road casing: the wider line beneath the top one', () => {
		const road = (id: string, color: string, width: number) => ({
			id,
			type: 'line',
			source: 'omt',
			'source-layer': 'transportation',
			filter: ['==', 'class', 'motorway'],
			paint: { 'line-color': color, 'line-width': width },
		});
		const reading = readProbe(
			style([road('casing', '#f00', 6), road('narrow', '#0f0', 1), road('fill', '#fff', 4)]),
			OMT,
			probe('street-motorway')
		);
		expect(reading?.layers).toEqual(['fill', 'casing']);
		expect(round(reading?.colors.casing)).toEqual([1, 0, 0, 1]);
		expect(reading?.lineWidth).toBe(4);
	});

	it('ignores zero-width lines', () => {
		const s = style([{ id: 'l', type: 'line', source: 'omt', 'source-layer': 'waterway', paint: { 'line-width': 0 } }]);
		expect(readProbe(s, OMT, probe('water-river'))).toBeUndefined();
	});

	it('reads a label: colours, halo, size and font', () => {
		const s = style([
			{
				id: 'city',
				type: 'symbol',
				source: 'omt',
				'source-layer': 'place',
				filter: ['all', ['==', 'class', 'city'], ['has', 'name']],
				layout: { 'text-field': '{name:latin}', 'text-size': 16, 'text-font': ['Open Sans Bold'] },
				paint: { 'text-color': '#123456', 'text-halo-color': '#fff', 'text-halo-width': 1 },
			},
		]);
		const reading = readProbe(s, OMT, probe('label-place-city'));
		expect(reading).toMatchObject({ layers: ['city'], textSize: 16, textFont: ['Open Sans Bold'] });
		expect(round(reading?.colors.halo)).toEqual([1, 1, 1, 1]);
		expect(labelText(reading!.label!.layer, 10, probe('label-place-city'), reading!.label!.feature)).toBe(
			NAME_MARKER + 'name:latin'
		);
	});

	it('reads no halo colour from a transparent halo', () => {
		const s = style([
			{
				id: 'street',
				type: 'symbol',
				source: 'omt',
				'source-layer': 'transportation_name',
				layout: { 'text-field': '{name}' },
				paint: { 'text-color': '#666', 'text-halo-color': 'rgba(0,0,0,0)', 'text-halo-width': 1 },
			},
		]);
		expect(Object.keys(readProbe(s, OMT, probe('label-street-primary'))!.colors)).toEqual(['text']);
	});

	it('skips labels that show nothing, and reads icons without text', () => {
		const symbol = { type: 'symbol', source: 'omt', 'source-layer': 'poi' };
		const s = style([
			{ ...symbol, id: 'icon', layout: { 'icon-image': 'restaurant' } },
			{ ...symbol, id: 'empty', layout: { 'text-field': '' } },
			{ ...symbol, id: 'faded', layout: { 'text-field': '{name}' }, paint: { 'text-opacity': 0 } },
		]);
		expect(readProbe(s, OMT, probe('poi-amenity'))).toMatchObject({ layers: ['icon'], colors: {} });
	});

	it('shows which name field a label falls back to when one is hidden', () => {
		const layer = {
			id: 'l',
			type: 'symbol',
			source: 'omt',
			'source-layer': 'place',
			layout: { 'text-field': ['coalesce', ['get', 'name_de'], ['get', 'name']] },
		} as never;
		const p = probe('label-place-city');
		const feature = p.features.openmaptiles![0];
		expect(labelText(layer, 10, p, feature)).toBe(NAME_MARKER + 'name_de');
		expect(labelText(layer, 10, p, feature, new Set(['name_de']))).toBe(NAME_MARKER + 'name');
	});

	it('treats unparseable filters and properties as not drawing', () => {
		const s = style([
			{
				id: 'broken',
				type: 'fill',
				source: 'omt',
				'source-layer': 'water',
				filter: ['nonsense-operator'],
				paint: { 'fill-color': '#fff' },
			},
			{ id: 'bad-color', type: 'fill', source: 'omt', 'source-layer': 'water', paint: { 'fill-color': 42 } },
		]);
		expect(readProbe(s, OMT, probe('water-area'))).toBeUndefined();
	});
});
