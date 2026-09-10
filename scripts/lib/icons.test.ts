import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mocking Node.js modules
vi.mock('fs', () => ({
	existsSync: vi.fn(),
	readFileSync: vi.fn(),
}));

const { existsSync, readFileSync } = await import('fs');
const { Icon, loadIcons } = await import('./icons.js');

describe('Icon', () => {
	const filename = 'path/to/icon.svg';
	const svgContent = '<svg></svg>';

	beforeEach(() => {
		vi.mocked(existsSync).mockReturnValue(true);
		vi.mocked(readFileSync).mockReturnValue(svgContent);
	});

	it('should initialize icon with provided options', () => {
		const icon = new Icon({ name: 'test-icon', src: 'src/test-icon', title: 'Test', size: 24, filename });

		expect(icon.name).toBe('test-icon');
		expect(icon.src).toBe('src/test-icon');
		expect(icon.size).toBe(24);
		expect(icon.svg).toBe(svgContent);
		expect(existsSync).toHaveBeenCalledWith(filename);
		expect(readFileSync).toHaveBeenCalledWith(filename, 'utf8');
	});

	it('should throw an error if the icon file does not exist', () => {
		vi.mocked(existsSync).mockReturnValue(false);

		expect(() => new Icon({ name: 'missing-icon', src: 'src/missing', title: 'Missing', size: 24, filename })).toThrow(
			'icon not found: ' + filename
		);
	});
});

describe('loadIcons', () => {
	const dirIcons = 'icons';
	const svgContent = '<svg></svg>';

	beforeEach(() => {
		vi.mocked(existsSync).mockReturnValue(true);
		vi.mocked(readFileSync).mockReturnValue(svgContent);
	});

	it('should load icons from specified icon sets', () => {
		// Every icon is an object carrying at least `src` and `title`; the picker fields ride along
		// on the Icon so the sprite JSON can publish them.
		const iconSets = {
			set1: {
				size: 24,
				icons: {
					icon1: { src: 'maki/one', title: 'One' },
					icon2: { src: 'temaki/two', title: 'Two', aliases: ['second'], center: [0.5, 1] as [number, number] },
				},
			},
		};

		const icons = loadIcons(iconSets, dirIcons);

		expect(icons.length).toBe(2);
		expect(icons[0].name).toBe('set1-icon1');
		expect(icons[0].src).toBe('maki/one');
		expect(icons[1].name).toBe('set1-icon2');
		expect(icons[1].src).toBe('temaki/two');
		expect(icons[0].title).toBe('One');
		expect(icons[1].aliases).toStrictEqual(['second']);
		expect(icons[1].center).toStrictEqual([0.5, 1]);
		expect(icons[0].size).toBe(24);
		expect(icons[0].svg).toBe(svgContent);
	});
});
