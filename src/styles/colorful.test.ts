import { describe, expect, it } from 'vitest';
import Colorful from './colorful';

describe('Colorful Styles', () => {
	const colorful = new Colorful();

	it('return correct default options', () => {
		expect(colorful.getDefaultOptions()).toStrictEqual({
			baseUrl: 'https://tiles.versatiles.org',
			bounds: [-180, -85.0511287798066, 180, 85.0511287798066],
			colors: {
				agriculture: '#F0E7D1',
				boundary: '#A6A6C8',
				building: '#F2EAE2',
				buildingbg: '#DFDBD7',
				burial: '#DDDBCA',
				commercial: '#F7DEED40',
				construction: '#A9A9A9',
				cycle: '#EFF9FF',
				danger: '#FF0000',
				disputed: '#BEBCCF',
				education: '#FFFF80',
				foot: '#FBEBFF',
				glacier: '#FFFFFF',
				grass: '#D8E8C8',
				hospital: '#FF6666',
				industrial: '#FFF4C255',
				label: '#333344',
				labelHalo: '#FFFFFFCC',
				land: '#F9F4EE',
				leisure: '#E7EDDE',
				motorway: '#FFCC88',
				motorwaybg: '#E9AC77',
				park: '#D9D9A5',
				parking: '#EBE8E6',
				poi: '#555555',
				prison: '#FDF2FC',
				rail: '#B1BBC4',
				residential: '#EAE6E133',
				rock: '#E0E4E5',
				sand: '#FAFAED',
				shield: '#FFFFFF',
				street: '#FFFFFF',
				streetbg: '#CFCDCA',
				subway: '#A6B8C7',
				symbol: '#66626A',
				trunk: '#FFEEAA',
				trunkbg: '#E9AC77',
				waste: '#DBD6BD',
				water: '#BEDDF3',
				wetland: '#D3E6DB',
				wood: '#66AA44',
			},
			fonts: {
				bold: 'noto_sans_bold',
				regular: 'noto_sans_regular',
			},
			glyphs: '/assets/glyphs/{fontstack}/{range}.pbf',
			hideLabels: false,
			language: '',
			recolor: {
				blend: 0,
				blendColor: '#000000',
				brightness: 0,
				contrast: 1,
				gamma: 1,
				invertBrightness: false,
				rotate: 0,
				saturate: 0,
				tint: 0,
				tintColor: '#FF0000',
			},
			sprite: [
				{
					id: 'basics',
					url: '/assets/sprites/basics/sprites',
				},
			],
			tiles: ['/tiles/osm/{z}/{x}/{y}'],
		});
	});

	it('builds a style', () => {
		const style = colorful.build();
		expect(style).toBeDefined();
		expect(style).toHaveProperty('layers');
		expect(style).toHaveProperty('name');
		expect(style).toHaveProperty('glyphs');
		expect(style).toHaveProperty('sprite');
	});
});
