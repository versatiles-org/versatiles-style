
export async function fetchJSON(url: string): Promise<unknown> {
	return (await fetch(url)).json();
}
