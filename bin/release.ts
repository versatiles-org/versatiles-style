#!/usr/bin/env npx tsx

import { spawn } from 'child_process';

process.chdir((new URL('../', import.meta.url)).pathname);

await checkThatNoUncommittedChanges();
// check if no git

// lint

// test

// get current version
// ask for new version
// set new version in package.json
// rebuild package.json

// prepare release notes

// build styles

// build browser

// npm run build-node
// npm release

// git add
// git commit
// git add tag
// git push

// new github release
// upload release notes
// upload styles
// upload browser.js


async function checkThatNoUncommittedChanges() {
	console.log(await run('git status --porcelain'));
}

function run(command: string): Promise<{ code: number | null, signal: string | null, stdout: string, stderr: string }> {
	return new Promise((res, rej) => {
		const stdout: Buffer[] = [];
		const stderr: Buffer[] = [];
		const cp = spawn('bash', ['-c', command])
			.on('error', error => rej(error))
			.on('close', (code, signal) => {
				res({ code, signal, stdout: Buffer.concat(stdout).toString(), stderr: Buffer.concat(stderr).toString() })
			})
		cp.stdout?.on('data', chunk => stdout.push(chunk));
		cp.stderr?.on('data', chunk => stderr.push(chunk));
	})
}