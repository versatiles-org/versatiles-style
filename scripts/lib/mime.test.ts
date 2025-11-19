import { describe, expect, it } from 'vitest';
import { getMimeType } from './mime.js';

describe('getMimeType', () => {
	it('should return correct MIME type for common file extensions', () => {
		expect(getMimeType('index.html')).toBe('text/html');
		expect(getMimeType('styles.css')).toBe('text/css');
		expect(getMimeType('script.js')).toBe('application/javascript');
		expect(getMimeType('data.json')).toBe('application/json');
		expect(getMimeType('image.png')).toBe('image/png');
		expect(getMimeType('picture.jpg')).toBe('image/jpeg');
		expect(getMimeType('photo.jpeg')).toBe('image/jpeg');
		expect(getMimeType('animation.gif')).toBe('image/gif');
		expect(getMimeType('vector.svg')).toBe('image/svg+xml');
	});

	it('should return "application/octet-stream" for unknown extensions', () => {
		expect(getMimeType('file.unknown')).toBe('application/octet-stream');
		expect(getMimeType('anotherfile.xyz')).toBe('application/octet-stream');
	});

	it('should handle files with no extension', () => {
		expect(getMimeType('noextension')).toBe('application/octet-stream');
	});

	it('should handle files with leading dots and no extension', () => {
		expect(getMimeType('.hiddenfile')).toBe('application/octet-stream');
	});

	it('should handle empty input', () => {
		expect(getMimeType('')).toBe('application/octet-stream');
	});

	it('should handle paths with multiple dots', () => {
		expect(getMimeType('archive.tar.gz')).toBe('application/octet-stream');
		expect(getMimeType('file.name.with.many.dots.css')).toBe('text/css');
	});

	it('should handle case-insensitive extensions', () => {
		expect(getMimeType('INDEX.HTML')).toBe('text/html');
		expect(getMimeType('Style.CSS')).toBe('text/css');
		expect(getMimeType('Image.PNG')).toBe('image/png');
		expect(getMimeType('photo.JPG')).toBe('image/jpeg');
		expect(getMimeType('vector.SVG')).toBe('image/svg+xml');
	});
});
