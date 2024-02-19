/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/naming-convention */


import { jest } from '@jest/globals';
import type { Sharp } from 'sharp';

jest.mock('sharp');
jest.unstable_mockModule('node:fs', () => ({
	writeFileSync: jest.fn(),
	readFileSync: jest.fn(),
	rmSync: jest.fn(),
}));
jest.mock('path');

const sharp = (await import('sharp')).default;
const { Sprite } = await import('./sprites.ts');
const fs = await import('node:fs');

describe('Sprite', () => {
	describe('fromIcons', () => {
		it('should create a Sprite instance from icons', async () => {
			// Setup mocks for sharp and any other necessary operations
			jest.mocked(sharp).mockImplementation(() => ({
				composite: jest.fn<Sharp['composite']>().mockReturnThis(),
				raw: jest.fn<Sharp['raw']>().mockReturnThis(),
				// @ts-expect-error to lazy
				toBuffer: jest.fn<() => Promise<Buffer>>().mockResolvedValue(Buffer.from('test')),
			}));

			const icons = [{ name: 'icon1', svg: '<svg width="100" height="100"></svg>', size: 100 }];
			const sprite = await Sprite.fromIcons(icons, 1, 10);

			expect(sprite).toBeInstanceOf(Sprite);
			// Further assertions to verify the internals like dimensions, buffer, etc., can be added here
		});
	});

	describe('saveToDisk', () => {
		it('should save the sprite to disk as PNG and JSON', async () => {
			const basename = 'sprite';
			const folder = '/test';
			const mockSprite = await Sprite.fromIcons([], 1, 10);

			// Stub the getPng and getJSON methods to simplify
			jest.spyOn(mockSprite as any, 'getPng').mockResolvedValue(Buffer.from('png data'));
			jest.spyOn(mockSprite as any, 'getJSON').mockResolvedValue(Buffer.from('json data'));

			await mockSprite.saveToDisk(basename, folder);

			expect(fs.writeFileSync).toHaveBeenCalledWith('/test/sprite.png', Buffer.from('png data'));
			expect(fs.writeFileSync).toHaveBeenCalledWith('/test/sprite.json', Buffer.from('json data'));
		});
	});

	describe('Sprite.fromIcons', () => {
		it('creates a Sprite instance from icons', async () => {
			// Mock `sharp` and `bin-pack` as necessary
			jest.mock('sharp');
			jest.mock('bin-pack', () => ({
				default: jest.fn(() => ({ width: 100, height: 100 })),
			}));

			const icons = [{ name: 'icon1', svg: '<svg width="100" height="100"></svg>', size: 50 }];
			const sprite = await Sprite.fromIcons(icons, 2, 5); // Example usage

			expect(sprite).toBeInstanceOf(Sprite);
			expect((sprite as any).width).toBe(120);
			expect((sprite as any).height).toBe(120);
		});
	});

});
