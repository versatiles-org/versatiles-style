import { spawn } from "child_process";

export function run(command: string, errorOnCodeZero?: boolean): Promise<{ code: number | null, signal: string | null, stdout: string, stderr: string }> {
	errorOnCodeZero ??= true;
	return new Promise((res, rej) => {
		const stdout: Buffer[] = [];
		const stderr: Buffer[] = [];
		const cp = spawn('bash', ['-c', command])
			.on('error', error => rej(error))
			.on('close', (code, signal) => {
				const result = { code, signal, stdout: Buffer.concat(stdout).toString(), stderr: Buffer.concat(stderr).toString() };
				if (errorOnCodeZero && (code !== 0)) return rej(result);
				res(result)
			})
		cp.stdout?.on('data', chunk => stdout.push(chunk));
		cp.stderr?.on('data', chunk => stderr.push(chunk));
	})
}
run.stderr = async function (command: string, errorOnCodeZero?:boolean): Promise<string> {
	return (await run(command, errorOnCodeZero)).stderr.trim()
}
run.stdout = async function (command: string, errorOnCodeZero?:boolean): Promise<string> {
	return (await run(command, errorOnCodeZero)).stdout.trim()
}
run.ok = async function (command: string): Promise<boolean> {
	return (await run(command,false)).code === 0
}
