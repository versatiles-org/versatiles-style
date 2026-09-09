import { describe, expect, it } from 'vitest';
import { osm } from '../../api/index.js';
// Shortbread's `addresses` layer carries `unit` alongside `housenumber`, and where one number
// covers several spread-out units the number alone is ambiguous (issue #118).
describe('house-number labels include addr:unit', () => {
	const field = () =>
		(osm().layers.find((l) => l.id === 'label-address-housenumber') as { layout: Record<string, unknown> }).layout[
			'text-field'
		];

	it('appends the unit when present, and omits it otherwise', () => {
		expect(field()).toStrictEqual([
			'case',
			['has', 'unit'],
			['concat', ['get', 'housenumber'], '/', ['get', 'unit']],
			['get', 'housenumber'],
		]);
	});

	it('still requires a house number', () => {
		const layer = osm().layers.find((l) => l.id === 'label-address-housenumber') as { filter: unknown };
		expect(layer.filter).toStrictEqual(['has', 'housenumber']);
	});
});
