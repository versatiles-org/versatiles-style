#!/usr/bin/env npx tsx

import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import inquirer from 'inquirer'

process.chdir((new URL('../', import.meta.url)).pathname);

/*
// check if no git
await checkThatNoUncommittedChanges();

// lint

// test

// prepare release notes

// build styles
// build node
// build browser

*/
// handle version
const new_version = await getVersion()

// npm release

// git add
// git commit
// git add tag
// git push

// new github release
// upload release notes
// upload styles
// upload browser.js

async function getVersion() {
	// get current version
	const package_json = JSON.parse(readFileSync('./package.json', 'utf8'));
	const version_package: string = package_json.version;
	const version_github: string = await getLatestGitHubTag('versatiles-org/versatiles-styles');
	if (version_package !== version_github) warn(`versions differ in package.json (${version_package}) and latest GitHub tag (${version_github})`)

	// ask for new version
	const { version_new } = await inquirer.prompt({
		message: 'What should be the new version?',
		name: 'version_new',
		type: 'list',
		choices: [bump(2), bump(1), bump(0)]
	})
	if (!version_new) throw Error();

	// verify new version
	const { confirmed } = await inquirer.prompt({
		message: `Are you sure you want to release the new version ${version_new}?`,
		name: 'confirmed',
		type: 'confirm',
		default: false,
	})
	if (!confirmed) abort();

	// set new version in package.json

	// rebuild package.json

	async function getLatestGitHubTag(repo: string): Promise<string> {
		const res = await fetch(`https://api.github.com/repos/${repo}/tags`);
		const tags = await res.json() as { name: string }[];
		const tag = tags.find(tag => tag.name.startsWith('v'))?.name.slice(1);
		if (!tag) throw Error();
		return tag;
	}
	function bump(index: 0 | 1 | 2) {
		const p = version_package.split('.').map(v => parseInt(v, 10));
		if (p.length !== 3) throw Error();
		switch (index) {
			case 0: p[0]++; p[1] = 0; p[2] = 0; break;
			case 1: p[1]++; p[2] = 0; break;
			case 2: p[2]++; break;
		}
		const name = p.map((n, i) => (i == index) ? `\x1b[1m${n}` : `${n}`).join('.') + '\x1b[22m';
		const value = p.join('.');
		return { name, value }
	}
}

async function checkThatNoUncommittedChanges() {
	if ((await run('git status --porcelain')).stdout.length < 3) return;
	panic('please commit all changes before releasing');
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

function panic(text: string) { process.stderr.write(`\x1b[1;31m! ERROR: ${text}\x1b[0m\n`); abort(); }
function warn(text: string) { process.stderr.write(`'\x1b[1;33m! warning: ${text}\x1b[0m\n`); }
function abort() { process.stderr.write('\x1b[1;31m! ABORT\x1b[0m\n'); process.exit(); }