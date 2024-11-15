/* eslint-disable @typescript-eslint/no-explicit-any */

import { jest } from '@jest/globals';
import type { Pack } from 'tar-stream';

jest.unstable_mockModule('node:fs', () => ({
	writeFileSync: jest.fn(),
	readFileSync: jest.fn(),
	rmSync: jest.fn(),
}));
jest.unstable_mockModule('node:child_process', () => ({
	spawn: jest.fn((_command, _args) => {
		const events: Record<string, (...args: any[]) => void> = {};
		return {
			on: (event: string, callback: (...args: any[]) => void) => {
				events[event] = callback;
				if (event === 'close') setImmediate(() => callback(0));
			},
			emit: (event: string, ...args: any[]) => {
				if (events[event]) {
					events[event](...args);
				}
			},
		};
	}),
}));

jest.unstable_mockModule('path', () => ({}));
jest.unstable_mockModule('tar-stream', () => ({}));

const { Sprite } = await import('./sprites.ts');
const fs = await import('node:fs');
await import('node:child_process');

const fakeIcons = [
	{
		name: 'icon1', size: 64, useSDF: true,
		svg: '<svg width="64" height="64"><rect width="64" height="64" fill="#000" /></svg>',
	},
	{
		name: 'icon2', size: 32, useSDF: true,
		svg: '<svg width="32" height="32"><circle cx="16" cy="16" r="16" fill="#f00" /></svg>',
	},
	{
		name: 'icon3', size: 48, useSDF: true,
		svg: '<svg width="48" height="48"><path d="M 24 0 L 48 48 H 0 Z" fill="#00f" /></svg>',
	},
];

describe('Sprite', () => {
	describe('saveToDisk', () => {
		it('should save the sprite as PNG and JSON on disk', async () => {
			const basename = '/test/sprite';
			const mockSprite = await Sprite.fromIcons(fakeIcons, 1, 10);

			jest.spyOn(mockSprite as any, 'getPng').mockResolvedValue(Buffer.from('png data'));
			jest.spyOn(mockSprite as any, 'getJSON').mockResolvedValue(Buffer.from('json data'));

			await mockSprite.saveToDisk(basename);

			expect(fs.writeFileSync).toHaveBeenCalledWith(`${basename}.png`, Buffer.from('png data'));
			expect(fs.writeFileSync).toHaveBeenCalledWith(`${basename}.json`, Buffer.from('json data'));
		});
	});

	describe('fromIcons', () => {
		it('creates a Sprite instance with correct dimensions and properties', async () => {
			jest.mock('sharp');
			jest.mock('bin-pack', () => ({
				default: jest.fn(() => ({ width: 100, height: 100 })),
			}));

			const sprite = await Sprite.fromIcons(fakeIcons, 2, 5);

			expect(sprite).toBeInstanceOf(Sprite);
			expect((sprite as any).width).toBe(264);
			expect((sprite as any).height).toBe(232);
		});
	});

	describe('calcSDF', () => {
		it('computes the signed distance field for the sprite', async () => {
			const sprite = await Sprite.fromIcons(fakeIcons, 1, 0);

			expect((sprite as any).distance).toBeDefined();
			expect((sprite as any).distance).toBeInstanceOf(Float64Array);
		});
	});

	describe('getScaledSprite', () => {
		it('returns a correctly scaled version of the sprite', async () => {
			const originalSprite = await Sprite.fromIcons(fakeIcons, 2, 5);
			const scaledSprite = originalSprite.getScaledSprite(2);

			expect(scaledSprite).toBeInstanceOf(Sprite);
			expect((scaledSprite as any).width).toBe((originalSprite as any).width / 2);
			expect((scaledSprite as any).height).toBe((originalSprite as any).height / 2);
		});
	});

	describe('saveToTar', () => {
		it('adds PNG and JSON entries to a tar archive', async () => {
			const tarPackMock = {
				entry: jest.fn<Pack['entry']>(),
			} as unknown as jest.Mocked<Pack>;

			const sprite = await Sprite.fromIcons(fakeIcons, 2, 5);
			const buffer1 = Buffer.from('fake png data');
			const buffer2 = Buffer.from('{"fake": "json data"}');

			jest.spyOn(sprite as any, 'getPng').mockResolvedValue(buffer1);
			jest.spyOn(sprite as any, 'getJSON').mockResolvedValue(buffer2);

			await sprite.saveToTar('testbasename', tarPackMock);

			expect(tarPackMock.entry).toHaveBeenCalledWith({ name: 'testbasename.png' }, buffer1);
			expect(tarPackMock.entry).toHaveBeenCalledWith({ name: 'testbasename.json' }, buffer2);
		});
	});

	describe('renderSDF', () => {
		it('modifies the buffer based on distance values', async () => {
			const width = 2;
			const height = 2;
			const size = width * height;
			const buffer = Buffer.alloc(size * 4).fill(0);
			const distance = Float64Array.from([1, 2, 3, 4]);

			const sprite = await Sprite.fromIcons(fakeIcons, 2, 5);
			(sprite as any).width = width;
			(sprite as any).height = height;
			(sprite as any).buffer = buffer;
			(sprite as any).distance = distance;

			sprite.renderSDF();

			expect(Array.from(buffer)).toStrictEqual([0, 0, 0, 175, 0, 0, 0, 159, 0, 0, 0, 143, 0, 0, 0, 127]);
		});
	});

	describe('getPng', () => {
		it('returns a PNG buffer after compression', async () => {
			const sprite = await Sprite.fromIcons(fakeIcons, 2, 5);
			const result = await sprite.getPng();

			expect(result).toBeInstanceOf(Buffer);
			expect(Array.from(result.subarray(0, 8))).toStrictEqual([137, 80, 78, 71, 13, 10, 26, 10]);
		});
	});

	describe('getJSON', () => {
		it('returns a JSON buffer with sprite metadata', async () => {
			const sprite = await Sprite.fromIcons(fakeIcons, 2, 5);

			const result = await (sprite as any).getJSON();
			const expectedData = {
				icon1: { width: 148, height: 148, x: 0, y: 0, pixelRatio: 2, sdf: true },
				icon2: { width: 84, height: 84, x: 0, y: 148, pixelRatio: 2, sdf: true },
				icon3: { width: 116, height: 116, x: 148, y: 0, pixelRatio: 2, sdf: true },
			};

			expect(JSON.parse(result.toString())).toStrictEqual(expectedData);
		});
	});
});
