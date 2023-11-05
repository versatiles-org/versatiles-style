import { run } from './shell.js';

export async function getLastGitHubTag(): Promise<{ sha: string; version: string }> {
	const commits: Commit[] = await getAllCommits();

	const result = commits
		.map(commit => ({
			sha: commit.sha,
			version: commit.tag?.match(/^v(\d+\.\d+\.\d+)$/)?.[1],
		}))
		.find(r => r.version) as { sha: string; version: string } | undefined;

	if (!result) throw Error();

	return result;
}

async function getAllCommits(): Promise<Commit[]> {
	const result: string = await run.stdout('git log --pretty=format:\'⍃%H⍄%s⍄%D⍄\'');

	return result
		.split('⍃')
		.filter(line => line.length > 2)
		.map(line => {
			const obj: string[] = line.split('⍄');
			return {
				sha: obj[0],
				message: obj[1],
				tag: /tag: ([a-z0-9.]+)/.exec(obj[2])?.[1],
			};
		});
}

export async function getCurrentGitHubCommit(): Promise<Commit> {
	return (await getAllCommits())[0];
}

export async function getCommitsBetween(shaLast: string, shaCurrent: string): Promise<Commit[]> {
	let commits: Commit[] = await getAllCommits();

	const start = commits.findIndex(commit => commit.sha === shaCurrent);
	if (start >= 0) commits = commits.slice(start);

	const end = commits.findIndex(commit => commit.sha === shaLast);
	if (end >= 0) commits = commits.slice(0, end);

	return commits;
}

export interface Commit {
	sha: string; message: string; tag?: string; 
}
