import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChildProcess } from 'child_process';
import type { Readable } from 'stream';

vi.mock('child_process', () => ({
	spawn: vi.fn(async () => { }),
}));

vi.mock('fs/promises', () => ({
	writeFile: vi.fn(async () => { }),
	readFile: vi.fn(async () => Buffer.from('optimized png buffer')),
	rm: vi.fn(async () => { }),
}));

vi.mock('os', () => ({
	tmpdir: vi.fn(() => '/tmp'),
}));

const { spawn } = await import('child_process');
const { writeFile, rm } = await import('fs/promises');
const { optipng } = await import('./optipng.js');

describe('optipng', () => {
	const mockBuffer = Buffer.from('test png buffer');
	const checkFilename = expect.stringMatching(/^\/tmp\/.*\.png$/);

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('successfully optimizes a PNG buffer', async () => {
		const mockSpawn = vi.mocked(spawn);

		// Mock spawn behavior
		const mockProcess = {
			stderr: {
				on: vi.fn(),
			},
			on: vi.fn((event: string, listener: (...args: unknown[]) => void): ChildProcess => {
				if (event === 'close') listener(0); // Simulate successful process exit
				return mockProcess;
			}),
		} as unknown as ChildProcess;
		mockSpawn.mockReturnValue(mockProcess);

		const result = await optipng(mockBuffer);

		expect(writeFile).toHaveBeenCalledWith(checkFilename, mockBuffer);
		expect(mockProcess.on).toHaveBeenCalledWith('close', expect.any(Function));
		expect(result).toEqual(Buffer.from('optimized png buffer'));
		expect(rm).toHaveBeenCalledWith(checkFilename);
	});

	it('throws an error if the optipng process fails', async () => {
		const mockSpawn = vi.mocked(spawn);

		// Mock spawn behavior
		const mockProcess = {
			stderr: {
				on: vi.fn((event: string, listener: (...args: unknown[]) => void): Readable | null => {
					if (event === 'data') listener('mock error');
					return mockProcess.stderr;
				}),
			},
			on: vi.fn((event: string, listener: (...args: unknown[]) => void): ChildProcess => {
				if (event === 'close') listener(1);
				return mockProcess;
			}),
		} as unknown as ChildProcess;;
		mockSpawn.mockReturnValue(mockProcess);

		await expect(optipng(mockBuffer)).rejects.toThrow('optipng optimization failed: mock error');

		expect(writeFile).toHaveBeenCalledWith(checkFilename, mockBuffer);
		expect(rm).toHaveBeenCalledWith(checkFilename);
	});

	it('throws an error if the spawn process itself fails', async () => {
		const mockSpawn = vi.mocked(spawn);

		// Mock spawn behavior
		const mockProcess = {
			on: vi.fn((event: string, listener: (...args: unknown[]) => void): ChildProcess => {
				if (event === 'error') listener(new Error('spawn error'));
				return mockProcess;
			}),
		} as unknown as ChildProcess;;
		mockSpawn.mockReturnValue(mockProcess);

		await expect(optipng(mockBuffer)).rejects.toThrow('spawn error');

		expect(writeFile).toHaveBeenCalledWith(checkFilename, mockBuffer);
		expect(rm).toHaveBeenCalledWith(checkFilename);
	});

	it('cleans up temporary files in case of errors', async () => {
		const mockSpawn = vi.mocked(spawn);

		// Mock spawn behavior
		const mockProcess = {
			on: vi.fn((event: string, listener: (...args: unknown[]) => void): ChildProcess => {
				if (event === 'error') listener(new Error('spawn error'));
				return mockProcess;
			}),
		} as unknown as ChildProcess;;
		mockSpawn.mockReturnValue(mockProcess);

		await expect(optipng(mockBuffer)).rejects.toThrow();

		expect(rm).toHaveBeenCalledWith(checkFilename);
	});
});