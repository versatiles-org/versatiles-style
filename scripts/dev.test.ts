import http from 'node:http';
import { jest } from '@jest/globals';

jest.unstable_mockModule('node:fs', () => ({
	readFileSync: jest.fn(),
}));

const { readFileSync } = await import('node:fs');

const PORT = 8080;

describe('Server', () => {
	let server: http.Server;

	beforeAll(async () => {
		// Dynamically import the server script
		server = (await import('./dev.js')).server;
	});

	afterAll(() => {
		server.close();
	});

	it('should return the INDEX page for "/"', (done) => {
		http.get(`http://localhost:${PORT}/`, (res) => {
			expect(res.statusCode).toBe(200);
			let data = '';
			res.on('data', (chunk) => (data += chunk));
			res.on('end', () => {
				expect(data).toContain('<!DOCTYPE html>');
				done();
			});
		});
	});

	it('should serve files from the local folder for "/assets/sprites/"', (done) => {
		// Mock readFileSync for local file access
		const mockFileContent = 'mock sprite content';
		(readFileSync as jest.Mock).mockReturnValue(mockFileContent);

		http.get(`http://localhost:${PORT}/assets/sprites/test.png`, (res) => {
			expect(res.statusCode).toBe(200);
			let data = '';
			res.on('data', (chunk) => (data += chunk));
			res.on('end', () => {
				expect(data).toBe(mockFileContent);
				done();
			});
		});
	});

	it('should proxy requests to a remote server for "/assets/lib/maplibre-gl/"', (done) => {
		http.get(`http://localhost:${PORT}/assets/lib/maplibre-gl/maplibre-gl.js`, (res) => {
			expect(res.statusCode).toBe(200);
			let data = '';
			res.on('data', (chunk) => (data += chunk));
			res.on('end', () => {
				expect(data.slice(0, 3)).toBe('/**');
				done();
			});
		});
	});

	it('should return a 404 error for missing URLs', (done) => {
		http.get(`http://localhost:${PORT}/unknown/path`, (res) => {
			expect(res.statusCode).toBe(404);
			let data = '';
			res.on('data', (chunk) => (data += chunk));
			res.on('end', () => {
				expect(data).toContain('Not Found');
				done();
			});
		});
	});
});
