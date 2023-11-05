import { fetchJSON } from './fetch';
import { run } from './shell';

export async function getLastGitHubTag(repo: string): Promise<VersionTag> {
	const result = await fetchJSON(`https://api.github.com/repos/${repo}/tags`) as unknown[];

	const tags = result.map(e => ({
		// @ts-ignore
		tag: e.name,
		// @ts-ignore
		sha: e.commit.sha,
		// @ts-ignore
		version: e.name.match(/^v(\d+\.\d+\.\d+)$/)?.[1]
	})) as { tag: string, sha: string, version: string | undefined }[];

	const tag = tags.find(tag => tag.version !== undefined) as VersionTag | undefined;

	if (!tag) throw Error();

	return tag;
}

export async function getCurrentGitHubCommit(): Promise<Commit> {
	return JSON.parse(await run.stdout(`git log -1 --pretty=format:'{"sha":"%H","message":"%s"}'`))
}

export async function getCommitsBetween(repo: string, shaLast: string, shaCurrent: string): Promise<Commit[]> {
	const result = await fetchJSON(`https://api.github.com/repos/${repo}/commits?sha=${shaCurrent}&per_page=100`) as
		{ sha: string, commit: { message: string } }[];

	let commits = result.map(e => ({
		sha: e.sha,
		message: e.commit.message,
	})) as Commit[];

	const index = commits.findIndex(commit => commit.sha === shaLast);
	if (index > 0) commits = commits.slice(0, index);

	return commits;
}

export type Commit = { sha: string, message: string };
export type VersionTag = { tag: string, version: string, sha: string };
