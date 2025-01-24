import { jest } from '@jest/globals';
import type { ChildProcess } from 'node:child_process';
import type { Readable } from 'node:stream';

jest.unstable_mockModule('node:child_process', () => ({
	spawn: jest.fn(async () => { }),
}));

jest.unstable_mockModule('node:fs/promises', () => ({
	writeFile: jest.fn(async () => { }),
	readFile: jest.fn(async () => Buffer.from('optimized png buffer')),
	rm: jest.fn(async () => { }),
}));

jest.unstable_mockModule('node:os', () => ({
	tmpdir: jest.fn(() => '/tmp'),
}));

const { spawn } = await import('node:child_process');
const { writeFile, rm } = await import('node:fs/promises');
const { optipng } = await import('./optipng');

describe('optipng', () => {
	const mockBuffer = Buffer.from('test png buffer');
	const checkFilename = expect.stringMatching(/^\/tmp\/.*\.png$/);

	beforeEach(() => {
		jest.clearAllMocks();
	});

	test('successfully optimizes a PNG buffer', async () => {
		const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;

		// Mock spawn behavior
		const mockProcess = {
			stderr: {
				on: jest.fn(),
			},
			on: jest.fn((event: string, listener: (...args: unknown[]) => void): ChildProcess => {
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

	test('throws an error if the optipng process fails', async () => {
		const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;

		// Mock spawn behavior
		const mockProcess = {
			stderr: {
				on: jest.fn((event: string, listener: (...args: unknown[]) => void): Readable | null => {
					if (event === 'data') listener('mock error');
					return mockProcess.stderr;
				}),
			},
			on: jest.fn((event: string, listener: (...args: unknown[]) => void): ChildProcess => {
				if (event === 'close') listener(1);
				return mockProcess;
			}),
		} as unknown as ChildProcess;;
		mockSpawn.mockReturnValue(mockProcess);

		//jest.mocked(rm).mockRejectedValueOnce(new Error('mock error'));

		await expect(optipng(mockBuffer)).rejects.toThrow('optipng optimization failed: mock error');

		expect(writeFile).toHaveBeenCalledWith(checkFilename, mockBuffer);
		expect(rm).toHaveBeenCalledWith(checkFilename);
	});

	test('throws an error if the spawn process itself fails', async () => {
		const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;

		// Mock spawn behavior
		const mockProcess = {
			on: jest.fn((event: string, listener: (...args: unknown[]) => void): ChildProcess => {
				if (event === 'error') listener(new Error('spawn error'));
				return mockProcess;
			}),
		} as unknown as ChildProcess;;
		mockSpawn.mockReturnValue(mockProcess);

		await expect(optipng(mockBuffer)).rejects.toThrow('spawn error');

		expect(writeFile).toHaveBeenCalledWith(checkFilename, mockBuffer);
		expect(rm).toHaveBeenCalledWith(checkFilename);
	});

	test('cleans up temporary files in case of errors', async () => {
		const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;

		// Mock spawn behavior
		const mockProcess = {
			on: jest.fn((event: string, listener: (...args: unknown[]) => void): ChildProcess => {
				if (event === 'error') listener(new Error('spawn error'));
				return mockProcess;
			}),
		} as unknown as ChildProcess;;
		mockSpawn.mockReturnValue(mockProcess);

		await expect(optipng(mockBuffer)).rejects.toThrow();

		expect(rm).toHaveBeenCalledWith(checkFilename);
	});
});