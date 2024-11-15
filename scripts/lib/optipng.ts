import { spawn } from 'node:child_process';
import { rm, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

/**
 * Optimizes a PNG buffer using the optipng command-line tool.
 * @param bufferIn - Input PNG buffer.
 * @returns Optimized PNG buffer.
 * @throws Error if the optipng process fails or if stderr contains an error message.
 */
export async function optipng(bufferIn: Buffer): Promise<Buffer> {
	const randomString = Math.random().toString(36).replace(/[^a-z0-9]/g, '');
	const filename = resolve(tmpdir(), `${randomString}.png`);

	// Write the input buffer to a temporary file
	await writeFile(filename, bufferIn);

	try {
		await new Promise<void>((resolve, reject) => {
			const process = spawn('optipng', [filename]);
			let stderr = '';

			// Capture stderr data
			process.stderr?.on('data', (data) => {
				stderr += data.toString();
			});

			// Handle process events
			process.on('error', (err) => reject(err));
			process.on('close', (code) => {
				if (code === 0) return resolve();
				reject(new Error(`optipng optimization failed: ${stderr.trim()}`));
			});
		});

		// Read the optimized file
		const bufferOut = await readFile(filename);
		await rm(filename); // Clean up the temporary file
		return bufferOut;
	} catch (error) {
		// Ensure the file is deleted in case of an error
		await rm(filename).catch(() => { }); // Suppress errors if the file doesn't exist
		throw error;
	}
}
