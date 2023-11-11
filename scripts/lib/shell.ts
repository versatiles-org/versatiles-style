import { spawn } from 'child_process';

export async function run(command: string, errorOnCodeNonZero?: boolean): Promise<{ code: number | null; signal: string | null; stdout: string; stderr: string }> {
	try {
		return await new Promise((resolve, reject) => {
			const stdout: Buffer[] = [];
			const stderr: Buffer[] = [];
			const cp = spawn('bash', ['-c', command])
				.on('error', error => {
					reject(error);
				})
				.on('close', (code, signal) => {
					const result = {
						code,
						signal,
						stdout: Buffer.concat(stdout).toString(),
						stderr: Buffer.concat(stderr).toString(),
					};
					if ((errorOnCodeNonZero ?? true) && (code !== 0)) {
						reject(result);
					} else {
						resolve(result);
					}
				});
			cp.stdout.on('data', (chunk: Buffer) => stdout.push(chunk));
			cp.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));
		});
	} catch (error) {
		console.error(error);
		throw error;
	}
}

run.stderr = async (command: string, errorOnCodeZero?: boolean): Promise<string> =>
	(await run(command, errorOnCodeZero)).stderr.trim();

run.stdout = async (command: string, errorOnCodeZero?: boolean): Promise<string> =>
	(await run(command, errorOnCodeZero)).stdout.trim();

run.ok = async (command: string): Promise<boolean> =>
	(await run(command, false)).code === 0;
