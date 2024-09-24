 
 

 
/* eslint-disable @typescript-eslint/no-explicit-any */
 


import { jest } from '@jest/globals';
import type { Pack } from 'tar-stream';

jest.unstable_mockModule('node:fs', () => ({
	writeFileSync: jest.fn(),
	readFileSync: jest.fn(),
	rmSync: jest.fn(),
}));
jest.unstable_mockModule('node:child_process', () => ({
	spawnSync: jest.fn().mockReturnValue({ status: 0 }),
}));
jest.mock('path');
jest.mock('tar-stream');

const { Sprite } = await import('./sprites.ts');
const fs = await import('node:fs');
await import('node:child_process');

const fakeIcons = [
	{
		name: 'icon1', size: 64, svg: '<svg width="64" height="64"><rect width="64" height="64" fill="#000" /></svg>',
	},
	{
		name: 'icon2', size: 32, svg: '<svg width="32" height="32"><circle cx="16" cy="16" r="16" fill="#f00" /></svg>',
	},
	{
		name: 'icon3', size: 48, svg: '<svg width="48" height="48"><path d="M 24 0 L 48 48 H 0 Z" fill="#00f" /></svg>',
	},
];


describe('Sprite', () => {
	describe('saveToDisk', () => {
		it('should save the sprite to disk as PNG and JSON', async () => {
			const basename = 'sprite';
			const folder = '/test';
			const mockSprite = await Sprite.fromIcons(fakeIcons, 1, 10);

			// Stub the getPng and getJSON methods to simplify
			jest.spyOn(mockSprite as any, 'getPng').mockResolvedValue(Buffer.from('png data'));
			jest.spyOn(mockSprite as any, 'getJSON').mockResolvedValue(Buffer.from('json data'));

			await mockSprite.saveToDisk(basename, folder);

			expect(fs.writeFileSync).toHaveBeenCalledWith('/test/sprite.png', Buffer.from('png data'));
			expect(fs.writeFileSync).toHaveBeenCalledWith('/test/sprite.json', Buffer.from('json data'));
		});
	});

	describe('fromIcons', () => {
		it('creates a Sprite instance from icons', async () => {
			// Mock `sharp` and `bin-pack` as necessary
			jest.mock('sharp');
			jest.mock('bin-pack', () => ({
				default: jest.fn(() => ({ width: 100, height: 100 })),
			}));

			const sprite = await Sprite.fromIcons(fakeIcons, 2, 5); // Example usage

			expect(sprite).toBeInstanceOf(Sprite);
			expect((sprite as any).width).toBe(264);
			expect((sprite as any).height).toBe(232);
		});
	});

	describe('calcSDF', () => {
		it('calculates the signed distance field for the sprite', async () => {
			// This is a hypothetical test; implementation depends on `calcSDF` visibility and effects
			const sprite = await Sprite.fromIcons(fakeIcons, 1, 0); // Setup with your actual data
			sprite.calcSDF(); // Assuming it's accessible or its effect can be observed

			// Verify the `distance` property or related outputs
			expect((sprite as any).distance).toBeDefined();
			expect((sprite as any).distance).toBeInstanceOf(Float64Array);
			// Further assertions depending on the method's visibility and effects
		});
	});

	describe('getScaledSprite', () => {
		it('returns a scaled version of the sprite', async () => {
			const originalSprite = await Sprite.fromIcons(fakeIcons, 2, 5);
			originalSprite.calcSDF();
			const scaledSprite = originalSprite.getScaledSprite(2);

			expect(scaledSprite).toBeInstanceOf(Sprite);
			expect((scaledSprite as any).width).toBe((originalSprite as any).width / 2);
			expect((scaledSprite as any).height).toBe((originalSprite as any).height / 2);
			// Additional assertions to verify scaling logic
		});
	});

	describe('saveToTar', () => {
		it('adds PNG and JSON entries to the tar pack', async () => {
			// Create a mock for the tarPack with an entry method
			const tarPackMock = {
				entry: jest.fn<Pack['entry']>(),
			};

			// Create an instance of Sprite (or mock it if necessary)
			const sprite = await Sprite.fromIcons(fakeIcons, 2, 5);

			const buffer1 = Buffer.from('fake png data');
			const buffer2 = Buffer.from('{"fake": "json data"}');

			// Mock the getPng and getJSON methods to return fake data
			jest.spyOn(sprite as any, 'getPng').mockResolvedValue(buffer1);
			jest.spyOn(sprite as any, 'getJSON').mockResolvedValue(buffer2);

			// Call the method under test
			// @ts-expect-error too lazy
			await sprite.saveToTar('testbasename', tarPackMock);

			// Assertions to verify that tarPack.entry was called correctly
			expect(tarPackMock.entry).toHaveBeenNthCalledWith(1, { name: 'testbasename.png' }, buffer1);
			expect(tarPackMock.entry).toHaveBeenNthCalledWith(2, { name: 'testbasename.json' }, buffer2);

			// Additional assertions can be made here, for example, checking the content of the buffers
			// This might require you to inspect the calls to tarPack.entry more closely
		});
	});
	describe('renderSDF', () => {
		it('modifies the buffer based on distance values', async () => {
			// Assuming you have a way to construct a Sprite with a custom buffer and distance for testing
			const width = 2; // Example width
			const height = 2; // Example height
			const size = width * height;
			const buffer = Buffer.alloc(size * 4).fill(0); // RGBA for each pixel, initialized to 0
			const distance = Float64Array.from([1, 2, 3, 4]); // Example distance values

			// Create a Sprite instance (or mock one) and set its properties for the test
			const sprite = await Sprite.fromIcons(fakeIcons, 2, 5);
			(sprite as any).width = width;
			(sprite as any).height = height;
			(sprite as any).buffer = buffer;
			(sprite as any).distance = distance;

			sprite.renderSDF(); // Method under test

			// Now, assert that the buffer was generated correctly
			expect(Array.from(buffer)).toStrictEqual([0, 0, 0, 175, 0, 0, 0, 159, 0, 0, 0, 143, 0, 0, 0, 127]);
		});

		it('throws an error if distance is not set', async () => {
			const sprite = await Sprite.fromIcons(fakeIcons, 2, 5);
			// Ensure 'distance' is unset or null
			(sprite as any).distance = undefined;

			expect(() => {
				sprite.renderSDF();
			}).toThrow();
		});
	});

	describe('getPng', () => {
		it('returns a PNG buffer', async () => {
			// Setup
			const sprite = await Sprite.fromIcons(fakeIcons, 2, 5);
			// Mock sharp and optipng here

			// @ts-expect-error too lazy
			jest.mocked(fs.readFileSync).mockImplementationOnce(() => Buffer.from('hallo'));

			// Execute
			const result = await (sprite as any).getPng();

			// Assert
			expect(result).toBeInstanceOf(Buffer);
			// Additional assertions to verify the buffer content
		});
	});

	describe('getJSON', () => {
		it('returns a JSON buffer representing the sprite entries', async () => {
			// Setup
			const sprite = await Sprite.fromIcons(fakeIcons, 2, 5);

			// Execute
			const result = await (sprite as any).getJSON() as Buffer;
			const expectedData = {
				icon1: { width: 148, height: 148, x: 0, y: 0, pixelRatio: 2, sdf: true },
				icon2: { width: 84, height: 84, x: 0, y: 148, pixelRatio: 2, sdf: true },
				icon3: { width: 116, height: 116, x: 148, y: 0, pixelRatio: 2, sdf: true },
			};

			// Assert
			expect(JSON.parse(result.toString())).toStrictEqual(expectedData);
		});
	});
});
