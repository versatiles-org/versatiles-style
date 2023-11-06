import { spawn } from 'child_process';

export async function run(command: string, errorOnCodeZero?: boolean): Promise<{ code: number | null; signal: string | null; stdout: string; stderr: string }> {
	return new Promise((res, rej) => {
		const stdout: Buffer[] = [];
		const stderr: Buffer[] = [];
		const cp = spawn('bash', ['-c', command])
			.on('error', error => {
				rej(error);
			})
			.on('close', (code, signal) => {
				const result = { code, signal, stdout: Buffer.concat(stdout).toString(), stderr: Buffer.concat(stderr).toString() };
				if ((errorOnCodeZero ?? true) && (code !== 0)) {
					rej(result); return;
				}
				res(result);
			});
		cp.stdout.on('data', (chunk: Buffer) => stdout.push(chunk));
		cp.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));
	});
}

run.stderr = async (command: string, errorOnCodeZero?: boolean): Promise<string> =>
	(await run(command, errorOnCodeZero)).stderr.trim();

run.stdout = async (command: string, errorOnCodeZero?: boolean): Promise<string> =>
	(await run(command, errorOnCodeZero)).stdout.trim();

run.ok = async (command: string): Promise<boolean> =>
	(await run(command, false)).code === 0;
