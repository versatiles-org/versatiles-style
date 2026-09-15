import { describe, expect, it, vi } from 'vitest';
import {
	DEFAULT_LABEL_STYLES,
	LABEL_STYLE_KEYS,
	TEXT_GROUPS,
	TEXT_TOPICS,
	labelLanguage,
	mapTopics,
	resolveText,
	topicOf,
	type ResolvedLabelStyle,
} from './text.js';

const R = 'noto_sans_regular';
const B = 'noto_sans_bold';

/** One property of every topic, as a flat record — `{ 'water.rivers': value, … }`. */
const column = (text: ReturnType<typeof resolveText>, key: keyof ResolvedLabelStyle) =>
	Object.fromEntries(TEXT_TOPICS.map((topic) => [topic, topicOf(text, topic)[key]]));

describe('TEXT_TOPICS', () => {
	it('lists every leaf of TEXT_GROUPS, and addresses', () => {
		expect(TEXT_TOPICS).toStrictEqual([
			'boundaries.countries',
			'boundaries.states',
			'places.cities',
			'places.villages',
			'places.hamlets',
			'places.districts',
			'streets.names',
			'streets.refs',
			'streets.exits',
			'water.lakes',
			'water.rivers',
			'pois.general',
			'pois.transit',
			'addresses',
		]);
		expect(Object.keys(mapTopics(() => 0))).toStrictEqual([...Object.keys(TEXT_GROUPS), 'addresses']);
	});
});

describe('labelLanguage', () => {
	it("reads 'user' as the browser language and returns every other value as it is", () => {
		vi.stubGlobal('navigator', { language: 'de-AT' });
		try {
			expect(labelLanguage('user')).toBe('de');
			expect(labelLanguage('fr')).toBe('fr');
			expect(labelLanguage('local')).toBe('local');
		} finally {
			vi.unstubAllGlobals();
		}
	});

	it("reads 'user' as 'local' where there is no browser language", () => {
		for (const navigator of [undefined, {}, { language: '' }]) {
			vi.stubGlobal('navigator', navigator);
			try {
				expect(labelLanguage('user')).toBe('local');
			} finally {
				vi.unstubAllGlobals();
			}
		}
	});
});

describe('resolveText', () => {
	it('fills every topic with its default label style', () => {
		const text = resolveText();
		expect(text.language).toBe('local');
		expect(text.languageStrict).toBe(false);
		expect(text.pitchAlignment).toBe('map');
		for (const topic of TEXT_TOPICS) {
			expect(Object.keys(topicOf(text, topic)), topic).toStrictEqual([...LABEL_STYLE_KEYS]);
			expect(topicOf(text, topic), topic).toStrictEqual(topicOf(DEFAULT_LABEL_STYLES, topic));
		}
	});

	it('has the defaults the layer modules used to hard-code', () => {
		const text = resolveText();
		expect(column(text, 'font')).toMatchObject({ 'streets.refs': B, 'pois.general': B, 'streets.names': R });
		expect(Object.entries(column(text, 'transform')).filter(([, v]) => v === 'uppercase')).toStrictEqual([
			['boundaries.countries', 'uppercase'],
			['boundaries.states', 'uppercase'],
			['places.hamlets', 'uppercase'],
			['places.districts', 'uppercase'],
		]);
		expect(column(text, 'haloWidth')).toMatchObject({
			'streets.refs': 0.1,
			'streets.exits': 1,
			'pois.general': 0.5,
			addresses: 0,
			'places.cities': 2,
		});
		expect(column(text, 'haloBlur')).toMatchObject({ 'pois.general': 0.5, addresses: 0, 'water.rivers': 1 });
		for (const topic of TEXT_TOPICS) {
			expect(topicOf(text, topic), topic).toMatchObject({
				scale: 1,
				spacing: 1,
				maxWidth: 10,
				lineHeight: 1.2,
				letterSpacing: 0,
			});
		}
	});

	it('takes each property from the nearest node that sets it', () => {
		const text = resolveText({
			font: 'a',
			scale: 1.5,
			streets: { font: 'b', refs: { font: 'c', scale: 2 } },
			places: { hamlets: { transform: 'none' } },
			addresses: { haloWidth: 1 },
		});
		expect(text.streets.refs).toMatchObject({ font: 'c', scale: 2 });
		expect(text.streets.names).toMatchObject({ font: 'b', scale: 1.5 });
		expect(text.water.lakes).toMatchObject({ font: 'a', scale: 1.5 });
		expect(text.places.hamlets.transform).toBe('none');
		expect(text.places.districts.transform).toBe('uppercase');
		expect(text.addresses).toMatchObject({ font: 'a', haloWidth: 1, haloBlur: 0 });
	});

	it('does not compound values from different levels', () => {
		const text = resolveText({ scale: 2, streets: { scale: 1.5 } });
		expect(text.streets.names.scale).toBe(1.5);
	});

	it('keeps a topic default that no node overrides', () => {
		// bold refs survive a group font set on a sibling
		expect(resolveText({ water: { font: 'x' } }).streets.refs.font).toBe(B);
		// but a root font reaches every topic
		expect(resolveText({ font: 'x' }).streets.refs.font).toBe('x');
	});

	it('resolves its own output to itself', () => {
		const text = resolveText({ font: 'a', water: { rivers: { letterSpacing: 0.1 } }, pitchAlignment: 'viewport' });
		expect(resolveText(text)).toStrictEqual(text);
	});

	it('falls back to the label styles it is given', () => {
		const bold = mapTopics((topic) => ({ ...topicOf(DEFAULT_LABEL_STYLES, topic), font: B }));
		const text = resolveText({ water: { font: 'x' } }, 'text', bold);
		expect(text.water.lakes.font).toBe('x');
		expect(text.places.cities.font).toBe(B);
	});

	it('allows language, languageStrict and pitchAlignment on the root only', () => {
		expect(resolveText({ language: 'de', languageStrict: true, pitchAlignment: 'viewport' })).toMatchObject({
			language: 'de',
			languageStrict: true,
			pitchAlignment: 'viewport',
		});
		expect(() => resolveText({ streets: { language: 'de' } } as never)).toThrow('unknown option "streets.language"');
		expect(() => resolveText({ streets: { names: { pitchAlignment: 'viewport' } } } as never)).toThrow(
			'unknown option "streets.names.pitchAlignment"'
		);
		expect(() => resolveText({ pitchAlignment: 'upright' as never })).toThrow(
			'text.pitchAlignment: unknown value "upright". Valid values: map, viewport.'
		);
	});

	it('rejects unknown topics and values of the wrong type', () => {
		expect(() => resolveText({ water: { river: {} } } as never)).toThrow('unknown option "water.river"');
		expect(() => resolveText({ sea: {} } as never)).toThrow('unknown option "sea"');
		expect(() => resolveText({ addresses: { names: {} } } as never)).toThrow('unknown option "addresses.names"');
		expect(() => resolveText({ water: 'x' } as never)).toThrow('text.water: expected an object, got "x"');
		expect(() => resolveText({ font: '' })).toThrow('text.font: expected a font name string, got ""');
		expect(() => resolveText({ streets: { scale: '2' } } as never)).toThrow(
			'text.streets.scale: expected a number, got "2"'
		);
		expect(() => resolveText({ transform: 'capitalize' } as never)).toThrow(
			'text.transform: expected one of none, uppercase, lowercase, got "capitalize"'
		);
	});
});
