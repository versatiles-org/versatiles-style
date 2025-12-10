import http from 'http';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock(import('fs'), async (originalImport) => {
	const fs = await originalImport();
	return {
		...fs,
		readFileSync: vi.fn(),
	};
});

const { readFileSync } = await import('fs');

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

	it('should return the INDEX page for "/"', async () => {
		await new Promise<void>((resolve) => {
			http.get(`http://localhost:${PORT}/`, (res) => {
				expect(res.statusCode).toBe(200);
				let data = '';
				res.on('data', (chunk) => (data += chunk));
				res.on('end', () => {
					expect(data).toContain('<!DOCTYPE html>');
					resolve();
				});
			});
		});
	});

	it('should serve files from the local folder for "/assets/sprites/"', async () => {
		// Mock readFileSync for local file access
		const mockFileContent = 'mock sprite content';
		vi.mocked(readFileSync).mockReturnValue(mockFileContent);

		await new Promise<void>((resolve) => {
			http.get(`http://localhost:${PORT}/assets/sprites/test.png`, (res) => {
				expect(res.statusCode).toBe(200);
				let data = '';
				res.on('data', (chunk) => (data += chunk));
				res.on('end', () => {
					expect(data).toBe(mockFileContent);
					resolve();
				});
			});
		});
	});

	it('should proxy requests to a remote server for "/assets/lib/maplibre-gl/"', async () => {
		await new Promise<void>((resolve) => {
			http.get(`http://localhost:${PORT}/assets/lib/maplibre-gl/maplibre-gl.js`, (res) => {
				expect(res.statusCode).toBe(200);
				let data = '';
				res.on('data', (chunk) => (data += chunk));
				res.on('end', () => {
					expect(data.slice(0, 3)).toBe('/**');
					resolve();
				});
			});
		});
	});

	it('should return a 404 error for missing URLs', async () => {
		await new Promise<void>((resolve) => {
			http.get(`http://localhost:${PORT}/unknown/path`, (res) => {
				expect(res.statusCode).toBe(404);
				let data = '';
				res.on('data', (chunk) => (data += chunk));
				res.on('end', () => {
					expect(data).toContain('Not Found');
					resolve();
				});
			});
		});
	});
});
