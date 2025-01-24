 

import { jest } from '@jest/globals';

// Mocking Node.js modules
jest.unstable_mockModule('node:fs', () => ({
	existsSync: jest.fn(),
	readFileSync: jest.fn(),
}));

const { existsSync, readFileSync } = await import('node:fs');
const { Icon, loadIcons } = await import('./icons');

describe('Icon', () => {
	const filename = 'path/to/icon.svg';
	const svgContent = '<svg></svg>';

	beforeEach(() => {
		jest.mocked(existsSync).mockReturnValue(true);
		jest.mocked(readFileSync).mockReturnValue(svgContent);
	});

	it('should initialize icon with provided options', () => {
		const icon = new Icon({ name: 'test-icon', size: 24, filename });

		expect(icon.name).toBe('test-icon');
		expect(icon.size).toBe(24);
		expect(icon.svg).toBe(svgContent);
		expect(existsSync).toHaveBeenCalledWith(filename);
		expect(readFileSync).toHaveBeenCalledWith(filename, 'utf8');
	});

	it('should throw an error if the icon file does not exist', () => {
		jest.mocked(existsSync).mockReturnValue(false);

		expect(() => new Icon({ name: 'missing-icon', size: 24, filename })).toThrow('icon not found: ' + filename);
	});
});

describe('loadIcons', () => {
	const dirIcons = 'icons';
	const svgContent = '<svg></svg>';

	beforeEach(() => {
		jest.mocked(existsSync).mockReturnValue(true);
		jest.mocked(readFileSync).mockReturnValue(svgContent);
	});

	it('should load icons from specified icon sets', () => {
		const iconSets = { set1: { size: 24, names: ['icon1', 'icon2'] } };

		const icons = loadIcons(iconSets, dirIcons);

		expect(icons.length).toBe(2);
		expect(icons[0].name).toBe('set1-icon1');
		expect(icons[0].size).toBe(24);
		expect(icons[0].svg).toBe(svgContent);
	});
});
