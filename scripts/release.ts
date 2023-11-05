#!/usr/bin/env npx tsx

import { readFileSync, writeFileSync } from 'node:fs';
import inquirer from 'inquirer'
import { check, info, panic, warn } from './lib/log';
import { run } from './lib/shell';
import { getCommitsBetween, getCurrentGitHubCommit, getLastGitHubTag } from './lib/git';

const BRANCH = 'main'

process.chdir((new URL('../', import.meta.url)).pathname);



/****************************************************************************/

info('starting release process');

// git: check if in the correct branch
const branch = await check('get branch name', run.stdout('git rev-parse --abbrev-ref HEAD'));
if (branch !== BRANCH) panic(`branch name "${branch}" is not "${BRANCH}"`);

// git: check if no changes
await check('are all changes committed?', checkThatNoUncommittedChanges());

// git: pull
await check('git pull', run('git pull -t'));

// get last version
const { sha: shaLast, version: versionLastGithub } = await check('get last github tag', getLastGitHubTag());
const versionLastPackage: string = JSON.parse(readFileSync('./package.json', 'utf8')).version;
if (versionLastPackage !== versionLastGithub) warn(`versions differ in package.json (${versionLastPackage}) and last GitHub tag (${versionLastGithub})`)

// get current sha
const { sha: shaCurrent } = await check('get current github commit', getCurrentGitHubCommit());

// handle version
const nextVersion = await editVersion(versionLastPackage);

// prepare release notes
const releaseNotes = await check('prepare release notes', getReleaseNotes(nextVersion, shaLast, shaCurrent));

// update version
await check('update version', setNextVersion(nextVersion));

// lint
await check('lint', run('npm run lint'));

// test
await check('run tests', run('npm run test'));

// build
await check('build styles', run('npm run build-styles'));
await check('build node version', run('npm run build-node'));
await check('build browser version', run('npm run build-browser'));

// npm publish
await check('npm publish', run('npm publish'));

// git push
await check('git add', run('git add .'));
await check('git commit', run(`git commit -m "v${nextVersion}"`));
await check('git tag', run(`git tag -f -a "v${nextVersion}" -m "new release: v${nextVersion}"`));
await check('git push', run('git push --no-verify --follow-tags'));

// github release
const releaseNotesPipe = `echo -e '${releaseNotes.replace(
	/[^a-z0-9,.?!:_<> -]/gi,
	c => '\\x' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
)}'`
if (await check('check github release', run.ok('gh release view v' + nextVersion))) {
	await check('edit release', run(`${releaseNotesPipe} | gh release edit "v${nextVersion}" -F -`));
} else {
	await check('create release', run(`${releaseNotesPipe} | gh release create "v${nextVersion}" --draft --prerelease -F -`));
}



info('Finished');

process.exit(0);



/****************************************************************************/

async function checkThatNoUncommittedChanges() {
	if ((await run('git status --porcelain')).stdout.length < 3) return;
	throw Error('please commit all changes before releasing');
}
async function editVersion(version_package: string): Promise<string> {
	// ask for new version
	const version_new: string = (await inquirer.prompt({
		message: 'What should be the new version?',
		name: 'version_new',
		type: 'list',
		choices: [version_package, bump(2), bump(1), bump(0)],
		default: 1
	})).version_new
	if (!version_new) throw Error();

	return version_new

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
async function setNextVersion(version: string) {
	// set new version in package.json
	const package_json = JSON.parse(readFileSync('./package.json', 'utf8'));
	package_json.version = version;
	writeFileSync('./package.json', JSON.stringify(package_json, null, '  '));

	// rebuild package.json
	await run('npm i --package-lock-only')
}

async function getReleaseNotes(version: string, shaLast: string, shaCurrent: string): Promise<string> {
	const commits = await getCommitsBetween(shaLast, shaCurrent);
	let notes = commits.reverse()
		.map(commit => '- ' + commit.message.replace(/\s+/g, ' '))
		.join('\n');
	notes = `# Release v${version}\n\nchanges: \n${notes}\n\n`;
	return notes;
}
