
export async function fetchJSON(url: string): Promise<unknown> {
	return await (await fetch(url)).json();
}
