
export function panic(text: string): void {
	process.stderr.write(`\x1b[1;31m! ERROR: ${text}\x1b[0m\n`); abort();
}
export function warn(text: string): void {
	process.stderr.write(`\x1b[1;33m! warning: ${text}\x1b[0m\n`);
}
export function info(text: string): void {
	process.stderr.write(`\x1b[0mi ${text}\n`);
}

export function abort(): void {
	info('abort'); process.exit();
}

export async function check<T>(message: string, promise: Promise<T>): Promise<T> {
	process.stderr.write(`\x1b[0;90m\u2B95 ${message}\x1b[0m`);
	try {
		const result: T = await promise;
		process.stderr.write(`\r\x1b[0;92m\u2714 ${message}\x1b[0m\n`);
		return result;
	} catch (error) {
		process.stderr.write(`\r\x1b[0;91m\u2718 ${message}\x1b[0m\n`);
		panic((error as Error).message);
		throw Error();
	}
}
